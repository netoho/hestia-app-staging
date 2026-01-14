import { View, Text } from '@react-pdf/renderer';
import { styles, pdfColors, SectionTitle, DataRow } from '../../components';
import type { PDFPolicyData } from '@/lib/pdf/types';

interface InvestigationSectionProps {
  data: PDFPolicyData;
}

export function InvestigationSection({ data }: InvestigationSectionProps) {
  const investigation = data.investigation;

  if (!investigation || !investigation.verdict) {
    return (
      <View style={styles.section} break>
        <SectionTitle title="Investigación" />
        <View style={styles.emptyState}>
          <Text>Investigación pendiente</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section} break>
      <SectionTitle title="Investigación" />
      <View style={styles.sectionContent}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Resultado de la Investigación</Text>
            <View style={[styles.badge, getVerdictBadgeStyle(investigation.verdict)]}>
              <Text>{investigation.verdictLabel}</Text>
            </View>
          </View>

          <View style={styles.twoColumn}>
            <View style={styles.column}>
              <DataRow label="Veredicto" value={investigation.verdictLabel} />
              <DataRow label="Nivel de Riesgo" value={investigation.riskLevelLabel} />
            </View>
            <View style={styles.column}>
              <DataRow label="Puntuación" value={investigation.score ? String(investigation.score) : null} />
            </View>
          </View>

          {investigation.notes && (
            <View style={[styles.highlightBox, styles.mt10]}>
              <Text style={[styles.bold, styles.mb5, { fontSize: 8 }]}>Notas</Text>
              <Text style={{ fontSize: 8 }}>{investigation.notes}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

function getVerdictBadgeStyle(verdict: string | null) {
  switch (verdict) {
    case 'APPROVED':
      return styles.badgeSuccess;
    case 'REJECTED':
      return styles.badgeDanger;
    case 'HIGH_RISK':
      return styles.badgeDanger;
    case 'CONDITIONAL':
      return styles.badgeWarning;
    default:
      return styles.badgePrimary;
  }
}
