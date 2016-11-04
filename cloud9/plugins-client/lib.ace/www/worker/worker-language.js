"no use strict";
;(function(window) {
if (typeof window.window != "undefined" && window.document) {
    return;
}

window.console = function() {
    var msgs = Array.prototype.slice.call(arguments, 0);
    postMessage({type: "log", data: msgs});
};
window.console.error =
window.console.warn = 
window.console.log =
window.console.trace = window.console;

window.window = window;
window.ace = window;

window.normalizeModule = function(parentId, moduleName) {
    // normalize plugin requires
    if (moduleName.indexOf("!") !== -1) {
        var chunks = moduleName.split("!");
        return normalizeModule(parentId, chunks[0]) + "!" + normalizeModule(parentId, chunks[1]);
    }
    // normalize relative requires
    if (moduleName.charAt(0) == ".") {
        var base = parentId.split("/").slice(0, -1).join("/");
        moduleName = base + "/" + moduleName;
        
        while(moduleName.indexOf(".") !== -1 && previous != moduleName) {
            var previous = moduleName;
            moduleName = moduleName.replace(/\/\.\//, "/").replace(/[^\/]+\/\.\.\//, "");
        }
    }
    
    return moduleName;
};

window.require = function(parentId, id) {
    if (!id) {
        id = parentId
        parentId = null;
    }
    if (!id.charAt)
        throw new Error("worker.js require() accepts only (parentId, id) as arguments");

    id = normalizeModule(parentId, id);

    var module = require.modules[id];
    if (module) {
        if (!module.initialized) {
            module.initialized = true;
            module.exports = module.factory().exports;
        }
        return module.exports;
    }
    
    var chunks = id.split("/");
    chunks[0] = require.tlns[chunks[0]] || chunks[0];
    var path = chunks.join("/") + ".js";
    
    require.id = id;
    importScripts(path);
    return require(parentId, id);
};

require.modules = {};
require.tlns = {};

window.define = function(id, deps, factory) {
    if (arguments.length == 2) {
        factory = deps;
        if (typeof id != "string") {
            deps = id;
            id = require.id;
        }
    } else if (arguments.length == 1) {
        factory = id;
        id = require.id;
    }

    if (id.indexOf("text!") === 0) 
        return;
    
    var req = function(deps, factory) {
        return require(id, deps, factory);
    };

    require.modules[id] = {
        exports: {},
        factory: function() {
            var module = this;
            var returnExports = factory(req, module.exports, module);
            if (returnExports)
                module.exports = returnExports;
            return module;
        }
    };
};

window.initBaseUrls  = function initBaseUrls(topLevelNamespaces) {
    require.tlns = topLevelNamespaces;
}

window.initSender = function initSender() {

    var EventEmitter = require("ace/lib/event_emitter").EventEmitter;
    var oop = require("ace/lib/oop");
    
    var Sender = function() {};
    
    (function() {
        
        oop.implement(this, EventEmitter);
                
        this.callback = function(data, callbackId) {
            postMessage({
                type: "call",
                id: callbackId,
                data: data
            });
        };
    
        this.emit = function(name, data) {
            postMessage({
                type: "event",
                name: name,
                data: data
            });
        };
        
    }).call(Sender.prototype);
    
    return new Sender();
}

window.main = null;
window.sender = null;

window.onmessage = function(e) {
    var msg = e.data;
    if (msg.command) {
        if (main[msg.command])
            main[msg.command].apply(main, msg.args);
        else
            throw new Error("Unknown command:" + msg.command);
    }
    else if (msg.init) {        
        initBaseUrls(msg.tlns);
        require("ace/lib/es5-shim");
        sender = initSender();
        var clazz = require(msg.module)[msg.classname];
        main = new clazz(sender);
    } 
    else if (msg.event && sender) {
        sender._emit(msg.event, msg.data);
    }
};
})(this);// vim:set ts=4 sts=4 sw=4 st:
// -- kriskowal Kris Kowal Copyright (C) 2009-2010 MIT License
// -- tlrobinson Tom Robinson Copyright (C) 2009-2010 MIT License (Narwhal Project)
// -- dantman Daniel Friesen Copyright(C) 2010 XXX No License Specified
// -- fschaefer Florian Schäfer Copyright (C) 2010 MIT License
// -- Irakli Gozalishvili Copyright (C) 2010 MIT License

/*!
    Copyright (c) 2009, 280 North Inc. http://280north.com/
    MIT License. http://github.com/280north/narwhal/blob/master/README.md
*/

define('ace/lib/fixoldbrowsers', ['require', 'exports', 'module' , 'ace/lib/regexp', 'ace/lib/es5-shim'], function(require, exports, module) {
"use strict";

require("./regexp");
require("./es5-shim");

});
/*
 *  Based on code from:
 *
 * XRegExp 1.5.0
 * (c) 2007-2010 Steven Levithan
 * MIT License
 * <http://xregexp.com>
 * Provides an augmented, extensible, cross-browser implementation of regular expressions,
 * including support for additional syntax, flags, and methods
 */
 
define('ace/lib/regexp', ['require', 'exports', 'module' ], function(require, exports, module) {
"use strict";

    //---------------------------------
    //  Private variables
    //---------------------------------

    var real = {
            exec: RegExp.prototype.exec,
            test: RegExp.prototype.test,
            match: String.prototype.match,
            replace: String.prototype.replace,
            split: String.prototype.split
        },
        compliantExecNpcg = real.exec.call(/()??/, "")[1] === undefined, // check `exec` handling of nonparticipating capturing groups
        compliantLastIndexIncrement = function () {
            var x = /^/g;
            real.test.call(x, "");
            return !x.lastIndex;
        }();

    if (compliantLastIndexIncrement && compliantExecNpcg)
        return;

    //---------------------------------
    //  Overriden native methods
    //---------------------------------

    // Adds named capture support (with backreferences returned as `result.name`), and fixes two
    // cross-browser issues per ES3:
    // - Captured values for nonparticipating capturing groups should be returned as `undefined`,
    //   rather than the empty string.
    // - `lastIndex` should not be incremented after zero-length matches.
    RegExp.prototype.exec = function (str) {
        var match = real.exec.apply(this, arguments),
            name, r2;
        if ( typeof(str) == 'string' && match) {
            // Fix browsers whose `exec` methods don't consistently return `undefined` for
            // nonparticipating capturing groups
            if (!compliantExecNpcg && match.length > 1 && indexOf(match, "") > -1) {
                r2 = RegExp(this.source, real.replace.call(getNativeFlags(this), "g", ""));
                // Using `str.slice(match.index)` rather than `match[0]` in case lookahead allowed
                // matching due to characters outside the match
                real.replace.call(str.slice(match.index), r2, function () {
                    for (var i = 1; i < arguments.length - 2; i++) {
                        if (arguments[i] === undefined)
                            match[i] = undefined;
                    }
                });
            }
            // Attach named capture properties
            if (this._xregexp && this._xregexp.captureNames) {
                for (var i = 1; i < match.length; i++) {
                    name = this._xregexp.captureNames[i - 1];
                    if (name)
                       match[name] = match[i];
                }
            }
            // Fix browsers that increment `lastIndex` after zero-length matches
            if (!compliantLastIndexIncrement && this.global && !match[0].length && (this.lastIndex > match.index))
                this.lastIndex--;
        }
        return match;
    };

    // Don't override `test` if it won't change anything
    if (!compliantLastIndexIncrement) {
        // Fix browser bug in native method
        RegExp.prototype.test = function (str) {
            // Use the native `exec` to skip some processing overhead, even though the overriden
            // `exec` would take care of the `lastIndex` fix
            var match = real.exec.call(this, str);
            // Fix browsers that increment `lastIndex` after zero-length matches
            if (match && this.global && !match[0].length && (this.lastIndex > match.index))
                this.lastIndex--;
            return !!match;
        };
    }

    //---------------------------------
    //  Private helper functions
    //---------------------------------

    function getNativeFlags (regex) {
        return (regex.global     ? "g" : "") +
               (regex.ignoreCase ? "i" : "") +
               (regex.multiline  ? "m" : "") +
               (regex.extended   ? "x" : "") + // Proposed for ES4; included in AS3
               (regex.sticky     ? "y" : "");
    }

    function indexOf (array, item, from) {
        if (Array.prototype.indexOf) // Use the native array method if available
            return array.indexOf(item, from);
        for (var i = from || 0; i < array.length; i++) {
            if (array[i] === item)
                return i;
        }
        return -1;
    }

});
// https://github.com/kriskowal/es5-shim
// Copyright 2009-2012 by contributors, MIT License

define('ace/lib/es5-shim', ['require', 'exports', 'module' ], function(require, exports, module) {

/*
 * Brings an environment as close to ECMAScript 5 compliance
 * as is possible with the facilities of erstwhile engines.
 *
 * Annotated ES5: http://es5.github.com/ (specific links below)
 * ES5 Spec: http://www.ecma-international.org/publications/files/ECMA-ST/Ecma-262.pdf
 * Required reading: http://javascriptweblog.wordpress.com/2011/12/05/extending-javascript-natives/
 */

//
// Function
// ========
//

// ES-5 15.3.4.5
// http://es5.github.com/#x15.3.4.5

function Empty() {}

if (!Function.prototype.bind) {
    Function.prototype.bind = function bind(that) { // .length is 1
        // 1. Let Target be the this value.
        var target = this;
        // 2. If IsCallable(Target) is false, throw a TypeError exception.
        if (typeof target != "function") {
            throw new TypeError("Function.prototype.bind called on incompatible " + target);
        }
        // 3. Let A be a new (possibly empty) internal list of all of the
        //   argument values provided after thisArg (arg1, arg2 etc), in order.
        // XXX slicedArgs will stand in for "A" if used
        var args = slice.call(arguments, 1); // for normal call
        // 4. Let F be a new native ECMAScript object.
        // 11. Set the [[Prototype]] internal property of F to the standard
        //   built-in Function prototype object as specified in 15.3.3.1.
        // 12. Set the [[Call]] internal property of F as described in
        //   15.3.4.5.1.
        // 13. Set the [[Construct]] internal property of F as described in
        //   15.3.4.5.2.
        // 14. Set the [[HasInstance]] internal property of F as described in
        //   15.3.4.5.3.
        var bound = function () {

            if (this instanceof bound) {
                // 15.3.4.5.2 [[Construct]]
                // When the [[Construct]] internal method of a function object,
                // F that was created using the bind function is called with a
                // list of arguments ExtraArgs, the following steps are taken:
                // 1. Let target be the value of F's [[TargetFunction]]
                //   internal property.
                // 2. If target has no [[Construct]] internal method, a
                //   TypeError exception is thrown.
                // 3. Let boundArgs be the value of F's [[BoundArgs]] internal
                //   property.
                // 4. Let args be a new list containing the same values as the
                //   list boundArgs in the same order followed by the same
                //   values as the list ExtraArgs in the same order.
                // 5. Return the result of calling the [[Construct]] internal
                //   method of target providing args as the arguments.

                var result = target.apply(
                    this,
                    args.concat(slice.call(arguments))
                );
                if (Object(result) === result) {
                    return result;
                }
                return this;

            } else {
                // 15.3.4.5.1 [[Call]]
                // When the [[Call]] internal method of a function object, F,
                // which was created using the bind function is called with a
                // this value and a list of arguments ExtraArgs, the following
                // steps are taken:
                // 1. Let boundArgs be the value of F's [[BoundArgs]] internal
                //   property.
                // 2. Let boundThis be the value of F's [[BoundThis]] internal
                //   property.
                // 3. Let target be the value of F's [[TargetFunction]] internal
                //   property.
                // 4. Let args be a new list containing the same values as the
                //   list boundArgs in the same order followed by the same
                //   values as the list ExtraArgs in the same order.
                // 5. Return the result of calling the [[Call]] internal method
                //   of target providing boundThis as the this value and
                //   providing args as the arguments.

                // equiv: target.call(this, ...boundArgs, ...args)
                return target.apply(
                    that,
                    args.concat(slice.call(arguments))
                );

            }

        };
        if(target.prototype) {
            Empty.prototype = target.prototype;
            bound.prototype = new Empty();
            // Clean up dangling references.
            Empty.prototype = null;
        }
        // XXX bound.length is never writable, so don't even try
        //
        // 15. If the [[Class]] internal property of Target is "Function", then
        //     a. Let L be the length property of Target minus the length of A.
        //     b. Set the length own property of F to either 0 or L, whichever is
        //       larger.
        // 16. Else set the length own property of F to 0.
        // 17. Set the attributes of the length own property of F to the values
        //   specified in 15.3.5.1.

        // TODO
        // 18. Set the [[Extensible]] internal property of F to true.

        // TODO
        // 19. Let thrower be the [[ThrowTypeError]] function Object (13.2.3).
        // 20. Call the [[DefineOwnProperty]] internal method of F with
        //   arguments "caller", PropertyDescriptor {[[Get]]: thrower, [[Set]]:
        //   thrower, [[Enumerable]]: false, [[Configurable]]: false}, and
        //   false.
        // 21. Call the [[DefineOwnProperty]] internal method of F with
        //   arguments "arguments", PropertyDescriptor {[[Get]]: thrower,
        //   [[Set]]: thrower, [[Enumerable]]: false, [[Configurable]]: false},
        //   and false.

        // TODO
        // NOTE Function objects created using Function.prototype.bind do not
        // have a prototype property or the [[Code]], [[FormalParameters]], and
        // [[Scope]] internal properties.
        // XXX can't delete prototype in pure-js.

        // 22. Return F.
        return bound;
    };
}

// Shortcut to an often accessed properties, in order to avoid multiple
// dereference that costs universally.
// _Please note: Shortcuts are defined after `Function.prototype.bind` as we
// us it in defining shortcuts.
var call = Function.prototype.call;
var prototypeOfArray = Array.prototype;
var prototypeOfObject = Object.prototype;
var slice = prototypeOfArray.slice;
// Having a toString local variable name breaks in Opera so use _toString.
var _toString = call.bind(prototypeOfObject.toString);
var owns = call.bind(prototypeOfObject.hasOwnProperty);

// If JS engine supports accessors creating shortcuts.
var defineGetter;
var defineSetter;
var lookupGetter;
var lookupSetter;
var supportsAccessors;
if ((supportsAccessors = owns(prototypeOfObject, "__defineGetter__"))) {
    defineGetter = call.bind(prototypeOfObject.__defineGetter__);
    defineSetter = call.bind(prototypeOfObject.__defineSetter__);
    lookupGetter = call.bind(prototypeOfObject.__lookupGetter__);
    lookupSetter = call.bind(prototypeOfObject.__lookupSetter__);
}

//
// Array
// =====
//

// ES5 15.4.4.12
// http://es5.github.com/#x15.4.4.12
// Default value for second param
// [bugfix, ielt9, old browsers]
// IE < 9 bug: [1,2].splice(0).join("") == "" but should be "12"
if ([1,2].splice(0).length != 2) {
    if(function() { // test IE < 9 to splice bug - see issue #138
        function makeArray(l) {
            var a = new Array(l+2);
            a[0] = a[1] = 0;
            return a;
        }
        var array = [], lengthBefore;
        
        array.splice.apply(array, makeArray(20));
        array.splice.apply(array, makeArray(26));

        lengthBefore = array.length; //46
        array.splice(5, 0, "XXX"); // add one element

        lengthBefore + 1 == array.length

        if (lengthBefore + 1 == array.length) {
            return true;// has right splice implementation without bugs
        }
        // else {
        // IE8 bug
        // }
    }()) {//IE 6/7
        var array_splice = Array.prototype.splice;
        Array.prototype.splice = function(start, deleteCount) {
            if (!arguments.length) {
                return [];
            } else {
                return array_splice.apply(this, [
                    start === void 0 ? 0 : start,
                    deleteCount === void 0 ? (this.length - start) : deleteCount
                ].concat(slice.call(arguments, 2)))
            }
        };
    } else {//IE8
        // taken from http://docs.sencha.com/ext-js/4-1/source/Array2.html
        Array.prototype.splice = function(pos, removeCount){
            var length = this.length;
            if (pos > 0) {
                if (pos > length)
                    pos = length;
            } else if (pos == void 0) {
                pos = 0;
            } else if (pos < 0) {
                pos = Math.max(length + pos, 0);
            }

            if (!(pos+removeCount < length))
                removeCount = length - pos;

            var removed = this.slice(pos, pos+removeCount);
            var insert = slice.call(arguments, 2);
            var add = insert.length;            

            // we try to use Array.push when we can for efficiency...
            if (pos === length) {
                if (add) {
                    this.push.apply(this, insert);
                }
            } else {
                var remove = Math.min(removeCount, length - pos);
                var tailOldPos = pos + remove;
                var tailNewPos = tailOldPos + add - remove;
                var tailCount = length - tailOldPos;
                var lengthAfterRemove = length - remove;

                if (tailNewPos < tailOldPos) { // case A
                    for (var i = 0; i < tailCount; ++i) {
                        this[tailNewPos+i] = this[tailOldPos+i];
                    }
                } else if (tailNewPos > tailOldPos) { // case B
                    for (i = tailCount; i--; ) {
                        this[tailNewPos+i] = this[tailOldPos+i];
                    }
                } // else, add == remove (nothing to do)

                if (add && pos === lengthAfterRemove) {
                    this.length = lengthAfterRemove; // truncate array
                    this.push.apply(this, insert);
                } else {
                    this.length = lengthAfterRemove + add; // reserves space
                    for (i = 0; i < add; ++i) {
                        this[pos+i] = insert[i];
                    }
                }
            }
            return removed;
        };
    }
}

// ES5 15.4.3.2
// http://es5.github.com/#x15.4.3.2
// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/isArray
if (!Array.isArray) {
    Array.isArray = function isArray(obj) {
        return _toString(obj) == "[object Array]";
    };
}

// The IsCallable() check in the Array functions
// has been replaced with a strict check on the
// internal class of the object to trap cases where
// the provided function was actually a regular
// expression literal, which in V8 and
// JavaScriptCore is a typeof "function".  Only in
// V8 are regular expression literals permitted as
// reduce parameters, so it is desirable in the
// general case for the shim to match the more
// strict and common behavior of rejecting regular
// expressions.

// ES5 15.4.4.18
// http://es5.github.com/#x15.4.4.18
// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/array/forEach

// Check failure of by-index access of string characters (IE < 9)
// and failure of `0 in boxedString` (Rhino)
var boxedString = Object("a"),
    splitString = boxedString[0] != "a" || !(0 in boxedString);

if (!Array.prototype.forEach) {
    Array.prototype.forEach = function forEach(fun /*, thisp*/) {
        var object = toObject(this),
            self = splitString && _toString(this) == "[object String]" ?
                this.split("") :
                object,
            thisp = arguments[1],
            i = -1,
            length = self.length >>> 0;

        // If no callback function or if callback is not a callable function
        if (_toString(fun) != "[object Function]") {
            throw new TypeError(); // TODO message
        }

        while (++i < length) {
            if (i in self) {
                // Invoke the callback function with call, passing arguments:
                // context, property value, property key, thisArg object
                // context
                fun.call(thisp, self[i], i, object);
            }
        }
    };
}

// ES5 15.4.4.19
// http://es5.github.com/#x15.4.4.19
// https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Objects/Array/map
if (!Array.prototype.map) {
    Array.prototype.map = function map(fun /*, thisp*/) {
        var object = toObject(this),
            self = splitString && _toString(this) == "[object String]" ?
                this.split("") :
                object,
            length = self.length >>> 0,
            result = Array(length),
            thisp = arguments[1];

        // If no callback function or if callback is not a callable function
        if (_toString(fun) != "[object Function]") {
            throw new TypeError(fun + " is not a function");
        }

        for (var i = 0; i < length; i++) {
            if (i in self)
                result[i] = fun.call(thisp, self[i], i, object);
        }
        return result;
    };
}

// ES5 15.4.4.20
// http://es5.github.com/#x15.4.4.20
// https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Objects/Array/filter
if (!Array.prototype.filter) {
    Array.prototype.filter = function filter(fun /*, thisp */) {
        var object = toObject(this),
            self = splitString && _toString(this) == "[object String]" ?
                this.split("") :
                    object,
            length = self.length >>> 0,
            result = [],
            value,
            thisp = arguments[1];

        // If no callback function or if callback is not a callable function
        if (_toString(fun) != "[object Function]") {
            throw new TypeError(fun + " is not a function");
        }

        for (var i = 0; i < length; i++) {
            if (i in self) {
                value = self[i];
                if (fun.call(thisp, value, i, object)) {
                    result.push(value);
                }
            }
        }
        return result;
    };
}

// ES5 15.4.4.16
// http://es5.github.com/#x15.4.4.16
// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/every
if (!Array.prototype.every) {
    Array.prototype.every = function every(fun /*, thisp */) {
        var object = toObject(this),
            self = splitString && _toString(this) == "[object String]" ?
                this.split("") :
                object,
            length = self.length >>> 0,
            thisp = arguments[1];

        // If no callback function or if callback is not a callable function
        if (_toString(fun) != "[object Function]") {
            throw new TypeError(fun + " is not a function");
        }

        for (var i = 0; i < length; i++) {
            if (i in self && !fun.call(thisp, self[i], i, object)) {
                return false;
            }
        }
        return true;
    };
}

// ES5 15.4.4.17
// http://es5.github.com/#x15.4.4.17
// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/some
if (!Array.prototype.some) {
    Array.prototype.some = function some(fun /*, thisp */) {
        var object = toObject(this),
            self = splitString && _toString(this) == "[object String]" ?
                this.split("") :
                object,
            length = self.length >>> 0,
            thisp = arguments[1];

        // If no callback function or if callback is not a callable function
        if (_toString(fun) != "[object Function]") {
            throw new TypeError(fun + " is not a function");
        }

        for (var i = 0; i < length; i++) {
            if (i in self && fun.call(thisp, self[i], i, object)) {
                return true;
            }
        }
        return false;
    };
}

// ES5 15.4.4.21
// http://es5.github.com/#x15.4.4.21
// https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Objects/Array/reduce
if (!Array.prototype.reduce) {
    Array.prototype.reduce = function reduce(fun /*, initial*/) {
        var object = toObject(this),
            self = splitString && _toString(this) == "[object String]" ?
                this.split("") :
                object,
            length = self.length >>> 0;

        // If no callback function or if callback is not a callable function
        if (_toString(fun) != "[object Function]") {
            throw new TypeError(fun + " is not a function");
        }

        // no value to return if no initial value and an empty array
        if (!length && arguments.length == 1) {
            throw new TypeError("reduce of empty array with no initial value");
        }

        var i = 0;
        var result;
        if (arguments.length >= 2) {
            result = arguments[1];
        } else {
            do {
                if (i in self) {
                    result = self[i++];
                    break;
                }

                // if array contains no values, no initial value to return
                if (++i >= length) {
                    throw new TypeError("reduce of empty array with no initial value");
                }
            } while (true);
        }

        for (; i < length; i++) {
            if (i in self) {
                result = fun.call(void 0, result, self[i], i, object);
            }
        }

        return result;
    };
}

// ES5 15.4.4.22
// http://es5.github.com/#x15.4.4.22
// https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Objects/Array/reduceRight
if (!Array.prototype.reduceRight) {
    Array.prototype.reduceRight = function reduceRight(fun /*, initial*/) {
        var object = toObject(this),
            self = splitString && _toString(this) == "[object String]" ?
                this.split("") :
                object,
            length = self.length >>> 0;

        // If no callback function or if callback is not a callable function
        if (_toString(fun) != "[object Function]") {
            throw new TypeError(fun + " is not a function");
        }

        // no value to return if no initial value, empty array
        if (!length && arguments.length == 1) {
            throw new TypeError("reduceRight of empty array with no initial value");
        }

        var result, i = length - 1;
        if (arguments.length >= 2) {
            result = arguments[1];
        } else {
            do {
                if (i in self) {
                    result = self[i--];
                    break;
                }

                // if array contains no values, no initial value to return
                if (--i < 0) {
                    throw new TypeError("reduceRight of empty array with no initial value");
                }
            } while (true);
        }

        do {
            if (i in this) {
                result = fun.call(void 0, result, self[i], i, object);
            }
        } while (i--);

        return result;
    };
}

// ES5 15.4.4.14
// http://es5.github.com/#x15.4.4.14
// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/indexOf
if (!Array.prototype.indexOf || ([0, 1].indexOf(1, 2) != -1)) {
    Array.prototype.indexOf = function indexOf(sought /*, fromIndex */ ) {
        var self = splitString && _toString(this) == "[object String]" ?
                this.split("") :
                toObject(this),
            length = self.length >>> 0;

        if (!length) {
            return -1;
        }

        var i = 0;
        if (arguments.length > 1) {
            i = toInteger(arguments[1]);
        }

        // handle negative indices
        i = i >= 0 ? i : Math.max(0, length + i);
        for (; i < length; i++) {
            if (i in self && self[i] === sought) {
                return i;
            }
        }
        return -1;
    };
}

// ES5 15.4.4.15
// http://es5.github.com/#x15.4.4.15
// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/lastIndexOf
if (!Array.prototype.lastIndexOf || ([0, 1].lastIndexOf(0, -3) != -1)) {
    Array.prototype.lastIndexOf = function lastIndexOf(sought /*, fromIndex */) {
        var self = splitString && _toString(this) == "[object String]" ?
                this.split("") :
                toObject(this),
            length = self.length >>> 0;

        if (!length) {
            return -1;
        }
        var i = length - 1;
        if (arguments.length > 1) {
            i = Math.min(i, toInteger(arguments[1]));
        }
        // handle negative indices
        i = i >= 0 ? i : length - Math.abs(i);
        for (; i >= 0; i--) {
            if (i in self && sought === self[i]) {
                return i;
            }
        }
        return -1;
    };
}

//
// Object
// ======
//

// ES5 15.2.3.2
// http://es5.github.com/#x15.2.3.2
if (!Object.getPrototypeOf) {
    // https://github.com/kriskowal/es5-shim/issues#issue/2
    // http://ejohn.org/blog/objectgetprototypeof/
    // recommended by fschaefer on github
    Object.getPrototypeOf = function getPrototypeOf(object) {
        return object.__proto__ || (
            object.constructor ?
            object.constructor.prototype :
            prototypeOfObject
        );
    };
}

// ES5 15.2.3.3
// http://es5.github.com/#x15.2.3.3
if (!Object.getOwnPropertyDescriptor) {
    var ERR_NON_OBJECT = "Object.getOwnPropertyDescriptor called on a " +
                         "non-object: ";
    Object.getOwnPropertyDescriptor = function getOwnPropertyDescriptor(object, property) {
        if ((typeof object != "object" && typeof object != "function") || object === null)
            throw new TypeError(ERR_NON_OBJECT + object);
        // If object does not owns property return undefined immediately.
        if (!owns(object, property))
            return;

        var descriptor, getter, setter;

        // If object has a property then it's for sure both `enumerable` and
        // `configurable`.
        descriptor =  { enumerable: true, configurable: true };

        // If JS engine supports accessor properties then property may be a
        // getter or setter.
        if (supportsAccessors) {
            // Unfortunately `__lookupGetter__` will return a getter even
            // if object has own non getter property along with a same named
            // inherited getter. To avoid misbehavior we temporary remove
            // `__proto__` so that `__lookupGetter__` will return getter only
            // if it's owned by an object.
            var prototype = object.__proto__;
            object.__proto__ = prototypeOfObject;

            var getter = lookupGetter(object, property);
            var setter = lookupSetter(object, property);

            // Once we have getter and setter we can put values back.
            object.__proto__ = prototype;

            if (getter || setter) {
                if (getter) descriptor.get = getter;
                if (setter) descriptor.set = setter;

                // If it was accessor property we're done and return here
                // in order to avoid adding `value` to the descriptor.
                return descriptor;
            }
        }

        // If we got this far we know that object has an own property that is
        // not an accessor so we set it as a value and return descriptor.
        descriptor.value = object[property];
        return descriptor;
    };
}

// ES5 15.2.3.4
// http://es5.github.com/#x15.2.3.4
if (!Object.getOwnPropertyNames) {
    Object.getOwnPropertyNames = function getOwnPropertyNames(object) {
        return Object.keys(object);
    };
}

// ES5 15.2.3.5
// http://es5.github.com/#x15.2.3.5
if (!Object.create) {
    var createEmpty;
    if (Object.prototype.__proto__ === null) {
        createEmpty = function () {
            return { "__proto__": null };
        };
    } else {
        // In old IE __proto__ can't be used to manually set `null`
        createEmpty = function () {
            var empty = {};
            for (var i in empty)
                empty[i] = null;
            empty.constructor =
            empty.hasOwnProperty =
            empty.propertyIsEnumerable =
            empty.isPrototypeOf =
            empty.toLocaleString =
            empty.toString =
            empty.valueOf =
            empty.__proto__ = null;
            return empty;
        }
    }

    Object.create = function create(prototype, properties) {
        var object;
        if (prototype === null) {
            object = createEmpty();
        } else {
            if (typeof prototype != "object")
                throw new TypeError("typeof prototype["+(typeof prototype)+"] != 'object'");
            var Type = function () {};
            Type.prototype = prototype;
            object = new Type();
            // IE has no built-in implementation of `Object.getPrototypeOf`
            // neither `__proto__`, but this manually setting `__proto__` will
            // guarantee that `Object.getPrototypeOf` will work as expected with
            // objects created using `Object.create`
            object.__proto__ = prototype;
        }
        if (properties !== void 0)
            Object.defineProperties(object, properties);
        return object;
    };
}

// ES5 15.2.3.6
// http://es5.github.com/#x15.2.3.6

// Patch for WebKit and IE8 standard mode
// Designed by hax <hax.github.com>
// related issue: https://github.com/kriskowal/es5-shim/issues#issue/5
// IE8 Reference:
//     http://msdn.microsoft.com/en-us/library/dd282900.aspx
//     http://msdn.microsoft.com/en-us/library/dd229916.aspx
// WebKit Bugs:
//     https://bugs.webkit.org/show_bug.cgi?id=36423

function doesDefinePropertyWork(object) {
    try {
        Object.defineProperty(object, "sentinel", {});
        return "sentinel" in object;
    } catch (exception) {
        // returns falsy
    }
}

// check whether defineProperty works if it's given. Otherwise,
// shim partially.
if (Object.defineProperty) {
    var definePropertyWorksOnObject = doesDefinePropertyWork({});
    var definePropertyWorksOnDom = typeof document == "undefined" ||
        doesDefinePropertyWork(document.createElement("div"));
    if (!definePropertyWorksOnObject || !definePropertyWorksOnDom) {
        var definePropertyFallback = Object.defineProperty;
    }
}

if (!Object.defineProperty || definePropertyFallback) {
    var ERR_NON_OBJECT_DESCRIPTOR = "Property description must be an object: ";
    var ERR_NON_OBJECT_TARGET = "Object.defineProperty called on non-object: "
    var ERR_ACCESSORS_NOT_SUPPORTED = "getters & setters can not be defined " +
                                      "on this javascript engine";

    Object.defineProperty = function defineProperty(object, property, descriptor) {
        if ((typeof object != "object" && typeof object != "function") || object === null)
            throw new TypeError(ERR_NON_OBJECT_TARGET + object);
        if ((typeof descriptor != "object" && typeof descriptor != "function") || descriptor === null)
            throw new TypeError(ERR_NON_OBJECT_DESCRIPTOR + descriptor);

        // make a valiant attempt to use the real defineProperty
        // for I8's DOM elements.
        if (definePropertyFallback) {
            try {
                return definePropertyFallback.call(Object, object, property, descriptor);
            } catch (exception) {
                // try the shim if the real one doesn't work
            }
        }

        // If it's a data property.
        if (owns(descriptor, "value")) {
            // fail silently if "writable", "enumerable", or "configurable"
            // are requested but not supported
            /*
            // alternate approach:
            if ( // can't implement these features; allow false but not true
                !(owns(descriptor, "writable") ? descriptor.writable : true) ||
                !(owns(descriptor, "enumerable") ? descriptor.enumerable : true) ||
                !(owns(descriptor, "configurable") ? descriptor.configurable : true)
            )
                throw new RangeError(
                    "This implementation of Object.defineProperty does not " +
                    "support configurable, enumerable, or writable."
                );
            */

            if (supportsAccessors && (lookupGetter(object, property) ||
                                      lookupSetter(object, property)))
            {
                // As accessors are supported only on engines implementing
                // `__proto__` we can safely override `__proto__` while defining
                // a property to make sure that we don't hit an inherited
                // accessor.
                var prototype = object.__proto__;
                object.__proto__ = prototypeOfObject;
                // Deleting a property anyway since getter / setter may be
                // defined on object itself.
                delete object[property];
                object[property] = descriptor.value;
                // Setting original `__proto__` back now.
                object.__proto__ = prototype;
            } else {
                object[property] = descriptor.value;
            }
        } else {
            if (!supportsAccessors)
                throw new TypeError(ERR_ACCESSORS_NOT_SUPPORTED);
            // If we got that far then getters and setters can be defined !!
            if (owns(descriptor, "get"))
                defineGetter(object, property, descriptor.get);
            if (owns(descriptor, "set"))
                defineSetter(object, property, descriptor.set);
        }

        return object;
    };
}

// ES5 15.2.3.7
// http://es5.github.com/#x15.2.3.7
if (!Object.defineProperties) {
    Object.defineProperties = function defineProperties(object, properties) {
        for (var property in properties) {
            if (owns(properties, property))
                Object.defineProperty(object, property, properties[property]);
        }
        return object;
    };
}

// ES5 15.2.3.8
// http://es5.github.com/#x15.2.3.8
if (!Object.seal) {
    Object.seal = function seal(object) {
        // this is misleading and breaks feature-detection, but
        // allows "securable" code to "gracefully" degrade to working
        // but insecure code.
        return object;
    };
}

// ES5 15.2.3.9
// http://es5.github.com/#x15.2.3.9
if (!Object.freeze) {
    Object.freeze = function freeze(object) {
        // this is misleading and breaks feature-detection, but
        // allows "securable" code to "gracefully" degrade to working
        // but insecure code.
        return object;
    };
}

// detect a Rhino bug and patch it
try {
    Object.freeze(function () {});
} catch (exception) {
    Object.freeze = (function freeze(freezeObject) {
        return function freeze(object) {
            if (typeof object == "function") {
                return object;
            } else {
                return freezeObject(object);
            }
        };
    })(Object.freeze);
}

// ES5 15.2.3.10
// http://es5.github.com/#x15.2.3.10
if (!Object.preventExtensions) {
    Object.preventExtensions = function preventExtensions(object) {
        // this is misleading and breaks feature-detection, but
        // allows "securable" code to "gracefully" degrade to working
        // but insecure code.
        return object;
    };
}

// ES5 15.2.3.11
// http://es5.github.com/#x15.2.3.11
if (!Object.isSealed) {
    Object.isSealed = function isSealed(object) {
        return false;
    };
}

// ES5 15.2.3.12
// http://es5.github.com/#x15.2.3.12
if (!Object.isFrozen) {
    Object.isFrozen = function isFrozen(object) {
        return false;
    };
}

// ES5 15.2.3.13
// http://es5.github.com/#x15.2.3.13
if (!Object.isExtensible) {
    Object.isExtensible = function isExtensible(object) {
        // 1. If Type(O) is not Object throw a TypeError exception.
        if (Object(object) === object) {
            throw new TypeError(); // TODO message
        }
        // 2. Return the Boolean value of the [[Extensible]] internal property of O.
        var name = '';
        while (owns(object, name)) {
            name += '?';
        }
        object[name] = true;
        var returnValue = owns(object, name);
        delete object[name];
        return returnValue;
    };
}

// ES5 15.2.3.14
// http://es5.github.com/#x15.2.3.14
if (!Object.keys) {
    // http://whattheheadsaid.com/2010/10/a-safer-object-keys-compatibility-implementation
    var hasDontEnumBug = true,
        dontEnums = [
            "toString",
            "toLocaleString",
            "valueOf",
            "hasOwnProperty",
            "isPrototypeOf",
            "propertyIsEnumerable",
            "constructor"
        ],
        dontEnumsLength = dontEnums.length;

    for (var key in {"toString": null}) {
        hasDontEnumBug = false;
    }

    Object.keys = function keys(object) {

        if (
            (typeof object != "object" && typeof object != "function") ||
            object === null
        ) {
            throw new TypeError("Object.keys called on a non-object");
        }

        var keys = [];
        for (var name in object) {
            if (owns(object, name)) {
                keys.push(name);
            }
        }

        if (hasDontEnumBug) {
            for (var i = 0, ii = dontEnumsLength; i < ii; i++) {
                var dontEnum = dontEnums[i];
                if (owns(object, dontEnum)) {
                    keys.push(dontEnum);
                }
            }
        }
        return keys;
    };

}

//
// most of es5-shim Date section is removed since ace doesn't need it, it is too intrusive and it causes problems for users
// ====
//

// ES5 15.9.4.4
// http://es5.github.com/#x15.9.4.4
if (!Date.now) {
    Date.now = function now() {
        return new Date().getTime();
    };
}


//
// String
// ======
//

// ES5 15.5.4.20
// http://es5.github.com/#x15.5.4.20
var ws = "\x09\x0A\x0B\x0C\x0D\x20\xA0\u1680\u180E\u2000\u2001\u2002\u2003" +
    "\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\u2028" +
    "\u2029\uFEFF";
if (!String.prototype.trim || ws.trim()) {
    // http://blog.stevenlevithan.com/archives/faster-trim-javascript
    // http://perfectionkills.com/whitespace-deviations/
    ws = "[" + ws + "]";
    var trimBeginRegexp = new RegExp("^" + ws + ws + "*"),
        trimEndRegexp = new RegExp(ws + ws + "*$");
    String.prototype.trim = function trim() {
        return String(this).replace(trimBeginRegexp, "").replace(trimEndRegexp, "");
    };
}

//
// Util
// ======
//

// ES5 9.4
// http://es5.github.com/#x9.4
// http://jsperf.com/to-integer

function toInteger(n) {
    n = +n;
    if (n !== n) { // isNaN
        n = 0;
    } else if (n !== 0 && n !== (1/0) && n !== -(1/0)) {
        n = (n > 0 || -1) * Math.floor(Math.abs(n));
    }
    return n;
}

function isPrimitive(input) {
    var type = typeof input;
    return (
        input === null ||
        type === "undefined" ||
        type === "boolean" ||
        type === "number" ||
        type === "string"
    );
}

function toPrimitive(input) {
    var val, valueOf, toString;
    if (isPrimitive(input)) {
        return input;
    }
    valueOf = input.valueOf;
    if (typeof valueOf === "function") {
        val = valueOf.call(input);
        if (isPrimitive(val)) {
            return val;
        }
    }
    toString = input.toString;
    if (typeof toString === "function") {
        val = toString.call(input);
        if (isPrimitive(val)) {
            return val;
        }
    }
    throw new TypeError();
}

// ES5 9.9
// http://es5.github.com/#x9.9
var toObject = function (o) {
    if (o == null) { // this matches both null and undefined
        throw new TypeError("can't convert "+o+" to object");
    }
    return Object(o);
};

});
/* ***** BEGIN LICENSE BLOCK *****
 * Distributed under the BSD license:
 *
 * Copyright (c) 2010, Ajax.org B.V.
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *     * Redistributions of source code must retain the above copyright
 *       notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above copyright
 *       notice, this list of conditions and the following disclaimer in the
 *       documentation and/or other materials provided with the distribution.
 *     * Neither the name of Ajax.org B.V. nor the
 *       names of its contributors may be used to endorse or promote products
 *       derived from this software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL AJAX.ORG B.V. BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * ***** END LICENSE BLOCK ***** */

define('ace/lib/event_emitter', ['require', 'exports', 'module' ], function(require, exports, module) {
"use strict";

var EventEmitter = {};
var stopPropagation = function() { this.propagationStopped = true; };
var preventDefault = function() { this.defaultPrevented = true; };

EventEmitter._emit =
EventEmitter._dispatchEvent = function(eventName, e) {
    this._eventRegistry || (this._eventRegistry = {});
    this._defaultHandlers || (this._defaultHandlers = {});

    var listeners = this._eventRegistry[eventName] || [];
    var defaultHandler = this._defaultHandlers[eventName];
    if (!listeners.length && !defaultHandler)
        return;

    if (typeof e != "object" || !e)
        e = {};

    if (!e.type)
        e.type = eventName;
    if (!e.stopPropagation)
        e.stopPropagation = stopPropagation;
    if (!e.preventDefault)
        e.preventDefault = preventDefault;

    for (var i=0; i<listeners.length; i++) {
        listeners[i](e, this);
        if (e.propagationStopped)
            break;
    }
    
    if (defaultHandler && !e.defaultPrevented)
        return defaultHandler(e, this);
};


EventEmitter._signal = function(eventName, e) {
    var listeners = (this._eventRegistry || {})[eventName];
    if (!listeners)
        return;

    for (var i=0; i<listeners.length; i++)
        listeners[i](e, this);
};

EventEmitter.once = function(eventName, callback) {
    var _self = this;
    callback && this.addEventListener(eventName, function newCallback() {
        _self.removeEventListener(eventName, newCallback);
        callback.apply(null, arguments);
    });
};


EventEmitter.setDefaultHandler = function(eventName, callback) {
    var handlers = this._defaultHandlers
    if (!handlers)
        handlers = this._defaultHandlers = {_disabled_: {}};
    
    if (handlers[eventName]) {
        var old = handlers[eventName];
        var disabled = handlers._disabled_[eventName];
        if (!disabled)
            handlers._disabled_[eventName] = disabled = [];
        disabled.push(old);
        var i = disabled.indexOf(callback);
        if (i != -1) 
            disabled.splice(i, 1);
    }
    handlers[eventName] = callback;
};
EventEmitter.removeDefaultHandler = function(eventName, callback) {
    var handlers = this._defaultHandlers
    if (!handlers)
        return;
    var disabled = handlers._disabled_[eventName];
    
    if (handlers[eventName] == callback) {
        var old = handlers[eventName];
        if (disabled)
            this.setDefaultHandler(eventName, disabled.pop());
    } else if (disabled) {
        var i = disabled.indexOf(callback);
        if (i != -1)
            disabled.splice(i, 1);
    }
};

EventEmitter.on =
EventEmitter.addEventListener = function(eventName, callback, capturing) {
    this._eventRegistry = this._eventRegistry || {};

    var listeners = this._eventRegistry[eventName];
    if (!listeners)
        listeners = this._eventRegistry[eventName] = [];

    if (listeners.indexOf(callback) == -1)
        listeners[capturing ? "unshift" : "push"](callback);
    return callback;
};

EventEmitter.off =
EventEmitter.removeListener =
EventEmitter.removeEventListener = function(eventName, callback) {
    this._eventRegistry = this._eventRegistry || {};

    var listeners = this._eventRegistry[eventName];
    if (!listeners)
        return;

    var index = listeners.indexOf(callback);
    if (index !== -1)
        listeners.splice(index, 1);
};

EventEmitter.removeAllListeners = function(eventName) {
    if (this._eventRegistry) this._eventRegistry[eventName] = [];
};

exports.EventEmitter = EventEmitter;

});
/* ***** BEGIN LICENSE BLOCK *****
 * Distributed under the BSD license:
 *
 * Copyright (c) 2010, Ajax.org B.V.
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *     * Redistributions of source code must retain the above copyright
 *       notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above copyright
 *       notice, this list of conditions and the following disclaimer in the
 *       documentation and/or other materials provided with the distribution.
 *     * Neither the name of Ajax.org B.V. nor the
 *       names of its contributors may be used to endorse or promote products
 *       derived from this software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL AJAX.ORG B.V. BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * ***** END LICENSE BLOCK ***** */

define('ace/lib/oop', ['require', 'exports', 'module' ], function(require, exports, module) {
"use strict";

exports.inherits = (function() {
    var tempCtor = function() {};
    return function(ctor, superCtor) {
        tempCtor.prototype = superCtor.prototype;
        ctor.super_ = superCtor.prototype;
        ctor.prototype = new tempCtor();
        ctor.prototype.constructor = ctor;
    };
}());

exports.mixin = function(obj, mixin) {
    for (var key in mixin) {
        obj[key] = mixin[key];
    }
    return obj;
};

exports.implement = function(proto, mixin) {
    exports.mixin(proto, mixin);
};

});
/**
 * Cloud9 Language Foundation
 *
 * @copyright 2011, Ajax.org B.V.
 * @license GPLv3 <http://www.gnu.org/licenses/gpl.txt>
 */
/**
 * Language Worker
 * This code runs in a WebWorker in the browser. Its main job is to
 * delegate messages it receives to the various handlers that have registered
 * themselves with the worker.
 */
define('ext/language/worker', ['require', 'exports', 'module' , 'ace/lib/oop', 'ace/worker/mirror', 'treehugger/tree', 'ace/lib/event_emitter', 'ext/linereport/linereport_base', 'ext/language/syntax_detector', 'ext/codecomplete/complete_util'], function(require, exports, module) {

var oop = require("ace/lib/oop");
var Mirror = require("ace/worker/mirror").Mirror;
var tree = require('treehugger/tree');
var EventEmitter = require("ace/lib/event_emitter").EventEmitter;
var linereport = require("ext/linereport/linereport_base");
var SyntaxDetector = require("ext/language/syntax_detector");
var completeUtil = require("ext/codecomplete/complete_util");

var isInWebWorker = typeof window == "undefined" || !window.location || !window.document;

var WARNING_LEVELS = {
    error: 3,
    warning: 2,
    info: 1
};

// Leaking into global namespace of worker, to allow handlers to have access
/*global disabledFeatures: true*/
disabledFeatures = {};

EventEmitter.once = function(event, fun) {
  var _self = this;
  var newCallback = function() {
    fun && fun.apply(null, arguments);
    _self.removeEventListener(event, newCallback);
  };
  this.addEventListener(event, newCallback);
};

var ServerProxy = function(sender) {

  this.emitter = Object.create(EventEmitter);
  this.emitter.emit = this.emitter._dispatchEvent;

  this.send = function(data) {
      sender.emit("serverProxy", data);
  };

  this.once = function(messageType, messageSubtype, callback) {
    var channel = messageType;
    if (messageSubtype)
       channel += (":" + messageSubtype);
    this.emitter.once(channel, callback);
  };

  this.subscribe = function(messageType, messageSubtype, callback) {
    var channel = messageType;
    if (messageSubtype)
       channel += (":" + messageSubtype);
    this.emitter.addEventListener(channel, callback);
  };

  this.unsubscribe = function(messageType, messageSubtype, f) {
    var channel = messageType;
    if (messageSubtype)
       channel += (":" + messageSubtype);
    this.emitter.removeEventListener(channel, f);
  };

  this.onMessage = function(msg) {
    var channel = msg.type;
    if (msg.subtype)
      channel += (":" + msg.subtype);
    // console.log("publish to: " + channel);
    this.emitter.emit(channel, msg.body);
  };
};

exports.createUIWorkerClient = function() {
    var emitter = Object.create(require("ace/lib/event_emitter").EventEmitter);
    var result = new LanguageWorker(emitter);
    result.on = function(name, f) {
        emitter.on.call(result, name, f);
    };
    result.once = function(name, f) {
        emitter.once.call(result, name, f);
    };
    result.removeEventListener = function(f) {
        emitter.removeEventListener.call(result, f);
    };
    result.call = function(cmd, args, callback) {
        if (callback) {
            var id = this.callbackId++;
            this.callbacks[id] = callback;
            args.push(id);
        }
        this.send(cmd, args);
    };
    result.send = function(cmd, args) {
        setTimeout(function() { result[cmd].apply(result, args); }, 0);
    };
    result.emit = function(event, data) {
        emitter._dispatchEvent.call(emitter, event, data);
    };
    emitter.emit = function(event, data) {
        emitter._dispatchEvent.call(result, event, { data: data });
    };
    result.changeListener = function(e) {
        this.emit("change", {data: [e.data]});
    }; 
    return result;
};

var LanguageWorker = exports.LanguageWorker = function(sender) {
    var _self = this;
    this.handlers = [];
    this.currentMarkers = [];
    this.$lastAggregateActions = {};
    this.$warningLevel = "info";
    sender.once = EventEmitter.once;
    this.serverProxy = new ServerProxy(sender);

    Mirror.call(this, sender);
    linereport.sender = sender;
    this.setTimeout(500);

    sender.on("hierarchy", function(event) {
        _self.hierarchy(event);
    });
    sender.on("code_format", function(event) {
        _self.codeFormat();
    });
    sender.on("outline", applyEventOnce(function(event) {
        _self.outline(event);
    }));
    sender.on("complete", applyEventOnce(function(data) {
        _self.complete(data);
    }));
    sender.on("documentClose", function(event) {
        _self.documentClose(event);
    });
    sender.on("analyze", applyEventOnce(function(event) {
        _self.analyze(function() { });
    }));
    sender.on("cursormove", function(event) {
        _self.onCursorMove(event);
    });
    sender.on("inspect", applyEventOnce(function(event) {
        _self.inspect(event);
    }));
    sender.on("change", applyEventOnce(function() {
        _self.scheduledUpdate = true;
    }));
    sender.on("jumpToDefinition", applyEventOnce(function(event) {
        _self.jumpToDefinition(event);
    }));
    sender.on("isJumpToDefinitionAvailable", applyEventOnce(function(event) {
        _self.isJumpToDefinitionAvailable(event);
    }));
    sender.on("fetchVariablePositions", function(event) {
        _self.sendVariablePositions(event);
    });
    sender.on("onRenameBegin", function(event) {
        _self.onRenameBegin(event);
    });
    sender.on("commitRename", function(event) {
        _self.commitRename(event);
    });
    sender.on("onRenameCancel", function(event) {
        _self.onRenameCancel(event);
    });
    sender.on("serverProxy", function(event) {
        _self.serverProxy.onMessage(event.data);
    });
};

/**
 * Ensure that an event handler is called only once if multiple
 * events are received at the same time.
 **/
function applyEventOnce(eventHandler) {
    var timer;
    return function() {
        var _arguments = arguments;
        if (timer)
            clearTimeout(timer);
        timer = setTimeout(function() { eventHandler.apply(eventHandler, _arguments); }, 0);
    };
}

oop.inherits(LanguageWorker, Mirror);

function asyncForEach(array, fn, callback) {
    array = array.slice(0); // Just to be sure
    function processOne() {
        var item = array.pop();
        fn(item, function(result, err) {
            if (array.length > 0) {
                processOne();
            }
            else if (callback) {
                callback(result, err);
            }
        });
    }
    if (array.length > 0) {
        processOne();
    }
    else if (callback) {
        callback();
    }
}

function asyncParForEach(array, fn, callback) {
    var completed = 0;
    var arLength = array.length;
    if (arLength === 0) {
        callback();
    }
    for (var i = 0; i < arLength; i++) {
        fn(array[i], function(result, err) {
            completed++;
            if (completed === arLength && callback) {
                callback(result, err);
            }
        });
    }
}

(function() {

    this.getLastAggregateActions = function() {
        if(!this.$lastAggregateActions[this.$path])
            this.$lastAggregateActions[this.$path] = {markers: [], hint: null};
        return this.$lastAggregateActions[this.$path];
    };

    this.setLastAggregateActions = function(actions) {
        this.$lastAggregateActions[this.$path] = actions;
    };

    this.enableFeature = function(name) {
        disabledFeatures[name] = false;
    };

    this.disableFeature = function(name) {
        disabledFeatures[name] = true;
    };

    this.setWarningLevel = function(level) {
        this.$warningLevel = level;
    };

    /**
     * Registers a handler by loading its code and adding it the handler array
     */
    this.register = function(path, contents, callback) {
        var _self = this;
        function onRegistered(handler) {
            handler.$source = path;
            handler.proxy = _self.serverProxy;
            handler.sender = _self.sender;
            handler.$isInited = false;
            _self.handlers.push(handler);
            _self.$initHandler(handler, null, true, function() {
                // Note: may not return for a while for asynchronous workers,
                //       don't use this for queueing other tasks
                _self.sender.emit("registered", { path: path });
                callback && callback();
            });
        }
        if (contents) {
            // In the context of this worker, we can't use the standard
            // require.js approach of using <script/> tags to load scripts,
            // but need to load them from the local domain or from text
            // instead. For now, we'll just load external plugins from text;
            // the UI thread'll have to provide them in that format.
            // Note that this indirect eval call evaluates in the (worker)
            // global context.
            try {
                eval.call(null, contents);
            } catch (e) {
                console.error("Could not load language handler " + path + ": " + e);
                _self.sender.emit("registered", { path: path, err: e });
                callback && callback(e);
                throw e;
            }
        }
        var handler;
        try {
            handler = require(path);
        } catch (e) {
            if (isInWebWorker) {
                console.error("Could not load language handler " + path + ": " + e);
                _self.sender.emit("registered", { path: path, err: e });
                callback && callback(e);
                throw e;
            }
            // In ?noworker=1 debugging mode, synchronous require doesn't work
            require([path], function(handler) {
                if (!handler) {
                    _self.sender.emit("registered", { path: path, err: "Could not load" });
                    callback && callback("Could not load");
                    throw new Error("Could not load language handler " + path);
                }
                onRegistered(handler);
            });
            return;
        }
        onRegistered(handler);
    };

    this.parse = function(part, callback, allowCached) {
        var _self = this;
        part = part || {
            language: _self.$language,
            value: _self.doc.getValue()
        };

        if (allowCached && this.cachedAsts) {
            var cached = this.cachedAsts[part.index];
            if (cached && cached.ast && cached.part.language === part.language)
                return callback(cached.ast);
        }

        var resultAst = null;
        asyncForEach(this.handlers, function(handler, next) {
            if (handler.handlesLanguage(part.language) && part.value.length < handler.getMaxFileSizeSupported()) {
                handler.parse(part.value, function onParse(ast) {
                    if(ast)
                        resultAst = ast;
                    next();
                });
            }
            else {
                next();
            }
        }, function() {
            callback(resultAst);
        });
    };

    /**
     * Finds the current node using the language handler.
     * This should always be preferred over the treehugger findNode()
     * method.
     */
    this.findNode = function(ast, pos, callback) {
        if (!ast)
            return callback();
        var _self = this;
        var rowColPos = {row: pos.line, column: pos.col};
        var part = SyntaxDetector.getContextSyntaxPart(_self.doc, rowColPos, _self.$language);
        var language = part.language;
        var posInPart = SyntaxDetector.posToRegion(part.region, rowColPos);
        posInPart = {line: posInPart.row, col: posInPart.column};
        var result;
        asyncForEach(_self.handlers, function(handler, next) {
            if (handler.handlesLanguage(language) && part.value.length < handler.getMaxFileSizeSupported()) {
                handler.findNode(ast, posInPart, function(node) {
                    if (node)
                        result = node;
                    next();
                });
            }
            else {
                next();
            }
        }, function() { callback(result); });
    };

    this.outline = function(event) {
        var _self = this;
        var foundHandler = false;
        var docLength = this.doc.$lines.reduce(function(t,l) { return t + l.length; }, 0);
        this.parse(null, function(ast) {
            asyncForEach(_self.handlers, function(handler, next) {
                if (handler.handlesLanguage(_self.$language) && docLength < handler.getMaxFileSizeSupported()) {
                    handler.outline(_self.doc, ast, function(outline) {
                        if (outline) {
                            foundHandler = true;
                            outline.ignoreFilter = event.data.ignoreFilter;
                            return _self.sender.emit("outline", outline);
                        }
                        else {
                            next();
                        }
                    });
                }
                else
                    next();
            }, function() {
                if (!foundHandler)
                    _self.sender.emit("outline", { body: [] });
            });
        });
    };

    this.hierarchy = function(event) {
        var data = event.data;
        var _self = this;
        var docLength = this.doc.$lines.reduce(function(t,l) { return t + l.length; }, 0);
        asyncForEach(this.handlers, function(handler, next) {
            if (handler.handlesLanguage(_self.$language) && docLength < handler.getMaxFileSizeSupported()) {
                handler.hierarchy(_self.doc, data.pos, function(hierarchy) {
                    if(hierarchy)
                        return _self.sender.emit("hierarchy", hierarchy);
                    else
                        next();
                });
            }
            else
                next();
        });
    };

    this.codeFormat = function() {
        var _self = this;
        var docLength = this.doc.$lines.reduce(function(t,l) { return t + l.length; }, 0);
        asyncForEach(_self.handlers, function(handler, next) {
            if (handler.handlesLanguage(_self.$language) && docLength < handler.getMaxFileSizeSupported()) {
                handler.codeFormat(_self.doc, function(newSource) {
                    if(newSource)
                        return _self.sender.emit("code_format", newSource);
                });
            }
            else
                next();
        });
    };

    this.scheduleEmit = function(messageType, data) {
        this.sender.emit(messageType, data);
    };

    /**
     * If the program contains a syntax error, the parser will try its best to still produce
     * an AST, although it will contain some problems. To avoid that those problems result in
     * invalid warning, let's filter out warnings that appear within a line or too after the
     * syntax error.
     */
    function filterMarkersAroundError(ast, markers) {
        if (!ast || !ast.getAnnotation)
            return;
        var error = ast.getAnnotation("error");
        if(!error)
            return;
        for (var i = 0; i < markers.length; i++) {
            var marker = markers[i];
            if(marker.type !== 'error' && marker.pos.sl >= error.line && marker.pos.el <= error.line + 2) {
                markers.splice(i, 1);
                i--;
            }
        }
    }

    /**
     * @param onlyHandler Optional: specified if only a specific handler should be used.
     */
    this.analyze = function(callback) {
        var _self = this;
        var parts = SyntaxDetector.getCodeParts(this.doc, this.$language);
        var markers = [];
        var cachedAsts = {};
        asyncForEach(parts, function(part, nextPart) {
            var partMarkers = [];
            _self.parse(part, function(ast) {
                cachedAsts[part.index] = {part: part, ast: ast};

                asyncForEach(_self.handlers, function(handler, next) {
                    if (handler.handlesLanguage(part.language) && part.value.length < handler.getMaxFileSizeSupported()) {
                        handler.analyze(part.value, ast, function(result) {
                            if (result){
                                handler.getResolutions(part.value, ast, result, function(result2) {
                                    if (result2) {
                                        partMarkers = partMarkers.concat(result2);
                                    } else {
                                        partMarkers = partMarkers.concat(result);
                                    }
                                    next();
                                });
                            }
                            else {
                                next();
                            }
                        });
                    }
                    else {
                        next();
                    }
                }, function () {
                    filterMarkersAroundError(ast, partMarkers);
                    var region = part.region;
                    partMarkers.forEach(function (marker) {
                        if (marker.skipMixed)
                            return;
                        var pos = marker.pos;
                        pos.sl = pos.el = pos.sl + region.sl;
                        if (pos.sl === region.sl) {
                            pos.sc +=  region.sc;
                            pos.ec += region.sc;
                        }
                    });
                    markers = markers.concat(partMarkers);
                    nextPart();
                });
            });
        }, function() {
            var extendedMakers = markers;
            if (_self.getLastAggregateActions().markers.length > 0)
                extendedMakers = markers.concat(_self.getLastAggregateActions().markers);
            _self.cachedAsts = cachedAsts;
            _self.scheduleEmit("markers", _self.filterMarkersBasedOnLevel(extendedMakers));
            _self.currentMarkers = markers;
            if (_self.postponedCursorMove) {
                _self.onCursorMove(_self.postponedCursorMove);
                _self.postponedCursorMove = null;
            }
            callback();
        });
    };
    
    this.checkForMarker = function(pos) {
        var astPos = {line: pos.row, col: pos.column};
        for (var i = 0; i < this.currentMarkers.length; i++) {
            var currentMarker = this.currentMarkers[i];
            if (currentMarker.message && tree.inRange(currentMarker.pos, astPos)) {
                return currentMarker.message;
            }
        }
    };

    this.filterMarkersBasedOnLevel = function(markers) {
        for (var i = 0; i < markers.length; i++) {
            var marker = markers[i];
            if(marker.level && WARNING_LEVELS[marker.level] < WARNING_LEVELS[this.$warningLevel]) {
                markers.splice(i, 1);
                i--;
            }
        }
        return markers;
    };

    this.getPart = function (pos) {
        return SyntaxDetector.getContextSyntaxPart(this.doc, pos, this.$language);
    };
    
    /**
     * Request the AST node on the current position
     */
    this.inspect = function (event) {
        var _self = this;
        var part = this.getPart({ row: event.data.row, column: event.data.col });
        this.parse(part, function(ast) {
            // find the current node based on the ast and the position data
            _self.findNode(ast, { line: event.data.row, col: event.data.col }, function(node) {
                // find a handler that can build an expression for this language
                var handler = _self.handlers.filter(function (h) {
                    return h.handlesLanguage(part.language) && part.value.length < h.getMaxFileSizeSupported() && h.buildExpression;
                });

                // then invoke it and build an expression out of this
                if (node && handler && handler.length) {
                    var expression = {
                        pos: node.getPos(),
                        value: handler[0].buildExpression(node)
                    };
                    _self.scheduleEmit("inspect", expression);
                }
            });
        }, true);
    };
    
    this.getIdentifierRegex = function(pos) {
        var part = this.getPart(pos || { row: 0, column: 0 });
        var result;
        this.handlers.forEach(function (h) {
            if (h.handlesLanguage(part.language))
                result = h.getIdentifierRegex() || result;
        });
        return result || completeUtil.DEFAULT_ID_REGEX;
    };

    this.onCursorMove = function(event) {
        if(this.scheduledUpdate) {
            // Postpone the cursor move until the update propagates
            this.postponedCursorMove = event;
            return;
        }
        var pos = event.data;
        var part = this.getPart(pos);

        var _self = this;
        var hintMessage = ""; // this.checkForMarker(pos) || "";

        var aggregateActions = {markers: [], hint: null, displayPos: null, enableRefactorings: []};
        
        function cursorMoved(ast, currentNode, currentPos) {
            asyncForEach(_self.handlers, function(handler, next) {
                if (handler.handlesLanguage(part.language) && part.value.length < handler.getMaxFileSizeSupported()) {
                    handler.onCursorMovedNode(_self.doc, ast, currentPos, currentNode, function(response) {
                        if (!response)
                            return next();
                        if (response.markers && response.markers.length > 0) {
                            aggregateActions.markers = aggregateActions.markers.concat(response.markers.map(function (m) {
                                var start = SyntaxDetector.regionToPos(part.region, {row: m.pos.sl, column: m.pos.sc});
                                var end = SyntaxDetector.regionToPos(part.region, {row: m.pos.el, column: m.pos.ec});
                                m.pos = {
                                    sl: start.row,
                                    sc: start.column,
                                    el: end.row,
                                    ec: end.column
                                };
                                return m;
                            }));
                        }
                        if (response.enableRefactorings && response.enableRefactorings.length > 0) {
                            aggregateActions.enableRefactorings = aggregateActions.enableRefactorings.concat(response.enableRefactorings);
                        }
                        if (response.hint) {
                            if (aggregateActions.hint)
                                aggregateActions.hint += "\n" + response.hint;
                            else
                                aggregateActions.hint = response.hint;
                        }
                        if (response.displayPos) {
                            aggregateActions.displayPos = response.displayPos;
                        }
                        next();
                    });
                }
                else
                    next();
            }, function() {
                if (aggregateActions.hint && !hintMessage) {
                    hintMessage = aggregateActions.hint;
                }
                _self.scheduleEmit("markers", _self.filterMarkersBasedOnLevel(_self.currentMarkers.concat(aggregateActions.markers)));
                _self.scheduleEmit("enableRefactorings", aggregateActions.enableRefactorings);
                _self.lastCurrentNode = currentNode;
                _self.lastCurrentPos = currentPos;
                _self.setLastAggregateActions(aggregateActions);
                _self.scheduleEmit("hint", {
                    pos: pos,
                    displayPos: aggregateActions.displayPos,
                    message: hintMessage
                });
            });

        }

        var currentPos = {line: pos.row, col: pos.column};
        var posInPart = SyntaxDetector.posToRegion(part.region, pos);
        this.parse(part, function(ast) {
            _self.findNode(ast, currentPos, function(currentNode) {
                if (currentPos != _self.lastCurrentPos || currentNode !== _self.lastCurrentNode || pos.force) {
                    cursorMoved(ast, currentNode, posInPart);
                }
            });
        }, true);
    };

    this.$getDefinitionDeclarations = function (row, col, callback) {
        var pos = { row: row, column: col };
        var allResults = [];

        var _self = this;
        var part = this.getPart(pos);

        this.parse(part, function(ast) {
            _self.findNode(ast, {line: pos.row, col: pos.column}, function(currentNode) {
                if (!currentNode)
                    return callback();
                
                asyncForEach(_self.handlers, function(handler, next) {
                    if (handler.handlesLanguage(part.language) && part.value.length < handler.getMaxFileSizeSupported()) {
                        handler.jumpToDefinition(_self.doc, ast, pos, currentNode, function(results) {
                            handler.path = _self.$path;
                            if (results)
                                allResults = allResults.concat(results);
                            next();
                        });
                    }
                    else {
                        next();
                    }
                }, function () {
                    callback(allResults.map(function (pos) {
                       return SyntaxDetector.regionToPos(part.region, pos);
                    }));
                });
            });
        }, true);
    };

    this.jumpToDefinition = function(event) {
        var _self = this;
        var pos = event.data;

        _self.$getDefinitionDeclarations(pos.row, pos.column, function(results) {
            _self.sender.emit("definition", { pos: pos, results: results || [] });
        });
    };

    this.isJumpToDefinitionAvailable = function(event) {
        var _self = this;
        var pos = event.data;

        _self.$getDefinitionDeclarations(pos.row, pos.column, function(results) {
            _self.sender.emit("isJumpToDefinitionAvailableResult", { value: !!(results && results.length) });
        });
    };

    this.sendVariablePositions = function(event) {
        var pos = event.data;
        var _self = this;
        
        var part = this.getPart(pos);

        function regionToPos (pos) {
            return SyntaxDetector.regionToPos(part.region, pos);
        }

        var regionPos = SyntaxDetector.posToRegion(part.region, pos);

        this.parse(part, function(ast) {
            _self.findNode(ast, {line: pos.row, col: pos.column}, function(currentNode) {
                asyncForEach(_self.handlers, function(handler, next) {
                    if (handler.handlesLanguage(part.language) && part.value.length < handler.getMaxFileSizeSupported()) {
                        handler.getVariablePositions(_self.doc, ast, regionPos, currentNode, function(response) {
                            if (response) {
                                response.uses = response.uses.map(regionToPos);
                                response.declarations = response.declarations.map(regionToPos);
                                response.others = response.others.map(regionToPos);
                                response.pos = regionToPos(response.pos);
                                _self.sender.emit("variableLocations", response);
                            }
                            next();
                        });
                    }
                    else {
                        next();
                    }
                });
            });
        }, true);
    };

    this.onRenameBegin = function(event) {
        var _self = this;
        this.handlers.forEach(function(handler) {
            if (handler.handlesLanguage(_self.$language) && _self.doc.length < handler.getMaxFileSizeSupported())
                handler.onRenameBegin(_self.doc, function() {});
        });
    };

    this.commitRename = function(event) {
        var _self = this;
        var data = event.data;

        var oldId = data.oldId;
        var newName = data.newName;
        var commited = false;

        asyncForEach(this.handlers, function(handler, next) {
            if (handler.handlesLanguage(_self.$language)) {
                handler.commitRename(_self.doc, oldId, newName, function(response) {
                    if (response) {
                        commited = true;
                        _self.sender.emit("refactorResult", response);
                    } else {
                        next();
                    }
                });
            }
            else
                next();
            }, function() {
            if (!commited)
                _self.sender.emit("refactorResult", {success: true});
            });
    };

    this.onRenameCancel = function(event) {
        var _self = this;
        asyncForEach(this.handlers, function(handler, next) {
            if (handler.handlesLanguage(_self.$language)) {
                handler.onRenameCancel(function() {
                    next();
                });
        }
            else
                next();
        });
    };

    this.onUpdate = function() {
        this.scheduledUpdate = false;
        var _self = this;
        asyncForEach(this.handlers, function(handler, next) {
            if (handler.handlesLanguage(_self.$language) && _self.doc.length < handler.getMaxFileSizeSupported())
                handler.onUpdate(_self.doc, next);
            else
                next();
        }, function() {
            _self.analyze(function() {});
        });
    };

    this.switchFile = function(path, language, code, pos, workspaceDir) {
        var _self = this;
        var oldPath = this.$path;
        code = code || "";
        linereport.workspaceDir = this.$workspaceDir = (workspaceDir === "" ? "/" : workspaceDir);
        linereport.path = this.$path = path;
        this.$language = language;
        this.lastCurrentNode = null;
        this.lastCurrentPos = null;
        this.cachedAsts = null;
        this.setValue(code);
        asyncForEach(this.handlers, function(handler, next) {
            _self.$initHandler(handler, oldPath, false, next);
        });
    };

    this.$initHandler = function(handler, oldPath, onDocumentOpen, callback) {
        function waitForPath() {
            if (_self.$path || !handler.$isInitCompleted)
                return callback();
            setTimeout(waitForPath, 500);
        }
        var _self = this;
        if (!this.$path) {
            // console.error("Warning: language handler registered without first calling switchFile");
            return waitForPath();
        }
        handler.path = this.$path;
        handler.language = this.$language;
        handler.workspaceDir = this.$workspaceDir;
        handler.doc = this.doc;
        handler.sender = this.sender;
        handler.$completeUpdate = this.completeUpdate.bind(this);
        handler.$getIdentifierRegex = this.getIdentifierRegex.bind(this);
        if (!handler.$isInited) {
            handler.$isInited = true;
            handler.init(function() {
                // Note: may not return for a while for asynchronous workers,
                //       don't use this for queueing other tasks
                handler.onDocumentOpen(_self.$path, _self.doc, oldPath, function() {});
                if (handler.handlesLanguage(_self.$language) && handler.getIdentifierRegex())
                    _self.sender.emit("setIdentifierRegex", { language: _self.$language, identifierRegex: handler.getIdentifierRegex() });
                if (handler.handlesLanguage(_self.$language) && handler.getCompletionRegex())
                    _self.sender.emit("setCompletionRegex", { language: _self.$language, completionRegex: handler.getCompletionRegex() });
                handler.$isInitCompleted = true;
                callback();
            });
        }
        else if (onDocumentOpen) {
            handler.onDocumentOpen(_self.$path, _self.doc, oldPath, callback);
        }
    };

    this.documentOpen = function(path, language, code) {
        var _self = this;
        var doc = {getValue: function() {return code;} };
        asyncForEach(this.handlers, function(handler, next) {
            handler.onDocumentOpen(path, doc, _self.path, next);
        });
    };
    
    this.documentClose = function(event) {
        var path = event.data;
        asyncForEach(this.handlers, function(handler, next) {
            handler.onDocumentClose(path, next);
        });
    };

    // For code completion
    function removeDuplicateMatches(matches) {
        // First sort
        matches.sort(function(a, b) {
            if (a.name < b.name)
                return 1;
            else if (a.name > b.name)
                return -1;
            else
                return 0;
        });
        for (var i = 0; i < matches.length - 1; i++) {
            var a = matches[i];
            var b = matches[i + 1];
            if (a.name === b.name) {
                // Duplicate!
                if (a.priority < b.priority)
                    matches.splice(i, 1);
                else if (a.priority > b.priority)
                    matches.splice(i+1, 1);
                else if (a.score < b.score)
                    matches.splice(i, 1);
                else if (a.score > b.score)
                    matches.splice(i+1, 1);
                else
                    matches.splice(i, 1);
                i--;
            }
        }
    }

    this.complete = function(event) {
        var _self = this;

        var data = event.data;
        
        var line = _self.doc.getLine(data.pos.row);
        if (!completeUtil.canCompleteForChangedLine(data.line, line, data.pos, data.pos, this.getIdentifierRegex()))
            return;
        
        var pos = data.pos;
        var part = SyntaxDetector.getContextSyntaxPart(_self.doc, data.pos, _self.$language);
        var language = part.language;
        this.parse(part, function(ast) {
            var currentPos = { line: pos.row, col: pos.column };
            _self.findNode(ast, currentPos, function(node) {
                var currentNode = node;
                var matches = [];

                asyncForEach(_self.handlers, function(handler, next) {
                    if (handler.handlesLanguage(language) && part.value.length < handler.getMaxFileSizeSupported()) {
                            handler.staticPrefix = data.staticPrefix;
                            handler.language = language;
                            handler.workspaceDir = _self.$workspaceDir;
                            handler.path = _self.$path;
                            handler.complete(_self.doc, ast, data.pos, currentNode, function(completions) {
                            if (completions)
                                matches = matches.concat(completions);
                            next();
                        });
                    }
                    else {
                        next();
                    }
                }, function() {
                    removeDuplicateMatches(matches);
                    // Sort by priority, score
                    matches.sort(function(a, b) {
                        if (a.priority < b.priority)
                            return 1;
                        else if (a.priority > b.priority)
                            return -1;
                        else if (a.score < b.score)
                            return 1;
                        else if (a.score > b.score)
                            return -1;
                        else if (a.id && a.id === b.id) {
                            if (a.isFunction)
                                return -1;
                            else if (b.isFunction)
                                return 1;
                        }
                        if (a.name < b.name)
                            return -1;
                        else if(a.name > b.name)
                            return 1;
                        else
                            return 0;
                    });
                    _self.sender.emit("complete", {
                        pos: pos,
                        matches: matches,
                        isUpdate: event.data.isUpdate,
                        line: line
                    });
                });
            });
        });
    };
    
    /**
     * Retrigger completion if the popup is still open and new
     * information is now available.
     */
    this.completeUpdate = function(pos, line) {
        if (!isInWebWorker) { // Avoid making the stack too deep in ?noworker=1 mode
            var _self = this;
            setTimeout(function onCompleteUpdate() {
                _self.complete({data: {pos: pos, line: line, staticPrefix: _self.staticPrefix, isUpdate: true}});
            }, 0);
        }
        else {
            this.complete({data: {pos: pos, line: line, staticPrefix: this.staticPrefix, isUpdate: true}});
        }
    };

}).call(LanguageWorker.prototype);

});
define('ace/worker/mirror', ['require', 'exports', 'module' , 'ace/document', 'ace/lib/lang'], function(require, exports, module) {
"use strict";

var Document = require("../document").Document;
var lang = require("../lib/lang");
    
var Mirror = exports.Mirror = function(sender) {
    this.sender = sender;
    var doc = this.doc = new Document("");
    
    var deferredUpdate = this.deferredUpdate = lang.delayedCall(this.onUpdate.bind(this));
    
    var _self = this;
    sender.on("change", function(e) {
        doc.applyDeltas(e.data);
        deferredUpdate.schedule(_self.$timeout);
    });
};

(function() {
    
    this.$timeout = 500;
    
    this.setTimeout = function(timeout) {
        this.$timeout = timeout;
    };
    
    this.setValue = function(value) {
        this.doc.setValue(value);
        this.deferredUpdate.schedule(this.$timeout);
    };
    
    this.getValue = function(callbackId) {
        this.sender.callback(this.doc.getValue(), callbackId);
    };
    
    this.onUpdate = function() {
        // abstract method
    };
    
}).call(Mirror.prototype);

});
/* ***** BEGIN LICENSE BLOCK *****
 * Distributed under the BSD license:
 *
 * Copyright (c) 2010, Ajax.org B.V.
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *     * Redistributions of source code must retain the above copyright
 *       notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above copyright
 *       notice, this list of conditions and the following disclaimer in the
 *       documentation and/or other materials provided with the distribution.
 *     * Neither the name of Ajax.org B.V. nor the
 *       names of its contributors may be used to endorse or promote products
 *       derived from this software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL AJAX.ORG B.V. BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * ***** END LICENSE BLOCK ***** */

define('ace/document', ['require', 'exports', 'module' , 'ace/lib/oop', 'ace/lib/event_emitter', 'ace/range', 'ace/anchor'], function(require, exports, module) {
"use strict";

var oop = require("./lib/oop");
var EventEmitter = require("./lib/event_emitter").EventEmitter;
var Range = require("./range").Range;
var Anchor = require("./anchor").Anchor;

/**
 * Contains the text of the document. Document can be attached to several [[EditSession `EditSession`]]s. 
 *
 * At its core, `Document`s are just an array of strings, with each row in the document matching up to the array index.
 *
 * @class Document
 **/

 /**
 *
 * Creates a new `Document`. If `text` is included, the `Document` contains those strings; otherwise, it's empty.
 * @param {String | Array} text The starting text
 * @constructor
 **/

var Document = function(text) {
    this.$lines = [];

    // There has to be one line at least in the document. If you pass an empty
    // string to the insert function, nothing will happen. Workaround.
    if (text.length == 0) {
        this.$lines = [""];
    } else if (Array.isArray(text)) {
        this._insertLines(0, text);
    } else {
        this.insert({row: 0, column:0}, text);
    }
};

(function() {

    oop.implement(this, EventEmitter);

    /**
    * Replaces all the lines in the current `Document` with the value of `text`.
    *
    * @param {String} text The text to use
    **/
    this.setValue = function(text) {
        var len = this.getLength();
        this.remove(new Range(0, 0, len, this.getLine(len-1).length));
        this.insert({row: 0, column:0}, text);
    };

    /**
    * Returns all the lines in the document as a single string, split by the new line character.
    **/
    this.getValue = function() {
        return this.getAllLines().join(this.getNewLineCharacter());
    };

    /** 
    * Creates a new `Anchor` to define a floating point in the document.
    * @param {Number} row The row number to use
    * @param {Number} column The column number to use
    *
    **/
    this.createAnchor = function(row, column) {
        return new Anchor(this, row, column);
    };

    /** 
    * Splits a string of text on any newline (`\n`) or carriage-return ('\r') characters.
    *
    * @method $split
    * @param {String} text The text to work with
    * @returns {String} A String array, with each index containing a piece of the original `text` string.
    *
    **/

    // check for IE split bug
    if ("aaa".split(/a/).length == 0)
        this.$split = function(text) {
            return text.replace(/\r\n|\r/g, "\n").split("\n");
        }
    else
        this.$split = function(text) {
            return text.split(/\r\n|\r|\n/);
        };


    this.$detectNewLine = function(text) {
        var match = text.match(/^.*?(\r\n|\r|\n)/m);
        this.$autoNewLine = match ? match[1] : "\n";
    };

    /**
    * Returns the newline character that's being used, depending on the value of `newLineMode`. 
    * @returns {String} If `newLineMode == windows`, `\r\n` is returned.  
    *  If `newLineMode == unix`, `\n` is returned.  
    *  If `newLineMode == auto`, the value of `autoNewLine` is returned.
    *
    **/
    this.getNewLineCharacter = function() {
        switch (this.$newLineMode) {
          case "windows":
            return "\r\n";
          case "unix":
            return "\n";
          default:
            return this.$autoNewLine;
        }
    };

    this.$autoNewLine = "\n";
    this.$newLineMode = "auto";
    /**
     * [Sets the new line mode.]{: #Document.setNewLineMode.desc}
     * @param {String} newLineMode [The newline mode to use; can be either `windows`, `unix`, or `auto`]{: #Document.setNewLineMode.param}
     *
     **/
    this.setNewLineMode = function(newLineMode) {
        if (this.$newLineMode === newLineMode)
            return;

        this.$newLineMode = newLineMode;
    };

    /**
    * [Returns the type of newlines being used; either `windows`, `unix`, or `auto`]{: #Document.getNewLineMode}
    * @returns {String}
    **/
    this.getNewLineMode = function() {
        return this.$newLineMode;
    };

    /**
    * Returns `true` if `text` is a newline character (either `\r\n`, `\r`, or `\n`).
    * @param {String} text The text to check
    *
    **/
    this.isNewLine = function(text) {
        return (text == "\r\n" || text == "\r" || text == "\n");
    };

    /**
    * Returns a verbatim copy of the given line as it is in the document
    * @param {Number} row The row index to retrieve
    *
    **/
    this.getLine = function(row) {
        return this.$lines[row] || "";
    };

    /**
    * Returns an array of strings of the rows between `firstRow` and `lastRow`. This function is inclusive of `lastRow`.
    * @param {Number} firstRow The first row index to retrieve
    * @param {Number} lastRow The final row index to retrieve
    *
    **/
    this.getLines = function(firstRow, lastRow) {
        return this.$lines.slice(firstRow, lastRow + 1);
    };

    /**
    * Returns all lines in the document as string array. Warning: The caller should not modify this array!
    **/
    this.getAllLines = function() {
        return this.getLines(0, this.getLength());
    };

    /**
    * Returns the number of rows in the document.
    **/
    this.getLength = function() {
        return this.$lines.length;
    };

    /**
    * [Given a range within the document, this function returns all the text within that range as a single string.]{: #Document.getTextRange.desc}
    * @param {Range} range The range to work with
    * 
    * @returns {String}
    **/
    this.getTextRange = function(range) {
        if (range.start.row == range.end.row) {
            return this.getLine(range.start.row)
                .substring(range.start.column, range.end.column);
        }
        var lines = this.getLines(range.start.row, range.end.row);
        lines[0] = (lines[0] || "").substring(range.start.column);
        var l = lines.length - 1;
        if (range.end.row - range.start.row == l)
            lines[l] = lines[l].substring(0, range.end.column);
        return lines.join(this.getNewLineCharacter());
    };

    this.$clipPosition = function(position) {
        var length = this.getLength();
        if (position.row >= length) {
            position.row = Math.max(0, length - 1);
            position.column = this.getLine(length-1).length;
        } else if (position.row < 0)
            position.row = 0;
        return position;
    };

    /**
    * Inserts a block of `text` at the indicated `position`.
    * @param {Object} position The position to start inserting at; it's an object that looks like `{ row: row, column: column}`
    * @param {String} text A chunk of text to insert
    * @returns {Object} The position ({row, column}) of the last line of `text`. If the length of `text` is 0, this function simply returns `position`. 
    *
    **/
    this.insert = function(position, text) {
        if (!text || text.length === 0)
            return position;

        position = this.$clipPosition(position);

        // only detect new lines if the document has no line break yet
        if (this.getLength() <= 1)
            this.$detectNewLine(text);

        var lines = this.$split(text);
        var firstLine = lines.splice(0, 1)[0];
        var lastLine = lines.length == 0 ? null : lines.splice(lines.length - 1, 1)[0];

        position = this.insertInLine(position, firstLine);
        if (lastLine !== null) {
            position = this.insertNewLine(position); // terminate first line
            position = this._insertLines(position.row, lines);
            position = this.insertInLine(position, lastLine || "");
        }
        return position;
    };

    /**
     * Fires whenever the document changes.
     *
     * Several methods trigger different `"change"` events. Below is a list of each action type, followed by each property that's also available:
     *
     *  * `"insertLines"` (emitted by [[Document.insertLines]])
     *    * `range`: the [[Range]] of the change within the document
     *    * `lines`: the lines in the document that are changing
     *  * `"insertText"` (emitted by [[Document.insertNewLine]])
     *    * `range`: the [[Range]] of the change within the document
     *    * `text`: the text that's being added
     *  * `"removeLines"` (emitted by [[Document.insertLines]])
     *    * `range`: the [[Range]] of the change within the document
     *    * `lines`: the lines in the document that were removed
     *    * `nl`: the new line character (as defined by [[Document.getNewLineCharacter]])
     *  * `"removeText"` (emitted by [[Document.removeInLine]] and [[Document.removeNewLine]])
     *    * `range`: the [[Range]] of the change within the document
     *    * `text`: the text that's being removed
     *
     * @event change
     * @param {Object} e Contains at least one property called `"action"`. `"action"` indicates the action that triggered the change. Each action also has a set of additional properties.
     *
     **/
    /**
    * Inserts the elements in `lines` into the document, starting at the row index given by `row`. This method also triggers the `'change'` event.
    * @param {Number} row The index of the row to insert at
    * @param {Array} lines An array of strings
    * @returns {Object} Contains the final row and column, like this:  
    *   ```
    *   {row: endRow, column: 0}
    *   ```  
    *   If `lines` is empty, this function returns an object containing the current row, and column, like this:  
    *   ``` 
    *   {row: row, column: 0}
    *   ```
    *
    **/
    this.insertLines = function(row, lines) {
        if (row >= this.getLength())
            return this.insert({row: row, column: 0}, "\n" + lines.join("\n"));
        return this._insertLines(Math.max(row, 0), lines);
    };
    this._insertLines = function(row, lines) {
        if (lines.length == 0)
            return {row: row, column: 0};

        // apply doesn't work for big arrays (smallest threshold is on safari 0xFFFF)
        // to circumvent that we have to break huge inserts into smaller chunks here
        if (lines.length > 0xFFFF) {
            var end = this._insertLines(row, lines.slice(0xFFFF));
            lines = lines.slice(0, 0xFFFF);
        }

        var args = [row, 0];
        args.push.apply(args, lines);
        this.$lines.splice.apply(this.$lines, args);

        var range = new Range(row, 0, row + lines.length, 0);
        var delta = {
            action: "insertLines",
            range: range,
            lines: lines
        };
        this._emit("change", { data: delta });
        return end || range.end;
    };

    /**
    * Inserts a new line into the document at the current row's `position`. This method also triggers the `'change'` event. 
    * @param {Object} position The position to insert at
    * @returns {Object} Returns an object containing the final row and column, like this:<br/>
    *    ```
    *    {row: endRow, column: 0}
    *    ```
    *
    **/
    this.insertNewLine = function(position) {
        position = this.$clipPosition(position);
        var line = this.$lines[position.row] || "";

        this.$lines[position.row] = line.substring(0, position.column);
        this.$lines.splice(position.row + 1, 0, line.substring(position.column, line.length));

        var end = {
            row : position.row + 1,
            column : 0
        };

        var delta = {
            action: "insertText",
            range: Range.fromPoints(position, end),
            text: this.getNewLineCharacter()
        };
        this._emit("change", { data: delta });

        return end;
    };

    /**
    * Inserts `text` into the `position` at the current row. This method also triggers the `'change'` event.
    * @param {Object} position The position to insert at; it's an object that looks like `{ row: row, column: column}`
    * @param {String} text A chunk of text
    * @returns {Object} Returns an object containing the final row and column, like this:  
    *     ```
    *     {row: endRow, column: 0}
    *     ```
    *
    **/
    this.insertInLine = function(position, text) {
        if (text.length == 0)
            return position;

        var line = this.$lines[position.row] || "";

        this.$lines[position.row] = line.substring(0, position.column) + text
                + line.substring(position.column);

        var end = {
            row : position.row,
            column : position.column + text.length
        };

        var delta = {
            action: "insertText",
            range: Range.fromPoints(position, end),
            text: text
        };
        this._emit("change", { data: delta });

        return end;
    };

    /**
    * Removes the `range` from the document.
    * @param {Range} range A specified Range to remove
    * @returns {Object} Returns the new `start` property of the range, which contains `startRow` and `startColumn`. If `range` is empty, this function returns the unmodified value of `range.start`.
    *
    **/
    this.remove = function(range) {
        // clip to document
        range.start = this.$clipPosition(range.start);
        range.end = this.$clipPosition(range.end);

        if (range.isEmpty())
            return range.start;

        var firstRow = range.start.row;
        var lastRow = range.end.row;

        if (range.isMultiLine()) {
            var firstFullRow = range.start.column == 0 ? firstRow : firstRow + 1;
            var lastFullRow = lastRow - 1;

            if (range.end.column > 0)
                this.removeInLine(lastRow, 0, range.end.column);

            if (lastFullRow >= firstFullRow)
                this._removeLines(firstFullRow, lastFullRow);

            if (firstFullRow != firstRow) {
                this.removeInLine(firstRow, range.start.column, this.getLine(firstRow).length);
                this.removeNewLine(range.start.row);
            }
        }
        else {
            this.removeInLine(firstRow, range.start.column, range.end.column);
        }
        return range.start;
    };

    /**
    * Removes the specified columns from the `row`. This method also triggers the `'change'` event.
    * @param {Number} row The row to remove from
    * @param {Number} startColumn The column to start removing at 
    * @param {Number} endColumn The column to stop removing at
    * @returns {Object} Returns an object containing `startRow` and `startColumn`, indicating the new row and column values.<br/>If `startColumn` is equal to `endColumn`, this function returns nothing.
    *
    **/
    this.removeInLine = function(row, startColumn, endColumn) {
        if (startColumn == endColumn)
            return;

        var range = new Range(row, startColumn, row, endColumn);
        var line = this.getLine(row);
        var removed = line.substring(startColumn, endColumn);
        var newLine = line.substring(0, startColumn) + line.substring(endColumn, line.length);
        this.$lines.splice(row, 1, newLine);

        var delta = {
            action: "removeText",
            range: range,
            text: removed
        };
        this._emit("change", { data: delta });
        return range.start;
    };

    /**
    * Removes a range of full lines. This method also triggers the `'change'` event.
    * @param {Number} firstRow The first row to be removed
    * @param {Number} lastRow The last row to be removed
    * @returns {[String]} Returns all the removed lines.
    *
    **/
    this.removeLines = function(firstRow, lastRow) {
        if (firstRow < 0 || lastRow >= this.getLength())
            return this.remove(new Range(firstRow, 0, lastRow + 1, 0));
        return this._removeLines(firstRow, lastRow);
    };

    this._removeLines = function(firstRow, lastRow) {
        var range = new Range(firstRow, 0, lastRow + 1, 0);
        var removed = this.$lines.splice(firstRow, lastRow - firstRow + 1);

        var delta = {
            action: "removeLines",
            range: range,
            nl: this.getNewLineCharacter(),
            lines: removed
        };
        this._emit("change", { data: delta });
        return removed;
    };

    /**
    * Removes the new line between `row` and the row immediately following it. This method also triggers the `'change'` event.
    * @param {Number} row The row to check
    *
    **/
    this.removeNewLine = function(row) {
        var firstLine = this.getLine(row);
        var secondLine = this.getLine(row+1);

        var range = new Range(row, firstLine.length, row+1, 0);
        var line = firstLine + secondLine;

        this.$lines.splice(row, 2, line);

        var delta = {
            action: "removeText",
            range: range,
            text: this.getNewLineCharacter()
        };
        this._emit("change", { data: delta });
    };

    /**
    * Replaces a range in the document with the new `text`.
    * @param {Range} range A specified Range to replace
    * @param {String} text The new text to use as a replacement
    * @returns {Object} Returns an object containing the final row and column, like this:
    *     {row: endRow, column: 0}
    * If the text and range are empty, this function returns an object containing the current `range.start` value.
    * If the text is the exact same as what currently exists, this function returns an object containing the current `range.end` value.
    *
    **/
    this.replace = function(range, text) {
        if (text.length == 0 && range.isEmpty())
            return range.start;

        // Shortcut: If the text we want to insert is the same as it is already
        // in the document, we don't have to replace anything.
        if (text == this.getTextRange(range))
            return range.end;

        this.remove(range);
        if (text) {
            var end = this.insert(range.start, text);
        }
        else {
            end = range.start;
        }

        return end;
    };

    /**
    * Applies all the changes previously accumulated. These can be either `'includeText'`, `'insertLines'`, `'removeText'`, and `'removeLines'`.
    **/
    this.applyDeltas = function(deltas) {
        for (var i=0; i<deltas.length; i++) {
            var delta = deltas[i];
            var range = Range.fromPoints(delta.range.start, delta.range.end);

            if (delta.action == "insertLines")
                this.insertLines(range.start.row, delta.lines);
            else if (delta.action == "insertText")
                this.insert(range.start, delta.text);
            else if (delta.action == "removeLines")
                this._removeLines(range.start.row, range.end.row - 1);
            else if (delta.action == "removeText")
                this.remove(range);
        }
    };

    /**
    * Reverts any changes previously applied. These can be either `'includeText'`, `'insertLines'`, `'removeText'`, and `'removeLines'`.
    **/
    this.revertDeltas = function(deltas) {
        for (var i=deltas.length-1; i>=0; i--) {
            var delta = deltas[i];

            var range = Range.fromPoints(delta.range.start, delta.range.end);

            if (delta.action == "insertLines")
                this._removeLines(range.start.row, range.end.row - 1);
            else if (delta.action == "insertText")
                this.remove(range);
            else if (delta.action == "removeLines")
                this._insertLines(range.start.row, delta.lines);
            else if (delta.action == "removeText")
                this.insert(range.start, delta.text);
        }
    };

    /**
     * Converts an index position in a document to a `{row, column}` object.
     *
     * Index refers to the "absolute position" of a character in the document. For example:
     *
     * ```javascript
     * var x = 0; // 10 characters, plus one for newline
     * var y = -1;
     * ```
     * 
     * Here, `y` is an index 15: 11 characters for the first row, and 5 characters until `y` in the second.
     *
     * @param {Number} index An index to convert
     * @param {Number} startRow=0 The row from which to start the conversion
     * @returns {Object} A `{row, column}` object of the `index` position
     */
    this.indexToPosition = function(index, startRow) {
        var lines = this.$lines || this.getAllLines();
        var newlineLength = this.getNewLineCharacter().length;
        for (var i = startRow || 0, l = lines.length; i < l; i++) {
            index -= lines[i].length + newlineLength;
            if (index < 0)
                return {row: i, column: index + lines[i].length + newlineLength};
        }
        return {row: l-1, column: lines[l-1].length};
    };

    /**
     * Converts the `{row, column}` position in a document to the character's index.
     *
     * Index refers to the "absolute position" of a character in the document. For example:
     *
     * ```javascript
     * var x = 0; // 10 characters, plus one for newline
     * var y = -1;
     * ```
     * 
     * Here, `y` is an index 15: 11 characters for the first row, and 5 characters until `y` in the second.
     *
     * @param {Object} pos The `{row, column}` to convert
     * @param {Number} startRow=0 The row from which to start the conversion
     * @returns {Number} The index position in the document
     */
    this.positionToIndex = function(pos, startRow) {
        var lines = this.$lines || this.getAllLines();
        var newlineLength = this.getNewLineCharacter().length;
        var index = 0;
        var row = Math.min(pos.row, lines.length);
        for (var i = startRow || 0; i < row; ++i)
            index += lines[i].length + newlineLength;

        return index + pos.column;
    };

}).call(Document.prototype);

exports.Document = Document;
});
/* ***** BEGIN LICENSE BLOCK *****
 * Distributed under the BSD license:
 *
 * Copyright (c) 2010, Ajax.org B.V.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *     * Redistributions of source code must retain the above copyright
 *       notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above copyright
 *       notice, this list of conditions and the following disclaimer in the
 *       documentation and/or other materials provided with the distribution.
 *     * Neither the name of Ajax.org B.V. nor the
 *       names of its contributors may be used to endorse or promote products
 *       derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL AJAX.ORG B.V. BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * ***** END LICENSE BLOCK ***** */

define('ace/range', ['require', 'exports', 'module' ], function(require, exports, module) {
"use strict";
var comparePoints = function(p1, p2) {
    return p1.row - p2.row || p1.column - p2.column;
};
/**
 * This object is used in various places to indicate a region within the editor. To better visualize how this works, imagine a rectangle. Each quadrant of the rectangle is analogus to a range, as ranges contain a starting row and starting column, and an ending row, and ending column.
 * @class Range
 **/

/**
 * Creates a new `Range` object with the given starting and ending row and column points.
 * @param {Number} startRow The starting row
 * @param {Number} startColumn The starting column
 * @param {Number} endRow The ending row
 * @param {Number} endColumn The ending column
 *
 * @constructor
 **/
var Range = function(startRow, startColumn, endRow, endColumn) {
    this.start = {
        row: startRow,
        column: startColumn
    };

    this.end = {
        row: endRow,
        column: endColumn
    };
};

(function() {
    /**
     * Returns `true` if and only if the starting row and column, and ending row and column, are equivalent to those given by `range`.
     * @param {Range} range A range to check against
     *
     * @return {Boolean}
     **/
    this.isEqual = function(range) {
        return this.start.row === range.start.row &&
            this.end.row === range.end.row &&
            this.start.column === range.start.column &&
            this.end.column === range.end.column;
    };

    /**
     *
     * Returns a string containing the range's row and column information, given like this:
     * ```
     *    [start.row/start.column] -> [end.row/end.column]
     * ```
     * @return {String}
     **/
    this.toString = function() {
        return ("Range: [" + this.start.row + "/" + this.start.column +
            "] -> [" + this.end.row + "/" + this.end.column + "]");
    };

    /**
     *
     * Returns `true` if the `row` and `column` provided are within the given range. This can better be expressed as returning `true` if:
     * ```javascript
     *    this.start.row <= row <= this.end.row &&
     *    this.start.column <= column <= this.end.column
     * ```
     * @param {Number} row A row to check for
     * @param {Number} column A column to check for
     * @returns {Boolean}
     * @related Range.compare
     **/

    this.contains = function(row, column) {
        return this.compare(row, column) == 0;
    };

    /**
     * Compares `this` range (A) with another range (B).
     * @param {Range} range A range to compare with
     *
     * @related Range.compare
     * @returns {Number} This method returns one of the following numbers:<br/>
     * <br/>
     * * `-2`: (B) is in front of (A), and doesn't intersect with (A)<br/>
     * * `-1`: (B) begins before (A) but ends inside of (A)<br/>
     * * `0`: (B) is completely inside of (A) OR (A) is completely inside of (B)<br/>
     * * `+1`: (B) begins inside of (A) but ends outside of (A)<br/>
     * * `+2`: (B) is after (A) and doesn't intersect with (A)<br/>
     * * `42`: FTW state: (B) ends in (A) but starts outside of (A)
     **/
    this.compareRange = function(range) {
        var cmp,
            end = range.end,
            start = range.start;

        cmp = this.compare(end.row, end.column);
        if (cmp == 1) {
            cmp = this.compare(start.row, start.column);
            if (cmp == 1) {
                return 2;
            } else if (cmp == 0) {
                return 1;
            } else {
                return 0;
            }
        } else if (cmp == -1) {
            return -2;
        } else {
            cmp = this.compare(start.row, start.column);
            if (cmp == -1) {
                return -1;
            } else if (cmp == 1) {
                return 42;
            } else {
                return 0;
            }
        }
    };

    /**
     * Checks the row and column points of `p` with the row and column points of the calling range.
     *
     * @param {Range} p A point to compare with
     *
     * @related Range.compare
     * @returns {Number} This method returns one of the following numbers:<br/>
     * * `0` if the two points are exactly equal<br/>
     * * `-1` if `p.row` is less then the calling range<br/>
     * * `1` if `p.row` is greater than the calling range<br/>
     * <br/>
     * If the starting row of the calling range is equal to `p.row`, and:<br/>
     * * `p.column` is greater than or equal to the calling range's starting column, this returns `0`<br/>
     * * Otherwise, it returns -1<br/>
     *<br/>
     * If the ending row of the calling range is equal to `p.row`, and:<br/>
     * * `p.column` is less than or equal to the calling range's ending column, this returns `0`<br/>
     * * Otherwise, it returns 1<br/>
     **/
    this.comparePoint = function(p) {
        return this.compare(p.row, p.column);
    };

    /**
     * Checks the start and end points of `range` and compares them to the calling range. Returns `true` if the `range` is contained within the caller's range.
     * @param {Range} range A range to compare with
     *
     * @returns {Boolean}
     * @related Range.comparePoint
     **/
    this.containsRange = function(range) {
        return this.comparePoint(range.start) == 0 && this.comparePoint(range.end) == 0;
    };

    /**
     * Returns `true` if passed in `range` intersects with the one calling this method.
     * @param {Range} range A range to compare with
     *
     * @returns {Boolean}
     **/
    this.intersects = function(range) {
        var cmp = this.compareRange(range);
        return (cmp == -1 || cmp == 0 || cmp == 1);
    };

    /**
     * Returns `true` if the caller's ending row point is the same as `row`, and if the caller's ending column is the same as `column`.
     * @param {Number} row A row point to compare with
     * @param {Number} column A column point to compare with
     *
     * @returns {Boolean}
     **/
    this.isEnd = function(row, column) {
        return this.end.row == row && this.end.column == column;
    };

    /**
     * Returns `true` if the caller's starting row point is the same as `row`, and if the caller's starting column is the same as `column`.
     * @param {Number} row A row point to compare with
     * @param {Number} column A column point to compare with
     *
     * @returns {Boolean}
     **/
    this.isStart = function(row, column) {
        return this.start.row == row && this.start.column == column;
    };

    /**
     * Sets the starting row and column for the range.
     * @param {Number} row A row point to set
     * @param {Number} column A column point to set
     *
     **/
    this.setStart = function(row, column) {
        if (typeof row == "object") {
            this.start.column = row.column;
            this.start.row = row.row;
        } else {
            this.start.row = row;
            this.start.column = column;
        }
    };

    /**
     * Sets the starting row and column for the range.
     * @param {Number} row A row point to set
     * @param {Number} column A column point to set
     *
     **/
    this.setEnd = function(row, column) {
        if (typeof row == "object") {
            this.end.column = row.column;
            this.end.row = row.row;
        } else {
            this.end.row = row;
            this.end.column = column;
        }
    };

    /**
     * Returns `true` if the `row` and `column` are within the given range.
     * @param {Number} row A row point to compare with
     * @param {Number} column A column point to compare with
     *
     *
     * @returns {Boolean}
     * @related Range.compare
     **/
    this.inside = function(row, column) {
        if (this.compare(row, column) == 0) {
            if (this.isEnd(row, column) || this.isStart(row, column)) {
                return false;
            } else {
                return true;
            }
        }
        return false;
    };

    /**
     * Returns `true` if the `row` and `column` are within the given range's starting points.
     * @param {Number} row A row point to compare with
     * @param {Number} column A column point to compare with
     *
     * @returns {Boolean}
     * @related Range.compare
     **/
    this.insideStart = function(row, column) {
        if (this.compare(row, column) == 0) {
            if (this.isEnd(row, column)) {
                return false;
            } else {
                return true;
            }
        }
        return false;
    };

    /**
     * Returns `true` if the `row` and `column` are within the given range's ending points.
     * @param {Number} row A row point to compare with
     * @param {Number} column A column point to compare with
     *
     * @returns {Boolean}
     * @related Range.compare
     *
     **/
    this.insideEnd = function(row, column) {
        if (this.compare(row, column) == 0) {
            if (this.isStart(row, column)) {
                return false;
            } else {
                return true;
            }
        }
        return false;
    };

    /**
     * Checks the row and column points with the row and column points of the calling range.
     * @param {Number} row A row point to compare with
     * @param {Number} column A column point to compare with
     *
     *
     * @returns {Number} This method returns one of the following numbers:<br/>
     * `0` if the two points are exactly equal <br/>
     * `-1` if `p.row` is less then the calling range <br/>
     * `1` if `p.row` is greater than the calling range <br/>
     *  <br/>
     * If the starting row of the calling range is equal to `p.row`, and: <br/>
     * `p.column` is greater than or equal to the calling range's starting column, this returns `0`<br/>
     * Otherwise, it returns -1<br/>
     * <br/>
     * If the ending row of the calling range is equal to `p.row`, and: <br/>
     * `p.column` is less than or equal to the calling range's ending column, this returns `0` <br/>
     * Otherwise, it returns 1
     **/
    this.compare = function(row, column) {
        if (!this.isMultiLine()) {
            if (row === this.start.row) {
                return column < this.start.column ? -1 : (column > this.end.column ? 1 : 0);
            };
        }

        if (row < this.start.row)
            return -1;

        if (row > this.end.row)
            return 1;

        if (this.start.row === row)
            return column >= this.start.column ? 0 : -1;

        if (this.end.row === row)
            return column <= this.end.column ? 0 : 1;

        return 0;
    };

    /**
     * Checks the row and column points with the row and column points of the calling range.
     * @param {Number} row A row point to compare with
     * @param {Number} column A column point to compare with
     *
     * @returns {Number} This method returns one of the following numbers:<br/>
     * <br/>
     * `0` if the two points are exactly equal<br/>
     * `-1` if `p.row` is less then the calling range<br/>
     * `1` if `p.row` is greater than the calling range, or if `isStart` is `true`.<br/>
     * <br/>
     * If the starting row of the calling range is equal to `p.row`, and:<br/>
     * `p.column` is greater than or equal to the calling range's starting column, this returns `0`<br/>
     * Otherwise, it returns -1<br/>
     * <br/>
     * If the ending row of the calling range is equal to `p.row`, and:<br/>
     * `p.column` is less than or equal to the calling range's ending column, this returns `0`<br/>
     * Otherwise, it returns 1
     *
     **/
    this.compareStart = function(row, column) {
        if (this.start.row == row && this.start.column == column) {
            return -1;
        } else {
            return this.compare(row, column);
        }
    };

    /**
     * Checks the row and column points with the row and column points of the calling range.
     * @param {Number} row A row point to compare with
     * @param {Number} column A column point to compare with
     *
     *
     * @returns {Number} This method returns one of the following numbers:<br/>
     * `0` if the two points are exactly equal<br/>
     * `-1` if `p.row` is less then the calling range<br/>
     * `1` if `p.row` is greater than the calling range, or if `isEnd` is `true.<br/>
     * <br/>
     * If the starting row of the calling range is equal to `p.row`, and:<br/>
     * `p.column` is greater than or equal to the calling range's starting column, this returns `0`<br/>
     * Otherwise, it returns -1<br/>
     *<br/>
     * If the ending row of the calling range is equal to `p.row`, and:<br/>
     * `p.column` is less than or equal to the calling range's ending column, this returns `0`<br/>
     * Otherwise, it returns 1
     */
    this.compareEnd = function(row, column) {
        if (this.end.row == row && this.end.column == column) {
            return 1;
        } else {
            return this.compare(row, column);
        }
    };

    /**
     * Checks the row and column points with the row and column points of the calling range.
     * @param {Number} row A row point to compare with
     * @param {Number} column A column point to compare with
     *
     *
     * @returns {Number} This method returns one of the following numbers:<br/>
     * * `1` if the ending row of the calling range is equal to `row`, and the ending column of the calling range is equal to `column`<br/>
     * * `-1` if the starting row of the calling range is equal to `row`, and the starting column of the calling range is equal to `column`<br/>
     * <br/>
     * Otherwise, it returns the value after calling [[Range.compare `compare()`]].
     *
     **/
    this.compareInside = function(row, column) {
        if (this.end.row == row && this.end.column == column) {
            return 1;
        } else if (this.start.row == row && this.start.column == column) {
            return -1;
        } else {
            return this.compare(row, column);
        }
    };

    /**
     * Returns the part of the current `Range` that occurs within the boundaries of `firstRow` and `lastRow` as a new `Range` object.
     * @param {Number} firstRow The starting row
     * @param {Number} lastRow The ending row
     *
     *
     * @returns {Range}
    **/
    this.clipRows = function(firstRow, lastRow) {
        if (this.end.row > lastRow)
            var end = {row: lastRow + 1, column: 0};
        else if (this.end.row < firstRow)
            var end = {row: firstRow, column: 0};

        if (this.start.row > lastRow)
            var start = {row: lastRow + 1, column: 0};
        else if (this.start.row < firstRow)
            var start = {row: firstRow, column: 0};

        return Range.fromPoints(start || this.start, end || this.end);
    };

    /**
     * Changes the row and column points for the calling range for both the starting and ending points.
     * @param {Number} row A new row to extend to
     * @param {Number} column A new column to extend to
     *
     *
     * @returns {Range} The original range with the new row
    **/
    this.extend = function(row, column) {
        var cmp = this.compare(row, column);

        if (cmp == 0)
            return this;
        else if (cmp == -1)
            var start = {row: row, column: column};
        else
            var end = {row: row, column: column};

        return Range.fromPoints(start || this.start, end || this.end);
    };

    this.isEmpty = function() {
        return (this.start.row === this.end.row && this.start.column === this.end.column);
    };

    /**
     *
     * Returns `true` if the range spans across multiple lines.
     * @returns {Boolean}
    **/
    this.isMultiLine = function() {
        return (this.start.row !== this.end.row);
    };

    /**
     *
     * Returns a duplicate of the calling range.
     * @returns {Range}
    **/
    this.clone = function() {
        return Range.fromPoints(this.start, this.end);
    };

    /**
     *
     * Returns a range containing the starting and ending rows of the original range, but with a column value of `0`.
     * @returns {Range}
    **/
    this.collapseRows = function() {
        if (this.end.column == 0)
            return new Range(this.start.row, 0, Math.max(this.start.row, this.end.row-1), 0)
        else
            return new Range(this.start.row, 0, this.end.row, 0)
    };

    /**
     * Given the current `Range`, this function converts those starting and ending points into screen positions, and then returns a new `Range` object.
     * @param {EditSession} session The `EditSession` to retrieve coordinates from
     *
     *
     * @returns {Range}
    **/
    this.toScreenRange = function(session) {
        var screenPosStart = session.documentToScreenPosition(this.start);
        var screenPosEnd = session.documentToScreenPosition(this.end);

        return new Range(
            screenPosStart.row, screenPosStart.column,
            screenPosEnd.row, screenPosEnd.column
        );
    };
    
    
    /* experimental */
    this.moveBy = function(row, column) {
        this.start.row += row;
        this.start.column += column;
        this.end.row += row;
        this.end.column += column;
    };

}).call(Range.prototype);

/**
 * Creates and returns a new `Range` based on the row and column of the given parameters.
 * @param {Range} start A starting point to use
 * @param {Range} end An ending point to use
 *
 * @returns {Range}
**/
Range.fromPoints = function(start, end) {
    return new Range(start.row, start.column, end.row, end.column);
};
Range.comparePoints = comparePoints;

Range.comparePoints = function(p1, p2) {
    return p1.row - p2.row || p1.column - p2.column;
};


exports.Range = Range;
});
/* ***** BEGIN LICENSE BLOCK *****
 * Distributed under the BSD license:
 *
 * Copyright (c) 2010, Ajax.org B.V.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *     * Redistributions of source code must retain the above copyright
 *       notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above copyright
 *       notice, this list of conditions and the following disclaimer in the
 *       documentation and/or other materials provided with the distribution.
 *     * Neither the name of Ajax.org B.V. nor the
 *       names of its contributors may be used to endorse or promote products
 *       derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL AJAX.ORG B.V. BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * ***** END LICENSE BLOCK ***** */

define('ace/anchor', ['require', 'exports', 'module' , 'ace/lib/oop', 'ace/lib/event_emitter'], function(require, exports, module) {
"use strict";

var oop = require("./lib/oop");
var EventEmitter = require("./lib/event_emitter").EventEmitter;

/**
 *
 * Defines the floating pointer in the document. Whenever text is inserted or deleted before the cursor, the position of the cursor is updated.
 *
 * @class Anchor
 **/

/**
 * Creates a new `Anchor` and associates it with a document.
 *
 * @param {Document} doc The document to associate with the anchor
 * @param {Number} row The starting row position
 * @param {Number} column The starting column position
 *
 * @constructor
 **/

var Anchor = exports.Anchor = function(doc, row, column) {
    this.$onChange = this.onChange.bind(this);
    this.attach(doc);
    
    if (typeof column == "undefined")
        this.setPosition(row.row, row.column);
    else
        this.setPosition(row, column);
};

(function() {

    oop.implement(this, EventEmitter);

    /**
     * Returns an object identifying the `row` and `column` position of the current anchor.
     * @returns {Object}
     **/
    this.getPosition = function() {
        return this.$clipPositionToDocument(this.row, this.column);
    };

    /**
     *
     * Returns the current document.
     * @returns {Document}
     **/
    this.getDocument = function() {
        return this.document;
    };

    /**
     * Fires whenever the anchor position changes.
     *
     * Both of these objects have a `row` and `column` property corresponding to the position.
     *
     * Events that can trigger this function include [[Anchor.setPosition `setPosition()`]].
     *
     * @event change
     * @param {Object} e  An object containing information about the anchor position. It has two properties:
     *  - `old`: An object describing the old Anchor position
     *  - `value`: An object describing the new Anchor position
     *
     **/
    this.onChange = function(e) {
        var delta = e.data;
        var range = delta.range;

        if (range.start.row == range.end.row && range.start.row != this.row)
            return;

        if (range.start.row > this.row)
            return;

        if (range.start.row == this.row && range.start.column > this.column)
            return;

        var row = this.row;
        var column = this.column;
        var start = range.start;
        var end = range.end;

        if (delta.action === "insertText") {
            if (start.row === row && start.column <= column) {
                if (start.row === end.row) {
                    //if (start.column == column)
                    column += end.column - start.column;
                } else {
                    column -= start.column;
                    row += end.row - start.row;
                }
            } else if (start.row !== end.row && start.row < row) {
                row += end.row - start.row;
            }
        } else if (delta.action === "insertLines") {
            if (start.row <= row) {
                row += end.row - start.row;
            }
        } else if (delta.action === "removeText") {
            if (start.row === row && start.column < column) {
                if (end.column >= column)
                    column = start.column;
                else
                    column = Math.max(0, column - (end.column - start.column));

            } else if (start.row !== end.row && start.row < row) {
                if (end.row === row)
                    column = Math.max(0, column - end.column) + start.column;
                row -= (end.row - start.row);
            } else if (end.row === row) {
                row -= end.row - start.row;
                column = Math.max(0, column - end.column) + start.column;
            }
        } else if (delta.action == "removeLines") {
            if (start.row <= row) {
                if (end.row <= row)
                    row -= end.row - start.row;
                else {
                    row = start.row;
                    column = 0;
                }
            }
        }

        this.setPosition(row, column, true);
    };

    /**
     * Sets the anchor position to the specified row and column. If `noClip` is `true`, the position is not clipped.
     * @param {Number} row The row index to move the anchor to
     * @param {Number} column The column index to move the anchor to
     * @param {Boolean} noClip Identifies if you want the position to be clipped
     *
     **/
    this.setPosition = function(row, column, noClip) {
        var pos;
        if (noClip) {
            pos = {
                row: row,
                column: column
            };
        } else {
            pos = this.$clipPositionToDocument(row, column);
        }

        if (this.row == pos.row && this.column == pos.column)
            return;

        var old = {
            row: this.row,
            column: this.column
        };

        this.row = pos.row;
        this.column = pos.column;
        this._emit("change", {
            old: old,
            value: pos
        });
    };

    /**
     * When called, the `'change'` event listener is removed.
     *
     **/
    this.detach = function() {
        this.document.removeEventListener("change", this.$onChange);
    };
    this.attach = function(doc) {
        this.document = doc || this.document;
        this.document.on("change", this.$onChange);
    };

    /**
     * Clips the anchor position to the specified row and column.
     * @param {Number} row The row index to clip the anchor to
     * @param {Number} column The column index to clip the anchor to
     *
     **/
    this.$clipPositionToDocument = function(row, column) {
        var pos = {};

        if (row >= this.document.getLength()) {
            pos.row = Math.max(0, this.document.getLength() - 1);
            pos.column = this.document.getLine(pos.row).length;
        }
        else if (row < 0) {
            pos.row = 0;
            pos.column = 0;
        }
        else {
            pos.row = row;
            pos.column = Math.min(this.document.getLine(pos.row).length, Math.max(0, column));
        }

        if (column < 0)
            pos.column = 0;

        return pos;
    };

}).call(Anchor.prototype);

});
/* ***** BEGIN LICENSE BLOCK *****
 * Distributed under the BSD license:
 *
 * Copyright (c) 2010, Ajax.org B.V.
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *     * Redistributions of source code must retain the above copyright
 *       notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above copyright
 *       notice, this list of conditions and the following disclaimer in the
 *       documentation and/or other materials provided with the distribution.
 *     * Neither the name of Ajax.org B.V. nor the
 *       names of its contributors may be used to endorse or promote products
 *       derived from this software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL AJAX.ORG B.V. BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * ***** END LICENSE BLOCK ***** */

define('ace/lib/lang', ['require', 'exports', 'module' ], function(require, exports, module) {
"use strict";

exports.stringReverse = function(string) {
    return string.split("").reverse().join("");
};

exports.stringRepeat = function (string, count) {
    var result = '';
    while (count > 0) {
        if (count & 1)
            result += string;

        if (count >>= 1)
            string += string;
    }
    return result;
};

var trimBeginRegexp = /^\s\s*/;
var trimEndRegexp = /\s\s*$/;

exports.stringTrimLeft = function (string) {
    return string.replace(trimBeginRegexp, '');
};

exports.stringTrimRight = function (string) {
    return string.replace(trimEndRegexp, '');
};

exports.copyObject = function(obj) {
    var copy = {};
    for (var key in obj) {
        copy[key] = obj[key];
    }
    return copy;
};

exports.copyArray = function(array){
    var copy = [];
    for (var i=0, l=array.length; i<l; i++) {
        if (array[i] && typeof array[i] == "object")
            copy[i] = this.copyObject( array[i] );
        else 
            copy[i] = array[i];
    }
    return copy;
};

exports.deepCopy = function (obj) {
    if (typeof obj != "object") {
        return obj;
    }
    
    var copy = obj.constructor();
    for (var key in obj) {
        if (typeof obj[key] == "object") {
            copy[key] = this.deepCopy(obj[key]);
        } else {
            copy[key] = obj[key];
        }
    }
    return copy;
};

exports.arrayToMap = function(arr) {
    var map = {};
    for (var i=0; i<arr.length; i++) {
        map[arr[i]] = 1;
    }
    return map;

};

exports.createMap = function(props) {
    var map = Object.create(null);
    for (var i in props) {
        map[i] = props[i];
    }
    return map;
};

/*
 * splice out of 'array' anything that === 'value'
 */
exports.arrayRemove = function(array, value) {
  for (var i = 0; i <= array.length; i++) {
    if (value === array[i]) {
      array.splice(i, 1);
    }
  }
};

exports.escapeRegExp = function(str) {
    return str.replace(/([.*+?^${}()|[\]\/\\])/g, '\\$1');
};

exports.escapeHTML = function(str) {
    return str.replace(/&/g, "&#38;").replace(/"/g, "&#34;").replace(/'/g, "&#39;").replace(/</g, "&#60;");
};

exports.getMatchOffsets = function(string, regExp) {
    var matches = [];

    string.replace(regExp, function(str) {
        matches.push({
            offset: arguments[arguments.length-2],
            length: str.length
        });
    });

    return matches;
};

/* deprecated */
exports.deferredCall = function(fcn) {

    var timer = null;
    var callback = function() {
        timer = null;
        fcn();
    };

    var deferred = function(timeout) {
        deferred.cancel();
        timer = setTimeout(callback, timeout || 0);
        return deferred;
    };

    deferred.schedule = deferred;

    deferred.call = function() {
        this.cancel();
        fcn();
        return deferred;
    };

    deferred.cancel = function() {
        clearTimeout(timer);
        timer = null;
        return deferred;
    };

    return deferred;
};


exports.delayedCall = function(fcn, defaultTimeout) {
    var timer = null;
    var callback = function() {
        timer = null;
        fcn();
    };

    var _self = function(timeout) {
        timer && clearTimeout(timer);
        timer = setTimeout(callback, timeout || defaultTimeout);
    };

    _self.delay = _self;
    _self.schedule = function(timeout) {
        if (timer == null)
            timer = setTimeout(callback, timeout || 0);
    };

    _self.call = function() {
        this.cancel();
        fcn();
    };

    _self.cancel = function() {
        timer && clearTimeout(timer);
        timer = null;
    };

    _self.isPending = function() {
        return timer;
    };

    return _self;
};
});
define('treehugger/tree', ['require', 'exports', 'module' ], function(require, exports, module) {

function inRange(p, pos, exclusive) {
    if(p && p.sl <= pos.line && pos.line <= p.el) {
        if(p.sl < pos.line && pos.line < p.el)
            return true;
        else if(p.sl == pos.line && pos.line < p.el)
            return p.sc <= pos.col;
        else if(p.sl == pos.line && p.el === pos.line)
            return p.sc <= pos.col && pos.col <= p.ec + (exclusive ? 1 : 0);
        else if(p.sl < pos.line && p.el === pos.line)
            return pos.col <= p.ec + (exclusive ? 1 : 0);
    }
}

/**
 * Base 'class' of every tree node
 */
function Node() {
}

Node.prototype.toPrettyString = function(prefix) {
    prefix = prefix || "";
    return prefix + this.toString();
};

Node.prototype.setAnnotation = function(name, value) {
    this.annos = this.annos || {};
    this.annos[name] = value;
};

Node.prototype.getAnnotation = function(name) {
    return this.annos ? this.annos[name] : undefined;
};

Node.prototype.getPos = function() {
    if(this.annos && this.annos.pos) {
        return this.annos.pos;
    } else {
        return null;
    }
};

Node.prototype.findNode = function(pos) {
    var p = this.getPos();
    if(inRange(p, pos)) {
        return this;
    } else {
        return null;
    }
};

/**
 * Represents a constructor node
 * 
 * Example: Add(Num("1"), Num("2")) is constucted
 *    using new ConsNode(new ConsNode("Num", [new StringNode("1")]),
 *                                         new ConsNode("Num", [new StringNode("2")]))
 *    or, more briefly:
 *        tree.cons("Add", [tree.cons("Num", [ast.string("1"), ast.string("2")])])
 */
function ConsNode(cons, children) {
    this.cons = cons;
    for(var i = 0; i < children.length; i++) {
        this[i] = children[i];
    }
    this.length = children.length;
}

ConsNode.prototype = new Node();

/**
 * Simple human-readable string representation (no indentation)
 */
ConsNode.prototype.toString = function(prefix) {
    try {
        var s = this.cons + "(";
        for ( var i = 0; i < this.length; i++) {
            s += this[i].toString() + ",";
        }
        if (this.length > 0) {
            s = s.substring(0, s.length - 1);
        }
        return s + ")";
    } catch(e) {
        console.error("Something went wrong: ", this, e);
    }
};

/**
 * Human-readable string representation (indentented)
 * @param prefix is for internal use
 */
ConsNode.prototype.toPrettyString = function(prefix) {
    prefix = prefix || "";
    try {
        if(this.length === 0) {
            return prefix + this.cons + "()";
        }
        if(this.length === 1 && (this[0] instanceof StringNode || this[0] instanceof NumNode)) {
            return prefix + this.cons + "(" + this[0].toString() + ")";
        }
        var s = prefix + this.cons + "(\n";
        for ( var i = 0; i < this.length; i++) {
            s += this[i].toPrettyString(prefix + "    ") + ",\n";
        }
        s = s.substring(0, s.length - 2);
        s += "\n";
        return s + prefix + ")";
    } catch(e) {
        console.error("Something went wrong: ", this, e);
    }
};

/**
 * Matches the current term against `t`, writing matching placeholder values to `matches`
 * @param t the node to match against
 * @param matches the object to write placeholder values to
 * @returns the `matches` object if it matches, false otherwise
 */
ConsNode.prototype.match = function(t, matches) {
    matches = matches || {};
    if (t instanceof ConsNode) {
        if (this.cons === t.cons) {
            if (this.length === t.length) {
                for ( var i = 0; i < this.length; i++) {
                    if (!this[i].match(t[i], matches)) {
                        return false;
                    }
                }
                return matches;
            }
        }
    }
    return false;
};

/**
 * Builds a node, based on values (similar to `matches` object),
 * replacing placeholder nodes with values from `values`
 * @returns resulting cons node
 */
ConsNode.prototype.build = function(values) {
    var children = [];
    for ( var i = 0; i < this.length; i++) {
        children.push(this[i].build(values));
    }
    return new ConsNode(this.cons, children);
};

/**
 * Prettier JSON representation of constructor node.
 */
ConsNode.prototype.toJSON = function() {
    var l = [];
    for(var i = 0; i < this.length; i++) {
        l.push(this[i]);
    }
    return {cons: this.cons, children: l};
};

ConsNode.prototype.getPos = function() {
    var pos = {sl : 9999999999,
               sc : 9999999999,
               el : 0,
               ec : 0};
    if (this.getAnnotation("pos")) {
        var nodePos = this.getAnnotation("pos");
        pos = {sl : nodePos.sl,
               sc : nodePos.sc,
               el : nodePos.el,
               ec : nodePos.ec};
    }
    for (var i = 0; i < this.length; i++) {
        var p = this[i].getPos();

        if (p) {
            var oldSl = pos.sl;
            pos.sl = Math.min(pos.sl, p.sl);
            if(pos.sl !== oldSl)
                pos.sc = p.sc;
            else
                pos.sc = Math.min(pos.sc, p.sc);
            var oldEl = pos.el;
            pos.el = Math.max(pos.el, p.el);
            if(pos.el !== oldEl)
                pos.ec = p.ec;
            else if (pos.el === p.el)
                pos.ec = Math.max(pos.ec, p.ec);
        }
    }
    return pos;
};

ConsNode.prototype.findNode = function(pos) {
    var p = this.getPos();

    if(inRange(p, pos)) {
        for(var i = 0; i < this.length; i++) {
            var p2 = this[i].getPos();
            if(inRange(p2, pos)) {
                var node = this[i].findNode(pos);
                if(node)
                    return node instanceof StringNode ? this : node;
                else
                    return this[i];
            }
        }
    } else {
        return null;
    }
};

/**
 * Constructor node factory.
 */
exports.cons = function(name, children) {
    return new ConsNode(name, children);
};

/**
 * AST node representing a list
 * e.g. for constructors with variable number of arguments, e.g. in
 *      Call(Var("alert"), [Num("10"), Num("11")])
 * 
 */
function ListNode (children) {
    for(var i = 0; i < children.length; i++)
        this[i] = children[i];
    this.length = children.length;
}

ListNode.prototype = new Node();

ListNode.prototype.toString = function() {
    var s = "[";
    for (var i = 0; i < this.length; i++)
        s += this[i].toString() + ",";
    if (this.length > 0)
        s = s.substring(0, s.length - 1);
    return s + "]";
};

ListNode.prototype.toPrettyString = function(prefix) {
    prefix = prefix || "";
    try {
        if(this.length === 0)
            return prefix + "[]";
        var s = prefix + "[\n";
        for ( var i = 0; i < this.length; i++)
            s += this[i].toPrettyString(prefix + "  ") + ",\n";
        s = s.substring(0, s.length - 2);
        s += "\n";
        return s + prefix + "]";
    } catch(e) {
        console.error("Something went wrong: ", this);
    }
};

ListNode.prototype.match = function(t, matches) {
    matches = matches || {};
    if (t instanceof ListNode) {
        if (this.length === t.length) {
            for ( var i = 0; i < this.length; i++)
                if (!this[i].match(t[i], matches))
                    return false;
            return matches;
        }
        else
            return false;
    }
    else
        return false;
};

ListNode.prototype.build = function(values) {
    var children = [];
    for (var i = 0; i < this.length; i++)
        children.push(this[i].build(values));
    return new ListNode(children);
};

ListNode.prototype.getPos = ConsNode.prototype.getPos;
ListNode.prototype.findNode = ConsNode.prototype.findNode;

/**
 * forEach implementation, similar to Array.prototype.forEach
 */
ListNode.prototype.forEach = function(fn) {
    for(var i = 0; i < this.length; i++) {
        fn.call(this[i], this[i], i);
    }
};

/**
 * Whether the list is empty (0 elements)
 */
ListNode.prototype.isEmpty = function() {
    return this.length === 0;
};

/**
 * Performs linear search, performing a match
 * with each element in the list
 * @param el the element to search for
 * @returns true if found, false if not
 */
ListNode.prototype.contains = function(el) {
    for(var i = 0; i < this.length; i++)
        if(el.match(this[i]))
            return true;
    return false;
};

/**
 * Concatenates list with another list, similar to Array.prototype.concat
 */
ListNode.prototype.concat = function(l) {
    var ar = [];
    for(var i = 0; i < this.length; i++)
        ar.push(this[i]);
    for(i = 0; i < l.length; i++)
        ar.push(l[i]);
    return exports.list(ar);
};

ListNode.prototype.toJSON = function() {
    var l = [];
    for(var i = 0; i < this.length; i++)
        l.push(this[i]);
    return l;
};

/**
 * Returns a new list node, with all duplicates removed
 * Note: cubic complexity algorithm used
 */
ListNode.prototype.removeDuplicates = function() {
    var newList = [];
    lbl: for(var i = 0; i < this.length; i++) {
        for(var j = 0; j < newList.length; j++)
            if(newList[j].match(this[i]))
                continue lbl;
        newList.push(this[i]);
    }
    return new exports.list(newList);
};

ListNode.prototype.toArray = ListNode.prototype.toJSON;

/**
 * ListNode factory
 */
exports.list = function(elements) {
    return new ListNode(elements);
};

function NumNode (value) {
    this.value = value;
}

NumNode.prototype = new Node();

NumNode.prototype.toString = function() {
    return ""+this.value;
};

NumNode.prototype.match = function(t, matches) {
    matches = matches || {};
    if (t instanceof NumNode)
        return this.value === t.value ? matches : false;
    else
        return false;
};

NumNode.prototype.build = function(values) {
    return this;
};

exports.num = function(value) {
    return new NumNode(value);
};

function StringNode (value) {
    this.value = value;
}

StringNode.prototype = new Node();

StringNode.prototype.toString = function() {
    return '"' + this.value + '"';
};

StringNode.prototype.match = function(t, matches) {
    matches = matches || {};
    if (t instanceof StringNode)
        return this.value === t.value ? matches : false;
    else
        return false;
};

StringNode.prototype.build = function(values) {
    return this;
};

exports.string = function(value) {
    return new StringNode(value);
};

function PlaceholderNode(id) {
    this.id = id;
}

PlaceholderNode.prototype = new Node();

PlaceholderNode.prototype.toString = function() {
    return this.id;
};

PlaceholderNode.prototype.match = function(t, matches) {
    matches = matches || {};
    if(this.id === '_')
        return matches;
    if(matches[this.id]) // already bound
        return matches[this.id].match(t);
    else {
        matches[this.id] = t;
        return matches;
    }
};

PlaceholderNode.prototype.build = function(values) {
    return values[this.id];
};

exports.placeholder = function(n) {
    return new PlaceholderNode(n);
};

var parseCache = {};

function parse (s) {
    var idx = 0;
    function accept (str) {
        for ( var i = 0; i < str.length && idx + i < s.length; i++) {
            if (str[i] != s[idx + i]) {
                return false;
            }
        }
        return i == str.length;
    }
    function lookAheadLetter() {
        return s[idx] >= 'a' && s[idx] <= 'z' || s[idx] >= 'A' && s[idx] <= 'Z' || s[idx] === '_' || s[idx] >= '0' && s[idx] <= '9';
    }
    function skipWhitespace () {
        while (idx < s.length && (s[idx] === " " || s[idx] === "\n" || s[idx] === "\r" || s[idx] === "\t")) {
            idx++;
        }
    }
    function parseInt () {
        var pos = idx;
        if (s[idx] >= '0' && s[idx] <= '9') {
            var ns = s[idx];
            idx++;
            while (idx < s.length && s[idx] >= '0' && s[idx] <= '9') {
                ns += s[idx];
                idx++;
            }
            skipWhitespace();
            return new NumNode(+ns, pos);
        } else {
            return null;
        }
    }
    function parseString () {
        var pos = idx;
        if (accept('"')) {
            var ns = "";
            idx++;
            while (!accept('"') || (accept('"') && s[idx - 1] == '\\')) {
                ns += s[idx];
                idx++;
            }
            var ns2 = '';
            for ( var i = 0; i < ns.length; i++) {
                if (ns[i] == "\\") {
                    i++;
                    switch (ns[i]) {
                        case 'n':
                            ns2 += "\n";
                            break;
                        case 't':
                            ns2 += "\t";
                            break;
                        default:
                            ns2 += ns[i];
                    }
                } else {
                    ns2 += ns[i];
                }
            }
            idx++;
            skipWhitespace();
            return new StringNode(ns2, pos);
        } else {
          return null;
        }
    }
    function parsePlaceholder() {
        var pos = idx;
        if (lookAheadLetter() && s[idx].toLowerCase() === s[idx]) {
            var ns = "";
            while (lookAheadLetter() && idx < s.length) {
                ns += s[idx];
                idx++;
            }
            skipWhitespace();
            return new PlaceholderNode(ns, pos);
        }
        else {
            return null;
        }
    }
    function parseList() {
        var pos = idx;
        if (accept('[')) {
            var items = [];
            idx++;
            skipWhitespace();
            while (!accept(']') && idx < s.length) {
                items.push(parseExp());
                if (accept(',')) {
                    idx++; // skip comma
                    skipWhitespace();
                }
            }
            idx++;
            skipWhitespace();
            return new ListNode(items, pos);
        }
        else {
            return null;
        }
    }
    function parseCons () {
        var pos = idx;
        // assumption: it's an appl
        var ns = "";
        while (!accept('(')) {
            ns += s[idx];
            idx++;
        }
        idx++; // skip (
        var items = [];
        while (!accept(')') && idx < s.length) {
            items.push(parseExp());
            if (accept(',')) {
                idx++; // skip comma
                skipWhitespace();
            }
        }
        idx++;
        skipWhitespace();
        return new ConsNode(ns, items, pos);
    }

    function parseExp() {
        var r = parseInt();
        if (r) return r;
        r = parseString();
        if (r) return r;
        r = parseList();
        if (r) return r;
        r = parsePlaceholder();
        if (r) return r;
        return parseCons();
    }
  
    if(typeof s !== 'string') {
        return null;
    }
  
    if(s.length < 200 && !parseCache[s]) {
        parseCache[s] = parseExp();
    } else if(!parseCache[s]) {
        return parseExp();
    }
    return parseCache[s];
}

exports.Node = Node;
exports.ConsNode = ConsNode;
exports.ListNode = ListNode;
exports.NumNode = NumNode;
exports.StringNode = StringNode;
exports.PlaceholderNode = PlaceholderNode;
exports.parse = parse;
exports.inRange = inRange;

});
/**
 * Line reporter worker for the Cloud9 IDE
 *
 * @copyright 2012, Ajax.org B.V.
 * @license GPLv3 <http://www.gnu.org/licenses/gpl.txt>
 */
 
define('ext/linereport/linereport_base', ['require', 'exports', 'module' , 'ext/language/base_handler'], function(require, exports, module) {

var baseLanguageHandler = require('ext/language/base_handler');
var worker = module.exports = Object.create(baseLanguageHandler);

var REPORTER_TIMEOUT = 60000;
var CACHE_TIMEOUT = 60000;

var commandId = 1;
var callbacks = {};
var resultCache = {}; // // map command to doc to result array
var inProgress = {}; // map command to boolean
var nextJob = {}; // map command to function

worker.init = function() {
    worker.$isInited = false; // allow children to still be inited
    worker.sender.on("linereport_invoke_result", function(event) {
        worker.$onInvokeResult(event.data);
    });
};

worker.initReporter = function(checkInstall, performInstall, callback) {
    // TODO: make sure IDE is online
    worker.$invoke(checkInstall, null, function(code, stdout, stderr) {
        if (code !== 0) {
            // console.log(performInstall);
            worker.$invoke(performInstall, null, callback);
        } else {
            callback();
        }
    });
},

worker.invokeReporter = function(command, processLine, callback) {
    var _self = this;
        
    resultCache[command] = resultCache[command] || {};
    var doc = this.doc.getValue();
    if (resultCache[command]['_' + doc])
        return callback(resultCache[command]['_' + doc]);
    resultCache[command] = {};
    if (inProgress[command])
        return nextJob[command] = invoke;
    
    invoke();
    
    function invoke() {
        inProgress[command] = setTimeout(function() {
            delete inProgress[command];
        }, REPORTER_TIMEOUT);
        _self.$invoke(command, worker.path, function(code, stdout, stderr) {
            var doc = _self.doc.getValue();
            resultCache[command] = resultCache[command] || {};
            var result = resultCache[command]['_' + doc] =
                _self.parseOutput(stdout, processLine).concat(_self.parseOutput(stderr, processLine));
            setTimeout(function() {
                if (resultCache[command] && resultCache[command]['_' + doc])
                    delete resultCache[command]['_' + doc];
            }, CACHE_TIMEOUT);
            if (result.length === 0 && code !== 0)
                console.log("External tool produced an error that could not be parsed:\n", stderr + '\n' + stdout);
            
            if (inProgress[command]) {
                clearTimeout(inProgress[command]);
                delete inProgress[command];
            }
            callback(result);
            if (nextJob[command]) {
                nextJob[command]();
                delete nextJob[command];
            }
        });
    }
};

worker.onDocumentOpen = function(path, doc, oldPath, callback) {
    resultCache = {};
    callback();
};

worker.$invoke = function(command, path, callback) {
    var id = commandId++;
    var commandData = {
        command: "bash",
        argv: ["bash", "-c", command],
        line: command,
        cwd: worker.workspaceDir,
        requireshandling: true,
        tracer_id: id,
        extra: { linereport_id: id }
    };
    callbacks[id] = callback;
    this.sender.emit("linereport_invoke", {
        command: commandData,
        path: path,
        language: this.language,
        source: this.$source
    });
};

worker.$onInvokeResult = function(event) {
   // Note: invoked at least once for each linereport_base instance
   if (!callbacks[event.id])
       return; // already handled
   callbacks[event.id](event.code, event.stdout, event.stderr);
   delete callbacks[event.id];
};

worker.parseOutput = function(output, processLine) {
    var lines = output.split("\n");
    var results = [];
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (processLine)
            line = processLine(line);
        var result = (line && line.charAt) ? this.$parseOutputLine(line) : line;
        if (result)
            results.push(result);
    }
    return results;
};

worker.$parseOutputLine = function(line) {
    var match = line.match(/^\s*(\d+):(?:\s*(\d+):)?\s*(.*)/);
    if (!match)
        return;
    var warningMatch = match[3].match(/^\s.?warning.?:?\s*(.*)/i);
    var errorMatch = match[3].match(/^\.?error.?:?\s*(.*)/i);
    var infoMatch = match[3].match(/^\.?info.?:?\s*(.*)/i);
    return {
        // Change from 1-indexed rows / cols to Ace 0-indexed rows / cols
        pos: { sl: parseInt(match[1], 10)-1, sc: parseInt(match[2], 10)-1 },
        type: 'unused',
        level: warningMatch ? 'warning' : infoMatch ? 'info' : 'error',
        skipMixed: true,
        message: warningMatch ? warningMatch[1] :
                 infoMatch ? infoMatch[1] :
                 errorMatch ? errorMatch[1] :
                 match[3]
    };
};

});
/**
 * Cloud9 Language Foundation
 *
 * @copyright 2011, Ajax.org B.V.
 * @license GPLv3 <http://www.gnu.org/licenses/gpl.txt>
 */
/**
 * This module implements the base handler object that other language handlers
 * can override.
 */
define('ext/language/base_handler', ['require', 'exports', 'module' ], function(require, exports, module) {

/*global disabledFeatures*/

module.exports = {
    
    language: null,
    project: null,
    path: null,
    workspaceDir: null,
    doc: null,

    // UTILITIES

    /**
     * Determine whether a certain feature is enabled in the user's preferences.
     */
    isFeatureEnabled: function(name) {
        return !disabledFeatures[name];
    },

    // OVERRIDABLE ACCESORS

    /**
     * Returns whether this language handler should be enabled for the given file
     * @param language to check the handler against
     */
    handlesLanguage: function(language) {
        return false;
    },
    
    /**
     * Returns the maximum file size this language handler supports.
     * Should return Infinity if size does not matter.
     * Default is 10.000 lines of 80 characters.
     */
    getMaxFileSizeSupported: function() {
        // Conservative default
        return 10000 * 80;
    },

    /**
     * Determine if the language component supports parsing.
     * Assumed to be true if at least one hander for the language reports true.
     */
    isParsingSupported: function() {
        return false;
    },

    /**
     * Returns a regular expression for identifiers.
     * If not specified, /[A-Za-z0-9\$\_]/ is used.
     */
    getIdentifierRegex: function() {
        return null;
    },
    
    /**
     * Returns a regular expression used to trigger code completion.
     * If a non-null value is returned, it is assumed continous completion
     * is supported for this language.
     * 
     * As an example, Java-like languages might want to use: /\./
     */
    getCompletionRegex: function() {
        return null;
    },

    // PARSING AND ABSTRACT SYNTAX CALLBACKS

    /**
     * If the language handler implements parsing, this function should take
     * the source code and turn it into an AST
     * @param value the source the document to analyze
     * @return treehugger AST or null if not implemented
     */
    parse: function(value, callback) {
        callback();
    },

    /**
     * Finds a tree node at a certain row and col,
     * e.g. using the findNode(pos) function of treehugger.
     */
    findNode: function(ast, pos, callback) {
        callback();
    },

    /**
     * Returns the  a tree node at a certain row and col,
     * e.g. using the node.getPos() function of treehugger.
     * @returns an object with properties sl, the start line, sc, the start
     *          column, el, the end line, and ec, the end column.
     */
    getPos: function(node, callback) {
        callback();
    },

    // OTHER CALLBACKS

    /**
     * Initialize this language handler.
     */
    init: function(callback) {
        callback();
    },

    /**
     * Invoked when the document has been updated (possibly after a certain interval)
     * @param doc the Document object repersenting the source
     */
    onUpdate: function(doc, callback) {
        callback();
    },

    /**
     * Invoked when a new document has been opened
     * @param path the path of the newly opened document
     * @param doc the Document object repersenting the source
     * @param oldPath the path of the document that was active before
     */
    onDocumentOpen: function(path, doc, oldPath, callback) {
        callback();
    },

    /**
     * Invoked when a document is closed in the IDE
     * @param path the path of the file
     */
    onDocumentClose: function(path, callback) {
        callback();
    },

    /**
     * Invoked when the cursor has been moved inside to a different AST node
     * @param doc the Document object repersenting the source
     * @param fullAst the entire AST of the current file (if exists)
     * @param cursorPos the current cursor position (object with keys 'row' and 'column')
     * @param currentNode the AST node the cursor is currently at (if exists)
     * @return a JSON object with three optional keys: {markers: [...], hint: {message: ...}, enableRefactoring: [...]}
     */
    onCursorMovedNode: function(doc, fullAst, cursorPos, currentNode, callback) {
        callback();
    },

    /**
     * Invoked when an outline is required
     * @param doc the Document object repersenting the source
     * @param fullAst the entire AST of the current file (if exists)
     * @return a JSON outline structure or null if not supported
     */
    outline: function(doc, fullAst, callback) {
        callback();
    },

    /**
     * Invoked when an type hierarchy is required
     * (either for a selected element, or the enclosing element)
     * @param doc the Document object repersenting the source
     * @param cursorPos the current cursor position (object with keys 'row' and 'column')
     * @return a JSON hierarchy structure or null if not supported
     */
    hierarchy: function(doc, cursorPos, callback) {
        callback();
    },

    /**
     * Performs code completion for the user based on the current cursor position
     * @param doc the Document object repersenting the source
     * @param fullAst the entire AST of the current file (if exists)
     * @param pos the current cursor position (object with keys 'row' and 'column')
     * @param currentNode the AST node the cursor is currently at (if exists)
     * @return an array of completion matches
     */
    complete: function(doc, fullAst, pos, currentNode, callback) {
        callback();
    },

    /**
     * Enables the handler to do analysis of the AST and annotate as desired
     * @param value the source the document to analyze
     * @param fullAst the entire AST of the current file (if exists)
     * @return an array of error and warning markers
     */
    analyze: function(value, fullAst, callback) {
        callback();
    },

    /**
     * Invoked when inline variable renaming is activated
     * @param doc the Document object repersenting the source
     * @param fullAst the entire AST of the current file (if exists)
     * @param pos the current cursor position (object with keys 'row' and 'column')
     * @param currentNode the AST node the cursor is currently at (if exists)
     * @return an object with the main occurence and array of other occurences of the selected element
     */
    getVariablePositions: function(doc, fullAst, pos, currentNode, callback) {
        callback();
    },

    /**
     * Invoked when refactoring is started -> So, for java, saving the file is no more legal to do
     * @param doc the Document object repersenting the source
     * @param oldId the old identifier wanted to be refactored
     */
    onRenameBegin: function(doc, callback) {
        callback();
    },

    /**
     * Invoked when a refactor request is being finalized and waiting for a status
     * @param doc the Document object repersenting the source
     * @param oldId the old identifier wanted to be refactored
     * @param newName the new name of the element after refactoring
     * @return boolean indicating whether to progress or an error message if refactoring failed
     */
    commitRename: function(doc, oldId, newName, callback) {
        callback();
    },

    /**
     * Invoked when a refactor request is cancelled
     */
    onRenameCancel: function(callback) {
        callback();
    },

    /**
     * Invoked when an automatic code formating is wanted
     * @param doc the Document object repersenting the source
     * @return a string value representing the new source code after formatting or null if not supported
     */
    codeFormat: function(doc, callback) {
        callback();
    },

    /**
     * Invoked when jumping to a definition
     * @return the position of the definition of the currently selected node
     */
    jumpToDefinition: function(doc, fullAst, pos, currentNode, callback) {
        callback();
    },
    
    /**
     * Invoked after markers were generated in analyze()
     * @return marker array with attached resolutions
     */
    getResolutions: function(doc, fullAst, markers, callback) {
        callback();
    },
    
    /**
     * @return true iff the resolver for this marker could generate
     * at least one resolution for it
     */
    hasResolution: function(doc, fullAst, marker, callback) {
        callback();
    }
};

});
/**
 * Cloud9 Language Foundation
 *
 * @copyright 2011, Ajax.org B.V.
 * @license GPLv3 <http://www.gnu.org/licenses/gpl.txt>
 */
define('ext/language/syntax_detector', ['require', 'exports', 'module' ], function(require, exports, module) {

var mixedLanguages = {
    php: {
        "default": "html",
        "php-start": /<\?(?:php|\=)?/,
        "php-end": /\?>/,
        "css-start": /<style[^>]*>/,
        "css-end": /<\/style>/,
        "javascript-start": /<script(?:\"[^\"]*\"|'[^']*'|[^'">\/])*>/,
        "javascript-end": /<\/script>/
    },
    html: {
        "css-start": /<style[^>]*>/,
        "css-end": /<\/style>/,
        "javascript-start": /<script(?:\"[^\"]*\"|'[^']*'|[^'">\/])*>/,
        "javascript-end": /<\/script>/
    }
};

/* Now:
 * - One level syntax nesting supported
 * Future: (if worth it)
 * - Have a stack to repesent it
 * - Maintain a syntax tree for an opened file
 */
function getSyntaxRegions(doc, originalSyntax) {
     if (!mixedLanguages[originalSyntax])
        return [{
            syntax: originalSyntax,
            sl: 0,
            sc: 0,
            el: doc.getLength()-1,
            ec: doc.getLine(doc.getLength()-1).length
        }];

    var lines = doc.getAllLines();
    var type = mixedLanguages[originalSyntax];
    var defaultSyntax = type["default"] || originalSyntax;
    var starters = Object.keys(type).filter(function (m) {
        return m.indexOf("-start") === m.length - 6;
    });
    var syntax = defaultSyntax;
    var regions = [{syntax: syntax, sl: 0, sc: 0}];
    var starter, endLang;
    var tempS, tempM;
    var i, m, cut, inLine = 0;

    for (var row = 0; row < lines.length; row++) {
        var line = lines[row];
        m = null;
        if (endLang) {
            m = endLang.exec(line);
            if (m) {
                endLang = null;
                syntax = defaultSyntax;
                regions[regions.length-1].el = row;
                regions[regions.length-1].ec = m.index + inLine;
                regions.push({
                    syntax: syntax,
                    sl: row,
                    sc: m.index + inLine
                });
                cut = m.index + m[0].length;
                lines[row] = line.substring(cut);
                inLine += cut;
                row--; // continue processing of the line
            }
            else {
                inLine = 0;
            }
        }
        else {
            for (i = 0; i < starters.length; i++) {
                tempS = starters[i];
                tempM = type[tempS].exec(line);
                if (tempM && (!m || m.index > tempM.index)) {
                    m = tempM;
                    starter = tempS;
                }
            }
            if (m) {
                syntax = starter.replace("-start", "");
                endLang = type[syntax+"-end"];
                regions[regions.length-1].el = row;
                regions[regions.length-1].ec = inLine + m.index + m[0].length;
                regions.push({
                    syntax: syntax,
                    sl: row,
                    sc: inLine + m.index + m[0].length
                });
                cut = m.index + m[0].length;
                lines[row] = line.substring(m.index + m[0].length);
                row--; // continue processing of the line
                inLine += cut;
            }
            else {
                inLine = 0;
            }
        }
    }
    regions[regions.length-1].el = lines.length;
    regions[regions.length-1].ec = lines[lines.length-1].length;
    return regions;
}

function getContextSyntaxPart(doc, pos, originalSyntax) {
     if (!mixedLanguages[originalSyntax]) {
        var value;
        var result = {
            language: originalSyntax,
            region: getSyntaxRegions(doc, originalSyntax)[0],
            index: 0
        };
        result.__defineGetter__("value", function() {
            if (!value)
                value = doc.getValue();
            return value;
        });
        return result;
    }
    var regions = getSyntaxRegions(doc, originalSyntax);
    for (var i = 0; i < regions.length; i++) {
        var region = regions[i];
        if ((pos.row > region.sl && pos.row < region.el) ||
            (pos.row === region.sl && pos.column >= region.sc) ||
            (pos.row === region.el && pos.column <= region.ec))
            return regionToCodePart(doc, region, i);
    }
    return null; // should never happen
}

function getContextSyntax(doc, pos, originalSyntax) {
    var part = getContextSyntaxPart(doc, pos, originalSyntax);
    return part && part.language; // should never happen
}

function regionToCodePart (doc, region, index) {
    var lines = doc.getLines(region.sl, region.el);
    var value;
    var result = {
        language: region.syntax,
        region: region,
        index: index
    };
    result.__defineGetter__("value", function() {
        if (!value)
            value = region.sl === region.el ? lines[0].substring(region.sc, region.ec) :
                [lines[0].substring(region.sc)].concat(lines.slice(1, lines.length-1)).concat([lines[lines.length-1].substring(0, region.ec)]).join(doc.getNewLineCharacter());
        return value;
    });
    return result;
}

function getCodeParts (doc, originalSyntax) {
    var regions = getSyntaxRegions(doc, originalSyntax);
    return regions.map(function (region, i) {
        return regionToCodePart(doc, region, i);
    });
}

function posToRegion (region, pos) {
    return {
        row: pos.row - region.sl,
        column: pos.column,
        path: pos.path
    };
}

function regionToPos (region, pos) {
    return {
        row: pos.row + region.sl,
        column: pos.column,
        path: pos.path
    };
}

exports.getContextSyntax = getContextSyntax;
exports.getContextSyntaxPart = getContextSyntaxPart;
exports.getSyntaxRegions = getSyntaxRegions;
exports.getCodeParts = getCodeParts;
exports.posToRegion = posToRegion;
exports.regionToPos = regionToPos;

});
define('ext/codecomplete/complete_util', ['require', 'exports', 'module' ], function(require, exports, module) {

var ID_REGEX = /[a-zA-Z_0-9\$]/;

function retrievePrecedingIdentifier(text, pos, regex) {
    regex = regex || ID_REGEX;
    var buf = [];
    for (var i = pos-1; i >= 0; i--) {
        if (regex.test(text[i]))
            buf.push(text[i]);
        else
            break;
    }
    return buf.reverse().join("");
}

function retrieveFollowingIdentifier(text, pos, regex) {
    regex = regex || ID_REGEX;
    var buf = [];
    for (var i = pos; i < text.length; i++) {
        if (regex.test(text[i]))
            buf.push(text[i]);
        else
            break;
    }
    return buf;
}

function prefixBinarySearch(items, prefix) {
    var startIndex = 0;
    var stopIndex = items.length - 1;
    var middle = Math.floor((stopIndex + startIndex) / 2);
    
    while (stopIndex > startIndex && middle >= 0 && items[middle].indexOf(prefix) !== 0) {
        if (prefix < items[middle]) {
            stopIndex = middle - 1;
        }
        else if (prefix > items[middle]) {
            startIndex = middle + 1;
        }
        middle = Math.floor((stopIndex + startIndex) / 2);
    }
    
    // Look back to make sure we haven't skipped any
    while (middle > 0 && items[middle-1].indexOf(prefix) === 0)
        middle--;
    return middle >= 0 ? middle : 0; // ensure we're not returning a negative index
}

function findCompletions(prefix, allIdentifiers) {
    allIdentifiers.sort();
    var startIdx = prefixBinarySearch(allIdentifiers, prefix);
    var matches = [];
    for (var i = startIdx; i < allIdentifiers.length && allIdentifiers[i].indexOf(prefix) === 0; i++)
        matches.push(allIdentifiers[i]);
    return matches;
}

function fetchText(staticPrefix, path) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', staticPrefix + "/" + path, false);
    try {
        xhr.send();
    }
    // Likely we got a cross-script error (equivalent with a 404 in our cloud setup)
    catch(e) {
        return false;
    }
    if (xhr.status === 200)
        return xhr.responseText;
    else
        return false;
}

/**
 * Determine if code completion results triggered for oldLine/oldPos
 * would still be applicable for newLine/newPos
 * (assuming you would filter them for things that no longer apply).
 */
function canCompleteForChangedLine(oldLine, newLine, oldPos, newPos, identifierRegex) {
    if (oldPos.row !== newPos.row)
        return false;
    
    if (oldLine === newLine)
        return true;
        
    if (newLine.indexOf(oldLine) !== 0)
        return false;
        
    var oldPrefix = retrievePrecedingIdentifier(oldLine, oldPos.column, identifierRegex);
    var newPrefix = retrievePrecedingIdentifier(newLine, newPos.column, identifierRegex);
    return newLine.substr(0, newLine.length - newPrefix.length) === oldLine.substr(0, oldLine.length - oldPrefix.length);
}

/** @deprecated Use retrievePrecedingIdentifier */
exports.retrievePreceedingIdentifier = function() {
    console.error("Deprecated: 'retrievePreceedingIdentifier' - use 'retrievePrecedingIdentifier' instead"); 
    return retrievePrecedingIdentifier.apply(null, arguments);
};
exports.retrievePrecedingIdentifier = retrievePrecedingIdentifier;
exports.retrieveFollowingIdentifier = retrieveFollowingIdentifier;
exports.findCompletions = findCompletions;
exports.fetchText = fetchText;
exports.DEFAULT_ID_REGEX = ID_REGEX;
exports.canCompleteForChangedLine = canCompleteForChangedLine;

});
define('ext/codecomplete/local_completer', ['require', 'exports', 'module' , 'ext/language/base_handler', 'ext/codecomplete/complete_util'], function(require, exports, module) {

var baseLanguageHandler = require('ext/language/base_handler');
var completeUtil = require("ext/codecomplete/complete_util");

var SPLIT_REGEX = /[^a-zA-Z_0-9\$]+/;

var completer = module.exports = Object.create(baseLanguageHandler);
    
completer.handlesLanguage = function(language) {
    return true;
};

// For the current document, gives scores to identifiers not on frequency, but on distance from the current prefix
function wordDistanceAnalyzer(doc, pos, prefix) {
    var text = doc.getValue().trim();
    
    // Determine cursor's word index
    var textBefore = doc.getLines(0, pos.row-1).join("\n") + "\n";
    var currentLine = doc.getLine(pos.row);
    textBefore += currentLine.substr(0, pos.column);
    var prefixPosition = textBefore.trim().split(SPLIT_REGEX).length - 1;
    
    // Split entire document into words
    var identifiers = text.split(SPLIT_REGEX);
    var identDict = {};
    
    // Find prefix to find other identifiers close it
    for (var i = 0; i < identifiers.length; i++) {
        if (i === prefixPosition)
            continue;
        var ident = identifiers[i];
        if (ident.length === 0)
            continue;
        var distance = Math.max(prefixPosition, i) - Math.min(prefixPosition, i);
        // Score substracted from 100000 to force descending ordering
        if (Object.prototype.hasOwnProperty.call(identDict, ident))
            identDict[ident] = Math.max(1000000-distance, identDict[ident]);
        else
            identDict[ident] = 1000000-distance;
        
    }
    return identDict;
}

function analyze(doc, pos) {
    var line = doc.getLine(pos.row);
    var identifier = completeUtil.retrievePrecedingIdentifier(line, pos.column, completer.$getIdentifierRegex());

    var analysisCache = wordDistanceAnalyzer(doc, pos, identifier);
    return analysisCache;
}
    
completer.complete = function(doc, fullAst, pos, currentNode, callback) {
    var identDict = analyze(doc, pos);
    var line = doc.getLine(pos.row);
    var identifier = completeUtil.retrievePrecedingIdentifier(line, pos.column, this.$getIdentifierRegex());
    
    var allIdentifiers = [];
    for (var ident in identDict) {
        allIdentifiers.push(ident);
    }
    var matches = completeUtil.findCompletions(identifier, allIdentifiers);
    
    matches = matches.slice(0, 40); // limit results for performance

    callback(matches.map(function(m) {
        return {
          name        : m,
          replaceText : m,
          icon        : null,
          score       : identDict[m],
          meta        : "",
          priority    : 1
        };
    }));
};

});
/**
 * Cloud9 Language Foundation
 *
 * @copyright 2011, Ajax.org B.V.
 * @license GPLv3 <http://www.gnu.org/licenses/gpl.txt>
 */
define('ext/codecomplete/snippet_completer', ['require', 'exports', 'module' , 'ext/codecomplete/complete_util', 'ext/language/base_handler'], function(require, exports, module) {

var completeUtil = require("ext/codecomplete/complete_util");
var baseLanguageHandler = require('ext/language/base_handler');

var completer = module.exports = Object.create(baseLanguageHandler);

var snippetCache = {}; // extension -> snippets
    
completer.handlesLanguage = function(language) {
    return language === "javascript";
};

completer.getMaxFileSizeSupported = function() {
    return Infinity;
};

completer.complete = function(doc, fullAst, pos, currentNode, callback) {
    var line = doc.getLine(pos.row);
    var identifier = completeUtil.retrievePrecedingIdentifier(line, pos.column);
    if(line[pos.column - identifier.length - 1] === '.') // No snippet completion after "."
        return callback([]);

    var snippets = snippetCache[this.language];
    
    if (snippets === undefined) {
        var text;
        if (this.language)
            text = completeUtil.fetchText(this.staticPrefix, 'ext/codecomplete/snippets/' + this.language + '.json');
        snippets = text ? JSON.parse(text) : {};
        // Cache
        snippetCache[this.language] = snippets;
    }
    
    var allIdentifiers = Object.keys(snippets);
    
    var matches = completeUtil.findCompletions(identifier, allIdentifiers);
    callback(matches.map(function(m) {
        return {
          name        : m,
          replaceText : snippets[m],
          doc         : "<pre>" + snippets[m].replace("\^\^", "&#9251;") + "</pre>",
          icon        : null,
          meta        : "snippet",
          priority    : 2
        };
    }));
};

});define('ext/codecomplete/open_files_local_completer', ['require', 'exports', 'module' , 'ext/codecomplete/complete_util', 'ext/language/base_handler'], function(require, exports, module) {

var completeUtil = require("ext/codecomplete/complete_util");

var baseLanguageHandler = require('ext/language/base_handler');

var analysisCache = {}; // path => {identifier: 3, ...}
var globalWordIndex = {}; // word => frequency
var globalWordFiles = {}; // word => [path]

var completer = module.exports = Object.create(baseLanguageHandler);

completer.handlesLanguage = function(language) {
    return true;
};

completer.getMaxFileSizeSupported = function() {
    return Infinity;
};

function frequencyAnalyzer(path, text, identDict, fileDict) {
    var identifiers = text.split(/[^a-zA-Z_0-9\$]+/);
    for (var i = 0; i < identifiers.length; i++) {
        var ident = identifiers[i];
        if (!ident)
            continue;
            
        if (Object.prototype.hasOwnProperty.call(identDict, ident)) {
            identDict[ident]++;
            fileDict[ident][path] = true;
        }
        else {
            identDict[ident] = 1;
            fileDict[ident] = {};
            fileDict[ident][path] = true;
        }
    }
    return identDict;
}

function removeDocumentFromCache(path) {
    var analysis = analysisCache[path];
    if (!analysis) return;

    for (var id in analysis) {
        globalWordIndex[id] -= analysis[id];
        delete globalWordFiles[id][path];
        if (globalWordIndex[id] === 0) {
            delete globalWordIndex[id];
            delete globalWordFiles[id];
        }
    }
    delete analysisCache[path];
}

function analyzeDocument(path, allCode) {
    if (!analysisCache[path]) {
        if (allCode.size > 80 * 10000) {
            delete analysisCache[path];
            return;
        }
        // Delay this slightly, because in Firefox document.value is not immediately filled
        analysisCache[path] = frequencyAnalyzer(path, allCode, {}, {});
        // may be a bit redundant to do this twice, but alright...
        frequencyAnalyzer(path, allCode, globalWordIndex, globalWordFiles);
    }
}

completer.onDocumentOpen = function(path, doc, oldPath, callback) {
    if (!analysisCache[path]) {
        analyzeDocument(path, doc.getValue());
    }
    callback();
};
    
completer.onDocumentClose = function(path, callback) {
    removeDocumentFromCache(path);
    callback();
};

completer.onUpdate = function(doc, callback) {
    removeDocumentFromCache(this.path);
    analyzeDocument(this.path, doc.getValue());
    callback();
};

completer.complete = function(doc, fullAst, pos, currentNode, callback) {
    var line = doc.getLine(pos.row);
    var identifier = completeUtil.retrievePrecedingIdentifier(line, pos.column, this.$getIdentifierRegex());
    var identDict = globalWordIndex;
    
    var allIdentifiers = [];
    for (var ident in identDict) {
        allIdentifiers.push(ident);
    }
    var matches = completeUtil.findCompletions(identifier, allIdentifiers);
    
    var currentPath = this.path;
    matches = matches.filter(function(m) {
        return !globalWordFiles[m][currentPath];
    });
    
    matches = matches.slice(0, 40); // limit results for performance

    callback(matches.map(function(m) {
        var path = Object.keys(globalWordFiles[m])[0] || "[unknown]";
        var pathParts = path.split("/");
        var foundInFile = pathParts[pathParts.length-1];
        return {
          name        : m,
          replaceText : m,
          icon        : null,
          score       : identDict[m],
          meta        : foundInFile,
          priority    : 0
        };
    }));
};

});
/**
 * Cloud9 Language Foundation
 *
 * @copyright 2011, Ajax.org B.V.
 * @license GPLv3 <http://www.gnu.org/licenses/gpl.txt>
 */
define('ext/jslanguage/parse', ['require', 'exports', 'module' , 'treehugger/js/parse', 'treehugger/traverse', 'ext/language/base_handler'], function(require, exports, module) {

var parser = require("treehugger/js/parse");
var traverse = require("treehugger/traverse");
var baseLanguageHandler = require('ext/language/base_handler');

var handler = module.exports = Object.create(baseLanguageHandler);

handler.handlesLanguage = function(language) {
    return language === 'javascript';
};

handler.parse = function(code, callback) {
    var result;
    try {
        code = code.replace(/^(#!.*\n)/, "//$1");
        result = parser.parse(code);
        traverse.addParentPointers(result);
    } catch (e) {
        // Ignore any *fatal* parse errors; JSHint will report them
        result = null;
    }
    
    callback(result);
};

handler.isParsingSupported = function() {
    return true;
}; 

handler.findNode = function(ast, pos, callback) {
    callback(ast.findNode(pos));
};

handler.getPos = function(node, callback) {
    callback(node.getPos());
};

/* Ready to be enabled to replace Narcissus, when mature

handler.analyze = function(value, ast) {
    var error = ast.getAnnotation("error");
    if (error)
        return [{
            pos: {sl: error.line},
            type: 'error',
            message: error.message || "Parse error."
        }];
    else
        return [];
};
*/

});
define('treehugger/js/parse', ['require', 'exports', 'module' , 'treehugger/js/uglifyparser', 'treehugger/tree'], function(require, exports, module) {

var parser = require("treehugger/js/uglifyparser");
var tree = require('treehugger/tree');

exports.parse = function(s) {
    var result = parser.parse(s, false, true);
    var node = exports.transform(result.ast);
    if(result.error)
        node.setAnnotation("error", result.error);
    return node;
};


function setIdPos(oNode, node) {
    if(!oNode.name)
        oNode.name = "";
    node.setAnnotation("pos", {
        sl: oNode.start.line,
        sc: oNode.start.col,
        // Let's not rely on what Uglify is telling us here
        el: oNode.start.line,
        ec: oNode.start.col + oNode.name.length
    });
    return node;
}

exports.transform = function(n) {
    if (!n) {
        return tree.cons("None", []);
    }
    var transform = exports.transform; 
    var nodeName = typeof n[0] === 'string' ? n[0] : n[0].name;
    
    var resultNode;
    
    switch(nodeName) {
        case "toplevel":
            resultNode = tree.list(n[1].map(transform));
            break;
        case "var":
            resultNode = tree.cons("VarDecls", [tree.list(n[1].map(function(varNode) {
                var idNode = tree.string(varNode[0].name);
                setIdPos(varNode[0], idNode);
                if(varNode[1])
                    return tree.cons("VarDeclInit", [idNode, transform(varNode[1])]);
                else
                    return tree.cons("VarDecl", [idNode]);
            }))]);
            break;
        case "let":
            resultNode = tree.cons("LetDecls", [tree.list(n[1].map(function(varNode) {
                var idNode = tree.string(varNode[0].name);
                setIdPos(varNode[0], idNode);
                if(varNode[1])
                    return tree.cons("LetDeclInit", [idNode, transform(varNode[1])]);
                else
                    return tree.cons("LetDecl", [idNode]);
            }))]);
            break;
        case "const":
            resultNode = tree.cons("ConstDecls", [tree.list(n[1].map(function(varNode) {
                var idNode = tree.string(varNode[0].name);
                setIdPos(varNode[0], idNode);
                if(varNode[1])
                    return tree.cons("ConstDeclInit", [idNode, transform(varNode[1])]);
                else
                    return tree.cons("ConstDecl", [idNode]);
            }))]);
            break;
        case "num":
            resultNode = tree.cons("Num", [tree.string(n[1])]);
            break;
        case "string":
            resultNode = tree.cons("String", [tree.string(n[1])]);
            break;
        case "stat":
            return transform(n[1]);
        case "call":
            resultNode = tree.cons("Call", [transform(n[1]), tree.list(n[2].map(transform))]);
            break;
        case "return":
            resultNode = tree.cons("Return", [transform(n[1])]);
            break;
        case "new":
            resultNode = tree.cons("New", [transform(n[1]), tree.list(n[2].map(transform))]);
            break;
        case "object":
            resultNode = tree.cons("ObjectInit", [tree.list(n[1].map(function(propInit) {
                return tree.cons("PropertyInit", [tree.string(propInit[0]), transform(propInit[1])]);
            }))]);
            break;
        case "array":
            resultNode = tree.cons("Array", [tree.list(n[1].map(transform))]);
            break;
        case "conditional":
            resultNode = tree.cons("TernaryIf", [transform(n[1]), transform(n[2]), transform(n[3])]);
            break;
        case "label":
            resultNode = tree.cons("Label", [tree.string(n[1]), transform(n[2])]);
            break;
        case "continue":
            resultNode = tree.cons("Continue", [tree.string(n[1])]);
            break;
        case "assign":
            if(typeof n[1] === 'string') {
                resultNode = tree.cons("OpAssign", [tree.string(n[1]), transform(n[2]), transform(n[3])]);
            } else {
                resultNode = tree.cons("Assign", [transform(n[2]), transform(n[3])]);
            }
            break;
        case "dot":
            resultNode = tree.cons("PropAccess", [transform(n[1]), tree.string(n[2])]);
            break;
        case "name":
            resultNode = tree.cons("Var", [tree.string(n[1])]);
            break;
        case "defun":
            resultNode = tree.cons("Function", [setIdPos(n[1], tree.string(n[1].name || "")), tree.list(n[2].map(function(arg) {
                return setIdPos(arg, tree.cons("FArg", [tree.string(arg.name)]));
            })), tree.list(n[3].map(transform))]);
            break;
        case "function":
            var funName = tree.string(n[1].name || "");
            if(n[1].name)
                setIdPos(n[1], funName);
            var fargs = tree.list(n[2].map(function(arg) {
                return setIdPos(arg, tree.cons("FArg", [tree.string(arg.name)]));
            }));
            /*if(fargs.length > 0) {
                fargs.setAnnotation("pos", {
                    sl: fargs[0].getPos().sl,
                    sc: fargs[0].getPos().sl,
                    el: fargs[fargs.length - 1].getPos().el,
                    ec: fargs[fargs.length - 1].getPos().ec
                });
            }*/
            resultNode = tree.cons("Function", [funName, fargs, tree.list(n[3].map(transform))]);
            break;
        case "binary":
            resultNode = tree.cons("Op", [tree.string(n[1]), transform(n[2]), transform(n[3])]);
            break;
        case "unary-postfix":
            resultNode = tree.cons("PostfixOp", [tree.string(n[1]), transform(n[2])]);
            break;
        case "unary-prefix":
            resultNode = tree.cons("PrefixOp", [tree.string(n[1]), transform(n[2])]);
            break;
        case "sub":
            resultNode = tree.cons("Index", [transform(n[1]), transform(n[2])]);
            break;
        case "for":
            resultNode = tree.cons("For", [transform(n[1]), transform(n[2]), transform(n[3]), transform(n[4])]);
            break;
        case "for-in":
            resultNode = tree.cons("ForIn", [transform(n[1]), transform(n[3]), transform(n[4])]);
            break;
        case "while":
            resultNode = tree.cons("While", [transform(n[1]), transform(n[2])]);
            break;
        case "do": 
            resultNode = tree.cons("Do", [transform(n[2]), transform(n[1])]);
            break;
        case "switch":
            resultNode = tree.cons("Switch", [transform(n[1]), tree.list(n[2].map(function(opt) {
                return tree.cons("Case", [transform(opt[0]), tree.list(opt[1].map(transform))]);
            }))]);
            break;
        case "break":
            resultNode = tree.cons("Break", []);
            break;
        case "seq":
            resultNode = tree.cons("Seq", [transform(n[1]), transform(n[2])]);
            break;
        case "if":
            resultNode = tree.cons("If", [transform(n[1]), transform(n[2]), transform(n[3])]);
            break;
        case "block":
            resultNode = tree.cons("Block", [tree.list(n[1] ? n[1].map(transform) : [])]);
            break;
        case "regexp":
            resultNode = tree.cons("RegExp", [tree.string(n[1]), tree.string(n[2])]);
            break;
        case "throw":
            resultNode = tree.cons("Throw", [transform(n[1])]);
            break;
        case "try":
            resultNode = tree.cons("Try", [tree.list(n[1].map(transform)),
                 tree.list(n[2] ? [tree.cons("Catch", [tree.string(n[2][0]), tree.list(n[2][1].map(transform))])] : []),
                 n[3] ? tree.list(n[3].map(transform)) : tree.cons("None", [])]);
            break;
        case "with":
            resultNode = tree.cons("With", [transform(n[1]), tree.list(n[2][1].map(transform))]);
            break;
        case "atom":
            resultNode = tree.cons("Atom", []);
            break;
        case "ERROR":
            resultNode = tree.cons("ERROR", []);
            break;
        default:
            console.log("Not yet supported: "+ nodeName);
            console.log("Current node: "+ JSON.stringify(n));
    }

    resultNode.setAnnotation("origin", n);
    if(n[0].start) {
        if(resultNode.length === 1 && resultNode[0] instanceof tree.StringNode && resultNode[0].value) {
            resultNode.setAnnotation("pos", {sl: n[0].start.line, sc: n[0].start.col,
                                             el: n[0].start.line, ec: n[0].start.col + resultNode[0].value.length});
            
        } else {
            resultNode.setAnnotation("pos", {sl: n[0].start.line, sc: n[0].start.col,
                                             el: n[0].end.line,   ec: n[0].end.col});
        }
    }
    return resultNode;
};

});
/***********************************************************************

  A JavaScript tokenizer / parser / beautifier / compressor.

  This version is suitable for Node.js.  With minimal changes (the
  exports stuff) it should work on any JS platform.

  This file contains the tokenizer/parser.  It is a port to JavaScript
  of parse-js [1], a JavaScript parser library written in Common Lisp
  by Marijn Haverbeke.  Thank you Marijn!

  [1] http://marijn.haverbeke.nl/parse-js/

  Exported functions:

    - tokenizer(code) -- returns a function.  Call the returned
      function to fetch the next token.

    - parse(code) -- returns an AST of the given JavaScript code.

  ----------------------------------------------------------------------
  
  This is an updated version of UglifyJS, adapted by zef@c9.io with error
  recovery, to keep  parsing code when errors are encountered

  -------------------------------- (C) ---------------------------------

                           Author: Mihai Bazon
                         <mihai.bazon@gmail.com>
                       http://mihai.bazon.net/blog

  Distributed under the BSD license:

    Copyright 2010 (c) Mihai Bazon <mihai.bazon@gmail.com>
    Based on parse-js (http://marijn.haverbeke.nl/parse-js/).

    Redistribution and use in source and binary forms, with or without
    modification, are permitted provided that the following conditions
    are met:

        * Redistributions of source code must retain the above
          copyright notice, this list of conditions and the following
          disclaimer.

        * Redistributions in binary form must reproduce the above
          copyright notice, this list of conditions and the following
          disclaimer in the documentation and/or other materials
          provided with the distribution.

    THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDER “AS IS” AND ANY
    EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
    IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
    PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER BE
    LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY,
    OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
    PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
    PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
    THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
    TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF
    THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF
    SUCH DAMAGE.

 ***********************************************************************/
 
define('treehugger/js/uglifyparser', ['require', 'exports', 'module' ], function(require, exports, module) {

/* -----[ Tokenizer (constants) ]----- */

var KEYWORDS = array_to_hash([
    "break",
    "case",
    "catch",
    "const",
    "continue",
    "default",
    "delete",
    "do",
    "else",
    "finally",
    "for",
    "function",
    "if",
    "in",
    "instanceof",
    "new",
    "return",
    "switch",
    "throw",
    "try",
    "typeof",
    "var",
    "void",
    "while",
    "with",
    "let"
]);

var RESERVED_WORDS = array_to_hash([
    "abstract",
    "boolean",
    "byte",
    "char",
    "class",
    "debugger",
    "double",
    "enum",
    "export",
    "extends",
    "final",
    "float",
    "goto",
    "implements",
    "import",
    "int",
    "interface",
    "long",
    "native",
    "package",
    "private",
    "protected",
    "public",
    "short",
    "static",
    "super",
    "synchronized",
    "throws",
    "transient",
    "volatile"
]);

var KEYWORDS_BEFORE_EXPRESSION = array_to_hash([
    "return",
    "new",
    "delete",
    "throw",
    "else",
    "case"
]);

var KEYWORDS_ATOM = array_to_hash([
    "false",
    "null",
    "true",
    "undefined"
]);

var OPERATOR_CHARS = array_to_hash(characters("+-*&%=<>!?|~^"));

var RE_HEX_NUMBER = /^0x[0-9a-f]+$/i;
var RE_OCT_NUMBER = /^0[0-7]+$/;
var RE_DEC_NUMBER = /^\d*\.?\d*(?:e[+-]?\d*(?:\d\.?|\.?\d)\d*)?$/i;

var OPERATORS = array_to_hash([
    "in",
    "instanceof",
    "typeof",
    "new",
    "void",
    "delete",
    "++",
    "--",
    "+",
    "-",
    "!",
    "~",
    "&",
    "|",
    "^",
    "*",
    "/",
    "%",
    ">>",
    "<<",
    ">>>",
    "<",
    ">",
    "<=",
    ">=",
    "==",
    "===",
    "!=",
    "!==",
    "?",
    "=",
    "+=",
    "-=",
    "/=",
    "*=",
    "%=",
    ">>=",
    "<<=",
    ">>>=",
    "|=",
    "^=",
    "&=",
    "&&",
    "||"
]);

var WHITESPACE_CHARS = array_to_hash(characters(" \u00a0\n\r\t\f\u000b\u200b\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000"));

var PUNC_BEFORE_EXPRESSION = array_to_hash(characters("[{}(,.;:"));

var PUNC_CHARS = array_to_hash(characters("[]{}(),;:"));

var REGEXP_MODIFIERS = array_to_hash(characters("gmsiy"));

/* -----[ Tokenizer ]----- */

// regexps adapted from http://xregexp.com/plugins/#unicode
var UNICODE = {
    letter: new RegExp("[\\u0041-\\u005A\\u0061-\\u007A\\u00AA\\u00B5\\u00BA\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02C1\\u02C6-\\u02D1\\u02E0-\\u02E4\\u02EC\\u02EE\\u0370-\\u0374\\u0376\\u0377\\u037A-\\u037D\\u0386\\u0388-\\u038A\\u038C\\u038E-\\u03A1\\u03A3-\\u03F5\\u03F7-\\u0481\\u048A-\\u0523\\u0531-\\u0556\\u0559\\u0561-\\u0587\\u05D0-\\u05EA\\u05F0-\\u05F2\\u0621-\\u064A\\u066E\\u066F\\u0671-\\u06D3\\u06D5\\u06E5\\u06E6\\u06EE\\u06EF\\u06FA-\\u06FC\\u06FF\\u0710\\u0712-\\u072F\\u074D-\\u07A5\\u07B1\\u07CA-\\u07EA\\u07F4\\u07F5\\u07FA\\u0904-\\u0939\\u093D\\u0950\\u0958-\\u0961\\u0971\\u0972\\u097B-\\u097F\\u0985-\\u098C\\u098F\\u0990\\u0993-\\u09A8\\u09AA-\\u09B0\\u09B2\\u09B6-\\u09B9\\u09BD\\u09CE\\u09DC\\u09DD\\u09DF-\\u09E1\\u09F0\\u09F1\\u0A05-\\u0A0A\\u0A0F\\u0A10\\u0A13-\\u0A28\\u0A2A-\\u0A30\\u0A32\\u0A33\\u0A35\\u0A36\\u0A38\\u0A39\\u0A59-\\u0A5C\\u0A5E\\u0A72-\\u0A74\\u0A85-\\u0A8D\\u0A8F-\\u0A91\\u0A93-\\u0AA8\\u0AAA-\\u0AB0\\u0AB2\\u0AB3\\u0AB5-\\u0AB9\\u0ABD\\u0AD0\\u0AE0\\u0AE1\\u0B05-\\u0B0C\\u0B0F\\u0B10\\u0B13-\\u0B28\\u0B2A-\\u0B30\\u0B32\\u0B33\\u0B35-\\u0B39\\u0B3D\\u0B5C\\u0B5D\\u0B5F-\\u0B61\\u0B71\\u0B83\\u0B85-\\u0B8A\\u0B8E-\\u0B90\\u0B92-\\u0B95\\u0B99\\u0B9A\\u0B9C\\u0B9E\\u0B9F\\u0BA3\\u0BA4\\u0BA8-\\u0BAA\\u0BAE-\\u0BB9\\u0BD0\\u0C05-\\u0C0C\\u0C0E-\\u0C10\\u0C12-\\u0C28\\u0C2A-\\u0C33\\u0C35-\\u0C39\\u0C3D\\u0C58\\u0C59\\u0C60\\u0C61\\u0C85-\\u0C8C\\u0C8E-\\u0C90\\u0C92-\\u0CA8\\u0CAA-\\u0CB3\\u0CB5-\\u0CB9\\u0CBD\\u0CDE\\u0CE0\\u0CE1\\u0D05-\\u0D0C\\u0D0E-\\u0D10\\u0D12-\\u0D28\\u0D2A-\\u0D39\\u0D3D\\u0D60\\u0D61\\u0D7A-\\u0D7F\\u0D85-\\u0D96\\u0D9A-\\u0DB1\\u0DB3-\\u0DBB\\u0DBD\\u0DC0-\\u0DC6\\u0E01-\\u0E30\\u0E32\\u0E33\\u0E40-\\u0E46\\u0E81\\u0E82\\u0E84\\u0E87\\u0E88\\u0E8A\\u0E8D\\u0E94-\\u0E97\\u0E99-\\u0E9F\\u0EA1-\\u0EA3\\u0EA5\\u0EA7\\u0EAA\\u0EAB\\u0EAD-\\u0EB0\\u0EB2\\u0EB3\\u0EBD\\u0EC0-\\u0EC4\\u0EC6\\u0EDC\\u0EDD\\u0F00\\u0F40-\\u0F47\\u0F49-\\u0F6C\\u0F88-\\u0F8B\\u1000-\\u102A\\u103F\\u1050-\\u1055\\u105A-\\u105D\\u1061\\u1065\\u1066\\u106E-\\u1070\\u1075-\\u1081\\u108E\\u10A0-\\u10C5\\u10D0-\\u10FA\\u10FC\\u1100-\\u1159\\u115F-\\u11A2\\u11A8-\\u11F9\\u1200-\\u1248\\u124A-\\u124D\\u1250-\\u1256\\u1258\\u125A-\\u125D\\u1260-\\u1288\\u128A-\\u128D\\u1290-\\u12B0\\u12B2-\\u12B5\\u12B8-\\u12BE\\u12C0\\u12C2-\\u12C5\\u12C8-\\u12D6\\u12D8-\\u1310\\u1312-\\u1315\\u1318-\\u135A\\u1380-\\u138F\\u13A0-\\u13F4\\u1401-\\u166C\\u166F-\\u1676\\u1681-\\u169A\\u16A0-\\u16EA\\u1700-\\u170C\\u170E-\\u1711\\u1720-\\u1731\\u1740-\\u1751\\u1760-\\u176C\\u176E-\\u1770\\u1780-\\u17B3\\u17D7\\u17DC\\u1820-\\u1877\\u1880-\\u18A8\\u18AA\\u1900-\\u191C\\u1950-\\u196D\\u1970-\\u1974\\u1980-\\u19A9\\u19C1-\\u19C7\\u1A00-\\u1A16\\u1B05-\\u1B33\\u1B45-\\u1B4B\\u1B83-\\u1BA0\\u1BAE\\u1BAF\\u1C00-\\u1C23\\u1C4D-\\u1C4F\\u1C5A-\\u1C7D\\u1D00-\\u1DBF\\u1E00-\\u1F15\\u1F18-\\u1F1D\\u1F20-\\u1F45\\u1F48-\\u1F4D\\u1F50-\\u1F57\\u1F59\\u1F5B\\u1F5D\\u1F5F-\\u1F7D\\u1F80-\\u1FB4\\u1FB6-\\u1FBC\\u1FBE\\u1FC2-\\u1FC4\\u1FC6-\\u1FCC\\u1FD0-\\u1FD3\\u1FD6-\\u1FDB\\u1FE0-\\u1FEC\\u1FF2-\\u1FF4\\u1FF6-\\u1FFC\\u2071\\u207F\\u2090-\\u2094\\u2102\\u2107\\u210A-\\u2113\\u2115\\u2119-\\u211D\\u2124\\u2126\\u2128\\u212A-\\u212D\\u212F-\\u2139\\u213C-\\u213F\\u2145-\\u2149\\u214E\\u2183\\u2184\\u2C00-\\u2C2E\\u2C30-\\u2C5E\\u2C60-\\u2C6F\\u2C71-\\u2C7D\\u2C80-\\u2CE4\\u2D00-\\u2D25\\u2D30-\\u2D65\\u2D6F\\u2D80-\\u2D96\\u2DA0-\\u2DA6\\u2DA8-\\u2DAE\\u2DB0-\\u2DB6\\u2DB8-\\u2DBE\\u2DC0-\\u2DC6\\u2DC8-\\u2DCE\\u2DD0-\\u2DD6\\u2DD8-\\u2DDE\\u2E2F\\u3005\\u3006\\u3031-\\u3035\\u303B\\u303C\\u3041-\\u3096\\u309D-\\u309F\\u30A1-\\u30FA\\u30FC-\\u30FF\\u3105-\\u312D\\u3131-\\u318E\\u31A0-\\u31B7\\u31F0-\\u31FF\\u3400\\u4DB5\\u4E00\\u9FC3\\uA000-\\uA48C\\uA500-\\uA60C\\uA610-\\uA61F\\uA62A\\uA62B\\uA640-\\uA65F\\uA662-\\uA66E\\uA67F-\\uA697\\uA717-\\uA71F\\uA722-\\uA788\\uA78B\\uA78C\\uA7FB-\\uA801\\uA803-\\uA805\\uA807-\\uA80A\\uA80C-\\uA822\\uA840-\\uA873\\uA882-\\uA8B3\\uA90A-\\uA925\\uA930-\\uA946\\uAA00-\\uAA28\\uAA40-\\uAA42\\uAA44-\\uAA4B\\uAC00\\uD7A3\\uF900-\\uFA2D\\uFA30-\\uFA6A\\uFA70-\\uFAD9\\uFB00-\\uFB06\\uFB13-\\uFB17\\uFB1D\\uFB1F-\\uFB28\\uFB2A-\\uFB36\\uFB38-\\uFB3C\\uFB3E\\uFB40\\uFB41\\uFB43\\uFB44\\uFB46-\\uFBB1\\uFBD3-\\uFD3D\\uFD50-\\uFD8F\\uFD92-\\uFDC7\\uFDF0-\\uFDFB\\uFE70-\\uFE74\\uFE76-\\uFEFC\\uFF21-\\uFF3A\\uFF41-\\uFF5A\\uFF66-\\uFFBE\\uFFC2-\\uFFC7\\uFFCA-\\uFFCF\\uFFD2-\\uFFD7\\uFFDA-\\uFFDC]"),
    non_spacing_mark: new RegExp("[\\u0300-\\u036F\\u0483-\\u0487\\u0591-\\u05BD\\u05BF\\u05C1\\u05C2\\u05C4\\u05C5\\u05C7\\u0610-\\u061A\\u064B-\\u065E\\u0670\\u06D6-\\u06DC\\u06DF-\\u06E4\\u06E7\\u06E8\\u06EA-\\u06ED\\u0711\\u0730-\\u074A\\u07A6-\\u07B0\\u07EB-\\u07F3\\u0816-\\u0819\\u081B-\\u0823\\u0825-\\u0827\\u0829-\\u082D\\u0900-\\u0902\\u093C\\u0941-\\u0948\\u094D\\u0951-\\u0955\\u0962\\u0963\\u0981\\u09BC\\u09C1-\\u09C4\\u09CD\\u09E2\\u09E3\\u0A01\\u0A02\\u0A3C\\u0A41\\u0A42\\u0A47\\u0A48\\u0A4B-\\u0A4D\\u0A51\\u0A70\\u0A71\\u0A75\\u0A81\\u0A82\\u0ABC\\u0AC1-\\u0AC5\\u0AC7\\u0AC8\\u0ACD\\u0AE2\\u0AE3\\u0B01\\u0B3C\\u0B3F\\u0B41-\\u0B44\\u0B4D\\u0B56\\u0B62\\u0B63\\u0B82\\u0BC0\\u0BCD\\u0C3E-\\u0C40\\u0C46-\\u0C48\\u0C4A-\\u0C4D\\u0C55\\u0C56\\u0C62\\u0C63\\u0CBC\\u0CBF\\u0CC6\\u0CCC\\u0CCD\\u0CE2\\u0CE3\\u0D41-\\u0D44\\u0D4D\\u0D62\\u0D63\\u0DCA\\u0DD2-\\u0DD4\\u0DD6\\u0E31\\u0E34-\\u0E3A\\u0E47-\\u0E4E\\u0EB1\\u0EB4-\\u0EB9\\u0EBB\\u0EBC\\u0EC8-\\u0ECD\\u0F18\\u0F19\\u0F35\\u0F37\\u0F39\\u0F71-\\u0F7E\\u0F80-\\u0F84\\u0F86\\u0F87\\u0F90-\\u0F97\\u0F99-\\u0FBC\\u0FC6\\u102D-\\u1030\\u1032-\\u1037\\u1039\\u103A\\u103D\\u103E\\u1058\\u1059\\u105E-\\u1060\\u1071-\\u1074\\u1082\\u1085\\u1086\\u108D\\u109D\\u135F\\u1712-\\u1714\\u1732-\\u1734\\u1752\\u1753\\u1772\\u1773\\u17B7-\\u17BD\\u17C6\\u17C9-\\u17D3\\u17DD\\u180B-\\u180D\\u18A9\\u1920-\\u1922\\u1927\\u1928\\u1932\\u1939-\\u193B\\u1A17\\u1A18\\u1A56\\u1A58-\\u1A5E\\u1A60\\u1A62\\u1A65-\\u1A6C\\u1A73-\\u1A7C\\u1A7F\\u1B00-\\u1B03\\u1B34\\u1B36-\\u1B3A\\u1B3C\\u1B42\\u1B6B-\\u1B73\\u1B80\\u1B81\\u1BA2-\\u1BA5\\u1BA8\\u1BA9\\u1C2C-\\u1C33\\u1C36\\u1C37\\u1CD0-\\u1CD2\\u1CD4-\\u1CE0\\u1CE2-\\u1CE8\\u1CED\\u1DC0-\\u1DE6\\u1DFD-\\u1DFF\\u20D0-\\u20DC\\u20E1\\u20E5-\\u20F0\\u2CEF-\\u2CF1\\u2DE0-\\u2DFF\\u302A-\\u302F\\u3099\\u309A\\uA66F\\uA67C\\uA67D\\uA6F0\\uA6F1\\uA802\\uA806\\uA80B\\uA825\\uA826\\uA8C4\\uA8E0-\\uA8F1\\uA926-\\uA92D\\uA947-\\uA951\\uA980-\\uA982\\uA9B3\\uA9B6-\\uA9B9\\uA9BC\\uAA29-\\uAA2E\\uAA31\\uAA32\\uAA35\\uAA36\\uAA43\\uAA4C\\uAAB0\\uAAB2-\\uAAB4\\uAAB7\\uAAB8\\uAABE\\uAABF\\uAAC1\\uABE5\\uABE8\\uABED\\uFB1E\\uFE00-\\uFE0F\\uFE20-\\uFE26]"),
    space_combining_mark: new RegExp("[\\u0903\\u093E-\\u0940\\u0949-\\u094C\\u094E\\u0982\\u0983\\u09BE-\\u09C0\\u09C7\\u09C8\\u09CB\\u09CC\\u09D7\\u0A03\\u0A3E-\\u0A40\\u0A83\\u0ABE-\\u0AC0\\u0AC9\\u0ACB\\u0ACC\\u0B02\\u0B03\\u0B3E\\u0B40\\u0B47\\u0B48\\u0B4B\\u0B4C\\u0B57\\u0BBE\\u0BBF\\u0BC1\\u0BC2\\u0BC6-\\u0BC8\\u0BCA-\\u0BCC\\u0BD7\\u0C01-\\u0C03\\u0C41-\\u0C44\\u0C82\\u0C83\\u0CBE\\u0CC0-\\u0CC4\\u0CC7\\u0CC8\\u0CCA\\u0CCB\\u0CD5\\u0CD6\\u0D02\\u0D03\\u0D3E-\\u0D40\\u0D46-\\u0D48\\u0D4A-\\u0D4C\\u0D57\\u0D82\\u0D83\\u0DCF-\\u0DD1\\u0DD8-\\u0DDF\\u0DF2\\u0DF3\\u0F3E\\u0F3F\\u0F7F\\u102B\\u102C\\u1031\\u1038\\u103B\\u103C\\u1056\\u1057\\u1062-\\u1064\\u1067-\\u106D\\u1083\\u1084\\u1087-\\u108C\\u108F\\u109A-\\u109C\\u17B6\\u17BE-\\u17C5\\u17C7\\u17C8\\u1923-\\u1926\\u1929-\\u192B\\u1930\\u1931\\u1933-\\u1938\\u19B0-\\u19C0\\u19C8\\u19C9\\u1A19-\\u1A1B\\u1A55\\u1A57\\u1A61\\u1A63\\u1A64\\u1A6D-\\u1A72\\u1B04\\u1B35\\u1B3B\\u1B3D-\\u1B41\\u1B43\\u1B44\\u1B82\\u1BA1\\u1BA6\\u1BA7\\u1BAA\\u1C24-\\u1C2B\\u1C34\\u1C35\\u1CE1\\u1CF2\\uA823\\uA824\\uA827\\uA880\\uA881\\uA8B4-\\uA8C3\\uA952\\uA953\\uA983\\uA9B4\\uA9B5\\uA9BA\\uA9BB\\uA9BD-\\uA9C0\\uAA2F\\uAA30\\uAA33\\uAA34\\uAA4D\\uAA7B\\uABE3\\uABE4\\uABE6\\uABE7\\uABE9\\uABEA\\uABEC]"),
    connector_punctuation: new RegExp("[\\u005F\\u203F\\u2040\\u2054\\uFE33\\uFE34\\uFE4D-\\uFE4F\\uFF3F]")
};

function is_letter(ch) {
    return UNICODE.letter.test(ch);
}

function is_digit(ch) {
    ch = ch.charCodeAt(0);
    return ch >= 48 && ch <= 57; //XXX: find out if "UnicodeDigit" means something else than 0..9
}

function is_alphanumeric_char(ch) {
    return is_digit(ch) || is_letter(ch);
}

function is_unicode_combining_mark(ch) {
    return UNICODE.non_spacing_mark.test(ch) || UNICODE.space_combining_mark.test(ch);
}

function is_unicode_connector_punctuation(ch) {
    return UNICODE.connector_punctuation.test(ch);
}

function is_identifier_start(ch) {
    return ch == "$" || ch == "_" || is_letter(ch);
}

function is_identifier_char(ch) {
    return is_identifier_start(ch)
            || is_unicode_combining_mark(ch)
            || is_digit(ch)
            || is_unicode_connector_punctuation(ch)
            || ch == "\u200c" // zero-width non-joiner <ZWNJ>
            || ch == "\u200d"; // zero-width joiner <ZWJ> (in my ECMA-262 PDF, this is also 200c)
}

function parse_js_number(num) {
    if (RE_HEX_NUMBER.test(num)) {
        return parseInt(num.substr(2), 16);
    }
    else if (RE_OCT_NUMBER.test(num)) {
        return parseInt(num.substr(1), 8);
    }
    else if (RE_DEC_NUMBER.test(num)) {
        return parseFloat(num);
    }
}

function JS_Parse_Error(message, line, col, pos) {
    this.message = message;
    this.line = line;
    this.col = col;
    this.pos = pos;
    this.stack = new Error().stack;
}

JS_Parse_Error.prototype.toString = function() {
    return this.message + " (line: " + this.line + ", col: " + this.col + ", pos: " + this.pos + ")" + "\n\n" + this.stack;
}

function js_error(message, line, col, pos) {
    throw new JS_Parse_Error(message, line, col, pos);
}

function is_token(token, type, val) {
    return token.type == type && (val == null || token.value == val);
}

var EX_EOF = {};

function tokenizer($TEXT) {
    
    var S = {
        text            : $TEXT.replace(/\r\n?|[\n\u2028\u2029]/g, "\n").replace(/^\uFEFF/, ''),
        pos             : 0,
        tokpos          : 0,
        line            : 0,
        tokline         : 0,
        col             : 0,
        tokcol          : 0,
        newline_before  : false,
        regex_allowed   : false,
        comments_before : []
    };
    
    function peek() {
        return S.text.charAt(S.pos);
    }
    
    function next(signal_eof) {
        var ch = S.text.charAt(S.pos++);
        if (signal_eof && !ch) throw EX_EOF;
        if (ch == "\n") {
            S.newline_before = true;
            ++S.line;
            S.col = 0;
        }
        else {
            ++S.col;
        }
        return ch;
    }
    
    function eof() {
        return !S.peek();
    }
    
    function find(what, signal_eof) {
        var pos = S.text.indexOf(what, S.pos);
        if (signal_eof && pos == -1) throw EX_EOF;
        return pos;
    }
    
    function start_token() {
        S.tokline = S.line;
        S.tokcol = S.col;
        S.tokpos = S.pos;
    }
    
    function token(type, value, is_comment) {
        S.regex_allowed = ((type == "operator" && !HOP(UNARY_POSTFIX, value)) ||
                           (type == "keyword" && HOP(KEYWORDS_BEFORE_EXPRESSION, value)) ||
                           (type == "punc" && HOP(PUNC_BEFORE_EXPRESSION, value)));
        var ret = {
            type  : type,
            value : value,
            line  : S.tokline,
            col   : S.tokcol,
            pos   : S.tokpos,
            nlb   : S.newline_before
        };
        if (!is_comment) {
            ret.comments_before = S.comments_before;
            S.comments_before = [];
        }
        S.newline_before = false;
        return ret;
    }
    
    function skip_whitespace() {
        while (HOP(WHITESPACE_CHARS, peek()))
            next();
    }
    
    function read_while(pred) {
        var ret = "", ch = peek(), i = 0;
        while (ch && pred(ch, i++)) {
            ret += next();
            ch = peek();
        }
        return ret;
    }
    
    function parse_error(err) {
        js_error(err, S.tokline, S.tokcol, S.tokpos);
    }
    
    function read_num(prefix) {
        var has_e = false,
            after_e = false,
            has_x = false,
            has_dot = prefix == ".";
        var num = read_while(function(ch, i) {
            if (ch == "x" || ch == "X") {
                if (has_x) return false;
                return has_x = true;
            }
            if (!has_x && (ch == "E" || ch == "e")) {
                if (has_e) return false;
                return has_e = after_e = true;
            }
            if (ch == "-") {
                if (after_e || (i == 0 && !prefix)) return true;
                return false;
            }
            if (ch == "+") return after_e;
            after_e = false;
            if (ch == ".") {
                if (!has_dot && !has_x) return has_dot = true;
                return false;
            }
            return is_alphanumeric_char(ch);
        });
        if (prefix) num = prefix + num;
        var valid = parse_js_number(num);
        return token("num", num);
    }
    
    function read_escaped_char() {
        var ch = next(true);
        switch (ch) {
        case "n":
            return "\n";
        case "r":
            return "\r";
        case "t":
            return "\t";
        case "b":
            return "\b";
        case "v":
            return "\u000b";
        case "f":
            return "\f";
        case "0":
            return "\0";
        case "x":
            return String.fromCharCode(hex_bytes(2));
        case "u":
            return String.fromCharCode(hex_bytes(4));
        case "\n":
            return "";
        default:
            return ch;
        }
    }
    
    function hex_bytes(n) {
        var num = 0;
        for (; n > 0; --n) {
            var digit = parseInt(next(true), 16);
            if (isNaN(digit)) parse_error("Invalid hex-character pattern in string");
            num = (num << 4) | digit;
        }
        return num;
    }
    
    function read_string() {
        return with_eof_error("Unterminated string constant", function(){
            var quote = next(), ret = "";
            for (;;) {
                var ch = next(false); // RECOVERY
                if (ch == "\\") {
                    // read OctalEscapeSequence (XXX: deprecated if "strict mode")
                    // https://github.com/mishoo/UglifyJS/issues/178
                    var octal_len = 0, first = null;
                    ch = read_while(function(ch){
                        if (ch >= "0" && ch <= "7") {
                            if (!first) {
                                first = ch;
                                return ++octal_len;
                            }
                            else if (first <= "3" && octal_len <= 2) return ++octal_len;
                            else if (first >= "4" && octal_len <= 1) return ++octal_len;
                        }
                        return false;
                    });
                    if (octal_len > 0) ch = String.fromCharCode(parseInt(ch, 8));
                    else ch = read_escaped_char();
                }
                else if (ch == quote) break;
                // RECOVERY
                else if (ch == "\n" || ch == "\r" || !ch) {
                    var result = token("string", ret);
                    register_error("Unterminated string literal", result);
                    return result;
                }
                
                ret += ch;
            }
            return token("string", ret);
        });
    }
    
    // RECOVERY
    function register_error(message, token) {
        token.error = message;
    }
    
    function read_line_comment() {
        next();
        var i = find("\n"), ret;
        if (i == -1) {
            ret = S.text.substr(S.pos);
            S.pos = S.text.length;
        } else {
            ret = S.text.substring(S.pos, i);
            S.pos = i;
        }
        return token("comment1", ret, true);
    }
    
    function read_multiline_comment() {
        next();
        return with_eof_error("Unterminated multiline comment", function() {
            var i = find("*/", true),
                text = S.text.substring(S.pos, i),
                tok = token("comment2", text, true);
            S.pos = i + 2;
            S.line += text.split("\n").length - 1;
            S.newline_before = text.indexOf("\n") >= 0;
            // https://github.com/mishoo/UglifyJS/issues/#issue/100
            if (/^@cc_on/i.test(text)) {
                warn("WARNING: at line " + S.line);
                warn("*** Found \"conditional comment\": " + text);
                warn("*** UglifyJS DISCARDS ALL COMMENTS.  This means your code might no longer work properly in Internet Explorer.");
            }
            return tok;
        });
    }
    
    function read_name() {
        var backslash = false,
            name = "",
            ch;
        while ((ch = peek()) != null) {
            if (!backslash) {
                if (ch == "\\") backslash = true, next();
                else if (is_identifier_char(ch)) name += next();
                else break;
            }
            else {
                if (ch != "u") parse_error("Expecting UnicodeEscapeSequence -- uXXXX");
                ch = read_escaped_char();
                if (!is_identifier_char(ch)) parse_error("Unicode char: " + ch.charCodeAt(0) + " is not valid in identifier");
                name += ch;
                backslash = false;
            }
        }
        return name;
    }
    
    function read_regexp(regexp) {
        return with_eof_error("Unterminated regular expression", function() {
            var prev_backslash = false,
                ch, in_class = false;
            while ((ch = next(true))) if (prev_backslash) {
                regexp += "\\" + ch;
                prev_backslash = false;
            }
            else if (ch == "[") {
                in_class = true;
                regexp += ch;
            }
            else if (ch == "]" && in_class) {
                in_class = false;
                regexp += ch;
            }
            else if (ch == "/" && !in_class) {
                break;
            }
            else if (ch == "\\") {
                prev_backslash = true;
            }
            else {
                regexp += ch;
            }
            var mods = read_name();
            return token("regexp", [regexp, mods]);
        });
    }
    
    function read_operator(prefix) {
        function grow(op) {
            if (!peek()) return op;
            var bigger = op + peek();
            if (HOP(OPERATORS, bigger)) {
                next();
                return grow(bigger);
            }
            else {
                return op;
            }
        };
        return token("operator", grow(prefix || next()));
    }
    
    function handle_slash() {
        next();
        var regex_allowed = S.regex_allowed;
        switch (peek()) {
        case "/":
            S.comments_before.push(read_line_comment());
            S.regex_allowed = regex_allowed;
            return next_token();
        case "*":
            S.comments_before.push(read_multiline_comment());
            S.regex_allowed = regex_allowed;
            return next_token();
        }
        return S.regex_allowed ? read_regexp("") : read_operator("/");
    }
    
    function handle_dot() {
        next();
        return is_digit(peek()) ? read_num(".") : token("punc", ".");
    }
    
    function read_word() {
        var word = read_name();
        return !HOP(KEYWORDS, word)
                ? token("name", word)
                : HOP(OPERATORS, word)
                ? token("operator", word)
                : HOP(KEYWORDS_ATOM, word)
                ? token("atom", word)
                : token("keyword", word);
    };
    
    function with_eof_error(eof_error, cont) {
        try {
            return cont();
        }
        catch (ex) {
            if (ex === EX_EOF) parse_error(eof_error);
            else throw ex;
        }
    }
    
    function next_token(force_regexp) {
        if (force_regexp != null) return read_regexp(force_regexp);
        skip_whitespace();
        start_token();
        var ch = peek();
        if (!ch) return token("eof");
        if (is_digit(ch)) return read_num();
        if (ch == '"' || ch == "'") return read_string();
        if (HOP(PUNC_CHARS, ch)) return token("punc", next());
        if (ch == ".") return handle_dot();
        if (ch == "/") return handle_slash();
        if (HOP(OPERATOR_CHARS, ch)) return read_operator();
        if (ch == "\\" || is_identifier_start(ch)) return read_word();
        
        // RECOVERY
        register_error("Unexpected character '" + ch + "'", token("ignore"));
        next(true);
        return next_token(force_regexp);
    }
    
    next_token.context = function(nc) {
        if (nc) S = nc;
        return S;
    };
    
    return next_token;
}

/* -----[ Parser (constants) ]----- */

var UNARY_PREFIX = array_to_hash([
        "typeof",
        "void",
        "delete",
        "--",
        "++",
        "!",
        "~",
        "-",
        "+"
]);

var UNARY_POSTFIX = array_to_hash([ "--", "++" ]);

var ASSIGNMENT = (function(a, ret, i) {
    while (i < a.length) {
        ret[a[i]] = a[i].substr(0, a[i].length - 1);
        i++;
    }
    return ret;
})(["+=", "-=", "/=", "*=", "%=", ">>=", "<<=", ">>>=", "|=", "^=", "&="], {
    "=": true
}, 0);

var PRECEDENCE = (function(a, ret) {
    for (var i = 0, n = 1; i < a.length; ++i, ++n) {
        var b = a[i];
        for (var j = 0; j < b.length; ++j) {
            ret[b[j]] = n;
        }
    }
    return ret;
})([
    ["||"],
    ["&&"],
    ["|"],
    ["^"],
    ["&"],
    ["==", "===", "!=", "!=="],
    ["<", ">", "<=", ">=", "in", "instanceof"],
    [">>", "<<", ">>>"],
    ["+", "-"],
    ["*", "/", "%"]
], {});

var STATEMENTS_WITH_LABELS = array_to_hash([ "for", "do", "while", "switch" ]);
var ATOMIC_START_TOKEN = array_to_hash([ "atom", "num", "string", "regexp", "name" ]);

/* -----[ Parser ]----- */

function NodeWithToken(str, start, end) {
    this.name = str;
    this.start = start;
    this.end = end;
}

NodeWithToken.prototype.toString = function() {
    return this.name;
};

function parse($TEXT, exigent_mode, embed_tokens) {
    var S = {
        input       : typeof $TEXT == "string" ? tokenizer($TEXT, true) : $TEXT,
        token       : null,
        prev        : null,
        peeked      : null,
        in_function : 0,
        in_loop     : 0,
        labels      : [],
        line        : 0,
        col         : 0,
        error       : null
    };

    S.token = next();

    function is(type, value) {
        return is_token(S.token, type, value);
    }

    function peek() {
        return S.peeked || (S.peeked = S.input());
    }
    
    function register_error(message, token) {
        if (!token)
            token = S.token;
        if(!S.error)
            S.error = {line: token.line, col: token.col, message: message};
    }
    
    function next() {
        S.prev = S.token;
        var context = S.input.context();
        S.line = context.line;
        S.col = context.col;
        if (S.peeked) {
            S.token = S.peeked;
            S.peeked = null;
        }
        else {
            S.token = S.input();
        }
        return S.token;
    }
    
    function prev() {
        return S.prev;
    }
    
    function croak(msg, line, col, pos) {
        var ctx = S.input.context();
        js_error(msg,
                 line != null ? line : ctx.tokline,
                 col != null ? col : ctx.tokcol,
                 pos != null ? pos : ctx.tokpos);
    }

    function token_error(token, msg) {
        // RECOVERY
        register_error(msg, token);
        // croak(msg, token.line, token.col);
    }

    function unexpected(token) {
        // RECOVERY
        if (token == null)
            token = S.token;
        register_error("Unexpected token: " + token.type + " (" + token.value + ")", token);
        /*if (token == null)
            token = S.token;
        token_error(token, "Unexpected token: " + token.type + " (" + token.value + ")");*/
    }

    function expect_token(type, val) {
        if (is(type, val)) {
            return next();
        }
        register_error("Unexpected token " + S.token.type + ", expected " + type, S.token);
    }
    
    function expect(punc) {
        // RECOVER
        if(is("punc", punc))
           return next();
        
        register_error("Expected: " + punc);
        // return expect_token("punc", punc);
    }

    function can_insert_semicolon() {
        return !exigent_mode && (S.token.nlb || is("eof") || is("punc", "}"));
    }
    
    function semicolon() {
        // RECOVER
        if (is("punc", ";")) 
            next();
        else if (!can_insert_semicolon())
            register_error("Semicolon expected");
    }

    function as() {
       return slice(arguments);
    }

    function parenthesised() {
        if(!is("punc", "(")) {
            // RECOVER
            register_error("Expected: (");
            return as("ERROR");
        }
        expect("(");
        var ex = expression();
        expect(")");
        return ex;
    }

    function add_tokens(str, start, end) {
        return str instanceof NodeWithToken ? str : new NodeWithToken(str, start, end);
    }

    function maybe_embed_tokens(parser) {
        if (embed_tokens) return function() {
            var start = S.token;
            var ast = parser.apply(this, arguments);
            if (!ast) {
                register_error("Parse error");
                return ["ERROR"];
            }
            ast[0] = add_tokens(ast[0], start, start === S.token ? start : prev());
            return ast;
        };
        else return parser;
    }
    
    var statement = maybe_embed_tokens(function() {
        if (is("operator", "/") || is("operator", "/=")) {
            S.peeked = null;
            S.token = S.input(S.token.value.substr(1)); // force regexp
        }
        switch (S.token.type) {
        case "num":
        case "string":
        case "regexp":
        case "operator":
        case "atom":
            return simple_statement();

        case "name":
            return is_token(peek(), "punc", ":")
                    ? labeled_statement(prog1(S.token.value, next, next))
                    : simple_statement();

        case "punc":
            switch (S.token.value) {
            case "{":
                return as("block", block_());
            case "[":
            case "(":
                return simple_statement();
            case ";":
                next();
                return as("block");
            default:
                // RECOVER
                next();
                register_error("Bracket expected.");
                return as("ERROR");
                //unexpected();
            }

        case "keyword":
            switch (prog1(S.token.value, next)) {
            case "break":
                return break_cont("break");

            case "continue":
                return break_cont("continue");

            case "debugger":
                semicolon();
                return as("debugger");

            case "do":
                return (function(body) {
                    // RECOVER
                    if (is("keyword", "while")) {
                        expect_token("keyword", "while");
                        return as("do", prog1(parenthesised, semicolon), body);
                    }
                    else {
                        register_error("Invalid do statement.");
                        return as("do", as("ERROR"), as("ERROR"));
                    }
                })(in_loop(statement));
            case "for":
                return for_();

            case "function":
                return function_(true);

            case "if":
                return if_();

            case "return":
                // RECOVERY
                if (S.in_function == 0)
                    register_error("'return' outside of function");
                return as("return",
                          is("punc", ";")
                          ? (next(), null)
                          : can_insert_semicolon()
                          ? null
                          : prog1(expression, semicolon));

            case "switch":
                return as("switch", parenthesised(), switch_block_());

            case "throw":
                if (S.token.nlb)
                    croak("Illegal newline after 'throw'");
                return as("throw", prog1(expression, semicolon));

            case "try":
                return try_();

            case "var":
                return prog1(var_, semicolon);
                
            case "let":
                return prog1(let_, semicolon);

            case "const":
                return prog1(const_, semicolon);

            case "while":
                return as("while", parenthesised(), in_loop(statement));

            case "with":
                return as("with", parenthesised(), statement());

            default:
                unexpected();
            }
        }
    });

    function labeled_statement(label) {
        S.labels.push(label);
        var start = S.token,
            stat = statement();
        if (exigent_mode && !HOP(STATEMENTS_WITH_LABELS, stat[0])) unexpected(start);
        S.labels.pop();
        return as("label", label, stat);
    }
    
    function simple_statement() {
        return as("stat", prog1(expression, semicolon));
    }
    
    function break_cont(type) {
        var name;
        if (!can_insert_semicolon()) {
            name = is("name") ? S.token.value : null;
        }
        if (name != null) {
            next();
            if (!member(name, S.labels)) croak("Label " + name + " without matching loop or statement");
        }
        else if (S.in_loop == 0) croak(type + " not inside a loop or switch");
        semicolon();
        return as(type, name);
    }

    function for_() {
        // RECOVER
        if(!is("punc", "(")) {
            register_error("Expected: (");
            return as("for", as("ERROR"), as("ERROR"), as("ERROR"), as("ERROR"));
        } else {
            expect("(");
            var init = null;
            if (!is("punc", ";")) {
                if(is("keyword", "var"))
                    init = (next(), var_(true));
                else if(is("keyword", "let"))
                    init = (next(), let_(true));
                else
                    init = expression(true, true);
                if (is("operator", "in"))
                        return for_in(init);
            }
            return regular_for(init);
        }
    }

    function regular_for(init) {
        expect(";");
        var test = is("punc", ";") ? null : expression();
        // RECOVER
        if(is("punc", ";")) {
            expect(";");
            var step = is("punc", ")") ? null : expression();
            expect(")");
        }
        else {
            register_error("Expected: ;");
        }
        return as("for", init, test, step, in_loop(statement));
    };

    function for_in(init) {
        var lhs;
        if(init[0] == "var")
            lhs = as("name", init[1][0]);
        else if(init[0] == "let")
            lhs = as("name", init[1][0]);
        else
            lhs = init;
        next();
        var obj = expression();
        expect(")");
        return as("for-in", init, lhs, obj, in_loop(statement));
    }

    var function_ = maybe_embed_tokens(function(in_statement) {
        var prev = S.token;
        var name = is("name") ? prog1(S.token.value, next) : null;
        name = add_tokens(name, prev, S.token);
        if (in_statement && !name) {
            // RECOVER
            register_error("Invalid function definition");
            return as("function", "", [], []);
        }
        expect("(");
        return as(in_statement ? "defun" : "function", name,
        // arguments
        (function(first, a) {
            while (!is("punc", ")") && !is("eof")) {
                if (first) first = false;
                else expect(",");
                if (!is("name")) unexpected();
                a.push(add_tokens(S.token.value, S.token));
                next();
            }
            next();
            return a;
        })(true, []),
        // body
        (function() {
            ++S.in_function;
            var loop = S.in_loop;
            S.in_loop = 0;
            var a = block_();
            --S.in_function;
            S.in_loop = loop;
            return a;
        })());
    });
    
    function if_() {
        var cond = parenthesised(),
            body = statement(),
            belse;
        if (is("keyword", "else")) {
            next();
            belse = statement();
        }
        return as("if", cond, body, belse);
    };
    
    function block_() {
        expect("{");
        var a = [];
        while (!is("punc", "}")) {
            if (is("eof")) {
                // RECOVERY
                //unexpected();
                return a;
            }
            a.push(statement());
        }
        next();
        return a;
    };
    
    var switch_block_ = curry(in_loop, function() {
        // RECOVER
        if (is("punc", "{")) expect("{");
        var a = [],
            cur = null;
        while (!is("punc", "}")) {
            if (is("eof")) {
                // RECOVER
                break;
                //unexpected();
            }
            if (is("keyword", "case")) {
                next();
                cur = [];
                a.push([expression(), cur]);
                expect(":");
            }
            else if (is("keyword", "default")) {
                next();
                expect(":");
                cur = [];
                a.push([null, cur]);
            }
            else {
                if (!cur) {
                    // RECOVER
                    //unexpected();
                    return a;
                }
                cur.push(statement());
            }
        }
        next();
        return a;
    });
    
    function try_() {
        var body = block_(),
            bcatch, bfinally;
        if (is("keyword", "catch")) {
            next();
            expect("(");
            if (!is("name")) croak("Name expected");
            var name = S.token.value;
            next();
            expect(")");
            bcatch = [name, block_()];
        }
        if (is("keyword", "finally")) {
            next();
            bfinally = block_();
        }
        if (!bcatch && !bfinally) croak("Missing catch/finally blocks");
        return as("try", body, bcatch, bfinally);
    }
    
    function vardefs(no_in) {
        var a = [];
        for (;;) {
            if (!is("name")) unexpected();
            var prev = S.token;
            var name = S.token.value;
            next();
            name = add_tokens(name, prev, S.token);
            if (is("operator", "=")) {
                next();
                a.push([name, expression(false, no_in)]);
            }
            else {
                a.push([name]);
            }
            if (!is("punc", ",")) break;
            next();
        }
        return a;
    }
    
    function var_(no_in) {
        return as("var", vardefs(no_in));
    }
    
    function let_(no_in) {
        return as("let", vardefs(no_in));
    }
    
    function const_() {
        return as("const", vardefs());
    }
    
    function new_() {
        var newexp = expr_atom(false),
            args;
        if (is("punc", "(")) {
            next();
            args = expr_list(")");
        }
        else {
            args = [];
        }
        return subscripts(as("new", newexp, args), true);
    }
    
    var expr_atom = maybe_embed_tokens(function(allow_calls) {
        if (is("operator", "new")) {
            next();
            return new_();
        }
        if (is("punc")) {
            switch (S.token.value) {
            case "(":
                next();
                return subscripts(prog1(expression, function() {
                    // RECOVER
                    // curry(expect, ")")
                    expect(")");
                }), allow_calls);
            case "[":
                next();
                return subscripts(array_(), allow_calls);
            case "{":
                next();
                return subscripts(object_(), allow_calls);
            }
            // RECOVER
            register_error("Bracket expected.");
            return as("ERROR");
            //unexpected();
        }
        if (is("keyword", "function")) {
            next();
            return subscripts(function_(false), allow_calls);
        }
        if (HOP(ATOMIC_START_TOKEN, S.token.type)) {
            var atom = S.token.type == "regexp"
                    ? as("regexp", S.token.value[0], S.token.value[1])
                    : as(S.token.type, S.token.value);
            return subscripts(prog1(atom, next), allow_calls);
        }
        unexpected();
    });

    function expr_list(closing, allow_trailing_comma, allow_empty) {
        var first = true,
            a = [];
        while (!is("punc", closing) && !is("eof")) {
            if (first) first = false;
            else expect(",");
            if (allow_trailing_comma && is("punc", closing)) break;
            if (is("punc", ",") && allow_empty) {
                a.push(["atom", "undefined"]);
            }
            else {
                a.push(expression(false));
            }
        }
        next();
        return a;
    }
    
    function array_() {
        return as("array", expr_list("]", !exigent_mode, true));
    }
    
    function object_() {
        var first = true,
            a = [];
        while (!is("punc", "}") && !is("eof")) {
            if (first) first = false;
            else expect(",");
            if (!exigent_mode && is("punc", "}"))
                // allow trailing comma
                break;
            var type = S.token.type;
            
            var name = as_property_name();
            if (type == "name" && (name == "get" || name == "set") && !is("punc", ":")) {
                a.push([as_name(), function_(false), name]);
            }
            else {
                expect(":");
                a.push([name, expression(false)]);
            }
        }
        next();
        return as("object", a);
    }
    
    function as_property_name() {
        switch (S.token.type) {
        case "num":
        case "string":
            return prog1(S.token.value, next);
        }
        return as_name();
    };
    
    function as_name() {
        switch (S.token.type) {
        case "name":
        case "operator":
        case "keyword":
        case "atom":
            return prog1(S.token.value, next);
        default:
            //unexpected();
            // RECOVER: Return empty token
            register_error("Name, operator, keyword or atom expected.");
            return ""; // prog1("", next);
        }
    };
    
    function insert_token(ast, prev) {
        ast[0] = add_tokens(ast[0], prev, S.token);
        return ast;
    }
    
    function subscripts(expr, allow_calls) {
        var p = S.prev;
        if(!(expr[0] instanceof NodeWithToken)) {
            expr = insert_token(expr, p);
        }
        if (is("punc", ".")) {
            next();
            return subscripts(insert_token(as("dot", expr, as_name()), p), allow_calls);
        }
        if (is("punc", "[")) {
            next();
            return subscripts(as("sub", expr, prog1(expression, curry(expect, "]"))), allow_calls);
        }
        if (allow_calls && is("punc", "(")) {
            next();
            return subscripts(as("call", expr, expr_list(")")), true);
        }
        return expr;
    }
    
    function maybe_unary(allow_calls) {
        if (is("operator") && HOP(UNARY_PREFIX, S.token.value)) {
            return make_unary("unary-prefix", prog1(S.token.value, next), maybe_unary(allow_calls));
        }
        var val = expr_atom(allow_calls);
        while (is("operator") && HOP(UNARY_POSTFIX, S.token.value) && !S.token.nlb) {
            val = make_unary("unary-postfix", S.token.value, val);
            next();
        }
        return val;
    }
    
    function make_unary(tag, op, expr) {
        if ((op == "++" || op == "--") && !is_assignable(expr)) croak("Invalid use of " + op + " operator");
        return as(tag, op, expr);
    }
    
    function expr_op(left, min_prec, no_in) {
        var op = is("operator") ? S.token.value : null;
        if (op && op == "in" && no_in) op = null;
        var prec = op != null ? PRECEDENCE[op] : null;
        if (prec != null && prec > min_prec) {
            next();
            var right = expr_op(maybe_unary(true), prec, no_in);
            return expr_op(as("binary", op, left, right), min_prec, no_in);
        }
        return left;
    }
    
    function expr_ops(no_in) {
        return expr_op(maybe_unary(true), 0, no_in);
    }
    
    function maybe_conditional(no_in) {
        var expr = expr_ops(no_in);
        if (is("operator", "?")) {
            next();
            var yes = expression(false);
            expect(":");
            return as("conditional", expr, yes, expression(false, no_in));
        }
        return expr;
    }
    
    function is_assignable(expr) {
        if (!exigent_mode) return true;
        switch (expr[0] + "") {
        case "dot":
        case "sub":
        case "new":
        case "call":
            return true;
        case "name":
            return expr[1] != "this";
        }
    }
    
    function maybe_assign(no_in) {
        var left = maybe_conditional(no_in),
            val = S.token.value;
        if (is("operator") && HOP(ASSIGNMENT, val)) {
            if (is_assignable(left)) {
                next();
                return as("assign", ASSIGNMENT[val], left, maybe_assign(no_in));
            }
            croak("Invalid assignment");
        }
        return left;
    }
    
    var expression = maybe_embed_tokens(function(commas, no_in) {
        if (arguments.length == 0) commas = true;
        // RECOVER: prevent infinite loops
        var oldLine = S.line;
        var oldCol = S.col;
        //
        var expr = maybe_assign(no_in);
        if (commas && is("punc", ",")) {
            next();
            return as("seq", expr, expression(true, no_in));
        }
        if(S.col === oldCol && S.line === oldLine) {
            // RECOVER: Preventing infinite loops here
            next();
        }
        return expr;
    });
    
    function in_loop(cont) {
        try {
            ++S.in_loop;
            return cont();
        }
        finally {
            --S.in_loop;
        }
    }
    
    return {
        ast: as("toplevel", (function(a) {
            while (!is("eof"))
            a.push(statement());
            return a;
        })([])),
        error: S.error
    };
};

/* -----[ Utilities ]----- */

function curry(f) {
    var args = slice(arguments, 1);
    return function() {
        return f.apply(this, args.concat(slice(arguments)));
    };
}

function prog1(ret) {
    if (ret instanceof Function) ret = ret();
    for (var i = 1, n = arguments.length; --n > 0; ++i)
    arguments[i]();
    return ret;
}

function array_to_hash(a) {
    var ret = {};
    for (var i = 0; i < a.length; ++i)
    ret[a[i]] = true;
    return ret;
}

function slice(a, start) {
    return Array.prototype.slice.call(a, start || 0);
}

function characters(str) {
    return str.split("");
}

function member(name, array) {
    for (var i = array.length; --i >= 0;)
    if (array[i] === name) return true;
    return false;
}

function HOP(obj, prop) {
    return Object.prototype.hasOwnProperty.call(obj, prop);
}

var warn = function() {};

/* -----[ Exports ]----- */

exports.tokenizer = tokenizer;
exports.parse = parse;
exports.slice = slice;
exports.curry = curry;
exports.member = member;
exports.array_to_hash = array_to_hash;
exports.PRECEDENCE = PRECEDENCE;
exports.KEYWORDS_ATOM = KEYWORDS_ATOM;
exports.RESERVED_WORDS = RESERVED_WORDS;
exports.KEYWORDS = KEYWORDS;
exports.ATOMIC_START_TOKEN = ATOMIC_START_TOKEN;
exports.OPERATORS = OPERATORS;
exports.is_alphanumeric_char = is_alphanumeric_char;
exports.set_logger = function(logger) {
    warn = logger;
};

});
define('treehugger/traverse', ['require', 'exports', 'module' , 'treehugger/tree'], function(require, exports, module) {

var tree = require('treehugger/tree');

if (!Function.prototype.curry) {
    Function.prototype.curry = function() {
        var fn = this,
            args = Array.prototype.slice.call(arguments);
        return function() {
            return fn.apply(this, args.concat(Array.prototype.slice.call(arguments)));
        };
    };
}

function normalizeArgs(args) {
    if (args.length === 1 && args[0].apply) { // basic, one function, shortcut!
        return args[0];
    }
    args = Array.prototype.slice.call(args, 0);
    if (args[0] && Object.prototype.toString.call(args[0]) === '[object Array]') {
        args = args[0];
    }
    return function normalizeArgsHelper() {
        var result;
        for (var i = 0; i < args.length; i++) {
            if (typeof args[i] === 'string') {
                var parsedPattern = tree.parse(args[i]);
                var bindings = parsedPattern.match(this);
                if (bindings) {
                    while (args[i + 1]) {
                        if (args[i + 1].apply)
                            break;
                        i++;
                    }
                    if (args[i + 1] && args[i + 1].apply) {
                        result = args[i + 1].call(this, bindings, this);
                        i++;
                    }
                    else
                        result = this;
                    if (result)
                        return result;
                }
                else if (args[i + 1] && args[i + 1].apply)
                    i++;
            }
            else if (args[i].apply) {
                result = args[i].call(this);
                if (result)
                    return result;
            }
            else
                throw Error("Invalid argument: ", args[i]);
        }
        return false;
    };
}

exports.traverseAll = function(fn) {
    var result, i;
    fn = normalizeArgs(arguments);
    if (this instanceof tree.ConsNode || this instanceof tree.ListNode) {
        for (i = 0; i < this.length; i++) {
            result = fn.call(this[i]);
            if (!result)
                return false;
        }
    }
    return this;
};

/**
 * Sequential application last argument is term
 */
function seq() {
    var fn;
    var t = this;
    for (var i = 0; i < arguments.length; i++) {
        fn = arguments[i];
        t = fn.call(t);
        if (!t)
            return false;
    }
    return this;
}
// Try
exports.attempt = function(fn) {
    fn = normalizeArgs(arguments);
    var result = fn.call(this);
    return !result ? this : result;
};

exports.debug = function(pretty) {
    console.log(pretty ? this.toPrettyString("") : this.toString());
    return this;
};

// A somewhat optimized version of the "clean" topdown traversal
function traverseTopDown(fn) {
    var result, i;
    result = fn.call(this);
    if(result)
        return result;
    if (this instanceof tree.ConsNode || this instanceof tree.ListNode) {
        for (i = 0; i < this.length; i++) {
            traverseTopDown.call(this[i], fn);
        }
    }
    return this;
}

exports.traverseTopDown = function(fn) {
    fn = normalizeArgs(arguments);
    return traverseTopDown.call(this, fn);
    //exports.rewrite.call(this, fn, exports.traverseAll.curry(exports.traverseTopDown.curry(fn)));
    //return this;
};

/**
 * Traverse up the tree (using parent pointers) and return the first matching node
 * Doesn't only traverse parents, but also upward siblings
 */
exports.traverseUp = function(fn) {
    fn = normalizeArgs(arguments);
    var result = fn.call(this);
    if(result)
        return result;
    if (!this.parent)
        return false;
    return this.parent.traverseUp(fn);
};

exports.collectTopDown = function(fn) {
    fn = normalizeArgs(arguments);
    var results = [];
    this.traverseTopDown(function() {
        var r = fn.call(this);
        if (r) {
            results.push(r);
        }
        return r;
    });
    return tree.list(results);
};

exports.map = function(fn) {
    fn = normalizeArgs(arguments);
    var result, results = [];
    for (var i = 0; i < this.length; i++) {
        result = fn.call(this[i], this[i]);
        if (result) {
            results.push(result);
        }
        else {
            throw Error("Mapping failed: ", this[i]);
        }
    }
    return tree.list(results);
};

exports.each = function(fn) {
    fn = normalizeArgs(arguments);
    for (var i = 0; i < this.length; i++) {
        fn.call(this[i], this[i]);
    }
};

// fn return boolean
exports.filter = function(fn) {
    fn = normalizeArgs(arguments);
    var matching = [];
    this.forEach(function(el) {
        var result = fn.call(el);
        if (result) {
            matching.push(result);
        }
    });
    return tree.list(matching);
};

exports.rewrite = function(fn) {
    fn = normalizeArgs(arguments);
    return fn.call(this);
};

exports.isMatch = function(pattern) {
    return !!this.rewrite(pattern);
};

// Add above methods to all tree nodes
for (var p in exports) {
    if (exports.hasOwnProperty(p)) {
        tree.Node.prototype[p] = exports[p];
    }
}

exports.addParentPointers = function(node) {
    return node.traverseTopDown(function() {
        var that = this;
        this.traverseAll(function() {
            this.parent = that;
            return this;
        });
    });
};

});/**
 * JavaScript scope analysis module and warning reporter.
 * 
 * This handler does a couple of things:
 * 1. It does scope analysis and attaches a scope object to every variable, variable declaration and function declaration
 * 2. It creates markers for undeclared variables
 * 3. It creates markers for unused variables
 * 4. It implements the local variable refactoring
 * 
 * @depend ext/jslanguage/parse
 *
 * @copyright 2011, Ajax.org B.V.
 * @license GPLv3 <http://www.gnu.org/licenses/gpl.txt>
 */
define('ext/jslanguage/scope_analyzer', ['require', 'exports', 'module' , 'ext/language/base_handler', 'ext/codecomplete/complete_util', 'ext/jslanguage/outline', 'ext/jslanguage/jshint', 'ext/jslanguage/JSResolver', 'treehugger/traverse'], function(require, exports, module) {

var baseLanguageHandler = require('ext/language/base_handler');
var completeUtil = require("ext/codecomplete/complete_util");
var handler = module.exports = Object.create(baseLanguageHandler);
var outline = require("ext/jslanguage/outline");
var jshint = require("ext/jslanguage/jshint");
var JSResolver = require('ext/jslanguage/JSResolver').JSResolver;

require("treehugger/traverse"); // add traversal functions to trees

var CALLBACK_METHODS = ["forEach", "map", "reduce", "filter", "every", "some"];
var CALLBACK_FUNCTIONS = ["require", "setTimeout", "setInterval"];
var PROPER = module.exports.PROPER = 80;
var MAYBE_PROPER = module.exports.MAYBE_PROPER = 1;
var NOT_PROPER = module.exports.NOT_PROPER = 0;
var KIND_EVENT = module.exports.KIND_EVENT = "event";
var KIND_PACKAGE = module.exports.KIND_PACKAGE = "package";
var KIND_HIDDEN = module.exports.KIND_HIDDEN = "hidden";
var KIND_DEFAULT = module.exports.KIND_DEFAULT = undefined;
var IN_CALLBACK_DEF = 1;
var IN_CALLBACK_BODY = 2;
var IN_CALLBACK_BODY_MAYBE = 3;
var IN_LOOP = 1;
var IN_LOOP_ALLOWED = 2;

// Based on https://github.com/jshint/jshint/blob/master/jshint.js#L331
var GLOBALS = {
    // Literals
    "true"                   : true,
    "false"                  : true,
    "undefined"              : true,
    "null"                   : true,
    "arguments"              : true,
    "Infinity"               : true,
    onmessage                : true,
    postMessage              : true,
    importScripts            : true,
    "continue"               : true,
    "return"                 : true,
    "else"                   : true,
    // Browser
    ArrayBuffer              : true,
    Attr                     : true,
    Audio                    : true,
    addEventListener         : true,
    applicationCache         : true,
    blur                     : true,
    clearInterval            : true,
    clearTimeout             : true,
    close                    : true,
    closed                   : true,
    DataView                 : true,
    defaultStatus            : true,
    document                 : true,
    event                    : true,
    FileReader               : true,
    Float32Array             : true,
    Float64Array             : true,
    FormData                 : true,
    getComputedStyle         : true,
    CDATASection             : true,
    HTMLElement              : true,
    HTMLAnchorElement        : true,
    HTMLBaseElement          : true,
    HTMLBlockquoteElement    : true,
    HTMLBodyElement          : true,
    HTMLBRElement            : true,
    HTMLButtonElement        : true,
    HTMLCanvasElement        : true,
    HTMLDirectoryElement     : true,
    HTMLDivElement           : true,
    HTMLDListElement         : true,
    HTMLFieldSetElement      : true,
    HTMLFontElement          : true,
    HTMLFormElement          : true,
    HTMLFrameElement         : true,
    HTMLFrameSetElement      : true,
    HTMLHeadElement          : true,
    HTMLHeadingElement       : true,
    HTMLHRElement            : true,
    HTMLHtmlElement          : true,
    HTMLIFrameElement        : true,
    HTMLImageElement         : true,
    HTMLInputElement         : true,
    HTMLIsIndexElement       : true,
    HTMLLabelElement         : true,
    HTMLLayerElement         : true,
    HTMLLegendElement        : true,
    HTMLLIElement            : true,
    HTMLLinkElement          : true,
    HTMLMapElement           : true,
    HTMLMenuElement          : true,
    HTMLMetaElement          : true,
    HTMLModElement           : true,
    HTMLObjectElement        : true,
    HTMLOListElement         : true,
    HTMLOptGroupElement      : true,
    HTMLOptionElement        : true,
    HTMLParagraphElement     : true,
    HTMLParamElement         : true,
    HTMLPreElement           : true,
    HTMLQuoteElement         : true,
    HTMLScriptElement        : true,
    HTMLSelectElement        : true,
    HTMLStyleElement         : true,
    HTMLTableCaptionElement  : true,
    HTMLTableCellElement     : true,
    HTMLTableColElement      : true,
    HTMLTableElement         : true,
    HTMLTableRowElement      : true,
    HTMLTableSectionElement  : true,
    HTMLTextAreaElement      : true,
    HTMLTitleElement         : true,
    HTMLUListElement         : true,
    HTMLVideoElement         : true,
    Int16Array               : true,
    Int32Array               : true,
    Int8Array                : true,
    Image                    : true,
    localStorage             : true,
    location                 : true,
    navigator                : true,
    open                     : true,
    openDatabase             : true,
    Option                   : true,
    parent                   : true,
    print                    : true,
    removeEventListener      : true,
    resizeBy                 : true,
    resizeTo                 : true,
    screen                   : true,
    scroll                   : true,
    scrollBy                 : true,
    scrollTo                 : true,
    sessionStorage           : true,
    setInterval              : true,
    setTimeout               : true,
    SharedWorker             : true,
    Uint16Array              : true,
    Uint32Array              : true,
    Uint8Array               : true,
    WebSocket                : true,
    window                   : true,
    Worker                   : true,
    XMLHttpRequest           : true,
    XPathEvaluator           : true,
    XPathException           : true,
    XPathExpression          : true,
    XPathNamespace           : true,
    XPathNSResolver          : true,
    XPathResult              : true,
    // Devel
    alert                    : true,
    confirm                  : true,
    console                  : true,
    prompt                   : true,
    // Frameworks
    jQuery                   : true,
    "$"                      : true,
    "$$"                     : true,
    goog                     : true,
    dojo                     : true,
    dojox                    : true,
    dijit                    : true,
    apf                      : true,
    Document                 : true,
    Element                  : true,
    Event                    : true,
    KeyboardEvent            : true,
    MooTools                 : true,
    Window                   : true,
    Ajax                     : true,
    Field                    : true,
    Scriptaculous            : true,
    // require.js
    define                   : true,
    // node.js
    __filename               : true,
    __dirname                : true,
    Buffer                   : true,
    exports                  : true,
    GLOBAL                   : true,
    global                   : true,
    module                   : true,
    process                  : true,
    require                  : true,
    // Standard
    Array                    : true,
    Boolean                  : true,
    Date                     : true,
    decodeURI                : true,
    decodeURIComponent       : true,
    encodeURI                : true,
    encodeURIComponent       : true,
    Error                    : true,
    'eval'                   : true,
    EvalError                : true,
    Function                 : true,
    hasOwnProperty           : true,
    isFinite                 : true,
    isNaN                    : true,
    JSON                     : true,
    Math                     : true,
    Number                   : true,
    Object                   : true,
    parseInt                 : true,
    parseFloat               : true,
    RangeError               : true,
    ReferenceError           : true,
    RegExp                   : true,
    String                   : true,
    SyntaxError              : true,
    TypeError                : true,
    URIError                 : true,
    // non-standard
    escape                   : true,
    unescape                 : true
};

var KEYWORDS = [
    "break",
    "const",
    "continue",
    "delete",
    "do",
    "while",
    "export",
    "for",
    "in",
    "function",
    "if",
    "else",
    "import",
    "instanceof",
    "new",
    "return",
    "switch",
    "this",
    "throw",
    "try",
    "catch",
    "typeof",
    "void",
    "with"
];

handler.handlesLanguage = function(language) {
    return language === 'javascript';
};

handler.getResolutions = function(value, ast, markers, callback){
    var resolver = new JSResolver(value, ast);
    resolver.addResolutions(markers);
    callback(markers);
};

handler.hasResolution = function(value, ast, marker) {
    if (marker.resolutions && marker.resolutions.length){
        return true;
    }
    var resolver = new JSResolver(value, ast);
    return resolver.getType(marker);
};


var scopeId = 0;

var Variable = module.exports.Variable = function Variable(declaration) {
    this.declarations = [];
    if(declaration)
        this.declarations.push(declaration);
    this.uses = [];
    this.values = [];
};

Variable.prototype.addUse = function(node) {
    this.uses.push(node);
};

Variable.prototype.addDeclaration = function(node) {
    this.declarations.push(node);
};

Variable.prototype.markProperDeclaration = function(confidence) {
    if (!confidence)
        return;
    else if (!this.properDeclarationConfidence)
        this.properDeclarationConfidence = confidence;
    else if (this.properDeclarationConfidence < PROPER)
        this.properDeclarationConfidence += confidence;
};

Variable.prototype.isProperDeclaration = function() {
    return this.properDeclarationConfidence > MAYBE_PROPER;
};

/**
 * Implements Javascript's scoping mechanism using a hashmap with parent
 * pointers.
 */
var Scope = module.exports.Scope = function Scope(parent) {
    this.id = scopeId++;
    this.parent = parent;
    this.vars = {};
};

/**
 * Declare a variable in the current scope
 */
Scope.prototype.declare = function(name, resolveNode, properDeclarationConfidence, kind) {
    var result;
    var vars = this.getVars(kind);
    if (!vars['_'+name]) {
        result = vars['_'+name] = new Variable(resolveNode);
    }
    else if (resolveNode) {
        result = vars['_'+name];
        result.addDeclaration(resolveNode);
    }
    if (result) {
        result.markProperDeclaration(properDeclarationConfidence);
        result.kind = kind;
    }
    return result;
};

Scope.prototype.declareAlias = function(kind, originalName, newName) {
    var vars = this.getVars(kind);
    vars["_" + newName] = vars["_" + originalName];
};

Scope.prototype.getVars = function(kind) {
    if (kind)
        return this.vars[kind] = this.vars[kind] || {};
    else
        return this.vars;
};

Scope.prototype.isDeclared = function(name) {
    return !!this.get(name);
};

/**
 * Get possible values of a variable
 * @param name name of variable
 * @return Variable instance
 */
Scope.prototype.get = function(name, kind) {
    var vars = this.getVars(kind);
    if(vars['_'+name])
        return vars['_'+name];
    else if(this.parent)
        return this.parent.get(name, kind);
};

Scope.prototype.getVariableNames = function() {
    return this.getNamesByKind(KIND_DEFAULT);
};

Scope.prototype.getNamesByKind = function(kind) {
    var results = [];
    var vars = this.getVars(kind);
    for (var v in vars) {
        if (vars.hasOwnProperty(v) && v !== KIND_HIDDEN && v !== KIND_PACKAGE)
            results.push(v.slice(1));
    }
    if (this.parent) {
        var namesFromParent = this.parent.getNamesByKind(kind);
        for (var i = 0; i < namesFromParent.length; i++) {
            results.push(namesFromParent[i]);
        }
    }
    return results;
};

var SCOPE_ARRAY = Object.keys(GLOBALS).concat(KEYWORDS);

handler.complete = function(doc, fullAst, pos, currentNode, callback) {
    var line = doc.getLine(pos.row);
    var identifier = completeUtil.retrievePrecedingIdentifier(line, pos.column);

    var matches = completeUtil.findCompletions(identifier, SCOPE_ARRAY);
    callback(matches.map(function(m) {
        return {
          name        : m,
          replaceText : m,
          icon        : null,
          meta        : "EcmaScript",
          priority    : 0
        };
    }));
};

handler.analyze = function(value, ast, callback) {
    var handler = this;
    var markers = [];
    
    // Preclare variables (pre-declares, yo!)
    function preDeclareHoisted(scope, node) {
        node.traverseTopDown(
            // var bla;
            'VarDecl(x)', 'ConstDecl(x)', function(b, node) {
                node.setAnnotation("scope", scope);
                scope.declare(b.x.value, b.x, PROPER);
                return node;
            },
            // var bla = 10;
            'VarDeclInit(x, e)', 'ConstDeclInit(x, e)', function(b, node) {
                node.setAnnotation("scope", scope);
                scope.declare(b.x.value, b.x, PROPER);
            },
            // function bla(farg) { }
            'Function(x, _, _)', function(b, node) {
                node.setAnnotation("scope", scope);
                if(b.x.value) {
                    scope.declare(b.x.value, b.x, PROPER);
                }
                return node;
            }
        );
    }
    
    function scopeAnalyzer(scope, node, parentLocalVars, inCallback, inLoop) {
        preDeclareHoisted(scope, node);
        var mustUseVars = parentLocalVars || [];
        node.setAnnotation("scope", scope);
        function analyze(scope, node, inCallback, inLoop) {
            var inLoopAllowed = false;
            if (inLoop === IN_LOOP_ALLOWED) {
                inLoop = IN_LOOP;
                inLoopAllowed = true;
            }
            node.traverseTopDown(
                'VarDecl(x)', 'ConstDecl(x)', function(b) {
                    mustUseVars.push(scope.get(b.x.value));
                },
                'VarDeclInit(x, e)', 'ConstDeclInit(x, e)', function(b) {
                    // Allow unused function declarations
                    while (b.e.isMatch('Assign(_, _)'))
                        b.e = b.e[1];
                    if (!b.e.isMatch('Function(_, _, _)'))
                        mustUseVars.push(scope.get(b.x.value));
                },
                'Assign(Var(x), e)', function(b, node) {
                    if (!scope.isDeclared(b.x.value)) {
                        if (handler.isFeatureEnabled("undeclaredVars") && !jshintGlobals[b.x.value]) {
                            markers.push({
                                pos: node[0].getPos(),
                                level: 'warning',
                                type: 'warning',
                                message: "Assigning to undeclared variable."
                            });
                        }
                    }
                    else {
                        node[0].setAnnotation("scope", scope);
                        scope.get(b.x.value).addUse(node[0]);
                    }
                    analyze(scope, b.e, inCallback, inLoop);
                    return node;
                },
                'ForIn(Var(x), e, stats)', function(b) {
                    if (handler.isFeatureEnabled("undeclaredVars") &&
                        !scope.isDeclared(b.x.value) && !jshintGlobals[b.x.value]) {
                        markers.push({
                            pos: this.getPos(),
                            level: 'warning',
                            type: 'warning',
                            message: "Using undeclared variable as iterator variable."
                        });
                    }
                    analyze(scope, b.e, inCallback, inLoop);
                    analyze(scope, b.stats, inCallback, true);
                    return node;
                },
                'Var("this")', function(b, node) {
                    if (inCallback === IN_CALLBACK_BODY) {
                        markers.push({
                            pos: this.getPos(),
                            level: 'warning',
                            type: 'warning',
                            message: "Use of 'this' in callback function"
                        });
                    }
                    else if (inCallback === IN_CALLBACK_BODY_MAYBE) {
                        markers.push({
                            pos: this.getPos(),
                            level: 'info',
                            type: 'info',
                            message: "Use of 'this' in closure"
                        });
                    }
                },
                'Var(x)', function(b, node) {
                    node.setAnnotation("scope", scope);
                    if(scope.isDeclared(b.x.value)) {
                        scope.get(b.x.value).addUse(node);
                    } else if(handler.isFeatureEnabled("undeclaredVars") &&
                        !GLOBALS[b.x.value] && !jshintGlobals[b.x.value]) {
                        if (b.x.value === "self") {
                            markers.push({
                                pos: this.getPos(),
                                level: 'warning',
                                type: 'warning',
                                message: "Use 'window.self' to refer to the 'self' global."
                            });
                            return;
                        }
                        markers.push({
                            pos: this.getPos(),
                            level: 'warning',
                            type: 'warning',
                            message: "Undeclared variable."
                        });
                    }
                    return node;
                },
                'Function(x, fargs, body)', function(b, node) {
                    if (inLoop && !inLoopAllowed) {
                        var pos = this.getPos();
                        // treehugger doesn't store info on the position of "function" token
                        var line = handler.doc.getLine(pos.sl);
                        var sc = line.substring(0, pos.sc).lastIndexOf("function");
                        markers.push({
                            pos: { sl: pos.sl, el: pos.sl, sc: sc, ec: sc + "function".length },
                            level: 'warning',
                            type: 'warning',
                            message: "Function created in a loop."
                        });
                    }
                    
                    var newScope = new Scope(scope);
                    node.setAnnotation("localScope", newScope);
                    newScope.declare("this");
                    b.fargs.forEach(function(farg) {
                        farg.setAnnotation("scope", newScope);
                        var v = newScope.declare(farg[0].value, farg);
                        if (handler.isFeatureEnabled("unusedFunctionArgs"))
                            mustUseVars.push(v);
                    });
                    var inBody = inCallback === IN_CALLBACK_DEF ? IN_CALLBACK_BODY : isCallback(node);
                    scopeAnalyzer(newScope, b.body, null, inBody, inLoop);
                    return node;
                },
                'Catch(x, body)', function(b, node) {
                    var oldVar = scope.get(b.x.value);
                    // Temporarily override
                    scope.vars["_" + b.x.value] = new Variable(b.x);
                    scopeAnalyzer(scope, b.body, mustUseVars, inCallback, inLoop);
                    // Put back
                    scope.vars["_" + b.x.value] = oldVar;
                    return node;
                },
                /*
                 * Catches errors like these:
                 * if(err) callback(err);
                 * which in 99% of cases is wrong: a return should be added:
                 * if(err) return callback(err);
                 */
                'If(Var("err"), Call(fn, args), None())', function(b, node) {
                    // Check if the `err` variable is used somewhere in the function arguments.
                    if(b.args.collectTopDown('Var("err")').length > 0)
                        markers.push({
                            pos: b.fn.getPos(),
                            type: 'warning',
                            level: 'warning',
                            message: "Did you forget a 'return' here?"
                        });
                },
                'PropAccess(_, "lenght")', function(b, node) {
                    markers.push({
                        pos: node.getPos(),
                        type: 'warning',
                        level: 'warning',
                        message: "Did you mean 'length'?"
                    });
                },
                'Call(Var("parseInt"), [_])', function() {
                    markers.push({
                        pos: this[0].getPos(),
                        type: 'info',
                        level: 'info',
                        message: "Missing radix argument."
                    });
                },
                'Call(PropAccess(e1, "bind"), e2)', function(b) {
                    analyze(scope, b.e1, 0, inLoop);
                    analyze(scope, b.e2, inCallback, inLoop);
                    return this;
                },
                'Call(PropAccess(e1, cbm), args)', function(b, node) {
                    inLoop = (inLoop && CALLBACK_METHODS.indexOf(b.cbm.value) > -1) ? IN_LOOP_ALLOWED : inLoop;
                },
                'Call(e, args)', function(b, node) {
                    analyze(scope, b.e, inCallback, inLoop);
                    var newInCallback = inCallback || (isCallbackCall(node) ? IN_CALLBACK_DEF : 0);
                    analyze(scope, b.args, newInCallback, inLoop);
                    return node;
                },
                'Block(_)', function(b, node) {
                    node.setAnnotation("scope", scope);
                },
                'New(Var("require"), _)', function() {
                    markers.push({
                        pos: this[0].getPos(),
                        type: 'info',
                        level: 'info',
                        message: "Applying 'new' to require()."
                    });
                },
                'For(e1, e2, e3, body)', function(b) {
                    analyze(scope, b.e1, inCallback, inLoop);
                    analyze(scope, b.e2, inCallback, IN_LOOP);
                    analyze(scope, b.body, inCallback, IN_LOOP);
                    analyze(scope, b.e3, inCallback, IN_LOOP);
                    return node;
                },
                'ForIn(e1, e2, body)', function(b) {
                    analyze(scope, b.e2, inCallback, inLoop);
                    analyze(scope, b.e1, inCallback, inLoop);
                    analyze(scope, b.body, inCallback, IN_LOOP);
                    return node;
                }
            );
        }
        analyze(scope, node, inCallback, inLoop);
        if(!parentLocalVars) {
            for (var i = 0; i < mustUseVars.length; i++) {
                if (mustUseVars[i].uses.length === 0) {
                    var v = mustUseVars[i];
                    v.declarations.forEach(function(decl) {
                        if (decl.value && decl.value === decl.value.toUpperCase())
                            return;
                        markers.push({
                            pos: decl.getPos(),
                            type: 'info',
                            level: 'info',
                            message: 'Unused variable.'
                        });
                    });
                }
            }
        }
    }

    var jshintMarkers = [];
    var jshintGlobals = {};
    if (handler.isFeatureEnabled("jshint")) {
        jshintMarkers = jshint.analyzeSync(value, ast);
        jshintGlobals = jshint.getGlobals();
    }

    if (ast) {
        var rootScope = new Scope();
        scopeAnalyzer(rootScope, ast);
    }

    callback(markers.concat(jshintMarkers));
};

/**
 * Determine if any callbacks in the current call
 * should definitely get a warning for any uses of 'this'.
 */
var isCallbackCall = function(node) {
    var result;
    node.rewrite(
        'Call(PropAccess(_, p), args)', function(b) {
            if (b.args.length === 1 && CALLBACK_METHODS.indexOf(b.p.value) !== -1)
                result = true;
        },
        'Call(Var(f), _)', function(b) {
            if (CALLBACK_FUNCTIONS.indexOf(b.f.value) !== -1)
                result = true;
        }
    );
    return result || outline.tryExtractEventHandler(node, true);
};

/**
 * Determine if the current callback should get a warning marker
 * (IN_CALLBACK_BODY) for any uses of this, or just an info marker
 * (IN_CALLBACK_BODY_MAYBE). Or, none at all (0).
 */
var isCallback = function(node) {
    if (!node.parent || !node.parent.parent || !node.parent.parent.isMatch('Call(_, _)'))
        return false;
    var result = 0;
    node.rewrite(
        'Function(_, fargs, _)', function(b) {
            if (b.fargs.length === 0 || b.fargs[0].cons !== 'FArg')
                return result = IN_CALLBACK_BODY_MAYBE;
            var name = b.fargs[0][0].value;
            result = name === 'err' || name === 'error' || name === 'exc'
                ? IN_CALLBACK_BODY
                : IN_CALLBACK_BODY_MAYBE;
        }
    );
    return result;
};

handler.onCursorMovedNode = function(doc, fullAst, cursorPos, currentNode, callback) {
    if (!currentNode)
        return callback();

    var markers = [];
    var enableRefactorings = [];
    
    function highlightVariable(v) {
        if (!v)
            return;
        v.declarations.forEach(function(decl) {
            if(decl.getPos())
                markers.push({
                    pos: decl.getPos(),
                    type: 'occurrence_main'
                });
        });
        v.uses.forEach(function(node) {
            markers.push({
                pos: node.getPos(),
                type: 'occurrence_other'
            });
        });
    }
    currentNode.rewrite(
        'Var(x)', function(b, node) {
            var scope = node.getAnnotation("scope");
            if (!scope)
                return;
            var v = scope.get(b.x.value);
            highlightVariable(v);
            // Let's not enable renaming 'this' and only rename declared variables
            if(b.x.value !== "this" && v)
                enableRefactorings.push("renameVariable");
        },
        'VarDeclInit(x, _)', 'ConstDeclInit(x, _)', function(b) {
            highlightVariable(this.getAnnotation("scope").get(b.x.value));
            enableRefactorings.push("renameVariable");
        },
        'VarDecl(x)', 'ConstDecl(x)', function(b) {
            highlightVariable(this.getAnnotation("scope").get(b.x.value));
            enableRefactorings.push("renameVariable");
        },
        'FArg(x)', function(b) {
            highlightVariable(this.getAnnotation("scope").get(b.x.value));
            enableRefactorings.push("renameVariable");
        },
        'Function(x, _, _)', function(b, node) {
            // Only for named functions
            if(!b.x.value || !node.getAnnotation("scope"))
                return;
            highlightVariable(node.getAnnotation("scope").get(b.x.value));
            enableRefactorings.push("renameVariable");
        }
    );
    
    if (!this.isFeatureEnabled("instanceHighlight"))
        return callback({ enableRefactorings: enableRefactorings });

    callback({
        markers: markers,
        enableRefactorings: enableRefactorings
    });
};

handler.getVariablePositions = function(doc, fullAst, cursorPos, currentNode, callback) {
    if (!fullAst)
        return callback();

    var v;
    var mainNode;
    currentNode.rewrite(
        'VarDeclInit(x, _)', 'ConstDeclInit(x, _)', function(b, node) {
            v = node.getAnnotation("scope").get(b.x.value);
            mainNode = b.x;
        },
        'VarDecl(x)', 'ConstDecl(x)', function(b, node) {
            v = node.getAnnotation("scope").get(b.x.value);
            mainNode = b.x;
        },
        'FArg(x)', function(b, node) {
            v = node.getAnnotation("scope").get(b.x.value);
            mainNode = node;
        },
        'Function(x, _, _)', function(b, node) {
            if(!b.x.value)
                return;
            v = node.getAnnotation("scope").get(b.x.value);
            mainNode = b.x;
        },
        'Var(x)', function(b, node) {
            v = node.getAnnotation("scope").get(b.x.value);
            mainNode = node;
        }
    );
    
    // no mainnode can be found then invoke callback wo value because then we've got no clue
    // what were doing
    if (!mainNode) {
        return callback();
    }
    
    var pos = mainNode.getPos();
    var declarations = [];
    var uses = [];

    var length = pos.ec - pos.sc;
    
    // if the annotation cant be found we will skip this to avoid null ref errors
    v && v.declarations.forEach(function(node) {
         if(node !== currentNode[0]) {
            var pos = node.getPos();
            declarations.push({column: pos.sc, row: pos.sl});
        }
    });
    
    v && v.uses.forEach(function(node) {
        if(node !== currentNode) {
            var pos = node.getPos();
            uses.push({column: pos.sc, row: pos.sl});
        }
    });
    callback({
        length: length,
        pos: {
            row: pos.sl,
            column: pos.sc
        },
        others: declarations.concat(uses),
        declarations: declarations,
        uses: uses
    });
};

});
define('ext/jslanguage/outline', ['require', 'exports', 'module' , 'treehugger/traverse', 'ext/language/base_handler'], function(require, exports, module) {

require("treehugger/traverse"); // add traversal functions to trees

var baseLanguageHandler = require('ext/language/base_handler');

var outlineHandler = module.exports = Object.create(baseLanguageHandler);

var ID_REGEX = /[a-zA-Z_0-9\$\_]/;
var EVENT_REGEX = /[a-zA-Z_0-9\$\_\ \(\)\[\]\/@]/;

var NOT_EVENT_HANDLERS = {
    addMarker: true,
    traverseUp : true,
    traverse : true,
    topdown : true,
    traverseTopDown : true,
    rewrite : true,
    traverseAll : true
};

outlineHandler.handlesLanguage = function(language) {
    return language === 'javascript';
};
    
outlineHandler.outline = function(doc, ast, callback) {
    if (!ast)
        return callback();
    callback({ body : outlineSync(doc, ast) });
};
    
function fargsToString(fargs) {
    var str = '(';
    for (var i = 0; i < fargs.length; i++) {
        str += fargs[i][0].value + ', ';
    }
    if(fargs.length > 0)
        str = str.substring(0, str.length - 2);
    str += ')';
    return str;
}

function expressionToName(node) {
    var name;
    node.rewrite(
        'Var(x)', function(b) { name = b.x.value; },
        'PropAccess(e, x)', function(b) { name = b.x.value; }
    );
    return name;
}

function getIdentifierPosBefore(doc, pos) {
    if (!pos)
        return null;
    for (var sl = pos.sl; sl >= 0; sl--) {
        var line = doc.getLine(sl);
        var foundId = false;
        for (var sc = pos.sc; sc > 1; sc--) {
            if (ID_REGEX.test(line[sc - 1]))
                foundId = true;
            else if (foundId)
                break;
        }
        if (foundId)
            break;
        pos.sc = sl > 0 && doc.getLine(sl - 1).length - 1;
    }
    for (var ec = sc; ec < line.length; ec++) {
        if (!ID_REGEX.test(line[ec]))
            break;
    }
    var result = { sl: sl, el: sl, sc: sc, ec: ec};
    if (line.substring(sc, ec) === 'function')
        return getIdentifierPosBefore(doc, result);
    return result;
}

// HACK: fix incorrect pos info for string literals
function fixStringPos(doc, node) { 
    var pos = node.getPos();
    var line = doc.getLine(pos.el);
    if (line[pos.ec] !== '"')
        pos.ec += 2;
    pos.sc++;
    pos.ec--;
    return pos;
}

// This is where the fun stuff happens
var outlineSync = outlineHandler.outlineSync = function(doc, node, includeProps) {
    var results = [];
    node.traverseTopDown(
        // e.x = function(...) { ... }  -> name is x
        'Assign(e, Function(name, fargs, body))', function(b) {
            var name = expressionToName(b.e);
            if(!name) return false;
            results.push({
                icon: 'method',
                name: name + fargsToString(b.fargs),
                pos: this[1].getPos(),
                displayPos: b.e.cons === 'PropAccess' && getIdentifierPosBefore(doc, this[1].getPos()) || b.e.getPos(),
                items: outlineSync(doc, b.body, includeProps)
            });
            return this;
        },
        'VarDeclInit(x, Function(name, fargs, body))', 'ConstDeclInit(x, Function(name, fargs, body))',
        function(b) {
            results.push({
                icon: 'method',
                name: b.x.value + fargsToString(b.fargs),
                pos: this[1].getPos(),
                displayPos: b.x.getPos(),
                items: outlineSync(doc, b.body, includeProps)
            });
            return this;
        },
        // x : function(...) { ... } -> name is x
        'PropertyInit(x, Function(name, fargs, body))', function(b) {
            results.push({
                icon: 'method',
                name: b.x.value + fargsToString(b.fargs),
                pos: this[1].getPos(),
                displayPos: getIdentifierPosBefore(doc, this.getPos()),
                items: outlineSync(doc, b.body, includeProps)
            });
            return this;
        },
        'PropertyInit(x, e)', function(b) {
            if (!includeProps)
                return;
            
            results.push({
                icon: 'property',
                name: b.x.value,
                pos: this.getPos(),
                displayPos: getIdentifierPosBefore(doc, this.getPos())
            });
            return this;
        },
        'VarDeclInit(x, e)', 'ConstDeclInit(x, e)', function(b) {
            var items = outlineSync(doc, b.e, includeProps);
            if (items.length === 0)
                return this;
            results.push({
                icon: 'property',
                name: b.x.value,
                pos: this[1].getPos(),
                displayPos: b.x.getPos(),
                items: items
            });
            return this;
        },
        'PropertyInit(x, e)', function(b) {
            var items = outlineSync(doc, b.e, includeProps);
            if (items.length === 0)
                return this;
            results.push({
                icon: 'property',
                name: b.x.value,
                pos: this[1].getPos(),
                displayPos: getIdentifierPosBefore(doc, this.getPos()),
                items: items
            });
            return this;
        },
        'Assign(x, e)', function(b) {
            var name = expressionToName(b.x);
            if (!name)
                return false;
            var items = outlineSync(doc, b.e, includeProps);
            if (items.length === 0)
                return this;
            results.push({
                icon: 'property',
                name: name,
                pos: this[1].getPos(),
                displayPos: getIdentifierPosBefore(doc, this.getPos()),
                items: items
            });
            return this;
        },
        // e.on("listen", function(...) { ... }) -> name is listen
        'Call(e, args)', function(b) {
            var eventHandler = tryExtractEventHandler(this);
            if (!eventHandler)
                return false;
            results.push({
                icon: 'event',
                name: eventHandler.s[0].value,
                pos: this.getPos(),
                displayPos: fixStringPos(doc, eventHandler.s),
                items: eventHandler.body && outlineSync(doc, eventHandler.body, includeProps)
            });
            return this;
        },
        /* UNDONE: callbacks in outline
        // intelligently name callback functions for method calls
        // setTimeout(function() { ... }, 200) -> name is setTimeout [callback]
        'Call(e, args)', function(b) {
            var name = expressionToName(b.e);
            if(!name) return false;
            var foundFunction = false;
            b.args.each(
                'Function(name, fargs, body)', function(b) {
                    if (b.name.value)
                        return;
                    results.push({
                        icon: 'method',
                        name: name + '[callback]' + fargsToString(b.fargs),
                        pos: this.getPos(),
                        items: outlineSync(doc, b.body, includeProps)
                    });
                    foundFunction = true;
                }
            );
            return foundFunction ? this : false;
        },
        */
        'Function(name, fargs, body)', function(b) {
            if (!b.name.value)
                return false;
            results.push({
                icon: 'method',
                name: b.name.value + fargsToString(b.fargs),
                pos: this.getPos(),
                displayPos: b.name.getPos(),
                items: outlineSync(doc, b.body, includeProps)
            });
            return this;
        }
    );
    return results;
};

var tryExtractEventHandler = outlineHandler.tryExtractEventHandler = function(node, ignoreBind) {
    var result;
    node.rewrite('Call(e, args)', function(b) {
        var name = expressionToName(b.e);
        if (!name || b.args.length < 2 || NOT_EVENT_HANDLERS[name])
            return false;
        // Require handler at first or second position
        var s;
        var fun;
        if (b.args[0] && b.args[0].cons === 'String' && isCallbackArg(b.args[1], ignoreBind)) {
            s = b.args[0];
            fun = b.args[1];
        }
        else if (b.args[1] && b.args[1].cons === 'String' && isCallbackArg(b.args[2], ignoreBind)) {
            s = b.args[1];
            fun = b.args[2];
        }
        else {
            return false;
        }
        if (!s[0].value.match(EVENT_REGEX))
            return false;
        // Ignore if more handler-like arguments exist
        if (b.args.length >= 4 && b.args[2].cons === 'String' && b.args[3].cons === 'Function')
            return false;
        result = {
            s: s,
            fargs: fun[1],
            body: fun[2]
        };
    });
    return result;
};

var isCallbackArg = function(node, ignoreBind) {
    if (!node)
        return false;
    var result;
    node.rewrite(
        'Function(_, _, _)', function() { result = true; },
        'Call(PropAccess(_, "bind"), [_])', function() { result = !ignoreBind; }
    );
    return result;
};

});
/**
 * Cloud9 Language Foundation
 *
 * @copyright 2011, Ajax.org B.V.
 * @license GPLv3 <http://www.gnu.org/licenses/gpl.txt>
 */
define('ext/jslanguage/jshint', ['require', 'exports', 'module' , 'ext/language/base_handler', 'ace/mode/javascript/jshint'], function(require, exports, module) {

var baseLanguageHandler = require('ext/language/base_handler');
var lint = require("ace/mode/javascript/jshint").JSHINT;
var handler = module.exports = Object.create(baseLanguageHandler);

var disabledJSHintWarnings = [/Missing radix parameter./,
    /Bad for in variable '(.+)'./,
    /use strict/,
    /Input is an empty string./];

handler.handlesLanguage = function(language) {
    return language === 'javascript';
};

handler.analyze = function(value, ast, callback) {
    callback(handler.analyzeSync(value, ast));
};

handler.analyzeSync = function(value, ast) {
    var markers = [];
    if (!this.isFeatureEnabled("jshint"))
        return markers;

    value = value.replace(/^(#!.*\n)/, "//$1");
    // jshint throws error when called on empty string
    if (!value)
        return markers;

    lint(value, {
        maxerr: 100,
        undef: false,
        onevar: false,
        passfail: false,
        devel: true,
        browser: true,
        node: true,
        esnext: true,
        expr: true,
        laxbreak: true,
        laxcomma: true,
        loopfunc: true,
        lastsemic: true,
        multistr: true,
        onecase: true,
        proto: true,
        moz: true
    });
    
    lint.errors.forEach(function(warning) {
        if (!warning)
            return;
        var type = "warning";
        var reason = warning.reason;
        if (reason.indexOf("Expected") !== -1 && reason.indexOf("instead saw") !== -1) // Parse error!
            type = "error";
        if (reason.indexOf("Unclosed string") === 0) // Parse error!
            type = "error";
        if (reason.indexOf("begun comment") !== -1) // Stupidly formulated parse error!
            type = "error";
        if (reason.indexOf("Missing semicolon") !== -1 || reason.indexOf("Unnecessary semicolon") !== -1)
            type = "info";
        if (reason.indexOf("better written in dot") !== -1)
            type = "info";
        if (reason.indexOf("used out of scope") !== -1)
            type = "info";
        if (reason.indexOf("conditional expression and instead saw an assignment") !== -1) {
            type = "warning";
            warning.reason = "Assignment in conditional expression";
        }
        for (var i = 0; i < disabledJSHintWarnings.length; i++)
            if(disabledJSHintWarnings[i].test(warning.reason))
                return;
        markers.push({
            pos: { // TODO quickfix framework needs el/ec in order to be able to select the issue in the editor
                sl: warning.line-1,
                sc: warning.character-1
            },
            type: type,
            level: type,
            message: warning.reason
        });
    });

    return markers;
};


/**
 * Gets an object like { foo: true } for JSHint global comments
 * like / * global foo: true * /
 */
handler.getGlobals = function() {
    if (!lint.errors || !this.isFeatureEnabled("jshint"))
        return {};
    var array = lint.data().globals;
    if (!array) // no data (yet?)
        return {};
    var obj = {};
    for (var i = 0; i < array.length; i++) {
        obj[array[i]] = true;
    }
    return obj;
};
    
});
define('ace/mode/javascript/jshint', ['require', 'exports', 'module' ], function(require, exports, module) {
//2.1.4
var require;
require=(function(e,t,n){function i(n,s){if(!t[n]){if(!e[n]){var o=typeof require=="function"&&require;if(!s&&o)return o(n,!0);if(r)return r(n,!0);throw new Error("Cannot find module '"+n+"'")}var u=t[n]={exports:{}};e[n][0].call(u.exports,function(t){var r=e[n][1][t];return i(r?r:t)},u,u.exports)}return t[n].exports}var r=typeof require=="function"&&require;for(var s=0;s<n.length;s++)i(n[s]);return i})({
1:[function(req,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},
{}],
2:[function(req,module,exports){
(function(process){if (!process.EventEmitter) process.EventEmitter = function () {};

var EventEmitter = exports.EventEmitter = process.EventEmitter;
var isArray = typeof Array.isArray === 'function'
    ? Array.isArray
    : function (xs) {
        return Object.prototype.toString.call(xs) === '[object Array]'
    }
;
function indexOf (xs, x) {
    if (xs.indexOf) return xs.indexOf(x);
    for (var i = 0; i < xs.length; i++) {
        if (x === xs[i]) return i;
    }
    return -1;
}

// By default EventEmitters will print a warning if more than
// 10 listeners are added to it. This is a useful default which
// helps finding memory leaks.
//
// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
var defaultMaxListeners = 200;
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!this._events) this._events = {};
  this._events.maxListeners = n;
};


EventEmitter.prototype.emit = function(type) {
  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events || !this._events.error ||
        (isArray(this._events.error) && !this._events.error.length))
    {
      if (arguments[1] instanceof Error) {
        throw arguments[1]; // Unhandled 'error' event
      } else {
        throw new Error("Uncaught, unspecified 'error' event.");
      }
      return false;
    }
  }

  if (!this._events) return false;
  var handler = this._events[type];
  if (!handler) return false;

  if (typeof handler == 'function') {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        var args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
    return true;

  } else if (isArray(handler)) {
    var args = Array.prototype.slice.call(arguments, 1);

    var listeners = handler.slice();
    for (var i = 0, l = listeners.length; i < l; i++) {
      listeners[i].apply(this, args);
    }
    return true;

  } else {
    return false;
  }
};

// EventEmitter is defined in src/node_events.cc
// EventEmitter.prototype.emit() is also defined there.
EventEmitter.prototype.addListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('addListener only takes instances of Function');
  }

  if (!this._events) this._events = {};

  // To avoid recursion in the case that type == "newListeners"! Before
  // adding it to the listeners, first emit "newListeners".
  this.emit('newListener', type, listener);

  if (!this._events[type]) {
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  } else if (isArray(this._events[type])) {

    // Check for listener leak
    if (!this._events[type].warned) {
      var m;
      if (this._events.maxListeners !== undefined) {
        m = this._events.maxListeners;
      } else {
        m = defaultMaxListeners;
      }

      if (m && m > 0 && this._events[type].length > m) {
        this._events[type].warned = true;
        console.error('(node) warning: possible EventEmitter memory ' +
                      'leak detected. %d listeners added. ' +
                      'Use emitter.setMaxListeners() to increase limit.',
                      this._events[type].length);
        console.trace();
      }
    }

    // If we've already got an array, just append.
    this._events[type].push(listener);
  } else {
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  var self = this;
  self.on(type, function g() {
    self.removeListener(type, g);
    listener.apply(this, arguments);
  });

  return this;
};

EventEmitter.prototype.removeListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('removeListener only takes instances of Function');
  }

  // does not use listeners(), so no side effect of creating _events[type]
  if (!this._events || !this._events[type]) return this;

  var list = this._events[type];

  if (isArray(list)) {
    var i = indexOf(list, listener);
    if (i < 0) return this;
    list.splice(i, 1);
    if (list.length == 0)
      delete this._events[type];
  } else if (this._events[type] === listener) {
    delete this._events[type];
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  if (arguments.length === 0) {
    this._events = {};
    return this;
  }

  // does not use listeners(), so no side effect of creating _events[type]
  if (type && this._events && this._events[type]) this._events[type] = null;
  return this;
};

EventEmitter.prototype.listeners = function(type) {
  if (!this._events) this._events = {};
  if (!this._events[type]) this._events[type] = [];
  if (!isArray(this._events[type])) {
    this._events[type] = [this._events[type]];
  }
  return this._events[type];
};

})(req("__browserify_process"))
},
{"__browserify_process":1}],
3:[function(req,module,exports){
(function(){// jshint -W001

"use strict";

// Identifiers provided by the ECMAScript standard.

exports.reservedVars = {
	arguments : false,
	NaN       : false
};

exports.ecmaIdentifiers = {
	Array              : false,
	Boolean            : false,
	Date               : false,
	decodeURI          : false,
	decodeURIComponent : false,
	encodeURI          : false,
	encodeURIComponent : false,
	Error              : false,
	"eval"             : false,
	EvalError          : false,
	Function           : false,
	hasOwnProperty     : false,
	isFinite           : false,
	isNaN              : false,
	JSON               : false,
	Math               : false,
	Map                : false,
	Number             : false,
	Object             : false,
	parseInt           : false,
	parseFloat         : false,
	RangeError         : false,
	ReferenceError     : false,
	RegExp             : false,
	Set                : false,
	String             : false,
	SyntaxError        : false,
	TypeError          : false,
	URIError           : false,
	WeakMap            : false
};

// Global variables commonly provided by a web browser environment.

exports.browser = {
	ArrayBuffer          : false,
	ArrayBufferView      : false,
	Audio                : false,
	Blob                 : false,
	addEventListener     : false,
	applicationCache     : false,
	atob                 : false,
	blur                 : false,
	btoa                 : false,
	clearInterval        : false,
	clearTimeout         : false,
	close                : false,
	closed               : false,
	DataView             : false,
	DOMParser            : false,
	defaultStatus        : false,
	document             : false,
	Element              : false,
	ElementTimeControl   : false,
	event                : false,
	FileReader           : false,
	Float32Array         : false,
	Float64Array         : false,
	FormData             : false,
	focus                : false,
	frames               : false,
	getComputedStyle     : false,
	HTMLElement          : false,
	HTMLAnchorElement    : false,
	HTMLBaseElement      : false,
	HTMLBlockquoteElement: false,
	HTMLBodyElement      : false,
	HTMLBRElement        : false,
	HTMLButtonElement    : false,
	HTMLCanvasElement    : false,
	HTMLDirectoryElement : false,
	HTMLDivElement       : false,
	HTMLDListElement     : false,
	HTMLFieldSetElement  : false,
	HTMLFontElement      : false,
	HTMLFormElement      : false,
	HTMLFrameElement     : false,
	HTMLFrameSetElement  : false,
	HTMLHeadElement      : false,
	HTMLHeadingElement   : false,
	HTMLHRElement        : false,
	HTMLHtmlElement      : false,
	HTMLIFrameElement    : false,
	HTMLImageElement     : false,
	HTMLInputElement     : false,
	HTMLIsIndexElement   : false,
	HTMLLabelElement     : false,
	HTMLLayerElement     : false,
	HTMLLegendElement    : false,
	HTMLLIElement        : false,
	HTMLLinkElement      : false,
	HTMLMapElement       : false,
	HTMLMenuElement      : false,
	HTMLMetaElement      : false,
	HTMLModElement       : false,
	HTMLObjectElement    : false,
	HTMLOListElement     : false,
	HTMLOptGroupElement  : false,
	HTMLOptionElement    : false,
	HTMLParagraphElement : false,
	HTMLParamElement     : false,
	HTMLPreElement       : false,
	HTMLQuoteElement     : false,
	HTMLScriptElement    : false,
	HTMLSelectElement    : false,
	HTMLStyleElement     : false,
	HTMLTableCaptionElement: false,
	HTMLTableCellElement : false,
	HTMLTableColElement  : false,
	HTMLTableElement     : false,
	HTMLTableRowElement  : false,
	HTMLTableSectionElement: false,
	HTMLTextAreaElement  : false,
	HTMLTitleElement     : false,
	HTMLUListElement     : false,
	HTMLVideoElement     : false,
	history              : false,
	Int16Array           : false,
	Int32Array           : false,
	Int8Array            : false,
	Image                : false,
	length               : false,
	localStorage         : false,
	location             : false,
	MessageChannel       : false,
	MessageEvent         : false,
	MessagePort          : false,
	moveBy               : false,
	moveTo               : false,
	MutationObserver     : false,
	name                 : false,
	Node                 : false,
	NodeFilter           : false,
	navigator            : false,
	onbeforeunload       : true,
	onblur               : true,
	onerror              : true,
	onfocus              : true,
	onload               : true,
	onresize             : true,
	onunload             : true,
	open                 : false,
	openDatabase         : false,
	opener               : false,
	Option               : false,
	parent               : false,
	print                : false,
	removeEventListener  : false,
	resizeBy             : false,
	resizeTo             : false,
	screen               : false,
	scroll               : false,
	scrollBy             : false,
	scrollTo             : false,
	sessionStorage       : false,
	setInterval          : false,
	setTimeout           : false,
	SharedWorker         : false,
	status               : false,
	SVGAElement          : false,
	SVGAltGlyphDefElement: false,
	SVGAltGlyphElement   : false,
	SVGAltGlyphItemElement: false,
	SVGAngle             : false,
	SVGAnimateColorElement: false,
	SVGAnimateElement    : false,
	SVGAnimateMotionElement: false,
	SVGAnimateTransformElement: false,
	SVGAnimatedAngle     : false,
	SVGAnimatedBoolean   : false,
	SVGAnimatedEnumeration: false,
	SVGAnimatedInteger   : false,
	SVGAnimatedLength    : false,
	SVGAnimatedLengthList: false,
	SVGAnimatedNumber    : false,
	SVGAnimatedNumberList: false,
	SVGAnimatedPathData  : false,
	SVGAnimatedPoints    : false,
	SVGAnimatedPreserveAspectRatio: false,
	SVGAnimatedRect      : false,
	SVGAnimatedString    : false,
	SVGAnimatedTransformList: false,
	SVGAnimationElement  : false,
	SVGCSSRule           : false,
	SVGCircleElement     : false,
	SVGClipPathElement   : false,
	SVGColor             : false,
	SVGColorProfileElement: false,
	SVGColorProfileRule  : false,
	SVGComponentTransferFunctionElement: false,
	SVGCursorElement     : false,
	SVGDefsElement       : false,
	SVGDescElement       : false,
	SVGDocument          : false,
	SVGElement           : false,
	SVGElementInstance   : false,
	SVGElementInstanceList: false,
	SVGEllipseElement    : false,
	SVGExternalResourcesRequired: false,
	SVGFEBlendElement    : false,
	SVGFEColorMatrixElement: false,
	SVGFEComponentTransferElement: false,
	SVGFECompositeElement: false,
	SVGFEConvolveMatrixElement: false,
	SVGFEDiffuseLightingElement: false,
	SVGFEDisplacementMapElement: false,
	SVGFEDistantLightElement: false,
	SVGFEFloodElement    : false,
	SVGFEFuncAElement    : false,
	SVGFEFuncBElement    : false,
	SVGFEFuncGElement    : false,
	SVGFEFuncRElement    : false,
	SVGFEGaussianBlurElement: false,
	SVGFEImageElement    : false,
	SVGFEMergeElement    : false,
	SVGFEMergeNodeElement: false,
	SVGFEMorphologyElement: false,
	SVGFEOffsetElement   : false,
	SVGFEPointLightElement: false,
	SVGFESpecularLightingElement: false,
	SVGFESpotLightElement: false,
	SVGFETileElement     : false,
	SVGFETurbulenceElement: false,
	SVGFilterElement     : false,
	SVGFilterPrimitiveStandardAttributes: false,
	SVGFitToViewBox      : false,
	SVGFontElement       : false,
	SVGFontFaceElement   : false,
	SVGFontFaceFormatElement: false,
	SVGFontFaceNameElement: false,
	SVGFontFaceSrcElement: false,
	SVGFontFaceUriElement: false,
	SVGForeignObjectElement: false,
	SVGGElement          : false,
	SVGGlyphElement      : false,
	SVGGlyphRefElement   : false,
	SVGGradientElement   : false,
	SVGHKernElement      : false,
	SVGICCColor          : false,
	SVGImageElement      : false,
	SVGLangSpace         : false,
	SVGLength            : false,
	SVGLengthList        : false,
	SVGLineElement       : false,
	SVGLinearGradientElement: false,
	SVGLocatable         : false,
	SVGMPathElement      : false,
	SVGMarkerElement     : false,
	SVGMaskElement       : false,
	SVGMatrix            : false,
	SVGMetadataElement   : false,
	SVGMissingGlyphElement: false,
	SVGNumber            : false,
	SVGNumberList        : false,
	SVGPaint             : false,
	SVGPathElement       : false,
	SVGPathSeg           : false,
	SVGPathSegArcAbs     : false,
	SVGPathSegArcRel     : false,
	SVGPathSegClosePath  : false,
	SVGPathSegCurvetoCubicAbs: false,
	SVGPathSegCurvetoCubicRel: false,
	SVGPathSegCurvetoCubicSmoothAbs: false,
	SVGPathSegCurvetoCubicSmoothRel: false,
	SVGPathSegCurvetoQuadraticAbs: false,
	SVGPathSegCurvetoQuadraticRel: false,
	SVGPathSegCurvetoQuadraticSmoothAbs: false,
	SVGPathSegCurvetoQuadraticSmoothRel: false,
	SVGPathSegLinetoAbs  : false,
	SVGPathSegLinetoHorizontalAbs: false,
	SVGPathSegLinetoHorizontalRel: false,
	SVGPathSegLinetoRel  : false,
	SVGPathSegLinetoVerticalAbs: false,
	SVGPathSegLinetoVerticalRel: false,
	SVGPathSegList       : false,
	SVGPathSegMovetoAbs  : false,
	SVGPathSegMovetoRel  : false,
	SVGPatternElement    : false,
	SVGPoint             : false,
	SVGPointList         : false,
	SVGPolygonElement    : false,
	SVGPolylineElement   : false,
	SVGPreserveAspectRatio: false,
	SVGRadialGradientElement: false,
	SVGRect              : false,
	SVGRectElement       : false,
	SVGRenderingIntent   : false,
	SVGSVGElement        : false,
	SVGScriptElement     : false,
	SVGSetElement        : false,
	SVGStopElement       : false,
	SVGStringList        : false,
	SVGStylable          : false,
	SVGStyleElement      : false,
	SVGSwitchElement     : false,
	SVGSymbolElement     : false,
	SVGTRefElement       : false,
	SVGTSpanElement      : false,
	SVGTests             : false,
	SVGTextContentElement: false,
	SVGTextElement       : false,
	SVGTextPathElement   : false,
	SVGTextPositioningElement: false,
	SVGTitleElement      : false,
	SVGTransform         : false,
	SVGTransformList     : false,
	SVGTransformable     : false,
	SVGURIReference      : false,
	SVGUnitTypes         : false,
	SVGUseElement        : false,
	SVGVKernElement      : false,
	SVGViewElement       : false,
	SVGViewSpec          : false,
	SVGZoomAndPan        : false,
	TimeEvent            : false,
	top                  : false,
	Uint16Array          : false,
	Uint32Array          : false,
	Uint8Array           : false,
	Uint8ClampedArray    : false,
	WebSocket            : false,
	window               : false,
	Worker               : false,
	XMLHttpRequest       : false,
	XMLSerializer        : false,
	XPathEvaluator       : false,
	XPathException       : false,
	XPathExpression      : false,
	XPathNamespace       : false,
	XPathNSResolver      : false,
	XPathResult          : false
};

exports.devel = {
	alert  : false,
	confirm: false,
	console: false,
	Debug  : false,
	opera  : false,
	prompt : false
};

exports.worker = {
	importScripts: true,
	postMessage  : true,
	self         : true
};

// Widely adopted global names that are not part of ECMAScript standard
exports.nonstandard = {
	escape  : false,
	unescape: false
};

// Globals provided by popular JavaScript environments.

exports.couch = {
	"require" : false,
	respond   : false,
	getRow    : false,
	emit      : false,
	send      : false,
	start     : false,
	sum       : false,
	log       : false,
	exports   : false,
	module    : false,
	provides  : false
};

exports.node = {
	__filename    : false,
	__dirname     : false,
	Buffer        : false,
	DataView      : false,
	console       : false,
	exports       : true,  // In Node it is ok to exports = module.exports = foo();
	GLOBAL        : false,
	global        : false,
	module        : false,
	process       : false,
	require       : false,
	setTimeout    : false,
	clearTimeout  : false,
	setInterval   : false,
	clearInterval : false,
	setImmediate  : false, // v0.9.1+
	clearImmediate: false  // v0.9.1+
};

exports.phantom = {
	phantom      : true,
	require      : true,
	WebPage      : true
};

exports.rhino = {
	defineClass  : false,
	deserialize  : false,
	gc           : false,
	help         : false,
	importPackage: false,
	"java"       : false,
	load         : false,
	loadClass    : false,
	print        : false,
	quit         : false,
	readFile     : false,
	readUrl      : false,
	runCommand   : false,
	seal         : false,
	serialize    : false,
	spawn        : false,
	sync         : false,
	toint32      : false,
	version      : false
};

exports.shelljs = {
	target       : false,
	echo         : false,
	exit         : false,
	cd           : false,
	pwd          : false,
	ls           : false,
	find         : false,
	cp           : false,
	rm           : false,
	mv           : false,
	mkdir        : false,
	test         : false,
	cat          : false,
	sed          : false,
	grep         : false,
	which        : false,
	dirs         : false,
	pushd        : false,
	popd         : false,
	env          : false,
	exec         : false,
	chmod        : false,
	config       : false,
	error        : false,
	tempdir      : false
};

exports.wsh = {
	ActiveXObject            : true,
	Enumerator               : true,
	GetObject                : true,
	ScriptEngine             : true,
	ScriptEngineBuildVersion : true,
	ScriptEngineMajorVersion : true,
	ScriptEngineMinorVersion : true,
	VBArray                  : true,
	WSH                      : true,
	WScript                  : true,
	XDomainRequest           : true
};

// Globals provided by popular JavaScript libraries.

exports.dojo = {
	dojo     : false,
	dijit    : false,
	dojox    : false,
	define	 : false,
	"require": false
};

exports.jquery = {
	"$"    : false,
	jQuery : false
};

exports.mootools = {
	"$"           : false,
	"$$"          : false,
	Asset         : false,
	Browser       : false,
	Chain         : false,
	Class         : false,
	Color         : false,
	Cookie        : false,
	Core          : false,
	Document      : false,
	DomReady      : false,
	DOMEvent      : false,
	DOMReady      : false,
	Drag          : false,
	Element       : false,
	Elements      : false,
	Event         : false,
	Events        : false,
	Fx            : false,
	Group         : false,
	Hash          : false,
	HtmlTable     : false,
	Iframe        : false,
	IframeShim    : false,
	InputValidator: false,
	instanceOf    : false,
	Keyboard      : false,
	Locale        : false,
	Mask          : false,
	MooTools      : false,
	Native        : false,
	Options       : false,
	OverText      : false,
	Request       : false,
	Scroller      : false,
	Slick         : false,
	Slider        : false,
	Sortables     : false,
	Spinner       : false,
	Swiff         : false,
	Tips          : false,
	Type          : false,
	typeOf        : false,
	URI           : false,
	Window        : false
};

exports.prototypejs = {
	"$"               : false,
	"$$"              : false,
	"$A"              : false,
	"$F"              : false,
	"$H"              : false,
	"$R"              : false,
	"$break"          : false,
	"$continue"       : false,
	"$w"              : false,
	Abstract          : false,
	Ajax              : false,
	Class             : false,
	Enumerable        : false,
	Element           : false,
	Event             : false,
	Field             : false,
	Form              : false,
	Hash              : false,
	Insertion         : false,
	ObjectRange       : false,
	PeriodicalExecuter: false,
	Position          : false,
	Prototype         : false,
	Selector          : false,
	Template          : false,
	Toggle            : false,
	Try               : false,
	Autocompleter     : false,
	Builder           : false,
	Control           : false,
	Draggable         : false,
	Draggables        : false,
	Droppables        : false,
	Effect            : false,
	Sortable          : false,
	SortableObserver  : false,
	Sound             : false,
	Scriptaculous     : false
};

exports.yui = {
	YUI       : false,
	Y         : false,
	YUI_config: false
};


})()
},
{}],
4:[function(req,module,exports){
/*
 * Regular expressions. Some of these are stupidly long.
 */

/*jshint maxlen:1000 */

"use string";

// Unsafe comment or string (ax)
exports.unsafeString =
	/@cc|<\/?|script|\]\s*\]|<\s*!|&lt/i;

// Unsafe characters that are silently deleted by one or more browsers (cx)
exports.unsafeChars =
	/[\u0000-\u001f\u007f-\u009f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/;

// Characters in strings that need escaping (nx and nxg)
exports.needEsc =
	/[\u0000-\u001f&<"\/\\\u007f-\u009f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/;

exports.needEscGlobal =
	/[\u0000-\u001f&<"\/\\\u007f-\u009f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;

// Star slash (lx)
exports.starSlash = /\*\//;

// Identifier (ix)
exports.identifier = /^([a-zA-Z_$][a-zA-Z0-9_$]*)$/;

// JavaScript URL (jx)
exports.javascriptURL = /^(?:javascript|jscript|ecmascript|vbscript|mocha|livescript)\s*:/i;

// Catches /* falls through */ comments (ft)
exports.fallsThrough = /^\s*\/\*\s*falls?\sthrough\s*\*\/\s*$/;

},
{}],
5:[function(req,module,exports){
"use strict";

var state = {
	syntax: {},

	reset: function () {
		this.tokens = {
			prev: null,
			next: null,
			curr: null
		};

		this.option = {};
		this.ignored = {};
		this.directive = {};
		this.jsonMode = false;
		this.jsonWarnings = [];
		this.lines = [];
		this.tab = "";
		this.cache = {}; // Node.JS doesn't have Map. Sniff.
	}
};

exports.state = state;

},
{}],
6:[function(req,module,exports){
(function(){"use strict";

exports.register = function (linter) {
	// Check for properties named __proto__. This special property was
	// deprecated and then re-introduced for ES6.

	linter.on("Identifier", function style_scanProto(data) {
		if (linter.getOption("proto")) {
			return;
		}

		if (data.name === "__proto__") {
			linter.warn("W103", {
				line: data.line,
				char: data.char,
				data: [ data.name ]
			});
		}
	});

	// Check for properties named __iterator__. This is a special property
	// available only in browsers with JavaScript 1.7 implementation.

	linter.on("Identifier", function style_scanIterator(data) {
		if (linter.getOption("iterator")) {
			return;
		}

		if (data.name === "__iterator__") {
			linter.warn("W104", {
				line: data.line,
				char: data.char,
				data: [ data.name ]
			});
		}
	});

	// Check for dangling underscores.

	linter.on("Identifier", function style_scanDangling(data) {
		if (!linter.getOption("nomen")) {
			return;
		}

		// Underscore.js
		if (data.name === "_") {
			return;
		}

		// In Node, __dirname and __filename should be ignored.
		if (linter.getOption("node")) {
			if (/^(__dirname|__filename)$/.test(data.name) && !data.isProperty) {
				return;
			}
		}

		if (/^(_+.*|.*_+)$/.test(data.name)) {
			linter.warn("W105", {
				line: data.line,
				char: data.from,
				data: [ "dangling '_'", data.name ]
			});
		}
	});

	// Check that all identifiers are using camelCase notation.
	// Exceptions: names like MY_VAR and _myVar.

	linter.on("Identifier", function style_scanCamelCase(data) {
		if (!linter.getOption("camelcase")) {
			return;
		}

		if (data.name.replace(/^_+/, "").indexOf("_") > -1 && !data.name.match(/^[A-Z0-9_]*$/)) {
			linter.warn("W106", {
				line: data.line,
				char: data.from,
				data: [ data.name ]
			});
		}
	});

	// Enforce consistency in style of quoting.

	linter.on("String", function style_scanQuotes(data) {
		var quotmark = linter.getOption("quotmark");
		var code;

		if (!quotmark) {
			return;
		}

		// If quotmark is set to 'single' warn about all double-quotes.

		if (quotmark === "single" && data.quote !== "'") {
			code = "W109";
		}

		// If quotmark is set to 'double' warn about all single-quotes.

		if (quotmark === "double" && data.quote !== "\"") {
			code = "W108";
		}

		// If quotmark is set to true, remember the first quotation style
		// and then warn about all others.

		if (quotmark === true) {
			if (!linter.getCache("quotmark")) {
				linter.setCache("quotmark", data.quote);
			}

			if (linter.getCache("quotmark") !== data.quote) {
				code = "W110";
			}
		}

		if (code) {
			linter.warn(code, {
				line: data.line,
				char: data.char,
			});
		}
	});

	linter.on("Number", function style_scanNumbers(data) {
		if (data.value.charAt(0) === ".") {
			// Warn about a leading decimal point.
			linter.warn("W008", {
				line: data.line,
				char: data.char,
				data: [ data.value ]
			});
		}

		if (data.value.substr(data.value.length - 1) === ".") {
			// Warn about a trailing decimal point.
			linter.warn("W047", {
				line: data.line,
				char: data.char,
				data: [ data.value ]
			});
		}

		if (/^00+/.test(data.value)) {
			// Multiple leading zeroes.
			linter.warn("W046", {
				line: data.line,
				char: data.char,
				data: [ data.value ]
			});
		}
	});

	// Warn about script URLs.

	linter.on("String", function style_scanJavaScriptURLs(data) {
		var re = /^(?:javascript|jscript|ecmascript|vbscript|mocha|livescript)\s*:/i;

		if (linter.getOption("scripturl")) {
			return;
		}

		if (re.test(data.value)) {
			linter.warn("W107", {
				line: data.line,
				char: data.char
			});
		}
	});
};
})()
},
{}],
7:[function(req,module,exports){
[
    "log", "info", "warn", "error", "time",
    "timeEnd", "trace", "dir", "assert"
].forEach(function(x) {
    exports[x] = nop;
});

function nop() {}

},
{}],
"jshint":[function(req,module,exports){
module.exports=req('E/GbHF');
},
{}],"E/GbHF":[function(req,module,exports){
(function(){/*!
 * JSHint, by JSHint Community.
 *
 * This file (and this file only) is licensed under the same slightly modified
 * MIT license that JSLint is. It stops evil-doers everywhere:
 *
 *	 Copyright (c) 2002 Douglas Crockford  (www.JSLint.com)
 *
 *	 Permission is hereby granted, free of charge, to any person obtaining
 *	 a copy of this software and associated documentation files (the "Software"),
 *	 to deal in the Software without restriction, including without limitation
 *	 the rights to use, copy, modify, merge, publish, distribute, sublicense,
 *	 and/or sell copies of the Software, and to permit persons to whom
 *	 the Software is furnished to do so, subject to the following conditions:
 *
 *	 The above copyright notice and this permission notice shall be included
 *	 in all copies or substantial portions of the Software.
 *
 *	 The Software shall be used for Good, not Evil.
 *
 *	 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *	 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *	 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *	 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *	 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 *	 FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 *	 DEALINGS IN THE SOFTWARE.
 *
 */

/*jshint quotmark:double */
/*global console:true */
/*exported console */

var _        = req("underscore");
var events   = req("events");
var vars     = req("../shared/vars.js");
var messages = req("../shared/messages.js");
var Lexer    = req("./lex.js").Lexer;
var reg      = req("./reg.js");
var state    = req("./state.js").state;
var style    = req("./style.js");

// We need this module here because environments such as IE and Rhino
// don't necessarilly expose the 'console' API and browserify uses
// it to log things. It's a sad state of affair, really.
var console = req("console-browserify");

// We build the application inside a function so that we produce only a singleton
// variable. That function will be invoked immediately, and its return value is
// the JSHINT function itself.

var JSHINT = (function () {
	"use strict";

	var anonname, // The guessed name for anonymous functions.
		api, // Extension API

		// These are operators that should not be used with the ! operator.
		bang = {
			"<"  : true,
			"<=" : true,
			"==" : true,
			"===": true,
			"!==": true,
			"!=" : true,
			">"  : true,
			">=" : true,
			"+"  : true,
			"-"  : true,
			"*"  : true,
			"/"  : true,
			"%"  : true
		},

		// These are the JSHint boolean options.
		boolOptions = {
			asi         : true, // if automatic semicolon insertion should be tolerated
			bitwise     : true, // if bitwise operators should not be allowed
			boss        : true, // if advanced usage of assignments should be allowed
			browser     : true, // if the standard browser globals should be predefined
			camelcase   : true, // if identifiers should be required in camel case
			couch       : true, // if CouchDB globals should be predefined
			curly       : true, // if curly braces around all blocks should be required
			debug       : true, // if debugger statements should be allowed
			devel       : true, // if logging globals should be predefined (console, alert, etc.)
			dojo        : true, // if Dojo Toolkit globals should be predefined
			eqeqeq      : true, // if === should be required
			eqnull      : true, // if == null comparisons should be tolerated
			es3         : true, // if ES3 syntax should be allowed
			es5         : true, // if ES5 syntax should be allowed (is now set per default)
			esnext      : true, // if es.next specific syntax should be allowed
			moz         : true, // if mozilla specific syntax should be allowed
			evil        : true, // if eval should be allowed
			expr        : true, // if ExpressionStatement should be allowed as Programs
			forin       : true, // if for in statements must filter
			funcscope   : true, // if only function scope should be used for scope tests
			gcl         : true, // if JSHint should be compatible with Google Closure Linter
			globalstrict: true, // if global "use strict"; should be allowed (also enables 'strict')
			immed       : true, // if immediate invocations must be wrapped in parens
			iterator    : true, // if the `__iterator__` property should be allowed
			jquery      : true, // if jQuery globals should be predefined
			lastsemic   : true, // if semicolons may be ommitted for the trailing
			                    // statements inside of a one-line blocks.
			laxbreak    : true, // if line breaks should not be checked
			laxcomma    : true, // if line breaks should not be checked around commas
			loopfunc    : true, // if functions should be allowed to be defined within
			                    // loops
			mootools    : true, // if MooTools globals should be predefined
			multistr    : true, // allow multiline strings
			newcap      : true, // if constructor names must be capitalized
			noarg       : true, // if arguments.caller and arguments.callee should be
			                    // disallowed
			node        : true, // if the Node.js environment globals should be
			                    // predefined
			noempty     : true, // if empty blocks should be disallowed
			nonew       : true, // if using `new` for side-effects should be disallowed
			nonstandard : true, // if non-standard (but widely adopted) globals should
			                    // be predefined
			nomen       : true, // if names should be checked
			onevar      : true, // if only one var statement per function should be
			                    // allowed
			passfail    : true, // if the scan should stop on first error
			phantom     : true, // if PhantomJS symbols should be allowed
			plusplus    : true, // if increment/decrement should not be allowed
			proto       : true, // if the `__proto__` property should be allowed
			prototypejs : true, // if Prototype and Scriptaculous globals should be
			                    // predefined
			rhino       : true, // if the Rhino environment globals should be predefined
			shelljs     : true, // if ShellJS globals should be predefined
			undef       : true, // if variables should be declared before used
			scripturl   : true, // if script-targeted URLs should be tolerated
			shadow      : true, // if variable shadowing should be tolerated
			smarttabs   : true, // if smarttabs should be tolerated
			                    // (http://www.emacswiki.org/emacs/SmartTabs)
			strict      : true, // require the "use strict"; pragma
			sub         : true, // if all forms of subscript notation are tolerated
			supernew    : true, // if `new function () { ... };` and `new Object;`
			                    // should be tolerated
			trailing    : true, // if trailing whitespace rules apply
			validthis   : true, // if 'this' inside a non-constructor function is valid.
			                    // This is a function scoped option only.
			withstmt    : true, // if with statements should be allowed
			white       : true, // if strict whitespace rules apply
			worker      : true, // if Web Worker script symbols should be allowed
			wsh         : true, // if the Windows Scripting Host environment globals
			                    // should be predefined
			yui         : true, // YUI variables should be predefined

			// Obsolete options
			onecase     : true, // if one case switch statements should be allowed
			regexp      : true, // if the . should not be allowed in regexp literals
			regexdash   : true  // if unescaped first/last dash (-) inside brackets
			                    // should be tolerated
		},

		// These are the JSHint options that can take any value
		// (we use this object to detect invalid options)
		valOptions = {
			maxlen       : false,
			indent       : false,
			maxerr       : false,
			predef       : false,
			quotmark     : false, //'single'|'double'|true
			scope        : false,
			maxstatements: false, // {int} max statements per function
			maxdepth     : false, // {int} max nested block depth per function
			maxparams    : false, // {int} max params per function
			maxcomplexity: false, // {int} max cyclomatic complexity per function
			unused       : true,  // warn if variables are unused. Available options:
			                      //   false    - don't check for unused variables
			                      //   true     - "vars" + check last function param
			                      //   "vars"   - skip checking unused function params
			                      //   "strict" - "vars" + check all function params
			latedef      : false  // warn if the variable is used before its definition
			                      //   false    - don't emit any warnings
			                      //   true     - warn if any variable is used before its definition
			                      //   "nofunc" - warn for any variable but function declarations
		},

		// These are JSHint boolean options which are shared with JSLint
		// where the definition in JSHint is opposite JSLint
		invertedOptions = {
			bitwise : true,
			forin   : true,
			newcap  : true,
			nomen   : true,
			plusplus: true,
			regexp  : true,
			undef   : true,
			white   : true,

			// Inverted and renamed, use JSHint name here
			eqeqeq  : true,
			onevar  : true,
			strict  : true
		},

		// These are JSHint boolean options which are shared with JSLint
		// where the name has been changed but the effect is unchanged
		renamedOptions = {
			eqeq   : "eqeqeq",
			vars   : "onevar",
			windows: "wsh",
			sloppy : "strict"
		},

		declared, // Globals that were declared using /*global ... */ syntax.
		exported, // Variables that are used outside of the current file.

		functionicity = [
			"closure", "exception", "global", "label",
			"outer", "unused", "var"
		],

		funct, // The current function
		functions, // All of the functions

		global, // The global scope
		implied, // Implied globals
		inblock,
		indent,
		lookahead,
		lex,
		member,
		membersOnly,
		noreach,
		predefined,		// Global variables defined by option

		scope,  // The current scope
		stack,
		unuseds,
		urls,
		warnings,

		extraModules = [],
		emitter = new events.EventEmitter();

	function checkOption(name, t) {
		name = name.trim();

		if (/^[+-]W\d{3}$/g.test(name)) {
			return true;
		}

		if (valOptions[name] === undefined && boolOptions[name] === undefined) {
			if (t.type !== "jslint") {
				error("E001", t, name);
				return false;
			}
		}

		return true;
	}

	function isString(obj) {
		return Object.prototype.toString.call(obj) === "[object String]";
	}

	function isIdentifier(tkn, value) {
		if (!tkn)
			return false;

		if (!tkn.identifier || tkn.value !== value)
			return false;

		return true;
	}

	function isReserved(token) {
		if (!token.reserved) {
			return false;
		}

		if (token.meta && token.meta.isFutureReservedWord) {
			// ES3 FutureReservedWord in an ES5 environment.
			if (state.option.inES5(true) && !token.meta.es5) {
				return false;
			}

			// Some ES5 FutureReservedWord identifiers are active only
			// within a strict mode environment.
			if (token.meta.strictOnly) {
				if (!state.option.strict && !state.directive["use strict"]) {
					return false;
				}
			}

			if (token.isProperty) {
				return false;
			}
		}

		return true;
	}

	function supplant(str, data) {
		return str.replace(/\{([^{}]*)\}/g, function (a, b) {
			var r = data[b];
			return typeof r === "string" || typeof r === "number" ? r : a;
		});
	}

	function combine(t, o) {
		var n;
		for (n in o) {
			if (_.has(o, n) && !_.has(JSHINT.blacklist, n)) {
				t[n] = o[n];
			}
		}
	}

	function updatePredefined() {
		Object.keys(JSHINT.blacklist).forEach(function (key) {
			delete predefined[key];
		});
	}

	function assume() {
		if (state.option.couch) {
			combine(predefined, vars.couch);
		}

		if (state.option.rhino) {
			combine(predefined, vars.rhino);
		}

		if (state.option.shelljs) {
			combine(predefined, vars.shelljs);
		}

		if (state.option.phantom) {
			combine(predefined, vars.phantom);
		}

		if (state.option.prototypejs) {
			combine(predefined, vars.prototypejs);
		}

		if (state.option.node) {
			combine(predefined, vars.node);
		}

		if (state.option.devel) {
			combine(predefined, vars.devel);
		}

		if (state.option.dojo) {
			combine(predefined, vars.dojo);
		}

		if (state.option.browser) {
			combine(predefined, vars.browser);
		}

		if (state.option.nonstandard) {
			combine(predefined, vars.nonstandard);
		}

		if (state.option.jquery) {
			combine(predefined, vars.jquery);
		}

		if (state.option.mootools) {
			combine(predefined, vars.mootools);
		}

		if (state.option.worker) {
			combine(predefined, vars.worker);
		}

		if (state.option.wsh) {
			combine(predefined, vars.wsh);
		}

		if (state.option.globalstrict && state.option.strict !== false) {
			state.option.strict = true;
		}

		if (state.option.yui) {
			combine(predefined, vars.yui);
		}

		// Let's assume that chronologically ES3 < ES5 < ES6/ESNext < Moz

		state.option.inMoz = function (strict) {
			return state.option.moz;
		};

		state.option.inESNext = function (strict) {
			return state.option.moz || state.option.esnext;
		};

		state.option.inES5 = function (/* strict */) {
			return !state.option.es3;
		};

		state.option.inES3 = function (strict) {
			if (strict) {
				return !state.option.moz && !state.option.esnext && state.option.es3;
			}
			return state.option.es3;
		};
	}

	// Produce an error warning.
	function quit(code, line, chr) {
		var percentage = Math.floor((line / state.lines.length) * 100);
		var message = messages.errors[code].desc;

		throw {
			name: "JSHintError",
			line: line,
			character: chr,
			message: message + " (" + percentage + "% scanned).",
			raw: message
		};
	}

	function isundef(scope, code, token, a) {
		return JSHINT.undefs.push([scope, code, token, a]);
	}

	function warning(code, t, a, b, c, d) {
		var ch, l, w, msg;

		if (/^W\d{3}$/.test(code)) {
			if (state.ignored[code])
				return;

			msg = messages.warnings[code];
		} else if (/E\d{3}/.test(code)) {
			msg = messages.errors[code];
		} else if (/I\d{3}/.test(code)) {
			msg = messages.info[code];
		}

		t = t || state.tokens.next;
		if (t.id === "(end)") {  // `~
			t = state.tokens.curr;
		}

		l = t.line || 0;
		ch = t.from || 0;

		w = {
			id: "(error)",
			raw: msg.desc,
			code: msg.code,
			evidence: state.lines[l - 1] || "",
			line: l,
			character: ch,
			scope: JSHINT.scope,
			a: a,
			b: b,
			c: c,
			d: d
		};

		w.reason = supplant(msg.desc, w);
		JSHINT.errors.push(w);

		if (state.option.passfail) {
			quit("E042", l, ch);
		}

		warnings += 1;
		if (warnings >= state.option.maxerr) {
			quit("E043", l, ch);
		}

		return w;
	}

	function warningAt(m, l, ch, a, b, c, d) {
		return warning(m, {
			line: l,
			from: ch
		}, a, b, c, d);
	}

	function error(m, t, a, b, c, d) {
		warning(m, t, a, b, c, d);
	}

	function errorAt(m, l, ch, a, b, c, d) {
		return error(m, {
			line: l,
			from: ch
		}, a, b, c, d);
	}

	// Tracking of "internal" scripts, like eval containing a static string
	function addInternalSrc(elem, src) {
		var i;
		i = {
			id: "(internal)",
			elem: elem,
			value: src
		};
		JSHINT.internals.push(i);
		return i;
	}

	function addlabel(t, type, tkn, islet) {
		// Define t in the current function in the current scope.
		if (type === "exception") {
			if (_.has(funct["(context)"], t)) {
				if (funct[t] !== true && !state.option.node) {
					warning("W002", state.tokens.next, t);
				}
			}
		}

		if (_.has(funct, t) && !funct["(global)"]) {
			if (funct[t] === true) {
				if (state.option.latedef) {
					if ((state.option.latedef === true && _.contains([funct[t], type], "unction")) ||
							!_.contains([funct[t], type], "unction")) {
						warning("W003", state.tokens.next, t);
					}
				}
			} else {
				if (!state.option.shadow && type !== "exception" ||
							(funct["(blockscope)"].getlabel(t))) {
					warning("W004", state.tokens.next, t);
				}
			}
		}

		// a double definition of a let variable in same block throws a TypeError
		if (funct["(blockscope)"] && funct["(blockscope)"].current.has(t)) {
			error("E044", state.tokens.next, t);
		}

		// if the identifier is from a let, adds it only to the current blockscope
		if (islet) {
			funct["(blockscope)"].current.add(t, type, state.tokens.curr);
		} else {

			funct[t] = type;

			if (tkn) {
				funct["(tokens)"][t] = tkn;
			}

			if (funct["(global)"]) {
				global[t] = funct;
				if (_.has(implied, t)) {
					if (state.option.latedef) {
						if ((state.option.latedef === true && _.contains([funct[t], type], "unction")) ||
								!_.contains([funct[t], type], "unction")) {
							warning("W003", state.tokens.next, t);
						}
					}

					delete implied[t];
				}
			} else {
				scope[t] = funct;
			}
		}
	}

	function doOption() {
		var nt = state.tokens.next;
		var body = nt.body.split(",").map(function (s) { return s.trim(); });
		var predef = {};

		if (nt.type === "globals") {
			body.forEach(function (g) {
				g = g.split(":");
				var key = g[0];
				var val = g[1];

				if (key.charAt(0) === "-") {
					key = key.slice(1);
					val = false;

					JSHINT.blacklist[key] = key;
					updatePredefined();
				} else {
					predef[key] = (val === "true");
				}
			});

			combine(predefined, predef);

			for (var key in predef) {
				if (_.has(predef, key)) {
					declared[key] = nt;
				}
			}
		}

		if (nt.type === "exported") {
			body.forEach(function (e) {
				exported[e] = true;
			});
		}

		if (nt.type === "members") {
			membersOnly = membersOnly || {};

			body.forEach(function (m) {
				var ch1 = m.charAt(0);
				var ch2 = m.charAt(m.length - 1);

				if (ch1 === ch2 && (ch1 === "\"" || ch1 === "'")) {
					m = m
						.substr(1, m.length - 2)
						.replace("\\b", "\b")
						.replace("\\t", "\t")
						.replace("\\n", "\n")
						.replace("\\v", "\v")
						.replace("\\f", "\f")
						.replace("\\r", "\r")
						.replace("\\\\", "\\")
						.replace("\\\"", "\"");
				}

				membersOnly[m] = false;
			});
		}

		var numvals = [
			"maxstatements",
			"maxparams",
			"maxdepth",
			"maxcomplexity",
			"maxerr",
			"maxlen",
			"indent"
		];

		if (nt.type === "jshint" || nt.type === "jslint") {
			body.forEach(function (g) {
				g = g.split(":");
				var key = (g[0] || "").trim();
				var val = (g[1] || "").trim();

				if (!checkOption(key, nt)) {
					return;
				}

				if (numvals.indexOf(key) >= 0) {

					// GH988 - numeric options can be disabled by setting them to `false`
					if (val !== "false") {
						val = +val;

						if (typeof val !== "number" || !isFinite(val) || val <= 0 || Math.floor(val) !== val) {
							error("E032", nt, g[1].trim());
							return;
						}

						if (key === "indent") {
							state.option["(explicitIndent)"] = true;
						}
						state.option[key] = val;
					} else {
						if (key === "indent") {
							state.option["(explicitIndent)"] = false;
						} else {
							state.option[key] = false;
						}
					}

					return;
				}

				if (key === "validthis") {
					// `validthis` is valid only within a function scope.
					if (funct["(global)"]) {
						error("E009");
					} else {
						if (val === "true" || val === "false") {
							state.option.validthis = (val === "true");
						} else {
							error("E002", nt);
						}
					}
					return;
				}

				if (key === "quotmark") {
					switch (val) {
					case "true":
					case "false":
						state.option.quotmark = (val === "true");
						break;
					case "double":
					case "single":
						state.option.quotmark = val;
						break;
					default:
						error("E002", nt);
					}
					return;
				}

				if (key === "unused") {
					switch (val) {
					case "true":
						state.option.unused = true;
						break;
					case "false":
						state.option.unused = false;
						break;
					case "vars":
					case "strict":
						state.option.unused = val;
						break;
					default:
						error("E002", nt);
					}
					return;
				}

				if (key === "latedef") {
					switch (val) {
					case "true":
						state.option.latedef = true;
						break;
					case "false":
						state.option.latedef = false;
						break;
					case "nofunc":
						state.option.latedef = "nofunc";
						break;
					default:
						error("E002", nt);
					}
					return;
				}

				var match = /^([+-])(W\d{3})$/g.exec(key);
				if (match) {
					// ignore for -W..., unignore for +W...
					state.ignored[match[2]] = (match[1] === "-");
					return;
				}

				var tn;
				if (val === "true" || val === "false") {
					if (nt.type === "jslint") {
						tn = renamedOptions[key] || key;
						state.option[tn] = (val === "true");

						if (invertedOptions[tn] !== undefined) {
							state.option[tn] = !state.option[tn];
						}
					} else {
						state.option[key] = (val === "true");
					}

					if (key === "newcap") {
						state.option["(explicitNewcap)"] = true;
					}
					return;
				}

				error("E002", nt);
			});

			assume();
		}
	}

	// We need a peek function. If it has an argument, it peeks that much farther
	// ahead. It is used to distinguish
	//	   for ( var i in ...
	// from
	//	   for ( var i = ...

	function peek(p) {
		var i = p || 0, j = 0, t;

		while (j <= i) {
			t = lookahead[j];
			if (!t) {
				t = lookahead[j] = lex.token();
			}
			j += 1;
		}
		return t;
	}

	// Produce the next token. It looks for programming errors.

	function advance(id, t) {
		switch (state.tokens.curr.id) {
		case "(number)":
			if (state.tokens.next.id === ".") {
				warning("W005", state.tokens.curr);
			}
			break;
		case "-":
			if (state.tokens.next.id === "-" || state.tokens.next.id === "--") {
				warning("W006");
			}
			break;
		case "+":
			if (state.tokens.next.id === "+" || state.tokens.next.id === "++") {
				warning("W007");
			}
			break;
		}

		if (state.tokens.curr.type === "(string)" || state.tokens.curr.identifier) {
			anonname = state.tokens.curr.value;
		}

		if (id && state.tokens.next.id !== id) {
			if (t) {
				if (state.tokens.next.id === "(end)") {
					error("E019", t, t.id);
				} else {
					error("E020", state.tokens.next, id, t.id, t.line, state.tokens.next.value);
				}
			} else if (state.tokens.next.type !== "(identifier)" || state.tokens.next.value !== id) {
				warning("W116", state.tokens.next, id, state.tokens.next.value);
			}
		}

		state.tokens.prev = state.tokens.curr;
		state.tokens.curr = state.tokens.next;
		for (;;) {
			state.tokens.next = lookahead.shift() || lex.token();

			if (!state.tokens.next) { // No more tokens left, give up
				quit("E041", state.tokens.curr.line);
			}

			if (state.tokens.next.id === "(end)" || state.tokens.next.id === "(error)") {
				return;
			}

			if (state.tokens.next.check) {
				state.tokens.next.check();
			}

			if (state.tokens.next.isSpecial) {
				doOption();
			} else {
				if (state.tokens.next.id !== "(endline)") {
					break;
				}
			}
		}
	}

	// This is the heart of JSHINT, the Pratt parser. In addition to parsing, it
	// is looking for ad hoc lint patterns. We add .fud to Pratt's model, which is
	// like .nud except that it is only used on the first token of a statement.
	// Having .fud makes it much easier to define statement-oriented languages like
	// JavaScript. I retained Pratt's nomenclature.

	// .nud  Null denotation
	// .fud  First null denotation
	// .led  Left denotation
	//  lbp  Left binding power
	//  rbp  Right binding power

	// They are elements of the parsing method called Top Down Operator Precedence.

	function expression(rbp, initial) {
		var left, isArray = false, isObject = false, isLetExpr = false;

		// if current expression is a let expression
		if (!initial && state.tokens.next.value === "let" && peek(0).value === "(") {
			if (!state.option.inMoz(true)) {
				warning("W118", state.tokens.next, "let expressions");
			}
			isLetExpr = true;
			// create a new block scope we use only for the current expression
			funct["(blockscope)"].stack();
			advance("let");
			advance("(");
			state.syntax["let"].fud.call(state.syntax["let"].fud, false);
			advance(")");
		}

		if (state.tokens.next.id === "(end)")
			error("E006", state.tokens.curr);

		advance();

		if (initial) {
			anonname = "anonymous";
			funct["(verb)"] = state.tokens.curr.value;
		}

		if (initial === true && state.tokens.curr.fud) {
			left = state.tokens.curr.fud();
		} else {
			if (state.tokens.curr.nud) {
				left = state.tokens.curr.nud();
			} else {
				error("E030", state.tokens.curr, state.tokens.curr.id);
			}

			var end_of_expr = state.tokens.next.identifier &&
									!state.tokens.curr.led &&
									state.tokens.curr.line !== state.tokens.next.line;
			while (rbp < state.tokens.next.lbp && !end_of_expr) {
				isArray = state.tokens.curr.value === "Array";
				isObject = state.tokens.curr.value === "Object";

				// #527, new Foo.Array(), Foo.Array(), new Foo.Object(), Foo.Object()
				// Line breaks in IfStatement heads exist to satisfy the checkJSHint
				// "Line too long." error.
				if (left && (left.value || (left.first && left.first.value))) {
					// If the left.value is not "new", or the left.first.value is a "."
					// then safely assume that this is not "new Array()" and possibly
					// not "new Object()"...
					if (left.value !== "new" ||
					  (left.first && left.first.value && left.first.value === ".")) {
						isArray = false;
						// ...In the case of Object, if the left.value and state.tokens.curr.value
						// are not equal, then safely assume that this not "new Object()"
						if (left.value !== state.tokens.curr.value) {
							isObject = false;
						}
					}
				}

				advance();

				if (isArray && state.tokens.curr.id === "(" && state.tokens.next.id === ")") {
					warning("W009", state.tokens.curr);
				}

				if (isObject && state.tokens.curr.id === "(" && state.tokens.next.id === ")") {
					warning("W010", state.tokens.curr);
				}

				if (left && state.tokens.curr.led) {
					left = state.tokens.curr.led(left);
				} else {
					error("E033", state.tokens.curr, state.tokens.curr.id);
				}
			}
		}
		if (isLetExpr) {
			funct["(blockscope)"].unstack();
		}
		return left;
	}


// Functions for conformance of style.

	function adjacent(left, right) {
		left = left || state.tokens.curr;
		right = right || state.tokens.next;
		if (state.option.white) {
			if (left.character !== right.from && left.line === right.line) {
				left.from += (left.character - left.from);
				warning("W011", left, left.value);
			}
		}
	}

	function nobreak(left, right) {
		left = left || state.tokens.curr;
		right = right || state.tokens.next;
		if (state.option.white && (left.character !== right.from || left.line !== right.line)) {
			warning("W012", right, right.value);
		}
	}

	function nospace(left, right) {
		left = left || state.tokens.curr;
		right = right || state.tokens.next;
		if (state.option.white && !left.comment) {
			if (left.line === right.line) {
				adjacent(left, right);
			}
		}
	}

	function nonadjacent(left, right) {
		if (state.option.white) {
			left = left || state.tokens.curr;
			right = right || state.tokens.next;

			if (left.value === ";" && right.value === ";") {
				return;
			}

			if (left.line === right.line && left.character === right.from) {
				left.from += (left.character - left.from);
				warning("W013", left, left.value);
			}
		}
	}

	function nobreaknonadjacent(left, right) {
		left = left || state.tokens.curr;
		right = right || state.tokens.next;
		if (!state.option.laxbreak && left.line !== right.line) {
			warning("W014", right, right.id);
		} else if (state.option.white) {
			left = left || state.tokens.curr;
			right = right || state.tokens.next;
			if (left.character === right.from) {
				left.from += (left.character - left.from);
				warning("W013", left, left.value);
			}
		}
	}

	function indentation(bias) {
		if (!state.option.white && !state.option["(explicitIndent)"]) {
			return;
		}

		if (state.tokens.next.id === "(end)") {
			return;
		}

		var i = indent + (bias || 0);
		if (state.tokens.next.from !== i) {
			warning("W015", state.tokens.next, state.tokens.next.value, i, state.tokens.next.from);
		}
	}

	function nolinebreak(t) {
		t = t || state.tokens.curr;
		if (t.line !== state.tokens.next.line) {
			warning("E022", t, t.value);
		}
	}


	function comma(opts) {
		opts = opts || {};

		if (!opts.peek) {
			if (state.tokens.curr.line !== state.tokens.next.line) {
				if (!state.option.laxcomma) {
					if (comma.first) {
						warning("I001");
						comma.first = false;
					}
					warning("W014", state.tokens.curr, state.tokens.next.value);
				}
			} else if (!state.tokens.curr.comment &&
					state.tokens.curr.character !== state.tokens.next.from && state.option.white) {
				state.tokens.curr.from += (state.tokens.curr.character - state.tokens.curr.from);
				warning("W011", state.tokens.curr, state.tokens.curr.value);
			}

			advance(",");
		}

		// TODO: This is a temporary solution to fight against false-positives in
		// arrays and objects with trailing commas (see GH-363). The best solution
		// would be to extract all whitespace rules out of parser.

		if (state.tokens.next.value !== "]" && state.tokens.next.value !== "}") {
			nonadjacent(state.tokens.curr, state.tokens.next);
		}

		if (state.tokens.next.identifier && !(opts.property && state.option.inES5())) {
			// Keywords that cannot follow a comma operator.
			switch (state.tokens.next.value) {
			case "break":
			case "case":
			case "catch":
			case "continue":
			case "default":
			case "do":
			case "else":
			case "finally":
			case "for":
			case "if":
			case "in":
			case "instanceof":
			case "return":
			case "yield":
			case "switch":
			case "throw":
			case "try":
			case "var":
			case "let":
			case "while":
			case "with":
				error("E024", state.tokens.next, state.tokens.next.value);
				return false;
			}
		}

		if (state.tokens.next.type === "(punctuator)") {
			switch (state.tokens.next.value) {
			case "}":
			case "]":
			case ",":
				if (opts.allowTrailing) {
					return true;
				}

				/* falls through */
			case ")":
				error("E024", state.tokens.next, state.tokens.next.value);
				return false;
			}
		}
		return true;
	}

	// Functional constructors for making the symbols that will be inherited by
	// tokens.

	function symbol(s, p) {
		var x = state.syntax[s];
		if (!x || typeof x !== "object") {
			state.syntax[s] = x = {
				id: s,
				lbp: p,
				value: s
			};
		}
		return x;
	}

	function delim(s) {
		return symbol(s, 0);
	}

	function stmt(s, f) {
		var x = delim(s);
		x.identifier = x.reserved = true;
		x.fud = f;
		return x;
	}

	function blockstmt(s, f) {
		var x = stmt(s, f);
		x.block = true;
		return x;
	}

	function reserveName(x) {
		var c = x.id.charAt(0);
		if ((c >= "a" && c <= "z") || (c >= "A" && c <= "Z")) {
			x.identifier = x.reserved = true;
		}
		return x;
	}

	function prefix(s, f) {
		var x = symbol(s, 150);
		reserveName(x);
		x.nud = (typeof f === "function") ? f : function () {
			this.right = expression(150);
			this.arity = "unary";
			if (this.id === "++" || this.id === "--") {
				if (state.option.plusplus) {
					warning("W016", this, this.id);
				} else if ((!this.right.identifier || isReserved(this.right)) &&
						this.right.id !== "." && this.right.id !== "[") {
					warning("W017", this);
				}
			}
			return this;
		};
		return x;
	}

	function type(s, f) {
		var x = delim(s);
		x.type = s;
		x.nud = f;
		return x;
	}

	function reserve(name, func) {
		var x = type(name, func);
		x.identifier = true;
		x.reserved = true;
		return x;
	}

	function FutureReservedWord(name, meta) {
		var x = type(name, (meta && meta.nud) || function () {
			return this;
		});

		meta = meta || {};
		meta.isFutureReservedWord = true;

		x.value = name;
		x.identifier = true;
		x.reserved = true;
		x.meta = meta;

		return x;
	}

	function reservevar(s, v) {
		return reserve(s, function () {
			if (typeof v === "function") {
				v(this);
			}
			return this;
		});
	}

	function infix(s, f, p, w) {
		var x = symbol(s, p);
		reserveName(x);
		x.led = function (left) {
			if (!w) {
				nobreaknonadjacent(state.tokens.prev, state.tokens.curr);
				nonadjacent(state.tokens.curr, state.tokens.next);
			}
			if (s === "in" && left.id === "!") {
				warning("W018", left, "!");
			}
			if (typeof f === "function") {
				return f(left, this);
			} else {
				this.left = left;
				this.right = expression(p);
				return this;
			}
		};
		return x;
	}


	function application(s) {
		var x = symbol(s, 42);

		x.led = function (left) {
			if (!state.option.inESNext()) {
				warning("W104", state.tokens.curr, "arrow function syntax (=>)");
			}

			nobreaknonadjacent(state.tokens.prev, state.tokens.curr);
			nonadjacent(state.tokens.curr, state.tokens.next);

			this.left = left;
			this.right = doFunction(undefined, undefined, false, left);
			return this;
		};
		return x;
	}

	function relation(s, f) {
		var x = symbol(s, 100);

		x.led = function (left) {
			nobreaknonadjacent(state.tokens.prev, state.tokens.curr);
			nonadjacent(state.tokens.curr, state.tokens.next);
			var right = expression(100);

			if (isIdentifier(left, "NaN") || isIdentifier(right, "NaN")) {
				warning("W019", this);
			} else if (f) {
				f.apply(this, [left, right]);
			}

			if (!left || !right) {
				quit("E041", state.tokens.curr.line);
			}

			if (left.id === "!") {
				warning("W018", left, "!");
			}

			if (right.id === "!") {
				warning("W018", right, "!");
			}

			this.left = left;
			this.right = right;
			return this;
		};
		return x;
	}

	function isPoorRelation(node) {
		return node &&
			  ((node.type === "(number)" && +node.value === 0) ||
			   (node.type === "(string)" && node.value === "") ||
			   (node.type === "null" && !state.option.eqnull) ||
				node.type === "true" ||
				node.type === "false" ||
				node.type === "undefined");
	}

	function assignop(s) {
		symbol(s, 20).exps = true;

		return infix(s, function (left, that) {
			that.left = left;

			if (left) {
				if (predefined[left.value] === false &&
						scope[left.value]["(global)"] === true) {
					warning("W020", left);
				} else if (left["function"]) {
					warning("W021", left, left.value);
				}

				if (funct[left.value] === "const") {
					error("E013", left, left.value);
				}

				if (left.id === ".") {
					if (!left.left) {
						warning("E031", that);
					} else if (left.left.value === "arguments" && !state.directive["use strict"]) {
						warning("E031", that);
					}

					that.right = expression(19);
					return that;
				} else if (left.id === "[") {
					if (state.tokens.curr.left.first) {
						state.tokens.curr.left.first.forEach(function (t) {
							if (funct[t.value] === "const") {
								error("E013", t, t.value);
							}
						});
					} else if (!left.left) {
						warning("E031", that);
					} else if (left.left.value === "arguments" && !state.directive["use strict"]) {
						warning("E031", that);
					}
					that.right = expression(19);
					return that;
				} else if (left.identifier && !isReserved(left)) {
					if (funct[left.value] === "exception") {
						warning("W022", left);
					}
					that.right = expression(19);
					return that;
				}

				if (left === state.syntax["function"]) {
					warning("W023", state.tokens.curr);
				}
			}

			error("E031", that);
		}, 20);
	}


	function bitwise(s, f, p) {
		var x = symbol(s, p);
		reserveName(x);
		x.led = (typeof f === "function") ? f : function (left) {
			if (state.option.bitwise) {
				warning("W016", this, this.id);
			}
			this.left = left;
			this.right = expression(p);
			return this;
		};
		return x;
	}


	function bitwiseassignop(s) {
		symbol(s, 20).exps = true;
		return infix(s, function (left, that) {
			if (state.option.bitwise) {
				warning("W016", that, that.id);
			}
			nonadjacent(state.tokens.prev, state.tokens.curr);
			nonadjacent(state.tokens.curr, state.tokens.next);
			if (left) {
				if (left.id === "." || left.id === "[" ||
						(left.identifier && !isReserved(left))) {
					expression(19);
					return that;
				}
				if (left === state.syntax["function"]) {
					warning("W023", state.tokens.curr);
				}
				return that;
			}
			error("E031", that);
		}, 20);
	}


	function suffix(s) {
		var x = symbol(s, 150);

		x.led = function (left) {
			if (state.option.plusplus) {
				warning("W016", this, this.id);
			} else if ((!left.identifier || isReserved(left)) && left.id !== "." && left.id !== "[") {
				warning("W017", this);
			}

			this.left = left;
			return this;
		};
		return x;
	}

	// fnparam means that this identifier is being defined as a function
	// argument (see identifier())
	// prop means that this identifier is that of an object property

	function optionalidentifier(fnparam, prop) {
		if (!state.tokens.next.identifier) {
			return;
		}

		advance();

		var curr = state.tokens.curr;
		var meta = curr.meta || {};
		var val  = state.tokens.curr.value;

		if (!isReserved(curr)) {
			return val;
		}

		if (prop) {
			if (state.option.inES5() || meta.isFutureReservedWord) {
				return val;
			}
		}

		if (fnparam && val === "undefined") {
			return val;
		}

		// Display an info message about reserved words as properties
		// and ES5 but do it only once.
		if (prop && !api.getCache("displayed:I002")) {
			api.setCache("displayed:I002", true);
			warning("I002");
		}

		warning("W024", state.tokens.curr, state.tokens.curr.id);
		return val;
	}

	// fnparam means that this identifier is being defined as a function
	// argument
	// prop means that this identifier is that of an object property
	function identifier(fnparam, prop) {
		var i = optionalidentifier(fnparam, prop);
		if (i) {
			return i;
		}
		if (state.tokens.curr.id === "function" && state.tokens.next.id === "(") {
			warning("W025");
		} else {
			error("E030", state.tokens.next, state.tokens.next.value);
		}
	}


	function reachable(s) {
		var i = 0, t;
		if (state.tokens.next.id !== ";" || noreach) {
			return;
		}
		for (;;) {
			t = peek(i);
			if (t.reach) {
				return;
			}
			if (t.id !== "(endline)") {
				if (t.id === "function") {
					if (!state.option.latedef) {
						break;
					}

					warning("W026", t);
					break;
				}

				warning("W027", t, t.value, s);
				break;
			}
			i += 1;
		}
	}


	function statement(noindent) {
		var values;
		var i = indent, r, s = scope, t = state.tokens.next;

		if (t.id === ";") {
			advance(";");
			return;
		}

		// Is this a labelled statement?
		var res = isReserved(t);

		// We're being more tolerant here: if someone uses
		// a FutureReservedWord as a label, we warn but proceed
		// anyway.

		if (res && t.meta && t.meta.isFutureReservedWord && peek().id === ":") {
			warning("W024", t, t.id);
			res = false;
		}

		// detect a destructuring assignment
		if (_.has(["[", "{"], t.value)) {
			if (lookupBlockType().isDestAssign) {
				if (!state.option.inESNext()) {
					warning("W104", state.tokens.curr, "destructuring expression");
				}
				values = destructuringExpression();
				values.forEach(function (tok) {
					isundef(funct, "W117", tok.token, tok.id);
				});
				advance("=");
				destructuringExpressionMatch(values, expression(5, true));
				advance(";");
				return;
			}
		}
		if (t.identifier && !res && peek().id === ":") {
			advance();
			advance(":");
			scope = Object.create(s);
			addlabel(t.value, "label");

			if (!state.tokens.next.labelled && state.tokens.next.value !== "{") {
				warning("W028", state.tokens.next, t.value, state.tokens.next.value);
			}

			state.tokens.next.label = t.value;
			t = state.tokens.next;
		}

		// Is it a lonely block?

		if (t.id === "{") {
			block(true, true);
			return;
		}

		// Parse the statement.

		if (!noindent) {
			indentation();
		}
		r = expression(0, true);

		// Look for the final semicolon.

		if (!t.block) {
			if (!state.option.expr && (!r || !r.exps)) {
				warning("W030", state.tokens.curr);
			} else if (state.option.nonew && r && r.left && r.id === "(" && r.left.id === "new") {
				warning("W031", t);
			}

			if (state.tokens.next.id !== ";") {
				if (!state.option.asi) {
					// If this is the last statement in a block that ends on
					// the same line *and* option lastsemic is on, ignore the warning.
					// Otherwise, complain about missing semicolon.
					if (!state.option.lastsemic || state.tokens.next.id !== "}" ||
						state.tokens.next.line !== state.tokens.curr.line) {
						warningAt("W033", state.tokens.curr.line, state.tokens.curr.character);
					}
				}
			} else {
				adjacent(state.tokens.curr, state.tokens.next);
				advance(";");
				nonadjacent(state.tokens.curr, state.tokens.next);
			}
		}

		// Restore the indentation.

		indent = i;
		scope = s;
		return r;
	}


	function statements(startLine) {
		var a = [], p;

		while (!state.tokens.next.reach && state.tokens.next.id !== "(end)") {
			if (state.tokens.next.id === ";") {
				p = peek();

				if (!p || (p.id !== "(" && p.id !== "[")) {
					warning("W032");
				}

				advance(";");
			} else {
				a.push(statement(startLine === state.tokens.next.line));
			}
		}
		return a;
	}


	/*
	 * read all directives
	 * recognizes a simple form of asi, but always
	 * warns, if it is used
	 */
	function directives() {
		var i, p, pn;

		for (;;) {
			if (state.tokens.next.id === "(string)") {
				p = peek(0);
				if (p.id === "(endline)") {
					i = 1;
					do {
						pn = peek(i);
						i = i + 1;
					} while (pn.id === "(endline)");

					if (pn.id !== ";") {
						if (pn.id !== "(string)" && pn.id !== "(number)" &&
							pn.id !== "(regexp)" && pn.identifier !== true &&
							pn.id !== "}") {
							break;
						}
						warning("W033", state.tokens.next);
					} else {
						p = pn;
					}
				} else if (p.id === "}") {
					// Directive with no other statements, warn about missing semicolon
					warning("W033", p);
				} else if (p.id !== ";") {
					break;
				}

				indentation();
				advance();
				if (state.directive[state.tokens.curr.value]) {
					warning("W034", state.tokens.curr, state.tokens.curr.value);
				}

				if (state.tokens.curr.value === "use strict") {
					if (!state.option["(explicitNewcap)"])
						state.option.newcap = true;
					state.option.undef = true;
				}

				// there's no directive negation, so always set to true
				state.directive[state.tokens.curr.value] = true;

				if (p.id === ";") {
					advance(";");
				}
				continue;
			}
			break;
		}
	}


	/*
	 * Parses a single block. A block is a sequence of statements wrapped in
	 * braces.
	 *
	 * ordinary - true for everything but function bodies and try blocks.
	 * stmt		- true if block can be a single statement (e.g. in if/for/while).
	 * isfunc	- true if block is a function body
	 */
	function block(ordinary, stmt, isfunc, isfatarrow) {
		var a,
			b = inblock,
			old_indent = indent,
			m,
			s = scope,
			t,
			line,
			d;

		inblock = ordinary;

		if (!ordinary || !state.option.funcscope)
			scope = Object.create(scope);

		nonadjacent(state.tokens.curr, state.tokens.next);
		t = state.tokens.next;

		var metrics = funct["(metrics)"];
		metrics.nestedBlockDepth += 1;
		metrics.verifyMaxNestedBlockDepthPerFunction();

		if (state.tokens.next.id === "{") {
			advance("{");

			// create a new block scope
			funct["(blockscope)"].stack();

			line = state.tokens.curr.line;
			if (state.tokens.next.id !== "}") {
				indent += state.option.indent;
				while (!ordinary && state.tokens.next.from > indent) {
					indent += state.option.indent;
				}

				if (isfunc) {
					m = {};
					for (d in state.directive) {
						if (_.has(state.directive, d)) {
							m[d] = state.directive[d];
						}
					}
					directives();

					if (state.option.strict && funct["(context)"]["(global)"]) {
						if (!m["use strict"] && !state.directive["use strict"]) {
							warning("E007");
						}
					}
				}

				a = statements(line);

				metrics.statementCount += a.length;

				if (isfunc) {
					state.directive = m;
				}

				indent -= state.option.indent;
				if (line !== state.tokens.next.line) {
					indentation();
				}
			} else if (line !== state.tokens.next.line) {
				indentation();
			}
			advance("}", t);

			funct["(blockscope)"].unstack();

			indent = old_indent;
		} else if (!ordinary) {
			if (isfunc) {
				m = {};
				if (stmt && !isfatarrow && !state.option.inMoz(true)) {
					error("W118", state.tokens.curr, "function closure expressions");
				}

				if (!stmt) {
					for (d in state.directive) {
						if (_.has(state.directive, d)) {
							m[d] = state.directive[d];
						}
					}
				}
				expression(5);

				if (state.option.strict && funct["(context)"]["(global)"]) {
					if (!m["use strict"] && !state.directive["use strict"]) {
						warning("E007");
					}
				}
			} else {
				error("E021", state.tokens.next, "{", state.tokens.next.value);
			}
		} else {

			// check to avoid let declaration not within a block
			funct["(nolet)"] = true;

			if (!stmt || state.option.curly) {
				warning("W116", state.tokens.next, "{", state.tokens.next.value);
			}

			noreach = true;
			indent += state.option.indent;
			// test indentation only if statement is in new line
			a = [statement(state.tokens.next.line === state.tokens.curr.line)];
			indent -= state.option.indent;
			noreach = false;

			delete funct["(nolet)"];
		}
		funct["(verb)"] = null;
		if (!ordinary || !state.option.funcscope) scope = s;
		inblock = b;
		if (ordinary && state.option.noempty && (!a || a.length === 0)) {
			warning("W035");
		}
		metrics.nestedBlockDepth -= 1;
		return a;
	}


	function countMember(m) {
		if (membersOnly && typeof membersOnly[m] !== "boolean") {
			warning("W036", state.tokens.curr, m);
		}
		if (typeof member[m] === "number") {
			member[m] += 1;
		} else {
			member[m] = 1;
		}
	}


	function note_implied(tkn) {
		var name = tkn.value, line = tkn.line, a = implied[name];
		if (typeof a === "function") {
			a = false;
		}

		if (!a) {
			a = [line];
			implied[name] = a;
		} else if (a[a.length - 1] !== line) {
			a.push(line);
		}
	}


	// Build the syntax table by declaring the syntactic elements of the language.

	type("(number)", function () {
		return this;
	});

	type("(string)", function () {
		return this;
	});

	state.syntax["(identifier)"] = {
		type: "(identifier)",
		lbp: 0,
		identifier: true,
		nud: function () {
			var v = this.value,
				s = scope[v],
				f;

			if (typeof s === "function") {
				// Protection against accidental inheritance.
				s = undefined;
			} else if (typeof s === "boolean") {
				f = funct;
				funct = functions[0];
				addlabel(v, "var");
				s = funct;
				funct = f;
			}
			var block;
			if (_.has(funct, "(blockscope)")) {
				block = funct["(blockscope)"].getlabel(v);
			}

			// The name is in scope and defined in the current function.
			if (funct === s || block) {
				// Change 'unused' to 'var', and reject labels.
				// the name is in a block scope
				switch (block ? block[v]["(type)"] : funct[v]) {
				case "unused":
					if (block) block[v]["(type)"] = "var";
					else funct[v] = "var";
					break;
				case "unction":
					if (block) block[v]["(type)"] = "function";
					else funct[v] = "function";
					this["function"] = true;
					break;
				case "function":
					this["function"] = true;
					break;
				case "label":
					warning("W037", state.tokens.curr, v);
					break;
				}
			} else if (funct["(global)"]) {
				// The name is not defined in the function.  If we are in the global
				// scope, then we have an undefined variable.
				//
				// Operators typeof and delete do not raise runtime errors even if
				// the base object of a reference is null so no need to display warning
				// if we're inside of typeof or delete.

				if (typeof predefined[v] !== "boolean") {
					// Attempting to subscript a null reference will throw an
					// error, even within the typeof and delete operators
					if (!(anonname === "typeof" || anonname === "delete") ||
						(state.tokens.next && (state.tokens.next.value === "." ||
							state.tokens.next.value === "["))) {

						// if we're in a list comprehension, variables are declared
						// locally and used before being defined. So we check
						// the presence of the given variable in the comp array
						// before declaring it undefined.

						if (!funct["(comparray)"].check(v)) {
							isundef(funct, "W117", state.tokens.curr, v);
						}
					}
				}

				note_implied(state.tokens.curr);
			} else {
				// If the name is already defined in the current
				// function, but not as outer, then there is a scope error.

				switch (funct[v]) {
				case "closure":
				case "function":
				case "var":
				case "unused":
					warning("W038", state.tokens.curr, v);
					break;
				case "label":
					warning("W037", state.tokens.curr, v);
					break;
				case "outer":
				case "global":
					break;
				default:
					// If the name is defined in an outer function, make an outer entry,
					// and if it was unused, make it var.
					if (s === true) {
						funct[v] = true;
					} else if (s === null) {
						warning("W039", state.tokens.curr, v);
						note_implied(state.tokens.curr);
					} else if (typeof s !== "object") {
						// Operators typeof and delete do not raise runtime errors even
						// if the base object of a reference is null so no need to
						//
						// display warning if we're inside of typeof or delete.
						// Attempting to subscript a null reference will throw an
						// error, even within the typeof and delete operators
						if (!(anonname === "typeof" || anonname === "delete") ||
							(state.tokens.next &&
								(state.tokens.next.value === "." || state.tokens.next.value === "["))) {

							isundef(funct, "W117", state.tokens.curr, v);
						}
						funct[v] = true;
						note_implied(state.tokens.curr);
					} else {
						switch (s[v]) {
						case "function":
						case "unction":
							this["function"] = true;
							s[v] = "closure";
							funct[v] = s["(global)"] ? "global" : "outer";
							break;
						case "var":
						case "unused":
							s[v] = "closure";
							funct[v] = s["(global)"] ? "global" : "outer";
							break;
						case "closure":
							funct[v] = s["(global)"] ? "global" : "outer";
							break;
						case "label":
							warning("W037", state.tokens.curr, v);
						}
					}
				}
			}
			return this;
		},
		led: function () {
			error("E033", state.tokens.next, state.tokens.next.value);
		}
	};

	type("(regexp)", function () {
		return this;
	});

	// ECMAScript parser

	delim("(endline)");
	delim("(begin)");
	delim("(end)").reach = true;
	delim("(error)").reach = true;
	delim("}").reach = true;
	delim(")");
	delim("]");
	delim("\"").reach = true;
	delim("'").reach = true;
	delim(";");
	delim(":").reach = true;
	delim("#");

	reserve("else");
	reserve("case").reach = true;
	reserve("catch");
	reserve("default").reach = true;
	reserve("finally");
	reservevar("arguments", function (x) {
		if (state.directive["use strict"] && funct["(global)"]) {
			warning("E008", x);
		}
	});
	reservevar("eval");
	reservevar("false");
	reservevar("Infinity");
	reservevar("null");
	reservevar("this", function (x) {
		if (state.directive["use strict"] && !state.option.validthis && ((funct["(statement)"] &&
				funct["(name)"].charAt(0) > "Z") || funct["(global)"])) {
			warning("W040", x);
		}
	});
	reservevar("true");
	reservevar("undefined");

	assignop("=", "assign", 20);
	assignop("+=", "assignadd", 20);
	assignop("-=", "assignsub", 20);
	assignop("*=", "assignmult", 20);
	assignop("/=", "assigndiv", 20).nud = function () {
		error("E014");
	};
	assignop("%=", "assignmod", 20);

	bitwiseassignop("&=", "assignbitand", 20);
	bitwiseassignop("|=", "assignbitor", 20);
	bitwiseassignop("^=", "assignbitxor", 20);
	bitwiseassignop("<<=", "assignshiftleft", 20);
	bitwiseassignop(">>=", "assignshiftright", 20);
	bitwiseassignop(">>>=", "assignshiftrightunsigned", 20);
	infix(",", function (left, that) {
		var expr;
		that.exprs = [left];
		if (!comma({peek: true})) {
			return that;
		}
		while (true) {
			if (!(expr = expression(5)))  {
				break;
			}
			that.exprs.push(expr);
			if (state.tokens.next.value !== "," || !comma()) {
				break;
			}
		}
		return that;
	}, 5, true);
	infix("?", function (left, that) {
		that.left = left;
		that.right = expression(10);
		advance(":");
		that["else"] = expression(10);
		return that;
	}, 30);

	infix("||", "or", 40);
	infix("&&", "and", 50);
	bitwise("|", "bitor", 70);
	bitwise("^", "bitxor", 80);
	bitwise("&", "bitand", 90);
	relation("==", function (left, right) {
		var eqnull = state.option.eqnull && (left.value === "null" || right.value === "null");

		if (!eqnull && state.option.eqeqeq)
			warning("W116", this, "===", "==");
		else if (isPoorRelation(left))
			warning("W041", this, "===", left.value);
		else if (isPoorRelation(right))
			warning("W041", this, "===", right.value);

		return this;
	});
	relation("===");
	relation("!=", function (left, right) {
		var eqnull = state.option.eqnull &&
				(left.value === "null" || right.value === "null");

		if (!eqnull && state.option.eqeqeq) {
			warning("W116", this, "!==", "!=");
		} else if (isPoorRelation(left)) {
			warning("W041", this, "!==", left.value);
		} else if (isPoorRelation(right)) {
			warning("W041", this, "!==", right.value);
		}
		return this;
	});
	relation("!==");
	relation("<");
	relation(">");
	relation("<=");
	relation(">=");
	bitwise("<<", "shiftleft", 120);
	bitwise(">>", "shiftright", 120);
	bitwise(">>>", "shiftrightunsigned", 120);
	infix("in", "in", 120);
	infix("instanceof", "instanceof", 120);
	infix("+", function (left, that) {
		var right = expression(130);
		if (left && right && left.id === "(string)" && right.id === "(string)") {
			left.value += right.value;
			left.character = right.character;
			if (!state.option.scripturl && reg.javascriptURL.test(left.value)) {
				warning("W050", left);
			}
			return left;
		}
		that.left = left;
		that.right = right;
		return that;
	}, 130);
	prefix("+", "num");
	prefix("+++", function () {
		warning("W007");
		this.right = expression(150);
		this.arity = "unary";
		return this;
	});
	infix("+++", function (left) {
		warning("W007");
		this.left = left;
		this.right = expression(130);
		return this;
	}, 130);
	infix("-", "sub", 130);
	prefix("-", "neg");
	prefix("---", function () {
		warning("W006");
		this.right = expression(150);
		this.arity = "unary";
		return this;
	});
	infix("---", function (left) {
		warning("W006");
		this.left = left;
		this.right = expression(130);
		return this;
	}, 130);
	infix("*", "mult", 140);
	infix("/", "div", 140);
	infix("%", "mod", 140);

	suffix("++", "postinc");
	prefix("++", "preinc");
	state.syntax["++"].exps = true;

	suffix("--", "postdec");
	prefix("--", "predec");
	state.syntax["--"].exps = true;
	prefix("delete", function () {
		var p = expression(5);
		if (!p || (p.id !== "." && p.id !== "[")) {
			warning("W051");
		}
		this.first = p;
		return this;
	}).exps = true;

	prefix("~", function () {
		if (state.option.bitwise) {
			warning("W052", this, "~");
		}
		expression(150);
		return this;
	});

	prefix("...", function () {
		if (!state.option.inESNext()) {
			warning("W104", this, "spread/rest operator");
		}
		if (!state.tokens.next.identifier) {
			error("E030", state.tokens.next, state.tokens.next.value);
		}
		expression(150);
		return this;
	});

	prefix("!", function () {
		this.right = expression(150);
		this.arity = "unary";

		if (!this.right) { // '!' followed by nothing? Give up.
			quit("E041", this.line || 0);
		}

		if (bang[this.right.id] === true) {
			warning("W018", this, "!");
		}
		return this;
	});

	prefix("typeof", "typeof");
	prefix("new", function () {
		var c = expression(155), i;
		if (c && c.id !== "function") {
			if (c.identifier) {
				c["new"] = true;
				switch (c.value) {
				case "Number":
				case "String":
				case "Boolean":
				case "Math":
				case "JSON":
					warning("W053", state.tokens.prev, c.value);
					break;
				case "Function":
					if (!state.option.evil) {
						warning("W054");
					}
					break;
				case "Date":
				case "RegExp":
					break;
				default:
					if (c.id !== "function") {
						i = c.value.substr(0, 1);
						if (state.option.newcap && (i < "A" || i > "Z") && !_.has(global, c.value)) {
							warning("W055", state.tokens.curr);
						}
					}
				}
			} else {
				if (c.id !== "." && c.id !== "[" && c.id !== "(") {
					warning("W056", state.tokens.curr);
				}
			}
		} else {
			if (!state.option.supernew)
				warning("W057", this);
		}
		adjacent(state.tokens.curr, state.tokens.next);
		if (state.tokens.next.id !== "(" && !state.option.supernew) {
			warning("W058", state.tokens.curr, state.tokens.curr.value);
		}
		this.first = c;
		return this;
	});
	state.syntax["new"].exps = true;

	prefix("void").exps = true;

	infix(".", function (left, that) {
		adjacent(state.tokens.prev, state.tokens.curr);
		nobreak();
		var m = identifier(false, true);

		if (typeof m === "string") {
			countMember(m);
		}

		that.left = left;
		that.right = m;

		if (m && m === "hasOwnProperty" && state.tokens.next.value === "=") {
			warning("W001");
		}

		if (left && left.value === "arguments" && (m === "callee" || m === "caller")) {
			if (state.option.noarg)
				warning("W059", left, m);
			else if (state.directive["use strict"])
				error("E008");
		} else if (!state.option.evil && left && left.value === "document" &&
				(m === "write" || m === "writeln")) {
			warning("W060", left);
		}

		if (!state.option.evil && (m === "eval" || m === "execScript")) {
			warning("W061");
		}

		return that;
	}, 160, true);

	infix("(", function (left, that) {
		if (state.tokens.prev.id !== "}" && state.tokens.prev.id !== ")") {
			nobreak(state.tokens.prev, state.tokens.curr);
		}

		nospace();
		if (state.option.immed && left && !left.immed && left.id === "function") {
			warning("W062");
		}

		var n = 0;
		var p = [];

		if (left) {
			if (left.type === "(identifier)") {
				if (left.value.match(/^[A-Z]([A-Z0-9_$]*[a-z][A-Za-z0-9_$]*)?$/)) {
					if ("Number String Boolean Date Object".indexOf(left.value) === -1) {
						if (left.value === "Math") {
							warning("W063", left);
						} else if (state.option.newcap) {
							warning("W064", left);
						}
					}
				}
			}
		}

		if (state.tokens.next.id !== ")") {
			for (;;) {
				p[p.length] = expression(10);
				n += 1;
				if (state.tokens.next.id !== ",") {
					break;
				}
				comma();
			}
		}

		advance(")");
		nospace(state.tokens.prev, state.tokens.curr);

		if (typeof left === "object") {
			if (left.value === "parseInt" && n === 1) {
				warning("W065", state.tokens.curr);
			}
			if (!state.option.evil) {
				if (left.value === "eval" || left.value === "Function" ||
						left.value === "execScript") {
					warning("W061", left);

					if (p[0] && [0].id === "(string)") {
						addInternalSrc(left, p[0].value);
					}
				} else if (p[0] && p[0].id === "(string)" &&
					   (left.value === "setTimeout" ||
						left.value === "setInterval")) {
					warning("W066", left);
					addInternalSrc(left, p[0].value);

				// window.setTimeout/setInterval
				} else if (p[0] && p[0].id === "(string)" &&
					   left.value === "." &&
					   left.left.value === "window" &&
					   (left.right === "setTimeout" ||
						left.right === "setInterval")) {
					warning("W066", left);
					addInternalSrc(left, p[0].value);
				}
			}
			if (!left.identifier && left.id !== "." && left.id !== "[" &&
					left.id !== "(" && left.id !== "&&" && left.id !== "||" &&
					left.id !== "?") {
				warning("W067", left);
			}
		}

		that.left = left;
		return that;
	}, 155, true).exps = true;

	prefix("(", function () {
		nospace();
		var bracket, brackets = [];
		var pn, pn1, i = 0;
		var ret;

		do {
			pn = peek(i);
			i += 1;
			pn1 = peek(i);
			i += 1;
		} while (pn.value !== ")" && pn1.value !== "=>" && pn1.value !== ";" && pn1.type !== "(end)");

		if (state.tokens.next.id === "function") {
			state.tokens.next.immed = true;
		}

		var exprs = [];

		if (state.tokens.next.id !== ")") {
			for (;;) {
				if (pn1.value === "=>" && state.tokens.next.value === "{") {
					bracket = state.tokens.next;
					bracket.left = destructuringExpression();
					brackets.push(bracket);
					for (var t in bracket.left) {
						exprs.push(bracket.left[t].token);
					}
				} else {
					exprs.push(expression(5));
				}
				if (state.tokens.next.id !== ",") {
					break;
				}
				comma();
			}
		}

		advance(")", this);
		nospace(state.tokens.prev, state.tokens.curr);
		if (state.option.immed && exprs[0] && exprs[0].id === "function") {
			if (state.tokens.next.id !== "(" &&
			  (state.tokens.next.id !== "." || (peek().value !== "call" && peek().value !== "apply"))) {
				warning("W068", this);
			}
		}

		if (state.tokens.next.value === "=>") {
			return exprs;
		}
		if (!exprs.length) {
			return;
		}
		if (exprs.length > 1) {
			ret = Object.create(state.syntax[","]);
			ret.exprs = exprs;
		} else {
			ret = exprs[0];
		}
		if (ret) {
			ret.paren = true;
		}
		return ret;
	});

	application("=>");

	infix("[", function (left, that) {
		nobreak(state.tokens.prev, state.tokens.curr);
		nospace();
		var e = expression(5), s;
		if (e && e.type === "(string)") {
			if (!state.option.evil && (e.value === "eval" || e.value === "execScript")) {
				warning("W061", that);
			}

			countMember(e.value);
			if (!state.option.sub && reg.identifier.test(e.value)) {
				s = state.syntax[e.value];
				if (!s || !isReserved(s)) {
					warning("W069", state.tokens.prev, e.value);
				}
			}
		}
		advance("]", that);

		if (e && e.value === "hasOwnProperty" && state.tokens.next.value === "=") {
			warning("W001");
		}

		nospace(state.tokens.prev, state.tokens.curr);
		that.left = left;
		that.right = e;
		return that;
	}, 160, true);

	function comprehensiveArrayExpression() {
		var res = {};
		res.exps = true;
		funct["(comparray)"].stack();

		res.right = expression(5);
		advance("for");
		if (state.tokens.next.value === "each") {
			advance("each");
			if (!state.option.inMoz(true)) {
				warning("W118", state.tokens.curr, "for each");
			}
		}
		advance("(");
		funct["(comparray)"].setState("define");
		res.left = expression(5);
		advance(")");
		if (state.tokens.next.value === "if") {
			advance("if");
			advance("(");
			funct["(comparray)"].setState("filter");
			res.filter = expression(5);
			advance(")");
		}
		advance("]");
		funct["(comparray)"].unstack();
		return res;
	}

	prefix("[", function () {
		var blocktype = lookupBlockType(true);
		if (blocktype.isCompArray) {
			if (!state.option.inMoz(true)) {
				warning("W118", state.tokens.curr, "array comprehension");
			}
			return comprehensiveArrayExpression();
		} else if (blocktype.isDestAssign && !state.option.inESNext()) {
			warning("W104", state.tokens.curr, "destructuring assignment");
		}
		var b = state.tokens.curr.line !== state.tokens.next.line;
		this.first = [];
		if (b) {
			indent += state.option.indent;
			if (state.tokens.next.from === indent + state.option.indent) {
				indent += state.option.indent;
			}
		}
		while (state.tokens.next.id !== "(end)") {
			while (state.tokens.next.id === ",") {
				if (!state.option.inES5())
					warning("W070");
				advance(",");
			}
			if (state.tokens.next.id === "]") {
				break;
			}
			if (b && state.tokens.curr.line !== state.tokens.next.line) {
				indentation();
			}
			this.first.push(expression(10));
			if (state.tokens.next.id === ",") {
				comma({ allowTrailing: true });
				if (state.tokens.next.id === "]" && !state.option.inES5(true)) {
					warning("W070", state.tokens.curr);
					break;
				}
			} else {
				break;
			}
		}
		if (b) {
			indent -= state.option.indent;
			indentation();
		}
		advance("]", this);
		return this;
	}, 160);


	function property_name() {
		var id = optionalidentifier(false, true);

		if (!id) {
			if (state.tokens.next.id === "(string)") {
				id = state.tokens.next.value;
				advance();
			} else if (state.tokens.next.id === "(number)") {
				id = state.tokens.next.value.toString();
				advance();
			}
		}

		if (id === "hasOwnProperty") {
			warning("W001");
		}

		return id;
	}


	function functionparams(parsed) {
		var curr, next;
		var params = [];
		var ident;
		var tokens = [];
		var t;

		if (parsed) {
			if (parsed instanceof Array) {
				for (var i in parsed) {
					curr = parsed[i];
					if (_.contains(["{", "["], curr.id)) {
						for (t in curr.left) {
							t = tokens[t];
							if (t.id) {
								params.push(t.id);
								addlabel(t.id, "unused", t.token);
							}
						}
					} else if (curr.value === "...") {
						if (!state.option.inESNext()) {
							warning("W104", curr, "spread/rest operator");
						}
						continue;
					} else {
						addlabel(curr.value, "unused", curr);
					}
				}
				return params;
			} else {
				if (parsed.identifier === true) {
					addlabel(parsed.value, "unused", parsed);
					return [parsed];
				}
			}
		}

		next = state.tokens.next;

		advance("(");
		nospace();

		if (state.tokens.next.id === ")") {
			advance(")");
			return;
		}

		for (;;) {
			if (_.contains(["{", "["], state.tokens.next.id)) {
				tokens = destructuringExpression();
				for (t in tokens) {
					t = tokens[t];
					if (t.id) {
						params.push(t.id);
						addlabel(t.id, "unused", t.token);
					}
				}
			} else if (state.tokens.next.value === "...") {
				if (!state.option.inESNext()) {
					warning("W104", state.tokens.next, "spread/rest operator");
				}
				advance("...");
				nospace();
				ident = identifier(true);
				params.push(ident);
				addlabel(ident, "unused", state.tokens.curr);
			} else {
				ident = identifier(true);
				params.push(ident);
				addlabel(ident, "unused", state.tokens.curr);
			}
			if (state.tokens.next.id === ",") {
				comma();
			} else {
				advance(")", next);
				nospace(state.tokens.prev, state.tokens.curr);
				return params;
			}
		}
	}


	function doFunction(name, statement, generator, fatarrowparams) {
		var f;
		var oldOption = state.option;
		var oldIgnored = state.ignored;
		var oldScope  = scope;

		state.option = Object.create(state.option);
		state.ignored = Object.create(state.ignored);
		scope  = Object.create(scope);

		funct = {
			"(name)"      : name || "\"" + anonname + "\"",
			"(line)"      : state.tokens.next.line,
			"(character)" : state.tokens.next.character,
			"(context)"   : funct,
			"(breakage)"  : 0,
			"(loopage)"   : 0,
			"(metrics)"   : createMetrics(state.tokens.next),
			"(scope)"     : scope,
			"(statement)" : statement,
			"(tokens)"    : {},
			"(blockscope)": funct["(blockscope)"],
			"(comparray)" : funct["(comparray)"]
		};

		if (generator) {
			funct["(generator)"] = true;
		}

		f = funct;
		state.tokens.curr.funct = funct;

		functions.push(funct);

		if (name) {
			addlabel(name, "function");
		}

		funct["(params)"] = functionparams(fatarrowparams);

		funct["(metrics)"].verifyMaxParametersPerFunction(funct["(params)"]);

		block(false, true, true, fatarrowparams ? true:false);

		if (generator && funct["(generator)"] !== "yielded") {
			error("E047", state.tokens.curr);
		}

		funct["(metrics)"].verifyMaxStatementsPerFunction();
		funct["(metrics)"].verifyMaxComplexityPerFunction();
		funct["(unusedOption)"] = state.option.unused;

		scope = oldScope;
		state.option = oldOption;
		state.ignored = oldIgnored;
		funct["(last)"] = state.tokens.curr.line;
		funct["(lastcharacter)"] = state.tokens.curr.character;
		funct = funct["(context)"];

		return f;
	}

	function createMetrics(functionStartToken) {
		return {
			statementCount: 0,
			nestedBlockDepth: -1,
			ComplexityCount: 1,
			verifyMaxStatementsPerFunction: function () {
				if (state.option.maxstatements &&
					this.statementCount > state.option.maxstatements) {
					warning("W071", functionStartToken, this.statementCount);
				}
			},

			verifyMaxParametersPerFunction: function (params) {
				params = params || [];

				if (state.option.maxparams && params.length > state.option.maxparams) {
					warning("W072", functionStartToken, params.length);
				}
			},

			verifyMaxNestedBlockDepthPerFunction: function () {
				if (state.option.maxdepth &&
					this.nestedBlockDepth > 0 &&
					this.nestedBlockDepth === state.option.maxdepth + 1) {
					warning("W073", null, this.nestedBlockDepth);
				}
			},

			verifyMaxComplexityPerFunction: function () {
				var max = state.option.maxcomplexity;
				var cc = this.ComplexityCount;
				if (max && cc > max) {
					warning("W074", functionStartToken, cc);
				}
			}
		};
	}

	function increaseComplexityCount() {
		funct["(metrics)"].ComplexityCount += 1;
	}

	// Parse assignments that were found instead of conditionals.
	// For example: if (a = 1) { ... }

	function checkCondAssignment(expr) {
		var id, paren;
		if (expr) {
			id = expr.id;
			paren = expr.paren;
			if (id === "," && (expr = expr.exprs[expr.exprs.length - 1])) {
				id = expr.id;
				paren = paren || expr.paren;
			}
		}
		switch (id) {
		case "=":
		case "+=":
		case "-=":
		case "*=":
		case "%=":
		case "&=":
		case "|=":
		case "^=":
		case "/=":
			if (!paren && !state.option.boss) {
				warning("W084");
			}
		}
	}


	(function (x) {
		x.nud = function (isclassdef) {
			var b, f, i, p, t, g;
			var props = {}; // All properties, including accessors
			var tag = "";

			function saveProperty(name, tkn) {
				if (props[name] && _.has(props, name))
					warning("W075", state.tokens.next, i);
				else
					props[name] = {};

				props[name].basic = true;
				props[name].basictkn = tkn;
			}

			function saveSetter(name, tkn) {
				if (props[name] && _.has(props, name)) {
					if (props[name].basic || props[name].setter)
						warning("W075", state.tokens.next, i);
				} else {
					props[name] = {};
				}

				props[name].setter = true;
				props[name].setterToken = tkn;
			}

			function saveGetter(name) {
				if (props[name] && _.has(props, name)) {
					if (props[name].basic || props[name].getter)
						warning("W075", state.tokens.next, i);
				} else {
					props[name] = {};
				}

				props[name].getter = true;
				props[name].getterToken = state.tokens.curr;
			}

			b = state.tokens.curr.line !== state.tokens.next.line;
			if (b) {
				indent += state.option.indent;
				if (state.tokens.next.from === indent + state.option.indent) {
					indent += state.option.indent;
				}
			}

			for (;;) {
				if (state.tokens.next.id === "}") {
					break;
				}

				if (b) {
					indentation();
				}

				if (isclassdef && state.tokens.next.value === "static") {
					advance("static");
					tag = "static ";
				}

				if (state.tokens.next.value === "get" && peek().id !== ":") {
					advance("get");

					if (!state.option.inES5(!isclassdef)) {
						error("E034");
					}

					i = property_name();
					if (!i) {
						error("E035");
					}

					// It is a Syntax Error if PropName of MethodDefinition is
					// "constructor" and SpecialMethod of MethodDefinition is true.
					if (isclassdef && i === "constructor") {
						error("E049", state.tokens.next, "class getter method", i);
					}

					saveGetter(tag + i);
					t = state.tokens.next;
					adjacent(state.tokens.curr, state.tokens.next);
					f = doFunction();
					p = f["(params)"];

					if (p) {
						warning("W076", t, p[0], i);
					}

					adjacent(state.tokens.curr, state.tokens.next);
				} else if (state.tokens.next.value === "set" && peek().id !== ":") {
					advance("set");

					if (!state.option.inES5(!isclassdef)) {
						error("E034");
					}

					i = property_name();
					if (!i) {
						error("E035");
					}

					// It is a Syntax Error if PropName of MethodDefinition is
					// "constructor" and SpecialMethod of MethodDefinition is true.
					if (isclassdef && i === "constructor") {
						error("E049", state.tokens.next, "class setter method", i);
					}

					saveSetter(tag + i, state.tokens.next);
					t = state.tokens.next;
					adjacent(state.tokens.curr, state.tokens.next);
					f = doFunction();
					p = f["(params)"];

					if (!p || p.length !== 1) {
						warning("W077", t, i);
					}
				} else {
					g = false;
					if (state.tokens.next.value === "*" && state.tokens.next.type === "(punctuator)") {
						if (!state.option.inESNext()) {
							warning("W104", state.tokens.next, "generator functions");
						}
						advance("*");
						g = true;
					}
					i = property_name();
					saveProperty(tag + i, state.tokens.next);

					if (typeof i !== "string") {
						break;
					}

					if (state.tokens.next.value === "(") {
						if (!state.option.inESNext()) {
							warning("W104", state.tokens.curr, "concise methods");
						}
						doFunction(i, undefined, g);
					} else if (!isclassdef) {
						advance(":");
						nonadjacent(state.tokens.curr, state.tokens.next);
						expression(10);
					}
				}
				// It is a Syntax Error if PropName of MethodDefinition is "prototype".
				if (isclassdef && i === "prototype") {
					error("E049", state.tokens.next, "class method", i);
				}

				countMember(i);
				if (isclassdef) {
					tag = "";
					continue;
				}
				if (state.tokens.next.id === ",") {
					comma({ allowTrailing: true, property: true });
					if (state.tokens.next.id === ",") {
						warning("W070", state.tokens.curr);
					} else if (state.tokens.next.id === "}" && !state.option.inES5(true)) {
						warning("W070", state.tokens.curr);
					}
				} else {
					break;
				}
			}
			if (b) {
				indent -= state.option.indent;
				indentation();
			}
			advance("}", this);

			// Check for lonely setters if in the ES5 mode.
			if (state.option.inES5()) {
				for (var name in props) {
					if (_.has(props, name) && props[name].setter && !props[name].getter) {
						warning("W078", props[name].setterToken);
					}
				}
			}
			return this;
		};
		x.fud = function () {
			error("E036", state.tokens.curr);
		};
	}(delim("{")));

	function destructuringExpression() {
		var id, ids;
		var identifiers = [];
		if (!state.option.inESNext()) {
			warning("W104", state.tokens.curr, "destructuring expression");
		}
		var nextInnerDE = function () {
			var ident;
			if (_.contains(["[", "{"], state.tokens.next.value)) {
				ids = destructuringExpression();
				for (var id in ids) {
					id = ids[id];
					identifiers.push({ id: id.id, token: id.token });
				}
			} else if (state.tokens.next.value === ",") {
				identifiers.push({ id: null, token: state.tokens.curr });
			} else {
				ident = identifier();
				if (ident)
					identifiers.push({ id: ident, token: state.tokens.curr });
			}
		};
		if (state.tokens.next.value === "[") {
			advance("[");
			nextInnerDE();
			while (state.tokens.next.value !== "]") {
				advance(",");
				nextInnerDE();
			}
			advance("]");
		} else if (state.tokens.next.value === "{") {
			advance("{");
			id = identifier();
			if (state.tokens.next.value === ":") {
				advance(":");
				nextInnerDE();
			} else {
				identifiers.push({ id: id, token: state.tokens.curr });
			}
			while (state.tokens.next.value !== "}") {
				advance(",");
				id = identifier();
				if (state.tokens.next.value === ":") {
					advance(":");
					nextInnerDE();
				} else {
					identifiers.push({ id: id, token: state.tokens.curr });
				}
			}
			advance("}");
		}
		return identifiers;
	}
	function destructuringExpressionMatch(tokens, value) {
		if (value.first) {
			_.zip(tokens, value.first).forEach(function (val) {
				var token = val[0];
				var value = val[1];
				if (token && value) {
					token.first = value;
				} else if (token && token.first && !value) {
					warning("W080", token.first, token.first.value);
				} /* else {
					XXX value is discarded: wouldn't it need a warning ?
				} */
			});
		}
	}

	var conststatement = stmt("const", function (prefix) {
		var tokens, value;
		// state variable to know if it is a lone identifier, or a destructuring statement.
		var lone;

		if (!state.option.inESNext()) {
			warning("W104", state.tokens.curr, "const");
		}

		this.first = [];
		for (;;) {
			var names = [];
			nonadjacent(state.tokens.curr, state.tokens.next);
			if (_.contains(["{", "["], state.tokens.next.value)) {
				tokens = destructuringExpression();
				lone = false;
			} else {
				tokens = [ { id: identifier(), token: state.tokens.curr } ];
				lone = true;
			}
			for (var t in tokens) {
				t = tokens[t];
				if (funct[t.id] === "const") {
					warning("E011", null, t.id);
				}
				if (funct["(global)"] && predefined[t.id] === false) {
					warning("W079", t.token, t.id);
				}
				if (t.id) {
					addlabel(t.id, "const");
					names.push(t.token);
				}
			}
			if (prefix) {
				break;
			}

			this.first = this.first.concat(names);

			if (state.tokens.next.id !== "=") {
				warning("E012", state.tokens.curr, state.tokens.curr.value);
			}

			if (state.tokens.next.id === "=") {
				nonadjacent(state.tokens.curr, state.tokens.next);
				advance("=");
				nonadjacent(state.tokens.curr, state.tokens.next);
				if (state.tokens.next.id === "undefined") {
					warning("W080", state.tokens.prev, state.tokens.prev.value);
				}
				if (peek(0).id === "=" && state.tokens.next.identifier) {
					error("E037", state.tokens.next, state.tokens.next.value);
				}
				value = expression(5);
				if (lone) {
					tokens[0].first = value;
				} else {
					destructuringExpressionMatch(names, value);
				}
			}

			if (state.tokens.next.id !== ",") {
				break;
			}
			comma();
		}
		return this;
	});
	conststatement.exps = true;
	var varstatement = stmt("var", function (prefix) {
		// JavaScript does not have block scope. It only has function scope. So,
		// declaring a variable in a block can have unexpected consequences.
		var tokens, lone, value;

		if (funct["(onevar)"] && state.option.onevar) {
			warning("W081");
		} else if (!funct["(global)"]) {
			funct["(onevar)"] = true;
		}

		this.first = [];
		for (;;) {
			var names = [];
			nonadjacent(state.tokens.curr, state.tokens.next);
			if (_.contains(["{", "["], state.tokens.next.value)) {
				tokens = destructuringExpression();
				lone = false;
			} else {
				tokens = [ { id: identifier(), token: state.tokens.curr } ];
				lone = true;
			}
			for (var t in tokens) {
				t = tokens[t];
				if (state.option.inESNext() && funct[t.id] === "const") {
					warning("E011", null, t.id);
				}
				if (funct["(global)"] && predefined[t.id] === false) {
					warning("W079", t.token, t.id);
				}
				if (t.id) {
					addlabel(t.id, "unused", t.token);
					names.push(t.token);
				}
			}
			if (prefix) {
				break;
			}

			this.first = this.first.concat(names);

			if (state.tokens.next.id === "=") {
				nonadjacent(state.tokens.curr, state.tokens.next);
				advance("=");
				nonadjacent(state.tokens.curr, state.tokens.next);
				if (state.tokens.next.id === "undefined") {
					warning("W080", state.tokens.prev, state.tokens.prev.value);
				}
				if (peek(0).id === "=" && state.tokens.next.identifier) {
					error("E038", state.tokens.next, state.tokens.next.value);
				}
				value = expression(5);
				if (lone) {
					tokens[0].first = value;
				} else {
					destructuringExpressionMatch(names, value);
				}
			}

			if (state.tokens.next.id !== ",") {
				break;
			}
			comma();
		}
		return this;
	});
	varstatement.exps = true;
	var letstatement = stmt("let", function (prefix) {
		var tokens, lone, value, letblock;

		if (!state.option.inESNext()) {
			warning("W104", state.tokens.curr, "let");
		}

		if (state.tokens.next.value === "(") {
			if (!state.option.inMoz(true)) {
				warning("W118", state.tokens.next, "let block");
			}
			advance("(");
			funct["(blockscope)"].stack();
			letblock = true;
		} else if (funct["(nolet)"]) {
			error("E048", state.tokens.curr);
		}

		if (funct["(onevar)"] && state.option.onevar) {
			warning("W081");
		} else if (!funct["(global)"]) {
			funct["(onevar)"] = true;
		}

		this.first = [];
		for (;;) {
			var names = [];
			nonadjacent(state.tokens.curr, state.tokens.next);
			if (_.contains(["{", "["], state.tokens.next.value)) {
				tokens = destructuringExpression();
				lone = false;
			} else {
				tokens = [ { id: identifier(), token: state.tokens.curr.value } ];
				lone = true;
			}
			for (var t in tokens) {
				t = tokens[t];
				if (state.option.inESNext() && funct[t.id] === "const") {
					warning("E011", null, t.id);
				}
				if (funct["(global)"] && predefined[t.id] === false) {
					warning("W079", t.token, t.id);
				}
				if (t.id && !funct["(nolet)"]) {
					addlabel(t.id, "unused", t.token, true);
					names.push(t.token);
				}
			}
			if (prefix) {
				break;
			}

			this.first = this.first.concat(names);

			if (state.tokens.next.id === "=") {
				nonadjacent(state.tokens.curr, state.tokens.next);
				advance("=");
				nonadjacent(state.tokens.curr, state.tokens.next);
				if (state.tokens.next.id === "undefined") {
					warning("W080", state.tokens.prev, state.tokens.prev.value);
				}
				if (peek(0).id === "=" && state.tokens.next.identifier) {
					error("E037", state.tokens.next, state.tokens.next.value);
				}
				value = expression(5);
				if (lone) {
					tokens[0].first = value;
				} else {
					destructuringExpressionMatch(names, value);
				}
			}

			if (state.tokens.next.id !== ",") {
				break;
			}
			comma();
		}
		if (letblock) {
			advance(")");
			block(true, true);
			this.block = true;
			funct["(blockscope)"].unstack();
		}

		return this;
	});
	letstatement.exps = true;

	blockstmt("class", function () {
		return classdef.call(this, true);
	});

	function classdef(stmt) {
		/*jshint validthis:true */
		if (!state.option.inESNext()) {
			warning("W104", state.tokens.curr, "class");
		}
		if (stmt) {
			// BindingIdentifier
			this.name = identifier();
			addlabel(this.name, "unused", state.tokens.curr);
		} else if (state.tokens.next.identifier && state.tokens.next.value !== "extends") {
			// BindingIdentifier(opt)
			this.name = identifier();
		}
		classtail(this);
		return this;
	}

	function classtail(c) {
		var strictness = state.directive["use strict"];

		// ClassHeritage(opt)
		if (state.tokens.next.value === "extends") {
			advance("extends");
			c.heritage = expression(10);
		}

		// A ClassBody is always strict code.
		state.directive["use strict"] = true;
		advance("{");
		// ClassBody(opt)
		c.body = state.syntax["{"].nud(true);
		state.directive["use strict"] = strictness;
	}

	blockstmt("function", function () {
		var generator = false;
		if (state.tokens.next.value === "*") {
			advance("*");
			if (state.option.inESNext(true)) {
				generator = true;
			} else {
				warning("W119", state.tokens.curr, "function*");
			}
		}
		if (inblock) {
			warning("W082", state.tokens.curr);

		}
		var i = identifier();
		if (funct[i] === "const") {
			warning("E011", null, i);
		}
		adjacent(state.tokens.curr, state.tokens.next);
		addlabel(i, "unction", state.tokens.curr);

		doFunction(i, { statement: true }, generator);
		if (state.tokens.next.id === "(" && state.tokens.next.line === state.tokens.curr.line) {
			error("E039");
		}
		return this;
	});

	prefix("function", function () {
		var generator = false;
		if (state.tokens.next.value === "*") {
			if (!state.option.inESNext()) {
				warning("W119", state.tokens.curr, "function*");
			}
			advance("*");
			generator = true;
		}
		var i = optionalidentifier();
		if (i || state.option.gcl) {
			adjacent(state.tokens.curr, state.tokens.next);
		} else {
			nonadjacent(state.tokens.curr, state.tokens.next);
		}
		doFunction(i, undefined, generator);
		if (!state.option.loopfunc && funct["(loopage)"]) {
			warning("W083");
		}
		return this;
	});

	blockstmt("if", function () {
		var t = state.tokens.next;
		increaseComplexityCount();
		state.condition = true;
		advance("(");
		nonadjacent(this, t);
		nospace();
		checkCondAssignment(expression(0));
		advance(")", t);
		state.condition = false;
		nospace(state.tokens.prev, state.tokens.curr);
		block(true, true);
		if (state.tokens.next.id === "else") {
			nonadjacent(state.tokens.curr, state.tokens.next);
			advance("else");
			if (state.tokens.next.id === "if" || state.tokens.next.id === "switch") {
				statement(true);
			} else {
				block(true, true);
			}
		}
		return this;
	});

	blockstmt("try", function () {
		var b;

		function doCatch() {
			var oldScope = scope;
			var e;

			advance("catch");
			nonadjacent(state.tokens.curr, state.tokens.next);
			advance("(");

			scope = Object.create(oldScope);

			e = state.tokens.next.value;
			if (state.tokens.next.type !== "(identifier)") {
				e = null;
				warning("E030", state.tokens.next, e);
			}

			advance();

			funct = {
				"(name)"     : "(catch)",
				"(line)"     : state.tokens.next.line,
				"(character)": state.tokens.next.character,
				"(context)"  : funct,
				"(breakage)" : funct["(breakage)"],
				"(loopage)"  : funct["(loopage)"],
				"(scope)"    : scope,
				"(statement)": false,
				"(metrics)"  : createMetrics(state.tokens.next),
				"(catch)"    : true,
				"(tokens)"   : {},
				"(blockscope)": funct["(blockscope)"],
				"(comparray)": funct["(comparray)"]
			};

			if (e) {
				addlabel(e, "exception");
			}

			if (state.tokens.next.value === "if") {
				if (!state.option.inMoz(true)) {
					warning("W118", state.tokens.curr, "catch filter");
				}
				advance("if");
				expression(0);
			}

			advance(")");

			state.tokens.curr.funct = funct;
			functions.push(funct);

			block(false);

			scope = oldScope;

			funct["(last)"] = state.tokens.curr.line;
			funct["(lastcharacter)"] = state.tokens.curr.character;
			funct = funct["(context)"];
		}

		block(false);

		while (state.tokens.next.id === "catch") {
			increaseComplexityCount();
			if (b && (!state.option.inMoz(true))) {
				warning("W118", state.tokens.next, "multiple catch blocks");
			}
			doCatch();
			b = true;
		}

		if (state.tokens.next.id === "finally") {
			advance("finally");
			block(false);
			return;
		}

		if (!b) {
			error("E021", state.tokens.next, "catch", state.tokens.next.value);
		}

		return this;
	});

	blockstmt("while", function () {
		var t = state.tokens.next;
		funct["(breakage)"] += 1;
		funct["(loopage)"] += 1;
		increaseComplexityCount();
		advance("(");
		nonadjacent(this, t);
		nospace();
		checkCondAssignment(expression(0));
		advance(")", t);
		nospace(state.tokens.prev, state.tokens.curr);
		block(true, true);
		funct["(breakage)"] -= 1;
		funct["(loopage)"] -= 1;
		return this;
	}).labelled = true;

	blockstmt("with", function () {
		var t = state.tokens.next;
		if (state.directive["use strict"]) {
			error("E010", state.tokens.curr);
		} else if (!state.option.withstmt) {
			warning("W085", state.tokens.curr);
		}

		advance("(");
		nonadjacent(this, t);
		nospace();
		expression(0);
		advance(")", t);
		nospace(state.tokens.prev, state.tokens.curr);
		block(true, true);

		return this;
	});

	blockstmt("switch", function () {
		var t = state.tokens.next,
			g = false;
		funct["(breakage)"] += 1;
		advance("(");
		nonadjacent(this, t);
		nospace();
		checkCondAssignment(expression(0));
		advance(")", t);
		nospace(state.tokens.prev, state.tokens.curr);
		nonadjacent(state.tokens.curr, state.tokens.next);
		t = state.tokens.next;
		advance("{");
		nonadjacent(state.tokens.curr, state.tokens.next);
		indent += state.option.indent;
		this.cases = [];

		for (;;) {
			switch (state.tokens.next.id) {
			case "case":
				switch (funct["(verb)"]) {
				case "yield":
				case "break":
				case "case":
				case "continue":
				case "return":
				case "switch":
				case "throw":
					break;
				default:
					// You can tell JSHint that you don't use break intentionally by
					// adding a comment /* falls through */ on a line just before
					// the next `case`.
					if (!reg.fallsThrough.test(state.lines[state.tokens.next.line - 2])) {
						warning("W086", state.tokens.curr, "case");
					}
				}
				indentation(-state.option.indent);
				advance("case");
				this.cases.push(expression(20));
				increaseComplexityCount();
				g = true;
				advance(":");
				funct["(verb)"] = "case";
				break;
			case "default":
				switch (funct["(verb)"]) {
				case "yield":
				case "break":
				case "continue":
				case "return":
				case "throw":
					break;
				default:
					// Do not display a warning if 'default' is the first statement or if
					// there is a special /* falls through */ comment.
					if (this.cases.length) {
						if (!reg.fallsThrough.test(state.lines[state.tokens.next.line - 2])) {
							warning("W086", state.tokens.curr, "default");
						}
					}
				}
				indentation(-state.option.indent);
				advance("default");
				g = true;
				advance(":");
				break;
			case "}":
				indent -= state.option.indent;
				indentation();
				advance("}", t);
				funct["(breakage)"] -= 1;
				funct["(verb)"] = undefined;
				return;
			case "(end)":
				error("E023", state.tokens.next, "}");
				return;
			default:
				if (g) {
					switch (state.tokens.curr.id) {
					case ",":
						error("E040");
						return;
					case ":":
						g = false;
						statements();
						break;
					default:
						error("E025", state.tokens.curr);
						return;
					}
				} else {
					if (state.tokens.curr.id === ":") {
						advance(":");
						error("E024", state.tokens.curr, ":");
						statements();
					} else {
						error("E021", state.tokens.next, "case", state.tokens.next.value);
						return;
					}
				}
			}
		}
	}).labelled = true;

	stmt("debugger", function () {
		if (!state.option.debug) {
			warning("W087");
		}
		return this;
	}).exps = true;

	(function () {
		var x = stmt("do", function () {
			funct["(breakage)"] += 1;
			funct["(loopage)"] += 1;
			increaseComplexityCount();

			this.first = block(true, true);
			advance("while");
			var t = state.tokens.next;
			nonadjacent(state.tokens.curr, t);
			advance("(");
			nospace();
			checkCondAssignment(expression(0));
			advance(")", t);
			nospace(state.tokens.prev, state.tokens.curr);
			funct["(breakage)"] -= 1;
			funct["(loopage)"] -= 1;
			return this;
		});
		x.labelled = true;
		x.exps = true;
	}());

	blockstmt("for", function () {
		var s, t = state.tokens.next;
		var letscope = false;
		var foreachtok = null;

		if (t.value === "each") {
			foreachtok = t;
			advance("each");
			if (!state.option.inMoz(true)) {
				warning("W118", state.tokens.curr, "for each");
			}
		}

		funct["(breakage)"] += 1;
		funct["(loopage)"] += 1;
		increaseComplexityCount();
		advance("(");
		nonadjacent(this, t);
		nospace();

		// what kind of for(…) statement it is? for(…of…)? for(…in…)? for(…;…;…)?
		var nextop; // contains the token of the "in" or "of" operator
		var i = 0;
		var inof = ["in", "of"];
		do {
			nextop = peek(i);
			++i;
		} while (!_.contains(inof, nextop.value) && nextop.value !== ";" &&
					nextop.type !== "(end)");

		// if we're in a for (… in|of …) statement
		if (_.contains(inof, nextop.value)) {
			if (!state.option.inESNext() && nextop.value === "of") {
				error("W104", nextop, "for of");
			}
			if (state.tokens.next.id === "var") {
				advance("var");
				state.syntax["var"].fud.call(state.syntax["var"].fud, true);
			} else if (state.tokens.next.id === "let") {
				advance("let");
				// create a new block scope
				letscope = true;
				funct["(blockscope)"].stack();
				state.syntax["let"].fud.call(state.syntax["let"].fud, true);
			} else {
				switch (funct[state.tokens.next.value]) {
				case "unused":
					funct[state.tokens.next.value] = "var";
					break;
				case "var":
					break;
				default:
					if (!funct["(blockscope)"].getlabel(state.tokens.next.value))
						warning("W088", state.tokens.next, state.tokens.next.value);
				}
				advance();
			}
			advance(nextop.value);
			expression(20);
			advance(")", t);
			s = block(true, true);
			if (state.option.forin && s && (s.length > 1 || typeof s[0] !== "object" ||
					s[0].value !== "if")) {
				warning("W089", this);
			}
			funct["(breakage)"] -= 1;
			funct["(loopage)"] -= 1;
		} else {
			if (foreachtok) {
				error("E045", foreachtok);
			}
			if (state.tokens.next.id !== ";") {
				if (state.tokens.next.id === "var") {
					advance("var");
					state.syntax["var"].fud.call(state.syntax["var"].fud);
				} else if (state.tokens.next.id === "let") {
					advance("let");
					// create a new block scope
					letscope = true;
					funct["(blockscope)"].stack();
					state.syntax["let"].fud.call(state.syntax["let"].fud);
				} else {
					for (;;) {
						expression(0, "for");
						if (state.tokens.next.id !== ",") {
							break;
						}
						comma();
					}
				}
			}
			nolinebreak(state.tokens.curr);
			advance(";");
			if (state.tokens.next.id !== ";") {
				checkCondAssignment(expression(0));
			}
			nolinebreak(state.tokens.curr);
			advance(";");
			if (state.tokens.next.id === ";") {
				error("E021", state.tokens.next, ")", ";");
			}
			if (state.tokens.next.id !== ")") {
				for (;;) {
					expression(0, "for");
					if (state.tokens.next.id !== ",") {
						break;
					}
					comma();
				}
			}
			advance(")", t);
			nospace(state.tokens.prev, state.tokens.curr);
			block(true, true);
			funct["(breakage)"] -= 1;
			funct["(loopage)"] -= 1;

		}
		// unstack loop blockscope
		if (letscope) {
			funct["(blockscope)"].unstack();
		}
		return this;
	}).labelled = true;


	stmt("break", function () {
		var v = state.tokens.next.value;

		if (funct["(breakage)"] === 0)
			warning("W052", state.tokens.next, this.value);

		if (!state.option.asi)
			nolinebreak(this);

		if (state.tokens.next.id !== ";" && !state.tokens.next.reach) {
			if (state.tokens.curr.line === state.tokens.next.line) {
				if (funct[v] !== "label") {
					warning("W090", state.tokens.next, v);
				} else if (scope[v] !== funct) {
					warning("W091", state.tokens.next, v);
				}
				this.first = state.tokens.next;
				advance();
			}
		}
		reachable("break");
		return this;
	}).exps = true;


	stmt("continue", function () {
		var v = state.tokens.next.value;

		if (funct["(breakage)"] === 0)
			warning("W052", state.tokens.next, this.value);

		if (!state.option.asi)
			nolinebreak(this);

		if (state.tokens.next.id !== ";" && !state.tokens.next.reach) {
			if (state.tokens.curr.line === state.tokens.next.line) {
				if (funct[v] !== "label") {
					warning("W090", state.tokens.next, v);
				} else if (scope[v] !== funct) {
					warning("W091", state.tokens.next, v);
				}
				this.first = state.tokens.next;
				advance();
			}
		} else if (!funct["(loopage)"]) {
			warning("W052", state.tokens.next, this.value);
		}
		reachable("continue");
		return this;
	}).exps = true;


	stmt("return", function () {
		if (this.line === state.tokens.next.line) {
			if (state.tokens.next.id === "(regexp)")
				warning("W092");

			if (state.tokens.next.id !== ";" && !state.tokens.next.reach) {
				nonadjacent(state.tokens.curr, state.tokens.next);
				this.first = expression(0);

				if (this.first &&
						this.first.type === "(punctuator)" && this.first.value === "=" && !state.option.boss) {
					warningAt("W093", this.first.line, this.first.character);
				}
			}
		} else {
			if (state.tokens.next.type === "(punctuator)" &&
				["[", "{", "+", "-"].indexOf(state.tokens.next.value) > -1) {
				nolinebreak(this); // always warn (Line breaking error)
			}
		}
		reachable("return");
		return this;
	}).exps = true;

	stmt("yield", function () {
		if (state.option.inESNext(true) && funct["(generator)"] !== true) {
			error("E046", state.tokens.curr, "yield");
		} else if (!state.option.inESNext()) {
			warning("W104", state.tokens.curr, "yield");
		}
		funct["(generator)"] = "yielded";
		if (this.line === state.tokens.next.line) {
			if (state.tokens.next.id === "(regexp)")
				warning("W092");

			if (state.tokens.next.id !== ";" && !state.tokens.next.reach) {
				nonadjacent(state.tokens.curr, state.tokens.next);
				this.first = expression(0);

				if (this.first.type === "(punctuator)" && this.first.value === "=" && !state.option.boss) {
					warningAt("W093", this.first.line, this.first.character);
				}
			}
		} else if (!state.option.asi) {
			nolinebreak(this); // always warn (Line breaking error)
		}
		return this;
	}).exps = true;


	stmt("throw", function () {
		nolinebreak(this);
		nonadjacent(state.tokens.curr, state.tokens.next);
		this.first = expression(20);
		reachable("throw");
		return this;
	}).exps = true;

	// Future Reserved Words

	FutureReservedWord("abstract");
	FutureReservedWord("boolean");
	FutureReservedWord("byte");
	FutureReservedWord("char");
	FutureReservedWord("class", { es5: true, nud: classdef });
	FutureReservedWord("double");
	FutureReservedWord("enum", { es5: true });
	FutureReservedWord("export", { es5: true });
	FutureReservedWord("extends", { es5: true });
	FutureReservedWord("final");
	FutureReservedWord("float");
	FutureReservedWord("goto");
	FutureReservedWord("implements", { es5: true, strictOnly: true });
	FutureReservedWord("import", { es5: true });
	FutureReservedWord("int");
	FutureReservedWord("interface", { es5: true, strictOnly: true });
	FutureReservedWord("long");
	FutureReservedWord("native");
	FutureReservedWord("package", { es5: true, strictOnly: true });
	FutureReservedWord("private", { es5: true, strictOnly: true });
	FutureReservedWord("protected", { es5: true, strictOnly: true });
	FutureReservedWord("public", { es5: true, strictOnly: true });
	FutureReservedWord("short");
	FutureReservedWord("static", { es5: true, strictOnly: true });
	FutureReservedWord("super", { es5: true });
	FutureReservedWord("synchronized");
	FutureReservedWord("throws");
	FutureReservedWord("transient");
	FutureReservedWord("volatile");

	// this function is used to determine wether a squarebracket or a curlybracket
	// expression is a comprehension array, destructuring assignment or a json value.

	var lookupBlockType = function () {
		var pn, pn1;
		var i = 0;
		var bracketStack = 0;
		var ret = {};
		if (_.contains(["[", "{"], state.tokens.curr.value))
			bracketStack += 1;
		if (_.contains(["[", "{"], state.tokens.next.value))
			bracketStack += 1;
		if (_.contains(["]", "}"], state.tokens.next.value))
			bracketStack -= 1;
		do {
			pn = peek(i);
			pn1 = peek(i + 1);
			i = i + 1;
			if (_.contains(["[", "{"], pn.value)) {
				bracketStack += 1;
			} else if (_.contains(["]", "}"], pn.value)) {
				bracketStack -= 1;
			}
			if (pn.identifier && pn.value === "for" && bracketStack === 1) {
				ret.isCompArray = true;
				ret.notJson = true;
				break;
			}
			if (_.contains(["}", "]"], pn.value) && pn1.value === "=") {
				ret.isDestAssign = true;
				ret.notJson = true;
				break;
			}
			if (pn.value === ";") {
				ret.isBlock = true;
				ret.notJson = true;
			}
		} while (bracketStack > 0 && pn.id !== "(end)" && i < 15);
		return ret;
	};

	// Check whether this function has been reached for a destructuring assign with undeclared values
	function destructuringAssignOrJsonValue() {
		// lookup for the assignment (esnext only)
		// if it has semicolons, it is a block, so go parse it as a block
		// or it's not a block, but there are assignments, check for undeclared variables

		var block = lookupBlockType();
		if (block.notJson) {
			if (!state.option.inESNext() && block.isDestAssign) {
				warning("W104", state.tokens.curr, "destructuring assignment");
			}
			statements();
		// otherwise parse json value
		} else {
			state.option.laxbreak = true;
			state.jsonMode = true;
			jsonValue();
		}
	}

	// array comprehension parsing function
	// parses and defines the three states of the list comprehension in order
	// to avoid defining global variables, but keeping them to the list comprehension scope
	// only. The order of the states are as follows:
	//  * "use" which will be the returned iterative part of the list comprehension
	//  * "define" which will define the variables local to the list comprehension
	//  * "filter" which will help filter out values

	var arrayComprehension = function () {
		var CompArray = function () {
			this.mode = "use";
			this.variables = [];
		};
		var _carrays = [];
		var _current;
		function declare(v) {
			var l = _current.variables.filter(function (elt) {
				// if it has, change its undef state
				if (elt.value === v) {
					elt.undef = false;
					return v;
				}
			}).length;
			return l !== 0;
		}
		function use(v) {
			var l = _current.variables.filter(function (elt) {
				// and if it has been defined
				if (elt.value === v && !elt.undef) {
					if (elt.unused === true) {
						elt.unused = false;
					}
					return v;
				}
			}).length;
			// otherwise we warn about it
			return (l === 0);
		}
		return {stack: function () {
					_current = new CompArray();
					_carrays.push(_current);
				},
				unstack: function () {
					_current.variables.filter(function (v) {
						if (v.unused)
							warning("W098", v.token, v.value);
						if (v.undef)
							isundef(v.funct, "W117", v.token, v.value);
					});
					_carrays.splice(_carrays[_carrays.length - 1], 1);
					_current = _carrays[_carrays.length - 1];
				},
				setState: function (s) {
					if (_.contains(["use", "define", "filter"], s))
						_current.mode = s;
				},
				check: function (v) {
					// When we are in "use" state of the list comp, we enqueue that var
					if (_current && _current.mode === "use") {
						_current.variables.push({funct: funct,
													token: state.tokens.curr,
													value: v,
													undef: true,
													unused: false});
						return true;
					// When we are in "define" state of the list comp,
					} else if (_current && _current.mode === "define") {
						// check if the variable has been used previously
						if (!declare(v)) {
							_current.variables.push({funct: funct,
														token: state.tokens.curr,
														value: v,
														undef: false,
														unused: true});
						}
						return true;
					// When we are in "filter" state,
					} else if (_current && _current.mode === "filter") {
						// we check whether current variable has been declared
						if (use(v)) {
							// if not we warn about it
							isundef(funct, "W117", state.tokens.curr, v);
						}
						return true;
					}
					return false;
				}
				};
	};


	// Parse JSON

	function jsonValue() {

		function jsonObject() {
			var o = {}, t = state.tokens.next;
			advance("{");
			if (state.tokens.next.id !== "}") {
				for (;;) {
					if (state.tokens.next.id === "(end)") {
						error("E026", state.tokens.next, t.line);
					} else if (state.tokens.next.id === "}") {
						warning("W094", state.tokens.curr);
						break;
					} else if (state.tokens.next.id === ",") {
						error("E028", state.tokens.next);
					} else if (state.tokens.next.id !== "(string)") {
						warning("W095", state.tokens.next, state.tokens.next.value);
					}
					if (o[state.tokens.next.value] === true) {
						warning("W075", state.tokens.next, state.tokens.next.value);
					} else if ((state.tokens.next.value === "__proto__" &&
						!state.option.proto) || (state.tokens.next.value === "__iterator__" &&
						!state.option.iterator)) {
						warning("W096", state.tokens.next, state.tokens.next.value);
					} else {
						o[state.tokens.next.value] = true;
					}
					advance();
					advance(":");
					jsonValue();
					if (state.tokens.next.id !== ",") {
						break;
					}
					advance(",");
				}
			}
			advance("}");
		}

		function jsonArray() {
			var t = state.tokens.next;
			advance("[");
			if (state.tokens.next.id !== "]") {
				for (;;) {
					if (state.tokens.next.id === "(end)") {
						error("E027", state.tokens.next, t.line);
					} else if (state.tokens.next.id === "]") {
						warning("W094", state.tokens.curr);
						break;
					} else if (state.tokens.next.id === ",") {
						error("E028", state.tokens.next);
					}
					jsonValue();
					if (state.tokens.next.id !== ",") {
						break;
					}
					advance(",");
				}
			}
			advance("]");
		}

		switch (state.tokens.next.id) {
		case "{":
			jsonObject();
			break;
		case "[":
			jsonArray();
			break;
		case "true":
		case "false":
		case "null":
		case "(number)":
		case "(string)":
			advance();
			break;
		case "-":
			advance("-");
			if (state.tokens.curr.character !== state.tokens.next.from) {
				warning("W011", state.tokens.curr);
			}
			adjacent(state.tokens.curr, state.tokens.next);
			advance("(number)");
			break;
		default:
			error("E003", state.tokens.next);
		}
	}

	var blockScope = function () {
		var _current = {};
		var _variables = [_current];

		function _checkBlockLabels() {
			for (var t in _current) {
				if (_current[t]["(type)"] === "unused") {
					if (state.option.unused) {
						var tkn = _current[t]["(token)"];
						var line = tkn.line;
						var chr  = tkn.character;
						warningAt("W098", line, chr, t);
					}
				}
			}
		}

		return {
			stack: function () {
				_current = {};
				_variables.push(_current);
			},

			unstack: function () {
				_checkBlockLabels();
				_variables.splice(_variables.length - 1, 1);
				_current = _.last(_variables);
			},

			getlabel: function (l) {
				for (var i = _variables.length - 1 ; i >= 0; --i) {
					if (_.has(_variables[i], l)) {
						return _variables[i];
					}
				}
			},

			current: {
				has: function (t) {
					return _.has(_current, t);
				},
				add: function (t, type, tok) {
					_current[t] = { "(type)" : type,
									"(token)": tok };
				}
			}
		};
	};

	// The actual JSHINT function itself.
	var itself = function (s, o, g) {
		var i, k, x;
		var optionKeys;
		var newOptionObj = {};
		var newIgnoredObj = {};

		state.reset();

		if (o && o.scope) {
			JSHINT.scope = o.scope;
		} else {
			JSHINT.errors = [];
			JSHINT.undefs = [];
			JSHINT.internals = [];
			JSHINT.blacklist = {};
			JSHINT.scope = "(main)";
		}

		predefined = Object.create(null);
		combine(predefined, vars.ecmaIdentifiers);
		combine(predefined, vars.reservedVars);

		combine(predefined, g || {});

		declared = Object.create(null);
		exported = Object.create(null);

		function each(obj, cb) {
			if (!obj)
				return;

			if (!Array.isArray(obj) && typeof obj === "object")
				obj = Object.keys(obj);

			obj.forEach(cb);
		}

		if (o) {
			each(o.predef || null, function (item) {
				var slice, prop;

				if (item[0] === "-") {
					slice = item.slice(1);
					JSHINT.blacklist[slice] = slice;
				} else {
					prop = Object.getOwnPropertyDescriptor(o.predef, item);
					predefined[item] = prop ? prop.value : false;
				}
			});

			each(o.exported || null, function (item) {
				exported[item] = true;
			});

			delete o.predef;
			delete o.exported;

			optionKeys = Object.keys(o);
			for (x = 0; x < optionKeys.length; x++) {
				if (/^-W\d{3}$/g.test(optionKeys[x])) {
					newIgnoredObj[optionKeys[x].slice(1)] = true;
				} else {
					newOptionObj[optionKeys[x]] = o[optionKeys[x]];

					if (optionKeys[x] === "newcap" && o[optionKeys[x]] === false)
						newOptionObj["(explicitNewcap)"] = true;

					if (optionKeys[x] === "indent")
						newOptionObj["(explicitIndent)"] = o[optionKeys[x]] === false ? false : true;
				}
			}
		}

		state.option = newOptionObj;
		state.ignored = newIgnoredObj;

		state.option.indent = state.option.indent || 4;
		state.option.maxerr = state.option.maxerr || 50;

		indent = 1;
		global = Object.create(predefined);
		scope = global;
		funct = {
			"(global)":   true,
			"(name)":	  "(global)",
			"(scope)":	  scope,
			"(breakage)": 0,
			"(loopage)":  0,
			"(tokens)":   {},
			"(metrics)":   createMetrics(state.tokens.next),
			"(blockscope)": blockScope(),
			"(comparray)": arrayComprehension()
		};
		functions = [funct];
		urls = [];
		stack = null;
		member = {};
		membersOnly = null;
		implied = {};
		inblock = false;
		lookahead = [];
		warnings = 0;
		unuseds = [];

		if (!isString(s) && !Array.isArray(s)) {
			errorAt("E004", 0);
			return false;
		}

		api = {
			get isJSON() {
				return state.jsonMode;
			},

			getOption: function (name) {
				return state.option[name] || null;
			},

			getCache: function (name) {
				return state.cache[name];
			},

			setCache: function (name, value) {
				state.cache[name] = value;
			},

			warn: function (code, data) {
				warningAt.apply(null, [ code, data.line, data.char ].concat(data.data));
			},

			on: function (names, listener) {
				names.split(" ").forEach(function (name) {
					emitter.on(name, listener);
				}.bind(this));
			}
		};

		emitter.removeAllListeners();
		(extraModules || []).forEach(function (func) {
			func(api);
		});

		state.tokens.prev = state.tokens.curr = state.tokens.next = state.syntax["(begin)"];

		lex = new Lexer(s);

		lex.on("warning", function (ev) {
			warningAt.apply(null, [ ev.code, ev.line, ev.character].concat(ev.data));
		});

		lex.on("error", function (ev) {
			errorAt.apply(null, [ ev.code, ev.line, ev.character ].concat(ev.data));
		});

		lex.on("fatal", function (ev) {
			quit("E041", ev.line, ev.from);
		});

		lex.on("Identifier", function (ev) {
			emitter.emit("Identifier", ev);
		});

		lex.on("String", function (ev) {
			emitter.emit("String", ev);
		});

		lex.on("Number", function (ev) {
			emitter.emit("Number", ev);
		});

		lex.start();

		// Check options
		for (var name in o) {
			if (_.has(o, name)) {
				checkOption(name, state.tokens.curr);
			}
		}

		assume();

		// combine the passed globals after we've assumed all our options
		combine(predefined, g || {});

		//reset values
		comma.first = true;

		try {
			advance();
			switch (state.tokens.next.id) {
			case "{":
			case "[":
				destructuringAssignOrJsonValue();
				break;
			default:
				directives();

				if (state.directive["use strict"]) {
					if (!state.option.globalstrict && !state.option.node) {
						warning("W097", state.tokens.prev);
					}
				}

				statements();
			}
			advance((state.tokens.next && state.tokens.next.value !== ".")	? "(end)" : undefined);
			funct["(blockscope)"].unstack();

			var markDefined = function (name, context) {
				do {
					if (typeof context[name] === "string") {
						// JSHINT marks unused variables as 'unused' and
						// unused function declaration as 'unction'. This
						// code changes such instances back 'var' and
						// 'closure' so that the code in JSHINT.data()
						// doesn't think they're unused.

						if (context[name] === "unused")
							context[name] = "var";
						else if (context[name] === "unction")
							context[name] = "closure";

						return true;
					}

					context = context["(context)"];
				} while (context);

				return false;
			};

			var clearImplied = function (name, line) {
				if (!implied[name])
					return;

				var newImplied = [];
				for (var i = 0; i < implied[name].length; i += 1) {
					if (implied[name][i] !== line)
						newImplied.push(implied[name][i]);
				}

				if (newImplied.length === 0)
					delete implied[name];
				else
					implied[name] = newImplied;
			};

			var warnUnused = function (name, tkn, type, unused_opt) {
				var line = tkn.line;
				var chr  = tkn.character;

				if (unused_opt === undefined) {
					unused_opt = state.option.unused;
				}

				if (unused_opt === true) {
					unused_opt = "last-param";
				}

				var warnable_types = {
					"vars": ["var"],
					"last-param": ["var", "param"],
					"strict": ["var", "param", "last-param"]
				};

				if (unused_opt) {
					if (warnable_types[unused_opt] && warnable_types[unused_opt].indexOf(type) !== -1) {
						warningAt("W098", line, chr, name);
					}
				}

				unuseds.push({
					name: name,
					line: line,
					character: chr
				});
			};

			var checkUnused = function (func, key) {
				var type = func[key];
				var tkn = func["(tokens)"][key];

				if (key.charAt(0) === "(")
					return;

				if (type !== "unused" && type !== "unction")
					return;

				// Params are checked separately from other variables.
				if (func["(params)"] && func["(params)"].indexOf(key) !== -1)
					return;

				// Variable is in global scope and defined as exported.
				if (func["(global)"] && _.has(exported, key)) {
					return;
				}

				warnUnused(key, tkn, "var");
			};

			// Check queued 'x is not defined' instances to see if they're still undefined.
			for (i = 0; i < JSHINT.undefs.length; i += 1) {
				k = JSHINT.undefs[i].slice(0);

				if (markDefined(k[2].value, k[0])) {
					clearImplied(k[2].value, k[2].line);
				} else if (state.option.undef) {
					warning.apply(warning, k.slice(1));
				}
			}

			functions.forEach(function (func) {
				if (func["(unusedOption)"] === false) {
					return;
				}

				for (var key in func) {
					if (_.has(func, key)) {
						checkUnused(func, key);
					}
				}

				if (!func["(params)"])
					return;

				var params = func["(params)"].slice();
				var param  = params.pop();
				var type, unused_opt;

				while (param) {
					type = func[param];
					unused_opt = func["(unusedOption)"] || state.option.unused;
					unused_opt = unused_opt === true ? "last-param" : unused_opt;

					// 'undefined' is a special case for (function (window, undefined) { ... })();
					// patterns.

					if (param === "undefined")
						return;

					if (type === "unused" || type === "unction") {
						warnUnused(param, func["(tokens)"][param], "param", func["(unusedOption)"]);
					} else if (unused_opt === "last-param") {
						return;
					}

					param = params.pop();
				}
			});

			for (var key in declared) {
				if (_.has(declared, key) && !_.has(global, key)) {
					warnUnused(key, declared[key], "var");
				}
			}

		} catch (err) {
			if (err && err.name === "JSHintError") {
				var nt = state.tokens.next || {};
				JSHINT.errors.push({
					scope     : "(main)",
					raw       : err.raw,
					reason    : err.message,
					line      : err.line || nt.line,
					character : err.character || nt.from
				}, null);
			} else {
				throw err;
			}
		}

		// Loop over the listed "internals", and check them as well.

		if (JSHINT.scope === "(main)") {
			o = o || {};

			for (i = 0; i < JSHINT.internals.length; i += 1) {
				k = JSHINT.internals[i];
				o.scope = k.elem;
				itself(k.value, o, g);
			}
		}

		return JSHINT.errors.length === 0;
	};

	// Modules.
	itself.addModule = function (func) {
		extraModules.push(func);
	};

	itself.addModule(style.register);

	// Data summary.
	itself.data = function () {
		var data = {
			functions: [],
			options: state.option
		};
		var implieds = [];
		var members = [];
		var fu, f, i, j, n, globals;

		if (itself.errors.length) {
			data.errors = itself.errors;
		}

		if (state.jsonMode) {
			data.json = true;
		}

		for (n in implied) {
			if (_.has(implied, n)) {
				implieds.push({
					name: n,
					line: implied[n]
				});
			}
		}

		if (implieds.length > 0) {
			data.implieds = implieds;
		}

		if (urls.length > 0) {
			data.urls = urls;
		}

		globals = Object.keys(scope);
		if (globals.length > 0) {
			data.globals = globals;
		}

		for (i = 1; i < functions.length; i += 1) {
			f = functions[i];
			fu = {};

			for (j = 0; j < functionicity.length; j += 1) {
				fu[functionicity[j]] = [];
			}

			for (j = 0; j < functionicity.length; j += 1) {
				if (fu[functionicity[j]].length === 0) {
					delete fu[functionicity[j]];
				}
			}

			fu.name = f["(name)"];
			fu.param = f["(params)"];
			fu.line = f["(line)"];
			fu.character = f["(character)"];
			fu.last = f["(last)"];
			fu.lastcharacter = f["(lastcharacter)"];
			data.functions.push(fu);
		}

		if (unuseds.length > 0) {
			data.unused = unuseds;
		}

		members = [];
		for (n in member) {
			if (typeof member[n] === "number") {
				data.member = member;
				break;
			}
		}

		return data;
	};

	itself.jshint = itself;

	return itself;
}());

// Make JSHINT a Node module, if possible.
if (typeof exports === "object" && exports) {
	exports.JSHINT = JSHINT;
}

})()
},
{"events":2,"../shared/vars.js":3,"../shared/messages.js":10,"./lex.js":11,"./reg.js":4,"./state.js":5,"./style.js":6,"console-browserify":7,"underscore":12}],
10:[function(req,module,exports){
(function(){"use strict";

var _ = req("underscore");

var errors = {
	// JSHint options
	E001: "Bad option: '{a}'.",
	E002: "Bad option value.",

	// JSHint input
	E003: "Expected a JSON value.",
	E004: "Input is neither a string nor an array of strings.",
	E005: "Input is empty.",
	E006: "Unexpected early end of program.",

	// Strict mode
	E007: "Missing \"use strict\" statement.",
	E008: "Strict violation.",
	E009: "Option 'validthis' can't be used in a global scope.",
	E010: "'with' is not allowed in strict mode.",

	// Constants
	E011: "const '{a}' has already been declared.",
	E012: "const '{a}' is initialized to 'undefined'.",
	E013: "Attempting to override '{a}' which is a constant.",

	// Regular expressions
	E014: "A regular expression literal can be confused with '/='.",
	E015: "Unclosed regular expression.",
	E016: "Invalid regular expression.",

	// Tokens
	E017: "Unclosed comment.",
	E018: "Unbegun comment.",
	E019: "Unmatched '{a}'.",
	E020: "Expected '{a}' to match '{b}' from line {c} and instead saw '{d}'.",
	E021: "Expected '{a}' and instead saw '{b}'.",
	E022: "Line breaking error '{a}'.",
	E023: "Missing '{a}'.",
	E024: "Unexpected '{a}'.",
	E025: "Missing ':' on a case clause.",
	E026: "Missing '}' to match '{' from line {a}.",
	E027: "Missing ']' to match '[' form line {a}.",
	E028: "Illegal comma.",
	E029: "Unclosed string.",

	// Everything else
	E030: "Expected an identifier and instead saw '{a}'.",
	E031: "Bad assignment.", // FIXME: Rephrase
	E032: "Expected a small integer or 'false' and instead saw '{a}'.",
	E033: "Expected an operator and instead saw '{a}'.",
	E034: "get/set are ES5 features.",
	E035: "Missing property name.",
	E036: "Expected to see a statement and instead saw a block.",
	E037: "Constant {a} was not declared correctly.",
	E038: "Variable {a} was not declared correctly.",
	E039: "Function declarations are not invocable. Wrap the whole function invocation in parens.",
	E040: "Each value should have its own case label.",
	E041: "Unrecoverable syntax error.",
	E042: "Stopping.",
	E043: "Too many errors.",
	E044: "'{a}' is already defined and can't be redefined.",
	E045: "Invalid for each loop.",
	E046: "A yield statement shall be within a generator function (with syntax: `function*`)",
	E047: "A generator function shall contain a yield statement.",
	E048: "Let declaration not directly within block.",
	E049: "A {a} cannot be named '{b}'."
};

var warnings = {
	W001: "'hasOwnProperty' is a really bad name.",
	W002: "Value of '{a}' may be overwritten in IE 8 and earlier.",
	W003: "'{a}' was used before it was defined.",
	W004: "'{a}' is already defined.",
	W005: "A dot following a number can be confused with a decimal point.",
	W006: "Confusing minuses.",
	W007: "Confusing pluses.",
	W008: "A leading decimal point can be confused with a dot: '{a}'.",
	W009: "The array literal notation [] is preferrable.",
	W010: "The object literal notation {} is preferrable.",
	W011: "Unexpected space after '{a}'.",
	W012: "Unexpected space before '{a}'.",
	W013: "Missing space after '{a}'.",
	W014: "Bad line breaking before '{a}'.",
	W015: "Expected '{a}' to have an indentation at {b} instead at {c}.",
	W016: "Unexpected use of '{a}'.",
	W017: "Bad operand.",
	W018: "Confusing use of '{a}'.",
	W019: "Use the isNaN function to compare with NaN.",
	W020: "Read only.",
	W021: "'{a}' is a function.",
	W022: "Do not assign to the exception parameter.",
	W023: "Expected an identifier in an assignment and instead saw a function invocation.",
	W024: "Expected an identifier and instead saw '{a}' (a reserved word).",
	W025: "Missing name in function declaration.",
	W026: "Inner functions should be listed at the top of the outer function.",
	W027: "Unreachable '{a}' after '{b}'.",
	W028: "Label '{a}' on {b} statement.",
	W030: "Expected an assignment or function call and instead saw an expression.",
	W031: "Do not use 'new' for side effects.",
	W032: "Unnecessary semicolon.",
	W033: "Missing semicolon.",
	W034: "Unnecessary directive \"{a}\".",
	W035: "Empty block.",
	W036: "Unexpected /*member '{a}'.",
	W037: "'{a}' is a statement label.",
	W038: "'{a}' used out of scope.",
	W039: "'{a}' is not allowed.",
	W040: "Possible strict violation.",
	W041: "Use '{a}' to compare with '{b}'.",
	W042: "Avoid EOL escaping.",
	W043: "Bad escaping of EOL. Use option multistr if needed.",
	W044: "Bad or unnecessary escaping.",
	W045: "Bad number '{a}'.",
	W046: "Don't use extra leading zeros '{a}'.",
	W047: "A trailing decimal point can be confused with a dot: '{a}'.",
	W048: "Unexpected control character in regular expression.",
	W049: "Unexpected escaped character '{a}' in regular expression.",
	W050: "JavaScript URL.",
	W051: "Variables should not be deleted.",
	W052: "Unexpected '{a}'.",
	W053: "Do not use {a} as a constructor.",
	W054: "The Function constructor is a form of eval.",
	W055: "A constructor name should start with an uppercase letter.",
	W056: "Bad constructor.",
	W057: "Weird construction. Is 'new' unnecessary?",
	W058: "Missing '()' invoking a constructor.",
	W059: "Avoid arguments.{a}.",
	W060: "document.write can be a form of eval.",
	W061: "eval can be harmful.",
	W062: "Wrap an immediate function invocation in parens " +
		"to assist the reader in understanding that the expression " +
		"is the result of a function, and not the function itself.",
	W063: "Math is not a function.",
	W064: "Missing 'new' prefix when invoking a constructor.",
	W065: "Missing radix parameter.",
	W066: "Implied eval. Consider passing a function instead of a string.",
	W067: "Bad invocation.",
	W068: "Wrapping non-IIFE function literals in parens is unnecessary.",
	W069: "['{a}'] is better written in dot notation.",
	W070: "Extra comma. (it breaks older versions of IE)",
	W071: "This function has too many statements. ({a})",
	W072: "This function has too many parameters. ({a})",
	W073: "Blocks are nested too deeply. ({a})",
	W074: "This function's cyclomatic complexity is too high. ({a})",
	W075: "Duplicate key '{a}'.",
	W076: "Unexpected parameter '{a}' in get {b} function.",
	W077: "Expected a single parameter in set {a} function.",
	W078: "Setter is defined without getter.",
	W079: "Redefinition of '{a}'.",
	W080: "It's not necessary to initialize '{a}' to 'undefined'.",
	W081: "Too many var statements.",
	W082: "Function declarations should not be placed in blocks. " +
		"Use a function expression or move the statement to the top of " +
		"the outer function.",
	W083: "Don't make functions within a loop.",
	W084: "Assignment in conditional expression",
	W085: "Don't use 'with'.",
	W086: "Expected a 'break' statement before '{a}'.",
	W087: "Forgotten 'debugger' statement?",
	W088: "Creating global 'for' variable. Should be 'for (var {a} ...'.",
	W089: "The body of a for in should be wrapped in an if statement to filter " +
		"unwanted properties from the prototype.",
	W090: "'{a}' is not a statement label.",
	W091: "'{a}' is out of scope.",
	W092: "Wrap the /regexp/ literal in parens to disambiguate the slash operator.",
	W093: "Did you mean to return a conditional instead of an assignment?",
	W094: "Unexpected comma.",
	W095: "Expected a string and instead saw {a}.",
	W096: "The '{a}' key may produce unexpected results.",
	W097: "Use the function form of \"use strict\".",
	W098: "'{a}' is defined but never used.",
	W099: "Mixed spaces and tabs.",
	W100: "This character may get silently deleted by one or more browsers.",
	W101: "Line is too long.",
	W102: "Trailing whitespace.",
	W103: "The '{a}' property is deprecated.",
	W104: "'{a}' is only available in JavaScript 1.7.",
	W105: "Unexpected {a} in '{b}'.",
	W106: "Identifier '{a}' is not in camel case.",
	W107: "Script URL.",
	W108: "Strings must use doublequote.",
	W109: "Strings must use singlequote.",
	W110: "Mixed double and single quotes.",
	W112: "Unclosed string.",
	W113: "Control character in string: {a}.",
	W114: "Avoid {a}.",
	W115: "Octal literals are not allowed in strict mode.",
	W116: "Expected '{a}' and instead saw '{b}'.",
	W117: "'{a}' is not defined.",
	W118: "'{a}' is only available in Mozilla JavaScript extensions (use moz option).",
	W119: "'{a}' is only available in ES6 (use esnext option)."
};

var info = {
	I001: "Comma warnings can be turned off with 'laxcomma'.",
	I002: "Reserved words as properties can be used under the 'es5' option.",
	I003: "ES5 option is now set per default"
};

exports.errors = {};
exports.warnings = {};
exports.info = {};

_.each(errors, function (desc, code) {
	exports.errors[code] = { code: code, desc: desc };
});

_.each(warnings, function (desc, code) {
	exports.warnings[code] = { code: code, desc: desc };
});

_.each(info, function (desc, code) {
	exports.info[code] = { code: code, desc: desc };
});

})()
},
{"underscore":12}],
11:[function(req,module,exports){
(function(){/*
 * Lexical analysis and token construction.
 */

"use strict";

var _      = req("underscore");
var events = req("events");
var reg    = req("./reg.js");
var state  = req("./state.js").state;

// Some of these token types are from JavaScript Parser API
// while others are specific to JSHint parser.
// JS Parser API: https://developer.mozilla.org/en-US/docs/SpiderMonkey/Parser_API

var Token = {
	Identifier: 1,
	Punctuator: 2,
	NumericLiteral: 3,
	StringLiteral: 4,
	Comment: 5,
	Keyword: 6,
	NullLiteral: 7,
	BooleanLiteral: 8,
	RegExp: 9
};

// This is auto generated from the unicode tables.
// The tables are at:
// http://www.fileformat.info/info/unicode/category/Lu/list.htm
// http://www.fileformat.info/info/unicode/category/Ll/list.htm
// http://www.fileformat.info/info/unicode/category/Lt/list.htm
// http://www.fileformat.info/info/unicode/category/Lm/list.htm
// http://www.fileformat.info/info/unicode/category/Lo/list.htm
// http://www.fileformat.info/info/unicode/category/Nl/list.htm

var unicodeLetterTable = [
	170, 170, 181, 181, 186, 186, 192, 214,
	216, 246, 248, 705, 710, 721, 736, 740, 748, 748, 750, 750,
	880, 884, 886, 887, 890, 893, 902, 902, 904, 906, 908, 908,
	910, 929, 931, 1013, 1015, 1153, 1162, 1319, 1329, 1366,
	1369, 1369, 1377, 1415, 1488, 1514, 1520, 1522, 1568, 1610,
	1646, 1647, 1649, 1747, 1749, 1749, 1765, 1766, 1774, 1775,
	1786, 1788, 1791, 1791, 1808, 1808, 1810, 1839, 1869, 1957,
	1969, 1969, 1994, 2026, 2036, 2037, 2042, 2042, 2048, 2069,
	2074, 2074, 2084, 2084, 2088, 2088, 2112, 2136, 2308, 2361,
	2365, 2365, 2384, 2384, 2392, 2401, 2417, 2423, 2425, 2431,
	2437, 2444, 2447, 2448, 2451, 2472, 2474, 2480, 2482, 2482,
	2486, 2489, 2493, 2493, 2510, 2510, 2524, 2525, 2527, 2529,
	2544, 2545, 2565, 2570, 2575, 2576, 2579, 2600, 2602, 2608,
	2610, 2611, 2613, 2614, 2616, 2617, 2649, 2652, 2654, 2654,
	2674, 2676, 2693, 2701, 2703, 2705, 2707, 2728, 2730, 2736,
	2738, 2739, 2741, 2745, 2749, 2749, 2768, 2768, 2784, 2785,
	2821, 2828, 2831, 2832, 2835, 2856, 2858, 2864, 2866, 2867,
	2869, 2873, 2877, 2877, 2908, 2909, 2911, 2913, 2929, 2929,
	2947, 2947, 2949, 2954, 2958, 2960, 2962, 2965, 2969, 2970,
	2972, 2972, 2974, 2975, 2979, 2980, 2984, 2986, 2990, 3001,
	3024, 3024, 3077, 3084, 3086, 3088, 3090, 3112, 3114, 3123,
	3125, 3129, 3133, 3133, 3160, 3161, 3168, 3169, 3205, 3212,
	3214, 3216, 3218, 3240, 3242, 3251, 3253, 3257, 3261, 3261,
	3294, 3294, 3296, 3297, 3313, 3314, 3333, 3340, 3342, 3344,
	3346, 3386, 3389, 3389, 3406, 3406, 3424, 3425, 3450, 3455,
	3461, 3478, 3482, 3505, 3507, 3515, 3517, 3517, 3520, 3526,
	3585, 3632, 3634, 3635, 3648, 3654, 3713, 3714, 3716, 3716,
	3719, 3720, 3722, 3722, 3725, 3725, 3732, 3735, 3737, 3743,
	3745, 3747, 3749, 3749, 3751, 3751, 3754, 3755, 3757, 3760,
	3762, 3763, 3773, 3773, 3776, 3780, 3782, 3782, 3804, 3805,
	3840, 3840, 3904, 3911, 3913, 3948, 3976, 3980, 4096, 4138,
	4159, 4159, 4176, 4181, 4186, 4189, 4193, 4193, 4197, 4198,
	4206, 4208, 4213, 4225, 4238, 4238, 4256, 4293, 4304, 4346,
	4348, 4348, 4352, 4680, 4682, 4685, 4688, 4694, 4696, 4696,
	4698, 4701, 4704, 4744, 4746, 4749, 4752, 4784, 4786, 4789,
	4792, 4798, 4800, 4800, 4802, 4805, 4808, 4822, 4824, 4880,
	4882, 4885, 4888, 4954, 4992, 5007, 5024, 5108, 5121, 5740,
	5743, 5759, 5761, 5786, 5792, 5866, 5870, 5872, 5888, 5900,
	5902, 5905, 5920, 5937, 5952, 5969, 5984, 5996, 5998, 6000,
	6016, 6067, 6103, 6103, 6108, 6108, 6176, 6263, 6272, 6312,
	6314, 6314, 6320, 6389, 6400, 6428, 6480, 6509, 6512, 6516,
	6528, 6571, 6593, 6599, 6656, 6678, 6688, 6740, 6823, 6823,
	6917, 6963, 6981, 6987, 7043, 7072, 7086, 7087, 7104, 7141,
	7168, 7203, 7245, 7247, 7258, 7293, 7401, 7404, 7406, 7409,
	7424, 7615, 7680, 7957, 7960, 7965, 7968, 8005, 8008, 8013,
	8016, 8023, 8025, 8025, 8027, 8027, 8029, 8029, 8031, 8061,
	8064, 8116, 8118, 8124, 8126, 8126, 8130, 8132, 8134, 8140,
	8144, 8147, 8150, 8155, 8160, 8172, 8178, 8180, 8182, 8188,
	8305, 8305, 8319, 8319, 8336, 8348, 8450, 8450, 8455, 8455,
	8458, 8467, 8469, 8469, 8473, 8477, 8484, 8484, 8486, 8486,
	8488, 8488, 8490, 8493, 8495, 8505, 8508, 8511, 8517, 8521,
	8526, 8526, 8544, 8584, 11264, 11310, 11312, 11358,
	11360, 11492, 11499, 11502, 11520, 11557, 11568, 11621,
	11631, 11631, 11648, 11670, 11680, 11686, 11688, 11694,
	11696, 11702, 11704, 11710, 11712, 11718, 11720, 11726,
	11728, 11734, 11736, 11742, 11823, 11823, 12293, 12295,
	12321, 12329, 12337, 12341, 12344, 12348, 12353, 12438,
	12445, 12447, 12449, 12538, 12540, 12543, 12549, 12589,
	12593, 12686, 12704, 12730, 12784, 12799, 13312, 13312,
	19893, 19893, 19968, 19968, 40907, 40907, 40960, 42124,
	42192, 42237, 42240, 42508, 42512, 42527, 42538, 42539,
	42560, 42606, 42623, 42647, 42656, 42735, 42775, 42783,
	42786, 42888, 42891, 42894, 42896, 42897, 42912, 42921,
	43002, 43009, 43011, 43013, 43015, 43018, 43020, 43042,
	43072, 43123, 43138, 43187, 43250, 43255, 43259, 43259,
	43274, 43301, 43312, 43334, 43360, 43388, 43396, 43442,
	43471, 43471, 43520, 43560, 43584, 43586, 43588, 43595,
	43616, 43638, 43642, 43642, 43648, 43695, 43697, 43697,
	43701, 43702, 43705, 43709, 43712, 43712, 43714, 43714,
	43739, 43741, 43777, 43782, 43785, 43790, 43793, 43798,
	43808, 43814, 43816, 43822, 43968, 44002, 44032, 44032,
	55203, 55203, 55216, 55238, 55243, 55291, 63744, 64045,
	64048, 64109, 64112, 64217, 64256, 64262, 64275, 64279,
	64285, 64285, 64287, 64296, 64298, 64310, 64312, 64316,
	64318, 64318, 64320, 64321, 64323, 64324, 64326, 64433,
	64467, 64829, 64848, 64911, 64914, 64967, 65008, 65019,
	65136, 65140, 65142, 65276, 65313, 65338, 65345, 65370,
	65382, 65470, 65474, 65479, 65482, 65487, 65490, 65495,
	65498, 65500, 65536, 65547, 65549, 65574, 65576, 65594,
	65596, 65597, 65599, 65613, 65616, 65629, 65664, 65786,
	65856, 65908, 66176, 66204, 66208, 66256, 66304, 66334,
	66352, 66378, 66432, 66461, 66464, 66499, 66504, 66511,
	66513, 66517, 66560, 66717, 67584, 67589, 67592, 67592,
	67594, 67637, 67639, 67640, 67644, 67644, 67647, 67669,
	67840, 67861, 67872, 67897, 68096, 68096, 68112, 68115,
	68117, 68119, 68121, 68147, 68192, 68220, 68352, 68405,
	68416, 68437, 68448, 68466, 68608, 68680, 69635, 69687,
	69763, 69807, 73728, 74606, 74752, 74850, 77824, 78894,
	92160, 92728, 110592, 110593, 119808, 119892, 119894, 119964,
	119966, 119967, 119970, 119970, 119973, 119974, 119977, 119980,
	119982, 119993, 119995, 119995, 119997, 120003, 120005, 120069,
	120071, 120074, 120077, 120084, 120086, 120092, 120094, 120121,
	120123, 120126, 120128, 120132, 120134, 120134, 120138, 120144,
	120146, 120485, 120488, 120512, 120514, 120538, 120540, 120570,
	120572, 120596, 120598, 120628, 120630, 120654, 120656, 120686,
	120688, 120712, 120714, 120744, 120746, 120770, 120772, 120779,
	131072, 131072, 173782, 173782, 173824, 173824, 177972, 177972,
	177984, 177984, 178205, 178205, 194560, 195101
];

var identifierStartTable = [];

for (var i = 0; i < 128; i++) {
	identifierStartTable[i] =
		i === 36 ||           // $
		i >= 65 && i <= 90 || // A-Z
		i === 95 ||           // _
		i >= 97 && i <= 122;  // a-z
}

var identifierPartTable = [];

for (var i = 0; i < 128; i++) {
	identifierPartTable[i] =
		identifierStartTable[i] || // $, _, A-Z, a-z
		i >= 48 && i <= 57;        // 0-9
}

// Object that handles postponed lexing verifications that checks the parsed
// environment state.

function asyncTrigger() {
	var _checks = [];

	return {
		push: function (fn) {
			_checks.push(fn);
		},

		check: function () {
			for (var check = 0; check < _checks.length; ++check) {
				_checks[check]();
			}

			_checks.splice(0, _checks.length);
		}
	};
}

/*
 * Lexer for JSHint.
 *
 * This object does a char-by-char scan of the provided source code
 * and produces a sequence of tokens.
 *
 *   var lex = new Lexer("var i = 0;");
 *   lex.start();
 *   lex.token(); // returns the next token
 *
 * You have to use the token() method to move the lexer forward
 * but you don't have to use its return value to get tokens. In addition
 * to token() method returning the next token, the Lexer object also
 * emits events.
 *
 *   lex.on("Identifier", function (data) {
 *     if (data.name.indexOf("_") >= 0) {
 *       // Produce a warning.
 *     }
 *   });
 *
 * Note that the token() method returns tokens in a JSLint-compatible
 * format while the event emitter uses a slightly modified version of
 * Mozilla's JavaScript Parser API. Eventually, we will move away from
 * JSLint format.
 */
function Lexer(source) {
	var lines = source;

	if (typeof lines === "string") {
		lines = lines
			.replace(/\r\n/g, "\n")
			.replace(/\r/g, "\n")
			.split("\n");
	}

	// If the first line is a shebang (#!), make it a blank and move on.
	// Shebangs are used by Node scripts.

	if (lines[0] && lines[0].substr(0, 2) === "#!") {
		lines[0] = "";
	}

	this.emitter = new events.EventEmitter();
	this.source = source;
	this.setLines(lines);
	this.prereg = true;

	this.line = 0;
	this.char = 1;
	this.from = 1;
	this.input = "";

	for (var i = 0; i < state.option.indent; i += 1) {
		state.tab += " ";
	}
}

Lexer.prototype = {
	_lines: [],

	getLines: function () {
		this._lines = state.lines;
		return this._lines;
	},

	setLines: function (val) {
		this._lines = val;
		state.lines = this._lines;
	},

	/*
	 * Return the next i character without actually moving the
	 * char pointer.
	 */
	peek: function (i) {
		return this.input.charAt(i || 0);
	},

	/*
	 * Move the char pointer forward i times.
	 */
	skip: function (i) {
		i = i || 1;
		this.char += i;
		this.input = this.input.slice(i);
	},

	/*
	 * Subscribe to a token event. The API for this method is similar
	 * Underscore.js i.e. you can subscribe to multiple events with
	 * one call:
	 *
	 *   lex.on("Identifier Number", function (data) {
	 *     // ...
	 *   });
	 */
	on: function (names, listener) {
		names.split(" ").forEach(function (name) {
			this.emitter.on(name, listener);
		}.bind(this));
	},

	/*
	 * Trigger a token event. All arguments will be passed to each
	 * listener.
	 */
	trigger: function () {
		this.emitter.emit.apply(this.emitter, Array.prototype.slice.call(arguments));
	},

	/*
	 * Postpone a token event. the checking condition is set as
	 * last parameter, and the trigger function is called in a
	 * stored callback. To be later called using the check() function
	 * by the parser. This avoids parser's peek() to give the lexer
	 * a false context.
	 */
	triggerAsync: function (type, args, checks, fn) {
		checks.push(function () {
			if (fn()) {
				this.trigger(type, args);
			}
		}.bind(this));
	},

	/*
	 * Extract a punctuator out of the next sequence of characters
	 * or return 'null' if its not possible.
	 *
	 * This method's implementation was heavily influenced by the
	 * scanPunctuator function in the Esprima parser's source code.
	 */
	scanPunctuator: function () {
		var ch1 = this.peek();
		var ch2, ch3, ch4;

		switch (ch1) {
		// Most common single-character punctuators
		case ".":
			if ((/^[0-9]$/).test(this.peek(1))) {
				return null;
			}
			if (this.peek(1) === "." && this.peek(2) === ".") {
				return {
					type: Token.Punctuator,
					value: "..."
				};
			}
			/* falls through */
		case "(":
		case ")":
		case ";":
		case ",":
		case "{":
		case "}":
		case "[":
		case "]":
		case ":":
		case "~":
		case "?":
			return {
				type: Token.Punctuator,
				value: ch1
			};

		// A pound sign (for Node shebangs)
		case "#":
			return {
				type: Token.Punctuator,
				value: ch1
			};

		// We're at the end of input
		case "":
			return null;
		}

		// Peek more characters

		ch2 = this.peek(1);
		ch3 = this.peek(2);
		ch4 = this.peek(3);

		// 4-character punctuator: >>>=

		if (ch1 === ">" && ch2 === ">" && ch3 === ">" && ch4 === "=") {
			return {
				type: Token.Punctuator,
				value: ">>>="
			};
		}

		// 3-character punctuators: === !== >>> <<= >>=

		if (ch1 === "=" && ch2 === "=" && ch3 === "=") {
			return {
				type: Token.Punctuator,
				value: "==="
			};
		}

		if (ch1 === "!" && ch2 === "=" && ch3 === "=") {
			return {
				type: Token.Punctuator,
				value: "!=="
			};
		}

		if (ch1 === ">" && ch2 === ">" && ch3 === ">") {
			return {
				type: Token.Punctuator,
				value: ">>>"
			};
		}

		if (ch1 === "<" && ch2 === "<" && ch3 === "=") {
			return {
				type: Token.Punctuator,
				value: "<<="
			};
		}

		if (ch1 === ">" && ch2 === ">" && ch3 === "=") {
			return {
				type: Token.Punctuator,
				value: ">>="
			};
		}

		// Fat arrow punctuator
		if (ch1 === "=" && ch2 === ">") {
			return {
				type: Token.Punctuator,
				value: ch1 + ch2
			};
		}

		// 2-character punctuators: <= >= == != ++ -- << >> && ||
		// += -= *= %= &= |= ^= (but not /=, see below)
		if (ch1 === ch2 && ("+-<>&|".indexOf(ch1) >= 0)) {
			return {
				type: Token.Punctuator,
				value: ch1 + ch2
			};
		}

		if ("<>=!+-*%&|^".indexOf(ch1) >= 0) {
			if (ch2 === "=") {
				return {
					type: Token.Punctuator,
					value: ch1 + ch2
				};
			}

			return {
				type: Token.Punctuator,
				value: ch1
			};
		}

		// Special case: /=. We need to make sure that this is an
		// operator and not a regular expression.

		if (ch1 === "/") {
			if (ch2 === "=" && /\/=(?!(\S*\/[gim]?))/.test(this.input)) {
				// /= is not a part of a regular expression, return it as a
				// punctuator.
				return {
					type: Token.Punctuator,
					value: "/="
				};
			}

			return {
				type: Token.Punctuator,
				value: "/"
			};
		}

		return null;
	},

	/*
	 * Extract a comment out of the next sequence of characters and/or
	 * lines or return 'null' if its not possible. Since comments can
	 * span across multiple lines this method has to move the char
	 * pointer.
	 *
	 * In addition to normal JavaScript comments (// and /*) this method
	 * also recognizes JSHint- and JSLint-specific comments such as
	 * /*jshint, /*jslint, /*globals and so on.
	 */
	scanComments: function () {
		var ch1 = this.peek();
		var ch2 = this.peek(1);
		var rest = this.input.substr(2);
		var startLine = this.line;
		var startChar = this.char;

		// Create a comment token object and make sure it
		// has all the data JSHint needs to work with special
		// comments.

		function commentToken(label, body, opt) {
			var special = ["jshint", "jslint", "members", "member", "globals", "global", "exported"];
			var isSpecial = false;
			var value = label + body;
			var commentType = "plain";
			opt = opt || {};

			if (opt.isMultiline) {
				value += "*/";
			}

			special.forEach(function (str) {
				if (isSpecial) {
					return;
				}

				// Don't recognize any special comments other than jshint for single-line
				// comments. This introduced many problems with legit comments.
				if (label === "//" && str !== "jshint") {
					return;
				}

				if (body.substr(0, str.length) === str) {
					isSpecial = true;
					label = label + str;
					body = body.substr(str.length);
				}

				if (!isSpecial && body.charAt(0) === " " && body.substr(1, str.length) === str) {
					isSpecial = true;
					label = label + " " + str;
					body = body.substr(str.length + 1);
				}

				if (!isSpecial) {
					return;
				}

				switch (str) {
				case "member":
					commentType = "members";
					break;
				case "global":
					commentType = "globals";
					break;
				default:
					commentType = str;
				}
			});

			return {
				type: Token.Comment,
				commentType: commentType,
				value: value,
				body: body,
				isSpecial: isSpecial,
				isMultiline: opt.isMultiline || false,
				isMalformed: opt.isMalformed || false
			};
		}

		// End of unbegun comment. Raise an error and skip that input.
		if (ch1 === "*" && ch2 === "/") {
			this.trigger("error", {
				code: "E018",
				line: startLine,
				character: startChar
			});

			this.skip(2);
			return null;
		}

		// Comments must start either with // or /*
		if (ch1 !== "/" || (ch2 !== "*" && ch2 !== "/")) {
			return null;
		}

		// One-line comment
		if (ch2 === "/") {
			this.skip(this.input.length); // Skip to the EOL.
			return commentToken("//", rest);
		}

		var body = "";

		/* Multi-line comment */
		if (ch2 === "*") {
			this.skip(2);

			while (this.peek() !== "*" || this.peek(1) !== "/") {
				if (this.peek() === "") { // End of Line
					body += "\n";

					// If we hit EOF and our comment is still unclosed,
					// trigger an error and end the comment implicitly.
					if (!this.nextLine()) {
						this.trigger("error", {
							code: "E017",
							line: startLine,
							character: startChar
						});

						return commentToken("/*", body, {
							isMultiline: true,
							isMalformed: true
						});
					}
				} else {
					body += this.peek();
					this.skip();
				}
			}

			this.skip(2);
			return commentToken("/*", body, { isMultiline: true });
		}
	},

	/*
	 * Extract a keyword out of the next sequence of characters or
	 * return 'null' if its not possible.
	 */
	scanKeyword: function () {
		var result = /^[a-zA-Z_$][a-zA-Z0-9_$]*/.exec(this.input);
		var keywords = [
			"if", "in", "do", "var", "for", "new",
			"try", "let", "this", "else", "case",
			"void", "with", "enum", "while", "break",
			"catch", "throw", "const", "yield", "class",
			"super", "return", "typeof", "delete",
			"switch", "export", "import", "default",
			"finally", "extends", "function", "continue",
			"debugger", "instanceof"
		];

		if (result && keywords.indexOf(result[0]) >= 0) {
			return {
				type: Token.Keyword,
				value: result[0]
			};
		}

		return null;
	},

	/*
	 * Extract a JavaScript identifier out of the next sequence of
	 * characters or return 'null' if its not possible. In addition,
	 * to Identifier this method can also produce BooleanLiteral
	 * (true/false) and NullLiteral (null).
	 */
	scanIdentifier: function () {
		var id = "";
		var index = 0;
		var type, char;

		// Detects any character in the Unicode categories "Uppercase
		// letter (Lu)", "Lowercase letter (Ll)", "Titlecase letter
		// (Lt)", "Modifier letter (Lm)", "Other letter (Lo)", or
		// "Letter number (Nl)".
		//
		// Both approach and unicodeLetterTable were borrowed from
		// Google's Traceur.

		function isUnicodeLetter(code) {
			for (var i = 0; i < unicodeLetterTable.length;) {
				if (code < unicodeLetterTable[i++]) {
					return false;
				}

				if (code <= unicodeLetterTable[i++]) {
					return true;
				}
			}

			return false;
		}

		function isHexDigit(str) {
			return (/^[0-9a-fA-F]$/).test(str);
		}

		var readUnicodeEscapeSequence = function () {
			/*jshint validthis:true */
			index += 1;

			if (this.peek(index) !== "u") {
				return null;
			}

			var ch1 = this.peek(index + 1);
			var ch2 = this.peek(index + 2);
			var ch3 = this.peek(index + 3);
			var ch4 = this.peek(index + 4);
			var code;

			if (isHexDigit(ch1) && isHexDigit(ch2) && isHexDigit(ch3) && isHexDigit(ch4)) {
				code = parseInt(ch1 + ch2 + ch3 + ch4, 16);

				if (isUnicodeLetter(code)) {
					index += 5;
					return "\\u" + ch1 + ch2 + ch3 + ch4;
				}

				return null;
			}

			return null;
		}.bind(this);

		var getIdentifierStart = function () {
			/*jshint validthis:true */
			var chr = this.peek(index);
			var code = chr.charCodeAt(0);

			if (code === 92) {
				return readUnicodeEscapeSequence();
			}

			if (code < 128) {
				if (identifierStartTable[code]) {
					index += 1;
					return chr;
				}

				return null;
			}

			if (isUnicodeLetter(code)) {
				index += 1;
				return chr;
			}

			return null;
		}.bind(this);

		var getIdentifierPart = function () {
			/*jshint validthis:true */
			var chr = this.peek(index);
			var code = chr.charCodeAt(0);

			if (code === 92) {
				return readUnicodeEscapeSequence();
			}

			if (code < 128) {
				if (identifierPartTable[code]) {
					index += 1;
					return chr;
				}

				return null;
			}

			if (isUnicodeLetter(code)) {
				index += 1;
				return chr;
			}

			return null;
		}.bind(this);

		char = getIdentifierStart();
		if (char === null) {
			return null;
		}

		id = char;
		for (;;) {
			char = getIdentifierPart();

			if (char === null) {
				break;
			}

			id += char;
		}

		switch (id) {
		case "true":
		case "false":
			type = Token.BooleanLiteral;
			break;
		case "null":
			type = Token.NullLiteral;
			break;
		default:
			type = Token.Identifier;
		}

		return {
			type: type,
			value: id
		};
	},

	/*
	 * Extract a numeric literal out of the next sequence of
	 * characters or return 'null' if its not possible. This method
	 * supports all numeric literals described in section 7.8.3
	 * of the EcmaScript 5 specification.
	 *
	 * This method's implementation was heavily influenced by the
	 * scanNumericLiteral function in the Esprima parser's source code.
	 */
	scanNumericLiteral: function () {
		var index = 0;
		var value = "";
		var length = this.input.length;
		var char = this.peek(index);
		var bad;

		function isDecimalDigit(str) {
			return (/^[0-9]$/).test(str);
		}

		function isOctalDigit(str) {
			return (/^[0-7]$/).test(str);
		}

		function isHexDigit(str) {
			return (/^[0-9a-fA-F]$/).test(str);
		}

		function isIdentifierStart(ch) {
			return (ch === "$") || (ch === "_") || (ch === "\\") ||
				(ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z");
		}

		// Numbers must start either with a decimal digit or a point.

		if (char !== "." && !isDecimalDigit(char)) {
			return null;
		}

		if (char !== ".") {
			value = this.peek(index);
			index += 1;
			char = this.peek(index);

			if (value === "0") {
				// Base-16 numbers.
				if (char === "x" || char === "X") {
					index += 1;
					value += char;

					while (index < length) {
						char = this.peek(index);
						if (!isHexDigit(char)) {
							break;
						}
						value += char;
						index += 1;
					}

					if (value.length <= 2) { // 0x
						return {
							type: Token.NumericLiteral,
							value: value,
							isMalformed: true
						};
					}

					if (index < length) {
						char = this.peek(index);
						if (isIdentifierStart(char)) {
							return null;
						}
					}

					return {
						type: Token.NumericLiteral,
						value: value,
						base: 16,
						isMalformed: false
					};
				}

				// Base-8 numbers.
				if (isOctalDigit(char)) {
					index += 1;
					value += char;
					bad = false;

					while (index < length) {
						char = this.peek(index);

						// Numbers like '019' (note the 9) are not valid octals
						// but we still parse them and mark as malformed.

						if (isDecimalDigit(char)) {
							bad = true;
						} else if (!isOctalDigit(char)) {
							break;
						}
						value += char;
						index += 1;
					}

					if (index < length) {
						char = this.peek(index);
						if (isIdentifierStart(char)) {
							return null;
						}
					}

					return {
						type: Token.NumericLiteral,
						value: value,
						base: 8,
						isMalformed: false
					};
				}

				// Decimal numbers that start with '0' such as '09' are illegal
				// but we still parse them and return as malformed.

				if (isDecimalDigit(char)) {
					index += 1;
					value += char;
				}
			}

			while (index < length) {
				char = this.peek(index);
				if (!isDecimalDigit(char)) {
					break;
				}
				value += char;
				index += 1;
			}
		}

		// Decimal digits.

		if (char === ".") {
			value += char;
			index += 1;

			while (index < length) {
				char = this.peek(index);
				if (!isDecimalDigit(char)) {
					break;
				}
				value += char;
				index += 1;
			}
		}

		// Exponent part.

		if (char === "e" || char === "E") {
			value += char;
			index += 1;
			char = this.peek(index);

			if (char === "+" || char === "-") {
				value += this.peek(index);
				index += 1;
			}

			char = this.peek(index);
			if (isDecimalDigit(char)) {
				value += char;
				index += 1;

				while (index < length) {
					char = this.peek(index);
					if (!isDecimalDigit(char)) {
						break;
					}
					value += char;
					index += 1;
				}
			} else {
				return null;
			}
		}

		if (index < length) {
			char = this.peek(index);
			if (isIdentifierStart(char)) {
				return null;
			}
		}

		return {
			type: Token.NumericLiteral,
			value: value,
			base: 10,
			isMalformed: !isFinite(value)
		};
	},

	/*
	 * Extract a string out of the next sequence of characters and/or
	 * lines or return 'null' if its not possible. Since strings can
	 * span across multiple lines this method has to move the char
	 * pointer.
	 *
	 * This method recognizes pseudo-multiline JavaScript strings:
	 *
	 *   var str = "hello\
	 *   world";
	 */
	scanStringLiteral: function (checks) {
		/*jshint loopfunc:true */
		var quote = this.peek();

		// String must start with a quote.
		if (quote !== "\"" && quote !== "'") {
			return null;
		}

		// In JSON strings must always use double quotes.
		this.triggerAsync("warning", {
			code: "W108",
			line: this.line,
			character: this.char // +1?
		}, checks, function () { return state.jsonMode && quote !== "\""; });

		var value = "";
		var startLine = this.line;
		var startChar = this.char;
		var allowNewLine = false;

		this.skip();

		while (this.peek() !== quote) {
			while (this.peek() === "") { // End Of Line

				// If an EOL is not preceded by a backslash, show a warning
				// and proceed like it was a legit multi-line string where
				// author simply forgot to escape the newline symbol.
				//
				// Another approach is to implicitly close a string on EOL
				// but it generates too many false positives.

				if (!allowNewLine) {
					this.trigger("warning", {
						code: "W112",
						line: this.line,
						character: this.char
					});
				} else {
					allowNewLine = false;

					// Otherwise show a warning if multistr option was not set.
					// For JSON, show warning no matter what.

					this.triggerAsync("warning", {
						code: "W043",
						line: this.line,
						character: this.char
					}, checks, function () { return !state.option.multistr; });

					this.triggerAsync("warning", {
						code: "W042",
						line: this.line,
						character: this.char
					}, checks, function () { return state.jsonMode && state.option.multistr; });
				}

				// If we get an EOF inside of an unclosed string, show an
				// error and implicitly close it at the EOF point.

				if (!this.nextLine()) {
					this.trigger("error", {
						code: "E029",
						line: startLine,
						character: startChar
					});

					return {
						type: Token.StringLiteral,
						value: value,
						isUnclosed: true,
						quote: quote
					};
				}
			}

			allowNewLine = false;
			var char = this.peek();
			var jump = 1; // A length of a jump, after we're done
			              // parsing this character.

			if (char < " ") {
				// Warn about a control character in a string.
				this.trigger("warning", {
					code: "W113",
					line: this.line,
					character: this.char,
					data: [ "<non-printable>" ]
				});
			}

			// Special treatment for some escaped characters.

			if (char === "\\") {
				this.skip();
				char = this.peek();

				switch (char) {
				case "'":
					this.triggerAsync("warning", {
						code: "W114",
						line: this.line,
						character: this.char,
						data: [ "\\'" ]
					}, checks, function () {return state.jsonMode; });
					break;
				case "b":
					char = "\b";
					break;
				case "f":
					char = "\f";
					break;
				case "n":
					char = "\n";
					break;
				case "r":
					char = "\r";
					break;
				case "t":
					char = "\t";
					break;
				case "0":
					char = "\0";

					// Octal literals fail in strict mode.
					// Check if the number is between 00 and 07.
					var n = parseInt(this.peek(1), 10);
					this.triggerAsync("warning", {
						code: "W115",
						line: this.line,
						character: this.char
					}, checks,
					function () { return n >= 0 && n <= 7 && state.directive["use strict"]; });
					break;
				case "u":
					char = String.fromCharCode(parseInt(this.input.substr(1, 4), 16));
					jump = 5;
					break;
				case "v":
					this.triggerAsync("warning", {
						code: "W114",
						line: this.line,
						character: this.char,
						data: [ "\\v" ]
					}, checks, function () { return state.jsonMode; });

					char = "\v";
					break;
				case "x":
					var	x = parseInt(this.input.substr(1, 2), 16);

					this.triggerAsync("warning", {
						code: "W114",
						line: this.line,
						character: this.char,
						data: [ "\\x-" ]
					}, checks, function () { return state.jsonMode; });

					char = String.fromCharCode(x);
					jump = 3;
					break;
				case "\\":
				case "\"":
				case "/":
					break;
				case "":
					allowNewLine = true;
					char = "";
					break;
				case "!":
					if (value.slice(value.length - 2) === "<") {
						break;
					}

					/*falls through */
				default:
					// Weird escaping.
					this.trigger("warning", {
						code: "W044",
						line: this.line,
						character: this.char
					});
				}
			}

			value += char;
			this.skip(jump);
		}

		this.skip();
		return {
			type: Token.StringLiteral,
			value: value,
			isUnclosed: false,
			quote: quote
		};
	},

	/*
	 * Extract a regular expression out of the next sequence of
	 * characters and/or lines or return 'null' if its not possible.
	 *
	 * This method is platform dependent: it accepts almost any
	 * regular expression values but then tries to compile and run
	 * them using system's RegExp object. This means that there are
	 * rare edge cases where one JavaScript engine complains about
	 * your regular expression while others don't.
	 */
	scanRegExp: function () {
		var index = 0;
		var length = this.input.length;
		var char = this.peek();
		var value = char;
		var body = "";
		var flags = [];
		var malformed = false;
		var isCharSet = false;
		var terminated;

		var scanUnexpectedChars = function () {
			// Unexpected control character
			if (char < " ") {
				malformed = true;
				this.trigger("warning", {
					code: "W048",
					line: this.line,
					character: this.char
				});
			}

			// Unexpected escaped character
			if (char === "<") {
				malformed = true;
				this.trigger("warning", {
					code: "W049",
					line: this.line,
					character: this.char,
					data: [ char ]
				});
			}
		}.bind(this);

		// Regular expressions must start with '/'
		if (!this.prereg || char !== "/") {
			return null;
		}

		index += 1;
		terminated = false;

		// Try to get everything in between slashes. A couple of
		// cases aside (see scanUnexpectedChars) we don't really
		// care whether the resulting expression is valid or not.
		// We will check that later using the RegExp object.

		while (index < length) {
			char = this.peek(index);
			value += char;
			body += char;

			if (isCharSet) {
				if (char === "]") {
					if (this.peek(index - 1) !== "\\" || this.peek(index - 2) === "\\") {
						isCharSet = false;
					}
				}

				if (char === "\\") {
					index += 1;
					char = this.peek(index);
					body += char;
					value += char;

					scanUnexpectedChars();
				}

				index += 1;
				continue;
			}

			if (char === "\\") {
				index += 1;
				char = this.peek(index);
				body += char;
				value += char;

				scanUnexpectedChars();

				if (char === "/") {
					index += 1;
					continue;
				}

				if (char === "[") {
					index += 1;
					continue;
				}
			}

			if (char === "[") {
				isCharSet = true;
				index += 1;
				continue;
			}

			if (char === "/") {
				body = body.substr(0, body.length - 1);
				terminated = true;
				index += 1;
				break;
			}

			index += 1;
		}

		// A regular expression that was never closed is an
		// error from which we cannot recover.

		if (!terminated) {
			this.trigger("error", {
				code: "E015",
				line: this.line,
				character: this.from
			});

			return void this.trigger("fatal", {
				line: this.line,
				from: this.from
			});
		}

		// Parse flags (if any).

		while (index < length) {
			char = this.peek(index);
			if (!/[gim]/.test(char)) {
				break;
			}
			flags.push(char);
			value += char;
			index += 1;
		}

		// Check regular expression for correctness.

		try {
			new RegExp(body, flags.join(""));
		} catch (err) {
			malformed = true;
			this.trigger("error", {
				code: "E016",
				line: this.line,
				character: this.char,
				data: [ err.message ] // Platform dependent!
			});
		}

		return {
			type: Token.RegExp,
			value: value,
			flags: flags,
			isMalformed: malformed
		};
	},

	/*
	 * Scan for any occurence of mixed tabs and spaces. If smarttabs option
	 * is on, ignore tabs followed by spaces.
	 *
	 * Tabs followed by one space followed by a block comment are allowed.
	 */
	scanMixedSpacesAndTabs: function () {
		var at, match;

		if (state.option.smarttabs) {
			// Negative look-behind for "//"
			match = this.input.match(/(\/\/|^\s?\*)? \t/);
			at = match && !match[1] ? 0 : -1;
		} else {
			at = this.input.search(/ \t|\t [^\*]/);
		}

		return at;
	},

	/*
	 * Scan for characters that get silently deleted by one or more browsers.
	 */
	scanUnsafeChars: function () {
		return this.input.search(reg.unsafeChars);
	},

	/*
	 * Produce the next raw token or return 'null' if no tokens can be matched.
	 * This method skips over all space characters.
	 */
	next: function (checks) {
		this.from = this.char;

		// Move to the next non-space character.
		var start;
		if (/\s/.test(this.peek())) {
			start = this.char;

			while (/\s/.test(this.peek())) {
				this.from += 1;
				this.skip();
			}

			if (this.peek() === "") { // EOL
				if (!/^\s*$/.test(this.getLines()[this.line - 1]) && state.option.trailing) {
					this.trigger("warning", { code: "W102", line: this.line, character: start });
				}
			}
		}

		// Methods that work with multi-line structures and move the
		// character pointer.

		var match = this.scanComments() ||
			this.scanStringLiteral(checks);

		if (match) {
			return match;
		}

		// Methods that don't move the character pointer.

		match =
			this.scanRegExp() ||
			this.scanPunctuator() ||
			this.scanKeyword() ||
			this.scanIdentifier() ||
			this.scanNumericLiteral();

		if (match) {
			this.skip(match.value.length);
			return match;
		}

		// No token could be matched, give up.

		return null;
	},

	/*
	 * Switch to the next line and reset all char pointers. Once
	 * switched, this method also checks for mixed spaces and tabs
	 * and other minor warnings.
	 */
	nextLine: function () {
		var char;

		if (this.line >= this.getLines().length) {
			return false;
		}

		this.input = this.getLines()[this.line];
		this.line += 1;
		this.char = 1;
		this.from = 1;

		char = this.scanMixedSpacesAndTabs();
		if (char >= 0) {
			this.trigger("warning", { code: "W099", line: this.line, character: char + 1 });
		}

		this.input = this.input.replace(/\t/g, state.tab);
		char = this.scanUnsafeChars();

		if (char >= 0) {
			this.trigger("warning", { code: "W100", line: this.line, character: char });
		}

		// If there is a limit on line length, warn when lines get too
		// long.

		if (state.option.maxlen && state.option.maxlen < this.input.length) {
			this.trigger("warning", { code: "W101", line: this.line, character: this.input.length });
		}

		return true;
	},

	/*
	 * This is simply a synonym for nextLine() method with a friendlier
	 * public name.
	 */
	start: function () {
		this.nextLine();
	},

	/*
	 * Produce the next token. This function is called by advance() to get
	 * the next token. It retuns a token in a JSLint-compatible format.
	 */
	token: function () {
		/*jshint loopfunc:true */
		var checks = asyncTrigger();
		var token;


		function isReserved(token, isProperty) {
			if (!token.reserved) {
				return false;
			}

			if (token.meta && token.meta.isFutureReservedWord) {
				// ES3 FutureReservedWord in an ES5 environment.
				if (state.option.inES5(true) && !token.meta.es5) {
					return false;
				}

				// Some ES5 FutureReservedWord identifiers are active only
				// within a strict mode environment.
				if (token.meta.strictOnly) {
					if (!state.option.strict && !state.directive["use strict"]) {
						return false;
					}
				}

				if (isProperty) {
					return false;
				}
			}

			return true;
		}

		// Produce a token object.
		var create = function (type, value, isProperty) {
			/*jshint validthis:true */
			var obj;

			if (type !== "(endline)" && type !== "(end)") {
				this.prereg = false;
			}

			if (type === "(punctuator)") {
				switch (value) {
				case ".":
				case ")":
				case "~":
				case "#":
				case "]":
					this.prereg = false;
					break;
				default:
					this.prereg = true;
				}

				obj = Object.create(state.syntax[value] || state.syntax["(error)"]);
			}

			if (type === "(identifier)") {
				if (value === "return" || value === "case" || value === "typeof") {
					this.prereg = true;
				}

				if (_.has(state.syntax, value)) {
					obj = Object.create(state.syntax[value] || state.syntax["(error)"]);

					// If this can't be a reserved keyword, reset the object.
					if (!isReserved(obj, isProperty && type === "(identifier)")) {
						obj = null;
					}
				}
			}

			if (!obj) {
				obj = Object.create(state.syntax[type]);
			}

			obj.identifier = (type === "(identifier)");
			obj.type = obj.type || type;
			obj.value = value;
			obj.line = this.line;
			obj.character = this.char;
			obj.from = this.from;

			if (isProperty && obj.identifier) {
				obj.isProperty = isProperty;
			}

			obj.check = checks.check;

			return obj;
		}.bind(this);

		for (;;) {
			if (!this.input.length) {
				return create(this.nextLine() ? "(endline)" : "(end)", "");
			}

			token = this.next(checks);

			if (!token) {
				if (this.input.length) {
					// Unexpected character.
					this.trigger("error", {
						code: "E024",
						line: this.line,
						character: this.char,
						data: [ this.peek() ]
					});

					this.input = "";
				}

				continue;
			}

			switch (token.type) {
			case Token.StringLiteral:
				this.triggerAsync("String", {
					line: this.line,
					char: this.char,
					from: this.from,
					value: token.value,
					quote: token.quote
				}, checks, function () { return true; });

				return create("(string)", token.value);
			case Token.Identifier:
				this.trigger("Identifier", {
					line: this.line,
					char: this.char,
					from: this.form,
					name: token.value,
					isProperty: state.tokens.curr.id === "."
				});

				/* falls through */
			case Token.Keyword:
			case Token.NullLiteral:
			case Token.BooleanLiteral:
				return create("(identifier)", token.value, state.tokens.curr.id === ".");

			case Token.NumericLiteral:
				if (token.isMalformed) {
					this.trigger("warning", {
						code: "W045",
						line: this.line,
						character: this.char,
						data: [ token.value ]
					});
				}

				this.triggerAsync("warning", {
					code: "W114",
					line: this.line,
					character: this.char,
					data: [ "0x-" ]
				}, checks, function () { return token.base === 16 && state.jsonMode; });

				this.triggerAsync("warning", {
					code: "W115",
					line: this.line,
					character: this.char
				}, checks, function () {
					return state.directive["use strict"] && token.base === 8; 
				});

				this.trigger("Number", {
					line: this.line,
					char: this.char,
					from: this.from,
					value: token.value,
					base: token.base,
					isMalformed: token.malformed
				});

				return create("(number)", token.value);

			case Token.RegExp:
				return create("(regexp)", token.value);

			case Token.Comment:
				state.tokens.curr.comment = true;

				if (token.isSpecial) {
					return {
						value: token.value,
						body: token.body,
						type: token.commentType,
						isSpecial: token.isSpecial,
						line: this.line,
						character: this.char,
						from: this.from
					};
				}

				break;

			case "":
				break;

			default:
				return create("(punctuator)", token.value);
			}
		}
	}
};

exports.Lexer = Lexer;

})()
},
{"events":2,"./reg.js":4,"./state.js":5,"underscore":12}],
12:[function(req,module,exports){
(function(){//     Underscore.js 1.4.4
//     http://underscorejs.org
//     (c) 2009-2013 Jeremy Ashkenas, DocumentCloud Inc.
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `global` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Establish the object that gets returned to break out of a loop iteration.
  var breaker = {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var push             = ArrayProto.push,
      slice            = ArrayProto.slice,
      concat           = ArrayProto.concat,
      toString         = ObjProto.toString,
      hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeForEach      = ArrayProto.forEach,
    nativeMap          = ArrayProto.map,
    nativeReduce       = ArrayProto.reduce,
    nativeReduceRight  = ArrayProto.reduceRight,
    nativeFilter       = ArrayProto.filter,
    nativeEvery        = ArrayProto.every,
    nativeSome         = ArrayProto.some,
    nativeIndexOf      = ArrayProto.indexOf,
    nativeLastIndexOf  = ArrayProto.lastIndexOf,
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object via a string identifier,
  // for Closure Compiler "advanced" mode.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.4.4';

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles objects with the built-in `forEach`, arrays, and raw objects.
  // Delegates to **ECMAScript 5**'s native `forEach` if available.
  var each = _.each = _.forEach = function(obj, iterator, context) {
    if (obj == null) return;
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, l = obj.length; i < l; i++) {
        if (iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      for (var key in obj) {
        if (_.has(obj, key)) {
          if (iterator.call(context, obj[key], key, obj) === breaker) return;
        }
      }
    }
  };

  // Return the results of applying the iterator to each element.
  // Delegates to **ECMAScript 5**'s native `map` if available.
  _.map = _.collect = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
    each(obj, function(value, index, list) {
      results[results.length] = iterator.call(context, value, index, list);
    });
    return results;
  };

  var reduceError = 'Reduce of empty array with no initial value';

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
  _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduce && obj.reduce === nativeReduce) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
    }
    each(obj, function(value, index, list) {
      if (!initial) {
        memo = value;
        initial = true;
      } else {
        memo = iterator.call(context, memo, value, index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
  _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
    }
    var length = obj.length;
    if (length !== +length) {
      var keys = _.keys(obj);
      length = keys.length;
    }
    each(obj, function(value, index, list) {
      index = keys ? keys[--length] : --length;
      if (!initial) {
        memo = obj[index];
        initial = true;
      } else {
        memo = iterator.call(context, memo, obj[index], index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, iterator, context) {
    var result;
    any(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Delegates to **ECMAScript 5**'s native `filter` if available.
  // Aliased as `select`.
  _.filter = _.select = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeFilter && obj.filter === nativeFilter) return obj.filter(iterator, context);
    each(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) results[results.length] = value;
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, iterator, context) {
    return _.filter(obj, function(value, index, list) {
      return !iterator.call(context, value, index, list);
    }, context);
  };

  // Determine whether all of the elements match a truth test.
  // Delegates to **ECMAScript 5**'s native `every` if available.
  // Aliased as `all`.
  _.every = _.all = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = true;
    if (obj == null) return result;
    if (nativeEvery && obj.every === nativeEvery) return obj.every(iterator, context);
    each(obj, function(value, index, list) {
      if (!(result = result && iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if at least one element in the object matches a truth test.
  // Delegates to **ECMAScript 5**'s native `some` if available.
  // Aliased as `any`.
  var any = _.some = _.any = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = false;
    if (obj == null) return result;
    if (nativeSome && obj.some === nativeSome) return obj.some(iterator, context);
    each(obj, function(value, index, list) {
      if (result || (result = iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if the array or object contains a given value (using `===`).
  // Aliased as `include`.
  _.contains = _.include = function(obj, target) {
    if (obj == null) return false;
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
    return any(obj, function(value) {
      return value === target;
    });
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      return (isFunc ? method : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, function(value){ return value[key]; });
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs, first) {
    if (_.isEmpty(attrs)) return first ? null : [];
    return _[first ? 'find' : 'filter'](obj, function(value) {
      for (var key in attrs) {
        if (attrs[key] !== value[key]) return false;
      }
      return true;
    });
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.where(obj, attrs, true);
  };

  // Return the maximum element or (element-based computation).
  // Can't optimize arrays of integers longer than 65,535 elements.
  // See: https://bugs.webkit.org/show_bug.cgi?id=80797
  _.max = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.max.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return -Infinity;
    var result = {computed : -Infinity, value: -Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed >= result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.min.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return Infinity;
    var result = {computed : Infinity, value: Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed < result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Shuffle an array.
  _.shuffle = function(obj) {
    var rand;
    var index = 0;
    var shuffled = [];
    each(obj, function(value) {
      rand = _.random(index++);
      shuffled[index - 1] = shuffled[rand];
      shuffled[rand] = value;
    });
    return shuffled;
  };

  // An internal function to generate lookup iterators.
  var lookupIterator = function(value) {
    return _.isFunction(value) ? value : function(obj){ return obj[value]; };
  };

  // Sort the object's values by a criterion produced by an iterator.
  _.sortBy = function(obj, value, context) {
    var iterator = lookupIterator(value);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value : value,
        index : index,
        criteria : iterator.call(context, value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index < right.index ? -1 : 1;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(obj, value, context, behavior) {
    var result = {};
    var iterator = lookupIterator(value || _.identity);
    each(obj, function(value, index) {
      var key = iterator.call(context, value, index, obj);
      behavior(result, key, value);
    });
    return result;
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = function(obj, value, context) {
    return group(obj, value, context, function(result, key, value) {
      (_.has(result, key) ? result[key] : (result[key] = [])).push(value);
    });
  };

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = function(obj, value, context) {
    return group(obj, value, context, function(result, key) {
      if (!_.has(result, key)) result[key] = 0;
      result[key]++;
    });
  };

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iterator, context) {
    iterator = iterator == null ? _.identity : lookupIterator(iterator);
    var value = iterator.call(context, obj);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = (low + high) >>> 1;
      iterator.call(context, array[mid]) < value ? low = mid + 1 : high = mid;
    }
    return low;
  };

  // Safely convert anything iterable into a real, live array.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (obj.length === +obj.length) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return (obj.length === +obj.length) ? obj.length : _.keys(obj).length;
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    return (n != null) && !guard ? slice.call(array, 0, n) : array[0];
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if ((n != null) && !guard) {
      return slice.call(array, Math.max(array.length - n, 0));
    } else {
      return array[array.length - 1];
    }
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, (n == null) || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, output) {
    each(input, function(value) {
      if (_.isArray(value)) {
        shallow ? push.apply(output, value) : flatten(value, shallow, output);
      } else {
        output.push(value);
      }
    });
    return output;
  };

  // Return a completely flattened version of an array.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iterator, context) {
    if (_.isFunction(isSorted)) {
      context = iterator;
      iterator = isSorted;
      isSorted = false;
    }
    var initial = iterator ? _.map(array, iterator, context) : array;
    var results = [];
    var seen = [];
    each(initial, function(value, index) {
      if (isSorted ? (!index || seen[seen.length - 1] !== value) : !_.contains(seen, value)) {
        seen.push(value);
        results.push(array[index]);
      }
    });
    return results;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(concat.apply(ArrayProto, arguments));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    var rest = slice.call(arguments, 1);
    return _.filter(_.uniq(array), function(item) {
      return _.every(rest, function(other) {
        return _.indexOf(other, item) >= 0;
      });
    });
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = concat.apply(ArrayProto, slice.call(arguments, 1));
    return _.filter(array, function(value){ return !_.contains(rest, value); });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    var args = slice.call(arguments);
    var length = _.max(_.pluck(args, 'length'));
    var results = new Array(length);
    for (var i = 0; i < length; i++) {
      results[i] = _.pluck(args, "" + i);
    }
    return results;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    if (list == null) return {};
    var result = {};
    for (var i = 0, l = list.length; i < l; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
  // we need this function. Return the position of the first occurrence of an
  // item in an array, or -1 if the item is not included in the array.
  // Delegates to **ECMAScript 5**'s native `indexOf` if available.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i = 0, l = array.length;
    if (isSorted) {
      if (typeof isSorted == 'number') {
        i = (isSorted < 0 ? Math.max(0, l + isSorted) : isSorted);
      } else {
        i = _.sortedIndex(array, item);
        return array[i] === item ? i : -1;
      }
    }
    if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item, isSorted);
    for (; i < l; i++) if (array[i] === item) return i;
    return -1;
  };

  // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
  _.lastIndexOf = function(array, item, from) {
    if (array == null) return -1;
    var hasIndex = from != null;
    if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) {
      return hasIndex ? array.lastIndexOf(item, from) : array.lastIndexOf(item);
    }
    var i = (hasIndex ? from : array.length);
    while (i--) if (array[i] === item) return i;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = arguments[2] || 1;

    var len = Math.max(Math.ceil((stop - start) / step), 0);
    var idx = 0;
    var range = new Array(len);

    while(idx < len) {
      range[idx++] = start;
      start += step;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    if (func.bind === nativeBind && nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    var args = slice.call(arguments, 2);
    return function() {
      return func.apply(context, args.concat(slice.call(arguments)));
    };
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context.
  _.partial = function(func) {
    var args = slice.call(arguments, 1);
    return function() {
      return func.apply(this, args.concat(slice.call(arguments)));
    };
  };

  // Bind all of an object's methods to that object. Useful for ensuring that
  // all callbacks defined on an object belong to it.
  _.bindAll = function(obj) {
    var funcs = slice.call(arguments, 1);
    if (funcs.length === 0) funcs = _.functions(obj);
    each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memo = {};
    hasher || (hasher = _.identity);
    return function() {
      var key = hasher.apply(this, arguments);
      return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){ return func.apply(null, args); }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time.
  _.throttle = function(func, wait) {
    var context, args, timeout, result;
    var previous = 0;
    var later = function() {
      previous = new Date;
      timeout = null;
      result = func.apply(context, args);
    };
    return function() {
      var now = new Date;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0) {
        clearTimeout(timeout);
        timeout = null;
        previous = now;
        result = func.apply(context, args);
      } else if (!timeout) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, result;
    return function() {
      var context = this, args = arguments;
      var later = function() {
        timeout = null;
        if (!immediate) result = func.apply(context, args);
      };
      var callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) result = func.apply(context, args);
      return result;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = function(func) {
    var ran = false, memo;
    return function() {
      if (ran) return memo;
      ran = true;
      memo = func.apply(this, arguments);
      func = null;
      return memo;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return function() {
      var args = [func];
      push.apply(args, arguments);
      return wrapper.apply(this, args);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var funcs = arguments;
    return function() {
      var args = arguments;
      for (var i = funcs.length - 1; i >= 0; i--) {
        args = [funcs[i].apply(this, args)];
      }
      return args[0];
    };
  };

  // Returns a function that will only be executed after being called N times.
  _.after = function(times, func) {
    if (times <= 0) return func();
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = nativeKeys || function(obj) {
    if (obj !== Object(obj)) throw new TypeError('Invalid object');
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys[keys.length] = key;
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var values = [];
    for (var key in obj) if (_.has(obj, key)) values.push(obj[key]);
    return values;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var pairs = [];
    for (var key in obj) if (_.has(obj, key)) pairs.push([key, obj[key]]);
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    for (var key in obj) if (_.has(obj, key)) result[obj[key]] = key;
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    each(keys, function(key) {
      if (key in obj) copy[key] = obj[key];
    });
    return copy;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    for (var key in obj) {
      if (!_.contains(keys, key)) copy[key] = obj[key];
    }
    return copy;
  };

  // Fill in a given object with default properties.
  _.defaults = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          if (obj[prop] == null) obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the Harmony `egal` proposal: http://wiki.ecmascript.org/doku.php?id=harmony:egal.
    if (a === b) return a !== 0 || 1 / a == 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className != toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, dates, and booleans are compared by value.
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return a == String(b);
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
        // other numeric values.
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a == +b;
      // RegExps are compared by their source patterns and flags.
      case '[object RegExp]':
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] == a) return bStack[length] == b;
    }
    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);
    var size = 0, result = true;
    // Recursively compare objects and arrays.
    if (className == '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = size == b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          if (!(result = eq(a[size], b[size], aStack, bStack))) break;
        }
      }
    } else {
      // Objects with different constructors are not equivalent, but `Object`s
      // from different frames are.
      var aCtor = a.constructor, bCtor = b.constructor;
      if (aCtor !== bCtor && !(_.isFunction(aCtor) && (aCtor instanceof aCtor) &&
                               _.isFunction(bCtor) && (bCtor instanceof bCtor))) {
        return false;
      }
      // Deep compare objects.
      for (var key in a) {
        if (_.has(a, key)) {
          // Count the expected number of properties.
          size++;
          // Deep compare each member.
          if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
        }
      }
      // Ensure that both objects contain the same number of properties.
      if (result) {
        for (key in b) {
          if (_.has(b, key) && !(size--)) break;
        }
        result = !size;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return result;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b, [], []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) == '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    return obj === Object(obj);
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
  each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) == '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return !!(obj && _.has(obj, 'callee'));
    };
  }

  // Optimize `isFunction` if appropriate.
  if (typeof (/./) !== 'function') {
    _.isFunction = function(obj) {
      return typeof obj === 'function';
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj != +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iterators.
  _.identity = function(value) {
    return value;
  };

  // Run a function **n** times.
  _.times = function(n, iterator, context) {
    var accum = Array(n);
    for (var i = 0; i < n; i++) accum[i] = iterator.call(context, i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // List of HTML entities for escaping.
  var entityMap = {
    escape: {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    }
  };
  entityMap.unescape = _.invert(entityMap.escape);

  // Regexes containing the keys and values listed immediately above.
  var entityRegexes = {
    escape:   new RegExp('[' + _.keys(entityMap.escape).join('') + ']', 'g'),
    unescape: new RegExp('(' + _.keys(entityMap.unescape).join('|') + ')', 'g')
  };

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  _.each(['escape', 'unescape'], function(method) {
    _[method] = function(string) {
      if (string == null) return '';
      return ('' + string).replace(entityRegexes[method], function(match) {
        return entityMap[method][match];
      });
    };
  });

  // If the value of the named property is a function then invoke it;
  // otherwise, return it.
  _.result = function(object, property) {
    if (object == null) return null;
    var value = object[property];
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    each(_.functions(obj), function(name){
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result.call(this, func.apply(_, args));
      };
    });
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\t':     't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  _.template = function(text, data, settings) {
    var render;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = new RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset)
        .replace(escaper, function(match) { return '\\' + escapes[match]; });

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      }
      if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      }
      if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }
      index = offset + match.length;
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + "return __p;\n";

    try {
      render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    if (data) return render(data, _);
    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled function source as a convenience for precompilation.
    template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function, which will delegate to the wrapper.
  _.chain = function(obj) {
    return _(obj).chain();
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(obj) {
    return this._chain ? _(obj).chain() : obj;
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name == 'shift' || name == 'splice') && obj.length === 0) delete obj[0];
      return result.call(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result.call(this, method.apply(this._wrapped, arguments));
    };
  });

  _.extend(_.prototype, {

    // Start chaining a wrapped Underscore object.
    chain: function() {
      this._chain = true;
      return this;
    },

    // Extracts the result from a wrapped and chained object.
    value: function() {
      return this._wrapped;
    }

  });

}).call(this);

})()
},
{}]
},{},["E/GbHF"])
;

function req() {return require.apply(this, arguments)}
module.exports = req("jshint");

});define('ext/jslanguage/JSResolver', ['require', 'exports', 'module' , 'ext/language/MarkerResolution', 'ace/range'], function(require, exports, module) {
  "use strict";

  var markerResolution = require('ext/language/MarkerResolution').MarkerResolution;
  var Range = require("ace/range").Range;

  var JSResolver = function(value, ast){
    this.addResolutions = function(markers){
      var _self = this;
      markers.forEach(function(curMarker) {
        curMarker.resolutions = _self.getResolutions(curMarker);
      });
    };
    
    this.getResolutions = function(marker){
      var type = this.getType(marker);
      if (type) {
        if (typeof this[type] === 'function'){
          return this[type](marker);
        }
      }
      return [];
    }; 

    this.getType = function(marker){
        var msg = marker.message;
        if (msg.indexOf("Missing semicolon") !== -1){
            return "missingSemicolon";
        }
        else if (msg.indexOf("Unnecessary semicolon") !== -1) {
            return "unnecessarySemicolon";
        }
    }; 
    
    this.missingSemicolon = function(marker) {
        var label = "Add semicolon";
        var image = "";
        var row = marker.pos.sl;
        var column = marker.pos.sc;
        
        var lines = value.split("\n");
        var before = lines[row].substring(0, column);
        var after = lines[row].substring(column);
        var preview = "<b>Add semicolon</b><p>" + before + "<b>; </b>" + after + "</p>";
        
        var insert = ";";
        if (after.length){
            insert += " ";
        }

        var delta = {
            action: "insertText",
            range: new Range(row, column, row, column + insert.length),
            text: insert
        };
        
        return [markerResolution(label, image, preview, [delta])];
    };
    
    this.unnecessarySemicolon = function(marker) {
        var label = "Remove semicolon";
        var image = "";
        var row = marker.pos.sl;
        var column = marker.pos.sc;
        
        var lines = value.split("\n");
        var before = lines[row].substring(0, column);
        var after = lines[row].substring(column + 1);
        var preview = "<b>Remove semicolon</b><p>" + before + "<del>;</del>" + after + "</p>";

        var delta = {
            action: "removeText",
            range: new Range(row, column, row, column + 1)
        };
        
        return [markerResolution(label, image, preview, [delta])];
    };

  };

  exports.JSResolver = JSResolver;

});

define('ext/language/MarkerResolution', ['require', 'exports', 'module' ], function(require, exports, module) {
"use strict";

/**
* data structure for resolutions, containing 
* a label (short description, to be displayed in the list of resolutions), 
* an image (to be displayed in the list of resolutions), 
* a preview,
* an array of deltas (containing the changes to be applied),
* the position where the cursor should be after applying
*/
var MarkerResolution = function(label, image, preview, deltas, cursorTarget){
    return {
        label: label,
        image: image,
        preview: preview,
        deltas: deltas,
        cursorTarget: cursorTarget
    };
}; 

exports.MarkerResolution = MarkerResolution;

});/**
 * JavaScript jump to definition.
 *
 * @copyright 2011, Ajax.org B.V.
 * @license GPLv3 <http://www.gnu.org/licenses/gpl.txt>
 */
define('ext/jslanguage/jumptodef', ['require', 'exports', 'module' , 'ext/language/base_handler', 'ext/jslanguage/scope_analyzer'], function(require, exports, module) {

var baseLanguageHandler = require('ext/language/base_handler');
var handler = module.exports = Object.create(baseLanguageHandler);
var scopes = require("ext/jslanguage/scope_analyzer");

handler.handlesLanguage = function(language) {
    return language === 'javascript';
};

handler.jumpToDefinition = function(doc, fullAst, pos, currentNode, callback) {
    if (!fullAst)
        return callback();
    scopes.getVariablePositions(doc, fullAst, pos, currentNode, function (data) {
        if (!data || !data.declarations || data.declarations.length === 0) {
            return callback(null);
        }
        
        callback(data.declarations);
    });
};

});
/**
 * Cloud9 Language Foundation
 *
 * @copyright 2011, Ajax.org B.V.
 * @license GPLv3 <http://www.gnu.org/licenses/gpl.txt>
 */

// contains language specific debugger bindings
define('ext/jslanguage/debugger', ['require', 'exports', 'module' , 'ext/language/base_handler'], function(require, exports, module) {

    var baseLanguageHandler = require('ext/language/base_handler');
    
    var expressionBuilder = module.exports = Object.create(baseLanguageHandler);
    
    /*** publics ***/
    
    expressionBuilder.handlesLanguage = function(language) {
        return language === 'javascript';
    };
        
    // builds an expression for the v8 debugger based on a node
    expressionBuilder.buildExpression = function(node) {
        if (!node) return null;
        
        return getExpressionValue(node);
    };
    
    /*** privates ***/
    
    // get a string value of any expression
    var getExpressionValue = function(d) {
        if (d.value) return d.value;
        
        var result;
        
        d.rewrite(
            // var someVar = ...
            'VarDeclInit(x, _)', 'ConstDeclInit(x, _)', function(b) {
                result = b.x.value;
            },
            // var someVar;
            'VarDecl(x)', 'ConstDecl(x)', function(b) {
                result = b.x.value;
            },
            // e.x
            'PropAccess(e, x)', function(b) {
                result = getExpressionValue(b.e) + "." + b.x.value;
            },
            // x
            'Var(x)', function(b) {
                result = b.x.value;
            },
            // e(arg, ...)
            'Call(e, args)', function(b) {
                var method = getExpressionValue(b.e);
                var args = b.args.toArray().map(getExpressionValue).join(", ");
                result = method + "(" + args + ")";
            },
            // 10
            'Num(n)', function(b) {
                result = b.n.value;
            },
            // e[idx]
            'Index(e, idx)', function(b) {
                result = getExpressionValue(b.e) + "[" + getExpressionValue(b.idx) + "]";
            },
            // new SomeThing(arg, ...)
            'New(e, args)', function(b) {
                var method = getExpressionValue(b.e);
                var args = b.args.toArray().map(getExpressionValue).join(", ");
                result = "new " + method + "(" + args + ")";
            },
            // x (function argument)
            'FArg(x)', function(b) {
                result = b.x.value;
            },
            // 10 + 4
            'Op(op, e1, e2)', function(b) {
                result = getExpressionValue(b.e1) + " " + b.op.value + " " + getExpressionValue(b.e2);
            },
            // if nuthin' else matches
            function() {
                if(!result)
                    result = "";
            }
        );
        return result;
    };

});
/**
 * Cloud9 Language Foundation
 *
 * @copyright 2011, Ajax.org B.V.
 * @license GPLv3 <http://www.gnu.org/licenses/gpl.txt>
 */
define('ext/csslanguage/css_handler', ['require', 'exports', 'module' , 'ext/language/base_handler', 'ext/csslanguage/csslint'], function(require, exports, module) {

var baseLanguageHandler = require("ext/language/base_handler");
var CSSLint = require("ext/csslanguage/csslint");
var handler = module.exports = Object.create(baseLanguageHandler);

handler.handlesLanguage = function(language) {
    return language === "css";
};

handler.analyze = function(value, ast, callback) {
    callback(handler.analyzeSync(value, ast));
};

var CSSLint_RULESET = {
    "adjoining-classes"           : 1,
    "box-model"                   : 1,
    "box-sizing"                  : 1,
    "compatible-vendor-prefixes"  : 1,
    "display-property-grouping"   : 1,
    "duplicate-background-images" : 1,
    "duplicate-properties"        : 1,
    "empty-rules"                 : 1,
    "errors"                      : 1,
    "fallback-colors"             : 1,
    "floats"                      : 1,
    "font-faces"                  : 1,
    "font-sizes"                  : 1,
    "gradients"                   : 1,
    // "ids"                      : 1,
    "import"                      : 1,
    "important"                   : 1,
    "known-properties"            : 1,
    "outline-none"                : 1,
    "overqualified-elements"      : 1,
    "qualified-headings"          : 1,
    "regex-selectors"             : 1,
    "rules-count"                 : 1,
    "shorthand"                   : 1,
    "star-property-hack"          : 1,
    "text-indent"                 : 1,
    "underscore-property-hack"    : 1,
    "unique-headings"             : 1,
    "universal-selector"          : 1,
    "unqualified-attributes"      : 1,
    "vendor-prefix"               : 1,
    "zero-units"                  : 1
};

handler.analyzeSync = function(value, ast) {
    value = value.replace(/^(#!.*\n)/, "//$1");

    var results = CSSLint.verify(value, CSSLint_RULESET);
    var warnings = results.messages;

    return warnings.map(function(warning) {
        return {
            pos: {
                sl: warning.line-1,
                sc: warning.col-1
            },
            type: warning.type,
            level: warning.type,
            message: warning.message
        };
    });
};

});
/*!
CSSLint
Copyright (c) 2011 Nicole Sullivan and Nicholas C. Zakas. All rights reserved.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

*/
/* Build time: 17-January-2013 10:55:01 */

define('ext/csslanguage/csslint', ['require', 'exports', 'module' ], function(require, exports, module) {
	
var CSSLint = (function(){
/*!
Parser-Lib
Copyright (c) 2009-2011 Nicholas C. Zakas. All rights reserved.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

*/
/* Version v0.2.2, Build time: 17-January-2013 10:26:34 */
var parserlib = {};
(function(){


/**
 * A generic base to inherit from for any object
 * that needs event handling.
 * @class EventTarget
 * @constructor
 */
function EventTarget(){

    /**
     * The array of listeners for various events.
     * @type Object
     * @property _listeners
     * @private
     */
    this._listeners = {};    
}

EventTarget.prototype = {

    //restore constructor
    constructor: EventTarget,

    /**
     * Adds a listener for a given event type.
     * @param {String} type The type of event to add a listener for.
     * @param {Function} listener The function to call when the event occurs.
     * @return {void}
     * @method addListener
     */
    addListener: function(type, listener){
        if (!this._listeners[type]){
            this._listeners[type] = [];
        }

        this._listeners[type].push(listener);
    },
    
    /**
     * Fires an event based on the passed-in object.
     * @param {Object|String} event An object with at least a 'type' attribute
     *      or a string indicating the event name.
     * @return {void}
     * @method fire
     */    
    fire: function(event){
        if (typeof event == "string"){
            event = { type: event };
        }
        if (typeof event.target != "undefined"){
            event.target = this;
        }
        
        if (typeof event.type == "undefined"){
            throw new Error("Event object missing 'type' property.");
        }
        
        if (this._listeners[event.type]){
        
            //create a copy of the array and use that so listeners can't chane
            var listeners = this._listeners[event.type].concat();
            for (var i=0, len=listeners.length; i < len; i++){
                listeners[i].call(this, event);
            }
        }            
    },

    /**
     * Removes a listener for a given event type.
     * @param {String} type The type of event to remove a listener from.
     * @param {Function} listener The function to remove from the event.
     * @return {void}
     * @method removeListener
     */
    removeListener: function(type, listener){
        if (this._listeners[type]){
            var listeners = this._listeners[type];
            for (var i=0, len=listeners.length; i < len; i++){
                if (listeners[i] === listener){
                    listeners.splice(i, 1);
                    break;
                }
            }
            
            
        }            
    }
};
/**
 * Convenient way to read through strings.
 * @namespace parserlib.util
 * @class StringReader
 * @constructor
 * @param {String} text The text to read.
 */
function StringReader(text){

    /**
     * The input text with line endings normalized.
     * @property _input
     * @type String
     * @private
     */
    this._input = text.replace(/\n\r?/g, "\n");


    /**
     * The row for the character to be read next.
     * @property _line
     * @type int
     * @private
     */
    this._line = 1;


    /**
     * The column for the character to be read next.
     * @property _col
     * @type int
     * @private
     */
    this._col = 1;

    /**
     * The index of the character in the input to be read next.
     * @property _cursor
     * @type int
     * @private
     */
    this._cursor = 0;
}

StringReader.prototype = {

    //restore constructor
    constructor: StringReader,

    //-------------------------------------------------------------------------
    // Position info
    //-------------------------------------------------------------------------

    /**
     * Returns the column of the character to be read next.
     * @return {int} The column of the character to be read next.
     * @method getCol
     */
    getCol: function(){
        return this._col;
    },

    /**
     * Returns the row of the character to be read next.
     * @return {int} The row of the character to be read next.
     * @method getLine
     */
    getLine: function(){
        return this._line ;
    },

    /**
     * Determines if you're at the end of the input.
     * @return {Boolean} True if there's no more input, false otherwise.
     * @method eof
     */
    eof: function(){
        return (this._cursor == this._input.length);
    },

    //-------------------------------------------------------------------------
    // Basic reading
    //-------------------------------------------------------------------------

    /**
     * Reads the next character without advancing the cursor.
     * @param {int} count How many characters to look ahead (default is 1).
     * @return {String} The next character or null if there is no next character.
     * @method peek
     */
    peek: function(count){
        var c = null;
        count = (typeof count == "undefined" ? 1 : count);

        //if we're not at the end of the input...
        if (this._cursor < this._input.length){

            //get character and increment cursor and column
            c = this._input.charAt(this._cursor + count - 1);
        }

        return c;
    },

    /**
     * Reads the next character from the input and adjusts the row and column
     * accordingly.
     * @return {String} The next character or null if there is no next character.
     * @method read
     */
    read: function(){
        var c = null;

        //if we're not at the end of the input...
        if (this._cursor < this._input.length){

            //if the last character was a newline, increment row count
            //and reset column count
            if (this._input.charAt(this._cursor) == "\n"){
                this._line++;
                this._col=1;
            } else {
                this._col++;
            }

            //get character and increment cursor and column
            c = this._input.charAt(this._cursor++);
        }

        return c;
    },

    //-------------------------------------------------------------------------
    // Misc
    //-------------------------------------------------------------------------

    /**
     * Saves the current location so it can be returned to later.
     * @method mark
     * @return {void}
     */
    mark: function(){
        this._bookmark = {
            cursor: this._cursor,
            line:   this._line,
            col:    this._col
        };
    },

    reset: function(){
        if (this._bookmark){
            this._cursor = this._bookmark.cursor;
            this._line = this._bookmark.line;
            this._col = this._bookmark.col;
            delete this._bookmark;
        }
    },

    //-------------------------------------------------------------------------
    // Advanced reading
    //-------------------------------------------------------------------------

    /**
     * Reads up to and including the given string. Throws an error if that
     * string is not found.
     * @param {String} pattern The string to read.
     * @return {String} The string when it is found.
     * @throws Error when the string pattern is not found.
     * @method readTo
     */
    readTo: function(pattern){

        var buffer = "",
            c;

        /*
         * First, buffer must be the same length as the pattern.
         * Then, buffer must end with the pattern or else reach the
         * end of the input.
         */
        while (buffer.length < pattern.length || buffer.lastIndexOf(pattern) != buffer.length - pattern.length){
            c = this.read();
            if (c){
                buffer += c;
            } else {
                throw new Error("Expected \"" + pattern + "\" at line " + this._line  + ", col " + this._col + ".");
            }
        }

        return buffer;

    },

    /**
     * Reads characters while each character causes the given
     * filter function to return true. The function is passed
     * in each character and either returns true to continue
     * reading or false to stop.
     * @param {Function} filter The function to read on each character.
     * @return {String} The string made up of all characters that passed the
     *      filter check.
     * @method readWhile
     */
    readWhile: function(filter){

        var buffer = "",
            c = this.read();

        while(c !== null && filter(c)){
            buffer += c;
            c = this.read();
        }

        return buffer;

    },

    /**
     * Reads characters that match either text or a regular expression and
     * returns those characters. If a match is found, the row and column
     * are adjusted; if no match is found, the reader's state is unchanged.
     * reading or false to stop.
     * @param {String|RegExp} matchter If a string, then the literal string
     *      value is searched for. If a regular expression, then any string
     *      matching the pattern is search for.
     * @return {String} The string made up of all characters that matched or
     *      null if there was no match.
     * @method readMatch
     */
    readMatch: function(matcher){

        var source = this._input.substring(this._cursor),
            value = null;

        //if it's a string, just do a straight match
        if (typeof matcher == "string"){
            if (source.indexOf(matcher) === 0){
                value = this.readCount(matcher.length);
            }
        } else if (matcher instanceof RegExp){
            if (matcher.test(source)){
                value = this.readCount(RegExp.lastMatch.length);
            }
        }

        return value;
    },


    /**
     * Reads a given number of characters. If the end of the input is reached,
     * it reads only the remaining characters and does not throw an error.
     * @param {int} count The number of characters to read.
     * @return {String} The string made up the read characters.
     * @method readCount
     */
    readCount: function(count){
        var buffer = "";

        while(count--){
            buffer += this.read();
        }

        return buffer;
    }

};
/**
 * Type to use when a syntax error occurs.
 * @class SyntaxError
 * @namespace parserlib.util
 * @constructor
 * @param {String} message The error message.
 * @param {int} line The line at which the error occurred.
 * @param {int} col The column at which the error occurred.
 */
function SyntaxError(message, line, col){

    /**
     * The column at which the error occurred.
     * @type int
     * @property col
     */
    this.col = col;

    /**
     * The line at which the error occurred.
     * @type int
     * @property line
     */
    this.line = line;

    /**
     * The text representation of the unit.
     * @type String
     * @property text
     */
    this.message = message;

}

//inherit from Error
SyntaxError.prototype = new Error();
/**
 * Base type to represent a single syntactic unit.
 * @class SyntaxUnit
 * @namespace parserlib.util
 * @constructor
 * @param {String} text The text of the unit.
 * @param {int} line The line of text on which the unit resides.
 * @param {int} col The column of text on which the unit resides.
 */
function SyntaxUnit(text, line, col, type){


    /**
     * The column of text on which the unit resides.
     * @type int
     * @property col
     */
    this.col = col;

    /**
     * The line of text on which the unit resides.
     * @type int
     * @property line
     */
    this.line = line;

    /**
     * The text representation of the unit.
     * @type String
     * @property text
     */
    this.text = text;

    /**
     * The type of syntax unit.
     * @type int
     * @property type
     */
    this.type = type;
}

/**
 * Create a new syntax unit based solely on the given token.
 * Convenience method for creating a new syntax unit when
 * it represents a single token instead of multiple.
 * @param {Object} token The token object to represent.
 * @return {parserlib.util.SyntaxUnit} The object representing the token.
 * @static
 * @method fromToken
 */
SyntaxUnit.fromToken = function(token){
    return new SyntaxUnit(token.value, token.startLine, token.startCol);
};

SyntaxUnit.prototype = {

    //restore constructor
    constructor: SyntaxUnit,
    
    /**
     * Returns the text representation of the unit.
     * @return {String} The text representation of the unit.
     * @method valueOf
     */
    valueOf: function(){
        return this.toString();
    },
    
    /**
     * Returns the text representation of the unit.
     * @return {String} The text representation of the unit.
     * @method toString
     */
    toString: function(){
        return this.text;
    }

};
/*global StringReader, SyntaxError*/

/**
 * Generic TokenStream providing base functionality.
 * @class TokenStreamBase
 * @namespace parserlib.util
 * @constructor
 * @param {String|StringReader} input The text to tokenize or a reader from 
 *      which to read the input.
 */
function TokenStreamBase(input, tokenData){

    /**
     * The string reader for easy access to the text.
     * @type StringReader
     * @property _reader
     * @private
     */
    this._reader = input ? new StringReader(input.toString()) : null;
    
    /**
     * Token object for the last consumed token.
     * @type Token
     * @property _token
     * @private
     */
    this._token = null;    
    
    /**
     * The array of token information.
     * @type Array
     * @property _tokenData
     * @private
     */
    this._tokenData = tokenData;
    
    /**
     * Lookahead token buffer.
     * @type Array
     * @property _lt
     * @private
     */
    this._lt = [];
    
    /**
     * Lookahead token buffer index.
     * @type int
     * @property _ltIndex
     * @private
     */
    this._ltIndex = 0;
    
    this._ltIndexCache = [];
}

/**
 * Accepts an array of token information and outputs
 * an array of token data containing key-value mappings
 * and matching functions that the TokenStream needs.
 * @param {Array} tokens An array of token descriptors.
 * @return {Array} An array of processed token data.
 * @method createTokenData
 * @static
 */
TokenStreamBase.createTokenData = function(tokens){

    var nameMap     = [],
        typeMap     = {},
        tokenData     = tokens.concat([]),
        i            = 0,
        len            = tokenData.length+1;
    
    tokenData.UNKNOWN = -1;
    tokenData.unshift({name:"EOF"});

    for (; i < len; i++){
        nameMap.push(tokenData[i].name);
        tokenData[tokenData[i].name] = i;
        if (tokenData[i].text){
            typeMap[tokenData[i].text] = i;
        }
    }
    
    tokenData.name = function(tt){
        return nameMap[tt];
    };
    
    tokenData.type = function(c){
        return typeMap[c];
    };
    
    return tokenData;
};

TokenStreamBase.prototype = {

    //restore constructor
    constructor: TokenStreamBase,    
    
    //-------------------------------------------------------------------------
    // Matching methods
    //-------------------------------------------------------------------------
    
    /**
     * Determines if the next token matches the given token type.
     * If so, that token is consumed; if not, the token is placed
     * back onto the token stream. You can pass in any number of
     * token types and this will return true if any of the token
     * types is found.
     * @param {int|int[]} tokenTypes Either a single token type or an array of
     *      token types that the next token might be. If an array is passed,
     *      it's assumed that the token can be any of these.
     * @param {variant} channel (Optional) The channel to read from. If not
     *      provided, reads from the default (unnamed) channel.
     * @return {Boolean} True if the token type matches, false if not.
     * @method match
     */
    match: function(tokenTypes, channel){
    
        //always convert to an array, makes things easier
        if (!(tokenTypes instanceof Array)){
            tokenTypes = [tokenTypes];
        }
                
        var tt  = this.get(channel),
            i   = 0,
            len = tokenTypes.length;
            
        while(i < len){
            if (tt == tokenTypes[i++]){
                return true;
            }
        }
        
        //no match found, put the token back
        this.unget();
        return false;
    },    
    
    /**
     * Determines if the next token matches the given token type.
     * If so, that token is consumed; if not, an error is thrown.
     * @param {int|int[]} tokenTypes Either a single token type or an array of
     *      token types that the next token should be. If an array is passed,
     *      it's assumed that the token must be one of these.
     * @param {variant} channel (Optional) The channel to read from. If not
     *      provided, reads from the default (unnamed) channel.
     * @return {void}
     * @method mustMatch
     */    
    mustMatch: function(tokenTypes, channel){

        var token;

        //always convert to an array, makes things easier
        if (!(tokenTypes instanceof Array)){
            tokenTypes = [tokenTypes];
        }

        if (!this.match.apply(this, arguments)){    
            token = this.LT(1);
            throw new SyntaxError("Expected " + this._tokenData[tokenTypes[0]].name + 
                " at line " + token.startLine + ", col " + token.startCol + ".", token.startLine, token.startCol);
        }
    },
    
    //-------------------------------------------------------------------------
    // Consuming methods
    //-------------------------------------------------------------------------
    
    /**
     * Keeps reading from the token stream until either one of the specified
     * token types is found or until the end of the input is reached.
     * @param {int|int[]} tokenTypes Either a single token type or an array of
     *      token types that the next token should be. If an array is passed,
     *      it's assumed that the token must be one of these.
     * @param {variant} channel (Optional) The channel to read from. If not
     *      provided, reads from the default (unnamed) channel.
     * @return {void}
     * @method advance
     */
    advance: function(tokenTypes, channel){
        
        while(this.LA(0) !== 0 && !this.match(tokenTypes, channel)){
            this.get();
        }

        return this.LA(0);    
    },
    
    /**
     * Consumes the next token from the token stream. 
     * @return {int} The token type of the token that was just consumed.
     * @method get
     */      
    get: function(channel){
    
        var tokenInfo   = this._tokenData,
            reader      = this._reader,
            value,
            i           =0,
            len         = tokenInfo.length,
            found       = false,
            token,
            info;
            
        //check the lookahead buffer first
        if (this._lt.length && this._ltIndex >= 0 && this._ltIndex < this._lt.length){  
                           
            i++;
            this._token = this._lt[this._ltIndex++];
            info = tokenInfo[this._token.type];
            
            //obey channels logic
            while((info.channel !== undefined && channel !== info.channel) &&
                    this._ltIndex < this._lt.length){
                this._token = this._lt[this._ltIndex++];
                info = tokenInfo[this._token.type];
                i++;
            }
            
            //here be dragons
            if ((info.channel === undefined || channel === info.channel) &&
                    this._ltIndex <= this._lt.length){
                this._ltIndexCache.push(i);
                return this._token.type;
            }
        }
        
        //call token retriever method
        token = this._getToken();

        //if it should be hidden, don't save a token
        if (token.type > -1 && !tokenInfo[token.type].hide){
                     
            //apply token channel
            token.channel = tokenInfo[token.type].channel;
         
            //save for later
            this._token = token;
            this._lt.push(token);

            //save space that will be moved (must be done before array is truncated)
            this._ltIndexCache.push(this._lt.length - this._ltIndex + i);  
        
            //keep the buffer under 5 items
            if (this._lt.length > 5){
                this._lt.shift();                
            }
            
            //also keep the shift buffer under 5 items
            if (this._ltIndexCache.length > 5){
                this._ltIndexCache.shift();
            }
                
            //update lookahead index
            this._ltIndex = this._lt.length;
        }
            
        /*
         * Skip to the next token if:
         * 1. The token type is marked as hidden.
         * 2. The token type has a channel specified and it isn't the current channel.
         */
        info = tokenInfo[token.type];
        if (info && 
                (info.hide || 
                (info.channel !== undefined && channel !== info.channel))){
            return this.get(channel);
        } else {
            //return just the type
            return token.type;
        }
    },
    
    /**
     * Looks ahead a certain number of tokens and returns the token type at
     * that position. This will throw an error if you lookahead past the
     * end of input, past the size of the lookahead buffer, or back past
     * the first token in the lookahead buffer.
     * @param {int} The index of the token type to retrieve. 0 for the
     *      current token, 1 for the next, -1 for the previous, etc.
     * @return {int} The token type of the token in the given position.
     * @method LA
     */
    LA: function(index){
        var total = index,
            tt;
        if (index > 0){
            //TODO: Store 5 somewhere
            if (index > 5){
                throw new Error("Too much lookahead.");
            }
        
            //get all those tokens
            while(total){
                tt = this.get();   
                total--;                            
            }
            
            //unget all those tokens
            while(total < index){
                this.unget();
                total++;
            }
        } else if (index < 0){
        
            if(this._lt[this._ltIndex+index]){
                tt = this._lt[this._ltIndex+index].type;
            } else {
                throw new Error("Too much lookbehind.");
            }
        
        } else {
            tt = this._token.type;
        }
        
        return tt;
    
    },
    
    /**
     * Looks ahead a certain number of tokens and returns the token at
     * that position. This will throw an error if you lookahead past the
     * end of input, past the size of the lookahead buffer, or back past
     * the first token in the lookahead buffer.
     * @param {int} The index of the token type to retrieve. 0 for the
     *      current token, 1 for the next, -1 for the previous, etc.
     * @return {Object} The token of the token in the given position.
     * @method LA
     */    
    LT: function(index){
    
        //lookahead first to prime the token buffer
        this.LA(index);
        
        //now find the token, subtract one because _ltIndex is already at the next index
        return this._lt[this._ltIndex+index-1];    
    },
    
    /**
     * Returns the token type for the next token in the stream without 
     * consuming it.
     * @return {int} The token type of the next token in the stream.
     * @method peek
     */
    peek: function(){
        return this.LA(1);
    },
    
    /**
     * Returns the actual token object for the last consumed token.
     * @return {Token} The token object for the last consumed token.
     * @method token
     */
    token: function(){
        return this._token;
    },
    
    /**
     * Returns the name of the token for the given token type.
     * @param {int} tokenType The type of token to get the name of.
     * @return {String} The name of the token or "UNKNOWN_TOKEN" for any
     *      invalid token type.
     * @method tokenName
     */
    tokenName: function(tokenType){
        if (tokenType < 0 || tokenType > this._tokenData.length){
            return "UNKNOWN_TOKEN";
        } else {
            return this._tokenData[tokenType].name;
        }
    },
    
    /**
     * Returns the token type value for the given token name.
     * @param {String} tokenName The name of the token whose value should be returned.
     * @return {int} The token type value for the given token name or -1
     *      for an unknown token.
     * @method tokenName
     */    
    tokenType: function(tokenName){
        return this._tokenData[tokenName] || -1;
    },
    
    /**
     * Returns the last consumed token to the token stream.
     * @method unget
     */      
    unget: function(){
        //if (this._ltIndex > -1){
        if (this._ltIndexCache.length){
            this._ltIndex -= this._ltIndexCache.pop();//--;
            this._token = this._lt[this._ltIndex - 1];
        } else {
            throw new Error("Too much lookahead.");
        }
    }

};




parserlib.util = {
StringReader: StringReader,
SyntaxError : SyntaxError,
SyntaxUnit  : SyntaxUnit,
EventTarget : EventTarget,
TokenStreamBase : TokenStreamBase
};
})();


/*
Parser-Lib
Copyright (c) 2009-2011 Nicholas C. Zakas. All rights reserved.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

*/
/* Version v0.2.2, Build time: 17-January-2013 10:26:34 */
(function(){
var EventTarget = parserlib.util.EventTarget,
TokenStreamBase = parserlib.util.TokenStreamBase,
StringReader = parserlib.util.StringReader,
SyntaxError = parserlib.util.SyntaxError,
SyntaxUnit  = parserlib.util.SyntaxUnit;


var Colors = {
    aliceblue       :"#f0f8ff",
    antiquewhite    :"#faebd7",
    aqua            :"#00ffff",
    aquamarine      :"#7fffd4",
    azure           :"#f0ffff",
    beige           :"#f5f5dc",
    bisque          :"#ffe4c4",
    black           :"#000000",
    blanchedalmond  :"#ffebcd",
    blue            :"#0000ff",
    blueviolet      :"#8a2be2",
    brown           :"#a52a2a",
    burlywood       :"#deb887",
    cadetblue       :"#5f9ea0",
    chartreuse      :"#7fff00",
    chocolate       :"#d2691e",
    coral           :"#ff7f50",
    cornflowerblue  :"#6495ed",
    cornsilk        :"#fff8dc",
    crimson         :"#dc143c",
    cyan            :"#00ffff",
    darkblue        :"#00008b",
    darkcyan        :"#008b8b",
    darkgoldenrod   :"#b8860b",
    darkgray        :"#a9a9a9",
    darkgreen       :"#006400",
    darkkhaki       :"#bdb76b",
    darkmagenta     :"#8b008b",
    darkolivegreen  :"#556b2f",
    darkorange      :"#ff8c00",
    darkorchid      :"#9932cc",
    darkred         :"#8b0000",
    darksalmon      :"#e9967a",
    darkseagreen    :"#8fbc8f",
    darkslateblue   :"#483d8b",
    darkslategray   :"#2f4f4f",
    darkturquoise   :"#00ced1",
    darkviolet      :"#9400d3",
    deeppink        :"#ff1493",
    deepskyblue     :"#00bfff",
    dimgray         :"#696969",
    dodgerblue      :"#1e90ff",
    firebrick       :"#b22222",
    floralwhite     :"#fffaf0",
    forestgreen     :"#228b22",
    fuchsia         :"#ff00ff",
    gainsboro       :"#dcdcdc",
    ghostwhite      :"#f8f8ff",
    gold            :"#ffd700",
    goldenrod       :"#daa520",
    gray            :"#808080",
    green           :"#008000",
    greenyellow     :"#adff2f",
    honeydew        :"#f0fff0",
    hotpink         :"#ff69b4",
    indianred       :"#cd5c5c",
    indigo          :"#4b0082",
    ivory           :"#fffff0",
    khaki           :"#f0e68c",
    lavender        :"#e6e6fa",
    lavenderblush   :"#fff0f5",
    lawngreen       :"#7cfc00",
    lemonchiffon    :"#fffacd",
    lightblue       :"#add8e6",
    lightcoral      :"#f08080",
    lightcyan       :"#e0ffff",
    lightgoldenrodyellow  :"#fafad2",
    lightgray       :"#d3d3d3",
    lightgreen      :"#90ee90",
    lightpink       :"#ffb6c1",
    lightsalmon     :"#ffa07a",
    lightseagreen   :"#20b2aa",
    lightskyblue    :"#87cefa",
    lightslategray  :"#778899",
    lightsteelblue  :"#b0c4de",
    lightyellow     :"#ffffe0",
    lime            :"#00ff00",
    limegreen       :"#32cd32",
    linen           :"#faf0e6",
    magenta         :"#ff00ff",
    maroon          :"#800000",
    mediumaquamarine:"#66cdaa",
    mediumblue      :"#0000cd",
    mediumorchid    :"#ba55d3",
    mediumpurple    :"#9370d8",
    mediumseagreen  :"#3cb371",
    mediumslateblue :"#7b68ee",
    mediumspringgreen   :"#00fa9a",
    mediumturquoise :"#48d1cc",
    mediumvioletred :"#c71585",
    midnightblue    :"#191970",
    mintcream       :"#f5fffa",
    mistyrose       :"#ffe4e1",
    moccasin        :"#ffe4b5",
    navajowhite     :"#ffdead",
    navy            :"#000080",
    oldlace         :"#fdf5e6",
    olive           :"#808000",
    olivedrab       :"#6b8e23",
    orange          :"#ffa500",
    orangered       :"#ff4500",
    orchid          :"#da70d6",
    palegoldenrod   :"#eee8aa",
    palegreen       :"#98fb98",
    paleturquoise   :"#afeeee",
    palevioletred   :"#d87093",
    papayawhip      :"#ffefd5",
    peachpuff       :"#ffdab9",
    peru            :"#cd853f",
    pink            :"#ffc0cb",
    plum            :"#dda0dd",
    powderblue      :"#b0e0e6",
    purple          :"#800080",
    red             :"#ff0000",
    rosybrown       :"#bc8f8f",
    royalblue       :"#4169e1",
    saddlebrown     :"#8b4513",
    salmon          :"#fa8072",
    sandybrown      :"#f4a460",
    seagreen        :"#2e8b57",
    seashell        :"#fff5ee",
    sienna          :"#a0522d",
    silver          :"#c0c0c0",
    skyblue         :"#87ceeb",
    slateblue       :"#6a5acd",
    slategray       :"#708090",
    snow            :"#fffafa",
    springgreen     :"#00ff7f",
    steelblue       :"#4682b4",
    tan             :"#d2b48c",
    teal            :"#008080",
    thistle         :"#d8bfd8",
    tomato          :"#ff6347",
    turquoise       :"#40e0d0",
    violet          :"#ee82ee",
    wheat           :"#f5deb3",
    white           :"#ffffff",
    whitesmoke      :"#f5f5f5",
    yellow          :"#ffff00",
    yellowgreen     :"#9acd32",
    //CSS2 system colors http://www.w3.org/TR/css3-color/#css2-system
    activeBorder        :"Active window border.",
    activecaption       :"Active window caption.",
    appworkspace        :"Background color of multiple document interface.",
    background          :"Desktop background.",
    buttonface          :"The face background color for 3-D elements that appear 3-D due to one layer of surrounding border.",
    buttonhighlight     :"The color of the border facing the light source for 3-D elements that appear 3-D due to one layer of surrounding border.",
    buttonshadow        :"The color of the border away from the light source for 3-D elements that appear 3-D due to one layer of surrounding border.",
    buttontext          :"Text on push buttons.",
    captiontext         :"Text in caption, size box, and scrollbar arrow box.",
    graytext            :"Grayed (disabled) text. This color is set to #000 if the current display driver does not support a solid gray color.",
    highlight           :"Item(s) selected in a control.",
    highlighttext       :"Text of item(s) selected in a control.",
    inactiveborder      :"Inactive window border.",
    inactivecaption     :"Inactive window caption.",
    inactivecaptiontext :"Color of text in an inactive caption.",
    infobackground      :"Background color for tooltip controls.",
    infotext            :"Text color for tooltip controls.",
    menu                :"Menu background.",
    menutext            :"Text in menus.",
    scrollbar           :"Scroll bar gray area.",
    threeddarkshadow    :"The color of the darker (generally outer) of the two borders away from the light source for 3-D elements that appear 3-D due to two concentric layers of surrounding border.",
    threedface          :"The face background color for 3-D elements that appear 3-D due to two concentric layers of surrounding border.",
    threedhighlight     :"The color of the lighter (generally outer) of the two borders facing the light source for 3-D elements that appear 3-D due to two concentric layers of surrounding border.",
    threedlightshadow   :"The color of the darker (generally inner) of the two borders facing the light source for 3-D elements that appear 3-D due to two concentric layers of surrounding border.",
    threedshadow        :"The color of the lighter (generally inner) of the two borders away from the light source for 3-D elements that appear 3-D due to two concentric layers of surrounding border.",
    window              :"Window background.",
    windowframe         :"Window frame.",
    windowtext          :"Text in windows."
};
/*global SyntaxUnit, Parser*/
/**
 * Represents a selector combinator (whitespace, +, >).
 * @namespace parserlib.css
 * @class Combinator
 * @extends parserlib.util.SyntaxUnit
 * @constructor
 * @param {String} text The text representation of the unit. 
 * @param {int} line The line of text on which the unit resides.
 * @param {int} col The column of text on which the unit resides.
 */
function Combinator(text, line, col){
    
    SyntaxUnit.call(this, text, line, col, Parser.COMBINATOR_TYPE);

    /**
     * The type of modifier.
     * @type String
     * @property type
     */
    this.type = "unknown";
    
    //pretty simple
    if (/^\s+$/.test(text)){
        this.type = "descendant";
    } else if (text == ">"){
        this.type = "child";
    } else if (text == "+"){
        this.type = "adjacent-sibling";
    } else if (text == "~"){
        this.type = "sibling";
    }

}

Combinator.prototype = new SyntaxUnit();
Combinator.prototype.constructor = Combinator;


/*global SyntaxUnit, Parser*/
/**
 * Represents a media feature, such as max-width:500.
 * @namespace parserlib.css
 * @class MediaFeature
 * @extends parserlib.util.SyntaxUnit
 * @constructor
 * @param {SyntaxUnit} name The name of the feature.
 * @param {SyntaxUnit} value The value of the feature or null if none.
 */
function MediaFeature(name, value){
    
    SyntaxUnit.call(this, "(" + name + (value !== null ? ":" + value : "") + ")", name.startLine, name.startCol, Parser.MEDIA_FEATURE_TYPE);

    /**
     * The name of the media feature
     * @type String
     * @property name
     */
    this.name = name;

    /**
     * The value for the feature or null if there is none.
     * @type SyntaxUnit
     * @property value
     */
    this.value = value;
}

MediaFeature.prototype = new SyntaxUnit();
MediaFeature.prototype.constructor = MediaFeature;


/*global SyntaxUnit, Parser*/
/**
 * Represents an individual media query.
 * @namespace parserlib.css
 * @class MediaQuery
 * @extends parserlib.util.SyntaxUnit
 * @constructor
 * @param {String} modifier The modifier "not" or "only" (or null).
 * @param {String} mediaType The type of media (i.e., "print").
 * @param {Array} parts Array of selectors parts making up this selector.
 * @param {int} line The line of text on which the unit resides.
 * @param {int} col The column of text on which the unit resides.
 */
function MediaQuery(modifier, mediaType, features, line, col){
    
    SyntaxUnit.call(this, (modifier ? modifier + " ": "") + (mediaType ? mediaType : "") + (mediaType && features.length > 0 ? " and " : "") + features.join(" and "), line, col, Parser.MEDIA_QUERY_TYPE); 

    /**
     * The media modifier ("not" or "only")
     * @type String
     * @property modifier
     */
    this.modifier = modifier;

    /**
     * The mediaType (i.e., "print")
     * @type String
     * @property mediaType
     */
    this.mediaType = mediaType;    
    
    /**
     * The parts that make up the selector.
     * @type Array
     * @property features
     */
    this.features = features;

}

MediaQuery.prototype = new SyntaxUnit();
MediaQuery.prototype.constructor = MediaQuery;


/*global Tokens, TokenStream, SyntaxError, Properties, Validation, ValidationError, SyntaxUnit,
    PropertyValue, PropertyValuePart, SelectorPart, SelectorSubPart, Selector,
    PropertyName, Combinator, MediaFeature, MediaQuery, EventTarget */

/**
 * A CSS3 parser.
 * @namespace parserlib.css
 * @class Parser
 * @constructor
 * @param {Object} options (Optional) Various options for the parser:
 *      starHack (true|false) to allow IE6 star hack as valid,
 *      underscoreHack (true|false) to interpret leading underscores
 *      as IE6-7 targeting for known properties, ieFilters (true|false)
 *      to indicate that IE < 8 filters should be accepted and not throw
 *      syntax errors.
 */
function Parser(options){

    //inherit event functionality
    EventTarget.call(this);


    this.options = options || {};

    this._tokenStream = null;
}

//Static constants
Parser.DEFAULT_TYPE = 0;
Parser.COMBINATOR_TYPE = 1;
Parser.MEDIA_FEATURE_TYPE = 2;
Parser.MEDIA_QUERY_TYPE = 3;
Parser.PROPERTY_NAME_TYPE = 4;
Parser.PROPERTY_VALUE_TYPE = 5;
Parser.PROPERTY_VALUE_PART_TYPE = 6;
Parser.SELECTOR_TYPE = 7;
Parser.SELECTOR_PART_TYPE = 8;
Parser.SELECTOR_SUB_PART_TYPE = 9;

Parser.prototype = function(){

    var proto = new EventTarget(),  //new prototype
        prop,
        additions =  {
        
            //restore constructor
            constructor: Parser,
                        
            //instance constants - yuck
            DEFAULT_TYPE : 0,
            COMBINATOR_TYPE : 1,
            MEDIA_FEATURE_TYPE : 2,
            MEDIA_QUERY_TYPE : 3,
            PROPERTY_NAME_TYPE : 4,
            PROPERTY_VALUE_TYPE : 5,
            PROPERTY_VALUE_PART_TYPE : 6,
            SELECTOR_TYPE : 7,
            SELECTOR_PART_TYPE : 8,
            SELECTOR_SUB_PART_TYPE : 9,            
        
            //-----------------------------------------------------------------
            // Grammar
            //-----------------------------------------------------------------
        
            _stylesheet: function(){
            
                /*
                 * stylesheet
                 *  : [ CHARSET_SYM S* STRING S* ';' ]?
                 *    [S|CDO|CDC]* [ import [S|CDO|CDC]* ]*
                 *    [ namespace [S|CDO|CDC]* ]*
                 *    [ [ ruleset | media | page | font_face | keyframes ] [S|CDO|CDC]* ]*
                 *  ;
                 */ 
               
                var tokenStream = this._tokenStream,
                    charset     = null,
                    count,
                    token,
                    tt;
                    
                this.fire("startstylesheet");
            
                //try to read character set
                this._charset();
                
                this._skipCruft();

                //try to read imports - may be more than one
                while (tokenStream.peek() == Tokens.IMPORT_SYM){
                    this._import();
                    this._skipCruft();
                }
                
                //try to read namespaces - may be more than one
                while (tokenStream.peek() == Tokens.NAMESPACE_SYM){
                    this._namespace();
                    this._skipCruft();
                }
                
                //get the next token
                tt = tokenStream.peek();
                
                //try to read the rest
                while(tt > Tokens.EOF){
                
                    try {
                
                        switch(tt){
                            case Tokens.MEDIA_SYM:
                                this._media();
                                this._skipCruft();
                                break;
                            case Tokens.PAGE_SYM:
                                this._page(); 
                                this._skipCruft();
                                break;                   
                            case Tokens.FONT_FACE_SYM:
                                this._font_face(); 
                                this._skipCruft();
                                break;  
                            case Tokens.KEYFRAMES_SYM:
                                this._keyframes(); 
                                this._skipCruft();
                                break;                                
                            case Tokens.UNKNOWN_SYM:  //unknown @ rule
                                tokenStream.get();
                                if (!this.options.strict){
                                
                                    //fire error event
                                    this.fire({
                                        type:       "error",
                                        error:      null,
                                        message:    "Unknown @ rule: " + tokenStream.LT(0).value + ".",
                                        line:       tokenStream.LT(0).startLine,
                                        col:        tokenStream.LT(0).startCol
                                    });                          
                                    
                                    //skip braces
                                    count=0;
                                    while (tokenStream.advance([Tokens.LBRACE, Tokens.RBRACE]) == Tokens.LBRACE){
                                        count++;    //keep track of nesting depth
                                    }
                                    
                                    while(count){
                                        tokenStream.advance([Tokens.RBRACE]);
                                        count--;
                                    }
                                    
                                } else {
                                    //not a syntax error, rethrow it
                                    throw new SyntaxError("Unknown @ rule.", tokenStream.LT(0).startLine, tokenStream.LT(0).startCol);
                                }                                
                                break;
                            case Tokens.S:
                                this._readWhitespace();
                                break;
                            default:                            
                                if(!this._ruleset()){
                                
                                    //error handling for known issues
                                    switch(tt){
                                        case Tokens.CHARSET_SYM:
                                            token = tokenStream.LT(1);
                                            this._charset(false);
                                            throw new SyntaxError("@charset not allowed here.", token.startLine, token.startCol);
                                        case Tokens.IMPORT_SYM:
                                            token = tokenStream.LT(1);
                                            this._import(false);
                                            throw new SyntaxError("@import not allowed here.", token.startLine, token.startCol);
                                        case Tokens.NAMESPACE_SYM:
                                            token = tokenStream.LT(1);
                                            this._namespace(false);
                                            throw new SyntaxError("@namespace not allowed here.", token.startLine, token.startCol);
                                        default:
                                            tokenStream.get();  //get the last token
                                            this._unexpectedToken(tokenStream.token());
                                    }
                                
                                }
                        }
                    } catch(ex) {
                        if (ex instanceof SyntaxError && !this.options.strict){
                            this.fire({
                                type:       "error",
                                error:      ex,
                                message:    ex.message,
                                line:       ex.line,
                                col:        ex.col
                            });                     
                        } else {
                            throw ex;
                        }
                    }
                    
                    tt = tokenStream.peek();
                }
                
                if (tt != Tokens.EOF){
                    this._unexpectedToken(tokenStream.token());
                }
            
                this.fire("endstylesheet");
            },
            
            _charset: function(emit){
                var tokenStream = this._tokenStream,
                    charset,
                    token,
                    line,
                    col;
                    
                if (tokenStream.match(Tokens.CHARSET_SYM)){
                    line = tokenStream.token().startLine;
                    col = tokenStream.token().startCol;
                
                    this._readWhitespace();
                    tokenStream.mustMatch(Tokens.STRING);
                    
                    token = tokenStream.token();
                    charset = token.value;
                    
                    this._readWhitespace();
                    tokenStream.mustMatch(Tokens.SEMICOLON);
                    
                    if (emit !== false){
                        this.fire({ 
                            type:   "charset",
                            charset:charset,
                            line:   line,
                            col:    col
                        });
                    }
                }            
            },
            
            _import: function(emit){
                /*
                 * import
                 *   : IMPORT_SYM S*
                 *    [STRING|URI] S* media_query_list? ';' S*
                 */    
            
                var tokenStream = this._tokenStream,
                    tt,
                    uri,
                    importToken,
                    mediaList   = [];
                
                //read import symbol
                tokenStream.mustMatch(Tokens.IMPORT_SYM);
                importToken = tokenStream.token();
                this._readWhitespace();
                
                tokenStream.mustMatch([Tokens.STRING, Tokens.URI]);
                
                //grab the URI value
                uri = tokenStream.token().value.replace(/(?:url\()?["']([^"']+)["']\)?/, "$1");                

                this._readWhitespace();
                
                mediaList = this._media_query_list();
                
                //must end with a semicolon
                tokenStream.mustMatch(Tokens.SEMICOLON);
                this._readWhitespace();
                
                if (emit !== false){
                    this.fire({
                        type:   "import",
                        uri:    uri,
                        media:  mediaList,
                        line:   importToken.startLine,
                        col:    importToken.startCol
                    });
                }
        
            },
            
            _namespace: function(emit){
                /*
                 * namespace
                 *   : NAMESPACE_SYM S* [namespace_prefix S*]? [STRING|URI] S* ';' S*
                 */    
            
                var tokenStream = this._tokenStream,
                    line,
                    col,
                    prefix,
                    uri;
                
                //read import symbol
                tokenStream.mustMatch(Tokens.NAMESPACE_SYM);
                line = tokenStream.token().startLine;
                col = tokenStream.token().startCol;
                this._readWhitespace();
                
                //it's a namespace prefix - no _namespace_prefix() method because it's just an IDENT
                if (tokenStream.match(Tokens.IDENT)){
                    prefix = tokenStream.token().value;
                    this._readWhitespace();
                }
                
                tokenStream.mustMatch([Tokens.STRING, Tokens.URI]);
                /*if (!tokenStream.match(Tokens.STRING)){
                    tokenStream.mustMatch(Tokens.URI);
                }*/
                
                //grab the URI value
                uri = tokenStream.token().value.replace(/(?:url\()?["']([^"']+)["']\)?/, "$1");                

                this._readWhitespace();

                //must end with a semicolon
                tokenStream.mustMatch(Tokens.SEMICOLON);
                this._readWhitespace();
                
                if (emit !== false){
                    this.fire({
                        type:   "namespace",
                        prefix: prefix,
                        uri:    uri,
                        line:   line,
                        col:    col
                    });
                }
        
            },            
                       
            _media: function(){
                /*
                 * media
                 *   : MEDIA_SYM S* media_query_list S* '{' S* ruleset* '}' S*
                 *   ;
                 */
                var tokenStream     = this._tokenStream,
                    line,
                    col,
                    mediaList;//       = [];
                
                //look for @media
                tokenStream.mustMatch(Tokens.MEDIA_SYM);
                line = tokenStream.token().startLine;
                col = tokenStream.token().startCol;
                
                this._readWhitespace();               

                mediaList = this._media_query_list();

                tokenStream.mustMatch(Tokens.LBRACE);
                this._readWhitespace();
                
                this.fire({
                    type:   "startmedia",
                    media:  mediaList,
                    line:   line,
                    col:    col
                });
                
                while(true) {
                    if (tokenStream.peek() == Tokens.PAGE_SYM){
                        this._page();
                    } else if (!this._ruleset()){
                        break;
                    }                
                }
                
                tokenStream.mustMatch(Tokens.RBRACE);
                this._readWhitespace();
        
                this.fire({
                    type:   "endmedia",
                    media:  mediaList,
                    line:   line,
                    col:    col
                });
            },                           
        

            //CSS3 Media Queries
            _media_query_list: function(){
                /*
                 * media_query_list
                 *   : S* [media_query [ ',' S* media_query ]* ]?
                 *   ;
                 */
                var tokenStream = this._tokenStream,
                    mediaList   = [];
                
                
                this._readWhitespace();
                
                if (tokenStream.peek() == Tokens.IDENT || tokenStream.peek() == Tokens.LPAREN){
                    mediaList.push(this._media_query());
                }
                
                while(tokenStream.match(Tokens.COMMA)){
                    this._readWhitespace();
                    mediaList.push(this._media_query());
                }
                
                return mediaList;
            },
            
            /*
             * Note: "expression" in the grammar maps to the _media_expression
             * method.
             
             */
            _media_query: function(){
                /*
                 * media_query
                 *   : [ONLY | NOT]? S* media_type S* [ AND S* expression ]*
                 *   | expression [ AND S* expression ]*
                 *   ;
                 */
                var tokenStream = this._tokenStream,
                    type        = null,
                    ident       = null,
                    token       = null,
                    expressions = [];
                    
                if (tokenStream.match(Tokens.IDENT)){
                    ident = tokenStream.token().value.toLowerCase();
                    
                    //since there's no custom tokens for these, need to manually check
                    if (ident != "only" && ident != "not"){
                        tokenStream.unget();
                        ident = null;
                    } else {
                        token = tokenStream.token();
                    }
                }
                                
                this._readWhitespace();
                
                if (tokenStream.peek() == Tokens.IDENT){
                    type = this._media_type();
                    if (token === null){
                        token = tokenStream.token();
                    }
                } else if (tokenStream.peek() == Tokens.LPAREN){
                    if (token === null){
                        token = tokenStream.LT(1);
                    }
                    expressions.push(this._media_expression());
                }                               
                
                if (type === null && expressions.length === 0){
                    return null;
                } else {                
                    this._readWhitespace();
                    while (tokenStream.match(Tokens.IDENT)){
                        if (tokenStream.token().value.toLowerCase() != "and"){
                            this._unexpectedToken(tokenStream.token());
                        }
                        
                        this._readWhitespace();
                        expressions.push(this._media_expression());
                    }
                }

                return new MediaQuery(ident, type, expressions, token.startLine, token.startCol);
            },

            //CSS3 Media Queries
            _media_type: function(){
                /*
                 * media_type
                 *   : IDENT
                 *   ;
                 */
                return this._media_feature();           
            },

            /**
             * Note: in CSS3 Media Queries, this is called "expression".
             * Renamed here to avoid conflict with CSS3 Selectors
             * definition of "expression". Also note that "expr" in the
             * grammar now maps to "expression" from CSS3 selectors.
             * @method _media_expression
             * @private
             */
            _media_expression: function(){
                /*
                 * expression
                 *  : '(' S* media_feature S* [ ':' S* expr ]? ')' S*
                 *  ;
                 */
                var tokenStream = this._tokenStream,
                    feature     = null,
                    token,
                    expression  = null;
                
                tokenStream.mustMatch(Tokens.LPAREN);
                
                feature = this._media_feature();
                this._readWhitespace();
                
                if (tokenStream.match(Tokens.COLON)){
                    this._readWhitespace();
                    token = tokenStream.LT(1);
                    expression = this._expression();
                }
                
                tokenStream.mustMatch(Tokens.RPAREN);
                this._readWhitespace();

                return new MediaFeature(feature, (expression ? new SyntaxUnit(expression, token.startLine, token.startCol) : null));            
            },

            //CSS3 Media Queries
            _media_feature: function(){
                /*
                 * media_feature
                 *   : IDENT
                 *   ;
                 */
                var tokenStream = this._tokenStream;
                    
                tokenStream.mustMatch(Tokens.IDENT);
                
                return SyntaxUnit.fromToken(tokenStream.token());            
            },
            
            //CSS3 Paged Media
            _page: function(){
                /*
                 * page:
                 *    PAGE_SYM S* IDENT? pseudo_page? S* 
                 *    '{' S* [ declaration | margin ]? [ ';' S* [ declaration | margin ]? ]* '}' S*
                 *    ;
                 */            
                var tokenStream = this._tokenStream,
                    line,
                    col,
                    identifier  = null,
                    pseudoPage  = null;
                
                //look for @page
                tokenStream.mustMatch(Tokens.PAGE_SYM);
                line = tokenStream.token().startLine;
                col = tokenStream.token().startCol;
                
                this._readWhitespace();
                
                if (tokenStream.match(Tokens.IDENT)){
                    identifier = tokenStream.token().value;

                    //The value 'auto' may not be used as a page name and MUST be treated as a syntax error.
                    if (identifier.toLowerCase() === "auto"){
                        this._unexpectedToken(tokenStream.token());
                    }
                }                
                
                //see if there's a colon upcoming
                if (tokenStream.peek() == Tokens.COLON){
                    pseudoPage = this._pseudo_page();
                }
            
                this._readWhitespace();
                
                this.fire({
                    type:   "startpage",
                    id:     identifier,
                    pseudo: pseudoPage,
                    line:   line,
                    col:    col
                });                   

                this._readDeclarations(true, true);                
                
                this.fire({
                    type:   "endpage",
                    id:     identifier,
                    pseudo: pseudoPage,
                    line:   line,
                    col:    col
                });             
            
            },
            
            //CSS3 Paged Media
            _margin: function(){
                /*
                 * margin :
                 *    margin_sym S* '{' declaration [ ';' S* declaration? ]* '}' S*
                 *    ;
                 */
                var tokenStream = this._tokenStream,
                    line,
                    col,
                    marginSym   = this._margin_sym();

                if (marginSym){
                    line = tokenStream.token().startLine;
                    col = tokenStream.token().startCol;
                
                    this.fire({
                        type: "startpagemargin",
                        margin: marginSym,
                        line:   line,
                        col:    col
                    });    
                    
                    this._readDeclarations(true);

                    this.fire({
                        type: "endpagemargin",
                        margin: marginSym,
                        line:   line,
                        col:    col
                    });    
                    return true;
                } else {
                    return false;
                }
            },

            //CSS3 Paged Media
            _margin_sym: function(){
            
                /*
                 * margin_sym :
                 *    TOPLEFTCORNER_SYM | 
                 *    TOPLEFT_SYM | 
                 *    TOPCENTER_SYM | 
                 *    TOPRIGHT_SYM | 
                 *    TOPRIGHTCORNER_SYM |
                 *    BOTTOMLEFTCORNER_SYM | 
                 *    BOTTOMLEFT_SYM | 
                 *    BOTTOMCENTER_SYM | 
                 *    BOTTOMRIGHT_SYM |
                 *    BOTTOMRIGHTCORNER_SYM |
                 *    LEFTTOP_SYM |
                 *    LEFTMIDDLE_SYM |
                 *    LEFTBOTTOM_SYM |
                 *    RIGHTTOP_SYM |
                 *    RIGHTMIDDLE_SYM |
                 *    RIGHTBOTTOM_SYM 
                 *    ;
                 */
            
                var tokenStream = this._tokenStream;
            
                if(tokenStream.match([Tokens.TOPLEFTCORNER_SYM, Tokens.TOPLEFT_SYM,
                        Tokens.TOPCENTER_SYM, Tokens.TOPRIGHT_SYM, Tokens.TOPRIGHTCORNER_SYM,
                        Tokens.BOTTOMLEFTCORNER_SYM, Tokens.BOTTOMLEFT_SYM, 
                        Tokens.BOTTOMCENTER_SYM, Tokens.BOTTOMRIGHT_SYM,
                        Tokens.BOTTOMRIGHTCORNER_SYM, Tokens.LEFTTOP_SYM, 
                        Tokens.LEFTMIDDLE_SYM, Tokens.LEFTBOTTOM_SYM, Tokens.RIGHTTOP_SYM,
                        Tokens.RIGHTMIDDLE_SYM, Tokens.RIGHTBOTTOM_SYM]))
                {
                    return SyntaxUnit.fromToken(tokenStream.token());                
                } else {
                    return null;
                }
            
            },
            
            _pseudo_page: function(){
                /*
                 * pseudo_page
                 *   : ':' IDENT
                 *   ;    
                 */
        
                var tokenStream = this._tokenStream;
                
                tokenStream.mustMatch(Tokens.COLON);
                tokenStream.mustMatch(Tokens.IDENT);
                
                //TODO: CSS3 Paged Media says only "left", "center", and "right" are allowed
                
                return tokenStream.token().value;
            },
            
            _font_face: function(){
                /*
                 * font_face
                 *   : FONT_FACE_SYM S* 
                 *     '{' S* declaration [ ';' S* declaration ]* '}' S*
                 *   ;
                 */     
                var tokenStream = this._tokenStream,
                    line,
                    col;
                
                //look for @page
                tokenStream.mustMatch(Tokens.FONT_FACE_SYM);
                line = tokenStream.token().startLine;
                col = tokenStream.token().startCol;
                
                this._readWhitespace();

                this.fire({
                    type:   "startfontface",
                    line:   line,
                    col:    col
                });                    
                
                this._readDeclarations(true);
                
                this.fire({
                    type:   "endfontface",
                    line:   line,
                    col:    col
                });              
            },

            _operator: function(inFunction){
            
                /*
                 * operator (outside function)
                 *  : '/' S* | ',' S* | /( empty )/
                 * operator (inside function)
                 *  : '/' S* | '+' S* | '*' S* | '-' S* /( empty )/
                 *  ;
                 */    
                 
                var tokenStream = this._tokenStream,
                    token       = null;
                
                if (tokenStream.match([Tokens.SLASH, Tokens.COMMA]) ||
                    (inFunction && tokenStream.match([Tokens.PLUS, Tokens.STAR, Tokens.MINUS]))){
                    token =  tokenStream.token();
                    this._readWhitespace();
                } 
                return token ? PropertyValuePart.fromToken(token) : null;
                
            },
            
            _combinator: function(){
            
                /*
                 * combinator
                 *  : PLUS S* | GREATER S* | TILDE S* | S+
                 *  ;
                 */    
                 
                var tokenStream = this._tokenStream,
                    value       = null,
                    token;
                
                if(tokenStream.match([Tokens.PLUS, Tokens.GREATER, Tokens.TILDE])){                
                    token = tokenStream.token();
                    value = new Combinator(token.value, token.startLine, token.startCol);
                    this._readWhitespace();
                }
                
                return value;
            },
            
            _unary_operator: function(){
            
                /*
                 * unary_operator
                 *  : '-' | '+'
                 *  ;
                 */
                 
                var tokenStream = this._tokenStream;
                
                if (tokenStream.match([Tokens.MINUS, Tokens.PLUS])){
                    return tokenStream.token().value;
                } else {
                    return null;
                }         
            },
            
            _property: function(){
            
                /*
                 * property
                 *   : IDENT S*
                 *   ;        
                 */
                 
                var tokenStream = this._tokenStream,
                    value       = null,
                    hack        = null,
                    tokenValue,
                    token,
                    line,
                    col;
                    
                //check for star hack - throws error if not allowed
                if (tokenStream.peek() == Tokens.STAR && this.options.starHack){
                    tokenStream.get();
                    token = tokenStream.token();
                    hack = token.value;
                    line = token.startLine;
                    col = token.startCol;
                }
                
                if(tokenStream.match(Tokens.IDENT)){
                    token = tokenStream.token();
                    tokenValue = token.value;
                    
                    //check for underscore hack - no error if not allowed because it's valid CSS syntax
                    if (tokenValue.charAt(0) == "_" && this.options.underscoreHack){
                        hack = "_";
                        tokenValue = tokenValue.substring(1);
                    }
                    
                    value = new PropertyName(tokenValue, hack, (line||token.startLine), (col||token.startCol));
                    this._readWhitespace();
                }
                
                return value;
            },
        
            //Augmented with CSS3 Selectors
            _ruleset: function(){
                /*
                 * ruleset
                 *   : selectors_group
                 *     '{' S* declaration? [ ';' S* declaration? ]* '}' S*
                 *   ;    
                 */    
                 
                var tokenStream = this._tokenStream,
                    tt,
                    selectors;


                /*
                 * Error Recovery: If even a single selector fails to parse,
                 * then the entire ruleset should be thrown away.
                 */
                try {
                    selectors = this._selectors_group();
                } catch (ex){
                    if (ex instanceof SyntaxError && !this.options.strict){
                    
                        //fire error event
                        this.fire({
                            type:       "error",
                            error:      ex,
                            message:    ex.message,
                            line:       ex.line,
                            col:        ex.col
                        });                          
                        
                        //skip over everything until closing brace
                        tt = tokenStream.advance([Tokens.RBRACE]);
                        if (tt == Tokens.RBRACE){
                            //if there's a right brace, the rule is finished so don't do anything
                        } else {
                            //otherwise, rethrow the error because it wasn't handled properly
                            throw ex;
                        }                        
                        
                    } else {
                        //not a syntax error, rethrow it
                        throw ex;
                    }                
                
                    //trigger parser to continue
                    return true;
                }
                
                //if it got here, all selectors parsed
                if (selectors){ 
                                    
                    this.fire({
                        type:       "startrule",
                        selectors:  selectors,
                        line:       selectors[0].line,
                        col:        selectors[0].col
                    });                
                    
                    this._readDeclarations(true);                
                    
                    this.fire({
                        type:       "endrule",
                        selectors:  selectors,
                        line:       selectors[0].line,
                        col:        selectors[0].col
                    });  
                    
                }
                
                return selectors;
                
            },

            //CSS3 Selectors
            _selectors_group: function(){
            
                /*            
                 * selectors_group
                 *   : selector [ COMMA S* selector ]*
                 *   ;
                 */           
                var tokenStream = this._tokenStream,
                    selectors   = [],
                    selector;
                    
                selector = this._selector();
                if (selector !== null){
                
                    selectors.push(selector);
                    while(tokenStream.match(Tokens.COMMA)){
                        this._readWhitespace();
                        selector = this._selector();
                        if (selector !== null){
                            selectors.push(selector);
                        } else {
                            this._unexpectedToken(tokenStream.LT(1));
                        }
                    }
                }

                return selectors.length ? selectors : null;
            },
                
            //CSS3 Selectors
            _selector: function(){
                /*
                 * selector
                 *   : simple_selector_sequence [ combinator simple_selector_sequence ]*
                 *   ;    
                 */
                 
                var tokenStream = this._tokenStream,
                    selector    = [],
                    nextSelector = null,
                    combinator  = null,
                    ws          = null;
                
                //if there's no simple selector, then there's no selector
                nextSelector = this._simple_selector_sequence();
                if (nextSelector === null){
                    return null;
                }
                
                selector.push(nextSelector);
                
                do {
                    
                    //look for a combinator
                    combinator = this._combinator();
                    
                    if (combinator !== null){
                        selector.push(combinator);
                        nextSelector = this._simple_selector_sequence();
                        
                        //there must be a next selector
                        if (nextSelector === null){
                            this._unexpectedToken(tokenStream.LT(1));
                        } else {
                        
                            //nextSelector is an instance of SelectorPart
                            selector.push(nextSelector);
                        }
                    } else {
                        
                        //if there's not whitespace, we're done
                        if (this._readWhitespace()){           
        
                            //add whitespace separator
                            ws = new Combinator(tokenStream.token().value, tokenStream.token().startLine, tokenStream.token().startCol);
                            
                            //combinator is not required
                            combinator = this._combinator();
                            
                            //selector is required if there's a combinator
                            nextSelector = this._simple_selector_sequence();
                            if (nextSelector === null){                        
                                if (combinator !== null){
                                    this._unexpectedToken(tokenStream.LT(1));
                                }
                            } else {
                                
                                if (combinator !== null){
                                    selector.push(combinator);
                                } else {
                                    selector.push(ws);
                                }
                                
                                selector.push(nextSelector);
                            }     
                        } else {
                            break;
                        }               
                    
                    }
                } while(true);
                
                return new Selector(selector, selector[0].line, selector[0].col);
            },
            
            //CSS3 Selectors
            _simple_selector_sequence: function(){
                /*
                 * simple_selector_sequence
                 *   : [ type_selector | universal ]
                 *     [ HASH | class | attrib | pseudo | negation ]*
                 *   | [ HASH | class | attrib | pseudo | negation ]+
                 *   ;
                 */
                 
                var tokenStream = this._tokenStream,
                
                    //parts of a simple selector
                    elementName = null,
                    modifiers   = [],
                    
                    //complete selector text
                    selectorText= "",

                    //the different parts after the element name to search for
                    components  = [
                        //HASH
                        function(){
                            return tokenStream.match(Tokens.HASH) ?
                                    new SelectorSubPart(tokenStream.token().value, "id", tokenStream.token().startLine, tokenStream.token().startCol) :
                                    null;
                        },
                        this._class,
                        this._attrib,
                        this._pseudo,
                        this._negation
                    ],
                    i           = 0,
                    len         = components.length,
                    component   = null,
                    found       = false,
                    line,
                    col;
                    
                    
                //get starting line and column for the selector
                line = tokenStream.LT(1).startLine;
                col = tokenStream.LT(1).startCol;
                                        
                elementName = this._type_selector();
                if (!elementName){
                    elementName = this._universal();
                }
                
                if (elementName !== null){
                    selectorText += elementName;
                }                
                
                while(true){

                    //whitespace means we're done
                    if (tokenStream.peek() === Tokens.S){
                        break;
                    }
                
                    //check for each component
                    while(i < len && component === null){
                        component = components[i++].call(this);
                    }
        
                    if (component === null){
                    
                        //we don't have a selector
                        if (selectorText === ""){
                            return null;
                        } else {
                            break;
                        }
                    } else {
                        i = 0;
                        modifiers.push(component);
                        selectorText += component.toString(); 
                        component = null;
                    }
                }

                 
                return selectorText !== "" ?
                        new SelectorPart(elementName, modifiers, selectorText, line, col) :
                        null;
            },            
            
            //CSS3 Selectors
            _type_selector: function(){
                /*
                 * type_selector
                 *   : [ namespace_prefix ]? element_name
                 *   ;
                 */
                 
                var tokenStream = this._tokenStream,
                    ns          = this._namespace_prefix(),
                    elementName = this._element_name();
                    
                if (!elementName){                    
                    /*
                     * Need to back out the namespace that was read due to both
                     * type_selector and universal reading namespace_prefix
                     * first. Kind of hacky, but only way I can figure out
                     * right now how to not change the grammar.
                     */
                    if (ns){
                        tokenStream.unget();
                        if (ns.length > 1){
                            tokenStream.unget();
                        }
                    }
                
                    return null;
                } else {     
                    if (ns){
                        elementName.text = ns + elementName.text;
                        elementName.col -= ns.length;
                    }
                    return elementName;
                }
            },
            
            //CSS3 Selectors
            _class: function(){
                /*
                 * class
                 *   : '.' IDENT
                 *   ;
                 */    
                 
                var tokenStream = this._tokenStream,
                    token;
                
                if (tokenStream.match(Tokens.DOT)){
                    tokenStream.mustMatch(Tokens.IDENT);    
                    token = tokenStream.token();
                    return new SelectorSubPart("." + token.value, "class", token.startLine, token.startCol - 1);        
                } else {
                    return null;
                }
        
            },
            
            //CSS3 Selectors
            _element_name: function(){
                /*
                 * element_name
                 *   : IDENT
                 *   ;
                 */    
                
                var tokenStream = this._tokenStream,
                    token;
                
                if (tokenStream.match(Tokens.IDENT)){
                    token = tokenStream.token();
                    return new SelectorSubPart(token.value, "elementName", token.startLine, token.startCol);        
                
                } else {
                    return null;
                }
            },
            
            //CSS3 Selectors
            _namespace_prefix: function(){
                /*            
                 * namespace_prefix
                 *   : [ IDENT | '*' ]? '|'
                 *   ;
                 */
                var tokenStream = this._tokenStream,
                    value       = "";
                    
                //verify that this is a namespace prefix
                if (tokenStream.LA(1) === Tokens.PIPE || tokenStream.LA(2) === Tokens.PIPE){
                        
                    if(tokenStream.match([Tokens.IDENT, Tokens.STAR])){
                        value += tokenStream.token().value;
                    }
                    
                    tokenStream.mustMatch(Tokens.PIPE);
                    value += "|";
                    
                }
                
                return value.length ? value : null;                
            },
            
            //CSS3 Selectors
            _universal: function(){
                /*
                 * universal
                 *   : [ namespace_prefix ]? '*'
                 *   ;            
                 */
                var tokenStream = this._tokenStream,
                    value       = "",
                    ns;
                    
                ns = this._namespace_prefix();
                if(ns){
                    value += ns;
                }
                
                if(tokenStream.match(Tokens.STAR)){
                    value += "*";
                }
                
                return value.length ? value : null;
                
           },
            
            //CSS3 Selectors
            _attrib: function(){
                /*
                 * attrib
                 *   : '[' S* [ namespace_prefix ]? IDENT S*
                 *         [ [ PREFIXMATCH |
                 *             SUFFIXMATCH |
                 *             SUBSTRINGMATCH |
                 *             '=' |
                 *             INCLUDES |
                 *             DASHMATCH ] S* [ IDENT | STRING ] S*
                 *         ]? ']'
                 *   ;    
                 */
                 
                var tokenStream = this._tokenStream,
                    value       = null,
                    ns,
                    token;
                
                if (tokenStream.match(Tokens.LBRACKET)){
                    token = tokenStream.token();
                    value = token.value;
                    value += this._readWhitespace();
                    
                    ns = this._namespace_prefix();
                    
                    if (ns){
                        value += ns;
                    }
                                        
                    tokenStream.mustMatch(Tokens.IDENT);
                    value += tokenStream.token().value;                    
                    value += this._readWhitespace();
                    
                    if(tokenStream.match([Tokens.PREFIXMATCH, Tokens.SUFFIXMATCH, Tokens.SUBSTRINGMATCH,
                            Tokens.EQUALS, Tokens.INCLUDES, Tokens.DASHMATCH])){
                    
                        value += tokenStream.token().value;                    
                        value += this._readWhitespace();
                        
                        tokenStream.mustMatch([Tokens.IDENT, Tokens.STRING]);
                        value += tokenStream.token().value;                    
                        value += this._readWhitespace();
                    }
                    
                    tokenStream.mustMatch(Tokens.RBRACKET);
                                        
                    return new SelectorSubPart(value + "]", "attribute", token.startLine, token.startCol);
                } else {
                    return null;
                }
            },
            
            //CSS3 Selectors
            _pseudo: function(){
            
                /*
                 * pseudo
                 *   : ':' ':'? [ IDENT | functional_pseudo ]
                 *   ;    
                 */   
            
                var tokenStream = this._tokenStream,
                    pseudo      = null,
                    colons      = ":",
                    line,
                    col;
                
                if (tokenStream.match(Tokens.COLON)){
                
                    if (tokenStream.match(Tokens.COLON)){
                        colons += ":";
                    }
                
                    if (tokenStream.match(Tokens.IDENT)){
                        pseudo = tokenStream.token().value;
                        line = tokenStream.token().startLine;
                        col = tokenStream.token().startCol - colons.length;
                    } else if (tokenStream.peek() == Tokens.FUNCTION){
                        line = tokenStream.LT(1).startLine;
                        col = tokenStream.LT(1).startCol - colons.length;
                        pseudo = this._functional_pseudo();
                    }
                    
                    if (pseudo){
                        pseudo = new SelectorSubPart(colons + pseudo, "pseudo", line, col);
                    }
                }
        
                return pseudo;
            },
            
            //CSS3 Selectors
            _functional_pseudo: function(){
                /*
                 * functional_pseudo
                 *   : FUNCTION S* expression ')'
                 *   ;
                */            
                
                var tokenStream = this._tokenStream,
                    value = null;
                
                if(tokenStream.match(Tokens.FUNCTION)){
                    value = tokenStream.token().value;
                    value += this._readWhitespace();
                    value += this._expression();
                    tokenStream.mustMatch(Tokens.RPAREN);
                    value += ")";
                }
                
                return value;
            },
            
            //CSS3 Selectors
            _expression: function(){
                /*
                 * expression
                 *   : [ [ PLUS | '-' | DIMENSION | NUMBER | STRING | IDENT ] S* ]+
                 *   ;
                 */
                 
                var tokenStream = this._tokenStream,
                    value       = "";
                    
                while(tokenStream.match([Tokens.PLUS, Tokens.MINUS, Tokens.DIMENSION,
                        Tokens.NUMBER, Tokens.STRING, Tokens.IDENT, Tokens.LENGTH,
                        Tokens.FREQ, Tokens.ANGLE, Tokens.TIME,
                        Tokens.RESOLUTION, Tokens.SLASH])){
                    
                    value += tokenStream.token().value;
                    value += this._readWhitespace();                        
                }
                
                return value.length ? value : null;
                
            },

            //CSS3 Selectors
            _negation: function(){
                /*            
                 * negation
                 *   : NOT S* negation_arg S* ')'
                 *   ;
                 */

                var tokenStream = this._tokenStream,
                    line,
                    col,
                    value       = "",
                    arg,
                    subpart     = null;
                    
                if (tokenStream.match(Tokens.NOT)){
                    value = tokenStream.token().value;
                    line = tokenStream.token().startLine;
                    col = tokenStream.token().startCol;
                    value += this._readWhitespace();
                    arg = this._negation_arg();
                    value += arg;
                    value += this._readWhitespace();
                    tokenStream.match(Tokens.RPAREN);
                    value += tokenStream.token().value;
                    
                    subpart = new SelectorSubPart(value, "not", line, col);
                    subpart.args.push(arg);
                }
                
                return subpart;
            },
            
            //CSS3 Selectors
            _negation_arg: function(){            
                /*
                 * negation_arg
                 *   : type_selector | universal | HASH | class | attrib | pseudo
                 *   ;            
                 */           
                 
                var tokenStream = this._tokenStream,
                    args        = [
                        this._type_selector,
                        this._universal,
                        function(){
                            return tokenStream.match(Tokens.HASH) ?
                                    new SelectorSubPart(tokenStream.token().value, "id", tokenStream.token().startLine, tokenStream.token().startCol) :
                                    null;                        
                        },
                        this._class,
                        this._attrib,
                        this._pseudo                    
                    ],
                    arg         = null,
                    i           = 0,
                    len         = args.length,
                    elementName,
                    line,
                    col,
                    part;
                    
                line = tokenStream.LT(1).startLine;
                col = tokenStream.LT(1).startCol;
                
                while(i < len && arg === null){
                    
                    arg = args[i].call(this);
                    i++;
                }
                
                //must be a negation arg
                if (arg === null){
                    this._unexpectedToken(tokenStream.LT(1));
                }
 
                //it's an element name
                if (arg.type == "elementName"){
                    part = new SelectorPart(arg, [], arg.toString(), line, col);
                } else {
                    part = new SelectorPart(null, [arg], arg.toString(), line, col);
                }
                
                return part;                
            },
            
            _declaration: function(){
            
                /*
                 * declaration
                 *   : property ':' S* expr prio?
                 *   | /( empty )/
                 *   ;     
                 */    
            
                var tokenStream = this._tokenStream,
                    property    = null,
                    expr        = null,
                    prio        = null,
                    error       = null,
                    invalid     = null,
                    propertyName= "";
                
                property = this._property();
                if (property !== null){

                    tokenStream.mustMatch(Tokens.COLON);
                    this._readWhitespace();
                    
                    expr = this._expr();
                    
                    //if there's no parts for the value, it's an error
                    if (!expr || expr.length === 0){
                        this._unexpectedToken(tokenStream.LT(1));
                    }
                    
                    prio = this._prio();
                    
                    /*
                     * If hacks should be allowed, then only check the root
                     * property. If hacks should not be allowed, treat
                     * _property or *property as invalid properties.
                     */
                    propertyName = property.toString();
                    if (this.options.starHack && property.hack == "*" ||
                            this.options.underscoreHack && property.hack == "_") {
                         
                        propertyName = property.text;
                    }
                    
                    try {
                        this._validateProperty(propertyName, expr);
                    } catch (ex) {
                        invalid = ex;
                    }
                    
                    this.fire({
                        type:       "property",
                        property:   property,
                        value:      expr,
                        important:  prio,
                        line:       property.line,
                        col:        property.col,
                        invalid:    invalid
                    });                      
                    
                    return true;
                } else {
                    return false;
                }
            },
            
            _prio: function(){
                /*
                 * prio
                 *   : IMPORTANT_SYM S*
                 *   ;    
                 */
                 
                var tokenStream = this._tokenStream,
                    result      = tokenStream.match(Tokens.IMPORTANT_SYM);
                    
                this._readWhitespace();
                return result;
            },
            
            _expr: function(inFunction){
                /*
                 * expr
                 *   : term [ operator term ]*
                 *   ;
                 */
        
                var tokenStream = this._tokenStream,
                    values      = [],
					//valueParts	= [],
                    value       = null,
                    operator    = null;
                    
                value = this._term();
                if (value !== null){
                
                    values.push(value);
                    
                    do {
                        operator = this._operator(inFunction);

                        //if there's an operator, keep building up the value parts
                        if (operator){
                            values.push(operator);
                        } /*else {
                            //if there's not an operator, you have a full value
							values.push(new PropertyValue(valueParts, valueParts[0].line, valueParts[0].col));
							valueParts = [];
						}*/
                        
                        value = this._term();
                        
                        if (value === null){
                            break;
                        } else {
                            values.push(value);
                        }
                    } while(true);
                }
				
				//cleanup
                /*if (valueParts.length){
                    values.push(new PropertyValue(valueParts, valueParts[0].line, valueParts[0].col));
                }*/
        
                return values.length > 0 ? new PropertyValue(values, values[0].line, values[0].col) : null;
            },
            
            _term: function(){                       
            
                /*
                 * term
                 *   : unary_operator?
                 *     [ NUMBER S* | PERCENTAGE S* | LENGTH S* | ANGLE S* |
                 *       TIME S* | FREQ S* | function | ie_function ]
                 *   | STRING S* | IDENT S* | URI S* | UNICODERANGE S* | hexcolor
                 *   ;
                 */    
        
                var tokenStream = this._tokenStream,
                    unary       = null,
                    value       = null,
                    token,
                    line,
                    col;
                    
                //returns the operator or null
                unary = this._unary_operator();
                if (unary !== null){
                    line = tokenStream.token().startLine;
                    col = tokenStream.token().startCol;
                }                
               
                //exception for IE filters
                if (tokenStream.peek() == Tokens.IE_FUNCTION && this.options.ieFilters){
                
                    value = this._ie_function();
                    if (unary === null){
                        line = tokenStream.token().startLine;
                        col = tokenStream.token().startCol;
                    }
                
                //see if there's a simple match
                } else if (tokenStream.match([Tokens.NUMBER, Tokens.PERCENTAGE, Tokens.LENGTH,
                        Tokens.ANGLE, Tokens.TIME,
                        Tokens.FREQ, Tokens.STRING, Tokens.IDENT, Tokens.URI, Tokens.UNICODE_RANGE])){
                 
                    value = tokenStream.token().value;
                    if (unary === null){
                        line = tokenStream.token().startLine;
                        col = tokenStream.token().startCol;
                    }
                    this._readWhitespace();
                } else {
                
                    //see if it's a color
                    token = this._hexcolor();
                    if (token === null){
                    
                        //if there's no unary, get the start of the next token for line/col info
                        if (unary === null){
                            line = tokenStream.LT(1).startLine;
                            col = tokenStream.LT(1).startCol;
                        }                    
                    
                        //has to be a function
                        if (value === null){
                            
                            /*
                             * This checks for alpha(opacity=0) style of IE
                             * functions. IE_FUNCTION only presents progid: style.
                             */
                            if (tokenStream.LA(3) == Tokens.EQUALS && this.options.ieFilters){
                                value = this._ie_function();
                            } else {
                                value = this._function();
                            }
                        }

                        /*if (value === null){
                            return null;
                            //throw new Error("Expected identifier at line " + tokenStream.token().startLine + ", character " +  tokenStream.token().startCol + ".");
                        }*/
                    
                    } else {
                        value = token.value;
                        if (unary === null){
                            line = token.startLine;
                            col = token.startCol;
                        }                    
                    }
                
                }                
                
                return value !== null ?
                        new PropertyValuePart(unary !== null ? unary + value : value, line, col) :
                        null;
        
            },
            
            _function: function(){
            
                /*
                 * function
                 *   : FUNCTION S* expr ')' S*
                 *   ;
                 */
                 
                var tokenStream = this._tokenStream,
                    functionText = null,
                    expr        = null,
                    lt;
                    
                if (tokenStream.match(Tokens.FUNCTION)){
                    functionText = tokenStream.token().value;
                    this._readWhitespace();
                    expr = this._expr(true);
                    functionText += expr;
                    
                    //START: Horrible hack in case it's an IE filter
                    if (this.options.ieFilters && tokenStream.peek() == Tokens.EQUALS){
                        do {
                        
                            if (this._readWhitespace()){
                                functionText += tokenStream.token().value;
                            }
                            
                            //might be second time in the loop
                            if (tokenStream.LA(0) == Tokens.COMMA){
                                functionText += tokenStream.token().value;
                            }
                        
                            tokenStream.match(Tokens.IDENT);
                            functionText += tokenStream.token().value;
                            
                            tokenStream.match(Tokens.EQUALS);
                            functionText += tokenStream.token().value;
                            
                            //functionText += this._term();
                            lt = tokenStream.peek();
                            while(lt != Tokens.COMMA && lt != Tokens.S && lt != Tokens.RPAREN){
                                tokenStream.get();
                                functionText += tokenStream.token().value;
                                lt = tokenStream.peek();
                            }
                        } while(tokenStream.match([Tokens.COMMA, Tokens.S]));
                    }

                    //END: Horrible Hack
                    
                    tokenStream.match(Tokens.RPAREN);    
                    functionText += ")";
                    this._readWhitespace();
                }                
                
                return functionText;
            }, 
            
            _ie_function: function(){
            
                /* (My own extension)
                 * ie_function
                 *   : IE_FUNCTION S* IDENT '=' term [S* ','? IDENT '=' term]+ ')' S*
                 *   ;
                 */
                 
                var tokenStream = this._tokenStream,
                    functionText = null,
                    expr        = null,
                    lt;
                    
                //IE function can begin like a regular function, too
                if (tokenStream.match([Tokens.IE_FUNCTION, Tokens.FUNCTION])){
                    functionText = tokenStream.token().value;
                    
                    do {
                    
                        if (this._readWhitespace()){
                            functionText += tokenStream.token().value;
                        }
                        
                        //might be second time in the loop
                        if (tokenStream.LA(0) == Tokens.COMMA){
                            functionText += tokenStream.token().value;
                        }
                    
                        tokenStream.match(Tokens.IDENT);
                        functionText += tokenStream.token().value;
                        
                        tokenStream.match(Tokens.EQUALS);
                        functionText += tokenStream.token().value;
                        
                        //functionText += this._term();
                        lt = tokenStream.peek();
                        while(lt != Tokens.COMMA && lt != Tokens.S && lt != Tokens.RPAREN){
                            tokenStream.get();
                            functionText += tokenStream.token().value;
                            lt = tokenStream.peek();
                        }
                    } while(tokenStream.match([Tokens.COMMA, Tokens.S]));                    
                    
                    tokenStream.match(Tokens.RPAREN);    
                    functionText += ")";
                    this._readWhitespace();
                }                
                
                return functionText;
            }, 
            
            _hexcolor: function(){
                /*
                 * There is a constraint on the color that it must
                 * have either 3 or 6 hex-digits (i.e., [0-9a-fA-F])
                 * after the "#"; e.g., "#000" is OK, but "#abcd" is not.
                 *
                 * hexcolor
                 *   : HASH S*
                 *   ;
                 */
                 
                var tokenStream = this._tokenStream,
                    token = null,
                    color;
                    
                if(tokenStream.match(Tokens.HASH)){
                
                    //need to do some validation here
                    
                    token = tokenStream.token();
                    color = token.value;
                    if (!/#[a-f0-9]{3,6}/i.test(color)){
                        throw new SyntaxError("Expected a hex color but found '" + color + "' at line " + token.startLine + ", col " + token.startCol + ".", token.startLine, token.startCol);
                    }
                    this._readWhitespace();
                }
                
                return token;
            },
            
            //-----------------------------------------------------------------
            // Animations methods
            //-----------------------------------------------------------------
            
            _keyframes: function(){
            
                /*
                 * keyframes:
                 *   : KEYFRAMES_SYM S* keyframe_name S* '{' S* keyframe_rule* '}' {
                 *   ;
                 */
                var tokenStream = this._tokenStream,
                    token,
                    tt,
                    name,
                    prefix = "";            
                    
                tokenStream.mustMatch(Tokens.KEYFRAMES_SYM);
                token = tokenStream.token();
                if (/^@\-([^\-]+)\-/.test(token.value)) {
                    prefix = RegExp.$1;
                }
                
                this._readWhitespace();
                name = this._keyframe_name();
                
                this._readWhitespace();
                tokenStream.mustMatch(Tokens.LBRACE);
                    
                this.fire({
                    type:   "startkeyframes",
                    name:   name,
                    prefix: prefix,
                    line:   token.startLine,
                    col:    token.startCol
                });                
                
                this._readWhitespace();
                tt = tokenStream.peek();
                
                //check for key
                while(tt == Tokens.IDENT || tt == Tokens.PERCENTAGE) {
                    this._keyframe_rule();
                    this._readWhitespace();
                    tt = tokenStream.peek();
                }           
                
                this.fire({
                    type:   "endkeyframes",
                    name:   name,
                    prefix: prefix,
                    line:   token.startLine,
                    col:    token.startCol
                });                      
                    
                this._readWhitespace();
                tokenStream.mustMatch(Tokens.RBRACE);                    
                
            },
            
            _keyframe_name: function(){
            
                /*
                 * keyframe_name:
                 *   : IDENT
                 *   | STRING
                 *   ;
                 */
                var tokenStream = this._tokenStream,
                    token;

                tokenStream.mustMatch([Tokens.IDENT, Tokens.STRING]);
                return SyntaxUnit.fromToken(tokenStream.token());            
            },
            
            _keyframe_rule: function(){
            
                /*
                 * keyframe_rule:
                 *   : key_list S* 
                 *     '{' S* declaration [ ';' S* declaration ]* '}' S*
                 *   ;
                 */
                var tokenStream = this._tokenStream,
                    token,
                    keyList = this._key_list();
                                    
                this.fire({
                    type:   "startkeyframerule",
                    keys:   keyList,
                    line:   keyList[0].line,
                    col:    keyList[0].col
                });                
                
                this._readDeclarations(true);                
                
                this.fire({
                    type:   "endkeyframerule",
                    keys:   keyList,
                    line:   keyList[0].line,
                    col:    keyList[0].col
                });  
                
            },
            
            _key_list: function(){
            
                /*
                 * key_list:
                 *   : key [ S* ',' S* key]*
                 *   ;
                 */
                var tokenStream = this._tokenStream,
                    token,
                    key,
                    keyList = [];
                    
                //must be least one key
                keyList.push(this._key());
                    
                this._readWhitespace();
                    
                while(tokenStream.match(Tokens.COMMA)){
                    this._readWhitespace();
                    keyList.push(this._key());
                    this._readWhitespace();
                }

                return keyList;
            },
                        
            _key: function(){
                /*
                 * There is a restriction that IDENT can be only "from" or "to".
                 *
                 * key
                 *   : PERCENTAGE
                 *   | IDENT
                 *   ;
                 */
                 
                var tokenStream = this._tokenStream,
                    token;
                    
                if (tokenStream.match(Tokens.PERCENTAGE)){
                    return SyntaxUnit.fromToken(tokenStream.token());
                } else if (tokenStream.match(Tokens.IDENT)){
                    token = tokenStream.token();                    
                    
                    if (/from|to/i.test(token.value)){
                        return SyntaxUnit.fromToken(token);
                    }
                    
                    tokenStream.unget();
                }
                
                //if it gets here, there wasn't a valid token, so time to explode
                this._unexpectedToken(tokenStream.LT(1));
            },
            
            //-----------------------------------------------------------------
            // Helper methods
            //-----------------------------------------------------------------
            
            /**
             * Not part of CSS grammar, but useful for skipping over
             * combination of white space and HTML-style comments.
             * @return {void}
             * @method _skipCruft
             * @private
             */
            _skipCruft: function(){
                while(this._tokenStream.match([Tokens.S, Tokens.CDO, Tokens.CDC])){
                    //noop
                }
            },

            /**
             * Not part of CSS grammar, but this pattern occurs frequently
             * in the official CSS grammar. Split out here to eliminate
             * duplicate code.
             * @param {Boolean} checkStart Indicates if the rule should check
             *      for the left brace at the beginning.
             * @param {Boolean} readMargins Indicates if the rule should check
             *      for margin patterns.
             * @return {void}
             * @method _readDeclarations
             * @private
             */
            _readDeclarations: function(checkStart, readMargins){
                /*
                 * Reads the pattern
                 * S* '{' S* declaration [ ';' S* declaration ]* '}' S*
                 * or
                 * S* '{' S* [ declaration | margin ]? [ ';' S* [ declaration | margin ]? ]* '}' S*
                 * Note that this is how it is described in CSS3 Paged Media, but is actually incorrect.
                 * A semicolon is only necessary following a delcaration is there's another declaration
                 * or margin afterwards. 
                 */
                var tokenStream = this._tokenStream,
                    tt;
                       

                this._readWhitespace();
                
                if (checkStart){
                    tokenStream.mustMatch(Tokens.LBRACE);            
                }
                
                this._readWhitespace();

                try {
                    
                    while(true){
                    
                        if (tokenStream.match(Tokens.SEMICOLON) || (readMargins && this._margin())){
                            //noop
                        } else if (this._declaration()){
                            if (!tokenStream.match(Tokens.SEMICOLON)){
                                break;
                            }
                        } else {
                            break;
                        }
                    
                        //if ((!this._margin() && !this._declaration()) || !tokenStream.match(Tokens.SEMICOLON)){
                        //    break;
                        //}
                        this._readWhitespace();
                    }
                    
                    tokenStream.mustMatch(Tokens.RBRACE);
                    this._readWhitespace();
                    
                } catch (ex) {
                    if (ex instanceof SyntaxError && !this.options.strict){
                    
                        //fire error event
                        this.fire({
                            type:       "error",
                            error:      ex,
                            message:    ex.message,
                            line:       ex.line,
                            col:        ex.col
                        });                          
                        
                        //see if there's another declaration
                        tt = tokenStream.advance([Tokens.SEMICOLON, Tokens.RBRACE]);
                        if (tt == Tokens.SEMICOLON){
                            //if there's a semicolon, then there might be another declaration
                            this._readDeclarations(false, readMargins);                            
                        } else if (tt != Tokens.RBRACE){
                            //if there's a right brace, the rule is finished so don't do anything
                            //otherwise, rethrow the error because it wasn't handled properly
                            throw ex;
                        }                        
                        
                    } else {
                        //not a syntax error, rethrow it
                        throw ex;
                    }
                }    
            
            },      
            
            /**
             * In some cases, you can end up with two white space tokens in a
             * row. Instead of making a change in every function that looks for
             * white space, this function is used to match as much white space
             * as necessary.
             * @method _readWhitespace
             * @return {String} The white space if found, empty string if not.
             * @private
             */
            _readWhitespace: function(){
            
                var tokenStream = this._tokenStream,
                    ws = "";
                    
                while(tokenStream.match(Tokens.S)){
                    ws += tokenStream.token().value;
                }
                
                return ws;
            },
          

            /**
             * Throws an error when an unexpected token is found.
             * @param {Object} token The token that was found.
             * @method _unexpectedToken
             * @return {void}
             * @private
             */
            _unexpectedToken: function(token){
                throw new SyntaxError("Unexpected token '" + token.value + "' at line " + token.startLine + ", col " + token.startCol + ".", token.startLine, token.startCol);
            },
            
            /**
             * Helper method used for parsing subparts of a style sheet.
             * @return {void}
             * @method _verifyEnd
             * @private
             */
            _verifyEnd: function(){
                if (this._tokenStream.LA(1) != Tokens.EOF){
                    this._unexpectedToken(this._tokenStream.LT(1));
                }            
            },
            
            //-----------------------------------------------------------------
            // Validation methods
            //-----------------------------------------------------------------
            _validateProperty: function(property, value){
                Validation.validate(property, value);
            },
            
            //-----------------------------------------------------------------
            // Parsing methods
            //-----------------------------------------------------------------
            
            parse: function(input){    
                this._tokenStream = new TokenStream(input, Tokens);
                this._stylesheet();
            },
            
            parseStyleSheet: function(input){
                //just passthrough
                return this.parse(input);
            },
            
            parseMediaQuery: function(input){
                this._tokenStream = new TokenStream(input, Tokens);
                var result = this._media_query();
                
                //if there's anything more, then it's an invalid selector
                this._verifyEnd();
                
                //otherwise return result
                return result;            
            },
            
            /**
             * Parses a property value (everything after the semicolon).
             * @return {parserlib.css.PropertyValue} The property value.
             * @throws parserlib.util.SyntaxError If an unexpected token is found.
             * @method parserPropertyValue
             */             
            parsePropertyValue: function(input){
            
                this._tokenStream = new TokenStream(input, Tokens);
                this._readWhitespace();
                
                var result = this._expr();
                
                //okay to have a trailing white space
                this._readWhitespace();
                
                //if there's anything more, then it's an invalid selector
                this._verifyEnd();
                
                //otherwise return result
                return result;
            },
            
            /**
             * Parses a complete CSS rule, including selectors and
             * properties.
             * @param {String} input The text to parser.
             * @return {Boolean} True if the parse completed successfully, false if not.
             * @method parseRule
             */
            parseRule: function(input){
                this._tokenStream = new TokenStream(input, Tokens);
                
                //skip any leading white space
                this._readWhitespace();
                
                var result = this._ruleset();
                
                //skip any trailing white space
                this._readWhitespace();

                //if there's anything more, then it's an invalid selector
                this._verifyEnd();
                
                //otherwise return result
                return result;            
            },
            
            /**
             * Parses a single CSS selector (no comma)
             * @param {String} input The text to parse as a CSS selector.
             * @return {Selector} An object representing the selector.
             * @throws parserlib.util.SyntaxError If an unexpected token is found.
             * @method parseSelector
             */
            parseSelector: function(input){
            
                this._tokenStream = new TokenStream(input, Tokens);
                
                //skip any leading white space
                this._readWhitespace();
                
                var result = this._selector();
                
                //skip any trailing white space
                this._readWhitespace();

                //if there's anything more, then it's an invalid selector
                this._verifyEnd();
                
                //otherwise return result
                return result;
            },

            /**
             * Parses an HTML style attribute: a set of CSS declarations 
             * separated by semicolons.
             * @param {String} input The text to parse as a style attribute
             * @return {void} 
             * @method parseStyleAttribute
             */
            parseStyleAttribute: function(input){
                input += "}"; // for error recovery in _readDeclarations()
                this._tokenStream = new TokenStream(input, Tokens);
                this._readDeclarations();
            }
        };
        
    //copy over onto prototype
    for (prop in additions){
        if (additions.hasOwnProperty(prop)){
            proto[prop] = additions[prop];
        }
    }   
    
    return proto;
}();


/*
nth
  : S* [ ['-'|'+']? INTEGER? {N} [ S* ['-'|'+'] S* INTEGER ]? |
         ['-'|'+']? INTEGER | {O}{D}{D} | {E}{V}{E}{N} ] S*
  ;
*/
/*global Validation, ValidationTypes, ValidationError*/
var Properties = {

    //A
    "alignment-adjust"              : "auto | baseline | before-edge | text-before-edge | middle | central | after-edge | text-after-edge | ideographic | alphabetic | hanging | mathematical | <percentage> | <length>",
    "alignment-baseline"            : "baseline | use-script | before-edge | text-before-edge | after-edge | text-after-edge | central | middle | ideographic | alphabetic | hanging | mathematical",
    "animation"                     : 1,
    "animation-delay"               : { multi: "<time>", comma: true },
    "animation-direction"           : { multi: "normal | alternate", comma: true },
    "animation-duration"            : { multi: "<time>", comma: true },
    "animation-iteration-count"     : { multi: "<number> | infinite", comma: true },
    "animation-name"                : { multi: "none | <ident>", comma: true },
    "animation-play-state"          : { multi: "running | paused", comma: true },
    "animation-timing-function"     : 1,
    
    //vendor prefixed
    "-moz-animation-delay"               : { multi: "<time>", comma: true },
    "-moz-animation-direction"           : { multi: "normal | alternate", comma: true },
    "-moz-animation-duration"            : { multi: "<time>", comma: true },
    "-moz-animation-iteration-count"     : { multi: "<number> | infinite", comma: true },
    "-moz-animation-name"                : { multi: "none | <ident>", comma: true },
    "-moz-animation-play-state"          : { multi: "running | paused", comma: true },
    
    "-ms-animation-delay"               : { multi: "<time>", comma: true },
    "-ms-animation-direction"           : { multi: "normal | alternate", comma: true },
    "-ms-animation-duration"            : { multi: "<time>", comma: true },
    "-ms-animation-iteration-count"     : { multi: "<number> | infinite", comma: true },
    "-ms-animation-name"                : { multi: "none | <ident>", comma: true },
    "-ms-animation-play-state"          : { multi: "running | paused", comma: true },
    
    "-webkit-animation-delay"               : { multi: "<time>", comma: true },
    "-webkit-animation-direction"           : { multi: "normal | alternate", comma: true },
    "-webkit-animation-duration"            : { multi: "<time>", comma: true },
    "-webkit-animation-iteration-count"     : { multi: "<number> | infinite", comma: true },
    "-webkit-animation-name"                : { multi: "none | <ident>", comma: true },
    "-webkit-animation-play-state"          : { multi: "running | paused", comma: true },
    
    "-o-animation-delay"               : { multi: "<time>", comma: true },
    "-o-animation-direction"           : { multi: "normal | alternate", comma: true },
    "-o-animation-duration"            : { multi: "<time>", comma: true },
    "-o-animation-iteration-count"     : { multi: "<number> | infinite", comma: true },
    "-o-animation-name"                : { multi: "none | <ident>", comma: true },
    "-o-animation-play-state"          : { multi: "running | paused", comma: true },        
    
    "appearance"                    : "icon | window | desktop | workspace | document | tooltip | dialog | button | push-button | hyperlink | radio-button | checkbox | menu-item | tab | menu | menubar | pull-down-menu | pop-up-menu | list-menu | radio-group | checkbox-group | outline-tree | range | field | combo-box | signature | password | normal | none | inherit",
    "azimuth"                       : function (expression) {
        var simple      = "<angle> | leftwards | rightwards | inherit",
            direction   = "left-side | far-left | left | center-left | center | center-right | right | far-right | right-side",
            behind      = false,
            valid       = false,
            part;
        
        if (!ValidationTypes.isAny(expression, simple)) {
            if (ValidationTypes.isAny(expression, "behind")) {
                behind = true;
                valid = true;
            }
            
            if (ValidationTypes.isAny(expression, direction)) {
                valid = true;
                if (!behind) {
                    ValidationTypes.isAny(expression, "behind");
                }
            }
        }
        
        if (expression.hasNext()) {
            part = expression.next();
            if (valid) {
                throw new ValidationError("Expected end of value but found '" + part + "'.", part.line, part.col);
            } else {
                throw new ValidationError("Expected (<'azimuth'>) but found '" + part + "'.", part.line, part.col);
            }
        }        
    },
    
    //B
    "backface-visibility"           : "visible | hidden",
    "background"                    : 1,
    "background-attachment"         : { multi: "<attachment>", comma: true },
    "background-clip"               : { multi: "<box>", comma: true },
    "background-color"              : "<color> | inherit",
    "background-image"              : { multi: "<bg-image>", comma: true },
    "background-origin"             : { multi: "<box>", comma: true },
    "background-position"           : { multi: "<bg-position>", comma: true },
    "background-repeat"             : { multi: "<repeat-style>" },
    "background-size"               : { multi: "<bg-size>", comma: true },
    "baseline-shift"                : "baseline | sub | super | <percentage> | <length>",
    "behavior"                      : 1,
    "binding"                       : 1,
    "bleed"                         : "<length>",
    "bookmark-label"                : "<content> | <attr> | <string>",
    "bookmark-level"                : "none | <integer>",
    "bookmark-state"                : "open | closed",
    "bookmark-target"               : "none | <uri> | <attr>",
    "border"                        : "<border-width> || <border-style> || <color>",
    "border-bottom"                 : "<border-width> || <border-style> || <color>",
    "border-bottom-color"           : "<color>",
    "border-bottom-left-radius"     :  "<x-one-radius>",
    "border-bottom-right-radius"    :  "<x-one-radius>",
    "border-bottom-style"           : "<border-style>",
    "border-bottom-width"           : "<border-width>",
    "border-collapse"               : "collapse | separate | inherit",
    "border-color"                  : { multi: "<color> | inherit", max: 4 },
    "border-image"                  : 1,
    "border-image-outset"           : { multi: "<length> | <number>", max: 4 },
    "border-image-repeat"           : { multi: "stretch | repeat | round", max: 2 },
    "border-image-slice"            : function(expression) {
        
        var valid   = false,
            numeric = "<number> | <percentage>",
            fill    = false,
            count   = 0,
            max     = 4,
            part;
        
        if (ValidationTypes.isAny(expression, "fill")) {
            fill = true;
            valid = true;
        }
        
        while (expression.hasNext() && count < max) {
            valid = ValidationTypes.isAny(expression, numeric);
            if (!valid) {
                break;
            }
            count++;
        }
        
        
        if (!fill) {
            ValidationTypes.isAny(expression, "fill");
        } else {
            valid = true;
        }
        
        if (expression.hasNext()) {
            part = expression.next();
            if (valid) {
                throw new ValidationError("Expected end of value but found '" + part + "'.", part.line, part.col);
            } else {
                throw new ValidationError("Expected ([<number> | <percentage>]{1,4} && fill?) but found '" + part + "'.", part.line, part.col);
            }
        }         
    },
    "border-image-source"           : "<image> | none",
    "border-image-width"            : { multi: "<length> | <percentage> | <number> | auto", max: 4 },
    "border-left"                   : "<border-width> || <border-style> || <color>",
    "border-left-color"             : "<color> | inherit",
    "border-left-style"             : "<border-style>",
    "border-left-width"             : "<border-width>",
    "border-radius"                 : function(expression) {
        
        var valid   = false,
            numeric = "<length> | <percentage>",
            slash   = false,
            fill    = false,
            count   = 0,
            max     = 8,
            part;

        while (expression.hasNext() && count < max) {
            valid = ValidationTypes.isAny(expression, numeric);
            if (!valid) {
            
                if (expression.peek() == "/" && count > 0 && !slash) {
                    slash = true;
                    max = count + 5;
                    expression.next();
                } else {
                    break;
                }
            }
            count++;
        }
        
        if (expression.hasNext()) {
            part = expression.next();
            if (valid) {
                throw new ValidationError("Expected end of value but found '" + part + "'.", part.line, part.col);
            } else {
                throw new ValidationError("Expected (<'border-radius'>) but found '" + part + "'.", part.line, part.col);
            }
        }         
    },
    "border-right"                  : "<border-width> || <border-style> || <color>",
    "border-right-color"            : "<color> | inherit",
    "border-right-style"            : "<border-style>",
    "border-right-width"            : "<border-width>",
    "border-spacing"                : { multi: "<length> | inherit", max: 2 },
    "border-style"                  : { multi: "<border-style>", max: 4 },
    "border-top"                    : "<border-width> || <border-style> || <color>",
    "border-top-color"              : "<color> | inherit",
    "border-top-left-radius"        : "<x-one-radius>",
    "border-top-right-radius"       : "<x-one-radius>",
    "border-top-style"              : "<border-style>",
    "border-top-width"              : "<border-width>",
    "border-width"                  : { multi: "<border-width>", max: 4 },
    "bottom"                        : "<margin-width> | inherit", 
    "box-align"                     : "start | end | center | baseline | stretch",        //http://www.w3.org/TR/2009/WD-css3-flexbox-20090723/
    "box-decoration-break"          : "slice |clone",
    "box-direction"                 : "normal | reverse | inherit",
    "box-flex"                      : "<number>",
    "box-flex-group"                : "<integer>",
    "box-lines"                     : "single | multiple",
    "box-ordinal-group"             : "<integer>",
    "box-orient"                    : "horizontal | vertical | inline-axis | block-axis | inherit",
    "box-pack"                      : "start | end | center | justify",
    "box-shadow"                    : function (expression) {
        var result      = false,
            part;

        if (!ValidationTypes.isAny(expression, "none")) {
            Validation.multiProperty("<shadow>", expression, true, Infinity);                       
        } else {
            if (expression.hasNext()) {
                part = expression.next();
                throw new ValidationError("Expected end of value but found '" + part + "'.", part.line, part.col);
            }   
        }
    },
    "box-sizing"                    : "content-box | border-box | inherit",
    "break-after"                   : "auto | always | avoid | left | right | page | column | avoid-page | avoid-column",
    "break-before"                  : "auto | always | avoid | left | right | page | column | avoid-page | avoid-column",
    "break-inside"                  : "auto | avoid | avoid-page | avoid-column",
    
    //C
    "caption-side"                  : "top | bottom | inherit",
    "clear"                         : "none | right | left | both | inherit",
    "clip"                          : 1,
    "color"                         : "<color> | inherit",
    "color-profile"                 : 1,
    "column-count"                  : "<integer> | auto",                      //http://www.w3.org/TR/css3-multicol/
    "column-fill"                   : "auto | balance",
    "column-gap"                    : "<length> | normal",
    "column-rule"                   : "<border-width> || <border-style> || <color>",
    "column-rule-color"             : "<color>",
    "column-rule-style"             : "<border-style>",
    "column-rule-width"             : "<border-width>",
    "column-span"                   : "none | all",
    "column-width"                  : "<length> | auto",
    "columns"                       : 1,
    "content"                       : 1,
    "counter-increment"             : 1,
    "counter-reset"                 : 1,
    "crop"                          : "<shape> | auto",
    "cue"                           : "cue-after | cue-before | inherit",
    "cue-after"                     : 1,
    "cue-before"                    : 1,
    "cursor"                        : 1,
    
    //D
    "direction"                     : "ltr | rtl | inherit",
    "display"                       : "inline | block | list-item | inline-block | table | inline-table | table-row-group | table-header-group | table-footer-group | table-row | table-column-group | table-column | table-cell | table-caption | box | inline-box | grid | inline-grid | none | inherit | -moz-box | -moz-inline-block | -moz-inline-box | -moz-inline-grid | -moz-inline-stack | -moz-inline-table | -moz-grid | -moz-grid-group | -moz-grid-line | -moz-groupbox | -moz-deck | -moz-popup | -moz-stack | -moz-marker",
    "dominant-baseline"             : 1,
    "drop-initial-after-adjust"     : "central | middle | after-edge | text-after-edge | ideographic | alphabetic | mathematical | <percentage> | <length>",
    "drop-initial-after-align"      : "baseline | use-script | before-edge | text-before-edge | after-edge | text-after-edge | central | middle | ideographic | alphabetic | hanging | mathematical",
    "drop-initial-before-adjust"    : "before-edge | text-before-edge | central | middle | hanging | mathematical | <percentage> | <length>",
    "drop-initial-before-align"     : "caps-height | baseline | use-script | before-edge | text-before-edge | after-edge | text-after-edge | central | middle | ideographic | alphabetic | hanging | mathematical",
    "drop-initial-size"             : "auto | line | <length> | <percentage>",
    "drop-initial-value"            : "initial | <integer>",
    
    //E
    "elevation"                     : "<angle> | below | level | above | higher | lower | inherit",
    "empty-cells"                   : "show | hide | inherit",
    
    //F
    "filter"                        : 1,
    "fit"                           : "fill | hidden | meet | slice",
    "fit-position"                  : 1,
    "float"                         : "left | right | none | inherit",    
    "float-offset"                  : 1,
    "font"                          : 1,
    "font-family"                   : 1,
    "font-size"                     : "<absolute-size> | <relative-size> | <length> | <percentage> | inherit",
    "font-size-adjust"              : "<number> | none | inherit",
    "font-stretch"                  : "normal | ultra-condensed | extra-condensed | condensed | semi-condensed | semi-expanded | expanded | extra-expanded | ultra-expanded | inherit",
    "font-style"                    : "normal | italic | oblique | inherit",
    "font-variant"                  : "normal | small-caps | inherit",
    "font-weight"                   : "normal | bold | bolder | lighter | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | inherit",
    
    //G
    "grid-cell-stacking"            : "columns | rows | layer",
    "grid-column"                   : 1,
    "grid-columns"                  : 1,
    "grid-column-align"             : "start | end | center | stretch",
    "grid-column-sizing"            : 1,
    "grid-column-span"              : "<integer>",
    "grid-flow"                     : "none | rows | columns",
    "grid-layer"                    : "<integer>",
    "grid-row"                      : 1,
    "grid-rows"                     : 1,
    "grid-row-align"                : "start | end | center | stretch",
    "grid-row-span"                 : "<integer>",
    "grid-row-sizing"               : 1,
    
    //H
    "hanging-punctuation"           : 1,
    "height"                        : "<margin-width> | inherit",
    "hyphenate-after"               : "<integer> | auto",
    "hyphenate-before"              : "<integer> | auto",
    "hyphenate-character"           : "<string> | auto",
    "hyphenate-lines"               : "no-limit | <integer>",
    "hyphenate-resource"            : 1,
    "hyphens"                       : "none | manual | auto",
    
    //I
    "icon"                          : 1,
    "image-orientation"             : "angle | auto",
    "image-rendering"               : 1,
    "image-resolution"              : 1,
    "inline-box-align"              : "initial | last | <integer>",
    
    //L
    "left"                          : "<margin-width> | inherit",
    "letter-spacing"                : "<length> | normal | inherit",
    "line-height"                   : "<number> | <length> | <percentage> | normal | inherit",
    "line-break"                    : "auto | loose | normal | strict",
    "line-stacking"                 : 1,
    "line-stacking-ruby"            : "exclude-ruby | include-ruby",
    "line-stacking-shift"           : "consider-shifts | disregard-shifts",
    "line-stacking-strategy"        : "inline-line-height | block-line-height | max-height | grid-height",
    "list-style"                    : 1,
    "list-style-image"              : "<uri> | none | inherit",
    "list-style-position"           : "inside | outside | inherit",
    "list-style-type"               : "disc | circle | square | decimal | decimal-leading-zero | lower-roman | upper-roman | lower-greek | lower-latin | upper-latin | armenian | georgian | lower-alpha | upper-alpha | none | inherit",
    
    //M
    "margin"                        : { multi: "<margin-width> | inherit", max: 4 },
    "margin-bottom"                 : "<margin-width> | inherit",
    "margin-left"                   : "<margin-width> | inherit",
    "margin-right"                  : "<margin-width> | inherit",
    "margin-top"                    : "<margin-width> | inherit",
    "mark"                          : 1,
    "mark-after"                    : 1,
    "mark-before"                   : 1,
    "marks"                         : 1,
    "marquee-direction"             : 1,
    "marquee-play-count"            : 1,
    "marquee-speed"                 : 1,
    "marquee-style"                 : 1,
    "max-height"                    : "<length> | <percentage> | none | inherit",
    "max-width"                     : "<length> | <percentage> | none | inherit",
    "min-height"                    : "<length> | <percentage> | inherit",
    "min-width"                     : "<length> | <percentage> | inherit",
    "move-to"                       : 1,
    
    //N
    "nav-down"                      : 1,
    "nav-index"                     : 1,
    "nav-left"                      : 1,
    "nav-right"                     : 1,
    "nav-up"                        : 1,
    
    //O
    "opacity"                       : "<number> | inherit",
    "orphans"                       : "<integer> | inherit",
    "outline"                       : 1,
    "outline-color"                 : "<color> | invert | inherit",
    "outline-offset"                : 1,
    "outline-style"                 : "<border-style> | inherit",
    "outline-width"                 : "<border-width> | inherit",
    "overflow"                      : "visible | hidden | scroll | auto | inherit",
    "overflow-style"                : 1,
    "overflow-x"                    : 1,
    "overflow-y"                    : 1,
    
    //P
    "padding"                       : { multi: "<padding-width> | inherit", max: 4 },
    "padding-bottom"                : "<padding-width> | inherit",
    "padding-left"                  : "<padding-width> | inherit",
    "padding-right"                 : "<padding-width> | inherit",
    "padding-top"                   : "<padding-width> | inherit",
    "page"                          : 1,
    "page-break-after"              : "auto | always | avoid | left | right | inherit",
    "page-break-before"             : "auto | always | avoid | left | right | inherit",
    "page-break-inside"             : "auto | avoid | inherit",
    "page-policy"                   : 1,
    "pause"                         : 1,
    "pause-after"                   : 1,
    "pause-before"                  : 1,
    "perspective"                   : 1,
    "perspective-origin"            : 1,
    "phonemes"                      : 1,
    "pitch"                         : 1,
    "pitch-range"                   : 1,
    "play-during"                   : 1,
    "pointer-events"                : "auto | none | visiblePainted | visibleFill | visibleStroke | visible | painted | fill | stroke | all | inherit",
    "position"                      : "static | relative | absolute | fixed | inherit",
    "presentation-level"            : 1,
    "punctuation-trim"              : 1,
    
    //Q
    "quotes"                        : 1,
    
    //R
    "rendering-intent"              : 1,
    "resize"                        : 1,
    "rest"                          : 1,
    "rest-after"                    : 1,
    "rest-before"                   : 1,
    "richness"                      : 1,
    "right"                         : "<margin-width> | inherit",
    "rotation"                      : 1,
    "rotation-point"                : 1,
    "ruby-align"                    : 1,
    "ruby-overhang"                 : 1,
    "ruby-position"                 : 1,
    "ruby-span"                     : 1,
    
    //S
    "size"                          : 1,
    "speak"                         : "normal | none | spell-out | inherit",
    "speak-header"                  : "once | always | inherit",
    "speak-numeral"                 : "digits | continuous | inherit",
    "speak-punctuation"             : "code | none | inherit",
    "speech-rate"                   : 1,
    "src"                           : 1,
    "stress"                        : 1,
    "string-set"                    : 1,
    
    "table-layout"                  : "auto | fixed | inherit",
    "tab-size"                      : "<integer> | <length>",
    "target"                        : 1,
    "target-name"                   : 1,
    "target-new"                    : 1,
    "target-position"               : 1,
    "text-align"                    : "left | right | center | justify | inherit" ,
    "text-align-last"               : 1,
    "text-decoration"               : 1,
    "text-emphasis"                 : 1,
    "text-height"                   : 1,
    "text-indent"                   : "<length> | <percentage> | inherit",
    "text-justify"                  : "auto | none | inter-word | inter-ideograph | inter-cluster | distribute | kashida",
    "text-outline"                  : 1,
    "text-overflow"                 : 1,
    "text-rendering"                : "auto | optimizeSpeed | optimizeLegibility | geometricPrecision | inherit",
    "text-shadow"                   : 1,
    "text-transform"                : "capitalize | uppercase | lowercase | none | inherit",
    "text-wrap"                     : "normal | none | avoid",
    "top"                           : "<margin-width> | inherit",
    "transform"                     : 1,
    "transform-origin"              : 1,
    "transform-style"               : 1,
    "transition"                    : 1,
    "transition-delay"              : 1,
    "transition-duration"           : 1,
    "transition-property"           : 1,
    "transition-timing-function"    : 1,
    
    //U
    "unicode-bidi"                  : "normal | embed | bidi-override | inherit",
    "user-modify"                   : "read-only | read-write | write-only | inherit",
    "user-select"                   : "none | text | toggle | element | elements | all | inherit",
    
    //V
    "vertical-align"                : "auto | use-script | baseline | sub | super | top | text-top | central | middle | bottom | text-bottom | <percentage> | <length>",
    "visibility"                    : "visible | hidden | collapse | inherit",
    "voice-balance"                 : 1,
    "voice-duration"                : 1,
    "voice-family"                  : 1,
    "voice-pitch"                   : 1,
    "voice-pitch-range"             : 1,
    "voice-rate"                    : 1,
    "voice-stress"                  : 1,
    "voice-volume"                  : 1,
    "volume"                        : 1,
    
    //W
    "white-space"                   : "normal | pre | nowrap | pre-wrap | pre-line | inherit | -pre-wrap | -o-pre-wrap | -moz-pre-wrap | -hp-pre-wrap", //http://perishablepress.com/wrapping-content/
    "white-space-collapse"          : 1,
    "widows"                        : "<integer> | inherit",
    "width"                         : "<length> | <percentage> | auto | inherit" ,
    "word-break"                    : "normal | keep-all | break-all",
    "word-spacing"                  : "<length> | normal | inherit",
    "word-wrap"                     : 1,
    
    //Z
    "z-index"                       : "<integer> | auto | inherit",
    "zoom"                          : "<number> | <percentage> | normal"
};
/*global SyntaxUnit, Parser*/
/**
 * Represents a selector combinator (whitespace, +, >).
 * @namespace parserlib.css
 * @class PropertyName
 * @extends parserlib.util.SyntaxUnit
 * @constructor
 * @param {String} text The text representation of the unit. 
 * @param {String} hack The type of IE hack applied ("*", "_", or null).
 * @param {int} line The line of text on which the unit resides.
 * @param {int} col The column of text on which the unit resides.
 */
function PropertyName(text, hack, line, col){
    
    SyntaxUnit.call(this, text, line, col, Parser.PROPERTY_NAME_TYPE);

    /**
     * The type of IE hack applied ("*", "_", or null).
     * @type String
     * @property hack
     */
    this.hack = hack;

}

PropertyName.prototype = new SyntaxUnit();
PropertyName.prototype.constructor = PropertyName;
PropertyName.prototype.toString = function(){
    return (this.hack ? this.hack : "") + this.text;
};

/*global SyntaxUnit, Parser*/
/**
 * Represents a single part of a CSS property value, meaning that it represents
 * just everything single part between ":" and ";". If there are multiple values
 * separated by commas, this type represents just one of the values.
 * @param {String[]} parts An array of value parts making up this value.
 * @param {int} line The line of text on which the unit resides.
 * @param {int} col The column of text on which the unit resides.
 * @namespace parserlib.css
 * @class PropertyValue
 * @extends parserlib.util.SyntaxUnit
 * @constructor
 */
function PropertyValue(parts, line, col){

    SyntaxUnit.call(this, parts.join(" "), line, col, Parser.PROPERTY_VALUE_TYPE);
    
    /**
     * The parts that make up the selector.
     * @type Array
     * @property parts
     */
    this.parts = parts;
    
}

PropertyValue.prototype = new SyntaxUnit();
PropertyValue.prototype.constructor = PropertyValue;


/*global SyntaxUnit, Parser*/
/**
 * A utility class that allows for easy iteration over the various parts of a
 * property value.
 * @param {parserlib.css.PropertyValue} value The property value to iterate over.
 * @namespace parserlib.css
 * @class PropertyValueIterator
 * @constructor
 */
function PropertyValueIterator(value){

    /** 
     * Iterator value
     * @type int
     * @property _i
     * @private
     */
    this._i = 0;
    
    /**
     * The parts that make up the value.
     * @type Array
     * @property _parts
     * @private
     */
    this._parts = value.parts;
    
    /**
     * Keeps track of bookmarks along the way.
     * @type Array
     * @property _marks
     * @private
     */
    this._marks = [];
    
    /**
     * Holds the original property value.
     * @type parserlib.css.PropertyValue
     * @property value
     */
    this.value = value;
    
}

/**
 * Returns the total number of parts in the value.
 * @return {int} The total number of parts in the value.
 * @method count
 */
PropertyValueIterator.prototype.count = function(){
    return this._parts.length;
};

/**
 * Indicates if the iterator is positioned at the first item.
 * @return {Boolean} True if positioned at first item, false if not.
 * @method isFirst
 */
PropertyValueIterator.prototype.isFirst = function(){
    return this._i === 0;
};

/**
 * Indicates if there are more parts of the property value.
 * @return {Boolean} True if there are more parts, false if not.
 * @method hasNext
 */
PropertyValueIterator.prototype.hasNext = function(){
    return (this._i < this._parts.length);
};

/**
 * Marks the current spot in the iteration so it can be restored to
 * later on.
 * @return {void}
 * @method mark
 */
PropertyValueIterator.prototype.mark = function(){
    this._marks.push(this._i);
};

/**
 * Returns the next part of the property value or null if there is no next
 * part. Does not move the internal counter forward.
 * @return {parserlib.css.PropertyValuePart} The next part of the property value or null if there is no next
 * part.
 * @method peek
 */
PropertyValueIterator.prototype.peek = function(count){
    return this.hasNext() ? this._parts[this._i + (count || 0)] : null;
};

/**
 * Returns the next part of the property value or null if there is no next
 * part.
 * @return {parserlib.css.PropertyValuePart} The next part of the property value or null if there is no next
 * part.
 * @method next
 */
PropertyValueIterator.prototype.next = function(){
    return this.hasNext() ? this._parts[this._i++] : null;
};

/**
 * Returns the previous part of the property value or null if there is no
 * previous part.
 * @return {parserlib.css.PropertyValuePart} The previous part of the 
 * property value or null if there is no next part.
 * @method previous
 */
PropertyValueIterator.prototype.previous = function(){
    return this._i > 0 ? this._parts[--this._i] : null;
};

/**
 * Restores the last saved bookmark.
 * @return {void}
 * @method restore
 */
PropertyValueIterator.prototype.restore = function(){
    if (this._marks.length){
        this._i = this._marks.pop();
    }
};


/*global SyntaxUnit, Parser, Colors*/
/**
 * Represents a single part of a CSS property value, meaning that it represents
 * just one part of the data between ":" and ";".
 * @param {String} text The text representation of the unit.
 * @param {int} line The line of text on which the unit resides.
 * @param {int} col The column of text on which the unit resides.
 * @namespace parserlib.css
 * @class PropertyValuePart
 * @extends parserlib.util.SyntaxUnit
 * @constructor
 */
function PropertyValuePart(text, line, col){

    SyntaxUnit.call(this, text, line, col, Parser.PROPERTY_VALUE_PART_TYPE);
    
    /**
     * Indicates the type of value unit.
     * @type String
     * @property type
     */
    this.type = "unknown";

    //figure out what type of data it is
    
    var temp;
    
    //it is a measurement?
    if (/^([+\-]?[\d\.]+)([a-z]+)$/i.test(text)){  //dimension
        this.type = "dimension";
        this.value = +RegExp.$1;
        this.units = RegExp.$2;
        
        //try to narrow down
        switch(this.units.toLowerCase()){
        
            case "em":
            case "rem":
            case "ex":
            case "px":
            case "cm":
            case "mm":
            case "in":
            case "pt":
            case "pc":
            case "ch":
                this.type = "length";
                break;
                
            case "deg":
            case "rad":
            case "grad":
                this.type = "angle";
                break;
            
            case "ms":
            case "s":
                this.type = "time";
                break;
            
            case "hz":
            case "khz":
                this.type = "frequency";
                break;
            
            case "dpi":
            case "dpcm":
                this.type = "resolution";
                break;
                
            //default
                
        }
        
    } else if (/^([+\-]?[\d\.]+)%$/i.test(text)){  //percentage
        this.type = "percentage";
        this.value = +RegExp.$1;
    } else if (/^([+\-]?[\d\.]+)%$/i.test(text)){  //percentage
        this.type = "percentage";
        this.value = +RegExp.$1;
    } else if (/^([+\-]?\d+)$/i.test(text)){  //integer
        this.type = "integer";
        this.value = +RegExp.$1;
    } else if (/^([+\-]?[\d\.]+)$/i.test(text)){  //number
        this.type = "number";
        this.value = +RegExp.$1;
    
    } else if (/^#([a-f0-9]{3,6})/i.test(text)){  //hexcolor
        this.type = "color";
        temp = RegExp.$1;
        if (temp.length == 3){
            this.red    = parseInt(temp.charAt(0)+temp.charAt(0),16);
            this.green  = parseInt(temp.charAt(1)+temp.charAt(1),16);
            this.blue   = parseInt(temp.charAt(2)+temp.charAt(2),16);            
        } else {
            this.red    = parseInt(temp.substring(0,2),16);
            this.green  = parseInt(temp.substring(2,4),16);
            this.blue   = parseInt(temp.substring(4,6),16);            
        }
    } else if (/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i.test(text)){ //rgb() color with absolute numbers
        this.type   = "color";
        this.red    = +RegExp.$1;
        this.green  = +RegExp.$2;
        this.blue   = +RegExp.$3;
    } else if (/^rgb\(\s*(\d+)%\s*,\s*(\d+)%\s*,\s*(\d+)%\s*\)/i.test(text)){ //rgb() color with percentages
        this.type   = "color";
        this.red    = +RegExp.$1 * 255 / 100;
        this.green  = +RegExp.$2 * 255 / 100;
        this.blue   = +RegExp.$3 * 255 / 100;
    } else if (/^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d\.]+)\s*\)/i.test(text)){ //rgba() color with absolute numbers
        this.type   = "color";
        this.red    = +RegExp.$1;
        this.green  = +RegExp.$2;
        this.blue   = +RegExp.$3;
        this.alpha  = +RegExp.$4;
    } else if (/^rgba\(\s*(\d+)%\s*,\s*(\d+)%\s*,\s*(\d+)%\s*,\s*([\d\.]+)\s*\)/i.test(text)){ //rgba() color with percentages
        this.type   = "color";
        this.red    = +RegExp.$1 * 255 / 100;
        this.green  = +RegExp.$2 * 255 / 100;
        this.blue   = +RegExp.$3 * 255 / 100;
        this.alpha  = +RegExp.$4;        
    } else if (/^hsl\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*\)/i.test(text)){ //hsl()
        this.type   = "color";
        this.hue    = +RegExp.$1;
        this.saturation = +RegExp.$2 / 100;
        this.lightness  = +RegExp.$3 / 100;        
    } else if (/^hsla\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*,\s*([\d\.]+)\s*\)/i.test(text)){ //hsla() color with percentages
        this.type   = "color";
        this.hue    = +RegExp.$1;
        this.saturation = +RegExp.$2 / 100;
        this.lightness  = +RegExp.$3 / 100;        
        this.alpha  = +RegExp.$4;        
    } else if (/^url\(["']?([^\)"']+)["']?\)/i.test(text)){ //URI
        this.type   = "uri";
        this.uri    = RegExp.$1;
    } else if (/^([^\(]+)\(/i.test(text)){
        this.type   = "function";
        this.name   = RegExp.$1;
        this.value  = text;
    } else if (/^["'][^"']*["']/.test(text)){    //string
        this.type   = "string";
        this.value  = eval(text);
    } else if (Colors[text.toLowerCase()]){  //named color
        this.type   = "color";
        temp        = Colors[text.toLowerCase()].substring(1);
        this.red    = parseInt(temp.substring(0,2),16);
        this.green  = parseInt(temp.substring(2,4),16);
        this.blue   = parseInt(temp.substring(4,6),16);         
    } else if (/^[\,\/]$/.test(text)){
        this.type   = "operator";
        this.value  = text;
    } else if (/^[a-z\-\u0080-\uFFFF][a-z0-9\-\u0080-\uFFFF]*$/i.test(text)){
        this.type   = "identifier";
        this.value  = text;
    }

}

PropertyValuePart.prototype = new SyntaxUnit();
PropertyValuePart.prototype.constructor = PropertyValuePart;

/**
 * Create a new syntax unit based solely on the given token.
 * Convenience method for creating a new syntax unit when
 * it represents a single token instead of multiple.
 * @param {Object} token The token object to represent.
 * @return {parserlib.css.PropertyValuePart} The object representing the token.
 * @static
 * @method fromToken
 */
PropertyValuePart.fromToken = function(token){
    return new PropertyValuePart(token.value, token.startLine, token.startCol);
};
var Pseudos = {
    ":first-letter": 1,
    ":first-line":   1,
    ":before":       1,
    ":after":        1
};

Pseudos.ELEMENT = 1;
Pseudos.CLASS = 2;

Pseudos.isElement = function(pseudo){
    return pseudo.indexOf("::") === 0 || Pseudos[pseudo.toLowerCase()] == Pseudos.ELEMENT;
};
/*global SyntaxUnit, Parser, Specificity*/
/**
 * Represents an entire single selector, including all parts but not
 * including multiple selectors (those separated by commas).
 * @namespace parserlib.css
 * @class Selector
 * @extends parserlib.util.SyntaxUnit
 * @constructor
 * @param {Array} parts Array of selectors parts making up this selector.
 * @param {int} line The line of text on which the unit resides.
 * @param {int} col The column of text on which the unit resides.
 */
function Selector(parts, line, col){
    
    SyntaxUnit.call(this, parts.join(" "), line, col, Parser.SELECTOR_TYPE);
    
    /**
     * The parts that make up the selector.
     * @type Array
     * @property parts
     */
    this.parts = parts;
    
    /**
     * The specificity of the selector.
     * @type parserlib.css.Specificity
     * @property specificity
     */
    this.specificity = Specificity.calculate(this);

}

Selector.prototype = new SyntaxUnit();
Selector.prototype.constructor = Selector;


/*global SyntaxUnit, Parser*/
/**
 * Represents a single part of a selector string, meaning a single set of
 * element name and modifiers. This does not include combinators such as
 * spaces, +, >, etc.
 * @namespace parserlib.css
 * @class SelectorPart
 * @extends parserlib.util.SyntaxUnit
 * @constructor
 * @param {String} elementName The element name in the selector or null
 *      if there is no element name.
 * @param {Array} modifiers Array of individual modifiers for the element.
 *      May be empty if there are none.
 * @param {String} text The text representation of the unit. 
 * @param {int} line The line of text on which the unit resides.
 * @param {int} col The column of text on which the unit resides.
 */
function SelectorPart(elementName, modifiers, text, line, col){
    
    SyntaxUnit.call(this, text, line, col, Parser.SELECTOR_PART_TYPE);

    /**
     * The tag name of the element to which this part
     * of the selector affects.
     * @type String
     * @property elementName
     */
    this.elementName = elementName;
    
    /**
     * The parts that come after the element name, such as class names, IDs,
     * pseudo classes/elements, etc.
     * @type Array
     * @property modifiers
     */
    this.modifiers = modifiers;

}

SelectorPart.prototype = new SyntaxUnit();
SelectorPart.prototype.constructor = SelectorPart;


/*global SyntaxUnit, Parser*/
/**
 * Represents a selector modifier string, meaning a class name, element name,
 * element ID, pseudo rule, etc.
 * @namespace parserlib.css
 * @class SelectorSubPart
 * @extends parserlib.util.SyntaxUnit
 * @constructor
 * @param {String} text The text representation of the unit. 
 * @param {String} type The type of selector modifier.
 * @param {int} line The line of text on which the unit resides.
 * @param {int} col The column of text on which the unit resides.
 */
function SelectorSubPart(text, type, line, col){
    
    SyntaxUnit.call(this, text, line, col, Parser.SELECTOR_SUB_PART_TYPE);

    /**
     * The type of modifier.
     * @type String
     * @property type
     */
    this.type = type;
    
    /**
     * Some subparts have arguments, this represents them.
     * @type Array
     * @property args
     */
    this.args = [];

}

SelectorSubPart.prototype = new SyntaxUnit();
SelectorSubPart.prototype.constructor = SelectorSubPart;


/*global Pseudos, SelectorPart*/
/**
 * Represents a selector's specificity.
 * @namespace parserlib.css
 * @class Specificity
 * @constructor
 * @param {int} a Should be 1 for inline styles, zero for stylesheet styles
 * @param {int} b Number of ID selectors
 * @param {int} c Number of classes and pseudo classes
 * @param {int} d Number of element names and pseudo elements
 */
function Specificity(a, b, c, d){
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
}

Specificity.prototype = {
    constructor: Specificity,
    
    /**
     * Compare this specificity to another.
     * @param {Specificity} other The other specificity to compare to.
     * @return {int} -1 if the other specificity is larger, 1 if smaller, 0 if equal.
     * @method compare
     */
    compare: function(other){
        var comps = ["a", "b", "c", "d"],
            i, len;
            
        for (i=0, len=comps.length; i < len; i++){
            if (this[comps[i]] < other[comps[i]]){
                return -1;
            } else if (this[comps[i]] > other[comps[i]]){
                return 1;
            }
        }
        
        return 0;
    },
    
    /**
     * Creates a numeric value for the specificity.
     * @return {int} The numeric value for the specificity.
     * @method valueOf
     */
    valueOf: function(){
        return (this.a * 1000) + (this.b * 100) + (this.c * 10) + this.d;
    },
    
    /**
     * Returns a string representation for specificity.
     * @return {String} The string representation of specificity.
     * @method toString
     */
    toString: function(){
        return this.a + "," + this.b + "," + this.c + "," + this.d;
    }

};

/**
 * Calculates the specificity of the given selector.
 * @param {parserlib.css.Selector} The selector to calculate specificity for.
 * @return {parserlib.css.Specificity} The specificity of the selector.
 * @static
 * @method calculate
 */
Specificity.calculate = function(selector){

    var i, len,
        part,
        b=0, c=0, d=0;
        
    function updateValues(part){
    
        var i, j, len, num,
            elementName = part.elementName ? part.elementName.text : "",
            modifier;
    
        if (elementName && elementName.charAt(elementName.length-1) != "*") {
            d++;
        }    
    
        for (i=0, len=part.modifiers.length; i < len; i++){
            modifier = part.modifiers[i];
            switch(modifier.type){
                case "class":
                case "attribute":
                    c++;
                    break;
                    
                case "id":
                    b++;
                    break;
                    
                case "pseudo":
                    if (Pseudos.isElement(modifier.text)){
                        d++;
                    } else {
                        c++;
                    }                    
                    break;
                    
                case "not":
                    for (j=0, num=modifier.args.length; j < num; j++){
                        updateValues(modifier.args[j]);
                    }
            }    
         }
    }
    
    for (i=0, len=selector.parts.length; i < len; i++){
        part = selector.parts[i];
        
        if (part instanceof SelectorPart){
            updateValues(part);                
        }
    }
    
    return new Specificity(0, b, c, d);
};

/*global Tokens, TokenStreamBase*/

var h = /^[0-9a-fA-F]$/,
    nonascii = /^[\u0080-\uFFFF]$/,
    nl = /\n|\r\n|\r|\f/;

//-----------------------------------------------------------------------------
// Helper functions
//-----------------------------------------------------------------------------


function isHexDigit(c){
    return c !== null && h.test(c);
}

function isDigit(c){
    return c !== null && /\d/.test(c);
}

function isWhitespace(c){
    return c !== null && /\s/.test(c);
}

function isNewLine(c){
    return c !== null && nl.test(c);
}

function isNameStart(c){
    return c !== null && (/[a-z_\u0080-\uFFFF\\]/i.test(c));
}

function isNameChar(c){
    return c !== null && (isNameStart(c) || /[0-9\-\\]/.test(c));
}

function isIdentStart(c){
    return c !== null && (isNameStart(c) || /\-\\/.test(c));
}

function mix(receiver, supplier){
	for (var prop in supplier){
		if (supplier.hasOwnProperty(prop)){
			receiver[prop] = supplier[prop];
		}
	}
	return receiver;
}

//-----------------------------------------------------------------------------
// CSS Token Stream
//-----------------------------------------------------------------------------


/**
 * A token stream that produces CSS tokens.
 * @param {String|Reader} input The source of text to tokenize.
 * @constructor
 * @class TokenStream
 * @namespace parserlib.css
 */
function TokenStream(input){
	TokenStreamBase.call(this, input, Tokens);
}

TokenStream.prototype = mix(new TokenStreamBase(), {

    /**
     * Overrides the TokenStreamBase method of the same name
     * to produce CSS tokens.
     * @param {variant} channel The name of the channel to use
     *      for the next token.
     * @return {Object} A token object representing the next token.
     * @method _getToken
     * @private
     */
    _getToken: function(channel){

        var c,
            reader = this._reader,
            token   = null,
            startLine   = reader.getLine(),
            startCol    = reader.getCol();

        c = reader.read();


        while(c){
            switch(c){

                /*
                 * Potential tokens:
                 * - COMMENT
                 * - SLASH
                 * - CHAR
                 */
                case "/":

                    if(reader.peek() == "*"){
                        token = this.commentToken(c, startLine, startCol);
                    } else {
                        token = this.charToken(c, startLine, startCol);
                    }
                    break;

                /*
                 * Potential tokens:
                 * - DASHMATCH
                 * - INCLUDES
                 * - PREFIXMATCH
                 * - SUFFIXMATCH
                 * - SUBSTRINGMATCH
                 * - CHAR
                 */
                case "|":
                case "~":
                case "^":
                case "$":
                case "*":
                    if(reader.peek() == "="){
                        token = this.comparisonToken(c, startLine, startCol);
                    } else {
                        token = this.charToken(c, startLine, startCol);
                    }
                    break;

                /*
                 * Potential tokens:
                 * - STRING
                 * - INVALID
                 */
                case "\"":
                case "'":
                    token = this.stringToken(c, startLine, startCol);
                    break;

                /*
                 * Potential tokens:
                 * - HASH
                 * - CHAR
                 */
                case "#":
                    if (isNameChar(reader.peek())){
                        token = this.hashToken(c, startLine, startCol);
                    } else {
                        token = this.charToken(c, startLine, startCol);
                    }
                    break;

                /*
                 * Potential tokens:
                 * - DOT
                 * - NUMBER
                 * - DIMENSION
                 * - PERCENTAGE
                 */
                case ".":
                    if (isDigit(reader.peek())){
                        token = this.numberToken(c, startLine, startCol);
                    } else {
                        token = this.charToken(c, startLine, startCol);
                    }
                    break;

                /*
                 * Potential tokens:
                 * - CDC
                 * - MINUS
                 * - NUMBER
                 * - DIMENSION
                 * - PERCENTAGE
                 */
                case "-":
                    if (reader.peek() == "-"){  //could be closing HTML-style comment
                        token = this.htmlCommentEndToken(c, startLine, startCol);
                    } else if (isNameStart(reader.peek())){
                        token = this.identOrFunctionToken(c, startLine, startCol);
                    } else {
                        token = this.charToken(c, startLine, startCol);
                    }
                    break;

                /*
                 * Potential tokens:
                 * - IMPORTANT_SYM
                 * - CHAR
                 */
                case "!":
                    token = this.importantToken(c, startLine, startCol);
                    break;

                /*
                 * Any at-keyword or CHAR
                 */
                case "@":
                    token = this.atRuleToken(c, startLine, startCol);
                    break;

                /*
                 * Potential tokens:
                 * - NOT
                 * - CHAR
                 */
                case ":":
                    token = this.notToken(c, startLine, startCol);
                    break;

                /*
                 * Potential tokens:
                 * - CDO
                 * - CHAR
                 */
                case "<":
                    token = this.htmlCommentStartToken(c, startLine, startCol);
                    break;

                /*
                 * Potential tokens:
                 * - UNICODE_RANGE
                 * - URL
                 * - CHAR
                 */
                case "U":
                case "u":
                    if (reader.peek() == "+"){
                        token = this.unicodeRangeToken(c, startLine, startCol);
                        break;
                    }
                    /* falls through */
                default:

                    /*
                     * Potential tokens:
                     * - NUMBER
                     * - DIMENSION
                     * - LENGTH
                     * - FREQ
                     * - TIME
                     * - EMS
                     * - EXS
                     * - ANGLE
                     */
                    if (isDigit(c)){
                        token = this.numberToken(c, startLine, startCol);
                    } else

                    /*
                     * Potential tokens:
                     * - S
                     */
                    if (isWhitespace(c)){
                        token = this.whitespaceToken(c, startLine, startCol);
                    } else

                    /*
                     * Potential tokens:
                     * - IDENT
                     */
                    if (isIdentStart(c)){
                        token = this.identOrFunctionToken(c, startLine, startCol);
                    } else

                    /*
                     * Potential tokens:
                     * - CHAR
                     * - PLUS
                     */
                    {
                        token = this.charToken(c, startLine, startCol);
                    }






            }

            //make sure this token is wanted
            //TODO: check channel
            break;
        }

        if (!token && c === null){
            token = this.createToken(Tokens.EOF,null,startLine,startCol);
        }

        return token;
    },

    //-------------------------------------------------------------------------
    // Methods to create tokens
    //-------------------------------------------------------------------------

    /**
     * Produces a token based on available data and the current
     * reader position information. This method is called by other
     * private methods to create tokens and is never called directly.
     * @param {int} tt The token type.
     * @param {String} value The text value of the token.
     * @param {int} startLine The beginning line for the character.
     * @param {int} startCol The beginning column for the character.
     * @param {Object} options (Optional) Specifies a channel property
     *      to indicate that a different channel should be scanned
     *      and/or a hide property indicating that the token should
     *      be hidden.
     * @return {Object} A token object.
     * @method createToken
     */
    createToken: function(tt, value, startLine, startCol, options){
        var reader = this._reader;
        options = options || {};

        return {
            value:      value,
            type:       tt,
            channel:    options.channel,
            hide:       options.hide || false,
            startLine:  startLine,
            startCol:   startCol,
            endLine:    reader.getLine(),
            endCol:     reader.getCol()
        };
    },

    //-------------------------------------------------------------------------
    // Methods to create specific tokens
    //-------------------------------------------------------------------------

    /**
     * Produces a token for any at-rule. If the at-rule is unknown, then
     * the token is for a single "@" character.
     * @param {String} first The first character for the token.
     * @param {int} startLine The beginning line for the character.
     * @param {int} startCol The beginning column for the character.
     * @return {Object} A token object.
     * @method atRuleToken
     */
    atRuleToken: function(first, startLine, startCol){
        var rule    = first,
            reader  = this._reader,
            tt      = Tokens.CHAR,
            valid   = false,
            ident,
            c;

        /*
         * First, mark where we are. There are only four @ rules,
         * so anything else is really just an invalid token.
         * Basically, if this doesn't match one of the known @
         * rules, just return '@' as an unknown token and allow
         * parsing to continue after that point.
         */
        reader.mark();

        //try to find the at-keyword
        ident = this.readName();
        rule = first + ident;
        tt = Tokens.type(rule.toLowerCase());

        //if it's not valid, use the first character only and reset the reader
        if (tt == Tokens.CHAR || tt == Tokens.UNKNOWN){
            if (rule.length > 1){
                tt = Tokens.UNKNOWN_SYM;                
            } else {
                tt = Tokens.CHAR;
                rule = first;
                reader.reset();
            }
        }

        return this.createToken(tt, rule, startLine, startCol);
    },

    /**
     * Produces a character token based on the given character
     * and location in the stream. If there's a special (non-standard)
     * token name, this is used; otherwise CHAR is used.
     * @param {String} c The character for the token.
     * @param {int} startLine The beginning line for the character.
     * @param {int} startCol The beginning column for the character.
     * @return {Object} A token object.
     * @method charToken
     */
    charToken: function(c, startLine, startCol){
        var tt = Tokens.type(c);

        if (tt == -1){
            tt = Tokens.CHAR;
        }

        return this.createToken(tt, c, startLine, startCol);
    },

    /**
     * Produces a character token based on the given character
     * and location in the stream. If there's a special (non-standard)
     * token name, this is used; otherwise CHAR is used.
     * @param {String} first The first character for the token.
     * @param {int} startLine The beginning line for the character.
     * @param {int} startCol The beginning column for the character.
     * @return {Object} A token object.
     * @method commentToken
     */
    commentToken: function(first, startLine, startCol){
        var reader  = this._reader,
            comment = this.readComment(first);

        return this.createToken(Tokens.COMMENT, comment, startLine, startCol);
    },

    /**
     * Produces a comparison token based on the given character
     * and location in the stream. The next character must be
     * read and is already known to be an equals sign.
     * @param {String} c The character for the token.
     * @param {int} startLine The beginning line for the character.
     * @param {int} startCol The beginning column for the character.
     * @return {Object} A token object.
     * @method comparisonToken
     */
    comparisonToken: function(c, startLine, startCol){
        var reader  = this._reader,
            comparison  = c + reader.read(),
            tt      = Tokens.type(comparison) || Tokens.CHAR;

        return this.createToken(tt, comparison, startLine, startCol);
    },

    /**
     * Produces a hash token based on the specified information. The
     * first character provided is the pound sign (#) and then this
     * method reads a name afterward.
     * @param {String} first The first character (#) in the hash name.
     * @param {int} startLine The beginning line for the character.
     * @param {int} startCol The beginning column for the character.
     * @return {Object} A token object.
     * @method hashToken
     */
    hashToken: function(first, startLine, startCol){
        var reader  = this._reader,
            name    = this.readName(first);

        return this.createToken(Tokens.HASH, name, startLine, startCol);
    },

    /**
     * Produces a CDO or CHAR token based on the specified information. The
     * first character is provided and the rest is read by the function to determine
     * the correct token to create.
     * @param {String} first The first character in the token.
     * @param {int} startLine The beginning line for the character.
     * @param {int} startCol The beginning column for the character.
     * @return {Object} A token object.
     * @method htmlCommentStartToken
     */
    htmlCommentStartToken: function(first, startLine, startCol){
        var reader      = this._reader,
            text        = first;

        reader.mark();
        text += reader.readCount(3);

        if (text == "<!--"){
            return this.createToken(Tokens.CDO, text, startLine, startCol);
        } else {
            reader.reset();
            return this.charToken(first, startLine, startCol);
        }
    },

    /**
     * Produces a CDC or CHAR token based on the specified information. The
     * first character is provided and the rest is read by the function to determine
     * the correct token to create.
     * @param {String} first The first character in the token.
     * @param {int} startLine The beginning line for the character.
     * @param {int} startCol The beginning column for the character.
     * @return {Object} A token object.
     * @method htmlCommentEndToken
     */
    htmlCommentEndToken: function(first, startLine, startCol){
        var reader      = this._reader,
            text        = first;

        reader.mark();
        text += reader.readCount(2);

        if (text == "-->"){
            return this.createToken(Tokens.CDC, text, startLine, startCol);
        } else {
            reader.reset();
            return this.charToken(first, startLine, startCol);
        }
    },

    /**
     * Produces an IDENT or FUNCTION token based on the specified information. The
     * first character is provided and the rest is read by the function to determine
     * the correct token to create.
     * @param {String} first The first character in the identifier.
     * @param {int} startLine The beginning line for the character.
     * @param {int} startCol The beginning column for the character.
     * @return {Object} A token object.
     * @method identOrFunctionToken
     */
    identOrFunctionToken: function(first, startLine, startCol){
        var reader  = this._reader,
            ident   = this.readName(first),
            tt      = Tokens.IDENT;

        //if there's a left paren immediately after, it's a URI or function
        if (reader.peek() == "("){
            ident += reader.read();
            if (ident.toLowerCase() == "url("){
                tt = Tokens.URI;
                ident = this.readURI(ident);

                //didn't find a valid URL or there's no closing paren
                if (ident.toLowerCase() == "url("){
                    tt = Tokens.FUNCTION;
                }
            } else {
                tt = Tokens.FUNCTION;
            }
        } else if (reader.peek() == ":"){  //might be an IE function

            //IE-specific functions always being with progid:
            if (ident.toLowerCase() == "progid"){
                ident += reader.readTo("(");
                tt = Tokens.IE_FUNCTION;
            }
        }

        return this.createToken(tt, ident, startLine, startCol);
    },

    /**
     * Produces an IMPORTANT_SYM or CHAR token based on the specified information. The
     * first character is provided and the rest is read by the function to determine
     * the correct token to create.
     * @param {String} first The first character in the token.
     * @param {int} startLine The beginning line for the character.
     * @param {int} startCol The beginning column for the character.
     * @return {Object} A token object.
     * @method importantToken
     */
    importantToken: function(first, startLine, startCol){
        var reader      = this._reader,
            important   = first,
            tt          = Tokens.CHAR,
            temp,
            c;

        reader.mark();
        c = reader.read();

        while(c){

            //there can be a comment in here
            if (c == "/"){

                //if the next character isn't a star, then this isn't a valid !important token
                if (reader.peek() != "*"){
                    break;
                } else {
                    temp = this.readComment(c);
                    if (temp === ""){    //broken!
                        break;
                    }
                }
            } else if (isWhitespace(c)){
                important += c + this.readWhitespace();
            } else if (/i/i.test(c)){
                temp = reader.readCount(8);
                if (/mportant/i.test(temp)){
                    important += c + temp;
                    tt = Tokens.IMPORTANT_SYM;

                }
                break;  //we're done
            } else {
                break;
            }

            c = reader.read();
        }

        if (tt == Tokens.CHAR){
            reader.reset();
            return this.charToken(first, startLine, startCol);
        } else {
            return this.createToken(tt, important, startLine, startCol);
        }


    },

    /**
     * Produces a NOT or CHAR token based on the specified information. The
     * first character is provided and the rest is read by the function to determine
     * the correct token to create.
     * @param {String} first The first character in the token.
     * @param {int} startLine The beginning line for the character.
     * @param {int} startCol The beginning column for the character.
     * @return {Object} A token object.
     * @method notToken
     */
    notToken: function(first, startLine, startCol){
        var reader      = this._reader,
            text        = first;

        reader.mark();
        text += reader.readCount(4);

        if (text.toLowerCase() == ":not("){
            return this.createToken(Tokens.NOT, text, startLine, startCol);
        } else {
            reader.reset();
            return this.charToken(first, startLine, startCol);
        }
    },

    /**
     * Produces a number token based on the given character
     * and location in the stream. This may return a token of
     * NUMBER, EMS, EXS, LENGTH, ANGLE, TIME, FREQ, DIMENSION,
     * or PERCENTAGE.
     * @param {String} first The first character for the token.
     * @param {int} startLine The beginning line for the character.
     * @param {int} startCol The beginning column for the character.
     * @return {Object} A token object.
     * @method numberToken
     */
    numberToken: function(first, startLine, startCol){
        var reader  = this._reader,
            value   = this.readNumber(first),
            ident,
            tt      = Tokens.NUMBER,
            c       = reader.peek();

        if (isIdentStart(c)){
            ident = this.readName(reader.read());
            value += ident;

            if (/^em$|^ex$|^px$|^gd$|^rem$|^vw$|^vh$|^vm$|^ch$|^cm$|^mm$|^in$|^pt$|^pc$/i.test(ident)){
                tt = Tokens.LENGTH;
            } else if (/^deg|^rad$|^grad$/i.test(ident)){
                tt = Tokens.ANGLE;
            } else if (/^ms$|^s$/i.test(ident)){
                tt = Tokens.TIME;
            } else if (/^hz$|^khz$/i.test(ident)){
                tt = Tokens.FREQ;
            } else if (/^dpi$|^dpcm$/i.test(ident)){
                tt = Tokens.RESOLUTION;
            } else {
                tt = Tokens.DIMENSION;
            }

        } else if (c == "%"){
            value += reader.read();
            tt = Tokens.PERCENTAGE;
        }

        return this.createToken(tt, value, startLine, startCol);
    },

    /**
     * Produces a string token based on the given character
     * and location in the stream. Since strings may be indicated
     * by single or double quotes, a failure to match starting
     * and ending quotes results in an INVALID token being generated.
     * The first character in the string is passed in and then
     * the rest are read up to and including the final quotation mark.
     * @param {String} first The first character in the string.
     * @param {int} startLine The beginning line for the character.
     * @param {int} startCol The beginning column for the character.
     * @return {Object} A token object.
     * @method stringToken
     */
    stringToken: function(first, startLine, startCol){
        var delim   = first,
            string  = first,
            reader  = this._reader,
            prev    = first,
            tt      = Tokens.STRING,
            c       = reader.read();

        while(c){
            string += c;

            //if the delimiter is found with an escapement, we're done.
            if (c == delim && prev != "\\"){
                break;
            }

            //if there's a newline without an escapement, it's an invalid string
            if (isNewLine(reader.peek()) && c != "\\"){
                tt = Tokens.INVALID;
                break;
            }

            //save previous and get next
            prev = c;
            c = reader.read();
        }

        //if c is null, that means we're out of input and the string was never closed
        if (c === null){
            tt = Tokens.INVALID;
        }

        return this.createToken(tt, string, startLine, startCol);
    },

    unicodeRangeToken: function(first, startLine, startCol){
        var reader  = this._reader,
            value   = first,
            temp,
            tt      = Tokens.CHAR;

        //then it should be a unicode range
        if (reader.peek() == "+"){
            reader.mark();
            value += reader.read();
            value += this.readUnicodeRangePart(true);

            //ensure there's an actual unicode range here
            if (value.length == 2){
                reader.reset();
            } else {

                tt = Tokens.UNICODE_RANGE;

                //if there's a ? in the first part, there can't be a second part
                if (value.indexOf("?") == -1){

                    if (reader.peek() == "-"){
                        reader.mark();
                        temp = reader.read();
                        temp += this.readUnicodeRangePart(false);

                        //if there's not another value, back up and just take the first
                        if (temp.length == 1){
                            reader.reset();
                        } else {
                            value += temp;
                        }
                    }

                }
            }
        }

        return this.createToken(tt, value, startLine, startCol);
    },

    /**
     * Produces a S token based on the specified information. Since whitespace
     * may have multiple characters, this consumes all whitespace characters
     * into a single token.
     * @param {String} first The first character in the token.
     * @param {int} startLine The beginning line for the character.
     * @param {int} startCol The beginning column for the character.
     * @return {Object} A token object.
     * @method whitespaceToken
     */
    whitespaceToken: function(first, startLine, startCol){
        var reader  = this._reader,
            value   = first + this.readWhitespace();
        return this.createToken(Tokens.S, value, startLine, startCol);
    },




    //-------------------------------------------------------------------------
    // Methods to read values from the string stream
    //-------------------------------------------------------------------------

    readUnicodeRangePart: function(allowQuestionMark){
        var reader  = this._reader,
            part = "",
            c       = reader.peek();

        //first read hex digits
        while(isHexDigit(c) && part.length < 6){
            reader.read();
            part += c;
            c = reader.peek();
        }

        //then read question marks if allowed
        if (allowQuestionMark){
            while(c == "?" && part.length < 6){
                reader.read();
                part += c;
                c = reader.peek();
            }
        }

        //there can't be any other characters after this point

        return part;
    },

    readWhitespace: function(){
        var reader  = this._reader,
            whitespace = "",
            c       = reader.peek();

        while(isWhitespace(c)){
            reader.read();
            whitespace += c;
            c = reader.peek();
        }

        return whitespace;
    },
    readNumber: function(first){
        var reader  = this._reader,
            number  = first,
            hasDot  = (first == "."),
            c       = reader.peek();


        while(c){
            if (isDigit(c)){
                number += reader.read();
            } else if (c == "."){
                if (hasDot){
                    break;
                } else {
                    hasDot = true;
                    number += reader.read();
                }
            } else {
                break;
            }

            c = reader.peek();
        }

        return number;
    },
    readString: function(){
        var reader  = this._reader,
            delim   = reader.read(),
            string  = delim,
            prev    = delim,
            c       = reader.peek();

        while(c){
            c = reader.read();
            string += c;

            //if the delimiter is found with an escapement, we're done.
            if (c == delim && prev != "\\"){
                break;
            }

            //if there's a newline without an escapement, it's an invalid string
            if (isNewLine(reader.peek()) && c != "\\"){
                string = "";
                break;
            }

            //save previous and get next
            prev = c;
            c = reader.peek();
        }

        //if c is null, that means we're out of input and the string was never closed
        if (c === null){
            string = "";
        }

        return string;
    },
    readURI: function(first){
        var reader  = this._reader,
            uri     = first,
            inner   = "",
            c       = reader.peek();

        reader.mark();

        //skip whitespace before
        while(c && isWhitespace(c)){
            reader.read();
            c = reader.peek();
        }

        //it's a string
        if (c == "'" || c == "\""){
            inner = this.readString();
        } else {
            inner = this.readURL();
        }

        c = reader.peek();

        //skip whitespace after
        while(c && isWhitespace(c)){
            reader.read();
            c = reader.peek();
        }

        //if there was no inner value or the next character isn't closing paren, it's not a URI
        if (inner === "" || c != ")"){
            uri = first;
            reader.reset();
        } else {
            uri += inner + reader.read();
        }

        return uri;
    },
    readURL: function(){
        var reader  = this._reader,
            url     = "",
            c       = reader.peek();

        //TODO: Check for escape and nonascii
        while (/^[!#$%&\\*-~]$/.test(c)){
            url += reader.read();
            c = reader.peek();
        }

        return url;

    },
    readName: function(first){
        var reader  = this._reader,
            ident   = first || "",
            c       = reader.peek();

        while(true){
            if (c == "\\"){
                ident += this.readEscape(reader.read());
                c = reader.peek();
            } else if(c && isNameChar(c)){
                ident += reader.read();
                c = reader.peek();
            } else {
                break;
            }
        }

        return ident;
    },
    
    readEscape: function(first){
        var reader  = this._reader,
            cssEscape = first || "",
            i       = 0,
            c       = reader.peek();    
    
        if (isHexDigit(c)){
            do {
                cssEscape += reader.read();
                c = reader.peek();
            } while(c && isHexDigit(c) && ++i < 6);
        }
        
        if (cssEscape.length == 3 && /\s/.test(c) ||
            cssEscape.length == 7 || cssEscape.length == 1){
                reader.read();
        } else {
            c = "";
        }
        
        return cssEscape + c;
    },
    
    readComment: function(first){
        var reader  = this._reader,
            comment = first || "",
            c       = reader.read();

        if (c == "*"){
            while(c){
                comment += c;

                //look for end of comment
                if (comment.length > 2 && c == "*" && reader.peek() == "/"){
                    comment += reader.read();
                    break;
                }

                c = reader.read();
            }

            return comment;
        } else {
            return "";
        }

    }
});


var Tokens  = [

    /*
     * The following token names are defined in CSS3 Grammar: http://www.w3.org/TR/css3-syntax/#lexical
     */
     
    //HTML-style comments
    { name: "CDO"},
    { name: "CDC"},

    //ignorables
    { name: "S", whitespace: true/*, channel: "ws"*/},
    { name: "COMMENT", comment: true, hide: true, channel: "comment" },
        
    //attribute equality
    { name: "INCLUDES", text: "~="},
    { name: "DASHMATCH", text: "|="},
    { name: "PREFIXMATCH", text: "^="},
    { name: "SUFFIXMATCH", text: "$="},
    { name: "SUBSTRINGMATCH", text: "*="},
        
    //identifier types
    { name: "STRING"},     
    { name: "IDENT"},
    { name: "HASH"},

    //at-keywords
    { name: "IMPORT_SYM", text: "@import"},
    { name: "PAGE_SYM", text: "@page"},
    { name: "MEDIA_SYM", text: "@media"},
    { name: "FONT_FACE_SYM", text: "@font-face"},
    { name: "CHARSET_SYM", text: "@charset"},
    { name: "NAMESPACE_SYM", text: "@namespace"},
    { name: "UNKNOWN_SYM" },
    //{ name: "ATKEYWORD"},
    
    //CSS3 animations
    { name: "KEYFRAMES_SYM", text: [ "@keyframes", "@-webkit-keyframes", "@-moz-keyframes", "@-o-keyframes" ] },

    //important symbol
    { name: "IMPORTANT_SYM"},

    //measurements
    { name: "LENGTH"},
    { name: "ANGLE"},
    { name: "TIME"},
    { name: "FREQ"},
    { name: "DIMENSION"},
    { name: "PERCENTAGE"},
    { name: "NUMBER"},
    
    //functions
    { name: "URI"},
    { name: "FUNCTION"},
    
    //Unicode ranges
    { name: "UNICODE_RANGE"},
    
    /*
     * The following token names are defined in CSS3 Selectors: http://www.w3.org/TR/css3-selectors/#selector-syntax
     */    
    
    //invalid string
    { name: "INVALID"},
    
    //combinators
    { name: "PLUS", text: "+" },
    { name: "GREATER", text: ">"},
    { name: "COMMA", text: ","},
    { name: "TILDE", text: "~"},
    
    //modifier
    { name: "NOT"},        
    
    /*
     * Defined in CSS3 Paged Media
     */
    { name: "TOPLEFTCORNER_SYM", text: "@top-left-corner"},
    { name: "TOPLEFT_SYM", text: "@top-left"},
    { name: "TOPCENTER_SYM", text: "@top-center"},
    { name: "TOPRIGHT_SYM", text: "@top-right"},
    { name: "TOPRIGHTCORNER_SYM", text: "@top-right-corner"},
    { name: "BOTTOMLEFTCORNER_SYM", text: "@bottom-left-corner"},
    { name: "BOTTOMLEFT_SYM", text: "@bottom-left"},
    { name: "BOTTOMCENTER_SYM", text: "@bottom-center"},
    { name: "BOTTOMRIGHT_SYM", text: "@bottom-right"},
    { name: "BOTTOMRIGHTCORNER_SYM", text: "@bottom-right-corner"},
    { name: "LEFTTOP_SYM", text: "@left-top"},
    { name: "LEFTMIDDLE_SYM", text: "@left-middle"},
    { name: "LEFTBOTTOM_SYM", text: "@left-bottom"},
    { name: "RIGHTTOP_SYM", text: "@right-top"},
    { name: "RIGHTMIDDLE_SYM", text: "@right-middle"},
    { name: "RIGHTBOTTOM_SYM", text: "@right-bottom"},

    /*
     * The following token names are defined in CSS3 Media Queries: http://www.w3.org/TR/css3-mediaqueries/#syntax
     */
    /*{ name: "MEDIA_ONLY", state: "media"},
    { name: "MEDIA_NOT", state: "media"},
    { name: "MEDIA_AND", state: "media"},*/
    { name: "RESOLUTION", state: "media"},

    /*
     * The following token names are not defined in any CSS specification but are used by the lexer.
     */
    
    //not a real token, but useful for stupid IE filters
    { name: "IE_FUNCTION" },

    //part of CSS3 grammar but not the Flex code
    { name: "CHAR" },
    
    //TODO: Needed?
    //Not defined as tokens, but might as well be
    {
        name: "PIPE",
        text: "|"
    },
    {
        name: "SLASH",
        text: "/"
    },
    {
        name: "MINUS",
        text: "-"
    },
    {
        name: "STAR",
        text: "*"
    },

    {
        name: "LBRACE",
        text: "{"
    },   
    {
        name: "RBRACE",
        text: "}"
    },      
    {
        name: "LBRACKET",
        text: "["
    },   
    {
        name: "RBRACKET",
        text: "]"
    },    
    {
        name: "EQUALS",
        text: "="
    },
    {
        name: "COLON",
        text: ":"
    },    
    {
        name: "SEMICOLON",
        text: ";"
    },    
 
    {
        name: "LPAREN",
        text: "("
    },   
    {
        name: "RPAREN",
        text: ")"
    },     
    {
        name: "DOT",
        text: "."
    }
];

(function(){

    var nameMap = [],
        typeMap = {};
    
    Tokens.UNKNOWN = -1;
    Tokens.unshift({name:"EOF"});
    for (var i=0, len = Tokens.length; i < len; i++){
        nameMap.push(Tokens[i].name);
        Tokens[Tokens[i].name] = i;
        if (Tokens[i].text){
            if (Tokens[i].text instanceof Array){
                for (var j=0; j < Tokens[i].text.length; j++){
                    typeMap[Tokens[i].text[j]] = i;
                }
            } else {
                typeMap[Tokens[i].text] = i;
            }
        }
    }
    
    Tokens.name = function(tt){
        return nameMap[tt];
    };
    
    Tokens.type = function(c){
        return typeMap[c] || -1;
    };

})();




//This file will likely change a lot! Very experimental!
/*global Properties, ValidationTypes, ValidationError, PropertyValueIterator */
var Validation = {

    validate: function(property, value){
    
        //normalize name
        var name        = property.toString().toLowerCase(),
            parts       = value.parts,
            expression  = new PropertyValueIterator(value),
            spec        = Properties[name],
            part,
            valid,            
            j, count,
            msg,
            types,
            last,
            literals,
            max, multi, group;
            
        if (!spec) {
            if (name.indexOf("-") !== 0){    //vendor prefixed are ok
                throw new ValidationError("Unknown property '" + property + "'.", property.line, property.col);
            }
        } else if (typeof spec != "number"){
        
            //initialization
            if (typeof spec == "string"){
                if (spec.indexOf("||") > -1) {
                    this.groupProperty(spec, expression);
                } else {
                    this.singleProperty(spec, expression, 1);
                }

            } else if (spec.multi) {
                this.multiProperty(spec.multi, expression, spec.comma, spec.max || Infinity);
            } else if (typeof spec == "function") {
                spec(expression);
            }

        }

    },
    
    singleProperty: function(types, expression, max, partial) {

        var result      = false,
            value       = expression.value,
            count       = 0,
            part;
         
        while (expression.hasNext() && count < max) {
            result = ValidationTypes.isAny(expression, types);
            if (!result) {
                break;
            }
            count++;
        }
        
        if (!result) {
            if (expression.hasNext() && !expression.isFirst()) {
                part = expression.peek();
                throw new ValidationError("Expected end of value but found '" + part + "'.", part.line, part.col);
            } else {
                 throw new ValidationError("Expected (" + types + ") but found '" + value + "'.", value.line, value.col);
            }        
        } else if (expression.hasNext()) {
            part = expression.next();
            throw new ValidationError("Expected end of value but found '" + part + "'.", part.line, part.col);
        }          
                 
    },    
    
    multiProperty: function (types, expression, comma, max) {

        var result      = false,
            value       = expression.value,
            count       = 0,
            sep         = false,
            part;
            
        while(expression.hasNext() && !result && count < max) {
            if (ValidationTypes.isAny(expression, types)) {
                count++;
                if (!expression.hasNext()) {
                    result = true;

                } else if (comma) {
                    if (expression.peek() == ",") {
                        part = expression.next();
                    } else {
                        break;
                    }
                }
            } else {
                break;

            }
        }
        
        if (!result) {
            if (expression.hasNext() && !expression.isFirst()) {
                part = expression.peek();
                throw new ValidationError("Expected end of value but found '" + part + "'.", part.line, part.col);
            } else {
                part = expression.previous();
                if (comma && part == ",") {
                    throw new ValidationError("Expected end of value but found '" + part + "'.", part.line, part.col); 
                } else {
                    throw new ValidationError("Expected (" + types + ") but found '" + value + "'.", value.line, value.col);
                }
            }
        
        } else if (expression.hasNext()) {
            part = expression.next();
            throw new ValidationError("Expected end of value but found '" + part + "'.", part.line, part.col);
        }  

    },
    
    groupProperty: function (types, expression, comma) {

        var result      = false,
            value       = expression.value,
            typeCount   = types.split("||").length,
            groups      = { count: 0 },
            partial     = false,
            name,
            part;
            
        while(expression.hasNext() && !result) {
            name = ValidationTypes.isAnyOfGroup(expression, types);
            if (name) {
            
                //no dupes
                if (groups[name]) {
                    break;
                } else {
                    groups[name] = 1;
                    groups.count++;
                    partial = true;
                    
                    if (groups.count == typeCount || !expression.hasNext()) {
                        result = true;
                    }
                }
            } else {
                break;
            }
        }
        
        if (!result) {        
            if (partial && expression.hasNext()) {
                    part = expression.peek();
                    throw new ValidationError("Expected end of value but found '" + part + "'.", part.line, part.col);
            } else {
                throw new ValidationError("Expected (" + types + ") but found '" + value + "'.", value.line, value.col);
            }
        } else if (expression.hasNext()) {
            part = expression.next();
            throw new ValidationError("Expected end of value but found '" + part + "'.", part.line, part.col);
        }           
    }

    

};
/**
 * Type to use when a validation error occurs.
 * @class ValidationError
 * @namespace parserlib.util
 * @constructor
 * @param {String} message The error message.
 * @param {int} line The line at which the error occurred.
 * @param {int} col The column at which the error occurred.
 */
function ValidationError(message, line, col){

    /**
     * The column at which the error occurred.
     * @type int
     * @property col
     */
    this.col = col;

    /**
     * The line at which the error occurred.
     * @type int
     * @property line
     */
    this.line = line;

    /**
     * The text representation of the unit.
     * @type String
     * @property text
     */
    this.message = message;

}

//inherit from Error
ValidationError.prototype = new Error();
//This file will likely change a lot! Very experimental!
/*global Properties, Validation, ValidationError, PropertyValueIterator, console*/
var ValidationTypes = {

    isLiteral: function (part, literals) {
        var text = part.text.toString().toLowerCase(),
            args = literals.split(" | "),
            i, len, found = false;
        
        for (i=0,len=args.length; i < len && !found; i++){
            if (text == args[i].toLowerCase()){
                found = true;
            }
        }
        
        return found;    
    },
    
    isSimple: function(type) {
        return !!this.simple[type];
    },
    
    isComplex: function(type) {
        return !!this.complex[type];
    },
    
    /**
     * Determines if the next part(s) of the given expression
     * are any of the given types.
     */
    isAny: function (expression, types) {
        var args = types.split(" | "),
            i, len, found = false;
        
        for (i=0,len=args.length; i < len && !found && expression.hasNext(); i++){
            found = this.isType(expression, args[i]);
        }
        
        return found;    
    },
    
    /**
     * Determines if the next part(s) of the given expression
     * are one of a group.
     */
    isAnyOfGroup: function(expression, types) {
        var args = types.split(" || "),
            i, len, found = false;
        
        for (i=0,len=args.length; i < len && !found; i++){
            found = this.isType(expression, args[i]);
        }
        
        return found ? args[i-1] : false;
    },
    
    /**
     * Determines if the next part(s) of the given expression
     * are of a given type.
     */
    isType: function (expression, type) {
        var part = expression.peek(),
            result = false;
            
        if (type.charAt(0) != "<") {
            result = this.isLiteral(part, type);
            if (result) {
                expression.next();
            }
        } else if (this.simple[type]) {
            result = this.simple[type](part);
            if (result) {
                expression.next();
            }
        } else {
            result = this.complex[type](expression);
        }
        
        return result;
    },
    
    
    
    simple: {

        "<absolute-size>": function(part){
            return ValidationTypes.isLiteral(part, "xx-small | x-small | small | medium | large | x-large | xx-large");
        },
        
        "<attachment>": function(part){
            return ValidationTypes.isLiteral(part, "scroll | fixed | local");
        },
        
        "<attr>": function(part){
            return part.type == "function" && part.name == "attr";
        },
                
        "<bg-image>": function(part){
            return this["<image>"](part) || this["<gradient>"](part) ||  part == "none";
        },        
        
        "<gradient>": function(part) {
            return part.type == "function" && /^(?:\-(?:ms|moz|o|webkit)\-)?(?:repeating\-)?(?:radial\-|linear\-)?gradient/i.test(part);
        },
        
        "<box>": function(part){
            return ValidationTypes.isLiteral(part, "padding-box | border-box | content-box");
        },
        
        "<content>": function(part){
            return part.type == "function" && part.name == "content";
        },        
        
        "<relative-size>": function(part){
            return ValidationTypes.isLiteral(part, "smaller | larger");
        },
        
        //any identifier
        "<ident>": function(part){
            return part.type == "identifier";
        },
        
        "<length>": function(part){
            if (part.type == "function" && /^(?:\-(?:ms|moz|o|webkit)\-)?calc/i.test(part)){
                return true;
            }else{
                return part.type == "length" || part.type == "number" || part.type == "integer" || part == "0";
            }
        },
        
        "<color>": function(part){
            return part.type == "color" || part == "transparent";
        },
        
        "<number>": function(part){
            return part.type == "number" || this["<integer>"](part);
        },
        
        "<integer>": function(part){
            return part.type == "integer";
        },
        
        "<line>": function(part){
            return part.type == "integer";
        },
        
        "<angle>": function(part){
            return part.type == "angle";
        },        
        
        "<uri>": function(part){
            return part.type == "uri";
        },
        
        "<image>": function(part){
            return this["<uri>"](part);
        },
        
        "<percentage>": function(part){
            return part.type == "percentage" || part == "0";
        },

        "<border-width>": function(part){
            return this["<length>"](part) || ValidationTypes.isLiteral(part, "thin | medium | thick");
        },
        
        "<border-style>": function(part){
            return ValidationTypes.isLiteral(part, "none | hidden | dotted | dashed | solid | double | groove | ridge | inset | outset");
        },
        
        "<margin-width>": function(part){
            return this["<length>"](part) || this["<percentage>"](part) || ValidationTypes.isLiteral(part, "auto");
        },
        
        "<padding-width>": function(part){
            return this["<length>"](part) || this["<percentage>"](part);
        },
        
        "<shape>": function(part){
            return part.type == "function" && (part.name == "rect" || part.name == "inset-rect");
        },
        
        "<time>": function(part) {
            return part.type == "time";
        }
    },
    
    complex: {

        "<bg-position>": function(expression){
            var types   = this,
                result  = false,
                numeric = "<percentage> | <length>",
                xDir    = "left | right",
                yDir    = "top | bottom",
                count = 0,
                hasNext = function() {
                    return expression.hasNext() && expression.peek() != ",";
                };

            while (expression.peek(count) && expression.peek(count) != ",") {
                count++;
            }
            
/*
<position> = [
  [ left | center | right | top | bottom | <percentage> | <length> ]
|
  [ left | center | right | <percentage> | <length> ]
  [ top | center | bottom | <percentage> | <length> ]
|
  [ center | [ left | right ] [ <percentage> | <length> ]? ] &&
  [ center | [ top | bottom ] [ <percentage> | <length> ]? ]
]
*/

            if (count < 3) {
                if (ValidationTypes.isAny(expression, xDir + " | center | " + numeric)) {
                        result = true;
                        ValidationTypes.isAny(expression, yDir + " | center | " + numeric);
                } else if (ValidationTypes.isAny(expression, yDir)) {
                        result = true;
                        ValidationTypes.isAny(expression, xDir + " | center");
                }
            } else {
                if (ValidationTypes.isAny(expression, xDir)) {
                    if (ValidationTypes.isAny(expression, yDir)) {
                        result = true;
                        ValidationTypes.isAny(expression, numeric);
                    } else if (ValidationTypes.isAny(expression, numeric)) {
                        if (ValidationTypes.isAny(expression, yDir)) {
                            result = true;
                            ValidationTypes.isAny(expression, numeric);
                        } else if (ValidationTypes.isAny(expression, "center")) {
                            result = true;
                        }
                    }
                } else if (ValidationTypes.isAny(expression, yDir)) {
                    if (ValidationTypes.isAny(expression, xDir)) {
                        result = true;
                        ValidationTypes.isAny(expression, numeric);
                    } else if (ValidationTypes.isAny(expression, numeric)) {
                        if (ValidationTypes.isAny(expression, xDir)) {
                                result = true;
                                ValidationTypes.isAny(expression, numeric);
                        } else if (ValidationTypes.isAny(expression, "center")) {
                            result = true;
                        }
                    }
                } else if (ValidationTypes.isAny(expression, "center")) {
                    if (ValidationTypes.isAny(expression, xDir + " | " + yDir)) {
                        result = true;
                        ValidationTypes.isAny(expression, numeric);
                    }
                }
            }
            
            return result;
        },

        "<bg-size>": function(expression){
            //<bg-size> = [ <length> | <percentage> | auto ]{1,2} | cover | contain
            var types   = this,
                result  = false,
                numeric = "<percentage> | <length> | auto",
                part,
                i, len;      
      
            if (ValidationTypes.isAny(expression, "cover | contain")) {
                result = true;
            } else if (ValidationTypes.isAny(expression, numeric)) {
                result = true;                
                ValidationTypes.isAny(expression, numeric);
            }
            
            return result;
        },
        
        "<repeat-style>": function(expression){
            //repeat-x | repeat-y | [repeat | space | round | no-repeat]{1,2}
            var result  = false,
                values  = "repeat | space | round | no-repeat",
                part;
            
            if (expression.hasNext()){
                part = expression.next();
                
                if (ValidationTypes.isLiteral(part, "repeat-x | repeat-y")) {
                    result = true;                    
                } else if (ValidationTypes.isLiteral(part, values)) {
                    result = true;

                    if (expression.hasNext() && ValidationTypes.isLiteral(expression.peek(), values)) {
                        expression.next();
                    }
                }
            }
            
            return result;
            
        },
        
        "<shadow>": function(expression) {
            //inset? && [ <length>{2,4} && <color>? ]
            var result  = false,
                count   = 0,
                inset   = false,
                color   = false,
                part;
                
            if (expression.hasNext()) {            
                
                if (ValidationTypes.isAny(expression, "inset")){
                    inset = true;
                }
                
                if (ValidationTypes.isAny(expression, "<color>")) {
                    color = true;
                }                
                
                while (ValidationTypes.isAny(expression, "<length>") && count < 4) {
                    count++;
                }
                
                
                if (expression.hasNext()) {
                    if (!color) {
                        ValidationTypes.isAny(expression, "<color>");
                    }
                    
                    if (!inset) {
                        ValidationTypes.isAny(expression, "inset");
                    }

                }
                
                result = (count >= 2 && count <= 4);
            
            }
            
            return result;
        },
        
        "<x-one-radius>": function(expression) {
            //[ <length> | <percentage> ] [ <length> | <percentage> ]?
            var result  = false,
                count   = 0,
                numeric = "<length> | <percentage>",
                part;
                
            if (ValidationTypes.isAny(expression, numeric)){
                result = true;
                
                ValidationTypes.isAny(expression, numeric);
            }                
            
            return result;
        }
    }
};



parserlib.css = {
Colors              :Colors,
Combinator          :Combinator,
Parser              :Parser,
PropertyName        :PropertyName,
PropertyValue       :PropertyValue,
PropertyValuePart   :PropertyValuePart,
MediaFeature        :MediaFeature,
MediaQuery          :MediaQuery,
Selector            :Selector,
SelectorPart        :SelectorPart,
SelectorSubPart     :SelectorSubPart,
Specificity         :Specificity,
TokenStream         :TokenStream,
Tokens              :Tokens,
ValidationError     :ValidationError
};
})();


/**
 * Main CSSLint object.
 * @class CSSLint
 * @static
 * @extends parserlib.util.EventTarget
 */
/*global parserlib, Reporter*/
var CSSLint = (function(){

    var rules           = [],
        formatters      = [],
        embeddedRuleset = /\/\*csslint([^\*]*)\*\//,
        api             = new parserlib.util.EventTarget();

    api.version = "0.9.10";

    //-------------------------------------------------------------------------
    // Rule Management
    //-------------------------------------------------------------------------

    /**
     * Adds a new rule to the engine.
     * @param {Object} rule The rule to add.
     * @method addRule
     */
    api.addRule = function(rule){
        rules.push(rule);
        rules[rule.id] = rule;
    };

    /**
     * Clears all rule from the engine.
     * @method clearRules
     */
    api.clearRules = function(){
        rules = [];
    };

    /**
     * Returns the rule objects.
     * @return An array of rule objects.
     * @method getRules
     */
    api.getRules = function(){
        return [].concat(rules).sort(function(a,b){
            return a.id > b.id ? 1 : 0;
        });
    };

    /**
     * Returns a ruleset configuration object with all current rules.
     * @return A ruleset object.
     * @method getRuleset
     */
    api.getRuleset = function() {
        var ruleset = {},
            i = 0,
            len = rules.length;

        while (i < len){
            ruleset[rules[i++].id] = 1;    //by default, everything is a warning
        }

        return ruleset;
    };

    /**
     * Returns a ruleset object based on embedded rules.
     * @param {String} text A string of css containing embedded rules.
     * @param {Object} ruleset A ruleset object to modify.
     * @return {Object} A ruleset object.
     * @method getEmbeddedRuleset
     */
    function applyEmbeddedRuleset(text, ruleset){
        var valueMap,
            embedded = text && text.match(embeddedRuleset),
            rules = embedded && embedded[1];

        if (rules) {
            valueMap = {
                "true": 2,  // true is error
                "": 1,      // blank is warning
                "false": 0, // false is ignore

                "2": 2,     // explicit error
                "1": 1,     // explicit warning
                "0": 0      // explicit ignore
            };

            rules.toLowerCase().split(",").forEach(function(rule){
                var pair = rule.split(":"),
                    property = pair[0] || "",
                    value = pair[1] || "";

                ruleset[property.trim()] = valueMap[value.trim()];
            });
        }

        return ruleset;
    }

    //-------------------------------------------------------------------------
    // Formatters
    //-------------------------------------------------------------------------

    /**
     * Adds a new formatter to the engine.
     * @param {Object} formatter The formatter to add.
     * @method addFormatter
     */
    api.addFormatter = function(formatter) {
        // formatters.push(formatter);
        formatters[formatter.id] = formatter;
    };

    /**
     * Retrieves a formatter for use.
     * @param {String} formatId The name of the format to retrieve.
     * @return {Object} The formatter or undefined.
     * @method getFormatter
     */
    api.getFormatter = function(formatId){
        return formatters[formatId];
    };

    /**
     * Formats the results in a particular format for a single file.
     * @param {Object} result The results returned from CSSLint.verify().
     * @param {String} filename The filename for which the results apply.
     * @param {String} formatId The name of the formatter to use.
     * @param {Object} options (Optional) for special output handling.
     * @return {String} A formatted string for the results.
     * @method format
     */
    api.format = function(results, filename, formatId, options) {
        var formatter = this.getFormatter(formatId),
            result = null;

        if (formatter){
            result = formatter.startFormat();
            result += formatter.formatResults(results, filename, options || {});
            result += formatter.endFormat();
        }

        return result;
    };

    /**
     * Indicates if the given format is supported.
     * @param {String} formatId The ID of the format to check.
     * @return {Boolean} True if the format exists, false if not.
     * @method hasFormat
     */
    api.hasFormat = function(formatId){
        return formatters.hasOwnProperty(formatId);
    };

    //-------------------------------------------------------------------------
    // Verification
    //-------------------------------------------------------------------------

    /**
     * Starts the verification process for the given CSS text.
     * @param {String} text The CSS text to verify.
     * @param {Object} ruleset (Optional) List of rules to apply. If null, then
     *      all rules are used. If a rule has a value of 1 then it's a warning,
     *      a value of 2 means it's an error.
     * @return {Object} Results of the verification.
     * @method verify
     */
    api.verify = function(text, ruleset){

        var i       = 0,
            len     = rules.length,
            reporter,
            lines,
            report,
            parser = new parserlib.css.Parser({ starHack: true, ieFilters: true,
                                                underscoreHack: true, strict: false });

        // normalize line endings
        lines = text.replace(/\n\r?/g, "$split$").split('$split$');

        if (!ruleset){
            ruleset = this.getRuleset();
        }

        if (embeddedRuleset.test(text)){
            ruleset = applyEmbeddedRuleset(text, ruleset);
        }

        reporter = new Reporter(lines, ruleset);

        ruleset.errors = 2;       //always report parsing errors as errors
        for (i in ruleset){
            if(ruleset.hasOwnProperty(i) && ruleset[i]){
                if (rules[i]){
                    rules[i].init(parser, reporter);
                }
            }
        }


        //capture most horrible error type
        try {
            parser.parse(text);
        } catch (ex) {
            reporter.error("Fatal error, cannot continue: " + ex.message, ex.line, ex.col, {});
        }

        report = {
            messages    : reporter.messages,
            stats       : reporter.stats,
            ruleset     : reporter.ruleset
        };

        //sort by line numbers, rollups at the bottom
        report.messages.sort(function (a, b){
            if (a.rollup && !b.rollup){
                return 1;
            } else if (!a.rollup && b.rollup){
                return -1;
            } else {
                return a.line - b.line;
            }
        });

        return report;
    };

    //-------------------------------------------------------------------------
    // Publish the API
    //-------------------------------------------------------------------------

    return api;

})();
/*global CSSLint*/
/**
 * An instance of Report is used to report results of the
 * verification back to the main API.
 * @class Reporter
 * @constructor
 * @param {String[]} lines The text lines of the source.
 * @param {Object} ruleset The set of rules to work with, including if
 *      they are errors or warnings.
 */
function Reporter(lines, ruleset){

    /**
     * List of messages being reported.
     * @property messages
     * @type String[]
     */
    this.messages = [];

    /**
     * List of statistics being reported.
     * @property stats
     * @type String[]
     */
    this.stats = [];

    /**
     * Lines of code being reported on. Used to provide contextual information
     * for messages.
     * @property lines
     * @type String[]
     */
    this.lines = lines;
    
    /**
     * Information about the rules. Used to determine whether an issue is an
     * error or warning.
     * @property ruleset
     * @type Object
     */
    this.ruleset = ruleset;
}

Reporter.prototype = {

    //restore constructor
    constructor: Reporter,

    /**
     * Report an error.
     * @param {String} message The message to store.
     * @param {int} line The line number.
     * @param {int} col The column number.
     * @param {Object} rule The rule this message relates to.
     * @method error
     */
    error: function(message, line, col, rule){
        this.messages.push({
            type    : "error",
            line    : line,
            col     : col,
            message : message,
            evidence: this.lines[line-1],
            rule    : rule || {}
        });
    },

    /**
     * Report an warning.
     * @param {String} message The message to store.
     * @param {int} line The line number.
     * @param {int} col The column number.
     * @param {Object} rule The rule this message relates to.
     * @method warn
     * @deprecated Use report instead.
     */
    warn: function(message, line, col, rule){
        this.report(message, line, col, rule);
    },

    /**
     * Report an issue.
     * @param {String} message The message to store.
     * @param {int} line The line number.
     * @param {int} col The column number.
     * @param {Object} rule The rule this message relates to.
     * @method report
     */
    report: function(message, line, col, rule){
        this.messages.push({
            type    : this.ruleset[rule.id] == 2 ? "error" : "warning",
            line    : line,
            col     : col,
            message : message,
            evidence: this.lines[line-1],
            rule    : rule
        });
    },

    /**
     * Report some informational text.
     * @param {String} message The message to store.
     * @param {int} line The line number.
     * @param {int} col The column number.
     * @param {Object} rule The rule this message relates to.
     * @method info
     */
    info: function(message, line, col, rule){
        this.messages.push({
            type    : "info",
            line    : line,
            col     : col,
            message : message,
            evidence: this.lines[line-1],
            rule    : rule
        });
    },

    /**
     * Report some rollup error information.
     * @param {String} message The message to store.
     * @param {Object} rule The rule this message relates to.
     * @method rollupError
     */
    rollupError: function(message, rule){
        this.messages.push({
            type    : "error",
            rollup  : true,
            message : message,
            rule    : rule
        });
    },

    /**
     * Report some rollup warning information.
     * @param {String} message The message to store.
     * @param {Object} rule The rule this message relates to.
     * @method rollupWarn
     */
    rollupWarn: function(message, rule){
        this.messages.push({
            type    : "warning",
            rollup  : true,
            message : message,
            rule    : rule
        });
    },

    /**
     * Report a statistic.
     * @param {String} name The name of the stat to store.
     * @param {Variant} value The value of the stat.
     * @method stat
     */
    stat: function(name, value){
        this.stats[name] = value;
    }
};

//expose for testing purposes
CSSLint._Reporter = Reporter;

/*global CSSLint*/

/*
 * Utility functions that make life easier.
 */
CSSLint.Util = {
    /*
     * Adds all properties from supplier onto receiver,
     * overwriting if the same name already exists on
     * reciever.
     * @param {Object} The object to receive the properties.
     * @param {Object} The object to provide the properties.
     * @return {Object} The receiver
     */
    mix: function(receiver, supplier){
        var prop;

        for (prop in supplier){
            if (supplier.hasOwnProperty(prop)){
                receiver[prop] = supplier[prop];
            }
        }

        return prop;
    },

    /*
     * Polyfill for array indexOf() method.
     * @param {Array} values The array to search.
     * @param {Variant} value The value to search for.
     * @return {int} The index of the value if found, -1 if not.
     */
    indexOf: function(values, value){
        if (values.indexOf){
            return values.indexOf(value);
        } else {
            for (var i=0, len=values.length; i < len; i++){
                if (values[i] === value){
                    return i;
                }
            }
            return -1;
        }
    },

    /*
     * Polyfill for array forEach() method.
     * @param {Array} values The array to operate on.
     * @param {Function} func The function to call on each item.
     * @return {void}
     */
    forEach: function(values, func) {
        if (values.forEach){
            return values.forEach(func);
        } else {
            for (var i=0, len=values.length; i < len; i++){
                func(values[i], i, values);
            }
        }
    }
};
/*global CSSLint*/
/*
 * Rule: Don't use adjoining classes (.foo.bar).
 */
CSSLint.addRule({

    //rule information
    id: "adjoining-classes",
    name: "Disallow adjoining classes",
    desc: "Don't use adjoining classes.",
    browsers: "IE6",

    //initialization
    init: function(parser, reporter){
        var rule = this;
        parser.addListener("startrule", function(event){
            var selectors = event.selectors,
                selector,
                part,
                modifier,
                classCount,
                i, j, k;

            for (i=0; i < selectors.length; i++){
                selector = selectors[i];
                for (j=0; j < selector.parts.length; j++){
                    part = selector.parts[j];
                    if (part.type == parser.SELECTOR_PART_TYPE){
                        classCount = 0;
                        for (k=0; k < part.modifiers.length; k++){
                            modifier = part.modifiers[k];
                            if (modifier.type == "class"){
                                classCount++;
                            }
                            if (classCount > 1){
                                reporter.report("Don't use adjoining classes.", part.line, part.col, rule);
                            }
                        }
                    }
                }
            }
        });
    }

});
/*global CSSLint*/

/*
 * Rule: Don't use width or height when using padding or border. 
 */
CSSLint.addRule({

    //rule information
    id: "box-model",
    name: "Beware of broken box size",
    desc: "Don't use width or height when using padding or border.",
    browsers: "All",

    //initialization
    init: function(parser, reporter){
        var rule = this,
            widthProperties = {
                border: 1,
                "border-left": 1,
                "border-right": 1,
                padding: 1,
                "padding-left": 1,
                "padding-right": 1
            },
            heightProperties = {
                border: 1,
                "border-bottom": 1,
                "border-top": 1,
                padding: 1,
                "padding-bottom": 1,
                "padding-top": 1
            },
            properties,
            boxSizing = false;

        function startRule(){
            properties = {};
            boxSizing = false;
        }

        function endRule(){
            var prop, value;
            
            if (!boxSizing) {
                if (properties.height){
                    for (prop in heightProperties){
                        if (heightProperties.hasOwnProperty(prop) && properties[prop]){
                            value = properties[prop].value;
                            //special case for padding
                            if (!(prop == "padding" && value.parts.length === 2 && value.parts[0].value === 0)){
                                reporter.report("Using height with " + prop + " can sometimes make elements larger than you expect.", properties[prop].line, properties[prop].col, rule);
                            }
                        }
                    }
                }

                if (properties.width){
                    for (prop in widthProperties){
                        if (widthProperties.hasOwnProperty(prop) && properties[prop]){
                            value = properties[prop].value;
                            
                            if (!(prop == "padding" && value.parts.length === 2 && value.parts[1].value === 0)){
                                reporter.report("Using width with " + prop + " can sometimes make elements larger than you expect.", properties[prop].line, properties[prop].col, rule);
                            }
                        }
                    }
                }   
            }     
        }

        parser.addListener("startrule", startRule);
        parser.addListener("startfontface", startRule);
        parser.addListener("startpage", startRule);
        parser.addListener("startpagemargin", startRule);
        parser.addListener("startkeyframerule", startRule); 

        parser.addListener("property", function(event){
            var name = event.property.text.toLowerCase();
            
            if (heightProperties[name] || widthProperties[name]){
                if (!/^0\S*$/.test(event.value) && !(name == "border" && event.value == "none")){
                    properties[name] = { line: event.property.line, col: event.property.col, value: event.value };
                }
            } else {
                if (/^(width|height)/i.test(name) && /^(length|percentage)/.test(event.value.parts[0].type)){
                    properties[name] = 1;
                } else if (name == "box-sizing") {
                    boxSizing = true;
                }
            }
            
        });

        parser.addListener("endrule", endRule);
        parser.addListener("endfontface", endRule);
        parser.addListener("endpage", endRule);
        parser.addListener("endpagemargin", endRule);
        parser.addListener("endkeyframerule", endRule);         
    }

});
/*global CSSLint*/

/*
 * Rule: box-sizing doesn't work in IE6 and IE7.
 */
CSSLint.addRule({

    //rule information
    id: "box-sizing",
    name: "Disallow use of box-sizing",
    desc: "The box-sizing properties isn't supported in IE6 and IE7.",
    browsers: "IE6, IE7",
    tags: ["Compatibility"],

    //initialization
    init: function(parser, reporter){
        var rule = this;

        parser.addListener("property", function(event){
            var name = event.property.text.toLowerCase();
   
            if (name == "box-sizing"){
                reporter.report("The box-sizing property isn't supported in IE6 and IE7.", event.line, event.col, rule);
            }
        });       
    }

});
/*
 * Rule: Use the bulletproof @font-face syntax to avoid 404's in old IE
 * (http://www.fontspring.com/blog/the-new-bulletproof-font-face-syntax)
 */
/*global CSSLint*/
CSSLint.addRule({

    //rule information
    id: "bulletproof-font-face",
    name: "Use the bulletproof @font-face syntax",
    desc: "Use the bulletproof @font-face syntax to avoid 404's in old IE (http://www.fontspring.com/blog/the-new-bulletproof-font-face-syntax).",
    browsers: "All",

    //initialization
    init: function(parser, reporter){
        var rule = this,
            count = 0,
            fontFaceRule = false,
            firstSrc     = true,
            ruleFailed    = false,
            line, col;

        // Mark the start of a @font-face declaration so we only test properties inside it
        parser.addListener("startfontface", function(event){
            fontFaceRule = true;
        });

        parser.addListener("property", function(event){
            // If we aren't inside an @font-face declaration then just return
            if (!fontFaceRule) {
                return;
            }

            var propertyName = event.property.toString().toLowerCase(),
                value        = event.value.toString();

            // Set the line and col numbers for use in the endfontface listener
            line = event.line;
            col  = event.col;

            // This is the property that we care about, we can ignore the rest
            if (propertyName === 'src') {
                var regex = /^\s?url\(['"].+\.eot\?.*['"]\)\s*format\(['"]embedded-opentype['"]\).*$/i;

                // We need to handle the advanced syntax with two src properties
                if (!value.match(regex) && firstSrc) {
                    ruleFailed = true;
                    firstSrc = false;
                } else if (value.match(regex) && !firstSrc) {
                    ruleFailed = false;
                }
            }


        });

        // Back to normal rules that we don't need to test
        parser.addListener("endfontface", function(event){
            fontFaceRule = false;

            if (ruleFailed) {
                reporter.report("@font-face declaration doesn't follow the fontspring bulletproof syntax.", line, col, rule);
            }
        });
    }
});
/*
 * Rule: Include all compatible vendor prefixes to reach a wider
 * range of users.
 */
/*global CSSLint*/ 
CSSLint.addRule({

    //rule information
    id: "compatible-vendor-prefixes",
    name: "Require compatible vendor prefixes",
    desc: "Include all compatible vendor prefixes to reach a wider range of users.",
    browsers: "All",

    //initialization
    init: function (parser, reporter) {
        var rule = this,
            compatiblePrefixes,
            properties,
            prop,
            variations,
            prefixed,
            i,
            len,
            inKeyFrame = false,
            arrayPush = Array.prototype.push,
            applyTo = [];

        // See http://peter.sh/experiments/vendor-prefixed-css-property-overview/ for details
        compatiblePrefixes = {
            "animation"                  : "webkit moz",
            "animation-delay"            : "webkit moz",
            "animation-direction"        : "webkit moz",
            "animation-duration"         : "webkit moz",
            "animation-fill-mode"        : "webkit moz",
            "animation-iteration-count"  : "webkit moz",
            "animation-name"             : "webkit moz",
            "animation-play-state"       : "webkit moz",
            "animation-timing-function"  : "webkit moz",
            "appearance"                 : "webkit moz",
            "border-end"                 : "webkit moz",
            "border-end-color"           : "webkit moz",
            "border-end-style"           : "webkit moz",
            "border-end-width"           : "webkit moz",
            "border-image"               : "webkit moz o",
            "border-radius"              : "webkit",
            "border-start"               : "webkit moz",
            "border-start-color"         : "webkit moz",
            "border-start-style"         : "webkit moz",
            "border-start-width"         : "webkit moz",
            "box-align"                  : "webkit moz ms",
            "box-direction"              : "webkit moz ms",
            "box-flex"                   : "webkit moz ms",
            "box-lines"                  : "webkit ms",
            "box-ordinal-group"          : "webkit moz ms",
            "box-orient"                 : "webkit moz ms",
            "box-pack"                   : "webkit moz ms",
            "box-sizing"                 : "webkit moz",
            "box-shadow"                 : "webkit moz",
            "column-count"               : "webkit moz ms",
            "column-gap"                 : "webkit moz ms",
            "column-rule"                : "webkit moz ms",
            "column-rule-color"          : "webkit moz ms",
            "column-rule-style"          : "webkit moz ms",
            "column-rule-width"          : "webkit moz ms",
            "column-width"               : "webkit moz ms",
            "hyphens"                    : "epub moz",
            "line-break"                 : "webkit ms",
            "margin-end"                 : "webkit moz",
            "margin-start"               : "webkit moz",
            "marquee-speed"              : "webkit wap",
            "marquee-style"              : "webkit wap",
            "padding-end"                : "webkit moz",
            "padding-start"              : "webkit moz",
            "tab-size"                   : "moz o",
            "text-size-adjust"           : "webkit ms",
            "transform"                  : "webkit moz ms o",
            "transform-origin"           : "webkit moz ms o",
            "transition"                 : "webkit moz o",
            "transition-delay"           : "webkit moz o",
            "transition-duration"        : "webkit moz o",
            "transition-property"        : "webkit moz o",
            "transition-timing-function" : "webkit moz o",
            "user-modify"                : "webkit moz",
            "user-select"                : "webkit moz ms",
            "word-break"                 : "epub ms",
            "writing-mode"               : "epub ms"
        };


        for (prop in compatiblePrefixes) {
            if (compatiblePrefixes.hasOwnProperty(prop)) {
                variations = [];
                prefixed = compatiblePrefixes[prop].split(' ');
                for (i = 0, len = prefixed.length; i < len; i++) {
                    variations.push('-' + prefixed[i] + '-' + prop);
                }
                compatiblePrefixes[prop] = variations;
                arrayPush.apply(applyTo, variations);
            }
        }
                
        parser.addListener("startrule", function () {
            properties = [];
        });

        parser.addListener("startkeyframes", function (event) {
            inKeyFrame = event.prefix || true;
        });

        parser.addListener("endkeyframes", function (event) {
            inKeyFrame = false;
        });

        parser.addListener("property", function (event) {
            var name = event.property;
            if (CSSLint.Util.indexOf(applyTo, name.text) > -1) {
            
                // e.g., -moz-transform is okay to be alone in @-moz-keyframes
                if (!inKeyFrame || typeof inKeyFrame != "string" || 
                        name.text.indexOf("-" + inKeyFrame + "-") !== 0) {
                    properties.push(name);
                }
            }
        });

        parser.addListener("endrule", function (event) {
            if (!properties.length) {
                return;
            }

            var propertyGroups = {},
                i,
                len,
                name,
                prop,
                variations,
                value,
                full,
                actual,
                item,
                propertiesSpecified;

            for (i = 0, len = properties.length; i < len; i++) {
                name = properties[i];

                for (prop in compatiblePrefixes) {
                    if (compatiblePrefixes.hasOwnProperty(prop)) {
                        variations = compatiblePrefixes[prop];
                        if (CSSLint.Util.indexOf(variations, name.text) > -1) {
                            if (!propertyGroups[prop]) {
                                propertyGroups[prop] = {
                                    full : variations.slice(0),
                                    actual : [],
                                    actualNodes: []
                                };
                            }
                            if (CSSLint.Util.indexOf(propertyGroups[prop].actual, name.text) === -1) {
                                propertyGroups[prop].actual.push(name.text);
                                propertyGroups[prop].actualNodes.push(name);
                            }
                        }
                    }
                }
            }

            for (prop in propertyGroups) {
                if (propertyGroups.hasOwnProperty(prop)) {
                    value = propertyGroups[prop];
                    full = value.full;
                    actual = value.actual;

                    if (full.length > actual.length) {
                        for (i = 0, len = full.length; i < len; i++) {
                            item = full[i];
                            if (CSSLint.Util.indexOf(actual, item) === -1) {
                                propertiesSpecified = (actual.length === 1) ? actual[0] : (actual.length == 2) ? actual.join(" and ") : actual.join(", ");
                                reporter.report("The property " + item + " is compatible with " + propertiesSpecified + " and should be included as well.", value.actualNodes[0].line, value.actualNodes[0].col, rule); 
                            }
                        }

                    }
                }
            }
        });
    }
});
/*
 * Rule: Certain properties don't play well with certain display values. 
 * - float should not be used with inline-block
 * - height, width, margin-top, margin-bottom, float should not be used with inline
 * - vertical-align should not be used with block
 * - margin, float should not be used with table-*
 */
/*global CSSLint*/
CSSLint.addRule({

    //rule information
    id: "display-property-grouping",
    name: "Require properties appropriate for display",
    desc: "Certain properties shouldn't be used with certain display property values.",
    browsers: "All",

    //initialization
    init: function(parser, reporter){
        var rule = this;

        var propertiesToCheck = {
                display: 1,
                "float": "none",
                height: 1,
                width: 1,
                margin: 1,
                "margin-left": 1,
                "margin-right": 1,
                "margin-bottom": 1,
                "margin-top": 1,
                padding: 1,
                "padding-left": 1,
                "padding-right": 1,
                "padding-bottom": 1,
                "padding-top": 1,
                "vertical-align": 1
            },
            properties;

        function reportProperty(name, display, msg){
            if (properties[name]){
                if (typeof propertiesToCheck[name] != "string" || properties[name].value.toLowerCase() != propertiesToCheck[name]){
                    reporter.report(msg || name + " can't be used with display: " + display + ".", properties[name].line, properties[name].col, rule);
                }
            }
        }
        
        function startRule(){
            properties = {};
        }

        function endRule(){

            var display = properties.display ? properties.display.value : null;
            if (display){
                switch(display){

                    case "inline":
                        //height, width, margin-top, margin-bottom, float should not be used with inline
                        reportProperty("height", display);
                        reportProperty("width", display);
                        reportProperty("margin", display);
                        reportProperty("margin-top", display);
                        reportProperty("margin-bottom", display);              
                        reportProperty("float", display, "display:inline has no effect on floated elements (but may be used to fix the IE6 double-margin bug).");
                        break;

                    case "block":
                        //vertical-align should not be used with block
                        reportProperty("vertical-align", display);
                        break;

                    case "inline-block":
                        //float should not be used with inline-block
                        reportProperty("float", display);
                        break;

                    default:
                        //margin, float should not be used with table
                        if (display.indexOf("table-") === 0){
                            reportProperty("margin", display);
                            reportProperty("margin-left", display);
                            reportProperty("margin-right", display);
                            reportProperty("margin-top", display);
                            reportProperty("margin-bottom", display);
                            reportProperty("float", display);
                        }

                        //otherwise do nothing
                }
            }
          
        }

        parser.addListener("startrule", startRule);
        parser.addListener("startfontface", startRule);
        parser.addListener("startkeyframerule", startRule);
        parser.addListener("startpagemargin", startRule);
        parser.addListener("startpage", startRule);

        parser.addListener("property", function(event){
            var name = event.property.text.toLowerCase();

            if (propertiesToCheck[name]){
                properties[name] = { value: event.value.text, line: event.property.line, col: event.property.col };                    
            }
        });

        parser.addListener("endrule", endRule);
        parser.addListener("endfontface", endRule);
        parser.addListener("endkeyframerule", endRule);
        parser.addListener("endpagemargin", endRule);
        parser.addListener("endpage", endRule);

    }

});
/*
 * Rule: Disallow duplicate background-images (using url).
 */
/*global CSSLint*/
CSSLint.addRule({

    //rule information
    id: "duplicate-background-images",
    name: "Disallow duplicate background images",
    desc: "Every background-image should be unique. Use a common class for e.g. sprites.",
    browsers: "All",

    //initialization
    init: function(parser, reporter){
        var rule = this,
            stack = {};

        parser.addListener("property", function(event){
            var name = event.property.text,
                value = event.value,
                i, len;

            if (name.match(/background/i)) {
                for (i=0, len=value.parts.length; i < len; i++) {
                    if (value.parts[i].type == 'uri') {
                        if (typeof stack[value.parts[i].uri] === 'undefined') {
                            stack[value.parts[i].uri] = event;
                        }
                        else {
                            reporter.report("Background image '" + value.parts[i].uri + "' was used multiple times, first declared at line " + stack[value.parts[i].uri].line + ", col " + stack[value.parts[i].uri].col + ".", event.line, event.col, rule);
                        }
                    }
                }
            }
        });
    }
});
/*
 * Rule: Duplicate properties must appear one after the other. If an already-defined
 * property appears somewhere else in the rule, then it's likely an error.
 */
/*global CSSLint*/
CSSLint.addRule({

    //rule information
    id: "duplicate-properties",
    name: "Disallow duplicate properties",
    desc: "Duplicate properties must appear one after the other.",
    browsers: "All",

    //initialization
    init: function(parser, reporter){
        var rule = this,
            properties,
            lastProperty;            
            
        function startRule(event){
            properties = {};        
        }
        
        parser.addListener("startrule", startRule);
        parser.addListener("startfontface", startRule);
        parser.addListener("startpage", startRule);
        parser.addListener("startpagemargin", startRule);
        parser.addListener("startkeyframerule", startRule);        
        
        parser.addListener("property", function(event){
            var property = event.property,
                name = property.text.toLowerCase();
            
            if (properties[name] && (lastProperty != name || properties[name] == event.value.text)){
                reporter.report("Duplicate property '" + event.property + "' found.", event.line, event.col, rule);
            }
            
            properties[name] = event.value.text;
            lastProperty = name;
                        
        });
            
        
    }

});
/*
 * Rule: Style rules without any properties defined should be removed.
 */
/*global CSSLint*/
CSSLint.addRule({

    //rule information
    id: "empty-rules",
    name: "Disallow empty rules",
    desc: "Rules without any properties specified should be removed.",
    browsers: "All",

    //initialization
    init: function(parser, reporter){
        var rule = this,
            count = 0;

        parser.addListener("startrule", function(){
            count=0;
        });

        parser.addListener("property", function(){
            count++;
        });

        parser.addListener("endrule", function(event){
            var selectors = event.selectors;
            if (count === 0){
                reporter.report("Rule is empty.", selectors[0].line, selectors[0].col, rule);
            }
        });
    }

});
/*
 * Rule: There should be no syntax errors. (Duh.)
 */
/*global CSSLint*/
CSSLint.addRule({

    //rule information
    id: "errors",
    name: "Parsing Errors",
    desc: "This rule looks for recoverable syntax errors.",
    browsers: "All",

    //initialization
    init: function(parser, reporter){
        var rule = this;

        parser.addListener("error", function(event){
            reporter.error(event.message, event.line, event.col, rule);
        });

    }

});

/*global CSSLint*/
CSSLint.addRule({

    //rule information
    id: "fallback-colors",
    name: "Require fallback colors",
    desc: "For older browsers that don't support RGBA, HSL, or HSLA, provide a fallback color.",
    browsers: "IE6,IE7,IE8",

    //initialization
    init: function(parser, reporter){
        var rule = this,
            lastProperty,
            propertiesToCheck = {
                color: 1,
                background: 1,
                "border-color": 1,
                "border-top-color": 1,
                "border-right-color": 1,
                "border-bottom-color": 1,
                "border-left-color": 1,
                border: 1,
                "border-top": 1,
                "border-right": 1,
                "border-bottom": 1,
                "border-left": 1,
                "background-color": 1
            },
            properties;
        
        function startRule(event){
            properties = {};    
            lastProperty = null;    
        }
        
        parser.addListener("startrule", startRule);
        parser.addListener("startfontface", startRule);
        parser.addListener("startpage", startRule);
        parser.addListener("startpagemargin", startRule);
        parser.addListener("startkeyframerule", startRule);        
        
        parser.addListener("property", function(event){
            var property = event.property,
                name = property.text.toLowerCase(),
                parts = event.value.parts,
                i = 0, 
                colorType = "",
                len = parts.length;                
                        
            if(propertiesToCheck[name]){
                while(i < len){
                    if (parts[i].type == "color"){
                        if ("alpha" in parts[i] || "hue" in parts[i]){
                            
                            if (/([^\)]+)\(/.test(parts[i])){
                                colorType = RegExp.$1.toUpperCase();
                            }
                            
                            if (!lastProperty || (lastProperty.property.text.toLowerCase() != name || lastProperty.colorType != "compat")){
                                reporter.report("Fallback " + name + " (hex or RGB) should precede " + colorType + " " + name + ".", event.line, event.col, rule);
                            }
                        } else {
                            event.colorType = "compat";
                        }
                    }
                    
                    i++;
                }
            }

            lastProperty = event;
        });        
         
    }

});
/*
 * Rule: You shouldn't use more than 10 floats. If you do, there's probably
 * room for some abstraction.
 */
/*global CSSLint*/
CSSLint.addRule({

    //rule information
    id: "floats",
    name: "Disallow too many floats",
    desc: "This rule tests if the float property is used too many times",
    browsers: "All",

    //initialization
    init: function(parser, reporter){
        var rule = this;
        var count = 0;

        //count how many times "float" is used
        parser.addListener("property", function(event){
            if (event.property.text.toLowerCase() == "float" &&
                    event.value.text.toLowerCase() != "none"){
                count++;
            }
        });

        //report the results
        parser.addListener("endstylesheet", function(){
            reporter.stat("floats", count);
            if (count >= 10){
                reporter.rollupWarn("Too many floats (" + count + "), you're probably using them for layout. Consider using a grid system instead.", rule);
            }
        });
    }

});
/*
 * Rule: Avoid too many @font-face declarations in the same stylesheet.
 */
/*global CSSLint*/
CSSLint.addRule({

    //rule information
    id: "font-faces",
    name: "Don't use too many web fonts",
    desc: "Too many different web fonts in the same stylesheet.",
    browsers: "All",

    //initialization
    init: function(parser, reporter){
        var rule = this,
            count = 0;


        parser.addListener("startfontface", function(){
            count++;
        });

        parser.addListener("endstylesheet", function(){
            if (count > 5){
                reporter.rollupWarn("Too many @font-face declarations (" + count + ").", rule);
            }
        });
    }

});
/*
 * Rule: You shouldn't need more than 9 font-size declarations.
 */

/*global CSSLint*/
CSSLint.addRule({

    //rule information
    id: "font-sizes",
    name: "Disallow too many font sizes",
    desc: "Checks the number of font-size declarations.",
    browsers: "All",

    //initialization
    init: function(parser, reporter){
        var rule = this,
            count = 0;

        //check for use of "font-size"
        parser.addListener("property", function(event){
            if (event.property == "font-size"){
                count++;
            }
        });

        //report the results
        parser.addListener("endstylesheet", function(){
            reporter.stat("font-sizes", count);
            if (count >= 10){
                reporter.rollupWarn("Too many font-size declarations (" + count + "), abstraction needed.", rule);
            }
        });
    }

});
/*
 * Rule: When using a vendor-prefixed gradient, make sure to use them all.
 */
/*global CSSLint*/
CSSLint.addRule({

    //rule information
    id: "gradients",
    name: "Require all gradient definitions",
    desc: "When using a vendor-prefixed gradient, make sure to use them all.",
    browsers: "All",

    //initialization
    init: function(parser, reporter){
        var rule = this,
            gradients;

        parser.addListener("startrule", function(){
            gradients = {
                moz: 0,
                webkit: 0,
                oldWebkit: 0,
                o: 0
            };
        });

        parser.addListener("property", function(event){

            if (/\-(moz|o|webkit)(?:\-(?:linear|radial))\-gradient/i.test(event.value)){
                gradients[RegExp.$1] = 1;
            } else if (/\-webkit\-gradient/i.test(event.value)){
                gradients.oldWebkit = 1;
            }

        });

        parser.addListener("endrule", function(event){
            var missing = [];

            if (!gradients.moz){
                missing.push("Firefox 3.6+");
            }

            if (!gradients.webkit){
                missing.push("Webkit (Safari 5+, Chrome)");
            }
            
            if (!gradients.oldWebkit){
                missing.push("Old Webkit (Safari 4+, Chrome)");
            }

            if (!gradients.o){
                missing.push("Opera 11.1+");
            }

            if (missing.length && missing.length < 4){            
                reporter.report("Missing vendor-prefixed CSS gradients for " + missing.join(", ") + ".", event.selectors[0].line, event.selectors[0].col, rule); 
            }

        });

    }

});
/*
 * Rule: Don't use IDs for selectors.
 */
/*global CSSLint*/
CSSLint.addRule({

    //rule information
    id: "ids",
    name: "Disallow IDs in selectors",
    desc: "Selectors should not contain IDs.",
    browsers: "All",

    //initialization
    init: function(parser, reporter){
        var rule = this;
        parser.addListener("startrule", function(event){
            var selectors = event.selectors,
                selector,
                part,
                modifier,
                idCount,
                i, j, k;

            for (i=0; i < selectors.length; i++){
                selector = selectors[i];
                idCount = 0;

                for (j=0; j < selector.parts.length; j++){
                    part = selector.parts[j];
                    if (part.type == parser.SELECTOR_PART_TYPE){
                        for (k=0; k < part.modifiers.length; k++){
                            modifier = part.modifiers[k];
                            if (modifier.type == "id"){
                                idCount++;
                            }
                        }
                    }
                }

                if (idCount == 1){
                    reporter.report("Don't use IDs in selectors.", selector.line, selector.col, rule);
                } else if (idCount > 1){
                    reporter.report(idCount + " IDs in the selector, really?", selector.line, selector.col, rule);
                }
            }

        });
    }

});
/*
 * Rule: Don't use @import, use <link> instead.
 */
/*global CSSLint*/
CSSLint.addRule({

    //rule information
    id: "import",
    name: "Disallow @import",
    desc: "Don't use @import, use <link> instead.",
    browsers: "All",

    //initialization
    init: function(parser, reporter){
        var rule = this;
        
        parser.addListener("import", function(event){        
            reporter.report("@import prevents parallel downloads, use <link> instead.", event.line, event.col, rule);
        });

    }

});
/*
 * Rule: Make sure !important is not overused, this could lead to specificity
 * war. Display a warning on !important declarations, an error if it's
 * used more at least 10 times.
 */
/*global CSSLint*/
CSSLint.addRule({

    //rule information
    id: "important",
    name: "Disallow !important",
    desc: "Be careful when using !important declaration",
    browsers: "All",

    //initialization
    init: function(parser, reporter){
        var rule = this,
            count = 0;

        //warn that important is used and increment the declaration counter
        parser.addListener("property", function(event){
            if (event.important === true){
                count++;
                reporter.report("Use of !important", event.line, event.col, rule);
            }
        });

        //if there are more than 10, show an error
        parser.addListener("endstylesheet", function(){
            reporter.stat("important", count);
            if (count >= 10){
                reporter.rollupWarn("Too many !important declarations (" + count + "), try to use less than 10 to avoid specificity issues.", rule);
            }
        });
    }

});
/*
 * Rule: Properties should be known (listed in CSS3 specification) or
 * be a vendor-prefixed property.
 */
/*global CSSLint*/
CSSLint.addRule({

    //rule information
    id: "known-properties",
    name: "Require use of known properties",
    desc: "Properties should be known (listed in CSS3 specification) or be a vendor-prefixed property.",
    browsers: "All",

    //initialization
    init: function(parser, reporter){
        var rule = this;

        parser.addListener("property", function(event){
            var name = event.property.text.toLowerCase();

            // the check is handled entirely by the parser-lib (https://github.com/nzakas/parser-lib)
            if (event.invalid) {
                reporter.report(event.invalid.message, event.line, event.col, rule);
            }

        });
    }

});
/*
 * Rule: outline: none or outline: 0 should only be used in a :focus rule
 *       and only if there are other properties in the same rule.
 */
/*global CSSLint*/
CSSLint.addRule({

    //rule information
    id: "outline-none",
    name: "Disallow outline: none",
    desc: "Use of outline: none or outline: 0 should be limited to :focus rules.",
    browsers: "All",
    tags: ["Accessibility"],

    //initialization
    init: function(parser, reporter){
        var rule = this,
            lastRule;

        function startRule(event){
            if (event.selectors){
                lastRule = {
                    line: event.line,
                    col: event.col,
                    selectors: event.selectors,
                    propCount: 0,
                    outline: false
                };
            } else {
                lastRule = null;
            }
        }
        
        function endRule(event){
            if (lastRule){
                if (lastRule.outline){
                    if (lastRule.selectors.toString().toLowerCase().indexOf(":focus") == -1){
                        reporter.report("Outlines should only be modified using :focus.", lastRule.line, lastRule.col, rule);
                    } else if (lastRule.propCount == 1) {
                        reporter.report("Outlines shouldn't be hidden unless other visual changes are made.", lastRule.line, lastRule.col, rule);                        
                    }
                }
            }
        }

        parser.addListener("startrule", startRule);
        parser.addListener("startfontface", startRule);
        parser.addListener("startpage", startRule);
        parser.addListener("startpagemargin", startRule);
        parser.addListener("startkeyframerule", startRule); 

        parser.addListener("property", function(event){
            var name = event.property.text.toLowerCase(),
                value = event.value;                
                
            if (lastRule){
                lastRule.propCount++;
                if (name == "outline" && (value == "none" || value == "0")){
                    lastRule.outline = true;
                }            
            }
            
        });
        
        parser.addListener("endrule", endRule);
        parser.addListener("endfontface", endRule);
        parser.addListener("endpage", endRule);
        parser.addListener("endpagemargin", endRule);
        parser.addListener("endkeyframerule", endRule); 

    }

});
/*
 * Rule: Don't use classes or IDs with elements (a.foo or a#foo).
 */
/*global CSSLint*/
CSSLint.addRule({

    //rule information
    id: "overqualified-elements",
    name: "Disallow overqualified elements",
    desc: "Don't use classes or IDs with elements (a.foo or a#foo).",
    browsers: "All",

    //initialization
    init: function(parser, reporter){
        var rule = this,
            classes = {};
            
        parser.addListener("startrule", function(event){
            var selectors = event.selectors,
                selector,
                part,
                modifier,
                i, j, k;

            for (i=0; i < selectors.length; i++){
                selector = selectors[i];

                for (j=0; j < selector.parts.length; j++){
                    part = selector.parts[j];
                    if (part.type == parser.SELECTOR_PART_TYPE){
                        for (k=0; k < part.modifiers.length; k++){
                            modifier = part.modifiers[k];
                            if (part.elementName && modifier.type == "id"){
                                reporter.report("Element (" + part + ") is overqualified, just use " + modifier + " without element name.", part.line, part.col, rule);
                            } else if (modifier.type == "class"){
                                
                                if (!classes[modifier]){
                                    classes[modifier] = [];
                                }
                                classes[modifier].push({ modifier: modifier, part: part });
                            }
                        }
                    }
                }
            }
        });
        
        parser.addListener("endstylesheet", function(){
        
            var prop;
            for (prop in classes){
                if (classes.hasOwnProperty(prop)){
                
                    //one use means that this is overqualified
                    if (classes[prop].length == 1 && classes[prop][0].part.elementName){
                        reporter.report("Element (" + classes[prop][0].part + ") is overqualified, just use " + classes[prop][0].modifier + " without element name.", classes[prop][0].part.line, classes[prop][0].part.col, rule);
                    }
                }
            }        
        });
    }

});
/*
 * Rule: Headings (h1-h6) should not be qualified (namespaced).
 */
/*global CSSLint*/
CSSLint.addRule({

    //rule information
    id: "qualified-headings",
    name: "Disallow qualified headings",
    desc: "Headings should not be qualified (namespaced).",
    browsers: "All",

    //initialization
    init: function(parser, reporter){
        var rule = this;

        parser.addListener("startrule", function(event){
            var selectors = event.selectors,
                selector,
                part,
                i, j;

            for (i=0; i < selectors.length; i++){
                selector = selectors[i];

                for (j=0; j < selector.parts.length; j++){
                    part = selector.parts[j];
                    if (part.type == parser.SELECTOR_PART_TYPE){
                        if (part.elementName && /h[1-6]/.test(part.elementName.toString()) && j > 0){
                            reporter.report("Heading (" + part.elementName + ") should not be qualified.", part.line, part.col, rule);
                        }
                    }
                }
            }
        });
    }

});
/*
 * Rule: Selectors that look like regular expressions are slow and should be avoided.
 */
/*global CSSLint*/
CSSLint.addRule({

    //rule information
    id: "regex-selectors",
    name: "Disallow selectors that look like regexs",
    desc: "Selectors that look like regular expressions are slow and should be avoided.",
    browsers: "All",

    //initialization
    init: function(parser, reporter){
        var rule = this;

        parser.addListener("startrule", function(event){
            var selectors = event.selectors,
                selector,
                part,
                modifier,
                i, j, k;

            for (i=0; i < selectors.length; i++){
                selector = selectors[i];
                for (j=0; j < selector.parts.length; j++){
                    part = selector.parts[j];
                    if (part.type == parser.SELECTOR_PART_TYPE){
                        for (k=0; k < part.modifiers.length; k++){
                            modifier = part.modifiers[k];
                            if (modifier.type == "attribute"){
                                if (/([\~\|\^\$\*]=)/.test(modifier)){
                                    reporter.report("Attribute selectors with " + RegExp.$1 + " are slow!", modifier.line, modifier.col, rule);
                                }
                            }

                        }
                    }
                }
            }
        });
    }

});
/*
 * Rule: Total number of rules should not exceed x.
 */
/*global CSSLint*/
CSSLint.addRule({

    //rule information
    id: "rules-count",
    name: "Rules Count",
    desc: "Track how many rules there are.",
    browsers: "All",

    //initialization
    init: function(parser, reporter){
        var rule = this,
            count = 0;

        //count each rule
        parser.addListener("startrule", function(){
            count++;
        });

        parser.addListener("endstylesheet", function(){
            reporter.stat("rule-count", count);
        });
    }

});
/*
 * Rule: Warn people with approaching the IE 4095 limit 
 */
/*global CSSLint*/
CSSLint.addRule({

    //rule information
    id: "selector-max-approaching",
    name: "Warn when approaching the 4095 selector limit for IE",
    desc: "Will warn when selector count is >= 3800 selectors.",
    browsers: "IE",

    //initialization
    init: function(parser, reporter) {
        var rule = this, count = 0;

        parser.addListener('startrule', function(event) {
            count += event.selectors.length;
        });

        parser.addListener("endstylesheet", function() {
            if (count >= 3800) {
                reporter.report("You have " + count + " selectors. Internet Explorer supports a maximum of 4095 selectors per stylesheet. Consider refactoring.",0,0,rule); 
            }
        });
    }

});
/*
 * Rule: Warn people past the IE 4095 limit 
 */
/*global CSSLint*/
CSSLint.addRule({

    //rule information
    id: "selector-max",
    name: "Error when past the 4095 selector limit for IE",
    desc: "Will error when selector count is > 4095.",
    browsers: "IE",

    //initialization
    init: function(parser, reporter){
        var rule = this, count = 0;

        parser.addListener('startrule',function(event) {
            count += event.selectors.length;
        });

        parser.addListener("endstylesheet", function() {
            if (count > 4095) {
                reporter.report("You have " + count + " selectors. Internet Explorer supports a maximum of 4095 selectors per stylesheet. Consider refactoring.",0,0,rule); 
            }
        });
    }

});
/*
 * Rule: Use shorthand properties where possible.
 * 
 */
/*global CSSLint*/
CSSLint.addRule({

    //rule information
    id: "shorthand",
    name: "Require shorthand properties",
    desc: "Use shorthand properties where possible.",
    browsers: "All",
    
    //initialization
    init: function(parser, reporter){
        var rule = this,
            prop, i, len,
            propertiesToCheck = {},
            properties,
            mapping = {
                "margin": [
                    "margin-top",
                    "margin-bottom",
                    "margin-left",
                    "margin-right"
                ],
                "padding": [
                    "padding-top",
                    "padding-bottom",
                    "padding-left",
                    "padding-right"
                ]              
            };
            
        //initialize propertiesToCheck 
        for (prop in mapping){
            if (mapping.hasOwnProperty(prop)){
                for (i=0, len=mapping[prop].length; i < len; i++){
                    propertiesToCheck[mapping[prop][i]] = prop;
                }
            }
        }
            
        function startRule(event){
            properties = {};
        }
        
        //event handler for end of rules
        function endRule(event){
            
            var prop, i, len, total;
            
            //check which properties this rule has
            for (prop in mapping){
                if (mapping.hasOwnProperty(prop)){
                    total=0;
                    
                    for (i=0, len=mapping[prop].length; i < len; i++){
                        total += properties[mapping[prop][i]] ? 1 : 0;
                    }
                    
                    if (total == mapping[prop].length){
                        reporter.report("The properties " + mapping[prop].join(", ") + " can be replaced by " + prop + ".", event.line, event.col, rule);
                    }
                }
            }
        }        
        
        parser.addListener("startrule", startRule);
        parser.addListener("startfontface", startRule);
    
        //check for use of "font-size"
        parser.addListener("property", function(event){
            var name = event.property.toString().toLowerCase(),
                value = event.value.parts[0].value;

            if (propertiesToCheck[name]){
                properties[name] = 1;
            }
        });

        parser.addListener("endrule", endRule);
        parser.addListener("endfontface", endRule);     

    }

});
/*
 * Rule: Don't use properties with a star prefix.
 *
 */
/*global CSSLint*/
CSSLint.addRule({

    //rule information
    id: "star-property-hack",
    name: "Disallow properties with a star prefix",
    desc: "Checks for the star property hack (targets IE6/7)",
    browsers: "All",

    //initialization
    init: function(parser, reporter){
        var rule = this;

        //check if property name starts with "*"
        parser.addListener("property", function(event){
            var property = event.property;

            if (property.hack == "*") {
                reporter.report("Property with star prefix found.", event.property.line, event.property.col, rule);
            }
        });
    }
});
/*
 * Rule: Don't use text-indent for image replacement if you need to support rtl.
 *
 */
/*global CSSLint*/
CSSLint.addRule({

    //rule information
    id: "text-indent",
    name: "Disallow negative text-indent",
    desc: "Checks for text indent less than -99px",
    browsers: "All",

    //initialization
    init: function(parser, reporter){
        var rule = this,
            textIndent,
            direction;


        function startRule(event){
            textIndent = false;
            direction = "inherit";
        }

        //event handler for end of rules
        function endRule(event){
            if (textIndent && direction != "ltr"){
                reporter.report("Negative text-indent doesn't work well with RTL. If you use text-indent for image replacement explicitly set direction for that item to ltr.", textIndent.line, textIndent.col, rule);
            }
        }

        parser.addListener("startrule", startRule);
        parser.addListener("startfontface", startRule);

        //check for use of "font-size"
        parser.addListener("property", function(event){
            var name = event.property.toString().toLowerCase(),
                value = event.value;

            if (name == "text-indent" && value.parts[0].value < -99){
                textIndent = event.property;
            } else if (name == "direction" && value == "ltr"){
                direction = "ltr";
            }
        });

        parser.addListener("endrule", endRule);
        parser.addListener("endfontface", endRule);

    }

});
/*
 * Rule: Don't use properties with a underscore prefix.
 *
 */
/*global CSSLint*/
CSSLint.addRule({

    //rule information
    id: "underscore-property-hack",
    name: "Disallow properties with an underscore prefix",
    desc: "Checks for the underscore property hack (targets IE6)",
    browsers: "All",

    //initialization
    init: function(parser, reporter){
        var rule = this;

        //check if property name starts with "_"
        parser.addListener("property", function(event){
            var property = event.property;

            if (property.hack == "_") {
                reporter.report("Property with underscore prefix found.", event.property.line, event.property.col, rule);
            }
        });
    }
});
/*
 * Rule: Headings (h1-h6) should be defined only once.
 */
/*global CSSLint*/
CSSLint.addRule({

    //rule information
    id: "unique-headings",
    name: "Headings should only be defined once",
    desc: "Headings should be defined only once.",
    browsers: "All",

    //initialization
    init: function(parser, reporter){
        var rule = this;

        var headings =  {
                h1: 0,
                h2: 0,
                h3: 0,
                h4: 0,
                h5: 0,
                h6: 0
            };

        parser.addListener("startrule", function(event){
            var selectors = event.selectors,
                selector,
                part,
                pseudo,
                i, j;

            for (i=0; i < selectors.length; i++){
                selector = selectors[i];
                part = selector.parts[selector.parts.length-1];

                if (part.elementName && /(h[1-6])/i.test(part.elementName.toString())){
                    
                    for (j=0; j < part.modifiers.length; j++){
                        if (part.modifiers[j].type == "pseudo"){
                            pseudo = true;
                            break;
                        }
                    }
                
                    if (!pseudo){
                        headings[RegExp.$1]++;
                        if (headings[RegExp.$1] > 1) {
                            reporter.report("Heading (" + part.elementName + ") has already been defined.", part.line, part.col, rule);
                        }
                    }
                }
            }
        });
        
        parser.addListener("endstylesheet", function(event){
            var prop,
                messages = [];
                
            for (prop in headings){
                if (headings.hasOwnProperty(prop)){
                    if (headings[prop] > 1){
                        messages.push(headings[prop] + " " + prop + "s");
                    }
                }
            }
            
            if (messages.length){
                reporter.rollupWarn("You have " + messages.join(", ") + " defined in this stylesheet.", rule);
            }
        });        
    }

});
/*
 * Rule: Don't use universal selector because it's slow.
 */
/*global CSSLint*/
CSSLint.addRule({

    //rule information
    id: "universal-selector",
    name: "Disallow universal selector",
    desc: "The universal selector (*) is known to be slow.",
    browsers: "All",

    //initialization
    init: function(parser, reporter){
        var rule = this;

        parser.addListener("startrule", function(event){
            var selectors = event.selectors,
                selector,
                part,
                modifier,
                i, j, k;

            for (i=0; i < selectors.length; i++){
                selector = selectors[i];
                
                part = selector.parts[selector.parts.length-1];
                if (part.elementName == "*"){
                    reporter.report(rule.desc, part.line, part.col, rule);
                }
            }
        });
    }

});
/*
 * Rule: Don't use unqualified attribute selectors because they're just like universal selectors.
 */
/*global CSSLint*/
CSSLint.addRule({

    //rule information
    id: "unqualified-attributes",
    name: "Disallow unqualified attribute selectors",
    desc: "Unqualified attribute selectors are known to be slow.",
    browsers: "All",

    //initialization
    init: function(parser, reporter){
        var rule = this;

        parser.addListener("startrule", function(event){
            
            var selectors = event.selectors,
                selector,
                part,
                modifier,
                i, j, k;

            for (i=0; i < selectors.length; i++){
                selector = selectors[i];
                
                part = selector.parts[selector.parts.length-1];
                if (part.type == parser.SELECTOR_PART_TYPE){
                    for (k=0; k < part.modifiers.length; k++){
                        modifier = part.modifiers[k];
                        if (modifier.type == "attribute" && (!part.elementName || part.elementName == "*")){
                            reporter.report(rule.desc, part.line, part.col, rule);                               
                        }
                    }
                }
                
            }            
        });
    }

});
/*
 * Rule: When using a vendor-prefixed property, make sure to
 * include the standard one.
 */
/*global CSSLint*/
CSSLint.addRule({

    //rule information
    id: "vendor-prefix",
    name: "Require standard property with vendor prefix",
    desc: "When using a vendor-prefixed property, make sure to include the standard one.",
    browsers: "All",

    //initialization
    init: function(parser, reporter){
        var rule = this,
            properties,
            num,
            propertiesToCheck = {
                "-webkit-border-radius": "border-radius",
                "-webkit-border-top-left-radius": "border-top-left-radius",
                "-webkit-border-top-right-radius": "border-top-right-radius",
                "-webkit-border-bottom-left-radius": "border-bottom-left-radius",
                "-webkit-border-bottom-right-radius": "border-bottom-right-radius",
                
                "-o-border-radius": "border-radius",
                "-o-border-top-left-radius": "border-top-left-radius",
                "-o-border-top-right-radius": "border-top-right-radius",
                "-o-border-bottom-left-radius": "border-bottom-left-radius",
                "-o-border-bottom-right-radius": "border-bottom-right-radius",
                
                "-moz-border-radius": "border-radius",
                "-moz-border-radius-topleft": "border-top-left-radius",
                "-moz-border-radius-topright": "border-top-right-radius",
                "-moz-border-radius-bottomleft": "border-bottom-left-radius",
                "-moz-border-radius-bottomright": "border-bottom-right-radius",                
                
                "-moz-column-count": "column-count",
                "-webkit-column-count": "column-count",
                
                "-moz-column-gap": "column-gap",
                "-webkit-column-gap": "column-gap",
                
                "-moz-column-rule": "column-rule",
                "-webkit-column-rule": "column-rule",
                
                "-moz-column-rule-style": "column-rule-style",
                "-webkit-column-rule-style": "column-rule-style",
                
                "-moz-column-rule-color": "column-rule-color",
                "-webkit-column-rule-color": "column-rule-color",
                
                "-moz-column-rule-width": "column-rule-width",
                "-webkit-column-rule-width": "column-rule-width",
                
                "-moz-column-width": "column-width",
                "-webkit-column-width": "column-width",
                
                "-webkit-column-span": "column-span",
                "-webkit-columns": "columns",
                
                "-moz-box-shadow": "box-shadow",
                "-webkit-box-shadow": "box-shadow",
                
                "-moz-transform" : "transform",
                "-webkit-transform" : "transform",
                "-o-transform" : "transform",
                "-ms-transform" : "transform",
                
                "-moz-transform-origin" : "transform-origin",
                "-webkit-transform-origin" : "transform-origin",
                "-o-transform-origin" : "transform-origin",
                "-ms-transform-origin" : "transform-origin",
                
                "-moz-box-sizing" : "box-sizing",
                "-webkit-box-sizing" : "box-sizing",
                
                "-moz-user-select" : "user-select",
                "-khtml-user-select" : "user-select",
                "-webkit-user-select" : "user-select"                
            };

        //event handler for beginning of rules
        function startRule(){
            properties = {};
            num=1;        
        }
        
        //event handler for end of rules
        function endRule(event){
            var prop,
                i, len,
                standard,
                needed,
                actual,
                needsStandard = [];

            for (prop in properties){
                if (propertiesToCheck[prop]){
                    needsStandard.push({ actual: prop, needed: propertiesToCheck[prop]});
                }
            }

            for (i=0, len=needsStandard.length; i < len; i++){
                needed = needsStandard[i].needed;
                actual = needsStandard[i].actual;

                if (!properties[needed]){               
                    reporter.report("Missing standard property '" + needed + "' to go along with '" + actual + "'.", properties[actual][0].name.line, properties[actual][0].name.col, rule);
                } else {
                    //make sure standard property is last
                    if (properties[needed][0].pos < properties[actual][0].pos){
                        reporter.report("Standard property '" + needed + "' should come after vendor-prefixed property '" + actual + "'.", properties[actual][0].name.line, properties[actual][0].name.col, rule);
                    }
                }
            }

        }        
        
        parser.addListener("startrule", startRule);
        parser.addListener("startfontface", startRule);
        parser.addListener("startpage", startRule);
        parser.addListener("startpagemargin", startRule);
        parser.addListener("startkeyframerule", startRule);         

        parser.addListener("property", function(event){
            var name = event.property.text.toLowerCase();

            if (!properties[name]){
                properties[name] = [];
            }

            properties[name].push({ name: event.property, value : event.value, pos:num++ });
        });

        parser.addListener("endrule", endRule);
        parser.addListener("endfontface", endRule);
        parser.addListener("endpage", endRule);
        parser.addListener("endpagemargin", endRule);
        parser.addListener("endkeyframerule", endRule);         
    }

});
/*
 * Rule: You don't need to specify units when a value is 0.
 */
/*global CSSLint*/
CSSLint.addRule({

    //rule information
    id: "zero-units",
    name: "Disallow units for 0 values",
    desc: "You don't need to specify units when a value is 0.",
    browsers: "All",

    //initialization
    init: function(parser, reporter){
        var rule = this;

        //count how many times "float" is used
        parser.addListener("property", function(event){
            var parts = event.value.parts,
                i = 0, 
                len = parts.length;

            while(i < len){
                if ((parts[i].units || parts[i].type == "percentage") && parts[i].value === 0 && parts[i].type != "time"){
                    reporter.report("Values of 0 shouldn't have units specified.", parts[i].line, parts[i].col, rule);
                }
                i++;
            }

        });

    }

});
/*global CSSLint*/
(function() {

    /**
     * Replace special characters before write to output.
     *
     * Rules:
     *  - single quotes is the escape sequence for double-quotes
     *  - &amp; is the escape sequence for &
     *  - &lt; is the escape sequence for <
     *  - &gt; is the escape sequence for >
     *
     * @param {String} message to escape
     * @return escaped message as {String}
     */
    var xmlEscape = function(str) {
        if (!str || str.constructor !== String) {
            return "";
        }
        
        return str.replace(/[\"&><]/g, function(match) {
            switch (match) {
                case "\"":
                    return "&quot;";
                case "&":
                    return "&amp;";
                case "<":
                    return "&lt;";
                case ">":
                    return "&gt;";            
            }
        });
    };

    CSSLint.addFormatter({
        //format information
        id: "checkstyle-xml",
        name: "Checkstyle XML format",

        /**
         * Return opening root XML tag.
         * @return {String} to prepend before all results
         */
        startFormat: function(){
            return "<?xml version=\"1.0\" encoding=\"utf-8\"?><checkstyle>";
        },

        /**
         * Return closing root XML tag.
         * @return {String} to append after all results
         */
        endFormat: function(){
            return "</checkstyle>";
        },
        
        /**
         * Returns message when there is a file read error.
         * @param {String} filename The name of the file that caused the error.
         * @param {String} message The error message
         * @return {String} The error message.
         */
        readError: function(filename, message) {
            return "<file name=\"" + xmlEscape(filename) + "\"><error line=\"0\" column=\"0\" severty=\"error\" message=\"" + xmlEscape(message) + "\"></error></file>";
        },

        /**
         * Given CSS Lint results for a file, return output for this format.
         * @param results {Object} with error and warning messages
         * @param filename {String} relative file path
         * @param options {Object} (UNUSED for now) specifies special handling of output
         * @return {String} output for results
         */
        formatResults: function(results, filename, options) {
            var messages = results.messages,
                output = [];

            /**
             * Generate a source string for a rule.
             * Checkstyle source strings usually resemble Java class names e.g
             * net.csslint.SomeRuleName
             * @param {Object} rule
             * @return rule source as {String}
             */
            var generateSource = function(rule) {
                if (!rule || !('name' in rule)) {
                    return "";
                }
                return 'net.csslint.' + rule.name.replace(/\s/g,'');
            };



            if (messages.length > 0) {
                output.push("<file name=\""+filename+"\">");
                CSSLint.Util.forEach(messages, function (message, i) {
                    //ignore rollups for now
                    if (!message.rollup) {
                      output.push("<error line=\"" + message.line + "\" column=\"" + message.col + "\" severity=\"" + message.type + "\"" +
                          " message=\"" + xmlEscape(message.message) + "\" source=\"" + generateSource(message.rule) +"\"/>");
                    }
                });
                output.push("</file>");
            }

            return output.join("");
        }
    });

}());
/*global CSSLint*/
CSSLint.addFormatter({
    //format information
    id: "compact",
    name: "Compact, 'porcelain' format",

    /**
     * Return content to be printed before all file results.
     * @return {String} to prepend before all results
     */
    startFormat: function() {
        return "";
    },

    /**
     * Return content to be printed after all file results.
     * @return {String} to append after all results
     */
    endFormat: function() {
        return "";
    },

    /**
     * Given CSS Lint results for a file, return output for this format.
     * @param results {Object} with error and warning messages
     * @param filename {String} relative file path
     * @param options {Object} (Optional) specifies special handling of output
     * @return {String} output for results
     */
    formatResults: function(results, filename, options) {
        var messages = results.messages,
            output = "";
        options = options || {};

        /**
         * Capitalize and return given string.
         * @param str {String} to capitalize
         * @return {String} capitalized
         */
        var capitalize = function(str) {
            return str.charAt(0).toUpperCase() + str.slice(1);
        };

        if (messages.length === 0) {
            return options.quiet ? "" : filename + ": Lint Free!";
        }

        CSSLint.Util.forEach(messages, function(message, i) {
            if (message.rollup) {
                output += filename + ": " + capitalize(message.type) + " - " + message.message + "\n";
            } else {
                output += filename + ": " + "line " + message.line + 
                    ", col " + message.col + ", " + capitalize(message.type) + " - " + message.message + "\n";
            }
        });
    
        return output;
    }
});
/*global CSSLint*/
CSSLint.addFormatter({
    //format information
    id: "csslint-xml",
    name: "CSSLint XML format",

    /**
     * Return opening root XML tag.
     * @return {String} to prepend before all results
     */
    startFormat: function(){
        return "<?xml version=\"1.0\" encoding=\"utf-8\"?><csslint>";
    },

    /**
     * Return closing root XML tag.
     * @return {String} to append after all results
     */
    endFormat: function(){
        return "</csslint>";
    },

    /**
     * Given CSS Lint results for a file, return output for this format.
     * @param results {Object} with error and warning messages
     * @param filename {String} relative file path
     * @param options {Object} (UNUSED for now) specifies special handling of output
     * @return {String} output for results
     */
    formatResults: function(results, filename, options) {
        var messages = results.messages,
            output = [];

        /**
         * Replace special characters before write to output.
         *
         * Rules:
         *  - single quotes is the escape sequence for double-quotes
         *  - &amp; is the escape sequence for &
         *  - &lt; is the escape sequence for <
         *  - &gt; is the escape sequence for >
         * 
         * @param {String} message to escape
         * @return escaped message as {String}
         */
        var escapeSpecialCharacters = function(str) {
            if (!str || str.constructor !== String) {
                return "";
            }
            return str.replace(/\"/g, "'").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        };

        if (messages.length > 0) {
            output.push("<file name=\""+filename+"\">");
            CSSLint.Util.forEach(messages, function (message, i) {
                if (message.rollup) {
                    output.push("<issue severity=\"" + message.type + "\" reason=\"" + escapeSpecialCharacters(message.message) + "\" evidence=\"" + escapeSpecialCharacters(message.evidence) + "\"/>");
                } else {
                    output.push("<issue line=\"" + message.line + "\" char=\"" + message.col + "\" severity=\"" + message.type + "\"" +
                        " reason=\"" + escapeSpecialCharacters(message.message) + "\" evidence=\"" + escapeSpecialCharacters(message.evidence) + "\"/>");
                }
            });
            output.push("</file>");
        }

        return output.join("");
    }
});
/*global CSSLint*/
CSSLint.addFormatter({
    //format information
    id: "junit-xml",
    name: "JUNIT XML format",

    /**
     * Return opening root XML tag.
     * @return {String} to prepend before all results
     */
    startFormat: function(){
        return "<?xml version=\"1.0\" encoding=\"utf-8\"?><testsuites>";
    },

    /**
     * Return closing root XML tag.
     * @return {String} to append after all results
     */
    endFormat: function() {
        return "</testsuites>";
    },

    /**
     * Given CSS Lint results for a file, return output for this format.
     * @param results {Object} with error and warning messages
     * @param filename {String} relative file path
     * @param options {Object} (UNUSED for now) specifies special handling of output
     * @return {String} output for results
     */
    formatResults: function(results, filename, options) {

        var messages = results.messages,
            output = [],
            tests = {
                'error': 0,
                'failure': 0
            };

        /**
         * Generate a source string for a rule.
         * JUNIT source strings usually resemble Java class names e.g
         * net.csslint.SomeRuleName
         * @param {Object} rule
         * @return rule source as {String}
         */
        var generateSource = function(rule) {
            if (!rule || !('name' in rule)) {
                return "";
            }
            return 'net.csslint.' + rule.name.replace(/\s/g,'');
        };

        /**
         * Replace special characters before write to output.
         *
         * Rules:
         *  - single quotes is the escape sequence for double-quotes
         *  - &lt; is the escape sequence for <
         *  - &gt; is the escape sequence for >
         *
         * @param {String} message to escape
         * @return escaped message as {String}
         */
        var escapeSpecialCharacters = function(str) {

            if (!str || str.constructor !== String) {
                return "";
            }

            return str.replace(/\"/g, "'").replace(/</g, "&lt;").replace(/>/g, "&gt;");

        };

        if (messages.length > 0) {

            messages.forEach(function (message, i) {

                // since junit has no warning class
                // all issues as errors
                var type = message.type === 'warning' ? 'error' : message.type;

                //ignore rollups for now
                if (!message.rollup) {

                    // build the test case seperately, once joined
                    // we'll add it to a custom array filtered by type
                    output.push("<testcase time=\"0\" name=\"" + generateSource(message.rule) + "\">");
                    output.push("<" + type + " message=\"" + escapeSpecialCharacters(message.message) + "\"><![CDATA[" + message.line + ':' + message.col + ':' + escapeSpecialCharacters(message.evidence)  + "]]></" + type + ">");
                    output.push("</testcase>");

                    tests[type] += 1;

                }

            });

            output.unshift("<testsuite time=\"0\" tests=\"" + messages.length + "\" skipped=\"0\" errors=\"" + tests.error + "\" failures=\"" + tests.failure + "\" package=\"net.csslint\" name=\"" + filename + "\">");
            output.push("</testsuite>");

        }

        return output.join("");

    }
});
/*global CSSLint*/
CSSLint.addFormatter({
    //format information
    id: "lint-xml",
    name: "Lint XML format",

    /**
     * Return opening root XML tag.
     * @return {String} to prepend before all results
     */
    startFormat: function(){
        return "<?xml version=\"1.0\" encoding=\"utf-8\"?><lint>";
    },

    /**
     * Return closing root XML tag.
     * @return {String} to append after all results
     */
    endFormat: function(){
        return "</lint>";
    },

    /**
     * Given CSS Lint results for a file, return output for this format.
     * @param results {Object} with error and warning messages
     * @param filename {String} relative file path
     * @param options {Object} (UNUSED for now) specifies special handling of output
     * @return {String} output for results
     */
    formatResults: function(results, filename, options) {
        var messages = results.messages,
            output = [];

        /**
         * Replace special characters before write to output.
         *
         * Rules:
         *  - single quotes is the escape sequence for double-quotes
         *  - &amp; is the escape sequence for &
         *  - &lt; is the escape sequence for <
         *  - &gt; is the escape sequence for >
         * 
         * @param {String} message to escape
         * @return escaped message as {String}
         */
        var escapeSpecialCharacters = function(str) {
            if (!str || str.constructor !== String) {
                return "";
            }
            return str.replace(/\"/g, "'").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        };

        if (messages.length > 0) {
        
            output.push("<file name=\""+filename+"\">");
            CSSLint.Util.forEach(messages, function (message, i) {
                if (message.rollup) {
                    output.push("<issue severity=\"" + message.type + "\" reason=\"" + escapeSpecialCharacters(message.message) + "\" evidence=\"" + escapeSpecialCharacters(message.evidence) + "\"/>");
                } else {
                    output.push("<issue line=\"" + message.line + "\" char=\"" + message.col + "\" severity=\"" + message.type + "\"" +
                        " reason=\"" + escapeSpecialCharacters(message.message) + "\" evidence=\"" + escapeSpecialCharacters(message.evidence) + "\"/>");
                }
            });
            output.push("</file>");
        }

        return output.join("");
    }
});
/*global CSSLint*/
CSSLint.addFormatter({
    //format information
    id: "text",
    name: "Plain Text",

    /**
     * Return content to be printed before all file results.
     * @return {String} to prepend before all results
     */
    startFormat: function() {
        return "";
    },

    /**
     * Return content to be printed after all file results.
     * @return {String} to append after all results
     */
    endFormat: function() {
        return "";
    },

    /**
     * Given CSS Lint results for a file, return output for this format.
     * @param results {Object} with error and warning messages
     * @param filename {String} relative file path
     * @param options {Object} (Optional) specifies special handling of output
     * @return {String} output for results
     */
    formatResults: function(results, filename, options) {
        var messages = results.messages,
            output = "";
        options = options || {};

        if (messages.length === 0) {
            return options.quiet ? "" : "\n\ncsslint: No errors in " + filename + ".";
        }

        output = "\n\ncsslint: There are " + messages.length  +  " problems in " + filename + ".";
        var pos = filename.lastIndexOf("/"),
            shortFilename = filename;

        if (pos === -1){
            pos = filename.lastIndexOf("\\");       
        }
        if (pos > -1){
            shortFilename = filename.substring(pos+1);
        }

        CSSLint.Util.forEach(messages, function (message, i) {
            output = output + "\n\n" + shortFilename;
            if (message.rollup) {
                output += "\n" + (i+1) + ": " + message.type;
                output += "\n" + message.message;
            } else {
                output += "\n" + (i+1) + ": " + message.type + " at line " + message.line + ", col " + message.col;
                output += "\n" + message.message;
                output += "\n" + message.evidence;
            }
        });
    
        return output;
    }
});

return CSSLint;
})();

module.exports = CSSLint;

});
/**
 * Cloud9 Language Foundation
 *
 * @copyright 2011, Ajax.org B.V.
 * @license GPLv3 <http://www.gnu.org/licenses/gpl.txt>
 */
define('ext/htmllanguage/html_completer', ['require', 'exports', 'module' , 'ext/codecomplete/complete_util', 'ext/language/base_handler', 'ext/htmllanguage/snippets'], function(require, exports, module) {

var completeUtil = require("ext/codecomplete/complete_util");
var baseLanguageHandler = require('ext/language/base_handler');
var htmlSnippets = require("ext/htmllanguage/snippets");

var completer = module.exports = Object.create(baseLanguageHandler);

completer.handlesLanguage = function(language) {
    return language === "html";
};

var JADE_REGEX = /.*?([a-zA-Z]*)([.#])([\w]+)/;
var JADE_ID_REGEX = /[a-zA-Z_0-9\$\_.#]/;

completer.complete = function(doc, fullAst, pos, currentNode, callback) {
    var line = doc.getLine(pos.row);
    var match = JADE_REGEX.exec(line.substring(0, pos.column));
    if(match) {
        var replaceText;
        var snippet = htmlSnippets[match[1]];
        if (snippet) {
            replaceText = snippet.replace("<" + match[1] + ">",
                ["<", match[1], match[2] === "." ? " class=\"" : " id=\"",
                    match[3], "\">"].join(""));
        }
        else {
            replaceText = ["<", match[1] || "div",
                match[2] === "." ? " class=\"" : " id=\"", match[3],
                "\">^^", "</", match[1] || "div", ">"].join("");
        }
        callback([{
              name            : match[1]+match[2]+match[3],
              replaceText     : replaceText,
              doc             : "<pre>" + replaceText.replace("\^\^", "&#9251;") + "</pre>",
              icon            : null,
              meta            : "Jade-Haml",
              identifierRegex : JADE_ID_REGEX,
              priority        : 100
        }]);
    }
    else {
        var identifier = completeUtil.retrievePrecedingIdentifier(line, pos.column);
        var allIdentifiers = Object.keys(htmlSnippets);
        var matches = completeUtil.findCompletions(identifier, allIdentifiers);
        callback(matches.map(function(m) {
            return {
              name        : m,
              replaceText : htmlSnippets[m],
              doc         : "<pre>" + htmlSnippets[m].replace("\^\^", "&#9251;") + "</pre>",
              icon        : null,
              meta        : "snippet",
              priority    : 2
            };
        }));
    }
};


});
define('ext/htmllanguage/snippets', ['require', 'exports', 'module' ], function(require, exports, module) {

module.exports = {
    "script": "<script type=\"text/javascript\" src=\"^^\"></script>",
    "csslink": "<link rel=\"stylesheet\" href=\"^^\" type=\"text/css\" />",
    "link": "<link rel=\"stylesheet\" href=\"^^\" type=\"text/css\" />",
    "style": "<style type=\"text/css\">\n\t^^\n</style>",
    "amailto": "<a href=\"mailto:^^\"></a>",
    "html": "<!DOCTYPE html>\n<html>\n\t^^\n</html>",
    "body": "<body>\n\t^^\n</body>",
    "head": "<head>\n\t^^\n</head>",
    "table": "<table>\n\t<tr>\n\t\t<td>^^</td>\n\t</tr>\n</table>",
    "th": "<th>\n\t^^\n</th>",
    "tr": "<tr>\n\t^^\n</tr>",
    "td": "<td>^^</td>",
    "divc": "<div class=\"^^\"></div>",
    "div": "<div>^^</div>",
    "spanc": "<span class=\"^^\"></span>",
    "span": "<span>^^</span>",
    "form": "<form>\n\t<input type=\"text\" name=\"^^\"/>\n\t<input type=\"submit\" value=\"Submit\"/>\n</form>",
    "input": "<input type=\"text\" name=\"^^\"/>",
    "password": "<input type=\"password\" name=\"^^\"/>",
    "textarea": "<input type=\"textarea\" name=\"^^\"/>",
    "img": "<img src=\"^^\"></img>",
    "label" : "<label for=\"\">^^</label>",
    "lorem": "Lorem ipsum dolor sit amet, consectetuer adipiscing elit,\nsed diam nonummy nibh euismod tincidunt ut laoreet dolore\nmagna aliquam erat volutpat. Ut wisi enim ad minim veniam,\nquis nostrud exerci tation ullamcorper suscipit lobortis nisl\nut aliquip ex ea commodo consequat. Duis autem vel eum iriure\ndolor in hendrerit in vulputate velit esse molestie consequat,\nvel illum dolore eu feugiat nulla facilisis at vero eros et\naccumsan et iusto odio dignissim qui blandit praesent luptatum\nzzril delenit augue duis dolore te feugait nulla facilisi.\nNam liber tempor cum soluta nobis eleifend option congue\nnihil imperdiet doming id quod mazim placerat facer possim\nassum. Typi non habent claritatem insitam; est usus legentis\nin iis qui facit eorum claritatem. Investigationes\ndemonstraverunt lectores legere me lius quod ii legunt saepius.\nClaritas est etiam processus dynamicus, qui sequitur mutationem\nconsuetudium lectorum. Mirum est notare quam littera gothica,\nquam nunc putamus parum claram, anteposuerit litterarum formas\nhumanitatis per seacula quarta decima et quinta decima. Eodem\nmodo typi, qui nunc nobis videntur parum clari, fiant sollemnes\nin futurum.^^"
};

});/**
 * Cloud9 Language Foundation
 *
 * @copyright 2011, Ajax.org B.V.
 * @license GPLv3 <http://www.gnu.org/licenses/gpl.txt>
 */
define('ext/codecomplete/mode_completer', ['require', 'exports', 'module' , 'ext/codecomplete/complete_util', 'ext/language/base_handler'], function(require, exports, module) {

var completeUtil = require("ext/codecomplete/complete_util");
var baseLanguageHandler = require('ext/language/base_handler');

var completer = module.exports = Object.create(baseLanguageHandler);

var modeCache = {}; // extension -> static data
var iconLanglist = ["php"];

completer.handlesLanguage = function(language) {
    return ["css", "less", "stylus", "php"].indexOf(language) !== -1;
};

completer.getMaxFileSizeSupported = function() {
    return Infinity;
};

var langDuplicates = {
    "less": "css",
    "stylus": "css"
};

var ID_REGEXES = {
    "css": /[a-zA-Z_0-9-]/
};

completer.complete = function(doc, fullAst, pos, currentNode, callback) {
    var language = langDuplicates[this.language] || this.language;
    var line = doc.getLine(pos.row);
    var idRegex = ID_REGEXES[language];
    var identifier = completeUtil.retrievePrecedingIdentifier(line, pos.column, idRegex);
    if(!identifier.length) // No completion after "."
        return callback([]);

    var mode = modeCache[language];

    if (mode === undefined) {
        var text;
        if (language)
            text = completeUtil.fetchText(this.staticPrefix, 'ext/codecomplete/modes/' + language + '.json');
        mode = text ? JSON.parse(text) : {};
        // Cache
        modeCache[language] = mode;
    }

    function getIcon(type) {
        if (iconLanglist.indexOf(language) === -1)
            return null;
        var iconMap = {
            "variable": "property",
            "constant": "property",
            "function": "method"
        };
        var subs = Object.keys(iconMap);
        for (var i = 0; i < subs.length; i++)
            if (type.indexOf(subs[i]) !== -1)
                return iconMap[subs[i]];
        return null;
    }

    // keywords, functions, constants, ..etc
    var types = Object.keys(mode);
    var matches = [];
    types.forEach(function (type) {
        var icon = getIcon(type);
        var nameAppend = "", replaceAppend = "";
        if (type.indexOf("function") !== -1) {
            nameAppend = "()";
            replaceAppend = "(^^)";
        }
        var deprecated = type.indexOf("deprecated") === -1 ? 0 : 1;
        var compls = completeUtil.findCompletions(identifier, mode[type]);
        matches.push.apply(matches, compls.map(function(m) {
            return {
                name            : m + nameAppend,
                replaceText     : m + replaceAppend,
                doc             : deprecated ? ("Deprecated: <del>" + m + nameAppend + "</del>") : null,
                icon            : icon,
                meta            : type,
                identifierRegex : idRegex,
                priority        : 2 - deprecated
            };
        }));
    });
    
    callback(matches);
};


});
/**
 * PHP linter worker.
 *
 * @copyright 2011, Ajax.org B.V.
 * @license GPLv3 <http://www.gnu.org/licenses/gpl.txt>
 */
define('ext/linereport_php/linereport_php_worker', ['require', 'exports', 'module' , 'ext/linereport/linereport_base'], function(require, exports, module) {
    
var baseLanguageHandler = require("ext/linereport/linereport_base");
var handler = module.exports = Object.create(baseLanguageHandler);

handler.disabled = false;
handler.$isInited = false;

handler.$isInited = false;

handler.handlesLanguage = function(language) {
    return language === 'php';
};

handler.init = function(callback) {
    handler.initReporter("php --version", "exit 1 # can't really install php", function(err, output) {
        if (err) {
            console.log("Unable to lint PHP\n" + output);
            handler.disabled = true;
        }
        callback();
    });
};

handler.analyze = function(doc, fullAst, callback) {
    if (handler.disabled)
        return callback();
    handler.invokeReporter("php -l " + handler.workspaceDir + "/" + handler.path,
        this.$postProcess, callback);
};

/**
 * Postprocess PHP output to match the expected format
 * line:column: error message.
 */
handler.$postProcess = function(line) {
    return line.replace(/(.*) (in .*? )?on line ([0-9]+)$/, "$3:1: $1/")
        .replace(/parse error in (.*)\/(.+?)\/?$/, "parse error in $2")
        .replace(handler.workspaceDir, "")
        .replace(/^([\d\s:]+)(PHP (?:parse )?(Warning|Error):)/i, "$1 $3:");
};

});


/**
 * PHP linter worker.
 *
 * @copyright 2011, Ajax.org B.V.
 * @license GPLv3 <http://www.gnu.org/licenses/gpl.txt>
 */
define('ext/linereport_python/linereport_python_worker', ['require', 'exports', 'module' , 'ext/linereport/linereport_base'], function(require, exports, module) {

var baseLanguageHandler = require("ext/linereport/linereport_base");
var handler = module.exports = Object.create(baseLanguageHandler);

handler.disabled = false;
handler.$isInited = false;

handler.handlesLanguage = function(language) {
    return language === 'python';
};

handler.init = function(callback) {
    handler.initReporter("pylint --version", "exit 1 # pylint isn't installed", function(err, output) {
        if (err) {
            console.log("Unable to lint Python\n" + output);
            handler.disabled = true;
        }
        callback();
    });
};

handler.analyze = function(doc, fullAst, callback) {
    if (handler.disabled)
        return callback();
    handler.invokeReporter("pylint -i y -E " + handler.workspaceDir + "/" + handler.path,
        this.$postProcess, callback);
};

/**
 * Postprocess Python output to match the expected format
 * line:column: error message.
 */
handler.$postProcess = function(line) {
    var pylintRegex = /^E\d{4}:\s*(\d+),(\d+):(.*)$/;
    return pylintRegex.test(line) && line.replace(pylintRegex, "$1:$2: $3/");
};

});


