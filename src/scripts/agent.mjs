import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { OFFICIAL_SOURCES, MAX_PUBLISH_PER_RUN, MAX_PAGES_PER_DAY, SITE } from '../config/constants.mjs';
import { gateBatch } from '../lib/quality-gates.mjs';
import { parseRssItems, extractFromRssItem } from '../lib/extract.mjs';
import { enrichCandidates } from '../lib/details.mjs';
import { terminateOcrWorker, ocrStats } from '../lib/ocr.mjs';
import { collectFromTableSource } from '../lib/list-source.mjs';
import { generateSitemap } from './generate-sitemap.mjs';
import { pingGoogleIndex } from './index-ping.mjs';
import { pingIndexNow } from './indexnow.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DATA = {
  job: path.join(ROOT, 'src/data/jobs.json'),
  result: path.join(ROOT, 'src/data/results.json'),
  admit: path.join(ROOT, 'src/data/admit-cards.json'),
};
const REJECT_LOG = path.join(ROOT, `data/rejected-${new Date().toISOString().slice(0, 10)}.log`);

function loadAll() {
  const out = {};
  for (const [kind, p] of Object.entries(DATA)) {
    out[kind] = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : [];
  }
  return out;
}

function saveAll(store) {
  for (const [kind, p] of Object.entries(DATA)) {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify(store[kind], null, 2));
  }
}

function logRejections(rejected) {
  if (rejected.length === 0) return;
  fs.mkdirSync(path.dirname(REJECT_LOG), { recursive: true });
  const lines = rejected.map(({ job, result }) =>
    JSON.stringify({
      at: new Date().toISOString(),
      kind: job.kind,
      title: job.title,
      sourceUrl: job.sourceUrl,
      score: result.score,
      failures: result.failures,
    })
  );
  fs.appendFileSync(REJECT_LOG, lines.join('\n') + '\n');
}

async function fetchRss(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
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
      if (source.type === 'rss') {
        const xml = await fetchRss(source.url);
        const items = parseRssItems(xml);
        let hits = 0;
        for (const item of items) {
          const rec = extractFromRssItem(item);
          if (rec) {
            rec.sourceId = source.id;
            candidates.push(rec);
            hits++;
          }
        }
        console.log(`[agent] ${source.id}: ${items.length} items -> ${hits} candidates`);
      } else if (source.type === 'table') {
        const recs = await collectFromTableSource(source);
        candidates.push(...recs);
      }
    } catch (err) {
      console.error(`[agent] ${source.id} failed: ${err.message}`);
    }
  }
  return candidates;
}

function sweepExpiry(store) {
  const today = new Date().toISOString().slice(0, 10);
  const cutoff = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const before = store.job.length;
  store.job = store.job.filter((j) => !(j.lastDate && j.lastDate < cutoff));
  const removed = before - store.job.length;
  if (removed > 0) console.log(`[agent] expiry sweep: removed ${removed} jobs closed >30 days`);
}

async function main() {
  console.log('[agent] start — jobs + results + admit-cards, official sources only');
  const store = loadAll();
  const existingAll = [...store.job, ...store.result, ...store.admit];

  let candidates = await collectCandidates();
  const freshCutoff = new Date(Date.now() - 150 * 86400000).toISOString().slice(0, 10);
  const beforeFilter = candidates.length;
  candidates = candidates.filter((c) => !(c.kind === 'job' && c.datePosted && c.datePosted < freshCutoff));
  if (beforeFilter !== candidates.length) {
    console.log(`[agent] dropped ${beforeFilter - candidates.length} jobs older than 150 days (closed, OCR budget saver)`);
  }

  await enrichCandidates(candidates, { max: MAX_PAGES_PER_DAY, prefix: '[agent]' });
  const { accepted, rejected } = gateBatch(candidates, existingAll);

  const capped = accepted.slice(0, MAX_PUBLISH_PER_RUN);
  const newUrls = [];

  for (const rec of capped) {
    store[rec.kind].push(rec);
    if (rec.kind === 'job') newUrls.push(`${SITE.origin}/jobs/${rec.slug}/`);
    else if (rec.kind === 'result') newUrls.push(`${SITE.origin}/results/${rec.slug}/`);
    else newUrls.push(`${SITE.origin}/admit-cards/${rec.slug}/`);
  }

  sweepExpiry(store);
  saveAll(store);
  logRejections(rejected);
  generateSitemap();

  console.log(
    `[agent] published:${capped.length} (jobs:${capped.filter((c) => c.kind === 'job').length} results:${capped.filter((c) => c.kind === 'result').length} admits:${capped.filter((c) => c.kind === 'admit').length}) rejected:${rejected.length}`
  );

  if (newUrls.length > 0) {
    await pingIndexNow(newUrls);
    await pingGoogleIndex(newUrls, { type: 'URL_UPDATED', limit: 50 });
  } else {
    console.log('[agent] no new urls to index');
  }

  await terminateOcrWorker();
  console.log(`[agent] ocr: ${JSON.stringify(ocrStats())}`);
  console.log('[agent] done');
}

main().catch((err) => {
  console.error('[agent] fatal:', err);
  process.exit(1);
});
