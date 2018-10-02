import { IIndexable, IServiceLocator } from '@aurelia/kernel';
import { AccessKeyed, AccessMember, AccessScope, AccessThis, ArrayBindingPattern, ArrayLiteral, Assign, Binary, BindingBehavior, BindingIdentifier, CallFunction, CallMember, CallScope, Conditional, ForOfStatement, HtmlLiteral, IExpression, Interpolation, IVisitor, ObjectBindingPattern, ObjectLiteral, PrimitiveLiteral, TaggedTemplate, Template, Unary, ValueConverter } from './ast';
import { Binding } from './binding';
import { IScope } from './binding-context';
import { BindingFlags } from './binding-flags';
import { EvaluateVisitor } from './evaluate-visitor';
import { ISignaler } from './signaler';

// tslint:disable:no-this-assignment
// tslint:disable:no-empty
export class BindVisitor implements IVisitor<void> {
  private static cache: BindVisitor[] = [];
  public flags: BindingFlags;
  public scope: IScope;
  public binding: Binding;
  private constructor() { }
  public static bind(flags: BindingFlags, scope: IScope, binding: Binding, expr?: IExpression): void {
    let visitor: BindVisitor;
    if (this.cache.length) {
      visitor = this.cache.pop();
    } else {
      visitor = new BindVisitor();
    }
    visitor.flags = flags;
    visitor.scope = scope;
    visitor.binding = binding;
    (expr || binding.sourceExpression).accept(visitor);
    visitor.flags = null;
    visitor.scope = null;
    visitor.binding = null;
    this.cache.push(visitor);
  }

  public visitAccessKeyed(expr: AccessKeyed): void {
    expr.object.accept(this);
    expr.key.accept(this);
  }

  public visitAccessMember(expr: AccessMember): void {
    expr.object.accept(this);
  }

  public visitAccessScope(expr: AccessScope): void { }

  public visitAccessThis(expr: AccessThis): void { }

  public visitArrayBindingPattern(expr: ArrayBindingPattern): void { }

  public visitArrayLiteral(expr: ArrayLiteral): void {
    this.visitList(expr.elements);
  }

  public visitAssign(expr: Assign): void { }

  public visitBinary(expr: Binary): void {
    expr.left.accept(this);
    expr.right.accept(this);
  }

  public visitBindingBehavior(expr: BindingBehavior): void {
    expr.expression.accept(this);
    const behaviorKey = expr.behaviorKey;
    const locator = this.binding.locator;
    const behavior = locator.get(behaviorKey) as BindingBehavior;
    if (!behavior) {
      throw new Error(`No BindingBehavior named "${expr.name}" was found!`);
    }
    if ((this.binding as any)[behaviorKey]) {
      throw new Error(`A binding behavior named "${expr.name}" has already been applied to "${expr.expression}"`);
    }
    this.binding[behaviorKey] = behavior;
    behavior['bind'].apply(behavior, [this.flags, this.scope, this.binding].concat(evalList(this.flags, this.scope, locator, expr.args)));
  }

  public visitBindingIdentifier(expr: BindingIdentifier): void { }

  public visitCallFunction(expr: CallFunction): void {
    expr.func.accept(this);
    this.visitList(expr.args);
  }

  public visitCallMember(expr: CallMember): void {
    expr.object.accept(this);
    this.visitList(expr.args);
  }

  public visitCallScope(expr: CallScope): void {
    this.visitList(expr.args);
  }

  public visitConditional(expr: Conditional): void {
    expr.condition.accept(this);
    expr.yes.accept(this);
    expr.no.accept(this);
  }

  public visitForOfStatement(expr: ForOfStatement): void {
    expr.declaration.accept(this);
    expr.iterable.accept(this);
  }

  public visitHtmlLiteral(expr: HtmlLiteral): void {
    this.visitList(expr.parts);
  }

  public visitInterpolation(expr: Interpolation): void {
    this.visitList(expr.expressions);
  }

  public visitObjectBindingPattern(expr: ObjectBindingPattern): void { }

  public visitObjectLiteral(expr: ObjectLiteral): void {
    this.visitList(expr.values);
  }

  public visitPrimitiveLiteral(expr: PrimitiveLiteral): void { }

  public visitTaggedTemplate(expr: TaggedTemplate): void {
    this.visitList(expr.expressions);
    expr.func.accept(this);
  }

  public visitTemplate(expr: Template): void {
    this.visitList(expr.expressions);
  }

  public visitUnary(expr: Unary): void {
    expr.expression.accept(this);
  }

  public visitValueConverter(expr: ValueConverter): void {
    expr.expression.accept(this);
    this.visitList(expr.args);
  }

