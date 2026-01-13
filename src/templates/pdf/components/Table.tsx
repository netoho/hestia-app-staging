import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { styles, pdfColors } from './styles';

interface TableColumn {
  key: string;
  header: string;
  width: string | number;
}

interface TableProps {
  columns: TableColumn[];
  data: Record<string, string | number | null | undefined>[];
  emptyMessage?: string;
}

export function Table({ columns, data, emptyMessage = 'Sin registros' }: TableProps) {
  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text>{emptyMessage}</Text>
      </View>
    );
  }

  // Create dynamic styles for column widths
  const columnStyles = StyleSheet.create(
    columns.reduce((acc, col, index) => {
      acc[`col${index}`] = { width: col.width };
      return acc;
    }, {} as Record<string, { width: string | number }>)
  );

  return (
    <View style={styles.table}>
      {/* Header */}
      <View style={styles.tableHeader}>
        {columns.map((col, index) => (
          <Text key={col.key} style={[styles.tableHeaderCell, columnStyles[`col${index}`]]}>
            {col.header}
          </Text>
        ))}
      </View>

      {/* Rows */}
      {data.map((row, rowIndex) => (
        <View key={rowIndex} style={rowIndex % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
          {columns.map((col, colIndex) => (
            <Text key={col.key} style={[styles.tableCell, columnStyles[`col${colIndex}`]]}>
              {row[col.key] ?? '-'}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

interface SimpleTableProps {
  headers: string[];
  rows: (string | null | undefined)[][];
  widths?: (string | number)[];
  emptyMessage?: string;
}

export function SimpleTable({
  headers,
  rows,
  widths,
  emptyMessage = 'Sin registros',
}: SimpleTableProps) {
  if (!rows || rows.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text>{emptyMessage}</Text>
      </View>
    );
  }

  const defaultWidth = `${100 / headers.length}%`;
  const columnWidths = widths || headers.map(() => defaultWidth);

  return (
    <View style={styles.table}>
      {/* Header */}
      <View style={styles.tableHeader}>
        {headers.map((header, index) => (
          <Text key={index} style={[styles.tableHeaderCell, { width: columnWidths[index] }]}>
            {header}
          </Text>
        ))}
      </View>

      {/* Rows */}
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={rowIndex % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
          {row.map((cell, cellIndex) => (
            <Text key={cellIndex} style={[styles.tableCell, { width: columnWidths[cellIndex] }]}>
              {cell ?? '-'}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}
