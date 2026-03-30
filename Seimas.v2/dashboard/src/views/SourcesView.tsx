import React from 'react';
import { NavLink } from 'react-router';
import { Database, ArrowLeft } from 'lucide-react';
import { Card } from '../components/Card';

const SOURCES = [
  { name: 'Lietuvos Respublikos Seimas (LRS)', detail: 'Balsavimai, posėdžiai, parlamentinė informacija — per sinchronizavimo sluoksnį.' },
  { name: 'data.gov.lt', detail: 'Vieši duomenų rinkiniai, kai integruoti į projekto pipeline.' },
  { name: 'VRK / VMI / registrai', detail: 'Kandidatūros, deklaracijos ir susiję vieši duomenys — pagal prieinamumą.' },
  { name: 'Projekto PostgreSQL duomenų bazė', detail: 'Agreguoti ir analizuoti įrašai; atnaujinimo laikas priklauso nuo sinchronizacijos.' },
];

export function SourcesView() {
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
        <Database className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Duomenų šaltiniai</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Iš kur ateina informacija portale
          </p>
        </div>
      </div>

      <Card className="p-0 border-border bg-card overflow-hidden">
        <ul className="divide-y divide-border">
          {SOURCES.map((s) => (
            <li key={s.name} className="p-5">
              <h2 className="font-semibold text-foreground">{s.name}</h2>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{s.detail}</p>
            </li>
          ))}
        </ul>
      </Card>

      <p className="text-sm text-muted-foreground">
        Techniniai laukų pavadinimai (pvz. <code className="text-xs bg-muted px-1 rounded">forensic_breakdown</code>,{' '}
        <code className="text-xs bg-muted px-1 rounded">attributes.INT</code>) naudojami API atsakymuose ir gali būti
        cituojami žiniasklaidoje kartu su pasiekimo data.
      </p>

      <p className="text-xs text-muted-foreground">
        <NavLink to="/dashboard/methodology" className="text-primary underline">
          Metodika
        </NavLink>
        {' · '}
        <NavLink to="/dashboard/corrections" className="text-primary underline">
          Pataisymai
        </NavLink>
      </p>
    </div>
  );
}
