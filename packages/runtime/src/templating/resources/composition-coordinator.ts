import { PLATFORM } from '@aurelia/kernel';
import { INode } from '../../dom';
import { IAttachLifecycle, IDetachLifecycle, ILifecycleTask, AttachLifecycleFlags } from '../../lifecycle';
import { LifecycleFlags, IChangeSet, IScope } from '../../observation';
import { IView } from '../view';

export class CompositionCoordinator {
  public onSwapComplete: () => void = PLATFORM.noop;

  private queue: (IView | PromiseSwap)[] = null;
  private currentView: IView = null;
  //private swapTask: ILifecycleTask = AttachLifecycle.done;
  private encapsulationSource: INode;
  private scope: IScope;
  private isBound: boolean = false;
  private isAttached: boolean = false;

  constructor(public readonly changeSet: IChangeSet) {}

  public compose(value: IView | Promise<IView>): void {
    // if (this.swapTask.done) {
    //   if (value instanceof Promise) {
    //     this.enqueue(new PromiseSwap(this, value));
    //     this.processNext();
    //   } else {
    //     this.swap(value);
    //   }
    // } else {
    //   if (value instanceof Promise) {
    //     this.enqueue(new PromiseSwap(this, value));
    //   } else {
    //     this.enqueue(value);
    //   }

    //   if (this.swapTask.canCancel()) {
    //     this.swapTask.cancel();
    //   }
    // }
  }

  public binding(flags: LifecycleFlags, scope: IScope): void {
    this.scope = scope;
    this.isBound = true;

    if (this.currentView !== null) {
      this.currentView.$bind(flags, scope);
    }
  }

  public attaching(encapsulationSource: INode, flags: LifecycleFlags): void {
    this.encapsulationSource = encapsulationSource;
    this.isAttached = true;

    if (this.currentView !== null) {
      this.currentView.$attach(encapsulationSource, flags);
    }
  }

  public detaching(flags: LifecycleFlags): void {
    this.isAttached = false;

    if (this.currentView !== null) {
      this.currentView.$detach(flags);
    }
  }

  public unbinding(flags: LifecycleFlags): void {
    this.isBound = false;

    if (this.currentView !== null) {
      this.currentView.$unbind(flags);
    }
  }

  public caching(): void {
    this.currentView = null;
  }

  // private enqueue(view: IView | PromiseSwap): void {
  //   if (this.queue === null) {
  //     this.queue = [];
  //   }

  //   this.queue.push(view);
  // }

  // private swap(view: IView): void {
  //   if (this.currentView === view) {
  //     return;
  //   }

  //   const swapTask = new AggregateLifecycleTask();

  //   swapTask.addTask(
  //     this.detachAndUnbindCurrentView(
  //       this.isAttached
  //         ? AttachLifecycleFlags.none
  //         : AttachLifecycleFlags.noTasks
  //     )
  //   );

  //   this.currentView = view;

  //   swapTask.addTask(
  //     this.bindAndAttachCurrentView()
  //   );

  //   if (swapTask.done) {
  //     this.swapTask = AttachLifecycle.done;
  //     this.onSwapComplete();
  //   } else {
  //     this.swapTask = swapTask;
  //     this.swapTask.wait().then(() => {
  //       this.onSwapComplete();
  //       this.processNext();
  //     });
  //   }
  // }

  // private processNext(): void {
  //   if (this.queue !== null && this.queue.length > 0) {
  //     const next = this.queue.pop();
  //     this.queue.length = 0;

  //     if (PromiseSwap.is(next)) {
  //       this.swapTask = next.start();
  //     } else {
  //       this.swap(next);
  //     }
  //   } else {
  //     this.swapTask = AttachLifecycle.done;
  //   }
  // }

  // private detachAndUnbindCurrentView(detachFlags: AttachLifecycleFlags): ILifecycleTask {
  //   if (this.currentView === null) {
  //     return AttachLifecycle.done;
  //   }

  //   return AttachLifecycle.beginDetach(this.changeSet, detachFlags | AttachLifecycleFlags.unbindAfterDetached)
  //     .detach(this.currentView)
  //     .end();
  // }

  // private bindAndAttachCurrentView(): ILifecycleTask {
  //   if (this.currentView === null) {
  //     return AttachLifecycle.done;
  //   }

  //   if (this.isBound) {
  //     this.currentView.$bind(LifecycleFlags.fromBindableHandler, this.scope);
  //   }

  //   if (this.isAttached) {
  //     return AttachLifecycle.beginAttach(this.changeSet, this.encapsulationSource, AttachLifecycleFlags.none)
  //       .attach(this.currentView)
  //       .end();
  //   }

  //   return AttachLifecycle.done;
  // }
}

class PromiseSwap implements ILifecycleTask {
  public done: boolean = false;
  private isCancelled: boolean = false;

  constructor(
    private coordinator: CompositionCoordinator,
    private promise: Promise<IView>
  ) {}

  public static is(object: object): object is PromiseSwap {
    return 'start' in object;
  }

  public start(): ILifecycleTask {
    if (this.isCancelled) {
      //return AttachLifecycle.done;
    }

    this.promise = this.promise.then(x => {
      this.onResolve(x);
      return x;
    });

    return this;
  }

  public canCancel(): boolean {
    return !this.done;
  }

  public cancel(): void {
    if (this.canCancel()) {
      this.isCancelled = true;
    }
  }

  public wait(): Promise<void> {
    return this.promise as any;
  }

  private onResolve(value: any): void {
    if (this.isCancelled) {
      return;
    }

    this.done = true;
    this.coordinator.compose(value);
  }
}
