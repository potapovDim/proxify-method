import {proxifyAsync} from './async.proxify';
import {proxifySync} from './sync.proxify';
import {isRegex, isString} from './utils';

function proxify(result, chainMehod: {[k: string]: (...args: any[]) => any}, fromResult = false) {
  if ((typeof result).includes('function')) {
    result = result();
  }
  if ((typeof result) === 'object' && result.then) {
    return proxifyAsync(result, chainMehod, fromResult);
  }
  return proxifySync(result, chainMehod, fromResult);
}

function initChainModel(ctx, proxityPattern, chainMehod, resultFromChain, base: '__proto__' | 'prototype') {
  const baseObj = ctx[base];
  const ownProps = Object.getOwnPropertyNames(baseObj);
  let onlyMethods = ownProps
    .filter((p) => (typeof baseObj[p]) === 'function' && !(p === 'constructor'));

  if (proxityPattern) {
    onlyMethods = onlyMethods.filter((m: string) => m.match(proxityPattern));
  }

  onlyMethods.forEach((m) => {
    const currentMethod = baseObj[m];
    baseObj[m] = function(...args) {
      return proxify(currentMethod.call(this, ...args), chainMehod, resultFromChain);
    };
  });
}


function initContextChainModel(ctx, proxityPattern, chainMehod, resultFromChain) {
  initChainModel(ctx, proxityPattern, chainMehod, resultFromChain, '__proto__');
}

function initPrototyeChainModel(ctx, proxityPattern, chainMehod, resultFromChain) {
  initChainModel(ctx, proxityPattern, chainMehod, resultFromChain, 'prototype');
}


interface INameOrAsserter {
  name: string;
  (...args: any[]): any;
}

interface ISetUpChain {
  resultFromChain: boolean;
  (name: string | INameOrAsserter, asserter?: (...args: any[]) => any): {
    chainProxify: ISetUpChain;
    initContextChainModel: (ctx: any, proxityPattern?: string | RegExp) => void
    initChainModel: (ctx: any, proxityPattern?: string | RegExp) => void
    initPrototyeChainModel: (ctx: new (...args: any[]) => any, proxityPattern?: string | RegExp) => void
  }
}

function setUpChain<T>(name: string | INameOrAsserter, asserter?: INameOrAsserter, _chainMehod = {}) {

  if ((typeof name).includes('function') && (name as INameOrAsserter).name) {
    asserter = (name as INameOrAsserter);
    name = (name as INameOrAsserter).name;
  }

  if (!(typeof asserter).includes('function')) {
    throw new Error('asserter should be a function');
  }

  _chainMehod[name as string] = asserter;

  return {
    chainProxify: (name: string | INameOrAsserter, asserter?: INameOrAsserter) => setUpChain(name, asserter, _chainMehod),
    initContextChainModel: (ctx, proxityPattern: string | RegExp | null = null) => {
      if (isString(proxityPattern)) {
        proxityPattern = new RegExp(proxityPattern);
      }
      const resultFromChain = setUpChain.resultFromChain;
      // back to default condition, should be disabled = false
      setUpChain.resultFromChain = false;
      initContextChainModel(ctx, proxityPattern, _chainMehod, resultFromChain);
    },
    initPrototyeChainModel: (ctx, proxityPattern: string | RegExp | null = null) => {
      if (isString(proxityPattern)) {
        proxityPattern = new RegExp(proxityPattern);
      }
      const resultFromChain = setUpChain.resultFromChain;
      // back to default condition, should be disabled = false
      setUpChain.resultFromChain = false;
      initPrototyeChainModel(ctx, proxityPattern, _chainMehod, resultFromChain);
    },
    // TODO backward compatibility
    initChainModel: (ctx, proxityPattern: string | RegExp | null = null) => {
      if (isString(proxityPattern)) {
        proxityPattern = new RegExp(proxityPattern);
      }
      const resultFromChain = setUpChain.resultFromChain;
      // back to default condition, should be disabled = false
      setUpChain.resultFromChain = false;
      initContextChainModel(ctx, proxityPattern, _chainMehod, resultFromChain);
    },
  };
}
setUpChain.resultFromChain = false;

const chainProxify = setUpChain as ISetUpChain;

export {
  proxify,
  chainProxify,
};
