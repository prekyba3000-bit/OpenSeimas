import React from 'react';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './Button';

type Props = {
  className?: string;
};

/** Copies a citable blurb for journalists (dataset + date + URL hash). */
export function CitationCopyButton({ className }: Props) {
  const [done, setDone] = React.useState(false);

  const buildCitation = () => {
    const url = typeof window !== 'undefined' ? window.location.href.split('#')[0] + window.location.hash : '';
    const date = new Date().toISOString().slice(0, 10);
    return `OpenSeimas / Atviras Seimas — agreguoti Seimo duomenys ir forensinė analizė. Pasiekta: ${date}. URL: ${url}`;
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(buildCitation());
      setDone(true);
      toast.success('Citata nukopijuota į iškarpinę');
      setTimeout(() => setDone(false), 2000);
    } catch {
      toast.error('Nepavyko nukopijuoti');
    }
  };

  return (
    <Button type="button" variant="secondary" size="sm" className={className} onClick={copy}>
      {done ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
      Kopijuoti citatą
    </Button>
  );
}
