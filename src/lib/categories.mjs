export const CATEGORIES = [
  {
    slug: 'central',
    label: 'Central Government',
    keywords: ['central govt', 'ministry', 'group a', 'group b', 'ssc', 'upsc'],
    blurb: 'Central government ministries, departments and autonomous bodies.',
  },
  {
    slug: 'state',
    label: 'State Government',
    keywords: ['state govt', 'state jobs', 'psc', 'spsc', 'commission'],
    blurb: 'State public service commissions, boards and departments.',
  },
  {
    slug: 'banking',
    label: 'Banking',
    keywords: ['bank', 'banking', 'ibps', 'sbi', 'rbi', 'nabard'],
    blurb: 'Public sector banks, RBI, NABARD and financial institutions.',
  },
  {
    slug: 'railway',
    label: 'Railway',
    keywords: ['railway', 'rrb', 'indian railways', 'metro'],
    blurb: 'Indian Railways, RRB and metro rail recruitment.',
  },
  {
    slug: 'defence',
    label: 'Defence',
    keywords: ['defence', 'army', 'navy', 'airforce', 'afcat', 'agniveer'],
    blurb: 'Indian Army, Navy, Air Force and defence organisations.',
  },
  {
    slug: 'teaching',
    label: 'Teaching',
    keywords: ['teacher', 'professor', 'lecturer', 'school', 'college', 'education'],
    blurb: 'School, college and university teaching positions.',
  },
  {
    slug: 'police',
    label: 'Police',
    keywords: ['police', 'constable', 'sub inspector', 'si', 'army police'],
    blurb: 'State police, constable and sub-inspector recruitment.',
  },
  {
    slug: 'engineering',
    label: 'Engineering',
    keywords: ['engineer', 'je', 'sse', 'technical', 'it', 'computer'],
    blurb: 'Junior engineer, technical officer and IT posts.',
  },
  {
    slug: 'medical',
    label: 'Medical & Health',
    keywords: ['medical', 'doctor', 'nurse', 'aiims', 'health', 'pharmacist'],
    blurb: 'Doctors, nurses, pharmacists and health department posts.',
  },
  {
    slug: 'agriculture',
    label: 'Agriculture',
    keywords: ['agriculture', 'forestry', 'animal husbandry', 'veterinary'],
    blurb: 'Agriculture, horticulture, forestry and veterinary posts.',
  },
  {
    slug: 'research',
    label: 'Research & Science',
    keywords: ['research', 'scientist', 'isro', 'drdo', 'barc', 'icsr'],
    blurb: 'Research laboratories, DRDO, ISRO and scientific posts.',
  },
  {
    slug: 'general',
    label: 'Other',
    keywords: ['other', 'misc'],
    blurb: 'Recruitment that does not fit the categories above.',
  },
];

const BY_SLUG = new Map(CATEGORIES.map((c) => [c.slug, c]));

export function categoryBySlug(slug) {
  return BY_SLUG.get(slug) || null;
}

export function categoryLabel(slug) {
  return BY_SLUG.get(slug)?.label || slug || 'Other';
}

export function categoryHref(slug) {
  return `/jobs/category/${slug}/`;
}

export function countByCategory(items) {
  const counts = {};
  for (const item of items) {
    const key = item.category || 'general';
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

export function daysUntil(iso) {
  if (!iso) return null;
  const target = new Date(`${iso}T23:59:59+05:30`).getTime();
  if (Number.isNaN(target)) return null;
  return Math.ceil((target - Date.now()) / 86400000);
}

export function lastDateLabel(iso) {
  const days = daysUntil(iso);
  if (days === null) return null;
  if (days < 0) return { text: 'Closed', tone: 'closed', days };
  if (days === 0) return { text: 'Last date today', tone: 'urgent', days };
  if (days === 1) return { text: '1 day left', tone: 'urgent', days };
  if (days <= 7) return { text: `${days} days left`, tone: 'soon', days };
  return { text: `${days} days left`, tone: 'open', days };
}
