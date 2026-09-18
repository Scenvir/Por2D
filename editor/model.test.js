'use strict';
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const path = require('node:path');
const M = require('./model.js');
const m=M.blank();
for(const [a,b] of [[{x:2,y:3},{x:5,y:7}],[{x:5,y:7},{x:2,y:3}],[{x:2,y:7},{x:5,y:3}]]){
  const r=M.blank();r.spawn={x:3,y:4,direction:0};
  M.fillRectangle(r,a,b,2);assert.equal(r.tiles.flat().filter(t=>t===2).length,20);
  M.fillRectangle(r,a,b,0);assert.equal(r.tiles.flat().filter(Boolean).length,0);assert.ok(r.spawn);
}
const rect=M.blank();M.fillRectangle(rect,{x:49,y:29},{x:49,y:29},1);assert.equal(rect.tiles[29][49],1);
assert.throws(()=>M.fillRectangle(rect,{x:-1,y:0},{x:2,y:3},1));
assert.equal(M.validate(m).length,2);
m.spawn={x:3,y:26,direction:0};m.exit={x:40,y:26,direction:0};
m.tiles[29].fill(1);m.tiles[10][8]=2;
m.name='测试 "地图" \\';m.commentary='第一行\n第二行';
assert.deepEqual(M.validate(m),[]);
assert.deepEqual(M.parse(JSON.stringify(m)),m);
for(const direction of [0,1,2,3]){
  m.spawn.direction=direction;
  assert.deepEqual(M.validate(m),[]);
  const b=M.bounds(m.spawn);
  assert.equal(b.w,direction%2?58:18);
}
m.spawn={x:49,y:29,direction:0};assert.ok(M.validate(m).length);
assert.throws(()=>M.cpp(m));
m.spawn={x:8,y:10,direction:0};assert.ok(M.validate(m).some(s=>s.includes('重叠')));
m.spawn={x:3,y:26,direction:0};
for(const mutate of [v=>v.tiles.pop(),v=>v.tiles[0][0]=3,v=>v.spawn.direction=7,v=>v.exit.x=-1,v=>v.width=40]){
  const bad=JSON.parse(JSON.stringify(m));mutate(bad);assert.throws(()=>M.parse(JSON.stringify(bad)));
}
const cpp=M.cpp(m);
assert.ok(cpp.includes('level.map.fill(Tile::PortalSurface, 0, 29, 49, 29)'));
const compile=spawnSync('g++',['-std=c++17','-fsyntax-only','-x','c++','-I',path.resolve(__dirname,'../include'),'-'],{input:cpp,encoding:'utf8'});
if(compile.error)throw compile.error;
assert.equal(compile.status,0,compile.stderr);
console.log('PASS: JSON round-trip, four orientations, malformed input, overlap/bounds checks, exported C++ compilation.');
