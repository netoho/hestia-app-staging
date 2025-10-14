/**
 * Admin endpoint for aval document management
 * Requires authentication and proper permissions
 *
 * TODO: REFACTOR - This file duplicates logic from /api/actor/[type]/[token]/documents/route.ts
 * The only differences are:
 * 1. Uses session auth instead of token auth
 * 2. Uses actor ID instead of access token
 * 3. Logs admin activity instead of actor activity
 *
 * Consider creating a shared service for document operations to eliminate duplication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-config';
import prisma from '@/lib/prisma';
import { uploadActorDocument, validateFile, UploadedFile, deleteDocument as deleteDocumentService } from '@/lib/services/fileUploadService';
import { DocumentCategory } from '@/types/policy';

// Helper to map snake_case to DocumentCategory enum
function getCategoryFromString(categoryStr: string): DocumentCategory | null {
  const upperCategory = categoryStr.toUpperCase();
  if (upperCategory in DocumentCategory) {
    return DocumentCategory[upperCategory as keyof typeof DocumentCategory];
  }
  return null;
}

// POST - Upload document
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const { id: avalId } = await params;

    // 2. Get aval and check permissions
    const aval = await prisma.aval.findUnique({
      where: { id: avalId },
      include: {
        policy: {
          select: {
            id: true,
            createdById: true,
            policyNumber: true
          }
        }
      }
    });

    if (!aval) {
      return NextResponse.json(
        { success: false, error: 'Aval not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const userRole = (session.user as any).role || 'BROKER';
    const userId = (session.user as any).id;
    const canEdit = ['ADMIN', 'STAFF'].includes(userRole) ||
                    aval.policy.createdById === userId;

    if (!canEdit) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - You do not have permission' },
        { status: 403 }
      );
    }

    // 3. Parse and validate form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const documentType = (formData.get('documentType') as string)?.toLowerCase();
    const category = (formData.get('category') as string)?.toLowerCase();

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

    // Map document category
    const documentCategory = getCategoryFromString(category);
    if (!documentCategory) {
      return NextResponse.json(
        { success: false, error: `Invalid document category: ${category}` },
        { status: 400 }
      );
    }

    // 4. Upload document
    const arrayBuffer = await file.arrayBuffer();
    const uploadedFile: UploadedFile = {
      buffer: Buffer.from(arrayBuffer),
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
    };

    const result = await uploadActorDocument(
      uploadedFile,
      aval.policy.id,
      aval.policy.policyNumber,
      'aval',
      avalId,
      documentCategory,
      documentType,
      'admin'
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Upload failed' },
        { status: 500 }
      );
    }

    // 5. Log activity
    await prisma.policyActivity.create({
      data: {
        policyId: aval.policy.id,
        action: 'document_uploaded',
        description: `Admin uploaded ${documentType} document for aval`,
        performedById: userId,
        details: {
          documentId: result.documentId,
          documentType,
          category,
          fileName: file.name,
          uploadedBy: session.user.email,
          role: userRole
        },
      },
    });

    // 6. Return created document
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
    console.error('Admin document upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload document' },
      { status: 500 }
    );
  }
}

// GET - List documents
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const { id: avalId } = await params;

    // 2. Get aval and check permissions
    const aval = await prisma.aval.findUnique({
      where: { id: avalId },
      include: {
        documents: true,
        policy: {
          select: {
            id: true,
            createdById: true
          }
        }
      }
    });

    if (!aval) {
      return NextResponse.json(
        { success: false, error: 'Aval not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const userRole = (session.user as any).role || 'BROKER';
    const userId = (session.user as any).id;
    const canView = ['ADMIN', 'STAFF'].includes(userRole) ||
                    aval.policy.createdById === userId;

    if (!canView) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - You do not have permission' },
        { status: 403 }
      );
    }

    // 3. Format and return documents
    const formattedDocuments = aval.documents.map(doc => ({
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
        totalCount: aval.documents.length,
      },
    });
  } catch (error) {
    console.error('Error fetching aval documents:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

// DELETE - Remove document
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const { id: avalId } = await params;
    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json(
        { success: false, error: 'Document ID is required' },
        { status: 400 }
      );
    }

    // 2. Get aval and verify document ownership
    const aval = await prisma.aval.findUnique({
      where: { id: avalId },
      include: {
        documents: {
          where: { id: documentId }
        },
        policy: {
          select: {
            id: true,
            createdById: true
          }
        }
      }
    });

    if (!aval) {
      return NextResponse.json(
        { success: false, error: 'Aval not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const userRole = (session.user as any).role || 'BROKER';
    const userId = (session.user as any).id;
    const canDelete = ['ADMIN', 'STAFF'].includes(userRole) ||
                      aval.policy.createdById === userId;

    if (!canDelete) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - You do not have permission' },
        { status: 403 }
      );
    }

    if (aval.documents.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    // 3. Delete document
    const deleted = await deleteDocumentService(documentId, true);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete document' },
        { status: 500 }
      );
    }

    // 4. Log activity
    await prisma.policyActivity.create({
      data: {
        policyId: aval.policy.id,
        action: 'document_deleted',
        description: `Admin deleted aval document`,
        performedById: userId,
        details: {
          documentId,
          deletedBy: session.user.email,
          role: userRole
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    console.error('Admin document deletion error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}
