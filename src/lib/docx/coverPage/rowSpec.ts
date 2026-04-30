/**
 * Declarative row specs for the cover-page tables.
 *
 * Each section (actor, guarantor property, contract-terms) expresses its layout
 * as an ordered array of plain-data row specs. A single interpreter per grid
 * family turns the specs into `docx` `TableRow` objects. Visual tweaks —
 * reordering rows, adding a new field, swapping a pair for a wide row — become
 * one-line edits in the data, with no docx-API calls scattered around.
 *
 * Grid families:
 *   - actor  → 4 cols  (label | value | label | value)
 *   - gp     → 12 cols (composable via columnSpan)
 *   - simple → 2 cols  (label | value)
 */

import {
  TableRow,
  TableCell,
  HeightRule,
  WidthType,
  VerticalAlign,
  AlignmentType,
  ShadingType,
} from 'docx';
import {
  A_L,
  A_V,
  GP_COL,
  S_L,
  S_V,
  ROW_HEIGHT_MIN,
  LABEL_BG,
  CELL_MARGINS,
  SZ,
} from './styles';
import { para } from './helpers';
import { lblCell, valCell } from './cells';
import { NA } from '../coverPageDefaults';

// ─── Types ──────────────────────────────────────────────────────────

export type ActorRowSpec =
  | { kind: 'actor.pair'; l1: string; v1: string; l2: string; v2: string }
  | { kind: 'actor.wide'; label: string; value: string }
  | { kind: 'actor.subHeader'; text: string };

export type GpRowSpec =
  | { kind: 'gp.pair'; l1: string; v1: string; l2: string; v2: string }
  | { kind: 'gp.triple'; l1: string; v1: string; l2: string; v2: string; l3: string; v3: string }
  | { kind: 'gp.wide'; label: string; value: string }
  | { kind: 'gp.tipoUso'; usageLabel: string; residentialLabel: string; commercialLabel: string; industrialLabel: string; residential: boolean; commercial: boolean; industrial: boolean }
  | { kind: 'gp.boundary'; label: string; direction: string; value: string };

export type SimpleRowSpec = { kind: 'simple.pair'; label: string; value: string };

// ─── Shared row factory ─────────────────────────────────────────────

function row(children: TableCell[]): TableRow {
  return new TableRow({
    cantSplit: true,
    height: { value: ROW_HEIGHT_MIN, rule: HeightRule.ATLEAST },
    children,
  });
}

// ─── Actor grid (4 cols) ────────────────────────────────────────────

export function renderActorRow(spec: ActorRowSpec): TableRow {
  switch (spec.kind) {
    case 'actor.pair':
      return row([
        lblCell(spec.l1, A_L),
        valCell(spec.v1, A_V),
        lblCell(spec.l2, A_L),
        valCell(spec.v2, A_V),
      ]);
    case 'actor.wide':
      return row([lblCell(spec.label, A_L), valCell(spec.value, A_V + A_L + A_V, 3)]);
    case 'actor.subHeader':
      return row([
        new TableCell({
          children: [para(spec.text, true, SZ, AlignmentType.CENTER)],
          columnSpan: 4,
          width: { size: 100, type: WidthType.PERCENTAGE },
          verticalAlign: VerticalAlign.CENTER,
          shading: { fill: LABEL_BG, type: ShadingType.CLEAR },
          margins: CELL_MARGINS,
        }),
      ]);
  }
}

// ─── Guarantor-property grid (12 cols) ──────────────────────────────

export function renderGpRow(spec: GpRowSpec): TableRow {
  switch (spec.kind) {
    case 'gp.pair':
      return row([
        lblCell(spec.l1, GP_COL * 2, 2),
        valCell(spec.v1, GP_COL * 4, 4),
        lblCell(spec.l2, GP_COL * 2, 2),
        valCell(spec.v2, GP_COL * 4, 4),
      ]);
    case 'gp.triple':
      return row([
        lblCell(spec.l1, GP_COL * 2, 2),
        valCell(spec.v1, GP_COL * 2, 2),
        lblCell(spec.l2, GP_COL * 2, 2),
        valCell(spec.v2, GP_COL * 2, 2),
        lblCell(spec.l3, GP_COL * 2, 2),
        valCell(spec.v3, GP_COL * 2, 2),
      ]);
    case 'gp.wide':
      return row([lblCell(spec.label, GP_COL * 2, 2), valCell(spec.value, GP_COL * 10, 10)]);
    case 'gp.tipoUso':
      return row([
        lblCell(spec.usageLabel, GP_COL * 3, 3),
        lblCell(spec.residentialLabel, GP_COL * 2, 2),
        valCell(spec.residential ? 'X' : NA, GP_COL, 1, { center: true }),
        lblCell(spec.commercialLabel, GP_COL * 2, 2),
        valCell(spec.commercial ? 'X' : NA, GP_COL, 1, { center: true }),
        lblCell(spec.industrialLabel, GP_COL * 2, 2),
        valCell(spec.industrial ? 'X' : NA, GP_COL, 1, { center: true }),
      ]);
    case 'gp.boundary':
      return row([
        lblCell(spec.label, GP_COL * 3, 3),
        lblCell(spec.direction, GP_COL * 2, 2),
        valCell(spec.value, GP_COL * 7, 7),
      ]);
  }
}

// ─── Simple grid (2 cols) ───────────────────────────────────────────

export function renderSimpleRow(spec: SimpleRowSpec): TableRow {
  return row([lblCell(spec.label, S_L), valCell(spec.value, S_V)]);
}
