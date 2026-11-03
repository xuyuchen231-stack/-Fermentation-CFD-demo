/* Data-driven canvas visualization, not a numerical CFD solver. */
(function(){'use strict';
const CFD=window.FermentationCFD,Demo=window.CFDDemo,$=id=>document.getElementById(id),canvas=$('scene'),ctx=canvas.getContext('2d');
const state={data:null,demo:false,yaw:-.65,pitch:.28,zoom:1,drag:false,last:null,projected:[],dragged:false};
const clip=(v,a,b)=>Math.max(a,Math.min(b,v));
const fmt=n=>Number.isFinite(n)?(Math.abs(n)<.001?n.toExponential(2):n.toFixed(3)):'n/a';
const rangeOf=(d,name)=>{const f=d.fields[name];if(!f)return [0,1];const n=f.type==='vector3'?3:1;let min=Infinity,max=-Infinity;
for(let i=0;i<f.values.length;i+=n){const v=n===1?f.values[i]:f.values.slice(i,i+3).some(x=>x===null)?null:Math.hypot(...f.values.slice(i,i+3));if(v!==null&&Number.isFinite(v)){min=Math.min(min,v);max=Math.max(max,v);}}
return Number.isFinite(min)?[min,max]:[0,1]};
const magnitude=(d,name,p)=>{const v=CFD.sample(d,name,p);return v===null?null:Array.isArray(v)?Math.hypot(...v):v};
const palette=t=>{t=clip(t,0,1);const keys=[[42,124,190],[47,189,211],[104,206,151],[244,205,87],[229,103,75]];let f=t*(keys.length-1),i=Math.min(Math.floor(f),keys.length-2),a=f-i;return 'rgb('+keys[i].map((v,k)=>Math.round(v*(1-a)+keys[i+1][k]*a)).join(',')+')'};
function frame(){const rect=canvas.getBoundingClientRect(),w=rect.width,h=rect.height,dpr=Math.min(window.devicePixelRatio||1,2);if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);return {w,h};}
function bounds(d){const g=d.grid;return {min:g.origin,max:g.origin.map((x,i)=>x+g.spacing[i]*(g.dims[i]-1)),center:g.origin.map((x,i)=>x+g.spacing[i]*(g.dims[i]-1)/2),scale:Math.max(...g.spacing.map((x,i)=>x*(g.dims[i]-1)))||1};}
function project(p,B,w,h){const x=(p[0]-B.center[0])/B.scale,y=(p[1]-B.center[1])/B.scale,z=(p[2]-B.center[2])/B.scale;
const cy=Math.cos(state.yaw),sy=Math.sin(state.yaw),cp=Math.cos(state.pitch),sp=Math.sin(state.pitch);
const a=cy*x-sy*y,b=sy*x+cy*y;
return {x:w/2+a*state.zoom*Math.min(w,h)*.94,y:h/2-(cp*z-sp*b)*state.zoom*Math.min(w,h)*.94,depth:sp*z+cp*b};}
function drawVessel(d,B,w,h){
 const g=d.geometry;
 if(!g||g.type!=='cylindrical_stirred_tank'||!Number.isFinite(g.radius)||g.radius<=0||!Number.isFinite(g.liquidHeight)||g.liquidHeight<=0||!Array.isArray(g.center)||g.center.length!==2){drawBox(B,w,h);return;}
 const [cx,cy]=g.center,bottom=Number.isFinite(g.bottom)?g.bottom:0,top=bottom+g.liquidHeight;
 function ring(z){const arr=[];for(let i=0;i<=64;i++){const a=i/64*Math.PI*2;arr.push(project([cx+g.radius*Math.cos(a),cy+g.radius*Math.sin(a),z],B,w,h));}return arr;}
 const low=ring(bottom),upper=ring(top);ctx.lineWidth=1.1;ctx.strokeStyle='rgba(149,216,244,.48)';
 for(const ringPts of [low,upper]){ctx.beginPath();ringPts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();}
 for(const n of [0,16,32,48]){ctx.beginPath();ctx.moveTo(low[n].x,low[n].y);ctx.lineTo(upper[n].x,upper[n].y);ctx.stroke();}
 ctx.strokeStyle='rgba(221,235,248,.66)';const a=project([cx,cy,bottom+g.liquidHeight*1.08],B,w,h),b=project([cx,cy,bottom+g.liquidHeight*.20],B,w,h);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
 if(Number.isFinite(g.impellerHeight)&&Number.isFinite(g.impellerRadius)){const z=bottom+g.impellerHeight;for(let i=0;i<4;i++){const angle=i*Math.PI/2,p=project([cx+g.impellerRadius*Math.cos(angle),cy+g.impellerRadius*Math.sin(angle),z],B,w,h),c=project([cx,cy,z],B,w,h);ctx.lineWidth=2;ctx.strokeStyle='rgba(230,201,145,.64)';ctx.beginPath();ctx.moveTo(c.x,c.y);ctx.lineTo(p.x,p.y);ctx.stroke();}}
 ctx.font='10px sans-serif';ctx.fillStyle='#7eacc8';ctx.fillText('Vessel outline: schematic',17,h-20);
}
function drawBox(B,w,h){const p=B.min,q=B.max,corner=[];for(let k=0;k<2;k++)for(let j=0;j<2;j++)for(let i=0;i<2;i++)corner.push(project([i?q[0]:p[0],j?q[1]:p[1],k?q[2]:p[2]],B,w,h));
ctx.lineWidth=1;ctx.strokeStyle='rgba(171,216,244,.24)';for(let i=0;i<8;i++)for(let axis=0;axis<3;axis++)if(!(i&(1<<axis))){const b=i|(1<<axis);ctx.beginPath();ctx.moveTo(corner[i].x,corner[i].y);ctx.lineTo(corner[b].x,corner[b].y);ctx.stroke();}
const center=project(B.center,B,w,h);ctx.font='11px sans-serif';ctx.fillStyle='#87b7d6';ctx.fillText('X',corner[1].x+6,corner[1].y);ctx.fillText('Y',corner[2].x+6,corner[2].y);ctx.fillText('Z',corner[4].x+6,corner[4].y);}
function drawEmpty(w,h){ctx.fillStyle='#accbe0';ctx.textAlign='center';ctx.font='15px sans-serif';ctx.fillText('No spatial field loaded',w/2,h/2-6);ctx.font='12px sans-serif';ctx.fillStyle='#719ab8';ctx.fillText('Import CFD results or load the analytical demo',w/2,h/2+18);ctx.textAlign='left';}
function drawStreams(d,B,w,h,name,lo,hi){const g=d.grid,seed=[];for(const zf of [.2,.5,.8])for(let iy=1;iy<=6;iy++)for(let ix=1;ix<=6;ix++){const x=B.min[0]+ix/7*(B.max[0]-B.min[0]),y=B.min[1]+iy/7*(B.max[1]-B.min[1]),z=B.min[2]+zf*(B.max[2]-B.min[2]);if(CFD.sample(d,'velocity',[x,y,z]))seed.push([x,y,z]);}
const step=Math.max(.002,B.scale/125);let total=0;for(const s of seed.slice(0,90)){let pts;try{pts=CFD.streamline(d,s,{step,maxSteps:370});}catch(_){continue;}if(pts.length<2)continue;
for(let i=1;i<pts.length;i++){const value=magnitude(d,name,pts[i]);if(value===null)continue;const a=project(pts[i-1],B,w,h),b=project(pts[i],B,w,h);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=palette((value-lo)/((hi-lo)||1));ctx.globalAlpha=.62;ctx.lineWidth=1.5;ctx.stroke();total++;}
const tip=project(pts[pts.length-1],B,w,h);ctx.fillStyle='#e5f7ff';ctx.globalAlpha=.6;ctx.fillRect(tip.x-1,tip.y-1,2,2);}
ctx.globalAlpha=1;return total;}
function pointOnPlane(B,plane,f,u,v){let p=[0,0,0];const axes=plane==='z'?[0,1,2]:plane==='y'?[0,2,1]:[1,2,0];p[axes[0]]=B.min[axes[0]]+(B.max[axes[0]]-B.min[axes[0]])*u;p[axes[1]]=B.min[axes[1]]+(B.max[axes[1]]-B.min[axes[1]])*v;p[axes[2]]=B.min[axes[2]]+(B.max[axes[2]]-B.min[axes[2]])*f;return p;}
function drawSlices(d,B,w,h,name,lo,hi,vectors){const plane=$('plane').value,f=Number($('slice').value)/100,n=vectors?16:56;
state.projected=[];let count=0;const pts=[];for(let j=0;j<n;j++)for(let i=0;i<n;i++){const p=pointOnPlane(B,plane,f,i/(n-1),j/(n-1)),value=magnitude(d,name,p),vel=CFD.sample(d,'velocity',p);if(value===null||vel===null)continue;const pp=project(p,B,w,h);pts.push({p,pp,value,vel});}
pts.sort((a,b)=>a.pp.depth-b.pp.depth);const dot=clip(state.zoom*Math.min(w,h)/n*.9,2,13);for(const a of pts){const color=palette((a.value-lo)/((hi-lo)||1));ctx.strokeStyle=color;ctx.fillStyle=color;if(vectors){const vec=a.vel,l=Math.hypot(...vec)||1,end=a.p.map((x,i)=>x+vec[i]/l*B.scale*.045),b=project(end,B,w,h);ctx.beginPath();ctx.moveTo(a.pp.x,a.pp.y);ctx.lineTo(b.x,b.y);ctx.lineWidth=1.4;ctx.stroke();}else{ctx.globalAlpha=.82;ctx.fillRect(a.pp.x-dot/2,a.pp.y-dot/2,dot,dot);}}ctx.globalAlpha=1;state.projected=pts;return pts.length;}
function render(){const {w,h}=frame(),d=state.data;if(!d){drawEmpty(w,h);return;}const B=bounds(d),name=$('field').value,range=rangeOf(d,name),mode=$('mode').value;drawVessel(d,B,w,h);let n=0;
if(mode==='streamlines')n=drawStreams(d,B,w,h,name,...range);else n=drawSlices(d,B,w,h,name,...range,mode==='vectors');
const field=d.fields[name];$('legend').textContent=name+' · '+fmt(range[0])+' – '+fmt(range[1])+' '+(field?.unit||'')+' · '+n+' plotted '+(mode==='streamlines'?'segments':'samples');}
function fillSelector(d){const select=$('field');select.replaceChildren();for(const [key,f] of Object.entries(d.fields)){const op=document.createElement('option');op.value=key;op.textContent=(key==='velocity'?'Velocity magnitude':key.replaceAll('_',' '))+' ('+f.unit+')';select.appendChild(op);}select.value='velocity';}
function load(raw,demo=false){let d;
try{if(demo){if(raw.provenance?.kind!=='analytical-demo')throw Error('Demo provenance required');d=raw;}else d=CFD.validate(raw);}
catch(e){$('notice').className='notice warn';$('notice').textContent='Import rejected: '+e.message;return;}
state.data=d;state.demo=demo;state.projected=[];fillSelector(d);
const p=d.provenance,B=bounds(d),derived=p.kind==='cfd-informed-model',status=demo?'ANALYTICAL DEMO — NOT CFD':derived?'CFD-INFORMED TRANSPORT MODEL — UNVALIDATED':'IMPORTED CFD — UNVERIFIED';
if(derived&&d.fields[p.transportField]){$('field').value=p.transportField;$('mode').value='slice';}
$('caseName').textContent=p.caseId;$('caseMeta').textContent=p.solver||'Unspecified solver';
$('provenance').textContent=demo?'ANALYTICAL DEMO':derived?'CFD-INFORMED MODEL':'CFD IMPORTED';$('provenance').className='tag '+(demo?'demo':derived?'modeled':'real');
$('notice').className='notice '+(demo||derived?'warn':'');$('notice').textContent=status+'. '+(demo?'This field was generated by formulas solely to demonstrate the viewer. It is not Navier–Stokes output.':derived?'The velocity comes from a CFD dataset, but the displayed scalar is a separate fixed-volume transport-model prediction with prescribed diffusivity and reaction/transfer terms. Not experimental evidence.':'Provenance is supplied by the file author; physical validity still requires independent numerical and experimental checks.');
$('details').textContent='Case: '+p.caseId+'\nSolver: '+p.solver+'\nProvenance: '+p.kind+'\nGrid cells: '+d.grid.dims.join(' × ')+'\nBounds [m]: '+B.min.map(fmt).join(', ')+' → '+B.max.map(fmt).join(', ')+'\nFields: '+Object.keys(d.fields).map(k=>k+' ['+d.fields[k].unit+']').join(', ');
const scalar=Object.keys(d.fields).filter(k=>d.fields[k].type==='scalar');$('quality').textContent=(demo?'Demo only · Not scientifically valid.':derived?'CFD-informed scalar model · reaction/transfer assumptions require validation.':'CFD file imported · Validation not established.')+(scalar.length?'\n'+scalar.map(k=>{try{const s=CFD.scalarStats(d,k);return k+': mean '+fmt(s.mean)+', CV '+(s.cv===null?'n/a':(100*s.cv).toFixed(1)+'%');}catch(_){return k+': no valid values';}}).join('\n'):'');
const div=CFD.divergenceStats(d);$('quality').textContent+='\nGrid-sampled divergence RMS: '+fmt(div.rms)+' 1/s ('+div.count+' points) · diagnostic only, not solver continuity residual.';
if(d.geometry){const g=d.geometry;$('details').textContent+='\nVessel diameter: '+fmt(2*g.radius)+' m · liquid height: '+fmt(g.liquidHeight)+' m\nGeometry: '+(g.geometryLabel||'metadata supplied by importer');}
$('probe').textContent='Click a slice sample to inspect the local field.';render();}
$('demo').addEventListener('click',()=>load(Demo.create(),true));$('file').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>80*1024*1024)throw Error('File exceeds 80 MB import limit');load(JSON.parse(await file.text()),false);}catch(err){$('notice').className='notice warn';$('notice').textContent='Cannot import: '+err.message;}e.target.value='';});
for(const id of ['mode','field','plane','slice'])$(id).addEventListener('input',()=>{$('sliceLabel').textContent=$('slice').value+'%';render();});
canvas.addEventListener('pointerdown',e=>{state.drag=true;state.dragged=false;state.last=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(!state.drag)return;const dx=e.clientX-state.last[0],dy=e.clientY-state.last[1];if(Math.abs(dx)+Math.abs(dy)>1)state.dragged=true;state.yaw+=dx*.007;state.pitch=clip(state.pitch+dy*.007,-1.45,1.45);state.last=[e.clientX,e.clientY];render();});
canvas.addEventListener('pointerup',e=>{state.drag=false;if(state.dragged||!state.data||$('mode').value==='streamlines')return;const r=canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;let nearest=null,dist=Infinity;for(const v of state.projected){const dd=(v.pp.x-x)**2+(v.pp.y-y)**2;if(dd<dist){dist=dd;nearest=v;}}if(!nearest||dist>1600)return;const p=nearest.p,d=state.data,name=$('field').value;const value=CFD.sample(d,name,p),v=CFD.sample(d,'velocity',p);$('probe').textContent='Position [m]: '+p.map(fmt).join(', ')+'\n'+name+': '+(Array.isArray(value)?value.map(fmt).join(', '):fmt(value))+' '+d.fields[name].unit+'\nVelocity [m/s]: '+(v?v.map(fmt).join(', '):'n/a');});
canvas.addEventListener('pointercancel',()=>{state.drag=false;});
canvas.addEventListener('wheel',e=>{e.preventDefault();state.zoom=clip(state.zoom*Math.exp(-e.deltaY*.001),.45,2.7);render();},{passive:false});
window.addEventListener('resize',render);render();
})();
