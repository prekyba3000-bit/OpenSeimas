import React from 'react';
import { NavLink } from 'react-router';
import { BookOpen, ArrowLeft } from 'lucide-react';
import { Card } from '../components/Card';
import { CitationCopyButton } from '../components/CitationCopyButton';

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
        <section>
          <h2 className="text-lg font-semibold mb-2">INT (vientisumas)</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            <strong className="text-foreground">INT</strong> — tai suvestinis vientisumo balas (0–100), grindžiamas
            rizikos signalais iš duomenų bazėje esančių forensinių modulių (Benford, chronologija, balsavimo
            geometrija, „phantom“ tinklai ir kt.), kai jie prieinami. Jei šaltinių nėra arba duomenys dar
            nesinchronizuoti, bazinė reikšmė gali likti aukšta — tai <strong>ne</strong> „švarumo sertifikatas“,
            o <strong>modelio išvestis</strong>, kurią visada vertinkite kartu su šaltiniais ir kontekstu.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">Kiti atributai (STR, WIS, CHA, STA)</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Tai <strong>veiklos ir dalyvavimo</strong> rodikliai (projektai, komitetai, kalbos, lankomumas ir pan.),
            normalizuoti pagal visą aktyvių Seimo narių imtį. Jie padeda palyginti aktyvumą, bet ne vieną savaime
            traktuokite kaip etinį verdiktą.
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
