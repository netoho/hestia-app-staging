import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth/middleware';
import { UserRole } from '@prisma/client';
import { actorAuthService } from '@/lib/services/ActorAuthService';
import { getDocumentDownloadUrl } from '@/lib/services/fileUploadService';
import prisma from '@/lib/prisma';

/**
 * GET /api/actors/[type]/[identifier]/documents/[documentId]
 * Download a specific document
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; identifier: string; documentId: string }> }
) {
  try {
    const { type, identifier, documentId } = await params;

    console.log(`Download request for document ${documentId} by ${type} ${identifier}`);

    // Get document record
    const document = await prisma.actorDocument.findUnique({
      where: { id: documentId }
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Documento no encontrado' },
        { status: 404 }
      );
    }

    // Resolve authentication
    const auth = await actorAuthService.resolveActorAuth(type, identifier, request);

    // Verify document belongs to this actor
    const actorField = type === 'joint-obligor' ? 'jointObligorId' : `${type}Id`;
    if ((document as any)[actorField] !== auth.actor.id) {
      return NextResponse.json(
        { error: 'Documento no pertenece a este actor' },
        { status: 403 }
      );
    }

    // For admin access, use withRole middleware
    if (auth.authType === 'admin') {
      return withRole(request, [UserRole.ADMIN, UserRole.STAFF, UserRole.BROKER], async (req, user) => {
        // Additional authorization check for brokers
        if (user.role === UserRole.BROKER) {
          const canAccess = await actorAuthService.canAccessPolicy(user.id, auth.actor.policyId);
          if (!canAccess) {
            return NextResponse.json(
              { error: 'No autorizado para descargar este documento' },
              { status: 403 }
            );
          }
        }

        return serveDocument(document);
      });
    }

    // Actor token access - serve the document
    return serveDocument(document);

  } catch (error: any) {
    console.error('Document download error:', error);
    return NextResponse.json(
      { error: error.message || 'Error al descargar documento' },
      { status: error.statusCode || 500 }
    );
  }
}

/**
 * Helper function to serve document file from S3
 */
async function serveDocument(document: any) {
  try {
    // Check if document has S3 key
    if (!document.s3Key) {
      console.error('Document missing S3 key:', document.id);
      return NextResponse.json(
        { error: 'Documento no disponible para descarga' },
        { status: 400 }
      );
    }

    // Generate presigned URL from S3
    const downloadUrl = await getDocumentDownloadUrl(
      document.s3Key,
      document.originalName || document.fileName,
      300 // 5 minutes expiry
    );

    // Return JSON response expected by frontend
    return NextResponse.json({
      success: true,
      data: {
        downloadUrl,
        fileName: document.originalName || document.fileName,
        expiresIn: 300
      }
    });
  } catch (error) {
    console.error('Error generating download URL:', error);
    return NextResponse.json(
      { error: 'Error al generar URL de descarga' },
      { status: 500 }
    );
  }
}
