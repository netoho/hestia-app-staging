import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-config';
import prisma from '@/lib/prisma';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: documentId } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'actor'; // 'actor' or 'policy'

    let document;
    let s3Key: string;
    let s3Bucket: string;
    let fileName: string;

    if (type === 'actor') {
      // Fetch actor document
      document = await prisma.actorDocument.findUnique({
        where: { id: documentId },
        include: {
          landlord: { select: { policyId: true } },
          tenant: { select: { policyId: true } },
          jointObligor: { select: { policyId: true } },
          aval: { select: { policyId: true } },
        },
      });

      if (!document) {
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        );
      }

      // Get policy ID for authorization check
      const policyId =
        document.landlord?.policyId ||
        document.tenant?.policyId ||
        document.jointObligor?.policyId ||
        document.aval?.policyId;

      // Check if user has access to this policy
      if (session.user.role === 'BROKER') {
        const policy = await prisma.policy.findFirst({
          where: {
            id: policyId,
            createdById: session.user.id,
          },
        });

        if (!policy) {
          return NextResponse.json(
            { error: 'Access denied' },
            { status: 403 }
          );
        }
      }

      s3Key = document.s3Key;
      s3Bucket = document.s3Bucket;
      fileName = document.originalName;

    } else if (type === 'policy') {
      // Fetch policy document
      document = await prisma.policyDocument.findUnique({
        where: { id: documentId },
        include: {
          policy: {
            select: {
              createdById: true,
            },
          },
        },
      });

      if (!document) {
        return NextResponse.json(
          { error: 'Document not found' },
          { status: 404 }
        );
      }

      // Check if user has access to this policy
      if (session.user.role === 'BROKER' && document.policy.createdById !== session.user.id) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }

      s3Key = document.s3Key;
      s3Bucket = document.s3Bucket;
      fileName = document.originalName;

    } else {
      return NextResponse.json(
        { error: 'Invalid document type' },
        { status: 400 }
      );
    }

    // Generate signed URL with 30 seconds expiration
    const command = new GetObjectCommand({
      Bucket: s3Bucket,
      Key: s3Key,
      ResponseContentDisposition: `attachment; filename="${encodeURIComponent(fileName)}"`,
    });

    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 30, // 30 seconds
    });

    return NextResponse.json({
      success: true,
      data: {
        downloadUrl: signedUrl,
        fileName: fileName,
        expiresIn: 30,
      }
    });

  } catch (error) {
    console.error('Error generating download URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate download URL' },
      { status: 500 }
    );
  }
}
