import { View, Text } from '@react-pdf/renderer';
import { styles, pdfColors, SectionTitle, SubsectionTitle, DataRow, DataRowBoolean, AddressBlock, SimpleTable, DocumentList } from '../../components';
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
    <View style={styles.card} wrap={false}>
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
          {jointObligor.workPhone && (
            <DataRow label="Tel. Trabajo" value={jointObligor.workPhone} />
          )}
          <DataRow label="Relación con Inquilino" value={jointObligor.relationshipToTenant} />
          <DataRow label="Estado Civil" value={jointObligor.maritalStatus} />
          {jointObligor.spouseName && (
            <>
              <DataRow label="Cónyuge" value={jointObligor.spouseName} />
              {jointObligor.spouseRfc && (
                <DataRow label="RFC Cónyuge" value={jointObligor.spouseRfc} />
              )}
              {jointObligor.spouseCurp && (
                <DataRow label="CURP Cónyuge" value={jointObligor.spouseCurp} />
              )}
            </>
          )}
        </View>

        {/* Right column - Address */}
        <View style={styles.column}>
          <AddressBlock address={jointObligor.address} showLabel label="Dirección" />
        </View>
      </View>

      {/* Legal Representative (company only) */}
      {jointObligor.isCompany && jointObligor.legalRepName && (
        <View style={[styles.highlightBox, styles.mt5]}>
          <Text style={[styles.bold, styles.mb5, { fontSize: 8 }]}>Representante Legal</Text>
          <View style={styles.twoColumn}>
            <View style={styles.column}>
              <DataRow label="Nombre" value={jointObligor.legalRepName} />
              <DataRow label="Cargo" value={jointObligor.legalRepPosition} />
              <DataRow label="RFC" value={jointObligor.legalRepRfc} />
            </View>
            <View style={styles.column}>
              <DataRow label="Teléfono" value={jointObligor.legalRepPhone} />
              <DataRow label="Email" value={jointObligor.legalRepEmail} />
            </View>
          </View>
        </View>
      )}

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
        {jointObligor.employerAddress && (
          <View style={styles.mt5}>
            <AddressBlock address={jointObligor.employerAddress} showLabel label="Dirección del Empleador" />
          </View>
        )}
      </View>

      {/* Income Guarantee - banking info */}
      {jointObligor.guaranteeMethod === 'income' && (jointObligor.bankName || jointObligor.accountHolder) && (
        <View style={[styles.highlightBox, styles.mt5]}>
          <Text style={[styles.bold, styles.mb5, { fontSize: 8 }]}>Garantía por Ingresos</Text>
          <View style={styles.twoColumn}>
            <View style={styles.column}>
              <DataRow label="Banco" value={jointObligor.bankName} />
            </View>
            <View style={styles.column}>
              <DataRow label="Titular" value={jointObligor.accountHolder} />
            </View>
          </View>
        </View>
      )}

      {/* Property Guarantee */}
      {jointObligor.hasPropertyGuarantee && (
        <View style={[styles.highlightBox, styles.mt5]}>
          <Text style={[styles.bold, styles.mb5, { fontSize: 8 }]}>Garantía Inmobiliaria</Text>
          <View style={styles.twoColumn}>
            <View style={styles.column}>
              <DataRow label="Valor del Inmueble" value={jointObligor.propertyValue} />
              <DataRow label="No. Escritura" value={jointObligor.propertyDeedNumber} />
              {jointObligor.propertyRegistry && (
                <DataRow label="Registro Público" value={jointObligor.propertyRegistry} />
              )}
              {jointObligor.propertyTaxAccount && (
                <DataRow label="Cuenta Predial" value={jointObligor.propertyTaxAccount} />
              )}
            </View>
            <View style={styles.column}>
              <AddressBlock address={jointObligor.propertyAddress} showLabel label="Ubicación" />
            </View>
          </View>
        </View>
      )}

      {/* Personal References */}
      {jointObligor.personalReferences.length > 0 && (
        <View style={styles.mt5} wrap={false}>
          <Text style={[styles.bold, styles.mb5, { fontSize: 8 }]}>Referencias Personales</Text>
          <SimpleTable
            headers={['Nombre', 'Teléfono', 'Email', 'Relación']}
            rows={jointObligor.personalReferences.map(ref => [ref.name, ref.phone, ref.email, ref.relationship])}
            widths={['30%', '20%', '25%', '25%']}
          />
        </View>
      )}

      {/* Commercial References */}
      {jointObligor.commercialReferences.length > 0 && (
        <View style={styles.mt5} wrap={false}>
          <Text style={[styles.bold, styles.mb5, { fontSize: 8 }]}>Referencias Comerciales</Text>
          <SimpleTable
            headers={['Empresa', 'Contacto', 'Teléfono', 'Relación']}
            rows={jointObligor.commercialReferences.map(ref => [ref.companyName, ref.contactName, ref.phone, ref.relationship])}
            widths={['30%', '25%', '20%', '25%']}
          />
        </View>
      )}

      {/* Documents list */}
      <DocumentList documents={jointObligor.documents} />
    </View>
  );
}

