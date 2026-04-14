const fs = require('fs');
let c = fs.readFileSync('app/page.tsx', 'utf8');

// fallback לאנגלית אם ערבית/רוסית קצרה
c = c.replace(
  `async function fetchWikiSummary(name: string, lang: string): Promise<string> {
  try {
    const l = lang==='he'?'he':lang==='ar'?'ar':lang==='ru'?'ru':'en';
    const r = await fetch(\`https://\${l}.wikipedia.org/api/rest_v1/page/summary/\${encodeURIComponent(name)}\`);
    if (!r.ok) return '';
    const d = await r.json();
    return d.extract || '';
  } catch { return ''; }
}`,
  `async function fetchWikiSummary(name: string, lang: string): Promise<string> {
  try {
    const l = lang==='he'?'he':lang==='ar'?'ar':lang==='ru'?'ru':'en';
    const r = await fetch(\`https://\${l}.wikipedia.org/api/rest_v1/page/summary/\${encodeURIComponent(name)}\`);
    if (r.ok) { const d = await r.json(); if (d.extract && d.extract.length > 80) return d.extract; }
    if (l !== 'en') { const r2 = await fetch(\`https://en.wikipedia.org/api/rest_v1/page/summary/\${encodeURIComponent(name)}\`); if (r2.ok) { const d2 = await r2.json(); return d2.extract || ''; } }
    return '';
  } catch { return ''; }
}`
);

// הסר line-clamp לגמרי
c = c.replace(/line-clamp-\d+/g, '');

fs.writeFileSync('app/page.tsx', c, 'utf8');
console.log('done');
