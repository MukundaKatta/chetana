"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

export function KeyboardShortcutsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const isModifier = event.metaKey || event.ctrlKey;
      const target = event.target as HTMLElement;

      // Ignore shortcuts when typing in inputs/textareas
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        // Only handle Escape in input fields
        if (event.key === "Escape") {
          target.blur();
        }
        return;
      }

      // Cmd/Ctrl + N -> New Audit
      if (isModifier && event.key === "n") {
        event.preventDefault();
        router.push("/audit/new");
        return;
      }

      // Cmd/Ctrl + K -> Focus search or navigate to dashboard
      if (isModifier && event.key === "k") {
        event.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>(
          '[data-search-input], input[type="search"], input[placeholder*="Search"]'
        );
        if (searchInput) {
          searchInput.focus();
        } else {
          router.push("/audit");
        }
        return;
      }

      // Escape -> Close any open modals
      if (event.key === "Escape") {
        const modal = document.querySelector("[data-modal], [role='dialog']");
        if (modal) {
          const closeButton = modal.querySelector<HTMLButtonElement>(
            "[data-modal-close], button[aria-label='Close']"
          );
          if (closeButton) {
            closeButton.click();
          }
        }
        return;
      }
    },
    [router]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  return <>{children}</>;
}
