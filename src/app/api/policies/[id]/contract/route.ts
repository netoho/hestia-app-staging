import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withRole } from '@/lib/auth/middleware';
import { UserRole, PolicyStatus, ContractStatus } from '@/types/policy';
import { uploadPolicyDocument, getDocumentUrl } from '@/lib/services/fileUploadService';
import { v4 as uuidv4 } from 'uuid';

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
          contract: {
            include: {
              generatedBy: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
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

      // Generate signed URLs for contract documents if they exist
      let contractUrl = null;
      let signedContractUrl = null;

      if (policy.contract?.contractS3Key) {
        contractUrl = await getDocumentUrl(
          policy.contract.contractS3Key,
          `contrato_${policy.policyNumber}.pdf`
        );
      }

      if (policy.contract?.signedContractS3Key) {
        signedContractUrl = await getDocumentUrl(
          policy.contract.signedContractS3Key,
          `contrato_firmado_${policy.policyNumber}.pdf`
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          contract: policy.contract ? {
            ...policy.contract,
            contractUrl,
            signedContractUrl,
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
          contract: true,
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
      if (policy.contract) {
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
          contractNumber: `CON-${policy.policyNumber}`,
          status: ContractStatus.DRAFT,
          template: template || 'standard',
          customClauses: customClauses || [],
          generatedAt: new Date(),
          generatedById: user.id,
          contractS3Key: uploadResult.s3Key!,
        },
        include: {
          generatedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
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
          details: {
            contractNumber: contract.contractNumber,
            template,
            generatedBy: user.email,
          },
          performedBy: user.id,
        },
      });

      // Get signed URL for the contract
      const contractUrl = await getDocumentUrl(
        contract.contractS3Key,
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
      const status = formData.get('status') as ContractStatus;
      const signedFile = formData.get('signedContract') as File | null;

      // Use Prisma
      const contract = await prisma.contract.findUnique({
        where: { policyId: id },
      });

      if (!contract) {
        return NextResponse.json(
          { success: false, error: 'Contract not found' },
          { status: 404 }
        );
      }

      const updateData: any = {
        status,
        updatedAt: new Date(),
      };

      // Handle signed contract upload
      if (status === ContractStatus.SIGNED && signedFile) {
        const buffer = Buffer.from(await signedFile.arrayBuffer());

        const uploadResult = await uploadPolicyDocument(
          {
            buffer,
            originalName: signedFile.name,
            mimeType: signedFile.type,
            size: signedFile.size,
          },
          id,
          contract.contractNumber,
          'SIGNED_CONTRACT',
          user.id,
          2 // Version 2 for signed contract
        );

        if (!uploadResult.success) {
          return NextResponse.json(
            { success: false, error: 'Failed to upload signed contract' },
            { status: 500 }
          );
        }

        updateData.signedAt = new Date();
        updateData.signedContractS3Key = uploadResult.s3Key;

        // Update policy status to active
        await prisma.policy.update({
          where: { id },
          data: { status: PolicyStatus.ACTIVE },
        });

        // Log activity
        await prisma.policyActivity.create({
          data: {
            policyId: id,
            action: 'contract_signed',
            details: {
              contractNumber: contract.contractNumber,
              signedBy: user.email,
            },
            performedBy: user.id,
          },
        });
      } else if (status === ContractStatus.SENT) {
        updateData.sentAt = new Date();

        // Log activity
        await prisma.policyActivity.create({
          data: {
            policyId: id,
            action: 'contract_sent',
            details: {
              contractNumber: contract.contractNumber,
              sentBy: user.email,
            },
            performedBy: user.id,
          },
        });
      }

      // Update contract
      const updatedContract = await prisma.contract.update({
        where: { id: contract.id },
        data: updateData,
      });

      // Get signed URLs if documents exist
      let contractUrl = null;
      let signedContractUrl = null;

      if (updatedContract.contractS3Key) {
        contractUrl = await getDocumentUrl(
          updatedContract.contractS3Key,
          `contrato_${contract.contractNumber}.pdf`
        );
      }

      if (updatedContract.signedContractS3Key) {
        signedContractUrl = await getDocumentUrl(
          updatedContract.signedContractS3Key,
          `contrato_firmado_${contract.contractNumber}.pdf`
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          contract: {
            ...updatedContract,
            contractUrl,
            signedContractUrl,
          },
        },
      });
    } catch (error) {
      console.error('Update contract error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update contract' },
        { status: 500 }
      );
    }
  });
}
