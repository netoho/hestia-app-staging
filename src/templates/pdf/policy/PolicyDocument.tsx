import { Document, Page, View, Text } from '@react-pdf/renderer';
import { styles, pdfColors } from '../components';
import {
  HeaderSection,
  PolicyInfoSection,
  PropertySection,
  LandlordSection,
  TenantSection,
  GuarantorSection,
  InvestigationSection,
  PaymentsSection,
  DocumentsSection,
  HistorySection,
} from './sections';
import type { PDFPolicyData } from '@/lib/pdf/types';
import { brandInfo } from '@/lib/config/brand';

interface PolicyDocumentProps {
  data: PDFPolicyData;
}

export function PolicyDocument({ data }: PolicyDocumentProps) {
  return (
    <Document
      title={`Póliza ${data.policyNumber}`}
      author={brandInfo.companyName}
      subject="Documento de Póliza de Arrendamiento"
      creator={brandInfo.companyName}
    >
      <Page size="LETTER" style={styles.page}>
        <HeaderSection data={data} />
        <PolicyInfoSection data={data} />
        <PropertySection data={data} />
        <LandlordSection data={data} />
        <TenantSection data={data} />
        <GuarantorSection data={data} />
        <PaymentsSection data={data} />
        <DocumentsSection data={data} />
        <InvestigationSection data={data} />
        <HistorySection data={data} />

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {brandInfo.legalName} | {brandInfo.supportEmail} | {brandInfo.supportPhone}
          </Text>
          <Text style={styles.footerText}>
            Este documento es para uso interno y no constituye un contrato legal.
          </Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
