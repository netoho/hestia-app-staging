# Cover-letter sample fixtures

Landing zone for `.docx` and `.input.json` pairs produced by
[`scripts/generateCoverFixture.ts`](../../../scripts/generateCoverFixture.ts).

## Generate from a real policy

```bash
bun run cover:fixture <policyId> [outDir=dev/fixtures/cover-samples]
```

Writes `<policyNumber>-<first-8-chars-of-id>.docx` and `...input.json` into
this directory. Open the `.docx` in Word / Pages / LibreOffice to eyeball the
layout against `documents/contracts/screenshots/` — Arial 9pt, blue label
shading (`#D6E4F0`), rotated vertical labels, four fixed cardinal boundary
rows, header formatted as `"<policyNumber> - <YYYYMMDD>"`, footer as
"Página X de Y".

## Relation to the snapshot tests

The snapshot tests under
[`src/lib/docx/__tests__/`](../../../src/lib/docx/__tests__/) use hand-crafted
in-code fixtures (`support/fixtures.ts`) rather than files from this folder.
That keeps the tests self-contained and DB-free. This folder is for humans
producing pixel-level diffs with real data.

When the snapshot tests fail because of an intentional template change:

```bash
bun test --update-snapshots src/lib/docx/__tests__/render.snapshot.test.ts
```

Review the snapshot diff and the sample `.docx` files together before
merging.
