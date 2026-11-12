import assert from 'node:assert/strict';
import {geometry} from './geometry.js';
import {analyze,eigenvalues} from './analysis.js';
const s={angle:45,length:190,separation:180,tableWidth:500,topMass:5,payload:10,loadX:0,loadZ:0,pretension:20,cableStiffness:100};
const near=(a,b,t=1e-7)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const g=geometry(s),a=analyze(g,s);
assert.equal(a.status,'stable');near(a.cables[0].tension,(15*9.81+80)/3);near(a.forceResidual,0);near(a.momentResidual,0);
near(a.stiffness[1][1],700);
near(a.stiffness[0][0],3*a.cables[0].tension/g.cable+80/s.separation);
assert.equal(analyze(geometry({...s,length:50}),{...s,length:50}).status,'not-feasible');
assert.equal(analyze(g,{...s,loadX:100,pretension:0}).status,'not-feasible');
assert.equal(analyze(g,{...s,pretension:0}).status,'marginal');
assert.equal(analyze(g,{...s,cableStiffness:.01}).status,'not-feasible');
const offset=analyze(g,{...s,loadX:10,loadZ:5});near(offset.forceResidual,0);near(offset.momentResidual,0);
const eig=eigenvalues([[2,1,0],[1,2,0],[0,0,-2]]);near(eig[0],-2);near(eig[1],1);near(eig[2],3);
// Independent finite-difference energy check of all Hessian entries, including rigid rotation curvature.
function energy(q,result=a,settings=s){const a=result,s=settings;const R=a.scale,w=q.slice(3).map(v=>v/R),theta=Math.hypot(...w);const cross=(u,v)=>[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];function transform(p){const r=[p[0],p[1]-s.separation,p[2]],wx=cross(w,r),wwx=cross(w,wx),sinc=theta?Math.sin(theta)/theta:1,cosc=theta?(1-Math.cos(theta))/theta**2:.5;return r.map((v,i)=>v+sinc*wx[i]+cosc*wwx[i]+q[i]+(i===1?s.separation:0));}let E=15*9.81*transform([0,s.separation,0])[1];for(const c of a.cables){const b=transform(c.b),l=Math.hypot(...b.map((v,i)=>v-c.a[i]));E+=.5*s.cableStiffness*Math.max(0,l-c.restLength)**2;}return E;}
const zero=Array(6).fill(0),h=.001,E=energy(zero);
for(let i=0;i<6;i++)for(let j=0;j<6;j++){let numerical;if(i===j){const p=[...zero],m=[...zero];p[i]=h;m[i]=-h;numerical=(energy(p)-2*E+energy(m))/h**2;}else{const pp=[...zero],pm=[...zero],mp=[...zero],mm=[...zero];pp[i]=pp[j]=h;pm[i]=h;pm[j]=-h;mp[i]=-h;mp[j]=h;mm[i]=mm[j]=-h;numerical=(energy(pp)-energy(pm)-energy(mp)+energy(mm))/(4*h*h);}near(numerical,a.stiffness[i][j],.002);}
console.log('Statics, failure cases, eigensolver and full energy Hessian verified. Default:',a.status,a.modes);

const sixSettings={...s,cableLayout:'six'},sixGeometry=geometry(sixSettings),six=analyze(sixGeometry,sixSettings);
assert.equal(six.status,'stable');assert.equal(six.cables.length,10);
near(six.cables[0].tension,(s.topMass+s.payload)*9.81/6*sixGeometry.innerCables[0].length/g.cable+4*s.pretension/6*sixGeometry.innerCables[0].length/g.cable,1e-6);
const cyclic=analyze(geometry({...s,cableLayout:'adjacent'}),s);
assert.equal(cyclic.status,'not-feasible');assert.ok(cyclic.momentResidual>1);
for(let i=0;i<6;i++)for(let j=0;j<6;j++){
 let numerical;const E=energy(zero,six,sixSettings);
 if(i===j){const p=[...zero],m=[...zero];p[i]=h;m[i]=-h;numerical=(energy(p,six,sixSettings)-2*E+energy(m,six,sixSettings))/h**2;}
 else{const pp=[...zero],pm=[...zero],mp=[...zero],mm=[...zero];pp[i]=pp[j]=h;pm[i]=h;pm[j]=-h;mp[i]=-h;mp[j]=h;mm[i]=mm[j]=-h;numerical=(energy(pp,six,sixSettings)-energy(pm,six,sixSettings)-energy(mp,six,sixSettings)+energy(mm,six,sixSettings))/(4*h*h);}
 near(numerical,six.stiffness[i][j],.002);
}
console.log('Inclined six-cable Hessian and adjacent-cable torque failure verified.');

// Generalized layouts: variable leg count, hook geometry, and asymmetric outer wires.
for(const legCount of [2,3,4,5,6])for(const outerCount of [0,1,3,8]){
 const settings={...s,designMode:'custom',legShape:'hook',legCount,placement:100,layoutRotation:31,axisX:10,axisZ:-5,outerCount,outerPlacement:80,cableLayout:'paired'};
 const shape=geometry(settings),result=analyze(shape,settings);
 assert.equal(shape.pairs.length,legCount);assert.equal(shape.cornerCables.length,outerCount);
 for(const p of shape.pairs)for(const key of ['lower','upper']){
  assert.equal(p[key+'Path'].length,3);
  assert.deepEqual(p[key+'Path'][2],p[key][1]);
  for(const v of p[key+'Path'].flat())assert.ok(Number.isFinite(v));
 }
 if(result.status==='stable'||result.status==='marginal'){
  near(result.forceResidual,0,1e-5);near(result.momentResidual,0,1e-5);
 }
}
const customSix={...s,designMode:'custom',legCount:6,cableLayout:'six'};
assert.equal(geometry(customSix).innerCables.length,12);
assert.equal(analyze(geometry(customSix),customSix).status,'stable');
console.log('Custom leg layouts and variable outer-wire forces/moments verified.');
