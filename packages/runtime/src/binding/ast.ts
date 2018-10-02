// tslint:disable:no-any
// tslint:disable:function-name
// tslint:disable:no-empty
import { IServiceLocator, PLATFORM } from '@aurelia/kernel';
import { IBinding } from './binding';
import { BindingBehaviorResource } from './binding-behavior';
import { BindingContext, IScope } from './binding-context';
import { BindingFlags } from './binding-flags';
import { Collection } from './observation';
import { ISignaler } from './signaler';
import { ValueConverterResource } from './value-converter';
import { EvaluateVisitor } from './evaluate-visitor';

export type IsPrimary = AccessThis | AccessScope | ArrayLiteral | ObjectLiteral | PrimitiveLiteral | Template;
export type IsUnary = IsPrimary | Unary;
export type IsLeftHandSide = IsUnary | CallFunction | CallMember | CallScope | AccessMember | AccessKeyed | TaggedTemplate;
export type IsBinary = IsLeftHandSide | Binary;
export type IsConditional = IsBinary | Conditional;
export type IsAssign = IsConditional | Assign;
export type IsValueConverter = IsAssign | ValueConverter;
export type IsBindingBehavior = IsValueConverter | BindingBehavior;
export type IsAssignable = AccessScope | AccessKeyed | AccessMember;

export interface IVisitor<T = any> {
  visitAccessKeyed(expr: AccessKeyed): T;
  visitAccessMember(expr: AccessMember): T;
  visitAccessScope(expr: AccessScope): T;
  visitAccessThis(expr: AccessThis): T;
  visitArrayBindingPattern(expr: ArrayBindingPattern): T;
  visitArrayLiteral(expr: ArrayLiteral): T;
  visitAssign(expr: Assign): T;
  visitBinary(expr: Binary): T;
  visitBindingBehavior(expr: BindingBehavior): T;
  visitBindingIdentifier(expr: BindingIdentifier): T;
  visitCallFunction(expr: CallFunction): T;
  visitCallMember(expr: CallMember): T;
  visitCallScope(expr: CallScope): T;
  visitConditional(expr: Conditional): T;
  visitForOfStatement(expr: ForOfStatement): T;
  visitHtmlLiteral(expr: HtmlLiteral): T;
  visitInterpolation(expr: Interpolation): T;
  visitObjectBindingPattern(expr: ObjectBindingPattern): T;
  visitObjectLiteral(expr: ObjectLiteral): T;
  visitPrimitiveLiteral(expr: PrimitiveLiteral): T;
  visitTaggedTemplate(expr: TaggedTemplate): T;
  visitTemplate(expr: Template): T;
  visitUnary(expr: Unary): T;
  visitValueConverter(expr: ValueConverter): T;
}

export interface IExpression {
  readonly $kind: ExpressionKind;
  accept<T = any>(visitor: IVisitor<T>): T;
  assign?(flags: BindingFlags, scope: IScope, locator: IServiceLocator | null, value: any): any;
  bind?(flags: BindingFlags, scope: IScope, binding: IBinding): void;
  unbind?(flags: BindingFlags, scope: IScope, binding: IBinding): void;
}

export const enum ExpressionKind {
  IsPrimary            = 0b00000001_00000,
  IsLeftHandSide       = 0b00000010_00000,
  IsAssignable         = 0b00000100_00000,
  IsExpression         = 0b00001000_00000,
  IsResource           = 0b00010000_00000,
  IsStatement          = 0b00100000_00000,
  IsDestructuring      = 0b01000000_00000,
  IsForDeclaration     = 0b10000000_00000,
  Type                 = 0b00000000_11111,
  AccessThis           = 0b00001001_00001,
  AccessScope          = 0b00001101_00010,
  ArrayLiteral         = 0b00001001_00011,
  ObjectLiteral        = 0b00001001_00100,
  PrimitiveLiteral     = 0b00001001_00101,
  Template             = 0b00001001_00110,
  Unary                = 0b00001000_00111,
  CallScope            = 0b00001010_01000,
  CallMember           = 0b00001010_01001,
  CallFunction         = 0b00001010_01010,
  AccessMember         = 0b00001110_01011,
  AccessKeyed          = 0b00001110_01100,
  TaggedTemplate       = 0b00001010_01101,
  Binary               = 0b00001000_01110,
  Conditional          = 0b00001000_11111,
  Assign               = 0b00001000_10000,
  ValueConverter       = 0b00010000_10001,
  BindingBehavior      = 0b00010000_10010,
  HtmlLiteral          = 0b00000000_10011,
  ArrayBindingPattern  = 0b11000000_10100,
  ObjectBindingPattern = 0b11000000_10101,
  BindingIdentifier    = 0b10000000_10110,
  ForOfStatement       = 0b00100000_10111,
  Interpolation        = 0b00001000_11000
}

