import { Omit, PLATFORM } from '@aurelia/kernel';
import { INode } from './dom';
import { LifecycleFlags, IChangeSet, IScope } from './observation';

export const enum LifecycleState {
  none                  = 0b00000000000,
  isBinding             = 0b00000000001,
  isBound               = 0b00000000010,
  isAttaching           = 0b00000000100,
  isAttached            = 0b00000001000,
  isDetaching           = 0b00000010000,
  isUnbinding           = 0b00000100000,
  isCached              = 0b00001000000,
  needsMount            = 0b00010000000
}

export enum AttachLifecycleFlags {
  none                = 0b001,
  noTasks             = 0b010,
  unbindAfterDetached = 0b100,
}

export const enum LifecycleHooks {
  none                   = 0b000000000001,
  hasCreated             = 0b000000000010,
  hasBinding             = 0b000000000100,
  hasBound               = 0b000000001000,
  hasAttaching           = 0b000000010000,
  hasAttached            = 0b000000100000,
  hasDetaching           = 0b000001000000,
  hasDetached            = 0b000010000000,
  hasUnbinding           = 0b000100000000,
  hasUnbound             = 0b001000000000,
  hasRender              = 0b010000000000,
  hasCaching             = 0b100000000000
}

export interface ILifecycleCreated {
  /**
   * Called at the end of `$hydrate`.
   *
   * The following key properties are now assigned and initialized (see `IRenderable` for more detail):
   * - `this.$bindables`
   * - `this.$attachables`
   * - `this.$scope` (null if this is a custom attribute, or contains the view model if this is a custom element)
   * - `this.$nodes`
   *
   * @description
   * This is the second and last "hydrate" lifecycle hook (after `render`). It happens only once per instance (contrary to bind/attach
   * which can happen many times per instance), though it can happen many times per type (once for each instance)
   *
   * This hook is called right before the `$bind` lifecycle starts, making this the last opportunity
   * for any high-level post processing on initialized properties.
   */
  created?(): void;
}

export interface ILifecycleBinding {
  /**
   * Called at the start of `$bind`, before this instance and its children (if any) are bound.
   *
   * - `this.$isBound` is false.
   * - `this.$scope` is initialized.
   *
   * @param flags Contextual information about the lifecycle, such as what triggered it.
   * Some uses for this hook:
   * - `flags & LifecycleFlags.fromStartTask`: the Aurelia app is starting (this is the initial bind)
   * - `flags & LifecycleFlags.fromBind`: this is a normal `$bind` lifecycle
   * - `flags & LifecycleFlags.updateTargetInstance`: this `$bind` was triggered by some upstream observer and is not a real `$bind` lifecycle
   * - `flags & LifecycleFlags.fromFlushChanges` (only occurs in conjunction with updateTargetInstance): the update was queued to a `LinkedChangeList` which is now being flushed
   *
   * @description
   * This is the first "create" lifecycle hook of the hooks that can occur multiple times per instance,
   * and the third lifecycle hook (after `render` and `created`) of the very first lifecycle.
   */
  binding?(flags: LifecycleFlags): void;
}

export interface ILifecycleBound {
  /*@internal*/$boundFlags?: LifecycleFlags;
  /*@internal*/$nextBound?: ILifecycleBound;

  /**
   * Called at the end of `$bind`, after this instance and its children (if any) are bound.
   *
   * - `$isBound` is true.
   * - `this.$scope` is initialized.
   *
   * @param flags Contextual information about the lifecycle, such as what triggered it.
   * Some uses for this hook:
   * - `flags & LifecycleFlags.fromStartTask`: the Aurelia app is starting (this is the initial bind)
   * - `flags & LifecycleFlags.fromBind`: this is a normal `$bind` lifecycle
   * - `flags & LifecycleFlags.updateTargetInstance`: this `$bind` was triggered by some upstream observer and is not a real `$bind` lifecycle
   * - `flags & LifecycleFlags.fromFlushChanges` (only occurs in conjunction with updateTargetInstance): the update was queued to a `LinkedChangeList` which is now being flushed
   *
   * @description
   * This is the second "create" lifecycle hook (after `binding`) of the hooks that can occur multiple times per instance,
   * and the fourth lifecycle hook (after `render`, `created` and `binding`) of the very first lifecycle.
   */
  bound?(flags: LifecycleFlags): void;
}

