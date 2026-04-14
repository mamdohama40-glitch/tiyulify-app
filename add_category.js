const fs = require('fs');
const newData = JSON.parse(fs.readFileSync('app/new_places.json', 'utf8'));
const existing = JSON.parse(fs.readFileSync('app/data.json', 'utf8'));
const combined = [...existing, ...newData];
fs.writeFileSync('app/data.json', JSON.stringify(combined, null, 2), 'utf8');
console.log('done, total:', combined.length);
