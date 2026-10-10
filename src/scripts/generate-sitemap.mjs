import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SITE } from '../config/constants.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const today = new Date().toISOString().slice(0, 10);

function urlXml(loc, lastmod) {
  return `  <url>\n    <loc>${SITE.origin}${loc}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}\n  </url>`;
}

export function generateSitemap() {
  const read = (name) => {
    const p = path.join(ROOT, `src/data/${name}.json`);
    return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : [];
  };

  const jobs = read('jobs');
  const results = read('results');
  const admits = read('admit-cards');
  const todayStr = today;

  const staticPaths = ['/', '/jobs/', '/results/', '/admit-cards/', '/calendar/', '/sources/', '/about/', '/privacy/'];
  const urls = [
    ...staticPaths.map((p) => urlXml(p, todayStr)),
    ...jobs.map((j) => urlXml(`/jobs/${j.slug}/`, j.datePosted || todayStr)),
    ...results.map((r) => urlXml(`/results/${r.slug}/`, r.releaseDate || todayStr)),
    ...admits.map((a) => urlXml(`/admit-cards/${a.slug}/`, a.releaseDate || todayStr)),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
  fs.writeFileSync(path.join(ROOT, 'public/sitemap.xml'), xml);
  console.log(`[sitemap] wrote ${urls.length} urls (jobs:${jobs.length} results:${results.length} admits:${admits.length})`);
  return urls.length;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateSitemap();
}
