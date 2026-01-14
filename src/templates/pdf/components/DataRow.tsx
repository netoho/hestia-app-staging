import { View, Text } from '@react-pdf/renderer';
import { styles } from './styles';

interface DataRowProps {
  label: string;
  value: string | null | undefined;
  alt?: boolean;
}

export function DataRow({ label, value, alt = false }: DataRowProps) {
  return (
    <View style={alt ? styles.dataRowAlt : styles.dataRow}>
      <Text style={styles.dataLabel}>{label}</Text>
      <Text style={styles.dataValue}>{value || '-'}</Text>
    </View>
  );
}

interface DataRowBooleanProps {
  label: string;
  value: boolean | null | undefined;
  trueLabel?: string;
  falseLabel?: string;
  alt?: boolean;
}

export function DataRowBoolean({
  label,
  value,
  trueLabel = 'Sí',
  falseLabel = 'No',
  alt = false,
}: DataRowBooleanProps) {
  return (
    <View style={alt ? styles.dataRowAlt : styles.dataRow}>
      <Text style={styles.dataLabel}>{label}</Text>
      <Text style={styles.dataValue}>{value ? trueLabel : falseLabel}</Text>
    </View>
  );
}
