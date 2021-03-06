// Limit number of concurrent function executions (to cLimit number).
// Limited calls are queued. Optionaly maximum queue length can also be
// controlled with qLimit value, any calls that would reach over that limit
// would be discarded (its promise would resolve with "Too many calls" error)

var apply             = Function.prototype.apply
  , max               = Math.max
  , toUint            = require('es5-ext/lib/Number/to-uint')
  , callable          = require('es5-ext/lib/Object/valid-callable')
  , deferred          = require('../../deferred')
  , isPromise         = require('../../is-promise')
  , promise           = require('../../promise')

  , reject;

require('../promise/aside');

reject = function () {
	var e = new Error("Too many calls");
	e.type = 'deferred-gate-rejected';
	return promise(e);
};

module.exports = function (cLimit, qLimit) {
	var fn, count, decrement, unload, queue, run, result;
	fn = callable(this);
	cLimit = max(toUint(cLimit), 1);
	qLimit = ((qLimit == null) || isNaN(qLimit)) ? Infinity : toUint(qLimit);
	count = 0;
	queue = [];

	run = function (thisArg, arguments, resolve) {
		var r;
		try {
			r = apply.call(fn, thisArg, arguments);
		} catch (e) {
			r = e;
		}
		if (isPromise(r)) {
			if (!r.resolved) {
				++count;
				if (resolve) {
					resolve(r);
				}
				return r.aside(decrement, decrement);
			} else {
				r = r.value;
			}
		}
		if (resolve) {
			resolve(r);
			unload();
		} else {
			return promise(r);
		}
	};

	decrement = function () {
		--count;
		unload();
	};

	unload = function () {
		var data;
		if ((data = queue.shift())) {
			run.apply(null, data);
		}
	};

	result = function () {
		var r, d;
		if (count >= cLimit) {
			if (queue.length < qLimit) {
				d = deferred();
				queue.push([this, arguments, d.resolve]);
				return d.promise;
			} else {
				return reject();
			}
		} else {
			return run(this, arguments);
		}
	};
	result.returnsPromise = true;
	return result;
};
