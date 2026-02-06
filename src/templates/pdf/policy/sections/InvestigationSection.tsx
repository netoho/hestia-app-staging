import { View, Text } from '@react-pdf/renderer';
import { styles, SectionTitle, DataRow } from '../../components';
import type { PDFPolicyData, PDFActorInvestigation } from '@/lib/pdf/types';

interface InvestigationSectionProps {
  data: PDFPolicyData;
}

export function InvestigationSection({ data }: InvestigationSectionProps) {
  const investigations = data.actorInvestigations;

  if (!investigations || investigations.length === 0) {
    return (
      <View style={styles.section} break>
        <SectionTitle title="Investigaciones" />
        <View style={styles.emptyState}>
          <Text>Sin investigaciones</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section} break>
      <SectionTitle title="Investigaciones" />
      <View style={styles.sectionContent}>
        {investigations.map((inv, index) => (
          <InvestigationCard key={index} investigation={inv} />
        ))}
      </View>
    </View>
  );
}

function InvestigationCard({ investigation }: { investigation: PDFActorInvestigation }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>
          {investigation.actorTypeLabel}: {investigation.actorName}
        </Text>
        <View style={[styles.badge, getStatusBadgeStyle(investigation.status)]}>
          <Text>{investigation.statusLabel}</Text>
        </View>
      </View>

      <View style={styles.twoColumn}>
        <View style={styles.column}>
          <DataRow label="Tipo de Actor" value={investigation.actorTypeLabel} />
          <DataRow label="Estado" value={investigation.statusLabel} />
          {investigation.approvedByType && (
            <DataRow label="Aprobado por" value={investigation.approvedByType} />
          )}
        </View>
        <View style={styles.column}>
          {investigation.approvedAt && (
            <DataRow label="Fecha de Aprobación" value={investigation.approvedAt} />
          )}
          <DataRow label="Documentos" value={String(investigation.documentsCount)} />
        </View>
      </View>

      {investigation.findings && (
        <View style={[styles.highlightBox, styles.mt10]}>
          <Text style={[styles.bold, styles.mb5, { fontSize: 8 }]}>Hallazgos</Text>
          <Text style={{ fontSize: 8 }}>{investigation.findings}</Text>
        </View>
      )}

      {investigation.approvalNotes && (
        <View style={[styles.highlightBox, styles.mt10]}>
          <Text style={[styles.bold, styles.mb5, { fontSize: 8 }]}>Notas de Aprobación</Text>
          <Text style={{ fontSize: 8 }}>{investigation.approvalNotes}</Text>
        </View>
      )}

      {investigation.rejectionReason && (
        <View style={[styles.highlightBox, styles.mt10]}>
          <Text style={[styles.bold, styles.mb5, { fontSize: 8 }]}>Motivo de Rechazo</Text>
          <Text style={{ fontSize: 8 }}>{investigation.rejectionReason}</Text>
        </View>
      )}
    </View>
  );
}

function getStatusBadgeStyle(status: string) {
  switch (status) {
    case 'APPROVED':
      return styles.badgeSuccess;
    case 'REJECTED':
      return styles.badgeDanger;
    case 'ARCHIVED':
      return styles.badgeWarning;
    default:
      return styles.badgePrimary;
  }
}
