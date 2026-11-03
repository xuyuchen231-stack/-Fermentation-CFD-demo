/* Reproducible 2D scientific sections from validated 3D field samples.
 * Velocity/vorticity panels are post-processing, NOT independent CFD solves.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ScientificFigures=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){'use strict';
function slice(data,field,plane='z',fraction=.5,resolution=45){
 if(!data||!data.grid||!data.fields[field])throw Error('Validated spatial field required');
 if(!['x','y','z'].includes(plane))throw Error('Invalid plane');
 if(!Number.isFinite(fraction)||fraction<0||fraction>1)throw Error('Invalid slice fraction');
 if(!Number.isInteger(resolution)||resolution<4||resolution>250)throw Error('Invalid resolution');
 const axes=plane==='z'?[0,1,2]:plane==='y'?[0,2,1]:[1,2,0],g=data.grid;
 const extent=g.spacing.map((s,i)=>s*(g.dims[i]-1));
 const values=[],points=[];let min=Infinity,max=-Infinity,count=0;
 for(let j=0;j<resolution;j++)for(let i=0;i<resolution;i++){
  const p=[0,0,0];p[axes[0]]=g.origin[axes[0]]+extent[axes[0]]*i/(resolution-1);
  p[axes[1]]=g.origin[axes[1]]+extent[axes[1]]*j/(resolution-1);
  p[axes[2]]=g.origin[axes[2]]+extent[axes[2]]*fraction;
  const v=globalCFD().sample(data,field,p),scalar=v===null?null:Array.isArray(v)?Math.hypot(...v):v;
  values.push(scalar);points.push(p);
  if(scalar!==null){min=Math.min(min,scalar);max=Math.max(max,scalar);count++;}
 }
 return {field,plane,fraction,resolution,axes,extent,values,points,count,min:count?min:null,max:count?max:null,unit:data.fields[field].unit};
}
function globalCFD(){if(typeof require==='function')return require('./cfd-field.js');return root.FermentationCFD;}
function vorticity(data,plane='z',fraction=.5,resolution=45){
 if(!data.fields.velocity)throw Error('Velocity required');
 const axes=plane==='z'?[0,1,2]:plane==='y'?[0,2,1]:[1,2,0],g=data.grid,ext=g.spacing.map((s,i)=>s*(g.dims[i]-1)),values=[];
 let min=Infinity,max=-Infinity,count=0;
 for(let j=0;j<resolution;j++)for(let i=0;i<resolution;i++){
  const p=[0,0,0];p[axes[0]]=g.origin[axes[0]]+ext[axes[0]]*i/(resolution-1);p[axes[1]]=g.origin[axes[1]]+ext[axes[1]]*j/(resolution-1);p[axes[2]]=g.origin[axes[2]]+ext[axes[2]]*fraction;
  const step=axes.map(a=>g.spacing[a]),c=globalCFD().sample(data,'velocity',p);
  if(!c){values.push(null);continue;}
  const deriv=(velocityComponent,axisIndex)=>{
   const axis=axes[axisIndex],h=step[axisIndex]*.5,left=p.slice(),right=p.slice();
   left[axis]-=h;right[axis]+=h;
   const l=globalCFD().sample(data,'velocity',left),r=globalCFD().sample(data,'velocity',right);
   if(l&&r)return(r[velocityComponent]-l[velocityComponent])/(2*h);
   if(r)return(r[velocityComponent]-c[velocityComponent])/h;
   if(l)return(c[velocityComponent]-l[velocityComponent])/h;
   return null;
  };
  const d1=deriv(axes[1],0),d2=deriv(axes[0],1);
  const omega=d1===null||d2===null?null:d1-d2;values.push(omega);
  if(omega!==null){min=Math.min(min,omega);max=Math.max(max,omega);count++;}
 }
 return {field:'normal_vorticity',plane,fraction,resolution,axes,extent:ext,values,count,min:count?min:null,max:count?max:null,unit:'1/s',note:'Finite-difference normal vorticity estimated from resampled velocity; not a solver-native turbulence field'};
}
function histogram(values,bins=18){
 if(!Number.isInteger(bins)||bins<2||bins>100)throw Error('Invalid bins');
 const clean=values.filter(Number.isFinite);if(!clean.length)return {counts:Array(bins).fill(0),min:null,max:null,count:0};
 const min=Math.min(...clean),max=Math.max(...clean),counts=Array(bins).fill(0),width=max-min;
 for(const v of clean){const i=width===0?0:Math.min(bins-1,Math.floor((v-min)/width*bins));counts[i]++;}
 return {counts,min,max,count:clean.length};
}
return Object.freeze({slice,vorticity,histogram});
});