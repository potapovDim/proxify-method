import {proxifyResultAsync} from './async.proxify';
import {proxifyResultSync} from './sync.proxify';

function proxifyResult(result, chainMehod: {[k: string]: (...args: any[]) => any}, fromResult = false) {
  if ((typeof result).includes('function')) {
    result = result();
  }
  if ((typeof result) === 'object' && result.then) {
    return proxifyResultAsync(result, chainMehod, fromResult);
  }
  return proxifyResultSync(result, chainMehod, fromResult);
}

function initChainModel(ctx, chainMehod, resultFromChain) {
  const ownProps = Object.getOwnPropertyNames(ctx.__proto__);
  const onlyMethods = ownProps.filter((k) => (typeof ctx.__proto__[k]) === 'function' && !(k === 'constructor'));
  onlyMethods.forEach((m) => {
    const currentMethod = ctx.__proto__[m];
    ctx.__proto__[m] = function(...args) {
      return proxifyResult(currentMethod.call(ctx, ...args), chainMehod, resultFromChain);
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
    chainProxify: ISetUpChain; initChainModel: (ctx: any) => void
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
    initChainModel: (ctx) => {
      const resultFromChain = setUpChain.resultFromChain;
      // back to default condition, should be disabled = false
      setUpChain.resultFromChain = false;
      initChainModel(ctx, _chainMehod, resultFromChain);
    }
  };
}
setUpChain.resultFromChain = false;

const chainProxify = setUpChain as ISetUpChain;

export {
  chainProxify
};
