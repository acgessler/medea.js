// **************************************************************************
// workaround for Array.isArray not available
// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/isArray
if (typeof Array.isArray != 'function') {
  Array.isArray = function (obj) {
	return Object.prototype.toString.call(obj) == '[object Array]';
  };
}
