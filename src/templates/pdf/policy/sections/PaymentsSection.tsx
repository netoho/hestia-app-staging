import { View, Text } from '@react-pdf/renderer';
import { styles, SectionTitle, SimpleTable } from '../../components';
import type { PDFPolicyData } from '@/lib/pdf/types';

interface PaymentsSectionProps {
  data: PDFPolicyData;
}

export function PaymentsSection({ data }: PaymentsSectionProps) {
  const payments = data.payments;

  if (!payments || payments.length === 0) {
    return (
      <View style={styles.section}>
        <SectionTitle title="Pagos" />
        <View style={styles.emptyState}>
          <Text>No hay pagos registrados</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <SectionTitle title="Pagos" />
      <View style={styles.sectionContent}>
        <SimpleTable
          headers={['Fecha', 'Monto', 'Estado', 'Método', 'Pagado por']}
          rows={payments.map(payment => [
            payment.date,
            payment.amount,
            payment.statusLabel,
            payment.method || '-',
            payment.paidBy || '-',
          ])}
          widths={['20%', '20%', '20%', '20%', '20%']}
        />
      </View>
    </View>
  );
}
