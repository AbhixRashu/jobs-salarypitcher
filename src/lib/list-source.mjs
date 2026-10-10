import { slugify, detectKind } from './extract.mjs';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const SKIP_RE = /corrigendum|withdrawn|answer key|press note|merit list|disqualified|provisional list|result preamble|cutoff|interview|call letter|marks|date sheet|syllabus of|scheme of examination|exam centre|exam center|staff corner|annual report/i;

const JOB_HINT_RE = /advt\.?\s*no|advertisement|recruitment|vacanc|posts?\b|engagement|online form|apply|भर्ती|रिक्ति|विज्ञापन/i;

const RESULT_HINT_RE = /result|scorecard|cut[\s-]?off|merit|परिणाम/i;
const ADMIT_HINT_RE = /admit card|hall ticket|call letter|exam city|प्रवेश पत्र/i;

const DATE_CELL = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/;

function stripTags(html) {
  return String(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#?\w+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseTableList(html, baseUrl) {
  const rows = [];
  const rowRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  for (const match of String(html).matchAll(rowRe)) {
    const inner = match[1];
    const link = inner.match(/<a\b[^>]*href\s*=\s*["']([^"']+)["']/i);
    if (!link) continue;
    const cells = [...inner.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)]
      .map((c) => stripTags(c[1]))
      .filter((c) => c.length > 0);
    if (cells.length < 2) continue;
    let href = link[1].trim();
    if (!href || href.startsWith('#') || /^javascript:/i.test(href)) continue;
    try {
      href = new URL(href, baseUrl).href;
    } catch {
      continue;
    }
    rows.push({ href, cells });
  }
  return rows;
}

function dateFrom(cells) {
  for (const cell of cells) {
    const m = cell.trim().match(DATE_CELL);
    if (!m) continue;
    const [, d, mo, y] = m;
    const dd = Number(d);
    const mm = Number(mo);
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) continue;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return null;
}

function fitTitle(parts, max = 115) {
  const joined = parts.filter(Boolean).join(' — ').replace(/\s{2,}/g, ' ').trim();
  if (joined.length <= max) return joined;
  const cut = joined.slice(0, max);
  const space = cut.lastIndexOf(' ');
  return `${cut.slice(0, space > 40 ? space : max).trim()}…`;
}

