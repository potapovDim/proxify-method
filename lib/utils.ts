function isString(arg) {
  return Object.prototype.toString.call(arg) === '[object String]';
}

function isRegex(arg) {
  return Object.prototype.toString.call(arg) === '[object RegExp]';
}

export {
  isString,
  isRegex
};
