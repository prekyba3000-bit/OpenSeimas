"""Build the Lithuanian copy review pack (PDF) for a native reviewer.

Charter §2: every user-facing Lithuanian string written by this project is
working copy until a native speaker has read it. 21 files carry
`LT-COPY: needs native review`. Handing over a grep of those markers would put
the burden on the reviewer to work out what each sentence is *for* — so each
entry here carries the string, where a reader meets it, and what it has to mean.
A reviewer can then judge the only thing they can judge from the outside:
does this Lithuanian say that, and does it sound like a person wrote it.

The stage glosses in §7 are different in kind and marked as such. They are
claims about Seimas procedure, not about our data, and need checking against
the Statute rather than against taste.

    .venv/bin/python -m scripts.build_lt_copy_pack

Regenerates docs/reviews/lt-copy-review-pack.pdf. Needs reportlab, which is a
local documentation tool and deliberately not in requirements.txt — nothing at
runtime imports it.
"""
from __future__ import annotations

import pathlib

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    HRFlowable,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
)

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / "docs" / "reviews" / "lt-copy-review-pack.pdf"

# DejaVu, not a built-in. Helvetica and friends are Latin-1 and carry none of
# ą č ę ė į š ų ū ž — every one would render as a black box, in a document
# whose entire subject is Lithuanian spelling.
FONT_DIR = pathlib.Path("/usr/share/fonts/truetype/dejavu")
pdfmetrics.registerFont(TTFont("DejaVu", str(FONT_DIR / "DejaVuSans.ttf")))
pdfmetrics.registerFont(TTFont("DejaVu-Bold", str(FONT_DIR / "DejaVuSans-Bold.ttf")))
pdfmetrics.registerFont(TTFont("DejaVu-Oblique", str(FONT_DIR / "DejaVuSans-Oblique.ttf")))
pdfmetrics.registerFont(TTFont("DejaVu-Mono", str(FONT_DIR / "DejaVuSansMono.ttf")))
# Without this mapping, <b> and <i> inside a Paragraph silently fall back to
# regular — the tags are accepted and do nothing, so the first build looked
# fine and had no bold anywhere.
pdfmetrics.registerFontFamily(
    "DejaVu", normal="DejaVu", bold="DejaVu-Bold",
    italic="DejaVu-Oblique", boldItalic="DejaVu-Bold",
)

INK = colors.HexColor("#1a1a1a")
MUTED = colors.HexColor("#5a5a5a")
ACCENT = colors.HexColor("#7a2e2e")
RULE = colors.HexColor("#d8d4cc")

styles = getSampleStyleSheet()
S = {
    "title": ParagraphStyle("t", parent=styles["Title"], fontName="DejaVu-Bold",
                            fontSize=20, leading=25, textColor=INK, alignment=TA_LEFT,
                            spaceAfter=4),
    "sub": ParagraphStyle("s", fontName="DejaVu", fontSize=10.5, leading=15,
                          textColor=MUTED, spaceAfter=10),
    "h": ParagraphStyle("h", fontName="DejaVu-Bold", fontSize=13, leading=17,
                        textColor=INK, spaceBefore=14, spaceAfter=2),
    "hnote": ParagraphStyle("hn", fontName="DejaVu-Oblique", fontSize=9.5, leading=13.5,
                            textColor=MUTED, spaceAfter=8),
    "body": ParagraphStyle("b", fontName="DejaVu", fontSize=10, leading=14.5,
                           textColor=INK, spaceAfter=7),
    "lt": ParagraphStyle("lt", fontName="DejaVu", fontSize=11, leading=16,
                         textColor=INK, leftIndent=8, spaceBefore=3, spaceAfter=4),
    "where": ParagraphStyle("w", fontName="DejaVu-Mono", fontSize=7.6, leading=11,
                            textColor=MUTED, leftIndent=8, spaceAfter=2),
    "gloss": ParagraphStyle("g", fontName="DejaVu-Oblique", fontSize=9, leading=13,
                            textColor=MUTED, leftIndent=8, spaceAfter=2),
    "ask": ParagraphStyle("a", fontName="DejaVu", fontSize=9, leading=13,
                          textColor=ACCENT, leftIndent=8, spaceAfter=3),
}


