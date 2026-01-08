import { t } from '@/lib/i18n';
import { ServiceError, ErrorCode } from './types/errors';
import { BaseService } from './base/BaseService';

interface PolicyData {
  id: string;
  tenantEmail: string;
  tenantPhone?: string;
  createdAt: string;
  profileData?: {
    nationality: string;
    curp?: string;
    passport?: string;
  };
  employmentData?: {
    employmentStatus: string;
    industry: string;
    companyName: string;
    position: string;
    monthlyIncome: number;
    creditCheckConsent: boolean;
  };
  referencesData?: {
    personalReferenceName: string;
    personalReferencePhone: string;
    workReferenceName?: string;
    workReferencePhone?: string;
    landlordReferenceName?: string;
    landlordReferencePhone?: string;
  };
  documents: Array<{
    id: string;
    category: string;
    originalName: string;
    uploadedAt: string;
  }>;
}

class PDFService extends BaseService {
  constructor() {
    super();
  }

  /**
   * Generate a policy document PDF using HTML-to-PDF approach
   * This creates a professional document with fillable fields for printing
   */
  async generatePolicyDocumentHTML(policy: PolicyData): Promise<string> {
    const createdDate = new Date(policy.createdAt).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Solicitud de Arrendamiento para Persona Física - ${policy.id}</title>
        <style>
            @page {
                size: A4;
                margin: 2cm;
            }
            
            body {
                font-family: 'Arial', sans-serif;
                line-height: 1.5;
                color: #333;
                margin: 0;
                padding: 0;
            }
            
            .header {
                text-align: center;
                border-bottom: 3px solid #2563eb;
                padding-bottom: 20px;
                margin-bottom: 30px;
            }
            
            .logo-area {
                font-size: 28px;
                font-weight: bold;
                color: #2563eb;
                margin-bottom: 10px;
            }
            
            .document-title {
                font-size: 22px;
                font-weight: bold;
                color: #1e40af;
                margin: 10px 0;
            }
            
            .policy-number {
                font-size: 16px;
                color: #666;
                margin-bottom: 10px;
            }
            
            .section {
                margin: 25px 0;
                page-break-inside: avoid;
            }
            
            .section-title {
                font-size: 18px;
                font-weight: bold;
                color: #1e40af;
                border-bottom: 2px solid #e5e7eb;
                padding-bottom: 8px;
                margin-bottom: 15px;
            }
            
            .info-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin: 15px 0;
            }
            
            .info-item {
                margin-bottom: 12px;
            }
            
            .label {
                font-weight: bold;
                color: #374151;
                margin-bottom: 3px;
            }
            
            .value {
                color: #6b7280;
                border-bottom: 1px dotted #d1d5db;
                padding-bottom: 2px;
                min-height: 20px;
            }
            
            .fillable-field {
                border-bottom: 1px solid #000;
                min-height: 20px;
                padding-bottom: 2px;
                display: inline-block;
                min-width: 200px;
            }
            
            .checkbox {
                display: inline-block;
                width: 15px;
                height: 15px;
                border: 1px solid #000;
                margin-right: 8px;
                position: relative;
                top: 2px;
            }
            
            .checked::after {
                content: '✓';
                position: absolute;
                left: 2px;
                top: -2px;
                font-size: 12px;
            }
            
            .signature-section {
                margin-top: 40px;
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 40px;
            }
            
            .signature-block {
                text-align: center;
            }
            
            .signature-line {
                border-bottom: 1px solid #000;
                height: 40px;
                margin-bottom: 10px;
            }
            
            .terms-section {
                margin-top: 30px;
                font-size: 12px;
                line-height: 1.4;
            }
            
            .page-break {
                page-break-before: always;
            }
            
            .footer {
                position: fixed;
                bottom: 1cm;
                left: 0;
                right: 0;
                text-align: center;
                font-size: 10px;
                color: #666;
            }
            
