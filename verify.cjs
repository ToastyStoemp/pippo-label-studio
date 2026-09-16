const fs=require('fs'),vm=require('vm'),assert=require('assert');
const nodes=new Map();const node=id=>{if(!nodes.has(id))nodes.set(id,{value:({width:'50',height:'30',location:'E3-3',filter:'all'})[id]||'',innerHTML:'',textContent:'',dataset:{},click(){this.onclick?.()},setAttribute(){}});return nodes.get(id)};
let registered;
const context={console,document:{getElementById:node,createElement:()=>({getContext:()=>({measureText:s=>({width:s.length*13})})}),modelContext:{registerTool:t=>registered=t}},window:{print(){}},setTimeout,Blob};
vm.createContext(context);vm.runInContext(fs.readFileSync('dist/JsBarcode.all.min.js','utf8'),context);context.JsBarcode=context.window.JsBarcode;vm.runInContext(fs.readFileSync('dist/app.js','utf8'),context);
vm.runInContext(String.raw`assertChecks=(()=>{const a=sampleRows.map(([c,n,p,s])=>[c,n,p.toFixed(2),p.toFixed(2),s].join('\t')).join('\n');const one=parseProducts(a);if(one.rows.length!==37||one.errors.length)throw Error('Sample parse');const flat=parseProducts(a.replace(/\n/g,' '));if(flat.rows.length!==37)throw Error('Flat parse');if(flat.rows.find(p=>p.name.includes('SUSHIBAR')).code!=='kbpip1169000124')throw Error('Code altered');if(parseProducts('abc Name 299,00 299,00 Active').rows[0].price!==299)throw Error('Decimal comma');if(parseProducts('invalid text').errors.length!==1)throw Error('Invalid row');if(selected().length!==26)throw Error('Selection '+selected().length);for(const p of products){const s=makeLabel(p);if(!s.includes('<rect')||!s.includes(p.code))throw Error('Label');}return true;})()`,context);
assert(registered);const result=registered.execute({text:'kbpip1169000124 Print - SUSHIBAR - 45x20 299.00 299.00 Active'});assert.equal(result.imported,1);assert.equal(node('total').textContent,'1 label');assert.throws(()=>registered.execute({text:''}));assert.equal(node('total').textContent,'1 label');console.log('PASS: 37 rows, flattened clipboard, exact codes, comma prices, malformed rows, selections, SVG labels, WebMCP valid/invalid actions.');
vm.runInContext(String.raw`(()=>{
 const encoded={};JsBarcode(encoded,'kbpip1169000124',{format:'CODE128'});const bits=encoded.encodings.map(e=>e.data).join('');
 for(const [w,h] of [[38,25],[40,30],[50,30],[24,20]]){
  const g=barcodeLayout(bits,w*8,h*8);
  if(g.x0+0.00001<10*g.module+8)throw Error('Missing left quiet zone');
  if(w*8-g.x0-bits.length*g.module+0.00001<10*g.module+8)throw Error('Missing right quiet zone');
  if(g.barH<54||g.barY<62||g.barY+g.barH>h*8-30)throw Error('Vertical bounds');
 }
 const small=barcodeLayout(bits,304,200);
 if(bits.length*small.module<250||small.barH!==75||small.barY!==78)throw Error('38x25 barcode must retain full width and a height closer to the original');
 const a=barcodeLayout(bits,303,200),b=barcodeLayout(bits,304,200);
 if(b.module-a.module>0.01)throw Error('Abrupt width transition');
})()`,context);
console.log('PASS: compact label barcode width, height, quiet zones, and smooth sizing.');


