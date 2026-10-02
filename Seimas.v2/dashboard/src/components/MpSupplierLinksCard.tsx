import React, { useEffect, useState } from 'react';
import { api, MpSupplierLinks } from '../services/api';

interface MpSupplierLinksCardProps {
  mpId: string;
}

export const MpSupplierLinksCard: React.FC<MpSupplierLinksCardProps> = ({ mpId }) => {
  const [data, setData] = useState<MpSupplierLinks | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(false);
    api
      .getMpSupplierLinks(mpId)
      .then((res) => {
        if (isMounted) {
          setData(res);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [mpId]);

  if (loading) {
    return (
      <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-xl animate-pulse">
        <div className="h-4 bg-slate-800 rounded w-1/3 mb-4"></div>
        <div className="h-12 bg-slate-800/50 rounded mb-2"></div>
      </div>
    );
  }

  if (error || !data || data.items.length === 0) {
    return (
      <div className="p-6 bg-slate-900/40 border border-slate-800/80 rounded-xl text-slate-400">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
            Verslo Ryšiai Viešuosiuose Pirkimuose (VTEK × CVP IS)
          </h3>
          <span className="text-xs px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
            Nėra Sutapčių
          </span>
        </div>
        <p className="text-xs text-slate-500">
          Deklaruotos įmonės ar pareigos neturi tiesioginių laimėtų valstybinių pirkimų sutarčių įrašuose.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-900/80 border border-amber-500/30 rounded-xl shadow-lg relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none"></div>

      <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wide flex items-center gap-2">
            <span>Tiesioginiai Verslo Ryšiai ir Pirkimai</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Deklaruotų komercinių pareigų (VTEK) ir laimėtų valstybės sutarčių (CVP IS) kryžminė analizė
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-950/80 text-amber-300 border border-amber-700/60">
          {data.items.length} Sutapimai
        </span>
      </div>

      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
        {data.items.map((item, idx) => (
          <div
            key={idx}
            className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-lg hover:border-amber-500/40 transition-colors"
          >
            <div className="flex justify-between items-start mb-1">
              <div>
                <div className="text-sm font-semibold text-slate-200">{item.org_name}</div>
                <div className="text-xs text-slate-400">
                  Vaidmuo: <span className="text-amber-300/90">{item.mp_role}</span> ({item.declarant_relation ? item.declarant_relation : 'ryšys nenurodytas'})
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-amber-400">
                  {item.value_amount !== null
                    ? `€${item.value_amount.toLocaleString('lt-LT', { minimumFractionDigits: 2 })}`
                    : 'Suma nenurodyta'}
                </div>
                {item.award_date && (
                  <div className="text-[11px] text-slate-500">{item.award_date}</div>
                )}
              </div>
            </div>

            <div className="text-xs text-slate-300 mt-2 font-medium bg-slate-900/60 p-2 rounded border border-slate-800/80">
              <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider mb-0.5">
                Pirkimo Objektas & Pirkėjas
              </span>
              <div>{item.tender_title}</div>
              <div className="text-slate-400 text-[11px] mt-0.5">Pirkėjas: {item.buyer_name}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
