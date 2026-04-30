/**
 * Guarantor property section — "Inmueble del Obligado Solidario y Fiador." block.
 *
 * Uses a 12-column grid so a mix of 2-, 3-, 6- and 7-cell rows align. The layout
 * is expressed as a `GpRowSpec[]`; spec → `TableRow` lives in `../rowSpec.ts`.
 */

import { Table } from 'docx';
import type { CoverGuarantorProperty } from '../../types';
import { BLANK, BOUNDARY_DIRECTIONS } from '../../coverPageDefaults';
import { t } from '@/lib/i18n';
import { sectionTable } from '../sectionTable';
import { renderGpRow, type GpRowSpec } from '../rowSpec';

export function guarantorPropertyRowSpecs(prop: CoverGuarantorProperty): GpRowSpec[] {
  const cp = t.pages.documents.coverPage;
  const gp = cp.guarantorProperty;

  const specs: GpRowSpec[] = [
    { kind: 'gp.pair', l1: gp.deedNumber, v1: prop.deedNumber, l2: gp.deedDate, v2: prop.deedDate },
    { kind: 'gp.triple', l1: gp.notaryNumber, v1: prop.notaryNumber, l2: gp.city, v2: prop.city, l3: gp.notary, v3: prop.notaryName },
    { kind: 'gp.pair', l1: gp.registryFolio, v1: prop.registryFolio, l2: gp.registryDate, v2: prop.registryDate },
    { kind: 'gp.wide', label: gp.registry, value: prop.registryCity },
    {
      kind: 'gp.tipoUso',
      usageLabel: gp.usage,
      residentialLabel: gp.residential,
      commercialLabel: gp.commercial,
      industrialLabel: gp.industrial,
      residential: prop.useHabitacional,
      commercial: prop.useComercial,
      industrial: prop.useIndustrial,
    },
    { kind: 'gp.wide', label: gp.address, value: prop.address },
    { kind: 'gp.pair', l1: gp.landArea, v1: prop.landArea, l2: gp.constructionArea, v2: prop.constructionArea },
  ];

  // Always render the four cardinal boundaries — matches sample contract convention.
  BOUNDARY_DIRECTIONS.forEach((dir, i) => {
    const match = prop.boundaries.find((b) => b.direction.toLowerCase() === dir.toLowerCase());
    specs.push({
      kind: 'gp.boundary',
      label: i === 0 ? gp.boundaries : '',
      direction: cp.boundaryLabels[dir],
      value: match?.value ?? BLANK,
    });
  });

  return specs;
}

export function guarantorPropertyTable(prop: CoverGuarantorProperty): Table {
  const gp = t.pages.documents.coverPage.guarantorProperty;
  return sectionTable(gp.sectionLabel, guarantorPropertyRowSpecs(prop).map(renderGpRow));
}
