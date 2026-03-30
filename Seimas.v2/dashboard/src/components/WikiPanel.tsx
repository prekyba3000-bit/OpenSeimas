import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router';
import ReactMarkdown from 'react-markdown';
import { FileQuestion } from 'lucide-react';

interface WikiPanelProps {
  mpId: string;
}

/**
 * Loads optional forensic wiki markdown from /public/wikis/{mpId}.md (built/deployed as /wikis/...).
 */
export function WikiPanel({ mpId }: WikiPanelProps) {
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!mpId) {
      setMarkdown(null);
      setChecked(true);
      return;
    }

    let cancelled = false;
    setChecked(false);
    setMarkdown(null);

    const url = `/wikis/${encodeURIComponent(mpId)}.md`;
    fetch(url, { method: 'GET' })
      .then((res) => {
        if (!res.ok) return null;
        return res.text();
      })
      .then((text) => {
        if (cancelled) return;
        setMarkdown(text && text.trim() ? text : null);
        setChecked(true);
      })
      .catch(() => {
        if (!cancelled) {
          setMarkdown(null);
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
        aria-label="Wiki kraunama"
      >
        <div className="h-4 w-40 bg-white/10 rounded mb-4" />
        <div className="h-3 w-full bg-white/5 rounded mb-2" />
        <div className="h-3 w-[92%] bg-white/5 rounded" />
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
            <h2 className="text-base font-semibold text-slate-200">Paskelbto wiki rinkinio nėra</h2>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              Rodomi rodikliai ir forensinė suvestinė vis tiek remiasi duomenų bazės ir API signalais. Jei byla bus
              sugeneruota ir įdėta į <code className="text-xs bg-white/10 px-1 rounded">/wikis/</code>, ji automatiškai
              atsiras čia.
            </p>
            <NavLink
              to="/dashboard/methodology"
              className="inline-block mt-3 text-sm text-cyan-400 hover:underline"
            >
              Kaip skaičiuojami rodikliai
            </NavLink>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className="mt-6 rounded-xl border border-white/10 bg-[#0d1117]/80 p-6 text-left print:border print:border-foreground/20"
      aria-label="Forensinė wiki ataskaita"
    >
      <h2 className="mb-4 text-lg font-semibold text-white">Forensinė wiki ataskaita</h2>
      <div className="max-w-none text-sm text-slate-300 [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-slate-100 [&_h2:first-child]:mt-0 [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1 [&_a]:text-cyan-400 [&_a]:underline [&_strong]:text-slate-100 [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-white/20 [&_th]:bg-white/5 [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left [&_td]:border [&_td]:border-white/15 [&_td]:px-2 [&_td]:py-1.5">
        <ReactMarkdown>{markdown}</ReactMarkdown>
      </div>
    </section>
  );
}

export default WikiPanel;
