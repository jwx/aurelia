import { IServiceLocator } from '@aurelia/kernel';
import { AccessKeyed, AccessMember, AccessScope, AccessThis, ArrayBindingPattern, ArrayLiteral, Assign, Binary, BindingBehavior, BindingIdentifier, CallFunction, CallMember, CallScope, Conditional, ForOfStatement, HtmlLiteral, IExpression, Interpolation, IsLeftHandSide, IVisitor, ObjectBindingPattern, ObjectLiteral, PrimitiveLiteral, TaggedTemplate, Template, Unary, ValueConverter } from './ast';
import { BindingContext, IScope } from './binding-context';
import { BindingFlags } from './binding-flags';

// tslint:disable:no-this-assignment
// tslint:disable:no-empty
// tslint:disable:no-any
export class EvaluateVisitor implements IVisitor<any> {
  private static cache: EvaluateVisitor[] = [];
  public flags: BindingFlags;
  public scope: IScope;
  public locator: IServiceLocator;
  private constructor() { }
  public static evaluate(flags: BindingFlags, scope: IScope, locator: IServiceLocator, expr: IExpression): any {
    let visitor: EvaluateVisitor;
    if (this.cache.length) {
      visitor = this.cache.pop();
    } else {
      visitor = new EvaluateVisitor();
    }
    visitor.flags = flags;
    visitor.scope = scope;
    visitor.locator = locator;
    const value = expr.accept(visitor);
    visitor.flags = null;
    visitor.scope = null;
    visitor.locator = null;
    this.cache.push(visitor);
    return value;
  }

