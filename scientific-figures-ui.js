/* Scientific multi-panel figure composer. All panels share one imported dataset. */
(function(){'use strict';
const $=id=>document.getElementById(id),F=window.ScientificFigures,CFD=window.FermentationCFD;
let data=null,figure=null,illustrative=false;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const format=n=>Number.isFinite(n)?Number(n).toPrecision(4):'n/a';
const colors=t=>{t=clamp(t,0,1);const knots=[[30,67,126],[43,145,204],[62,191,192],[133,214,147],[243,211,87],[226,105,69]],x=t*(knots.length-1),i=Math.min(knots.length-2,Math.floor(x)),f=x-i;return 'rgb('+knots[i].map((v,k)=>Math.round(v*(1-f)+knots[i+1][k]*f)).join(',')+')';};
function panel(canvas,section,title,diverging=false){
 const ctx=canvas.getContext('2d'),w=canvas.width=540,h=canvas.height=365;
 ctx.fillStyle='#fbfdff';ctx.fillRect(0,0,w,h);
 const L=57,T=42,PW=402,PH=260,n=section.resolution,lo=diverging?Math.max(Math.abs(section.min||0),Math.abs(section.max||0))*-1:section.min,hi=diverging?-lo:section.max;
 ctx.font='bold 15px system-ui';ctx.fillStyle='#244c71';ctx.fillText(title,20,25);
 for(let j=0;j<n;j++)for(let i=0;i<n;i++){
  const v=section.values[j*n+i],x=L+i*PW/n,y=T+(n-1-j)*PH/n;
  ctx.fillStyle=v===null?'#d4dde6':colors((v-lo)/((hi-lo)||1));
  ctx.fillRect(x,y,Math.ceil(PW/n)+.4,Math.ceil(PH/n)+.4);
 }
 ctx.strokeStyle='#7697b5';ctx.lineWidth=1;ctx.strokeRect(L,T,PW,PH);
 ctx.fillStyle='#526f8d';ctx.font='12px system-ui';
 ctx.fillText(format(lo),L,T+PH+18);ctx.fillText(format(hi)+' '+section.unit,L+PW-110,T+PH+18);
 const axes=section.axes,labels=['X','Y','Z'];ctx.fillText(labels[axes[0]]+' (m)',L+PW/2,T+PH+37);
 ctx.save();ctx.translate(18,T+PH/2);ctx.rotate(-Math.PI/2);ctx.fillText(labels[axes[1]]+' (m)',0,0);ctx.restore();
 ctx.fillText(section.count+' valid points',L+PW-110,28);
 return {min:lo,max:hi};
}
function histogram(canvas,section){
 const ctx=canvas.getContext('2d'),w=canvas.width=540,h=canvas.height=365;
 ctx.fillStyle='#fbfdff';ctx.fillRect(0,0,w,h);
 ctx.fillStyle='#244c71';ctx.font='bold 15px system-ui';ctx.fillText('Distribution · section values',20,25);
 const hst=F.histogram(section.values),left=58,top=46,width=416,height=250,peak=Math.max(1,...hst.counts);
 ctx.strokeStyle='#91a9c0';ctx.beginPath();ctx.moveTo(left,top);ctx.lineTo(left,top+height);ctx.lineTo(left+width,top+height);ctx.stroke();
 hst.counts.forEach((v,i)=>{const bw=width/hst.counts.length;ctx.fillStyle='#428fbd';ctx.fillRect(left+i*bw+2,top+height-v/peak*(height-12),Math.max(1,bw-4),v/peak*(height-12));});
 ctx.fillStyle='#526f8d';ctx.font='12px system-ui';ctx.fillText(format(hst.min),left,top+height+22);ctx.fillText(format(hst.max)+' '+section.unit,left+width-110,top+height+22);ctx.fillText('Count',15,top+18);ctx.fillText(hst.count+' valid samples',left+width-125,28);
}
function watermark(canvas){const ctx=canvas.getContext('2d');ctx.save();ctx.translate(canvas.width/2,canvas.height/2);ctx.rotate(-.3);ctx.font='bold 24px system-ui';ctx.fillStyle='rgba(141,44,44,.50)';ctx.textAlign='center';ctx.fillText('ILLUSTRATIVE · NOT CFD',0,0);ctx.restore();}
function render(){
 if(!data)return;
 try{
 const plane=$('figurePlane').value,fraction=Number($('figureDepth').value)/100,field=$('figureField').value;
 const velocity=F.slice(data,'velocity',plane,fraction,50),scalar=F.slice(data,field,plane,fraction,50),curl=F.vorticity(data,plane,fraction,50);
 panel($('figureVelocity'),velocity,'A · Velocity magnitude (m/s)');
 panel($('figureScalar'),scalar,'B · '+field+' ('+scalar.unit+')');
 panel($('figureVorticity'),curl,'C · Normal vorticity (1/s)',true);
 histogram($('figureHistogram'),scalar);
 if(illustrative)for(const id of ['figureVelocity','figureScalar','figureVorticity','figureHistogram'])watermark($(id));
 const p=data.provenance;
 $('figureExport').disabled=illustrative;$('figureMetadata').disabled=illustrative;
 $('figureStatus').textContent=(illustrative?'ILLUSTRATIVE PREVIEW ONLY — NOT CFD, NOT FOR PUBLICATION. ':'')+'Case '+p.caseId+' · '+p.kind+' · '+(p.solver||'unknown solver')+' · '+plane.toUpperCase()+' at '+Math.round(fraction*100)+'% · '+scalar.count+' scalar points. Velocity and vorticity are post-processed from imported vectors; no CFD solve or validation occurs here.';
 $('figureDepthLabel').textContent=Math.round(fraction*100)+'%';
 figure={caseId:p.caseId,kind:p.kind,field,plane,fraction,velocity,scalar,curl};
 }catch(e){$('figureStatus').textContent='Figure error: '+e.message;}
}
function load(raw,demo=false){
 try{
  if(raw.provenance?.kind==='analytical-demo'&&!demo)throw Error('Analytical demonstration is excluded from research figure export');
  if(demo&&raw.provenance?.kind!=='analytical-demo')throw Error('Demo source required');
  data=CFD.validate(raw);illustrative=demo;
  const sel=$('figureField');sel.replaceChildren();
  for(const [key,v] of Object.entries(data.fields)){const opt=document.createElement('option');opt.value=key;opt.textContent=key+' ('+v.unit+')';sel.appendChild(opt);}
  sel.value=Object.keys(data.fields).find(x=>x!=='velocity')||'velocity';
  render();
 }catch(e){$('figureStatus').textContent='Import rejected: '+e.message;}
}
$('figureDemo').addEventListener('click',()=>load(window.CFDDemo.create(),true));
$('figureFile').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>80*1024*1024)throw Error('File exceeds 80 MB');load(JSON.parse(await file.text()),false);}catch(err){$('figureStatus').textContent='Import error: '+err.message;}e.target.value='';});
for(const id of ['figureField','figurePlane','figureDepth'])$(id).addEventListener('input',render);
$('figureMetadata').addEventListener('click',()=>{
 if(!figure||illustrative)return;
 const metadata={schema:'fermentation-cfd-figure/v1',caseId:figure.caseId,provenance:data.provenance,
 field:figure.field,plane:figure.plane,fraction:figure.fraction,
 grid:data.grid,units:Object.fromEntries(Object.entries(data.fields).map(([key,f])=>[key,f.unit])),
 samples:{velocity:figure.velocity.count,scalar:figure.scalar.count,vorticity:figure.curl.count},
 methods:{velocity:'Interpolated vector magnitude on 2D section',scalar:'Interpolated imported physical field',
 vorticity:'Finite-difference curl normal component on interpolated 3D velocity',
 histogram:'Histogram of valid scalar samples on section'},
 limitations:'No solver convergence, mesh independence or experimental validation is implied by the figure'};
 const blob=new Blob([JSON.stringify(metadata,null,2)+'\n'],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='cfd-figure-provenance.json';a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
});
$('figureExport').addEventListener('click',()=>{
 if(!figure||illustrative)return;
 const out=document.createElement('canvas');out.width=1120;out.height=820;
 const ctx=out.getContext('2d');ctx.fillStyle='#f2f6fb';ctx.fillRect(0,0,out.width,out.height);
 const ids=['figureVelocity','figureScalar','figureVorticity','figureHistogram'];
 ids.forEach((id,i)=>ctx.drawImage($(id),i%2*560+10,Math.floor(i/2)*400+10,540,365));
 ctx.font='12px system-ui';ctx.fillStyle='#385b7b';ctx.fillText('Case: '+figure.caseId+' | '+figure.kind+' | '+figure.plane+' '+Math.round(figure.fraction*100)+'% | Derived from imported data; not solver validation',16,802);
 out.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='cfd-scientific-figure.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},'image/png');
});
$('figureExport').disabled=true;$('figureMetadata').disabled=true;
$('figureDemo').click();
})();