def P(text, style="body"):
    return Paragraph(text, S[style])


def rule(space=6):
    return HRFlowable(width="100%", thickness=0.5, color=RULE,
                      spaceBefore=space, spaceAfter=space)


def entry(lt, where, gloss, ask=None, priority=False):
    """One string to review: what it says, where it appears, what it must mean."""
    bits = []
    marker = "◆ " if priority else ""
    bits.append(Paragraph(marker + "\u201e" + lt + "\u201c", S["lt"]))
    bits.append(Paragraph(where, S["where"]))
    bits.append(Paragraph(f"Turi reikšti: {gloss}", S["gloss"]))
    if ask:
        bits.append(Paragraph(f"Klausimas: {ask}", S["ask"]))
    bits.append(rule(4))
    return KeepTogether(bits)


# ── The content ─────────────────────────────────────────────────────────────
# Grouped by the surface a reader meets it on, because that is the order a
# reviewer can actually check: open the page, read down it.

SECTIONS: list[tuple[str, str, list]] = [
    (
        "1. Seimo nario profilis — rodikliai",
        "Penki rodikliai ir jų paaiškinimai. Šie tekstai lydi skaičius apie "
        "konkretų žmogų, todėl tikslumas svarbesnis už sklandumą.",
        [
            entry(
                "Narys mandato neperėmė, todėl nėra ką matuoti.",
                "profilis · visi penki rodikliai · mpLegacyDimensions.ts:NEVER_TOOK_SEAT_NO_FIGURE_LT · parašyta 2026-09-05",
                "This member never took up the mandate, so there is nothing to measure. "
                "Shown for four members elected and resigned the same day, in place of „0,0 %“.",
                "Ar „nėra ką matuoti“ skamba natūraliai, ar geriau „nėra ko matuoti“? "
                "Ar „mandato neperėmė“ yra įprastas junginys šiam faktui?",
                priority=True,
            ),
            entry(
                "Narys nepriskirtas frakcijai, todėl nėra pozicijos, su kuria būtų galima lyginti.",
                "profilis · rodiklis „Sutapimas su frakcija“ · mpLegacyDimensions.ts:NO_FACTION_NO_FIGURE_LT · parašyta 2026-09-05",
                "This member belongs to no faction, so there is no faction position to compare against. "
                "Replaces a sentence promising the figure would appear later — for these members it never will.",
                "Ar „nepriskirtas frakcijai“ tinka Seimo kontekste, ar sakoma „nepriklauso frakcijai“? "
                "Antrasis variantas mums per stiprus, jei priežastis nežinoma — ar tikrai?",
                priority=True,
            ),
            entry(
                "Šis narys nepriskirtas jokiai frakcijai, todėl nėra pozicijos, su kuria būtų galima lyginti. "
                "Tai ne trūkstami duomenys.",
                "profilis · skydelis „Sutapimas su frakcija“ · MpFactionAlignment.tsx:67 · parašyta 2026-09-05",
                "Same fact, longer form, in the panel below the dial. The last sentence exists to stop a "
                "reader thinking we simply failed to collect something.",
                "Ar du beveik vienodi sakiniai tame pačiame puslapyje netrikdo? "
                "Gal vieną reikėtų sutrumpinti?",
                priority=True,
            ),
            entry(
                "Nėra balsavimų, kuriuose frakcijos poziciją būtų galima nustatyti — frakcija per maža. "
                "Skaičiaus nerodome.",
                "profilis · skydelis „Sutapimas su frakcija“ · MpFactionAlignment.tsx:70",
                "No votes where the faction's position could be determined, because fewer than ten of "
                "the faction voted. Now shown only to members who DO have a faction.",
                None,
            ),
            entry(
                "Rodiklis bus rodomas, kai bus įkelti šaltinio duomenys.",
                "profilis · bet kuris rodiklis be duomenų · mpLegacyDimensions.ts:DIMENSION_UNAVAILABLE_LT",
                "This measure will be shown once the source data has been loaded.",
                None,
            ),
            entry(
                "Nepakanka duomenų — nario mandatas apima mažiau nei tris posėdžių dienas.",
                "profilis · rodiklis „Dalyvavimas“ · utils/attendance.ts:21",
                "Not enough data — the member's mandate covers fewer than three sitting days.",
                None,
            ),
            entry(
                "Penki atskiri rodikliai. Jie nesudedami į vieną balą — kiekvienas matuoja skirtingą dalyką, "
                "ir jų suma nieko nereikštų.",
                "profilis · antraštė virš rodiklių · MpProfileView.tsx:275",
                "Five separate measures. They are not summed into one score — each measures a different "
                "thing and their sum would mean nothing. This is the platform's central promise.",
                "Ar „jų suma nieko nereikštų“ pakankamai aiškiai pasako, kad bendro balo NĖRA, "
                "o ne kad jo tiesiog nerodome?",
            ),
            entry(
                "Kiekvienas stulpelis — vienas mėnuo. Tarpai reiškia, kad Seimas tą mėnesį neposėdžiavo.",
                "profilis · dalyvavimo juosta · AttendanceTrajectory.tsx:28",
                "Each bar is one month. Gaps mean the Seimas did not sit that month.",
                None,
            ),
            entry(
                "per mažai posėdžių dienų",
                "profilis · dalyvavimo juostos mėnesio užuomina · AttendanceTrajectory.tsx:47",
                "Too few sitting days (to publish a percentage for that month).",
                None,
            ),
        ],
    ),
    (
        "2. Seimo nario profilis — veikla",
        "Sąrašai, kurie sąmoningai nieko nevertina. Kiekvienas turi sakinį, "
        "paaiškinantį, kodėl skaičius čia nieko nereiškia.",
        [
            entry(
                "Oficialios išvykos, kaip jas skelbia Seimas. Sąrašas nėra vertinimas — išvykų skaičius "
                "priklauso nuo pareigų ir komiteto, o ne nuo darbštumo.",
                "profilis · „Komandiruotės“ · MpActivityPanel.tsx:75",
                "Official trips as published by the Seimas. The list is not an assessment — the number "
                "depends on role and committee, not diligence.",
                None,
            ),
            entry(
                "Nario paskelbti pranešimai. Rodome, kad jie buvo paskelbti — ne ką jie verti.",
                "profilis · „Pranešimai žiniasklaidai“ · MpActivityPanel.tsx:112",
                "The member's own press releases. We show that they were published — not what they are worth.",
                "Ar „ne ką jie verti“ nėra per šnekamoji? Norime pasakyti „nevertiname jų turinio“.",
            ),
            entry(
                "Kas dirba nario komandoje. Kontaktų nerenkame ir neskelbiame — padėjėjai yra darbuotojai, "
                "o ne renkami politikai.",
                "profilis · „Padėjėjai ir sekretoriai“ · MpActivityPanel.tsx:156",
                "Who works on the member's team. We do not collect or publish contact details — assistants "
                "are employees, not elected politicians.",
                None,
            ),
            entry(
                "Oficialus Seimo skelbiamas nario kalendorius. Įrašų skaičius priklauso nuo pareigų ir "
                "komitetų, o ne nuo darbštumo, todėl jų čia nesuskaičiuojame.",
                "profilis · „Darbotvarkė“ · MpDiaryTimeline.tsx:54",
                "The member's official published calendar. The number of entries depends on role and "
                "committees rather than diligence, so we do not count them here.",
                None,
            ),
            entry(
                "Komandiruočių neužfiksuota. / Pranešimų neužfiksuota. / Padėjėjų neužfiksuota. / "
                "Darbotvarkės įrašų neužfiksuota.",
                "profilis · tušti sąrašai · MpActivityPanel.tsx, MpDiaryTimeline.tsx",
                "None recorded. Distinct from „Duomenų nėra“ (we cannot see the table at all) — the two "
                "states are deliberately worded differently and must stay distinguishable.",
                "Ar skirtumas tarp „neužfiksuota“ ir „Duomenų nėra“ skaitytojui juntamas?",
            ),
            entry(
                "(pavadinimas šaltinyje nukirptas) / Rodomi naujausi įrašai. Sąrašas nėra visas.",
                "profilis · veiklos sąrašai · MpActivityPanel.tsx:26, 48",
                "(title truncated in the source) / Showing the most recent entries. The list is not complete.",
                None,
            ),
        ],
    ),
    (
        "3. Balsavimo puslapis",
        "Tekstai apie tai, ko šaltinis nepaskelbė. Čia svarbiausia nepasakyti "
        "priežasties, kurios šaltinis nenurodo.",
        [
            entry(
                "Šiam balsavimui šaltinis nepaskelbė, kaip balsavo kiekvienas narys. "
                "Priežasties šaltinis nenurodo. Rodome tik tai, kas užfiksuota.",
                "balsavimo puslapis · utils/perMemberChoices.ts:65",
                "For this vote the source did not publish how each member voted. The source gives no "
                "reason. We show only what is recorded. Earlier this sentence invented a cause; that was "
                "a published correction.",
                "Ar „Rodome tik tai, kas užfiksuota“ neskamba gynybiškai?",
            ),
            entry(
                "Pavadinimą šaltinis pateikia sutrumpintą — jis nutrūksta ties šia vieta.",
                "balsavimo puslapis · utils/voteTitle.ts:30",
                "The source provides the title truncated — it breaks off at this point.",
                None,
            ),
            entry(
                "Frakcija nenurodyta",
                "balsavimo puslapis, sąrašai, frakcijų puslapis · utils/faction.ts:NO_FACTION_LT",
                "Faction not stated. Chosen over „nepriklauso frakcijai“ (belongs to no faction) because "
                "that asserts non-membership, which we cannot always know.",
                "Ar „Frakcija nenurodyta“ skaitytojui aiškiai reiškia, kad narys frakcijai nepriklauso "
                "arba jos nežinome — o ne kad mes pamiršome įrašyti?",
                priority=True,
            ),
        ],
    ),
    (
        "4. Pradinis puslapis ir apžvalga",
        "Pirmas įspūdis. Čia formuluojamas pagrindinis pažadas — kad bendro balo nėra.",
        [
            entry(
                "Stebėkite balsavimus ir Seimo narių veiklą. Kiekvienas rodiklis turi šaltinį ir "
                "paaiškinimą, kaip jis skaičiuojamas. Bendro balo neskelbiame — jo nėra.",
                "pradinis puslapis · LandingPage.tsx:63",
                "Follow votes and members' activity. Every measure has a source and an explanation of how "
                "it is calculated. We publish no overall score — there isn't one.",
                "Ar „Bendro balo neskelbiame — jo nėra“ suprantama iš karto? Tai svarbiausias "
                "projekto pažadas.",
                priority=True,
            ),
            entry(
                "Svarbu: tai ne Lietuvos Respublikos Seimo oficiali svetainė. Tai nepriklausomas "
                "skaidrumo ir duomenų projektas.",
                "pradinis puslapis · atsakomybės juosta · LandingPage.tsx",
                "Important: this is not the official website of the Seimas. It is an independent "
                "transparency and data project.",
                None,
            ),
        ],
    ),
    (
        "5. Skaidrumo skiltis",
        "Čia rodomi palyginimai tarp narių, todėl formuluotės jautriausios.",
        [
            entry(
                "Kiek kartų nario pasirinkimas sutapo su daugumos jo frakcijos pasirinkimu. "
                "Tai nėra ištikimybės ar principingumo matas: mažesnis skaičius nereiškia nei blogiau, "
                "nei geriau — tik tai, kad narys dažniau balsavo kitaip nei jo frakcija. "
                "Priežasčių mes nežinome.",
                "skaidrumo skiltis · SkaidrumasHubView.tsx:616",
                "How often the member's choice matched their faction's majority. This is not a measure of "
                "loyalty or principle: a lower number is neither worse nor better — only that the member "
                "voted differently more often. We do not know the reasons.",
                "Ar „principingumo“ čia tinkamas žodis? Norime paneigti ir „ištikimybės“, "
                "ir „stuburo“ interpretacijas.",
                priority=True,
            ),
            entry(
                "Nariai, kurių dalyvavimas posėdžiuose žemiau 60 %. Tai atrankos kriterijus, o ne "
                "vertinimas — kaip skaičiuojama, žr. metodikoje.",
                "skaidrumo skiltis · SkaidrumasHubView.tsx:335",
                "Members whose attendance is below 60 %. This is a selection criterion, not an assessment.",
                "Sąrašas iš esmės yra „žemiausio dalyvavimo“ sąrašas. Ar sakinys pakankamai "
                "atsveria tai, ką skaitytojas pamatys?",
                priority=True,
            ),
            entry(
                "Tai ne reitingas. Nariai išdėstyti abėcėlės tvarka, o stulpeliai yra atskiri rodikliai — "
                "jie nesudedami ir tarpusavyje nepalyginami. Tuščios eilutės reiškia trūkstamus duomenis.",
                "stebėsenos lentelė · StebsenaView.tsx:205",
                "This is not a ranking. Members are in alphabetical order and the columns are separate "
                "measures — not summed, not comparable with each other. Empty cells mean missing data.",
                None,
            ),
            entry(
                "Duomenų dar nėra. Balsavimų duomenys surinkti, tačiau frakcijos pozicijos skaičiavimas "
                "dar neįjungtas — įjungsime tada, kai puslapis rodys ne tik suvestinį skaičių, bet ir "
                "konkrečius balsavimus, iš kurių jis susideda.",
                "skaidrumo skiltis · SkaidrumasHubView.tsx:674",
                "No data yet. Vote data is collected, but the faction-position calculation is not switched "
                "on — we will switch it on when the page shows not just a summary number but the "
                "individual votes it is made of.",
                None,
            ),
        ],
    ),
    (
        "6. Metodika, šaltiniai, sesijos",
        "Paaiškinamieji tekstai. Ilgesni, todėl svarbiausia, kad skambėtų kaip lietuviškai "
        "parašyti, o ne versti.",
        [
            entry(
                "Skaidrumo indeksas — kodėl jo neberodome. Anksčiau kiekvieno Seimo nario profilyje "
                "rodėme vieną suvestinį balą (0–100). Jo nebeskelbiame nei profilyje, nei sąrašuose, "
                "nei jokioje kitoje vietoje. Formulę paliekame čia, kad jos pašalinimas iš puslapių "
                "nebūtų tas pat, kas jos nuslėpimas.",
                "metodikos puslapis · MethodologyView.tsx:36",
                "The transparency index — why we no longer show it. We used to show a single 0–100 score. "
                "We publish it nowhere now. We leave the formula here so that removing it from the pages "
                "is not the same as hiding it.",
                "Paskutinis sakinys mums svarbus. Ar jis lietuviškai skamba natūraliai?",
                priority=True,
            ),
            entry(
                "Posėdžių dienų, kuriomis narys užsiregistravo arba balsavo, dalis iš visų posėdžių dienų "
                "per jo mandato laikotarpį.",
                "metodikos stalčius · „Dalyvavimas“ · dimensionExplainers.ts:22",
                "The share of sitting days on which the member registered or voted, out of all sitting "
                "days during their mandate.",
                None,
            ),
            entry(
                "Nerodo, ar narys dirbo komitetuose, susitikimuose ar rinkimų apygardoje — tik ar tą dieną "
                "buvo salėje.",
                "metodikos stalčius · „Dalyvavimas“ · dimensionExplainers.ts",
                "Does not show whether the member worked in committees, meetings or the constituency — "
                "only whether they were in the chamber that day.",
                None,
            ),
            entry(
                "Nerodo, ką narys pasakė, nei ar tai turėjo reikšmės. Kalbėti daug nėra tas pat, "
                "kas dirbti daug.",
                "metodikos stalčius · „Viešumas“ · dimensionExplainers.ts:50",
                "Does not show what the member said, nor whether it mattered. Speaking a lot is not the "
                "same as working a lot.",
                None,
            ),
            entry(
                "Kol kas nerenkame. VTEK privačių interesų registro paieška apsaugota nuo automatinio "
                "nuskaitymo, o atviri duomenys yra tik mėnesio suvestinės — todėl deklaracijų portale "
                "nerodome.",
                "šaltinių puslapis · SourcesView.tsx:13",
                "Not collected for now. The VTEK private-interests register search is protected against "
                "automated reading, and the open data is only monthly summaries — so we do not show "
                "declarations on the portal.",
                None,
            ),
            entry(
                "{n} balsavimų, kurių posėdžio data nepatenka į jokią paskelbtą sesiją. "
                "Rodome atskirai, o ne priskiriame spėjant.",
                "sesijų puslapis · SessionsView.tsx:181",
                "{n} votes whose sitting date falls into no published session. We show them separately "
                "rather than assigning them by guesswork.",
                None,
            ),
        ],
    ),
]

