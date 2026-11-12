// Coordinates and dimensions in millimetres; Y is vertical. Angle is from horizontal.
export function geometry({angle, length, separation, tableWidth=350, cableLayout="paired", designMode="classic", legCount=3, legShape="straight", hookLean=25, placement=70, layoutRotation=0, axisX=0, axisZ=0, cableOffset=1, outerCount=4, outerPlacement=100}) {
  const rise = length * Math.sin(angle * Math.PI / 180);
  const side = 2 * length * Math.cos(angle * Math.PI / 180);
  const radius = side / Math.sqrt(3);
  const n=designMode==="custom"?Math.round(Math.max(2,Math.min(6,legCount))):3;
  const vertices = Array.from({length:3}, (_,i) => [radius*Math.sin(i*2*Math.PI/3), 0, -radius*Math.cos(i*2*Math.PI/3)]);
  if(designMode==='custom'){
    vertices.length=0;
    for(let i=0;i<n;i++){
      const t=i*2*Math.PI/n+layoutRotation*Math.PI/180,dx=Math.sin(t),dz=-Math.cos(t);
      const r=tableWidth/2*placement/100/Math.max(Math.abs(dx),Math.abs(dz));
      vertices.push([r*dx,0,r*dz]);
    }
  }
  const pairs = vertices.map((a,i) => {
    const b = vertices[(i+1)%n];
    const midpoint = [(a[0]+b[0])/2+(designMode==='custom'?axisX*tableWidth/200:0),0,(a[2]+b[2])/2+(designMode==='custom'?axisZ*tableWidth/200:0)];
    return {lower:[a,[midpoint[0],rise,midpoint[2]]], upper:[[b[0],separation,b[2]],[midpoint[0],separation-rise,midpoint[2]]]};
  });
  const offsets=cableLayout==='six'?[...new Set([1,n-1])]:cableLayout==='adjacent'?[designMode==='custom'?Math.round(cableOffset)%n:1]:[0];
  const innerCables=pairs.flatMap((p,i)=>offsets.map(offset=>{
    const j=(i+offset)%n,start=p.lower[1],end=pairs[j].upper[1];
    return {start,end,lower:i+1,upper:j+1,length:Math.hypot(...end.map((v,k)=>v-start[k]))};
  }));
  const minWidth=designMode==='custom'?100:2*radius+40;
  const width=Math.max(tableWidth,minWidth);
  // Continue the brace backwards from each strut root to the square centreline.
  const extensions=pairs.flatMap(pair => ['lower','upper'].map(layer => {
    const [root,tip]=pair[layer];
    const dx=root[0]-tip[0], dz=root[2]-tip[2], half=width/2;
    const tx=Math.abs(dx)<1e-10?Infinity:((dx>0?half:-half)-root[0])/dx;
    const tz=Math.abs(dz)<1e-10?Infinity:((dz>0?half:-half)-root[2])/dz;
    const candidate=Math.min(tx,tz);
    const t=Number.isFinite(candidate)?candidate:0;
    return {layer,start:[...root],end:[root[0]+t*dx,root[1],root[2]+t*dz]};
  }));
  const half=width/2;
  let cornerCables=[[-half,-half],[half,-half],[half,half],[-half,half]].map(([x,z])=>({start:[x,0,z],end:[x,separation,z],length:separation}));
  if(designMode==='custom'){
    const corners=[[-half,-half],[half,-half],[half,half],[-half,half]];
    cornerCables=Array.from({length:Math.round(outerCount)},(_,i)=>{
      const t=i*4/outerCount,k=Math.floor(t),f=t-k,a=corners[k],b=corners[(k+1)%4];
      const x=(a[0]+f*(b[0]-a[0]))*outerPlacement/100,z=(a[1]+f*(b[1]-a[1]))*outerPlacement/100;
      return {start:[x,0,z],end:[x,separation,z],length:separation};
    });
  }
  for(const p of pairs)for(const key of ['lower','upper']){
    const [root,tip]=p[key];
    p[key+'Path']=designMode==='custom'&&legShape==='hook'?[root,[root[0]+(tip[0]-root[0])*hookLean/100,tip[1],root[2]+(tip[2]-root[2])*hookLean/100],tip]:[root,tip];
  }
  return {vertices,pairs,extensions,cornerCables,innerCables,cableLayout,rise,side,width,minWidth,cable:Math.abs(separation-2*rise),signedGap:separation-2*rise};
}

// Actual brace centreline length and acute angle from the plate plane.
export function jointBrace([root,tip],requestedLength,angle=90) {
  const rise=Math.abs(tip[1]-root[1]);
  const run=Math.hypot(tip[0]-root[0],tip[2]-root[2]);
  if(rise<1e-8||run<1e-8)return {start:[...root],end:[...root],length:0,angle,maxLength:0,diameter:5};
  const radians=angle*Math.PI/180, sin=Math.sin(radians), cos=Math.cos(radians);
  // Keep the upper attachment before the tip and the foot on the triangle side.
  const maxLength=Math.min(rise*0.8/sin,2*run/(sin*run/rise+cos));
  const length=Math.min(requestedLength,maxLength);
  const fraction=length*sin/rise;
  const end=root.map((v,i)=>v+(tip[i]-v)*fraction);
  const start=[end[0]+length*cos*(tip[0]-root[0])/run,root[1],end[2]+length*cos*(tip[2]-root[2])/run];
  return {start,end,length,angle,maxLength,diameter:5};
}
