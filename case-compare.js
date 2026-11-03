/* Scientific side-by-side case comparison on identical SI sampling grids.
 * Does not regrid, interpolate between cases, or assert scientific validation.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CFDCompare=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){'use strict';
function assert(ok,msg){if(!ok)throw Error('Case comparison: '+msg);}
function compare(a,b,name){
 assert(a&&b&&a.grid&&b.grid&&a.fields&&b.fields,'two validated field datasets required');
 const g=a.grid,h=b.grid;
 for(const key of ['dims','origin','spacing']){
  assert(Array.isArray(g[key])&&Array.isArray(h[key])&&g[key].length===3&&h[key].length===3,'invalid grid '+key);
  for(let i=0;i<3;i++)assert(Math.abs(g[key][i]-h[key][i])<=1e-9*Math.max(1,Math.abs(g[key][i]),Math.abs(h[key][i])),'different grids: '+key+' (resampling required)');
 }
 const f=a.fields[name],q=b.fields[name];assert(f&&q,'field '+name+' must exist in both cases');
 assert(f.type===q.type&&f.unit===q.unit,'field type/unit mismatch');
 const stride=f.type==='vector3'?3:1,volume=g.spacing.reduce((x,y)=>x*y,1);
 let n=0,meanA=0,meanB=0,meanDelta=0,m2=0,mae=0,square=0,maxAbs=0,maskMismatch=0;
 const difference=[];
 for(let k=0;k<f.values.length;k+=stride){
  const av=f.values.slice(k,k+stride),bv=q.values.slice(k,k+stride);
  const validA=av.every(Number.isFinite),validB=bv.every(Number.isFinite);
  if(validA!==validB)maskMismatch++;
  if(!validA||!validB){for(let i=0;i<stride;i++)difference.push(null);continue;}
  const magA=stride===3?Math.hypot(...av):av[0],magB=stride===3?Math.hypot(...bv):bv[0];
  const delta=magB-magA;
  n++;meanA+=(magA-meanA)/n;meanB+=(magB-meanB)/n;
  meanDelta+=(delta-meanDelta)/n;m2+=delta*delta;
  mae+=Math.abs(delta);square+=delta*delta;maxAbs=Math.max(maxAbs,Math.abs(delta));
  if(stride===3){for(let i=0;i<3;i++)difference.push(bv[i]-av[i]);}
  else difference.push(delta);
 }
 assert(n>0,'no overlapping fluid nodes');
 return {field:name,unit:f.unit,type:f.type,caseA:a.provenance.caseId,caseB:b.provenance.caseId,
  count:n,maskMismatch,overlapVolume_m3:n*volume,meanA,meanB,meanDelta,mae:mae/n,rmse:Math.sqrt(square/n),maxAbs,
  note:stride===3?'Velocity metrics compare speed magnitudes; vector differences are separately retained.':'Scalar concentration difference B minus A.',
  difference};
}
return Object.freeze({compare});
});