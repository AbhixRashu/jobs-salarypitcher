import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateJob } from '../lib/quality-gates.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (n) => {
  const p = path.join(ROOT, `src/data/${n}.json`);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : [];
};
const jobs = read('jobs');
const results = read('results');
const admits = read('admit-cards');
const all = [...jobs, ...results, ...admits];

let failures = 0;
const today = new Date().toISOString().slice(0, 10);

for (const job of all) {
  const result = validateJob(
    job,
    all.filter((j) => j.slug !== job.slug)
  );
  const expired = job.kind === 'job' && job.lastDate && job.lastDate < today;
  const flag = result.pass ? (expired ? 'EXPIRED' : 'OK') : 'FAIL';
  if (!result.pass) failures++;
  console.log(
    `${flag.padEnd(8)} ${(job.kind || 'job').padEnd(7)} ${job.slug.padEnd(50)} score:${result.score} ${result.failures.join(',')}`
  );
}

console.log(`\n[audit] ${all.length} records (jobs:${jobs.length} results:${results.length} admits:${admits.length}), ${failures} failing gates`);
process.exit(failures > 0 ? 1 : 0);
