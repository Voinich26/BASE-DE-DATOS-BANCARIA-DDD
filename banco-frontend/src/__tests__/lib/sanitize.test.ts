import { describe, it, expect } from "vitest";
import {
  escapeHtml,
  stripHtml,
  sanitizeText,
  sanitizeUrl,
  sanitizeNumeric,
  sanitizeAccountNumber,
  sanitizeSearchQuery,
  isValidEmail,
  isValidNIT,
} from "@/lib/security/sanitize";

describe("escapeHtml", () => {
  it("escapes angle brackets", () => {
    expect(escapeHtml("<script>alert(1)</script>")).toBe(
      "&lt;script&gt;alert(1)&lt;&#x2F;script&gt;"
    );
  });

  it("escapes ampersand", () => {
    expect(escapeHtml("a & b")).toBe("a &amp; b");
  });

  it("escapes double quotes", () => {
    expect(escapeHtml('"hello"')).toBe("&quot;hello&quot;");
  });
});

describe("stripHtml", () => {
  it("removes HTML tags", () => {
    expect(stripHtml("<b>bold</b> text")).toBe("bold text");
  });

  it("removes nested tags", () => {
    expect(stripHtml("<div><p>hello</p></div>")).toBe("hello");
  });
});

describe("sanitizeUrl", () => {
  it("allows https URLs", () => {
    expect(sanitizeUrl("https://example.com")).toBe("https://example.com");
  });

  it("allows http URLs", () => {
    expect(sanitizeUrl("http://localhost:3000")).toBe("http://localhost:3000");
  });

  it("blocks javascript: protocol", () => {
    expect(sanitizeUrl("javascript:alert(1)")).toBe("#");
  });

  it("blocks data: protocol", () => {
    expect(sanitizeUrl("data:text/html,<script>")).toBe("#");
  });
});

describe("sanitizeNumeric", () => {
  it("keeps digits and dots", () => {
    expect(sanitizeNumeric("1,234.56abc")).toBe("1234.56");
  });

  it("keeps minus sign", () => {
    expect(sanitizeNumeric("-100.50")).toBe("-100.50");
  });
});

describe("sanitizeAccountNumber", () => {
  it("keeps alphanumeric and hyphens", () => {
    expect(sanitizeAccountNumber("001-123456-01")).toBe("001-123456-01");
  });

  it("removes special characters", () => {
    expect(sanitizeAccountNumber("001<script>")).toBe("001script");
  });

  it("truncates to 30 chars", () => {
    expect(sanitizeAccountNumber("a".repeat(50))).toHaveLength(30);
  });
});

describe("isValidEmail", () => {
  it("validates correct email", () => {
    expect(isValidEmail("user@banco.com")).toBe(true);
  });

  it("rejects invalid email", () => {
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(isValidEmail("@banco.com")).toBe(false);
  });
});

describe("isValidNIT", () => {
  it("validates NIT with hyphen", () => {
    expect(isValidNIT("900123456-1")).toBe(true);
  });

  it("validates NIT without hyphen", () => {
    expect(isValidNIT("900123456")).toBe(true);
  });

  it("rejects short NIT", () => {
    expect(isValidNIT("123")).toBe(false);
  });
});
