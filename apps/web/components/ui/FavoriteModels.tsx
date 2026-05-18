"use client";

import { useState, useCallback, useEffect } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "chetana-favorite-models";

/**
 * Reads the set of favorited model IDs from localStorage.
 */
function readFavorites(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

/**
 * Writes the set of favorited model IDs to localStorage.
 */
function writeFavorites(favorites: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...favorites]));
  } catch {
    // Quota exceeded or unavailable - silently ignore
  }
}

export interface UseFavoriteModelsReturn {
  /** Set of favorited model IDs. */
  favorites: Set<string>;
  /** Toggle a model's favorite status. */
  toggle: (modelId: string) => void;
  /** Check if a model is favorited. */
  isFavorite: (modelId: string) => boolean;
  /** Sort an array of models so favorites come first. */
  sortWithFavorites: <T extends { modelId: string }>(models: T[]) => T[];
}

/**
 * Hook for managing favorite/pinned models with localStorage persistence.
 */
export function useFavoriteModels(): UseFavoriteModelsReturn {
  const [favorites, setFavorites] = useState<Set<string>>(() => readFavorites());

  // Sync across tabs via storage event
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setFavorites(readFavorites());
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const toggle = useCallback((modelId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(modelId)) {
        next.delete(modelId);
      } else {
        next.add(modelId);
      }
      writeFavorites(next);
      return next;
    });
  }, []);

  const isFavorite = useCallback(
    (modelId: string) => favorites.has(modelId),
    [favorites]
  );

  const sortWithFavorites = useCallback(
    <T extends { modelId: string }>(models: T[]): T[] => {
      return [...models].sort((a, b) => {
        const aFav = favorites.has(a.modelId) ? 0 : 1;
        const bFav = favorites.has(b.modelId) ? 0 : 1;
        return aFav - bFav;
      });
    },
    [favorites]
  );

  return { favorites, toggle, isFavorite, sortWithFavorites };
}

/**
 * Star/pin toggle button for model cards.
 */
export function FavoriteToggle({
  modelId,
  className,
}: {
  modelId: string;
  className?: string;
}) {
  const { isFavorite, toggle } = useFavoriteModels();
  const favorited = isFavorite(modelId);

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        toggle(modelId);
      }}
      className={cn(
        "rounded-md p-1.5 transition-colors",
        favorited
          ? "text-yellow-400 hover:text-yellow-300"
          : "text-white/20 hover:text-white/50",
        className
      )}
      aria-label={favorited ? `Remove ${modelId} from favorites` : `Add ${modelId} to favorites`}
      aria-pressed={favorited}
    >
      <Star
        className="h-4 w-4"
        fill={favorited ? "currentColor" : "none"}
      />
    </button>
  );
}

/**
 * Renders a list of favorited models as compact chips.
 */
export function FavoriteModelsList({
  models,
  className,
}: {
  models: { modelId: string; displayName: string }[];
  className?: string;
}) {
  const { favorites, toggle } = useFavoriteModels();
  const favorited = models.filter((m) => favorites.has(m.modelId));

  if (favorited.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <span className="text-xs font-medium text-white/40">Pinned:</span>
      {favorited.map((model) => (
        <span
          key={model.modelId}
          className="inline-flex items-center gap-1 rounded-full border border-yellow-500/20 bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-300"
        >
          <Star className="h-3 w-3" fill="currentColor" />
          {model.displayName}
          <button
            onClick={() => toggle(model.modelId)}
            className="ml-0.5 rounded-full p-0.5 hover:bg-yellow-500/20"
            aria-label={`Unpin ${model.displayName}`}
          >
            <span className="sr-only">Remove</span>
            &times;
          </button>
        </span>
      ))}
    </div>
  );
}