export interface ILifecycleUnbinding {
  /**
   * Called at the start of `$unbind`, before this instance and its children (if any) are unbound.
   *
   * - `this.$isBound` is true.
   * - `this.$scope` is still available.
   *
   * @param flags Contextual information about the lifecycle, such as what triggered it.
   * Some uses for this hook:
   * - `flags & LifecycleFlags.fromBind`: the component is just switching scope
   * - `flags & LifecycleFlags.fromUnbind`: the component is really disposing
   * - `flags & LifecycleFlags.fromStopTask`: the Aurelia app is stopping
   *
   * @description
   * This is the fourth "cleanup" lifecycle hook (after `detaching`, `caching` and `detached`)
   *
   * Last opportunity to perform any source or target updates before the bindings are disconnected.
   *
   */
  unbinding?(flags: LifecycleFlags): void;
}

export interface ILifecycleUnbound {
  /*@internal*/$unboundFlags?: LifecycleFlags;
  /*@internal*/$nextUnbound?: ILifecycleUnbound;

  /**
   * Called at the end of `$unbind`, after this instance and its children (if any) are unbound.
   *
   * - `this.$isBound` is false at this point.
   *
   * - `this.$scope` may not be available anymore (unless it's a `@customElement`)
   *
   * @param flags Contextual information about the lifecycle, such as what triggered it.
   * Some uses for this hook:
   * - `flags & LifecycleFlags.fromBind`: the component is just switching scope
   * - `flags & LifecycleFlags.fromUnbind`: the component is really disposing
   * - `flags & LifecycleFlags.fromStopTask`: the Aurelia app is stopping
   *
   * @description
   * This is the fifth (and last) "cleanup" lifecycle hook (after `detaching`, `caching`, `detached`
   * and `unbinding`).
   *
   * The lifecycle either ends here, or starts at `$bind` again.
   */
  unbound?(flags: LifecycleFlags): void;
}

export interface ILifecycleAttaching {
  /**
   * Called at the start of `$attach`, before this instance and its children (if any) are attached.
   *
   * `$isAttached` is false.
   *
   * @param encapsulationSource Ask Rob.
   * @param lifecycle Utility that encapsulates the attach sequence for a hierarchy of attachables and guarantees the correct attach order.
   *
   * @description
   * This is the third "create" lifecycle hook (after `binding` and `bound`) of the hooks that can occur multiple times per instance,
   * and the fifth lifecycle hook (after `render`, `created`, `binding` and `bound`) of the very first lifecycle
   *
   * This is the time to add any (sync or async) tasks (e.g. animations) to the lifecycle that need to happen before
   * the nodes are added to the DOM.
   */
  attaching?(encapsulationSource: INode, flags: LifecycleFlags): void;
}

export interface ILifecycleAttached {
  /*@internal*/$attachedFlags?: LifecycleFlags;
  /*@internal*/$nextAttached?: ILifecycleAttached;

  /**
   * Called at the end of `$attach`, after this instance and its children (if any) are attached.
   *
   * - `$isAttached` is true.
   *
   * @description
   * This is the fourth (and last) "create" lifecycle hook (after `binding`, `bound` and `attaching`) of the hooks that can occur
   * multiple times per instance, and the sixth lifecycle hook (after `render`, `created`, `binding`, `bound` and `attaching`)
   * of the very first lifecycle
   *
   * This instance and its children (if any) can be assumed
   * to be fully initialized, bound, rendered, added to the DOM and ready for use.
   */
  attached?(flags: LifecycleFlags): void;
}

export interface ILifecycleDetaching {
  /**
   * Called at the start of `$detach`, before this instance and its children (if any) are detached.
   *
   * - `$isAttached` is true.
   *
   * @param lifecycle Utility that encapsulates the detach sequence for a hierarchy of attachables and guarantees the correct detach order.
   *
   * @description
   * This is the first "cleanup" lifecycle hook.
   *
   * This is the time to add any (sync or async) tasks (e.g. animations) to the lifecycle that need to happen before
   * the nodes are removed from the DOM.
   */
  detaching?(flags: LifecycleFlags): void;
}

