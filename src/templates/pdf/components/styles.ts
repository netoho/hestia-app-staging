import { StyleSheet } from '@react-pdf/renderer';
import { brandColors } from '@/lib/config/brand';

export const pdfColors = {
  primary: brandColors.primary,
  primaryLight: brandColors.primaryLight,
  accent: brandColors.accent,
  text: brandColors.textPrimary,
  textSecondary: brandColors.textSecondary,
  textMuted: brandColors.textMuted,
  border: brandColors.border,
  background: '#f8fafc',
  white: brandColors.white,
  success: brandColors.success,
  warning: brandColors.warning,
  danger: brandColors.danger,
};

export const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: pdfColors.text,
    backgroundColor: pdfColors.white,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: pdfColors.primary,
  },
  headerLeft: {
    flexDirection: 'column',
  },
  headerRight: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  logo: {
    width: 120,
    height: 40,
    marginBottom: 5,
  },
  companyName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: pdfColors.primary,
    marginBottom: 2,
  },
  policyNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: pdfColors.primary,
  },
  internalCode: {
    fontSize: 10,
    color: pdfColors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: pdfColors.primaryLight,
    color: pdfColors.white,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    fontSize: 8,
    marginTop: 5,
  },

  // Sections
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    backgroundColor: pdfColors.primary,
    color: pdfColors.white,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  sectionContent: {
    paddingHorizontal: 5,
  },

  // Subsections
  subsection: {
    marginBottom: 10,
  },
  subsectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: pdfColors.primary,
    marginBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: pdfColors.border,
    paddingBottom: 3,
  },

  // Data rows
  dataRow: {
    flexDirection: 'row',
    marginBottom: 3,
    paddingVertical: 2,
  },
  dataRowAlt: {
    flexDirection: 'row',
    marginBottom: 3,
    paddingVertical: 2,
    backgroundColor: pdfColors.background,
  },
  dataLabel: {
    width: '35%',
    fontWeight: 'bold',
    color: pdfColors.textSecondary,
    fontSize: 8,
  },
  dataValue: {
    width: '65%',
    color: pdfColors.text,
    fontSize: 9,
  },

  // Two column layout
  twoColumn: {
    flexDirection: 'row',
    gap: 20,
  },
  column: {
    flex: 1,
  },

  // Three column layout
  threeColumn: {
    flexDirection: 'row',
    gap: 15,
  },
  columnThird: {
    flex: 1,
  },

  // Tables
  table: {
    marginTop: 5,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: pdfColors.primaryLight,
    paddingVertical: 5,
    paddingHorizontal: 5,
  },
  tableHeaderCell: {
    color: pdfColors.white,
    fontSize: 8,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: pdfColors.border,
  },
  tableRowAlt: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: pdfColors.border,
    backgroundColor: pdfColors.background,
  },
  tableCell: {
    fontSize: 8,
    color: pdfColors.text,
  },

  // Cards/Boxes
  card: {
    borderWidth: 1,
    borderColor: pdfColors.border,
    borderRadius: 4,
    padding: 10,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: pdfColors.border,
  },
  cardTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: pdfColors.primary,
  },
  badge: {
    fontSize: 7,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  badgePrimary: {
    backgroundColor: pdfColors.primary,
    color: pdfColors.white,
  },
  badgeSuccess: {
    backgroundColor: pdfColors.success,
    color: pdfColors.white,
  },
  badgeWarning: {
    backgroundColor: pdfColors.warning,
    color: pdfColors.white,
  },
  badgeDanger: {
    backgroundColor: pdfColors.danger,
    color: pdfColors.white,
  },

  // Address block
  addressBlock: {
    fontSize: 8,
    lineHeight: 1.4,
    color: pdfColors.text,
  },

  // Utilities
  bold: {
    fontWeight: 'bold',
  },
  italic: {
    fontStyle: 'italic',
  },
  textSmall: {
    fontSize: 7,
  },
  textMuted: {
    color: pdfColors.textMuted,
  },
  mb5: {
    marginBottom: 5,
  },
  mb10: {
    marginBottom: 10,
  },
  mt5: {
    marginTop: 5,
  },
  mt10: {
    marginTop: 10,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: pdfColors.border,
    paddingTop: 10,
  },
  footerText: {
    fontSize: 7,
    color: pdfColors.textMuted,
    textAlign: 'center',
  },
  pageNumber: {
    fontSize: 8,
    color: pdfColors.textMuted,
    textAlign: 'center',
    marginTop: 5,
  },

  // Empty state
  emptyState: {
    fontSize: 8,
    color: pdfColors.textMuted,
    fontStyle: 'italic',
    paddingVertical: 10,
    textAlign: 'center',
  },

  // List
  list: {
    marginLeft: 10,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  listBullet: {
    width: 10,
    fontSize: 8,
  },
  listText: {
    flex: 1,
    fontSize: 8,
  },

  // Highlight box
  highlightBox: {
    backgroundColor: pdfColors.background,
    borderLeftWidth: 3,
    borderLeftColor: pdfColors.primary,
    padding: 8,
    marginBottom: 10,
  },

  // Separator
  separator: {
    borderBottomWidth: 1,
    borderBottomColor: pdfColors.border,
    marginVertical: 10,
  },
});
