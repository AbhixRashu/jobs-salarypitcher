import { SITE_ORIGIN } from './google-auth.mjs';

const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';
const KEY = '4d1dfba9aa07492a98672edb71029e25';

export async function pingIndexNow(urls, { dryRun = false } = {}) {
  const clean = [...new Set(urls.filter((u) => u.startsWith(SITE_ORIGIN) && !u.endsWith('.xml')))];
  if (clean.length === 0) return { submitted: 0, note: 'no urls' };

  if (dryRun) {
    console.log(`[indexnow] dry-run, would submit ${clean.length} urls`);
    return { submitted: 0, note: 'dry-run' };
  }

  const body = {
    host: new URL(SITE_ORIGIN).hostname,
    key: KEY,
    keyLocation: `${SITE_ORIGIN}/${KEY}.txt`,
    urlList: clean.slice(0, 10000),
  };

  try {
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body),
    });
    console.log(`[indexnow] submitted ${body.urlList.length} urls — HTTP ${res.status}`);
    return { submitted: body.urlList.length, status: res.status };
  } catch (err) {
    console.error('[indexnow] failed:', err.message);
    return { submitted: 0, error: err.message };
  }
}
