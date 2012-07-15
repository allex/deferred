// Used by extensions that call method by name or by itself on resolved object

'use strict';

var isArray    = Array.isArray
  , slice      = Array.prototype.slice
  , some       = Array.prototype.some
  , isCallable = require('es5-ext/lib/Object/is-callable')
  , deferred   = require('../../deferred')
  , promise    = require('../../promise')
  , isPromise  = require('../../is-promise');

module.exports = function (base, fn, args, apply, resolve, async) {
	var d, result;
	if (base.failed) {
		return resolve(base.promise);
	}
	if (!isCallable(fn)) {
		if (!base.value || !isCallable(base.value[fn])) {
			return resolve(new Error("Cannot invoke '" + fn +
				"' on given value. It's not a function."));
		}
		fn = base.value[fn];
	}
	if (some.call(args, isPromise)) {
		if (resolve === promise) {
			d = deferred();
			resolve = d.resolve;
		}
		deferred.apply(null, args)(function (args) {
			apply.call(base.value, fn, isArray(args) ? args : [args], resolve);
		});
	} else {
		if (async && !fn.returnsPromise && (resolve === promise)) {
			d = deferred();
			resolve = d.resolve;
		}
		result = apply.call(base.value, fn, args, resolve);
		if (!async || fn.returnsPromise) {
			return result;
		}
	}
	return d && d.promise;
};