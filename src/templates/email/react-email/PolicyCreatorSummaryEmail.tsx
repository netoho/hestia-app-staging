import React from 'react';
import { Heading } from '@react-email/components';
import {
  EmailLayout,
  EmailHeader,
  EmailSection,
  EmailFooter,
  EmailButton,
  EmailParagraph,
} from '../components';
import { brandColors } from '@/lib/config/brand';

export interface IncompleteActor {
  type: string;
  name: string;
  email: string;
}

export interface PolicyCreatorSummaryEmailProps {
  creatorName: string;
  policyNumber: string;
  policyLink: string;
  incompleteActors: IncompleteActor[];
  email: string;
}

export const PolicyCreatorSummaryEmail: React.FC<PolicyCreatorSummaryEmailProps> = ({
  creatorName,
  policyNumber,
  policyLink,
  incompleteActors,
}) => {
  return (
    <EmailLayout>
      <EmailHeader
        title="Resumen de Protección"
        subtitle={`Protección #${policyNumber}`}
      />
      <EmailSection greeting={`Hola ${creatorName},`}>
        <EmailParagraph>
          Este es un resumen diario de los actores que aún necesitan completar su información para la protección <strong>{policyNumber}</strong>.
        </EmailParagraph>

        <Heading style={{
          color: brandColors.textPrimary,
          fontSize: '20px',
          fontWeight: 600,
          marginTop: '30px',
          marginBottom: '16px'
        }}>
          Actores Pendientes:
        </Heading>

        <table style={{ width: '100%', borderCollapse: 'collapse', margin: '20px 0' }}>
          <thead>
            <tr>
              <th style={{
                backgroundColor: brandColors.backgroundAlt,
                padding: '12px 8px',
                textAlign: 'left',
                borderBottom: `2px solid ${brandColors.borderDark}`,
                color: brandColors.textPrimary,
                fontSize: '14px',
                fontWeight: 600
              }}>
                Tipo de Actor
              </th>
              <th style={{
                backgroundColor: brandColors.backgroundAlt,
                padding: '12px 8px',
                textAlign: 'left',
                borderBottom: `2px solid ${brandColors.borderDark}`,
                color: brandColors.textPrimary,
                fontSize: '14px',
                fontWeight: 600
              }}>
                Nombre
              </th>
              <th style={{
                backgroundColor: brandColors.backgroundAlt,
                padding: '12px 8px',
                textAlign: 'left',
                borderBottom: `2px solid ${brandColors.borderDark}`,
                color: brandColors.textPrimary,
                fontSize: '14px',
                fontWeight: 600
              }}>
                Email
              </th>
            </tr>
          </thead>
          <tbody>
            {incompleteActors.map((actor, index) => (
              <tr key={index}>
                <td style={{
                  padding: '12px 8px',
                  borderBottom: `1px solid ${brandColors.border}`,
                  color: brandColors.textPrimary,
                  fontSize: '14px'
                }}>
                  {actor.type}
                </td>
                <td style={{
                  padding: '12px 8px',
                  borderBottom: `1px solid ${brandColors.border}`,
                  color: brandColors.textPrimary,
                  fontSize: '14px'
                }}>
                  {actor.name}
                </td>
                <td style={{
                  padding: '12px 8px',
                  borderBottom: `1px solid ${brandColors.border}`,
                  color: brandColors.textPrimary,
                  fontSize: '14px'
                }}>
                  {actor.email}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <EmailParagraph>
          Se han enviado recordatorios automáticos a cada actor con información de contacto. Los recordatorios continuarán enviándose diariamente hasta que completen su información.
        </EmailParagraph>

        <EmailButton href={policyLink} variant="accent">
          Ver protección
        </EmailButton>
      </EmailSection>
      <EmailFooter />
    </EmailLayout>
  );
};

export default PolicyCreatorSummaryEmail;