export interface ILifecycleDetached {
  /*@internal*/$detachedFlags?: LifecycleFlags;
  /*@internal*/$nextDetached?: ILifecycleDetached;

  /**
   * Called at the end of `$detach`, after this instance and its children (if any) are detached.
   *
   * - `$isAttached` is false.
   *
   * @description
   * This is the third "cleanup" lifecycle hook (after `detaching` and `caching`).
   *
   * The `$nodes` are now removed from the DOM and the `View` (if possible) is returned to cache.
   *
   * If no `$unbind` lifecycle is queued, this is the last opportunity to make state changes before the lifecycle ends.
   */
  detached?(flags: LifecycleFlags): void;
}

export interface ILifecycleCaching {
  /**
   * Called during `$unmount` (which happens during `$detach`), specifically after the
   * `$nodes` are removed from the DOM, but before the view is actually added to the cache.
   *
   * @description
   * This is the second "cleanup" lifecycle hook.
   *
   * This lifecycle is invoked if and only if the `ViewFactory` that created the `View` allows the view to be cached.
   *
   * Usually this hook is not invoked unless you explicitly set the cache size to to something greater than zero
   * on the resource description.
   */
  caching?(): void;
}

export interface ILifecycleFlushChanges {
  /*@internal*/$flushChangesFlags?: LifecycleFlags;
  /*@internal*/$nextFlushChanges?: ILifecycleFlushChanges;

  flushChanges(flags: LifecycleFlags): void;
}

/**
 * Defines optional lifecycle hooks that will be called only when they are implemented.
 */
export interface ILifecycleHooks extends
  ILifecycleCreated,
  ILifecycleBinding,
  ILifecycleBound,
  ILifecycleUnbinding,
  ILifecycleUnbound,
  ILifecycleAttaching,
  ILifecycleAttached,
  ILifecycleDetaching,
  ILifecycleDetached,
  ILifecycleCaching { }

export interface ILifecycleState {
  $state: LifecycleState;
}

export interface ILifecycleCache {
  $cache(): void;
}

export interface ICachable extends ILifecycleCache, ILifecycleState { }

export interface ILifecycleAttach {
  $attach(encapsulationSource: INode, flags: LifecycleFlags): void;
}

export interface ILifecycleDetach {
  $detach(flags: LifecycleFlags): void;
}

export interface IAttach extends ILifecycleAttach, ILifecycleDetach, ICachable {
  /*@internal*/$nextAttach: IAttach;
  /*@internal*/$prevAttach: IAttach;
}

export interface ILifecycleMount {
  /*@internal*/$mountFlags?: LifecycleFlags;
  /*@internal*/$nextMount?: ILifecycleMount;

  /**
   * Add the `$nodes` of this instance to the Host or RenderLocation that this instance is holding.
   */
  $mount(flags: LifecycleFlags): void;
}

export interface ILifecycleUnmount {
  /*@internal*/$unmountFlags?: LifecycleFlags;
  /*@internal*/$nextUnmount?: ILifecycleUnmount;

  /**
   * Remove the `$nodes` of this instance from the Host or RenderLocation that this instance is holding, optionally returning them to a cache.
   * @returns
   * - `true` if the instance has been returned to the cache.
   * - `false` if the cache (typically ViewFactory) did not allow the instance to be cached.
   * - `undefined` (void) if the instance does not support caching. Functionally equivalent to `false`
   */
  $unmount(flags: LifecycleFlags): boolean | void;
}
export interface IMountable extends ILifecycleMount, ILifecycleUnmount, ILifecycleState { }

export interface ILifecycleUnbind {
  $unbind(flags: LifecycleFlags): void;
}

export interface ILifecycleBind {
  $bind(flags: LifecycleFlags, scope?: IScope): void;
}

export interface ILifecycleBindSelf {
  $bind(flags: LifecycleFlags): void;
}

export interface ILifecycleBindScope {
  $bind(flags: LifecycleFlags, scope: IScope): void;
}

