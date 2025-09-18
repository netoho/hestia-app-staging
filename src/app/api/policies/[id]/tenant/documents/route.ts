import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { uploadActorDocument } from '@/lib/services/fileUploadService';
import prisma from '@/lib/prisma';
import { DocumentCategory } from '@/types/policy';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: policyId } = await params;

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
        { error: 'Forbidden: Only staff and admin can manage documents' },
        { status: 403 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const category = formData.get('category') as DocumentCategory;
    const documentType = formData.get('documentType') as string;

    if (!file || !category || !documentType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate file
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File size exceeds maximum of ${maxSize / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `File type ${file.type} is not allowed` },
        { status: 400 }
      );
    }

    // Get policy and tenant information
    const policy = await prisma.policy.findUnique({
      where: { id: policyId },
      include: {
        tenant: true
      }
    });

    if (!policy) {
      return NextResponse.json(
        { error: 'Policy not found' },
        { status: 404 }
      );
    }

    if (!policy.tenant) {
      return NextResponse.json(
        { error: 'Tenant not found for this policy' },
        { status: 404 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload document
    const result = await uploadActorDocument(
      {
        buffer,
        originalName: file.name,
        mimeType: file.type,
        size: file.size
      },
      policyId,
      policy.policyNumber,
      'tenant',
      policy.tenant.id,
      category,
      documentType,
      authResult.user.id
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Upload failed' },
        { status: 500 }
      );
    }

    // Log activity
    await prisma.policyActivity.create({
      data: {
        policyId,
        action: 'tenant_document_uploaded',
        description: `Documento de inquilino subido: ${file.name}`,
        details: {
          documentId: result.documentId,
          fileName: file.name,
          category,
          documentType,
          uploadedBy: authResult.user.email
        },
        performedById: authResult.user.id,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
      }
    });

    return NextResponse.json({
      success: true,
      documentId: result.documentId,
      s3Key: result.s3Key
    });

  } catch (error) {
    console.error('Document upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: policyId } = await params;

    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has permission
    if (!['STAFF', 'ADMIN'].includes(authResult.user.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Only staff and admin can view documents' },
        { status: 403 }
      );
    }

    // Get policy and tenant documents
    const policy = await prisma.policy.findUnique({
      where: { id: policyId },
      include: {
        tenant: {
          include: {
            documents: {
              orderBy: {
                createdAt: 'desc'
              }
            }
          }
        }
      }
    });

    if (!policy) {
      return NextResponse.json(
        { error: 'Policy not found' },
        { status: 404 }
      );
    }

    if (!policy.tenant) {
      return NextResponse.json(
        { success: true, documents: [] }
      );
    }

    return NextResponse.json({
      success: true,
      documents: policy.tenant.documents
    });

  } catch (error) {
    console.error('Document list error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}