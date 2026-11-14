"""Shop clips on every product page: each clip names its design, the page's own clip comes first,
and the player offers "See this case" under a clip of another product in place of this page's buy panel.

usage: python all_products_edit.py <theme dir>     (edits the snippet, section, script and stylesheet in place)
Every replacement must match exactly once, so the script fails loudly on a file that has drifted.
"""
import json
import re
import sys

root = sys.argv[1].rstrip('/\\')


def edit(rel, pairs):
    path = root + '/' + rel
    raw = open(path, 'rb').read().decode('utf-8')
    nl = '\r\n' if '\r\n' in raw else '\n'
    s = raw.replace('\r\n', '\n')
    for old, new in pairs:
        assert s.count(old) == 1, (rel, s.count(old), old[:90])
        s = s.replace(old, new)
    open(path, 'wb').write(s.replace('\n', nl).encode('utf-8'))
    return s


# ------------------------------------------------------------------ snippet
edit('snippets/cv-video-reviews.liquid', [
    # doc comment
    ('''  AI-made. A shop clip is matched to its product by handle, a plain text
  compare, so the default template can carry many without loading a product.
''',
     '''  AI-made. A shop clip is matched to its product by handle, a plain text
  compare, so the default template can carry many without loading a product.

  A shop clip can also show on every product. It then names the design it
  shows under the clip, so nobody takes it for the case on the page: the row's
  heading turns to "Our cases in hand", the page's own clip (if it has one)
  comes first, and in the player a clip of another case links to that case
  ("See this case") where this page's buy panel would be.
'''),
    # first pass: count clips that show another case
    ('''  assign shown = 0
  assign review_shown = 0
  assign star_sum = 0
  assign verified_count = 0
  for b in blocks
''',
     '''  assign shown = 0
  assign review_shown = 0
  assign other_shown = 0
  assign star_sum = 0
  assign verified_count = 0
  for b in blocks
'''),
    ('''    assign shown = shown | plus: 1
    assign last_phone = b.settings.phone
    if kind == 'review'
''',
     '''    assign shown = shown | plus: 1
    assign last_phone = b.settings.phone
    if kind == 'shop'
      comment
        Whose clip: the product it names ("Product in the clip"), or, when it
        names none, the product it is limited to ("Only show on").
      endcomment
      assign clip_of = b.settings.design_handle | default: b.settings.product_handle
      if clip_of != product.handle
        assign other_shown = other_shown | plus: 1
      endif
    endif
    if kind == 'review'
'''),
    # heading and labels
    ('''  assign shop_heading = vr.shop_heading | default: 'See it in hand'
  if only_shop
    assign vr_heading = shop_heading
''',
     '''  assign shop_heading = vr.shop_heading | default: 'See it in hand'
  assign design_label = vr.design_label | default: 'Design'
  assign own_label = vr.own_label | default: 'This case'
  if only_shop
    comment
      "See it in hand" is only true of the case on the page: a row that also
      shows other cases takes the wider heading.
    endcomment
    if other_shown > 0
      assign vr_heading = vr.shop_heading_all | default: 'Our cases in hand'
    else
      assign vr_heading = shop_heading
    endif
'''),
    # two passes over the blocks: this product's own clips first
    ('''          {%- assign n = 0 -%}
          {%- for b in blocks -%}
            {%- liquid
              assign kind = ''
''',
     '''          {%- assign n = 0 -%}
          {%- comment -%} Two passes: the clips of the case on the page first, then the clips of other cases. {%- endcomment -%}
          {%- for pass in (1..2) -%}
          {%- for b in blocks -%}
            {%- liquid
              assign kind = ''
'''),
    ('''              if b.settings.video == blank and b.settings.mp4_url == blank and b.settings.mp4_asset == blank and b.settings.poster == blank and b.settings.poster_asset == blank
                continue
              endif

              assign vid = b.settings.video
''',
     '''              if b.settings.video == blank and b.settings.mp4_url == blank and b.settings.mp4_asset == blank and b.settings.poster == blank and b.settings.poster_asset == blank
                continue
              endif

              assign clip_own = true
              if kind == 'shop'
                assign clip_of = b.settings.design_handle | default: b.settings.product_handle
                if clip_of != product.handle
                  assign clip_own = false
                endif
              endif
              if pass == 1 and clip_own == false
                continue
              endif
              if pass == 2 and clip_own
                continue
              endif

              assign vid = b.settings.video
'''),
    # per-clip words
    ('''              if kind == 'shop'
                assign is_shop = true
                assign who = ''
                assign clip_label = b.settings.alt | default: product.title
                assign bought_label = shop_bought_label
''',
     '''              assign clip_design = ''
              assign clip_url = ''
              assign clip_title = ''
              if kind == 'shop'
                assign is_shop = true
                assign who = ''
                assign clip_design = b.settings.design
                assign clip_title = clip_design | default: shop_heading
                assign clip_label = b.settings.alt | default: clip_design | default: product.title
                assign bought_label = shop_bought_label
                if clip_own == false and b.settings.design_handle != blank
                  assign clip_url = routes.root_url | append: '/products/' | append: b.settings.design_handle | replace: '//', '/'
                endif
'''),
    # stub: the design a shop clip shows
    ('''              {%- if bought != blank and solo == false -%}
                <p class="cvvr__stub">
                  <span class="cvvr__stub-label">{{ bought_label | escape }}</span>
                  <span class="cvvr__stub-value">{{ bought | escape }}</span>
                </p>
              {%- endif -%}
''',
     '''              {%- comment -%}
                Under a shop clip that names its design: the design, as a link to
                that case when it is not the one on the page. Otherwise the phone
                (and colour) the clip was filmed or shown on.
              {%- endcomment -%}
              {%- if is_shop and clip_design != blank and solo == false -%}
                <p class="cvvr__stub">
                  <span class="cvvr__stub-label">{% if clip_own %}{{ own_label | escape }}{% else %}{{ design_label | escape }}{% endif %}</span>
                  {%- if clip_url != blank -%}
                    <a class="cvvr__stub-value cvvr__stub-link" href="{{ clip_url }}">{{ clip_design | escape }}</a>
                  {%- else -%}
                    <span class="cvvr__stub-value">{{ clip_design | escape }}</span>
                  {%- endif -%}
                </p>
              {%- elsif bought != blank and solo == false -%}
                <p class="cvvr__stub">
                  <span class="cvvr__stub-label">{{ bought_label | escape }}</span>
                  <span class="cvvr__stub-value">{{ bought | escape }}</span>
                </p>
              {%- endif -%}
'''),
    # per-clip data for the player
    ('''                  "stars": 0,
                  "title": {{ shop_heading | json }},
                  "body": "",
''',
     '''                  "stars": 0,
                  "title": {{ clip_title | json }},
                  "own": {{ clip_own | json }},
                  "url": {{ clip_url | json }},
                  "body": "",
'''),
    ('''            {%- assign n = n | plus: 1 -%}
          {%- endfor -%}
        </ul>
''',
     '''            {%- assign n = n | plus: 1 -%}
          {%- endfor -%}
          {%- endfor -%}
        </ul>
'''),
    # player: a link to the case in the clip
    ('''              <p class="cvvr-lb__bought" data-cvvr-lb-bought hidden>
                <span data-cvvr-lb-bought-label>{{ review_bought_label | escape }}</span>
                <b data-cvvr-lb-bought-text></b>
              </p>
            </article>
''',
     '''              <p class="cvvr-lb__bought" data-cvvr-lb-bought hidden>
                <span data-cvvr-lb-bought-label>{{ review_bought_label | escape }}</span>
                <b data-cvvr-lb-bought-text></b>
              </p>
              {%- comment -%} Shown by the script under a shop clip of another case, where this page's buy panel would mislead. {%- endcomment -%}
              <p class="cvvr-lb__see-row" data-cvvr-lb-see-row hidden>
                <a class="cvvr-lb__bag cvvr-lb__see" data-cvvr-lb-see href="{{ routes.all_products_collection_url }}">{{ vr.see_label | default: 'See this case' | escape }}</a>
              </p>
            </article>
'''),
])

