import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ActorType, DocumentCategory } from '@/types/policy';
import { uploadActorDocument } from '@/lib/services/fileUploadService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = params;

    // Prisma database query
    const actorToken = await prisma.actorToken.findUnique({
      where: { token },
      include: {
        policy: {
          select: {
            id: true,
            policyNumber: true,
            propertyAddress: true,
          },
        },
      },
    });

    if (!actorToken) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    if (actorToken.expiresAt < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Token expired' },
        { status: 401 }
      );
    }

    // Get actor data based on type
    let actorData = null;
    if (actorToken.actorType === ActorType.TENANT) {
      actorData = await prisma.tenant.findUnique({
        where: { id: actorToken.actorId },
        include: { documents: true },
      });
    } else if (actorToken.actorType === ActorType.JOINT_OBLIGOR) {
      actorData = await prisma.jointObligor.findUnique({
        where: { id: actorToken.actorId },
        include: { documents: true },
      });
    } else if (actorToken.actorType === ActorType.AVAL) {
      actorData = await prisma.aval.findUnique({
        where: { id: actorToken.actorId },
        include: { documents: true },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        actorType: actorToken.actorType,
        actorId: actorToken.actorId,
        policyNumber: actorToken.policy.policyNumber,
        propertyAddress: actorToken.policy.propertyAddress,
        actor: actorData,
        isUsed: actorToken.usedAt !== null,
      },
    });
  } catch (error) {
    console.error('Get actor error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get actor information' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const formData = await request.formData();

    // Prisma database operations
    const actorToken = await prisma.actorToken.findUnique({
      where: { token },
      include: {
        policy: true,
      },
    });

    if (!actorToken) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    if (actorToken.expiresAt < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Token expired' },
        { status: 401 }
      );
    }

    // Parse form data
    const actorData = JSON.parse(formData.get('data') as string);

    // Handle file uploads
    const uploadResults = [];
    const files = formData.getAll('files') as File[];

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const category = formData.get(`category_${file.name}`) as DocumentCategory;
      const documentType = formData.get(`type_${file.name}`) as string;

      const result = await uploadActorDocument(
        {
          buffer,
          originalName: file.name,
          mimeType: file.type,
          size: file.size,
        },
        actorToken.policy.id,
        actorToken.policy.policyNumber,
        actorToken.actorType as 'tenant' | 'jointObligor' | 'aval',
        actorToken.actorId,
        category,
        documentType,
        'self'
      );

      uploadResults.push(result);
    }

    // Update actor based on type
    let updatedActor = null;
    if (actorToken.actorType === ActorType.TENANT) {
      updatedActor = await prisma.tenant.update({
        where: { id: actorToken.actorId },
        data: {
          ...actorData,
          informationCompletedAt: new Date(),
        },
      });
    } else if (actorToken.actorType === ActorType.JOINT_OBLIGOR) {
      updatedActor = await prisma.jointObligor.update({
        where: { id: actorToken.actorId },
        data: {
          ...actorData,
          informationCompletedAt: new Date(),
        },
      });
    } else if (actorToken.actorType === ActorType.AVAL) {
      updatedActor = await prisma.aval.update({
        where: { id: actorToken.actorId },
        data: {
          ...actorData,
          informationCompletedAt: new Date(),
        },
      });
    }

    // Mark token as used
    await prisma.actorToken.update({
      where: { id: actorToken.id },
      data: { usedAt: new Date() },
    });

    // Check if all actors have completed their information
    const policy = await prisma.policy.findUnique({
      where: { id: actorToken.policy.id },
      include: {
        tenant: true,
        jointObligors: true,
        avals: true,
      },
    });

    const allCompleted =
      policy?.tenant?.informationCompletedAt &&
      policy.jointObligors.every(jo => jo.informationCompletedAt) &&
      policy.avals.every(a => a.informationCompletedAt);

    if (allCompleted) {
      // Update policy status to under investigation
      await prisma.policy.update({
        where: { id: policy.id },
        data: { status: 'UNDER_INVESTIGATION' },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        actor: updatedActor,
        uploads: uploadResults,
      },
    });
  } catch (error) {
    console.error('Update actor error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update actor information' },
      { status: 500 }
    );
  }
}
