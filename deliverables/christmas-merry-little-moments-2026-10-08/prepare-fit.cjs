const fs = require('node:fs'), path = require('node:path');
const sharp = require('C:/Users/LENOVO/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = path.resolve('deliverables/christmas-merry-little-moments-2026-10-08');
const ws = process.cwd();
const sourcePath = 'C:/Users/LENOVO/.codex/generated_images/01a11cb7-210b-7f51-9ccd-635408e15ac5/exec-61d7e25a-b874-485a-953d-a9010a222651.png';
fs.mkdirSync(root,{recursive:true});
for (const dir of ['templates','previews','overlays','print','review']) fs.mkdirSync(path.join(root,dir),{recursive:true});
fs.copyFileSync(sourcePath,path.join(root,'bleed-master.png'));
const manifest = JSON.parse(fs.readFileSync('casestry_listings/01-sew-merry-and-bright/manifest.json','utf8'));
const bounds = [0.27,0.387,0.75,0.605];
const fmt = n => Math.round(n*10)/10;
(async()=>{
 const meta = await sharp(sourcePath).metadata();
 const source = await sharp(sourcePath).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let opaque = true;for(let i=3;i<source.data.length;i+=4) if(source.data[i]!==255){opaque=false;break;}
 const templates=[];
 for(const m of manifest.models){
  const templatePath=path.resolve(ws,m.template),tm=await sharp(templatePath).metadata();
  const [px0,py0,px1,py1]=m.print_area, pw=px1-px0,ph=py1-py0;
  let scale = Math.max(pw/meta.width,ph/meta.height);
  let rw = Math.ceil(meta.width*scale),rh=Math.ceil(meta.height*scale);
  let ox = (pw-rw)/2, oy=(ph-rh)/2;
  let text = [px0+ox+bounds[0]*rw,py0+oy+bounds[1]*rh,px0+ox+bounds[2]*rw,py0+oy+bounds[3]*rh];
  const intersects = b => b[0]<m.camera[2]+36 && b[2]>m.camera[0]-36 && b[1]<m.camera[3]+36 && b[3]>m.camera[1]-36;
  let shifted=false;
  if(intersects(text)){
   rh=Math.max(rh,Math.ceil((m.camera[3]+40-py0)/bounds[1]));
   rw=Math.ceil(rh*meta.width/meta.height);ox=(pw-rw)/2;oy=0;shifted=true;
   text=[px0+ox+bounds[0]*rw,py0+bounds[1]*rh,px0+ox+bounds[2]*rw,py0+bounds[3]*rh];
  }
  const warnings=[];
  const [bx0,by0,bx1,by1]=m.back;
  const minClearance=Math.min(text[0]-bx0,bx1-text[2],text[1]-by0,by1-text[3]);
  if(minClearance<24)warnings.push('Text approaches face border');
  if(intersects(text))warnings.push('Text approaches camera');
  if(ox>0||oy>0||rw+ox<pw||rh+oy<ph)warnings.push('Bleed incomplete');
  if(!opaque)warnings.push('Artwork transparency');
  const resized=await sharp(sourcePath).resize(rw,rh,{kernel:'lanczos3'}).toBuffer();
  const file=path.join(root,'print',m.code+'.png');
  const cropped=await sharp(resized).extract({left:Math.floor(-ox),top:Math.floor(-oy),width:pw,height:ph}).png().toBuffer();
  await sharp(cropped).withMetadata({density:300}).toFile(file);
  fs.copyFileSync(templatePath,path.join(root,'templates',m.code+'.png'));
  const base=await sharp({create:{width:tm.width,height:tm.height,channels:3,background:'#f4efe7'}}).composite([{input:cropped,left:px0,top:py0}]).png().toBuffer();
  await sharp(base).resize({height:1100}).jpeg({quality:91}).toFile(path.join(root,'previews',m.code+'.jpg'));
  const svg=Buffer.from(`<svg width="${tm.width}" height="${tm.height}"><rect x="${m.camera[0]}" y="${m.camera[1]}" width="${m.camera[2]-m.camera[0]}" height="${m.camera[3]-m.camera[1]}" fill="#b3414150"/><rect x="${bx0+24}" y="${by0+24}" width="${bx1-bx0-48}" height="${by1-by0-48}" fill="none" stroke="#4bd4a0" stroke-width="5" stroke-dasharray="15 12"/><rect x="${text[0]}" y="${text[1]}" width="${text[2]-text[0]}" height="${text[3]-text[1]}" fill="none" stroke="#edc67b" stroke-width="4"/><text x="60" y="70" font-family="Arial" font-size="34" fill="#112b35">${m.name} — local template reference</text></svg>`);
  const overlayBuffer=await sharp(base).composite([{input:templatePath},{input:svg}]).png().toBuffer(); await sharp(overlayBuffer).resize({height:1100}).jpeg({quality:92}).toFile(path.join(root,'overlays',m.code+'.jpg'));
  templates.push({id:m.code,label:m.name,brand:m.brand,template:`templates/${m.code}.png`,preview:`previews/${m.code}.jpg`,overlay:`overlays/${m.code}.jpg`,print:`print/${m.code}.png`,status:warnings.length?'reference-fail':'reference-pass',note:'Local Casestry template geometry; pending exact Printify provider confirmation',textBounds:text.map(fmt),back:m.back,camera:m.camera,printArea:m.print_area,exportSize:[pw,ph],minFaceClearancePx:fmt(minClearance),cameraClearancePx:fmt(text[1]-m.camera[3]),letteringLowered:shifted,warnings});
 }
 const qa={title:'Merry Little Moments',status:'local-reference-checked',printifyVerified:false,artwork:{file:'bleed-master.png',width:meta.width,height:meta.height,opaque,nativeResolution:true},templateSource:'Local Casestry phone template collection and previous measured geometry. Must be matched to Printify before production.',textBoundsNormalized:bounds,templates,checks:{total:templates.length,passed:templates.filter(t=>t.status==='reference-pass').length,pendingProviderVerification:true,backgroundFullBleed:true,minimumFaceInsetPx:24,cameraExclusionMarginPx:36},notes:['300 DPI export metadata does not increase native artwork resolution.','No guide lines are included in print PNG files.','Local reference checks do not confirm every Printify variant or provider.']};
 fs.writeFileSync(path.join(root,'qa.json'),JSON.stringify(qa,null,2));
 const cards=[];for(const m of templates){const thumb=await sharp(path.join(root,m.overlay)).resize({width:210,height:315,fit:'contain',background:'#f4efe7'}).toBuffer();cards.push({input:thumb,left:(cards.length%7)*220+5,top:Math.floor(cards.length/7)*325+5});}
 await sharp({create:{width:1540,height:1300,channels:3,background:'#f4efe7'}}).composite(cards).jpeg({quality:91}).toFile(path.join(root,'template-contact-sheet.jpg'));
 console.log(JSON.stringify({nativeSize:[meta.width,meta.height],total:qa.checks.total,passed:qa.checks.passed,lowered:templates.filter(t=>t.letteringLowered).map(t=>t.label),failures:templates.filter(t=>t.warnings.length)},null,2));
})().catch(e=>{console.error(e.message);process.exitCode=1});