export function candidatesFromTableRows(rows, source) {
  const out = [];
  for (const row of rows) {
    const text = row.cells.join(' ');
    if (SKIP_RE.test(text)) continue;

    const kind = ADMIT_HINT_RE.test(text)
      ? 'admit'
      : RESULT_HINT_RE.test(text)
        ? 'result'
        : JOB_HINT_RE.test(text)
          ? 'job'
          : detectKind(text);
    if (!kind) continue;
    if (kind === 'job' && !JOB_HINT_RE.test(text)) continue;

    const datePosted = dateFrom(row.cells);
    const postCell = [...row.cells]
      .filter((c) => !DATE_CELL.test(c.trim()) && !/^\d+$/.test(c.trim()))
      .sort((a, b) => b.replace(/[^A-Za-z]/g, '').length - a.replace(/[^A-Za-z]/g, '').length);
    if (postCell.length === 0) continue;

    const primary = postCell[0];
    const secondary = postCell.find((c) => c !== primary && c.length > 10);
    const title = kind === 'job' ? fitTitle([primary, secondary]) : fitTitle([primary]);
    if (title.replace(/[^A-Za-z]/g, '').length < 12) continue;

    const category = source.category || 'state';
    const base = {
      slug: slugify(`${source.organization || source.id}-${title}`),
      title: title.slice(0, 118),
      shortTitle: primary.slice(0, 70),
      organization: source.organization || source.id,
      orgUrl: source.orgUrl || source.url,
      category,
      datePosted,
      sourceUrl: row.href,
      sourceId: source.id,
      kind,
    };

    if (kind === 'job') {
      const closed = row.cells.some((c) => /advertisement\s+closed/i.test(c));
      out.push({
        ...base,
        applyUrl: source.applyUrl || source.orgUrl || source.url,
        notificationPdf: /\.pdf(\?|#|$)/i.test(row.href) ? row.href : null,
        extractionLevel: 'list-row',
        ...(closed && datePosted ? { lastDate: datePosted } : {}),
      });
    } else if (kind === 'result') {
      out.push({
        ...base,
        releaseDate: datePosted || new Date().toISOString().slice(0, 10),
        datePrecision: datePosted ? 'from-source' : 'ingest-date',
        status: 'declared',
        resultUrl: row.href,
      });
    } else {
      out.push({
        ...base,
        releaseDate: datePosted || new Date().toISOString().slice(0, 10),
        datePrecision: datePosted ? 'from-source' : 'ingest-date',
        downloadUrl: row.href,
      });
    }
  }
  return out;
}

export async function fetchHtml(url, ms = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml,*/*;q=0.8' },
      redirect: 'follow',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

export async function collectFromTableSource(source, limit = 40) {
  const html = await fetchHtml(source.url);
  const rows = parseTableList(html, source.url);
  const candidates = candidatesFromTableRows(rows, source).slice(0, limit);
  console.log(`[source] ${source.id}: ${rows.length} rows -> ${candidates.length} candidates`);
  return candidates;
}

function isoFromDdMmYyyy(value) {
  const m = String(value).trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  const dd = Number(d);
  const mm = Number(mo);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

export function parseResultsTable(html, baseUrl, source) {
  const out = [];
  const rowRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  for (const match of String(html).matchAll(rowRe)) {
    const inner = match[1];
    const link = inner.match(/<a\b[^>]*href\s*=\s*["']([^"']+)["']/i);
    if (!link) continue;
    const cells = [...inner.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((c) => stripTags(c[1]));
    if (cells.length < 3) continue;
    const dateCell = cells.find((c) => isoFromDdMmYyyy(c));
    if (!dateCell) continue;
    let href = link[1].trim();
    if (!href || href.startsWith('#') || /^javascript:/i.test(href)) continue;
    try {
      href = new URL(href, baseUrl).href;
    } catch {
      continue;
    }
    const textCells = cells.filter((c) => c.length > 8 && !isoFromDdMmYyyy(c) && !/^\d+$/.test(c.trim()));
    if (textCells.length === 0) continue;
    const exam = textCells[0];
    const desc = textCells.find((c) => c !== exam) || exam;
    const title = desc.length > 20 ? fitTitle([desc]) : fitTitle([exam, desc]);
    if (title.replace(/[^A-Za-z]/g, '').length < 12) continue;
    const releaseDate = isoFromDdMmYyyy(dateCell);
    const slug = slugify(`${source.organization || source.id}-${exam}-${releaseDate}-${title}`);
    const existing = out.find((c) => c.slug === slug);
    if (existing) {
      // Same exam + same description released on the same day — usually
      // separate PDFs for different subjects/papers. Merge as extra official links.
      if (Array.isArray(existing.resultUrls) && !existing.resultUrls.includes(href)) {
        existing.resultUrls.push(href);
      } else if (!existing.resultUrls) {
        existing.resultUrls = [existing.resultUrl, href];
      }
      continue;
    }
    out.push({
      slug,
      title: title.slice(0, 118),
      shortTitle: exam.slice(0, 70),
      organization: source.organization || source.id,
      orgUrl: source.orgUrl || source.url,
      category: source.category || 'state',
      kind: 'result',
      releaseDate,
      datePrecision: 'from-source',
      status: 'declared',
      resultUrl: href,
      sourceUrl: source.url,
      sourceId: source.id,
      extractionLevel: 'list-row',
    });
  }
  return out;
}

export async function collectFromResultsSource(source, limit = 500) {
  const html = await fetchHtml(source.url, 60000);
  const candidates = parseResultsTable(html, source.url, source).slice(0, limit);
  console.log(`[source] ${source.id}: results -> ${candidates.length} candidates`);
  return candidates;
}

const FILE_DATE_RE = /(\d{1,2})[_-](\d{1,2})[_-](\d{4})/;

function isoFromFileName(url) {
  const m = String(url).match(FILE_DATE_RE);
  if (!m) return null;
  const [, d, mo, y] = m;
  const dd = Number(d);
  const mm = Number(mo);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

export function parseAnchorList(html, baseUrl, source) {
  const out = [];
  const anchorRe = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of String(html).matchAll(anchorRe)) {
    let href = match[1].trim();
    const text = stripTags(match[2]);
    if (!href || href.startsWith('#') || /^javascript:/i.test(href)) continue;
    if (!/\.pdf(\?|#|$)/i.test(href)) continue;
    if (text.length < 15) continue;
    try {
      href = new URL(href, baseUrl).href;
    } catch {
      continue;
    }
    if (SKIP_RE.test(text)) continue;
    const kind = ADMIT_HINT_RE.test(text) ? 'admit' : RESULT_HINT_RE.test(text) ? 'result' : 'job';
    if (kind !== 'job' && !RESULT_HINT_RE.test(text) && !ADMIT_HINT_RE.test(text)) continue;
    const title = fitTitle([text]);
    if (title.replace(/[^A-Za-z]/g, '').length < 12) continue;
    const datePosted = isoFromFileName(href);
    const base = {
      slug: slugify(`${source.organization || source.id}-${title}`),
      title: title.slice(0, 118),
      shortTitle: text.slice(0, 70),
      organization: source.organization || source.id,
      orgUrl: source.orgUrl || source.url,
      category: source.category || 'state',
      datePosted,
      sourceUrl: href,
      sourceId: source.id,
      kind,
      extractionLevel: 'list-row',
    };
    if (kind === 'job') {
      out.push({
        ...base,
        applyUrl: source.applyUrl || source.orgUrl || source.url,
        notificationPdf: href,
      });
    } else if (kind === 'result') {
      out.push({
        ...base,
        releaseDate: datePosted || new Date().toISOString().slice(0, 10),
        datePrecision: datePosted ? 'from-source' : 'ingest-date',
        status: 'declared',
        resultUrl: href,
      });
    } else {
      out.push({
        ...base,
        releaseDate: datePosted || new Date().toISOString().slice(0, 10),
        datePrecision: datePosted ? 'from-source' : 'ingest-date',
        downloadUrl: href,
      });
    }
  }
  return out;
}

export async function collectFromAnchorSource(source, limit = 300) {
  const html = await fetchHtml(source.url, 30000);
  const candidates = parseAnchorList(html, source.url, source).slice(0, limit);
  console.log(`[source] ${source.id}: anchors -> ${candidates.length} candidates`);
  return candidates;
}
