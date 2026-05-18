"use client";

import {
  useState,
  useCallback,
  useRef,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TagInputProps {
  tags?: string[];
  defaultTags?: string[];
  onTagsChange?: (tags: string[]) => void;
  maxTags?: number;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function TagInput({
  tags: controlledTags,
  defaultTags = [],
  onTagsChange,
  maxTags,
  placeholder = "Type and press Enter...",
  className,
  disabled = false,
}: TagInputProps) {
  const [internalTags, setInternalTags] = useState<string[]>(defaultTags);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const isControlled = controlledTags !== undefined;
  const tags = isControlled ? controlledTags : internalTags;

  const updateTags = useCallback(
    (newTags: string[]) => {
      if (!isControlled) {
        setInternalTags(newTags);
      }
      onTagsChange?.(newTags);
    },
    [isControlled, onTagsChange]
  );

  const addTag = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return;
      if (tags.includes(trimmed)) return;
      if (maxTags && tags.length >= maxTags) return;

      updateTags([...tags, trimmed]);
      setInputValue("");
    },
    [tags, maxTags, updateTags]
  );

  const removeTag = useCallback(
    (index: number) => {
      updateTags(tags.filter((_, i) => i !== index));
    },
    [tags, updateTags]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addTag(inputValue);
      } else if (e.key === "Backspace" && inputValue === "" && tags.length > 0) {
        removeTag(tags.length - 1);
      }
    },
    [inputValue, tags, addTag, removeTag]
  );

  const atLimit = maxTags !== undefined && tags.length >= maxTags;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 transition-colors focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/20",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((tag, index) => (
        <span
          key={`${tag}-${index}`}
          className="flex items-center gap-1 rounded-md bg-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-300"
        >
          {tag}
          {!disabled && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeTag(index);
              }}
              className="rounded-sm p-0.5 text-blue-300/60 hover:text-blue-200"
              aria-label={`Remove ${tag}`}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </span>
      ))}
      {!atLimit && (
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : ""}
          disabled={disabled}
          className="min-w-[120px] flex-1 bg-transparent text-sm text-white placeholder-white/30 outline-none"
          aria-label="Add tag"
        />
      )}
      {maxTags && (
        <span className="ml-auto text-[10px] text-white/30">
          {tags.length}/{maxTags}
        </span>
      )}
    </div>
  );
}
