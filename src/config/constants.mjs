export const SITE = {
  origin: 'https://jobs.salarypitcher.com',
  name: 'Jobs SalaryPitcher',
  tagline: 'Official government job notifications, parsed from source PDFs',
};

export const DENIED_SOURCE_PATTERNS = [
  /news\.google\.com/i,
  /google\.com\/rss/i,
  /feedly\.com/i,
  /blogspot\.com/i,
  /wordpress\.com/i,
];

export const OFFICIAL_DOMAINS = [
  'pib.gov.in',
  'employmentnews.gov.in',
  'upsc.gov.in',
  'ssc.gov.in',
  'rrbapply.gov.in',
  'indianrailways.gov.in',
  'ibps.in',
  'sbi.co.in',
  'rbi.org.in',
  'nta.ac.in',
  'ctet.nic.in',
  'joinindianarmy.nic.in',
  'indianairforce.nic.in',
  'indiannavy.nic.in',
  'uppbpb.up.gov.in',
  'csbc.bih.nic.in',
  'police.rajasthan.gov.in',
  'dsssb.delhi.gov.in',
  'bpsc.bihar.gov.in',
  'rpsc.rajasthan.gov.in',
  'mppsc.mp.in',
  'uppsc.up.nic.in',
  'jssc.nic.in',
  'opsc.gov.in',
  'psc.ap.gov.in',
  'hssc.gov.in',
  'ssc.uk.gov.in',
  'sssb.punjab.gov.in',
  'gov.in',
  'nic.in',
  'nic.co.in',
  'psu',
];

export const OFFICIAL_SOURCES = [
  {
    id: 'pib',
    name: 'Press Information Bureau (Govt of India)',
    url: 'https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1',
    type: 'rss',
    categories: ['central', 'psu'],
  },
  {
    id: 'employment-news',
    name: 'Employment News / Rozgar Samachar',
    url: 'https://employmentnews.gov.in/newemp/Home.aspx',
    type: 'portal',
    cadence: 'weekly',
    categories: ['central', 'state', 'defence', 'banking'],
  },
  {
    id: 'upsc',
    name: 'Union Public Service Commission',
    url: 'https://upsc.gov.in',
    type: 'portal',
    categories: ['upsc', 'central'],
  },
  {
    id: 'ssc',
    name: 'Staff Selection Commission',
    url: 'https://ssc.gov.in',
    type: 'portal',
    categories: ['ssc', 'central'],
  },
  {
    id: 'rrb',
    name: 'Railway Recruitment Boards',
    url: 'https://rrbapply.gov.in',
    type: 'portal',
    categories: ['railway', 'central'],
  },
  {
    id: 'ibps',
    name: 'Institute of Banking Personnel Selection',
    url: 'https://ibps.in',
    type: 'portal',
    categories: ['banking', 'central'],
  },
];

export const ORG_PORTAL = {
  UPSC: 'https://upsc.gov.in',
  SSC: 'https://ssc.gov.in',
  RRB: 'https://rrbapply.gov.in',
  IBPS: 'https://ibps.in',
  SBI: 'https://sbi.co.in',
  NTA: 'https://nta.ac.in',
  PIB: 'https://pib.gov.in',
};

export const CATEGORIES = [
  'upsc',
  'ssc',
  'railway',
  'banking',
  'defence',
  'police',
  'teaching',
  'engineering',
  'medical',
  'central',
  'state',
  'psu',
];

export const MAX_PUBLISH_PER_RUN = 15;
export const MAX_PAGES_PER_DAY = 40;