export class BindingBehavior implements IExpression {
  public $kind: ExpressionKind;
  private behaviorKey: string;
  private expressionHasBind: boolean;
  private expressionHasUnbind: boolean;
  constructor(public expression: IsBindingBehavior, public name: string, public args: IsAssign[]) {
    this.behaviorKey = BindingBehaviorResource.keyFrom(this.name);
    if ((<any>expression).expression) {
      this.expressionHasBind = !!(<any>expression).bind;
      this.expressionHasUnbind = !!(<any>expression).unbind;
    } else {
      this.expressionHasBind = false;
      this.expressionHasUnbind = false;
    }
  }

  public assign(flags: BindingFlags, scope: IScope, locator: IServiceLocator, value: any): any {
    return (<any>this.expression).assign(flags, scope, locator, value);
  }

  public bind(flags: BindingFlags, scope: IScope, binding: IBinding): void {
    if (this.expressionHasBind) {
      (<any>this.expression).bind(flags, scope, binding);
    }
    const behaviorKey = this.behaviorKey;
    const locator = binding.locator;
    const behavior = locator.get(behaviorKey) as BindingBehavior;
    if (!behavior) {
      throw new Error(`No BindingBehavior named "${this.name}" was found!`);
    }
    if ((binding as any)[behaviorKey]) {
      throw new Error(`A binding behavior named "${this.name}" has already been applied to "${this.expression}"`);
    }
    binding[behaviorKey] = behavior;
    behavior.bind.apply(behavior, [flags, scope, binding].concat(evalList(flags, scope, locator, this.args)));
  }

  public unbind(flags: BindingFlags, scope: IScope, binding: IBinding): void {
    const behaviorKey = this.behaviorKey;
    binding[behaviorKey].unbind(flags, scope, binding);
    binding[behaviorKey] = null;
    if (this.expressionHasUnbind) {
      (<any>this.expression).unbind(flags, scope, binding);
    }
  }

  public accept<T>(visitor: IVisitor<T>): T {
    return visitor.visitBindingBehavior(this);
  }
}

export class ValueConverter implements IExpression {
  public $kind: ExpressionKind;
  public converterKey: string;
  constructor(public expression: IsValueConverter, public name: string, public args: IsAssign[]) {
    this.converterKey = ValueConverterResource.keyFrom(this.name);
  }

  public assign(flags: BindingFlags, scope: IScope, locator: IServiceLocator, value: any): any {
    const converter = locator.get(this.converterKey);
    if (!converter) {
      throw new Error(`No ValueConverter named "${this.name}" was found!`);
    }
    if ('fromView' in converter) {
      value = (<any>converter).fromView.apply(converter, [value].concat(evalList(flags, scope, locator, this.args)));
    }
    return (<any>this.expression).assign(flags, scope, locator, value);
  }

  public unbind(flags: BindingFlags, scope: IScope, binding: IBinding): void {
    const locator = binding.locator;
    const converter = locator.get(this.converterKey);
    const signals = (converter as any).signals;
    if (signals === undefined) {
      return;
    }
    const signaler = locator.get(ISignaler) as ISignaler;
    for (let i = 0, ii = signals.length; i < ii; ++i) {
      signaler.removeSignalListener(signals[i], binding as any);
    }
  }

  public accept<T>(visitor: IVisitor<T>): T {
    return visitor.visitValueConverter(this);
  }
}

export class Assign implements IExpression {
  public $kind: ExpressionKind;
  constructor(public target: IsAssignable, public value: IsAssign) { }

  public assign(flags: BindingFlags, scope: IScope, locator: IServiceLocator, value: any): any {
    (<any>this.value).assign(flags, scope, locator, value);
    this.target.assign(flags, scope, locator, value);
  }

  public accept<T>(visitor: IVisitor<T>): T {
    return visitor.visitAssign(this);
  }
}

export class Conditional implements IExpression {
  public $kind: ExpressionKind;
  public assign: IExpression['assign'];
  constructor(public condition: IExpression, public yes: IExpression, public no: IExpression) { }

  public accept<T>(visitor: IVisitor<T>): T {
    return visitor.visitConditional(this);
  }
}

export class AccessThis implements IExpression {
  public $kind: ExpressionKind;
  public assign: IExpression['assign'];
  constructor(public ancestor: number = 0) { }

