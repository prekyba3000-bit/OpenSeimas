/**
 * Lithuanian numeral agreement.
 *
 * Three forms, chosen by the last one or two digits:
 *   ends in 1, except 11–19 → nominative singular   (1 diena, 21 diena)
 *   ends in 2–9, except 11–19 → nominative plural   (3 dienos, 25 dienos)
 *   ends in 0, or 11–19       → genitive plural     (10 dienų, 15 dienų)
 *
 * The teens are the trap: 11 takes the genitive plural even though it ends in
 * a 1, so a rule written only on the last digit gets „11 diena“ — which is
 * wrong in a way that reads as machine-generated text.
 */
export function ltPlural(n: number, one: string, few: string, many: string): string {
  const lastTwo = Math.abs(n) % 100;
  const last = Math.abs(n) % 10;
  if (lastTwo >= 11 && lastTwo <= 19) return many;
  if (last === 0) return many;
  if (last === 1) return one;
  return few;
}
