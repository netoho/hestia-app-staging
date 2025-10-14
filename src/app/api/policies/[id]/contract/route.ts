import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withRole } from '@/lib/auth/middleware';
import { UserRole, PolicyStatus } from '@/types/policy';
import { uploadPolicyDocument, getDocumentUrl } from '@/lib/services/fileUploadService';

// GET contract information
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withRole(request, [UserRole.ADMIN, UserRole.STAFF, UserRole.BROKER], async (req, user) => {
    try {
      const { id } = await params;

      // Use Prisma
      const policy = await prisma.policy.findUnique({
        where: { id },
        include: {
          contracts: {
            where: { isCurrent: true },
            orderBy: { version: 'desc' },
            take: 1,
          },
        },
      });

      if (!policy) {
        return NextResponse.json(
          { success: false, error: 'Policy not found' },
          { status: 404 }
        );
      }

      // Check access for brokers
      if (user.role === UserRole.BROKER && policy.createdById !== user.id) {
        return NextResponse.json(
          { success: false, error: 'Forbidden' },
          { status: 403 }
        );
      }

      // Get current contract
      const currentContract = policy.contracts?.[0] || null;

      // Generate signed URLs for contract documents if they exist
      let contractUrl = null;

      if (currentContract?.s3Key) {
        contractUrl = await getDocumentUrl(
          currentContract.s3Key,
          `contrato_${policy.policyNumber}.pdf`
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          contract: currentContract ? {
            ...currentContract,
            contractUrl,
          } : null,
          policy: {
            id: policy.id,
            policyNumber: policy.policyNumber,
            status: policy.status,
          },
        },
      });
    } catch (error) {
      console.error('Get contract error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to get contract' },
        { status: 500 }
      );
    }
  });
}

// POST generate contract
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withRole(request, [UserRole.ADMIN, UserRole.STAFF], async (req, user) => {
    try {
      const { id } = await params;
      const data = await req.json();
      const { template, customClauses } = data;

      // Use Prisma
      const policy = await prisma.policy.findUnique({
        where: { id },
        include: {
          contracts: {
            where: { isCurrent: true },
          },
          landlord: true,
          tenant: true,
          jointObligors: true,
          avals: true,
        },
      });

      if (!policy) {
        return NextResponse.json(
          { success: false, error: 'Policy not found' },
          { status: 404 }
        );
      }

      // Check if policy is approved
      if (policy.status !== PolicyStatus.APPROVED) {
        return NextResponse.json(
          { success: false, error: 'Policy must be approved before generating contract' },
          { status: 400 }
        );
      }

      // Check if contract already exists
      if (policy.contracts && policy.contracts.length > 0) {
        return NextResponse.json(
          { success: false, error: 'Contract already exists' },
          { status: 400 }
        );
      }

      // TODO: Generate actual PDF contract using a template engine
      // For now, we'll create a placeholder
      const contractBuffer = Buffer.from(`Contract for Policy ${policy.policyNumber}`);

      // Upload contract to S3
      const uploadResult = await uploadPolicyDocument(
        {
          buffer: contractBuffer,
          originalName: `contrato_${policy.policyNumber}.pdf`,
          mimeType: 'application/pdf',
          size: contractBuffer.length,
        },
        policy.id,
        policy.policyNumber,
        'CONTRACT',
        user.id
      );

      if (!uploadResult.success) {
        return NextResponse.json(
          { success: false, error: 'Failed to upload contract' },
          { status: 500 }
        );
      }

      // Create contract record
      const contract = await prisma.contract.create({
        data: {
          policyId: id,
          version: 1,
          fileName: `contrato_${policy.policyNumber}.pdf`,
          fileSize: contractBuffer.length,
          mimeType: 'application/pdf',
          s3Key: uploadResult.s3Key!,
          s3Bucket: process.env.AWS_S3_BUCKET || 'hestia-documents',
          s3Region: process.env.AWS_REGION || 'us-east-1',
          isCurrent: true,
          uploadedBy: user.id,
        },
      });

      // Update policy status
      await prisma.policy.update({
        where: { id },
        data: { status: PolicyStatus.CONTRACT_PENDING },
      });

      // Log activity
      await prisma.policyActivity.create({
        data: {
          policyId: id,
          action: 'contract_generated',
          description: 'Contract generated',
          details: {
            version: contract.version,
            template,
            generatedBy: user.email,
          },
          performedById: user.id,
        },
      });

      // Get signed URL for the contract
      const contractUrl = await getDocumentUrl(
        contract.s3Key,
        `contrato_${policy.policyNumber}.pdf`
      );

      return NextResponse.json({
        success: true,
        data: {
          contract: {
            ...contract,
            contractUrl,
          },
        },
      });
    } catch (error) {
      console.error('Generate contract error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to generate contract' },
        { status: 500 }
      );
    }
  });
}

