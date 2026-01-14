import { View, Text } from '@react-pdf/renderer';
import { styles, pdfColors, SectionTitle, SubsectionTitle, DataRow, DataRowBoolean, AddressBlock, SimpleTable, DocumentList } from '../../components';
import type { PDFPolicyData } from '@/lib/pdf/types';

interface TenantSectionProps {
  data: PDFPolicyData;
}

export function TenantSection({ data }: TenantSectionProps) {
  const tenant = data.tenant;

  if (!tenant) {
    return (
      <View style={styles.section}>
        <SectionTitle title="Inquilino" />
        <View style={styles.emptyState}>
          <Text>No hay inquilino registrado</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <SectionTitle title="Inquilino" />
      <View style={styles.sectionContent}>
        {/* Basic Info Card */}
        <View style={styles.card} wrap={false}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>
              {tenant.isCompany ? 'Empresa' : 'Persona Física'}: {tenant.name}
            </Text>
            <View style={[styles.badge, styles.badgePrimary]}>
              <Text>{tenant.nationality}</Text>
            </View>
          </View>

          <View style={styles.twoColumn}>
            {/* Left column - Personal info */}
            <View style={styles.column}>
              {tenant.companyName && (
                <DataRow label="Razón Social" value={tenant.companyName} />
              )}
              <DataRow label="RFC" value={tenant.rfc} />
              {!tenant.isCompany && (
                <>
                  <DataRow label="CURP" value={tenant.curp} />
                  {tenant.passport && (
                    <DataRow label="Pasaporte" value={tenant.passport} />
                  )}
                </>
              )}
              <DataRow label="Email" value={tenant.email} />
              <DataRow label="Teléfono" value={tenant.phone} />
            </View>

            {/* Right column - Address */}
            <View style={styles.column}>
              <AddressBlock address={tenant.address} showLabel label="Dirección Actual" />
            </View>
          </View>
        </View>

        {/* Employment Info */}
        <View style={styles.subsection}>
          <SubsectionTitle title="Información Laboral" />
          <View style={styles.twoColumn}>
            <View style={styles.column}>
              <DataRow label="Situación Laboral" value={tenant.employmentStatus} />
              <DataRow label="Ocupación" value={tenant.occupation} />
              <DataRow label="Empresa" value={tenant.employerName} />
              <DataRow label="Puesto" value={tenant.position} />
              <DataRow label="Ingreso Mensual" value={tenant.monthlyIncome} />
            </View>
            <View style={styles.column}>
              <AddressBlock address={tenant.employerAddress} showLabel label="Dirección del Empleador" />
            </View>
          </View>
        </View>

        {/* Previous Rental History */}
        <View style={styles.subsection}>
          <SubsectionTitle title="Historial de Arrendamiento" />
          <View style={styles.twoColumn}>
            <View style={styles.column}>
              <DataRow label="Arrendador Anterior" value={tenant.previousLandlordName} />
              <DataRow label="Teléfono" value={tenant.previousLandlordPhone} />
              <DataRow label="Renta Anterior" value={tenant.previousRentAmount} />
            </View>
            <View style={styles.column}>
              <AddressBlock address={tenant.previousRentalAddress} showLabel label="Dirección Anterior" />
            </View>
          </View>
        </View>

        {/* Living situation */}
        <View style={styles.highlightBox}>
          <View style={styles.threeColumn}>
            <View style={styles.columnThird}>
              <DataRow label="No. Ocupantes" value={tenant.numberOfOccupants ? String(tenant.numberOfOccupants) : null} />
            </View>
            <View style={styles.columnThird}>
              <DataRowBoolean label="Tiene Mascotas" value={tenant.hasPets} />
            </View>
            <View style={styles.columnThird}>
              {tenant.petDescription && (
                <DataRow label="Descripción" value={tenant.petDescription} />
              )}
            </View>
          </View>
        </View>

        {/* Personal References */}
        {tenant.personalReferences.length > 0 && (
          <View style={styles.subsection} wrap={false}>
            <SubsectionTitle title="Referencias Personales" />
            <SimpleTable
              headers={['Nombre', 'Teléfono', 'Relación']}
              rows={tenant.personalReferences.map(ref => [
                ref.name,
                ref.phone,
                ref.relationship,
              ])}
              widths={['40%', '30%', '30%']}
            />
          </View>
        )}

        {/* Documents list */}
        <DocumentList documents={tenant.documents} />
      </View>
    </View>
  );
}
