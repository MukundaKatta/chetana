/**
 * MFA system (Issue #544).
 * TOTP support, backup recovery codes, MFA enforcement per role,
 * trusted devices, MFA audit log.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface TOTPConfig {
  /** Base32-encoded secret. */
  secret: string;
  /** Number of digits (default 6). */
  digits: number;
  /** Time step in seconds (default 30). */
  period: number;
  /** Hash algorithm. */
  algorithm: "SHA1" | "SHA256" | "SHA512";
  /** Issuer name for authenticator apps. */
  issuer: string;
  /** Account identifier (usually email). */
  accountName: string;
}

export interface RecoveryCode {
  code: string;
  used: boolean;
  usedAt: string | null;
}

export interface TrustedDevice {
  id: string;
  name: string;
  fingerprint: string;
  trustedAt: string;
  expiresAt: string;
  lastUsedAt: string | null;
}

export type MFARole = "admin" | "researcher" | "viewer";

export interface MFAPolicy {
  /** Roles that must have MFA enabled. */
  requiredForRoles: MFARole[];
  /** Grace period in days before MFA is enforced after enrollment. */
  gracePeriodDays: number;
  /** Number of recovery codes to generate. */
  recoveryCodeCount: number;
  /** Trusted device lifetime in days. */
  trustedDeviceLifetimeDays: number;
  /** Maximum trusted devices per user. */
  maxTrustedDevices: number;
}

export type MFAAuditAction =
  | "mfa_enrolled"
  | "mfa_verified"
  | "mfa_failed"
  | "mfa_disabled"
  | "recovery_code_used"
  | "recovery_codes_regenerated"
  | "device_trusted"
  | "device_revoked"
  | "policy_updated";

export interface MFAAuditEntry {
  id: string;
  userId: string;
  action: MFAAuditAction;
  timestamp: string;
  ipAddress: string | null;
  userAgent: string | null;
  details: Record<string, unknown>;
  success: boolean;
}

export interface MFAUserState {
  userId: string;
  enabled: boolean;
  enrolledAt: string | null;
  totpConfig: TOTPConfig | null;
  recoveryCodes: RecoveryCode[];
  trustedDevices: TrustedDevice[];
  backupVerified: boolean;
}

export interface MFAVerificationResult {
  success: boolean;
  method: "totp" | "recovery_code" | "trusted_device";
  remainingRecoveryCodes?: number;
}

export interface MFAEnrollmentResult {
  secret: string;
  qrCodeUri: string;
  recoveryCodes: string[];
}

/* ------------------------------------------------------------------ */
/*  TOTP Implementation                                               */
/* ------------------------------------------------------------------ */

/** Generate a random base32 secret. */
export function generateSecret(length: number = 20): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => chars[b % 32])
    .join("");
}

/** Generate a TOTP provisioning URI (otpauth://). */
export function generateTOTPUri(config: TOTPConfig): string {
  const label = encodeURIComponent(`${config.issuer}:${config.accountName}`);
  const params = new URLSearchParams({
    secret: config.secret,
    issuer: config.issuer,
    algorithm: config.algorithm,
    digits: String(config.digits),
    period: String(config.period),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

/**
 * HMAC-based computation for TOTP.
 * Uses Web Crypto API.
 */
async function hmacDigest(
  algorithm: string,
  key: Uint8Array,
  message: Uint8Array
): Promise<Uint8Array> {
  const algoMap: Record<string, string> = {
    SHA1: "SHA-1",
    SHA256: "SHA-256",
    SHA512: "SHA-512",
  };
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: algoMap[algorithm] ?? "SHA-1" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, message);
  return new Uint8Array(sig);
}

/** Decode a base32 string to Uint8Array. */
function base32Decode(input: string): Uint8Array {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const cleaned = input.replace(/[=\s]/g, "").toUpperCase();
  let bits = "";
  for (const c of cleaned) {
    const idx = chars.indexOf(c);
    if (idx === -1) throw new Error(`Invalid base32 character: ${c}`);
    bits += idx.toString(2).padStart(5, "0");
  }
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  }
  return bytes;
}

/** Generate a TOTP code for the given time. */
export async function generateTOTP(
  config: Pick<TOTPConfig, "secret" | "digits" | "period" | "algorithm">,
  timestamp: number = Date.now()
): Promise<string> {
  const timeStep = Math.floor(timestamp / 1000 / config.period);
  const timeBytes = new Uint8Array(8);
  let tmp = timeStep;
  for (let i = 7; i >= 0; i--) {
    timeBytes[i] = tmp & 0xff;
    tmp = Math.floor(tmp / 256);
  }

  const key = base32Decode(config.secret);
  const hmac = await hmacDigest(config.algorithm, key, timeBytes);

  // Dynamic truncation
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = code % Math.pow(10, config.digits);
  return otp.toString().padStart(config.digits, "0");
}

/** Verify a TOTP code with a time window (default +-1 step). */
export async function verifyTOTP(
  config: Pick<TOTPConfig, "secret" | "digits" | "period" | "algorithm">,
  code: string,
  window: number = 1,
  timestamp: number = Date.now()
): Promise<boolean> {
  for (let offset = -window; offset <= window; offset++) {
    const adjustedTime = timestamp + offset * config.period * 1000;
    const expected = await generateTOTP(config, adjustedTime);
    if (timingSafeEqual(code, expected)) return true;
  }
  return false;
}

/** Constant-time string comparison. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/* ------------------------------------------------------------------ */
/*  Recovery codes                                                    */
/* ------------------------------------------------------------------ */

export function generateRecoveryCodes(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const bytes = new Uint8Array(5);
    crypto.getRandomValues(bytes);
    const code = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
    // Format as XXXX-XXXX-XX
    codes.push(`${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 10)}`);
  }
  return codes;
}

