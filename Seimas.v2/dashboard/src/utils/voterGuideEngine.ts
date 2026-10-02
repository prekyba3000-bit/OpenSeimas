/**
 * Client-Side On-Device Non-Partisan Evidence Comparison Engine (AGENTS.md, Charter §0, §1.3).
 *
 * Runs locally in the browser to ensure citizen preference payloads never leave the device.
 */

export interface VoteItem {
  vote_id: string;
  seimas_vote_id: number | null;
  sitting_date: string | null;
  title: string;
  vote_choice: string | null; // 'Už', 'Prieš', 'Susilaikė', or null/empty
  topic: string;
}

export interface VoterGuideResult {
  mp_id: number;
  mp_name: string;
  party: string;
  category: 'more_aligned' | 'mixed_record' | 'insufficient_data';
  alignment_pct: number;
  scope_note_lt: string;
  methodology_note_lt: string;
  vote_breakdown: {
    aligned: number;
    opposed: number;
    abstained: number;
    absent: number;
    unverified: number;
    total_eligible: number;
  };
  evidence_coverage: {
    eligible_votes: number;
    directional_classifiable_votes: number;
    recorded_status_votes: number;
    directional_coverage_pct: number;
    recorded_status_coverage_pct: number;
  };
  headline_lt: string;
  bullet_reasons: string[];
  explanation_lt: string;
  sources: {
    vote_id: string;
    seimas_vote_id: number | null;
    title: string;
    date: string;
    choice: string;
    topic: string;
    source_url: string;
  }[];
  disclaimer_lt: string;
  suggested_next_step: string;
}

export const TOPIC_LABELS_LT: Record<string, string> = {
  bustas: 'Būstas',
  pajamos: 'Pajamos ir mokesčiai',
  sveikata: 'Sveikata',
  svietimas: 'Švietimas ir kultūra',
  aplinka: 'Aplinka ir energetika',
  saugumas: 'Gynyba ir saugumas',
  valdymas: 'Teisė ir valstybė',
  transportas: 'Susisiekimas ir infrastruktūra',
};