export interface IBind extends ILifecycleBind, ILifecycleUnbind, ILifecycleState {
  /*@internal*/$nextBind: IBindSelf | IBindScope;
  /*@internal*/$prevBind: IBindSelf | IBindScope;
}

export interface IBindScope extends Omit<IBind, '$bind'>, ILifecycleBindScope { }

export interface IBindSelf extends Omit<IBind, '$bind'>, ILifecycleBindSelf { }

export interface ILifecycleTask {
  readonly done: boolean;
  canCancel(): boolean;
  cancel(): void;
  wait(): Promise<void>;
}

export interface IAttachLifecycleController {
  attach(requestor: IAttach): IAttachLifecycleController;
  end(): ILifecycleTask;
}

export interface IAttachLifecycle {
  readonly flags: AttachLifecycleFlags;
  registerTask(task: ILifecycleTask): void;
  createChild(): IAttachLifecycle;
  queueMount(requestor: ILifecycleMount): void;
  queueAttachedCallback(requestor: ILifecycleAttached): void;
}

export interface IDetachLifecycleController {
  detach(requestor: IAttach): IDetachLifecycleController;
  end(): ILifecycleTask;
}

export interface IDetachLifecycle {
  readonly flags: AttachLifecycleFlags;
  registerTask(task: ILifecycleTask): void;
  createChild(): IDetachLifecycle;
  queueUnmount(requestor: ILifecycleUnmount): void;
  queueDetachedCallback(requestor: ILifecycleDetached): void;
}

// export class AggregateLifecycleTask implements ILifecycleTask {
//   public done: boolean = true;

//   /*@internal*/
//   public owner: AttachLifecycleController | DetachLifecycleController = null;

//   private tasks: ILifecycleTask[] = [];
//   private waiter: Promise<void> = null;
//   private resolve: () => void = null;

//   public addTask(task: ILifecycleTask): void {
//     if (!task.done) {
//       this.done = false;
//       this.tasks.push(task);
//       task.wait().then(() => this.tryComplete());
//     }
//   }

//   public canCancel(): boolean {
//     if (this.done) {
//       return false;
//     }

//     return this.tasks.every(x => x.canCancel());
//   }

//   public cancel(): void {
//     if (this.canCancel()) {
//       this.tasks.forEach(x => x.cancel());
//       this.done = false;
//     }
//   }

//   public wait(): Promise<void> {
//     if (this.waiter === null) {
//       if (this.done) {
//         this.waiter = Promise.resolve();
//       } else {
//         // tslint:disable-next-line:promise-must-complete
//         this.waiter = new Promise((resolve) => this.resolve = resolve);
//       }
//     }

//     return this.waiter;
//   }

//   private tryComplete(): void {
//     if (this.done) {
//       return;
//     }

//     if (this.tasks.every(x => x.done)) {
//       this.complete(true);
//     }
//   }

//   private complete(notCancelled: boolean): void {
//     this.done = true;

//     if (notCancelled && this.owner !== null) {
//       this.owner.processAll();
//     }

//     if (this.resolve !== null) {
//       this.resolve();
//     }
//   }
// }

// /*@internal*/
// export class AttachLifecycleController implements IAttachLifecycle, IAttachLifecycleController {
//   /*@internal*/
//   public $nextMount: ILifecycleMount = null;
//   /*@internal*/
//   public $nextAttached: ILifecycleAttached = null;

//   private attachedHead: ILifecycleAttached = this;
//   private attachedTail: ILifecycleAttached = this;
//   private mountHead: ILifecycleMount = this;
//   private mountTail: ILifecycleMount = this;
//   private task: AggregateLifecycleTask = null;

//   constructor(
//     public readonly changeSet: IChangeSet,
//     public readonly flags: AttachLifecycleFlags,
//     private parent: AttachLifecycleController = null,
//     private encapsulationSource: INode = null
//   ) { }

//   public attach(requestor: IAttach): IAttachLifecycleController {
//     requestor.$attach(this.encapsulationSource, this);
//     return this;
//   }

