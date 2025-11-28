import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getSignedDownloadUrl } from '@/lib/services/fileUploadService';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  try {
    const { id, documentId } = await params;

    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has permission (staff or admin only)
    if (!['staff', 'admin'].includes(authResult.user.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Only staff and admin can download documents' },
        { status: 403 }
      );
    }

    // Verify that the document belongs to the specified policy
    // Use real database
    const document = await prisma.policyDocument.findFirst({
      where: {
        id: documentId,
        policyId: id,
      },
      include: {
        policy: {
          select: {
            id: true,
            policyNumber: true,
          }
        }
      }
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found or does not belong to this policy' },
        { status: 404 }
      );
    }

    // Generate a signed URL with very short expiration (5 minutes)
    const signedUrl = await getSignedDownloadUrl(document.s3Key, document.originalName, 300); // 5 minutes

    // Log the download activity
    await prisma.policyActivity.create({
      data: {
        policyId: id,
        action: 'document_downloaded',
        description: `Document downloaded: ${document.originalName}`,
        details: {
          documentId: document.id,
          fileName: document.originalName,
          downloadedBy: authResult.user.email,
        },
        performedById: authResult.user.id,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      }
    });

    return NextResponse.json({
      downloadUrl: signedUrl,
      fileName: document.originalName,
      expiresIn: 300, // 5 minutes
    });

  } catch (error) {
    console.error('Document download error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}