  public visitAccessKeyed(expr: AccessKeyed): any {
    const instance = expr.object.accept(this);
    if (instance === null || instance === undefined) {
      return undefined;
    }
    const key = expr.key.accept(this);
    // note: getKeyed and setKeyed are removed because they are identical to the default spec behavior
    // and the runtime does expr.expr.faster
    return instance[key];
  }
  public visitAccessMember(expr: AccessMember): any {
    const instance = expr.object.accept(this);
    return instance === null || instance === undefined ? instance : instance[expr.name];
  }
  public visitAccessScope(expr: AccessScope): any {
    const name = expr.name;
    return BindingContext.get(this.scope, name, expr.ancestor)[name];
  }
  public visitAccessThis(expr: AccessThis): any {
    let oc = this.scope.overrideContext;
    let i = expr.ancestor;
    while (i-- && oc) {
      oc = oc.parentOverrideContext;
    }
    return i < 1 && oc ? oc.bindingContext : undefined;
  }
  public visitArrayBindingPattern(expr: ArrayBindingPattern): any {
    return undefined;
  }
  public visitArrayLiteral(expr: ArrayLiteral): any {
    const elements = expr.elements;
    const length = elements.length;
    const result = Array(length);
    for (let i = 0; i < length; ++i) {
      result[i] = elements[i].accept(this);
    }
    return result;
  }
  public visitAssign(expr: Assign): any {
    return expr.target.assign(this.flags, this.scope, this.locator, expr.value.accept(this));
  }
  public visitBinary(expr: Binary): any {
    return binary[expr.operation](expr.left, expr.right, this);
  }
  public visitBindingBehavior(expr: BindingBehavior): any {
    return expr.expression.accept(this);
  }
  public visitBindingIdentifier(expr: BindingIdentifier): any {
    return expr.name;
  }
  public visitCallFunction(expr: CallFunction): any {
    const func = expr.func.accept(this);
    if (typeof func === 'function') {
      return func.apply(null, evalList(this.flags, this.scope, this.locator, expr.args));
    }
    if (!(this.flags & BindingFlags.mustEvaluate) && (func === null || func === undefined)) {
      return undefined;
    }
    throw new Error(`${expr.func} is not a function`);
  }
  public visitCallMember(expr: CallMember): any {
    const instance = expr.object.accept(this);
    const args = evalList(this.flags, this.scope, this.locator, expr.args);
    const func = getFunction(this.flags, instance, expr.name);
    if (func) {
      return func.apply(instance, args);
    }
    return undefined;
  }
  public visitCallScope(expr: CallScope): any {
    const args = evalList(this.flags, this.scope, this.locator, expr.args);
    const context = BindingContext.get(this.scope, expr.name, expr.ancestor);
    const func = getFunction(this.flags, context, expr.name);
    if (func) {
      return func.apply(context, args);
    }
    return undefined;
  }
  public visitConditional(expr: Conditional): any {
    return (!!expr.condition.accept(this))
      ? expr.yes.accept(this)
      : expr.no.accept(this);
  }
  public visitForOfStatement(expr: ForOfStatement): any {
    return expr.iterable.accept(this);
  }
  public visitHtmlLiteral(expr: HtmlLiteral): any {
    const elements = expr.parts;
    let result = '';
    for (let i = 0, ii = elements.length; i < ii; ++i) {
      const value = elements[i].accept(this);
      if (value === undefined || value === null) {
        continue;
      }
      result += value;
    }
    return result;
  }
  public visitInterpolation(expr: Interpolation): any {
    const expressions = expr.expressions;
    const parts = expr.parts;
    let result = parts[0];
    for (let i = 0, ii = expressions.length; i < ii; ++i) {
      result += expressions[i].accept(this);
      result += parts[i + 1];
    }
    return result;
  }
  public visitObjectBindingPattern(expr: ObjectBindingPattern): any {
    return undefined;
  }
  public visitObjectLiteral(expr: ObjectLiteral): any {
    const instance: Record<string, any> = {};
    const keys = expr.keys;
    const values = expr.values;
    for (let i = 0, ii = keys.length; i < ii; ++i) {
      instance[keys[i]] = values[i].accept(this);
    }
    return instance;
  }
  public visitPrimitiveLiteral(expr: PrimitiveLiteral): any {
    return expr.value;
  }
  public visitTaggedTemplate(expr: TaggedTemplate): any {
    const expressions = expr.expressions;
    const len = expressions.length;
    const results = Array(len);
    for (let i = 0, ii = len; i < ii; ++i) {
      results[i] = expressions[i].accept(this);
    }
    const func = expr.func.accept(this);
    if (typeof func !== 'function') {
      throw new Error(`${expr.func} is not a function`);
    }
    return func.apply(null, [expr.cooked].concat(results));
  }
  public visitTemplate(expr: Template): any {
    const expressions = expr.expressions;
    const cooked = expr.cooked;
    let result = cooked[0];
    for (let i = 0, ii = expressions.length; i < ii; ++i) {
      result += expressions[i].accept(this);
      result += cooked[i + 1];
    }
    return result;
  }
  public visitUnary(expr: Unary): any {
    return unary[expr.operation](expr.expression, this);
  }

  public visitValueConverter(expr: ValueConverter): any {
    const converter = this.locator.get(expr.converterKey);
    if (!converter) {
      throw new Error(`No ValueConverter named "${expr.name}" was found!`);
    }
    if ('toView' in converter) {
      const args = expr.args;
      const len = args.length;
      const result = Array(len + 1);
      result[0] = expr.expression.accept(this);
      for (let i = 0; i < len; ++i) {
        result[i + 1] = args[i].accept(this);
      }
      return (<any>converter).toView.apply(converter, result);
    }
    return expr.expression.accept(this);
  }
}

const unary = {
  ['void'](expr: IsLeftHandSide, v: EvaluateVisitor): any {
    return void expr.accept(v);
  },
  ['typeof'](expr: IsLeftHandSide, v: EvaluateVisitor): any {
    return typeof expr.accept(v);
  },
  ['!'](expr: IsLeftHandSide, v: EvaluateVisitor): any {
    return !expr.accept(v);
  },
  ['-'](expr: IsLeftHandSide, v: EvaluateVisitor): any {
    return -expr.accept(v);
  },
  ['+'](expr: IsLeftHandSide, v: EvaluateVisitor): any {
    return +expr.accept(v);
  }
};

