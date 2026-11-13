import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { NavLink } from 'react-router';
import { Landmark, ArrowRight, ExternalLink } from 'lucide-react';
import { api } from '../services/api';
import type { CabinetPost, Government, OfficeHolder } from '../services/api';
import { Card } from '../components/Card';
import { cn } from '../components/ui/utils';
import { ProblemDetailsNotice } from '../components/ProblemDetailsNotice';
import { AREAS, WITH_PRESIDENT, holdersOf, keptPost, lastHolder } from '../utils/valdzia';

/**
 * „Valdžios žemėlapis" — who makes the law, who signs it, who carries it out.
 *
 * A register drawn as a map. Every name comes from a signed presidential
 * decree (migration 050) and links to it. The page counts nothing and compares
 * no one: the patterns a reader finds — who kept a post through three
 * Governments, who sits in the Seimas as well — are theirs to find.
 *
 * Statements about powers are the institutions' own wording: lrp.lt
 * „Prezidento funkcijos" and lrv.lt „Ministrų kabinetas". Nothing here is
 * stated from memory. See docs/reviews/2026-11-13-valdzios-zemelapis.md.
 */

const LRP_FUNCTIONS = 'https://www.lrp.lt/lt/institucija/prezidento-funkcijos/118';
const LRV_CABINET = 'https://lrv.lt/lt/apie-vyriausybe/xxi-vyriausybe/ministru-kabinetas/';

const Ext = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary underline underline-offset-2">
    {children}
    <ExternalLink className="w-3 h-3" aria-hidden="true" />
  </a>
);

const shortName = (ministry: string) => ministry.replace(/ ministerija$/, '');

// LT-COPY: needs native review — every string in this file.
const INSTITUTIONS = [
  { name: 'Seimas', verb: 'Priima įstatymus',
    text: '141 narys. Svarsto ir priima įstatymus, pritaria Ministro Pirmininko kandidatūrai ir Vyriausybės programai.' },
  { name: 'Prezidentas', verb: 'Atstovauja valstybei',
    text: 'Valstybės vadovas. Didžiausius įgaliojimus turi užsienio politikoje. Pasirašo Seimo priimtus įstatymus arba juos vetuoja.' },
  { name: 'Vyriausybė', verb: 'Vykdo įstatymus',
    text: 'Ministras Pirmininkas ir 14 ministrų. Kiekvienas ministras vadovauja ministerijai ir atsako už jam pavestą sritį.' },
];

const LAW_STEPS = [
  ['Priima', 'Seimas svarsto ir balsuoja'],
  ['Pasirašo arba vetuoja', 'Prezidentas'],
  ['Vykdo', 'Vyriausybė ir atsakinga ministerija'],
];

const GOV_STEPS = [
  ['Teikia', 'Prezidentas teikia Seimui Ministro Pirmininko kandidatūrą'],
  ['Pritaria', 'Seimas balsuoja dėl kandidatūros'],
  ['Skiria', 'Prezidentas skiria Ministrą Pirmininką, o jo teikimu – ministrus'],
  ['Įgalioja', 'Seimas pritaria Vyriausybės programai'],
];

function Steps({ title, steps }: { title: string; steps: string[][] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-muted-foreground mb-2">{title}</h3>
      <ol className="flex flex-col md:flex-row md:items-stretch gap-2">
        {steps.map(([head, body], i) => (
          <React.Fragment key={head}>
            {i > 0 && <ArrowRight className="hidden md:block w-4 h-4 self-center shrink-0 text-muted-foreground" aria-hidden="true" />}
            <li className="flex-1 rounded-lg border border-border bg-card px-3 py-2">
              <span className="block text-sm font-semibold">{i + 1}. {head}</span>
              <span className="block text-sm text-muted-foreground">{body}</span>
            </li>
          </React.Fragment>
        ))}
      </ol>
    </div>
  );
}

/** A person's name; a link to their Seimas profile only where the link is confirmed. */
function Person({ holder }: { holder: OfficeHolder }) {
  if (!holder.mp_id) return <span className="font-semibold">{holder.name}</span>;
  return (
    <NavLink to={`/dashboard/mps/${holder.mp_id}`} className="font-semibold text-primary underline underline-offset-2">
      {holder.name}
    </NavLink>
  );
}

