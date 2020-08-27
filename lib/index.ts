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

function initChainModel(ctx, bindCtx, proxityPattern, chainMehod, resultFromChain) {
  const ownProps = Object.getOwnPropertyNames(ctx.__proto__);
  let onlyMethods = ownProps
    .filter((p) => (typeof ctx.__proto__[p]) === 'function' && !(p === 'constructor'));

  if (proxityPattern) {
    onlyMethods = onlyMethods.filter((m: string) => m.match(proxityPattern));
  }

  onlyMethods.forEach((m) => {
    const currentMethod = ctx.__proto__[m];
    ctx.__proto__[m] = function(...args) {
      return proxify(currentMethod.call(bindCtx, ...args), chainMehod, resultFromChain);
    };
  });
}


interface INameOrAsserter {
  name: string;
  (...args: any[]): any;
}

interface ISetUpChain {
  resultFromChain: boolean;
  <T>(name: string | INameOrAsserter, asserter?: (...args: any[]) => any): {
    chainProxify: ISetUpChain; initChainModel: (ctx: any, bindCtx?: any, proxityPattern?: string | RegExp) => void
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
    initChainModel: (ctx, bindCtx?, proxityPattern: string | RegExp | null = null) => {
      if (isString(proxityPattern)) {
        proxityPattern = new RegExp(proxityPattern);
      }
      if (isString(bindCtx) || isRegex(bindCtx)) {
        proxityPattern = isString(bindCtx) ? new RegExp(bindCtx) : bindCtx;
        bindCtx = ctx;
      }
      if (!bindCtx) {
        bindCtx = ctx;
      }
      const resultFromChain = setUpChain.resultFromChain;
      // back to default condition, should be disabled = false
      setUpChain.resultFromChain = false;
      initChainModel(ctx, bindCtx, proxityPattern, _chainMehod, resultFromChain);
    }
  };
}
setUpChain.resultFromChain = false;

const chainProxify = setUpChain as ISetUpChain;

export {
  proxify,
  chainProxify,
};
