"use client";

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
  type KeyboardEvent,
} from "react";
import { cn } from "@/lib/utils";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Link,
  Image,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Minus,
  Eye,
  EyeOff,
  Save,
  Undo,
  Redo,
  FileCode2,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface RichTextEditorProps {
  /** Initial markdown content. */
  initialContent?: string;
  /** Called whenever the content changes. */
  onChange?: (content: string) => void;
  /** Called on explicit save (Ctrl+S). */
  onSave?: (content: string) => void;
  /** Placeholder text when empty. */
  placeholder?: string;
  /** Autosave interval in ms (default 5000, 0 to disable). */
  autosaveIntervalMs?: number;
  /** Key prefix for localStorage draft recovery. */
  draftKey?: string;
  /** Minimum height of the editor in px. */
  minHeight?: number;
  className?: string;
}

interface ToolbarAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  /** Markdown prefix/suffix to wrap selection. */
  prefix?: string;
  suffix?: string;
  /** Block-level prefix for lines. */
  linePrefix?: string;
  /** For actions that need custom logic. */
  custom?: boolean;
  /** Keyboard shortcut hint. */
  shortcut?: string;
}

interface HistoryEntry {
  content: string;
  cursorPos: number;
}

/* ------------------------------------------------------------------ */
/*  Toolbar config                                                    */
/* ------------------------------------------------------------------ */

const TOOLBAR_ACTIONS: ToolbarAction[] = [
  { id: "bold", label: "Bold", icon: <Bold className="h-4 w-4" />, prefix: "**", suffix: "**", shortcut: "Ctrl+B" },
  { id: "italic", label: "Italic", icon: <Italic className="h-4 w-4" />, prefix: "_", suffix: "_", shortcut: "Ctrl+I" },
  { id: "strikethrough", label: "Strikethrough", icon: <Strikethrough className="h-4 w-4" />, prefix: "~~", suffix: "~~" },
  { id: "code", label: "Inline code", icon: <Code className="h-4 w-4" />, prefix: "`", suffix: "`" },
  { id: "h1", label: "Heading 1", icon: <Heading1 className="h-4 w-4" />, linePrefix: "# " },
  { id: "h2", label: "Heading 2", icon: <Heading2 className="h-4 w-4" />, linePrefix: "## " },
  { id: "h3", label: "Heading 3", icon: <Heading3 className="h-4 w-4" />, linePrefix: "### " },
  { id: "ul", label: "Bullet list", icon: <List className="h-4 w-4" />, linePrefix: "- " },
  { id: "ol", label: "Numbered list", icon: <ListOrdered className="h-4 w-4" />, linePrefix: "1. " },
  { id: "quote", label: "Quote", icon: <Quote className="h-4 w-4" />, linePrefix: "> " },
  { id: "hr", label: "Horizontal rule", icon: <Minus className="h-4 w-4" />, prefix: "\n---\n", suffix: "" },
  { id: "codeblock", label: "Code block", icon: <FileCode2 className="h-4 w-4" />, prefix: "\n```\n", suffix: "\n```\n" },
  { id: "link", label: "Insert link", icon: <Link className="h-4 w-4" />, custom: true },
  { id: "image", label: "Insert image", icon: <Image className="h-4 w-4" />, custom: true },
];

/* ------------------------------------------------------------------ */
/*  Simple markdown renderer                                          */
/* ------------------------------------------------------------------ */

