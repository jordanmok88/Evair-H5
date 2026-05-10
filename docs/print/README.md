# EvairSIM SIM Card User Manual Print Files

This folder contains the editable source and generated output for the 12cm x 12cm English SIM card user manual.

## Files

- `sim-card-user-manual.html` — editable booklet source in reader-page order.
- `print.css` — print layout for 126mm x 126mm pages, including 3mm bleed around a 120mm trim.
- `export-manual.mjs` — local export script using Google Chrome and Poppler tools.
- `evairsim-sim-card-user-manual-12cm-reader.pdf` — generated print PDF for the factory.
- `preview/page-*.png` — rendered page previews for visual checks.

## Export

From the project root:

```bash
node docs/print/export-manual.mjs
```

The PDF is prepared as reader-order pages for saddle stitching. The current layout uses 24 pages so the 12cm booklet keeps readable type while preserving the full source-manual information. The printing factory should handle booklet imposition.
