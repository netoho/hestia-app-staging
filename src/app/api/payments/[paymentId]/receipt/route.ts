import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-config';
import prisma from '@/lib/prisma';
import { documentService } from '@/lib/services/documentService';
import { createSafeS3Key } from '@/lib/utils/filename';
import { nanoid } from 'nanoid';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
];

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

/**
 * POST /api/payments/[paymentId]/receipt
 * Get presigned URL for uploading a receipt (admin/staff only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    // 1. Auth check (admin/staff only)
    const session = await getServerSession(authOptions);
    if (!session?.user || !['ADMIN', 'STAFF'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { paymentId } = await params;

    // 2. Parse JSON body
    const { fileName, contentType, fileSize } = await request.json();

    if (!fileName || !contentType || !fileSize) {
      return NextResponse.json(
        { error: 'Missing required fields: fileName, contentType, fileSize' },
        { status: 400 }
      );
    }

    // 3. Get payment with policy info
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { policy: { select: { policyNumber: true } } },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // 4. Validate file type
    if (!ALLOWED_MIME_TYPES.includes(contentType)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: PDF, PNG, JPG' },
        { status: 400 }
      );
    }

    // 5. Validate file size
    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size: 20MB' },
        { status: 400 }
      );
    }

    // 6. Generate S3 path
    const uniqueId = nanoid(8);
    const safeFileName = createSafeS3Key(fileName);
    const s3Key = `payments/${payment.policy.policyNumber}/${paymentId}/${uniqueId}-${safeFileName}`;

    // 7. Get presigned upload URL
    const uploadUrl = await documentService.getUploadUrl(s3Key, 300);

    return NextResponse.json({
      uploadUrl,
      s3Key,
      fileName,
      expiresIn: 300,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error getting upload URL';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PUT /api/payments/[paymentId]/receipt
 * Confirm receipt upload completed and update payment record (admin/staff only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    // 1. Auth check (admin/staff only)
    const session = await getServerSession(authOptions);
    if (!session?.user || !['ADMIN', 'STAFF'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { paymentId } = await params;

    // 2. Parse JSON body
    const { s3Key, fileName } = await request.json();

    if (!s3Key || !fileName) {
      return NextResponse.json(
        { error: 'Missing required fields: s3Key, fileName' },
        { status: 400 }
      );
    }

    // 3. Verify payment exists
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // 4. Verify file exists in S3
    const exists = await documentService.fileExists(s3Key);
    if (!exists) {
      return NextResponse.json(
        { error: 'File not found in storage. Upload may have failed.' },
        { status: 400 }
      );
    }

    // 5. Update payment record
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        receiptS3Key: s3Key,
        receiptFileName: fileName,
      },
    });

    return NextResponse.json({
      success: true,
      s3Key,
      fileName,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error confirming upload';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/payments/[paymentId]/receipt
 * Get signed URL for downloading receipt
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    // 1. Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { paymentId } = await params;

    // 2. Get payment with policy info for authorization
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        receiptS3Key: true,
        receiptFileName: true,
        paidBy: true,
        policy: {
          select: {
            createdById: true,
            managedById: true,
            tenant: { select: { id: true } },
            landlords: { select: { id: true } },
          },
        },
      },
    });

    if (!payment?.receiptS3Key) {
      return NextResponse.json({ error: 'No receipt found' }, { status: 404 });
    }

    // 3. Authorization check - admin/staff can access all, others need policy access
    const userRole = session.user.role;
    const userId = session.user.id;
    const isStaffOrAdmin = ['ADMIN', 'STAFF'].includes(userRole);

    if (!isStaffOrAdmin) {
      const isCreator = payment.policy.createdById === userId;
      const isManager = payment.policy.managedById === userId;
      const isTenant = payment.policy.tenant?.id === userId;
      const isLandlord = payment.policy.landlords.some(l => l.id === userId);

      // Must be associated with policy
      if (!isCreator && !isManager && !isTenant && !isLandlord) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      // Additionally, must be the payer (tenant can't download landlord receipts)
      const isPayer = (payment.paidBy === 'TENANT' && isTenant) ||
                      (payment.paidBy === 'LANDLORD' && isLandlord);
      if (!isCreator && !isManager && !isPayer) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // 4. Generate signed URL using documentService
    const url = await documentService.getDownloadUrl(
      payment.receiptS3Key,
      payment.receiptFileName || undefined,
      300
    );

    return NextResponse.json({
      url,
      fileName: payment.receiptFileName,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error getting receipt';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