  public accept<T>(visitor: IVisitor<T>): T {
    return visitor.visitAccessThis(this);
  }
}

export class AccessScope implements IExpression {
  public $kind: ExpressionKind;
  constructor(public name: string, public ancestor: number = 0) { }

  public assign(flags: BindingFlags, scope: IScope, locator: IServiceLocator, value: any): any {
    const name = this.name;
    const context = BindingContext.get(scope, name, this.ancestor);
    return context ? (context[name] = value) : undefined;
  }

  public accept<T>(visitor: IVisitor<T>): T {
    return visitor.visitAccessScope(this);
  }
}

export class AccessMember implements IExpression {
  public $kind: ExpressionKind;
  constructor(public object: IExpression, public name: string) { }

  public assign(flags: BindingFlags, scope: IScope, locator: IServiceLocator, value: any): any {
    let instance = EvaluateVisitor.evaluate(flags, scope, locator, this.object);
    if (instance === null || typeof instance !== 'object') {
      instance = {};
      this.object.assign(flags, scope, locator, instance);
    }
    instance[this.name] = value;
    return value;
  }

  public accept<T>(visitor: IVisitor<T>): T {
    return visitor.visitAccessMember(this);
  }
}

export class AccessKeyed implements IExpression {
  public $kind: ExpressionKind;
  constructor(public object: IExpression, public key: IExpression) { }

  public assign(flags: BindingFlags, scope: IScope, locator: IServiceLocator, value: any | null): any {
    const instance = EvaluateVisitor.evaluate(flags, scope, locator, this.object);
    const key = EvaluateVisitor.evaluate(flags, scope, locator, this.key);
    return instance[key] = value;
  }

  public accept<T>(visitor: IVisitor<T>): T {
    return visitor.visitAccessKeyed(this);
  }
}

export class CallScope implements IExpression {
  public $kind: ExpressionKind;
  public assign: IExpression['assign'];
  constructor(public name: string, public args: ReadonlyArray<IExpression>, public ancestor: number = 0) { }

  public accept<T>(visitor: IVisitor<T>): T {
    return visitor.visitCallScope(this);
  }
}

export class CallMember implements IExpression {
  public $kind: ExpressionKind;
  public assign: IExpression['assign'];
  constructor(public object: IExpression, public name: string, public args: ReadonlyArray<IExpression>) { }

  public accept<T>(visitor: IVisitor<T>): T {
    return visitor.visitCallMember(this);
  }
}

export class CallFunction implements IExpression {
  public $kind: ExpressionKind;
  public assign: IExpression['assign'];
  constructor(public func: IExpression, public args: IExpression[]) { }

  public accept<T>(visitor: IVisitor<T>): T {
    return visitor.visitCallFunction(this);
  }
}

export class Binary implements IExpression {
  public $kind: ExpressionKind;
  public assign: IExpression['assign'];
  constructor(public operation: string, public left: IExpression, public right: IExpression) {
  }

  // tslint:disable-next-line:member-ordering
  public accept<T>(visitor: IVisitor<T>): T {
    return visitor.visitBinary(this);
  }
}

export class Unary {
  public $kind: ExpressionKind;
  constructor(public operation: 'void' | 'typeof' | '!' | '-' | '+', public expression: IsLeftHandSide) {
  }

  // tslint:disable-next-line:member-ordering
  public accept<T>(visitor: IVisitor<T>): T {
    return visitor.visitUnary(this);
  }
}

export class PrimitiveLiteral implements IExpression {
  public $kind: ExpressionKind;
  public assign: IExpression['assign'];
  constructor(public value: any) { }

  public accept<T>(visitor: IVisitor<T>): T {
    return visitor.visitPrimitiveLiteral(this);
  }
}

export class HtmlLiteral implements IExpression {
  public $kind: ExpressionKind;
  public assign: IExpression['assign'];
  constructor(public parts: IExpression[]) { }

  public accept<T>(visitor: IVisitor<T>): T {
    return visitor.visitHtmlLiteral(this);
  }
}

export class ArrayLiteral implements IExpression {
  public $kind: ExpressionKind;
  public assign: IExpression['assign'];
  constructor(public elements: IExpression[]) { }

  public accept<T>(visitor: IVisitor<T>): T {
    return visitor.visitArrayLiteral(this);
  }
}

export class ObjectLiteral implements IExpression {
  public $kind: ExpressionKind;
  public assign: IExpression['assign'];
  constructor(public keys: (number | string)[], public values: IExpression[]) { }

