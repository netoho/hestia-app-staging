import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-config';
import { validationService } from '@/lib/services/validationService';
import prisma from '@/lib/prisma';
import { z } from 'zod';

// Request validation schema
const addNoteSchema = z.object({
  note: z.string().min(1).max(5000),
  actorType: z.string().optional(),
  actorId: z.string().optional(),
  documentId: z.string().optional()
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

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Get policy ID from params
    const { id: policyId } = await context.params;

    // Check if policy exists and user has access
    const policy = await prisma.policy.findUnique({
      where: { id: policyId },
      select: {
        id: true,
        createdById: true
      }
    });

    if (!policy) {
      return NextResponse.json(
        { success: false, message: 'Policy not found' },
        { status: 404 }
      );
    }

    // Check permissions - STAFF/ADMIN can add notes to any policy
    // BROKER can only add notes to their own policies
    if (user.role === 'BROKER' && policy.createdById !== user.id) {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions to add notes to this policy' },
        { status: 403 }
      );
    }

    // Validate request body
    const body = await request.json();
    const validatedData = addNoteSchema.parse(body);

    // If actor or document specified, verify they belong to the policy
    if (validatedData.actorType && validatedData.actorId) {
      const actorBelongs = await verifyActorBelongsToPolicy(
        policyId,
        validatedData.actorType,
        validatedData.actorId
      );
      if (!actorBelongs) {
        return NextResponse.json(
          { success: false, message: 'Actor not found or does not belong to this policy' },
          { status: 404 }
        );
      }
    }

    if (validatedData.documentId) {
      const documentBelongs = await verifyDocumentBelongsToPolicy(
        policyId,
        validatedData.documentId
      );
      if (!documentBelongs) {
        return NextResponse.json(
          { success: false, message: 'Document not found or does not belong to this policy' },
          { status: 404 }
        );
      }
    }

    // Add the note
    const note = await validationService.addReviewNote({
      policyId,
      note: validatedData.note,
      createdBy: user.id,
      actorType: validatedData.actorType,
      actorId: validatedData.actorId,
      documentId: validatedData.documentId
    });

    // Get user info for response
    const noteWithUser = {
      ...note,
      createdByUser: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    };

    return NextResponse.json({
      success: true,
      data: noteWithUser,
      message: 'Note added successfully'
    });

  } catch (error) {
    console.error('Error in add note endpoint:', error);

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
        message: 'An error occurred while adding the note',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch review notes
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

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Get policy ID from params
    const { id: policyId } = await context.params;

    // Check if policy exists and user has access
    const policy = await prisma.policy.findUnique({
      where: { id: policyId },
      select: {
        id: true,
        createdById: true
      }
    });

    if (!policy) {
      return NextResponse.json(
        { success: false, message: 'Policy not found' },
        { status: 404 }
      );
    }

    // Check permissions
    if (user.role === 'BROKER' && policy.createdById !== user.id) {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions to view notes for this policy' },
        { status: 403 }
      );
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const actorType = searchParams.get('actorType');
    const actorId = searchParams.get('actorId');
    const documentId = searchParams.get('documentId');

    // Get notes with filters
    const notes = await validationService.getReviewNotes(policyId, {
      actorType: actorType || undefined,
      actorId: actorId || undefined,
      documentId: documentId || undefined
    });

    return NextResponse.json({
      success: true,
      data: notes
    });

  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while fetching notes',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE endpoint to remove a note (only by creator or admin)
export async function DELETE(
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

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Get policy ID from params
    const { id: policyId } = await context.params;

    // Get note ID from query
    const { searchParams } = new URL(request.url);
    const noteId = searchParams.get('noteId');

    if (!noteId) {
      return NextResponse.json(
        { success: false, message: 'Note ID is required' },
        { status: 400 }
      );
    }

    // Get the note
    const note = await prisma.reviewNote.findUnique({
      where: { id: noteId }
    });

    if (!note || note.policyId !== policyId) {
      return NextResponse.json(
        { success: false, message: 'Note not found' },
        { status: 404 }
      );
    }

    // Check permissions - only creator or admin can delete
    if (note.createdBy !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions to delete this note' },
        { status: 403 }
      );
    }

    // Delete the note
    await prisma.reviewNote.delete({
      where: { id: noteId }
    });

    return NextResponse.json({
      success: true,
      message: 'Note deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting note:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while deleting the note',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper functions
async function verifyActorBelongsToPolicy(
  policyId: string,
  actorType: string,
  actorId: string
): Promise<boolean> {
  switch (actorType) {
    case 'landlord':
      const landlord = await prisma.landlord.findFirst({
        where: { id: actorId, policyId }
      });
      return !!landlord;

    case 'tenant':
      const tenant = await prisma.tenant.findFirst({
        where: { id: actorId, policyId }
      });
      return !!tenant;

    case 'jointObligor':
      const jointObligor = await prisma.jointObligor.findFirst({
        where: { id: actorId, policyId }
      });
      return !!jointObligor;

    case 'aval':
      const aval = await prisma.aval.findFirst({
        where: { id: actorId, policyId }
      });
      return !!aval;

    default:
      return false;
  }
}

async function verifyDocumentBelongsToPolicy(
  policyId: string,
  documentId: string
): Promise<boolean> {
  const document = await prisma.actorDocument.findUnique({
    where: { id: documentId },
    select: {
      landlord: { select: { policyId: true } },
      tenant: { select: { policyId: true } },
      jointObligor: { select: { policyId: true } },
      aval: { select: { policyId: true } }
    }
  });

  if (!document) return false;

  return (
    document.landlord?.policyId === policyId ||
    document.tenant?.policyId === policyId ||
    document.jointObligor?.policyId === policyId ||
    document.aval?.policyId === policyId
  );
}