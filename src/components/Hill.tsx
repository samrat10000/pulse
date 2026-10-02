import { useMemo } from 'react';
import { rng } from '@/lib/rng';

interface HillOpts { seed?: number; w?: number; h?: number; peak?: number; base?: number; blades?: number; poppies?: number; daisies?: number; id?: string }

/** The signature grassy hill with poppies and daisies, ported from the prototype's hill(). Procedural and seeded. */
export function hill({ seed = 3, w = 1200, h = 520, peak = 300, base = 600, blades = 700, poppies = 70, daisies = 60, id = 'hl' }: HillOpts = {}) {
  const r = rng(seed), x0 = -60, x2 = w + 60, x1 = w / 2, cy = 2 * peak - base;
  const pt = (t: number) => { const a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t; return [a * x0 + b * x1 + c * x2, a * base + b * cy + c * base]; };
  const d = `M${x0} ${base} Q${x1} ${cy} ${x2} ${base} L${x2} ${h + 80} L${x0} ${h + 80}Z`;
  const greens = ['#3F7A24', '#4E8B2B', '#5E9C33', '#6FAD3D', '#2F6619', '#82BC4A'];
  let g = '';
  for (let i = 0; i < blades; i++) {
    const [x, y] = pt(r()); const dy = r() * r() * 70; const len = 6 + r() * 15 * (1 + dy / 45); const lean = (r() - .5) * 10;
    g += `<path d="M${(x + (r() - .5) * 4).toFixed(1)} ${(y + dy + 2).toFixed(1)}q${(lean / 2).toFixed(1)} ${(-len * .6).toFixed(1)} ${lean.toFixed(1)} ${(-len).toFixed(1)}" stroke="${greens[i % 6]}" stroke-width="${(1 + r() * 1.3).toFixed(2)}"/>`;
  }
  const fl: [number, string][] = [];
  for (let i = 0; i < daisies; i++) {
    const [x, y] = pt(.05 + r() * .9); const dy = r() * 150, s = .8 + dy / 120, sl = 6 + r() * 8, Y = y + dy;
    fl.push([Y, `<g transform="translate(${(x + (r() - .5) * 20).toFixed(1)} ${Y.toFixed(1)}) scale(${s.toFixed(2)})"><path d="M0 0V${(-sl).toFixed(1)}" stroke="#5E9233" stroke-width="1"/><circle cy="${(-sl).toFixed(1)}" r="2.4" fill="#FBFBF4"/><circle cy="${(-sl).toFixed(1)}" r=".9" fill="#E8C33A"/></g>`]);
  }
  for (let i = 0; i < poppies; i++) {
    const [x, y] = pt(.04 + r() * .92); const dy = r() < .25 ? r() * 8 : r() * 170; const Y = y + dy; const s = .7 + dy / 110; const sl = 10 + r() * 26; const ln = (r() - .5) * 8;
    fl.push([Y, `<g transform="translate(${(x + (r() - .5) * 16).toFixed(1)} ${Y.toFixed(1)}) scale(${s.toFixed(2)})"><path d="M0 0q${(ln / 2).toFixed(1)} ${(-sl / 2).toFixed(1)} ${(ln * .6).toFixed(1)} ${(-sl).toFixed(1)}" stroke="#4C7F2A" stroke-width="1.3" fill="none"/><g transform="translate(${(ln * .6).toFixed(1)} ${(-sl).toFixed(1)})"><ellipse rx="5.2" ry="4.3" fill="#D6261C"/><ellipse rx="3.7" ry="2.4" cy="-1.5" fill="#EF4630"/><circle r="1.2" cy=".7" fill="#2A0B08"/></g></g>`]);
  }
  fl.sort((a, b) => a[0] - b[0]);
  return `<svg class="hill-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
<defs>
<linearGradient id="${id}g" x1="0" y1="${peak}" x2="0" y2="${h}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#6DAA3B"/><stop offset=".45" stop-color="#4C8A2A"/><stop offset="1" stop-color="#2C5E1A"/></linearGradient>
<radialGradient id="${id}r" cx="${w * .42}" cy="${peak + 30}" r="${w * .42}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#CDEB8E" stop-opacity=".45"/><stop offset="1" stop-color="#CDEB8E" stop-opacity="0"/></radialGradient>
<clipPath id="${id}c"><path d="${d}"/></clipPath>
<filter id="${id}n" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9 .22" numOctaves="2" seed="${seed}"/><feColorMatrix values="0 0 0 0 .1  0 0 0 0 .26  0 0 0 0 .05  0 0 0 -1.6 1.05"/></filter>
</defs>
<path d="${d}" fill="url(#${id}g)"/><path d="${d}" fill="url(#${id}r)"/>
<rect x="0" y="${peak - 20}" width="${w}" height="${h - peak + 40}" filter="url(#${id}n)" clip-path="url(#${id}c)" opacity=".55"/>
<g fill="none" stroke-linecap="round">${g}</g>${fl.map(f => f[1]).join('')}</svg>`;
}

export function Hill(props: HillOpts) {
  const html = useMemo(() => hill(props), [props.seed, props.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return <span style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: html }} />;
}
