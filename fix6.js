const fs = require('fs');
let c = fs.readFileSync('app/page.tsx', 'utf8');

// הוסף פונקציה לשליפת ויקיפדיה לפני CompactPopup
const wikiFunc = `
async function fetchWikiSummary(name: string, lang: string): Promise<string> {
  try {
    const l = lang==='he'?'he':lang==='ar'?'ar':lang==='ru'?'ru':'en';
    const r = await fetch(\`https://\${l}.wikipedia.org/api/rest_v1/page/summary/\${encodeURIComponent(name)}\`);
    if (!r.ok) return '';
    const d = await r.json();
    return d.extract || '';
  } catch { return ''; }
}
`;

c = c.replace('// === Compact expandable popup ===', wikiFunc + '\n// === Compact expandable popup ===');

// הוסף state לויקיפדיה ב-CompactPopup
c = c.replace(
  'function CompactPopup({ item, pd, activeLang, labels, shareOnWhatsApp }: { item: any; pd: string|null; activeLang: string; labels: any; shareOnWhatsApp: (i:any)=>void }) {\n  const [expanded, setExpanded] = React.useState(false);',
  'function CompactPopup({ item, pd, activeLang, labels, shareOnWhatsApp }: { item: any; pd: string|null; activeLang: string; labels: any; shareOnWhatsApp: (i:any)=>void }) {\n  const [expanded, setExpanded] = React.useState(false);\n  const [wiki, setWiki] = React.useState(\'\');\n  React.useEffect(() => { fetchWikiSummary(item.name[activeLang]||item.name.he, activeLang).then(setWiki); }, [item.id, activeLang]);'
);

// הוסף טקסט ויקיפדיה אחרי התיאור
c = c.replace(
  '<p className="text-[12px] text-gray-600 leading-relaxed px-1 mb-2 line-clamp-2">\n        {item.description[activeLang]||item.description.he}\n      </p>',
  '<p className="text-[12px] text-gray-600 leading-relaxed px-1 mb-2 line-clamp-2">\n        {item.description[activeLang]||item.description.he}\n      </p>\n      {wiki && <p className="text-[11px] text-gray-500 leading-relaxed px-1 mb-2 line-clamp-3">{wiki}</p>}'
);

fs.writeFileSync('app/page.tsx', c, 'utf8');
console.log('done');
