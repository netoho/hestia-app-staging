import { View, Text } from '@react-pdf/renderer';
import { styles, pdfColors } from './styles';
import type { PDFDocument } from '@/lib/pdf/types';

interface DocumentListProps {
  documents: PDFDocument[];
  title?: string;
}

export function DocumentList({ documents, title = 'Documentos' }: DocumentListProps) {
  if (!documents || documents.length === 0) {
    return null;
  }

  return (
    <View style={styles.mt5}>
      <Text style={[styles.bold, styles.mb5, { fontSize: 8 }]}>{title} ({documents.length})</Text>
      <View style={styles.list}>
        {documents.map((doc, index) => (
          <View key={index} style={styles.listItem}>
            <Text style={styles.listBullet}>•</Text>
            <Text style={styles.listText}>
              <Text style={{ fontWeight: 'bold' }}>{doc.categoryLabel}:</Text> {doc.fileName}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
