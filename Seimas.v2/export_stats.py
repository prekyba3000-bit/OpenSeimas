"""
Gėdos Siena — MP Accountability Wall
Calculates real attendance by sitting day and theoretical wage impact.

Lithuanian Seimas member monthly compensation ≈ €4,200 gross.
~22 working days/month → ~€191/sitting day.
If an MP misses a sitting day without voting at all, that day's wage
is effectively unearned.
"""
import os
import json
import psycopg2
from datetime import datetime

DB_DSN = os.getenv("DB_DSN")
if not DB_DSN:
    print("ERROR: DB_DSN environment variable not set")
    exit(1)

MONTHLY_SALARY_EUR = 4200
WORKING_DAYS_PER_MONTH = 22
DAILY_RATE = round(MONTHLY_SALARY_EUR / WORKING_DAYS_PER_MONTH, 2)

conn = psycopg2.connect(DB_DSN)
cur = conn.cursor()

# Total sitting days in the database
cur.execute("SELECT COUNT(DISTINCT sitting_date) FROM votes WHERE sitting_date IS NOT NULL")
total_sitting_days_global = cur.fetchone()[0] or 1

SQL = """
WITH day_attendance AS (
    SELECT
        p.id,
        p.display_name,
        p.photo_url,
        p.current_party,
        COUNT(DISTINCT v.sitting_date) AS total_days,
        COUNT(DISTINCT v.sitting_date) FILTER (
            WHERE mv.vote_choice != 'Nedalyvavo'
        ) AS days_present
    FROM politicians p
    JOIN mp_votes mv ON p.id = mv.politician_id
    JOIN votes v ON mv.vote_id = v.seimas_vote_id
    WHERE p.is_active = TRUE
    GROUP BY p.id, p.display_name, p.photo_url, p.current_party
    HAVING COUNT(DISTINCT v.sitting_date) > 5
)
SELECT
    display_name,
    photo_url,
    current_party,
    days_present,
    total_days,
    (total_days - days_present) AS days_absent,
    ROUND((days_present::numeric / NULLIF(total_days, 0)) * 100, 1) AS attendance_pct
FROM day_attendance
ORDER BY attendance_pct ASC
LIMIT 15;
"""

cur.execute(SQL)
rows = cur.fetchall()

absentees = []
for rank, (name, photo_url, party, days_present, total_days, days_absent, pct) in enumerate(rows, 1):
    wage_lost = round(days_absent * DAILY_RATE, 2)
    absentees.append({
        "rank": rank,
        "name": name,
        "photo_url": photo_url,
        "party": party or "Nežinoma",
        "days_present": int(days_present),
        "total_days": int(total_days),
        "days_absent": int(days_absent),
        "participation_pct": float(pct),
        "daily_rate_eur": DAILY_RATE,
        "wage_unearned_eur": wage_lost,
    })

# Summary stats
total_absent_days_all = sum(a["days_absent"] for a in absentees)
total_wage_unearned = sum(a["wage_unearned_eur"] for a in absentees)

data = {
    "title": "Gėdos siena",
    "subtitle": "Seimo narių dalyvavimas posėdžiuose pagal dienas",
    "description": (
        f"Dalyvavimas skaičiuojamas pagal posėdžių dienas, ne individualius balsavimus. "
        f"Narys laikomas dalyvavusiu, jei per dieną balsavo bent vieną kartą. "
        f"Dienos atlyginimas ≈ €{DAILY_RATE:.0f} (€{MONTHLY_SALARY_EUR}/mėn. ÷ {WORKING_DAYS_PER_MONTH} d.d.). "
        f"Praleistų dienų atlyginimas — mokesčių mokėtojų lėšos, kurios buvo sumokėtos už neatliktą darbą."
    ),
    "methodology": {
        "unit": "posėdžio diena",
        "present_if": "bent 1 balsavimas ne 'Nedalyvavo' per dieną",
        "salary_monthly_eur": MONTHLY_SALARY_EUR,
        "daily_rate_eur": DAILY_RATE,
        "total_sitting_days": total_sitting_days_global,
    },
    "summary": {
        "top15_total_absent_days": total_absent_days_all,
        "top15_total_wage_unearned_eur": round(total_wage_unearned, 2),
    },
    "generated_at": datetime.now().isoformat(),
    "absentees": absentees,
}

os.makedirs("dashboard/public/data", exist_ok=True)

with open("dashboard/public/data/absenteeism.json", "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f"Exported {len(absentees)} MPs (by sitting day)")
print(f"  Total sitting days in DB: {total_sitting_days_global}")
print(f"  Daily rate: €{DAILY_RATE:.2f}")
if absentees:
    worst = absentees[0]
    print(f"  Worst: {worst['name']} — {worst['participation_pct']}% ({worst['days_present']}/{worst['total_days']} dienų, €{worst['wage_unearned_eur']:.0f} neuždirbta)")
print(f"  Top 15 combined unearned wages: €{total_wage_unearned:,.0f}")

cur.close()
conn.close()
