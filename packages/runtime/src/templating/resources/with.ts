import { inject } from '@aurelia/kernel';
import { Scope } from '../../binding/binding-context';
import { IRenderLocation } from '../../dom';
import { IAttachLifecycle, IDetachLifecycle, LifecycleState } from '../../lifecycle';
import { LifecycleFlags } from '../../observation';
import { bindable } from '../bindable';
import { ICustomAttribute, templateController } from '../custom-attribute';
import { IView, IViewFactory } from '../view';

export interface With extends ICustomAttribute {}
@templateController('with')
@inject(IViewFactory, IRenderLocation)
export class With {
  @bindable public value: any = null;

  private currentView: IView = null;

  constructor(private factory: IViewFactory, location: IRenderLocation) {
    this.currentView = this.factory.create();
    this.currentView.hold(location);
  }

  public valueChanged(this: With): void {
    if (this.$state & LifecycleState.isBound) {
      this.bindChild(LifecycleFlags.fromBindableHandler);
    }
  }

  public binding(flags: LifecycleFlags): void {
    this.bindChild(flags);
  }

  public attaching(encapsulationSource: any, flags: LifecycleFlags): void {
    this.currentView.$attach(encapsulationSource, flags);
  }

  public detaching(flags: LifecycleFlags): void {
    this.currentView.$detach(flags);
  }

  public unbinding(flags: LifecycleFlags): void {
    this.currentView.$unbind(flags);
  }

  private bindChild(flags: LifecycleFlags): void {
    this.currentView.$bind(
      flags,
      Scope.fromParent(this.$scope, this.value)
    );
  }
}
