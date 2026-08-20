/**
 * Theme resolution: system preference, with a manual override.
 *
 * Before this, `class="dark"` was hardcoded in index.html and App.tsx forced
 * `classList.add('dark')` on mount — but nothing keyed off either, because
 * :root *was* the dark theme. There was no light mode and no way to ask for
 * one. Now the class is load-bearing.
 */
export type ThemeChoice = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "openseimas-theme";

export function systemTheme(): ResolvedTheme {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** The stored choice, or "system" when the reader has not expressed one. */
export function storedChoice(): ThemeChoice {
  if (typeof localStorage === "undefined") return "system";
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw === "light" || raw === "dark" || raw === "system" ? raw : "system";
}

export function resolveTheme(choice: ThemeChoice = storedChoice()): ResolvedTheme {
  return choice === "system" ? systemTheme() : choice;
}

/** Apply to <html>. The `dark` class is what the CSS actually switches on. */
export function applyTheme(resolved: ResolvedTheme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  // Lets form controls, scrollbars and the browser's own UI match.
  root.style.colorScheme = resolved;
}

export function setThemeChoice(choice: ThemeChoice): ResolvedTheme {
  try {
    if (choice === "system") localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    // Private browsing can refuse storage; the choice still applies for this
    // session rather than throwing.
  }
  const resolved = resolveTheme(choice);
  applyTheme(resolved);
  return resolved;
}

/**
 * Follow the OS while the reader has expressed no preference. Returns an
 * unsubscribe function.
 */
export function watchSystemTheme(onChange: (t: ResolvedTheme) => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = () => {
    if (storedChoice() !== "system") return; // an explicit choice wins
    const resolved = systemTheme();
    applyTheme(resolved);
    onChange(resolved);
  };
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}

/** Called once at startup, after the pre-paint script in index.html. */
export function initTheme(): ResolvedTheme {
  const resolved = resolveTheme();
  applyTheme(resolved);
  return resolved;
}
