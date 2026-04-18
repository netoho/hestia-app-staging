/**
 * Styling constants for the contract cover page (.docx).
 *
 * Page geometry, font, row heights, cell margins, borders, column widths and
 * spacing (all in twips or percentage units) are centralised here so the
 * sections can be edited without spreading magic numbers across the tree.
 */

import { BorderStyle } from 'docx';

export const FONT = 'Arial';

// All text 9pt (half-points = 18) per spec — titles stand out via bold + centering, not size.
export const SZ = 18;
export const SZ_TITLE = 18;
export const SZ_SUBTITLE = 18;
export const SZ_SMALL = 18;

export const LABEL_BG = 'D6E4F0'; // light blue shading on labels and sub-headers

// Row height — minimum 0.81 cm = 459 twips (1 cm ≈ 567 twips).
export const ROW_HEIGHT_MIN = 459;

// Cell margins — top/bottom 0, left/right 0.19 cm = 108 twips.
export const CELL_MARGINS = { top: 0, bottom: 0, left: 108, right: 108 };

// Page margins — 1" top/bottom, 0.75" left/right.
export const PAGE_MARGINS = { top: 1440, bottom: 1440, left: 1080, right: 1080 };

// Paragraph / title / section spacing (twips).
export const SPACING = {
  paraBeforeAfter: 20,
  titleAfter: 80,
  subtitleAfter: 160,
  gapAfter: 120,
  condicionesBefore: 300,
} as const;

// Borders.
export const THIN = { style: BorderStyle.SINGLE as const, size: 1, color: '000000' };
export const NO_B = { style: BorderStyle.NONE as const, size: 0, color: 'FFFFFF' };

/**
 * Outer table (vlabel | inner): border rectangle with one vertical divider between vlabel and
 * inner. `insideHorizontal` is THIN so multi-row outer tables (company section) have row
 * separators; single-row outer tables are unaffected.
 */
export const OUTER_BORDERS = {
  top: THIN, bottom: THIN, left: THIN, right: THIN,
  insideVertical: THIN,
  insideHorizontal: THIN,
};

// Inner table — grid lines only (no outer rectangle; the outer table provides that).
export const INNER_BORDERS = {
  top: NO_B, bottom: NO_B, left: NO_B, right: NO_B,
  insideHorizontal: THIN, insideVertical: THIN,
};

// Widths (percent of page or inner table).
export const W_VL = 5;     // vlabel column (of page)
export const W_INNER = 95; // inner column (of page)
export const A_L = 16;     // actor label cell (of inner)
export const A_V = 34;     // actor value cell (of inner)
export const GP_COL = 100 / 12; // guarantor-property 12-col base
export const S_L = 25;     // simple label cell (of inner)
export const S_V = 75;     // simple value cell (of inner)
