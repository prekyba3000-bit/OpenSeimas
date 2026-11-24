import type { MpCivicDimension } from "./mpLegacyDimensions";

/**
 * What each dimension measures, in plain Lithuanian, and — as importantly —
 * what it does not.
 *
 * The composite died because a single number thinks for the citizen. Five
 * numbers only avoid that if each one says what it is: „Partijos lojalumas"
 * measures how often a member votes with their faction, which is not loyalty,
 * not principle, and not a virtue or a fault. A dial without this drawer is
 * five small verdicts instead of one large one.
 */
export interface DimensionExplainer {
  /** One sentence: the formula, in words. */
  formula: string;
  /** The denominator, named. */
  denominator: string;
  /** What a reader must not conclude from it. */
  notMeasuring: string;
}

// LT-COPY: needs native review — every string in this file.
export const DIMENSION_EXPLAINERS: Record<MpCivicDimension, DimensionExplainer> = {
  attendance: {
    formula:
      "Posėdžių dienų, kuriomis narys užsiregistravo arba balsavo, dalis iš visų posėdžių dienų per jo mandato laikotarpį.",
    denominator: "Posėdžių dienos nario mandato laikotarpiu",
    notMeasuring:
      "Nerodo, ar narys dirbo komitetuose, susitikimuose ar rinkimų apygardoje — tik ar tą dieną buvo salėje.",
  },
  partyLoyalty: {
    formula:
      "Balsavimų, kuriuose narys balsavo taip pat kaip dauguma jo frakcijos, dalis iš visų balsavimų, kuriuose dalyvavo ir jis, ir frakcija.",
    denominator: "Balsavimai, kuriuose dalyvavo narys ir jo frakcija",
    notMeasuring:
      "Tai nėra ištikimybės, principingumo ar savarankiškumo matas. Aukštas skaičius nereiškia nei nuoseklumo, nei paklusnumo — tik sutapimą su frakcijos dauguma.",
  },
  // Rewritten 2026-11-22 to state what hero_engine.score_experience computes
  // (evaluation CORF-03). The old text said „kadencijų skaičius": only this
  // term's votes are ingested, so the seniority half is time since the
  // member's first recorded vote this term, and a 20 % amendment term the
  // drawer never named has no data, capping every member at 80.
  experience: {
    formula:
      "Trys dalys, kiekviena palyginta su didžiausia reikšme tarp šios kadencijos narių: pusė — laikas nuo pirmo nario balso šioje kadencijoje, 30 % — atiduotų balsų skaičius, 20 % — pateiktų pataisų skaičius. Pataisų duomenų kol kas neturime, todėl ši dalis visiems lygi 0, o didžiausia galima reikšmė dabar yra 80 iš 100. Ankstesnių kadencijų neskaičiuojame.",
    denominator: "Didžiausia kiekvienos dalies reikšmė tarp šios kadencijos narių",
    notMeasuring:
      "Nerodo darbo kokybės — tik trukmę ir kiekį. Ilgai dirbantis narys nebūtinai dirba geriau.",
  },
  legislativeActivity: {
    // LT-COPY: needs native review
    formula:
      "Dvi dalys, kiekviena palyginta su didžiausia reikšme tarp kadencijos narių: 60 % — teisės aktų projektai, kuriuos narys inicijavo arba prie kurių prisidėjo kaip bendraautoris, 40 % — vadovavimas komitetams (pirmininko ar pavaduotojo pareigos).",
    denominator: "Didžiausia reikšmė tarp visų kadencijos narių",
    // LT-COPY: needs native review
    notMeasuring:
      "Nerodo, ar projektai buvo priimti, nei ar jie buvo naudingi. Skaičiuojame kiekį, ne poveikį. Bendras skaičius neatskiria, ar narys projektą parengė vienas, ar pasirašė kartu su kitais — todėl rodome ir individualių iniciatyvų skaičių atskirai.",
  },
  // Rewritten 2026-11-22 (evaluation CORF-03): score_visibility gives half
  // its weight to a social-media term that has no data, so the top speaker
  // reads 50; press releases and the double weight of a floor speech were
  // not named either.
  visibility: {
    formula:
      "Pusė rodiklio — pasisakymai: kalba Seimo posėdyje skaičiuojama du kartus, pranešimas spaudai — vieną kartą; suma palyginama su didžiausia tarp kadencijos narių. Kita pusė skirta buvimui socialiniuose tinkluose, bet šių duomenų nerenkame, todėl ji visiems lygi 0, o didžiausia galima reikšmė yra 50 iš 100.",
    denominator: "Didžiausia reikšmė tarp visų kadencijos narių",
    notMeasuring:
      "Nerodo, ką narys pasakė, nei ar tai turėjo reikšmės. Kalbėti daug nėra tas pat, kas dirbti daug.",
  },
};