const binary = {
  ['&&'](left: IExpression, right: IExpression, v: EvaluateVisitor): any {
    return left.accept(v) && right.accept(v);
  },
  ['||'](left: IExpression, right: IExpression, v: EvaluateVisitor): any {
    return left.accept(v) || right.accept(v);
  },
  ['=='](left: IExpression, right: IExpression, v: EvaluateVisitor): any {
    // tslint:disable-next-line:triple-equals
    return left.accept(v) == right.accept(v);
  },
  ['==='](left: IExpression, right: IExpression, v: EvaluateVisitor): any {
    return left.accept(v) === right.accept(v);
  },
  ['!='](left: IExpression, right: IExpression, v: EvaluateVisitor): any {
    // tslint:disable-next-line:triple-equals
    return left.accept(v) != right.accept(v);
  },
  ['!=='](left: IExpression, right: IExpression, v: EvaluateVisitor): any {
    return left.accept(v) !== right.accept(v);
  },
  ['instanceof'](left: IExpression, right: IExpression, v: EvaluateVisitor): any {
    right = right.accept(v);
    if (typeof right === 'function') {
      return left.accept(v) instanceof right;
    }
    return false;
  },
  ['in'](left: IExpression, right: IExpression, v: EvaluateVisitor): any {
    right = right.accept(v);
    if (right !== null && typeof right === 'object') {
      return left.accept(v) in right;
    }
    return false;
  },
  // note: autoConvertAdd (and the null check) is removed because the default spec behavior is already largely similar
  // and where it isn't, you kind of want it to behave like the spec anyway (e.g. return NaN when adding a number to undefined)
  // makes bugs in user code easier to track down for end users
  // also, skipping these checks and leaving it to the runtime is a nice little perf boost and simplifies our code
  ['+'](left: IExpression, right: IExpression, v: EvaluateVisitor): any {
    return left.accept(v) + right.accept(v);
  },
  ['-'](left: IExpression, right: IExpression, v: EvaluateVisitor): any {
    return left.accept(v) - right.accept(v);
  },
  ['*'](left: IExpression, right: IExpression, v: EvaluateVisitor): any {
    return left.accept(v) * right.accept(v);
  },
  ['/'](left: IExpression, right: IExpression, v: EvaluateVisitor): any {
    return left.accept(v) / right.accept(v);
  },
  ['%'](left: IExpression, right: IExpression, v: EvaluateVisitor): any {
    return left.accept(v) % right.accept(v);
  },
  ['<'](left: IExpression, right: IExpression, v: EvaluateVisitor): any {
    return left.accept(v) < right.accept(v);
  },
  ['>'](left: IExpression, right: IExpression, v: EvaluateVisitor): any {
    return left.accept(v) > right.accept(v);
  },
  ['<='](left: IExpression, right: IExpression, v: EvaluateVisitor): any {
    return left.accept(v) <= right.accept(v);
  },
  ['>='](left: IExpression, right: IExpression, v: EvaluateVisitor): any {
    return left.accept(v) >= right.accept(v);
  }
};

/// Evaluate the [list] in context of the [scope].
function evalList(flags: BindingFlags, scope: IScope, locator: IServiceLocator, list: ReadonlyArray<IExpression>): any[] {
  const len = list.length;
  const result = Array(len);
  for (let i = 0; i < len; ++i) {
    result[i] = EvaluateVisitor.evaluate(flags, scope, locator, list[i]);
  }
  return result;
}

function getFunction(flags: BindingFlags, obj: any, name: string): any {
  const func = obj === null || obj === undefined ? null : obj[name];
  if (typeof func === 'function') {
    return func;
  }
  if (!(flags & BindingFlags.mustEvaluate) && (func === null || func === undefined)) {
    return null;
  }
  throw new Error(`${name} is not a function`);
}
