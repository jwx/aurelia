import { IIndexable } from '@aurelia/kernel';
import { AccessKeyed, AccessMember, AccessScope, AccessThis, ArrayBindingPattern, ArrayLiteral, Assign, Binary, BindingBehavior, BindingIdentifier, CallFunction, CallMember, CallScope, Conditional, ForOfStatement, HtmlLiteral, IExpression, Interpolation, IVisitor, ObjectBindingPattern, ObjectLiteral, PrimitiveLiteral, TaggedTemplate, Template, Unary, ValueConverter } from './ast';
import { Binding } from './binding';
import { BindingContext, IScope } from './binding-context';
import { BindingFlags } from './binding-flags';
import { EvaluateVisitor } from './evaluate-visitor';
import { ISignaler } from './signaler';

// tslint:disable:no-this-assignment
// tslint:disable:no-empty
export class ConnectVisitor implements IVisitor<void> {
  private static cache: ConnectVisitor[] = [];
  public flags: BindingFlags;
  public scope: IScope;
  public binding: Binding;
  private constructor() { }
  public static connect(flags: BindingFlags, scope: IScope, binding: Binding, expr?: IExpression): void {
    let visitor: ConnectVisitor;
    if (this.cache.length) {
      visitor = this.cache.pop();
    } else {
      visitor = new ConnectVisitor();
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
    const obj = EvaluateVisitor.evaluate(this.flags, this.scope, null, expr.object);
    expr.object.accept(this);
    if (typeof obj === 'object' && obj !== null) {
      expr.key.accept(this);
      const key = EvaluateVisitor.evaluate(this.flags, this.scope, null, expr.key);
      // observe the property represented by the key as long as it's not an array indexer
      // (note: string indexers behave the same way as numeric indexers as long as they represent numbers)
      if (!(Array.isArray(obj) && isNumeric(key))) {
        this.binding.observeProperty(obj, key);
      }
    }
  }

  public visitAccessMember(expr: AccessMember): void {
    const obj = EvaluateVisitor.evaluate(this.flags, this.scope, null, expr.object);
    expr.object.accept(this);
    if (obj) {
      this.binding.observeProperty(obj, expr.name);
    }
  }

  public visitAccessScope(expr: AccessScope): void {
    const context = BindingContext.get(this.scope, expr.name, expr.ancestor);
    this.binding.observeProperty(context, expr.name);
  }

  public visitAccessThis(expr: AccessThis): void { }

  public visitArrayBindingPattern(expr: ArrayBindingPattern): void { }

  public visitArrayLiteral(expr: ArrayLiteral): void {
    this.visitList(expr.elements);
  }

  public visitAssign(expr: Assign): void { }

  public visitBinary(expr: Binary): void {
    const left = EvaluateVisitor.evaluate(this.flags, this.scope, null, expr.left);
    expr.left.accept(this);
    if (expr.operation === '&&' && !left || expr.operation === '||' && left) {
      return;
    }
    expr.right.accept(this);
  }

  public visitBindingBehavior(expr: BindingBehavior): void {
    expr.expression.accept(this);
  }

  public visitBindingIdentifier(expr: BindingIdentifier): void { }

  public visitCallFunction(expr: CallFunction): void {
    const func = EvaluateVisitor.evaluate(this.flags, this.scope, null, expr.func);
    expr.func.accept(this);
    if (typeof func === 'function') {
      this.visitList(expr.args);
    }
  }

  public visitCallMember(expr: CallMember): void {
    const obj = EvaluateVisitor.evaluate(this.flags, this.scope, null, expr.object);
    expr.object.accept(this);
    if (getFunction(this.flags & ~BindingFlags.mustEvaluate, obj, expr.name)) {
      this.visitList(expr.args);
    }
  }

  public visitCallScope(expr: CallScope): void {
    this.visitList(expr.args);
  }

  public visitConditional(expr: Conditional): void {
    if (EvaluateVisitor.evaluate(this.flags, this.scope, null, expr.condition)) {
      expr.yes.accept(this);
    } else {
      expr.no.accept(this);
    }
    expr.condition.accept(this);
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
    const converter = locator.get(expr.converterKey) as ISignaler;
    if (!converter) {
      throw new Error(`No ValueConverter named "${expr.name}" was found!`);
    }
    this.visitList(expr.args);
    expr.expression.accept(this);
    // tslint:disable-next-line:no-any
    const signals = (converter as any).signals;
    if (signals === undefined) {
      return;
    }
    const signaler = locator.get(ISignaler) as ISignaler;
    for (let i = 0, ii = signals.length; i < ii; ++i) {
      signaler.addSignalListener(signals[i], this.binding);
    }
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

function getFunction(flags: BindingFlags, obj: IIndexable, name: string): Function {
  const func = obj === null || obj === undefined ? null : obj[name];
  if (typeof func === 'function') {
    return func;
  }
  if (!(flags & BindingFlags.mustEvaluate) && (func === null || func === undefined)) {
    return null;
  }
  throw new Error(`${name} is not a function`);
}

function isNumeric(value: string): boolean {
  // tslint:disable-next-line:no-reserved-keywords
  const type = typeof value;
  if (type === 'number') return true;
  if (type !== 'string') return false;
  const len = value.length;
  if (len === 0) return false;
  for (let i = 0; i < len; ++i) {
    const char = value.charCodeAt(i);
    if (char < 0x30 /*0*/ || char > 0x39/*9*/) {
      return false;
    }
  }
  return true;
}
