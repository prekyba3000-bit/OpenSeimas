import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router';
import ReactMarkdown from 'react-markdown';
import { FileQuestion, ShieldAlert, Clock } from 'lucide-react';
import { fetchWikiMarkdown, checkWikiIdentity } from '../services/wiki';
import type { WikiFrontmatter, WikiIdentityCheck } from '../services/wiki';
import { ProblemDetailsNotice } from './ProblemDetailsNotice';
import { LT } from '../i18n/lt';

interface WikiPanelProps {
  mpId: string;
}

export function WikiPanel({ mpId }: WikiPanelProps) {
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [requestError, setRequestError] = useState<unknown>(null);
  const [usingCached, setUsingCached] = useState(false);
  const [identityCheck, setIdentityCheck] = useState<WikiIdentityCheck>({ status: 'ok' });

  useEffect(() => {
    if (!mpId) {
      setMarkdown(null);
      setChecked(true);
      return;
    }

    let cancelled = false;
    setChecked(false);
    setMarkdown(null);
    setRequestError(null);
    setUsingCached(false);
    setIdentityCheck({ status: 'ok' });

    fetchWikiMarkdown(mpId)
      .then((result) => {
        if (cancelled) return;
        if (result.kind === 'ok') {
          const check = checkWikiIdentity(mpId, result.meta ?? null);
          setIdentityCheck(check);
          setMarkdown(check.status === 'identity_mismatch' ? null : result.markdown);
        } else if (result.kind === 'cached') {
          setMarkdown(result.markdown);
          setUsingCached(true);
          setRequestError(result.error ?? null);
        } else if (result.kind === 'not_found') {
          setMarkdown(null);
        } else {
          setMarkdown(null);
          setRequestError(result.error ?? new Error('wiki-unavailable'));
        }
        setChecked(true);
      })
      .catch((error) => {
        if (!cancelled) {
          setMarkdown(null);
          setRequestError(error);
          setChecked(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [mpId]);

  if (!checked) {
    return (
      <section
        className="mt-6 rounded-xl border border-white/10 bg-[#0d1117]/60 p-6 text-left animate-pulse"
        aria-busy="true"
        aria-label={LT.wiki.loading}
      >
        <div className="h-4 w-40 bg-white/10 rounded mb-4" />
        <div className="h-3 w-full bg-white/5 rounded mb-2" />
        <div className="h-3 w-[92%] bg-white/5 rounded" />
      </section>
    );
  }

  if (identityCheck.status === 'identity_mismatch') {
    return (
      <section
        className="mt-6 rounded-xl border border-red-500/40 bg-red-950/30 p-6 text-left"
        role="alert"
        aria-label={LT.wiki.identityMismatchTitle}
      >
        <div className="flex gap-3 items-start">
          <ShieldAlert className="w-8 h-8 text-red-400 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-base font-semibold text-red-200">
              {LT.wiki.identityMismatchTitle}
            </h2>
            <p className="text-sm text-red-300/80 mt-2 leading-relaxed">
              {LT.wiki.identityMismatchBody}
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (markdown === null) {
    return (
      <section
        className="mt-6 rounded-xl border border-dashed border-white/20 bg-[#0d1117]/50 p-6 text-left"
        aria-label="Wiki nėra"
      >
        <div className="flex gap-3 items-start">
          <FileQuestion className="w-8 h-8 text-slate-500 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-base font-semibold text-slate-200">{LT.wiki.missingTitle}</h2>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              {LT.wiki.missingBody}
            </p>
            <NavLink
              to="/dashboard/methodology"
              className="inline-block mt-3 text-sm text-cyan-400 hover:underline"
            >
              {LT.wiki.methodologyLink}
            </NavLink>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className="mt-6 rounded-xl border border-white/10 bg-[#0d1117]/80 p-6 text-left print:border print:border-foreground/20"
      aria-label={LT.wiki.reportTitle}
    >
      <h2 className="mb-4 text-lg font-semibold text-white">{LT.wiki.reportTitle}</h2>
      {identityCheck.status === 'stale' && (
        <div
          className="mb-4 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-200"
          role="status"
        >
          <Clock className="w-4 h-4 shrink-0" />
          {identityCheck.reason}
        </div>
      )}
      {usingCached && (
        <ProblemDetailsNotice error={requestError} className="mb-4 text-sm" />
      )}
      <div className="max-w-none text-sm text-slate-300 [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-slate-100 [&_h2:first-child]:mt-0 [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1 [&_a]:text-cyan-400 [&_a]:underline [&_strong]:text-slate-100 [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-white/20 [&_th]:bg-white/5 [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left [&_td]:border [&_td]:border-white/15 [&_td]:px-2 [&_td]:py-1.5">
        <ReactMarkdown>{markdown}</ReactMarkdown>
      </div>
    </section>
  );
}

export default WikiPanel;
