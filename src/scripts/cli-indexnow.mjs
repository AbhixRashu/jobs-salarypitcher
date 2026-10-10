import { pingIndexNow } from './indexnow.mjs';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const urls = args.filter((a) => a.startsWith('http'));

if (urls.length === 0) {
  console.log('usage: node src/scripts/cli-indexnow.mjs <url> [url ...] [--dry-run]');
  process.exit(1);
}

const result = await pingIndexNow(urls, { dryRun });
process.exit(result.error ? 1 : 0);
