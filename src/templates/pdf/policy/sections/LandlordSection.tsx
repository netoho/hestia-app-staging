import { View, Text } from '@react-pdf/renderer';
import { styles, pdfColors, SectionTitle, SubsectionTitle, DataRow, AddressBlock, DocumentList } from '../../components';
import type { PDFPolicyData, PDFLandlord } from '@/lib/pdf/types';

interface LandlordSectionProps {
  data: PDFPolicyData;
}

export function LandlordSection({ data }: LandlordSectionProps) {
  const landlords = data.landlords;

  if (!landlords || landlords.length === 0) {
    return (
      <View style={styles.section}>
        <SectionTitle title="Arrendador(es)" />
        <View style={styles.emptyState}>
          <Text>No hay arrendadores registrados</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section} break>
      <SectionTitle title="Arrendador(es)" />
      <View style={styles.sectionContent}>
        {landlords.map((landlord, index) => (
          <LandlordCard key={index} landlord={landlord} index={index} />
        ))}
      </View>
    </View>
  );
}

interface LandlordCardProps {
  landlord: PDFLandlord;
  index: number;
}

function LandlordCard({ landlord, index }: LandlordCardProps) {
  return (
    <View style={styles.card} wrap={false}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>
          {landlord.isCompany ? 'Empresa' : 'Persona Física'}: {landlord.name}
        </Text>
        {landlord.isPrimary && (
          <View style={[styles.badge, styles.badgePrimary]}>
            <Text>Principal</Text>
          </View>
        )}
      </View>

      <View style={styles.twoColumn}>
        {/* Left column - Personal/Company info */}
        <View style={styles.column}>
          {landlord.companyName && (
            <DataRow label="Razón Social" value={landlord.companyName} />
          )}
          {landlord.businessType && (
            <DataRow label="Giro" value={landlord.businessType} />
          )}
          <DataRow label="RFC" value={landlord.rfc} />
          {!landlord.isCompany && (
            <DataRow label="CURP" value={landlord.curp} />
          )}
          <DataRow label="Email" value={landlord.email} />
          <DataRow label="Teléfono" value={landlord.phone} />
          {landlord.workPhone && (
            <DataRow label="Tel. Trabajo" value={landlord.workPhone} />
          )}
          {landlord.occupation && (
            <DataRow label="Ocupación" value={landlord.occupation} />
          )}
          {landlord.monthlyIncome && (
            <DataRow label="Ingreso Mensual" value={landlord.monthlyIncome} />
          )}
        </View>

        {/* Right column - Address & Bank info */}
        <View style={styles.column}>
          <AddressBlock address={landlord.address} showLabel label="Dirección" />

          {(landlord.bankName || landlord.clabe) && (
            <View style={styles.mt10}>
              <Text style={[styles.bold, styles.mb5, { fontSize: 8 }]}>Datos Bancarios</Text>
              <DataRow label="Banco" value={landlord.bankName} />
              <DataRow label="Titular" value={landlord.accountHolder} />
              <DataRow label="CLABE" value={landlord.clabe} />
              <DataRow label="No. Cuenta" value={landlord.accountNumber} />
            </View>
          )}
        </View>
      </View>

      {/* Property info */}
      {(landlord.propertyDeedNumber || landlord.propertyRegistryFolio) && (
        <View style={[styles.highlightBox, styles.mt5]}>
          <Text style={[styles.bold, styles.mb5, { fontSize: 8 }]}>Datos de Propiedad</Text>
          <View style={styles.twoColumn}>
            <View style={styles.column}>
              {landlord.propertyDeedNumber && (
                <DataRow label="No. Escritura" value={landlord.propertyDeedNumber} />
              )}
            </View>
            <View style={styles.column}>
              {landlord.propertyRegistryFolio && (
                <DataRow label="Folio de Registro" value={landlord.propertyRegistryFolio} />
              )}
            </View>
          </View>
        </View>
      )}

      {/* Legal Representative (company only) */}
      {landlord.isCompany && landlord.legalRepName && (
        <View style={[styles.highlightBox, styles.mt5]}>
          <Text style={[styles.bold, styles.mb5, { fontSize: 8 }]}>Representante Legal</Text>
          <View style={styles.twoColumn}>
            <View style={styles.column}>
              <DataRow label="Nombre" value={landlord.legalRepName} />
              <DataRow label="Cargo" value={landlord.legalRepPosition} />
              <DataRow label="RFC" value={landlord.legalRepRfc} />
            </View>
            <View style={styles.column}>
              <DataRow label="Teléfono" value={landlord.legalRepPhone} />
              <DataRow label="Email" value={landlord.legalRepEmail} />
            </View>
          </View>
        </View>
      )}

      {/* Documents list */}
      <DocumentList documents={landlord.documents} />
    </View>
  );
}
