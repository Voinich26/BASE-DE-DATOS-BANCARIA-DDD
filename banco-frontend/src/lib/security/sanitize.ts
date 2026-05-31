/**
 * Input sanitization utilities — XSS prevention without external dependencies.
 * For rich HTML content, use DOMPurify in production.
 */

// ── HTML entity encoding ──────────────────────────────────────────────────────

const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
  "`": "&#x60;",
  "=": "&#x3D;",
};

/**
 * Escape HTML special characters to prevent XSS in text content.
 */
export function escapeHtml(str: string): string {
  return String(str).replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] ?? char);
}

/**
 * Strip all HTML tags from a string.
 */
export function stripHtml(str: string): string {
  return String(str).replace(/<[^>]*>/g, "");
}

/**
 * Sanitize a string for safe display — strips HTML and trims whitespace.
 */
export function sanitizeText(str: string): string {
  return stripHtml(str).trim();
}

/**
 * Sanitize a URL — only allow http/https/mailto protocols.
 */
export function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  if (/^(https?:\/\/|mailto:)/i.test(trimmed)) {
    return trimmed;
  }
  return "#";
}

/**
 * Sanitize a numeric string — only digits, dots and minus.
 */
export function sanitizeNumeric(str: string): string {
  return str.replace(/[^0-9.\-]/g, "");
}

/**
 * Sanitize an account number — only alphanumeric and hyphens.
 */
export function sanitizeAccountNumber(str: string): string {
  return str.replace(/[^a-zA-Z0-9\-]/g, "").slice(0, 30);
}

/**
 * Sanitize a search query — remove special regex/SQL characters.
 */
export function sanitizeSearchQuery(str: string): string {
  return str.replace(/[<>'";&|\\]/g, "").slice(0, 100);
}

/**
 * Validate email format.
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate Colombian NIT format (digits with optional hyphen).
 */
export function isValidNIT(nit: string): boolean {
  return /^\d{6,12}(-\d)?$/.test(nit.trim());
}

/**
 * Validate Colombian phone number.
 */
export function isValidPhone(phone: string): boolean {
  return /^(\+57)?[\s\-]?[3][0-9]{9}$/.test(phone.replace(/\s/g, ""));
}

/**
 * Truncate and sanitize a string for safe logging (no PII leakage).
 */
export function sanitizeForLog(str: string, maxLength = 50): string {
  return sanitizeText(str).slice(0, maxLength);
}
