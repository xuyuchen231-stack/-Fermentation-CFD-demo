/* Analytical reference flow. NOT CFD and NOT validated bioreactor physics. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CFDDemo=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){'use strict';
function create({dims=[33,33,29],radius=.095,height=.18,omega=7,radial=.23}={}){
 const [nx,ny,nz]=dims,dx=2*radius/(nx-1),dy=2*radius/(ny-1),dz=height/(nz-1),origin=[-radius,-radius,0],velocity=[],tracer=[];
 // Demonstration: smooth counter-rotating analytic swirls, NOT an impeller flow solution.
 for(let k=0;k<nz;k++)for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
 const x=origin[0]+i*dx,y=origin[1]+j*dy,z=k*dz,r=Math.hypot(x,y),inside=r<radius*.94&&z>0&&z<height;
 if(!inside){velocity.push(null,null,null);tracer.push(null);continue;}
 const axial=Math.sin(Math.PI*z/height),core=Math.exp(-Math.pow(r/(radius*.76),4));
 const u=-omega*y*axial*core, v=omega*x*axial*core;
 const w=radial*Math.sin(2*Math.PI*z/height)*(1-r*r/(radius*radius))*core*.1;
 velocity.push(u,v,w);
 const plume=Math.exp(-((x-.03)**2+(y+.025)**2)/(.025**2))*Math.exp(-((z-.14)**2)/(.035**2));
 tracer.push(Math.max(0,Math.min(1,plume)));
 }
 return {schema:'fermentation-cfd-grid/v1',geometry:{type:'cylindrical_stirred_tank',radius,liquidHeight:height,center:[0,0],bottom:0,impellerHeight:height*.48,impellerRadius:radius*.36,geometryLabel:'Illustrative geometry only'},provenance:{kind:'analytical-demo',solver:'Analytical demonstration (no CFD solver)',caseId:'ANALYTICAL-DEMO',validation:'not-valid-for-science'},grid:{dims,origin,spacing:[dx,dy,dz]},fields:{velocity:{type:'vector3',unit:'m/s',values:velocity},tracer:{type:'scalar',unit:'normalized',values:tracer}}};
}
return Object.freeze({create});
});