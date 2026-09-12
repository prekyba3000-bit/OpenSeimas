// Application copy in Lithuanian
// Every string that appears in the UI belongs here or in `utils/ltPlural.ts`.

import { ltPlural } from '../utils/ltPlural';

export const LT = {
  voteChoices: {
    for: "Už",
    against: "Prieš",
    abstain: "Susilaikė",
    absent: "Nedalyvavo",
  },
  errors: {
    generic: "Įvyko klaida. Bandykite dar kartą.",
    tooManyRequests: "Per daug užklausų. Pabandykite po minutės.",
    validation: "Užklausa neteisinga. Patikrinkite įvestus duomenis.",
    timeout: "Serveris neatsakė laiku. Bandykite dar kartą.",
    network: "Nepavyko prisijungti prie serverio. Patikrinkite interneto ryšį.",
    profileLoad: "Nepavyko užkrauti Seimo nario profilio.",
    leaderboardLoad: "Nepavyko užkrauti stebėsenos lentelės.",
    searchUnavailable: "Serverio paieška laikinai nepasiekiama.",
    boundaryTitle: "Įvyko netikėta klaida",
    boundaryBody: "Sąsaja laikinai sustabdyta dėl klaidos. Galite bandyti iš naujo.",
    boundaryRetry: "Bandyti iš naujo",
    wikiUnavailable: "Wiki šiuo metu nepasiekiama. Rodoma paskutinė talpyklos versija, jei ji yra.",
  },
  connection: {
    // Shown while the first request waits on a sleeping Render service.
    connecting: "Jungiama prie serverio…",
    connectingHint: "Pirmas atidarymas gali užtrukti iki minutės, kol serveris pabunda.",
    // Device is offline — the citizen can fix this.
    offlineTitle: "Nėra interneto ryšio",
    offlineBody: "Patikrinkite ryšį ir bandykite dar kartą.",
    // Device is online but our API did not answer — our fault, not theirs.
    unreachableTitle: "Nepavyko pasiekti serverio",
    unreachableBody: "Nepavyko pasiekti serverio. Patikrinkite ryšį ir bandykite dar kartą.",
    retry: "Bandyti dar kartą",
  },
  // LT-COPY: needs native review
  constituency: {
    pickerTitle: "Raskite savo apygardos narį",
    pickerPlaceholder: "Pasirinkite apygardą",
    // Says why the other members are absent, so it does not read as a gap.
    // Deliberately does NOT say "the rest were elected from party lists" —
    // that was the first wording and it was false: the remainder also
    // includes members who took a vacated seat mid-term and were not elected
    // in 2024 at all.
    pickerNote: (n: number) =>
      `Sąraše — ${n} ${ltPlural(n, 'vienmandatė apygarda', 'vienmandatės apygardos', 'vienmandačių apygardų')}. Kiti Seimo nariai apygardai ` +
      `neatstovauja: dauguma jų išrinkti pagal partijų sąrašus.`,
    // One district's member left and has not been replaced — the empty seat
    // in „140 iš 141 vietų". Naming it is the point: a reader there should
    // learn the seat is vacant, not find their district missing.
    vacantNote: (n: number) =>
      n === 1
        ? `Vienoje apygardoje šiuo metu nario nėra — vieta laisva.`
        : `${n} apygardose šiuo metu nario nėra — vietos laisvos.`,
    seatVacantShort: "vieta laisva",
    // Shown on a member's profile.
    wonDistrict: (name: string, nr: number) =>
      `Išrinkta(s) vienmandatėje ${name} (Nr. ${nr}) apygardoje.`,
    partyList: "Išrinkta(s) pagal partijos sąrašą — atskiros apygardos neatstovauja.",
    // A mid-term replacement: took a vacated seat, so was not elected in 2024.
    noElectionRecord:
      "Šis narys 2024 m. rinkimuose neišrinktas — mandatą perėmė kadencijos eigoje. " +
      "Apygardos duomenų nėra.",
    sourceNote: "Šaltinis: VRK 2024 m. Seimo rinkimų duomenys.",
  },
  // LT-COPY: needs native review
  voteTopics: {
    title: "Filtruoti pagal temą",
    all: "Visos temos",
    // Explains "27/86" without implying a participation rate or a stance.
    countExplainer:
      "Skaičiai rodo: kiek balsavimų šia tema užfiksuotas nario pasirinkimas " +
      "iš visų tos temos balsavimų per jo kadenciją. Tai nėra nei lankomumo " +
      "rodiklis, nei nario pozicija — dažniausiai pasirinkimo nėra todėl, kad " +
      "šaltinis nepaskelbė, kaip balsavo kiekvienas narys.",
    coverage: (tagged: number, total: number) =>
      `Temos priskiriamos automatiškai pagal balsavimo pavadinime esančius ` +
      `žodžius — tema priskirta ${tagged} balsavimams iš ${total}. Dalis ` +
      `balsavimų temos neturi.`,
    emptyForTopic: "Šia tema balsavimų nerasta.",
  },
  votesView: {
    title: "Parlamento balsavimai",
    subtitle: "Naršykite istorinius balsavimo įrašus",
    results: "rezultatai",
    searchPlaceholder: "Ieškoti balsavimo pagal pavadinimą...",
    loadFailed: "Nepavyko užkrauti balsavimo įrašų.",
    syncing: "Sinchronizuojami balsavimo įrašai...",
    noVotes: "Nerasta balsavimų pagal",
    clearSearch: "Išvalyti paiešką",
    loadMore: "Įkelti daugiau balsavimų",
    loadingMore: "Kraunama...",
  },
  comparisonView: {
    title: "Narių palyginimas",
    subtitle: "Analizuokite balsavimo suderinamumą ir skirtumus tarp atstovų",
    searchMp: "Ieškoti Seimo nario...",
    noResults: "Rezultatų nėra",
    selectFirst: "Pasirinkite pirmą narį...",
    selectSecond: "Pasirinkite antrą narį...",
    running: "Vykdoma lyginamoji analizė...",
    failed: "Nepavyko palyginti pasirinktų narių.",
    overlapLabel: "Sutampantys balsavimai",
    overlapBody:
      "Tai yra sutampančių balsų skaičius iš bendrai dalyvautų balsavimų. Tai nėra dalyvavimo rodiklis ar politinė pozicija.",
    notEnoughData: "Nepakanka duomenų",
    divergences: "Naujausi skirtumai",
    viewVoteDetails: "Peržiūrėti balsavimo detales",
    readyTitle: "Pasiruošę palyginti",
    readyBody: "Pasirinkite du atstovus viršuje, kad analizuotumėte jų balsavimo suderinamumą.",
    updating: "Atnaujinama…",
    updatedAnnouncement: "Palyginimas atnaujintas",
  },
} as const;
