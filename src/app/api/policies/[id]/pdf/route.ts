import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { isDemoMode, DemoORM } from '@/lib/services/demoDatabase';
import prisma from '@/lib/prisma';
import { PDFService } from '@/lib/services/pdfService';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await verifyAuth(req);

  if (!authResult.success || !authResult.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    let policy;

    if (isDemoMode()) {
      // Use demo database
      policy = await DemoORM.findUniquePolicy({ id });
      if (policy) {
        // Also get the related documents from demo database
        const documents = await DemoORM.findManyDocuments({ policyId: id });
        policy.documents = documents;
      }
    } else {
      // Use real database
      policy = await prisma.policy.findUnique({
        where: { id },
        include: {
          documents: {
            select: {
              id: true,
              category: true,
              originalName: true,
              uploadedAt: true,
            },
          },
        },
      });
    }

    if (!policy) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
    }

    // Check if user has permission to access this policy
    if (authResult.user.role !== 'admin' && authResult.user.role !== 'staff') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Generate the HTML content for the PDF
    const htmlContent = await PDFService.generatePolicyDocumentHTML(policy);

    // Return the HTML content with appropriate headers for download
    const response = new NextResponse(htmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="solicitud-arrendamiento-${policy.id}.html"`,
        'Cache-Control': 'no-cache',
      },
    });

    return response;

  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}