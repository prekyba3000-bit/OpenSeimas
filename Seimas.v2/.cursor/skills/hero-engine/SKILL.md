---
name: hero-engine
description: Provides the full Hero Parliament scoring model and integration map. Use when editing hero calculations, explainability payloads, HeroCard rendering, leaderboard behavior, or related forensic scoring logic.
---

# Hero Engine Knowledge

## Attribute Model (0-100)

- STR: `0.6 * normalized bills_authored_count + 0.4 * normalized committee leadership roles`
- WIS: `0.7 * normalized years in parliament + 0.3 * normalized total_votes_cast`
- CHA: `0.5 * normalized speeches_given + 0.5 * social presence bonus`
- INT: `clamp(100 - base_risk_penalty + forensic_adjustment + loyalty_bonus, 0, 100)` via `forensic_breakdown`
- STA: `0.8 * attendance_percentage + 0.2 * normalized amendments_proposed`

## Forensic Calibration

- Benford: `p < 0.01 => -25`, `0.01 <= p < 0.05 => -10`
- Chrono: `z < -3.0 => -20`, `-3.0 <= z < -2.0 => -8`
- Vote geometry: `sigma > 3.0 => -15`, `2.0 < sigma <= 3.0 => -5`
- Phantom network:
  - procurement + `hop <= 2` => `-30`
  - procurement + `hop > 2` => `-10`
  - debtor hit => `-5`
- Loyalty graph bonus:
  - independent voting days >20% => `+5`
  - >40% => `+10` (cap)
- Forensic penalty cap: `max(-60, sum(engine penalties))`

## Alignment System

- Method axis: Lawful (`loyalty > 90`), Chaotic (`loyalty < 70`), else Neutral
- Motive axis: Good (`INT > 75`), Evil (`INT < 40`), else Neutral

## XP and Level

- XP: `votes_cast*1 + bills_proposed*10 + bills_passed*50 - high_risk_alerts*100`
- Level: `floor(log(XP / 100))`, lower-bounded at 0

## Key Files

- `backend/hero_engine.py`
- `dashboard/src/components/HeroCard.tsx`
- `dashboard/src/views/LeaderboardView.tsx`
- `dashboard/src/components/RadarAttributeChart.tsx`