//   public queueMount(requestor: ILifecycleMount): void {
//     this.mountTail.$nextMount = requestor;
//     this.mountTail = requestor;
//   }

//   public queueAttachedCallback(requestor: ILifecycleAttached): void {
//     this.attachedTail.$nextAttached = requestor;
//     this.attachedTail = requestor;
//   }

//   public registerTask(task: ILifecycleTask): void {
//     if (this.parent !== null) {
//       this.parent.registerTask(task);
//     } else {
//       if (this.task === null) {
//         this.task = new AggregateLifecycleTask();
//       }
//       this.task.addTask(task);
//     }
//   }

//   public createChild(): IAttachLifecycle {
//     const lifecycle = new AttachLifecycleController(this.changeSet, this.flags, this);
//     this.queueMount(flags);
//     this.queueAttachedCallback(flags);
//     return lifecycle;
//   }

//   public end(): ILifecycleTask {
//     if (this.task !== null && !this.task.done) {
//       this.task.owner = this;
//       return this.task;
//     }

//     this.processAll();

//     return AttachLifecycle.done;
//   }

//   /*@internal*/
//   public processAll(): void {
//     this.changeSet.flushChanges();
//     this.processMounts();
//     this.processAttachedCallbacks();
//   }

//   /*@internal*/
//   public $mount(): void {
//     if (this.parent !== null) {
//       this.processMounts();
//     }
//   }

//   /*@internal*/
//   public attached(): void {
//     if (this.parent !== null) {
//       this.processAttachedCallbacks();
//     }
//   }

//   private processMounts(): void {
//     let currentMount = this.mountHead;
//     let nextMount: typeof currentMount;

//     while (currentMount) {
//       currentMount.$mount(0);
//       nextMount = currentMount.$nextMount;
//       currentMount.$nextMount = null;
//       currentMount = nextMount;
//     }
//   }

//   private processAttachedCallbacks(): void {
//     let currentAttached = this.attachedHead;
//     let nextAttached: typeof currentAttached;

//     while (currentAttached) {
//       currentAttached.attached(0);
//       nextAttached = currentAttached.$nextAttached;
//       currentAttached.$nextAttached = null;
//       currentAttached = nextAttached;
//     }
//   }
// }

// /*@internal*/
// export class DetachLifecycleController implements IDetachLifecycle, IDetachLifecycleController {
//   /*@internal*/
//   public $nextUnmount: ILifecycleUnmount = null;
//   /*@internal*/
//   public $nextDetached: ILifecycleDetached = null;

//   private detachedHead: ILifecycleDetached = this; //LOL
//   private detachedTail: ILifecycleDetached = this;
//   private unmountHead: ILifecycleUnmount = this;
//   private unmountTail: ILifecycleUnmount = this;
//   private task: AggregateLifecycleTask = null;
//   private allowUnmount: boolean = true;

//   constructor(
//     public readonly changeSet: IChangeSet,
//     public readonly flags: AttachLifecycleFlags,
//     private parent: DetachLifecycleController = null
//   ) { }

//   public detach(requestor: IAttach): IDetachLifecycleController {
//     this.allowUnmount = true;

//     if (requestor.$state & LifecycleState.isAttached) {
//       requestor.$detach(this);
//     } else if (isUnmountable(requestor)) {
//       this.queueUnmount(requestor);
//     }

//     return this;
//   }

//   public queueUnmount(requestor: ILifecycleUnmount): void {
//     if (this.allowUnmount) {
//       this.unmountTail.$nextUnmount = requestor;
//       this.unmountTail = requestor;
//       this.allowUnmount = false; // only remove roots
//     }
//   }

//   public queueDetachedCallback(requestor: ILifecycleDetached): void {
//     this.detachedTail.$nextDetached = requestor;
//     this.detachedTail = requestor;
//   }

//   public registerTask(task: ILifecycleTask): void {
//     if (this.parent !== null) {
//       this.parent.registerTask(task);
//     } else {
//       if (this.task === null) {
//         this.task = new AggregateLifecycleTask();
//       }
//       this.task.addTask(task);
//     }
//   }

