import { NextRequest, NextResponse } from 'next/server';
import { getPolicyByToken, addPolicyActivity } from '@/lib/services/policyApplicationService';
import { uploadFile, validateFile } from '@/lib/services/fileUploadService';
import { PolicyStatus } from '@/lib/prisma-types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Get policy by token
    const policy = await getPolicyByToken(token);

    if (!policy) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 404 }
      );
    }

    // Check if policy is in a valid state for uploads
    if (policy.status !== PolicyStatus.INVESTIGATION_PENDING && 
        policy.status !== PolicyStatus.INVESTIGATION_IN_PROGRESS) {
      return NextResponse.json(
        { error: 'Policy cannot be modified in its current state' },
        { status: 400 }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const category = formData.get('category') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

    if (!['identification', 'income', 'optional'].includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category' },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Validate file
    const validation = validateFile({
      buffer,
      originalName: file.name,
      mimeType: file.type,
      size: file.size
    });

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Upload file
    const document = await uploadFile({
      policyId: policy.id,
      category: category as 'identification' | 'income' | 'optional',
      file: {
        buffer,
        originalName: file.name,
        mimeType: file.type,
        size: file.size
      },
      uploadedBy: 'tenant'
    });

    // Log activity
    await addPolicyActivity(
      policy.id,
      'document_uploaded',
      'tenant',
      { 
        documentId: document.id,
        category,
        fileName: file.name,
        fileSize: file.size
      },
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    );

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        category: document.category,
        originalName: document.originalName,
        fileSize: document.fileSize,
        createdAt: document.createdAt
      }
    });

  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to remove uploaded files
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    // Get policy by token
    const policy = await getPolicyByToken(token);

    if (!policy) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 404 }
      );
    }

    // Check if policy is in a valid state
    if (policy.status !== PolicyStatus.INVESTIGATION_PENDING && 
        policy.status !== PolicyStatus.INVESTIGATION_IN_PROGRESS) {
      return NextResponse.json(
        { error: 'Policy cannot be modified in its current state' },
        { status: 400 }
      );
    }

    // Check if document belongs to this policy
    const document = policy.documents.find(doc => doc.id === documentId);
    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Import deleteFile function
    const { deleteFile } = await import('@/lib/services/fileUploadService');
    
    // Delete the file
    const deleted = await deleteFile(documentId);

    if (deleted) {
      // Log activity
      await addPolicyActivity(
        policy.id,
        'document_deleted',
        'tenant',
        { 
          documentId,
          category: document.category,
          fileName: document.originalName
        },
        request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
      );

      return NextResponse.json({
        success: true,
        message: 'Document deleted successfully'
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to delete document' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Delete document error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}