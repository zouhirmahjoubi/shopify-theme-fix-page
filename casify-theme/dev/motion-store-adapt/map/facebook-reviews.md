# facebook-reviews ("Facebook reviews", Elixir copy)

File: `sections/facebook-reviews.liquid` (265 lines). Family: reviews-2.

## Status

**orphan**. It is not placed in any `templates/*.json` or section group (grep of `"type": "facebook-reviews"` finds nothing). It is addable from the editor anywhere except the header group (schema `disabled_on: groups [header]`, :192), with preset "Facebook reviews" in category "Social" (:257-262).

## Purpose

A verbatim port of the Elixir theme's "Facebook Reviews" section (comment :1-17): a centred title, a Facebook-blue pill badge, and a 2 or 3 column grid of Facebook-style grey comment bubbles with decorative "Like" and "Reply" labels and a time stamp. Changes from Elixir: blocks ship empty, it hides until one review is complete, the badge is neutral, and Elixir's reveal is replaced by a GSAP "live thread" entrance.

## Files (owned / shared)

Owned (only this section references them):
- `assets/cv-facebook-reviews.css` (249 lines). Part 1 is the Elixir CSS verbatim; part 2 holds grid utilities and the typing dots (css:1-7, :226-249).
- `assets/cv-facebook-reviews.js` (181 lines). It is loaded by the layout gate `layout/theme.liquid:267-270` (`editor or content_for_layout contains 'data-cvfr'`). `data-cvfr` appears only in this section.
- `assets/user-placeholder.png` (avatar fallback, :100). It is referenced only here.
- The layout gate lines `layout/theme.liquid:267-270` exist only for this section, but layout itself is a shared file.

Shared:
- GSAP core, ScrollTrigger and SplitText, loaded on every page by `snippets/gsap.liquid:36`.
- No snippets are rendered.

## Store adaptation findings