//   public createChild(): IDetachLifecycle {
//     const lifecycle = new DetachLifecycleController(this.changeSet, this.flags, this);
//     this.queueUnmount(flags);
//     this.queueDetachedCallback(flags);
//     return lifecycle;
//   }

//   public end(): ILifecycleTask {
//     if (this.task !== null && !this.task.done) {
//       this.task.owner = this;
//       return this.task;
//     }

//     this.processAll();

//     return AttachLifecycle.done;
//   }

//   /*@internal*/
//   public $unmount(): void {
//     if (this.parent !== null) {
//       this.processUnmounts();
//     }
//   }

//   /*@internal*/
//   public detached(): void {
//     if (this.parent !== null) {
//       this.processDetachedCallbacks();
//     }
//   }

//   /*@internal*/
//   public processAll(): void {
//     this.changeSet.flushChanges();
//     this.processUnmounts();
//     this.processDetachedCallbacks();
//   }

//   private processUnmounts(): void {
//     let currentUnmount = this.unmountHead;

//     if (this.flags & AttachLifecycleFlags.unbindAfterDetached) {
//       while (currentUnmount) {
//         currentUnmount.$unmount(0);
//         currentUnmount = currentUnmount.$nextUnmount;
//       }
//     } else {
//       let nextUnmount: typeof currentUnmount;

//       while (currentUnmount) {
//         currentUnmount.$unmount(0);
//         nextUnmount = currentUnmount.$nextUnmount;
//         currentUnmount.$nextUnmount = null;
//         currentUnmount = nextUnmount;
//       }
//     }
//   }

//   private processDetachedCallbacks(): void {
//     let currentDetached = this.detachedHead;
//     let nextDetached: typeof currentDetached;

//     while (currentDetached) {
//       currentDetached.detached(0);
//       nextDetached = currentDetached.$nextDetached;
//       currentDetached.$nextDetached = null;
//       currentDetached = nextDetached;
//     }

//     if (this.flags & AttachLifecycleFlags.unbindAfterDetached) {
//       let currentUnmount = this.unmountHead;
//       let nextUnmount: typeof currentUnmount;

//       while (currentUnmount) {
//         if (isUnbindable(currentUnmount)) {
//           currentUnmount.$unbind(LifecycleFlags.fromUnbind);
//         }

//         nextUnmount = currentUnmount.$nextUnmount;
//         currentUnmount.$nextUnmount = null;
//         currentUnmount = nextUnmount;
//       }
//     }
//   }
// }

function isUnmountable(requestor: object): requestor is ILifecycleUnmount {
  return '$unmount' in requestor;
}

function isUnbindable(requestor: object): requestor is ILifecycleUnbind {
  return '$unbind' in requestor;
}

// export const AttachLifecycle = {
//   beginAttach(changeSet: IChangeSet, encapsulationSource: INode, flags: AttachLifecycleFlags): IAttachLifecycleController {
//     return new AttachLifecycleController(changeSet, flags, null, encapsulationSource);
//   },

//   beginDetach(changeSet: IChangeSet, flags: AttachLifecycleFlags): IDetachLifecycleController {
//     return new DetachLifecycleController(changeSet, flags);
//   },

//   done: {
//     done: true,
//     canCancel(): boolean { return false; },
//     // tslint:disable-next-line:no-empty
//     cancel(): void {},
//     wait(): Promise<void> { return Promise.resolve(); }
//   }
// };

const marker = PLATFORM.emptyObject as any;

