const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const M110=require('./dist/m110.js');
(async()=>{
 const rgba=new Uint8ClampedArray(9*2*4).fill(255);
 for(const pixel of [0,7,8,10])rgba.fill(0,pixel*4,pixel*4+3);
 rgba[3]=0; // Transparent black must print white.
 const raster=M110.pack(rgba,9,2);
 assert.deepEqual([...raster.data],[1,128,64,0]);
 assert.equal(raster.stride,2);
 assert.throws(()=>M110.pack(rgba,400,2));
 const packets=[],pauses=[];
 const tall={data:new Uint8Array(48*300),stride:48,height:300};
 await M110.sendLabel(async b=>packets.push([...b]),tall,{speed:3,density:10},async ms=>pauses.push(ms));
 assert.deepEqual(packets.slice(0,4),[[27,78,13,3],[27,78,4,10],[31,17,10],[29,118,48,0,48,0,44,1]]);
 assert.deepEqual(packets.at(-1),[31,240,5,0,31,240,3,0]);
 assert.equal(packets.slice(4,-1).flat().length,14400);
 assert(packets.slice(4,-1).every(p=>p.length<=128));
 assert.deepEqual(pauses.slice(0,3),[30,30,30]);
 let writes=0;
 await assert.rejects(M110.sendLabel(async()=>{if(++writes===5)throw Error('Disconnected');},tall,{speed:5,density:10},async()=>{}),/Disconnected/);
 assert.equal(writes,5,'No writes or retry after failure');
 const order=[];let stop=false;
 const jobs=[{id:'A',qty:2},{id:'B',qty:3}];
 assert.equal(await M110.runQueue(jobs,async j=>order.push(j.id),()=>stop,n=>{if(n===3)stop=true;}),3);
 assert.deepEqual(order,['A','A','B']);
 let completed=0;
 await assert.rejects(M110.runQueue(jobs,async()=>{if(completed===1)throw Error('Lost');},()=>false,()=>completed++),/Lost/);
 assert.equal(completed,1);
 // Exercise actual UI handlers with a mock Bluetooth device, not real paper.
 function ui(supported=true){
  const nodes=new Map(),node=id=>{if(!nodes.has(id))nodes.set(id,{disabled:false,value:({btDensity:'10',btSpeed:'5'})[id],textContent:''});return nodes.get(id);};
  let disconnected,connects=0;
  const characteristic={properties:{writeWithoutResponse:true},writeValueWithoutResponse:async()=>{}};
  const device={name:'Q199E-test',addEventListener:(event,fn)=>disconnected=fn,gatt:{connected:false,connect:async()=>{device.gatt.connected=true;return {getPrimaryService:async uuid=>{assert.equal(uuid,0xff00);return {getCharacteristic:async uuid=>{assert.equal(uuid,0xff02);return characteristic;}};}};},disconnect:()=>{device.gatt.connected=false;disconnected?.();}}};
  const rows=[{code:'a',qty:2},{code:'b',qty:1}],rendered=[],sent=[];
  const context={window:{isSecureContext:true},navigator:supported?{bluetooth:{requestDevice:async options=>{assert.equal(options.acceptAllDevices,true);assert.equal(options.filters,undefined);assert.equal(options.optionalServices[0],0xff00);connects++;return device;}}}:{},$:node,settings:()=>({w:50,h:30}),selected:()=>rows,preview:1,makeLabel:(p,s)=>{assert.equal(s.w,48);return p.code;},M110:{...M110,rasterize:async(svg,w,h)=>{rendered.push([svg,w,h]);return svg;},sendLabel:async(write,raster)=>{sent.push(raster);await write(new Uint8Array([0]));}}};
  vm.runInNewContext(fs.readFileSync('dist/bluetooth.js','utf8'),context);
  return {node,context,rows,rendered,sent,characteristic,get connects(){return connects;}};
 }
 const unavailable=ui(false);assert(unavailable.node('btConnect').disabled);assert(unavailable.node('btPrint').disabled);
 const app=ui();assert(app.node('btPrint').disabled);
 await app.node('btConnect').onclick();assert(!app.node('btPrint').disabled);
 assert.match(app.node('btStatus').textContent,/Q199E-test/);
 await app.node('btTest').onclick();assert.deepEqual(app.sent,['b']);
 app.sent.length=0;await app.node('btPrint').onclick();assert.deepEqual(app.sent,['a','a','b']);assert.equal(app.node('btProgress').value,3);
 assert(app.rendered.every(r=>r[1]===384&&r[2]===240));
 app.sent.length=0;app.characteristic.writeValueWithoutResponse=async()=>app.node('btCancel').onclick();
 await app.node('btPrint').onclick();assert.deepEqual(app.sent,['a']);assert.match(app.node('btStatus').textContent,/Stopped/);
 app.characteristic.writeValueWithoutResponse=async()=>{throw Error('Link lost');};
 await app.node('btPrint').onclick();assert.match(app.node('btStatus').textContent,/Nothing was retried/);assert(app.node('btPrint').disabled);
 const missing=ui();missing.context.navigator.bluetooth.requestDevice=async()=>{const e=Error('Cancelled');e.name='NotFoundError';throw e;};
 await missing.node('btConnect').onclick();assert.match(missing.node('btStatus').textContent,/Bluetooth LE only/);assert(missing.node('btPrint').disabled);
 const wrongDevice=ui();wrongDevice.context.navigator.bluetooth.requestDevice=async()=>({name:'Other device',addEventListener(){},gatt:{disconnect(){},async connect(){return {async getPrimaryService(){const e=Error('Service not found');e.name='NotFoundError';throw e;}};}}});
 await wrongDevice.node('btConnect').onclick();assert.match(wrongDevice.node('btStatus').textContent,/No print data was sent/);assert(wrongDevice.node('btPrint').disabled);
 console.log('PASS: raster packing, transparency, 16-bit height, packet framing, chunk limits, disconnect handling, quantities, cancellation, unsupported browser, and Bluetooth UI flows.');
})().catch(error=>{console.error(error);process.exitCode=1;});