export function evaluateMpAlignmentClient(
  mpId: number,
  mpName: string,
  partyName: string,
  votes: VoteItem[],
  preferredStances: Record<string, 'for' | 'against'> = {},
  mandateStart?: string | null
): VoterGuideResult {
  // Pre-mandate filtering: exclude votes before the MP was sworn in.
  // These are not "absent" — the MP simply did not hold a mandate yet.
  const eligibleVotes = mandateStart
    ? votes.filter((v) => v.sitting_date != null && v.sitting_date >= mandateStart)
    : votes;

  if (!eligibleVotes || eligibleVotes.length === 0) {
    return {
      mp_id: mpId,
      mp_name: mpName,
      party: partyName,
      category: 'insufficient_data',
      alignment_pct: 0.0,
      scope_note_lt: 'Vertinami tik individualūs užfiksuoti Seimo nario balsavimai, o ne visos frakcijos ar partijos programa.',
      methodology_note_lt: 'Temos ir balsavimai susieti pagal oficialią Seimo teisėkūros klasifikaciją (vote_topics), o vartotojo pasirinkimai lyginami su faktiniais „Už“ / „Prieš“ balsavimais.',
      vote_breakdown: { aligned: 0, opposed: 0, abstained: 0, absent: 0, unverified: 0, total_eligible: 0 },
      evidence_coverage: {
        eligible_votes: 0,
        directional_classifiable_votes: 0,
        recorded_status_votes: 0,
        directional_coverage_pct: 0.0,
        recorded_status_coverage_pct: 0.0,
      },
      headline_lt: `${mpName}: Nepakanka duomenų išvadoms (0 galimų balsavimų)`,
      bullet_reasons: ['Pasirinktomis temomis nerasta užfiksuotų vardinių balsavimų įrašų.'],
      explanation_lt: 'Šioje temų srityje nėra pakankamai užfiksuotų vardinių balsavimų duomenų.',
      sources: [],
      disclaimer_lt: 'Tai yra ribotas faktinių balsavimų sulyginimas, o ne balsavimo rekomendacija.',
      suggested_next_step: 'Skaityti bendrą politiko profilio apžvalgą',
    };
  }

  let alignedCount = 0;
  let opposedCount = 0;
  let abstainedCount = 0;
  let absentCount = 0;
  let unverifiedCount = 0;

  const alignedBullets: string[] = [];
  const opposedBullets: string[] = [];
  const neutralBullets: string[] = [];
  const sources: VoterGuideResult['sources'] = [];

  for (const row of eligibleVotes) {
    const topicLabel = TOPIC_LABELS_LT[row.topic] || row.topic;
    const userPref = preferredStances[row.topic] || 'for';
    const choice = row.vote_choice;
    const dateStr = row.sitting_date || 'Nenurodyta data';
    const sourceUrl = row.seimas_vote_id
      ? `https://www.lrs.lt/sip/portal.show?p_r=35381&p_k=1&p_bals_id=${row.seimas_vote_id}`
      : 'https://www.lrs.lt';

    const choiceDesc = choice ? `balsavo „${choice}“` : 'nedalyvavo balsavime';
    const bulletItem = `Balsavimas dėl „${row.title}“ (${dateStr}): ${choiceDesc}. [Šaltinis: ${sourceUrl}]`;

    if (choice === 'Už') {
      if (userPref === 'for') {
        alignedCount++;
        alignedBullets.push(bulletItem);
      } else {
        opposedCount++;
        opposedBullets.push(bulletItem);
      }
    } else if (choice === 'Prieš') {
      if (userPref === 'against') {
        alignedCount++;
        alignedBullets.push(bulletItem);
      } else {
        opposedCount++;
        opposedBullets.push(bulletItem);
      }
    } else if (choice === 'Susilaikė') {
      abstainedCount++;
      neutralBullets.push(bulletItem);
    } else if (choice === null || choice === '' || choice === 'Nedalyvavo') {
      absentCount++;
      neutralBullets.push(bulletItem);
    } else {
      unverifiedCount++;
      neutralBullets.push(bulletItem);
    }

    sources.push({
      vote_id: row.vote_id,
      seimas_vote_id: row.seimas_vote_id,
      title: row.title,
      date: dateStr,
      choice: choice || 'Nedalyvavo',
      topic: topicLabel,
      source_url: sourceUrl,
    });
  }

  // Balanced evidence selection (no cherry-picking):
  const bulletReasons: string[] = [];
  if (alignedBullets.length > 0) bulletReasons.push(alignedBullets.shift()!);
  if (opposedBullets.length > 0) bulletReasons.push(opposedBullets.shift()!);
  if (neutralBullets.length > 0) bulletReasons.push(neutralBullets.shift()!);

  const remainingPool = [...alignedBullets, ...opposedBullets, ...neutralBullets];
  while (bulletReasons.length < 3 && remainingPool.length > 0) {
    bulletReasons.push(remainingPool.shift()!);
  }

  const totalEligible = eligibleVotes.length;
  const directionalClassifiable = alignedCount + opposedCount;
  const recordedStatus = alignedCount + opposedCount + abstainedCount;

  const alignmentPct =
    directionalClassifiable > 0
      ? Number(((alignedCount / directionalClassifiable) * 100).toFixed(1))
      : 0.0;
  const directionalCoveragePct =
    totalEligible > 0
      ? Number(((directionalClassifiable / totalEligible) * 100).toFixed(1))
      : 0.0;
  const recordedCoveragePct =
    totalEligible > 0
      ? Number(((recordedStatus / totalEligible) * 100).toFixed(1))
      : 0.0;

  let category: VoterGuideResult['category'] = 'mixed_record';
  let headline = '';
  let explanation = '';
  let nextStep = '';

  if (directionalClassifiable < 3) {
    category = 'insufficient_data';
    headline = `${mpName}: Nepakanka duomenų išvadoms (palyginti buvo galima tik ${directionalClassifiable} iš ${totalEligible} galimų balsavimų)`;
    explanation = `Iš ${totalEligible} galimų balsavimų tik ${directionalClassifiable} turėjo aiškią „Už“ / „Prieš“ poziciją pasirinktais klausimais.`;
    nextStep = 'Skaityti įstatymų projektų tekstus ir komiteto ataskaitas';
  } else if (alignedCount > opposedCount) {
    category = 'more_aligned';
    headline = `${mpName}: ${alignedCount} iš ${directionalClassifiable} palyginamų balsavimų sutapo (palyginti buvo galima ${directionalClassifiable} iš ${totalEligible} galimų balsavimų)`;
    explanation = `Pasirinktomis temomis Seimo nario ${mpName} užfiksuoti balsavimai „Už“ / „Prieš“ dažniau sutapo su jūsų pasirinkta kryptimi (${alignedCount} iš ${directionalClassifiable} palyginamų balsavimų).`;
    nextStep = 'Skaityti išsamią komiteto kalbų ir stenogramų ataskaitą';
  } else {
    category = 'mixed_record';
    headline = `${mpName}: Nevienareikšmiai balsavimo duomenys (${alignedCount} iš ${directionalClassifiable} palyginamų balsavimų sutapo; palyginti buvo galima ${directionalClassifiable} iš ${totalEligible} galimų balsavimų)`;
    explanation = `Seimo nario ${mpName} balsavimai pasirinktomis temomis yra nevienalytiniai arba turėjo daug susilaikymo / nedalyvavimo atvejų.`;
    nextStep = 'Palyginti su kitų Seimo narių užfiksuotais balsavimais';
  }

  return {
    mp_id: mpId,
    mp_name: mpName,
    party: partyName,
    category,
    alignment_pct: alignmentPct,
    scope_note_lt: 'Vertinami tik individualūs užfiksuoti Seimo nario balsavimai, o ne visos frakcijos ar partijos programa.',
    methodology_note_lt: 'Temos ir balsavimai susieti pagal oficialią Seimo teisėkūros klasifikaciją (vote_topics), o vartotojo pasirinkimai lyginami su faktiniais „Už“ / „Prieš“ balsavimais.',
    vote_breakdown: {
      aligned: alignedCount,
      opposed: opposedCount,
      abstained: abstainedCount,
      absent: absentCount,
      unverified: unverifiedCount,
      total_eligible: totalEligible,
    },
    evidence_coverage: {
      eligible_votes: totalEligible,
      directional_classifiable_votes: directionalClassifiable,
      recorded_status_votes: recordedStatus,
      directional_coverage_pct: directionalCoveragePct,
      recorded_status_coverage_pct: recordedCoveragePct,
    },
    headline_lt: headline,
    bullet_reasons: bulletReasons,
    explanation_lt: explanation,
    sources: sources.slice(0, 5),
    disclaimer_lt: 'Tai yra ribotas faktinių balsavimų sulyginimas, o ne balsavimo rekomendacija.',
    suggested_next_step: nextStep,
  };
}
