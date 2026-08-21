import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import MpProfileCard from '../components/MpProfileCard';
import { WikiPanel } from '../components/WikiPanel';
import { MpReplies } from '../components/MpReplies';
import { ScoreTooltip } from '../components/ScoreTooltip';
import { readMpDimension } from '../utils/mpLegacyDimensions';
import { mandatePeriodLabel, servedNoDays } from '../utils/mpCounts';
import { formatLtDateLong } from '../utils/ltDate';
import { ApiError, api, type ForensicFlag, MpProfile, MpVoteRecord } from '../services/api';
import { toastErrorDeduped } from '../utils/toastDeduped';
import { ProblemDetailsNotice } from '../components/ProblemDetailsNotice';
import { LT } from '../i18n/lt';
import { NO_CHOICE_RECORDED_LT } from '../utils/perMemberChoices';
import { SITE_NAME } from '../utils/routeTitles';

type ProfileTab = 'apzvalga' | 'balsavimai' | 'apygarda' | 'biografija';

const FORENSIC_ENGINES: ForensicFlag['engine'][] = [
  'benford',
  'chrono',
  'loyalty',
  'phantom',
  'vote_geometry',
  'base_risk',
];

function parseHighlightFlag(raw: string | null): ForensicFlag['engine'] | undefined {
  if (!raw) return undefined;
  return FORENSIC_ENGINES.includes(raw as ForensicFlag['engine'])
    ? (raw as ForensicFlag['engine'])
    : undefined;
}

/**
 * A member's choice on one vote, or an honest blank.
 *
 * `choice` is typed `string` but is null on 31% of votes — the source
 * publishes no per-member results for them — and `.trim()` on the first null
 * threw, blanking the whole Balsavimai tab behind the error boundary.
 */
function formatVoteChoiceLabel(choice: string | null | undefined): string {
  if (choice == null) return NO_CHOICE_RECORDED_LT;
  const c = choice.trim();
  if (!c) return NO_CHOICE_RECORDED_LT;
  if (c === 'for' || c === LT.voteChoices.for) return LT.voteChoices.for;
  if (c === 'against' || c === LT.voteChoices.against) return LT.voteChoices.against;
  if (c === 'abstain' || c === LT.voteChoices.abstain) return LT.voteChoices.abstain;
  if (c === 'absent' || c === LT.voteChoices.absent) return LT.voteChoices.absent;
  return c;
}

const TAB_LABELS: Record<ProfileTab, string> = {
  apzvalga: 'Apžvalga',
  balsavimai: 'Balsavimai',
  apygarda: 'Apygarda',
  biografija: 'Biografija',
};

interface MpProfileLayoutProps {
  profile: MpProfile | null;
  votes: MpVoteRecord[];
  votesLoading: boolean;
  loading?: boolean;
  error?: string | null;
  errorDetails?: unknown;
  slowNetwork?: boolean;
  highlightEngine?: ForensicFlag['engine'];
}

