import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {geometry, jointBrace} from './geometry.js';
import './style.css';
import {analyze} from './analysis.js';
const defaults={designMode:"classic",legShape:"straight",hookLean:25,legCount:3,placement:70,layoutRotation:0,axisX:0,axisZ:0,cableOffset:1,outerCount:4,outerPlacement:100,assemblyView:"complete",cableLayout:"paired",topMass:5,payload:10,loadX:0,loadZ:0,pretension:20,cableStiffness:100,tableWidth:350,angle:45,length:190,separation:180,rotation:35,elevation:25,jointBraceAngle:90,jointBraceLength:35,jointBraces:true,cornerCables:true,plates:false,frames:true,braces:true,cables:true,lower:true,upper:true};
let state={...defaults};
try {const saved=JSON.parse(localStorage.getItem('tensegrity-v1')); for(const k in defaults) if(typeof saved?.[k]===typeof defaults[k]) state[k]=saved[k];} catch {}
if(!['complete','top','bottom'].includes(state.assemblyView))state.assemblyView='complete';
if(!['paired','adjacent','six'].includes(state.cableLayout))state.cableLayout='paired';
for(const [k,min,max] of [['topMass',0,50],['payload',0,100],['loadX',-100,100],['loadZ',-100,100],['pretension',0,200],['cableStiffness',1,1000],['jointBraceAngle',20,90],['tableWidth',100,800],['jointBraceLength',5,180],['angle',20,70],['length',50,250],['separation',100,300],['rotation',0,360],['elevation',0,90]]) state[k]=Math.min(max,Math.max(min,state[k]));
const slider=(key,label,min,max,unit)=>`<label class="slider" for="${key}"><span>${label}</span><output id="${key}-value"></output><input id="${key}" type="range" min="${min}" max="${max}" step="1" value="${state[key]}" data-unit="${unit}"></label>`;
const toggle=(key,label,color)=>`<label class="toggle"><span><i style="background:${color}"></i>${label}</span><input id="${key}" type="checkbox" ${state[key]?'checked':''}></label>`;
document.querySelector('#app').innerHTML=`<header><div class="brand">△</div><div><h1>Tensegrity <span>Studio</span></h1><p>A space to explore structure</p></div><div class="badge">PRELIMINARY STRUCTURAL CHECK</div></header><main><aside><div class="section-title">01 / Geometry <span>mm / degrees</span></div><label class="save-label" for="designMode">Design family</label><select id="designMode" class="save-field"><option value="classic">Original triangle</option><option value="custom">Custom configuration</option></select><div id="custom-controls"><label class="save-label" for="legShape">Leg shape</label><select id="legShape" class="save-field"><option value="straight">Straight</option><option value="hook">Hook · upright with inward arm</option></select>${slider('hookLean','Hook upright inward lean',0,80,'%')}${slider('legCount','Legs per assembly',2,6,'')}${slider('placement','Roots toward table edge',10,100,'%')}${slider('layoutRotation','Leg layout rotation',0,360,'°')}${slider('axisX','Tip alignment shift X',-40,40,'%')}${slider('axisZ','Tip alignment shift Z',-40,40,'%')}${slider('cableOffset','Upper tip connection offset',0,5,'')}${slider('outerCount','Outer wire count',0,8,'')}${slider('outerPlacement','Outer wire spread',10,100,'%')}<p class="hint">Custom roots follow the square perimeter at the selected spread. Tip shift moves the shared alignment in the plate plane. Offset applies to adjacent routing and wraps around the leg count. Hook lean is the fraction of horizontal reach taken by the upright (0% is vertical and can overlap the opposite upright). Hook legs have an upright and a horizontal arm; crossings are not joints. Height follows the angle and length controls below.</p></div><label class="save-label" for="cableLayout">Inner cable configuration</label><select id="cableLayout" class="save-field"><option value="paired">Matching tips · one per leg</option><option value="adjacent">Offset tips · one per leg</option><option value="six">Both neighbours · up to two per leg</option></select><p class="hint">Adjacent routing connects lower tip i to upper tip i + 1. Both-neighbour routing connects to the previous and next upper tips. Crossings are not joints; corner wires stay in place.</p>${slider('tableWidth','Table width',100,800,' mm')}<p class="hint" id="width-note"></p>${slider('angle','Reference angle',20,70,'°')}${slider('length','Reference length',50,250,' mm')}${slider('separation','Plate separation',100,300,' mm')}${slider('jointBraceLength','Joint brace length',5,180,' mm')}${slider('jointBraceAngle','Joint brace angle',20,90,'°')}<p class="hint">Open triangular joints. Each short strut joins the plate plane to the leg; angle is measured from the plate (90° is vertical). Length is limited to keep both ends attached.</p><p class="hint">Original mode uses the reference length and angle for each strut. Custom mode uses them only to set vertical rise (length × sin angle); actual leg lengths depend on placement and are shown below the model.</p><div class="section-title">02 / Layers</div>${toggle('plates','Plate surfaces','#c2baaa')}${toggle('frames','Square frames','#788998')}${toggle('braces','Planar braces','#9aa6ad')}${toggle('jointBraces','Joint brace struts','#b6a179')}${toggle('lower','Lower struts','#e88a39')}${toggle('upper','Upper struts','#43a38c')}${toggle('cables','Inner tip cables','#d8b157')}${toggle('cornerCables','Outer tension wires','#788d9b')}<div class="section-title">03 / Camera</div>${slider('rotation','Rotation',0,360,'°')}${slider('elevation','Elevation',0,90,'°')}<div class="section-title">04 / Saved designs</div><label class="save-label" for="designName">Design name</label><input id="designName" class="save-field" type="text" maxlength="80" placeholder="e.g. Wide table · angled braces"><button id="saveDesign" class="wide">Save named design</button><label class="save-label" for="savedDesigns">Saved in this browser</label><select id="savedDesigns" class="save-field"></select><button id="loadDesign" class="wide secondary">Load selected design</button><p id="saveStatus" class="hint" role="status" aria-live="polite"></p><button id="reset" class="wide">Reset design & view ↺</button><button id="export" class="wide secondary">Export geometry JSON ↓</button><p class="hint">Changes are saved in this browser.</p></aside><section class="workspace"><div class="toolbar"><div><span class="live-dot"></span> LIVE MODEL <span class="subtle">/ configurable assemblies</span></div><div class="views"><label class="assembly-label" for="theme">Theme</label><select id="theme" aria-label="Colour theme"><option value="light">Light</option><option value="dark">Dark</option><option value="system">System</option></select><label for="assemblyView" class="assembly-label">Assembly</label><select id="assemblyView" aria-label="Assembly view"><option value="complete">Complete table</option><option value="top">Top assembly</option><option value="bottom">Bottom assembly</option></select><button id="iso">3D</button><button id="top">Top</button><button id="front">Front</button><button id="fit">Fit</button></div></div><div id="viewport" aria-label="Interactive 3D tensegrity table"><div class="view-note">Drag to orbit · Scroll to zoom · Right-drag to pan</div><div class="axis-note">Y ↑ &nbsp; All dimensions in mm</div></div><div class="metrics"><div><span>Leg length / range</span><strong id="side"></strong></div><div><span>Square plate width</span><strong id="width"></strong></div><div><span>Inner cable length / range</span><strong id="cable"></strong></div><div><span>Strut vertical rise</span><strong id="rise"></strong></div></div><section class="analysis-panel" aria-label="Equilibrium and stability"><div class="analysis-heading"><div><h2>Equilibrium & stability</h2><p>Live check at the displayed pose · two rigid assemblies</p></div><span class="analysis-tag">IDEALIZED MODEL</span></div><div class="analysis-inputs">${slider('topMass','Upper assembly mass',0,50,' kg')}${slider('payload','Added payload',0,100,' kg')}${slider('pretension','Outer tension / wire',0,200,' N')}${slider('cableStiffness','Axial stiffness / cable',1,1000,' N/mm')}${slider('loadX','Payload offset X',-100,100,'%')}${slider('loadZ','Payload offset Z',-100,100,'%')}</div><p class="analysis-note">Example inputs, not measured properties. 100% offset places the load at the plate edge. Outer tension is equal in all selected outer wires. The inner tensions and cable rest lengths are recalculated for every geometry and load change: this is a retuned equilibrium check, not a load test with fixed cables.</p><div id="analysisResults" aria-live="polite"></div><details><summary>Model assumptions & method</summary><p>The bottom assembly is fixed to ground. Frames, plates, joints and struts are perfectly rigid; upper assembly mass is concentrated at the top-plate centre. Payload is a downward point load on the top-plate plane. All selected inner cables and selected outer wires are axial springs carrying tension only. Axial stiffness means force per cable extension, not material elastic modulus.</p><p>A nonnegative least-squares solver enforces all three force and three moment equations for the chosen equal corner tensions. If tensions are redundant, it chooses the feasible solution with smallest summed squared inner tensions; it does not optimize stability. Rest length = current length − tension / stiffness. A 6 × 6 tangent stiffness matrix includes elastic and prestress effects, rigid-body rotation curvature and gravity. Positive eigenvalues establish only local small-motion stability in this model. Rotations are scaled by half table width; eigenvalues are in N/mm, not vibration frequencies. Untensioned cables are reported as marginal.</p><p>Assembly views and visibility toggles only hide geometry; all members and the selected cable configuration remain in the analysis. Leg shape and brace dimensions do not affect this rigid-body result when cable attachment points are unchanged. Hook bending and joint stresses are not assessed. No member bending, buckling, joint strength, cable strength, base tipping/sliding, collision or finite-motion collapse is checked. A stable result is not a safe working-load rating.</p><p>Method: <a href="https://www.sciencedirect.com/science/article/pii/S0020740325009725" target="_blank" rel="noreferrer">Rigid-body tensegrity equilibrium and energy-Hessian stability</a>.</p></details></section><footer><p id="status"></p><p id="member-count"></p><span id="inner-count" hidden></span><p>The viewer shows the undeformed design. Preliminary rigid-body equilibrium and stability results are shown above; member strength is not assessed. Flat braces extend from each reinforced joint to the square perimeter frame. Outer wires connect matching points on the plates; inset anchors require attachment to a rigid plate or additional supporting members.</p></footer></section></main>`;
const viewport=document.querySelector('#viewport');
const scene=new THREE.Scene(); scene.background=new THREE.Color('#eef1ed');
const camera=new THREE.OrthographicCamera(-350,350,350,-350,0.1,10000);
const renderer=new THREE.WebGLRenderer({antialias:true}); renderer.setPixelRatio(Math.min(devicePixelRatio,2)); viewport.appendChild(renderer.domElement);
renderer.outputColorSpace=THREE.SRGBColorSpace;
const controls=new OrbitControls(camera,renderer.domElement); controls.enableDamping=true; controls.minZoom=0.2; controls.maxZoom=8;
scene.add(new THREE.HemisphereLight(0xffffff,0x64716a,2.6)); const sun=new THREE.DirectionalLight(0xffffff,2.5); sun.position.set(300,600,250); scene.add(sun);
const grid=new THREE.GridHelper(1200,24,0xc2cbc5,0xdde3dd); grid.position.y=-12; scene.add(grid);
const model=new THREE.Group();scene.add(model);
const mats=Object.fromEntries(Object.entries({cornerCables:0x718b9c,jointBraces:0xb6a179,frames:0x637989,braces:0x9aa8ae,lower:0xe58232,upper:0x329b80,cables:0xb28a30,plates:0xd2caba}).map(([k,color])=>[k,new THREE.MeshStandardMaterial({color,roughness:0.58,metalness:k==='plates'?0:0.25})]));
// Appearance is saved independently of designs and camera settings.
const themeSelect=document.querySelector('#theme');
const systemTheme=window.matchMedia('(prefers-color-scheme: dark)');
let theme='light';
try{const saved=localStorage.getItem('tensegrity-theme');if(['light','dark','system'].includes(saved))theme=saved;}catch{}
function applyTheme(){
 const dark=theme==='dark'||(theme==='system'&&systemTheme.matches);
 document.documentElement.dataset.theme=dark?'dark':'light';
 themeSelect.value=theme;
 scene.background.set(dark?'#151e1b':'#eef1ed');
 grid.material.color.set(dark?0x35483f:0xffffff);
 mats.frames.color.set(dark?0x96aebe:0x637989);
 mats.braces.color.set(dark?0xb7c5cb:0x9aa8ae);
}
themeSelect.addEventListener('change',()=>{theme=themeSelect.value;applyTheme();try{localStorage.setItem('tensegrity-theme',theme);}catch{}});
systemTheme.addEventListener('change',()=>{if(theme==='system')applyTheme();});
applyTheme();
function bar(a,b,r,key,square=false){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start); if(delta.length()<1e-7)return; const mesh=new THREE.Mesh(square?new THREE.BoxGeometry(r*2,delta.length(),r*2):new THREE.CylinderGeometry(r,r,delta.length(),16),mats[key]); mesh.position.copy(start.add(end).multiplyScalar(0.5));mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());mesh.visible=state[key];mesh.userData.assembly=assemblyLayer;model.add(mesh);}
// The existing flat and inclined members form two sides; this strut closes the triangle.
function addJointBrace(points){
 const brace=jointBrace(points,state.jointBraceLength,state.jointBraceAngle);
 if(state.designMode==='custom')bar(points[0],brace.start,3,'braces');
 bar(brace.start,brace.end,2.5,'jointBraces');
 return brace;
}
let data,analysisResult;
let assemblyLayer="bottom";
function rebuild(){for(const child of [...model.children]) {child.geometry.dispose();model.remove(child);} data=geometry(state);
 document.querySelector('#custom-controls').hidden=state.designMode!=='custom';
 document.querySelector('#member-count').textContent=`${data.pairs.length*2} legs · ${data.innerCables.length} inner cables · ${data.cornerCables.length} outer wires`;
 const widthInput=document.querySelector('#tableWidth');
 widthInput.min=Math.ceil(data.minWidth);
 state.tableWidth=Math.max(state.tableWidth,Number(widthInput.min));
 data=geometry(state);
 const braceInput=document.querySelector('#jointBraceLength');
 braceInput.max=Math.max(5,Math.min(180,Math.floor(jointBrace(data.pairs[0].lowerPath.slice(0,2),180,state.jointBraceAngle).maxLength)));
 state.jointBraceLength=Math.min(state.jointBraceLength,Number(braceInput.max));
 sync();
 document.querySelector('#width-note').textContent=`Minimum ${widthInput.min} mm for the selected design family.`;
 const w=data.width/2;
 for(const y of [0,state.separation]) {assemblyLayer=y===0?"bottom":"top";const corners=[[-w,y,-w],[w,y,-w],[w,y,w],[-w,y,w]]; corners.forEach((a,i)=>bar(a,corners[(i+1)%4],4,'frames',true));data.vertices.forEach((a,i)=>{const b=data.vertices[(i+1)%data.vertices.length];bar([a[0],y,a[2]],[b[0],y,b[2]],3,'braces',true);});const plate=new THREE.Mesh(new THREE.BoxGeometry(data.width,5,data.width),mats.plates);plate.position.y=y+(y===0?-7:7);plate.visible=state.plates;plate.userData.assembly=assemblyLayer;model.add(plate);}
 assemblyLayer="cables";
 data.innerCables.forEach(c=>bar(c.start,c.end,1.3,'cables'));
 document.querySelector('#inner-count').textContent=data.innerCables.length;
 data.cornerCables.forEach(e=>bar(e.start,e.end,1.1,'cornerCables'));
 data.extensions.forEach(e=>{assemblyLayer=e.layer==='lower'?'bottom':'top';bar(e.start,e.end,3,'braces',true);});
 data.jointBraces=[];
 data.pairs.forEach(p=>{
  for(const [key,points] of [['lower',p.lower],['upper',p.upper]]){
   assemblyLayer=key==='lower'?'bottom':'top';
   const path=p[key+'Path'];
   data.jointBraces.push(addJointBrace(path.slice(0,2)));
   path.slice(1).forEach((point,i)=>bar(path[i],point,4,key));
   for(const point of path){const joint=new THREE.Mesh(new THREE.SphereGeometry(5.5,16,10),mats[key]);joint.position.set(...point);joint.visible=state[key];joint.userData.assembly=assemblyLayer;model.add(joint);}
  }
 });
 if(state.assemblyView!=='complete'){
  for(const child of model.children){child.visible=child.visible&&child.userData.assembly===state.assemblyView;if(state.assemblyView==='top')child.position.y-=state.separation;}
 }
 grid.position.y=state.assemblyView==='top'?-data.rise-12:-12;
 document.querySelector('.view-note').textContent=state.assemblyView==='complete'?'Drag to orbit · Scroll to zoom · Right-drag to pan':`${state.assemblyView==='top'?'Top':'Bottom'} assembly isolated · connecting cables hidden · drag to inspect`;
 const range=values=>{const lo=Math.min(...values),hi=Math.max(...values);return Math.abs(hi-lo)<.05?lo.toFixed(1):`${lo.toFixed(1)}–${hi.toFixed(1)}`;};
 const legLengths=data.pairs.flatMap(p=>['lowerPath','upperPath'].map(k=>p[k].slice(1).reduce((sum,v,i)=>sum+Math.hypot(...v.map((x,j)=>x-p[k][i][j])),0)));
 for(const key of ['side','width','cable','rise'])document.querySelector('#'+key).innerHTML=`${key==='side'?range(legLengths):key==='cable'?range(data.innerCables.map(c=>c.length)):data[key].toFixed(1)} <small>mm</small>`;
 document.querySelector('#status').textContent=data.rise>state.separation?'Strut tips extend beyond the opposite plate plane.':data.cable<0.1?'Tip pairs coincide — cables have zero length.':data.signedGap<0?`Overlapping tips: lower tips sit above upper tips. ${data.innerCables.length} inner cables in the selected routing.`:'Separated tips: lower tips sit below upper tips.';
 updateAnalysis();resizeView();save();}

