'use strict';
// Independently implemented from the M110 protocol documented by
// vivier/phomemo-tools and transcriptionstream/phomymo. See README.md.
const M110 = (() => {
 const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 function pack(rgba,width,height){
  if(!Number.isInteger(width)||width<1||width>384||!Number.isInteger(height)||height<1||height>640||rgba.length!==width*height*4)throw Error('Invalid M110 raster dimensions.');
  const stride=Math.ceil(width/8),data=new Uint8Array(stride*height);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const i=(y*width+x)*4,alpha=rgba[i+3]/255;
   const light=(rgba[i]*.299+rgba[i+1]*.587+rgba[i+2]*.114)*alpha+255*(1-alpha);
   if(light<128)data[y*stride+(x>>3)]|=128>>(x%8);
  }
  return {data,stride,height};
 }
 async function rasterize(svg,width,height){
  const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
  try{
   const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('Could not render the label.'));img.src=url;});
   const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
   const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.fillStyle='white';ctx.fillRect(0,0,width,height);ctx.drawImage(img,0,0,width,height);
   return pack(ctx.getImageData(0,0,width,height).data,width,height);
  }finally{URL.revokeObjectURL(url);}
 }
 async function sendLabel(write,raster,options,wait=delay){
  const {data,stride,height}=raster,{speed,density}=options;
  if(!Number.isInteger(speed)||speed<1||speed>5||!Number.isInteger(density)||density<1||density>15)throw Error('Invalid print settings.');
  if(!Number.isInteger(stride)||stride<1||stride>48||!Number.isInteger(height)||height<1||height>640||data.length!==stride*height)throw Error('Invalid label data.');
  for(const command of [[27,78,13,speed],[27,78,4,density],[31,17,10]]){await write(new Uint8Array(command));await wait(30);}
  await write(new Uint8Array([29,118,48,0,stride,0,height&255,height>>8]));
  for(let offset=0;offset<data.length;offset+=128){await write(data.slice(offset,offset+128));await wait(20);}
  await wait(300);await write(new Uint8Array([31,240,5,0,31,240,3,0]));await wait(500);
 }
 // Stop only between whole labels; interrupting raster data corrupts the next job.
 async function runQueue(jobs,send,shouldStop,onProgress){
  let sent=0;
  for(const job of jobs)for(let copy=0;copy<job.qty;copy++){
   if(shouldStop())return sent;
   await send(job);onProgress(++sent);
  }
  return sent;
 }
 return {pack,rasterize,sendLabel,runQueue};
})();
if(typeof module!=='undefined')module.exports=M110;
