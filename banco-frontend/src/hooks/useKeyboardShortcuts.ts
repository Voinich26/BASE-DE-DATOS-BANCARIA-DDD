import { useEffect, useCallback } from "react";

export interface Shortcut {
  /** e.g. "k", "ArrowUp", "Escape" */
  key: string;
  /** Require Ctrl/Cmd */
  meta?: boolean;
  /** Require Shift */
  shift?: boolean;
  /** Require Alt */
  alt?: boolean;
  /** Description shown in help */
  description: string;
  /** Handler */
  handler: () => void;
  /** Disable when typing in an input */
  ignoreInputs?: boolean;
}

function isInputFocused(): boolean {
  const tag = document.activeElement?.tagName.toLowerCase();
  const isContentEditable =
    (document.activeElement as HTMLElement)?.isContentEditable;
  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    isContentEditable === true
  );
}

/**
 * Register global keyboard shortcuts.
 * Shortcuts with ignoreInputs=true (default) won't fire when the user is typing.
 */
export function useKeyboardShortcuts(shortcuts: Shortcut[]): void {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const ignoreInputs = shortcut.ignoreInputs !== false;
        if (ignoreInputs && isInputFocused()) continue;

        const metaMatch = shortcut.meta
          ? e.metaKey || e.ctrlKey
          : !e.metaKey && !e.ctrlKey;
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
        const altMatch = shortcut.alt ? e.altKey : !e.altKey;
        const keyMatch =
          e.key.toLowerCase() === shortcut.key.toLowerCase();

        if (metaMatch && shiftMatch && altMatch && keyMatch) {
          e.preventDefault();
          shortcut.handler();
          return;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Format a shortcut for display (e.g. "⌘K", "Ctrl+K", "⇧⌘P")
 */
export function formatShortcut(shortcut: Shortcut): string {
  const isMac =
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad/.test(navigator.platform);
  const parts: string[] = [];
  if (shortcut.meta) parts.push(isMac ? "⌘" : "Ctrl");
  if (shortcut.shift) parts.push(isMac ? "⇧" : "Shift");
  if (shortcut.alt) parts.push(isMac ? "⌥" : "Alt");
  parts.push(shortcut.key.toUpperCase());
  return parts.join(isMac ? "" : "+");
}
