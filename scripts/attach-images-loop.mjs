#!/usr/bin/env node
/**
 * Runs `attach-images.mjs` in a loop until the Firestore queue is empty (or --max-rounds).
 * Use so you do not have to paste terminal output after every batch.
 *
 * Examples:
 *   npm run attach-images:loop:dry   # ONE round only — dry-run never writes image_url, so the queue cannot shrink
 *   npm run attach-images:loop       # repeats until queue empty (real writes)
 *   node scripts/attach-images-loop.mjs --limit=20 --pause-between-rounds=8000
 *
 * If every item in a batch is skipped (0 attachments) for several rounds in a row, the same
 * questions stay at the front of the queue — the loop stops (--max-stagnant-rounds, default 3)
 * instead of spinning until --max-rounds. Use --mark-skip-on-no-match to let Firestore record
 * no-result and move past hard Wikimedia misses (run deliberately; clears retries until you
 * reset the field in Console).
 *
 * Logs are appended to logs/attach-images-loop.log (stdout/stderr interleaved per round).
 */

import { spawn } from 'child_process';
import { mkdirSync, appendFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ATTACH_SCRIPT = join(ROOT, 'scripts', 'attach-images.mjs');
const LOG_DIR = join(ROOT, 'logs');
const LOG_FILE = join(LOG_DIR, 'attach-images-loop.log');

function parseLoopArgs(argv) {
  const pass = [];
  let dryRun = false;
  let limit = 10;
  let maxRounds = 2000;
  let pauseBetweenRoundsMs = 4000;
  let maxStagnantRounds = 3;
  for (const a of argv) {
    if (a === '--dry-run') {
      dryRun = true;
      pass.push(a);
      continue;
    }
    if (a === '--mark-skip-on-no-match') {
      pass.push(a);
      continue;
    }
    const lim = a.match(/^--limit=(\d+)$/);
    if (lim) {
      limit = Math.max(1, parseInt(lim[1], 10));
      pass.push(a);
      continue;
    }
    const del = a.match(/^--delay=(\d+)$/);
    if (del) {
      pass.push(a);
      continue;
    }
    const mr = a.match(/^--max-rounds=(\d+)$/);
    if (mr) {
      maxRounds = Math.max(1, parseInt(mr[1], 10));
      continue;
    }
    const pause = a.match(/^--pause-between-rounds=(\d+)$/);
    if (pause) {
      pauseBetweenRoundsMs = Math.max(0, parseInt(pause[1], 10));
      continue;
    }
    const st = a.match(/^--max-stagnant-rounds=(\d+)$/);
    if (st) {
      maxStagnantRounds = Math.max(1, parseInt(st[1], 10));
      continue;
    }
  }
  if (!pass.some((x) => x.startsWith('--limit='))) {
    pass.push(`--limit=${limit}`);
  }
  if (dryRun && !pass.includes('--dry-run')) pass.push('--dry-run');

  const limPass = pass.filter((x) => x.startsWith('--limit='));
  if (limPass.length > 1) {
    const lastLim = limPass[limPass.length - 1];
    const m = lastLim.match(/^--limit=(\d+)$/);
    if (m) limit = Math.max(1, parseInt(m[1], 10));
    const rest = pass.filter((x) => !x.startsWith('--limit='));
    pass.length = 0;
    pass.push(...rest, lastLim);
  }

  return { pass, dryRun, limit, maxRounds, pauseBetweenRoundsMs, maxStagnantRounds };
}

function parseAttachResult(output) {
  const tag = '__ATTACH_IMAGES_RESULT__';
  const idx = output.lastIndexOf(tag);
  if (idx === -1) return null;
  const jsonPart = output.slice(idx + tag.length).trim();
  try {
    return JSON.parse(jsonPart);
  } catch {
    return null;
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function runAttachRound(extraArgs) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const child = spawn(process.execPath, [ATTACH_SCRIPT, ...extraArgs], {
      cwd: ROOT,
      stdio: ['inherit', 'pipe', 'pipe'],
    });
    child.stdout.on('data', (c) => {
      process.stdout.write(c);
      chunks.push(c);
    });
    child.stderr.on('data', (c) => {
      process.stderr.write(c);
      chunks.push(c);
    });
    child.on('error', reject);
    child.on('close', (code) => {
      resolve({ code, output: Buffer.concat(chunks).toString('utf8') });
    });
  });
}

