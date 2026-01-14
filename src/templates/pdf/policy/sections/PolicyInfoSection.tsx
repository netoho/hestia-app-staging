import { View, Text } from '@react-pdf/renderer';
import { styles, SectionTitle, DataRow, DataRowBoolean } from '../../components';
import type { PDFPolicyData } from '@/lib/pdf/types';

interface PolicyInfoSectionProps {
  data: PDFPolicyData;
}

export function PolicyInfoSection({ data }: PolicyInfoSectionProps) {
  return (
    <View style={styles.section}>
      <SectionTitle title="Información de la Póliza" />
      <View style={styles.sectionContent}>
        <View style={styles.twoColumn}>
          {/* Left column - Core info */}
          <View style={styles.column}>
            <DataRow label="Renta Mensual" value={data.rentAmount} />
            <DataRow label="Duración del Contrato" value={data.contractLengthLabel} />
            <DataRow label="Tipo de Garantía" value={data.guarantorTypeLabel} />
            <DataRow label="Precio Total" value={data.totalPrice} alt />
            {(data.tenantPercentage !== 100 || data.landlordPercentage !== 0) && (
              <>
                <DataRow label="% Inquilino" value={`${data.tenantPercentage}%`} />
                <DataRow label="% Arrendador" value={`${data.landlordPercentage}%`} />
              </>
            )}
          </View>

          {/* Right column - Dates */}
          <View style={styles.column}>
            <DataRow label="Creada" value={data.createdAt} />
            <DataRow label="Enviada" value={data.submittedAt} />
            <DataRow label="Aprobada" value={data.approvedAt} />
            <DataRow label="Activada" value={data.activatedAt} alt />
            <DataRow label="Expira" value={data.expiresAt} />
          </View>
        </View>

        {/* Financial details */}
        <View style={[styles.highlightBox, styles.mt10]}>
          <Text style={[styles.bold, styles.mb5]}>Detalles Financieros</Text>
          <View style={styles.twoColumn}>
            <View style={styles.column}>
              <DataRow label="Depósito" value={data.securityDeposit} />
              <DataRowBoolean label="Incluye IVA" value={data.hasIVA} />
              <DataRow label="Mantenimiento" value={data.maintenanceFee} />
            </View>
            <View style={styles.column}>
              <DataRowBoolean label="Mant. en Renta" value={data.maintenanceIncludedInRent} />
              <DataRow label="Incremento Anual" value={data.rentIncreasePercentage} />
              <DataRow label="Método de Pago" value={data.paymentMethod} />
            </View>
          </View>
        </View>

        {/* Created/Managed by */}
        <View style={styles.mt5}>
          <View style={styles.twoColumn}>
            <View style={styles.column}>
              <DataRow label="Creada por" value={data.createdBy} />
            </View>
            <View style={styles.column}>
              <DataRow label="Gestionada por" value={data.managedBy} />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
