import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-config';
import { generateCoverPageDocx, getCoverPageFilename } from '@/lib/docx';
import prisma from '@/lib/prisma';

/**
 * GET /api/policies/[policyId]/contract-cover
 * Generate and download the contract cover page (.docx) — staff/admin/broker only
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ policyId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['ADMIN', 'STAFF', 'BROKER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { policyId } = await params;

    const policy = await prisma.policy.findUnique({
      where: { id: policyId },
      select: { id: true, policyNumber: true, createdById: true },
    });

    if (!policy) {
      return NextResponse.json({ error: 'Protección no encontrada' }, { status: 404 });
    }

    if (session.user.role === 'BROKER' && policy.createdById !== session.user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const buffer = await generateCoverPageDocx(policyId);
    const filename = getCoverPageFilename(policy.policyNumber);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: 'Protección no encontrada' }, { status: 404 });
    }
    console.error('Error generating cover page:', error);
    return NextResponse.json(
      { error: 'Error al generar la carátula' },
      { status: 500 }
    );
  }
}