# ------------------------------------------------------------------ section schema
sec = edit('sections/cv-product-counter.liquid', [
    ('''        { "type": "text", "id": "shop_heading", "label": "Heading", "default": "See it in hand" },
''',
     '''        { "type": "text", "id": "shop_heading", "label": "Heading", "default": "See it in hand", "info": "Used when every clip shows the case on the page." },
        { "type": "text", "id": "shop_heading_all", "label": "Heading with other cases", "default": "Our cases in hand", "info": "Used when the row also shows clips of other cases." },
'''),
    ('''        { "type": "text", "id": "shop_hint", "label": "Hint", "default": "Tap a clip to see it larger" },
''',
     '''        { "type": "text", "id": "shop_hint", "label": "Hint", "default": "Tap a clip to see it larger" },
        { "type": "text", "id": "design_label", "label": "Label over a design name", "default": "Design" },
        { "type": "text", "id": "own_label", "label": "Label on this page's own clip", "default": "This case" },
        { "type": "text", "id": "see_label", "label": "Link to another case", "default": "See this case" },
'''),
    ('''        { "type": "text", "id": "alt", "label": "What the clip shows",''',
     '''        { "type": "text", "id": "design", "label": "Design name", "info": "Shown under the clip, for example \\"Snow Day Penguin\\". Needed when the clip shows on other products too." },
        { "type": "text", "id": "design_handle", "label": "Product in the clip (handle)", "info": "The last part of that product's web address. On its own page the clip comes first with the buy panel; on other pages the name links to it." },
        { "type": "text", "id": "alt", "label": "What the clip shows",'''),
])
m = re.search(r'{%\s*schema\s*%}(.*?){%\s*endschema\s*%}', sec, re.S)
d = json.loads(m.group(1))
clip = [b for b in d['blocks'] if b['type'] == 'shop_clip'][0]
text = [b for b in d['blocks'] if b['type'] == 'video_reviews'][0]
print('shop_clip settings:', [x.get('id') for x in clip['settings'] if x.get('id')])
print('text block shop settings:', [x.get('id') for x in text['settings'] if x.get('id') and ('shop' in x['id'] or x['id'] in ('design_label', 'own_label', 'see_label', 'ai_label'))])

