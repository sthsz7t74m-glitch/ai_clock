export class ShortcutRouter {
  constructor(storage, tabs) { this.storage = storage; this.tabs = tabs; }
  resolve() {
    const params = new URLSearchParams(location.search);
    const view = params.get('view');
    const allowed = new Set(['home','world','alarm','stopwatch','timer','convert','meeting','settings']);
    if (view && allowed.has(view)) return view;
    return this.storage.get('lastView','home');
  }
  apply() {
    const view = this.resolve();
    this.tabs.show(view);
    this.storage.set('lastView',view);
    return view;
  }
}
