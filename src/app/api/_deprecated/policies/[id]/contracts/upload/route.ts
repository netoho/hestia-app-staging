import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has permission (staff/admin only)
    if (!['staff', 'admin'].includes(authResult.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { id: policyId } = await params;
    
    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('contract') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF, DOC, and DOCX files are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    // Production mode implementation

    return await prisma.$transaction(async (tx) => {
        // Get the policy
        const policy = await tx.policy.findUnique({
          where: { id: policyId },
          include: {
            contracts: true
          }
        });

        if (!policy) {
          throw new Error('Policy not found');
        }

        // Check if policy can have contract uploaded
        const allowedStatuses = ['APPROVED', 'CONTRACT_PENDING'];
        if (!allowedStatuses.includes(policy.status)) {
          throw new Error('Contract can only be uploaded for policies in APPROVED or CONTRACT_PENDING status');
        }

        // Get next version number
        const nextVersion = policy.contracts.length > 0 
          ? Math.max(...policy.contracts.map(c => c.version)) + 1 
          : 1;

        // Mark all existing contracts as not current
        await tx.contract.updateMany({
          where: { policyId: policyId },
          data: { isCurrent: false }
        });

        // TODO: Upload file to secure storage (Firebase Storage, AWS S3, etc.)
        // For now, we'll use a placeholder S3 key
        const s3Key = `contracts/${policyId}/v${nextVersion}-${Date.now()}.${file.name.split('.').pop()}`;
        const s3Bucket = process.env.AWS_S3_BUCKET || 'hestia-app-contracts';

        // Create new contract record
        const newContract = await tx.contract.create({
          data: {
            policyId: policyId,
            version: nextVersion,
            s3Key: s3Key,
            s3Bucket: s3Bucket,
            s3Region: process.env.AWS_REGION,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            isCurrent: true,
            uploadedBy: authResult.user!.id,
          }
        });

        // Update policy status to CONTRACT_PENDING if not already
        await tx.policy.update({
          where: { id: policyId },
          data: {
            status: 'CONTRACT_PENDING'
          }
        });

        // Add activity log
        await tx.policyActivity.create({
          data: {
            policyId: policyId,
            action: 'contract_uploaded',
            description: 'Contract uploaded',
            details: {
              fileName: file.name,
              fileSize: file.size,
              version: nextVersion,
              uploadedBy: authResult.user!.email
            },
            performedById: authResult.user!.id,
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown'
          }
        });

      return NextResponse.json({
        message: 'Contract uploaded successfully',
        contract: newContract
      });
    });
  } catch (error) {
    console.error('Upload contract error:', error);
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload contract' },
      { status: 500 }
    );
  }
}