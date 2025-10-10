import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateLandlordToken } from '@/lib/services/actorTokenService';
import { getStorageProvider } from '@/lib/storage';
import { logPolicyActivity } from '@/lib/services/policyService';
import { DocumentCategory } from '@prisma/client';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const DOCUMENT_CATEGORIES = {
  // Personal/Company identification
  'ine': DocumentCategory.IDENTIFICATION,
  'passport': DocumentCategory.PASSPORT,
  'rfc_document': DocumentCategory.TAX_STATUS_CERTIFICATE,

  // Company documents
  'company_constitution': DocumentCategory.COMPANY_CONSTITUTION,
  'legal_powers': DocumentCategory.LEGAL_POWERS,

  // Property documents
  'property_deed': DocumentCategory.PROPERTY_DEED,
  'property_tax': DocumentCategory.PROPERTY_TAX_STATEMENT,
  'property_registry': DocumentCategory.PROPERTY_REGISTRY,

  // Financial documents
  'bank_statement': DocumentCategory.BANK_STATEMENT,
  'income_proof': DocumentCategory.INCOME_PROOF,
  'tax_return': DocumentCategory.TAX_RETURN,

  // Other
  'other': DocumentCategory.OTHER,
} as const;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Validate token
    const validation = await validateLandlordToken(token);
    if (!validation.valid || !validation.landlord) {
      return NextResponse.json(
        { error: validation.message || 'Token inválido' },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const documentType = formData.get('documentType') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No se proporcionó archivo' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'El archivo excede el tamaño máximo de 10MB' },
        { status: 400 }
      );
    }

    const category = DOCUMENT_CATEGORIES[documentType as keyof typeof DOCUMENT_CATEGORIES] || DocumentCategory.OTHER;

    // Upload to storage
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `landlords/${validation.landlord.id}/${documentType}-${Date.now()}-${file.name}`;

    const storage = getStorageProvider();
    const uploadPath = await storage.upload({
      path: fileName,
      file: {
        buffer,
        mimeType: file.type,
        originalName: file.name,
        size: file.size,
      },
      contentType: file.type,
    });

    // Save document record
    const document = await prisma.actorDocument.create({
      data: {
        landlordId: validation.landlord.id,
        category,
        documentType,
        fileName: file.name,
        originalName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        s3Key: uploadPath,
        s3Bucket: 'documents', // Default bucket name
        s3Region: process.env.AWS_REGION || 'us-east-1',
        uploadedBy: 'self',
      }
    });

    // Log activity
    await logPolicyActivity({
      policyId: validation.landlord.policyId,
      action: 'document_uploaded',
      description: `Documento ${documentType} cargado por el arrendador`,
      performedByActor: 'landlord',
      details: {
        documentId: document.id,
        documentType,
        fileName: file.name
      }
    });

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        documentType: document.documentType,
        fileName: document.fileName,
        uploadedAt: document.createdAt
      }
    });

  } catch (error) {
    console.error('Document upload error:', error);
    return NextResponse.json(
      { error: 'Error al cargar el documento' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Validate token
    const validation = await validateLandlordToken(token);
    if (!validation.valid || !validation.landlord) {
      return NextResponse.json(
        { error: validation.message || 'Token inválido' },
        { status: 400 }
      );
    }

    // Get landlord's documents
    const documents = await prisma.actorDocument.findMany({
      where: {
        landlordId: validation.landlord.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      documents: documents.map(doc => ({
        id: doc.id,
        category: doc.category,
        documentType: doc.documentType,
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        uploadedAt: doc.createdAt,
        verifiedAt: doc.verifiedAt,
        rejectionReason: doc.rejectionReason
      }))
    });

  } catch (error) {
    console.error('Get documents error:', error);
    return NextResponse.json(
      { error: 'Error al obtener documentos' },
      { status: 500 }
    );
  }
}