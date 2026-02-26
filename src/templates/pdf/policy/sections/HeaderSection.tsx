import { View, Text, Image } from '@react-pdf/renderer';
import { styles, pdfColors } from '../../components';
import type { PDFPolicyData } from '@/lib/pdf/types';
import { brandInfo } from '@/lib/config/brand';

interface HeaderSectionProps {
  data: PDFPolicyData;
}

export function HeaderSection({ data }: HeaderSectionProps) {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Text style={styles.companyName}>{brandInfo.name}</Text>
        <Text style={{ fontSize: 7, color: pdfColors.textMuted }}>
          {brandInfo.legalName}
        </Text>
        <Text style={{ fontSize: 7, color: pdfColors.textMuted, marginTop: 2 }}>
          {brandInfo.supportEmail} | {brandInfo.supportPhone}
        </Text>
      </View>
      <View style={styles.headerRight}>
        <Text style={styles.policyNumber}>{data.policyNumber}</Text>
        {data.internalCode && (
          <Text style={styles.internalCode}>Código: {data.internalCode}</Text>
        )}
        <View style={[styles.badge, getStatusBadgeStyle(data.status)]}>
          <Text style={{ color: pdfColors.white, fontSize: 8 }}>{data.statusLabel}</Text>
        </View>
        <Text style={{ fontSize: 7, color: pdfColors.textMuted, marginTop: 5 }}>
          Generado: {data.generatedAt}
        </Text>
      </View>
    </View>
  );
}

function getStatusBadgeStyle(status: string) {
  switch (status) {
    case 'ACTIVE':
      return styles.badgeSuccess;
    case 'EXPIRED':
    case 'CANCELLED':
      return styles.badgeDanger;
    case 'PENDING_APPROVAL':
      return styles.badgeWarning;
    default:
      return styles.badgePrimary;
  }
}
