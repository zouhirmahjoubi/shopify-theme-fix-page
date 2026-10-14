# Design QA — Ibn Sina Vintage Schedule SVG

**Source visual truth**

- `C:\Users\LENOVO\Downloads\download (1).jfif`
- Source pixels: 736 × 1308.
- Role: style reference only (aged parchment, engraved bronze filigree, rolled map, compass, seal); it is not the layout or copy target.

**Rendered implementation**

- SVG: `C:\Users\LENOVO\Downloads\Shopify Theme Fix & Page\deliverables\ibn-sina-school-schedule-vintage-v3.svg`
- Final rendered evidence: `C:\Users\LENOVO\Downloads\Shopify Theme Fix & Page\deliverables\ibn-sina-school-schedule-vintage-v3-preview-qa3.png`
- Implementation pixels / CSS viewport: 1080 × 1440 at device scale factor 1.
- State: static poster, default view.

**Comparison evidence**

- Full-view side-by-side: `C:\Users\LENOVO\Downloads\Shopify Theme Fix & Page\deliverables\design-qa-vintage-v3-comparison.png`
- Density normalization: the source and implementation retain their native aspect ratios and are fit-scaled into equal-height comparison regions. A pixel-for-pixel layout match is not expected because the source contains four empty label variants while the implementation is a complete Arabic poster.
- Focused-region review: the native 1080 × 1440 implementation was inspected at original size. Separate crops were unnecessary because the title, notice copy, all six times, and both schedule headings remained clearly legible in the full-resolution render.

## Findings

- No actionable P0, P1, or P2 issues remain.
- Typography: Tahoma renders the Arabic cleanly in Microsoft Edge; hierarchy and number isolation are consistent. Copy wraps intentionally across three notice lines without collision.
- Spacing and layout rhythm: four parchment zones mirror the source's stacked-label rhythm while reserving sufficient RTL text space. New times dominate; prior entry times remain secondary.
- Colors and visual tokens: the final uses a low-saturation parchment, umber, copper, and antique-gold palette aligned with the source. Contrast remains high across all informational text.
- Image quality and asset fidelity: the scroll, compass, seal, filigree, paper texture, and shadows are vector-native and visually coherent at 1080 × 1440. The source image is not embedded or traced.
- Copy and content: the school name, announcement sentence, periods, entry times, replaced times, exit times, and Arabic qualifiers match the supplied announcement.

## Comparison history

1. First render: P2 — mirrored corner ornaments accumulated on the left because their transform origin used the destination coordinates twice. Fix: normalized mirrored `<use>` coordinates and reflected them around the poster bounds. Post-fix evidence: `ibn-sina-school-schedule-vintage-v3-preview-qa2.png` shows four-corner distribution.
2. Second render: P2 — notice-panel corner ornaments competed with the long first Arabic line. Fix: reduced those ornaments and reflowed the sentence into three balanced lines. Post-fix evidence: `ibn-sina-school-schedule-vintage-v3-preview-qa3.png` shows clear separation and intact punctuation.

## Follow-up polish

- P3: exact text metrics can vary in editors that do not have Tahoma or do not fully support SVG RTL shaping. Microsoft Edge rendering is verified; converting text to paths would improve portability but remove editability.
- P3: the reference has more aggressively torn transparent paper edges. The implementation keeps gentler edges intentionally so the dense Arabic schedule stays clean and printable.

## Implementation checklist

- [x] Valid standalone SVG XML.
- [x] Arabic RTL text and LTR numerals isolated.
- [x] All supplied times present and visually verified.
- [x] Style reference and implementation compared together.
- [x] P2 ornament and copy-overlap issues fixed.

final result: passed
