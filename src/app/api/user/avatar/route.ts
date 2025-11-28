import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getCurrentStorageProvider, getPublicDownloadUrl } from '@/lib/services/fileUploadService';
import { validateInvitationToken } from '@/lib/services/userTokenService';
import prisma from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

// Maximum file size: 20MB
const MAX_FILE_SIZE = 20 * 1024 * 1024;

// Allowed MIME types for avatars
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
];

interface AvatarAuthResult {
  success: boolean;
  userId?: string;
  error?: string;
}

/**
 * Dual auth: session OR onboarding token
 */
async function resolveAvatarAuth(request: NextRequest): Promise<AvatarAuthResult> {
  // First try session auth
  const authResult = await verifyAuth(request);
  if (authResult.success && authResult.user) {
    return { success: true, userId: authResult.user.id };
  }

  // Fallback to onboarding token (from query param or header)
  const url = new URL(request.url);
  const token = url.searchParams.get('token') || request.headers.get('x-onboard-token');

  if (token) {
    const user = await validateInvitationToken(token);
    if (user) {
      return { success: true, userId: user.id };
    }
  }

  return { success: false, error: 'Unauthorized' };
}

// POST: Upload avatar image
export async function POST(request: NextRequest) {
  try {
    // Dual auth
    const auth = await resolveAvatarAuth(request);
    if (!auth.success || !auth.userId) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = auth.userId;
    const currentStorageProvider = getCurrentStorageProvider();

    // Parse the multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'El archivo es muy grande. El tamaño máximo es 20MB' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Tipo de archivo inválido. Solo se permiten JPEG, PNG, HEIC y WebP' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const uniqueId = uuidv4();
    const filename = `${uniqueId}.${fileExtension}`;
    const s3Key = `avatars/${userId}/${filename}`;

    // Convert File to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to S3 (public bucket for avatars)
    const uploadedPath = await currentStorageProvider.publicUpload({
      path: s3Key,
      file: {
        buffer,
        originalName: `${filename}`,
        mimeType: file.type,
        size: file.size,
      },
      contentType: file.type,
      metadata: {
        userId,
        imageType: 'avatar',
      },
    });

    if (!uploadedPath) {
      throw new Error('Failed to upload file to storage');
    }

    // Get the full public URL for the uploaded file
    const uploadedUrl = getPublicDownloadUrl(uploadedPath);

    // Get the old avatar URL to potentially delete it
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });

    // Update user's avatar URL in database
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: uploadedUrl },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
      },
    });

    // Delete old avatar from S3 (if it exists and is an S3 URL)
    if (currentUser?.avatarUrl) {
      try {
        let oldKey: string | null = null;

        if (currentUser.avatarUrl.includes('amazonaws.com')) {
          const url = new URL(currentUser.avatarUrl);
          oldKey = url.pathname.substring(1);
        } else if (currentUser.avatarUrl.startsWith('avatars/')) {
          oldKey = currentUser.avatarUrl;
        }

        if (oldKey && oldKey.startsWith('avatars/')) {
          await currentStorageProvider.delete(oldKey);
        }
      } catch (error) {
        console.error('Failed to delete old avatar:', error);
        // Don't fail the request if deletion fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Avatar uploaded successfully',
      user: updatedUser,
      avatarUrl: uploadedUrl,
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return NextResponse.json(
      { success: false, error: 'Error al subir el avatar' },
      { status: 500 }
    );
  }
}

// DELETE: Remove avatar
export async function DELETE(request: NextRequest) {
  try {
    // Only session auth for delete (not during onboarding)
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = authResult.user.id;
    const currentStorageProvider = getCurrentStorageProvider();

    // Get current avatar URL
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    });

    if (!user?.avatarUrl) {
      return NextResponse.json(
        { success: false, error: 'No hay avatar para eliminar' },
        { status: 404 }
      );
    }

    // Delete from S3
    try {
      let key: string | null = null;

      if (user.avatarUrl.includes('amazonaws.com')) {
        const url = new URL(user.avatarUrl);
        key = url.pathname.substring(1);
      } else if (user.avatarUrl.startsWith('avatars/')) {
        key = user.avatarUrl;
      }

      if (key && key.startsWith('avatars/')) {
        await currentStorageProvider.delete(key);
      }
    } catch (error) {
      console.error('Failed to delete avatar from S3:', error);
      // Continue even if S3 deletion fails
    }

    // Clear avatar URL in database
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: null },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Avatar eliminado correctamente',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error deleting avatar:', error);
    return NextResponse.json(
      { success: false, error: 'Error al eliminar el avatar' },
      { status: 500 }
    );
  }
}
