# ADR 0007: Mission framing and the non-partisanship constraint

## Status

Accepted — 2026-08-19. Supersedes nothing; makes explicit a constraint the
codebase already obeyed implicitly (see ADR 0006 on attendance, and the
`readMpDimension` null rule).

## Context

The platform had a trust floor before it had a stated mission. Every number
traces to a populated source, metrics without data stay hidden, methodology
changes get 14 days' notice — but nothing written down said *what all that
machinery is for*, or what it must never be used for.

That gap is not academic. A civic platform that publishes attendance
percentages, voting records and forensic risk signals about named politicians is
one design decision away from becoming a campaigning tool. The decision is
rarely made deliberately; it arrives as a reasonable-sounding feature request —
"rank the MPs", "show who is worst", "recommend who deserves your vote" — and by
the time it ships the platform is a party actor.

## Decision

### The mission

That the majority of Lithuanians voting in the **2028 Seimas election** make a
*personally reasoned* decision — based on what their representatives actually
did, not what they promised. And that voting stops feeling pointless or
complicated to those who never voted: young people, the disillusioned, the
disengaged. A vote cast with understanding is the citizen's primary act of
power; complaining about the government without it is noise.

### The non-partisanship constraint

**OpenSeimas never tells anyone whom to vote for.** It shows what every MP and
faction verifiably did, and helps each voter reach their own conclusion.
"Personally reasonable" means informed by the voter's own values, never directed
by ours.

This is a survival constraint, not only an ethical one. A platform that nudges
becomes a party actor, and a party actor dies by one investigative article: the
first journalist to demonstrate that the ranking algorithm favours a side
destroys every number the platform has ever published, including the honest
ones. Non-partisanship is what makes the data usable by people who disagree with
each other — which is the entire point.

Concretely, this forbids:

- recommending, endorsing or ranking-by-desirability any MP, faction or party;
- composite "who is best/worst" scores presented as verdicts rather than as
  decomposable, sourced components;
- selecting which facts to surface by their political effect;
- LLM-generated text that *decides* content about a person (LLMs may only
  rephrase source-locked text — see the summary pipeline design).

It does not forbid publishing unflattering facts. Attendance of 41.9% is
publishable because it is true, sourced, and shown with its methodology and its
limits. The distinction is between *reporting what happened* and *telling the
reader what to conclude*.

### The 2028 horizon reorders priorities

Every roadmap item now sorts by "does this serve October 2028?" That reordering
makes some previously-equal items unequal:

- **Tau mode** („Ką padarė tavo narys?") becomes the core 2028 feature — the
  question a voter actually asks — rather than one mode among several.
- **The Jaukumas redesign and the Android app are mission-critical**, not
  polish: they are the audience-reach work. A platform the disengaged find
  unpleasant to read serves nobody, however correct its data.
- **A future election mode** — candidates, apygarda lookup, voting-mechanics
  explainers, polling-station information — is the mechanical-friction remover
  for first-time voters, and is scheduled by its distance from October 2028.

### Framing for the disengaged

Never moralise; always empower. The canonical framing:

> „Nebalsuodamas tu nepasišalini — tu atiduodi savo balsą tiems, kurie balsuoja."

Not voting does not exit you from the system; it delegates your share to those
who do vote. This is deliberately a statement about mechanics, not virtue. The
audience most worth reaching is the one that reacts badly to being preached at,
so the platform shows rather than lectures.

## Consequences

- Feature requests are testable against this ADR: if a feature requires the
  platform to express a preference between parties, it is out of scope
  regardless of its popularity.
- Success metrics follow the mission rather than engagement: pre-election
  traffic, „Rask savo narį" usage, corrections filed, and share of young users —
  never time-on-site or return-visit streaks, which are the metrics of
  engagement bait (see the no-dark-patterns invariant).
- The mission text is duplicated in three places on purpose — the master plan
  preamble, the README's first paragraph, and the in-app about page — so that a
  visitor, a collaborator and a journalist each meet it before anything else.
  Those three copies must be kept in sync when the wording changes.