  public accept<T>(visitor: IVisitor<T>): T {
    return visitor.visitObjectLiteral(this);
  }
}

export class Template implements IExpression {
  public $kind: ExpressionKind;
  public assign: IExpression['assign'];
  constructor(public cooked: string[], public expressions?: IsAssign[]) {
    this.expressions = expressions || [];
  }

  public accept<T>(visitor: IVisitor<T>): T {
    return visitor.visitTemplate(this);
  }
}

export class TaggedTemplate implements IExpression {
  public $kind: ExpressionKind;
  public assign: IExpression['assign'];
  constructor(
    public cooked: string[] & { raw?: string[] },
    raw: string[],
    public func: IsLeftHandSide,
    public expressions?: IsAssign[]) {
    cooked.raw = raw;
    this.expressions = expressions || [];
  }

  public accept<T>(visitor: IVisitor<T>): T {
    return visitor.visitTaggedTemplate(this);
  }
}

export class ArrayBindingPattern implements IExpression {
  public $kind: ExpressionKind;
  // We'll either have elements, or keys+values, but never all 3
  constructor(
    public elements: IsAssign[]
  ) { }

  public assign(flags: BindingFlags, scope: IScope, locator: IServiceLocator, obj: any): any {
    // TODO
  }

  public accept<T>(visitor: IVisitor<T>): T {
    return visitor.visitArrayBindingPattern(this);
  }
}

export class ObjectBindingPattern implements IExpression {
  public $kind: ExpressionKind;
  // We'll either have elements, or keys+values, but never all 3
  constructor(
    public keys: (string | number)[],
    public values: IsAssign[]
  ) { }

  public assign(flags: BindingFlags, scope: IScope, locator: IServiceLocator, obj: any): any {
    // TODO
  }

  public accept<T>(visitor: IVisitor<T>): T {
    return visitor.visitObjectBindingPattern(this);
  }
}

export class BindingIdentifier implements IExpression {
  public $kind: ExpressionKind;
  public name: string;
  constructor(name: string) {
    this.name = name;
  }

  public accept<T>(visitor: IVisitor<T>): T {
    return visitor.visitBindingIdentifier(this);
  }
}

export type BindingIdentifierOrPattern = BindingIdentifier | ArrayBindingPattern | ObjectBindingPattern;

const toStringTag = Object.prototype.toString;

// https://tc39.github.io/ecma262/#sec-iteration-statements
// https://tc39.github.io/ecma262/#sec-for-in-and-for-of-statements
export class ForOfStatement implements IExpression {
  public $kind: ExpressionKind;
  public declaration: BindingIdentifierOrPattern;
  public iterable: IsBindingBehavior;
  constructor(declaration: BindingIdentifierOrPattern, iterable: IsBindingBehavior) {
    this.declaration = declaration;
    this.iterable = iterable;
  }

  public count(result: any): number {
    return CountForOfStatement[toStringTag.call(result)](result);
  }

  public iterate(result: any, func: (arr: Collection, index: number, item: any) => void): void {
    IterateForOfStatement[toStringTag.call(result)](result, func);
  }

  public accept<T>(visitor: IVisitor<T>): T {
    return visitor.visitForOfStatement(this);
  }
}

/*
* Note: this implementation is far simpler than the one in vCurrent and might be missing important stuff (not sure yet)
* so while this implementation is identical to Template and we could reuse that one, we don't want to lock outselves in to potentially the wrong abstraction
* but this class might be a candidate for removal if it turns out it does provide all we need
*/
export class Interpolation implements IExpression {
  public $kind: ExpressionKind;
  public assign: IExpression['assign'];
  constructor(public parts: string[], public expressions: IExpression[]) { }

  public accept<T>(visitor: IVisitor<T>): T {
    return visitor.visitInterpolation(this);
  }
}