# The vote-summary pilot. Different in kind: not yet published anywhere, and the
# stage glosses are claims about procedure rather than about our data.
PILOT_GLOSSES = [
    ("Pateikimas",
     "pateikimo stadijoje sprendžiama, ar apskritai pradėti svarstyti projektą",
     "at the presentation stage it is decided whether to begin considering the project at all"),
    ("Svarstymas",
     "svarstymo stadijoje projektas nagrinėjamas iš esmės",
     "at the consideration stage the project is examined on its merits"),
    ("Priėmimas",
     "priėmimo stadijoje balsuojama dėl viso teksto",
     "at the adoption stage the vote is on the text as a whole"),
]

PILOT_SAMPLES = [
    ("Įprastas balsavimas",
     "2026 m. rugpjūčio 25 d. Seimas balsavo dėl šio klausimo: „Švietimo įstatymo Nr. I-1489 7, 8, 9 … "
     "straipsnių pakeitimo…“. Pavadinimą šaltinis pateikia sutrumpintą – jis nutrūksta. "
     "Balsavimo stadija — priėmimas (priėmimo stadijoje balsuojama dėl viso teksto). "
     "Už balsavo 98 nariai, prieš – 3 nariai, susilaikė – 2 nariai. Iš viso balsavo 103 nariai iš 140, "
     "kuriuos protokolas tuo metu laikė turinčiais teisę balsuoti. Ar klausimas priimtas, šaltinis "
     "neskelbia, todėl rezultato nenurodome."),
    ("Atmestas pagal skaičius, bet rezultato neskelbiame",
     "… Už balsavo 17 narių, prieš – 94 nariai, susilaikė – 11 narių. Iš viso balsavo 122 nariai iš 141… "
     "Ar klausimas priimtas, šaltinis neskelbia, todėl rezultato nenurodome."),
    ("Nepaskelbti rezultatai",
     "… Šaltinis nepaskelbė nei suvestinių, nei pavienių šio balsavimo rezultatų. "
     "Priežasties šaltinis nenurodo."),
    ("Nenurodyta stadija",
     "… Balsavimo stadijos šaltinis nenurodė. …"),
]


