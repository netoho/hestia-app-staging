#!/usr/bin/env bun
/**
 * TypeScript error ratchet (guardrails #129).
 *
 * The repo carries a legacy tsc-error baseline that is being burned down by the
 * #123 sweep. A hard `tsc --noEmit` gate would be red for months, so instead:
 * the count of errors in GIT-TRACKED files must never GROW. Shrinking it is
 * celebrated — run with --update after a burn-down to lower the baseline.
 *
 * Only tracked files count so that untracked local scratch files don't skew
 * the number between machines and CI.
 *
 * Usage:
 *   bun run scripts/tsc-ratchet.ts            # check (exit 1 if count > baseline)
 *   bun run scripts/tsc-ratchet.ts --update   # rewrite tsc-baseline.json with today's count
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const BASELINE_PATH = resolve(process.cwd(), 'tsc-baseline.json');

function trackedFiles(): Set<string> {
  const out = spawnSync('git', ['ls-files'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (out.status !== 0) throw new Error(`git ls-files failed: ${out.stderr}`);
  return new Set(out.stdout.split('\n').filter(Boolean));
}

function tscErrors(): Map<string, number> {
  // tsconfig.ratchet.json pins a deterministic program (no .next/types, no
  // untracked e2e scaffold, no incremental cache) so local and CI counts agree.
  const out = spawnSync('bunx', ['tsc', '-p', 'tsconfig.ratchet.json', '--noEmit', '--pretty', 'false'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  const errorsByFile = new Map<string, number>();
  const re = /^(.+?)\(\d+,\d+\): error TS\d+:/;
  for (const line of `${out.stdout}\n${out.stderr}`.split('\n')) {
    const m = re.exec(line);
    if (m) errorsByFile.set(m[1], (errorsByFile.get(m[1]) ?? 0) + 1);
  }
  return errorsByFile;
}

const tracked = trackedFiles();
const byFile = tscErrors();

let trackedCount = 0;
let untrackedCount = 0;
for (const [file, count] of byFile) {
  if (tracked.has(file)) trackedCount += count;
  else untrackedCount += count;
}

if (process.argv.includes('--update')) {
  writeFileSync(BASELINE_PATH, `${JSON.stringify({ trackedErrorCount: trackedCount }, null, 2)}\n`);
  console.log(`[tsc-ratchet] baseline updated: ${trackedCount} tracked-file errors`);
  process.exit(0);
}

if (!existsSync(BASELINE_PATH)) {
  console.error(`[tsc-ratchet] no baseline found at ${BASELINE_PATH} — run with --update to create it`);
  process.exit(1);
}

const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8')).trackedErrorCount as number;

console.log(
  `[tsc-ratchet] tracked-file tsc errors: ${trackedCount} (baseline ${baseline}` +
    (untrackedCount ? `; ignoring ${untrackedCount} in untracked files` : '') +
    ')',
);

if (trackedCount > baseline) {
  const worst = [...byFile.entries()]
    .filter(([f]) => tracked.has(f))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([f, c]) => `  ${c}\t${f}`)
    .join('\n');
  console.error(
    `[tsc-ratchet] FAIL: ${trackedCount} > baseline ${baseline}. New type errors were introduced.\nWorst files:\n${worst}`,
  );
  process.exit(1);
}

if (trackedCount < baseline) {
  console.log(
    `[tsc-ratchet] Nice — ${baseline - trackedCount} fewer than baseline. Lock it in: bun run scripts/tsc-ratchet.ts --update`,
  );
}
