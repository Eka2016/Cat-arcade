// Classic carved silhouettes in aged ivory and obsidian. No system chess font.
const PALETTES=[
  {body:'#e5d7bc',shade:'#ae9579',light:'#fff4d9',rim:'#473129',metal:'#b48a50'},
  {body:'#322330',shade:'#1c1521',light:'#8c6a75',rim:'#c29b62',metal:'#9d774c'},
];
const cache=new Map();
export function chessPieceMarkup(type,side=0){
  if(!['k','q','r','b','n','p'].includes(type))return '';
  const key=`${type}:${side===1?1:0}`;if(cache.has(key))return cache.get(key);
  const p=PALETTES[side===1?1:0];
  const stem=`<path fill="${p.body}" d="M18 28h12c-1 9 0 15 5 21H13c5-6 6-12 5-21Z"/><path fill="${p.light}" stroke="none" opacity=".42" d="M20 31h3c0 7-1 11-4 16h-3c2-5 4-10 4-16Z"/>`;
  const heads={
    p:`<circle cx="24" cy="19" r="7.5" fill="${p.body}"/><path d="M17 27h14l2 4H15Z" fill="${p.shade}"/><path d="M20 15q-3 3-1 6" fill="none" stroke="${p.light}" stroke-width="2"/>`,
    b:`<path fill="${p.body}" d="M24 6c-3 7-10 10-10 17 0 5 4 8 10 8s10-3 10-8c0-7-7-10-10-17Z"/><path d="m27 13-6 10" fill="none" stroke="${p.shade}" stroke-width="3"/><path fill="${p.metal}" d="M15 29h18v4H15Z"/>`,
    r:`<path fill="${p.body}" d="M12 10h6v7h4v-7h4v7h4v-7h6v17H12Z"/><path fill="${p.shade}" d="M14 27h20v5H14Z"/><path d="M16 21h16" stroke="${p.light}" stroke-opacity=".5" fill="none"/>`,
    k:`<path fill="${p.metal}" d="M21 4h6v5h5v5h-5v6h-6v-6h-5V9h5Z"/><path fill="${p.body}" d="M14 23q10-9 20 0l-4 9H18Z"/><path fill="${p.shade}" d="M16 30h16v4H16Z"/><path d="M19 24q5-4 10 0" stroke="${p.light}" fill="none"/>`,
    q:`<path fill="${p.body}" d="m11 15 8 6 5-11 5 11 8-6-5 17H16Z"/><circle cx="11" cy="13" r="3" fill="${p.metal}"/><circle cx="24" cy="8" r="3" fill="${p.metal}"/><circle cx="37" cy="13" r="3" fill="${p.metal}"/><path fill="${p.shade}" d="M15 30h18v4H15Z"/>`,
    n:`<path fill="${p.body}" d="M33 48H15c0-7 3-12 8-17l-8 4-6-5 6-12 5-5-1-7 8 5c9 2 13 9 13 17 0 8-5 13-7 20Z"/><path fill="${p.shade}" stroke="none" d="M29 16c9 7 9 17 3 29h-6c8-13 9-19 3-29Z"/><circle cx="24" cy="21" r="1.7" fill="${p.rim}" stroke="none"/><path d="m13 29 6-1" fill="none"/><path d="M25 14q6 3 8 8" stroke="${p.light}" stroke-opacity=".55" fill="none"/>`,
  };
  const base=`<path fill="${p.metal}" d="M14 45h20v4H14Z"/><path fill="${p.body}" d="M13 49h22l4 7H9Z"/><path fill="${p.shade}" d="M10 56h28q3 0 3 3v2H7v-2q0-3 3-3Z"/><path d="M13 53h22" stroke="${p.light}" stroke-opacity=".65" fill="none"/>`;
  const markup=`<svg class="chess-piece-art" data-piece-type="${type}" viewBox="0 0 48 64" width="48" height="64" aria-hidden="true" focusable="false"><ellipse cx="24" cy="61" rx="18" ry="2" fill="#100a15" opacity=".3"/><g stroke="${p.rim}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">${type==='n'?'':stem}${heads[type]}${base}</g></svg>`;
  cache.set(key,markup);return markup;
}
