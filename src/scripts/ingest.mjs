import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { OFFICIAL_SOURCES, MAX_PUBLISH_PER_RUN, MAX_PAGES_PER_DAY } from '../config/constants.mjs';
import { gateBatch } from '../lib/quality-gates.mjs';
import { parseRssItems, extractFromRssItem } from '../lib/extract.mjs';
import { enrichCandidates } from '../lib/details.mjs';
import { collectFromTableSource, collectFromResultsSource, collectFromAnchorSource } from '../lib/list-source.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DATA_PATH = path.join(ROOT, 'src/data/jobs.json');
const REJECT_LOG = path.join(ROOT, `data/rejected-${new Date().toISOString().slice(0, 10)}.log`);

function loadJobs() {
  if (!fs.existsSync(DATA_PATH)) return [];
  return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
}

function saveJobs(jobs) {
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(jobs, null, 2));
}

function logRejections(rejected) {
  if (rejected.length === 0) return;
  fs.mkdirSync(path.dirname(REJECT_LOG), { recursive: true });
  const lines = rejected.map(({ job, result }) =>
    JSON.stringify({
      at: new Date().toISOString(),
      title: job.title,
      sourceUrl: job.sourceUrl,
      score: result.score,
      failures: result.failures,
      warnings: result.warnings,
    })
  );
  fs.appendFileSync(REJECT_LOG, lines.join('\n') + '\n');
}

async function fetchWithTimeout(url, ms = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        accept: 'application/rss+xml,application/xml,text/xml,*/*',
      },
      redirect: 'follow',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

async function collectCandidates() {
  const candidates = [];
  for (const source of OFFICIAL_SOURCES) {
    try {
      if (source.type === 'table') {
        candidates.push(...(await collectFromTableSource(source, source.limit || 40)));
        continue;
      }
      if (source.type === 'results-table') {
        candidates.push(...(await collectFromResultsSource(source, source.limit || 500)));
        continue;
      }
      if (source.type === 'anchor-list') {
        candidates.push(...(await collectFromAnchorSource(source, source.limit || 300)));
        continue;
      }
      if (source.type !== 'rss') continue;
      const xml = await fetchWithTimeout(source.url);
      const items = parseRssItems(xml);
      for (const item of items) {
        const job = extractFromRssItem(item);
        if (job) {
          job.sourceId = source.id;
          candidates.push(job);
        }
      }
      console.log(`[ingest] ${source.id}: ${items.length} items -> ${candidates.filter((c) => c.sourceId === source.id).length} candidates`);
    } catch (err) {
      console.error(`[ingest] ${source.id} failed: ${err.message}`);
    }
  }
  return candidates;
}

async function main() {
  console.log('[ingest] start — official sources only, Google News RSS is denylisted by design');
  const existing = loadJobs();
  const all = await collectCandidates();
  const candidates = all.filter((c) => c.kind === 'job');
  await enrichCandidates(candidates, { max: MAX_PAGES_PER_DAY, prefix: '[ingest]' });
  const { accepted, rejected } = gateBatch(candidates, existing);

  const capped = accepted.slice(0, MAX_PUBLISH_PER_RUN);
  if (capped.length < accepted.length) {
    console.log(`[ingest] cap hit: publishing ${capped.length}/${accepted.length} accepted (rest deferred to next run)`);
  }

  const merged = [...existing, ...capped];
  saveJobs(merged);
  logRejections(rejected);

  console.log(
    `[ingest] done — candidates:${candidates.length} accepted:${capped.length} rejected:${rejected.length} total:${merged.length}`
  );
  if (rejected.length > 0) {
    console.log(`[ingest] rejection reasons written to ${path.relative(ROOT, REJECT_LOG)}`);
  }
}

main().catch((err) => {
  console.error('[ingest] fatal:', err);
  process.exit(1);
});
