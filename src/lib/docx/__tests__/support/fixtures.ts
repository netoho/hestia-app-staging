/**
 * Hand-crafted `CoverPageData` fixtures used by the renderer snapshot tests.
 *
 * Each fixture exercises a distinct rendering path:
 *   - INDIVIDUAL_INDIVIDUAL: individual landlord + individual tenant, no guarantors.
 *   - COMPANY_COMPANY:       company landlord + company tenant, one individual joint
 *                            obligor with property guarantee (so the company-section
 *                            outer table *and* the guarantor-property table both fire).
 *   - JOINT_COUPLE:          two individual joint obligors both bringing a property
 *                            guarantee (models a married couple already entered as two
 *                            separate actors — matches the sample 1285 screenshot).
 *
 * Use the `actor` / `guarantorProperty` builders so each fixture only has to declare
 * the fields that differ from a sensible default. Defaults mimic the post-transformer
 * shape (blanks for schema-gap fields).
 */

import type {
  CoverPageData,
  CoverActorData,
  CoverGuarantorProperty,
  CoverContractTerms,
} from '../../types';

function actor(overrides: Partial<CoverActorData> & Pick<CoverActorData, 'label'>): CoverActorData {
  return {
    isCompany: false,
    name: '',
    nationality: 'Mexicana.',
    address: '',
    identificationType: '',
    identificationNumber: '',
    rfc: '',
    curp: '',
    email: '',
    phone: '',
    constitutionDeed: '',
    constitutionDate: '',
    constitutionNotary: '',
    constitutionNotaryNumber: '',
    registryCity: '',
    registryFolio: '',
    registryDate: '',
    legalRepName: '',
    legalRepPosition: '',
    legalRepIdentificationType: '',
    legalRepIdentificationNumber: '',
    legalRepAddress: '',
    legalRepPhone: '',
    legalRepRfc: '',
    legalRepCurp: '',
    legalRepEmail: '',
    legalRepWorkEmail: '',
    powerDeed: '',
    powerDate: '',
    powerNotary: '',
    powerNotaryNumber: '',
    ...overrides,
  };
}

function guarantorProperty(
  overrides: Partial<CoverGuarantorProperty> = {},
): CoverGuarantorProperty {
  return {
    deedNumber: '',
    deedDate: '',
    notaryNumber: '',
    notaryName: '',
    city: '',
    registryFolio: '',
    registryDate: '',
    registryCity: '',
    useHabitacional: false,
    useComercial: false,
    useIndustrial: false,
    address: '',
    landArea: '',
    constructionArea: '',
    boundaries: [],
    ...overrides,
  };
}

function contractTerms(overrides: Partial<CoverContractTerms> = {}): CoverContractTerms {
  return {
    propertyAddress: 'Calle Ficticia #100, Col. Ejemplo, CDMX',
    parkingSpaces: '1',
    propertyUse: 'Habitacional.',
    rentDisplay: '$25,000.00 (VEINTICINCO MIL PESOS 00/100 M.N.), mensuales.',
    securityDeposit: '$25,000.00',
    contractLength: '12 meses.',
    startDate: 'Uno de Octubre de Dos Mil Veinticinco.',
    endDate: 'Treinta de Septiembre de Dos Mil Veintiséis.',
    deliveryDate: 'Uno de Octubre de Dos Mil Veinticinco.',
    maintenanceFee: 'N/A',
    paymentMethodDescription:
      'TRANSFERENCIA ELECTRÓNICA DE FONDOS.\nTitular: María López.\nBanco: BANORTE.\nCuenta: 1234567890.\nCLABE: 072000001234567890.',
    ...overrides,
  };
}

export const INDIVIDUAL_INDIVIDUAL: CoverPageData = {
  policyNumber: 'FIX-001',
  contractStartDateRaw: '2025-10-01T12:00:00',
  landlords: [
    actor({
      label: 'Arrendador.',
      name: 'María López Hernández',
      address: 'Av. Reforma #123, Col. Centro, CDMX',
      rfc: 'LOHM800101ABC',
      curp: 'LOHM800101MDFRRN00',
      email: 'maria@example.mx',
      phone: '5511112222',
    }),
  ],
  tenants: [
    actor({
      label: 'Arrendatario.',
      name: 'Juan Pérez García',
      address: 'Calle Falsa #456, CDMX',
      rfc: 'PEGJ850101XYZ',
      curp: 'PEGJ850101HDFRRN00',
      email: 'juan@example.mx',
      phone: '5533334444',
    }),
  ],
  jointObligors: [],
  avals: [],
  guarantorProperties: [],
  contractTerms: contractTerms(),
};

