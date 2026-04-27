#!/usr/bin/env bun
/**
 * Django-style test DB provisioner.
 *
 * - Connects to the maintenance `postgres` DB.
 * - CREATE DATABASE <name> if it doesn't exist (safe — never touches dev/prod).
 * - Runs `prisma db push` against it to sync the schema.
 * - Optionally execs subsequent args (so `bun run scripts/test-db.ts setup bun test ...` works).
 *
 * Reads DATABASE_URL from .env.test (Bun auto-loads when NODE_ENV=test, otherwise we load manually).
 */

import { spawn } from 'bun';
import { Client } from 'pg';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

function loadDotenvTest(): void {
  const path = resolve(process.cwd(), '.env.test');
  if (!existsSync(path)) {
    throw new Error('.env.test not found at repo root');
  }
  const raw = readFileSync(path, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function parseDbUrl(url: string): { host: string; port: number; user: string; password: string; database: string } {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: Number(u.port || 5432),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ''),
  };
}

async function ensureDatabaseExists(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  if (!url.endsWith('_test')) {
    throw new Error(`Refusing to run: DATABASE_URL does not end in "_test" (got ${url})`);
  }

  const parts = parseDbUrl(url);
  const adminClient = new Client({
    host: parts.host,
    port: parts.port,
    user: parts.user,
    password: parts.password,
    database: 'postgres',
  });

  await adminClient.connect();
  try {
    const exists = await adminClient.query('SELECT 1 FROM pg_database WHERE datname = $1', [parts.database]);
    if (exists.rowCount === 0) {
      console.log(`[test-db] creating database "${parts.database}"`);
      await adminClient.query(`CREATE DATABASE "${parts.database}"`);
    } else {
      console.log(`[test-db] database "${parts.database}" already exists`);
    }
  } finally {
    await adminClient.end();
  }
}

async function pushSchema(): Promise<void> {
  console.log('[test-db] running prisma db push');
  const proc = spawn(['bunx', 'prisma', 'db', 'push', '--accept-data-loss'], {
    stdout: 'inherit',
    stderr: 'inherit',
    env: { ...process.env },
  });
  const code = await proc.exited;
  if (code !== 0) throw new Error(`prisma db push failed (exit ${code})`);
}

async function execArgs(args: string[]): Promise<number> {
  if (args.length === 0) return 0;
  const proc = spawn(args, { stdout: 'inherit', stderr: 'inherit', stdin: 'inherit', env: { ...process.env } });
  return await proc.exited;
}

async function main(): Promise<void> {
  loadDotenvTest();

  const args = process.argv.slice(2);
  let mode: 'setup' | 'run' = 'setup';
  let rest: string[] = [];

  if (args[0] === 'setup') {
    mode = 'setup';
    rest = args.slice(1);
  } else if (args[0] === 'run') {
    mode = 'run';
    rest = args.slice(1);
  } else {
    rest = args;
  }

  await ensureDatabaseExists();
  await pushSchema();

  if (mode === 'run' && rest.length > 0) {
    const code = await execArgs(rest);
    process.exit(code);
  }
}

main().catch((err) => {
  console.error('[test-db] failed:', err);
  process.exit(1);
});