export const MpProfileLayout = ({
  profile,
  votes,
  votesLoading,
  loading = false,
  error = null,
  errorDetails = null,
  slowNetwork = false,
  highlightEngine,
}: MpProfileLayoutProps) => {
  const [tab, setTab] = useState<ProfileTab>('apzvalga');

  useEffect(() => {
    if (highlightEngine) setTab('apzvalga');
  }, [highlightEngine]);

  if (loading) {
    return (
      <Card className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mb-4" />
        Kraunamas Seimo nario profilis ir stebėsenos API…
        {slowNetwork && <p className="mt-3 text-xs">Tinklas lėtas, bandome pakartoti užklausą.</p>}
      </Card>
    );
  }

  if (!profile || error) {
    const msg =
      error === 'MP not found'
        ? 'Seimo narys nerastas arba pašalintas iš duomenų bazės.'
        : error === 'Failed to load mp profile'
          ? 'Nepavyko užkrauti profilio iš serverio. Bandykite vėliau arba žr. metodiką dėl duomenų apribojimų.'
          : error || 'Įrašas nerastas.';
    return (
      <Card className="p-12 text-center flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <p className="text-muted-foreground max-w-md">{msg}</p>
        {error !== 'MP not found' && errorDetails && (
          <ProblemDetailsNotice error={errorDetails} className="text-sm w-full max-w-md" />
        )}
        <p className="text-xs text-muted-foreground">
          Jei API negrąžina <code className="bg-muted px-1 rounded">forensic_breakdown</code>, rodikliai gali būti
          neišsamūs — tai normalu degradavus duomenims.
        </p>
        <Button variant="ghost" onClick={() => (window.location.hash = '#/dashboard/mps')}>
          Atgal į sąrašą
        </Button>
      </Card>
    );
  }

  const partyLabel = profile.mp.party?.trim() || 'Nepriklausomas (-a)';
  const isActive = profile.mp.active !== false;
  const fallbackPhoto =
    'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%231f2937" width="100" height="100"/><text x="50" y="58" text-anchor="middle" fill="%239ca3af" font-size="34">MP</text></svg>';

  // „Skaidrumo indeksas" — the composite — used to headline this profile. It
  // is gone: the platform's voice is a librarian's, not a judge's, and a
  // single number fills the citizen's judgment-gap with a plausible-looking
  // default verdict. The formula lives on the methodology page.

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button
          variant="ghost"
          className="pl-0 gap-2 text-muted-foreground hover:text-foreground"
          onClick={() => (window.location.hash = '#/dashboard/mps')}
        >
          <ArrowLeft className="w-4 h-4" />
          Atgal į Seimo narius
        </Button>
      </div>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
        <img
          src={profile.mp.photo || fallbackPhoto}
          alt={profile.mp.name}
          className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl object-cover bg-muted border border-border shrink-0"
          onError={(e) => {
            (e.target as HTMLImageElement).src = fallbackPhoto;
          }}
        />
        <div className="min-w-0 flex-1 space-y-3">
          <h1 className="text-xl font-medium text-foreground">{profile.mp.name}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs font-medium text-foreground">
              {partyLabel}
            </span>
            {/* „Neaktyvus" said nothing useful about a person who served a full
                year and was replaced. Name the state and the period. */}
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                isActive ? 'bg-vote-for/15 text-vote-for dark:text-vote-for' : 'bg-muted text-muted-foreground'
              }`}
            >
              {isActive ? 'Aktyvus' : 'Kadencija baigta'}
            </span>
          </div>

          {!isActive && (
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground space-y-0.5">
              <p>
                Šis Seimo narys šiuo metu mandato neturi. Įrašai išsaugomi —
                balsavimai ir lankomumo skaičiavimai jais remiasi.
              </p>
              {mandatePeriodLabel(profile.mp) && (
                <p className="font-mono text-foreground/80">{mandatePeriodLabel(profile.mp)}</p>
              )}
              {servedNoDays(profile.mp) && (
                // The four who were elected and resigned the same day. Saying
                // this outright is better than an empty voting record that
                // looks like missing data.
                <p>Mandato neperėmė — kadencija baigėsi tą pačią dieną.</p>
              )}
            </div>
          )}
        </div>
      </header>

      {/* TODO(v4): sync active tab to URL search param for deep linking (WS5) */}
      <nav className="border-b border-border" aria-label="Profilio skyriai">
        <ul className="flex flex-wrap gap-1 -mb-px">
          {(Object.keys(TAB_LABELS) as ProfileTab[]).map((key) => (
            <li key={key}>
              <button
                type="button"
                onClick={() => setTab(key)}
                className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                  tab === key
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {TAB_LABELS[key]}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="pb-8">
        {tab === 'apzvalga' && (
          <div className="flex flex-col gap-6">
            <MpProfileCard profile={profile} highlightEngine={highlightEngine} />
            <ScoreTooltip profile={profile} />
            <MpReplies mpId={profile.mp.id} />
          </div>
        )}

        {tab === 'balsavimai' && (
          <div className="space-y-3">
            {votesLoading ? (
              <p className="text-sm text-muted-foreground">Kraunama balsavimų istorija…</p>
            ) : votes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Balsavimų istorija tuščia arba dar neįkelta.</p>
            ) : (
              <ul className="divide-y divide-border rounded-xl border border-border bg-card">
                {votes.map((v) => (
                  <li key={`${v.date}-${v.title}`} className="px-4 py-3 text-sm">
                    <div className="font-medium text-foreground">{v.title}</div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{formatLtDateLong(v.date) ?? v.date}</span>
                      <span className="text-foreground">{formatVoteChoiceLabel(v.choice)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === 'apygarda' && (
          <div>
            {/* TODO(v4): render district when MpDetail / MpSummary exposes apygarda or constituency field */}
            <p className="text-sm text-muted-foreground">Apygardos duomenys bus čia.</p>
          </div>
        )}

        {tab === 'biografija' && (
          <div className="[&>section]:mt-0">
            <WikiPanel mpId={profile.mp.id} />
          </div>
        )}
      </div>
    </div>
  );
};

const MpProfileView = ({ mpId }: { mpId: string }) => {
  const [searchParams] = useSearchParams();
  const highlightEngine = parseHighlightFlag(searchParams.get('flag'));

  const [slowNetwork, setSlowNetwork] = useState(false);

  const profileQuery = useQuery({
    queryKey: ['mps', mpId, 'profile'],
    queryFn: () => api.getMpProfile(mpId),
    enabled: Boolean(mpId),
  });

  const votesQuery = useQuery({
    queryKey: ['mps', mpId, 'votes'],
    queryFn: () => api.getMpVotes(mpId, 40),
    enabled: Boolean(mpId) && profileQuery.isSuccess,
  });

  const profile = profileQuery.data ?? null;
  const votes = votesQuery.data ?? [];
  const votesLoading = votesQuery.isFetching;
  const loading = profileQuery.isPending;
  const error =
    profileQuery.isError && profileQuery.error instanceof ApiError && profileQuery.error.status === 404
      ? 'MP not found'
      : profileQuery.isError
        ? 'Failed to load mp profile'
        : null;
  const errorDetails = profileQuery.isError && error !== 'MP not found' ? profileQuery.error : null;

  useEffect(() => {
    if (!profileQuery.isFetching) {
      setSlowNetwork(false);
      return;
    }
    const slowTimer = window.setTimeout(() => setSlowNetwork(true), 1200);
    return () => window.clearTimeout(slowTimer);
  }, [profileQuery.isFetching]);

  useEffect(() => {
    if (!profileQuery.isError || !profileQuery.error) return;
    if (profileQuery.error instanceof ApiError && profileQuery.error.status === 404) return;
    toastErrorDeduped(`mp:profile:${mpId}`, LT.errors.profileLoad);
  }, [mpId, profileQuery.isError, profileQuery.error]);

  useEffect(() => {
    if (profile?.mp?.name) {
      document.title = `${profile.mp.name} · ${SITE_NAME}`;
    }
  }, [profile?.mp?.name]);

  return (
    <MpProfileLayout
      profile={profile}
      votes={votes}
      votesLoading={votesLoading}
      loading={loading}
      error={error}
      errorDetails={errorDetails}
      slowNetwork={slowNetwork}
      highlightEngine={highlightEngine}
    />
  );
};

export default MpProfileView;
