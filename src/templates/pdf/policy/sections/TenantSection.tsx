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
              {tenant.workPhone && (
                <DataRow label="Tel. Trabajo" value={tenant.workPhone} />
              )}
            </View>

            {/* Right column - Address */}
            <View style={styles.column}>
              <AddressBlock address={tenant.address} showLabel label="Dirección Actual" />
            </View>
          </View>
        </View>

        {/* Legal Representative (company only) */}
        {tenant.isCompany && tenant.legalRepName && (
          <View style={styles.subsection} wrap={false}>
            <SubsectionTitle title="Representante Legal" />
            <View style={styles.twoColumn}>
              <View style={styles.column}>
                <DataRow label="Nombre" value={tenant.legalRepName} />
                <DataRow label="Cargo" value={tenant.legalRepPosition} />
                <DataRow label="RFC" value={tenant.legalRepRfc} />
              </View>
              <View style={styles.column}>
                <DataRow label="Teléfono" value={tenant.legalRepPhone} />
                <DataRow label="Email" value={tenant.legalRepEmail} />
              </View>
            </View>
          </View>
        )}

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
              {tenant.incomeSource && (
                <DataRow label="Fuente de Ingresos" value={tenant.incomeSource} />
              )}
              {tenant.yearsAtJob !== null && tenant.yearsAtJob !== undefined && (
                <DataRow label="Años en Empleo" value={String(tenant.yearsAtJob)} />
              )}
            </View>
            <View style={styles.column}>
              <AddressBlock address={tenant.employerAddress} showLabel label="Dirección del Empleador" />
              {(tenant.additionalIncomeAmount || tenant.additionalIncomeSource) && (
                <View style={styles.mt10}>
                  <Text style={[styles.bold, styles.mb5, { fontSize: 8 }]}>Ingresos Adicionales</Text>
                  {tenant.additionalIncomeAmount && (
                    <DataRow label="Monto" value={tenant.additionalIncomeAmount} />
                  )}
                  {tenant.additionalIncomeSource && (
                    <DataRow label="Fuente" value={tenant.additionalIncomeSource} />
                  )}
                </View>
              )}
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
              {tenant.previousLandlordEmail && (
                <DataRow label="Email" value={tenant.previousLandlordEmail} />
              )}
              <DataRow label="Renta Anterior" value={tenant.previousRentAmount} />
              {tenant.rentalHistoryYears !== null && tenant.rentalHistoryYears !== undefined && (
                <DataRow label="Años Rentando" value={String(tenant.rentalHistoryYears)} />
              )}
              {tenant.reasonForMoving && (
                <DataRow label="Motivo de Cambio" value={tenant.reasonForMoving} />
              )}
            </View>
            <View style={styles.column}>
              <AddressBlock address={tenant.previousRentalAddress} showLabel label="Dirección Anterior" />
            </View>
          </View>
        </View>

        {/* Living situation */}
        <View style={styles.highlightBox}>
          <View style={styles.twoColumn}>
            <View style={styles.column}>
              <DataRow label="No. Ocupantes" value={tenant.numberOfOccupants ? String(tenant.numberOfOccupants) : null} />
            </View>
            <View style={styles.column}>
              <DataRowBoolean label="Tiene Mascotas" value={tenant.hasPets} />
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
              headers={['Nombre', 'Teléfono', 'Email', 'Relación']}
              rows={tenant.personalReferences.map(ref => [
                ref.name,
                ref.phone,
                ref.email,
                ref.relationship,
              ])}
              widths={['30%', '20%', '25%', '25%']}
            />
          </View>
        )}

        {/* Commercial References */}
        {tenant.commercialReferences.length > 0 && (
          <View style={styles.subsection} wrap={false}>
            <SubsectionTitle title="Referencias Comerciales" />
            <SimpleTable
              headers={['Empresa', 'Contacto', 'Teléfono', 'Relación']}
              rows={tenant.commercialReferences.map(ref => [
                ref.companyName,
                ref.contactName,
                ref.phone,
                ref.relationship,
              ])}
              widths={['30%', '25%', '20%', '25%']}
            />
          </View>
        )}

        {/* Documents list */}
        <DocumentList documents={tenant.documents} />
      </View>
    </View>
  );
}
