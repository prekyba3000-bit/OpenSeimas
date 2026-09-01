import React from 'react';
import { NavLink } from 'react-router';
import { BookOpen, ArrowLeft } from 'lucide-react';
import { Card } from '../components/Card';
import { CitationCopyButton } from '../components/CitationCopyButton';
import { MethodologyVersions } from '../components/MethodologyVersions';

/**
 * Plain-language methodology for public and journalists (Lithuanian).
 */
export function MethodologyView() {
  return (
    <div className="space-y-8 text-foreground max-w-3xl">
      <NavLink
        to="/dashboard/skaidrumas"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="w-4 h-4" />
        Atgal į skaidrumo centrą
      </NavLink>

      <div className="flex items-center gap-3">
        <BookOpen className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Metodika</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Kaip skaičiuojami rodikliai ir ką jie reiškia
          </p>
        </div>
      </div>

      <Card className="p-6 space-y-6 border-border bg-card">
        {/* The composite, demoted here rather than deleted. It is no longer
            shown on any profile, list or panel; the formula is published so
            that removing it from the surfaces is not the same as hiding it.
            LT-COPY: needs native review — whole section. */}
        <section id="skaidrumo-indeksas">
          <h2 className="text-lg font-semibold mb-2">
            Skaidrumo indeksas — kodėl jo neberodome
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Anksčiau kiekvieno Seimo nario profilyje rodėme vieną suvestinį balą (0–100).
            Jo nebeskelbiame nei profilyje, nei sąrašuose, nei jokioje kitoje vietoje.
            Formulę paliekame čia, kad jos pašalinimas iš puslapių nebūtų tas pat, kas
            jos nuslėpimas.
          </p>
          <p className="text-muted-foreground text-sm leading-relaxed mt-3">
            <strong className="text-foreground">Formulė:</strong>{' '}
            <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
              100 − bazinė rizikos bauda + forensinių modulių korekcija
            </code>{' '}
            (rezultatas apribojamas 0–100). Bazinė rizika skaičiuojama iš duomenų bazėje
            esančių signalų; modulių korekcija — iš Benfordo, chronologijos, balsavimo
            geometrijos, paslėptų ryšių ir frakcijos lojalumo modulių.
          </p>
          <p className="text-muted-foreground text-sm leading-relaxed mt-3">
            <strong className="text-foreground">Kodėl neberodome.</strong> Vienas skaičius
            atsako į klausimą už pilietį, užuot padėjęs jam pačiam apsispręsti. Jis suplokština
            žmogų į vieną ašį: daug įstatymų rengiantis, bet retai balsuojantis narys atrodo
            „blogas“, o posėdžiuose sėdintis, bet nieko neinicijuojantis — „geras“. Ir jis yra
            per tikslus duomenims, kuriais remiasi: 31 % balsavimų neturi paskelbtų pavienių
            balsų, o dalyvavimas turi mandato laikotarpio ribas ir slenksčius.
          </p>
          <p className="text-muted-foreground text-sm leading-relaxed mt-3">
            <strong className="text-foreground">Kalibravimo trūkumas.</strong> Kai forensinių
            modulių duomenų nėra, formulė grąžina bazinę reikšmę — todėl daugumai narių balas
            buvo 100. Toks skaičius kelia daugiau pasitikėjimo, nei yra užsitarnavęs: jis rodė
            ne švarų įrašą, o duomenų nebuvimą.
          </p>
          <p className="text-muted-foreground text-sm leading-relaxed mt-3">
            Vietoj jo profilyje rodome penkis atskirus rodiklius. Jie nesudedami: kiekvienas
            matuoja skirtingą dalyką, kiekvienas turi savo vardiklį, ir kiekvienas pasako, ko
            <em>nerodo</em>.
          </p>
        </section>

        <section>
          <h2 id="benford" className="text-lg font-semibold mb-2">
            Benfordo dėsnio analizė
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Tikriname, ar balsų ar kitų skaitinių laukų pirmųjų skaitmenų pasiskirstymas atitinka Benfordo dėsnį —
            tai pagalbinis signalas dėl galimų anomalijų duomenyse, ne savarankiškas kaltinimas.
          </p>
        </section>

        <section>
          <h2 id="chronologine-analize" className="text-lg font-semibold mb-2">
            Chronologinė analizė
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Vertiname pataisų rengimo ir susijusių veiksmų laiko modelius: neįprastai trumpi ar susigrūdę intervalai
            gali reikšti vertimo dėmesį, ypač kartu su kitais šaltiniais.
          </p>
        </section>

        <section>
          <h2 id="partijos-lojalumas" className="text-lg font-semibold mb-2">
            Sutapimas su frakcija (anksčiau „Partijos lojalumas")
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Frakcijos linijos atžvilgiu matuojame nepriklausomo balsavimo dalį per laiką — tai kontekstinis rodiklis,
            padedantis suprasti elgsenos modelį, o ne moralinį verdiktą.
          </p>
        </section>

        <section>
          <h2 id="fantominis-tinklas" className="text-lg font-semibold mb-2">
            Fantominis tinklas
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Siejame viešus subjektus (pvz., įmonių ryšius, viešuosius pirkimus) su galimais artimos distancijos ryšiais
            — signalas gali reikalauti gilesnės žurnalistinės ar tyrėjų patikros.
          </p>
        </section>

        <section>
          <h2 id="balsavimo-geometrija" className="text-lg font-semibold mb-2">
            Balsavimo geometrija
          </h2>
          <p className="text-sm text-muted-foreground">
            {/* TODO(v4): add methodology description for vote geometry engine */}
            Statistiniai balsavimo modeliai ir jų nuokrypiai — papildomas metodikos tekstas bus čia.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">Kiti vieši rodikliai</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Profilyje taip pat rodomi <strong>dalyvavimo, partijos lojalumo, viešumo ir pastovumo</strong> rodikliai
            (projektai, komitetai, kalbos, lankomumas ir pan.), normalizuoti pagal aktyvių Seimo narių imtį. Jie padeda
            palyginti aktyvumą, bet nė vieno savaime netraktuokite kaip etinio verdikto.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">Wiki ataskaitos</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Autonominės wiki bylos (kai jos paskelbtos) generuojamos agentu pagal griežtas taisykles: faktai turi
            remtis <strong>duomenų laukais</strong> arba <strong>viešai nuoroda</strong>. Jei bylos nėra, profilyje
            matote tik API ir duomenų bazės signalus.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">Tyrėjų įrankiai</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            <strong>OpenPlanter</strong> (terminalo ar darbalaukio aplikacija) naudojamas pipeline’ams ir gilesnei
            analizei — tai ne privaloma visuomenei. Šis portalas skirtas skaitymui ir dalijimosi nuorodomis.
          </p>
        </section>
      </Card>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Metodikos versijos: lankomumas</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Paskelbti šio rodiklio skaičiavimo pakeitimai ir jų įsigaliojimo datos.
          </p>
        </div>
        <MethodologyVersions metricKey="attendance" />
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <CitationCopyButton />
      </div>

      <p className="text-xs text-muted-foreground">
        Daugiau apie duomenų šaltinius:{' '}
        <NavLink to="/dashboard/sources" className="text-primary underline">
          Šaltiniai
        </NavLink>
        {' · '}
        <NavLink to="/dashboard/corrections" className="text-primary underline">
          Pataisymai
        </NavLink>
      </p>
    </div>
  );
}
