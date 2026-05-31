import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useExport } from "@/hooks/useExport";

describe("useExport", () => {
  const testData = [
    { id: 1, name: "Juan", amount: 1000 },
    { id: 2, name: "María", amount: 2000 },
  ] as unknown as Record<string, unknown>[];

  const columns = [
    { key: "id", header: "ID" },
    { key: "name", header: "Nombre" },
    { key: "amount", header: "Monto", format: (v: unknown) => `$${v}` },
  ];

  beforeEach(() => {
    // Mock URL methods
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:mock-url"),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("returns handleExport, exportCSV, and exportPrint functions", () => {
    const { result } = renderHook(() =>
      useExport(testData, { filename: "test", columns })
    );
    expect(typeof result.current.handleExport).toBe("function");
    expect(typeof result.current.exportCSV).toBe("function");
    expect(typeof result.current.exportPrint).toBe("function");
  });

  it("exportCSV creates a blob and triggers download", () => {
    const mockAnchor = {
      href: "",
      download: "",
      click: vi.fn(),
      style: {},
    };

    const createElementSpy = vi
      .spyOn(document, "createElement")
      .mockImplementation((tag: string) => {
        if (tag === "a") return mockAnchor as unknown as HTMLElement;
        // For other tags, use the real implementation
        return Object.create(HTMLElement.prototype) as HTMLElement;
      });

    vi.spyOn(document.body, "appendChild").mockImplementation(() => document.body);
    vi.spyOn(document.body, "removeChild").mockImplementation(() => document.body);

    const { result } = renderHook(() =>
      useExport(testData, { filename: "test", columns })
    );

    result.current.exportCSV();

    expect(mockAnchor.click).toHaveBeenCalled();
    expect(mockAnchor.download).toContain("test");
  });

  it("handleExport('print') calls window.print", () => {
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});

    const { result } = renderHook(() =>
      useExport(testData, { filename: "test", columns })
    );

    result.current.handleExport("print");
    expect(printSpy).toHaveBeenCalled();
  });

  it("handleExport('pdf') calls window.print", () => {
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});

    const { result } = renderHook(() =>
      useExport(testData, { filename: "test", columns })
    );

    result.current.handleExport("pdf");
    expect(printSpy).toHaveBeenCalled();
  });
});
