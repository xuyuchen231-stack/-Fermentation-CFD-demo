/* Editable reference vessel workspace. No solver claims or invented CFD results. */
(function(){'use strict';
const Model=window.ReactorConfig,$=id=>document.getElementById(id);
const groups=[
 ['Vessel and baffles',['vessel_diameter_m','liquid_height_m','baffle_count','baffle_width_m','baffle_thickness_m','baffle_clearance_m']],
 ['Impeller and shaft',['impeller_z_m','impeller_diameter_m','blade_height_m','blade_thickness_m','shaft_radius_m']],
 ['Operation and liquid',['impeller_speed_rpm','gas_flow_L_min','fluid_density_kg_m3','fluid_viscosity_Pa_s']],
 ['Feed position',['feed_x_m','feed_y_m','feed_z_m']]
];
const label=k=>k.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());
const pretty=n=>Number(n).toPrecision(5);
let state=Model.validate(Model.defaults);
const form=$('reactorFields');
for(const [name,keys] of groups){
 const fieldset=document.createElement('fieldset'),legend=document.createElement('legend');legend.textContent=name;fieldset.appendChild(legend);
 const grid=document.createElement('div');grid.className='reactor-input-grid';
 for(const key of keys){
  const wrap=document.createElement('label'),caption=document.createElement('span');caption.textContent=label(key);
  const input=document.createElement('input');input.type='number';input.step=key==='baffle_count'?'1':'any';input.id='param_'+key;input.value=state[key];
  input.addEventListener('input',recalculate);
  wrap.append(caption,input);grid.appendChild(wrap);
 }
 fieldset.appendChild(grid);form.appendChild(fieldset);
}
function read(){
 const next={...state};
 for(const key of Model.numeric){
  const raw=$('param_'+key).value;
  if(raw.trim()==='')throw Error('Missing value: '+key);
  next[key]=Number(raw);
 }
 next.name=$('reactorName').value.trim();
 next.provenance=$('reactorProvenance').value;
 return Model.validate(next);
}
function render(){
 const canvas=$('reactorPreview'),ctx=canvas.getContext('2d'),w=canvas.width=700,h=canvas.height=390;
 ctx.clearRect(0,0,w,h);ctx.fillStyle='#f2f7fc';ctx.fillRect(0,0,w,h);
 const D=state.vessel_diameter_m,H=state.liquid_height_m,scale=Math.min(240/H,250/D);
 const width=D*scale,height=H*scale,x=w/2-width/2,y=h/2-height/2;
 ctx.strokeStyle='#2775bc';ctx.lineWidth=3;ctx.strokeRect(x,y,width,height);
 ctx.fillStyle='rgba(47,151,211,.12)';ctx.fillRect(x+2,y+2,width-4,height-4);
 ctx.strokeStyle='#7494b3';ctx.lineWidth=3;
 for(let n=0;n<state.baffle_count;n++){const offset=n%2===0?x+8:x+width-8;ctx.beginPath();ctx.moveTo(offset,y+5);ctx.lineTo(offset,y+height-5);ctx.stroke();}
 const zi=y+height-state.impeller_z_m*scale,rad=state.impeller_diameter_m*scale/2;
 ctx.strokeStyle='#244b79';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(w/2,y);ctx.lineTo(w/2,zi);ctx.stroke();
 ctx.strokeStyle='#e39b39';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(w/2-rad,zi);ctx.lineTo(w/2+rad,zi);ctx.stroke();
 const fx=w/2+state.feed_x_m*scale,fz=y+height-state.feed_z_m*scale;
 ctx.fillStyle='#d9534f';ctx.beginPath();ctx.arc(fx,fz,5,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#365a7c';ctx.font='13px system-ui';ctx.fillText('SIDE VIEW · schematic, not CFD',20,28);
 ctx.fillText('D = '+pretty(D)+' m',x,y+height+22);ctx.fillText('H = '+pretty(H)+' m',x+width+16,y+20);
 ctx.fillText('Impeller '+pretty(state.impeller_speed_rpm)+' rpm',20,h-20);
}
function recalculate(){
 try{
  const candidate=read(),m=Model.metrics(candidate);
  state=candidate;
  $('reactorError').textContent='';
  $('reactorSummary').textContent='Working volume: '+pretty(m.workingVolume_L)+' L\nH/D: '+pretty(m.aspectRatio)+'\nImpeller D/T: '+pretty(m.impellerToTankRatio)+'\nTip speed: '+pretty(m.impellerTipSpeed_m_s)+' m/s\nImpeller Reynolds number: '+pretty(m.impellerReynolds)+'\nGas flow: '+pretty(m.gasVVM)+' vvm\n\n'+m.note;
  $('reactorExport').disabled=false;render();
 }catch(e){$('reactorError').textContent=e.message;$('reactorExport').disabled=true;}
}
function setFields(next){
 state=Model.validate(next);
 $('reactorName').value=state.name;$('reactorProvenance').value=state.provenance;
 for(const key of Model.numeric)$('param_'+key).value=state[key];
 recalculate();
}
$('reactorName').addEventListener('input',recalculate);
$('reactorProvenance').addEventListener('change',recalculate);
$('reactorReset').addEventListener('click',()=>setFields(Model.defaults));
$('reactorPreset3').addEventListener('click',()=>setFields(Model.defaults));
$('reactorPreset5').addEventListener('click',()=>setFields({...Model.defaults,name:'5 L stirred tank — illustrative',vessel_diameter_m:.17,liquid_height_m:.22,baffle_width_m:.015,baffle_thickness_m:.0025,baffle_clearance_m:.002,impeller_z_m:.07,impeller_diameter_m:.057,blade_height_m:.014,shaft_radius_m:.0035,feed_x_m:.022,feed_z_m:.18,gas_flow_L_min:.5}));
$('reactorExport').addEventListener('click',()=>{
 const blob=new Blob([JSON.stringify(state,null,2)+'\n'],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='reactor-configuration.json';a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
});
$('reactorImport').addEventListener('change',async e=>{
 const file=e.target.files[0];if(!file)return;
 try{if(file.size>1024*1024)throw Error('Configuration exceeds 1 MB');
  const d=JSON.parse(await file.text());setFields(d);
 }catch(err){$('reactorError').textContent='Import rejected: '+err.message;}
 e.target.value='';
});
setFields(Model.defaults);
})();