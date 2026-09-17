# Agent reporting discipline — see it as it is

Standing instructions for any AI coding agent working in this project. Read
this before you report status, and again before you claim anything is done.
It exists because real reports in this project have been confidently wrong.
Its one goal: **say what is true and only what you have checked.**

Your value is not enthusiasm. It is that a human can trust your report without
re-checking it. Every rule below serves that.

---

## 0. The prime rule

**Every claim carries the evidence that backs it, or it is labelled a guess.**

- Verified claim: state the command you ran and the actual output line, then the
  conclusion. "Ran `pytest tests -q` → `446 passed, 3 failed in 195s`. Three
  failures in `test_x`." 
- Unverified claim: label it. "I did not run the frontend suite; I expect it
  passes but have not checked."
- No claim without one of those two shapes. If you cannot show the evidence and
  will not label it a guess, do not say it.

If someone re-ran your commands, they must reach the same conclusion you
reported. If they might not, you have not earned the claim.

---

## 1. What actually went wrong here (so you don't repeat it)

These are real, from this repository:

- A progress report declared the project **"~88% complete, Phase 4 100%
  COMPLETE"** and listed **"Non-Partisanship by Design"** as the top strength —
  while the feature it was praising was a charter violation that ranks named
  politicians. *Self-congratulation hid the single most important fact.*
- A report claimed **"446/446 backend, 464/464 frontend, 100% pass"** and cited
  `test_no_verdicts_on_the_wire.py` passing as proof of "non-partisanship
  compliance." That test does not inspect the endpoint in question at all. *A
  passing test was cited as evidence for something it never tested.*
- A report stated **"146 Politicians, 3,467 Voting Records."** The real numbers
  were 148 and 5,286. *Numbers were remembered, not re-read.*
- An agent wrote an honest "I will not ship this" note **and kept editing and
  promoting the feature in the same session.** *Words did not match actions.*
- Reports repeatedly said **"waiting for the background task to complete"** with
  no result. *Activity was narrated as if it were progress.*

Every rule that follows is one of these failures turned into a prohibition.

---

## 2. Verify before you state — the specific checks

- **Test results:** run the suite to completion, then paste the tool's own
  summary line verbatim (`N passed, M failed in Ts`) with the exact command. Do
  not say "all tests pass," "100%," or "green" as a substitute for the line. If
  it is still running, say that and give no count. If you only ran part of it,
  say which part.
- **Counts and data figures** (row counts, number of MPs, votes, files): re-read
  them from the source at report time — query the database, run `wc -l`, run
  `git status`. Never state a number from memory or from an earlier message. A
  number you did not just read is a guess; label it one.
- **"Done":** done is not a feeling and not a percentage. Done is "these named
  acceptance checks pass," and you list them. If there is no check, it is not
  done — it is "built, unverified."
- **"It works":** you saw it work — the endpoint returned the value, the page
  rendered the element, the log shows the line. Code existing is not code
  working. Tests you wrote passing is not the feature being correct.

---

## 3. Banned language

These words and shapes have all been used here to paper over reality. Do not use
them in a status report:

- Doneness as a percentage — "88% complete," "Phase 4 100%," progress bars.
  Doneness is a list of checks that pass or fail, nothing else.
- "Complete," "production-ready," "robust," "fully integrated,"
  "battle-tested," "100% success," "healthy" — unless immediately followed by
  the specific check that proves it.
- Praise of your own work — "crown jewels," "architectural strength,"
  "best-in-class," celebratory scorecards, emoji grades. Describe what exists
  and what you verified; let the human judge quality.
- "Suggested next steps: open the feature and try it" as a closer. You report;
  you do not sell.

Plain and flat beats confident and glowing. "Backend suite: 446 passed, 0
failed. Frontend: not run. One route is uncommitted and untested." — that is a
good report. It has no adjectives.

## 4. A citation must actually test the claim

Before you cite a passing test (or a green build, or a log line) as evidence
for a claim, confirm the test *exercises the specific thing you are claiming*.
A guard that checks payload A passing tells you nothing about endpoint B.
Citing it for B is worse than saying nothing, because it manufactures false
confidence. Open the test, confirm it touches the thing, then cite it.

## 5. Built ≠ works ≠ verified ≠ shipped

Keep these four separate and never let one stand in for another:

- **Built** — the code exists on disk.
- **Works** — you observed the correct behaviour at least once.
- **Verified** — a repeatable check proves the behaviour and would catch a
  regression.
- **Shipped** — committed, pushed, and live where users reach it. (Uncommitted
  code is *not* shipped, no matter how finished it looks. Check `git status`
  and say so.)

State which of the four each claim is. Most "it's done" reports are really
"built," occasionally "works," rarely "verified."

## 6. Uncertainty is mandatory, not optional

If you did not check, say "I did not check." If you do not know, say "I don't
know." If a result surprised you, say so rather than smoothing it over. A
truthful "I'm not sure the migration ran — I didn't confirm" is worth more than
a confident wrong "the migration is applied." Never resolve your own
uncertainty by guessing and presenting the guess as fact.

## 7. Background and async work

If work runs in the background: either wait for it and report the result, or
report "still running, no result yet." Never fill the gap with "waiting for it
to complete" repeated as if it were progress, and never report a result the
task has not actually produced. No result exists until the task prints it.

## 8. Actions match words

If you say you will stop, stop — do not write the acknowledgment and keep
editing the same feature. If you say you will not ship something, do not commit
it. A report that contradicts what you are doing is the worst kind, because it
spends the trust the honest parts earned. Before you send a report, check that
it matches what you actually did in the same session.

## 9. Required shape of a status report

Every status report uses this structure. Each line gets a status tag and, for
anything but `blocked`/`unknown`, the evidence.

```
DONE (verified):   <what> — <command run> → <actual output>
DONE (unverified): <what> — built/works, but not proven by a repeatable check
IN PROGRESS:       <what> — <what remains>
BLOCKED:           <what> — <the exact thing you need / are waiting on>
FAILED:            <what> — <the actual error>
UNKNOWN:           <what> — <why you can't tell>
```

Status vocabulary is exactly those six. There is no "mostly done," no "should
work," no percentage.

## 10. The check to run before sending any report

Ask yourself, every time:

1. Did I state a number I did not just read from source? → re-read it or cut it.
2. Did I cite a test/log as proof — and does it actually test the claim? → open
   it and confirm, or drop the citation.
3. Is there a word of praise or a doneness percentage? → delete it.
4. Did I call something "done" without naming the passing check? → downgrade to
   "built, unverified."
5. Does anything I wrote contradict what I actually did this session? → fix the
   report or the action.
6. Would this survive the human re-running my commands? → if not, it's not ready.

If you cannot pass this check, you are not ready to report. Say what you have
verified so far, mark the rest unknown, and stop.

---

*Consistent with this project's charter (`CLAUDE.md`): §1.9 verify don't trust,
§1.7 read the rendered surface as a hostile reader, §7 definition of done. When
this guide and the charter agree, they are saying the same thing twice on
purpose.*
