import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getDocumentDownloadUrl } from '@/lib/services/fileUploadService';
import { validateLandlordToken } from '@/lib/services/actorTokenService';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string; documentId: string }> }
) {
  try {
    const { token, documentId } = await params;

    // Validate landlord token
    const validation = await validateLandlordToken(token);
    if (!validation.valid || !validation.landlord) {
      return NextResponse.json(
        { success: false, error: validation.message || 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Find the document and verify it belongs to this landlord
    const document = await prisma.actorDocument.findFirst({
      where: {
        id: documentId,
        landlordId: validation.landlord.id,
      },
    });

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found or access denied' },
        { status: 404 }
      );
    }

    // Generate signed download URL (60 seconds expiration for security)
    const downloadUrl = await getDocumentDownloadUrl(
      document.s3Key,
      document.originalName,
      60 // 60 seconds expiration
    );

    // Log activity
    await prisma.policyActivity.create({
      data: {
        policyId: validation.landlord.policyId,
        action: 'document_downloaded',
        description: `Landlord downloaded ${document.documentType} document`,
        performedByType: 'landlord',
        details: {
          documentId,
          fileName: document.originalName,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        downloadUrl,
        fileName: document.originalName,
        expiresIn: 60, // seconds
      },
    });
  } catch (error) {
    console.error('Document download error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate download URL' },
      { status: 500 }
    );
  }
}