function updateAnalysis(){
 analysisResult=analyze(data,state);
 const a=analysisResult;
 const titles={stable:'Locally stable · ideal model',unstable:'Unstable · ideal model',marginal:'Marginal / not established','not-feasible':'No feasible equilibrium for these assumptions'};
 const fmt=(v,d=2)=>Number.isFinite(v)?v.toFixed(d):'—';
 document.querySelector('#analysisResults').innerHTML=`<div class="analysis-verdict ${a.status}"><strong>${titles[a.status]}</strong><p>${a.reason}</p></div><div class="analysis-stats"><div>Supported weight<strong>${fmt(a.weight)} N</strong></div><div>Force residual<strong>${fmt(a.forceResidual,6)} N</strong></div><div>Moment residual<strong>${fmt(a.momentResidual,6)} N·m</strong></div><div>Weakest stiffness mode<strong>${fmt(a.modes?.[0],4)} N/mm</strong></div></div>${a.lateral?`<p class="analysis-note">Small-motion compliance under a 1 N horizontal probe, allowing all six motions: X ${fmt(a.lateral.x,3)} mm/N · Z ${fmt(a.lateral.z,3)} mm/N. This is a linear estimate near equilibrium.</p>`:''}${a.cables?`<div class="analysis-table"><table><thead><tr><th>Cable</th><th>Required tension (N)</th><th>Length (mm)</th><th>Rest length (mm)</th></tr></thead><tbody>${a.cables.map(c=>`<tr><td>${c.name}</td><td>${fmt(c.tension)}</td><td>${fmt(c.length)}</td><td>${fmt(c.restLength)}</td></tr>`).join('')}</tbody></table></div>`:''}${a.modes?`<details><summary>All six stiffness modes</summary><p>${a.modes.map(v=>fmt(v,5)).join(' · ')} N/mm</p></details>`:''}`;
}

