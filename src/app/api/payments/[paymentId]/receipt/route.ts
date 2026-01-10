import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-config';
import prisma from '@/lib/prisma';
import { getStorageProvider } from '@/lib/storage';
import { createSafeS3Key } from '@/lib/utils/filename';
import { nanoid } from 'nanoid';

/**
 * POST /api/payments/[paymentId]/receipt
 * Upload a receipt file for a payment (admin/staff only)
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

    // 2. Get payment with policy info
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { policy: { select: { policyNumber: true } } },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // 3. Parse FormData
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // 4. Convert to Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // 5. Generate S3 path
    const uniqueId = nanoid(8);
    const safeFileName = createSafeS3Key(file.name);
    const s3Key = `payments/${payment.policy.policyNumber}/${paymentId}/${uniqueId}-${safeFileName}`;

    // 6. Upload to S3
    const storage = getStorageProvider();
    await storage.privateUpload({
      path: s3Key,
      file: {
        buffer,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
      },
    });

    // 7. Update payment record
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        receiptS3Key: s3Key,
        receiptFileName: file.name,
      },
    });

    return NextResponse.json({
      success: true,
      s3Key,
      fileName: file.name,
    });
  } catch (error: any) {
    console.error('Receipt upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Error uploading receipt' },
      { status: 500 }
    );
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

    // 2. Get payment
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      select: { receiptS3Key: true, receiptFileName: true },
    });

    if (!payment?.receiptS3Key) {
      return NextResponse.json({ error: 'No receipt found' }, { status: 404 });
    }

    // 3. Generate signed URL
    const storage = getStorageProvider();
    const url = await storage.getSignedUrl({
      path: payment.receiptS3Key,
      action: 'read',
      expiresInSeconds: 300,
      responseDisposition: 'attachment',
      fileName: payment.receiptFileName || undefined,
    });

    return NextResponse.json({
      url,
      fileName: payment.receiptFileName,
    });
  } catch (error: any) {
    console.error('Receipt download error:', error);
    return NextResponse.json(
      { error: error.message || 'Error getting receipt' },
      { status: 500 }
    );
  }
}