function renderMarkdown(md: string): string {
  let html = md
    // Escape HTML
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Code blocks (before inline processing)
  html = html.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    (_match, lang, code) =>
      `<pre class="bg-gray-100 dark:bg-gray-800 rounded p-2 my-2 overflow-x-auto"><code class="language-${lang}">${code.trim()}</code></pre>`,
  );

  // LaTeX blocks
  html = html.replace(
    /\$\$([\s\S]*?)\$\$/g,
    (_match, tex) =>
      `<div class="my-2 text-center font-mono text-sm bg-blue-50 dark:bg-blue-900/20 rounded p-2">[LaTeX: ${tex.trim()}]</div>`,
  );

  // Inline LaTeX
  html = html.replace(
    /\$([^$\n]+)\$/g,
    (_match, tex) =>
      `<span class="font-mono text-sm bg-blue-50 dark:bg-blue-900/20 rounded px-1">[LaTeX: ${tex}]</span>`,
  );

  // Headings
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold mt-3 mb-1">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-4 mb-1">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>');

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr class="my-4 border-gray-300 dark:border-gray-600" />');

  // Bold, italic, strikethrough, inline code
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/_(.+?)_/g, "<em>$1</em>");
  html = html.replace(/~~(.+?)~~/g, "<del>$1</del>");
  html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-800 rounded px-1 text-sm">$1</code>');

  // Links and images
  html = html.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    '<img src="$2" alt="$1" class="max-w-full rounded my-2" />',
  );
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="text-blue-600 dark:text-blue-400 underline" target="_blank" rel="noopener noreferrer">$1</a>',
  );

  // Blockquotes
  html = html.replace(
    /^&gt; (.+)$/gm,
    '<blockquote class="border-l-4 border-gray-300 dark:border-gray-600 pl-3 my-1 text-gray-600 dark:text-gray-400">$1</blockquote>',
  );

  // Unordered lists
  html = html.replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>');

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>');

  // Paragraphs (double newline)
  html = html.replace(/\n\n/g, '</p><p class="my-2">');
  html = `<p class="my-2">${html}</p>`;

  return html;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function RichTextEditor({
  initialContent = "",
  onChange,
  onSave,
  placeholder = "Write in Markdown...",
  autosaveIntervalMs = 5000,
  draftKey,
  minHeight = 300,
  className,
}: RichTextEditorProps) {
  // Try to recover draft from localStorage
  const recoveredDraft = useMemo(() => {
    if (!draftKey || typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem(`draft:${draftKey}`);
      if (stored) {
        const parsed = JSON.parse(stored) as {
          content: string;
          savedAt: number;
        };
        return parsed;
      }
    } catch {
      // Ignore
    }
    return null;
  }, [draftKey]);

  const [content, setContent] = useState(
    recoveredDraft?.content ?? initialContent,
  );
  const [showPreview, setShowPreview] = useState(false);
  const [showDraftNotice, setShowDraftNotice] = useState(!!recoveredDraft);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Undo / redo history
  const historyRef = useRef<HistoryEntry[]>([
    { content: initialContent, cursorPos: 0 },
  ]);
  const historyIndexRef = useRef(0);

  /* ---- Push to history ---- */
  const pushHistory = useCallback((newContent: string, cursorPos: number) => {
    const idx = historyIndexRef.current;
    // Trim future entries
    historyRef.current = historyRef.current.slice(0, idx + 1);
    historyRef.current.push({ content: newContent, cursorPos });
    historyIndexRef.current = historyRef.current.length - 1;
  }, []);

  /* ---- Content change handler ---- */
  const handleChange = useCallback(
    (newContent: string) => {
      setContent(newContent);
      onChange?.(newContent);
      pushHistory(newContent, textareaRef.current?.selectionStart ?? 0);
    },
    [onChange, pushHistory],
  );

  /* ---- Undo / redo ---- */
  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      const entry = historyRef.current[historyIndexRef.current];
      setContent(entry.content);
      onChange?.(entry.content);
      requestAnimationFrame(() => {
        textareaRef.current?.setSelectionRange(
          entry.cursorPos,
          entry.cursorPos,
        );
      });
    }
  }, [onChange]);

  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++;
      const entry = historyRef.current[historyIndexRef.current];
      setContent(entry.content);
      onChange?.(entry.content);
      requestAnimationFrame(() => {
        textareaRef.current?.setSelectionRange(
          entry.cursorPos,
          entry.cursorPos,
        );
      });
    }
  }, [onChange]);

  /* ---- Autosave ---- */
  useEffect(() => {
    if (!draftKey || autosaveIntervalMs <= 0) return;

    const timer = setInterval(() => {
      try {
        localStorage.setItem(
          `draft:${draftKey}`,
          JSON.stringify({ content, savedAt: Date.now() }),
        );
      } catch {
        // localStorage may be full or unavailable
      }
    }, autosaveIntervalMs);

    return () => clearInterval(timer);
  }, [content, draftKey, autosaveIntervalMs]);

  /* ---- Apply toolbar action ---- */
  const applyAction = useCallback(
    (action: ToolbarAction) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = content.slice(start, end);

      if (action.custom) {
        if (action.id === "link") {
          const url = prompt("Enter URL:");
          if (!url) return;
          const text = selected || "link text";
          const inserted = `[${text}](${url})`;
          const newContent =
            content.slice(0, start) + inserted + content.slice(end);
          handleChange(newContent);
          return;
        }
        if (action.id === "image") {
          const url = prompt("Enter image URL:");
          if (!url) return;
          const alt = selected || "image";
          const inserted = `![${alt}](${url})`;
          const newContent =
            content.slice(0, start) + inserted + content.slice(end);
          handleChange(newContent);
          return;
        }
        return;
      }

      if (action.linePrefix) {
        // Line-level formatting
        const lineStart = content.lastIndexOf("\n", start - 1) + 1;
        const before = content.slice(0, lineStart);
        const after = content.slice(lineStart);
        const newContent = before + action.linePrefix + after;
        handleChange(newContent);
        requestAnimationFrame(() => {
          const newPos = start + action.linePrefix!.length;
          textarea.setSelectionRange(newPos, newPos);
          textarea.focus();
        });
        return;
      }

      // Inline wrap
      const prefix = action.prefix ?? "";
      const suffix = action.suffix ?? "";
      const wrapped = prefix + (selected || action.label) + suffix;
      const newContent =
        content.slice(0, start) + wrapped + content.slice(end);
      handleChange(newContent);

      requestAnimationFrame(() => {
        const newPos = start + prefix.length + (selected || action.label).length;
        textarea.setSelectionRange(
          start + prefix.length,
          newPos,
        );
        textarea.focus();
      });
    },
    [content, handleChange],
  );

  /* ---- Keyboard shortcuts ---- */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key === "s") {
        e.preventDefault();
        onSave?.(content);
        // Clear draft on explicit save
        if (draftKey) {
          try {
            localStorage.removeItem(`draft:${draftKey}`);
          } catch {
            // Ignore
          }
        }
        return;
      }

      if (ctrl && e.key === "b") {
        e.preventDefault();
        applyAction(TOOLBAR_ACTIONS.find((a) => a.id === "bold")!);
        return;
      }

      if (ctrl && e.key === "i") {
        e.preventDefault();
        applyAction(TOOLBAR_ACTIONS.find((a) => a.id === "italic")!);
        return;
      }

      if (ctrl && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      // Tab inserts spaces
      if (e.key === "Tab") {
        e.preventDefault();
        const textarea = textareaRef.current!;
        const start = textarea.selectionStart;
        const newContent =
          content.slice(0, start) + "  " + content.slice(start);
        handleChange(newContent);
        requestAnimationFrame(() => {
          textarea.setSelectionRange(start + 2, start + 2);
        });
      }
    },
    [content, onSave, draftKey, applyAction, undo, redo, handleChange],
  );

  /* ---- Dismiss draft notice ---- */
  const dismissDraft = useCallback(() => {
    setShowDraftNotice(false);
  }, []);

  const discardDraft = useCallback(() => {
    setContent(initialContent);
    onChange?.(initialContent);
    setShowDraftNotice(false);
    if (draftKey) {
      try {
        localStorage.removeItem(`draft:${draftKey}`);
      } catch {
        // Ignore
      }
    }
  }, [initialContent, onChange, draftKey]);

  const preview = useMemo(() => renderMarkdown(content), [content]);

  return (
    <div className={cn("flex flex-col rounded-md border border-gray-300 dark:border-gray-700", className)}>
      {/* Draft recovery notice */}
      {showDraftNotice && (
        <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-3 py-2 text-xs dark:border-amber-800 dark:bg-amber-900/30">
          <Save className="h-3.5 w-3.5 text-amber-600" />
          <span className="text-amber-800 dark:text-amber-200">
            Recovered unsaved draft
            {recoveredDraft &&
              ` from ${new Date(recoveredDraft.savedAt).toLocaleString()}`}
          </span>
          <button
            className="ml-auto text-amber-700 underline dark:text-amber-300"
            onClick={dismissDraft}
          >
            Keep
          </button>
          <button
            className="text-amber-700 underline dark:text-amber-300"
            onClick={discardDraft}
          >
            Discard
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-200 px-2 py-1 dark:border-gray-700">
        {TOOLBAR_ACTIONS.map((action) => (
          <button
            key={action.id}
            title={
              action.shortcut
                ? `${action.label} (${action.shortcut})`
                : action.label
            }
            className="rounded p-1.5 text-gray-600 transition hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            onClick={() => applyAction(action)}
            type="button"
          >
            {action.icon}
          </button>
        ))}

        <div className="mx-1 h-5 w-px bg-gray-200 dark:bg-gray-700" />

        <button
          className="rounded p-1.5 text-gray-600 transition hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          onClick={undo}
          title="Undo (Ctrl+Z)"
          type="button"
        >
          <Undo className="h-4 w-4" />
        </button>
        <button
          className="rounded p-1.5 text-gray-600 transition hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          onClick={redo}
          title="Redo (Ctrl+Shift+Z)"
          type="button"
        >
          <Redo className="h-4 w-4" />
        </button>

        <div className="mx-1 h-5 w-px bg-gray-200 dark:bg-gray-700" />

        <button
          className={cn(
            "flex items-center gap-1 rounded px-2 py-1 text-xs transition",
            showPreview
              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
              : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800",
          )}
          onClick={() => setShowPreview(!showPreview)}
          type="button"
        >
          {showPreview ? (
            <>
              <EyeOff className="h-3.5 w-3.5" /> Edit
            </>
          ) : (
            <>
              <Eye className="h-3.5 w-3.5" /> Preview
            </>
          )}
        </button>
      </div>

      {/* Editor / Preview area */}
      {showPreview ? (
        <div
          className="prose prose-sm dark:prose-invert max-w-none overflow-auto px-4 py-3"
          style={{ minHeight }}
          dangerouslySetInnerHTML={{ __html: preview }}
        />
      ) : (
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full resize-y bg-transparent px-4 py-3 font-mono text-sm leading-relaxed outline-none placeholder:text-gray-400"
          style={{ minHeight }}
          spellCheck
        />
      )}

      {/* Status bar */}
      <div className="flex items-center justify-between border-t border-gray-200 px-3 py-1 text-[10px] text-gray-500 dark:border-gray-700 dark:text-gray-500">
        <span>
          {content.length} chars &middot;{" "}
          {content.split(/\s+/).filter(Boolean).length} words
        </span>
        <span>Markdown</span>
      </div>
    </div>
  );
}

export default RichTextEditor;
