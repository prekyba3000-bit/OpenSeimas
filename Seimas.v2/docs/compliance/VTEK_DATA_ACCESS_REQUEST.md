# VTEK Data Access Request — Draft

**Status:** draft, not yet sent
**Recipient:** vtek@vtek.lt
**From:** [project lead — fill in name + role + contact phone]
**Suggested CC:** [none required; VTEK routes internally]
**Suggested send-from:** an email tied to a real person, not a generic
project address — the request reads as a serious civic ask, not a bot.

The Lithuanian version is the body of record. The English version below is
included only as a courtesy translation; do not paste it into the email
unless VTEK explicitly asks for an English copy.

---

## Lithuanian (primary)

**Tema:** Prašymas suteikti prieigą prie viešų deklaracijų duomenų — visuomeninis skaidrumo projektas „OpenSeimas / Skaidrus Seimas“

Gerbiamieji,

Kreipiuosi VTEK vardu su prašymu dėl prieigos prie viešai skelbiamų privačių interesų deklaracijų, lobistinės veiklos registro ir etikos sprendimų duomenų programos sąsajos (API) būdu.

**Apie projektą.** „OpenSeimas / Skaidrus Seimas“ — nekomercinis, atviro kodo visuomeninio skaidrumo projektas, skirtas Lietuvos Respublikos Seimo darbo aiškinimui plačiajai visuomenei. Projekto kodas viešai prieinamas; už projektą negaunamos jokios pajamos, jis nėra finansuojamas privačių interesų grupių. Projekto tikslas — sumažinti informacijos asimetriją tarp viešojo sektoriaus duomenų ir piliečių, taip prisidedant prie atviro valdymo (Open Government) iniciatyvos, kurios narė yra ir Lietuva.

**Naudojami duomenys.** Šiuo metu projektas naudoja oficialius LRS, VRK ir CVP IS atvirus duomenis. Iki 2025 m. balandžio mėn. taip pat naudojome viešai prieinamus VTEK skelbiamus duomenis. Po 2025 m. balandžio mėn. įgyvendintų API autentifikacijos pakeitimų prieigos automatizuotam duomenų gavimui nebeturime.

**Prašymas.** Prašome suteikti programos sąsajos (API) prieigos raktą, leidžiantį tik skaitymo režimu (read-only) gauti šiuos viešai skelbiamus duomenis:

1. Privačių interesų deklaracijos (Seimo nariai ir jų sutuoktiniai/partneriai), apimančios darbovietes, juridinių asmenų sąsajas ir sandorius;
2. Lobistinės veiklos registras (registruoti lobistai ir jų deklaracijos);
3. Etikos pažeidimų sprendimai dėl Seimo narių (jei skelbiami).

**Įsipareigojimai.** Įsipareigojame:

- naudoti duomenis tik viešojo intereso tikslais (vizualizacija, agregacija, transparentiškumo rodikliai), niekada — tiesioginiam asmeninio gyvenimo stebėjimui ar komercinei veiklai;
- aiškiai nurodyti VTEK kaip duomenų šaltinį visose pristatymo formose;
- gerbti VTEK nustatytus prieigos limitus ir paskelbtas naudojimo sąlygas;
- nedelsiant reaguoti į VTEK ar duomenų subjektų prašymus dėl klaidų taisymo ar pašalinimo;
- nedubliuoti VTEK API kvietimų — duomenys lokaliai talpinami, atnaujinami suplanuotai (ne dažniau kaip kartą per parą).

**Kontaktinė informacija.**

- Atsakingas asmuo: [vardas, pavardė]
- El. paštas: [el. paštas]
- Telefonas: [telefonas]
- Projekto URL: [URL]
- Projekto kodas: [GitHub URL]

Esame pasirengę pateikti papildomos informacijos, susitikti ar pasirašyti standartinę duomenų naudojimo sutartį, jei tokia reikalinga.

Pagarbiai,
[vardas, pavardė]
[pareigos]

---

## English (courtesy translation)

**Subject:** Request for data access — civic transparency project "OpenSeimas / Skaidrus Seimas"

Dear VTEK team,

I am writing to request API access to the publicly published private-interest declarations, lobbying registry, and ethics-ruling data.

**About the project.** "OpenSeimas / Skaidrus Seimas" is a non-commercial, open-source civic transparency project that explains the work of the Seimas of the Republic of Lithuania to the general public. The source code is public; the project receives no revenue and is not funded by any private interest. Its goal is to reduce the information asymmetry between public-sector data and citizens, contributing to the Open Government initiative of which Lithuania is a member.

**Data sources.** The project currently uses official open data from LRS, VRK, and CVP IS. Until April 2025 we also used VTEK's publicly published data. Following the API authentication changes introduced in April 2025, we no longer have automated access.

**Request.** We ask for a read-only API key to retrieve the following publicly published data:

1. Private-interest declarations (Members of the Seimas and their spouses/partners), including employers, legal-entity affiliations, and transactions;
2. Lobbying registry (registered lobbyists and their declarations);
3. Ethics-violation rulings concerning Members of the Seimas (where published).

**Commitments.** We commit to:

- using the data only for public-interest purposes (visualization, aggregation, transparency indicators) and never for direct surveillance of private life or commercial activity;
- clearly attributing VTEK as the data source in all presentations;
- respecting any access limits and published terms of use;
- responding promptly to correction or takedown requests from VTEK or data subjects;
- not duplicating API calls — data is cached locally, refreshed on schedule (no more than once per day).

**Contact.**

- Responsible person: [name]
- Email: [email]
- Phone: [phone]
- Project URL: [URL]
- Source code: [GitHub URL]

We are happy to provide additional information, meet, or sign a standard data-use agreement if required.

Sincerely,
[name]
[role]

---

## Notes for the sender

- Fill the bracketed `[…]` placeholders before sending. Leaving them empty will read as low-effort.
- The "no more than once per day" cadence is a real commitment — we currently re-ingest LRS daily; matching that for VTEK is reasonable and credible.
- If VTEK requires a formal application form rather than free-form email, the body above can be pasted into the form's free-text field.
- Keep a copy of the sent email and any reply in `docs/compliance/` for the audit trail.