/* ------------------------------------------------------------------ */
/*  MFA Manager                                                       */
/* ------------------------------------------------------------------ */

export class MFAManager {
  private users: Map<string, MFAUserState> = new Map();
  private auditLog: MFAAuditEntry[] = [];
  private policy: MFAPolicy;

  constructor(policy?: Partial<MFAPolicy>) {
    this.policy = {
      requiredForRoles: policy?.requiredForRoles ?? ["admin"],
      gracePeriodDays: policy?.gracePeriodDays ?? 7,
      recoveryCodeCount: policy?.recoveryCodeCount ?? 10,
      trustedDeviceLifetimeDays: policy?.trustedDeviceLifetimeDays ?? 30,
      maxTrustedDevices: policy?.maxTrustedDevices ?? 5,
    };
  }

  /** Get the current policy. */
  getPolicy(): MFAPolicy {
    return { ...this.policy };
  }

  /** Update MFA policy. */
  updatePolicy(updates: Partial<MFAPolicy>): void {
    this.policy = { ...this.policy, ...updates };
    this.addAuditEntry("system", "policy_updated", true, { updates });
  }

  /** Check if MFA is required for a given role. */
  isMFARequired(role: MFARole): boolean {
    return this.policy.requiredForRoles.includes(role);
  }

  /** Enroll a user in MFA. Returns the TOTP secret and recovery codes. */
  async enroll(
    userId: string,
    accountName: string,
    issuer: string = "Chetana"
  ): Promise<MFAEnrollmentResult> {
    const secret = generateSecret();
    const recoveryCodes = generateRecoveryCodes(this.policy.recoveryCodeCount);

    const totpConfig: TOTPConfig = {
      secret,
      digits: 6,
      period: 30,
      algorithm: "SHA1",
      issuer,
      accountName,
    };

    const state: MFAUserState = {
      userId,
      enabled: false, // Must verify first
      enrolledAt: new Date().toISOString(),
      totpConfig,
      recoveryCodes: recoveryCodes.map((code) => ({
        code,
        used: false,
        usedAt: null,
      })),
      trustedDevices: [],
      backupVerified: false,
    };

    this.users.set(userId, state);
    this.addAuditEntry(userId, "mfa_enrolled", true);

    return {
      secret,
      qrCodeUri: generateTOTPUri(totpConfig),
      recoveryCodes,
    };
  }

  /** Confirm enrollment by verifying a TOTP code. */
  async confirmEnrollment(userId: string, code: string): Promise<boolean> {
    const state = this.users.get(userId);
    if (!state?.totpConfig) return false;

    const valid = await verifyTOTP(state.totpConfig, code);
    if (valid) {
      state.enabled = true;
      state.backupVerified = true;
      this.addAuditEntry(userId, "mfa_verified", true, { method: "totp", context: "enrollment" });
    } else {
      this.addAuditEntry(userId, "mfa_failed", false, { context: "enrollment" });
    }
    return valid;
  }

  /** Verify a TOTP code for authentication. */
  async verify(
    userId: string,
    code: string,
    context?: { ipAddress?: string; userAgent?: string }
  ): Promise<MFAVerificationResult> {
    const state = this.users.get(userId);
    if (!state?.enabled || !state.totpConfig) {
      return { success: false, method: "totp" };
    }

    const valid = await verifyTOTP(state.totpConfig, code);
    this.addAuditEntry(userId, valid ? "mfa_verified" : "mfa_failed", valid, {
      method: "totp",
      ...context,
    });

    return { success: valid, method: "totp" };
  }

