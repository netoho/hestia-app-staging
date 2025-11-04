import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth/middleware';
import { UserRole, DocumentCategory } from '@prisma/client';
import { actorAuthService } from '@/lib/services/ActorAuthService';
import { uploadActorDocument, deleteDocument } from '@/lib/services/fileUploadService';
import { getDocumentsByActor } from '@/lib/services/documentService';
import type { UploadedFile } from '@/lib/services/fileUploadService';

/**
 * GET /api/actors/[type]/[identifier]/documents
 * List documents for an actor
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; identifier: string }> }
) {
  try {
    const { type, identifier } = await params;

    // Resolve authentication
    const auth = await actorAuthService.resolveActorAuth(type, identifier, request);

    // For admin access, use withRole middleware
    if (auth.authType === 'admin') {
      return withRole(request, [UserRole.ADMIN, UserRole.STAFF, UserRole.BROKER], async (req, user) => {
        // Additional authorization check for brokers
        if (user.role === UserRole.BROKER) {
          const canAccess = await actorAuthService.canAccessPolicy(user.id, auth.actor.policyId);
          if (!canAccess) {
            return NextResponse.json(
              { error: 'No autorizado para ver documentos' },
              { status: 403 }
            );
          }
        }

        const documents = await getDocumentsByActor(auth.actor.id, type);
        return NextResponse.json({
          success: true,
          documents
        });
      });
    }

    // Actor token access
    const documents = await getDocumentsByActor(auth.actor.id, type);
    return NextResponse.json({
      success: true,
      documents
    });

  } catch (error: any) {
    console.error('Documents GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener documentos' },
      { status: error.statusCode || 500 }
    );
  }
}

/**
 * POST /api/actors/[type]/[identifier]/documents
 * Upload a document for an actor
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; identifier: string }> }
) {
  try {
    const { type, identifier } = await params;
    const formData = await request.formData();

    // Resolve authentication
    const auth = await actorAuthService.resolveActorAuth(type, identifier, request);

    // Check if editing is allowed
    if (!auth.canEdit && auth.authType === 'actor') {
      return NextResponse.json(
        { error: 'No puede subir documentos después de completar la información' },
        { status: 400 }
      );
    }

    // Handle file upload
    const file = formData.get('file') as File;
    const documentType = formData.get('documentType') as string;
    const category = formData.get('category') as string;

    if (!file || !documentType || !category) {
      return NextResponse.json(
        { error: 'Archivo, tipo de documento y categoría son requeridos' },
        { status: 400 }
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
              { error: 'No autorizado para subir documentos' },
              { status: 403 }
            );
          }
        }

        // Convert File to UploadedFile format
        const bytes = await file.arrayBuffer();
        const uploadedFile: UploadedFile = {
          buffer: Buffer.from(bytes),
          originalName: file.name,
          mimeType: file.type,
          size: file.size
        };

        // Get policy number for S3 path
        const policy = auth.actor.policy;
        const policyNumber = policy?.policyNumber || auth.actor.policyId;

        // Upload document using fileUploadService
        const result = await uploadActorDocument(
          uploadedFile,
          auth.actor.policyId,
          policyNumber,
          type === 'joint-obligor' ? 'jointObligor' : type as any,
          auth.actor.id,
          category as DocumentCategory,
          documentType,
          user.email
        );

        if (!result.success) {
          throw new Error(result.error || 'Error al subir documento');
        }

        return NextResponse.json({
          success: true,
          message: 'Documento subido exitosamente',
          documentId: result.documentId
        });
      });
    }

    // Actor token access
    // Convert File to UploadedFile format
    const bytes = await file.arrayBuffer();
    const uploadedFile: UploadedFile = {
      buffer: Buffer.from(bytes),
      originalName: file.name,
      mimeType: file.type,
      size: file.size
    };

    // Get policy number for S3 path
    const policy = auth.actor.policy;
    const policyNumber = policy?.policyNumber || auth.actor.policyId;

    // Upload document using fileUploadService
    const result = await uploadActorDocument(
      uploadedFile,
      auth.actor.policyId,
      policyNumber,
      type === 'joint-obligor' ? 'jointObligor' : type as any,
      auth.actor.id,
      category as DocumentCategory,
      documentType,
      'self' // Actor uploading their own document
    );

    if (!result.success) {
      throw new Error(result.error || 'Error al subir documento');
    }

    return NextResponse.json({
      success: true,
      message: 'Documento subido exitosamente',
      documentId: result.documentId
    });

  } catch (error: any) {
    console.error('Document upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Error al subir documento' },
      { status: error.statusCode || 500 }
    );
  }
}

/**
 * DELETE /api/actors/[type]/[identifier]/documents
 * Delete a document (requires documentId in body)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; identifier: string }> }
) {
  try {
    const { type, identifier } = await params;
    const { documentId } = await request.json();

    if (!documentId) {
      return NextResponse.json(
        { error: 'ID del documento requerido' },
        { status: 400 }
      );
    }

    // Resolve authentication
    const auth = await actorAuthService.resolveActorAuth(type, identifier, request);

    // Check if editing is allowed
    if (!auth.canEdit && auth.authType === 'actor') {
      return NextResponse.json(
        { error: 'No puede eliminar documentos después de completar la información' },
        { status: 400 }
      );
    }

    // For admin access, use withRole middleware
    if (auth.authType === 'admin') {
      return withRole(request, [UserRole.ADMIN, UserRole.STAFF], async (req, user) => {
        // Only admin and staff can delete documents
        await deleteDocument(documentId);

        return NextResponse.json({
          success: true,
          message: 'Documento eliminado exitosamente'
        });
      });
    }

    // Actor token access
    // Verify the document belongs to this actor
    const document = await getDocumentById(documentId);
    if (!document || !isDocumentOwnedByActor(document, auth.actor.id, type)) {
      return NextResponse.json(
        { error: 'Documento no encontrado o no pertenece a este actor' },
        { status: 404 }
      );
    }

    await deleteDocument(documentId);

    return NextResponse.json({
      success: true,
      message: 'Documento eliminado exitosamente'
    });

  } catch (error: any) {
    console.error('Document delete error:', error);
    return NextResponse.json(
      { error: error.message || 'Error al eliminar documento' },
      { status: error.statusCode || 500 }
    );
  }
}


/**
 * Helper to get document by ID
 */
async function getDocumentById(documentId: string) {
  const prisma = (await import('@/lib/prisma')).default;
  return prisma.actorDocument.findUnique({
    where: { id: documentId }
  });
}

/**
 * Helper to check if document belongs to actor
 */
function isDocumentOwnedByActor(document: any, actorId: string, actorType: string) {
  const actorField = `${actorType}Id`;
  // Handle special case for joint-obligor
  const fieldName = actorType === 'joint-obligor' ? 'jointObligorId' : actorField;
  return document[fieldName] === actorId;
}