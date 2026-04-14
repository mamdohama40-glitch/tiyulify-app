const fs = require('fs');
let c = fs.readFileSync('app/page.tsx', 'utf8');

// הוסף state לכתובת
c = c.replace(
  "const [searchMarkerName, setSearchMarkerName] = useState('');",
  "const [searchMarkerName, setSearchMarkerName] = useState('');\n  const [searchMarkerAddr, setSearchMarkerAddr] = useState('');"
);

// שמור כתובת בעת בחירת תוצאה
c = c.replace(
  "setSearchMarkerName(result.name || result.display_name.split(\",\")[0]);",
  "setSearchMarkerName(result.name || result.display_name.split(\",\")[0]);\n    setSearchMarkerAddr(result.display_name.split(',').slice(1,4).join(', '));"
);

// נקה כתובת ב-clearSearch
c = c.replace(
  "setSearchMarkerName(''); };",
  "setSearchMarkerName(''); setSearchMarkerAddr(''); };"
);

// החלף קואורדינטות בכתובת בחלון
c = c.replace(
  "<p className=\"text-[11px] text-gray-500 px-1 mb-2\">{searchMarker ? searchMarker[0].toFixed(4)+', '+searchMarker[1].toFixed(4) : ''}</p>",
  "<p className=\"text-[11px] text-gray-500 px-1 mb-2 line-clamp-2\">{searchMarkerAddr || (searchMarker ? searchMarker[0].toFixed(4)+', '+searchMarker[1].toFixed(4) : '')}</p>"
);

fs.writeFileSync('app/page.tsx', c, 'utf8');
console.log('done');
