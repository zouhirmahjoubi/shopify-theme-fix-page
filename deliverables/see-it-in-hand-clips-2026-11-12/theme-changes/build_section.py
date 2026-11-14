"""Apply this task's changes, and nothing else, to a copy of the LIVE sections/cv-product-counter.liquid.

usage: python build_section.py <live copy> <output>

The shared checkout's copy of this section is being edited by another session, so the file that goes
to a theme is always built here: the live file plus the hunks below.
"""
import json
import re
import sys

src = open(sys.argv[1], 'rb').read().decode('utf-8')
nl = '\r\n' if '\r\n' in src else '\n'
s = src.replace('\r\n', '\n')


def sub(old, new):
    global s
    assert s.count(old) == 1, (s.count(old), old[:80])
    s = s.replace(old, new)


# 1. The row under the photo: customer clips and shop clips.
sub('''        photo (assets/cv-pdp-video-reviews.css), in one column it follows the
        buy box. Renders nothing until this product has a clip.
      {%- endcomment -%}
      {%- liquid
        assign vr_block = nil
        for b in section.blocks
          if b.type == 'video_reviews'
            assign vr_block = b
            break
          endif
        endfor
        assign vr_uid = section.id | append: '-vr'
      -%}
      {%- if vr_block.settings.show_clips -%}{%- render 'cv-video-reviews', blocks: section.blocks, clip_type: 'video_review', settings: vr_block.settings, uid: vr_uid, mode: 'inline', attrs: vr_block.shopify_attributes, product: product -%}{%- endif -%}''',
    '''        photo (assets/cv-pdp-video-reviews.css), in one column it follows the
        buy box. Renders nothing until this product has a clip.

        Two kinds of clip share the row. Customer clips ("Video review" blocks)
        show only while "Show customer clips" is ticked. Shop clips ("Shop clip"
        blocks) are the shop's own: they show without a name, stars or quote,
        and are matched to this product by its handle, a text compare that
        loads no product.
      {%- endcomment -%}
      {%- liquid
        assign vr_block = nil
        assign vr_shop_clips = 0
        for b in section.blocks
          if b.type == 'video_reviews'
            if vr_block == nil
              assign vr_block = b
            endif
          elsif b.type == 'shop_clip'
            if b.settings.product_handle == blank or b.settings.product_handle == product.handle
              if b.settings.video != blank or b.settings.mp4_url != blank or b.settings.mp4_asset != blank or b.settings.poster != blank or b.settings.poster_asset != blank
                assign vr_shop_clips = vr_shop_clips | plus: 1
              endif
            endif
          endif
        endfor
        assign vr_uid = section.id | append: '-vr'
        assign vr_reviews = false
        if vr_block.settings.show_clips
          assign vr_reviews = true
        endif
      -%}
      {%- if vr_reviews or vr_shop_clips > 0 -%}{%- render 'cv-video-reviews', blocks: section.blocks, clip_type: 'video_review', shop_type: 'shop_clip', reviews: vr_reviews, settings: vr_block.settings, uid: vr_uid, mode: 'inline', attrs: vr_block.shopify_attributes, product: product -%}{%- endif -%}''')

