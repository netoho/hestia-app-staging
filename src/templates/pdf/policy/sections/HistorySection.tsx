import { View, Text } from '@react-pdf/renderer';
import { styles, pdfColors, SectionTitle } from '../../components';
import type { PDFPolicyData } from '@/lib/pdf/types';

interface HistorySectionProps {
  data: PDFPolicyData;
}

export function HistorySection({ data }: HistorySectionProps) {
  const activities = data.activities;

  if (!activities || activities.length === 0) {
    return (
      <View style={styles.section} break>
        <SectionTitle title="Historial de la Póliza" />
        <View style={styles.emptyState}>
          <Text>No hay eventos registrados</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section} break>
      <SectionTitle title="Historial de la Póliza" />
      <View style={styles.sectionContent}>
        {activities.map((activity, index) => (
          <View
            key={index}
            style={[
              styles.dataRow,
              index % 2 === 1 && styles.dataRowAlt,
              { alignItems: 'flex-start' }
            ]}
          >
            <View style={{ width: '25%' }}>
              <Text style={[styles.bold, { fontSize: 8 }]}>{activity.createdAt}</Text>
            </View>
            <View style={{ width: '25%' }}>
              <Text style={{ fontSize: 8, color: pdfColors.primary }}>{activity.actionLabel}</Text>
            </View>
            <View style={{ width: '50%' }}>
              <Text style={{ fontSize: 8 }}>{activity.description}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