export const COMPANY_COMPANY: CoverPageData = {
  policyNumber: 'FIX-002',
  contractStartDateRaw: '2025-10-15T12:00:00',
  landlords: [
    actor({
      label: 'Arrendador.',
      isCompany: true,
      name: 'Inmobiliaria Ejemplo, S.A. de C.V.',
      nationality: 'Sociedad de nacionalidad mexicana.',
      address: 'Av. Insurgentes Sur #1000, CDMX',
      rfc: 'IEJ900101AAA',
      legalRepName: 'Carlos Ramírez Sol',
      legalRepPosition: 'Apoderado Legal',
      legalRepPhone: '5522223333',
      legalRepRfc: 'RASC780101ABC',
      legalRepEmail: 'carlos@inmobiliaria-ejemplo.mx',
    }),
  ],
  tenants: [
    actor({
      label: 'Arrendatario.',
      isCompany: true,
      name: 'Tecnología del Futuro, S.A. de C.V.',
      nationality: 'Sociedad de nacionalidad mexicana.',
      address: 'Paseo de la Reforma #500, CDMX',
      rfc: 'TFU880101BBB',
      legalRepName: 'Ana Torres Gil',
      legalRepPosition: 'Representante Legal',
      legalRepPhone: '5544445555',
      legalRepRfc: 'TOGA800101DEF',
      legalRepEmail: 'ana@tecnologiadelfuturo.mx',
    }),
  ],
  jointObligors: [
    actor({
      label: 'Obligado Solidario y Fiador.',
      name: 'Roberto Sánchez Luna',
      address: 'Av. Universidad #2000, CDMX',
      rfc: 'SALR700101GHI',
      curp: 'SALR700101HDFRRN00',
      email: 'roberto@example.mx',
      phone: '5566667777',
    }),
  ],
  avals: [],
  guarantorProperties: [
    guarantorProperty({
      address: 'Av. Universidad #2000, CDMX',
    }),
  ],
  contractTerms: contractTerms({
    rentDisplay: '$50,000.00 (CINCUENTA MIL PESOS 00/100 M.N.), mensuales.',
    securityDeposit: '$50,000.00',
    startDate: 'Quince de Octubre de Dos Mil Veinticinco.',
    endDate: 'Catorce de Octubre de Dos Mil Veintiséis.',
    deliveryDate: 'Quince de Octubre de Dos Mil Veinticinco.',
    maintenanceFee: '$2,500.00',
  }),
};

export const JOINT_COUPLE: CoverPageData = {
  policyNumber: 'FIX-003',
  contractStartDateRaw: '2026-02-19T12:00:00',
  landlords: [
    actor({
      label: 'Arrendador.',
      name: 'Patricia Gómez Ríos',
      address: 'Calle Morelos #77, Cuernavaca, MOR',
      rfc: 'GORP820101JJJ',
      curp: 'GORP820101MDFRRN00',
      phone: '7771112222',
    }),
  ],
  tenants: [
    actor({
      label: 'Arrendatario.',
      name: 'Luis Fernández Aguilar',
      address: 'Calle Sur #12, CDMX',
      rfc: 'FEAL750101KKK',
      curp: 'FEAL750101HDFRRN00',
      phone: '5577778888',
    }),
  ],
  jointObligors: [
    actor({
      label: 'Obligado Solidario y Fiador 1.',
      name: 'Luis Rubio Barnetche',
      address: 'Calle Paseo de las Bugambilias #2000 Int. B, Depto. 601, CDMX',
      rfc: 'RUBL630520HY3',
      curp: 'RUBL630520HDFBRS09',
      email: 'do@familiarubio.com',
      phone: '5514017900',
    }),
    actor({
      label: 'Obligado Solidario y Fiador 2.',
      name: 'María Gabriela Doring Del Río',
      address: 'Calle Paseo de las Bugambilias #2000 Int. B, Depto. 601, CDMX',
      rfc: 'DORG661021953',
      curp: 'DORG661021MDFRXB04',
      email: 'doringgabriela@familiarubio.com',
      phone: '5514017986',
    }),
  ],
  avals: [],
  guarantorProperties: [
    guarantorProperty({
      deedNumber: '89,523',
      deedDate: 'Veintinueve de marzo de dos mil siete.',
      notaryNumber: '92',
      city: 'Distrito Federal (Ciudad de México)',
      notaryName: 'José Visoso Del Valle',
      registryFolio: '1168972-10',
      registryDate: 'Treinta de agosto de dos mil siete.',
      registryCity: 'Ciudad de México',
      useHabitacional: true,
      useComercial: false,
      useIndustrial: false,
      address:
        'Departamento 601 Edificio "B", E PRIMA, predio marcado con el número oficial 2000 calle Paseo de las Bugambilias, CDMX',
      landArea: '415 m²',
      constructionArea: '415 m²',
      boundaries: [
        { direction: 'Norte', value: 'Con área común vacío en 6.71 m.' },
        { direction: 'Poniente', value: 'Con área común vacío en 7.28 m.' },
        { direction: 'Sur', value: 'Con área común vacío en 0.99 m.' },
        { direction: 'Oriente', value: 'Con área común vacío en 6.53 m.' },
      ],
    }),
  ],
  contractTerms: contractTerms({
    rentDisplay: '$35,000.00 (TREINTA Y CINCO MIL PESOS 00/100 M.N.), mensuales.',
    securityDeposit: '$35,000.00',
    startDate: 'Diecinueve de Febrero de Dos Mil Veintiséis.',
    endDate: 'Dieciocho de Febrero de Dos Mil Veintisiete.',
    deliveryDate: 'Diecinueve de Febrero de Dos Mil Veintiséis.',
  }),
};

export const ALL_FIXTURES = {
  'individual-individual': INDIVIDUAL_INDIVIDUAL,
  'company-company': COMPANY_COMPANY,
  'joint-couple': JOINT_COUPLE,
} as const;
