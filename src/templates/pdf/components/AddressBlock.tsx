import { View, Text } from '@react-pdf/renderer';
import { styles } from './styles';
import type { PDFAddress } from '@/lib/pdf/types';

interface AddressBlockProps {
  address: PDFAddress | null;
  showLabel?: boolean;
  label?: string;
}

export function AddressBlock({ address, showLabel = false, label = 'Dirección' }: AddressBlockProps) {
  if (!address) {
    return (
      <View style={styles.addressBlock}>
        {showLabel && <Text style={styles.bold}>{label}:</Text>}
        <Text style={styles.textMuted}>No disponible</Text>
      </View>
    );
  }

  const lines: string[] = [];

  // Line 1: Street and numbers
  const streetParts = [
    address.street,
    address.exteriorNumber ? `#${address.exteriorNumber}` : null,
    address.interiorNumber ? `Int. ${address.interiorNumber}` : null,
  ].filter(Boolean);
  if (streetParts.length > 0) {
    lines.push(streetParts.join(' '));
  }

  // Line 2: Neighborhood and postal code
  const neighborhoodParts = [
    address.neighborhood ? `Col. ${address.neighborhood}` : null,
    address.postalCode ? `C.P. ${address.postalCode}` : null,
  ].filter(Boolean);
  if (neighborhoodParts.length > 0) {
    lines.push(neighborhoodParts.join(', '));
  }

  // Line 3: Municipality, city, state
  const locationParts = [
    address.municipality,
    address.city !== address.municipality ? address.city : null,
    address.state,
  ].filter(Boolean);
  if (locationParts.length > 0) {
    lines.push(locationParts.join(', '));
  }

  return (
    <View style={styles.addressBlock}>
      {showLabel && <Text style={[styles.bold, styles.mb5]}>{label}:</Text>}
      {lines.map((line, index) => (
        <Text key={index}>{line}</Text>
      ))}
    </View>
  );
}

interface AddressInlineProps {
  address: PDFAddress | null;
}

export function AddressInline({ address }: AddressInlineProps) {
  if (!address) {
    return <Text style={styles.textMuted}>No disponible</Text>;
  }

  return <Text>{address.formatted || '-'}</Text>;
}
