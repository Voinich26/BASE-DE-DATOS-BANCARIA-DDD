import { describe, expect, it } from "vitest";
import { extractErrorMessage } from "./api";

describe("extractErrorMessage", () => {
  it("returns friendly text for 401 responses", () => {
    const error = {
      isAxiosError: true,
      response: { status: 401 },
      code: undefined,
    } as unknown;

    expect(extractErrorMessage(error)).toContain("Sesión expirada");
  });

  it("returns server error text for 500 responses", () => {
    const error = {
      isAxiosError: true,
      response: { status: 500 },
      code: undefined,
    } as unknown;

    expect(extractErrorMessage(error)).toContain("Error interno del servidor");
  });
});
