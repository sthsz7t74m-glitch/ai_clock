import { $ } from './core.js';

export class WakeLockService {
  constructor(){ this.sentinel=null; }
  supported(){ return 'wakeLock' in navigator; }
  async enable(){
    if(!this.supported()) return false;
    try{
      this.sentinel=await navigator.wakeLock.request('screen');
      this.sentinel.addEventListener('release',()=>{ this.sentinel=null; });
      return true;
    }catch{ return false; }
  }
  async disable(){
    try{ await this.sentinel?.release(); }catch{}
    this.sentinel=null;
  }
}

export class SettingsController {
  constructor(storage,wakeLock){
    this.storage=storage;
    this.wakeLock=wakeLock;
    this.deferredPrompt=null;
  }
  init(){
    this.theme=this.storage.get('theme','system');
    this.reduceMotion=this.storage.get('reduceMotion',false);
    this.keepAwake=this.storage.get('keepAwake',false);
    this.applyAll();

    $('themeSelect')?.addEventListener('change',(e)=>{ this.theme=e.target.value; this.storage.set('theme',this.theme); this.applyTheme(); });
    $('reduceMotionToggle')?.addEventListener('change',(e)=>{ this.reduceMotion=e.target.checked; this.storage.set('reduceMotion',this.reduceMotion); this.applyMotion(); });
    $('keepAwakeToggle')?.addEventListener('change',async(e)=>{ this.keepAwake=e.target.checked; this.storage.set('keepAwake',this.keepAwake); await this.applyWakeLock(); });
    $('installAppButton')?.addEventListener('click',()=>this.install());

    window.addEventListener('beforeinstallprompt',(event)=>{
      event.preventDefault();
      this.deferredPrompt=event;
      $('installAppButton')?.classList.remove('hidden');
    });
    window.addEventListener('appinstalled',()=>{
      this.deferredPrompt=null;
      $('installAppButton')?.classList.add('hidden');
      if($('installStatus')) $('installStatus').textContent='インストール済み';
    });
    document.addEventListener('visibilitychange',()=>{
      if(document.visibilityState==='visible'&&this.keepAwake) this.applyWakeLock();
    });
  }
  applyAll(){
    if($('themeSelect')) $('themeSelect').value=this.theme;
    if($('reduceMotionToggle')) $('reduceMotionToggle').checked=this.reduceMotion;
    if($('keepAwakeToggle')) $('keepAwakeToggle').checked=this.keepAwake;
    this.applyTheme();
    this.applyMotion();
    this.applyWakeLock();
    if($('wakeLockStatus')) $('wakeLockStatus').textContent=this.wakeLock.supported()?'対応':'この端末では未対応';
  }
  applyTheme(){
    const resolved=this.theme==='system'?(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'):this.theme;
    document.documentElement.dataset.theme=resolved;
  }
  applyMotion(){ document.documentElement.dataset.reduceMotion=this.reduceMotion?'true':'false'; }
  async applyWakeLock(){
    if(this.keepAwake){
      const ok=await this.wakeLock.enable();
      if($('wakeLockStatus')) $('wakeLockStatus').textContent=ok?'スリープ防止中':(this.wakeLock.supported()?'有効化できませんでした':'この端末では未対応');
    }else{
      await this.wakeLock.disable();
      if($('wakeLockStatus')) $('wakeLockStatus').textContent=this.wakeLock.supported()?'OFF':'この端末では未対応';
    }
  }
  async install(){
    if(!this.deferredPrompt){ if($('installStatus')) $('installStatus').textContent='ブラウザの「ホーム画面に追加」から利用できます'; return; }
    this.deferredPrompt.prompt();
    await this.deferredPrompt.userChoice;
    this.deferredPrompt=null;
    $('installAppButton')?.classList.add('hidden');
  }
}
