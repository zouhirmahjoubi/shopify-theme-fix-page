const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'payments-readiness-2026-10-07');
const file=path.join(root,'locales/en.default.json');
const locale=JSON.parse(fs.readFileSync(file,'utf8'));
for(const key of ['home_description','product_description','listing_description'])locale.general.meta[key]=locale.general.meta[key].replaceAll('1–3','1–2');
fs.writeFileSync(file,JSON.stringify(locale,null,2)+'\n');
const changed=['templates/index.json','sections/header-group.json','sections/footer-group.json','sections/header.liquid','sections/footer.liquid','sections/cv-phone-scan.liquid','sections/cv-social-proof.liquid','sections/cv-value-stack.liquid','sections/cv-guarantee.liquid','sections/cv-spotlight.liquid','sections/cv-showcase.liquid','locales/en.default.json'];
let schemas=0;
for(const name of changed){
const text=fs.readFileSync(path.join(root,name),'utf8');
if(name.endsWith('.json'))JSON.parse(text.replace(/^\/\*[\s\S]*?\*\/\s*/,''));
if(name.endsWith('.liquid')){const match=text.match(/{% schema %}\s*([\s\S]*?)\s*{% endschema %}/);if(match){JSON.parse(match[1]);schemas++;}}
}
const home=JSON.parse(fs.readFileSync(path.join(root,'templates/index.json'),'utf8'));
if(home.order.some(id=>!home.sections[id]))throw Error('Order refers to missing section');
for(const [id,section]of Object.entries(home.sections)){
if(section.block_order && section.block_order.some(blockId=>!section.blocks[blockId]))throw Error('Missing block in '+id);
}
for(const id of ['phone_scan','social'])if(home.sections[id].settings.show_store_rating||home.sections[id].settings.store_rating||home.sections[id].settings.store_rating_count)throw Error('Manual rating remains');
for(const id of ['showcase','us_vs_them','ugc','trustpilot_reviews','facebook_testimonials','customer_reviews','facebook_comments'])if(!home.sections[id].disabled)throw Error('Unverified section enabled '+id);
const patterns=/Est\.?\s*1920|since 1920|26 drops|MIL.STD|1,400|N52|25W|three years|12,482|8,930|3,204|prepaid|100% safe|CAD file|1–3 business|1-3 business/gi;
const violations=changed.filter(x=>x!=='locales/en.default.json').map(name=>({name,found:fs.readFileSync(path.join(root,name),'utf8').match(patterns)||[]})).filter(x=>x.found.length);
if(violations.length)throw Error(JSON.stringify(violations));
console.log(JSON.stringify({jsonAndSchemas:'passed',schemaCount:schemas,homepageReferences:'passed',unsupportedClaimScan:'passed',changedFiles:changed},null,2));
