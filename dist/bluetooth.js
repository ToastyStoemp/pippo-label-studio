'use strict';
(() => {
 let device=null,characteristic=null,busy=false,connecting=false,stop=false,wakeLock=null;
 const supported=window.isSecureContext&&!!navigator.bluetooth;
 const status=text=>{$('btStatus').textContent=text;};
 const connected=()=>!!device?.gatt?.connected&&!!characteristic;
 // Remove nicknames saved by the retired printer-details feature.
 try{localStorage.removeItem('pippo.printers.v1');}catch{}
 function refresh(){
  const valid=!$('print').disabled;
  $('btConnect').disabled=!supported||busy||connecting;
  $('btConnect').textContent=connected()?'Disconnect M110':'Connect M110';
  $('btPrint').disabled=!connected()||busy||connecting||!valid;
  $('btTest').disabled=!connected()||busy||connecting||!valid;
  $('btCancel').disabled=!busy||stop;
  $('btDensity').disabled=busy;$('btSpeed').disabled=busy;
 }
 window.refreshBluetooth=refresh;
 status(supported?'Close Labelife / Print Master, then connect. Your M110 may appear as a serial code starting Q199. Match it to your printer or the name shown in Labelife.':'Open this site in Chrome on Windows, macOS or Android, using HTTPS or localhost.');
 $('btConnect').onclick=async()=>{
  if(connected()){device.gatt.disconnect();characteristic=null;status('Printer disconnected.');refresh();return;}
  connecting=true;refresh();
  let stage='selection';
  try{
   // M110 variants can advertise an OEM name (for example Q199E...),
   // so a model-name filter can hide the printer entirely.
   device=await navigator.bluetooth.requestDevice({acceptAllDevices:true,optionalServices:[0xff00]});
   stage='connection';
   const chosen=device;
   device.addEventListener('gattserverdisconnected',()=>{if(device!==chosen)return;characteristic=null;if(!busy)status('Connection lost. Connect again before printing.');refresh();});
   status(`Connecting to ${device.name||'selected device'}…`);
   const server=await device.gatt.connect();
   stage='service';
   const service=await server.getPrimaryService(0xff00);
   characteristic=await service.getCharacteristic(0xff02);
   if(!characteristic.properties.writeWithoutResponse&&!characteristic.properties.write)throw Error('Printer has no supported write characteristic.');
   status(`Connected to ${device.name}. Test one label and scan its barcode first.`);
  }catch(e){
   device?.gatt?.disconnect();characteristic=null;
   if(stage==='selection'&&e.name==='NotFoundError')status('No device selected. If the printer is missing: open this page in standalone Google Chrome, close Labelife / Print Master, and turn the printer off and on. This picker detects Bluetooth LE only; Labelife may use a different connection.');
   else if(stage==='service')status(`Selected ${device?.name||'device'}, but its expected M110 Bluetooth service is unavailable: ${e.message}. Check that you selected the printer. No print data was sent.`);
   else status(`Could not ${stage==='selection'?'open the Bluetooth picker':'connect to '+(device?.name||'the device')}: ${e.message}. Close other printer apps and try again in standalone Google Chrome.`);
  }
  finally{connecting=false;refresh();}
 };
 $('btCancel').onclick=()=>{stop=true;status('Stopping after the current label finishes sending…');refresh();};
 async function printBatch(test){
  if(busy||connecting||!connected()||$('print').disabled)return;
  busy=true;stop=false;refresh();
  let sent=0,total=0;
  try{
   const s={...settings()};s.w=Math.min(s.w,48);
   const options={density:Number($('btDensity').value),speed:Number($('btSpeed').value)};
   const list=test?[selected()[preview]]:selected();
   // Freeze all label content and quantities before any asynchronous work.
   const jobs=list.map(p=>({svg:makeLabel(p,s),qty:test?1:p.qty,raster:null}));
   total=jobs.reduce((sum,job)=>sum+job.qty,0);
   $('btProgress').max=total;$('btProgress').value=0;$('btProgress').hidden=false;
   status(`Preparing ${total} label${total===1?'':'s'}…`);
   try{wakeLock=await navigator.wakeLock?.request('screen');}catch{}
   const write=async bytes=>{
    if(!connected())throw Error('Bluetooth connection lost.');
    if(characteristic.properties.writeWithoutResponse)await characteristic.writeValueWithoutResponse(bytes);
    else await characteristic.writeValueWithResponse(bytes);
   };
   await M110.runQueue(jobs,async job=>{
    status(`Sending label ${sent+1} of ${total}… Keep this tab open.`);
    job.raster??=await M110.rasterize(job.svg,Math.round(s.w*8),Math.round(s.h*8));
    await M110.sendLabel(write,job.raster,options);
   },()=>stop,count=>{sent=count;$('btProgress').value=sent;});
   status(`${sent<total?'Stopped. ':''}${sent} of ${total} labels sent. Check the printer output${sent<total?' before starting another batch':''}.`);
  }catch(e){
   // Never replay an uncertain label automatically: the device may have printed it.
   device?.gatt?.disconnect();characteristic=null;
   status(`Stopped: ${e.message} ${sent} of ${total} labels fully sent; the next label may be partial or already printed. Check output and restart the printer before reconnecting. Nothing was retried.`);
  }finally{try{await wakeLock?.release();}catch{}wakeLock=null;busy=false;refresh();}
 }
 $('btPrint').onclick=()=>printBatch(false);$('btTest').onclick=()=>printBatch(true);
 refresh();
})();
