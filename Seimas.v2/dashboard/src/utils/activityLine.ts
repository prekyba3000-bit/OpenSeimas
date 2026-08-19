import type { ActivityItem } from "../services/api";

/**
 * The activity feed sentence, composed on the client.
 *
 * The API used to send `action: "Voted Susilaikė"` — an English verb glued to a
 * Lithuanian choice, server-side, where no translation layer could reach it.
 * The choice now arrives as data and the wording happens here:
 *
 *     „Susilaikė dėl „Atmintinų dienų įstatymo…“
 *
 * Falls back to the deprecated `action` field so a client running against an
 * older API still renders something rather than an empty line.
 */
export function activityLine(item: Pick<ActivityItem, "vote_choice" | "action" | "context">): string {
  const choice = item.vote_choice?.trim();
  if (choice) return `${choice} dėl „${item.context}“`;

  // Legacy payload: strip the English verb if it is there, keep the choice.
  const legacy = (item.action ?? "").replace(/^Voted\s+/i, "").trim();
  return legacy ? `${legacy} dėl „${item.context}“` : item.context;
}
