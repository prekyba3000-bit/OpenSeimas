# Member portraits from VRK

2026-11-14. The human asked for photos of normal quality, once and for all.

## Recon (§1.8)

- 68 of 140 active members had an `lrs.lt` photo address. lrs.lt answers it
  with `403` and a Cloudflare challenge page, and sends
  `Cross-Origin-Resource-Policy: same-origin`; no browser shows it on our
  site. Those members showed initials.
- 72 had a Wikimedia Commons image requested at `?width=300`, matched by name.
- VRK publishes the portrait each 2024 candidate filed, at an address built
  from the candidate id: `.../kandidatai/kandImg/photo_<id>.jpeg`. Two
  downloaded: 593×890 and 628×943, about 450 kB each. No cross-origin
  restriction in the response headers.

## Verified (§1.9)

- `HEAD` on all 138 addresses (active members with `vrk_candidate_id`), sent
  with our site as referer: 138 × `200 image/jpeg`.
- For each of the 138, the VRK candidate page behind the id was fetched and
  checked for the member's name and for that exact photo file: 137 match. The
  138th is printed by VRK as „Dalia ASANAVIČIŪTĖ", elected in Pasaulio
  lietuvių (Nr. 71); ours is „Dalia Asanavičiūtė-Gružauskienė", constituency
  71. Same person, later surname.
- The two active members without a VRK id (Targamadzė, Masiulis) already have
  Commons photos.

## Built

- `pipeline/ingest_photos.py`: VRK portrait first, identified by
  `vrk_candidate_id`, stored only after VRK answers the address with an
  image; Commons otherwise, now at `?width=600`. A member already on the VRK
  address is not requested again.
- `pipeline/ingest_seimas.py`: the daily upsert keeps a VRK address, as it
  already kept a Commons one.
- `backend/hero_engine.py`: the member list read `photo_url` from the
  `mp_leaderboard_metrics` view, whose refresh the publish gate is holding
  while lrs.lt is down. The portrait is now read from `politicians` directly.
  It is identity, not a metric.
- Dashboard: list and grid portraits load lazily. Sources page names the
  photo source.

## Open

- Each VRK file is about 450 kB and the site draws it at 32–112 px. Lazy
  loading limits how many are fetched; resizing is a separate step.
- The photos are the candidates' 2024 filings, hot-linked from vrk.lt, not
  copied. No licence statement was found or looked for on vrk.lt.

**LT-COPY, needs native review:** the „Seimo narių nuotraukos" entry in
`SourcesView.tsx`.

Suites: backend **490 passed** on a fresh database (486 + 4 new), dashboard
**459 passed**, `tsc --noEmit` exit 0. Rendered check: the member list on a
local copy with last night's data shows a portrait on every card in view.