            @media print {
                .no-print {
                    display: none;
                }
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="logo-area">HESTIA</div>
            <div style="font-size: 14px; color: #666;">Protección Legal y Patrimonial S.A.S de C.V.</div>
            <div style="font-size: 12px; color: #888; margin-top: 5px;">RFC: HPL123456789</div>
            <div class="document-title">SOLICITUD DE ARRENDAMIENTO PARA PERSONA FÍSICA</div>
            <div class="policy-number">Número de Solicitud: ${policy.id}</div>
            <div style="font-size: 14px;">Fecha de Solicitud: ${createdDate}</div>
        </div>

        <div class="section">
            <div class="section-title">I. DATOS GENERALES DEL SOLICITANTE</div>
            <div style="margin-bottom: 20px;">
                <div class="info-item" style="margin-bottom: 15px;">
                    <div class="label">Nombre Completo:</div>
                    <div class="fillable-field" style="min-width: 400px;"></div>
                </div>
                
                <div class="info-grid">
                    <div class="info-item">
                        <div class="label">Fecha de Nacimiento:</div>
                        <div class="fillable-field"></div>
                    </div>
                    <div class="info-item">
                        <div class="label">Lugar de Nacimiento:</div>
                        <div class="fillable-field"></div>
                    </div>
                </div>
                
                <div class="info-grid">
                    <div class="info-item">
                        <div class="label">Estado Civil:</div>
                        <div class="fillable-field"></div>
                    </div>
                    <div class="info-item">
                        <div class="label">Nacionalidad:</div>
                        <div class="value">${policy.profileData?.nationality === 'mexican' ? 'Mexicana' : 'Extranjera'}</div>
                    </div>
                </div>
                
                <div class="info-grid">
                    <div class="info-item">
                        <div class="label">CURP:</div>
                        <div class="value">${policy.profileData?.curp || '_________________'}</div>
                    </div>
                    <div class="info-item">
                        <div class="label">RFC:</div>
                        <div class="fillable-field"></div>
                    </div>
                </div>
                
                ${policy.profileData?.passport ? `
                <div class="info-item">
                    <div class="label">Número de Pasaporte:</div>
                    <div class="value">${policy.profileData.passport}</div>
                </div>
                ` : ''}
            </div>
        </div>

        <div class="section">
            <div class="section-title">II. DATOS DE CONTACTO</div>
            <div class="info-grid">
                <div class="info-item">
                    <div class="label">Correo Electrónico:</div>
                    <div class="value">${policy.tenantEmail}</div>
                </div>
                <div class="info-item">
                    <div class="label">Teléfono Móvil:</div>
                    <div class="value">${policy.tenantPhone || '_________________'}</div>
                </div>
            </div>
            
            <div class="info-item" style="margin-top: 15px;">
                <div class="label">Domicilio Actual:</div>
                <div class="fillable-field" style="min-width: 500px;"></div>
            </div>
            
            <div class="info-grid" style="margin-top: 15px;">
                <div class="info-item">
                    <div class="label">Código Postal:</div>
                    <div class="fillable-field"></div>
                </div>
                <div class="info-item">
                    <div class="label">Tiempo de Residencia:</div>
                    <div class="fillable-field"></div>
                </div>
            </div>
            
            <div class="info-grid">
                <div class="info-item">
                    <div class="label">Tipo de Vivienda:</div>
                    <div style="margin-top: 5px;">
                        <span class="checkbox"></span> Propia
                        <span class="checkbox" style="margin-left: 20px;"></span> Rentada
                        <span class="checkbox" style="margin-left: 20px;"></span> Familiar
                    </div>
                </div>
            </div>
        </div>


        <div class="section">
            <div class="section-title">III. INFORMACIÓN LABORAL Y ECONÓMICA</div>
            
            <div class="info-grid">
                <div class="info-item">
                    <div class="label">Situación Laboral:</div>
                    <div class="value">${policy.employmentData?.employmentStatus || '_________________'}</div>
                </div>
                <div class="info-item">
                    <div class="label">Profesión/Ocupación:</div>
                    <div class="value">${policy.employmentData?.position || '_________________'}</div>
                </div>
            </div>
            
            <div class="info-item" style="margin: 15px 0;">
                <div class="label">Nombre de la Empresa/Negocio:</div>
                <div class="value">${policy.employmentData?.companyName || '_________________'}</div>
            </div>
            
            <div class="info-item" style="margin: 15px 0;">
                <div class="label">Dirección del Trabajo:</div>
                <div class="fillable-field" style="min-width: 500px;"></div>
            </div>
            
            <div class="info-grid">
                <div class="info-item">
                    <div class="label">Teléfono del Trabajo:</div>
                    <div class="fillable-field"></div>
                </div>
                <div class="info-item">
                    <div class="label">Antigüedad Laboral:</div>
                    <div class="fillable-field"></div>
                </div>
            </div>
            
            <div class="info-grid">
                <div class="info-item">
                    <div class="label">Ingreso Mensual Neto:</div>
                    <div class="value">$${policy.employmentData?.monthlyIncome?.toLocaleString() || '_________'} MXN</div>
                </div>
                <div class="info-item">
                    <div class="label">Otros Ingresos:</div>
                    <div class="fillable-field"></div>
                </div>
            </div>
            
            <div class="info-item" style="margin: 15px 0;">
                <div class="label">Nombre del Jefe Inmediato:</div>
                <div class="fillable-field" style="min-width: 300px;"></div>
            </div>
            
            <div style="margin: 20px 0;">
                <div class="label">Autorizo la consulta en el Buró de Crédito:</div>
                <div style="margin-top: 5px;">
                    <span class="checkbox ${policy.employmentData?.creditCheckConsent ? 'checked' : ''}"></span> Sí, autorizo
                    <span class="checkbox ${!policy.employmentData?.creditCheckConsent ? 'checked' : ''}" style="margin-left: 20px;"></span> No autorizo
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">IV. REFERENCIAS PERSONALES Y COMERCIALES</div>
            
            <div style="margin-bottom: 25px;">
                <strong>Referencia Personal (OBLIGATORIA):</strong>
                <div class="info-grid" style="margin-top: 10px;">
                    <div class="info-item">
                        <div class="label">Nombre Completo:</div>
                        <div class="value">${policy.referencesData?.personalReferenceName || '_________________'}</div>
                    </div>
                    <div class="info-item">
                        <div class="label">Parentesco/Relación:</div>
                        <div class="fillable-field"></div>
                    </div>
                </div>
                <div class="info-grid" style="margin-top: 10px;">
                    <div class="info-item">
                        <div class="label">Teléfono:</div>
                        <div class="value">${policy.referencesData?.personalReferencePhone || '_________________'}</div>
                    </div>
                    <div class="info-item">
                        <div class="label">Años de Conocerlo:</div>
                        <div class="fillable-field"></div>
                    </div>
                </div>
                <div class="info-item" style="margin-top: 10px;">
                    <div class="label">Dirección:</div>
                    <div class="fillable-field" style="min-width: 400px;"></div>
                </div>
            </div>

            <div style="margin-bottom: 25px;">
                <strong>Referencia Laboral:</strong>
                <div class="info-grid" style="margin-top: 10px;">
                    <div class="info-item">
                        <div class="label">Nombre Completo:</div>
                        <div class="value">${policy.referencesData?.workReferenceName || '_________________'}</div>
                    </div>
                    <div class="info-item">
                        <div class="label">Cargo/Puesto:</div>
                        <div class="fillable-field"></div>
                    </div>
                </div>
                <div class="info-grid" style="margin-top: 10px;">
                    <div class="info-item">
                        <div class="label">Teléfono:</div>
                        <div class="value">${policy.referencesData?.workReferencePhone || '_________________'}</div>
                    </div>
                    <div class="info-item">
                        <div class="label">Empresa:</div>
                        <div class="fillable-field"></div>
                    </div>
                </div>
            </div>

            <div style="margin-bottom: 25px;">
                <strong>Referencia de Arrendador Anterior (si aplica):</strong>
                <div class="info-grid" style="margin-top: 10px;">
                    <div class="info-item">
                        <div class="label">Nombre Completo:</div>
                        <div class="value">${policy.referencesData?.landlordReferenceName || '_________________'}</div>
                    </div>
                    <div class="info-item">
                        <div class="label">Teléfono:</div>
                        <div class="value">${policy.referencesData?.landlordReferencePhone || '_________________'}</div>
                    </div>
                </div>
                <div class="info-grid" style="margin-top: 10px;">
                    <div class="info-item">
                        <div class="label">Dirección de la Propiedad:</div>
                        <div class="fillable-field" style="min-width: 300px;"></div>
                    </div>
                    <div class="info-item">
                        <div class="label">Tiempo de Arrendamiento:</div>
                        <div class="fillable-field"></div>
                    </div>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">V. DOCUMENTACIÓN REQUERIDA</div>
            
            <div style="margin-bottom: 20px;">
                <p><strong>Documentos Obligatorios para Persona Física:</strong></p>
                <div style="margin: 15px 0;">
                    <div style="margin-bottom: 10px;">
                        <span class="checkbox"></span> Identificación oficial vigente (INE/IFE/Pasaporte)
                    </div>
                    <div style="margin-bottom: 10px;">
                        <span class="checkbox"></span> Comprobante de ingresos (últimos 3 meses)
                    </div>
                    <div style="margin-bottom: 10px;">
                        <span class="checkbox"></span> Comprobante de domicilio (no mayor a 3 meses)
                    </div>
                    <div style="margin-bottom: 10px;">
                        <span class="checkbox"></span> Estados de cuenta bancarios (últimos 3 meses)
                    </div>
                    <div style="margin-bottom: 10px;">
                        <span class="checkbox"></span> RFC con homoclave
                    </div>
                    <div style="margin-bottom: 10px;">
                        <span class="checkbox"></span> CURP
                    </div>
                </div>
            </div>
            
            ${policy.documents.length > 0 ? `
            <div style="margin-top: 25px;">
                <p><strong>Documentos Recibidos Digitalmente:</strong></p>
                <ul style="margin-left: 20px; margin-top: 10px;">
                    ${policy.documents.map(doc => `
                        <li style="margin-bottom: 8px;">
                            <strong>${doc.originalName}</strong> 
                            (${doc.category === 'identification' ? 'Identificación' : 
                               doc.category === 'income' ? 'Comprobante de Ingresos' : 'Opcional'})
                            - Fecha de Recepción: ${new Date(doc.uploadedAt).toLocaleDateString('es-MX')}
                        </li>
                    `).join('')}
                </ul>
            </div>
            ` : `
                <div style="margin-top: 25px; padding: 15px; background-color: #f9f9f9; border-left: 4px solid #e5e7eb;">
                    <p style="color: #666; margin: 0;"><em>Nota: Los documentos físicos deberán ser entregados en original y copia para cotejo.</em></p>
                </div>
            `}
        </div>

        <div class="section">
            <div class="section-title">VI. INFORMACIÓN DE LA PROPIEDAD SOLICITADA</div>
            <div style="margin-top: 20px;">
                <div class="info-item" style="margin-bottom: 20px;">
                    <div class="label">Dirección Completa de la Propiedad:</div>
                    <div class="fillable-field" style="min-width: 500px;"></div>
                </div>
                
                <div class="info-grid">
                    <div class="info-item">
                        <div class="label">Tipo de Propiedad:</div>
                        <div style="margin-top: 5px;">
                            <span class="checkbox"></span> Casa <span class="checkbox" style="margin-left: 15px;"></span> Departamento
                            <span class="checkbox" style="margin-left: 15px;"></span> Local <span class="checkbox" style="margin-left: 15px;"></span> Oficina
                        </div>
                    </div>
                    <div class="info-item">
                        <div class="label">Número de Recámaras:</div>
                        <div class="fillable-field"></div>
                    </div>
                </div>
                
                <div class="info-grid" style="margin-top: 15px;">
                    <div class="info-item">
                        <div class="label">Renta Mensual Solicitada:</div>
                        <div class="fillable-field"></div> MXN
                    </div>
                    <div class="info-item">
                        <div class="label">Depósito de Garantía:</div>
                        <div class="fillable-field"></div> MXN
                    </div>
                </div>
                
                <div class="info-grid" style="margin-top: 15px;">
                    <div class="info-item">
                        <div class="label">Duración del Contrato Deseada:</div>
                        <div class="fillable-field"></div> meses
                    </div>
                    <div class="info-item">
                        <div class="label">Fecha de Inicio Deseada:</div>
                        <div class="fillable-field"></div>
                    </div>
                </div>
                
                <div class="info-item" style="margin-top: 20px;">
                    <div class="label">Nombre Completo del Propietario/Arrendador:</div>
                    <div class="fillable-field" style="min-width: 400px;"></div>
                </div>
                
                <div class="info-item" style="margin-top: 15px;">
                    <div class="label">Teléfono del Propietario/Arrendador:</div>
                    <div class="fillable-field" style="min-width: 200px;"></div>
                </div>
            </div>
        </div>

        <div class="page-break">
            <div class="section">
                <div class="section-title">VII. DECLARACIONES Y COMPROMISOS DEL SOLICITANTE</div>
                <div class="terms-section">
                    <p><strong>DECLARO BAJO PROTESTA DE DECIR VERDAD:</strong></p>
                    
                    <div style="margin: 20px 0;">
                        <p><span class="checkbox"></span> Que todos los datos proporcionados en esta solicitud son veraces y pueden ser verificados.</p>
                    </div>
                    
                    <div style="margin: 20px 0;">
                        <p><span class="checkbox"></span> Que autorizo a HESTIA Protección Legal y Patrimonial S.A.S de C.V. a verificar la información proporcionada mediante consulta a:</p>
                        <ul style="margin-left: 40px; margin-top: 10px;">
                            <li>Buró de Crédito y Círculo de Crédito</li>
                            <li>Referencias personales y laborales</li>
                            <li>Instituciones bancarias y financieras</li>
                            <li>Empleadores actuales y anteriores</li>
                        </ul>
                    </div>
                    
                    <div style="margin: 20px 0;">
                        <p><span class="checkbox"></span> Que me comprometo a informar cualquier cambio en mi situación laboral, familiar o económica durante el proceso de arrendamiento.</p>
                    </div>
                    
                    <div style="margin: 20px 0;">
                        <p><span class="checkbox"></span> Que acepto que la presente solicitud no constituye compromiso alguno hasta la firma del contrato de arrendamiento correspondiente.</p>
                    </div>
                    
                    <div style="margin: 20px 0;">
                        <p><span class="checkbox"></span> Que entiendo que la información falsa o incompleta será causa de rechazo automático de mi solicitud.</p>
                    </div>
                    
                    <div style="margin: 20px 0;">
                        <p><span class="checkbox"></span> Que acepto los términos de privacidad y manejo de datos personales de HESTIA conforme a la Ley Federal de Protección de Datos Personales.</p>
                    </div>
                    
                    <p style="margin-top: 30px;"><strong>OBSERVACIONES ADICIONALES:</strong></p>
                    <div style="border: 1px solid #ccc; min-height: 80px; padding: 10px; margin-top: 10px;"></div>
                </div>
            </div>

            <div class="signature-section" style="margin-top: 60px;">
                <div class="signature-block">
                    <div class="signature-line"></div>
                    <div><strong>FIRMA DEL SOLICITANTE</strong></div>
                    <div style="margin-top: 15px;">Nombre: <span class="fillable-field" style="min-width: 250px;"></span></div>
                    <div style="margin-top: 10px;">Fecha: <span class="fillable-field" style="min-width: 150px;"></span></div>
                    <div style="margin-top: 10px; font-size: 12px; color: #666;">Lugar: Ciudad de México, México</div>
                </div>
                
                <div class="signature-block">
                    <div style="text-align: center; padding: 20px; border: 1px dashed #ccc;">
                        <div style="font-size: 14px; font-weight: bold; margin-bottom: 10px;">USO EXCLUSIVO DE HESTIA</div>
                        <div style="font-size: 12px; margin-bottom: 15px;">Solicitud Recibida:</div>
                        <div style="margin-bottom: 10px;">Fecha: _______________</div>
                        <div style="margin-bottom: 10px;">Recibió: _______________</div>
                        <div style="margin-bottom: 10px;">Folio: _______________</div>
                        <div style="font-size: 10px; margin-top: 15px;">Estado: □ Aprobada □ Rechazada □ Pendiente</div>
                    </div>
                </div>
            </div>
        </div>

        <div class="footer">
            Hestia Protección Legal y Patrimonial S.A.S de C.V. | RFC: HPL123456789 | contacto@hestiaplp.com.mx | +52 55 1234 5678<br>
            Calle 5 de febrero 637, Torre 4, interior 6, colonia Álamos, código postal 03400, Benito Juárez, Ciudad de México | www.hestiaplp.com.mx
        </div>
    </body>
    </html>
    `;

    return html;
  }

  /**
   * Generate a downloadable PDF blob (browser-based)
   */
  async generatePolicyDocumentBlob(policy: PolicyData): Promise<Blob> {
    const html = await this.generatePolicyDocumentHTML(policy);

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new ServiceError(ErrorCode.PDF_GENERATION_FAILED, 'Could not open print window. Please allow popups.', 400);
    }

    printWindow.document.write(html);
    printWindow.document.close();

    // Convert to blob using browser's print functionality
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          printWindow.print();
          printWindow.close();

          // For now, we'll return a simple blob with the HTML content
          // In a real implementation, you'd use a proper PDF library or server-side generation
          const blob = new Blob([html], { type: 'text/html' });
          resolve(blob);
        } catch (error) {
          reject(error);
        }
      }, 1000);
    });
  }
}

// Singleton instance
export const pdfService = new PDFService();

// Bound legacy function exports for backwards compatibility
export const generatePolicyDocumentHTML = pdfService.generatePolicyDocumentHTML.bind(pdfService);
export const generatePolicyDocumentBlob = pdfService.generatePolicyDocumentBlob.bind(pdfService);

// Re-export class for type usage
export { PDFService };
