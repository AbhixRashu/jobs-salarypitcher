import { gateBatch, isDeniedSource } from '../lib/quality-gates.mjs';
import { extractFromRssItem, parseRssItems } from '../lib/extract.mjs';

const passJob = {
  slug: 'ssc-chsl-2026-recruitment',
  kind: 'job',
  title: 'SSC CHSL 2026 Recruitment for 2536 Lower Division Clerk Posts',
  organization: 'SSC',
  orgUrl: 'https://ssc.gov.in',
  category: 'ssc',
  vacancies: 2536,
  datePosted: '2026-10-01',
  lastDate: '2026-11-07',
  applyUrl: 'https://ssc.gov.in',
  sourceUrl: 'https://ssc.gov.in',
  extractionLevel: 'page-detail',
  importantDates: [
    { label: 'Online application starts', date: '2026-10-01' },
    { label: 'Last date for submission of online application', date: '2026-11-07' },
    { label: 'Date of Tier 1 examination', date: '2026-12-15' },
  ],
  vacancyBreakdown: [
    { post: 'Lower Division Clerk', posts: 1800 },
    { post: 'Postal Assistant', posts: 736 },
  ],
  qualify: '12th pass from a recognized board with typing speed of 35 wpm in English.',
  ageLimit: {
    min: 18,
    max: 27,
    relaxation: [{ category: 'OBC', years: 3 }, { category: 'SC', years: 5 }],
    asOn: null,
  },
  fee: [
    { category: 'General / OBC', amount: '₹100' },
    { category: 'SC / ST / PwD', amount: 'Nil' },
  ],
  selectionProcess: [
    'Tier 1 computer based examination',
    'Tier 2 computer based examination',
    'Document verification and skill test',
  ],
  howToApply: [
    'Complete one-time registration on the official portal',
    'Fill the online application form and upload photograph and signature',
    'Pay the application fee online and submit before the last date',
  ],
  documents: ['10th mark sheet', '12th mark sheet', 'Photo identity proof'],
  salaryText: 'Pay Level 2, ₹19,900 – ₹63,200 per month',
  payLevel: 'Level 2',
};

const passResult = {
  slug: 'nda-na-2-written-result-2026',
  kind: 'result',
  title: 'NDA & NA (II) 2026 Written Examination Result Declared',
  organization: 'Indian Armed Forces',
  category: 'defence',
  releaseDate: '2026-10-09',
  datePosted: '2026-10-09',
  status: 'declared',
  resultUrl: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2076069',
  sourceUrl: 'https://pib.gov.in/PressReleasePage.aspx?PRID=2076069',
};

const passAdmit = {
  slug: 'ssc-chsl-2026-admit-card',
  kind: 'admit',
  title: 'SSC CHSL 2026 Tier 1 Admit Card Released',
  organization: 'SSC',
  category: 'ssc',
  releaseDate: '2026-10-05',
  datePosted: '2026-10-05',
  examDate: '2026-11-20',
  downloadUrl: 'https://ssc.gov.in',
  sourceUrl: 'https://ssc.gov.in',
};

const rejectPlaceholder = {
  slug: 'test-placeholder',
  kind: 'job',
  title: 'Test Recruitment Notification For Clerk Posts 2026',
  organization: 'SSC',
  datePosted: '2026-10-01',
  lastDate: '2026-11-01',
  qualify: 'Check official notification',
  applyUrl: 'https://ssc.gov.in',
  sourceUrl: 'https://ssc.gov.in',
};

const rejectNewsSource = {
  slug: 'test-google-news',
  kind: 'job',
  title: 'Test Railway Recruitment For 5000 Posts Announced Today',
  organization: 'RRB',
  datePosted: '2026-10-01',
  lastDate: '2026-11-01',
  applyUrl: 'https://rrbapply.gov.in',
  sourceUrl: 'https://news.google.com/rss/search?q=railway',
};

const rejectThin = {
  slug: 'test-thin',
  kind: 'job',
  title: 'Short',
  organization: 'UPSC',
  datePosted: '2026-10-01',
  lastDate: '2026-11-01',
  applyUrl: 'https://upsc.gov.in',
  sourceUrl: 'https://upsc.gov.in',
};

const rejectResultNoUrl = {
  slug: 'test-result-missing',
  kind: 'result',
  title: 'Test Exam Result Declaration For Candidates 2026',
  organization: 'SSC',
  releaseDate: '2026-10-01',
  sourceUrl: 'https://ssc.gov.in',
};

const rejectThinDetail = {
  slug: 'test-no-detail',
  kind: 'job',
  title: 'Test Recruitment Notice For Data Entry Operators 2026',
  organization: 'SSC',
  category: 'ssc',
  datePosted: '2026-10-01',
  lastDate: '2026-11-01',
  applyUrl: 'https://ssc.gov.in',
  sourceUrl: 'https://ssc.gov.in',
  extractionLevel: 'rss-title',
};

const { accepted, rejected } = gateBatch(
  [passJob, passResult, passAdmit, rejectPlaceholder, rejectNewsSource, rejectThin, rejectThinDetail, rejectResultNoUrl],
  []
);