def build():
    doc = SimpleDocTemplate(
        str(OUT), pagesize=A4,
        leftMargin=20 * mm, rightMargin=18 * mm,
        topMargin=18 * mm, bottomMargin=16 * mm,
        title="Atviras Seimas — lietuviško teksto peržiūra",
        author="Atviras Seimas",
    )
    st = []

    st.append(P("Lietuviško teksto peržiūra", "title"))
    st.append(P("Atviras Seimas · 2026-09-05 · tekstai, kurių dar neskaitė gimtakalbis", "sub"))

    st.append(P(
        "Visą šio portalo lietuvišką tekstą parašė ne gimtakalbis. Kol jo neperskaitė žmogus, "
        "kuriam lietuvių kalba yra gimtoji, jis laikomas <b>darbiniu</b> — taip pažymėta ir kode "
        "(<font face='DejaVu-Mono' size='8'>LT-COPY: needs native review</font>, 21 faile).",
        "body"))
    st.append(P(
        "Šiame dokumente kiekvienas tekstas pateikiamas su trimis dalykais: <b>pats sakinys</b>, "
        "<b>kur jį pamato skaitytojas</b> ir <b>ką jis privalo reikšti</b> (angliškai). "
        "Paskutinis punktas svarbiausias — tik žinodami, ką sakinys turi pasakyti, galite "
        "įvertinti, ar jis tai pasako.", "body"))
    st.append(P("Ko prašome konkrečiai:", "body"))
    st.append(P(
        "• Ar sakinys reiškia tai, kas parašyta eilutėje „Turi reikšti“?<br/>"
        "• Ar jis skamba kaip lietuviškai parašytas, o ne išverstas?<br/>"
        "• Ar niekur nesijaučia vertinimo žmogui? Portalas nieko nevertina ir nereitinguoja — "
        "tai svarbiausia taisyklė, ir ją lengviausia pažeisti intonacija.<br/>"
        "• Kur pažymėta „Klausimas“ — atsakykite būtent į jį.", "body"))
    st.append(P(
        "<font color='#7a2e2e'>◆</font> žymi tekstus, kurie svarbiausi arba parašyti visai neseniai. "
        "Jei laiko mažai, pradėkite nuo jų.", "body"))
    st.append(P(
        "<b>7 skyrius yra kitokio pobūdžio.</b> Ten esantys stadijų paaiškinimai yra teiginiai apie "
        "Seimo procedūrą, o ne apie mūsų duomenis — juos reikia sutikrinti su Seimo statutu, "
        "ne su kalbos jausmu.", "body"))
    st.append(rule(8))

    for heading, note, entries in SECTIONS:
        st.append(P(heading, "h"))
        st.append(P(note, "hnote"))
        st.extend(entries)

    st.append(PageBreak())

    st.append(P("7. Balsavimų santraukos (dar niekur neskelbiama)", "h"))
    st.append(P(
        "Automatiškai generuojami sakiniai apie kiekvieną balsavimą. Šablonas deterministinis: "
        "kiekvienas skaičius ateina tiesiai iš duomenų bazės ir yra tikrinamas — jei tekste atsirastų "
        "skaičius, kurio duomenyse nėra, santrauka atmetama. Nė viena dar nepaskelbta.", "hnote"))

    st.append(P("7a. Stadijų paaiškinimai — tikrinti pagal Seimo statutą", "h"))
    st.append(P(
        "Šie trys sakiniai yra teiginiai apie parlamentinę procedūrą. Jei kuris nors netikslus, "
        "portalas kartotų klaidą prie tūkstančių balsavimų. Prašome sutikrinti su statutu, "
        "o ne vertinti stilių.", "hnote"))
    for stage, lt, en in PILOT_GLOSSES:
        st.append(entry(
            f"Balsavimo stadija — {stage.lower()} ({lt}).",
            f"kiekviena santrauka, kurios stadija „{stage}“ · pipeline/summaries/vote_template.py:43",
            en,
            "Ar šis paaiškinimas teisingas pagal Seimo statutą?",
            priority=True,
        ))

    st.append(P("7b. Santraukų pavyzdžiai", "h"))
    st.append(P(
        "Keturi iš dešimties pilotinių pavyzdžių. Visą dešimtuką rasite "
        "docs/reviews/p5-vote-summary-pilot.md.", "hnote"))
    for label, text in PILOT_SAMPLES:
        st.append(KeepTogether([
            Paragraph(f"<b>{label}</b>", S["gloss"]),
            Paragraph('„' + text + '“', S['lt']),
            rule(4),
        ]))

    st.append(P("Kas svarbu šiuose sakiniuose", "h"))
    st.append(P(
        "• „Ar klausimas priimtas, šaltinis neskelbia, todėl rezultato nenurodome.“ — Seimas "
        "neskelbia rezultato mūsų šaltinyje, todėl jo nespėliojame net tada, kai skaičiai atrodo "
        "vienareikšmiai. Ar sakinys tai aiškiai pasako?<br/>"
        "• Skaitvardžių formos: „98 nariai“, „3 nariai“, „17 narių“, „11 narių“, „1 narys“, "
        "„0 narių“. Ar visos teisingos, ypač 11–19 ir 21, 31 …?<br/>"
        "• Brūkšnys „prieš – 3 nariai“: ar tinkamas skyrybos ženklas ir ar reikalingas?", "body"))

    st.append(rule(8))
    st.append(P(
        "Pastabas galima rašyti tiesiai ant šio dokumento arba laisvu tekstu, nurodant sakinio "
        "pradžią. Nieko keisti kode nereikia.", "gloss"))

    doc.build(st)
    return OUT


if __name__ == "__main__":
    path = build()
    print(f"wrote {path} ({path.stat().st_size:,} bytes)")
