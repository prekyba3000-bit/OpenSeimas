import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useTapReveal } from "./useTapReveal";

/** jsdom has no matchMedia; install one that reports the hover capability we want. */
function mockPointer(canHover: boolean) {
  const listeners = new Set<() => void>();
  const query = {
    matches: canHover,
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
  };
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => query),
  );
  return {
    /** Simulate a mouse being attached or detached mid-session. */
    setHover(next: boolean) {
      query.matches = next;
      listeners.forEach((fn) => fn());
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useTapReveal", () => {
  it("commits immediately on a pointer device", () => {
    mockPointer(true);
    const { result } = renderHook(() => useTapReveal());

    expect(result.current.isTouch).toBe(false);
    let committed: boolean | undefined;
    act(() => {
      committed = result.current.activate("mp-1");
    });

    expect(committed).toBe(true);
    // Hover already shows the detail, so nothing needs revealing.
    expect(result.current.revealedId).toBeNull();
  });

  it("reveals on the first tap and commits on the second", () => {
    mockPointer(false);
    const { result } = renderHook(() => useTapReveal());

    expect(result.current.isTouch).toBe(true);

    let first: boolean | undefined;
    act(() => {
      first = result.current.activate("mp-1");
    });
    expect(first).toBe(false);
    expect(result.current.revealedId).toBe("mp-1");

    let second: boolean | undefined;
    act(() => {
      second = result.current.activate("mp-1");
    });
    expect(second).toBe(true);
    expect(result.current.revealedId).toBeNull();
  });

  it("moves the reveal to a different item instead of committing", () => {
    mockPointer(false);
    const { result } = renderHook(() => useTapReveal());

    act(() => {
      result.current.activate("mp-1");
    });

    let committed: boolean | undefined;
    act(() => {
      committed = result.current.activate("mp-2");
    });

    // Tapping a neighbouring seat must never navigate to it sight-unseen.
    expect(committed).toBe(false);
    expect(result.current.revealedId).toBe("mp-2");
  });

  it("dismiss clears the reveal so the next tap starts over", () => {
    mockPointer(false);
    const { result } = renderHook(() => useTapReveal());

    act(() => {
      result.current.activate("mp-1");
    });
    act(() => {
      result.current.dismiss();
    });
    expect(result.current.revealedId).toBeNull();

    let next: boolean | undefined;
    act(() => {
      next = result.current.activate("mp-1");
    });
    expect(next).toBe(false);
  });

  it("switches to direct commit when a pointer is attached mid-session", () => {
    const pointer = mockPointer(false);
    const { result } = renderHook(() => useTapReveal());
    expect(result.current.isTouch).toBe(true);

    act(() => {
      pointer.setHover(true);
    });
    expect(result.current.isTouch).toBe(false);

    let committed: boolean | undefined;
    act(() => {
      committed = result.current.activate("mp-1");
    });
    expect(committed).toBe(true);
  });
});
