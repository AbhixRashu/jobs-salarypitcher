import { OFFICIAL_DOMAINS, DENIED_SOURCE_PATTERNS } from '../config/constants.mjs';
import { detailSectionCount } from './details.mjs';

const PLACEHOLDER_PATTERNS = [
  /check\s+official/i,
  /to\s+be\s+announced/i,
  /\btbd\b/i,
  /coming\s+soon/i,
  /will\s+be\s+updated/i,
  /as\s+per\s+notification/i,
];

const KIND_REQUIRED = {
  job: ['title', 'organization', 'datePosted', 'lastDate', 'sourceUrl', 'applyUrl'],
  result: ['title', 'organization', 'releaseDate', 'sourceUrl', 'resultUrl'],
  admit: ['title', 'organization', 'releaseDate', 'sourceUrl', 'downloadUrl'],
};

function hostOf(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

function isOfficialHost(host) {
  if (!host) return false;
  return OFFICIAL_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
}

function tokens(title) {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2)
  );
}

function jaccard(a, b) {
  const inter = [...a].filter((t) => b.has(t)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : inter / union;
}

function parseISO(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function isDeniedSource(url) {
  return DENIED_SOURCE_PATTERNS.some((re) => re.test(url));
}

export function validateJob(job, existing = []) {
  const failures = [];
  const warnings = [];
  let score = 0;
  const required = KIND_REQUIRED[job.kind] || KIND_REQUIRED.job;

  for (const field of required) {
    if (!job[field] || String(job[field]).trim().length < 3) {
      failures.push(`missing:${field}`);
    }
  }

  if (job.title && job.title.trim().length < 10) failures.push('title:too-short');
  if (job.title && job.title.trim().length > 120) warnings.push('title:very-long');

  for (const field of ['title', 'organization', 'qualify']) {
    if (job[field] && PLACEHOLDER_PATTERNS.some((re) => re.test(String(job[field])))) {
      failures.push(`placeholder:${field}`);
    }
  }

  if (job.sourceUrl) {
    if (isDeniedSource(job.sourceUrl)) failures.push('source:denied-host');
    if (!isOfficialHost(hostOf(job.sourceUrl))) failures.push('source:not-official-domain');
  }

  const urlField = job.kind === 'result' ? 'resultUrl' : job.kind === 'admit' ? 'downloadUrl' : 'applyUrl';
  if (job[urlField] && !isOfficialHost(hostOf(job[urlField]))) {
    failures.push(`${urlField}:not-official-domain`);
  }

  if (job.notificationPdf && !isOfficialHost(hostOf(job.notificationPdf))) {
    failures.push('pdf:not-official-domain');
  }

  const dateFields =
    job.kind === 'job' ? ['datePosted', 'lastDate'] : ['releaseDate'];
  for (const field of dateFields) {
    if (job[field] && !parseISO(job[field])) failures.push(`${field}:unparseable`);
  }

  if (job.kind === 'job' && job.datePosted && job.lastDate) {
    const posted = parseISO(job.datePosted);
    const last = parseISO(job.lastDate);
    if (posted && last && last < posted) failures.push('dates:last-before-posted');
  }

  if (job.kind === 'job' && job.lastDate) {
    const last = parseISO(job.lastDate);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    if (last && last < todayStart) failures.push('dates:expired');
  }

  if (job.kind === 'job') {
    const sections = detailSectionCount(job);
    if (sections < 3) failures.push(`detail:too-few-sections:${sections}`);
    const hasEligibilityData =
      Boolean(job.qualify) ||
      Boolean(job.ageLimit && (job.ageLimit.min !== null || job.ageLimit.max !== null)) ||
      (Array.isArray(job.fee) && job.fee.length > 0) ||
      (Array.isArray(job.vacancyBreakdown) && job.vacancyBreakdown.length > 0);
    if (!hasEligibilityData) failures.push('detail:no-eligibility-data');
    if (job.extractionLevel === 'rss-title') failures.push('detail:not-enriched-from-source');
    for (const field of ['salaryText', 'payLevel']) {
      if (job[field] && PLACEHOLDER_PATTERNS.some((re) => re.test(String(job[field])))) {
        failures.push(`placeholder:${field}`);
      }
    }
    if (Array.isArray(job.vacancyBreakdown)) {
      for (const row of job.vacancyBreakdown) {
        if (!row?.post || !Number.isInteger(Number(row.posts)) || Number(row.posts) <= 0) {
          failures.push('detail:invalid-vacancy-row');
          break;
        }
        if (PLACEHOLDER_PATTERNS.some((re) => re.test(String(row.post)))) {
          failures.push('placeholder: vacancyBreakdown');
          break;
        }
      }
    }
  }

  if (job.vacancies !== undefined && job.vacancies !== null) {
    const n = Number(job.vacancies);
    if (!Number.isInteger(n) || n <= 0 || n > 2_000_000) failures.push('vacancies:invalid');
  }

  const titleTokens = tokens(job.title || '');
  for (const prior of existing) {
    if (prior.slug === job.slug) {
      failures.push('duplicate:slug');
      break;
    }
    const sim = jaccard(titleTokens, tokens(prior.title || ''));
    if (sim > 0.82) {
      failures.push(`duplicate:title-similarity:${prior.slug}`);
      break;
    }
  }

  if (!job.sourceUrl) failures.push('source:missing-citation');
  if (!job.category) warnings.push('category:missing');

  if (failures.length === 0) {
    score = 70;
    if (job.notificationPdf) score += 10;
    if (job.salaryText || job.payLevel) score += 8;
    if (job.qualify && job.qualify.length > 20) score += 7;
    if (job.faq && Array.isArray(job.faq) && job.faq.length >= 2) score += 5;
    if (job.vacancies) score += 5;
    if (job.kind === 'job') score += Math.min(18, detailSectionCount(job) * 3);
    if (job.kind !== 'job') score += 5;
    if (warnings.length > 2) score -= 10;
  }

  return {
    pass: failures.length === 0 && score >= 70,
    score,
    failures,
    warnings,
  };
}

export function gateBatch(candidates, existing) {
  const accepted = [];
  const rejected = [];
  for (const job of candidates) {
    const result = validateJob(job, [...existing, ...accepted]);
    if (result.pass) accepted.push({ ...job, qualityScore: result.score });
    else rejected.push({ job, result });
  }
  return { accepted, rejected };
}
