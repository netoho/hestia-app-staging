/**
 * Actor endpoint for document management (token-based authentication)
 *
 * TODO: REFACTOR - This file duplicates logic from /api/admin/actors/[type]/[id]/documents/route.ts
 * The only differences are:
 * 1. Uses token auth instead of session auth
 * 2. Uses access token instead of actor ID
 * 3. Logs actor activity instead of admin activity
 *
 * Consider creating a shared service for document operations to eliminate duplication.
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { uploadActorDocument, validateFile, UploadedFile } from '@/lib/services/fileUploadService';
import { DocumentCategory } from '@prisma/client';

const ALLOWED_ACTOR_TYPES = ['tenant', 'joint-obligor', 'aval', 'landlord'] as const;
type ActorType = typeof ALLOWED_ACTOR_TYPES[number];

// Helper to map snake_case to DocumentCategory enum
function getCategoryFromString(categoryStr: string): DocumentCategory | null {
  // Convert snake_case to UPPER_CASE to match enum
  const upperCategory = categoryStr.toUpperCase();

  // Check if it exists in DocumentCategory enum
  if (upperCategory in DocumentCategory) {
    return DocumentCategory[upperCategory as keyof typeof DocumentCategory];
  }

  return null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ type: string; token: string }> }
) {
  try {
    const { type, token } = await params;

    // Validate actor type
    if (!ALLOWED_ACTOR_TYPES.includes(type as ActorType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid actor type' },
        { status: 400 }
      );
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const documentType = (formData.get('documentType') as string).toLowerCase();
    const category = (formData.get('category') as string).toLowerCase();

    if (!file || !documentType || !category) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate file
    const validation = validateFile(file, {
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
      ],
    });

    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    // Map document category using enum
    const documentCategory = getCategoryFromString(category);
    if (!documentCategory) {
      return NextResponse.json(
        { success: false, error: `Invalid document category: ${category}` },
        { status: 400 }
      );
    }

    // Find the actor by token
    let actor;
    let actorId: string;
    let policyId: string;
    let policyNumber: string;
    let dbActorType: 'tenant' | 'jointObligor' | 'aval' | 'landlord';

    switch (type) {
      case 'tenant':
        actor = await prisma.tenant.findUnique({
          where: { accessToken: token },
          include: { policy: true },
        });
        dbActorType = 'tenant';
        break;
      case 'joint-obligor':
        actor = await prisma.jointObligor.findUnique({
          where: { accessToken: token },
          include: { policy: true },
        });
        dbActorType = 'jointObligor';
        break;
      case 'aval':
        actor = await prisma.aval.findUnique({
          where: { accessToken: token },
          include: { policy: true },
        });
        dbActorType = 'aval';
        break;
      case 'landlord':
        actor = await prisma.landlord.findUnique({
          where: { accessToken: token },
          include: { policy: true },
        });
        dbActorType = 'landlord';
        break;
    }

    if (!actor) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Check token expiry
    if (actor.tokenExpiry && new Date(actor.tokenExpiry) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Token has expired' },
        { status: 401 }
      );
    }

    actorId = actor.id;
    policyId = actor.policy.id;
    policyNumber = actor.policy.policyNumber;

    // Convert File to UploadedFile format
    const arrayBuffer = await file.arrayBuffer();
    const uploadedFile: UploadedFile = {
      buffer: Buffer.from(arrayBuffer),
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
    };

    // Upload the document
    const result = await uploadActorDocument(
      uploadedFile,
      policyId,
      policyNumber,
      dbActorType,
      actorId,
      documentCategory,
      documentType,
      'self' // Uploaded by the actor themselves
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Upload failed' },
        { status: 500 }
      );
    }

    // Log activity
    await prisma.policyActivity.create({
      data: {
        policyId,
        action: 'document_uploaded',
        description: `${type} uploaded ${documentType} document`,
        performedByActor: type,
        details: {
          documentId: result.documentId,
          documentType,
          category,
          fileName: file.name,
        },
      },
    });

    // Fetch the created document to return complete data
    const createdDocument = await prisma.actorDocument.findUnique({
      where: { id: result.documentId },
    });

    if (!createdDocument) {
      return NextResponse.json(
        { success: false, error: 'Document created but not found' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: createdDocument.id,
        category: createdDocument.category,
        documentType: createdDocument.documentType,
        fileName: createdDocument.originalName,
        originalName: createdDocument.originalName,
        fileSize: createdDocument.fileSize,
        mimeType: createdDocument.mimeType,
        createdAt: createdDocument.createdAt,
        verifiedAt: createdDocument.verifiedAt,
        rejectionReason: createdDocument.rejectionReason,
      },
    });
  } catch (error) {
    console.error('Document upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload document' },
      { status: 500 }
    );
  }
}

// GET endpoint to list uploaded documents
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ type: string; token: string }> }
) {
  try {
    const { type, token } = await params;

    // Validate actor type
    if (!ALLOWED_ACTOR_TYPES.includes(type as ActorType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid actor type' },
        { status: 400 }
      );
    }

    // Find the actor by token
    let actor;
    let documents;

    switch (type) {
      case 'tenant':
        actor = await prisma.tenant.findUnique({
          where: { accessToken: token },
          include: { documents: true },
        });
        documents = actor?.documents || [];
        break;
      case 'joint-obligor':
        actor = await prisma.jointObligor.findUnique({
          where: { accessToken: token },
          include: { documents: true },
        });
        documents = actor?.documents || [];
        break;
      case 'aval':
        actor = await prisma.aval.findUnique({
          where: { accessToken: token },
          include: { documents: true },
        });
        documents = actor?.documents || [];
        break;
      case 'landlord':
        actor = await prisma.landlord.findUnique({
          where: { accessToken: token },
          include: { documents: true },
        });
        documents = actor?.documents || [];
        break;
    }

    if (!actor) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Check token expiry
    if (actor.tokenExpiry && new Date(actor.tokenExpiry) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Token has expired' },
        { status: 401 }
      );
    }

    // Format documents for response
    const formattedDocuments = documents.map(doc => ({
      id: doc.id,
      category: doc.category,
      documentType: doc.documentType,
      fileName: doc.originalName,
      fileSize: doc.fileSize,
      createdAt: doc.createdAt,
      verifiedAt: doc.verifiedAt,
      rejectionReason: doc.rejectionReason,
    }));

    return NextResponse.json({
      success: true,
      data: {
        documents: formattedDocuments,
        totalCount: documents.length,
      },
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to remove a document
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ type: string; token: string }> }
) {
  try {
    const { type, token } = await params;
    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json(
        { success: false, error: 'Document ID is required' },
        { status: 400 }
      );
    }

    // Validate actor type
    if (!ALLOWED_ACTOR_TYPES.includes(type as ActorType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid actor type' },
        { status: 400 }
      );
    }

    // Find the actor by token and verify they own the document
    let actor;
    let ownsDocument = false;

    switch (type) {
      case 'tenant':
        actor = await prisma.tenant.findUnique({
          where: { accessToken: token },
          include: {
            documents: {
              where: { id: documentId },
            },
            policy: true,
          },
        });
        ownsDocument = (actor?.documents.length || 0) > 0;
        break;
      case 'joint-obligor':
        actor = await prisma.jointObligor.findUnique({
          where: { accessToken: token },
          include: {
            documents: {
              where: { id: documentId },
            },
            policy: true,
          },
        });
        ownsDocument = (actor?.documents.length || 0) > 0;
        break;
      case 'aval':
        actor = await prisma.aval.findUnique({
          where: { accessToken: token },
          include: {
            documents: {
              where: { id: documentId },
            },
            policy: true,
          },
        });
        ownsDocument = (actor?.documents.length || 0) > 0;
        break;
      case 'landlord':
        actor = await prisma.landlord.findUnique({
          where: { accessToken: token },
          include: {
            documents: {
              where: { id: documentId },
            },
            policy: true,
          },
        });
        ownsDocument = (actor?.documents.length || 0) > 0;
        break;
    }

    if (!actor) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    if (!ownsDocument) {
      return NextResponse.json(
        { success: false, error: 'Document not found or access denied' },
        { status: 404 }
      );
    }

    // Delete the document (the service handles S3 deletion and DB cleanup)
    const { deleteDocument } = await import('@/lib/services/fileUploadService');
    const deleted = await deleteDocument(documentId, true);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete document' },
        { status: 500 }
      );
    }

    // Log activity
    await prisma.policyActivity.create({
      data: {
        policyId: actor.policy.id,
        action: 'document_deleted',
        description: `${type} deleted a document`,
        performedByActor: type,
        details: {
          documentId,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    console.error('Document deletion error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}
