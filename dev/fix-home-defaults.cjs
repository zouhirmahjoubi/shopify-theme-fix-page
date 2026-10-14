const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'payments-readiness-2026-10-07');
const readJson=name=>JSON.parse(fs.readFileSync(path.join(root,name),'utf8').replace(/^\/\*[\s\S]*?\*\/\s*/,''));
const home=readJson('templates/index.json');
home.sections.risk.blocks['g-3'].settings.title='Dispatch in 1–2 business days';
home.sections.risk.blocks['g-3'].settings.body='Orders dispatch from the USA within 1–2 business days. Delivery estimates vary by product and are shown at checkout.';
Object.assign(home.sections.risk.blocks['faq-3'].settings,{question:'How long does delivery take?',answer:'<p>Estimated delivery is 4–6 business days for Printify items and 8–12 business days for other items. Shipping is free for both options. Review the estimate shown at checkout for your order.</p>'});
fs.writeFileSync(path.join(root,'templates/index.json'),JSON.stringify(home,null,2)+'\n');
function editSchema(name,fn,replacements=[]){
const file=path.join(root,name);let src=fs.readFileSync(file,'utf8');
const match=src.match(/{% schema %}\s*([\s\S]*?)\s*{% endschema %}/);
if(!match)throw Error('Missing schema '+name);
const data=JSON.parse(match[1]);fn(data);
src=src.replace(match[0],'{% schema %}\n'+JSON.stringify(data,null,2)+'\n{% endschema %}');
for(const [a,b] of replacements)src=src.replaceAll(a,b);
fs.writeFileSync(file,src);
}
function setDefault(settings,id,value){const item=settings.find(x=>x.id===id);if(!item)throw Error('Missing schema setting '+id);if(value===null)delete item.default;else item.default=value;}
editSchema('sections/cv-value-stack.liquid',data=>{
for(const id of ['eyebrow','heading','benefits_heading'])setDefault(data.settings,id,home.sections.value.settings[id]);
for(const id of ['proof_eyebrow','proof_heading','proof_footnote'])setDefault(data.settings,id,null);
const fix=data.blocks.find(x=>x.type==='fix').settings;
setDefault(fix,'metric_value','1');setDefault(fix,'metric_unit',null);setDefault(fix,'problem','Choose your phone model');
for(const id of ['them_label','us_label'])setDefault(fix,id,null);
const benefit=data.blocks.find(x=>x.type==='benefit').settings;
setDefault(benefit,'title','Read the product details');setDefault(benefit,'body','Check the materials, features and available options for the case you choose.');
setDefault(data.blocks.find(x=>x.type==='bar').settings,'value',null);
data.presets=[{name:data.name,blocks:Object.values(home.sections.value.blocks)}];
},[['Section 02 — why it wins','Before you order'],['Three things every other case gets wrong','Three steps to choose your case'],['Measured, not claimed','Product information'],['Drop height before the phone was damaged','Product information']]);
editSchema('sections/cv-guarantee.liquid',data=>{
for(const id of ['guard_eyebrow','guard_heading','faq_heading','closer_heading','closer_body'])setDefault(data.settings,id,home.sections.risk.settings[id]);
const guarantee=data.blocks.find(x=>x.type==='guarantee').settings;
setDefault(guarantee,'title','30-day returns');setDefault(guarantee,'body',home.sections.risk.blocks['g-0'].settings.body);
setDefault(data.blocks.find(x=>x.type==='faq').settings,'question','How do I choose the right model?');
data.presets=[{name:data.name,blocks:Object.values(home.sections.risk.blocks)}];
},[['Section 04 — zero risk','Shopping with Casify'],['Every reason not to buy, removed','Shipping and returns'],['The questions we actually get asked','Questions before you order'],['Protect it before you need to','Find your next case']]);
editSchema('sections/cv-spotlight.liquid',data=>{
setDefault(data.settings,'heading',home.sections.spotlight.settings.heading);
setDefault(data.settings,'subheading',home.sections.spotlight.settings.subheading);
},[['Protection you forget is even there','Find a case for your everyday']]);
editSchema('sections/cv-showcase.liquid',data=>{
setDefault(data.settings,'heading','Explore the collection');
const card=data.blocks.find(x=>x.type==='card').settings;
for(const id of ['badge_text','pill_1_text','pill_2_text','rating_count','description','price','compare_price'])setDefault(card,id,null);
setDefault(card,'title','Explore cases');
data.presets=[{name:data.name}];
});
console.log('Homepage-only section presets now contain choice guidance and confirmed service facts.');
