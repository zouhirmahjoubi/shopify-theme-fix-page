const fs=require('fs'),path=require('path');
const file=path.join(__dirname,'payments-readiness-2026-10-07','sections/footer.liquid');
const before="        {%- if block.type == 'link_list' -%}\n          {%- if block.settings.menu == 'footer' and section.settings.show_policy_links -%}";
const after=`        {%- if block.type == 'link_list' -%}
          {%- assign show_policy_column = false -%}
          {%- if section.settings.show_policy_links -%}
            {%- if block.id == 'legal' or block.settings.menu.handle == 'footer' or block.settings.menu == 'footer' -%}
              {%- assign show_policy_column = true -%}
            {%- endif -%}
          {%- endif -%}
          {%- if show_policy_column -%}`;
const text=fs.readFileSync(file,'utf8');if(!text.includes(before))throw Error('Missing target');
fs.writeFileSync(file,text.replace(before,after));console.log('Footer policies support Shopify menu objects and the existing legal block.');
