"use client";

/**
 * Skip-to-content link for keyboard and screen reader accessibility.
 * Renders a visually hidden link that becomes visible on focus.
 * Place at the very top of the page layout.
 */
export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="
        sr-only focus:not-sr-only
        fixed top-2 left-2 z-[9999]
        px-4 py-2 rounded-lg
        bg-primary text-primary-foreground
        text-sm font-semibold
        shadow-lg
        focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
        transition-all duration-150
      "
    >
      Saltar al contenido principal
    </a>
  );
}