function MinistryTile({ ministryKey, name, url, post }: { ministryKey: string; name: string; url: string; post: CabinetPost | null }) {
  const withPresident = WITH_PRESIDENT.has(ministryKey);
  return (
    <li className={cn(
      'rounded-lg border bg-card px-3 py-2 min-w-[11rem] flex-1 basis-[11rem]',
      withPresident ? 'border-attention border-l-4' : 'border-border',
    )}>
      <a href={url} target="_blank" rel="noreferrer" className="block text-xs uppercase tracking-wide text-muted-foreground hover:text-primary">
        {shortName(name)}
      </a>
      {post ? (
        <>
          <span className="block mt-1"><Person holder={post} /></span>
          <span className="block text-xs text-muted-foreground">{post.title}</span>
          <span className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs">
            {post.mp_id && (
              // The decree's title is gendered („ministrė"); the mark follows it.
              <span className="rounded bg-primary/15 px-1.5 text-foreground">
                {post.title.endsWith('ė') ? 'ir Seimo narė' : 'ir Seimo narys'}
              </span>
            )}
            {post.basis_url && <Ext href={post.basis_url}>{post.basis ?? 'Dekretas'}</Ext>}
          </span>
          {withPresident && <span className="block mt-1 text-xs text-foreground">dirba kartu su Prezidentu</span>}
        </>
      ) : (
        // §1.1: a ministry with no row is unknown, not vacant.
        <span className="block mt-1 text-sm text-muted-foreground">Ministro įrašo neturime</span>
      )}
    </li>
  );
}

function govDates(g: Government): string {
  const parts: string[] = [];
  if (g.mandate_from) parts.push(`įgaliojimai nuo ${g.mandate_from}`);
  if (g.started_work_on) parts.push(`dirba nuo ${g.started_work_on}`);
  if (g.resigned_on) parts.push(`atsistatydino ${g.resigned_on}`);
  return parts.join(' · ');
}

