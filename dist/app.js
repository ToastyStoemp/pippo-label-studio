'use strict';
const sampleRows=[['knpip1169','Kommissionssalg',0,'Active'],['kbpip1169','Kommissionssalg (brugt)',0,'Active'],...['Mei','Daiki','Ginkgo','Sakura'].flatMap((n,i)=>[['kbpip11690000'+(41+i*2),'Hat - '+n+' - S',299,'Active'],['kbpip11690000'+(42+i*2),'Hat - '+n+' - M',299,'Sold']]),...['BLUE','BEAR','DAIKI','FLOWERS','ZODIAC','GREEN'].map((n,i)=>['kbpip116900000'+(i+1),'Sheet '+n,59,i===5?'Printed':'Sold']),...['BOUQUET','OCEAN','CHONKY','MATCHA'].map((n,i)=>['kbpip11690000'+String(i+7).padStart(2,'0'),'Bundle '+n,79,'Printed']),...['KYOTO - A3','SKY - A3','PEACH - 30x30','SUSHIBAR - 45x20'].map((n,i)=>['kbpip116900012'+(i+1),'Print - '+n,i===2?269:299,'Active']),...['LUCKY','FOX','BEAR','ZODIAC','AUTUMN'].map((n,i)=>['kbpip116900008'+(i+1),'pin - '+n,i<2?119:89,'Active']),...['KYOTO - A4','SKY - A4','OSLO - A4','BIRDHOUSE - A4','THANKYOU - A4','KITCHEN - A4','FREETIME - A4','VALLEY - 50X30cm'].map((n,i)=>['kbpip116900016'+(i+1),'Print - '+n,i===7?379:189,'Draft'])];
const $=id=>document.getElementById(id);
const escapeXML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
let products=[],preview=0;
function parseProducts(text){
 const rows=[],errors=[];
 // A status terminates a record, even when clipboard formatting removes line breaks.
 const parts=text.trim().split(/\b(Active|Sold|Printed|Draft)\b/gi);
 const records=[];
 for(let i=0;i<parts.length-1;i+=2){if(parts[i].trim())records.push([parts[i].trim(),parts[i+1]]);}
 if(parts.at(-1).trim())for(const line of parts.at(-1).trim().split(/\r?\n/))if(line.trim())records.push([line.trim(),'']);
 for(const [raw,status] of records){
  const m=raw.match(/^([!-~]+)\s+(.+?)\s+((?:\d{1,3}(?:[.,]\d{3})+|\d+)[.,]\d{2})(?:\s+((?:\d{1,3}(?:[.,]\d{3})+|\d+)[.,]\d{2}))?\s*$/s);
  if(!m){errors.push(raw.slice(0,70));continue;}
  const price=Number(m[3].replace(/[.,](?=\d{3}(?:[.,]|$))/g,'').replace(',','.'));
  if(!Number.isFinite(price)||m[1].length>60){errors.push(raw.slice(0,70));continue;}
  rows.push({code:m[1],name:m[2].replace(/\s+/g,' ').trim(),price,status:status?status[0].toUpperCase()+status.slice(1).toLowerCase():'',qty:1,selected:price>0&&status.toLowerCase()!=='sold'});
 }
 return {rows,errors};
}
function importProducts(text){
 const result=parseProducts(text);products=result.rows;preview=0;
 $('message').textContent=`${products.length} product${products.length===1?'':'s'} imported. `+(result.errors.length?`${result.errors.length} unrecognized row(s): ${result.errors.join(' / ')}. Check these before printing.`:'Sold and zero-price items are unselected.');
 renderRows();return {imported:products.length,unrecognized:result.errors.length};
}
function selected(){return products.filter(p=>p.selected)}
function visible(){return products.map((p,i)=>({p,i})).filter(({p})=>$('filter').value==='all'||p.status===$('filter').value)}
function money(n){return n.toFixed(2).replace('.',',')}
function renderRows(){
 $('productCount').textContent=products.length;$('empty').hidden=products.length>0;
 $('rows').innerHTML=visible().map(({p,i})=>`<tr class="${p.selected?'selected':''}"><td><input aria-label="Select ${escapeXML(p.name)}" type="checkbox" data-select="${i}" ${p.selected?'checked':''}></td><td><strong>${escapeXML(p.name)}</strong><span class="code">${escapeXML(p.code)}</span><span class="badge ${p.status}">${p.status||'No status'}</span></td><td>${money(p.price)}</td><td><input class="qty" type="number" min="1" max="100" value="${p.qty}" data-qty="${i}" aria-label="Quantity for ${escapeXML(p.name)}"></td></tr>`).join('');
 const v=visible();$('all').checked=v.length>0&&v.every(({p})=>p.selected);$('all').indeterminate=v.some(({p})=>p.selected)&&!$('all').checked;renderPreview();
}
function settings(){const w=Number($('width').value),h=Number($('height').value);return {w,h,location:$('location').value,valid:Number.isFinite(w)&&w>=20&&w<=50&&Number.isFinite(h)&&h>=20&&h<=80}}
function barcodeLayout(bits,w,h){
 // Reserve 1 mm at each label edge plus Code 128's 10-module quiet zones.
 // Keep the vector module proportional: flooring it halved the barcode at 38 mm.
 const module=(w-16)/(bits.length+20);
 if(module<1)throw new Error('This item code is too long for this label width. Increase the width or use a shorter valid item code.');
 const availableHeight=h-92;
 // Stay close to the original height, keeping a quarter of the extra barcode space.
 const originalHeight=Math.min(availableHeight,Math.round(h*.32));
 const barH=Math.round(originalHeight+(availableHeight-originalHeight)*.25);
 const x0=(w-bits.length*module)/2,barY=62+Math.floor((availableHeight-barH)/2);
 return {module,x0,barY,barH};
}
function makeLabel(p){
 const s=settings(),w=Math.round(s.w*8),h=Math.round(s.h*8),margin=8;
 const encoded={};JsBarcode(encoded,p.code,{format:'CODE128',displayValue:false,margin:0});
 const bits=encoded.encodings.map(e=>e.data).join('');
 const {module,x0,barY,barH}=barcodeLayout(bits,w,h);
 // Render each contiguous black run as one rectangle, avoiding seams between modules.
 let bars='';for(let i=0;i<bits.length;){if(bits[i]!=='1'){i++;continue;}const start=i;while(bits[i]==='1')i++;bars+=`<rect x="${x0+start*module}" y="${barY}" width="${(i-start)*module}" height="${barH}"/>`;}
 const c=document.createElement('canvas').getContext('2d');
 function fit(t,size,max,bold=false){c.font=`${bold?'bold ':''}${size}px Arial`;return Math.min(size,size*max/Math.max(1,c.measureText(t).width));}
 const price='DKK '+money(p.price),locSize=fit(s.location,17,w*.26),priceSize=fit(price,24,s.location?w*.63:w-16,true),nameSize=fit(p.name,20,w-16),codeSize=fit(p.code,18,w-16);
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${escapeXML(p.name)} label"><rect width="${w}" height="${h}" fill="white"/><g fill="black" font-family="Arial,Helvetica,sans-serif"><text x="${margin}" y="28" font-size="${priceSize}" font-weight="700">${price}</text><text x="${w-margin}" y="28" text-anchor="end" font-size="${locSize}">${escapeXML(s.location)}</text><text x="${margin}" y="51" font-size="${nameSize}">${escapeXML(p.name)}</text><path d="M${margin} 55H${w-margin}" stroke="black" stroke-width="1"/><g data-barcode="true" shape-rendering="crispEdges">${bars}</g><text x="${margin}" y="${h-10}" font-size="${codeSize}">${escapeXML(p.code)}</text></g></svg>`;
}
function renderPreview(){
 const list=selected(),s=settings();preview=Math.max(0,Math.min(preview,list.length-1));
 const total=list.reduce((n,p)=>n+p.qty,0);$('total').textContent=`${total} label${total===1?'':'s'}`;$('dimensions').textContent=`${s.w} × ${s.h} mm`;
 $('previewIndex').textContent=list.length?`${preview+1} of ${list.length} products`:'No labels selected';
 $('prev').disabled=preview<=0;$('next').disabled=preview>=list.length-1;
 $('labelPreview').innerHTML='';$('previewEmpty').hidden=list.length>0;
 let problem=!s.valid?'Choose a width of 20–50 mm and a height of 20–80 mm.':'';
 if(!problem&&list.length){try{for(const p of list)makeLabel(p);$('labelPreview').innerHTML=makeLabel(list[preview]);}catch(e){problem=e.message;}}
 if(total>2000)problem='Limit each print batch to 2,000 labels. Reduce quantities or select fewer products.';
 $('sizeWarning').textContent=problem|| (s.w<40?'Small labels use narrower barcode bars. Test-scan before printing a batch.':'');
 $('print').disabled=!!problem||!total;$('download').disabled=!!problem||!total;
}
$('generate').onclick=()=>importProducts($('source').value);
$('sample').onclick=()=>{$('source').value=sampleRows.map(([code,name,price,status])=>[code,name,price.toFixed(2),price.toFixed(2),status].join('\t')).join('\n');importProducts($('source').value);};
$('filter').onchange=renderRows;
$('all').onchange=()=>{for(const {p} of visible())p.selected=$('all').checked;renderRows()};
$('active').onclick=()=>{products.forEach(p=>p.selected=p.status==='Active'&&p.price>0);renderRows()};
$('rows').onchange=e=>{if(e.target.dataset.select!==undefined){products[Number(e.target.dataset.select)].selected=e.target.checked;renderRows();}if(e.target.dataset.qty!==undefined){const p=products[Number(e.target.dataset.qty)];p.qty=Math.max(1,Math.min(100,Math.floor(Number(e.target.value)||1)));e.target.value=p.qty;renderPreview();}};
for(const id of ['width','height','location'])$(id).oninput=renderPreview;
$('prev').onclick=()=>{preview--;renderPreview()};$('next').onclick=()=>{preview++;renderPreview()};
$('helpToggle').onclick=()=>{$('help').hidden=!$('help').hidden;$('helpToggle').setAttribute('aria-expanded',String(!$('help').hidden))};
$('print').onclick=()=>{const s=settings();$('pageStyle').textContent=`@page{size:${s.w}mm ${s.h}mm;margin:0}#printArea .print-label{width:${s.w}mm;height:${s.h}mm}`;$('printArea').innerHTML=selected().flatMap(p=>Array.from({length:p.qty},()=>`<div class="print-label">${makeLabel(p)}</div>`)).join('');window.print();};
$('download').onclick=()=>{const p=selected()[preview],svg=makeLabel(p),s=settings(),blob=new Blob([svg],{type:'image/svg+xml'}),url=URL.createObjectURL(blob),img=new Image();img.onload=()=>{const canvas=document.createElement('canvas');canvas.width=Math.round(s.w*8);canvas.height=Math.round(s.h*8);const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(img,0,0);URL.revokeObjectURL(url);canvas.toBlob(b=>{const a=document.createElement('a'),u=URL.createObjectURL(b);a.href=u;a.download=p.code.replace(/[^a-z0-9_-]/gi,'_')+'.png';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);});};img.src=url;};
if(document.modelContext?.registerTool){try{Promise.resolve(document.modelContext.registerTool({name:'import_product_labels',description:'Parse a pasted product list and stage barcode labels in the visible interface. Does not print.',inputSchema:{type:'object',properties:{text:{type:'string'}},required:['text'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},execute(input){if(typeof input?.text!=='string'||!input.text.trim())throw new Error('A nonempty product list is required.');$('source').value=input.text;return importProducts(input.text);}})).catch(()=>{});}catch{}}
$('sample').click();
