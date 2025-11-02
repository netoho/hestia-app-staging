import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { currentStorageProvider, getPublicDownloadUrl } from '@/lib/services/fileUploadService';
import { createSafeS3Key } from '@/lib/utils/filename';
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

// POST: Upload avatar image
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = authResult.user.id;

    // Parse the multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fileType = formData.get('fileType') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(fileType)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, HEIC and WebP are allowed' },
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

    // Upload to S3
    const uploadedPath = await currentStorageProvider.publicUpload({
      path: s3Key,
      file: {
        buffer,
        originalName: `${filename}.${fileExtension}`,
        mimeType: fileType,
        size: file.size,
      },
      contentType: fileType,
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
      select: { image: true },
    });

    // Update user's avatar URL in database
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { image: uploadedUrl },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    });

    // Optionally delete old avatar from S3 (if it exists and is an S3 URL)
    if (currentUser?.image) {
      try {
        let oldKey: string | null = null;

        // Check if it's a full URL or just a path
        if (currentUser.image.includes('amazonaws.com')) {
          // It's a full URL, extract the key
          const url = new URL(currentUser.image);
          oldKey = url.pathname.substring(1); // Remove leading slash
        } else if (currentUser.image.startsWith('avatars/')) {
          // It's already just the S3 key
          oldKey = currentUser.image;
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
      message: 'Avatar uploaded successfully',
      user: updatedUser,
      avatarUrl: uploadedUrl,
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return NextResponse.json(
      { error: 'Failed to upload avatar' },
      { status: 500 }
    );
  }
}

// GET: Get current user's avatar URL
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: authResult.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      avatarUrl: user.image,
      user,
    });
  } catch (error) {
    console.error('Error fetching avatar:', error);
    return NextResponse.json(
      { error: 'Failed to fetch avatar' },
      { status: 500 }
    );
  }
}

// DELETE: Remove avatar
export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = authResult.user.id;

    // Get current avatar URL
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { image: true },
    });

    if (!user?.image) {
      return NextResponse.json(
        { error: 'No avatar to delete' },
        { status: 404 }
      );
    }

    // Delete from S3
    try {
      let key: string | null = null;

      // Check if it's a full URL or just a path
      if (user.image.includes('amazonaws.com')) {
        // It's a full URL, extract the key
        const url = new URL(user.image);
        key = url.pathname.substring(1); // Remove leading slash
      } else if (user.image.startsWith('avatars/')) {
        // It's already just the S3 key
        key = user.image;
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
      data: { image: null },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    });

    return NextResponse.json({
      message: 'Avatar deleted successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error deleting avatar:', error);
    return NextResponse.json(
      { error: 'Failed to delete avatar' },
      { status: 500 }
    );
  }
}
