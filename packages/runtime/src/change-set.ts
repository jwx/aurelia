import { DI, PLATFORM } from '@aurelia/kernel';

export interface ILinkedNode {
  /*@internal*/$next?: IChangeTracker;
}

/**
 * Describes a type that tracks changes and can flush those changes in some way
 */
export interface IChangeTracker extends ILinkedNode {
  hasChanges?: boolean;
  flushChanges(): void;
}

/**
 * Represents a set of ChangeTrackers (typically observers) containing changes that can be flushed in some way (e.g. by calling subscribers).
 *
 * The LinkedChangeList itself also implements the IChangeTracker interface, allowing sets of changes to be grouped together and composed into a tree.
 */
export interface IChangeSet extends IChangeTracker {
  /**
   * A promise that resolves when the current set of changes has been flushed.
   * This is the same promise that is returned from `add`
   */
  readonly flushed: Promise<void>;

  /**
   * Indicates whether this LinkedChangeList is currently flushing changes
   */
  readonly flushing: boolean;

  /**
   * The number of ChangeTrackers that this set contains
   */
  readonly size: number;

  /**
   * Flushes the changes for all ChangeTrackers currently present in this set.
   */
  flushChanges(): void;

  /**
   * Returns this set of ChangeTrackers as an array.
   */
  toArray(): IChangeTracker[];

  /**
   * Adds a ChangeTracker to the set. Similar to how a normal Set behaves, adding the same item multiple times has the same effect as adding it once.
   *
   * @returns A promise that resolves when the changes have been flushed.
   */
  add(changeTracker: IChangeTracker): Promise<void>;

  /**
   * Returns true if the specified ChangeTracker is present in the set.
   */
  has(changeTracker: IChangeTracker): boolean;
}

export const IChangeSet = DI.createInterface<IChangeSet>()
  .withDefault(x => x.singleton(<any>LinkedChangeList));

const add = Set.prototype.add;

/*@internal*/
export class ChangeSet extends Set<IChangeTracker> implements IChangeSet {
  public flushed: Promise<void>;
  public flushing: boolean = false;

  /*@internal*/
  public promise: Promise<void> = Promise.resolve();

  public toArray(): IChangeTracker[] {
    const items = new Array<IChangeTracker>(this.size);
    let i = 0;
    for (const item of this.keys()) {
      items[i++] = item;
    }
    return items;
  }

  /**
   * This particular implementation is recursive; any changes added as a side-effect of flushing changes, will be flushed during the same tick.
   */
  public flushChanges = (): void => {
    this.flushing = true;
    while (this.size > 0) {
      const items = this.toArray();
      this.clear();
      const len = items.length;
      let i = 0;
      while (i < len) {
        items[i++].flushChanges();
      }
    }
    this.flushing = false;
  }

  public add(changeTracker: IChangeTracker): never; // this is a hack to keep intellisense/type checker from nagging about signature compatibility
  public add(changeTracker: IChangeTracker): Promise<void> {
    if (this.size === 0) {
      this.flushed = this.promise.then(this.flushChanges);
    }
    add.call(this, changeTracker);
    return this.flushed;
  }
}

const marker = PLATFORM.emptyObject as IChangeTracker;

/*@internal*/
export class LinkedChangeList implements IChangeSet {
  public flushed: Promise<void>;
  public flushing: boolean = false;
  public size: number = 0;
  private head: IChangeTracker = null;
  private tail: IChangeTracker = null;

  /*@internal*/
  public promise: Promise<void> = Promise.resolve();

  public toArray(): IChangeTracker[] {
    const items = new Array<IChangeTracker>(this.size);
    let i = 0;
    let current = this.head;
    let next;
    while (current) {
      items[i] = current;
      next = current.$next;
      current = next;
      i++;
    }
    return items;
  }

  public has(item: IChangeTracker): boolean {
    let current = this.head;
    let next;
    while (current) {
      if (item === current) {
        return true;
      }
      next = current.$next;
      current = next;
    }
    return false;
  }

  /**
   * This particular implementation is recursive; any changes added as a side-effect of flushing changes, will be flushed during the same tick.
   */
  public flushChanges = (): void => {
    this.flushing = true;
    while (this.head !== null) {
      let current = this.head;
      this.head = this.tail = null;
      let next;
      while (current && current !== marker) {
        current.flushChanges();
        next = current.$next;
        current.$next = null;
        current = next;
        this.size--;
      }
    }
    this.flushing = false;
  }

  public add(item: IChangeTracker): never; // this is a hack to keep intellisense/type checker from nagging about signature compatibility
  public add(item: IChangeTracker): Promise<void> {
    if (item.$next) {
      return;
    }
    // this is just to give the tail node a non-null value as a cheap way to check whether
    // something is queued already
    item.$next = marker;
    if (this.tail !== null) {
      this.tail.$next = item;
    } else {
      this.head = item;
    }
    this.tail = item;
    if (this.size === 0) {
      this.flushed = this.promise.then(this.flushChanges);
    }
    this.size++;
    return this.flushed;
  }

}