# ------------------------------------------------------------------ script
edit('assets/cv-pdp-video-reviews.js', [
    ('''      boughtLabel: $('[data-cvvr-lb-bought-label]', lb),
      boughtText: $('[data-cvvr-lb-bought-text]', lb)
    };
''',
     '''      boughtLabel: $('[data-cvvr-lb-bought-label]', lb),
      boughtText: $('[data-cvvr-lb-bought-text]', lb),
      seeRow: $('[data-cvvr-lb-see-row]', lb),
      see: $('[data-cvvr-lb-see]', lb)
    };
    // The shopping panel belongs to the case on the page. Under a shop clip of
    // another case it would sell the wrong thing, so it steps aside for a link.
    const buyBox = $('[data-cvvr-buy]', lb);
    const ctaBox = $('.cvvr-lb__cta', lb);
'''),
    ('''      if (out.boughtLabel) out.boughtLabel.textContent = r.boughtLabel || boughtLabelText;
      out.boughtText.textContent = bought;
''',
     '''      if (out.boughtLabel) out.boughtLabel.textContent = r.boughtLabel || boughtLabelText;
      out.boughtText.textContent = bought;

      const other = shop && r.own === false;
      if (buyBox) buyBox.hidden = other;
      if (ctaBox) ctaBox.hidden = other;
      if (out.seeRow) {
        out.seeRow.hidden = !(other && r.url);
        if (other && r.url && out.see) out.see.href = r.url;
      }
'''),
])

# ------------------------------------------------------------------ stylesheet
edit('assets/cv-pdp-video-reviews.css', [
    ('''.cvvr__tag--ink { position: static; background: var(--teal-100); color: var(--teal-700); box-shadow: none; }
/* ds-allow-hardcode:end */
''',
     '''.cvvr__tag--ink { position: static; background: var(--teal-100); color: var(--teal-700); box-shadow: none; }
/* ds-allow-hardcode:end */
/* The design under a shop clip, as a link to that case when it is not the one on the page. */
.cvvr__stub .cvvr__stub-link { color: var(--text-link); text-decoration: underline; text-underline-offset: .2em; }
.cvvr__stub .cvvr__stub-link:hover { color: var(--text-link-hover); }
.cvvr__stub .cvvr__stub-link:focus-visible { outline: 3px solid var(--focus-ring); outline-offset: 2px; } /* ds-allow-hardcode: the focus ring every control in this file uses */
'''),
    ('''.cvvr-lb__tagline { display: flex; margin: 0; }''',
     '''.cvvr-lb__tagline { display: flex; margin: 0; }
.cvvr-lb__see-row { display: flex; margin: 0; }
.cvvr-lb__see { text-decoration: none; }'''),
])
print('edits applied')