# 2. "Video reviews: text" block: a note, and the words for a row of shop clips.
sub('''        { "type": "paragraph", "content": "Customer video reviews show under the product photo. Add a \\"Video review\\" block for each clip; the row appears once this product has one. This block only changes the words." },
''',
    '''        { "type": "paragraph", "content": "Customer video reviews show under the product photo. Add a \\"Video review\\" block for each clip; the row appears once this product has one. This block only changes the words." },
        { "type": "paragraph", "content": "Clips you made yourself go in \\"Shop clip\\" blocks. They show in the same row with no name, stars or quote, under the \\"Shop clips\\" words below." },
''')
sub('''        { "type": "url", "id": "submit_url", "label": "Send-a-clip page", "info": "The link shows only when a page is chosen, for example your contact page." },
        { "type": "header", "content": "Shopping panel" },
''',
    '''        { "type": "url", "id": "submit_url", "label": "Send-a-clip page", "info": "The link shows only when a page is chosen, for example your contact page." },
        { "type": "header", "content": "Shop clips" },
        { "type": "paragraph", "content": "Used when the row holds only clips you made yourself. Keep these words true of the clips: nothing that says a customer filmed or said it." },
        { "type": "text", "id": "shop_heading", "label": "Heading", "default": "See it in hand" },
        { "type": "text", "id": "shop_lede", "label": "Text", "info": "Optional line under the heading." },
        { "type": "text", "id": "shop_bought_label", "label": "Label before the phone", "default": "Shown on" },
        { "type": "text", "id": "ai_label", "label": "Label on AI-made clips", "default": "Made with AI", "info": "Shows on every shop clip ticked \\"Made with AI\\"." },
        { "type": "text", "id": "shop_hint", "label": "Hint", "default": "Tap a clip to see it larger" },
        { "type": "header", "content": "Shopping panel" },
''')

# 3. The "Shop clip" block.
sub('''        { "type": "product", "id": "product", "label": "Only show on", "info": "Leave blank to show this clip on every product that uses this template." }
      ]
    }
  ],
  "presets": [''',
    '''        { "type": "product", "id": "product", "label": "Only show on", "info": "Leave blank to show this clip on every product that uses this template." }
      ]
    },
    {
      "type": "shop_clip",
      "name": "Shop clip",
      "settings": [
        { "type": "paragraph", "content": "A clip you made yourself, shown under the product photo with no name, stars or quote. Never use it for a customer's clip: that goes in a \\"Video review\\" block." },
        { "type": "video", "id": "video", "label": "Video", "info": "Upright 9:16 works best." },
        { "type": "text", "id": "mp4_url", "label": "Or a direct MP4 link", "info": "Used when no video is uploaded." },
        { "type": "image_picker", "id": "poster", "label": "Cover image", "info": "Shown until the clip plays. The clip's own first frame works best." },
        { "type": "header", "content": "Or files kept in the theme" },
        { "type": "paragraph", "content": "For clips stored in this theme's assets folder. Used when no video, link or cover image is set above." },
        { "type": "text", "id": "mp4_asset", "label": "Video file name", "info": "For example \\"cv-clip-snow-day-penguin.mp4\\"." },
        { "type": "text", "id": "poster_asset", "label": "Cover image file name", "info": "For example \\"cv-clip-snow-day-penguin.jpg\\"." },
        { "type": "header", "content": "About the clip" },
        { "type": "text", "id": "alt", "label": "What the clip shows", "info": "Read out by screen readers, for example \\"Snow Day Penguin case on an iPhone 18 Pro Max\\". Blank uses the product name." },
        { "type": "text", "id": "phone", "label": "Shown on", "info": "The phone and finish in the clip, for example \\"iPhone 18 Pro Max · Glossy\\"." },
        { "type": "checkbox", "id": "ai_made", "label": "Made with AI", "default": false, "info": "Tick when the clip was generated with AI. The clip then carries a \\"Made with AI\\" label." },
        { "type": "checkbox", "id": "silent", "label": "No sound", "default": true, "info": "Hides the sound buttons on a clip that has no audio." },
        { "type": "text", "id": "product_handle", "label": "Only show on (product handle)", "info": "The last part of the product's web address. Blank shows the clip on every product that uses this template." }
      ]
    }
  ],
  "presets": [''')

m = re.search(r'{%\s*schema\s*%}(.*?){%\s*endschema\s*%}', s, re.S)
d = json.loads(m.group(1))
for b in d['blocks']:
    for st in b.get('settings', []):
        for o in st.get('options', []) or []:
            assert len(o['label']) <= 50, (b['type'], st['id'], o['label'])
print('schema ok; blocks:', [b['type'] for b in d['blocks']])
out = s.replace('\n', nl)
open(sys.argv[2], 'wb').write(out.encode('utf-8'))
print('bytes', len(src.encode('utf-8')), '->', len(out.encode('utf-8')), '| line endings', 'CRLF' if nl == '\r\n' else 'LF')
