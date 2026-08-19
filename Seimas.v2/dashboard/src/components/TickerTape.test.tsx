import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Users, Vote } from "lucide-react";
import { TickerTape } from "./TickerTape";

/**
 * The stat row must render each metric exactly once.
 *
 * TickerTape renders a second copy of every item so the marquee can loop
 * seamlessly — the animation shifts by -50%, so the duplicate slides in as the
 * original slides out. The landing page passes autoScroll={false}, so no
 * animation ever ran and the duplicate simply sat there: every stat card
 * appeared twice, which read as a data bug rather than a layout one.
 */
const items = [
  { icon: Users, label: "Seimo vietos", value: "141" },
  { icon: Vote, label: "Balsavimai", value: "5 279" },
];

describe("TickerTape", () => {
  it("renders each metric exactly once when not scrolling", () => {
    render(<TickerTape items={items} autoScroll={false} />);
    for (const item of items) {
      expect(screen.getAllByText(item.label)).toHaveLength(1);
      expect(screen.getAllByText(item.value)).toHaveLength(1);
    }
  });

  it("duplicates only when the marquee is actually animating", () => {
    render(<TickerTape items={items} autoScroll />);
    // The duplicate is the mechanism that makes the loop seamless, so it must
    // still be there when scrolling is on.
    expect(screen.getAllByText("Seimo vietos")).toHaveLength(2);
  });

  it("renders nothing extra for an empty item list", () => {
    const { container } = render(<TickerTape items={[]} autoScroll={false} />);
    expect(container.querySelectorAll("[class*='min-w-[200px]']")).toHaveLength(0);
  });
});
