import { useMemo } from 'react';
import { qrSvg } from '@/lib/qr';

/** real, scannable QR code rendered inline */
export function QR({ text, px = 180, fg, transparent }: { text: string; px?: number; fg?: string; transparent?: boolean }) {
  const html = useMemo(() => {
    const s = qrSvg(text, px, fg);
    return transparent ? s.replace('fill="#fff"/>', 'fill="none"/>') : s;
  }, [text, px, fg, transparent]);
  return <span style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: html }} />;
}
