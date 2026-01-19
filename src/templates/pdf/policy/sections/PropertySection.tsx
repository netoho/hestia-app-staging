import { View, Text } from '@react-pdf/renderer';
import { styles, SectionTitle, DataRow, DataRowBoolean, AddressBlock } from '../../components';
import type { PDFPolicyData } from '@/lib/pdf/types';

interface PropertySectionProps {
  data: PDFPolicyData;
}

export function PropertySection({ data }: PropertySectionProps) {
  const property = data.property;

  if (!property) {
    return (
      <View style={styles.section}>
        <SectionTitle title="Propiedad" />
        <View style={styles.emptyState}>
          <Text>No hay información de la propiedad disponible</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <SectionTitle title="Propiedad" />
      <View style={styles.sectionContent}>
        <View style={styles.twoColumn}>
          {/* Left column - Property details */}
          <View style={styles.column}>
            <DataRow label="Tipo de Propiedad" value={property.typeLabel} />
            {property.description && (
              <DataRow label="Descripción" value={property.description} />
            )}
            <DataRow label="Cajones de Estacionamiento" value={String(property.parkingSpaces)} />
            <DataRowBoolean label="Amueblado" value={property.isFurnished} />
            <DataRowBoolean label="Mascotas Permitidas" value={property.petsAllowed} />
          </View>

          {/* Right column - Address */}
          <View style={styles.column}>
            <AddressBlock address={property.address} showLabel label="Dirección" />
            <View style={styles.mt10}>
              <DataRow label="Fecha de Entrega" value={property.deliveryDate} />
              <DataRow label="Fecha de Firma" value={property.contractSigningDate} />
            </View>
          </View>
        </View>

        {/* Utilities */}
        <View style={[styles.highlightBox, styles.mt10]}>
          <Text style={[styles.bold, styles.mb5]}>Servicios</Text>
          <View style={styles.threeColumn}>
            <View style={styles.columnThird}>
              <DataRowBoolean label="Electricidad" value={property.hasElectricity} />
              <DataRowBoolean label="Agua" value={property.hasWater} />
            </View>
            <View style={styles.columnThird}>
              <DataRowBoolean label="Gas" value={property.hasGas} />
              <DataRowBoolean label="Teléfono" value={property.hasPhone} />
            </View>
            <View style={styles.columnThird}>
              <DataRowBoolean label="Internet" value={property.hasInternet} />
              <DataRowBoolean label="TV por Cable" value={property.hasCableTV} />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
