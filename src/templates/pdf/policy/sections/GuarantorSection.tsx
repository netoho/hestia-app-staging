import { View, Text } from '@react-pdf/renderer';
import { styles, pdfColors, SectionTitle, SubsectionTitle, DataRow, DataRowBoolean, AddressBlock, SimpleTable } from '../../components';
import type { PDFPolicyData, PDFJointObligor, PDFAval } from '@/lib/pdf/types';

interface GuarantorSectionProps {
  data: PDFPolicyData;
}

export function GuarantorSection({ data }: GuarantorSectionProps) {
  const hasJointObligors = data.jointObligors.length > 0;
  const hasAvals = data.avals.length > 0;

  if (!hasJointObligors && !hasAvals) {
    return null;
  }

  return (
    <View style={styles.section}>
      <SectionTitle title="Garantías" />
      <View style={styles.sectionContent}>
        {/* Joint Obligors */}
        {hasJointObligors && (
          <View style={styles.subsection}>
            <SubsectionTitle title="Obligado(s) Solidario(s)" />
            {data.jointObligors.map((jo, index) => (
              <JointObligorCard key={index} jointObligor={jo} index={index} />
            ))}
          </View>
        )}

        {/* Avals */}
        {hasAvals && (
          <View style={styles.subsection}>
            <SubsectionTitle title="Aval(es)" />
            {data.avals.map((aval, index) => (
              <AvalCard key={index} aval={aval} index={index} />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

interface JointObligorCardProps {
  jointObligor: PDFJointObligor;
  index: number;
}

function JointObligorCard({ jointObligor, index }: JointObligorCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>
          {jointObligor.isCompany ? 'Empresa' : 'Persona Física'}: {jointObligor.name}
        </Text>
        {jointObligor.guaranteeMethod && (
          <View style={[styles.badge, styles.badgePrimary]}>
            <Text>{jointObligor.guaranteeMethod === 'property' ? 'Inmueble' : 'Ingresos'}</Text>
          </View>
        )}
      </View>

      <View style={styles.twoColumn}>
        {/* Left column - Personal info */}
        <View style={styles.column}>
          <DataRow label="RFC" value={jointObligor.rfc} />
          {!jointObligor.isCompany && (
            <DataRow label="CURP" value={jointObligor.curp} />
          )}
          <DataRow label="Email" value={jointObligor.email} />
          <DataRow label="Teléfono" value={jointObligor.phone} />
          <DataRow label="Relación con Inquilino" value={jointObligor.relationshipToTenant} />
          <DataRow label="Estado Civil" value={jointObligor.maritalStatus} />
          {jointObligor.spouseName && (
            <DataRow label="Cónyuge" value={jointObligor.spouseName} />
          )}
        </View>

        {/* Right column - Address */}
        <View style={styles.column}>
          <AddressBlock address={jointObligor.address} showLabel label="Dirección" />
        </View>
      </View>

      {/* Employment */}
      <View style={[styles.highlightBox, styles.mt5]}>
        <Text style={[styles.bold, styles.mb5, { fontSize: 8 }]}>Información Laboral</Text>
        <View style={styles.twoColumn}>
          <View style={styles.column}>
            <DataRow label="Situación Laboral" value={jointObligor.employmentStatus} />
            <DataRow label="Ocupación" value={jointObligor.occupation} />
            <DataRow label="Empresa" value={jointObligor.employerName} />
          </View>
          <View style={styles.column}>
            <DataRow label="Puesto" value={jointObligor.position} />
            <DataRow label="Ingreso Mensual" value={jointObligor.monthlyIncome} />
          </View>
        </View>
      </View>

      {/* Property Guarantee */}
      {jointObligor.hasPropertyGuarantee && (
        <View style={[styles.highlightBox, styles.mt5]}>
          <Text style={[styles.bold, styles.mb5, { fontSize: 8 }]}>Garantía Inmobiliaria</Text>
          <View style={styles.twoColumn}>
            <View style={styles.column}>
              <DataRow label="Valor del Inmueble" value={jointObligor.propertyValue} />
              <DataRow label="No. Escritura" value={jointObligor.propertyDeedNumber} />
            </View>
            <View style={styles.column}>
              <AddressBlock address={jointObligor.propertyAddress} showLabel label="Ubicación" />
            </View>
          </View>
        </View>
      )}

      {/* References */}
      {jointObligor.personalReferences.length > 0 && (
        <View style={styles.mt5}>
          <Text style={[styles.bold, styles.mb5, { fontSize: 8 }]}>Referencias</Text>
          <SimpleTable
            headers={['Nombre', 'Teléfono', 'Relación']}
            rows={jointObligor.personalReferences.map(ref => [ref.name, ref.phone, ref.relationship])}
            widths={['40%', '30%', '30%']}
          />
        </View>
      )}

      {/* Documents */}
      {jointObligor.documents.length > 0 && (
        <View style={styles.mt5}>
          <Text style={{ fontSize: 7, color: pdfColors.textMuted }}>
            Documentos cargados: {jointObligor.documents.length}
          </Text>
        </View>
      )}
    </View>
  );
}

interface AvalCardProps {
  aval: PDFAval;
  index: number;
}

function AvalCard({ aval, index }: AvalCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>
          {aval.isCompany ? 'Empresa' : 'Persona Física'}: {aval.name}
        </Text>
        <View style={[styles.badge, styles.badgeWarning]}>
          <Text>Aval</Text>
        </View>
      </View>

      <View style={styles.twoColumn}>
        {/* Left column - Personal info */}
        <View style={styles.column}>
          <DataRow label="RFC" value={aval.rfc} />
          {!aval.isCompany && (
            <DataRow label="CURP" value={aval.curp} />
          )}
          <DataRow label="Email" value={aval.email} />
          <DataRow label="Teléfono" value={aval.phone} />
          <DataRow label="Relación con Inquilino" value={aval.relationshipToTenant} />
          <DataRow label="Estado Civil" value={aval.maritalStatus} />
          {aval.spouseName && (
            <DataRow label="Cónyuge" value={aval.spouseName} />
          )}
        </View>

        {/* Right column - Address */}
        <View style={styles.column}>
          <AddressBlock address={aval.address} showLabel label="Dirección" />
        </View>
      </View>

      {/* Employment */}
      <View style={[styles.highlightBox, styles.mt5]}>
        <Text style={[styles.bold, styles.mb5, { fontSize: 8 }]}>Información Laboral</Text>
        <View style={styles.twoColumn}>
          <View style={styles.column}>
            <DataRow label="Situación Laboral" value={aval.employmentStatus} />
            <DataRow label="Ocupación" value={aval.occupation} />
          </View>
          <View style={styles.column}>
            <DataRow label="Ingreso Mensual" value={aval.monthlyIncome} />
          </View>
        </View>
      </View>

      {/* Property Guarantee - Always shown for Aval */}
      {aval.hasPropertyGuarantee && (
        <View style={[styles.highlightBox, styles.mt5]}>
          <Text style={[styles.bold, styles.mb5, { fontSize: 8 }]}>Garantía Inmobiliaria</Text>
          <View style={styles.twoColumn}>
            <View style={styles.column}>
              <DataRow label="Valor del Inmueble" value={aval.propertyValue} />
              <DataRow label="No. Escritura" value={aval.propertyDeedNumber} />
            </View>
            <View style={styles.column}>
              <AddressBlock address={aval.propertyAddress} showLabel label="Ubicación" />
            </View>
          </View>
        </View>
      )}

      {/* References */}
      {aval.personalReferences.length > 0 && (
        <View style={styles.mt5}>
          <Text style={[styles.bold, styles.mb5, { fontSize: 8 }]}>Referencias</Text>
          <SimpleTable
            headers={['Nombre', 'Teléfono', 'Relación']}
            rows={aval.personalReferences.map(ref => [ref.name, ref.phone, ref.relationship])}
            widths={['40%', '30%', '30%']}
          />
        </View>
      )}

      {/* Documents */}
      {aval.documents.length > 0 && (
        <View style={styles.mt5}>
          <Text style={{ fontSize: 7, color: pdfColors.textMuted }}>
            Documentos cargados: {aval.documents.length}
          </Text>
        </View>
      )}
    </View>
  );
}
