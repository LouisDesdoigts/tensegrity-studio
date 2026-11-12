import assert from 'node:assert/strict';
import {geometry,jointBrace} from './geometry.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
for(const angle of [20,45,70])for(const length of [50,190,250])for(const separation of [100,180,300]){
 const g=geometry({angle,length,separation});
 assert.equal(g.pairs.length,3);
 assert.equal(g.cornerCables.length,4);
 assert.equal(new Set(g.cornerCables.map(c=>JSON.stringify(c.start))).size,4);
 for(const c of g.cornerCables){near(c.start[0],c.end[0]);near(c.start[2],c.end[2]);near(Math.abs(c.start[0]),g.width/2);near(Math.abs(c.start[2]),g.width/2);near(c.start[1],0);near(c.end[1],separation);near(c.length,separation);}

 assert.equal(g.extensions.length,6);
 for(const e of g.extensions){
   near(e.start[1],e.end[1]);
   near(Math.max(Math.abs(e.end[0]),Math.abs(e.end[2])),g.width/2);
   const pair=g.pairs.find(p=>p[e.layer][0].every((v,i)=>v===e.start[i]));
   const tip=pair[e.layer][1];
   const dx=e.end[0]-e.start[0],dz=e.end[2]-e.start[2];
   near(dx*(tip[2]-e.start[2])-dz*(tip[0]-e.start[0]),0);
   assert.ok(dx*(tip[0]-e.start[0])+dz*(tip[2]-e.start[2])<0);
 }
 for(const p of g.pairs){for(const ends of [p.lower,p.upper])near(Math.hypot(...ends[0].map((x,i)=>x-ends[1][i])),length);near(p.lower[1][0],p.upper[1][0]);near(p.lower[1][2],p.upper[1][2]);near(Math.abs(p.lower[1][1]-p.upper[1][1]),g.cable);}
 for(let i=0;i<3;i++)near(Math.hypot(...g.vertices[i].map((x,j)=>x-g.vertices[(i+1)%3][j])),g.side);
}
near(geometry({angle:45,length:190,separation:180}).side,268.70057685088807);
console.log('81 configurations verified: fixed strut lengths, equilateral projections, vertical paired cables.');

for(const tableWidth of [100,450,800]) {
 const g=geometry({angle:45,length:190,separation:180,tableWidth});
 near(g.width,Math.max(tableWidth,g.minWidth));
 for(const e of g.extensions) near(Math.max(Math.abs(e.end[0]),Math.abs(e.end[2])),g.width/2);
 for(const c of g.cornerCables) near(Math.abs(c.start[0]),g.width/2);
 near(g.side,268.70057685088807);
}

for(const angle of [20,45,70]) for(const requested of [5,35,180]) {
 const g=geometry({angle,length:190,separation:180});
 for(const p of g.pairs) for(const ends of [p.lower,p.upper]) {
  const b=jointBrace(ends,requested);
  near(Math.hypot(...b.end.map((v,i)=>v-b.start[i])),b.length);
  near(b.start[1],ends[0][1]);
  near(b.length,Math.min(requested,g.rise*0.8));
  const fraction=b.length/g.rise;
  b.end.forEach((v,i)=>near(v,ends[0][i]+fraction*(ends[1][i]-ends[0][i])));
 }
}

for(const angle of [20,45,70]) for(const braceAngle of [20,45,90]) for(const length of [50,190,250]) {
 const g=geometry({angle,length,separation:180});
 for(const p of g.pairs) for(const ends of [p.lower,p.upper]) {
  const b=jointBrace(ends,180,braceAngle);
  near(Math.hypot(...b.end.map((v,i)=>v-b.start[i])),b.length);
  near(Math.abs(b.end[1]-b.start[1])/b.length,Math.sin(braceAngle*Math.PI/180));
  near(b.start[1],ends[0][1]);
  assert.ok(Math.hypot(b.start[0]-ends[0][0],b.start[2]-ends[0][2])<=g.side+1e-8);
  assert.ok(Math.abs(b.end[1]-ends[0][1])<=g.rise*0.8+1e-8);
 }
}

for(const cableLayout of ['paired','adjacent','six']){
 const g=geometry({angle:45,length:190,separation:180,cableLayout});
 assert.equal(g.innerCables.length,cableLayout==='six'?6:3);
 assert.equal(new Set(g.innerCables.map(c=>`${c.lower}-${c.upper}`)).size,g.innerCables.length);
 for(const c of g.innerCables){near(c.length,cableLayout==='paired'?g.cable:Math.hypot(g.cable,g.side/2));if(cableLayout!=='paired')assert.notEqual(c.lower,c.upper);}
}
