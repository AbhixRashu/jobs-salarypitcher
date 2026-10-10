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
  qualify: '12th pass from a recognized board',
  applyUrl: 'https://ssc.gov.in',
  sourceUrl: 'https://ssc.gov.in',
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

const { accepted, rejected } = gateBatch(
  [passJob, passResult, passAdmit, rejectPlaceholder, rejectNewsSource, rejectThin, rejectResultNoUrl],
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
const allPass =
  accepted.length === 3 &&
  accepted.some((j) => j.slug === passJob.slug) &&
  accepted.some((j) => j.slug === passResult.slug) &&
  accepted.some((j) => j.slug === passAdmit.slug) &&
  rejected.length === 4 &&
  kinds === 'job,result';

console.log(`\n${allPass ? 'ALL TESTS PASSED' : 'TEST FAILURE'} (extracted kinds: ${kinds || 'none'})`);
process.exit(allPass ? 0 : 1);
