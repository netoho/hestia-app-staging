import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-config';
import { validationService } from '@/lib/services/validationService';
import prisma from '@/lib/prisma';
import { z } from 'zod';

// Request validation schema
const validateDocumentSchema = z.object({
  documentId: z.string().min(1),
  status: z.enum(['APPROVED', 'REJECTED', 'IN_REVIEW']),
  rejectionReason: z.string().optional()
});

const batchValidateSchema = z.object({
  documents: z.array(validateDocumentSchema)
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Get session and check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user and check role
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user || !['STAFF', 'ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Get policy ID from params
    const { id: policyId } = await context.params;

    // Check if policy exists
    const policy = await prisma.policy.findUnique({
      where: { id: policyId },
      select: {
        id: true,
        status: true
      }
    });

    if (!policy) {
      return NextResponse.json(
        { success: false, message: 'Policy not found' },
        { status: 404 }
      );
    }

    // Check policy status - should be in a reviewable state
    const reviewableStatuses = ['COLLECTING_INFO', 'UNDER_INVESTIGATION', 'PENDING_APPROVAL'];
    if (!reviewableStatuses.includes(policy.status)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Policy is not in a reviewable status',
          currentStatus: policy.status
        },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Get client IP for logging
    const ipAddress = request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-real-ip') ||
                     'unknown';

    // Check if batch validation
    const isBatch = body.documents && Array.isArray(body.documents);

    if (isBatch) {
      // Batch validation
      const validatedData = batchValidateSchema.parse(body);
      const results = [];

      for (const doc of validatedData.documents) {
        // Verify document belongs to policy
        const documentCheck = await verifyDocumentBelongsToPolicy(policyId, doc.documentId);
        if (!documentCheck.belongsToPolicy) {
          results.push({
            documentId: doc.documentId,
            success: false,
            error: 'Document not found or does not belong to this policy'
          });
          continue;
        }

        try {
          const result = await validationService.validateDocument({
            policyId,
            documentId: doc.documentId,
            status: doc.status as any,
            rejectionReason: doc.rejectionReason,
            validatedBy: user.id,
            actorType: documentCheck.actorType as any,
            actorId: documentCheck.actorId,
            ipAddress
          });

          results.push({
            documentId: doc.documentId,
            success: true,
            data: result
          });
        } catch (error) {
          results.push({
            documentId: doc.documentId,
            success: false,
            error: error instanceof Error ? error.message : 'Validation failed'
          });
        }
      }

      return NextResponse.json({
        success: true,
        batch: true,
        results,
        message: `Processed ${results.length} document validations`
      });

    } else {
      // Single validation
      const validatedData = validateDocumentSchema.parse(body);

      // Verify document belongs to policy
      const documentCheck = await verifyDocumentBelongsToPolicy(policyId, validatedData.documentId);
      if (!documentCheck.belongsToPolicy) {
        return NextResponse.json(
          {
            success: false,
            message: 'Document not found or does not belong to this policy'
          },
          { status: 404 }
        );
      }

      // Perform the validation
      const result = await validationService.validateDocument({
        policyId,
        documentId: validatedData.documentId,
        status: validatedData.status as any,
        rejectionReason: validatedData.rejectionReason,
        validatedBy: user.id,
        actorType: documentCheck.actorType as any,
        actorId: documentCheck.actorId,
        ipAddress
      });

      return NextResponse.json({
        success: true,
        data: result,
        message: `Document ${validatedData.status.toLowerCase()}`
      });
    }

  } catch (error) {
    console.error('Error in validate-document endpoint:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid request data',
          errors: error.errors
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while validating the document',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper function to verify document belongs to policy and get actor info
async function verifyDocumentBelongsToPolicy(
  policyId: string,
  documentId: string
): Promise<{ belongsToPolicy: boolean; actorType?: string; actorId?: string }> {
  // Get document with actor associations
  const document = await prisma.actorDocument.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      landlordId: true,
      tenantId: true,
      jointObligorId: true,
      avalId: true,
      landlord: { select: { policyId: true } },
      tenant: { select: { policyId: true } },
      jointObligor: { select: { policyId: true } },
      aval: { select: { policyId: true } }
    }
  });

  if (!document) {
    return { belongsToPolicy: false };
  }

  // Check which actor type and verify policy match
  if (document.landlordId && document.landlord?.policyId === policyId) {
    return {
      belongsToPolicy: true,
      actorType: 'landlord',
      actorId: document.landlordId
    };
  }

  if (document.tenantId && document.tenant?.policyId === policyId) {
    return {
      belongsToPolicy: true,
      actorType: 'tenant',
      actorId: document.tenantId
    };
  }

  if (document.jointObligorId && document.jointObligor?.policyId === policyId) {
    return {
      belongsToPolicy: true,
      actorType: 'jointObligor',
      actorId: document.jointObligorId
    };
  }

  if (document.avalId && document.aval?.policyId === policyId) {
    return {
      belongsToPolicy: true,
      actorType: 'aval',
      actorId: document.avalId
    };
  }

  return { belongsToPolicy: false };
}

// GET endpoint to fetch document validation status
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Get session and check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user and check role
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user || !['STAFF', 'ADMIN', 'BROKER'].includes(user.role)) {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Get policy ID from params
    const { id: policyId } = await context.params;

    // Get all documents for this policy
    const policy = await prisma.policy.findUnique({
      where: { id: policyId },
      select: {
        landlords: {
          select: {
            documents: {
              select: { id: true }
            }
          }
        },
        tenant: {
          select: {
            documents: {
              select: { id: true }
            }
          }
        },
        jointObligors: {
          select: {
            documents: {
              select: { id: true }
            }
          }
        },
        avals: {
          select: {
            documents: {
              select: { id: true }
            }
          }
        }
      }
    });

    if (!policy) {
      return NextResponse.json(
        { success: false, message: 'Policy not found' },
        { status: 404 }
      );
    }

    // Collect all document IDs
    const documentIds: string[] = [];
    policy.landlords?.forEach(l =>
      l.documents.forEach(d => documentIds.push(d.id))
    );
    policy.tenant?.documents.forEach(d => documentIds.push(d.id));
    policy.jointObligors?.forEach(jo =>
      jo.documents.forEach(d => documentIds.push(d.id))
    );
    policy.avals?.forEach(a =>
      a.documents.forEach(d => documentIds.push(d.id))
    );

    // Get document validations
    const validations = await prisma.documentValidation.findMany({
      where: {
        documentId: { in: documentIds }
      },
      orderBy: { updatedAt: 'desc' }
    });

    // Get validator names
    const validatorIds = [...new Set(validations.map(v => v.validatedBy).filter(Boolean))];
    const validators = await prisma.user.findMany({
      where: { id: { in: validatorIds as string[] } },
      select: { id: true, name: true, email: true }
    });
    const validatorMap = new Map(validators.map(v => [v.id, v]));

    // Get document details
    const documents = await prisma.actorDocument.findMany({
      where: { id: { in: documentIds } },
      select: {
        id: true,
        fileName: true,
        documentType: true,
        category: true,
        uploadedAt: true,
        landlordId: true,
        tenantId: true,
        jointObligorId: true,
        avalId: true
      }
    });

    // Create validation map
    const validationMap = new Map(validations.map(v => [v.documentId, v]));

    // Enhance documents with validation info
    const enhancedDocuments = documents.map(doc => {
      const validation = validationMap.get(doc.id);
      return {
        ...doc,
        validation: validation ? {
          status: validation.status,
          validatedBy: validation.validatedBy,
          validatedAt: validation.validatedAt,
          rejectionReason: validation.rejectionReason,
          validator: validation.validatedBy ? validatorMap.get(validation.validatedBy) : null
        } : null
      };
    });

    return NextResponse.json({
      success: true,
      data: enhancedDocuments
    });

  } catch (error) {
    console.error('Error fetching document validations:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while fetching validations',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}