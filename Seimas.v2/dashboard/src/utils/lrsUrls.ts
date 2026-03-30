/**
 * Public LRS member page (asmens_id = seimas_mp_id from API when available).
 */
export function buildLrsMpProfileUrl(seimasId?: string | number | null): string | null {
  if (seimasId == null || seimasId === '') return null;
  const id = String(seimasId).trim();
  if (!id || id === '0') return null;
  return `https://www.lrs.lt/sip/portal.show?p_r=65317&p_k=1&p_a=seimo_narys&p_asm_id=${encodeURIComponent(id)}`;
}
