import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyTheme, resolveTheme, setThemeChoice, storedChoice, systemTheme } from "./theme";

function mockPrefersDark(dark: boolean) {
  const listeners = new Set<() => void>();
  const query = {
    matches: dark,
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
  };
  vi.stubGlobal("matchMedia", vi.fn(() => query));
  return query;
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.className = "";
  document.documentElement.style.colorScheme = "";
});

afterEach(() => vi.unstubAllGlobals());

describe("systemTheme", () => {
  it("follows prefers-color-scheme", () => {
    mockPrefersDark(true);
    expect(systemTheme()).toBe("dark");
    mockPrefersDark(false);
    expect(systemTheme()).toBe("light");
  });
});

describe("resolveTheme", () => {
  it("defaults to system when nothing is stored", () => {
    mockPrefersDark(false);
    expect(storedChoice()).toBe("system");
    expect(resolveTheme()).toBe("light");
  });

  it("lets an explicit choice beat the system preference", () => {
    mockPrefersDark(true);
    expect(resolveTheme("light")).toBe("light");
    mockPrefersDark(false);
    expect(resolveTheme("dark")).toBe("dark");
  });

  it("ignores a corrupted stored value rather than throwing", () => {
    mockPrefersDark(false);
    localStorage.setItem("openseimas-theme", "banana");
    expect(storedChoice()).toBe("system");
    expect(resolveTheme()).toBe("light");
  });
});

describe("applyTheme", () => {
  it("adds the dark class, which is what the CSS switches on", () => {
    applyTheme("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });

  it("removes it for light", () => {
    applyTheme("dark");
    applyTheme("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe("light");
  });
});

describe("setThemeChoice", () => {
  it("persists an explicit choice", () => {
    mockPrefersDark(false);
    expect(setThemeChoice("dark")).toBe("dark");
    expect(localStorage.getItem("openseimas-theme")).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("clears storage when returning to system", () => {
    mockPrefersDark(true);
    setThemeChoice("light");
    expect(setThemeChoice("system")).toBe("dark");
    expect(localStorage.getItem("openseimas-theme")).toBeNull();
  });
});
