/* Two-case quantitative comparison. The visualizer stays independent. */
(function(){'use strict';
const $=id=>document.getElementById(id),CFD=window.FermentationCFD,Compare=window.CFDCompare;
const loaded=[null,null];const fmt=x=>Number.isFinite(x)?x.toPrecision(5):'n/a';
function drawDifference(a,stats){
 const canvas=$('compareCanvas'),ctx=canvas.getContext('2d');
 const w=480,h=300;canvas.width=w;canvas.height=h;ctx.clearRect(0,0,w,h);
 const dims=a.grid.dims,plane=$('comparePlane').value,axis=plane==='z'?2:plane==='y'?1:0;
 const axes=[0,1,2].filter(x=>x!==axis),nx=dims[axes[0]],ny=dims[axes[1]];
 const layer=Math.min(dims[axis]-1,Math.max(0,Math.round(Number($('compareSlice').value)/100*(dims[axis]-1))));
 const stride=stats.type==='vector3'?3:1;let maximum=stats.maxAbs;
 if(stride===3){maximum=0;for(let n=0;n<stats.difference.length;n+=3){const v=stats.difference.slice(n,n+3);if(v.every(Number.isFinite))maximum=Math.max(maximum,Math.hypot(...v));}}
 const magnitude=Math.max(maximum,1e-12);
 ctx.fillStyle='#e9f0f7';ctx.fillRect(0,0,w,h);
 for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
  const coord=[0,0,0];coord[axes[0]]=i;coord[axes[1]]=j;coord[axis]=layer;
  const idx=(coord[2]*dims[1]+coord[1])*dims[0]+coord[0],base=idx*stride;
  const values=stats.difference.slice(base,base+stride);
  if(values.some(v=>v===null)){ctx.fillStyle='#8395a8';}
  else{
   const delta=stride===3?Math.hypot(...values):values[0];
   const t=Math.min(1,Math.abs(delta)/magnitude);
   const start=[241,246,252],end=delta>=0?[207,74,73]:[43,113,194];
   const rgb=start.map((v,k)=>Math.round(v*(1-t)+end[k]*t));
   ctx.fillStyle='rgb('+rgb.join(',')+')';
  }
  ctx.fillRect(i*w/nx,(ny-1-j)*h/ny,Math.ceil(w/nx),Math.ceil(h/ny));
 }
 $('compareLegend').textContent='Blue: lower in B · Red: higher in B · Gray: masked / non-overlapping · Range ±'+fmt(maximum)+' '+stats.unit+(stride===3?' · Red encodes vector change magnitude only, NOT higher speed; gray denotes masked nodes.':'');
}
function update(){
 const [a,b]=loaded,selector=$('compareField');
 if(!a||!b){$('compareResult').textContent='Load two CFD field files to compare identical physical coordinates.';return;}
 const common=Object.keys(a.fields).filter(k=>b.fields[k]&&a.fields[k].unit===b.fields[k].unit&&a.fields[k].type===b.fields[k].type);
 selector.replaceChildren();for(const key of common){const option=document.createElement('option');option.value=key;option.textContent=key+' ('+a.fields[key].unit+')';selector.appendChild(option);}
 if(!common.length){$('compareResult').textContent='No compatible field names and units in the two cases.';return;}
 calculate();
}
function calculate(){
 const [a,b]=loaded;if(!a||!b)return;
 try{const s=Compare.compare(a,b,$('compareField').value);
 drawDifference(a,s);$('compareResult').textContent='Case A: '+s.caseA+'\nCase B: '+s.caseB+'\nField: '+s.field+' ['+s.unit+']\nValid overlapping points: '+s.count+'\nMask mismatch points: '+s.maskMismatch+'\nMean A: '+fmt(s.meanA)+'\nMean B: '+fmt(s.meanB)+'\nMean change (B − A): '+fmt(s.meanDelta)+'\nMAE: '+fmt(s.mae)+'\nRMSE: '+fmt(s.rmse)+'\nMaximum absolute difference: '+fmt(s.maxAbs)+'\n'+s.note+'\nNote: numerical comparison does not establish scientific validity.';
 }catch(e){$('compareResult').textContent='Cannot compare: '+e.message;}
}
for(let n=0;n<2;n++)$('compareFile'+n).addEventListener('change',async e=>{
 const file=e.target.files[0];if(!file)return;
 try{if(file.size>80*1024*1024)throw Error('File exceeds 80 MB');const data=CFD.validate(JSON.parse(await file.text()));
 if(data.provenance.kind==='analytical-demo')throw Error('Analytical demo cannot be imported as CFD evidence');
 loaded[n]=data;$('compareName'+n).textContent=data.provenance.caseId+' ('+data.provenance.kind+')';update();
 }catch(err){$('compareName'+n).textContent='Import rejected: '+err.message;}
 e.target.value='';
});
$('compareField').addEventListener('change',calculate);
for(const id of ['comparePlane','compareSlice'])$(id).addEventListener('input',()=>{$('compareSliceLabel').textContent=$('compareSlice').value+'%';calculate();});
})();