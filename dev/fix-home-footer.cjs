const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'payments-readiness-2026-10-07');
const footerPath=path.join(root,'sections/footer.liquid');
let footer=fs.readFileSync(footerPath,'utf8');
const before = `        {%- if block.type == 'link_list' -%}
          {%- if linklists[block.settings.menu].links.size > 0 -%}`;
const after = `        {%- if block.type == 'link_list' -%}
          {%- if block.settings.menu == 'footer' and section.settings.show_policy_links -%}
            <div {{ block.shopify_attributes }}>
              <h4>{{ block.settings.title | default: 'sections.footer.policies' | t | escape }}</h4>
              <ul>
                <li><a href="{{ shop.shipping_policy.url | default: '/pages/shipping-policy' | escape }}">{{ 'sections.footer.shipping' | t | escape }}</a></li>
                <li><a href="{{ shop.refund_policy.url | default: '/pages/return-policy' | escape }}">{{ 'sections.footer.returns' | t | escape }}</a></li>
                <li><a href="{{ shop.privacy_policy.url | default: '/pages/privacy-policy' | escape }}">{{ 'sections.footer.privacy' | t | escape }}</a></li>
                <li><a href="{{ shop.terms_of_service.url | default: '/pages/terms-and-conditions' | escape }}">{{ 'sections.footer.terms' | t | escape }}</a></li>
                <li><a href="/pages/contact">{{ 'sections.footer.contact' | t | escape }}</a></li>
              </ul>
            </div>
          {%- elsif linklists[block.settings.menu].links.size > 0 -%}`;
if(!footer.includes(before))throw Error('Missing footer target');
footer=footer.replace(before,after);
footer=footer.replace('<h4>{{ block.settings.title | default: \'sections.footer.policies\' | t | escape }}</h4>', '<h4>{% if block.settings.title != blank %}{{ block.settings.title | escape }}{% else %}{{ \'sections.footer.policies\' | t | escape }}{% endif %}</h4>');
footer=footer.replace('    { "type": "header", "content": "Newsletter" },','    { "type": "checkbox", "id": "show_policy_links", "label": "Show policy and contact links in Support column", "default": true },\n    { "type": "header", "content": "Newsletter" },');
fs.writeFileSync(footerPath,footer);
const readJson=name=>JSON.parse(fs.readFileSync(path.join(root,name),'utf8').replace(/^\/\*[\s\S]*?\*\/\s*/, ''));
const locale=readJson('locales/en.default.json');
Object.assign(locale.products.product,{catalog_summary:'Explore {{ title }}. Choose from the available options below.',available_options:'Available options'});
fs.writeFileSync(path.join(root,'locales/en.default.json'),JSON.stringify(locale,null,2)+'\n');
['templates/index.json','sections/header-group.json','sections/footer-group.json','sections/header.liquid','sections/footer.liquid','sections/cv-phone-scan.liquid','sections/cv-social-proof.liquid'].forEach(name=>{
const full=path.join(root,name);const text=fs.readFileSync(full,'utf8');
fs.writeFileSync(full,text.replaceAll('1–3','1–2').replaceAll('1-3','1-2').replaceAll('1 to 3','1 to 2'));
});
console.log('Added visible support policy/contact links and updated dispatch to 1–2 business days.');
