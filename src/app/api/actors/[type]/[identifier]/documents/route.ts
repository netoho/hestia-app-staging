import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth/middleware';
import { UserRole } from '@prisma/client';
import { actorAuthService } from '@/lib/services/ActorAuthService';
import { uploadDocument, getDocumentsByActor, deleteDocument } from '@/lib/services/documentService';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

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
    const documentType = formData.get('type') as string;

    if (!file || !documentType) {
      return NextResponse.json(
        { error: 'Archivo y tipo de documento son requeridos' },
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

        // Process and save file
        const document = await processAndSaveDocument(
          file,
          documentType,
          auth.actor.id,
          type,
          auth.actor.policyId
        );

        return NextResponse.json({
          success: true,
          message: 'Documento subido exitosamente',
          document
        });
      });
    }

    // Actor token access
    const document = await processAndSaveDocument(
      file,
      documentType,
      auth.actor.id,
      type,
      auth.actor.policyId
    );

    return NextResponse.json({
      success: true,
      message: 'Documento subido exitosamente',
      document
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
 * Helper function to process and save document
 */
async function processAndSaveDocument(
  file: File,
  documentType: string,
  actorId: string,
  actorType: string,
  policyId: string
) {
  // Generate unique filename
  const fileExtension = file.name.split('.').pop();
  const fileName = `${uuidv4()}.${fileExtension}`;

  // Create directory if it doesn't exist
  const uploadDir = join(process.cwd(), 'uploads', policyId, actorType, actorId);
  await mkdir(uploadDir, { recursive: true });

  // Save file to disk
  const filePath = join(uploadDir, fileName);
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  await writeFile(filePath, buffer);

  // Save document record to database
  const document = await uploadDocument({
    type: documentType,
    fileName: file.name,
    filePath: filePath.replace(process.cwd(), ''), // Store relative path
    fileSize: file.size,
    mimeType: file.type,
    policyId,
    [`${actorType}Id`]: actorId // Dynamic field based on actor type
  });

  return document;
}

/**
 * Helper to get document by ID
 */
async function getDocumentById(documentId: string) {
  const prisma = (await import('@/lib/prisma')).default;
  return prisma.document.findUnique({
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