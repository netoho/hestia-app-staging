import { NextRequest, NextResponse } from 'next/server';
import { DocumentCategory } from "@/prisma/generated/prisma-client/enums";
import { actorAuthService } from '@/lib/services/ActorAuthService';
import { uploadActorDocument } from '@/lib/services/fileUploadService';
import type { UploadedFile } from '@/lib/services/fileUploadService';

/**
 * POST /api/actors/[type]/[identifier]/documents
 * Upload a document for an actor
 *
 * This endpoint is kept as REST (not tRPC) to support:
 * - FormData/multipart uploads
 * - XMLHttpRequest progress tracking
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; identifier: string }> }
) {
  try {
    const { type, identifier } = await params;
    const formData = await request.formData();

    // Resolve authentication (supports both admin session and actor token)
    const auth = await actorAuthService.resolveActorAuth(type, identifier, request);

    if (!auth) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Check if editing is allowed for actors
    if (!auth.canEdit && auth.authType === 'actor') {
      return NextResponse.json(
        { error: 'No puede subir documentos después de completar la información' },
        { status: 400 }
      );
    }

    // Extract form data
    const file = formData.get('file') as File;
    const documentType = formData.get('documentType') as string;
    const category = formData.get('category') as string;

    if (!file || !documentType || !category) {
      return NextResponse.json(
        { error: 'Archivo, tipo de documento y categoría son requeridos' },
        { status: 400 }
      );
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

    // Map type for service (joint-obligor → jointObligor)
    const actorType = type === 'joint-obligor' ? 'jointObligor' : type as 'tenant' | 'landlord' | 'jointObligor' | 'aval';

    // Determine uploader
    const uploadedBy = auth.authType === 'admin' ? auth.userId || 'admin' : 'self';

    // Upload document using fileUploadService
    const result = await uploadActorDocument(
      uploadedFile,
      auth.actor.policyId,
      policyNumber,
      actorType,
      auth.actor.id,
      category as DocumentCategory,
      documentType,
      uploadedBy
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
