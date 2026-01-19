import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-config';
import { generatePolicyPDF, getPolicyPDFFilename } from '@/lib/pdf';
import prisma from '@/lib/prisma';

/**
 * GET /api/policies/[policyId]/pdf
 * Generate and download PDF for a policy (staff/admin/broker only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ policyId: string }> }
) {
  try {
    // 1. Auth check (admin/staff/broker only)
    const session = await getServerSession(authOptions);
    if (!session?.user || !['ADMIN', 'STAFF', 'BROKER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { policyId } = await params;

    // 2. Verify policy exists and user has access
    const policy = await prisma.policy.findUnique({
      where: { id: policyId },
      select: {
        id: true,
        policyNumber: true,
        createdById: true,
      },
    });

    if (!policy) {
      return NextResponse.json({ error: 'Póliza no encontrada' }, { status: 404 });
    }

    // Brokers can only access their own policies
    if (session.user.role === 'BROKER' && policy.createdById !== session.user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // 3. Generate PDF
    const pdfBuffer = await generatePolicyPDF(policyId);

    // 4. Generate filename
    const filename = getPolicyPDFFilename(policy.policyNumber);

    // 5. Return PDF with appropriate headers
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error generating policy PDF:', error);

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: 'Póliza no encontrada' }, { status: 404 });
    }

    return NextResponse.json(
      { error: 'Error al generar el PDF' },
      { status: 500 }
    );
  }
}
