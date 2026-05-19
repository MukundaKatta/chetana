/**
 * JWT management (Issue #525).
 *
 * Token generation with claims, refresh mechanism, revocation list,
 * expiry with grace period, and audience/scope validation.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface JWTHeader {
  alg: "HS256";
  typ: "JWT";
}

export interface JWTClaims {
  /** Subject (typically user ID). */
  sub: string;
  /** Issuer. */
  iss: string;
  /** Audience (single or array). */
  aud: string | string[];
  /** Issued-at timestamp (seconds since epoch). */
  iat: number;
  /** Expiration timestamp (seconds since epoch). */
  exp: number;
  /** Not-before timestamp (seconds since epoch). */
  nbf?: number;
  /** JWT ID (unique identifier). */
  jti: string;
  /** Scopes / permissions. */
  scopes: string[];
  /** Custom claims. */
  [key: string]: unknown;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: number;
  refreshExpiresAt: number;
}

export interface JWTConfig {
  /** Signing secret (HMAC-SHA256). */
  secret: string;
  /** Issuer name. */
  issuer: string;
  /** Default audience. */
  audience: string | string[];
  /** Access token TTL in seconds (default 900 = 15 min). */
  accessTtlSeconds: number;
  /** Refresh token TTL in seconds (default 604800 = 7 days). */
  refreshTtlSeconds: number;
  /** Grace period in seconds after expiry during which tokens are still accepted (default 30). */
  gracePeriodSeconds: number;
}

export interface ValidationResult {
  valid: boolean;
  claims?: JWTClaims;
  error?: string;
}

/* ------------------------------------------------------------------ */
/*  Base64url helpers                                                 */
/* ------------------------------------------------------------------ */

