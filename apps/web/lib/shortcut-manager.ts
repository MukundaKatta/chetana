/**
 * Keyboard shortcut manager with global registry, conflict detection,
 * customizable bindings, cheat sheet overlay (Cmd+/), and
 * context-aware shortcuts (Issue #380).
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface ShortcutBinding {
  /** Unique id for this shortcut. */
  id: string;
  /** Human-readable description. */
  description: string;
  /** Key combo, e.g. "Cmd+Shift+K" or "Ctrl+Alt+D". */
  keys: string;
  /** Handler to invoke. */
  handler: () => void;
  /** Context in which this shortcut is active (default: "global"). */
  context?: string;
  /** Whether this shortcut is enabled (default: true). */
  enabled?: boolean;
  /** Category for grouping in cheat sheet. */
  category?: string;
  /** Priority for conflict resolution (higher wins, default 0). */
  priority?: number;
}

export interface ShortcutConflict {
  keys: string;
  existing: ShortcutBinding;
  incoming: ShortcutBinding;
}

export interface ParsedKeyCombo {
  key: string;
  meta: boolean;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
}

export interface CheatSheetEntry {
  id: string;
  keys: string;
  description: string;
  category: string;
  context: string;
}

export interface UserPreferences {
  customBindings: Record<string, string>;
  disabledShortcuts: string[];
}

/* ------------------------------------------------------------------ */
/*  Key combo parser                                                  */
/* ------------------------------------------------------------------ */

const KEY_ALIASES: Record<string, string> = {
  cmd: "meta",
  command: "meta",
  win: "meta",
  windows: "meta",
  opt: "alt",
  option: "alt",
  esc: "escape",
  del: "delete",
  ins: "insert",
  pgup: "pageup",
  pgdn: "pagedown",
  up: "arrowup",
  down: "arrowdown",
  left: "arrowleft",
  right: "arrowright",
  space: " ",
  plus: "+",
  "/": "/",
};

export function parseKeyCombo(combo: string): ParsedKeyCombo {
  const parts = combo
    .toLowerCase()
    .split("+")
    .map((p) => p.trim());

  const result: ParsedKeyCombo = {
    key: "",
    meta: false,
    ctrl: false,
    alt: false,
    shift: false,
  };

  for (const part of parts) {
    const alias = KEY_ALIASES[part] ?? part;
    switch (alias) {
      case "meta":
        result.meta = true;
        break;
      case "ctrl":
      case "control":
        result.ctrl = true;
        break;
      case "alt":
        result.alt = true;
        break;
      case "shift":
        result.shift = true;
        break;
      default:
        result.key = alias;
    }
  }

  return result;
}

export function normalizeKeyCombo(combo: string): string {
  const parsed = parseKeyCombo(combo);
  const parts: string[] = [];
  if (parsed.meta) parts.push("Meta");
  if (parsed.ctrl) parts.push("Ctrl");
  if (parsed.alt) parts.push("Alt");
  if (parsed.shift) parts.push("Shift");
  parts.push(parsed.key.charAt(0).toUpperCase() + parsed.key.slice(1));
  return parts.join("+");
}

function matchesEvent(parsed: ParsedKeyCombo, event: KeyboardEvent): boolean {
  const eventKey = event.key.toLowerCase();
  const normalizedKey = KEY_ALIASES[eventKey] ?? eventKey;

  return (
    normalizedKey === parsed.key &&
    event.metaKey === parsed.meta &&
    event.ctrlKey === parsed.ctrl &&
    event.altKey === parsed.alt &&
    event.shiftKey === parsed.shift
  );
}

/**
 * Format key combo for display (platform-aware).
 */
export function formatKeyCombo(combo: string, platform?: "mac" | "windows"): string {
  const isMac =
    platform === "mac" ||
    (platform == null &&
      typeof navigator !== "undefined" &&
      navigator.platform?.includes("Mac"));

  const parsed = parseKeyCombo(combo);
  const parts: string[] = [];

  if (parsed.meta) parts.push(isMac ? "⌘" : "Ctrl");
  if (parsed.ctrl) parts.push(isMac ? "⌃" : "Ctrl");
  if (parsed.alt) parts.push(isMac ? "⌥" : "Alt");
  if (parsed.shift) parts.push(isMac ? "⇧" : "Shift");
  parts.push(parsed.key.charAt(0).toUpperCase() + parsed.key.slice(1));

  return parts.join(isMac ? "" : "+");
}

/* ------------------------------------------------------------------ */
/*  Shortcut Manager                                                  */
/* ------------------------------------------------------------------ */

const PREFS_STORAGE_KEY = "chetana-shortcut-prefs";