export function ValdziaView() {
  const { data, isLoading, error } = useQuery({ queryKey: ['government'], queryFn: () => api.getGovernment() });
  const [picked, setPicked] = useState<string | null>(null);

  if (isLoading) return <p className="text-muted-foreground">Kraunama…</p>;
  if (error) return <ProblemDetailsNotice error={error} />;
  if (!data?.available || data.governments.length === 0) {
    return <p className="text-muted-foreground">Vyriausybės ir Prezidento duomenų šiuo metu neturime.</p>;
  }

  const current = data.governments[data.governments.length - 1];
  const ministryByKey = new Map(data.ministries.map((m) => [m.key, m]));
  const pick = (name: string) => setPicked((p) => (p === name ? null : name));

  const NameButton = ({ holder }: { holder: OfficeHolder }) => (
    <button
      type="button"
      onClick={() => pick(holder.name)}
      aria-pressed={picked === holder.name}
      className={cn(
        'rounded px-1 -mx-1 text-left hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring',
        picked === holder.name && 'bg-attention/30 font-semibold',
      )}
    >
      {holder.name}
    </button>
  );

  return (
    <div className="space-y-10 text-foreground">
      <header className="flex items-start gap-3 max-w-3xl">
        <Landmark className="w-8 h-8 text-primary shrink-0 mt-1" aria-hidden="true" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Valdžios žemėlapis</h1>
          <p className="text-muted-foreground mt-1">
            Kas Lietuvoje priima įstatymus, kas juos pasirašo ir kas juos vykdo. Trys institucijos,
            keturiolika ministerijų, vienas puslapis.
          </p>
        </div>
      </header>

      <section aria-labelledby="trys" className="space-y-4">
        <h2 id="trys" className="text-xl font-semibold">Trys institucijos</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {INSTITUTIONS.map((it) => (
            <Card key={it.name} className="p-4">
              <p className="text-sm text-muted-foreground">{it.name}</p>
              <p className="text-lg font-semibold">{it.verb}</p>
              <p className="text-sm text-muted-foreground mt-1">{it.text}</p>
            </Card>
          ))}
        </div>
        <Steps title="Kaip įstatymas įsigalioja" steps={LAW_STEPS} />
        <Steps title="Kaip atsiranda Vyriausybė" steps={GOV_STEPS} />
      </section>

      <section aria-labelledby="zemelapis" className="space-y-4">
        <div className="max-w-3xl">
          <h2 id="zemelapis" className="text-xl font-semibold">Kas už ką atsako šiandien</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Eilutės yra sritys. {current.numeral} Vyriausybė, Ministras Pirmininkas{' '}
            {current.prime_minister ? <Person holder={current.prime_minister} /> : 'nežinomas'}
            {govDates(current) && ` · ${govDates(current)}`}. Didžiausi Prezidento įgaliojimai yra viršutinėje
            eilutėje: užsienio politiką jis vykdo kartu su Vyriausybe.
          </p>
        </div>

        <div className="space-y-3">
          {AREAS.map((area, i) => (
            <div key={area.key} className="grid gap-3 lg:grid-cols-[11rem_17rem_1fr] rounded-xl border border-border p-3">
              <div>
                <h3 className="font-semibold">{area.title}</h3>
                <p className="text-xs text-muted-foreground">{area.hint}</p>
              </div>

              {i === 0 ? (
                <div className="rounded-lg border-2 border-attention bg-attention/15 px-3 py-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Prezidentas</p>
                  <p className="font-semibold">{data.president?.name ?? 'Įrašo neturime'}</p>
                  <ul className="mt-1 space-y-1 text-sm">
                    <li>Sprendžia pagrindinius užsienio politikos klausimus ir kartu su Vyriausybe vykdo užsienio politiką.</li>
                    <li>Yra vyriausiasis valstybės ginkluotųjų pajėgų vadas, vadovauja Valstybės gynimo tarybai.</li>
                    <li>Pasirašo tarptautines sutartis, Vyriausybės teikimu skiria diplomatinius atstovus.</li>
                  </ul>
                  <p className="mt-1 text-xs"><Ext href={LRP_FUNCTIONS}>Prezidento funkcijos, lrp.lt</Ext></p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground px-3 py-2">
                  <span className="block text-xs uppercase tracking-wide">Prezidentas</span>
                  {area.president}
                </p>
              )}

              <ul className="flex flex-wrap gap-2">
                {area.ministries.map((key) => {
                  const m = ministryByKey.get(key);
                  return m ? <MinistryTile key={key} ministryKey={key} name={m.name} url={m.url} post={lastHolder(current, key)} /> : null;
                })}
              </ul>
            </div>
          ))}
        </div>

        <ul className="text-xs text-muted-foreground space-y-1 max-w-3xl">
          <li>
            Ministrų sąrašas: <Ext href={current.composition_url}>{current.composition_basis}</Ext>. Ministrus Ministro
            Pirmininko teikimu skiria ir atleidžia Respublikos Prezidentas (<Ext href={LRV_CABINET}>lrv.lt</Ext>).
          </li>
          <li>
            Žyma „ir Seimo narys" arba „ir Seimo narė" rodoma tik ten, kur tai patvirtina oficialus ministro gyvenimo aprašymas. Jei žymos nėra,
            tai nereiškia, kad ministras nėra Seimo narys.
          </li>
          <li>Ministerijų grupavimas į keturias sritis yra mūsų, ne oficialus.</li>
        </ul>
      </section>

      <section aria-labelledby="kabinetai" className="space-y-4">
        <div className="max-w-3xl">
          <h2 id="kabinetai" className="text-xl font-semibold">
            {data.governments.length} Vyriausybės per vieną Seimo kadenciją
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Skaitykite eilutę skersai: kas vadovavo tai pačiai ministerijai. Paspauskite vardą, ir pamatysite visas to
            žmogaus pareigas lentelėje. Linija kairėje reiškia, kad ministras liko tose pačiose pareigose.
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted text-left align-top">
                <th scope="col" className="px-3 py-2 font-semibold">Pareigos</th>
                {data.governments.map((g) => (
                  <th key={g.number} scope="col" className="px-3 py-2 font-semibold min-w-[12rem]">
                    {g.numeral} Vyriausybė
                    <span className="block text-xs font-normal text-muted-foreground">{govDates(g)}</span>
                    <span className="block text-xs font-normal"><Ext href={g.composition_url}>sudėties dekretas</Ext></span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr className="bg-card">
                <th scope="row" className="px-3 py-2 text-left font-semibold">Ministras Pirmininkas</th>
                {data.governments.map((g) => (
                  <td key={g.number} className="px-3 py-2">
                    {g.prime_minister ? <NameButton holder={g.prime_minister} /> : <span className="text-muted-foreground">įrašo neturime</span>}
                  </td>
                ))}
              </tr>
              {data.ministries.map((m) => (
                <tr key={m.key} className="bg-card">
                  <th scope="row" className="px-3 py-2 text-left font-normal">{shortName(m.name)}</th>
                  {data.governments.map((g, gi) => {
                    const holders = holdersOf(g, m.key);
                    const kept = keptPost(data.governments[gi - 1], g, m.key);
                    return (
                      <td key={g.number} className={cn('px-3 py-2', kept && 'border-l-4 border-primary')}>
                        {kept && <span className="sr-only">Liko tose pačiose pareigose: </span>}
                        {holders.length === 0 && <span className="text-muted-foreground">įrašo neturime</span>}
                        {holders.map((h) => (
                          <span key={h.seq} className="block">
                            {h.seq > 1 && h.from_date && <span className="text-xs text-muted-foreground">nuo {h.from_date}: </span>}
                            <NameButton holder={h} />
                          </span>
                        ))}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-muted-foreground max-w-3xl">
          Vardai rašomi taip, kaip Prezidento dekretuose. Lentelė nieko nevertina: joje nėra reitingų ir balų. Partijų
          nerodome, nes dekretuose jų nėra.
        </p>
      </section>

      <p className="text-xs text-muted-foreground">
        <NavLink to="/dashboard/sources" className="text-primary underline">Šaltiniai</NavLink>
        {' · '}
        <NavLink to="/dashboard/corrections" className="text-primary underline">Pataisymai</NavLink>
      </p>
    </div>
  );
}

export default ValdziaView;