// PUT update contract status
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withRole(request, [UserRole.ADMIN, UserRole.STAFF], async (req, user) => {
    try {
      const { id } = await params;
      const formData = await request.formData();
      const signedFile = formData.get('signedContract') as File | null;

      // Get current contract
      const currentContract = await prisma.contract.findFirst({
        where: {
          policyId: id,
          isCurrent: true,
        },
      });

      if (!currentContract) {
        return NextResponse.json(
          { success: false, error: 'Contract not found' },
          { status: 404 }
        );
      }

      // Handle signed contract upload
      if (signedFile) {
        const buffer = Buffer.from(await signedFile.arrayBuffer());

        const policy = await prisma.policy.findUnique({ where: { id } });
        if (!policy) {
          return NextResponse.json(
            { success: false, error: 'Policy not found' },
            { status: 404 }
          );
        }

        const uploadResult = await uploadPolicyDocument(
          {
            buffer,
            originalName: signedFile.name,
            mimeType: signedFile.type,
            size: signedFile.size,
          },
          id,
          policy.policyNumber,
          'SIGNED_CONTRACT',
          user.id,
          currentContract.version + 1
        );

        if (!uploadResult.success) {
          return NextResponse.json(
            { success: false, error: 'Failed to upload signed contract' },
            { status: 500 }
          );
        }

        // Mark current contract as not current
        await prisma.contract.update({
          where: { id: currentContract.id },
          data: { isCurrent: false },
        });

        // Create new signed contract version
        const signedContract = await prisma.contract.create({
          data: {
            policyId: id,
            version: currentContract.version + 1,
            fileName: signedFile.name,
            fileSize: signedFile.size,
            mimeType: signedFile.type,
            s3Key: uploadResult.s3Key!,
            s3Bucket: process.env.AWS_S3_BUCKET || 'hestia-documents',
            s3Region: process.env.AWS_REGION || 'us-east-1',
            isCurrent: true,
            signedAt: new Date(),
            signedBy: JSON.stringify([user.email]),
            uploadedBy: user.id,
          },
        });

        // Update policy status to CONTRACT_SIGNED
        await prisma.policy.update({
          where: { id },
          data: { status: PolicyStatus.CONTRACT_SIGNED },
        });

        // Log activity
        await prisma.policyActivity.create({
          data: {
            policyId: id,
            action: 'contract_signed',
            description: 'Contract signed and uploaded',
            details: {
              version: signedContract.version,
              signedBy: user.email,
            },
            performedById: user.id,
          },
        });

        // Get signed URL
        const contractUrl = await getDocumentUrl(
          signedContract.s3Key,
          `contrato_firmado_${policy.policyNumber}.pdf`
        );

        return NextResponse.json({
          success: true,
          data: {
            contract: {
              ...signedContract,
              contractUrl,
            },
          },
        });
      }

      return NextResponse.json(
        { success: false, error: 'No signed contract file provided' },
        { status: 400 }
      );
    } catch (error) {
      console.error('Update contract error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update contract' },
        { status: 500 }
      );
    }
  });
}
