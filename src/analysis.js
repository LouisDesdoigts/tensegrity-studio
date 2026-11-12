// Preliminary rigid-body statics. Units: mm, N, kg. Bottom assembly fixed.
// Rotations are scaled by half table width so all generalized coordinates are mm.
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const axes=[[1,0,0],[0,1,0],[0,0,1]];
export function solve(A,b){
 const m=A.map((row,i)=>[...row,b[i]]),n=b.length;
 for(let i=0;i<n;i++){
  let p=i;for(let j=i+1;j<n;j++)if(Math.abs(m[j][i])>Math.abs(m[p][i]))p=j;
  if(Math.abs(m[p][i])<1e-12)return null;
  [m[i],m[p]]=[m[p],m[i]];const d=m[i][i];for(let j=i;j<=n;j++)m[i][j]/=d;
  for(let k=0;k<n;k++)if(k!==i){const f=m[k][i];for(let j=i;j<=n;j++)m[k][j]-=f*m[i][j];}
 }return m.map(row=>row[n]);
}
export function eigenvalues(matrix){
 const a=matrix.map(r=>[...r]),n=a.length;
 for(let step=0;step<300;step++){
  let p=0,q=1;for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)if(Math.abs(a[i][j])>Math.abs(a[p][q])){p=i;q=j;}
  if(Math.abs(a[p][q])<1e-11)break;
  const phi=.5*Math.atan2(2*a[p][q],a[q][q]-a[p][p]),c=Math.cos(phi),s=Math.sin(phi);
  const app=a[p][p],aqq=a[q][q],apq=a[p][q];
  for(let i=0;i<n;i++)if(i!==p&&i!==q){const x=a[i][p],y=a[i][q];a[i][p]=a[p][i]=c*x-s*y;a[i][q]=a[q][i]=s*x+c*y;}
  a[p][p]=c*c*app-2*c*s*apq+s*s*aqq;a[q][q]=s*s*app+2*c*s*apq+c*c*aqq;a[p][q]=a[q][p]=0;
 }return a.map((r,i)=>r[i]).sort((a,b)=>a-b);
}
// Exhaustive active-set nonnegative least squares (at most twelve inner cables).
// Tiny ridge resolves redundant cable forces; every candidate is checked against all 6 equations.
export function balanceTensions(columns,target){
 const n=columns.length;let best=null,closest=null;
 for(let mask=0;mask<(1<<n);mask++){
  const active=Array.from({length:n},(_,i)=>i).filter(i=>mask&(1<<i));
  const gram=active.map(i=>active.map(j=>dot(columns[i],columns[j])+(i===j?1e-10:0)));
  const values=active.length?solve(gram,active.map(i=>dot(columns[i],target))):[];
  if(!values||values.some(v=>v< -1e-7))continue;
  const tensions=Array(n).fill(0);active.forEach((i,k)=>tensions[i]=Math.max(0,values[k]));
  const residual=target.map((v,k)=>columns.reduce((sum,c,i)=>sum+c[k]*tensions[i],-v));
  const error=Math.hypot(...residual),norm=dot(tensions,tensions),candidate={tensions,residual,error,norm};
  if(!closest||error<closest.error)closest=candidate;
  if(error<1e-5&&(!best||norm<best.norm))best=candidate;
 }
 return {feasible:!!best,...(best||closest)};
}
function rotationSecond(r,i,j,R){const a=cross(axes[i],cross(axes[j],r)),b=cross(axes[j],cross(axes[i],r));return a.map((v,k)=>(v+b[k])/(2*R*R));}
export function analyze(g,s){
 const weight=(s.topMass+s.payload)*9.81,load=s.payload*9.81;
 const R=g.width/2,x=s.loadX/100*R,z=s.loadZ/100*R;
 const base={weight,scale:R,loadPosition:[x,0,z],assumption:'Rigid assemblies; fixed base; cables retuned for every selected load and geometry.'};
 const fail=(reason)=>({...base,status:'not-feasible',reason});
 if(![weight,s.pretension,s.cableStiffness,x,z].every(Number.isFinite)||s.cableStiffness<=0||s.pretension<0||s.topMass<0||s.payload<0)return fail('Invalid load or cable inputs.');
 if(g.cable<.1)return fail('Inner cable tips coincide or are too close for this check.');
 if(g.signedGap>=0)return fail('Inner cables pull downward in this pose. They cannot support a downward load with tension alone.');
 if(g.rise>=s.separation)return fail('Strut tips reach or pass the opposite plate plane. Resolve this geometry before assessment.');
 const routes=g.innerCables;
 const columns=routes.map(c=>{
  const direction=c.start.map((v,i)=>(v-c.end[i])/c.length);
  const r=[c.end[0],c.end[1]-s.separation,c.end[2]];
  return [...direction,...cross(r,direction).map(v=>v/R)];
 });
 const target=[0,weight,0,-load*z/R,0,load*x/R];
 for(const c of g.cornerCables){
   const force=c.start.map((v,i)=>(v-c.end[i])/c.length*s.pretension);
   const moment=cross([c.end[0],c.end[1]-s.separation,c.end[2]],force);
   for(let i=0;i<3;i++){target[i]-=force[i];target[i+3]-=moment[i]/R;}
 }
 const balance=balanceTensions(columns,target);
 if(!balance.feasible)return {...fail('No nonnegative inner-cable tensions balance all three forces and all three moments at this pose with the selected equal corner tensions. Inclined routing can leave an unbalanced twist.'),forceResidual:Math.hypot(...balance.residual.slice(0,3)),momentResidual:Math.hypot(...balance.residual.slice(3))*R/1000};
 const cables=[...routes.map((c,i)=>({name:`Inner L${c.lower} → U${c.upper}`,a:c.start,b:c.end,tension:balance.tensions[i]})),...g.cornerCables.map((c,i)=>({name:`Corner ${i+1}`,a:c.start,b:c.end,tension:s.pretension}))];
 cables.forEach(c=>{c.length=Math.hypot(...c.b.map((v,i)=>v-c.a[i]));c.restLength=c.length-c.tension/s.cableStiffness;});
 if(cables.some(c=>c.restLength<=0))return {...fail('Required extension exceeds cable length at this stiffness. Increase stiffness or reduce load / tension.'),cables};
 const K=Array.from({length:6},()=>Array(6).fill(0));
 const residual=[0,-weight,0,load*z,0,-load*x];
 for(const c of cables){
  const n=c.b.map((v,i)=>(v-c.a[i])/c.length),r=[c.b[0],c.b[1]-s.separation,c.b[2]];
  const gradient=n.map(v=>v*c.tension),force=gradient.map(v=>-v),moment=cross(r,force);
  for(let i=0;i<3;i++){residual[i]+=force[i];residual[i+3]+=moment[i];}
  const J=[...axes,...axes.map(a=>cross(a,r).map(v=>v/R))];
  for(let i=0;i<6;i++)for(let j=0;j<6;j++){
   K[i][j]+=s.cableStiffness*dot(J[i],n)*dot(J[j],n)+c.tension/c.length*(dot(J[i],J[j])-dot(J[i],n)*dot(J[j],n));
   if(i>=3&&j>=3)K[i][j]+=dot(gradient,rotationSecond(r,i-3,j-3,R));
  }
 }
 // Dead gravity load is attached to a point on the upper plate; assembly COM at its centre.
 for(let i=0;i<3;i++)for(let j=0;j<3;j++)K[i+3][j+3]+=load*rotationSecond([x,0,z],i,j,R)[1];
 const modes=eigenvalues(K),tol=Math.max(1e-7,Math.max(...modes.map(Math.abs))*1e-8);
 const forceResidual=Math.hypot(...residual.slice(0,3)),momentResidual=Math.hypot(...residual.slice(3))/1000;
 const slack=cables.some(c=>c.tension<1e-6);
 const status=forceResidual>1e-5||momentResidual>1e-5?'not-feasible':modes[0]<-tol?'unstable':slack||modes[0]<=tol?'marginal':'stable';
 const reasons={stable:'All six small-motion stiffness modes are positive for this idealized, retuned equilibrium.',unstable:'A negative stiffness mode exists: a small combined translation / rotation lowers potential energy.',marginal:'A cable is untensioned or a stiffness mode is near zero. This check does not establish stability.','not-feasible':'Force or moment residual exceeds the equilibrium tolerance.'};
 // Relaxed response to a small horizontal 1 N probe (not a finite-load simulation).
 let lateral=null;
 if(status==='stable'){const dx=solve(K,[1,0,0,0,0,0]),dz=solve(K,[0,0,1,0,0,0]);lateral={x:dx[0],z:dz[2]};}
 return {...base,status,reason:reasons[status],cables,forceResidual,momentResidual,modes,stiffness:K,lateral};
}
