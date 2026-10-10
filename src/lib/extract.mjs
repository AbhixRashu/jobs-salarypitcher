import { ORG_PORTAL } from '../config/constants.mjs';

const ORG_RULES = [
  { re: /\bUPSC\b|Union Public Service Commission/i, org: 'UPSC', category: 'upsc' },
  { re: /\bSSC\b|Staff Selection Commission/i, org: 'SSC', category: 'ssc' },
  { re: /\bRRB\b|Railway Recruitment|Indian Railways|रेलवे/i, org: 'RRB', category: 'railway' },
  { re: /\bIBPS\b/i, org: 'IBPS', category: 'banking' },
  { re: /\bSBI\b|State Bank of India/i, org: 'SBI', category: 'banking' },
  { re: /\bNTA\b|National Testing Agency/i, org: 'NTA', category: 'central' },
  { re: /\bAIIMS\b/i, org: 'AIIMS', category: 'medical' },
  { re: /\bDRDO\b/i, org: 'DRDO', category: 'engineering' },
  { re: /\bISRO\b/i, org: 'ISRO', category: 'engineering' },
  { re: /Indian (?:Army|Air Force|Navy)|Agniveer|नौसेना|वायु सेना|थल सेना/i, org: 'Indian Armed Forces', category: 'defence' },
  { re: /\bNDA\b|\bNA\b|National Defence Academy/i, org: 'Indian Armed Forces', category: 'defence' },
  { re: /\bBSF\b|\bCRPF\b|\bCISF\b|\bSSB\b|Paramilitary/i, org: 'CAPF', category: 'defence' },
  { re: /High Court|उच्च न्यायालय/i, org: 'High Court', category: 'state' },
  { re: /Police|पुलिस/i, org: 'State Police', category: 'police' },
  { re: /\bPSC\b|Public Service Commission/i, org: 'State PSC', category: 'state' },
  { re: /\bNTPC\b|\bONGC\b|\bIOCL\b|\bGAIL\b|\bBHEL\b|Public Sector|PSU/i, org: 'PSU', category: 'psu' },
  { re: /Ministry of|Government of India|Govt\.? of India|भारत सरकार|केंद्र सरकार/i, org: 'Central Government', category: 'central' },
];

const KIND_RULES = [
  {
    kind: 'result',
    re: /result(?:\s+of|\s+declared|\s+out|\s+:)|merit list|scorecard|cut[\s-]?off.*declared|परिणाम|परिणाम घोषित|फल घोषित/i,
  },
  {
    kind: 'admit',
    re: /admit card|hall ticket|call letter|exam city|प्रवेश पत्र|एडमिट कार्ड/i,
  },
  {
    kind: 'job',
    re: /recruit|vacanc|notification|online form|apply online|posts?|openings|engagement|appointment|hiring|भर्ती|रिक्ति|रिक्त पद|आवेदन|नोटिफिकेशन/i,
  },
];

const MONTHS = {
  january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
  july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
};

export function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}

function detectOrg(title) {
  for (const rule of ORG_RULES) {
    if (rule.re.test(title)) return rule;
  }
  return null;
}

export function detectKind(title) {
  for (const rule of KIND_RULES) {
    if (rule.re.test(title)) return rule.kind;
  }
  return null;
}

function extractVacancies(title) {
  const patterns = [
    /(\d{2,6})\s*(?:vacan|posts?|positions?|openings?)/i,
    /(?:vacanc(?:y|ies)|posts?|positions?)\s*(?:of|:)?\s*(\d{2,6})/i,
    /for\s+(\d{2,6})\s+posts?/i,
    /(\d{2,6})\s+(?:पदों|पद)/,
  ];
  for (const re of patterns) {
    const m = title.match(re);
    if (m) {
      const n = Number(m[1]);
      if (Number.isInteger(n) && n > 0 && n <= 500000) return n;
    }
  }
  return null;
}

function extractDate(text) {
  const dotted = text.match(/\b(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})\b/);
  if (dotted) {
    const [, d, m, y] = dotted;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const longForm = text.match(
    /\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/i
  );
  if (longForm) {
    const [, d, mon, y] = longForm;
    return `${y}-${MONTHS[mon.toLowerCase()]}-${d.padStart(2, '0')}`;
  }
  const usForm = text.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s*(\d{4})\b/i
  );
  if (usForm) {
    const [, mon, d, y] = usForm;
    return `${y}-${MONTHS[mon.toLowerCase()]}-${d.padStart(2, '0')}`;
  }
  return null;
}

export function parseRssItems(xml) {
  const items = [];
  const chunks = xml.split('<item>').slice(1);
  for (const chunk of chunks) {
    const body = chunk.split('</item>')[0];
    const pick = (tag) => {
      const m = body.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
      return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';
    };
    const title = pick('title');
    const link = pick('link');
    const pubDate = pick('pubDate');
    if (title && link) items.push({ title, link, pubDate });
  }
  return items;
}

export function extractFromRssItem(item) {
  const kind = detectKind(item.title);
  if (!kind) return null;

  const orgRule = detectOrg(item.title);
  if (!orgRule) return null;

  const portal = ORG_PORTAL[orgRule.org] || 'https://pib.gov.in';
  const eventDate = extractDate(item.title);
  const posted = item.pubDate ? new Date(item.pubDate) : null;
  const datePosted =
    posted && !Number.isNaN(posted.getTime()) ? posted.toISOString().slice(0, 10) : null;
  const fetchDate = new Date().toISOString().slice(0, 10);

  const base = {
    slug: slugify(`${orgRule.org}-${kind}-${item.title}`),
    title: item.title.replace(/\s+/g, ' ').slice(0, 110),
    shortTitle: item.title.replace(/\s+/g, ' ').slice(0, 70),
    organization: orgRule.org,
    orgUrl: portal,
    category: orgRule.category,
    datePosted,
    sourceUrl: item.link,
    kind,
  };

  if (kind === 'job') {
    return {
      ...base,
      vacancies: extractVacancies(item.title),
      lastDate: eventDate,
      applyUrl: portal,
      notificationPdf: null,
      extractionLevel: 'rss-title',
    };
  }

  if (kind === 'result') {
    return {
      ...base,
      releaseDate: eventDate || datePosted || fetchDate,
      datePrecision: eventDate || datePosted ? 'from-source' : 'ingest-date',
      status: 'declared',
      resultUrl: item.link,
    };
  }

  return {
    ...base,
    releaseDate: datePosted || fetchDate,
    datePrecision: datePosted ? 'from-source' : 'ingest-date',
    examDate: eventDate,
    downloadUrl: item.link,
  };
}
