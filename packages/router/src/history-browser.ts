interface IHistoryEntry {
  path: string;
  index?: number;
  title?: string;
  data?: Object;
}

interface INavigationFlags {
  isNavigatingFirst?: boolean;
  isNavigatingNew?: boolean;
  isNavigatingRefresh?: boolean;
  isNavigatingForward?: boolean;
  isNavigatingBack?: boolean;
}

export class HistoryBrowser {
  public currentEntry: IHistoryEntry;
  public historyEntries: IHistoryEntry[] = [];

  private activeEntry: IHistoryEntry = null;

  private location: any;
  private history: any;

  private options: Object;

  private isActive: boolean = false;

  private lastHistoryMovement: number;

  private __path: string; // For development, should be removed

  constructor() {
    this.location = window.location;
    this.history = window.history;
  }

  public activate(options?: Object): void {
    if (this.isActive) {
      throw new Error('History has already been activated.');
    }

    this.isActive = true;
    this.options = Object.assign({}, options);

    window.addEventListener('popstate', this.pathChanged);
    // window.onpopstate = this.pathChanged;
    // window.onpopstate = function (event) {
    //   console.log("location: " + document.location + ", state: " + JSON.stringify(event.state));
    // };
  }

  public deactivate(): void {
    window.removeEventListener('popstate', this.pathChanged);
    this.isActive = false;
  }

  public goto(path: string, title?: string, data?: Object): void {
    this.activeEntry = {
      path: path,
      title: title,
      data: data,
    };
    this.setPath(path);
    // this.pathChanged();
  }

  public back(): void {
    console.log(this.history.length, this.getState('HistoryEntry'));
    this.history.go(-1);
    setTimeout(() => { console.log('callback', this.history.length, this.getState('HistoryEntry')) }, 2000);
  }

  public forward(): void {
    this.history.forward();
  }

  public setState(key: string, value: any): void {
    const state = Object.assign({}, this.history.state);
    const { pathname, search, hash } = this.location;
    state[key] = value;
    this.history.replaceState(state, null, `${pathname}${search}${hash}`);
  }

  public getState(key: string): any {
    const state = Object.assign({}, this.history.state);
    return state[key];
  }

  private pathChanged = (): void => {
    const path: string = this.getPath();
    console.log('path changed to', path, this.activeEntry);

    const navigationFlags: INavigationFlags = {};

    if (this.activeEntry && this.activeEntry.path === path) { // Only happens with new history entries
      navigationFlags.isNavigatingNew = true;
      this.lastHistoryMovement = 1;
      const historyEntry: IHistoryEntry = this.getState('HistoryEntry');
      if (!historyEntry) {
        navigationFlags.isNavigatingFirst = true;
      }
      this.currentEntry = this.activeEntry;
      this.currentEntry.index = this.historyEntries.length;
      this.historyEntries.push(this.currentEntry);
      this.setState('HistoryEntries', this.historyEntries);
      this.setState('HistoryEntry', this.currentEntry);
    } else { // Refresh, history navigation, first navigation or manual navigation
      this.historyEntries = this.getState('HistoryEntries') || [];
      let historyEntry: IHistoryEntry = this.getState('HistoryEntry');
      if (!historyEntry && !this.currentEntry) {
        navigationFlags.isNavigatingNew = true;
        navigationFlags.isNavigatingFirst = true;
      } else if (!historyEntry) {
        navigationFlags.isNavigatingNew = true;
      } else if (!this.currentEntry) {
        navigationFlags.isNavigatingRefresh = true;
      } else if (this.currentEntry.index < historyEntry.index) {
        navigationFlags.isNavigatingForward = true;
      } else if (this.currentEntry.index > historyEntry.index) {
        navigationFlags.isNavigatingBack = true;
      }

      if (!historyEntry) {
        historyEntry = {
          path: path,
          index: this.historyEntries.length,
        };
        this.historyEntries.push(historyEntry);
        this.setState('HistoryEntries', this.historyEntries);
        this.setState('HistoryEntry', historyEntry);
      }
      this.lastHistoryMovement = (this.currentEntry ? historyEntry.index - this.currentEntry.index : 0);
      this.currentEntry = historyEntry;
    }
    this.activeEntry = null;

    this.__callback(this.currentEntry, navigationFlags);
  }

  private getPath(): string {
    return this.location.hash.substr(1);
    // return this.__path;
  }
  private setPath(path: string): void {
    this.location.hash = path;
  }
  private __callback(currentEntry: Object, navigationFlags: INavigationFlags) {
    console.log('__callback', currentEntry, navigationFlags);
  }
}