1. **Off-brand visual system (DESIGN.md Don'ts).** It uses Facebook blue `#0866ff` as the default badge colour (:236; css:33 `!important`), the system UI font stack (css:35, :229), pure black `#000000` titles (:235), and Facebook greys `#65676B`, `#050505` and `#8a8d91` (:239-242; css:244, :247-248). The schema also offers a generic tech gradient with defaults `#ff6b6b` to `#4ecdc4` (:228-232), against DESIGN.md:196 ("Don't use generic gradient-heavy tech styling"). Fix: re-skin in Casify tokens. Bubbles go to `--cream-50` / `--cream-100` with a hairline `--cream-300` border and 14 px card radius, names in `--font-display` with `--cocoa-700`, text in `--font-body` with `--cocoa-600`, meta in `--font-label`, and the badge becomes a teal or cocoa ticket. Delete the gradient settings, or limit `background_color` to a `select` of Page cream / Inset cream / Paper. Remove `!important` from inline styles (:48, :53).
2. **Text sizes below the floor.** Defaults are badge 10 px (:203, :212), actions and date 10 px (:208, :217), names and text 13 px. Range minimums go down to 8 px. DESIGN.md:128 and :199 require mobile labels of about 11-12 px or larger. Fix: raise the minimums to 12 and the defaults to 12 for labels and 15 for text, or drop per-size settings and use theme type tokens.
3. **Unescaped settings:** `section.settings.title` (:50), `badge_text` (:68), `like_text` and `reply_text` (:115, :118). They are merchant text, but escape them (`| escape`) for consistency with the theme. Block fields are already escaped.
4. **Hardcoded English editor copy** (:129) "Add the reviewer's name and their comment to show this review." is editor-only. Move it to a locale key such as `sections.facebook_reviews.editor_draft`.
5. **"Like" and "Reply" are fake controls.** They are `aria-hidden` (:113), but sighted shoppers see interactive-looking labels that do nothing. That reads as an imitation of Facebook's UI. Fix: remove them, or replace the row with a real "View on Facebook" link from a new optional `source_url` block setting (as `facebook-comments` does at :61-66).
6. **Default title "Latest Facebook reviews"** (:196). "Latest" implies a live or recent feed, but the section is hand-copied. Suggested default: "Seen on our Facebook page". Badge default "Comments from our Facebook page" (:197) is fine.
7. **No Casify binding.** There is no product link. Optionally add a `product` block setting with a case ticket, as in the other walls.
8. **Generic avatar** `user-placeholder.png` (:100). Use the initial-letter avatar the other Casify walls use (facebook-comments.liquid:50) and drop the PNG.
9. **No `max_blocks`.** Add `"max_blocks": 12` to match facebook-testimonials.
10. **Duplicate role.** It overlaps the live `facebook-comments` section (same job: copied Facebook comments). Recommend one of these, decided by the merchant: (a) keep this orphan unplaced and only re-skin it, or (b) retire it. Do not delete files without merchant confirmation (STORE-FACTS legend).

## Claims register

| Claim | Where | Status |
|---|---|---|
| "Latest Facebook reviews" (recency and source) | :196 | Unbacked "Latest". Source is conditional on the merchant copying real comments. Change the default (finding 6) |
| Badge "Comments from our Facebook page" | :197 | Conditional, fine if true. Schema info warns not to say "viral" (:197). OK |
| Like / Reply labels | :198-199, :113-120 | Implied engagement UI with no data. Remove (finding 5) |
| Typing indicator ("three-dot typing" in JS, :71-82) | assets/cv-facebook-reviews.js:6-8, :71-82 | **Simulated live activity.** It implies someone is typing now. Treat as an unbacked claim and remove it |
| Names, comments, dates | blocks | MERCHANT-TYPED. The preset has 3 empty blocks |

## Motion inventory

- `data-cv-*`: none. Own attributes: `data-cvfr` (gate and root), `data-cvfr-title`, `data-cvfr-badge`, `data-cvfr-badge-icon`, `data-cvfr-item`.
- `assets/cv-facebook-reviews.js`: GSAP context. The title is split into words with a mask by SplitText (:97-99), with a fallback fade. The badge pops and the Facebook icon spins in (:103-106). Items are pre-hidden with `gsap.set` (:112-118), then `ScrollTrigger.batch` (start `top 90%`, once) runs `arrive()`: the avatar pops, the bubble scales from 0.6 at the top left with `back.out`, typing dots bounce, then the text and meta appear (:69-85, :120-135). Fine pointers get a hover lift with `rgba(0,0,0,.12)` shadows (:138-148).
- GSAP plugins: ScrollTrigger, SplitText.
- Reduced motion: returns before anything (:32). The CSS is the final state. OK.
- No-JS: readable, because the hidden states are set by JS only. OK.
- Hidden tab: `head.progress(1)` and `finish()` run if the document is hidden at init (:150, :153). Items are still pre-hidden by `gsap.set`, but `finish()` reverts the context. OK.
- Editor: load, unload, select and block-select are all handled (:171-180). OK.
- Issues: (a) the typing dots (claims register); (b) `back.out(2.2)` and `back.out(1.5)` on every card is more bounce than DESIGN.md:183 allows ("candy spring only for small moments of delight"); (c) black-alpha shadows instead of cocoa; (d) the icon spin on the Facebook logo animates a third-party trademark.

## Motion opportunities

1. **(High, required with the re-skin) Replace the "live thread" with a Casify "notes pinned up" entrance.** Remove the typing dots and the logo spin. The avatar stamps, the bubble slides up 16 px with soft-out (`power3.out`, 0.42 s), and the meta row fades last, with stagger 0.06 per batch. Keep `back.out` only on the badge ticket. Keep the existing context, batch and editor plumbing, which is solid. Swap the hover shadow to cocoa `rgba(51,35,26,.18)`.
2. **(Medium) Heading:** keep SplitText with a mask. It is good, and the title is plain text.
3. **(Low) Badge as a stamped ticket:** scale 1.2 to 1 plus rotation -4 to -1.5 deg, once.
4. Commerce: not applicable (no product context). If placed on a product template, add a `data-cv-scroll-to-buy` ghost button "Choose your case" under the grid (cv-motion.js:235-241, target `#cvPdp` from cv-product-counter.liquid:208).

## Risks

- Orphan: do not place it in a template as part of motion work (MOTION-SYSTEM 6.1 tail: no motion work on unplaced sections until placed). Re-skin and honesty fixes are safe because they change no shopper surface.
- A layout gate change touches the shared `layout/theme.liquid:267-270`. Keep the gate string `data-cvfr` unchanged.
- The Facebook logo is a trademark. Keep it as attribution only, unanimated.
- Removing the Elixir look changes what the merchant asked for ("copied with its original look", comment :2-3). Confirm the re-skin with the merchant first. The honesty fixes (typing dots, fake Like/Reply, "Latest") should go ahead regardless.
