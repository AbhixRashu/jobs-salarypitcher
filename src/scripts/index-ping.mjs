import { loadServiceAccount, getGoogleAccessToken, GOOGLE_SCOPES, SITE_ORIGIN } from './google-auth.mjs';

const PUBLISH_ENDPOINT = 'https://indexing.googleapis.com/v3/urlNotifications:publish';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function publishUrl(url, accessToken, type) {
  const res = await fetch(PUBLISH_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ url, type }),
  });
  let data = {};
  try {
    data = await res.json();
  } catch {
    /* non-JSON */
  }
  const latestUpdate = data?.urlNotificationMetadata?.latestUpdate || null;
  return { status: res.status, ok: res.ok, latestUpdate, data };
}

export async function pingGoogleIndex(urls, { type = 'URL_UPDATED', dryRun = false, limit = 100 } = {}) {
  const targets = [...new Set(urls.filter((u) => u.startsWith(`${SITE_ORIGIN}/jobs/`)))].slice(0, limit);
  if (targets.length === 0) return { attempted: 0, queued: 0, failed: 0, note: 'no job URLs to ping' };

  if (dryRun) {
    console.log(`[index-ping] dry-run, would ping ${targets.length} job URLs`);
    return { attempted: 0, queued: 0, failed: 0, note: 'dry-run' };
  }

  const { keyData, source } = loadServiceAccount();
  if (!keyData) {
    return { attempted: 0, queued: 0, failed: 0, note: 'no credentials (set GOOGLE_SERVICE_ACCOUNT_JSON or service-account.json)' };
  }

  console.log(`[index-ping] auth ok (${source}, project ${keyData.project_id})`);
  let accessToken;
  try {
    accessToken = await getGoogleAccessToken(keyData, GOOGLE_SCOPES.indexing);
  } catch (err) {
    console.error('[index-ping] auth failed:', err.message);
    return { attempted: 0, queued: 0, failed: targets.length, note: 'auth failed' };
  }

  let queued = 0;
  let ignored = 0;
  let failed = 0;

  for (let i = 0; i < targets.length; i++) {
    const url = targets[i];
    try {
      const result = await publishUrl(url, accessToken, type);
      if (result.ok && result.latestUpdate) {
        queued++;
      } else if (result.ok) {
        ignored++;
      } else {
        failed++;
        console.warn(`[index-ping] HTTP ${result.status}: ${url}`);
        if (result.status === 403) {
          console.warn(`[index-ping] add ${keyData.client_email} as OWNER in GSC for ${SITE_ORIGIN}`);
        } else if (result.status === 429) {
          console.warn('[index-ping] daily quota (200/day) exhausted — stopping');
          break;
        }
      }
    } catch (err) {
      failed++;
      console.error(`[index-ping] error: ${url} (${err.message})`);
    }
    if (i < targets.length - 1) await sleep(120);
  }

  console.log(`[index-ping] done — queued:${queued} ignored:${ignored} failed:${failed} of ${targets.length}`);
  return { attempted: targets.length, queued, ignored, failed };
}
