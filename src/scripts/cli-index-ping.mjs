import { pingGoogleIndex } from './index-ping.mjs';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const urls = args.filter((a) => a.startsWith('http'));

if (urls.length === 0) {
  console.log('usage: node src/scripts/cli-index-ping.mjs <url> [url ...] [--dry-run]');
  process.exit(1);
}

const result = await pingGoogleIndex(urls, { dryRun });
process.exit(result.failed > 0 && result.queued === 0 ? 1 : 0);
