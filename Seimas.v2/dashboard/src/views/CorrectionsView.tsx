import React from 'react';
import { NavLink } from 'react-router';
import { Mail, ArrowLeft } from 'lucide-react';
import { Card } from '../components/Card';

export function CorrectionsView() {
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
        <Mail className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pataisymai ir pastabos</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Jei radote klaidą ar turite pagrįstą papildymą
          </p>
        </div>
      </div>

      <Card className="p-6 space-y-4 border-border bg-card">
        <p className="text-muted-foreground text-sm leading-relaxed">
          Šis portalas remiasi automatizuota analize ir viešais šaltiniais. Klaidingi ar pasenę duomenys gali
          atsirasti dėl sinchronizacijos vėlavimo, šaltinio pakeitimo ar modelio ribų.
        </p>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Prašome nurodyti: <strong className="text-foreground">kurį puslapį ar SN</strong>,{' '}
          <strong className="text-foreground">kokį teiginį</strong> laikote netiksliu, ir{' '}
          <strong className="text-foreground">nuorodą į priešingą viešą šaltinį</strong> (jei yra). Tai pagreitina
          peržiūrą.
        </p>
        <p className="text-sm text-foreground">
          Kontaktą įrašykite į projekto viešą kanalą (pvz. GitHub Issues ar el. paštą, kurį nurodo projekto
          savininkas). Čia nebendriname privataus el. pašto — jį pridėkite savo diegime, jei reikia.
        </p>
      </Card>

      <p className="text-xs text-muted-foreground">
        <NavLink to="/dashboard/methodology" className="text-primary underline">
          Metodika
        </NavLink>
        {' · '}
        <NavLink to="/dashboard/sources" className="text-primary underline">
          Šaltiniai
        </NavLink>
      </p>
    </div>
  );
}
