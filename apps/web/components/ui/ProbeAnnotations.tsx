"use client";

/**
 * Probe result annotation system (Issue #371).
 * Inline comments on responses, threaded discussions,
 * @mention support, annotation summary per audit,
 * export annotations with data.
 */

import {
  useState,
  useCallback,
  useMemo,
  useRef,
  type FormEvent,
} from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface AnnotationUser {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface Annotation {
  /** Unique annotation ID. */
  id: string;
  /** Probe result ID this annotation is attached to. */
  probeResultId: string;
  /** Audit ID. */
  auditId: string;
  /** Author. */
  author: AnnotationUser;
  /** Annotation text (supports @mentions). */
  text: string;
  /** Parsed mentions. */
  mentions: string[];
  /** Parent annotation ID (for threads). */
  parentId: string | null;
  /** ISO timestamp when created. */
  createdAt: string;
  /** ISO timestamp when last edited. */
  editedAt: string | null;
  /** Whether this annotation is resolved. */
  resolved: boolean;
  /** Selection range in the response text (optional). */
  selectionRange?: {
    start: number;
    end: number;
    selectedText: string;
  };
}

export interface AnnotationThread {
  /** Root annotation. */
  root: Annotation;
  /** Reply annotations. */
  replies: Annotation[];
  /** Whether the thread is resolved. */
  resolved: boolean;
  /** Total annotations in thread. */
  count: number;
}

export interface AnnotationSummary {
  auditId: string;
  totalAnnotations: number;
  totalThreads: number;
  resolvedThreads: number;
  unresolvedThreads: number;
  mentionedUsers: string[];
  annotationsByProbe: Record<string, number>;
}

export interface ProbeAnnotationsProps {
  /** Probe result ID. */
  probeResultId: string;
  /** Audit ID. */
  auditId: string;
  /** Existing annotations. */
  annotations: Annotation[];
  /** Current user. */
  currentUser: AnnotationUser;
  /** All mentionable users. */
  users: AnnotationUser[];
  /** Response text to annotate. */
  responseText: string;
  /** Callback when a new annotation is created. */
  onAnnotationCreate?: (annotation: Omit<Annotation, "id" | "createdAt" | "editedAt">) => void;
  /** Callback when an annotation is edited. */
  onAnnotationEdit?: (id: string, text: string) => void;
  /** Callback when an annotation is resolved. */
  onAnnotationResolve?: (id: string, resolved: boolean) => void;
  /** Callback when an annotation is deleted. */
  onAnnotationDelete?: (id: string) => void;
  /** Custom class name. */
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function parseMentions(text: string): string[] {
  const regex = /@(\w+)/g;
  const mentions: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    mentions.push(match[1]!);
  }
  return [...new Set(mentions)];
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

function renderTextWithMentions(text: string): (string | JSX.Element)[] {
  const parts: (string | JSX.Element)[] = [];
  const regex = /@(\w+)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <span
        key={match.index}
        className="rounded bg-blue-100 px-1 font-medium text-blue-700"
      >
        @{match[1]}
      </span>
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

function buildThreads(annotations: Annotation[]): AnnotationThread[] {
  const roots = annotations.filter((a) => a.parentId === null);
  const replyMap = new Map<string, Annotation[]>();

  for (const a of annotations) {
    if (a.parentId) {
      const existing = replyMap.get(a.parentId) ?? [];
      existing.push(a);
      replyMap.set(a.parentId, existing);
    }
  }

  return roots.map((root) => {
    const replies = (replyMap.get(root.id) ?? []).sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    return {
      root,
      replies,
      resolved: root.resolved,
      count: 1 + replies.length,
    };
  });
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function ProbeAnnotations({
  probeResultId,
  auditId,
  annotations,
  currentUser,
  users,
  responseText,
  onAnnotationCreate,
  onAnnotationEdit,
  onAnnotationResolve,
  onAnnotationDelete,
  className,
}: ProbeAnnotationsProps) {
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [showResolved, setShowResolved] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Build threads
  const threads = useMemo(() => buildThreads(annotations), [annotations]);

  const visibleThreads = useMemo(
    () =>
      showResolved
        ? threads
        : threads.filter((t) => !t.resolved),
    [threads, showResolved]
  );

  const resolvedCount = useMemo(
    () => threads.filter((t) => t.resolved).length,
    [threads]
  );

  // Create annotation
  const handleCreate = useCallback(
    (text: string, parentId: string | null) => {
      if (!text.trim()) return;

      const mentions = parseMentions(text);
      onAnnotationCreate?.({
        probeResultId,
        auditId,
        author: currentUser,
        text: text.trim(),
        mentions,
        parentId,
        resolved: false,
      });

      setReplyingTo(null);
    },
    [probeResultId, auditId, currentUser, onAnnotationCreate]
  );

  // Edit annotation
  const handleEdit = useCallback(
    (id: string) => {
      if (!editText.trim()) return;
      onAnnotationEdit?.(id, editText.trim());
      setEditingId(null);
      setEditText("");
    },
    [editText, onAnnotationEdit]
  );

  // Start editing
  const startEdit = useCallback((annotation: Annotation) => {
    setEditingId(annotation.id);
    setEditText(annotation.text);
  }, []);

  // Mention autocomplete
  const mentionSuggestions = useMemo(() => {
    if (!mentionQuery) return [];
    const q = mentionQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.id !== currentUser.id &&
        (u.name.toLowerCase().includes(q) ||
          u.id.toLowerCase().includes(q))
    );
  }, [mentionQuery, users, currentUser.id]);

  return (
    <div className={cn("rounded-lg border bg-white", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b p-3">
        <h4 className="text-sm font-semibold">
          Annotations ({annotations.length})
        </h4>
        <div className="flex items-center gap-2">
          {resolvedCount > 0 && (
            <button
              onClick={() => setShowResolved(!showResolved)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              {showResolved
                ? "Hide resolved"
                : `Show ${resolvedCount} resolved`}
            </button>
          )}
        </div>
      </div>

      {/* Response context (truncated) */}
      <div className="border-b bg-gray-50 p-3">
        <p className="line-clamp-3 text-xs text-gray-600">
          {responseText.slice(0, 300)}
          {responseText.length > 300 ? "..." : ""}
        </p>
      </div>

      {/* Threads */}
      <div className="max-h-96 divide-y overflow-y-auto">
        {visibleThreads.length === 0 && (
          <div className="p-4 text-center text-sm text-gray-400">
            No annotations yet. Add the first one below.
          </div>
        )}

        {visibleThreads.map((thread) => (
          <div key={thread.root.id} className="p-3">
            {/* Root annotation */}
            <AnnotationItem
              annotation={thread.root}
              currentUser={currentUser}
              isEditing={editingId === thread.root.id}
              editText={editText}
              onEditTextChange={setEditText}
              onStartEdit={() => startEdit(thread.root)}
              onSaveEdit={() => handleEdit(thread.root.id)}
              onCancelEdit={() => {
                setEditingId(null);
                setEditText("");
              }}
              onResolve={() =>
                onAnnotationResolve?.(
                  thread.root.id,
                  !thread.root.resolved
                )
              }
              onDelete={() => onAnnotationDelete?.(thread.root.id)}
              onReply={() => setReplyingTo(thread.root.id)}
            />

            {/* Replies */}
            {thread.replies.length > 0 && (
              <div className="ml-6 mt-2 space-y-2 border-l-2 border-gray-100 pl-3">
                {thread.replies.map((reply) => (
                  <AnnotationItem
                    key={reply.id}
                    annotation={reply}
                    currentUser={currentUser}
                    isEditing={editingId === reply.id}
                    editText={editText}
                    onEditTextChange={setEditText}
                    onStartEdit={() => startEdit(reply)}
                    onSaveEdit={() => handleEdit(reply.id)}
                    onCancelEdit={() => {
                      setEditingId(null);
                      setEditText("");
                    }}
                    onDelete={() => onAnnotationDelete?.(reply.id)}
                    isReply
                  />
                ))}
              </div>
            )}

            {/* Reply input */}
            {replyingTo === thread.root.id && (
              <div className="ml-6 mt-2">
                <AnnotationInput
                  ref={inputRef}
                  placeholder="Write a reply..."
                  users={users}
                  currentUser={currentUser}
                  mentionQuery={mentionQuery}
                  mentionSuggestions={mentionSuggestions}
                  onMentionQueryChange={setMentionQuery}
                  onSubmit={(text) => handleCreate(text, thread.root.id)}
                  onCancel={() => setReplyingTo(null)}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* New annotation input */}
      <div className="border-t p-3">
        <AnnotationInput
          placeholder="Add an annotation... (use @name to mention)"
          users={users}
          currentUser={currentUser}
          mentionQuery={mentionQuery}
          mentionSuggestions={mentionSuggestions}
          onMentionQueryChange={setMentionQuery}
          onSubmit={(text) => handleCreate(text, null)}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                    */
/* ------------------------------------------------------------------ */

function AnnotationItem({
  annotation,
  currentUser,
  isEditing,
  editText,
  onEditTextChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onResolve,
  onDelete,
  onReply,
  isReply = false,
}: {
  annotation: Annotation;
  currentUser: AnnotationUser;
  isEditing: boolean;
  editText: string;
  onEditTextChange: (text: string) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onResolve?: () => void;
  onDelete?: () => void;
  onReply?: () => void;
  isReply?: boolean;
}) {
  const isAuthor = annotation.author.id === currentUser.id;

  return (
    <div
      className={cn(
        "group",
        annotation.resolved && "opacity-60"
      )}
    >
      <div className="flex items-start gap-2">
        {/* Avatar */}
        <div
          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gray-300 text-xs font-semibold text-white"
          title={annotation.author.name}
        >
          {annotation.author.name.charAt(0).toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-medium">
              {annotation.author.name}
            </span>
            <span className="text-xs text-gray-400">
              {formatTimestamp(annotation.createdAt)}
            </span>
            {annotation.editedAt && (
              <span className="text-xs text-gray-400">(edited)</span>
            )}
            {annotation.resolved && (
              <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-700">
                Resolved
              </span>
            )}
          </div>

          {isEditing ? (
            <div className="mt-1">
              <textarea
                value={editText}
                onChange={(e) => onEditTextChange(e.target.value)}
                className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                rows={2}
              />
              <div className="mt-1 flex gap-1">
                <button
                  onClick={onSaveEdit}
                  className="rounded bg-blue-600 px-2 py-0.5 text-xs text-white hover:bg-blue-700"
                >
                  Save
                </button>
                <button
                  onClick={onCancelEdit}
                  className="rounded px-2 py-0.5 text-xs text-gray-500 hover:bg-gray-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-0.5 text-sm text-gray-700">
              {renderTextWithMentions(annotation.text)}
            </p>
          )}

          {/* Selection context */}
          {annotation.selectionRange && !isEditing && (
            <div className="mt-1 rounded bg-yellow-50 px-2 py-1 text-xs text-yellow-800">
              &ldquo;{annotation.selectionRange.selectedText}&rdquo;
            </div>
          )}

          {/* Actions */}
          {!isEditing && (
            <div className="mt-1 flex gap-2 opacity-0 group-hover:opacity-100">
              {!isReply && onReply && (
                <button
                  onClick={onReply}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Reply
                </button>
              )}
              {isAuthor && (
                <button
                  onClick={onStartEdit}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Edit
                </button>
              )}
              {!isReply && onResolve && (
                <button
                  onClick={onResolve}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  {annotation.resolved ? "Unresolve" : "Resolve"}
                </button>
              )}
              {isAuthor && onDelete && (
                <button
                  onClick={onDelete}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { forwardRef } from "react";

const AnnotationInput = forwardRef<
  HTMLTextAreaElement,
  {
    placeholder: string;
    users: AnnotationUser[];
    currentUser: AnnotationUser;
    mentionQuery: string | null;
    mentionSuggestions: AnnotationUser[];
    onMentionQueryChange: (query: string | null) => void;
    onSubmit: (text: string) => void;
    onCancel?: () => void;
  }
>(function AnnotationInput(
  {
    placeholder,
    mentionSuggestions,
    onMentionQueryChange,
    onSubmit,
    onCancel,
  },
  ref
) {
  const [text, setText] = useState("");
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = (ref as React.RefObject<HTMLTextAreaElement>) ?? internalRef;

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setText(value);

      // Check for @mention trigger
      const cursorPos = e.target.selectionStart;
      const textBeforeCursor = value.slice(0, cursorPos);
      const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

      if (mentionMatch) {
        onMentionQueryChange(mentionMatch[1]!);
      } else {
        onMentionQueryChange(null);
      }
    },
    [onMentionQueryChange]
  );

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (!text.trim()) return;
      onSubmit(text);
      setText("");
      onMentionQueryChange(null);
    },
    [text, onSubmit, onMentionQueryChange]
  );

  const insertMention = useCallback(
    (user: AnnotationUser) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = text.slice(0, cursorPos);
      const textAfterCursor = text.slice(cursorPos);
      const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

      if (mentionMatch) {
        const before = textBeforeCursor.slice(
          0,
          textBeforeCursor.length - mentionMatch[0].length
        );
        const newText = `${before}@${user.name.replace(/\s/g, "")} ${textAfterCursor}`;
        setText(newText);
      }

      onMentionQueryChange(null);
    },
    [text, textareaRef, onMentionQueryChange]
  );

  return (
    <form onSubmit={handleSubmit} className="relative">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={handleInput}
        placeholder={placeholder}
        rows={2}
        className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
          }
        }}
      />

      {/* Mention suggestions dropdown */}
      {mentionSuggestions.length > 0 && (
        <div className="absolute bottom-full left-0 z-10 mb-1 rounded border bg-white shadow-lg">
          {mentionSuggestions.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => insertMention(user)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-300 text-xs text-white">
                {user.name.charAt(0)}
              </span>
              {user.name}
            </button>
          ))}
        </div>
      )}

      <div className="mt-1 flex items-center justify-between">
        <span className="text-xs text-gray-400">
          Shift+Enter for new line, Enter to submit
        </span>
        <div className="flex gap-1">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={!text.trim()}
            className={cn(
              "rounded px-3 py-1 text-xs text-white",
              text.trim()
                ? "bg-blue-600 hover:bg-blue-700"
                : "cursor-not-allowed bg-gray-300"
            )}
          >
            Comment
          </button>
        </div>
      </div>
    </form>
  );
});

/* ------------------------------------------------------------------ */
/*  Annotation Summary Utility                                        */
/* ------------------------------------------------------------------ */

/**
 * Generate an annotation summary for an audit.
 */
export function getAnnotationSummary(
  auditId: string,
  annotations: Annotation[]
): AnnotationSummary {
  const auditAnnotations = annotations.filter(
    (a) => a.auditId === auditId
  );
  const threads = buildThreads(auditAnnotations);

  const mentionedUsers = new Set<string>();
  for (const a of auditAnnotations) {
    for (const m of a.mentions) {
      mentionedUsers.add(m);
    }
  }

  const annotationsByProbe: Record<string, number> = {};
  for (const a of auditAnnotations) {
    annotationsByProbe[a.probeResultId] =
      (annotationsByProbe[a.probeResultId] ?? 0) + 1;
  }

  return {
    auditId,
    totalAnnotations: auditAnnotations.length,
    totalThreads: threads.length,
    resolvedThreads: threads.filter((t) => t.resolved).length,
    unresolvedThreads: threads.filter((t) => !t.resolved).length,
    mentionedUsers: Array.from(mentionedUsers),
    annotationsByProbe,
  };
}

/**
 * Export annotations as JSON.
 */
export function exportAnnotations(
  annotations: Annotation[]
): string {
  return JSON.stringify(
    annotations.map((a) => ({
      id: a.id,
      probeResultId: a.probeResultId,
      auditId: a.auditId,
      author: a.author.name,
      text: a.text,
      mentions: a.mentions,
      parentId: a.parentId,
      createdAt: a.createdAt,
      resolved: a.resolved,
      selectionRange: a.selectionRange,
    })),
    null,
    2
  );
}
