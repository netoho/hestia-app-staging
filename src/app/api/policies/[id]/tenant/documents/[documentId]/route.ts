import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { deleteDocument } from '@/lib/services/fileUploadService';
import prisma from '@/lib/prisma';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  try {
    const { id: policyId, documentId } = await params;

    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has permission (staff or admin only)
    if (!['STAFF', 'ADMIN'].includes(authResult.user.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Only staff and admin can delete documents' },
        { status: 403 }
      );
    }

    // Verify that the document belongs to the tenant of the specified policy
    const document = await prisma.actorDocument.findFirst({
      where: {
        id: documentId,
        tenant: {
          policyId: policyId
        }
      },
      include: {
        tenant: {
          select: {
            id: true,
            policyId: true
          }
        }
      }
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found or does not belong to this policy tenant' },
        { status: 404 }
      );
    }

    // Delete document from S3 and database
    const deleted = await deleteDocument(documentId, true);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Failed to delete document' },
        { status: 500 }
      );
    }

    // Log activity
    await prisma.policyActivity.create({
      data: {
        policyId,
        action: 'tenant_document_deleted',
        description: `Documento de inquilino eliminado: ${document.originalName}`,
        details: {
          documentId,
          fileName: document.originalName,
          category: document.category,
          documentType: document.documentType,
          deletedBy: authResult.user.email
        },
        performedById: authResult.user.id,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error) {
    console.error('Document delete error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}