interface AvalCardProps {
  aval: PDFAval;
  index: number;
}

function AvalCard({ aval, index }: AvalCardProps) {
  return (
    <View style={styles.card} wrap={false}>
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
          {aval.workPhone && (
            <DataRow label="Tel. Trabajo" value={aval.workPhone} />
          )}
          <DataRow label="Relación con Inquilino" value={aval.relationshipToTenant} />
          <DataRow label="Estado Civil" value={aval.maritalStatus} />
          {aval.spouseName && (
            <>
              <DataRow label="Cónyuge" value={aval.spouseName} />
              {aval.spouseRfc && (
                <DataRow label="RFC Cónyuge" value={aval.spouseRfc} />
              )}
              {aval.spouseCurp && (
                <DataRow label="CURP Cónyuge" value={aval.spouseCurp} />
              )}
            </>
          )}
        </View>

        {/* Right column - Address */}
        <View style={styles.column}>
          <AddressBlock address={aval.address} showLabel label="Dirección" />
        </View>
      </View>

      {/* Legal Representative (company only) */}
      {aval.isCompany && aval.legalRepName && (
        <View style={[styles.highlightBox, styles.mt5]}>
          <Text style={[styles.bold, styles.mb5, { fontSize: 8 }]}>Representante Legal</Text>
          <View style={styles.twoColumn}>
            <View style={styles.column}>
              <DataRow label="Nombre" value={aval.legalRepName} />
              <DataRow label="Cargo" value={aval.legalRepPosition} />
              <DataRow label="RFC" value={aval.legalRepRfc} />
            </View>
            <View style={styles.column}>
              <DataRow label="Teléfono" value={aval.legalRepPhone} />
              <DataRow label="Email" value={aval.legalRepEmail} />
            </View>
          </View>
        </View>
      )}

      {/* Employment */}
      <View style={[styles.highlightBox, styles.mt5]}>
        <Text style={[styles.bold, styles.mb5, { fontSize: 8 }]}>Información Laboral</Text>
        <View style={styles.twoColumn}>
          <View style={styles.column}>
            <DataRow label="Situación Laboral" value={aval.employmentStatus} />
            <DataRow label="Ocupación" value={aval.occupation} />
            {aval.employerName && (
              <DataRow label="Empresa" value={aval.employerName} />
            )}
          </View>
          <View style={styles.column}>
            {aval.position && (
              <DataRow label="Puesto" value={aval.position} />
            )}
            <DataRow label="Ingreso Mensual" value={aval.monthlyIncome} />
          </View>
        </View>
        {aval.employerAddress && (
          <View style={styles.mt5}>
            <AddressBlock address={aval.employerAddress} showLabel label="Dirección del Empleador" />
          </View>
        )}
      </View>

      {/* Property Guarantee - Always shown for Aval */}
      {aval.hasPropertyGuarantee && (
        <View style={[styles.highlightBox, styles.mt5]}>
          <Text style={[styles.bold, styles.mb5, { fontSize: 8 }]}>Garantía Inmobiliaria</Text>
          <View style={styles.twoColumn}>
            <View style={styles.column}>
              <DataRow label="Valor del Inmueble" value={aval.propertyValue} />
              <DataRow label="No. Escritura" value={aval.propertyDeedNumber} />
              {aval.propertyRegistry && (
                <DataRow label="Registro Público" value={aval.propertyRegistry} />
              )}
              {aval.propertyTaxAccount && (
                <DataRow label="Cuenta Predial" value={aval.propertyTaxAccount} />
              )}
            </View>
            <View style={styles.column}>
              <AddressBlock address={aval.propertyAddress} showLabel label="Ubicación" />
            </View>
          </View>
        </View>
      )}

      {/* Personal References */}
      {aval.personalReferences.length > 0 && (
        <View style={styles.mt5} wrap={false}>
          <Text style={[styles.bold, styles.mb5, { fontSize: 8 }]}>Referencias Personales</Text>
          <SimpleTable
            headers={['Nombre', 'Teléfono', 'Email', 'Relación']}
            rows={aval.personalReferences.map(ref => [ref.name, ref.phone, ref.email, ref.relationship])}
            widths={['30%', '20%', '25%', '25%']}
          />
        </View>
      )}

      {/* Commercial References */}
      {aval.commercialReferences.length > 0 && (
        <View style={styles.mt5} wrap={false}>
          <Text style={[styles.bold, styles.mb5, { fontSize: 8 }]}>Referencias Comerciales</Text>
          <SimpleTable
            headers={['Empresa', 'Contacto', 'Teléfono', 'Relación']}
            rows={aval.commercialReferences.map(ref => [ref.companyName, ref.contactName, ref.phone, ref.relationship])}
            widths={['30%', '25%', '20%', '25%']}
          />
        </View>
      )}

      {/* Documents list */}
      <DocumentList documents={aval.documents} />
    </View>
  );
}
