import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth/middleware';
import { UserRole } from '@prisma/client';
import { actorAuthService } from '@/lib/services/ActorAuthService';
import { readFile } from 'fs/promises';
import { join } from 'path';
import prisma from '@/lib/prisma';

/**
 * GET /api/actors/[type]/[identifier]/documents/[documentId]
 * Download a specific document
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; identifier: string; documentId: string }> }
) {
  try {
    const { type, identifier, documentId } = await params;

    // Get document record
    const document = await prisma.document.findUnique({
      where: { id: documentId }
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Documento no encontrado' },
        { status: 404 }
      );
    }

    // Resolve authentication
    const auth = await actorAuthService.resolveActorAuth(type, identifier, request);

    // Verify document belongs to this actor
    const actorField = type === 'joint-obligor' ? 'jointObligorId' : `${type}Id`;
    if ((document as any)[actorField] !== auth.actor.id) {
      return NextResponse.json(
        { error: 'Documento no pertenece a este actor' },
        { status: 403 }
      );
    }

    // For admin access, use withRole middleware
    if (auth.authType === 'admin') {
      return withRole(request, [UserRole.ADMIN, UserRole.STAFF, UserRole.BROKER], async (req, user) => {
        // Additional authorization check for brokers
        if (user.role === UserRole.BROKER) {
          const canAccess = await actorAuthService.canAccessPolicy(user.id, auth.actor.policyId);
          if (!canAccess) {
            return NextResponse.json(
              { error: 'No autorizado para descargar este documento' },
              { status: 403 }
            );
          }
        }

        return serveDocument(document);
      });
    }

    // Actor token access - serve the document
    return serveDocument(document);

  } catch (error: any) {
    console.error('Document download error:', error);
    return NextResponse.json(
      { error: error.message || 'Error al descargar documento' },
      { status: error.statusCode || 500 }
    );
  }
}

/**
 * Helper function to serve document file
 */
async function serveDocument(document: any) {
  try {
    // Construct full file path
    const filePath = join(process.cwd(), document.filePath);

    // Read file
    const fileBuffer = await readFile(filePath);

    // Return file with appropriate headers
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': document.mimeType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${document.fileName}"`,
        'Content-Length': document.fileSize.toString(),
      },
    });
  } catch (error) {
    console.error('Error serving document:', error);
    return NextResponse.json(
      { error: 'Error al leer el archivo' },
      { status: 500 }
    );
  }
}