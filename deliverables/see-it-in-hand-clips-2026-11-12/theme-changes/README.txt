Theme changes for the "See it in hand" shop clips

LIVE on theme #186064961613 since 2026-11-12 16:12 to 16:14 UTC (13 files, pushed on Zouhir's "Push to live").

live-base/  the live copies these changes were built on (section, snippet, css, js as of 2026-11-12 03:03 UTC; template as of 16:10 UTC)
push/       live-base plus this task's changes only: exactly what was pushed
patches/    the same changes as diffs
build_section.py  rebuilds push/sections/cv-product-counter.liquid from any newer live copy

The 8 clip files (cv-clip-*.mp4 and .jpg) are in ../final and in casify-theme/assets.
casify-theme's working copies of the section, snippet, css and js equal live as of the push.
casify-theme/templates/product.json is NOT synced (it has always drifted from live): pull the live template before changing it.

Any newly published theme must carry these 13 files, or the clips disappear.

----------------------------------------------------------------------
2026-11-12, later the same day: clips on every product page
----------------------------------------------------------------------

18:58 UTC  The live templates/product.json was saved from the theme editor
           (Judge.me star badge block added, rating source changed). That save
           no longer held the 4 shop_clip blocks, so the clips left the live pages.
19:19 UTC  LIVE on theme #186064961613: all four clips on every product page
           (5 files, pushed on Zouhir's "Push to live").

all-products/live-base/  the live copies right before this push
all-products/push/       exactly what was pushed (css, js, snippet, section, template)
all-products/build_template_all.py  adds this task's part to any live copy of
                         templates/product.json (4 blocks + 2 settings; patches the
                         blocks if they are there in the older own-page form)
all-products/all_products_edit.py   the edits made to the css, js, snippet and section
all-products/tpl_diff.py            structural diff of two JSON templates

The folders push/, live-base/ and patches/ above are the first version (each clip
only on its own product page) and are history now.

casify-theme's working copies of the section, snippet, css and js equal live as of
this push. casify-theme/templates/product.json is still NOT synced with live.

If the clips vanish again: the template was most likely saved from an editor tab
that was opened before a push. Pull the live template, run build_template_all.py on
it, push only templates/product.json.

Any newly published theme must carry the 8 clip files and these 5 files.

----------------------------------------------------------------------
2026-11-12, 19:48 UTC: captions under the clips, "Made with AI" label off
----------------------------------------------------------------------

LIVE on theme #186064961613 (4 files, on Zouhir's "Push, no label"):
css, snippet, section and templates/product.json. The js did not change.

captions/live-base/  the live copies right before this push
captions/push/       exactly what was pushed
captions/add_captions.py <live product.json> <out> --label on|off|keep
                     writes the four captions into any live copy of the template
                     and sets or keeps the "Made with AI" tick

The captions are the shop's own words about the print. They are not customer
quotes: a customer's words belong in a "Video review" block, never here.

The label is off at Zouhir's choice. He was told what it is for (AI-generated
clips that look like real footage; EU AI Act Article 50 disclosure; the store
sells to EU countries). To put it back: tick "Made with AI" on each Shop clip
block in the theme editor, or run add_captions.py with --label on and push the
template.

If the clips vanish (template saved from an old theme editor tab): pull the live
template, run all-products/build_template_all.py on it, then add_captions.py
--label off, and push only templates/product.json.

casify-theme's working copies of the section, snippet, css and js equal live as
of this push. casify-theme/templates/product.json is still NOT synced with live.

Any newly published theme must carry the 8 clip files, the js and these 4 files.
