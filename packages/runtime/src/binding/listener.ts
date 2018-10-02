// tslint:disable:no-any
// tslint:disable:function-name
import { IDisposable, IServiceLocator } from '@aurelia/kernel';
import { INode } from '../dom';
import { IExpression } from './ast';
import { IBinding } from './binding';
import { IScope } from './binding-context';
import { BindingFlags } from './binding-flags';
import { EvaluateVisitor } from './evaluate-visitor';
import { DelegationStrategy, IEventManager } from './event-manager';
import { UnbindVisitor } from './bind-visitor';

export class Listener implements IBinding {
  public $isBound: boolean = false;
  private source: IScope;
  private handler: IDisposable;

  constructor(
    public targetEvent: string,
    public delegationStrategy: DelegationStrategy,
    public sourceExpression: IExpression,
    public target: INode,
    public preventDefault: boolean,
    private eventManager: IEventManager,
    public locator: IServiceLocator
  ) { }

  public callSource(event: Event): any {
    const overrideContext = this.source.overrideContext as any;
    overrideContext['$event'] = event;

    const result = EvaluateVisitor.evaluate(BindingFlags.mustEvaluate, this.source, this.locator, this.sourceExpression);

    delete overrideContext['$event'];

    if (result !== true && this.preventDefault) {
      event.preventDefault();
    }

    return result;
  }

  public handleEvent(event: Event): void {
    this.callSource(event);
  }

  public $bind(flags: BindingFlags, source: IScope): void {
    if (this.$isBound) {
      if (this.source === source) {
        return;
      }

      this.$unbind(flags);
    }

    this.$isBound = true;
    this.source = source;

    UnbindVisitor.bind(flags, this.source, <any>this, this.sourceExpression);

    this.handler = this.eventManager.addEventListener(
      this.target,
      this.targetEvent,
      this,
      this.delegationStrategy
    );
  }

  public $unbind(flags: BindingFlags): void {
    if (!this.$isBound) {
      return;
    }

    this.$isBound = false;

    UnbindVisitor.unbind(flags, this.source, <any>this, this.sourceExpression);

    this.source = null;
    this.handler.dispose();
    this.handler = null;
  }

  // tslint:disable-next-line:no-empty
  public observeProperty(): void { }
}
