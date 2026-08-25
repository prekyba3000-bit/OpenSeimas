# Asset and interest declarations — feasibility probe

2026-08-25. Read-only reconnaissance. No code written, nothing ingested.

**Question:** can the platform show turto deklaracijos / privačių interesų
deklaracijas per MP, at zero cost, without a verdict-shaped surface?

**Answer: not by machine, not lawfully, not without VTEK's cooperation.** The
public search exists and works for a human. It is deliberately closed to
automation. Everything below is what was probed to establish that.

## Two different registers

The question is usually asked as one thing and is actually two:

| | Register | Holder |
| --- | --- | --- |
| **Privačių interesų deklaracijos** | PINREG | VTEK |
| **Turto ir pajamų deklaracijos** | filing system | VMI |

Both were probed. Neither yields machine-readable per-person data.

## What was probed, and what came back

| Route | Result | Evidence |
| --- | --- | --- |
| `pinreg.vtek.lt/external/*` | **401** on every declaration endpoint, including `/oauth/token` itself | `{"error":"unauthorized","error_description":"Full authentication is required"}` |
| `/external/klasifikatoriai/grupuoti/viesi` | **200** unauthenticated | the SPA loads it on page open — a public branch exists, but only for classifiers |
| PINREG public search UI | **Loads without login**, form renders | `/app/deklaraciju-paieska`, fields Vardas / Pavardė / pareigų pobūdis |
| …but it is **reCAPTCHA-gated** | `grecaptcha: true`, 7 captcha elements, `recaptcha__lt.js` + `api.js` loaded from Google | verified in a real browser, not inferred |
| data.gov.lt dataset 3798, VTEK | **aggregate only** | `AsmuoDeklaracija` columns are `ataskaitos_data, viso_asmenu, viso_deklaraciju` — 167 rows of monthly totals. No names. |
| data.gov.lt, VMI as publisher | **aggregate tax statistics only** | PVM, land tax, income tax totals. No per-person declarations. |
| LRS `p2b.ad_sn_privatus_interesai` | **404** | no such feed |
| LRS member feed attributes | no declaration fields | `asmens_id, biografijos_nuoroda, pareigos, …` — nothing about interests |

## The blocker, stated plainly

The public declaration search is protected by reCAPTCHA. That is a deliberate
statement by the register's operator that automated retrieval is not permitted.
Working around it is not something this project will do — not because it is
technically hard, but because a transparency platform that defeats an access
control to obtain its data has forfeited the argument it exists to make.

So the only route to this data is **VTEK granting API access**, which means:

- a request to VTEK — **STOP condition 2** (external communication)
- credentials issued to the project — **STOP condition 3** (credentials)
- possibly a data-sharing agreement — **STOP condition 4** (legal/government)

All three are yours to decide, not mine to initiate. I can draft the request;
I cannot send it.

## What is available at zero cost right now

1. **Aggregate PINREG statistics** (dataset 3798): how many people declared, how
   many declarations, by position type, monthly since ~2011. This is honest,
   citable, machine-readable — and says nothing about any named person. It
   could support a "how the register itself is functioning" surface. It cannot
   support anything per-MP.
2. **A link out.** Every MP page could carry „Peržiūrėti privačių interesų
   deklaraciją PINREG registre" pointing at the public search. Zero cost, zero
   scraping, no verdict, and it puts the primary source one click away. Whether
   a stable per-person deep link exists needs one more check — declarations
   carry UUIDs (`VIESINAMA_DEKLARACIJA_UUID` in the client), but obtaining the
   UUID appears to require going through the gated search.

## If the data were available, what the surface must not be

Worth settling before the data arrives, not after:

- **Never a total.** "Deklaruotas turtas: €X" invites a ranking and creates one
  even if no ranking is drawn. Wealth is not a civic virtue or a civic failing,
  and the platform does not adjudicate it.
- **Never a flag.** "Galimas interesų konfliktas" is a verdict about a named
  person. VTEK is the body that makes that finding; the platform reports that
  VTEK made it, with a link, or reports nothing.
- **Evidence, dated, linked.** What was declared, when it was filed, and a link
  to the filing. The reader draws the conclusion.
- **Unknown stays unknown.** Not every MP's declaration is public — the law
  defines whose are, and VTEK withdraws publication on request
  (`prasymai-neviesinti`). "No declaration shown" must render as „Nepaskelbta",
  never as an empty state that reads like nothing was declared.

## Effort

- **Link-out surface:** under a day, once the deep-link question is settled.
- **Aggregate register-health surface:** two days, data already in hand.
- **Full per-MP declarations:** blocked. If VTEK grants access, roughly a week
  of ingest, validation and surface work — the pipeline pattern already exists.
  The clock starts when the credentials do, and that is a human decision.

## Recommendation

Do the link-out now, because it is honest, costs nothing, and closes the worst
part of the gap — a citizen currently has no path from an MP's page to that
MP's declaration at all. In parallel, decide whether to approach VTEK. If the
answer is yes, I will draft the request for you to send.

What I would not do is quietly ship the aggregate statistics as though they
answered the question. They do not. They describe the register, not the people
in it, and presenting them on an MP's page would imply otherwise.
