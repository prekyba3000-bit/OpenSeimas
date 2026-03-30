import React from 'react';
import { Copy, Check, Link } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './Button';

type Props = {
  className?: string;
};

/** Copies a citable blurb or just the URL for journalists. */
export function CitationCopyButton({ className }: Props) {
  const [doneCitation, setDoneCitation] = React.useState(false);
  const [doneLink, setDoneLink] = React.useState(false);

  const getUrl = () => {
    return typeof window !== 'undefined' ? window.location.href.split('#')[0] + window.location.hash : '';
  };

  const buildCitation = () => {
    const url = getUrl();
    const date = new Date().toISOString().slice(0, 10);
    return `OpenSeimas / Atviras Seimas — agreguoti Seimo duomenys ir forensinė analizė. Pasiekta: ${date}. URL: ${url}`;
  };

  const copyCitation = async () => {
    try {
      await navigator.clipboard.writeText(buildCitation());
      setDoneCitation(true);
      toast.success('Citata nukopijuota į iškarpinę');
      setTimeout(() => setDoneCitation(false), 2000);
    } catch {
      toast.error('Nepavyko nukopijuoti');
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(getUrl());
      setDoneLink(true);
      toast.success('Nuoroda nukopijuota');
      setTimeout(() => setDoneLink(false), 2000);
    } catch {
      toast.error('Nepavyko nukopijuoti');
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Button type="button" variant="secondary" size="sm" onClick={copyCitation}>
        {doneCitation ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
        Kopijuoti citatą
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={copyLink} title="Kopijuoti tik nuorodą">
        {doneLink ? <Check className="w-4 h-4" /> : <Link className="w-4 h-4" />}
        <span className="sr-only sm:not-sr-only sm:ml-2">Kopijuoti nuorodą</span>
      </Button>
    </div>
  );
}
