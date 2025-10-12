/**
 * Admin endpoint for tenant document download
 * Requires authentication and proper permissions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-config';
import prisma from '@/lib/prisma';
import { getDocumentDownloadUrl } from '@/lib/services/fileUploadService';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  try {
    // 1. Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const { id: tenantId, documentId } = await params;

    // 2. Get tenant and verify document ownership
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        documents: {
          where: { id: documentId }
        },
        policy: {
          select: {
            id: true,
            createdById: true
          }
        }
      }
    });

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const userRole = (session.user as any).role || 'BROKER';
    const userId = (session.user as any).id;
    const canView = ['ADMIN', 'STAFF'].includes(userRole) ||
                    tenant.policy.createdById === userId;

    if (!canView) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - You do not have permission' },
        { status: 403 }
      );
    }

    const document = tenant.documents[0];
    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found or access denied' },
        { status: 404 }
      );
    }

    // 3. Generate signed download URL (30 seconds expiration for security)
    const downloadUrl = await getDocumentDownloadUrl(
      document.s3Key,
      document.originalName,
      30 // 30 seconds expiration
    );

    // 4. Log activity
    await prisma.policyActivity.create({
      data: {
        policyId: tenant.policy.id,
        action: 'document_downloaded',
        description: `Admin downloaded ${document.documentType} document for tenant`,
        performedById: userId,
        details: {
          documentId,
          fileName: document.originalName,
          downloadedBy: session.user.email,
          role: userRole
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
    console.error('Admin document download error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate download URL' },
      { status: 500 }
    );
  }
}