  private visitList(elements: ArrayLike<IExpression>): void {
    if (!elements || !elements.length) {
      return;
    }
    for (let i = 0, ii = elements.length; i < ii; ++i) {
      elements[i].accept(this);
    }
  }

}

export class UnbindVisitor implements IVisitor<void> {
  private static cache: UnbindVisitor[] = [];
  public flags: BindingFlags;
  public scope: IScope;
  public binding: Binding;
  private constructor() { }
  public static unbind(flags: BindingFlags, scope: IScope, binding: Binding, expr?: IExpression): void {
    let visitor: UnbindVisitor;
    if (this.cache.length) {
      visitor = this.cache.pop();
    } else {
      visitor = new UnbindVisitor();
    }
    visitor.flags = flags;
    visitor.scope = scope;
    visitor.binding = binding;
    (expr || binding.sourceExpression).accept(visitor);
    visitor.flags = null;
    visitor.scope = null;
    visitor.binding = null;
    this.cache.push(visitor);
  }

  public visitAccessKeyed(expr: AccessKeyed): void {
    expr.object.accept(this);
    expr.key.accept(this);
  }

  public visitAccessMember(expr: AccessMember): void {
    expr.object.accept(this);
  }

  public visitAccessScope(expr: AccessScope): void { }

  public visitAccessThis(expr: AccessThis): void { }

  public visitArrayBindingPattern(expr: ArrayBindingPattern): void { }

  public visitArrayLiteral(expr: ArrayLiteral): void {
    this.visitList(expr.elements);
  }

  public visitAssign(expr: Assign): void { }

  public visitBinary(expr: Binary): void {
    expr.left.accept(this);
    expr.right.accept(this);
  }

  public visitBindingBehavior(expr: BindingBehavior): void {
    const behaviorKey = expr.behaviorKey;
    this.binding[behaviorKey].unbind(this.flags, this.scope, this.binding);
    this.binding[behaviorKey] = null;
    expr.expression.accept(this);
  }

  public visitBindingIdentifier(expr: BindingIdentifier): void { }

  public visitCallFunction(expr: CallFunction): void {
    expr.func.accept(this);
    this.visitList(expr.args);
  }

  public visitCallMember(expr: CallMember): void {
    expr.object.accept(this);
    this.visitList(expr.args);
  }

  public visitCallScope(expr: CallScope): void {
    this.visitList(expr.args);
  }

  public visitConditional(expr: Conditional): void {
    expr.condition.accept(this);
    expr.yes.accept(this);
    expr.no.accept(this);
  }

  public visitForOfStatement(expr: ForOfStatement): void {
    expr.declaration.accept(this);
    expr.iterable.accept(this);
  }

  public visitHtmlLiteral(expr: HtmlLiteral): void {
    this.visitList(expr.parts);
  }

  public visitInterpolation(expr: Interpolation): void {
    this.visitList(expr.expressions);
  }

  public visitObjectBindingPattern(expr: ObjectBindingPattern): void { }

  public visitObjectLiteral(expr: ObjectLiteral): void {
    this.visitList(expr.values);
  }

  public visitPrimitiveLiteral(expr: PrimitiveLiteral): void { }

  public visitTaggedTemplate(expr: TaggedTemplate): void {
    this.visitList(expr.expressions);
    expr.func.accept(this);
  }

  public visitTemplate(expr: Template): void {
    this.visitList(expr.expressions);
  }

  public visitUnary(expr: Unary): void {
    expr.expression.accept(this);
  }

  public visitValueConverter(expr: ValueConverter): void {
    const locator = this.binding.locator;
    const converter = locator.get(expr.converterKey);
    const signals = (converter as any).signals;
    if (signals !== undefined) {
      const signaler = locator.get(ISignaler) as ISignaler;
      for (let i = 0, ii = signals.length; i < ii; ++i) {
        signaler.removeSignalListener(signals[i], this.binding as any);
      }
    }
    expr.expression.accept(this);
    this.visitList(expr.args);
  }

  private visitList(elements: ArrayLike<IExpression>): void {
    if (!elements || !elements.length) {
      return;
    }
    for (let i = 0, ii = elements.length; i < ii; ++i) {
      elements[i].accept(this);
    }
  }

}

/// Evaluate the [list] in context of the [scope].
function evalList(flags: BindingFlags, scope: IScope, locator: IServiceLocator, list: ReadonlyArray<IExpression>): any[] {
  const len = list.length;
  const result = Array(len);
  for (let i = 0; i < len; ++i) {
    result[i] = EvaluateVisitor.evaluate(flags, scope, locator, list[i]);
  }
  return result;
}
