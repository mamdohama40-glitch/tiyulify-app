const fs = require('fs');
let c = fs.readFileSync('app/page.tsx', 'utf8');
c = c.replace('undecided:"לא החלטתי, הראה הכל"', 'undecided:"לא החלטתי"');
c = c.replace('undecided:"Show me everything"', 'undecided:"Undecided"');
c = c.replace('undecided:"لم أقرر، أرني الكل"', 'undecided:"لم أقرر"');
c = c.replace('undecided:"Не решил, показать всё"', 'undecided:"Не решил"');
c = c.replace(
  'onClick={()=>{setCategoryFilter(\'all\');setActiveView(\'map\');}}',
  'onClick={()=>{setCategoryFilter(\'none\');setActiveView(\'map\');}}'
);
fs.writeFileSync('app/page.tsx', c, 'utf8');
console.log('done');
