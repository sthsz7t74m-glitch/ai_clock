import { $, StorageService, CityRepository, TabController, TimeFormatter } from './core.js';
import { WorldClockController } from './world-clock.js';
import { StopwatchController } from './stopwatch.js';
import { TimerController } from './timer.js';
import { AlarmController } from './alarm.js';
import { ConverterController } from './converter.js';
import { MeetingPlannerController } from './meeting-planner.js';
import { SettingsController, WakeLockService } from './settings.js';
import { NotificationService } from './notification.js';
import { DashboardController } from './dashboard.js';
import { ShortcutRouter } from './shortcut-router.js';

class App {
  constructor(){
    this.storage=new StorageService();
    this.cities=new CityRepository();
    this.formatter=new TimeFormatter();
    this.wakeLock=new WakeLockService();
    this.notifier=new NotificationService(this.storage);
  }
  init(){
    this.tabs=new TabController([
      {name:'home',button:$('homeTab'),panel:$('homeView')},
      {name:'world',button:$('worldClockTab'),panel:$('worldClockView')},
      {name:'convert',button:$('convertTab'),panel:$('convertView')},
      {name:'meeting',button:$('meetingTab'),panel:$('meetingView')},
      {name:'stopwatch',button:$('stopwatchTab'),panel:$('stopwatchView')},
      {name:'timer',button:$('timerTab'),panel:$('timerView')},
      {name:'alarm',button:$('alarmTab'),panel:$('alarmView')},
      {name:'settings',button:$('settingsTab'),panel:$('settingsView')}
    ]);
    [
      ['homeTab','home'],['worldClockTab','world'],['convertTab','convert'],['meetingTab','meeting'],
      ['stopwatchTab','stopwatch'],['timerTab','timer'],['alarmTab','alarm'],['settingsTab','settings']
    ].forEach(([id,name])=>{ const el=$(id); if(el) el.onclick=()=>{ this.storage.set('lastView',name); this.tabs.show(name); }; });

    this.world=new WorldClockController(this.storage,this.cities); this.world.init();
    this.stopwatch=new StopwatchController(this.storage); this.stopwatch.init();
    this.timer=new TimerController(this.storage,this.notifier); this.timer.init();
    this.alarm=new AlarmController(this.storage,this.notifier); this.alarm.init();
    this.converter=new ConverterController(this.cities); this.converter.init();
    this.meeting=new MeetingPlannerController(this.storage,this.cities,this.formatter); this.meeting.init();
    this.settings=new SettingsController(this.storage,this.wakeLock,this.notifier); this.settings.init();
    this.dashboard=new DashboardController(this.storage,this.cities,this.formatter,this.tabs); this.dashboard.init();
    this.shortcuts=new ShortcutRouter(this.storage,this.tabs);

    document.querySelectorAll('.weekday-button').forEach((b)=>b.addEventListener('click',()=>b.classList.toggle('active')));
    $('hour24Button').onclick=()=>this.setHourFormat('24');
    $('hour12Button').onclick=()=>this.setHourFormat('12');
    this.setHourFormat(this.storage.get('hourFormat','24'));
    $('fullscreenButton').onclick=()=>this.toggleFullscreen();
    this.registerServiceWorker();
    this.shortcuts.apply();
  }
  setHourFormat(v){
    this.storage.set('hourFormat',v);
    $('hour24Button').classList.toggle('active',v==='24');
    $('hour12Button').classList.toggle('active',v==='12');
    this.world.tick();
    this.world.renderFavorites();
  }
  async toggleFullscreen(){
    try{
      if(!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    }catch{}
  }
  registerServiceWorker(){
    if('serviceWorker' in navigator){
      window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
    }
  }
}

window.addEventListener('DOMContentLoaded',()=>new App().init());
