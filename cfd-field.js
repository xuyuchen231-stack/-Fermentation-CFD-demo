/* CFD spatial field foundation: data import, interpolation and streamline integration.
 * This module DOES NOT solve Navier–Stokes or generate CFD fields.
 * Units are SI; grids are cell-centred uniform Cartesian samples.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FermentationCFD=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){'use strict';
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const assert=(ok,msg)=>{if(!ok)throw new Error('CFD field: '+msg);};
function validate(raw){
 assert(raw&&raw.schema==='fermentation-cfd-grid/v1','unsupported schema');
 assert(raw.provenance&&['cfd-solved','cfd-informed-model'].includes(raw.provenance.kind),'requires cfd-solved or cfd-informed-model provenance');
 if(raw.provenance.kind==='cfd-informed-model'){
  assert(raw.provenance.parent&&raw.provenance.parent.kind==='cfd-solved'&&typeof raw.provenance.parent.caseId==='string','modeled fields require parent solved case metadata');
  assert(typeof raw.provenance.transportField==='string'&&raw.provenance.transportField.trim(),'modeled transport field required');
  assert(raw.provenance.assumptions&&typeof raw.provenance.assumptions==='object','modeled transport assumptions required');
 }
 assert(typeof raw.provenance.solver==='string'&&raw.provenance.solver.trim(),'solver name required');
 const g=raw.grid;assert(g&&Array.isArray(g.dims)&&g.dims.length===3,'grid dims required');
 const dims=g.dims;assert(dims.every(n=>Number.isInteger(n)&&n>=2&&n<=256),'each dimension must be 2..256');
 const count=dims.reduce((a,b)=>a*b,1);assert(count<=2000000,'grid too large');
 for(const k of ['origin','spacing'])assert(Array.isArray(g[k])&&g[k].length===3&&g[k].every(finite),'invalid '+k);
 assert(g.spacing.every(n=>n>0),'spacing must be positive');
 assert(raw.fields&&typeof raw.fields==='object','fields required');
 const fields={};
 for(const [name,field] of Object.entries(raw.fields)){
   assert(/^[A-Za-z][A-Za-z0-9_]*$/.test(name),'invalid field name');
   assert(field&&['scalar','vector3'].includes(field.type),'invalid field type: '+name);
   assert(typeof field.unit==='string'&&field.unit.trim(),'unit required: '+name);
   const width=field.type==='vector3'?3:1;
   assert(Array.isArray(field.values)&&field.values.length===count*width,'wrong value count: '+name);
   assert(field.values.every(v=>v===null||finite(v)),'nonfinite value: '+name);
   if(width===3)for(let k=0;k<field.values.length;k+=3){const blank=field.values.slice(k,k+3).filter(v=>v===null).length;assert(blank===0||blank===3,'partial vector null mask: '+name);}
   fields[name]={type:field.type,unit:field.unit,values:field.values.slice()};
 }
 assert(fields.velocity&&fields.velocity.type==='vector3'&&fields.velocity.unit==='m/s','velocity vector in m/s required');
 const p=raw.provenance;assert(typeof p.caseId==='string'&&p.caseId.trim(),'case ID required');
 const result={schema:raw.schema,provenance:{...p},grid:{dims:dims.slice(),origin:g.origin.slice(),spacing:g.spacing.slice()},fields};
 if(raw.geometry!==undefined){
  const v=raw.geometry;assert(v&&v.type==='cylindrical_stirred_tank','unsupported reactor geometry type');
  assert(finite(v.radius)&&v.radius>0&&finite(v.liquidHeight)&&v.liquidHeight>0,'invalid vessel radius or liquid height');
  assert(Array.isArray(v.center)&&v.center.length===2&&v.center.every(finite),'invalid vessel center');
  const bottom=v.bottom===undefined?0:v.bottom;assert(finite(bottom),'invalid vessel bottom');
  const geometry={type:v.type,radius:v.radius,liquidHeight:v.liquidHeight,center:v.center.slice(),bottom};
  if(v.impellerHeight!==undefined||v.impellerRadius!==undefined){
   assert(finite(v.impellerHeight)&&v.impellerHeight>0&&v.impellerHeight<v.liquidHeight,'invalid relative impeller height');
   assert(finite(v.impellerRadius)&&v.impellerRadius>0&&v.impellerRadius<v.radius,'invalid impeller radius');
   geometry.impellerHeight=v.impellerHeight;geometry.impellerRadius=v.impellerRadius;
  }
  if(typeof v.geometryLabel==='string')geometry.geometryLabel=v.geometryLabel.slice(0,120);
  result.geometry=geometry;
 }
 return result;
}
function index(d,i,j,k){return (k*d[1]+j)*d[0]+i;}
function sample(dataset,name,position){
 const {grid,fields}=dataset,field=fields[name];if(!field)throw new Error('Unknown CFD field: '+name);
 const {dims,origin,spacing}=grid;
 assert(Array.isArray(position)&&position.length===3,'position must have 3 coordinates');
 const u=position.map((x,a)=>(x-origin[a])/spacing[a]);
 if(u.some((x,a)=>!finite(x)||x<0||x>dims[a]-1))return null;
 const lo=u.map((x,a)=>Math.min(Math.floor(x),dims[a]-2)),t=u.map((x,a)=>x-lo[a]);
 const width=field.type==='vector3'?3:1,out=Array(width).fill(0);
 for(let dz=0;dz<=1;dz++)for(let dy=0;dy<=1;dy++)for(let dx=0;dx<=1;dx++){
  const w=(dx?t[0]:1-t[0])*(dy?t[1]:1-t[1])*(dz?t[2]:1-t[2]);
  const base=index(dims,lo[0]+dx,lo[1]+dy,lo[2]+dz)*width;
  for(let c=0;c<width;c++){const v=field.values[base+c];if(v===null)return null;out[c]+=w*v;}
 }
 return width===1?out[0]:out;
}
function streamline(dataset,seed,{step=0.01,maxSteps=1500,direction=1,minSpeed=1e-7}={}){
 assert(finite(step)&&step>0&&step<=1,'invalid streamline step');
 assert(Number.isInteger(maxSteps)&&maxSteps>0&&maxSteps<=10000,'invalid step count');
 assert(direction===1||direction===-1,'invalid direction');
 const pts=[seed.slice()],speed=v=>Math.hypot(...v);
 for(let i=0;i<maxSteps;i++){
  const p=pts[pts.length-1],v=sample(dataset,'velocity',p);
  if(!v||speed(v)<minSpeed)break;
  const mid=p.map((x,a)=>x+direction*step*v[a]/speed(v)/2);
  const vm=sample(dataset,'velocity',mid);
  if(!vm||speed(vm)<minSpeed)break;
  const next=p.map((x,a)=>x+direction*step*vm[a]/speed(vm));
  if(!sample(dataset,'velocity',next))break;
  pts.push(next);
 }
 return pts;
}
function scalarStats(dataset,name){
 const f=dataset.fields[name];assert(f&&f.type==='scalar','scalar field required');
 let count=0,mean=0,m2=0,min=Infinity,max=-Infinity;
 for(const v of f.values){if(!finite(v))continue;count++;const delta=v-mean;mean+=delta/count;m2+=delta*(v-mean);if(v<min)min=v;if(v>max)max=v;}
 assert(count>0,'no valid scalar samples');
 const std=Math.sqrt(Math.max(0,m2/count));
 return {count,mean,min,max,std,cv:mean!==0?std/Math.abs(mean):null};
}
function divergenceStats(dataset){
 const {dims,spacing}=dataset.grid,u=dataset.fields.velocity.values;
 const indexOf=(i,j,k)=>(k*dims[1]+j)*dims[0]+i;
 const position=[0,0,0];let count=0,mean=0,m2=0,maxAbs=0;
 for(let k=0;k<dims[2];k++)for(let j=0;j<dims[1];j++)for(let i=0;i<dims[0];i++){
  position[0]=i;position[1]=j;position[2]=k;
  const center=indexOf(i,j,k);if(u[3*center]===null)continue;
  let div=0,valid=true;
  for(let axis=0;axis<3;axis++){
   const low=position.slice(),high=position.slice();
   if(position[axis]===0){high[axis]++;}else if(position[axis]===dims[axis]-1){low[axis]--;}else{low[axis]--;high[axis]++;}
   const a=indexOf(...low),b=indexOf(...high),ua=u[3*a+axis],ub=u[3*b+axis];
   if(!finite(ua)||!finite(ub)){valid=false;break;}
   const scale=(high[axis]-low[axis])*spacing[axis];
   div+=(ub-ua)/scale;
  }
  if(!valid)continue;
  count++;const diff=div-mean;mean+=diff/count;m2+=diff*(div-mean);
  maxAbs=Math.max(maxAbs,Math.abs(div));
 }
 return {count,mean:count?mean:null,rms:count?Math.sqrt(m2/count+mean*mean):null,maxAbs:count?maxAbs:null,unit:'1/s',
  note:'Diagnostic on interpolated Cartesian samples, NOT original solver continuity residual'};
}
return Object.freeze({validate,sample,streamline,scalarStats,divergenceStats});
});
