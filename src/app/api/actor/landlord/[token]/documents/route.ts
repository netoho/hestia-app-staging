import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateLandlordToken } from '@/lib/services/actorTokenService';
import { getStorageProvider } from '@/lib/storage';
import { logPolicyActivity } from '@/lib/services/policyService';
import { DocumentCategory } from '@prisma/client';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const DOCUMENT_CATEGORIES = {
  'identification': DocumentCategory.IDENTIFICATION,
  'ine': DocumentCategory.IDENTIFICATION,
  'passport': DocumentCategory.PASSPORT,
  'proof_of_income': DocumentCategory.INCOME_PROOF,
  'proof_of_address': DocumentCategory.ADDRESS_PROOF,
  'bank_statement': DocumentCategory.BANK_STATEMENT,
  'property_deed': DocumentCategory.PROPERTY_DEED,
  'property_tax': DocumentCategory.PROPERTY_TAX_STATEMENT,
  'marriage_certificate': DocumentCategory.MARRIAGE_CERTIFICATE,
  'tax_return': DocumentCategory.TAX_RETURN,
  'company_constitution': DocumentCategory.COMPANY_CONSTITUTION,
  'legal_powers': DocumentCategory.LEGAL_POWERS,
  'income_proof': DocumentCategory.INCOME_PROOF,
  'address_proof': DocumentCategory.ADDRESS_PROOF,
  'employment_letter': DocumentCategory.EMPLOYMENT_LETTER,
  'property_tax_statement': DocumentCategory.PROPERTY_TAX_STATEMENT,
  'tax_status_certificate': DocumentCategory.TAX_STATUS_CERTIFICATE,
  'credit_report': DocumentCategory.CREDIT_REPORT,
  'property_registry': DocumentCategory.PROPERTY_REGISTRY,
  'property_appraisal': DocumentCategory.PROPERTY_APPRAISAL,
  'immigration_document': DocumentCategory.IMMIGRATION_DOCUMENT,
  'utility_bill': DocumentCategory.UTILITY_BILL,
  'payroll_receipt': DocumentCategory.PAYROLL_RECEIPT,
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

    const category = DOCUMENT_CATEGORIES[documentType.toLowerCase()] || DocumentCategory.OTHER;

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
      performedByType: 'landlord',
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
        category: document.category,
        documentType: document.documentType,
        fileName: document.fileName,
        originalName: document.originalName,
        fileSize: document.fileSize,
        mimeType: document.mimeType,
        createdAt: document.createdAt
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
      success: true,
      data: {
        documents: documents.map(doc => ({
          id: doc.id,
          category: doc.category,
          documentType: doc.documentType,
          fileName: doc.fileName,
          originalName: doc.originalName,
          fileSize: doc.fileSize,
          mimeType: doc.mimeType,
          createdAt: doc.createdAt,
          verifiedAt: doc.verifiedAt,
          rejectionReason: doc.rejectionReason
        }))
      }
    });

  } catch (error) {
    console.error('Get documents error:', error);
    return NextResponse.json(
      { error: 'Error al obtener documentos' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    // Validate landlord token
    const validation = await validateLandlordToken(token);
    if (!validation.valid || !validation.landlord) {
      return NextResponse.json(
        { error: validation.message || 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Find the document and verify it belongs to this landlord
    const document = await prisma.actorDocument.findFirst({
      where: {
        id: documentId,
        landlordId: validation.landlord.id,
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found or access denied' },
        { status: 404 }
      );
    }

    // Delete from S3
    const storage = getStorageProvider();
    await storage.delete(document.s3Key);

    // Delete from database
    await prisma.actorDocument.delete({
      where: { id: documentId },
    });

    // Log activity
    await logPolicyActivity({
      policyId: validation.landlord.policyId,
      action: 'document_deleted',
      description: `Landlord deleted ${document.documentType} document`,
      performedByType: 'landlord',
      details: {
        documentId,
        fileName: document.originalName,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    console.error('Document deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}
