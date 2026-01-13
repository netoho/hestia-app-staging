import { View, Text } from '@react-pdf/renderer';
import { styles, SectionTitle, SubsectionTitle, SimpleTable } from '../../components';
import type { PDFPolicyData, PDFDocument } from '@/lib/pdf/types';

interface DocumentsSectionProps {
  data: PDFPolicyData;
}

export function DocumentsSection({ data }: DocumentsSectionProps) {
  // Collect all documents from all actors
  const allDocuments: { source: string; docs: PDFDocument[] }[] = [];

  // Policy documents
  if (data.documents.length > 0) {
    allDocuments.push({ source: 'Póliza', docs: data.documents });
  }

  // Landlord documents
  data.landlords.forEach((landlord, index) => {
    if (landlord.documents.length > 0) {
      const label = landlord.isPrimary
        ? 'Arrendador Principal'
        : `Arrendador ${index + 1}`;
      allDocuments.push({ source: label, docs: landlord.documents });
    }
  });

  // Tenant documents
  if (data.tenant && data.tenant.documents.length > 0) {
    allDocuments.push({ source: 'Inquilino', docs: data.tenant.documents });
  }

  // Joint obligor documents
  data.jointObligors.forEach((jo, index) => {
    if (jo.documents.length > 0) {
      allDocuments.push({
        source: `Obligado Solidario ${index + 1}`,
        docs: jo.documents,
      });
    }
  });

  // Aval documents
  data.avals.forEach((aval, index) => {
    if (aval.documents.length > 0) {
      allDocuments.push({
        source: `Aval ${index + 1}`,
        docs: aval.documents,
      });
    }
  });

  const totalDocuments = allDocuments.reduce((sum, group) => sum + group.docs.length, 0);

  if (totalDocuments === 0) {
    return (
      <View style={styles.section}>
        <SectionTitle title="Documentos" />
        <View style={styles.emptyState}>
          <Text>No hay documentos cargados</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <SectionTitle title={`Documentos (${totalDocuments})`} />
      <View style={styles.sectionContent}>
        {allDocuments.map((group, groupIndex) => (
          <View key={groupIndex} style={styles.subsection}>
            <SubsectionTitle title={`${group.source} (${group.docs.length})`} />
            <SimpleTable
              headers={['Categoría', 'Archivo', 'Tamaño', 'Fecha']}
              rows={group.docs.map(doc => [
                doc.categoryLabel,
                doc.fileName,
                doc.fileSize,
                doc.uploadedAt,
              ])}
              widths={['25%', '35%', '15%', '25%']}
            />
          </View>
        ))}
      </View>
    </View>
  );
}
