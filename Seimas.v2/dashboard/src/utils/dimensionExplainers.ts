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
  experience: {
    formula:
      "Sudėtinis rodiklis: kadencijų skaičius ir atiduotų balsų skaičius, palyginti su aktyviausiu šios kadencijos nariu.",
    denominator: "Didžiausia reikšmė tarp visų kadencijos narių",
    notMeasuring:
      "Nerodo darbo kokybės — tik trukmę ir kiekį. Ilgai dirbantis narys nebūtinai dirba geriau.",
  },
  legislativeActivity: {
    // LT-COPY: needs native review
    formula:
      "Teisės aktų projektų, kuriuos narys inicijavo arba prie kurių prisidėjo kaip bendraautoris, ir vadovavimo komitetams skaičius, palyginti su aktyviausiu kadencijos nariu.",
    denominator: "Didžiausia reikšmė tarp visų kadencijos narių",
    // LT-COPY: needs native review
    notMeasuring:
      "Nerodo, ar projektai buvo priimti, nei ar jie buvo naudingi. Skaičiuojame kiekį, ne poveikį. Bendras skaičius neatskiria, ar narys projektą parengė vienas, ar pasirašė kartu su kitais — todėl rodome ir individualių iniciatyvų skaičių atskirai.",
  },
  visibility: {
    formula:
      "Pasisakymų Seimo posėdžiuose skaičius, palyginti su daugiausia kalbėjusiu kadencijos nariu.",
    denominator: "Didžiausia reikšmė tarp visų kadencijos narių",
    notMeasuring:
      "Nerodo, ką narys pasakė, nei ar tai turėjo reikšmės. Kalbėti daug nėra tas pat, kas dirbti daug.",
  },
};
