const fs=require('fs'),path=require('path'),assert=require('assert');
const preview=path.join(__dirname,'payments-readiness-2026-10-07'),reference=path.join(__dirname,'reviews-reference-2026-10-08');
const read=(root,name)=>fs.readFileSync(path.join(root,name),'utf8');
const parse=text=>JSON.parse(text.replace(/^\/\*[\s\S]*?\*\/\s*/,''));
const before=parse(read(preview,'templates/index.json')),live=parse(read(reference,'templates/index.json')),after=structuredClone(before);
const ratingKeys=['show_store_rating','store_rating','store_rating_count'];
for(const key of ratingKeys)after.sections.phone_scan.settings[key]=live.sections.phone_scan.settings[key];
const restoreState=(dst,src)=>{if(Object.hasOwn(src,'disabled'))dst.disabled=src.disabled;else delete dst.disabled;};
restoreState(after.sections.phone_scan,live.sections.phone_scan);
after.sections.social=structuredClone(live.sections.social);
for(const id of ['ugc','trustpilot_reviews','facebook_testimonials','customer_reviews','facebook_comments'])after.sections[id]=structuredClone(live.sections[id]);
const expected=structuredClone(before);
for(const key of ratingKeys)expected.sections.phone_scan.settings[key]=live.sections.phone_scan.settings[key];
restoreState(expected.sections.phone_scan,live.sections.phone_scan);
for(const id of ['social','ugc','trustpilot_reviews','facebook_testimonials','customer_reviews','facebook_comments'])expected.sections[id]=structuredClone(live.sections[id]);
assert.deepStrictEqual(after,expected);
assert.strictEqual(after.sections.showcase.disabled,true);
assert.strictEqual(after.sections.us_vs_them.disabled,true);
assert.deepStrictEqual(after.sections.risk,before.sections.risk);
assert.deepStrictEqual(after.sections.phone_scan.settings.statement,before.sections.phone_scan.settings.statement);
const liquidUpdates=[];
for(const name of ['sections/cv-phone-scan.liquid','sections/cv-social-proof.liquid']){
const original=read(preview,name),source=read(reference,name);
const schemaMatch=original.match(/{% schema %}\s*([\s\S]*?)\s*{% endschema %}/),referenceMatch=source.match(/{% schema %}\s*([\s\S]*?)\s*{% endschema %}/);
const schema=JSON.parse(schemaMatch[1]),sourceSchema=JSON.parse(referenceMatch[1]);
let next=original;
for(const key of ratingKeys){
const desired=sourceSchema.settings.find(x=>x.id===key),current=schema.settings.find(x=>x.id===key);
assert(desired&&current,'Missing '+key);
const currentLine=next.split('\n').find(line=>line.includes('"id": "'+key+'"'));
const sourceLine=source.split('\n').find(line=>line.includes('"id": "'+key+'"'));
assert(currentLine&&sourceLine,'Missing setting line '+key);
next=next.replace(currentLine,sourceLine);
}
const nextSchema=JSON.parse(next.match(/{% schema %}\s*([\s\S]*?)\s*{% endschema %}/)[1]);
const expectedSchema=structuredClone(schema);
for(const key of ratingKeys){const current=expectedSchema.settings.find(x=>x.id===key),desired=sourceSchema.settings.find(x=>x.id===key);if(Object.hasOwn(desired,'default'))current.default=desired.default;else delete current.default;}
assert.deepStrictEqual(nextSchema,expectedSchema);
const stripSchema=x=>x.replace(/{% schema %}[\s\S]*?{% endschema %}/,'');
assert.strictEqual(stripSchema(next),stripSchema(original),'Liquid render guards changed');
liquidUpdates.push({name,text:next});
}
fs.writeFileSync(path.join(preview,'templates/index.json'),JSON.stringify(after,null,2)+'\n');
for(const update of liquidUpdates)fs.writeFileSync(path.join(preview,update.name),update.text);
console.log(JSON.stringify({
changedFiles:['templates/index.json',...liquidUpdates.map(x=>x.name)],
homeReviewSectionsRestored:['phone_scan','social','ugc','trustpilot_reviews','facebook_testimonials','customer_reviews','facebook_comments'],
homeRating:after.sections.phone_scan.settings.store_rating,homeRatingCount:after.sections.phone_scan.settings.store_rating_count,
verification:'Only scoped review values/states and rating schema defaults changed; existing render guards and all unrelated preview corrections preserved',
remoteWrites:false
},null,2));
