// TODO(v4): move remaining Skaidrumas Hub inline strings here when the hub is fully internationalised.
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
    // Says why only 71 appear, so the other 70 do not read as missing.
    pickerNote: (n: number) =>
      `Sąraše — ${n} vienmandatės apygardos. Likusieji Seimo nariai išrinkti ` +
      `pagal partijų sąrašus ir atskiros apygardos neatstovauja.`,
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
    scoreLabel: "Suderinamumo balas",
    scoreBody:
      "Skaičiuojama pagal bendrus balsavimo posėdžius. Didesnis balas reiškia stipresnį politinį suderinamumą.",
    divergences: "Naujausi skirtumai",
    viewVoteDetails: "Peržiūrėti balsavimo detales",
    readyTitle: "Pasiruošę palyginti",
    readyBody: "Pasirinkite du atstovus viršuje, kad analizuotumėte jų balsavimo suderinamumą.",
    updating: "Atnaujinama…",
    updatedAnnouncement: "Palyginimas atnaujintas",
  },
} as const;
