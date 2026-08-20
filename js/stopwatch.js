import { $ } from './core.js';

export class StopwatchController {
  constructor(storage){ this.storage=storage; this.state={running:false,elapsed:0,start:null,laps:[],lastLap:0}; }
  init(){ this.state={...this.state,...this.storage.get('stopwatch',{})}; $('startButton').onclick=()=>this.start(); $('pauseResumeButton').onclick=()=>this.pauseResume(); $('resetButton').onclick=()=>this.reset(); $('lapButton').onclick=()=>this.lap(); $('clearLapsButton').onclick=()=>this.clearLaps(); this.renderLaps(); this.loop(); }
  elapsed(){ return this.state.running ? this.state.elapsed+Math.max(0,Date.now()-this.state.start) : this.state.elapsed; }
  save(){ this.storage.set('stopwatch',this.state); }
  format(ms){ const cs=Math.floor(ms/10),h=Math.floor(cs/360000),m=Math.floor(cs/6000)%60,s=Math.floor(cs/100)%60,c=cs%100,p=(v)=>String(v).padStart(2,'0'); return `${p(h)}:${p(m)}:${p(s)}.${p(c)}`; }
  loop(){ $('stopwatchTime').textContent=this.format(this.elapsed()); $('startButton').disabled=this.state.running||this.state.elapsed>0; $('pauseResumeButton').disabled=!this.state.running&&this.state.elapsed===0; $('pauseResumeButton').textContent=this.state.running?'一時停止':'再開'; $('lapButton').disabled=!this.state.running; $('resetButton').disabled=!this.state.running&&this.state.elapsed===0&&!this.state.laps.length; requestAnimationFrame(()=>this.loop()); }
  start(){ this.state.running=true; this.state.start=Date.now(); if(!this.state.elapsed){this.state.laps=[];this.state.lastLap=0;} this.save(); }
  pauseResume(){ if(this.state.running){this.state.elapsed=this.elapsed();this.state.running=false;this.state.start=null;}else{this.state.running=true;this.state.start=Date.now();} this.save(); }
  reset(){ this.state={running:false,elapsed:0,start:null,laps:[],lastLap:0}; this.save(); this.renderLaps(); }
  lap(){ if(!this.state.running)return; const total=this.elapsed(); this.state.laps.unshift({n:this.state.laps.length+1,lap:total-this.state.lastLap,total}); this.state.lastLap=total; this.save(); this.renderLaps(); }
  clearLaps(){ this.state.laps=[]; this.state.lastLap=this.elapsed(); this.save(); this.renderLaps(); }
  renderLaps(){ const box=$('lapsList'); box.innerHTML=this.state.laps.length?this.state.laps.map((x)=>`<article class="lap-card"><div class="lap-row"><b>Lap ${x.n}</b><b>${this.format(x.lap)}</b></div><div class="lap-row muted"><span>区間</span><span>合計 ${this.format(x.total)}</span></div></article>`).join(''):'<p class="empty-message">ラップはまだありません</p>'; }
}