console.log('--- GATE TEST RESULTS ---');
console.log(`accepted: ${accepted.map((j) => `${j.kind}:${j.slug}`).join(', ') || '(none)'}`);
for (const { job, result } of rejected) {
  console.log(`rejected: ${job.slug} (${job.kind}) => ${result.failures.join(' | ')}`);
}

console.log('\n--- DENYLIST TEST ---');
console.log('google news denied:', isDeniedSource('https://news.google.com/rss/search?q=x'));
console.log('pib allowed:', !isDeniedSource('https://pib.gov.in/RssMain.aspx'));

console.log('\n--- EXTRACT TEST (Hindi + English PIB titles) ---');
const sampleXml = `<?xml version="1.0"?><rss><channel>
<item><title>SSC Recruitment 2026 for 1200 Posts, last date 25.12.2026</title><link>https://ssc.gov.in/notice1</link><pubDate>Thu, 09 Oct 2026 10:00:00 GMT</pubDate></item>
<item><title>राष्ट्रीय रक्षा अकादमी एवं नौसेना अकादमी परीक्षा (II), 2026 की लिखित परीक्षा का परिणाम</title><link>https://pib.gov.in/PressReleasePage.aspx?PRID=2076069</link><pubDate>Thu, 09 Oct 2026 09:00:00 GMT</pubDate></item>
<item><title>PM addresses national summit</title><link>https://pib.gov.in/x</link><pubDate>Thu, 09 Oct 2026 09:00:00 GMT</pubDate></item>
<item><title>Some unknown body hiring workers</title><link>https://example.com/j</link><pubDate>Thu, 09 Oct 2026 08:00:00 GMT</pubDate></item>
</channel></rss>`;
const items = parseRssItems(sampleXml);
const extracted = items.map((i) => extractFromRssItem(i));
for (const rec of extracted) {
  console.log(
    rec
      ? `candidate: kind:${rec.kind} | ${rec.slug.slice(0, 50)} | org:${rec.organization}`
      : 'filtered out: (no kind/org match)'
  );
}
const kinds = extracted.filter(Boolean).map((r) => r.kind).sort().join(',');

console.log('\n--- DETAIL PARSER TEST ---');
const sampleHtml = `
<html><body>
<h2>Important Dates</h2>
<p>Last date for submission of online application: 25.12.2026</p>
<p>Date of examination: 15.02.2027</p>
<h2>Vacancy Details</h2>
<table>
<tr><th>Post</th><th>Vacancies</th></tr>
<tr><td>Clerk</td><td>120</td></tr>
<tr><td>Assistant</td><td>80</td></tr>
</table>
<h2>Educational Qualification</h2>
<p>Candidates must have passed 12th pass from a recognized board with computer knowledge.</p>
<h2>Age Limit</h2>
<p>Minimum age 18 years and maximum 27 years as on 01.01.2027. OBC candidates get relaxation of 3 years and SC/ST candidates get relaxation of 5 years.</p>
<h2>Application Fee</h2>
<p>General/OBC: Rs 100. SC/ST: Nil.</p>
<h2>Selection Process</h2>
<p>Selection will be based on Tier 1 examination, Tier 2 examination and document verification.</p>
<h2>How to Apply</h2>
<ol><li>Register on the official website.</li><li>Fill the application form and upload documents.</li><li>Pay the fee and submit before the last date.</li></ol>
</body></html>`;

const { htmlToText, parseJobDetails } = await import('../lib/details.mjs');
const parsed = parseJobDetails(htmlToText(sampleHtml));
const detailOk = {
  dates: parsed.importantDates?.length >= 2,
  vacancy: parsed.vacancyBreakdown?.length === 2 && parsed.vacancyBreakdown[0].post === 'Clerk',
  qualify: /12th/i.test(parsed.qualify || ''),
  age: parsed.ageLimit?.min === 18 && parsed.ageLimit?.max === 27 && parsed.ageLimit?.relaxation?.length >= 2,
  fee: parsed.fee?.length >= 2,
  selection: parsed.selectionProcess?.length >= 2,
  apply: parsed.howToApply?.length >= 2,
};
for (const [k, v] of Object.entries(detailOk)) console.log(`parse ${k}: ${v ? 'ok' : 'FAIL'}`);

const allPass =
  accepted.length === 3 &&
  accepted.some((j) => j.slug === passJob.slug) &&
  accepted.some((j) => j.slug === passResult.slug) &&
  accepted.some((j) => j.slug === passAdmit.slug) &&
  rejected.length === 5 &&
  rejected.some(
    (r) => r.job.slug === rejectThinDetail.slug && r.result.failures.some((f) => f.startsWith('detail:'))
  ) &&
  Object.values(detailOk).every(Boolean) &&
  kinds === 'job,result';

console.log(`\n${allPass ? 'ALL TESTS PASSED' : 'TEST FAILURE'} (extracted kinds: ${kinds || 'none'})`);
process.exit(allPass ? 0 : 1);
