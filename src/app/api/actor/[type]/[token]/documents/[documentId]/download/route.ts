import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getDocumentDownloadUrl } from '@/lib/services/fileUploadService';

const ALLOWED_ACTOR_TYPES = ['tenant', 'joint-obligor', 'aval'] as const;
type ActorType = typeof ALLOWED_ACTOR_TYPES[number];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ type: string; token: string; documentId: string }> }
) {
  try {
    const { type, token, documentId } = await params;

    // Validate actor type
    if (!ALLOWED_ACTOR_TYPES.includes(type as ActorType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid actor type' },
        { status: 400 }
      );
    }

    // Find the actor by token and verify they own the document
    let actor;
    let document;

    switch (type) {
      case 'tenant':
        actor = await prisma.tenant.findUnique({
          where: { accessToken: token },
          include: {
            documents: {
              where: { id: documentId },
            },
            policy: true,
          },
        });
        document = actor?.documents[0];
        break;
      case 'joint-obligor':
        actor = await prisma.jointObligor.findUnique({
          where: { accessToken: token },
          include: {
            documents: {
              where: { id: documentId },
            },
            policy: true,
          },
        });
        document = actor?.documents[0];
        break;
      case 'aval':
        actor = await prisma.aval.findUnique({
          where: { accessToken: token },
          include: {
            documents: {
              where: { id: documentId },
            },
            policy: true,
          },
        });
        document = actor?.documents[0];
        break;
    }

    if (!actor) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Check token expiry
    if (actor.tokenExpiry && new Date(actor.tokenExpiry) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Token has expired' },
        { status: 401 }
      );
    }

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found or access denied' },
        { status: 404 }
      );
    }

    // Generate signed download URL (30 seconds expiration for security)
    const downloadUrl = await getDocumentDownloadUrl(
      document.s3Key,
      document.originalName,
      30 // 30 seconds expiration
    );

    // Log activity
    await prisma.policyActivity.create({
      data: {
        policyId: actor.policy.id,
        action: 'document_downloaded',
        description: `${type} downloaded ${document.documentType} document`,
        performedByType: type,
        details: {
          documentId,
          fileName: document.originalName,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        downloadUrl,
        fileName: document.originalName,
        expiresIn: 30, // seconds
      },
    });
  } catch (error) {
    console.error('Document download error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate download URL' },
      { status: 500 }
    );
  }
}