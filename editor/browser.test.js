'use strict';
// Run with: node editor/browser.test.js [path-to-Chrome-or-Edge]
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'por2-editor-'));
const test=()=>{
  const check=(value,message)=>{if(!value)throw Error(message);};
  const pointer=(type,x,y)=>{
    const r=canvas.getBoundingClientRect();
    canvas.dispatchEvent(new PointerEvent(type,{clientX:r.left+(32+(x+.5)*20*zoom)*r.width/canvas.width,clientY:r.top+(32+(y+.5)*20*zoom)*r.height/canvas.height,button:0,pointerId:1,bubbles:true}));
  };
  const drag=(x,y,u,v)=>{pointer('pointerdown',x,y);pointer('pointermove',u,v);pointer('pointerup',u,v);};
  try{
    // Synthetic pointer events have no native active pointer to capture.
    canvas.setPointerCapture=()=>{};
    map=M.blank();map.tiles[3][3]=1;map.tiles[3][4]=2;map.spawn={x:3,y:4,direction:1};map.exit={x:6,y:4,direction:0};
    document.querySelector('[data-tool="select"]').click();
    const before=snapshot();drag(2,2,7,7);
    check(selection.tiles.length===2&&selection.bodies.length===2,'rectangle selection');
    check(history.length===0&&!dirty,'selection must not change map');
    drag(3,3,5,5);
    check(map.tiles[5][5]===1&&map.tiles[5][6]===2&&map.spawn.x===5&&map.exit.y===6,'group movement');
    check(history.length===1,'single undo entry');
    const after=snapshot();$('undo').click();check(snapshot()===before,'undo');$('redo').click();check(snapshot()===after,'redo');
    drag(4,4,9,9);pointer('pointerdown',5,5);pointer('pointermove',6,6);
    window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));check(snapshot()===after,'cancel movement');
    drag(5,5,49,29);check(snapshot()===after,'reject boundary overflow');
    $('zoom').value='1.5';$('zoom').onchange();drag(4,4,9,9);drag(5,5,6,5);
    check(map.tiles[5][6]===1&&map.spawn.x===6,'zoomed movement');
    selectTool('2');drag(15,15,16,15);check(map.tiles[15][16]===2,'brush regression');
    document.body.innerHTML='<pre>PASS: browser selection, movement, undo/redo, cancellation, bounds, zoom and brush.</pre>';
  }catch(error){document.body.innerHTML='<pre>FAIL: '+error.stack+'</pre>';}
};
try{
  let html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
  for(const name of ['model','editor'])html=html.replace(`<script src="${name}.js"></script>`,()=>'<script>'+fs.readFileSync(path.join(__dirname,name+'.js'),'utf8')+'</script>');
  html=html.replace('</html>','<script>('+test.toString()+')();</script></html>');
  const file=path.join(dir,'test.html');fs.writeFileSync(file,html);
  const browser=process.argv[2]||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
  const result=spawnSync(browser,['--headless','--disable-gpu','--no-first-run','--no-default-browser-check','--user-data-dir='+path.join(dir,'profile'),'--dump-dom',require('node:url').pathToFileURL(file).href],{encoding:'utf8',timeout:60000,windowsHide:true});
  if(result.error)throw result.error;
  const match=result.stdout.match(/(?:PASS|FAIL):[^<]+/);
  if(!match||!match[0].startsWith('PASS:'))throw Error(match?match[0]:result.stderr);
  console.log(match[0]);
}finally{
  // Browser processes may briefly hold profile files open on Windows.
  try{fs.rmSync(dir,{recursive:true,force:true});}catch{}
}