function save(){try{localStorage.setItem('tensegrity-v1',JSON.stringify(state));}catch{}}
function cameraView(fit=false){const centreY=state.assemblyView==='top'?-data.rise/2:state.assemblyView==='bottom'?data.rise/2:state.separation/2;controls.target.set(0,centreY,0);const az=state.rotation*Math.PI/180,el=Math.min(89.999,state.elevation)*Math.PI/180;camera.position.set(1000*Math.sin(az)*Math.cos(el),centreY+1000*Math.sin(el),1000*Math.cos(az)*Math.cos(el));camera.up.set(0,1,0);if(fit)camera.zoom=1;camera.lookAt(controls.target);camera.updateProjectionMatrix();controls.update();}
function sync(){for(const key in defaults){const el=document.getElementById(key);if(el.type==='range'){el.value=state[key];document.getElementById(key+'-value').textContent=Math.round(state[key])+el.dataset.unit;}else if(el.tagName==='SELECT')el.value=state[key];else el.checked=state[key];}}
for(const key in defaults)document.getElementById(key).addEventListener('input',e=>{state[key]=e.target.type==='checkbox'?e.target.checked:e.target.tagName==='SELECT'?e.target.value:Number(e.target.value);sync();if(['rotation','elevation'].includes(key)){cameraView();save();}else {rebuild();if(key==='assemblyView')cameraView(true);}});
controls.addEventListener('change',()=>{const offset=camera.position.clone().sub(controls.target);state.rotation=(Math.atan2(offset.x,offset.z)*180/Math.PI+360)%360;state.elevation=Math.asin(offset.y/offset.length())*180/Math.PI;sync();save();});controls.maxPolarAngle=Math.PI/2;
for(const [id,rotation,elevation] of [['iso',35,25],['top',0,90],['front',0,0]])document.getElementById(id).onclick=()=>{state.rotation=rotation;state.elevation=elevation;cameraView(true);sync();};
document.querySelector('#fit').onclick=()=>cameraView(true);
document.querySelector('#reset').onclick=()=>{state={...defaults};rebuild();cameraView(true);sync();};
document.querySelector('#export').onclick=()=>{const blob=new Blob([JSON.stringify({units:'mm',angleReference:'horizontal',physicsModel:"rigid-body-static-local-stability",parameters:state,geometry:data,analysis:analysisResult},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='tensegrity-design.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
function resizeView(){const w=viewport.clientWidth,h=viewport.clientHeight;const half=Math.max(360,(data?.width??350)*0.82, (data?.width??350)*0.82*h/w);camera.left=-half*w/h;camera.right=half*w/h;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();renderer.setSize(w,h);}
new ResizeObserver(resizeView).observe(viewport);
sync();rebuild();cameraView(true);renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera);});

// Named snapshots are separate from the automatic working-copy save.
const libraryKey='tensegrity-design-library-v1';
const nameInput=document.querySelector('#designName');
const savedSelect=document.querySelector('#savedDesigns');
const saveStatus=document.querySelector('#saveStatus');
function readLibrary(){
 const parsed=JSON.parse(localStorage.getItem(libraryKey)||'[]');
 if(!Array.isArray(parsed)) throw new Error('Invalid saved library');
 return parsed.filter(d=>d && typeof d.name==='string' && d.parameters && typeof d.parameters==='object');
}
function refreshLibrary(selected){
 const library=readLibrary();savedSelect.replaceChildren();
 if(!library.length){const option=document.createElement('option');option.textContent='No saved designs yet';option.value='';savedSelect.append(option);}
 library.forEach(d=>{const option=document.createElement('option');option.value=d.name;option.textContent=d.name;savedSelect.append(option);});
 if(selected) savedSelect.value=selected;
 document.querySelector('#loadDesign').disabled=!library.length;
 return library;
}
document.querySelector('#saveDesign').onclick=()=>{
 const name=nameInput.value.trim();
 if(!name){saveStatus.textContent='Enter a name for this design.';nameInput.focus();return;}
 try{
 const library=readLibrary(),index=library.findIndex(d=>d.name===name);
 const snapshot={name,savedAt:new Date().toISOString(),parameters:{...state},camera:{position:camera.position.toArray(),target:controls.target.toArray(),zoom:camera.zoom}};
 if(index<0)library.push(snapshot);else library[index]=snapshot;
 localStorage.setItem(libraryKey,JSON.stringify(library));refreshLibrary(name);
 saveStatus.textContent=`${index<0?'Saved':'Updated'} “${name}”. Saving this name again updates it.`;
 }catch{saveStatus.textContent='Could not save in this browser. Export JSON to keep a file backup.';}
};
document.querySelector('#loadDesign').onclick=()=>{
 try{
 const entry=readLibrary().find(d=>d.name===savedSelect.value);if(!entry)return;
 const next={...defaults};for(const key in defaults){const value=entry.parameters[key];if(typeof value===typeof defaults[key]&&(typeof value!=='number'||Number.isFinite(value)))next[key]=value;}
 state=next;rebuild();cameraView(true);
 const view=entry.camera;
 if(view && [view.position,view.target].every(v=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite)) && Number.isFinite(view.zoom)&&view.zoom>0){camera.position.fromArray(view.position);controls.target.fromArray(view.target);camera.zoom=Math.min(8,Math.max(.2,view.zoom));camera.updateProjectionMatrix();controls.update();}
 sync();save();nameInput.value=entry.name;saveStatus.textContent=`Loaded “${entry.name}”.`;
 }catch{saveStatus.textContent='Could not load this saved design.';}
};
try{refreshLibrary();}catch{saveStatus.textContent='Saved designs are unavailable in this browser. You can still export JSON.';}
