import { XLinkAttributeAccessor, DataAttributeAccessor, StyleAttributeAccessor, Lifecycle, ClassAttributeAccessor, LifecycleFlags } from "../../../src/index";
import { createElement, globalAttributeNames } from "../util";
import { expect } from "chai";
import { CSS_PROPERTIES } from "../css-properties";
import { spy } from "sinon";


function createSvgUseElement(name: string, value: string) {
  return createElement(`<svg>
  <defs>
    <g id="shape1">
      <rect x="50" y="50" width="50" height="50" />
    </g>
    <g id="shape2">
      <circle cx="50" cy="50" r="50" />
    </g>
  </defs>
  <use xlink:${name}="${value}" x="50" y="50" foo:bar="baz" />
</svg>`).lastElementChild;
}

describe('XLinkAttributeAccessor', () => {
  let sut: XLinkAttributeAccessor;
  let el: Element;
  let lifecycle: Lifecycle;

  const tests = [
    { name: 'href', value: '#shape1' },
    { name: 'href', value: '#shape2' },
    { name: 'title', value: 'shape1' },
    { name: 'title', value: 'shape2' },
    { name: 'show', value: 'true' },
    { name: 'show', value: 'false' }
  ];

  describe('getValue()', () => {
    for (const { name, value } of tests) {
      it(`returns ${value} for xlink:${name}`, () => {
        el = createSvgUseElement(name, value);
        lifecycle = new Lifecycle();
        sut = new XLinkAttributeAccessor(lifecycle, el, `xlink:${name}`, name);
        const actual = sut.getValue();
        expect(actual).to.equal(value);
      });
    }
  });

  describe('setValue()', () => {
    for (const { name, value } of tests) {
      it(`sets xlink:${name} to foo`, () => {
        el = createSvgUseElement(name, value);
        lifecycle = new Lifecycle();
        sut = new XLinkAttributeAccessor(lifecycle, el, `xlink:${name}`, name);
        sut.setValue('foo', LifecycleFlags.none);
        expect(sut.getValue()).not.to.equal('foo');
        lifecycle.processFlushQueue(LifecycleFlags.none);
        expect(sut.getValue()).to.equal('foo');
      });
    }
  });

});

describe('DataAttributeAccessor', () => {
  let sut: DataAttributeAccessor;
  let el: Element;
  let lifecycle: Lifecycle;

  const valueArr = [undefined, null, '', 'foo'];
  describe('getValue()', () => {
    for (const name of globalAttributeNames) {
      for (const value of valueArr.filter(v => v !== null && v !== undefined)) {
        it(`returns "${value}" for attribute "${name}"`, () => {
          el = createElement(`<div ${name}="${value}"></div>`);
          lifecycle = new Lifecycle();
          sut = new DataAttributeAccessor(lifecycle, el, name);
          const actual = sut.getValue();
          expect(actual).to.equal(value);
        });
      }
    }
  });

  describe('setValue()', () => {
    for (const name of globalAttributeNames) {
      for (const value of valueArr) {
        it(`sets attribute "${name}" to "${value}"`, () => {
          el = createElement(`<div></div>`);
          lifecycle = new Lifecycle();
          const expected = value !== null && value !== undefined ? `<div ${name}="${value}"></div>` : '<div></div>';
          sut = new DataAttributeAccessor(lifecycle, el, name);
          sut.setValue(value, LifecycleFlags.none);
          if (value !== null && value !== undefined) {
            expect(el.outerHTML).not.to.equal(expected);
          }
          lifecycle.processFlushQueue(LifecycleFlags.none);
          expect(el.outerHTML).to.equal(expected);
        });
      }
    }
  });
});

describe('StyleAccessor', () => {
  const propNames = Object.getOwnPropertyNames(CSS_PROPERTIES);

  let sut: StyleAttributeAccessor;
  let el: HTMLElement;
  let lifecycle: Lifecycle;

  // TODO: this is just quick-n-dirty; remove redundant tests and add missing tests
  for (const propName of propNames) {
    const values = CSS_PROPERTIES[propName]['values'];
    const value = values[0];
    const rule = `${propName}:${value}`;
    it(`setValue - style="${rule}"`, () => {
      el = <HTMLElement>createElement('<div></div>');
      lifecycle = new Lifecycle();
      sut = new StyleAttributeAccessor(lifecycle, el);
      sut._setProperty = spy();

      sut.setValue(rule, LifecycleFlags.none);
      expect(sut._setProperty).not.to.have.been.calledOnce;
      lifecycle.processFlushQueue(LifecycleFlags.none);
      expect(sut._setProperty).to.have.been.calledOnce;
      expect(sut._setProperty).to.have.been.calledWith(propName, value);
    });
  }

  it(`getValue - style="display: block;"`, () => {
    el = <HTMLElement>createElement(`<div style="display: block;"></div>`);
    lifecycle = new Lifecycle();
    sut = new StyleAttributeAccessor(lifecycle, el);

    const actual = sut.getValue();
    expect(actual).to.equal('display: block;');
  });
});


describe('ClassAccessor', () => {
  let sut: ClassAttributeAccessor;
  let el: Element;
  let lifecycle: Lifecycle;
  let initialClassList: string;

  const markupArr = [
    '<div></div>',
    '<div class=""></div>',
    '<div class="foo"></div>',
    '<div class="foo bar baz"></div>'
  ];
  const classListArr = ['', 'foo', 'foo bar', 'bar baz', 'qux', 'bar qux', 'qux quux'];
  const secondClassListArr = ['', 'fooo'];
  for (const markup of markupArr) {
    for (const classList of classListArr) {
      beforeEach(() => {
        el = createElement(markup);
        initialClassList = el.classList.toString();
        lifecycle = new Lifecycle();
        sut = new ClassAttributeAccessor(lifecycle, el);
      });

      it(`setValue("${classList}") updates ${markup}`, () => {
        sut.setValue(classList);
        expect(el.classList.toString()).to.equal(initialClassList);
        lifecycle.processFlushQueue(LifecycleFlags.none);
        const updatedClassList = el.classList.toString();
        for (const cls of initialClassList.split(' ')) {
          expect(updatedClassList).to.contain(cls);
        }
        for (const cls of classList.split(' ')) {
          expect(updatedClassList).to.contain(cls);
        }
      });

      for (const secondClassList of secondClassListArr) {
        it(`setValue("${secondClassList}") updates already-updated ${markup}`, () => {
          sut.setValue(classList, LifecycleFlags.none);
          lifecycle.processFlushQueue(LifecycleFlags.none);
          const updatedClassList = el.classList.toString();
          sut.setValue(secondClassList, LifecycleFlags.none);
          expect(el.classList.toString()).to.equal(updatedClassList);
          lifecycle.processFlushQueue(LifecycleFlags.none);
          const secondUpdatedClassList = el.classList.toString();
          for (const cls of initialClassList.split(' ')) {
            if (!classList.includes(cls)) {
              expect(secondUpdatedClassList).to.contain(cls);
            }
          }
          for (const cls of secondClassList.split(' ')) {
            expect(secondUpdatedClassList).to.contain(cls);
          }
        });
      };
    }
  }
});