async function main() {
  const { pass, dryRun, limit, maxRounds, pauseBetweenRoundsMs, maxStagnantRounds } = parseLoopArgs(
    process.argv.slice(2)
  );
  // Dry-run does not set image_url on documents → queue size never drops → would repeat the same batch forever.
  const effectiveMaxRounds = dryRun ? 1 : maxRounds;

  mkdirSync(LOG_DIR, { recursive: true });
  const started = new Date().toISOString();
  const header = `\n\n======== attach-images-loop ${started} dryRun=${dryRun} limit=${limit} maxRounds=${effectiveMaxRounds} maxStagnantRounds=${maxStagnantRounds} ========\n`;
  appendFileSync(LOG_FILE, header, 'utf8');

  console.log('\n🔁 attach-images-loop');
  console.log('   Runs attach-images until the queue is empty or --max-rounds is reached.');
  console.log(`   Args passed through: ${pass.join(' ')}`);
  console.log(`   Pause between rounds: ${pauseBetweenRoundsMs} ms`);
  console.log(`   Stop if no progress: ${maxStagnantRounds} consecutive rounds with 0 attachments (same stuck batch)`);
  console.log(`   Log file: ${LOG_FILE}`);
  if (dryRun) {
    console.log(
      '\n   ℹ️  Dry-run: only 1 round (no Firestore/Storage writes, so pending count never changes). Use npm run attach-images:loop without --dry-run to drain the queue.'
    );
  }
  console.log('');

  let round = 0;
  let stagnantRounds = 0;
  while (round < effectiveMaxRounds) {
    round++;
    console.log(`\n──────── Round ${round} / ${effectiveMaxRounds} ────────\n`);
    const { code, output } = await runAttachRound(pass);
    appendFileSync(LOG_FILE, output + (code !== 0 ? `\n[exit code ${code}]\n` : ''), 'utf8');

    const r = parseAttachResult(output);
    if (r?.fatal === true) {
      console.error(
        '\nWARN  attach-images hit a network/Firestore error (Wi-Fi or DNS often causes this).\n' +
          `   Detail: ${r.fatalMessage || 'see log above'}\n` +
          '   Earlier rounds are already saved -- fix connection and run the loop again.\n'
      );
      process.exit(5);
    }

    if (code !== 0) {
      console.error(`\nERROR  attach-images exited with code ${code} -- stopping loop.`);
      process.exit(code || 1);
    }

    if (!r) {
      console.warn('\nWARN  Could not parse __ATTACH_IMAGES_RESULT__ -- stopping loop (check attach-images.mjs output).');
      process.exit(2);
    }

    const pending = r.pendingTotalAtRunStart ?? r.queueAtStart ?? 0;
    if (pending === 0 || r.queueEmpty === true) {
      console.log('\n✅ Queue is empty — loop finished.');
      process.exit(0);
    }

    const bs = r.batchSize ?? 0;
    const stuckNoAttachments =
      bs > 0 && (r.success ?? 0) === 0 && (r.failed ?? 0) === 0 && (r.skipped ?? 0) >= bs;
    if (stuckNoAttachments) {
      stagnantRounds++;
      if (stagnantRounds >= maxStagnantRounds) {
        console.error(
          `\n⛔ No progress: ${maxStagnantRounds} rounds in a row with 0 attachments and every item in the batch skipped.\n` +
            `   The same questions stay at the front of the queue, so repeating does not help.\n\n` +
            `   What to do:\n` +
            `   • Run once with Wikimedia no-match marking (then re-run loop without it):\n` +
            `     npm run attach-images:loop -- --mark-skip-on-no-match --limit=${limit}\n` +
            `   • Or set image_url by hand in Firestore for those stems.\n` +
            `   • Or refresh Gemini search_queries in Admin and try again.\n` +
            `   • Raise --max-stagnant-rounds if you really want more identical retries.\n`
        );
        process.exit(4);
      }
    } else {
      stagnantRounds = 0;
    }

    if (round >= effectiveMaxRounds) {
      if (dryRun) {
        console.log(
          '\n✅ Dry-run round complete. Run `npm run attach-images:loop` (without dry-run) to attach for real until this number reaches 0.'
        );
      }
      break;
    }

    if (pauseBetweenRoundsMs > 0) {
      console.log(`\n⏳ Pausing ${pauseBetweenRoundsMs} ms before next round…`);
      await sleep(pauseBetweenRoundsMs);
    }
  }

  if (!dryRun) {
    console.error(
      `\n⛔ Stopped after ${effectiveMaxRounds} rounds (--max-rounds). Queue may not be empty yet — run again if needed.`
    );
    process.exit(3);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
