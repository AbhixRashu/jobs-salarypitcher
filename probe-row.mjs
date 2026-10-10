const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0.0.0 Safari/537.36';
const t = await (await fetch('https://rpsc.rajasthan.gov.in/advertisements', { headers: { 'user-agent': ua } })).text();

const rows = [...t.matchAll(/<tr[\s\S]{0,4000}?<\/tr>/gi)].map((m) => m[0]);
console.log('rows', rows.length);
let shown = 0;
for (const row of rows) {
  if (!/\.pdf/i.test(row)) continue;
  if (!/recruit|vacanc|advertisement|posts|teacher|assistant|officer|engineer|clerk/i.test(row)) continue;
  const clean = row.replace(/\s+/g, ' ').slice(0, 900);
  console.log('\n--- ROW ---');
  console.log(clean);
  shown++;
  if (shown >= 4) break;
}
