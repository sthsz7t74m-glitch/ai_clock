import { $, StorageService, CityRepository, TabController } from './core.js';
import { WorldClockController } from './world-clock.js';
import { StopwatchController } from './stopwatch.js';
import { TimerController } from './timer.js';
import { AlarmController } from './alarm.js';
import { ConverterController } from './converter.js';

class App {
  constructor(){ this.storage=new StorageService(); this.cities=new CityRepository(); }
  init(){
    this.tabs=new TabController([
      {name:'world',button:$('worldClockTab'),panel:$('worldClockView')},
      {name:'stopwatch',button:$('stopwatchTab'),panel:$('stopwatchView')},
      {name:'timer',button:$('timerTab'),panel:$('timerView')},
      {name:'alarm',button:$('alarmTab'),panel:$('alarmView')},
      {name:'convert',button:$('convertTab'),panel:$('convertView')}
    ]);
    [['worldClockTab','world'],['stopwatchTab','stopwatch'],['timerTab','timer'],['alarmTab','alarm'],['convertTab','convert']].forEach(([id,name])=>$(id).onclick=()=>this.tabs.show(name));
    this.world=new WorldClockController(this.storage,this.cities); this.world.init();
    this.stopwatch=new StopwatchController(this.storage); this.stopwatch.init();
    this.timer=new TimerController(this.storage); this.timer.init();
    this.alarm=new AlarmController(this.storage); this.alarm.init();
    this.converter=new ConverterController(this.cities); this.converter.init();
    document.querySelectorAll('.weekday-button').forEach((b)=>b.addEventListener('click',()=>b.classList.toggle('active')));
    $('hour24Button').onclick=()=>this.setHourFormat('24'); $('hour12Button').onclick=()=>this.setHourFormat('12'); this.setHourFormat(this.storage.get('hourFormat','24'));
    $('fullscreenButton').onclick=()=>this.toggleFullscreen();
    this.tabs.show('world');
  }
  setHourFormat(v){ this.storage.set('hourFormat',v); $('hour24Button').classList.toggle('active',v==='24'); $('hour12Button').classList.toggle('active',v==='12'); this.world.tick(); this.world.renderFavorites(); }
  async toggleFullscreen(){ try{ if(!document.fullscreenElement)await document.documentElement.requestFullscreen();else await document.exitFullscreen(); }catch{} }
}

window.addEventListener('DOMContentLoaded',()=>new App().init());