export class ShortcutManager {
  private bindings = new Map<string, ShortcutBinding>();
  private parsedCombos = new Map<string, ParsedKeyCombo>();
  private activeContext = "global";
  private preferences: UserPreferences = {
    customBindings: {},
    disabledShortcuts: [],
  };
  private listeners: Array<(event: "register" | "unregister" | "conflict", data?: unknown) => void> = [];
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private cheatSheetVisible = false;
  private onCheatSheetToggle: ((visible: boolean) => void) | null = null;

  constructor() {
    this.loadPreferences();
  }

  /* -- Lifecycle -- */

  /**
   * Attach the global keydown listener.
   * Call this once when the app mounts.
   */
  attach(): void {
    if (this.keyHandler) return;

    this.keyHandler = (e: KeyboardEvent) => this.handleKeyDown(e);
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", this.keyHandler);
    }
  }

  /**
   * Detach the global keydown listener.
   */
  detach(): void {
    if (this.keyHandler && typeof window !== "undefined") {
      window.removeEventListener("keydown", this.keyHandler);
      this.keyHandler = null;
    }
  }

  /* -- Registration -- */

  /**
   * Register a shortcut binding.
   * Returns any conflicts detected.
   */
  register(binding: ShortcutBinding): ShortcutConflict[] {
    const conflicts: ShortcutConflict[] = [];
    const effectiveKeys =
      this.preferences.customBindings[binding.id] ?? binding.keys;
    const normalized = normalizeKeyCombo(effectiveKeys);

    // Check for conflicts
    for (const [existingId, existing] of this.bindings) {
      if (existingId === binding.id) continue;
      const existingNorm = normalizeKeyCombo(
        this.preferences.customBindings[existing.id] ?? existing.keys,
      );
      const existingCtx = existing.context ?? "global";
      const incomingCtx = binding.context ?? "global";

      if (
        existingNorm === normalized &&
        (existingCtx === incomingCtx ||
          existingCtx === "global" ||
          incomingCtx === "global")
      ) {
        conflicts.push({ keys: normalized, existing, incoming: binding });
      }
    }

    const isDisabled = this.preferences.disabledShortcuts.includes(binding.id);

    this.bindings.set(binding.id, {
      ...binding,
      keys: effectiveKeys,
      enabled: isDisabled ? false : (binding.enabled ?? true),
    });
    this.parsedCombos.set(binding.id, parseKeyCombo(effectiveKeys));

    if (conflicts.length > 0) {
      this.emit("conflict", conflicts);
    }
    this.emit("register", binding);

    return conflicts;
  }

  /**
   * Unregister a shortcut by id.
   */
  unregister(id: string): void {
    this.bindings.delete(id);
    this.parsedCombos.delete(id);
    this.emit("unregister", id);
  }

  /* -- Context -- */

  /**
   * Set the active context (e.g., "editor", "modal", "dashboard").
   */
  setContext(context: string): void {
    this.activeContext = context;
  }

  getContext(): string {
    return this.activeContext;
  }

  /* -- Preferences -- */

  /**
   * Update a custom key binding for a shortcut.
   */
  rebind(shortcutId: string, newKeys: string): ShortcutConflict[] {
    this.preferences.customBindings[shortcutId] = newKeys;
    this.savePreferences();

    const binding = this.bindings.get(shortcutId);
    if (binding) {
      return this.register({ ...binding, keys: newKeys });
    }
    return [];
  }

  /**
   * Reset a shortcut to its default binding.
   */
  resetBinding(shortcutId: string): void {
    delete this.preferences.customBindings[shortcutId];
    this.savePreferences();
  }

  /**
   * Toggle a shortcut enabled/disabled.
   */
  toggleShortcut(shortcutId: string, enabled: boolean): void {
    if (enabled) {
      this.preferences.disabledShortcuts = this.preferences.disabledShortcuts.filter(
        (id) => id !== shortcutId,
      );
    } else {
      if (!this.preferences.disabledShortcuts.includes(shortcutId)) {
        this.preferences.disabledShortcuts.push(shortcutId);
      }
    }
    this.savePreferences();

    const binding = this.bindings.get(shortcutId);
    if (binding) {
      binding.enabled = enabled;
    }
  }

  /* -- Cheat sheet -- */

  /**
   * Get all shortcuts for the cheat sheet overlay.
   */
  getCheatSheet(): CheatSheetEntry[] {
    const entries: CheatSheetEntry[] = [];
    for (const binding of this.bindings.values()) {
      if (binding.enabled === false) continue;
      entries.push({
        id: binding.id,
        keys: formatKeyCombo(binding.keys),
        description: binding.description,
        category: binding.category ?? "General",
        context: binding.context ?? "global",
      });
    }
    return entries.sort((a, b) => a.category.localeCompare(b.category));
  }

  /**
   * Group cheat sheet entries by category.
   */
  getCheatSheetGrouped(): Record<string, CheatSheetEntry[]> {
    const entries = this.getCheatSheet();
    const grouped: Record<string, CheatSheetEntry[]> = {};
    for (const entry of entries) {
      if (!grouped[entry.category]) grouped[entry.category] = [];
      grouped[entry.category].push(entry);
    }
    return grouped;
  }

  setCheatSheetToggleHandler(handler: (visible: boolean) => void): void {
    this.onCheatSheetToggle = handler;
  }

  isCheatSheetVisible(): boolean {
    return this.cheatSheetVisible;
  }

  /* -- Event listener -- */

  onChange(
    listener: (event: "register" | "unregister" | "conflict", data?: unknown) => void,
  ): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /* -- Query -- */

  getBinding(id: string): ShortcutBinding | undefined {
    return this.bindings.get(id);
  }

  getAllBindings(): ShortcutBinding[] {
    return Array.from(this.bindings.values());
  }

  /* -- Internal -- */

  private handleKeyDown(event: KeyboardEvent): void {
    // Cheat sheet toggle: Cmd+/ or Ctrl+/
    const cheatSheetCombo = parseKeyCombo("Cmd+/");
    const cheatSheetComboCtrl = parseKeyCombo("Ctrl+/");
    if (
      matchesEvent(cheatSheetCombo, event) ||
      matchesEvent(cheatSheetComboCtrl, event)
    ) {
      event.preventDefault();
      this.cheatSheetVisible = !this.cheatSheetVisible;
      this.onCheatSheetToggle?.(this.cheatSheetVisible);
      return;
    }

    // Find matching shortcut
    const candidates: Array<{ binding: ShortcutBinding; priority: number }> = [];

    for (const [id, parsed] of this.parsedCombos) {
      if (!matchesEvent(parsed, event)) continue;
      const binding = this.bindings.get(id);
      if (!binding || binding.enabled === false) continue;

      const ctx = binding.context ?? "global";
      if (ctx !== "global" && ctx !== this.activeContext) continue;

      candidates.push({
        binding,
        priority: binding.priority ?? 0,
      });
    }

    if (candidates.length === 0) return;

    // Sort by priority descending, context-specific > global
    candidates.sort((a, b) => {
      const aCtx = a.binding.context ?? "global";
      const bCtx = b.binding.context ?? "global";
      if (aCtx !== "global" && bCtx === "global") return -1;
      if (aCtx === "global" && bCtx !== "global") return 1;
      return b.priority - a.priority;
    });

    event.preventDefault();
    event.stopPropagation();
    candidates[0].binding.handler();
  }

  private emit(event: "register" | "unregister" | "conflict", data?: unknown): void {
    for (const listener of this.listeners) {
      listener(event, data);
    }
  }

  private loadPreferences(): void {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(PREFS_STORAGE_KEY);
      if (stored) {
        this.preferences = JSON.parse(stored);
      }
    } catch {
      // Use defaults
    }
  }

  private savePreferences(): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(this.preferences));
    } catch {
      // Storage full or unavailable
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Singleton                                                         */
/* ------------------------------------------------------------------ */

let _instance: ShortcutManager | null = null;

export function getShortcutManager(): ShortcutManager {
  if (!_instance) {
    _instance = new ShortcutManager();
  }
  return _instance;
}

/**
 * Register common default shortcuts for the Chetana app.
 */
export function registerDefaults(manager: ShortcutManager): void {
  const defaults: Omit<ShortcutBinding, "handler">[] = [
    {
      id: "search",
      keys: "Cmd+K",
      description: "Open command palette",
      category: "Navigation",
    },
    {
      id: "new-audit",
      keys: "Cmd+N",
      description: "Start new audit",
      category: "Audits",
    },
    {
      id: "save",
      keys: "Cmd+S",
      description: "Save current work",
      category: "General",
    },
    {
      id: "help",
      keys: "Cmd+/",
      description: "Show keyboard shortcuts",
      category: "General",
    },
    {
      id: "undo",
      keys: "Cmd+Z",
      description: "Undo last action",
      category: "General",
    },
    {
      id: "redo",
      keys: "Cmd+Shift+Z",
      description: "Redo last action",
      category: "General",
    },
    {
      id: "close-modal",
      keys: "Escape",
      description: "Close modal or overlay",
      category: "Navigation",
      context: "modal",
    },
  ];

  for (const def of defaults) {
    manager.register({
      ...def,
      handler: () => {
        /* default no-op; consumers should override */
      },
    });
  }
}
