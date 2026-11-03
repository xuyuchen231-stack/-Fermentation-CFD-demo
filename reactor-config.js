/* Editable reactor design schema; values are illustrative unless measured.
 * Physical geometry and process settings are separate from solved CFD fields.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ReactorConfig=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){'use strict';
const defaults=Object.freeze({
 name:'Reference stirred tank — illustrative',vessel_diameter_m:0.15,liquid_height_m:0.17,
 baffle_count:4,baffle_width_m:0.013,baffle_thickness_m:0.002,baffle_clearance_m:0.0015,
 impeller_z_m:0.055,impeller_diameter_m:0.05,blade_height_m:0.012,blade_thickness_m:0.002,shaft_radius_m:0.003,
 impeller_speed_rpm:300,gas_flow_L_min:0.3,feed_x_m:0.018,feed_y_m:0,feed_z_m:0.14,
 fluid_density_kg_m3:998,fluid_viscosity_Pa_s:0.001,provenance:'illustrative-reference'});
const numeric=Object.keys(defaults).filter(k=>typeof defaults[k]==='number');
function validate(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Expected a reactor configuration object');
 const d={...defaults};
 for(const [key,value] of Object.entries(input)){
  if(!(key in defaults))throw Error('Unknown reactor parameter: '+key);
  if(numeric.includes(key)){if(typeof value!=='number'||!Number.isFinite(value))throw Error('Invalid finite number: '+key);}
  else if(typeof value!=='string'||!value.trim()||value.length>120)throw Error('Invalid text: '+key);
  d[key]=value;
 }
 const check=(ok,msg)=>{if(!ok)throw Error(msg);};
 const D=d.vessel_diameter_m,H=d.liquid_height_m,R=D/2;
 check(D>=.05&&D<=10&&H>=.05&&H<=20,'Vessel size outside supported SI range');
 check(Number.isInteger(d.baffle_count)&&d.baffle_count>=0&&d.baffle_count<=12,'Invalid baffle count');
 check(d.baffle_width_m>0&&d.baffle_width_m<D/3,'Invalid baffle width');
 check(d.baffle_thickness_m>0&&d.baffle_thickness_m<d.baffle_width_m,'Invalid baffle thickness');
 check(d.baffle_clearance_m>=0&&d.baffle_clearance_m<D/8,'Invalid baffle clearance');
 check(d.impeller_z_m>0&&d.impeller_z_m<H,'Impeller must lie inside liquid');
 check(d.impeller_diameter_m>0&&d.impeller_diameter_m<D*.8,'Impeller diameter must be below 80% of vessel diameter');
 check(d.blade_height_m>0&&d.blade_height_m<2*Math.min(d.impeller_z_m,H-d.impeller_z_m),'Blade extends outside liquid');
 check(d.blade_thickness_m>0&&d.blade_thickness_m<d.blade_height_m,'Invalid blade thickness');
 check(d.shaft_radius_m>0&&d.shaft_radius_m<d.impeller_diameter_m/10,'Invalid shaft radius');
 check(d.impeller_speed_rpm>=0&&d.impeller_speed_rpm<=3000,'Impeller speed outside supported range');
 check(d.gas_flow_L_min>=0&&d.gas_flow_L_min<=1000,'Gas flow outside supported range');
 check(d.fluid_density_kg_m3>0&&d.fluid_density_kg_m3<20000,'Invalid fluid density');
 check(d.fluid_viscosity_Pa_s>0&&d.fluid_viscosity_Pa_s<100,'Invalid fluid viscosity');
 check(Math.hypot(d.feed_x_m,d.feed_y_m)<R&&d.feed_z_m>=0&&d.feed_z_m<=H,'Feed position outside vessel');
 return d;
}
function metrics(input){
 const d=validate(input),D=d.vessel_diameter_m,di=d.impeller_diameter_m,
 n=d.impeller_speed_rpm/60,volume=Math.PI*D*D/4*d.liquid_height_m,
 reynolds=d.fluid_density_kg_m3*n*di*di/d.fluid_viscosity_Pa_s;
 return {workingVolume_L:volume*1000,aspectRatio:d.liquid_height_m/D,
 impellerToTankRatio:di/D,impellerTipSpeed_m_s:Math.PI*di*n,
 impellerReynolds:reynolds,gasVVM:d.gas_flow_L_min/(volume*1000),
 note:'Geometric and operating-condition indicators only. No power number, kLa or CFD velocity is inferred.'};
}
function geometry(input){const d=validate(input);return {
 type:'cylindrical_stirred_tank',radius:d.vessel_diameter_m/2,liquidHeight:d.liquid_height_m,
 center:[0,0],bottom:0,impellerHeight:d.impeller_z_m,impellerRadius:d.impeller_diameter_m/2,
 geometryLabel:'User-editable configuration — CFD solve not yet performed'};}
return Object.freeze({defaults,numeric,validate,metrics,geometry});
});