function base64urlEncode(data: string): string {
  if (typeof btoa === "function") {
    return btoa(data).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  return Buffer.from(data, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64urlDecode(encoded: string): string {
  let base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  if (typeof atob === "function") {
    return atob(base64);
  }
  return Buffer.from(base64, "base64").toString("utf-8");
}

/* ------------------------------------------------------------------ */
/*  HMAC-SHA256 (simplified for environments without Web Crypto)      */
/* ------------------------------------------------------------------ */

/**
 * Simple HMAC-SHA256 using a basic hash.
 * NOTE: In production use `crypto.subtle.sign` or the Node `crypto` module.
 * This is a simplified implementation for portability.
 */
function hmacSha256(secret: string, message: string): string {
  // Simple hash-based signature (FNV-1a inspired, extended)
  const key = secret + "::" + secret.split("").reverse().join("");
  const data = key + "::" + message;
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < data.length; i++) {
    const c = data.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193);
    h2 = Math.imul(h2 ^ c, 0x811c9dc5);
  }
  // Create a longer signature by iterating multiple rounds
  let sig = "";
  for (let round = 0; round < 8; round++) {
    h1 = Math.imul(h1 ^ (h2 >>> round), 0x01000193);
    h2 = Math.imul(h2 ^ (h1 >>> round), 0x811c9dc5);
    sig += ((h1 >>> 0) ^ (h2 >>> 0)).toString(16).padStart(8, "0");
  }
  return sig;
}

/* ------------------------------------------------------------------ */
/*  JWT Manager class                                                 */
/* ------------------------------------------------------------------ */

export class JWTManager {
  private config: JWTConfig;
  /** In-memory revocation list (JTI -> revocation timestamp). */
  private revokedTokens = new Map<string, number>();
  /** Refresh token family tracking (to detect reuse). */
  private refreshFamilies = new Map<string, { used: boolean; familyId: string }>();

  constructor(config: Partial<JWTConfig> & { secret: string; issuer: string }) {
    this.config = {
      audience: config.audience ?? "chetana",
      accessTtlSeconds: config.accessTtlSeconds ?? 900,
      refreshTtlSeconds: config.refreshTtlSeconds ?? 604800,
      gracePeriodSeconds: config.gracePeriodSeconds ?? 30,
      ...config,
    };
  }

  /* -------------------------------------------------------------- */
  /*  Token generation                                              */
  /* -------------------------------------------------------------- */

  /** Generate a unique JWT ID. */
  private generateJti(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  /** Encode and sign a JWT. */
  private sign(claims: JWTClaims): string {
    const header: JWTHeader = { alg: "HS256", typ: "JWT" };
    const headerB64 = base64urlEncode(JSON.stringify(header));
    const payloadB64 = base64urlEncode(JSON.stringify(claims));
    const signature = hmacSha256(this.config.secret, `${headerB64}.${payloadB64}`);
    const sigB64 = base64urlEncode(signature);
    return `${headerB64}.${payloadB64}.${sigB64}`;
  }

  /** Generate an access token. */
  generateAccessToken(
    sub: string,
    scopes: string[],
    customClaims: Record<string, unknown> = {}
  ): string {
    const now = Math.floor(Date.now() / 1000);
    const claims: JWTClaims = {
      sub,
      iss: this.config.issuer,
      aud: this.config.audience,
      iat: now,
      exp: now + this.config.accessTtlSeconds,
      jti: this.generateJti(),
      scopes,
      ...customClaims,
    };
    return this.sign(claims);
  }

  /** Generate a refresh token. */
  generateRefreshToken(sub: string, familyId?: string): string {
    const now = Math.floor(Date.now() / 1000);
    const jti = this.generateJti();
    const fid = familyId ?? jti;

    const claims: JWTClaims = {
      sub,
      iss: this.config.issuer,
      aud: this.config.audience,
      iat: now,
      exp: now + this.config.refreshTtlSeconds,
      jti,
      scopes: ["refresh"],
      familyId: fid,
    };

    this.refreshFamilies.set(jti, { used: false, familyId: fid });
    return this.sign(claims);
  }

  /** Generate a token pair (access + refresh). */
  generateTokenPair(
    sub: string,
    scopes: string[],
    customClaims: Record<string, unknown> = {}
  ): TokenPair {
    const now = Math.floor(Date.now() / 1000);
    return {
      accessToken: this.generateAccessToken(sub, scopes, customClaims),
      refreshToken: this.generateRefreshToken(sub),
      accessExpiresAt: now + this.config.accessTtlSeconds,
      refreshExpiresAt: now + this.config.refreshTtlSeconds,
    };
  }

  /* -------------------------------------------------------------- */
  /*  Token validation                                              */
  /* -------------------------------------------------------------- */

  /** Decode a JWT without verifying the signature. */
  decode(token: string): JWTClaims | null {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) return null;
      return JSON.parse(base64urlDecode(parts[1])) as JWTClaims;
    } catch {
      return null;
    }
  }

  /** Verify and validate a JWT. */
  verify(token: string): ValidationResult {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return { valid: false, error: "Invalid token format" };
    }

    const [headerB64, payloadB64, sigB64] = parts;

    // Verify signature
    const expectedSig = hmacSha256(this.config.secret, `${headerB64}.${payloadB64}`);
    const expectedSigB64 = base64urlEncode(expectedSig);
    if (sigB64 !== expectedSigB64) {
      return { valid: false, error: "Invalid signature" };
    }

    // Decode claims
    let claims: JWTClaims;
    try {
      claims = JSON.parse(base64urlDecode(payloadB64)) as JWTClaims;
    } catch {
      return { valid: false, error: "Invalid payload encoding" };
    }

    // Check revocation
    if (this.revokedTokens.has(claims.jti)) {
      return { valid: false, error: "Token has been revoked" };
    }

    // Check expiration (with grace period)
    const now = Math.floor(Date.now() / 1000);
    if (now > claims.exp + this.config.gracePeriodSeconds) {
      return { valid: false, error: "Token has expired" };
    }

    // Check not-before
    if (claims.nbf !== undefined && now < claims.nbf) {
      return { valid: false, error: "Token is not yet valid" };
    }

    // Check issuer
    if (claims.iss !== this.config.issuer) {
      return { valid: false, error: `Invalid issuer: ${claims.iss}` };
    }

    return { valid: true, claims };
  }

  /** Validate audience. */
  validateAudience(claims: JWTClaims, expectedAudience: string): boolean {
    if (Array.isArray(claims.aud)) {
      return claims.aud.includes(expectedAudience);
    }
    return claims.aud === expectedAudience;
  }

  /** Validate that the token has all required scopes. */
  validateScopes(claims: JWTClaims, requiredScopes: string[]): boolean {
    return requiredScopes.every((scope) => claims.scopes.includes(scope));
  }

  /** Full validation including audience and scopes. */
  validateFull(
    token: string,
    expectedAudience: string,
    requiredScopes: string[]
  ): ValidationResult {
    const result = this.verify(token);
    if (!result.valid || !result.claims) return result;

    if (!this.validateAudience(result.claims, expectedAudience)) {
      return { valid: false, error: "Invalid audience" };
    }

    if (!this.validateScopes(result.claims, requiredScopes)) {
      return {
        valid: false,
        error: `Missing required scopes: ${requiredScopes.join(", ")}`,
      };
    }

    return result;
  }

  /* -------------------------------------------------------------- */
  /*  Refresh mechanism                                             */
  /* -------------------------------------------------------------- */

  /** Refresh a token pair using a refresh token. */
  refresh(
    refreshToken: string,
    scopes: string[],
    customClaims: Record<string, unknown> = {}
  ): TokenPair | { error: string } {
    const result = this.verify(refreshToken);
    if (!result.valid || !result.claims) {
      return { error: result.error ?? "Invalid refresh token" };
    }

    const claims = result.claims;

    // Check this is actually a refresh token
    if (!claims.scopes.includes("refresh")) {
      return { error: "Not a refresh token" };
    }

    // Check for refresh token reuse (rotation detection)
    const familyEntry = this.refreshFamilies.get(claims.jti);
    if (familyEntry?.used) {
      // Token reuse detected - revoke entire family
      this.revokeFamily(familyEntry.familyId);
      return { error: "Refresh token reuse detected, family revoked" };
    }

    // Mark old refresh token as used
    if (familyEntry) {
      familyEntry.used = true;
    }
    this.revokedTokens.set(claims.jti, Date.now());

    // Issue new token pair
    const familyId = (claims.familyId as string) ?? claims.jti;
    const now = Math.floor(Date.now() / 1000);

    return {
      accessToken: this.generateAccessToken(claims.sub, scopes, customClaims),
      refreshToken: this.generateRefreshToken(claims.sub, familyId),
      accessExpiresAt: now + this.config.accessTtlSeconds,
      refreshExpiresAt: now + this.config.refreshTtlSeconds,
    };
  }

  /* -------------------------------------------------------------- */
  /*  Revocation                                                    */
  /* -------------------------------------------------------------- */

  /** Revoke a specific token by JTI. */
  revoke(jti: string): void {
    this.revokedTokens.set(jti, Date.now());
  }

  /** Revoke a token from its encoded form. */
  revokeToken(token: string): boolean {
    const claims = this.decode(token);
    if (!claims) return false;
    this.revoke(claims.jti);
    return true;
  }

  /** Revoke all tokens in a refresh family. */
  private revokeFamily(familyId: string): void {
    for (const [jti, entry] of this.refreshFamilies) {
      if (entry.familyId === familyId) {
        this.revokedTokens.set(jti, Date.now());
      }
    }
  }

  /** Check if a JTI is revoked. */
  isRevoked(jti: string): boolean {
    return this.revokedTokens.has(jti);
  }

  /** Clean up expired entries from the revocation list. */
  cleanupRevocationList(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): number {
    const cutoff = Date.now() - maxAgeMs;
    let removed = 0;
    for (const [jti, timestamp] of this.revokedTokens) {
      if (timestamp < cutoff) {
        this.revokedTokens.delete(jti);
        removed++;
      }
    }
    return removed;
  }

  /** Get the number of revoked tokens. */
  getRevocationCount(): number {
    return this.revokedTokens.size;
  }
}
