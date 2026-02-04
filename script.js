const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');
const video = document.getElementById('video');
const statusEl = document.getElementById('status');
const gestureEl = document.getElementById('gesture');

let model, isRunning = false, animationId, particles = [], textMessage = '', lastTextTime = 0;

function resize() { canvas.width = innerWidth; canvas.height = innerHeight; }
addEventListener('resize', resize); resize();

class Particle {
  constructor(x,y,c) {
    this.x=x; this.y=y; this.size=Math.random()*4+1;
    this.speedX=(Math.random()-0.5)*3; this.speedY=(Math.random()-0.5)*3;
    this.color=c; this.life=0; this.maxLife=Math.random()*60+40;
  }
  update() { this.x+=this.speedX; this.y+=this.speedY; this.life++; return this.life<=this.maxLife; }
  draw() {
    const a = 1 - this.life/this.maxLife;
    ctx.fillStyle=this.color; ctx.globalAlpha=a;
    ctx.beginPath(); ctx.arc(this.x,this.y,this.size,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha=1;
  }
}

function spawn(n,x,y,c='#fff'){ for(let i=0;i<n;i++) particles.push(new Particle(x,y,c)); }

function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  for(let i=particles.length-1;i>=0;i--){
    if(!particles[i].update()) particles.splice(i,1);
    else particles[i].draw();
  }
  if(textMessage && Date.now()-lastTextTime<3000){
    ctx.font='bold 56px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.shadowColor='rgba(255,255,255,0.8)'; ctx.shadowBlur=20; ctx.fillStyle='#fff';
    ctx.fillText(textMessage, canvas.width/2, canvas.height/2);
  }
  if(isRunning) animationId=requestAnimationFrame(draw);
}

function classify(dets){
  if(!dets?.length) return 'none';
  const b = dets[0]; if(b.score<0.7) return 'none';
  const w=b.width, h=b.height, a=w/h;
  if(a>1.2 && w*h>5000) return 'open';
  if(a<0.8 && w*h<3000) return 'fist';
  if(a>1.1 && b.y < canvas.height*0.3) return 'vsign';
  if(w*h>4000 && b.y > canvas.height*0.6) return 'pinch';  return 'none';
}

function handle(dets){
  const g = classify(dets);
  gestureEl.textContent = `Gesture: ${g.charAt(0).toUpperCase()+g.slice(1)}`;
  if(g==='open'){ textMessage=''; spawn(250,canvas.width/2,canvas.height/2,`hsl(${Math.random()*360},70%,60%)`); }
  else if(g==='fist'){ textMessage='SATURN RING'; lastTextTime=Date.now(); spawn(200,canvas.width/2,canvas.height/2,'#4FC3F7'); }
  else if(g==='vsign'){ textMessage='I LOVE YOU'; lastTextTime=Date.now(); spawn(180,canvas.width/2,canvas.height/2,'#FFD700'); }
  else if(g==='pinch'){ textMessage='KEEP IT 100'; lastTextTime=Date.now(); spawn(160,canvas.width/2,canvas.height/2,'#FF69B4'); }
}

async function setup(){
  try {
    const stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:480,height:640},audio:false});
    video.srcObject = stream; await new Promise(r=>video.onloadedmetadata=r);
    statusEl.textContent = "Loading AI...";
    model = await handTrack.load({maxFaces:1,detectionConfidence:0.7,architecture:'SSD Mobilenet V1'});
    statusEl.textContent = "Show your hand!";
    startDetect();
  } catch(e){
    statusEl.innerHTML = `❌ Camera failed.<br>Allow camera in browser.`;
    statusEl.style.color='red';
  }
}

function startDetect(){
  if(!model||!isRunning) return;
  async function d(){ if(video.videoWidth){ const p=await model.detect(video); handle(p); } setTimeout(d,120); }
  d();
}

function requestCamera(){
  if(isRunning) return;
  statusEl.textContent = "Starting...";
  setup().then(()=>{
    isRunning=true; draw();
    document.getElementById('controls').innerHTML=`<button onclick="togglePause()">⏸️ Pause</button><button onclick="reset()">🔄 Reset</button>`;
  });
}

function togglePause(){
  isRunning=!isRunning;
  if(isRunning){ draw(); statusEl.textContent="Resumed"; }
  else{ cancelAnimationFrame(animationId); statusEl.textContent="Paused"; }
}

function reset(){
  particles=[]; textMessage=''; gestureEl.textContent="Gesture: —"; statusEl.textContent="Reset.";
}
addEventListener('touchstart',e=>e.preventDefault(),{passive:false});
addEventListener('touchmove',e=>e.preventDefault(),{passive:false});