export const Lifecycle = {
  flushing: <boolean>false,
  flushChangesDepth: 0,
  flushChangesHead: <ILifecycleFlushChanges>null,
  flushChangesTail: <ILifecycleFlushChanges>null,
  queueFlushChanges(requestor: ILifecycleFlushChanges, flags: LifecycleFlags): void {
    if (requestor.$nextFlushChanges) {
      return;
    }
    requestor.$flushChangesFlags = flags;
    requestor.$nextFlushChanges = marker;
    if (Lifecycle.flushChangesHead === null) {
      Lifecycle.flushChangesHead = requestor;
    } else {
      Lifecycle.flushChangesTail.$nextFlushChanges = requestor;
    }
    Lifecycle.flushChangesTail = requestor;
    ++Lifecycle.flushChangesDepth;
  },
  unqueueFlushChangesCallbacks(): void {
    if (--Lifecycle.flushChangesDepth === 0) {
      if (Lifecycle.flushing) {
        return;
      }
      while (Lifecycle.flushChangesHead !== null) {
        let current = Lifecycle.flushChangesHead;
        let next: ILifecycleFlushChanges;
        Lifecycle.flushChangesHead = Lifecycle.flushChangesTail = null;
        while (current && current !== marker) {
          current.flushChanges(current.$flushChangesFlags);
          next = current.$nextFlushChanges;
          current.$nextFlushChanges = null;
          current = next;
        }
      }
      if (Lifecycle.boundDepth === 0) {
        Lifecycle.invokeBoundCallbacks();
      }
    }
  },

  boundDepth: 0,
  boundHead: <ILifecycleBound>null,
  boundTail: <ILifecycleBound>null,
  queueBound(requestor: ILifecycleBound, flags: LifecycleFlags): void {
    if (requestor.$nextBound) {
      return;
    }
    requestor.$boundFlags = flags;
    requestor.$nextBound = marker;
    if (Lifecycle.boundHead === null) {
      Lifecycle.boundHead = requestor;
    } else {
      Lifecycle.boundTail.$nextBound = requestor;
    }
    Lifecycle.boundTail = requestor;
    ++Lifecycle.boundDepth;
  },
  unqueueBound(): void {
    if (--Lifecycle.boundDepth === 0) {
      if (Lifecycle.flushChangesDepth > 0) {
        return;
      }
      Lifecycle.invokeBoundCallbacks();
    }
  },
  invokeBoundCallbacks(): void {
    let current = Lifecycle.boundHead;
    let next: ILifecycleBound;
    Lifecycle.boundHead = Lifecycle.boundTail = null;
    while (current && current !== marker) {
      current.bound(current.$boundFlags);
      next = current.$nextBound;
      current.$nextBound = null;
      current = next;
    }
    if (Lifecycle.attachedDepth === 0) {
      Lifecycle.invokeAttachedCallbacks();
    }
  },

  mountDepth: 0,
  mountHead: <ILifecycleMount>null,
  mountTail: <ILifecycleMount>null,
  queueMount(requestor: ILifecycleMount, flags: LifecycleFlags): void {
    if (requestor.$nextMount) {
      return;
    }
    requestor.$mountFlags = flags;
    requestor.$nextMount = marker;
    if (Lifecycle.mountHead === null) {
      Lifecycle.mountHead = requestor;
    } else {
      Lifecycle.mountTail.$nextMount = requestor;
    }
    Lifecycle.mountTail = requestor;
    ++Lifecycle.mountDepth;
  },
  unqueueMount(): void {
    if (--Lifecycle.mountDepth === 0) {
      if (Lifecycle.boundDepth > 0 || Lifecycle.flushChangesDepth > 0) {
        return;
      }
      if (Lifecycle.flushChangesDepth > 0) {
        Lifecycle.unqueueFlushChangesCallbacks();
      }
      Lifecycle.invokeMountCallbacks();
    }
  },
  invokeMountCallbacks(): void {
    let current = Lifecycle.mountHead;
    let next: ILifecycleMount;
    Lifecycle.mountHead = Lifecycle.mountTail = null;
    while (current && current !== marker) {
      current.$mount(current.$mountFlags);
      next = current.$nextMount;
      current.$nextMount = null;
      current = next;
    }
    if (Lifecycle.attachedDepth === 0) {
      Lifecycle.invokeAttachedCallbacks();
    }
  },

  attachedDepth: 0,
  attachedHead: <ILifecycleAttached>null,
  attachedTail: <ILifecycleAttached>null,
  queueAttached(requestor: ILifecycleAttached, flags: LifecycleFlags): void {
    if (requestor.$nextAttached) {
      return;
    }
    requestor.$attachedFlags = flags;
    requestor.$nextAttached = marker;
    if (Lifecycle.attachedHead === null) {
      Lifecycle.attachedHead = requestor;
    } else {
      Lifecycle.attachedTail.$nextAttached = requestor;
    }
    Lifecycle.attachedTail = requestor;
    ++Lifecycle.attachedDepth;
  },
  unqueueAttached(): void {
    if (--Lifecycle.attachedDepth === 0) {
      if (Lifecycle.mountDepth > 0 || Lifecycle.boundDepth > 0 || Lifecycle.flushChangesDepth > 0) {
        return;
      }
      Lifecycle.invokeAttachedCallbacks();
    }
  },
  invokeAttachedCallbacks(): void {
    let current = Lifecycle.attachedHead;
    let next: ILifecycleAttached;
    Lifecycle.attachedHead = Lifecycle.attachedTail = null;
    while (current && current !== marker) {
      current.attached(current.$attachedFlags);
      next = current.$nextAttached;
      current.$nextAttached = null;
      current = next;
    }
  },

  unmountDepth: 0,
  unmountHead: <ILifecycleUnmount>null,
  unmountTail: <ILifecycleUnmount>null,
  queueUnmount(requestor: ILifecycleUnmount, flags: LifecycleFlags): void {
    if (requestor.$nextUnmount) {
      return;
    }
    requestor.$unmountFlags = flags;
    requestor.$nextUnmount = marker;
    if (Lifecycle.unmountHead === null) {
      Lifecycle.unmountHead = requestor;
    } else {
      Lifecycle.unmountTail.$nextUnmount = requestor;
    }
    Lifecycle.unmountTail = requestor;
    ++Lifecycle.unmountDepth;
  },
  unqueueUnmount(): void {
    if (--Lifecycle.unmountDepth === 0) {
      let current = Lifecycle.unmountHead;
      let next: ILifecycleUnmount;
      Lifecycle.unmountHead = Lifecycle.unmountTail = null;
      while (current && current !== marker) {
        current.$unmount(current.$unmountFlags);
        next = current.$nextUnmount;
        current.$nextUnmount = null;
        current = next;
      }
    }
  },

  detachedDepth: 0,
  detachedHead: <ILifecycleDetached>null,
  detachedTail: <ILifecycleDetached>null,
  queueDetached(requestor: ILifecycleDetached, flags: LifecycleFlags): void {
    if (requestor.$nextDetached) {
      return;
    }
    requestor.$detachedFlags = flags;
    requestor.$nextDetached = marker;
    if (Lifecycle.detachedHead === null) {
      Lifecycle.detachedHead = requestor;
    } else {
      Lifecycle.detachedTail.$nextDetached = requestor;
    }
    Lifecycle.detachedTail = requestor;
    ++Lifecycle.detachedDepth;
  },
  unqueueDetached(): void {
    if (--Lifecycle.detachedDepth === 0) {
      let current = Lifecycle.detachedHead;
      let next: ILifecycleDetached;
      Lifecycle.detachedHead = Lifecycle.detachedTail = null;
      while (current && current !== marker) {
        current.detached(current.$detachedFlags);
        next = current.$nextDetached;
        current.$nextDetached = null;
        current = next;
      }
    }
  },

  unboundDepth: 0,
  unboundHead: <ILifecycleUnbound>null,
  unboundTail: <ILifecycleUnbound>null,
  queueUnbound(requestor: ILifecycleUnbound, flags: LifecycleFlags): void {
    if (requestor.$nextUnbound) {
      return;
    }
    requestor.$unboundFlags = flags;
    requestor.$nextUnbound = marker;
    if (Lifecycle.unboundHead === null) {
      Lifecycle.unboundHead = requestor;
    } else {
      Lifecycle.unboundTail.$nextUnbound = requestor;
    }
    Lifecycle.unboundTail = requestor;
    ++Lifecycle.unboundDepth;
  },
  unqueueUnbound(): void {
    if (--Lifecycle.unboundDepth === 0) {
      let current = Lifecycle.unboundHead;
      let next: ILifecycleUnbound;
      Lifecycle.unboundHead = Lifecycle.unboundTail = null;
      while (current && current !== marker) {
        current.unbound(current.$unboundFlags);
        next = current.$nextUnbound;
        current.$nextUnbound = null;
        current = next;
      }
    }
  },
};