  /** Verify using a recovery code. */
  verifyRecoveryCode(
    userId: string,
    code: string,
    context?: { ipAddress?: string; userAgent?: string }
  ): MFAVerificationResult {
    const state = this.users.get(userId);
    if (!state?.enabled) {
      return { success: false, method: "recovery_code", remainingRecoveryCodes: 0 };
    }

    const normalizedCode = code.toUpperCase().replace(/\s/g, "");
    const recovery = state.recoveryCodes.find(
      (rc) => !rc.used && rc.code.replace(/-/g, "") === normalizedCode.replace(/-/g, "")
    );

    if (recovery) {
      recovery.used = true;
      recovery.usedAt = new Date().toISOString();
      const remaining = state.recoveryCodes.filter((rc) => !rc.used).length;
      this.addAuditEntry(userId, "recovery_code_used", true, {
        remaining,
        ...context,
      });
      return { success: true, method: "recovery_code", remainingRecoveryCodes: remaining };
    }

    this.addAuditEntry(userId, "mfa_failed", false, {
      method: "recovery_code",
      ...context,
    });
    return {
      success: false,
      method: "recovery_code",
      remainingRecoveryCodes: state.recoveryCodes.filter((rc) => !rc.used).length,
    };
  }

  /** Check if a device is trusted for a user. */
  checkTrustedDevice(userId: string, fingerprint: string): MFAVerificationResult {
    const state = this.users.get(userId);
    if (!state?.enabled) {
      return { success: false, method: "trusted_device" };
    }

    const device = state.trustedDevices.find((d) => d.fingerprint === fingerprint);
    if (device && new Date(device.expiresAt) > new Date()) {
      device.lastUsedAt = new Date().toISOString();
      return { success: true, method: "trusted_device" };
    }

    return { success: false, method: "trusted_device" };
  }

  /** Trust a device for a user. */
  trustDevice(
    userId: string,
    device: { name: string; fingerprint: string }
  ): TrustedDevice | null {
    const state = this.users.get(userId);
    if (!state?.enabled) return null;

    // Check max devices
    if (state.trustedDevices.length >= this.policy.maxTrustedDevices) {
      // Remove oldest
      state.trustedDevices.sort(
        (a, b) => new Date(a.trustedAt).getTime() - new Date(b.trustedAt).getTime()
      );
      state.trustedDevices.shift();
    }

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + this.policy.trustedDeviceLifetimeDays);

    const trusted: TrustedDevice = {
      id: crypto.randomUUID(),
      name: device.name,
      fingerprint: device.fingerprint,
      trustedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      lastUsedAt: null,
    };

    state.trustedDevices.push(trusted);
    this.addAuditEntry(userId, "device_trusted", true, { deviceId: trusted.id });
    return trusted;
  }

  /** Revoke a trusted device. */
  revokeDevice(userId: string, deviceId: string): boolean {
    const state = this.users.get(userId);
    if (!state) return false;

    const idx = state.trustedDevices.findIndex((d) => d.id === deviceId);
    if (idx === -1) return false;

    state.trustedDevices.splice(idx, 1);
    this.addAuditEntry(userId, "device_revoked", true, { deviceId });
    return true;
  }

  /** Regenerate recovery codes. */
  regenerateRecoveryCodes(userId: string): string[] | null {
    const state = this.users.get(userId);
    if (!state?.enabled) return null;

    const codes = generateRecoveryCodes(this.policy.recoveryCodeCount);
    state.recoveryCodes = codes.map((code) => ({ code, used: false, usedAt: null }));
    this.addAuditEntry(userId, "recovery_codes_regenerated", true);
    return codes;
  }

  /** Disable MFA for a user. */
  disableMFA(userId: string): boolean {
    const state = this.users.get(userId);
    if (!state) return false;

    state.enabled = false;
    state.totpConfig = null;
    state.recoveryCodes = [];
    state.trustedDevices = [];
    this.addAuditEntry(userId, "mfa_disabled", true);
    return true;
  }

  /** Get MFA state for a user. */
  getUserState(userId: string): MFAUserState | null {
    const state = this.users.get(userId);
    if (!state) return null;
    // Return without exposing secret
    return {
      ...state,
      totpConfig: state.totpConfig
        ? { ...state.totpConfig, secret: "***" }
        : null,
      recoveryCodes: state.recoveryCodes.map((rc) => ({
        ...rc,
        code: rc.used ? rc.code : "***",
      })),
    };
  }

  /** Get audit log entries. */
  getAuditLog(userId?: string, limit: number = 100): MFAAuditEntry[] {
    let entries = this.auditLog;
    if (userId) entries = entries.filter((e) => e.userId === userId);
    return entries.slice(-limit);
  }

  private addAuditEntry(
    userId: string,
    action: MFAAuditAction,
    success: boolean,
    details: Record<string, unknown> = {}
  ): void {
    this.auditLog.push({
      id: crypto.randomUUID(),
      userId,
      action,
      timestamp: new Date().toISOString(),
      ipAddress: (details.ipAddress as string) ?? null,
      userAgent: (details.userAgent as string) ?? null,
      details,
      success,
    });
  }
}
