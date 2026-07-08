import { NextResponse } from 'next/server';

/**
 * Self-service registration was removed (#162, 2026-07-05 security
 * decision): brokers join invite-only, exactly like staff — dashboard
 * invitation (staff.create supports the BROKER role) → join link →
 * onboard.* token flow.
 *
 * This tombstone answers 410 Gone so cached clients, bookmarks and
 * crawlers get a definitive signal instead of a soft 404.
 */
export async function POST() {
  return NextResponse.json(
    { error: 'El registro público fue deshabilitado. Solicite una invitación.' },
    { status: 410 },
  );
}