/*
* Note: for a property that is always the same, directly assigning it to the prototype is more efficient CPU wise
* (gets assigned once, instead of per constructor call) as well as memory wise (stored once, instead of per instance)
*
* This gives us a cheap way to add some extra information to the AST for the runtime to do things more efficiently.
*/
BindingBehavior.prototype.$kind = ExpressionKind.BindingBehavior;
ValueConverter.prototype.$kind = ExpressionKind.ValueConverter;
Assign.prototype.$kind = ExpressionKind.Assign;
Conditional.prototype.$kind = ExpressionKind.Conditional;
AccessThis.prototype.$kind = ExpressionKind.AccessThis;
AccessScope.prototype.$kind = ExpressionKind.AccessScope;
AccessMember.prototype.$kind = ExpressionKind.AccessMember;
AccessKeyed.prototype.$kind = ExpressionKind.AccessKeyed;
CallScope.prototype.$kind = ExpressionKind.CallScope;
CallMember.prototype.$kind = ExpressionKind.CallMember;
CallFunction.prototype.$kind = ExpressionKind.CallFunction;
Binary.prototype.$kind = ExpressionKind.Binary;
Unary.prototype.$kind = ExpressionKind.Unary;
PrimitiveLiteral.prototype.$kind = ExpressionKind.PrimitiveLiteral;
HtmlLiteral.prototype.$kind = ExpressionKind.HtmlLiteral;
ArrayLiteral.prototype.$kind = ExpressionKind.ArrayLiteral;
ObjectLiteral.prototype.$kind = ExpressionKind.ObjectLiteral;
Template.prototype.$kind = ExpressionKind.Template;
TaggedTemplate.prototype.$kind = ExpressionKind.TaggedTemplate;
ArrayBindingPattern.prototype.$kind = ExpressionKind.ArrayBindingPattern;
ObjectBindingPattern.prototype.$kind = ExpressionKind.ObjectBindingPattern;
BindingIdentifier.prototype.$kind = ExpressionKind.BindingIdentifier;
ForOfStatement.prototype.$kind = ExpressionKind.ForOfStatement;
Interpolation.prototype.$kind = ExpressionKind.Interpolation;

/// Evaluate the [list] in context of the [scope].
function evalList(flags: BindingFlags, scope: IScope, locator: IServiceLocator, list: ReadonlyArray<IExpression>): any[] {
  const len = list.length;
  const result = Array(len);
  for (let i = 0; i < len; ++i) {
    result[i] = EvaluateVisitor.evaluate(flags, scope, locator, list[i]);
  }
  return result;
}


/*@internal*/
export const IterateForOfStatement = {
  ['[object Array]'](result: any[], func: (arr: Collection, index: number, item: any) => void): void {
    for (let i = 0, ii = result.length; i < ii; ++i) {
      func(result, i, result[i]);
    }
  },
  ['[object Map]'](result: Map<any, any>, func: (arr: Collection, index: number, item: any) => void): void {
    const arr = Array(result.size);
    let i = -1;
    for (const entry of result.entries()) {
      arr[++i] = entry;
    }
    IterateForOfStatement['[object Array]'](arr, func);
  },
  ['[object Set]'](result: Set<any>, func: (arr: Collection, index: number, item: any) => void): void {
    const arr = Array(result.size);
    let i = -1;
    for (const key of result.keys()) {
      arr[++i] = key;
    }
    IterateForOfStatement['[object Array]'](arr, func);
  },
  ['[object Number]'](result: number, func: (arr: Collection, index: number, item: any) => void): void {
    const arr = Array(result);
    for (let i = 0; i < result; ++i) {
      arr[i] = i;
    }
    IterateForOfStatement['[object Array]'](arr, func);
  },
  ['[object Null]'](result: null, func: (arr: Collection, index: number, item: any) => void): void { },
  ['[object Undefined]'](result: null, func: (arr: Collection, index: number, item: any) => void): void { }
};

/*@internal*/
export const CountForOfStatement = {
  ['[object Array]'](result: any[]): number { return result.length; },
  ['[object Map]'](result: Map<any, any>): number { return result.size; },
  ['[object Set]'](result: Set<any>): number { return result.size; },
  ['[object Number]'](result: number): number { return result; },
  ['[object Null]'](result: null): number { return 0; },
  ['[object Undefined]'](result: null): number { return 0; }
};

// Give each AST class a noop for each interface method if and only if it's not already defined
// This accomplishes the following:
//   1) no runtime error due to bad AST structure (it's the parser's job to guard against that)
//   2) no runtime error due to a bad binding such as two-way on a literal (no need, since it doesn't threaten the integrity of the app's state)
//   3) should we decide something else, we can easily change the global behavior of 1) and 2) by simply assigning a different method here (either in the source or via AOT)
const ast = [AccessThis, AccessScope, ArrayLiteral, ObjectLiteral, PrimitiveLiteral, Template, Unary, CallFunction, CallMember, CallScope, AccessMember, AccessKeyed, TaggedTemplate, Binary, Conditional, Assign];
for (let i = 0, ii = ast.length; i < ii; ++i) {
  const proto = ast[i].prototype;
  proto['assign'] = proto['assign'] || PLATFORM.noop;
}
