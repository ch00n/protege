/*  Protégé JavaScript framework, version 0.5.3
 *  (c) 2012 Ryan Peel
 *
 *  Protégé is a jQuery compatible version of the Prototype JavaScript framework by Sam Stephenson.
 *
 *  jQuery must be loaded *before* this file as Protégé depends on jQuery's
 *  implementation of the Sizzle library and other misc functions.
 *
 *  Included Prototype Functionality:
 *
 *  Class
 *  String
 *  Template
 *  Array
 *  Object
 *  Hash
 *  Enumerable
 *  Element (partial)
 *  Event
 *
 *  For documentation on included functionality, see the Prototype web site: http://www.prototypejs.org/
 *
 *  The original Prototype $ function has been renamed to $P for internal use, But the $ function can be used for both
 *  Protégé and jQuery simultaneously.
 *
 *  Example: $('my_element') will return the element extended by Protégé, while $('#my_element') will return
 *  a jQuery extended element.
 *
 *
 *  Added Functionality:
 *
 *  jClass
 *
 *  Works the same as Class, but its designed to correctly extend jQuery allowing you to write 
 *  jQuery plugins in the classic Prototype Class format.
 *
 *  Base64
 *
 *  usage:  var b64encoded = ("string").base64_encode();
 *          var b64decoded = b64encoded.base64_decode();
 *
 *  To check if a string is base64 encoded (returns boolean):
 *  Object.isBase64Encoded(string);
 *
 *  Protégé is freely distributable under the terms of an MIT-style license.
 *--------------------------------------------------------------------------*/

var Protege = {

	Version: '0.5.4',

	Browser: (function() {
		var ua = navigator.userAgent;
		var isOpera = Object.prototype.toString.call(window.opera) == '[object Opera]';
		return {
			IE: !!window.attachEvent && !isOpera,
			Opera: isOpera,
			WebKit: ua.indexOf('AppleWebKit/') > -1,
			Gecko: ua.indexOf('Gecko') > -1 && ua.indexOf('KHTML') === -1,
			MobileSafari: /Apple.*Mobile/.test(ua)
		}
	})(),

	BrowserFeatures: {
		XPath: !!document.evaluate,

		SelectorsAPI: !!document.querySelector,

		ElementExtensions: (function() {
			var constructor = window.Element || window.HTMLElement;
			return !!(constructor && constructor.prototype);
		})(),
		SpecificElementExtensions: (function() {
			if (typeof window.HTMLDivElement !== 'undefined')
				return true;

			var div = document.createElement('div'),
			form = document.createElement('form'),
			isSupported = false;

			if (div['__proto__'] && (div['__proto__'] !== form['__proto__'])) {
				isSupported = true;
			}

			div = form = null;

			return isSupported;
		})()
	},

	ScriptFragment: '<script[^>]*>([\\S\\s]*?)<\/script>',
	JSONFilter: /^\/\*-secure-([\s\S]*)\*\/\s*$/,

	emptyFunction: function() { },

	K: function(x) { return x }
};

if(Protege.Browser.MobileSafari)
	Protege.BrowserFeatures.SpecificElementExtensions = false;

/**
 * jClass Usage
 *
 * jClass.create("myjQueryMethod", {
 * 				initialize: function(){
 * 					//init methods
 * 				},
 *
 * 				myfunc: function(){
 *
 *				}
 * 			});
 * "myjQueryMethod" will automatically become a jQuery function which you can use as follows:
 *
 * myclass = $('div.myelement').myjQueryMethod();
 *
 * Now you can call myclass.myfunc() and "this" inside the class object will always
 * refer to the element extended with jQuery plus anything you create inside the class object.
 *
 */
var jClass = (function() {

	var IS_DONTENUM_BUGGY = (function() {
		for (var p in {toString: 1}) {
			if (p === 'toString')
				return false;
		}
		return true;
	})();

	function subclass() {}

	function create() {

		var name = null, properties = $A(arguments);
		if (Object.isString(properties[0]))
			name = properties.shift();

		function jKlass() {
			this.constructor.superclass.fn.init.apply(this, arguments);
// 			this.init.apply(this, arguments);
			this.initialize.apply(this, arguments[1]);
		}

		Object.extend(jKlass, jClass.Methods);
		jKlass.superclass = jQuery;
		jKlass.subclasses = [];
		subclass.prototype = jQuery.prototype;
		jKlass.prototype = new subclass();
		jKlass.prototype.constructor = jKlass;

		for (var i = 0, length = properties.length; i < length; i++)
			jKlass.addMethods(properties[i]);

		if (!jKlass.prototype.initialize)
			jKlass.prototype.initialize = Protege.emptyFunction;

		if(name != null){
			var jquery_function = {};
			jquery_function[name] = function(){
				return new jKlass(this, arguments);
			}
			jQuery.fn.extend(jquery_function);
		}
		return jKlass;
	}

	function addMethods(source) {
		var ancestor = this.superclass && this.superclass.prototype,
		properties = Object.keys(source);

		if (IS_DONTENUM_BUGGY) {
			if (source.toString != Object.prototype.toString)
				properties.push("toString");
			if (source.valueOf != Object.prototype.valueOf)
				properties.push("valueOf");
		}

		for (var i = 0, length = properties.length; i < length; i++) {
			var property = properties[i], value = source[property];
			if (ancestor && Object.isFunction(value) && value.argumentNames()[0] == "$super") {
				var method = value;
				value = (function(m) {
					return function() {
						return ancestor[m].apply(this, arguments);
					};
				})(property).wrap(method);

				value.valueOf = method.valueOf.bind(method);
				value.toString = method.toString.bind(method);
			}
			this.prototype[property] = value;
		}

		return this;
	}

	return {
		create: create,
		Methods: {
			addMethods: addMethods
		}
	};
})();

var Class = (function() {

	var IS_DONTENUM_BUGGY = (function() {
		for (var p in {toString: 1}) {
			if (p === 'toString')
				return false;
		}
		return true;
	})();

	function subclass() {};
	function create() {
		var parent = null, properties = $A(arguments);
		if (Object.isFunction(properties[0]))
			parent = properties.shift();

		function klass() {
			this.initialize.apply(this, arguments);
		}

		Object.extend(klass, Class.Methods);
		klass.superclass = parent;
		klass.subclasses = [];

		if (parent) {
			subclass.prototype = parent.prototype;
			klass.prototype = new subclass;
			parent.subclasses.push(klass);
		}

		for (var i = 0, length = properties.length; i < length; i++)
			klass.addMethods(properties[i]);

		if (!klass.prototype.initialize)
			klass.prototype.initialize = Protege.emptyFunction;

		klass.prototype.constructor = klass;
		return klass;
	}

	function addMethods(source) {
		var ancestor = this.superclass && this.superclass.prototype,
		properties = Object.keys(source);

		if (IS_DONTENUM_BUGGY) {
			if (source.toString != Object.prototype.toString)
				properties.push("toString");
			if (source.valueOf != Object.prototype.valueOf)
				properties.push("valueOf");
		}

		for (var i = 0, length = properties.length; i < length; i++) {
			var property = properties[i], value = source[property];
			if (ancestor && Object.isFunction(value) &&
			value.argumentNames()[0] == "$super") {
				var method = value;
				value = (function(m) {
					return function() {
						return ancestor[m].apply(this, arguments);
					};
				})(property).wrap(method);

				value.valueOf = method.valueOf.bind(method);
				value.toString = method.toString.bind(method);
			}
			this.prototype[property] = value;
		}

		return this;
	}

	return {
		create: create,
		Methods: {
			addMethods: addMethods
		}
	};
})();

(function() {

	var _toString = Object.prototype.toString,
	NULL_TYPE = 'Null',
	UNDEFINED_TYPE = 'Undefined',
	BOOLEAN_TYPE = 'Boolean',
	NUMBER_TYPE = 'Number',
	STRING_TYPE = 'String',
	OBJECT_TYPE = 'Object',
	FUNCTION_CLASS = '[object Function]',
	BOOLEAN_CLASS = '[object Boolean]',
	NUMBER_CLASS = '[object Number]',
	STRING_CLASS = '[object String]',
	ARRAY_CLASS = '[object Array]',
	DATE_CLASS = '[object Date]',
	NATIVE_JSON_STRINGIFY_SUPPORT = window.JSON &&
	typeof JSON.stringify === 'function' &&
	JSON.stringify(0) === '0' &&
	typeof JSON.stringify(Protege.K) === 'undefined';

	function Type(o) {
		switch (o) {
			case null:
				return NULL_TYPE;
			case (void 0):
				return UNDEFINED_TYPE;
		}
		var type = typeof o;
		switch (type) {
			case 'boolean':
				return BOOLEAN_TYPE;
			case 'number':
				return NUMBER_TYPE;
			case 'string':
				return STRING_TYPE;
		}
		return OBJECT_TYPE;
	}

	function extend(destination, source) {
		for (var property in source){
			destination[property] = source[property];
		}
		return destination;
	}

	function extendDeep(destination, source) {
		for (var property in source){
			if(typeof source[property] == 'object'){
				typeof destination[property] == 'undefined' ? destination[property] = {} : 0;
				destination[property] = extend(destination[property], source[property]);
			} else {
				destination[property] = source[property];
			}
		}
		return destination;
	}

	function inspect(object) {
		try {
			if (isUndefined(object))
				return 'undefined';
			if (object === null)
				return 'null';
			return object.inspect ? object.inspect() : String(object);
		} catch (e) {
			if (e instanceof RangeError)
				return '...';
			throw e;
		}
	}

	function toJSON(value) {
		return Str('', {'': value}, []);
	}

	function Str(key, holder, stack) {
		var value = holder[key],
		type = typeof value;

		if (Type(value) === OBJECT_TYPE && typeof value.toJSON === 'function') {
			value = value.toJSON(key);
		}

		var _class = _toString.call(value);

		switch (_class) {
			case NUMBER_CLASS:
			case BOOLEAN_CLASS:
			case STRING_CLASS:
				value = value.valueOf();
		}

		switch (value) {
			case null:
				return 'null';
			case true:
				return 'true';
			case false:
				return 'false';
		}

		type = typeof value;
		switch (type) {

			case 'string':
				return value.inspect(true);

			case 'number':
				return isFinite(value) ? String(value) : 'null';

			case 'object':
				for (var i = 0, length = stack.length; i < length; i++) {
					if (stack[i] === value) {
						throw new TypeError();
					}
				}
				stack.push(value);

				var partial = [];
				if (_class === ARRAY_CLASS) {
					for (var i = 0, length = value.length; i < length; i++) {
						var str = Str(i, value, stack);
						partial.push(typeof str === 'undefined' ? 'null' : str);
					}
					partial = '[' + partial.join(',') + ']';
				} else {
					var keys = Object.keys(value);
					for (var i = 0, length = keys.length; i < length; i++) {
						var key = keys[i], str = Str(key, value, stack);
						if (typeof str !== "undefined") {
							partial.push(key.inspect(true) + ':' + str);
						}
					}
					partial = '{' + partial.join(',') + '}';
				}
				stack.pop();
				return partial;
		}
	}

	function stringify(object) {
		return JSON.stringify(object);
	}

	function toQueryString(object) {
		return $H(object).toQueryString();
	}

	function toHTML(object) {
		return object && object.toHTML ? object.toHTML() : String.interpret(object);
	}

	function keys(object) {
		if (Type(object) !== OBJECT_TYPE) {
			throw new TypeError();
		}
		var results = [];
		for (var property in object) {
			if (object.hasOwnProperty(property)) {
				results.push(property);
			}
		}
		return results;
	}

	function values(object) {
		var results = [];
		for (var property in object)
			results.push(object[property]);
		return results;
	}

	function clone(object) {
		return extend({}, object);
	}

	function isElement(object) {
		try{
	        if (Object.isUndefined(object)) return false;
			return !!(object && object.nodeType == 1)
		} catch(e){
			return false
		}
	}

	function isArray(object) {
		return _toString.call(object) === ARRAY_CLASS;
	}

	var hasNativeIsArray = (typeof Array.isArray == 'function')
	&& Array.isArray([]) && !Array.isArray({});

	if (hasNativeIsArray) {
		isArray = Array.isArray;
	}

	function isHash(object) {
		return object instanceof Hash;
	}

	function isFunction(object) {
		return _toString.call(object) === FUNCTION_CLASS;
	}

	function isString(object) {
		return _toString.call(object) === STRING_CLASS;
	}

	function isNumber(object) {
		return _toString.call(object) === NUMBER_CLASS;
	}

	function isDate(object) {
		return _toString.call(object) === DATE_CLASS;
	}

	function isUndefined(object) {
		return typeof object === "undefined";
	}

	function isBase64Encoded(object) {
		if (Object.isString(object)) {
			if (Object.isArray(object.match(/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{4}|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)$/))) {
				var object = Base64.decode(object);
				if (Object.isString(object)) {
					if (!object.startsWith("=")) {
						return true
					}
				}
			}
		}
		return false;
	}

	extend(Object, {
		extend: extend,
		extendDeep:extendDeep,
		inspect: inspect,
		toJSON: NATIVE_JSON_STRINGIFY_SUPPORT ? stringify : toJSON,
		toQueryString: toQueryString,
		toHTML: toHTML,
		keys: Object.keys || keys,
		values: values,
		clone: clone,
		isElement: isElement,
		isArray: isArray,
		isHash: isHash,
		isFunction: isFunction,
		isString: isString,
		isNumber: isNumber,
		isDate: isDate,
		isUndefined: isUndefined,
		isBase64Encoded: isBase64Encoded
	});
})();

Object.extend(Function.prototype, (function() {
  var slice = Array.prototype.slice;

  function update(array, args) {
    var arrayLength = array.length, length = args.length;
    while (length--) array[arrayLength + length] = args[length];
    return array;
  }

  function merge(array, args) {
    array = slice.call(array, 0);
    return update(array, args);
  }

  function argumentNames() {
    var names = this.toString().match(/^[\s\(]*function[^(]*\(([^)]*)\)/)[1]
      .replace(/\/\/.*?[\r\n]|\/\*(?:.|[\r\n])*?\*\//g, '')
      .replace(/\s+/g, '').split(',');
    return names.length == 1 && !names[0] ? [] : names;
  }


  function bind(context) {
    if (arguments.length < 2 && Object.isUndefined(arguments[0]))
      return this;

    if (!Object.isFunction(this))
      throw new TypeError("The object is not callable.");

    var nop = function() {};
    var __method = this, args = slice.call(arguments, 1);

    var bound = function() {
      var a = merge(args, arguments);
      var c = this instanceof bound ? this : context;
      return __method.apply(c, a);
    };

    nop.prototype   = this.prototype;
    bound.prototype = new nop();

    return bound;
  }

  function bindAsEventListener(context) {
    var __method = this, args = slice.call(arguments, 1);
    return function(event) {
      var a = update([event || window.event], args);
      return __method.apply(context, a);
    }
  }

  function curry() {
    if (!arguments.length) return this;
    var __method = this, args = slice.call(arguments, 0);
    return function() {
      var a = merge(args, arguments);
      return __method.apply(this, a);
    }
  }

  function delay(timeout) {
    var __method = this, args = slice.call(arguments, 1);
    timeout = timeout * 1000;
    return window.setTimeout(function() {
      return __method.apply(__method, args);
    }, timeout);
  }

  function defer() {
    var args = update([0.01], arguments);
    return this.delay.apply(this, args);
  }

  function wrap(wrapper) {
    var __method = this;
    return function() {
      var a = update([__method.bind(this)], arguments);
      return wrapper.apply(this, a);
    }
  }

  function methodize() {
    if (this._methodized) return this._methodized;
    var __method = this;
    return this._methodized = function() {
      var a = update([this], arguments);
      return __method.apply(null, a);
    };
  }

  var extensions = {
    argumentNames:       argumentNames,
    bindAsEventListener: bindAsEventListener,
    curry:               curry,
    delay:               delay,
    defer:               defer,
    wrap:                wrap,
    methodize:           methodize
  };

  if (!Function.prototype.bind)
    extensions.bind = bind;

  return extensions;
})());

RegExp.prototype.match = RegExp.prototype.test;

RegExp.escape = function(str) {
	return String(str).replace(/([.*+?^=!:${}()|[\]\/\\])/g, '\\$1');
};

Object.extend(String, {
	interpret: function(value) {
		return value == null ? '' : String(value);
	},
	specialChar: {
		'\b': '\\b',
		'\t': '\\t',
		'\n': '\\n',
		'\f': '\\f',
		'\r': '\\r',
		'\\': '\\\\'
	}
});

Object.extend(String.prototype, (function() {
	var NATIVE_JSON_PARSE_SUPPORT = window.JSON &&
	typeof JSON.parse === 'function' &&
	JSON.parse('{"test": true}').test;

	function prepareReplacement(replacement) {
		if (Object.isFunction(replacement))
			return replacement;
		var template = new Template(replacement);
		return function(match) {
			return template.evaluate(match)
		};
	}

	function gsub(pattern, replacement) {
		var result = '', source = this, match;
		replacement = prepareReplacement(replacement);

		if (Object.isString(pattern))
			pattern = RegExp.escape(pattern);

		if (!(pattern.length || pattern.source)) {
			replacement = replacement('');
			return replacement + source.split('').join(replacement) + replacement;
		}

		while (source.length > 0) {
			if (match = source.match(pattern)) {
				result += source.slice(0, match.index);
				result += String.interpret(replacement(match));
				source = source.slice(match.index + match[0].length);
			} else {
				result += source, source = '';
			}
		}
		return result;
	}

	function sub(pattern, replacement, count) {
		replacement = prepareReplacement(replacement);
		count = Object.isUndefined(count) ? 1 : count;

		return this.gsub(pattern, function(match) {
			if (--count < 0)
				return match[0];
			return replacement(match);
		});
	}

	function scan(pattern, iterator) {
		this.gsub(pattern, iterator);
		return String(this);
	}

	function truncate(length, truncation) {
		length = length || 30;
		truncation = Object.isUndefined(truncation) ? '...' : truncation;
		return this.length > length ?
		this.slice(0, length - truncation.length) + truncation : String(this);
	}

	function strip() {
		return this.replace(/^\s+/, '').replace(/\s+$/, '');
	}

	function stripTags() {
		return this.replace(/<\w+(\s+("[^"]*"|'[^']*'|[^>])+)?>|<\/\w+>/gi, '');
	}

	function stripScripts() {
		return this.replace(new RegExp(Protege.ScriptFragment, 'img'), '');
	}

	function extractScripts() {
		var matchAll = new RegExp(Protege.ScriptFragment, 'img'),
		matchOne = new RegExp(Protege.ScriptFragment, 'im');
		return (this.match(matchAll) || []).map(function(scriptTag) {
			return (scriptTag.match(matchOne) || ['', ''])[1];
		});
	}

	function evalScripts() {
		return this.extractScripts().map(function(script) {
			return eval(script)
		});
	}

	function escapeHTML() {
		return this.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	}

	function unescapeHTML() {
		return this.stripTags().replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
	}


	function toQueryParams(separator) {
		var match = this.strip().match(/([^?#]*)(#.*)?$/);
		if (!match)
			return {};

		return match[1].split(separator || '&').inject({}, function(hash, pair) {
			if ((pair = pair.split('='))[0]) {
				var key = decodeURIComponent(pair.shift()),
				value = pair.length > 1 ? pair.join('=') : pair[0];

				if (value != undefined)
					value = decodeURIComponent(value);

				if (key in hash) {
					if (!Object.isArray(hash[key]))
						hash[key] = [hash[key]];
					hash[key].push(value);
				}
				else
					hash[key] = value;
			}
			return hash;
		});
	}

	function toArray() {
		return this.split('');
	}

	function succ() {
		return this.slice(0, this.length - 1) +
		String.fromCharCode(this.charCodeAt(this.length - 1) + 1);
	}

	function times(count) {
		return count < 1 ? '' : new Array(count + 1).join(this);
	}

	function camelize() {
		return this.replace(/-+(.)?/g, function(match, chr) {
			return chr ? chr.toUpperCase() : '';
		});
	}

	function capitalize() {
		return this.charAt(0).toUpperCase() + this.substring(1).toLowerCase();
	}

	function underscore() {
		return this.replace(/::/g, '/')
		.replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
		.replace(/([a-z\d])([A-Z])/g, '$1_$2')
		.replace(/-/g, '_')
		.toLowerCase();
	}

	function dasherize() {
		return this.replace(/_/g, '-');
	}

	function inspect(useDoubleQuotes) {
		var escapedString = this.replace(/[\x00-\x1f\\]/g, function(character) {
			if (character in String.specialChar) {
				return String.specialChar[character];
			}
			return '\\u00' + character.charCodeAt().toPaddedString(2, 16);
		});
		if (useDoubleQuotes)
			return '"' + escapedString.replace(/"/g, '\\"') + '"';
		return "'" + escapedString.replace(/'/g, '\\\'') + "'";
	}

	function unfilterJSON(filter) {
		return this.replace(filter || Protege.JSONFilter, '$1');
	}

	function isJSON() {
		var str = this;
		if (str.blank())
			return false;
		str = str.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@');
		str = str.replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']');
		str = str.replace(/(?:^|:|,)(?:\s*\[)+/g, '');
		return (/^[\],:{}\s]*$/).test(str);
	}

	function evalJSON(sanitize) {
		var json = this.unfilterJSON(),
		cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
		if (cx.test(json)) {
			json = json.replace(cx, function(a) {
				return '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
			});
		}
		try {
			if (!sanitize || json.isJSON())
				return eval('(' + json + ')');
		} catch (e) {
		}
		throw new SyntaxError('Badly formed JSON string: ' + this.inspect());
	}

	function parseJSON() {
		var json = this.unfilterJSON();
		return JSON.parse(json);
	}

	function include(pattern) {
		return this.indexOf(pattern) > -1;
	}

	function startsWith(pattern) {
		return this.lastIndexOf(pattern, 0) === 0;
	}

	function endsWith(pattern) {
		var d = this.length - pattern.length;
		return d >= 0 && this.indexOf(pattern, d) === d;
	}

	function empty() {
		return this == '';
	}

	function blank() {
		return /^\s*$/.test(this);
	}

	function interpolate(object, pattern) {
		return new Template(this, pattern).evaluate(object);
	}

	function inArray(array, start){
		start = Object.isUndefined(start) ? 0 : start;
		if(!Object.isArray(array)){
			return -1;
		}
		return jQuery.inArray(this.toString(), array, start);
	}

	function base64Encode() {
		if (Object.isString(this)) {
			return Base64.encode(this);
		}
		return false;
	}

	function base64Decode() {
		if (Object.isBase64Encoded(this)) {
			return Base64.decode(this);
		}
		return this.toString();
	}

	function trim(){
		return $.trim(this);
	}

	return {
		gsub: gsub,
		sub: sub,
		scan: scan,
		truncate: truncate,
		strip: String.prototype.trim || strip,
		stripTags: stripTags,
		stripScripts: stripScripts,
		extractScripts: extractScripts,
		evalScripts: evalScripts,
		escapeHTML: escapeHTML,
		unescapeHTML: unescapeHTML,
		toQueryParams: toQueryParams,
		parseQuery: toQueryParams,
		toArray: toArray,
		succ: succ,
		times: times,
		camelize: camelize,
		capitalize: capitalize,
		underscore: underscore,
		dasherize: dasherize,
		inspect: inspect,
		unfilterJSON: unfilterJSON,
		isJSON: isJSON,
		evalJSON: NATIVE_JSON_PARSE_SUPPORT ? parseJSON : evalJSON,
		include: include,
		startsWith: startsWith,
		endsWith: endsWith,
		empty: empty,
		blank: blank,
		interpolate: interpolate,
		inArray:inArray,
		base64_encode: base64Encode,
		base64_decode: base64Decode,
		trim:trim
	};
})());

var Template = Class.create({
	initialize: function(template, pattern) {
		this.template = template.toString();
		this.pattern = pattern || Template.Pattern;
	},

	evaluate: function(object) {
		if (object && Object.isFunction(object.toTemplateReplacements))
			object = object.toTemplateReplacements();

		return this.template.gsub(this.pattern, function(match) {
			if (object == null)
				return (match[1] + '');

			var before = match[1] || '';
			if (before == '\\')
				return match[2];

			var ctx = object, expr = match[3],
			pattern = /^([^.[]+|\[((?:.*?[^\\])?)\])(\.|\[|$)/;

			match = pattern.exec(expr);
			if (match == null)
				return before;

			while (match != null) {
				var comp = match[1].startsWith('[') ? match[2].replace(/\\\\]/g, ']') : match[1];
				ctx = ctx[comp];
				if (null == ctx || '' == match[3])
					break;
				expr = expr.substring('[' == match[3] ? match[1].length : match[0].length);
				match = pattern.exec(expr);
			}

			return before + String.interpret(ctx);
		});
	}
});

Object.extend(Date.prototype, (function() {

	function getDateString(str){

		if(typeof str == "string"){

			var month = this.getFullMonth(),
				day = this.getDate(),
				year = this.getFullYear()+'',
				tags = ['%F', '%M', '%m','%y','%Y','%d','%D','%l','%j','%S'];

			for(i=0;i<tags.length;i++){

				switch(tags[i]){
					case '%F':
						str = str.gsub('%F', month);
						break;

					case '%M':
						str = str.gsub('%M', month.substr(0,3));
						break;

					case '%m':
						str = str.gsub('%m', this.getMonth()+1);
						break;

					case '%y':
						str = str.gsub('%y', year.substr(2,4));
						break;

					case '%Y':
						str = str.gsub('%Y', year);
						break;

					case '%d':
						str = str.gsub('%d', (day < 10 ? '0'+day : day+''));
						break;

					case '%D':
						str = str.gsub('%D', this.getWeekDay().substr(0,3));
						break;

					case '%l':
						str = str.gsub('%l', this.getWeekDay());
						break;

					case '%j':
						str = str.gsub('%j', day);
						break;

					case '%S':
						str = str.gsub('%S', this.getDateSuffix());
						break;
				}
			}
		}
		return str;
	}

	function getFullMonth(){
		var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
		return months[this.getMonth()];
	}

	function getWeekDay(){
		var days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
		return days[this.getDay()];
	}

	function getDateSuffix(){
		var day = this.getDate()+"",suffix;
		if(parseInt(day.slice(-1)) < 4 && day.slice(0, -1) != '1'){
			switch(day.slice(-1)){
				case '0':
					suffix="th";
					break;
				case '1':
					suffix="st";
					break;
				case '2':
					suffix="nd";
					break;
				case '3':
					suffix="rd";
					break;
			}
		} else {
			suffix="th";
		}
		return suffix;
	}

	return {
		getDateString:getDateString,
		getFullMonth:getFullMonth,
		getWeekDay:getWeekDay,
		getDateSuffix:getDateSuffix
	}

})());

Template.Pattern = /(^|.|\r|\n)(#\{(.*?)\})/;

var $break = {};

var Enumerable = (function() {
	function each(iterator, context) {
		var index = 0;
		try {
			this._each(function(value) {
				iterator.call(context, value, index++);
			});
		} catch (e) {
			if (e != $break)
				throw e;
		}
		return this;
	}

	function eachSlice(number, iterator, context) {
		var index = -number, slices = [], array = this.toArray();
		if (number < 1)
			return array;
		while ((index += number) < array.length)
			slices.push(array.slice(index, index + number));
		return slices.collect(iterator, context);
	}

	function all(iterator, context) {
		iterator = iterator || Protege.K;
		var result = true;
		this.each(function(value, index) {
			result = result && !!iterator.call(context, value, index);
			if (!result)
				throw $break;
		});
		return result;
	}

	function any(iterator, context) {
		iterator = iterator || Protege.K;
		var result = false;
		this.each(function(value, index) {
			if (result = !!iterator.call(context, value, index))
				throw $break;
		});
		return result;
	}

	function collect(iterator, context) {
		iterator = iterator || Protege.K;
		var results = [];
		this.each(function(value, index) {
			results.push(iterator.call(context, value, index));
		});
		return results;
	}

	function detect(iterator, context) {
		var result;
		this.each(function(value, index) {
			if (iterator.call(context, value, index)) {
				result = value;
				throw $break;
			}
		});
		return result;
	}

	function findAll(iterator, context) {
		var results = [];
		this.each(function(value, index) {
			if (iterator.call(context, value, index))
				results.push(value);
		});
		return results;
	}

	function grep(filter, iterator, context) {
		iterator = iterator || Protege.K;
		var results = [];

		if (Object.isString(filter))
			filter = new RegExp(RegExp.escape(filter));

		this.each(function(value, index) {
			if (filter.match(value))
				results.push(iterator.call(context, value, index));
		});
		return results;
	}

	function include(object) {
		if (Object.isFunction(this.indexOf))
			if (this.indexOf(object) != -1)
				return true;

		var found = false;
		this.each(function(value) {
			if (value == object) {
				found = true;
				throw $break;
			}
		});
		return found;
	}

	function inGroupsOf(number, fillWith) {
		fillWith = Object.isUndefined(fillWith) ? null : fillWith;
		return this.eachSlice(number, function(slice) {
			while (slice.length < number)
				slice.push(fillWith);
			return slice;
		});
	}

	function inject(memo, iterator, context) {
		this.each(function(value, index) {
			memo = iterator.call(context, memo, value, index);
		});
		return memo;
	}

	function invoke(method) {
		var args = $A(arguments).slice(1);
		return this.map(function(value) {
			return value[method].apply(value, args);
		});
	}

	function max(iterator, context) {
		iterator = iterator || Protege.K;
		var result;
		this.each(function(value, index) {
			value = iterator.call(context, value, index);
			if (result == null || value >= result)
				result = value;
		});
		return result;
	}

	function min(iterator, context) {
		iterator = iterator || Protege.K;
		var result;
		this.each(function(value, index) {
			value = iterator.call(context, value, index);
			if (result == null || value < result)
				result = value;
		});
		return result;
	}

	function partition(iterator, context) {
		iterator = iterator || Protege.K;
		var trues = [], falses = [];
		this.each(function(value, index) {
			(iterator.call(context, value, index) ?
			trues : falses).push(value);
		});
		return [trues, falses];
	}

	function pluck(property) {
		var results = [];
		this.each(function(value) {
			results.push(value[property]);
		});
		return results;
	}

	function reject(iterator, context) {
		var results = [];
		this.each(function(value, index) {
			if (!iterator.call(context, value, index))
				results.push(value);
		});
		return results;
	}

	function sortBy(iterator, context) {
		return this.map(function(value, index) {
			return {
				value: value,
				criteria: iterator.call(context, value, index)
			};
		}).sort(function(left, right) {
			var a = left.criteria, b = right.criteria;
			return a < b ? -1 : a > b ? 1 : 0;
		}).pluck('value');
	}

	function toArray() {
		return this.map();
	}

	function zip() {
		var iterator = Protege.K, args = $A(arguments);
		if (Object.isFunction(args.last()))
			iterator = args.pop();

		var collections = [this].concat(args).map($A);
		return this.map(function(value, index) {
			return iterator(collections.pluck(index));
		});
	}

	function size() {
		return this.toArray().length;
	}

	function inspect() {
		return '#<Enumerable:' + this.toArray().inspect() + '>';
	}

	return {
		each: each,
		eachSlice: eachSlice,
		all: all,
		every: all,
		any: any,
		some: any,
		collect: collect,
		map: collect,
		detect: detect,
		findAll: findAll,
		select: findAll,
		filter: findAll,
		grep: grep,
		include: include,
		member: include,
		inGroupsOf: inGroupsOf,
		inject: inject,
		invoke: invoke,
		max: max,
		min: min,
		partition: partition,
		pluck: pluck,
		reject: reject,
		sortBy: sortBy,
		toArray: toArray,
		entries: toArray,
		zip: zip,
		size: size,
		inspect: inspect,
		find: detect
	};
})();

function $A(iterable) {
	if (!iterable)
		return [];
	if ('toArray' in Object(iterable))
		return iterable.toArray();
	var length = iterable.length || 0, results = new Array(length);
	while (length--)
		results[length] = iterable[length];
	return results;
}


function $w(string) {
	if (!Object.isString(string))
		return [];
	string = string.strip();
	return string ? string.split(/\s+/) : [];
}

Array.from = $A;


(function() {
	var arrayProto = Array.prototype,
	slice = arrayProto.slice,
	_each = arrayProto.forEach; // use native browser JS 1.6 implementation if available

	function each(iterator, context) {
		for (var i = 0, length = this.length >>> 0; i < length; i++) {
			if (i in this)
				iterator.call(context, this[i], i, this);
		}
	}
	if (!_each)
		_each = each;

	function clear() {
		this.length = 0;
		return this;
	}

	function first() {
		return this[0];
	}

	function last() {
		return this[this.length - 1];
	}

	function compact() {
		return this.select(function(value) {
			return value != null;
		});
	}

	function flatten() {
		return this.inject([], function(array, value) {
			if (Object.isArray(value))
				return array.concat(value.flatten());
			array.push(value);
			return array;
		});
	}

	function without() {
		var values = slice.call(arguments, 0);
		return this.select(function(value) {
			return !values.include(value);
		});
	}

	function reverse(inline) {
		return (inline === false ? this.toArray() : this)._reverse();
	}

	function uniq(sorted) {
		return this.inject([], function(array, value, index) {
			if (0 == index || (sorted ? array.last() != value : !array.include(value)))
				array.push(value);
			return array;
		});
	}

	function intersect(array) {
		return this.uniq().findAll(function(item) {
			return array.detect(function(value) {
				return item === value
			});
		});
	}


	function clone() {
		return slice.call(this, 0);
	}

	function size() {
		return this.length;
	}

	function inspect() {
		return '[' + this.map(Object.inspect).join(', ') + ']';
	}

	function indexOf(item, i) {
		i || (i = 0);
		var length = this.length;
		if (i < 0)
			i = length + i;
		for (; i < length; i++)
			if (this[i] === item)
				return i;
		return -1;
	}

	function lastIndexOf(item, i) {
		i = isNaN(i) ? this.length : (i < 0 ? this.length + i : i) + 1;
		var n = this.slice(0, i).reverse().indexOf(item);
		return (n < 0) ? n : i - n - 1;
	}

	function concat() {
		var array = slice.call(this, 0), item;
		for (var i = 0, length = arguments.length; i < length; i++) {
			item = arguments[i];
			if (Object.isArray(item) && !('callee' in item)) {
				for (var j = 0, arrayLength = item.length; j < arrayLength; j++)
					array.push(item[j]);
			} else {
				array.push(item);
			}
		}
		return array;
	}

	function hasVal(){
		var i,s=arguments[0],r;
		if(typeof this.indexOf == 'function'){
			i = this.indexOf(s);
		} else {
			i = -1;
			this.each(function(a, n){
				if(a == s){
					i = n;
				}
			});
		}
		return (i >= 0);
	}

	Object.extend(arrayProto, Enumerable);

	if (!arrayProto._reverse)
		arrayProto._reverse = arrayProto.reverse;

	Object.extend(arrayProto, {
		_each: _each,
		clear: clear,
		first: first,
		last: last,
		compact: compact,
		flatten: flatten,
		without: without,
		reverse: reverse,
		uniq: uniq,
		intersect: intersect,
		clone: clone,
		toArray: clone,
		hasVal: hasVal,
		size: size,
		inspect: inspect
	});

	var CONCAT_ARGUMENTS_BUGGY = (function() {
		return [].concat(arguments)[0][0] !== 1;
	})(1, 2)

	if (CONCAT_ARGUMENTS_BUGGY)
		arrayProto.concat = concat;

	if (!arrayProto.indexOf)
		arrayProto.indexOf = indexOf;
	if (!arrayProto.lastIndexOf)
		arrayProto.lastIndexOf = lastIndexOf;
})();

function $H(object) {
	return new Hash(object);
}

var Hash = Class.create(Enumerable, (function() {
	function initialize(object) {
		this._object = Object.isHash(object) ? object.toObject() : Object.clone(object);
	}


	function _each(iterator) {
		for (var key in this._object) {
			var value = this._object[key], pair = [key, value];
			pair.key = key;
			pair.value = value;
			iterator(pair);
		}
	}

	function set(key, value) {
		return this._object[key] = value;
	}

	function get(key) {
		if (this._object[key] !== Object.prototype[key])
			return this._object[key];
	}

	function unset(key) {
		var value = this._object[key];
		delete this._object[key];
		return value;
	}

	function toObject() {
		return Object.clone(this._object);
	}



	function keys() {
		return this.pluck('key');
	}

	function values() {
		return this.pluck('value');
	}

	function index(value) {
		var match = this.detect(function(pair) {
			return pair.value === value;
		});
		return match && match.key;
	}

	function merge(object) {
		return this.clone().update(object);
	}

	function update(object) {
		return new Hash(object).inject(this, function(result, pair) {
			result.set(pair.key, pair.value);
			return result;
		});
	}

	function toQueryPair(key, value) {
		if (Object.isUndefined(value))
			return key;
		return key + '=' + encodeURIComponent(String.interpret(value));
	}

	function toQueryString() {
		return this.inject([], function(results, pair) {
			var key = encodeURIComponent(pair.key), values = pair.value;

			if (values && typeof values == 'object') {
				if (Object.isArray(values)) {
					var queryValues = [];
					for (var i = 0, len = values.length, value; i < len; i++) {
						value = values[i];
						queryValues.push(toQueryPair(key, value));
					}
					return results.concat(queryValues);
				}
			} else
				results.push(toQueryPair(key, values));
			return results;
		}).join('&');
	}

	function inspect() {
		return '#<Hash:{' + this.map(function(pair) {
			return pair.map(Object.inspect).join(': ');
		}).join(', ') + '}>';
	}

	function clone() {
		return new Hash(this);
	}

	return {
		initialize: initialize,
		_each: _each,
		set: set,
		get: get,
		unset: unset,
		toObject: toObject,
		toTemplateReplacements: toObject,
		keys: keys,
		values: values,
		index: index,
		merge: merge,
		update: update,
		toQueryString: toQueryString,
		inspect: inspect,
		toJSON: toObject,
		clone: clone
	};
})());

Hash.from = $H;

Object.extend(Number.prototype, (function() {
  function toColorPart() {
    return this.toPaddedString(2, 16);
  }

  function succ() {
    return this + 1;
  }

  function times(iterator, context) {
    $R(0, this, true).each(iterator, context);
    return this;
  }

  function toPaddedString(length, radix) {
    var string = this.toString(radix || 10);
    return '0'.times(length - string.length) + string;
  }

  function abs() {
    return Math.abs(this);
  }

  function round() {
    return Math.round(this);
  }

  function ceil() {
    return Math.ceil(this);
  }

  function floor() {
    return Math.floor(this);
  }

  return {
    toColorPart:    toColorPart,
    succ:           succ,
    times:          times,
    toPaddedString: toPaddedString,
    abs:            abs,
    round:          round,
    ceil:           ceil,
    floor:          floor
  };
})());

function $R(start, end, exclusive) {
  return new ObjectRange(start, end, exclusive);
}

var ObjectRange = Class.create(Enumerable, (function() {
  function initialize(start, end, exclusive) {
    this.start = start;
    this.end = end;
    this.exclusive = exclusive;
  }

  function _each(iterator) {
    var value = this.start;
    while (this.include(value)) {
      iterator(value);
      value = value.succ();
    }
  }

  function include(value) {
    if (value < this.start)
      return false;
    if (this.exclusive)
      return value < this.end;
    return value <= this.end;
  }

  return {
    initialize: initialize,
    _each:      _each,
    include:    include
  };
})());

var Base64 = {

	// private property
	_keyStr: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",

	// public method for encoding
	encode: function(input) {
		var output = "";
		var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
		var i = 0;

		input = Base64._utf8_encode(input);

		while (i < input.length) {

			chr1 = input.charCodeAt(i++);
			chr2 = input.charCodeAt(i++);
			chr3 = input.charCodeAt(i++);

			enc1 = chr1 >> 2;
			enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
			enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
			enc4 = chr3 & 63;

			if (isNaN(chr2)) {
				enc3 = enc4 = 64;
			} else if (isNaN(chr3)) {
				enc4 = 64;
			}

			output = output +
			this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
			this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);
		}
		return output;
	},

	// public method for decoding
	decode: function(input) {
		var output = "";
		var chr1, chr2, chr3;
		var enc1, enc2, enc3, enc4;
		var i = 0;

		input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

		while (i < input.length) {

			enc1 = this._keyStr.indexOf(input.charAt(i++));
			enc2 = this._keyStr.indexOf(input.charAt(i++));
			enc3 = this._keyStr.indexOf(input.charAt(i++));
			enc4 = this._keyStr.indexOf(input.charAt(i++));

			chr1 = (enc1 << 2) | (enc2 >> 4);
			chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
			chr3 = ((enc3 & 3) << 6) | enc4;

			output = output + String.fromCharCode(chr1);

			if (enc3 != 64) {
				output = output + String.fromCharCode(chr2);
			}
			if (enc4 != 64) {
				output = output + String.fromCharCode(chr3);
			}
		}
		output = Base64._utf8_decode(output);
		return output;
	},

	// private method for UTF-8 encoding
	_utf8_encode: function(string) {
		string = string.replace(/\r\n/g, "\n");
		var utftext = "";

		for (var n = 0; n < string.length; n++) {

			var c = string.charCodeAt(n);

			if (c < 128) {
				utftext += String.fromCharCode(c);
			}
			else if ((c > 127) && (c < 2048)) {
				utftext += String.fromCharCode((c >> 6) | 192);
				utftext += String.fromCharCode((c & 63) | 128);
			}
			else {
				utftext += String.fromCharCode((c >> 12) | 224);
				utftext += String.fromCharCode(((c >> 6) & 63) | 128);
				utftext += String.fromCharCode((c & 63) | 128);
			}
		}
		return utftext;
	},

	// private method for UTF-8 decoding
	_utf8_decode: function(utftext) {
		var string = "";
		var i = 0;
		var c = c1 = c2 = 0;

		while (i < utftext.length) {

			c = utftext.charCodeAt(i);

			if (c < 128) {
				string += String.fromCharCode(c);
				i++;
			}
			else if ((c > 191) && (c < 224)) {
				c2 = utftext.charCodeAt(i + 1);
				string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
				i += 2;
			}
			else {
				c2 = utftext.charCodeAt(i + 1);
				c3 = utftext.charCodeAt(i + 2);
				string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
				i += 3;
			}
		}
		return string;
	}
};

function $(a, b){
	if (arguments.length > 1 && typeof b == 'object') {
		return jQuery(a, b);
	}
	if(document.getElementById(a) != null){
		return $P(a);
	} else {
		return jQuery(a);
	}
}

function $P(element) {

	if(!Object.isUndefined(element)){
		if(!Object.isUndefined(element[0])){
			if (Object.isElement(element[0])){
				element = element[0];
			}
		}
		if (Object.isString(element)){
			element = document.getElementById(element);
		}
		return Element.extend(element);
	}
}

Object.extend($, jQuery);

if (Protege.BrowserFeatures.XPath) {
  document._getElementsByXPath = function(expression, parentElement) {
    var results = [];
    var query = document.evaluate(expression, $P(parentElement) || document,
      null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    for (var i = 0, length = query.snapshotLength; i < length; i++)
      results.push(Element.extend(query.snapshotItem(i)));
    return results;
  };
}

/*--------------------------------------------------------------------------*/

if (!Node) var Node = { };

if (!Node.ELEMENT_NODE) {
  Object.extend(Node, {
    ELEMENT_NODE: 1,
    ATTRIBUTE_NODE: 2,
    TEXT_NODE: 3,
    CDATA_SECTION_NODE: 4,
    ENTITY_REFERENCE_NODE: 5,
    ENTITY_NODE: 6,
    PROCESSING_INSTRUCTION_NODE: 7,
    COMMENT_NODE: 8,
    DOCUMENT_NODE: 9,
    DOCUMENT_TYPE_NODE: 10,
    DOCUMENT_FRAGMENT_NODE: 11,
    NOTATION_NODE: 12
  });
}

(function(global) {
  function shouldUseCache(tagName, attributes) {
    if (tagName === 'select') return false;
    if ('type' in attributes) return false;
    return true;
  }

  var HAS_EXTENDED_CREATE_ELEMENT_SYNTAX = (function(){
    try {
      var el = document.createElement('<input name="x">');
      return el.tagName.toLowerCase() === 'input' && el.name === 'x';
    }
    catch(err) {
      return false;
    }
  })();


  var element = global.Element;

  global.Element = function(tagName, attributes) {
    attributes = attributes || { };
    tagName = tagName.toLowerCase();
    var cache = Element.cache;

    if (HAS_EXTENDED_CREATE_ELEMENT_SYNTAX && attributes.name) {
      tagName = '<' + tagName + ' name="' + attributes.name + '">';
      delete attributes.name;
      return Element.writeAttribute(document.createElement(tagName), attributes);
    }

    if (!cache[tagName]) cache[tagName] = Element.extend(document.createElement(tagName));

    var node = shouldUseCache(tagName, attributes) ?
     cache[tagName].cloneNode(false) : document.createElement(tagName);

    return Element.writeAttribute(node, attributes);
  };

  Object.extend(global.Element, element || { });
  if (element) global.Element.prototype = element.prototype;

})(this);

Element.idCounter = 1;
Element.cache = { };

Element._purgeElement = function(element) {
  var uid = element._prototypeUID;
  if (uid) {
    Element.stopObserving(element);
    element._prototypeUID = void 0;
    delete Element.Storage[uid];
  }
}

Element.Methods = {

	remove: function(element) {
		element = $P(element);
		if(element != null){
			if (element.parentNode != null) {
				element.parentNode.removeChild(element);
			}
		}
		return element;
	},

	select: function(element){
	    element = $P(element);
	    var expressions = Array.prototype.slice.call(arguments, 1).join(', ');
	    return Protege.Selector.select(expressions, element);
	},

	update: function(element, content){
		if($P($(element)) === null){
			content = element;
			element = $(this);
		} else {
			element = $(element);
		}
		element.empty();
		element.insert(content);
		return element;
	},

	identify: function(element) {
		element = Object.isUndefined(element) ? this : $(element);
		if(!Object.isElement(element) && element.length > 0){
			var ids = [];
			element.each(function(){
				var id = $(this).attr('id');
				if(id){
					ids.push(id);
				} else {
					do { id = 'anonymous_element_' + Element.idCounter++ } while ($P(id));
						$(this).attr('id', id);
					ids.push(id);
				}
			});

			ids = ids.length === 1 ? ids[0] : ids;
			return ids;
		}
		return null;
	},

	readAttribute: function(element, name) {
		$(element).attr(name);
		return element;
	},

	writeAttribute: function(element, name, value){
		$(element).attr(name, value);
		return element;
	},

	disableSelection: function(el){
		var elem = Object.isUndefined(el) ? $(this) : $($P(el));

		if(Protege.Browser.WebKit){
			elem.css({"-webkit-user-select":"none"});
		} else if(Protege.Browser.Gecko){
			elem.css({"-moz-user-select":"none"});
		} else if(Protege.Browser.IE){
			elem.css({"-ms-user-select":"none"});
		} else if(Protege.Browser.Opera){
			elem.css({"-o-user-select":"none"});
		}
		elem.css({"cursor":"default"});
		elem.css({"user-select":"none"});

		elem = $P(elem);
		if(!Object.isUndefined(elem.onselectstart)){
			elem.onselectstart=function(){return false}
		} else if(!Object.isUndefined(elem.onselect)){
			elem.onselect=function(){return false}
		}
	},

    /**
     * @deprecated Rather use jQuery equavalent function in the first place...
     * @param element
     * @param insertions
     * @returns {*}
     */
	insert: function(element, insertions) {
		if(!Object.isElement($P(element))){
			insertions = element;
			element = $(this);
		} else {
			element = $(element);
		}
		if (Object.isString(insertions) || Object.isNumber(insertions) || Object.isElement(insertions) || (insertions && (insertions.toElement || insertions.toHTML)))
			 insertions = {bottom:insertions};
		for (var position in insertions) {
			switch(position){

				case "before":
					element.before(insertions[position]);
					break;

				case "after":
					element.after(insertions[position]);
					break;

				case "top":
					element.prepend(insertions[position]);
					break;

				case "bottom":
					element.append(insertions[position]);
					break;
			}
		}
		return element;
	}
};

Element.Methods.Simulated = {};

Element.Methods.ByTag = {};

Object.extend(Element, Element.Methods);

jQuery.fn.extend({
// 	disableSelection:Element.Methods.disableSelection,
	update:Element.Methods.update,
	insert:Element.Methods.insert,
	identify:Element.Methods.identify,
	cssInt: function(p){
		var r,s=$(this);
		r = parseInt(s.css(p));
		if(s.size() > 1){
			r = [];
			s.each(function(i){
				r.push(parseInt($(s[i]).css(p)));
			});
		}
		return r;
	}
});

(function(div) {

	if (!Protege.BrowserFeatures.ElementExtensions && div['__proto__']) {
		window.HTMLElement = {};
		window.HTMLElement.prototype = div['__proto__'];
		Protege.BrowserFeatures.ElementExtensions = true;
	}
	div = null;

})(document.createElement('div'));

Element.extend = (function() {

	function checkDeficiency(tagName) {
		if (typeof window.Element != 'undefined') {
			var proto = window.Element.prototype;
			if (proto) {
				var id = '_' + (Math.random() + '').slice(2),
				el = document.createElement(tagName);
				proto[id] = 'x';
				var isBuggy = (el[id] !== 'x');
				delete proto[id];
				el = null;
				return isBuggy;
			}
		}
		return false;
	}

	function extendElementWith(element, methods) {
		for (var property in methods) {
			var value = methods[property];
			if (Object.isFunction(value) && !(property in element))
				element[property] = value.methodize();
		}
	}

	var HTMLOBJECTELEMENT_PROTOTYPE_BUGGY = checkDeficiency('object');

	if (Protege.BrowserFeatures.SpecificElementExtensions) {
		if (HTMLOBJECTELEMENT_PROTOTYPE_BUGGY) {
			return function(element) {
				if (element && typeof element._extendedByProtege == 'undefined') {
					var t = element.tagName;
					if (t && (/^(?:object|applet|embed)$/i.test(t))) {
						extendElementWith(element, Element.Methods);
						extendElementWith(element, Element.Methods.Simulated);
						extendElementWith(element, Element.Methods.ByTag[t.toUpperCase()]);
					}
				}
				return element;
			}
		}
		return Protege.K;
	}

	var Methods = {}, ByTag = Element.Methods.ByTag;

	var extend = Object.extend(function(element) {
		if (!element || typeof element._extendedByProtege != 'undefined' ||
		element.nodeType != 1 || element == window)
			return element;

		var methods = Object.clone(Methods),
		tagName = element.tagName.toUpperCase();

		if (ByTag[tagName])
			Object.extend(methods, ByTag[tagName]);

		extendElementWith(element, methods);

		element._extendedByProtege = Protege.emptyFunction;
		return element;

	},{
		refresh: function() {
			if (!Protege.BrowserFeatures.ElementExtensions) {
				Object.extend(Methods, Element.Methods);
				Object.extend(Methods, Element.Methods.Simulated);
			}
		}
	});

	extend.refresh();
	return extend;
})();

Element.addMethods = function(methods) {
	var F = Protege.BrowserFeatures, T = Element.Methods.ByTag;

	if (!methods) {
		Object.extend(Form, Form.Methods);
		Object.extend(Form.Element, Form.Element.Methods);
		Object.extend(Element.Methods.ByTag, {
			"FORM": Object.clone(Form.Methods),
			"INPUT": Object.clone(Form.Element.Methods),
			"SELECT": Object.clone(Form.Element.Methods),
			"TEXTAREA": Object.clone(Form.Element.Methods),
			"BUTTON": Object.clone(Form.Element.Methods)
		});
	}

	if (arguments.length == 2) {
		var tagName = methods;
		methods = arguments[1];
	}

	if (!tagName)
		Object.extend(Element.Methods, methods || {});
	else {
		if (Object.isArray(tagName))
			tagName.each(extend);
		else
			extend(tagName);
	}

	function extend(tagName) {
		tagName = tagName.toUpperCase();
		if (!Element.Methods.ByTag[tagName])
			Element.Methods.ByTag[tagName] = {};
		Object.extend(Element.Methods.ByTag[tagName], methods);
	}

	function copy(methods, destination, onlyIfAbsent) {
		onlyIfAbsent = onlyIfAbsent || false;
		for (var property in methods) {
			var value = methods[property];
			if (!Object.isFunction(value))
				continue;
			if (!onlyIfAbsent || !(property in destination))
				destination[property] = value.methodize();
		}
	}

	function findDOMClass(tagName) {
		var klass;
		var trans = {
			"OPTGROUP": "OptGroup","TEXTAREA": "TextArea","P": "Paragraph",
			"FIELDSET": "FieldSet","UL": "UList","OL": "OList","DL": "DList",
			"DIR": "Directory","H1": "Heading","H2": "Heading","H3": "Heading",
			"H4": "Heading","H5": "Heading","H6": "Heading","Q": "Quote",
			"INS": "Mod","DEL": "Mod","A": "Anchor","IMG": "Image","CAPTION":
			"TableCaption","COL": "TableCol","COLGROUP": "TableCol","THEAD":
			"TableSection","TFOOT": "TableSection","TBODY": "TableSection","TR":
			"TableRow","TH": "TableCell","TD": "TableCell","FRAMESET":
			"FrameSet","IFRAME": "IFrame"
		};
		if (trans[tagName])
			klass = 'HTML' + trans[tagName] + 'Element';
		if (window[klass])
			return window[klass];
		klass = 'HTML' + tagName + 'Element';
		if (window[klass])
			return window[klass];
		klass = 'HTML' + tagName.capitalize() + 'Element';
		if (window[klass])
			return window[klass];

		var element = document.createElement(tagName),
		proto = element['__proto__'] || element.constructor.prototype;

		element = null;
		return proto;
	}

	var elementPrototype = window.HTMLElement ? HTMLElement.prototype : Element.prototype;

	if (F.ElementExtensions) {
		copy(Element.Methods, elementPrototype);
		copy(Element.Methods.Simulated, elementPrototype, true);
	}

	if (F.SpecificElementExtensions) {
		for (var tag in Element.Methods.ByTag) {
			var klass = findDOMClass(tag);
			if (Object.isUndefined(klass))
				continue;
			copy(T[tag], klass.prototype);
		}
	}

	Object.extend(Element, Element.Methods);
	delete Element.ByTag;

	if (Element.extend.refresh)
		Element.extend.refresh();
	Element.cache = {};
};

window.$$ = function() {
  var expression = $A(arguments).join(', ');
  return Protege.Selector.select(expression, document);
};

Protege.Selector = (function() {

	function select() {
		throw new Error('Method "Protege.Selector.select" must be defined.');
	}

	function match() {
		throw new Error('Method "Protege.Selector.match" must be defined.');
	}

	function find(elements, expression, index) {
		index = index || 0;
		var match = Protege.Selector.match, length = elements.length, matchIndex = 0, i;

		for (i = 0; i < length; i++) {
			if (match(elements[i], expression) && index == matchIndex++) {
				return Element.extend(elements[i]);
			}
		}
	}

	function extendElements(elements) {
		for (var i = 0, length = elements.length; i < length; i++) {
			Element.extend(elements[i]);
		}
		return elements;
	}


	var K = Protege.K;

	return {
		select: select,
		match: match,
		find: find,
		extendElements: (Element.extend === K) ? K : extendElements,
		extendElement: Element.extend
	};
})();

window.Sizzle = jQuery.find;

Protege._original_property = Sizzle;

;
(function(engine) {
	var extendElements = Protege.Selector.extendElements;

	function select(selector, scope) {
		return extendElements(engine(selector, scope || document));
	}

	function match(element, selector) {
		return engine.matches(selector, [element]).length == 1;
	}

	Protege.Selector.engine = engine;
	Protege.Selector.select = select;
	Protege.Selector.match = match;
})(Sizzle);

window.Sizzle = Protege._original_property;
delete Protege._original_property;

(function() {

	var Event = {
		KEY_BACKSPACE: 8,
		KEY_TAB: 9,
		KEY_RETURN: 13,
		KEY_ESC: 27,
		KEY_LEFT: 37,
		KEY_UP: 38,
		KEY_RIGHT: 39,
		KEY_DOWN: 40,
		KEY_DELETE: 46,
		KEY_HOME: 36,
		KEY_END: 35,
		KEY_PAGEUP: 33,
		KEY_PAGEDOWN: 34,
		KEY_INSERT: 45,

		cache: {}
	};

	var docEl = document.documentElement;
	var MOUSEENTER_MOUSELEAVE_EVENTS_SUPPORTED = 'onmouseenter' in docEl
	&& 'onmouseleave' in docEl;



	var isIELegacyEvent = function(event) {
		return false;
	};

	if (window.attachEvent) {
		if (window.addEventListener) {
			isIELegacyEvent = function(event) {
				return !(event instanceof window.Event);
			};
		} else {
			isIELegacyEvent = function(event) {
				return true;
			};
		}
	}

	var _isButton;

	function _isButtonForDOMEvents(event, code) {
		return event.which ? (event.which === code + 1) : (event.button === code);
	}

	var legacyButtonMap = {0: 1,1: 4,2: 2};
	function _isButtonForLegacyEvents(event, code) {
		return event.button === legacyButtonMap[code];
	}

	function _isButtonForWebKit(event, code) {
		switch (code) {
			case 0:
				return event.which == 1 && !event.metaKey;
			case 1:
				return event.which == 2 || (event.which == 1 && event.metaKey);
			case 2:
				return event.which == 3;
			default:
				return false;
		}
	}

	if (window.attachEvent) {
		if (!window.addEventListener) {
			_isButton = _isButtonForLegacyEvents;
		} else {
			_isButton = function(event, code) {
				return isIELegacyEvent(event) ? _isButtonForLegacyEvents(event, code) :
				_isButtonForDOMEvents(event, code);
			}
		}
	} else if (Protege.Browser.WebKit) {
		_isButton = _isButtonForWebKit;
	} else {
		_isButton = _isButtonForDOMEvents;
	}

	function isLeftClick(event) {
		return _isButton(event, 0)
	}

	function isMiddleClick(event) {
		return _isButton(event, 1)
	}

	function isRightClick(event) {
		return _isButton(event, 2)
	}

	function element(event) {
		event = Event.extend(event);

		var node = event.target, type = event.type,
		currentTarget = event.currentTarget;

		if (currentTarget && currentTarget.tagName) {
			if (type === 'load' || type === 'error' ||
			(type === 'click' && currentTarget.tagName.toLowerCase() === 'input'
			&& currentTarget.type === 'radio'))
				node = currentTarget;
		}

		if (node.nodeType == Node.TEXT_NODE)
			node = node.parentNode;

		return Element.extend(node);
	}

	function findElement(event, expression) {
		var element = Event.element(event);

		if (!expression)
			return element;
		while (element) {
			if (Object.isElement(element) && Protege.Selector.match(element, expression)) {
				return Element.extend(element);
			}
			element = element.parentNode;
		}
	}

	function pointer(event) {
		return {x: pointerX(event),y: pointerY(event)};
	}

	function pointerX(event) {
		var docElement = document.documentElement,
		body = document.body || {scrollLeft: 0};

		return event.pageX || (event.clientX +
		(docElement.scrollLeft || body.scrollLeft) -
		(docElement.clientLeft || 0));
	}

	function pointerY(event) {
		var docElement = document.documentElement,
		body = document.body || {scrollTop: 0};

		return event.pageY || (event.clientY +
		(docElement.scrollTop || body.scrollTop) -
		(docElement.clientTop || 0));
	}


	function stop(event) {
		Event.extend(event);
		event.preventDefault();
		event.stopPropagation();

		event.stopped = true;
	}

	function wheel(event) {
		Event.extend(event);
		var delta = 0;
		if (event.wheelDelta) {
			delta = event.wheelDelta / 120;
		} else if (event.detail) {
			delta = -event.detail / 3;
		}
		return Math.round(delta); //Safari Round
	}


	Event.Methods = {
		isLeftClick: isLeftClick,
		isMiddleClick: isMiddleClick,
		isRightClick: isRightClick,

		element: element,
		findElement: findElement,

		pointer: pointer,
		pointerX: pointerX,
		pointerY: pointerY,

		stop: stop,

		wheel: wheel
	};

	var methods = Object.keys(Event.Methods).inject({}, function(m, name) {
		m[name] = Event.Methods[name].methodize();
		return m;
	});

	if (window.attachEvent) {
		function _relatedTarget(event) {
			var element;
			switch (event.type) {
				case 'mouseover':
				case 'mouseenter':
					element = event.fromElement;
					break;
				case 'mouseout':
				case 'mouseleave':
					element = event.toElement;
					break;
				default:
					return null;
			}
			return Element.extend(element);
		}

		var additionalMethods = {
			stopPropagation: function() {
				this.cancelBubble = true
			},
			preventDefault: function() {
				this.returnValue = false
			},
			inspect: function() {
				return '[object Event]'
			}
		};

		Event.extend = function(event, element) {
			if (!event)
				return false;

			if (!isIELegacyEvent(event))
				return event;

			if (event._extendedByProtege)
				return event;
			event._extendedByProtege = Protege.emptyFunction;

			var pointer = Event.pointer(event);

			Object.extend(event, {
				target: event.srcElement || element,
				relatedTarget: _relatedTarget(event),
				pageX: pointer.x,
				pageY: pointer.y
			});

			Object.extend(event, methods);
			Object.extend(event, additionalMethods);

			return event;
		};
	} else {
		Event.extend = Protege.K;
	}

	if (window.addEventListener) {
		Event.prototype = window.Event.prototype || document.createEvent('HTMLEvents').__proto__;
		Object.extend(Event.prototype, methods);
	}

	function _createResponder(element, eventName, handler) {
		var registry = jQuery.data(element, 'prototype_event_registry');

		if (Object.isUndefined(registry)) {
			CACHE.push(element);
			registry = jQuery.data(element, 'prototype_event_registry', $H());
		}

		var respondersForEvent = registry.get(eventName);
		if (Object.isUndefined(respondersForEvent)) {
			respondersForEvent = [];
			registry.set(eventName, respondersForEvent);
		}

		if (respondersForEvent.pluck('handler').include(handler))
			return false;

		var responder;
		if (eventName.include(":")) {
			responder = function(event) {
				if (Object.isUndefined(event.eventName))
					return false;

				if (event.eventName !== eventName)
					return false;

				Event.extend(event, element);
				handler.call(element, event);
			};
		} else {
			if (!MOUSEENTER_MOUSELEAVE_EVENTS_SUPPORTED &&
			(eventName === "mouseenter" || eventName === "mouseleave")) {
				if (eventName === "mouseenter" || eventName === "mouseleave") {
					responder = function(event) {
						Event.extend(event, element);

						var parent = event.relatedTarget;
						while (parent && parent !== element) {
							try {
								parent = parent.parentNode;
							}
							catch (e) {
								parent = element;
							}
						}

						if (parent === element)
							return;

						handler.call(element, event);
					};
				}
			} else {
				responder = function(event) {
					Event.extend(event, element);
					handler.call(element, event);
				};
			}
		}

		responder.handler = handler;
		respondersForEvent.push(responder);
		return responder;
	}

	function _destroyCache() {
		for (var i = 0, length = CACHE.length; i < length; i++) {
			Event.stopObserving(CACHE[i]);
			CACHE[i] = null;
		}
	}

	var CACHE = [];

	if (Protege.Browser.IE)
		window.attachEvent('onunload', _destroyCache);

	if (Protege.Browser.WebKit)
		window.addEventListener('unload', Protege.emptyFunction, false);


	var _getDOMEventName = Protege.K,
	translations = {mouseenter: "mouseover",mouseleave: "mouseout"};

	if (!MOUSEENTER_MOUSELEAVE_EVENTS_SUPPORTED) {
		_getDOMEventName = function(eventName) {
			return (translations[eventName] || eventName);
		};
	}

	function observe(el, evName, hand) {
		var element,eventName,handler;
		if(typeof el === 'string'){
			handler = evName;
			eventName = el;
			element = $P(this[0]);
		} else {
			element = $P(el);
			eventName = evName;
			handler = hand;
		}
		var responder = _createResponder(element, eventName, handler);

		if (!responder)
			return element;

		if (eventName.include(':')) {
			if (element.addEventListener)
				element.addEventListener("dataavailable", responder, false);
			else {
				element.attachEvent("ondataavailable", responder);
				element.attachEvent("onlosecapture", responder);
			}
		} else {
			var actualEventName = _getDOMEventName(eventName);

			if (element.addEventListener)
				element.addEventListener(actualEventName, responder, false);
			else
				element.attachEvent("on" + actualEventName, responder);
		}

		return element;
	}

	function stopObserving(el, evName, hand) {
		var element,eventName,handler;
		if(typeof el === 'string'){
			handler = evName;
			eventName = el;
			element = $P(this[0]);
		} else {
			try{
				element = $P(el)
			} catch(e){
				element = el
			}
			eventName = evName;
			handler = hand;
		}

		var registry = jQuery.data(element, 'prototype_event_registry');
		if (!registry)
			return element;

		if (!eventName) {
			registry.each(function(pair) {
				var eventName = pair.key;
				stopObserving(element, eventName);
			});
			return element;
		}

		var responders = registry.get(eventName);
		if (!responders)
			return element;

		if (!handler) {
			responders.each(function(r) {
				stopObserving(element, eventName, r.handler);
			});
			return element;
		}

		var i = responders.length, responder;
		while (i--) {
			if (responders[i].handler === handler) {
				responder = responders[i];
				break;
			}
		}
		if (!responder)
			return element;

		if (eventName.include(':')) {
			if (element.removeEventListener)
				element.removeEventListener("dataavailable", responder, false);
			else {
				element.detachEvent("ondataavailable", responder);
				element.detachEvent("onlosecapture", responder);
			}
		} else {
			var actualEventName = _getDOMEventName(eventName);
			if (element.removeEventListener)
				element.removeEventListener(actualEventName, responder, false);
			else
				element.detachEvent('on' + actualEventName, responder);
		}

		registry.set(eventName, responders.without(responder));

		return element;
	}

	function fire(el, evName, mem, bubble) {
		var element,eventName,memo;
		if(typeof el === 'string'){
			bubble = mem;
			memo = evName;
			eventName = el;
			element = $P(this);
		} else {
			element = $P(el);
			eventName = evName;
			memo = mem;
		}


        if (Object.isUndefined(bubble))
          bubble = true;

        if (element == document && document.createEvent && !element.dispatchEvent)
          element = document.documentElement;

        var event;
        if (document.createEvent) {
          event = document.createEvent('HTMLEvents');
          event.initEvent('dataavailable', bubble, true);
        } else {
          event = document.createEventObject();
          event.eventType = bubble ? 'ondataavailable' : 'onlosecapture';
        }

        event.eventName = eventName;
        event.memo = memo || { };

        if (document.createEvent)
          element.dispatchEvent(event);
        else
            try {
          element.fireEvent(event.eventType, event);
            } catch (err) {  }

		return Event.extend(event);
	}
//Element.Methods.on
	Event.Handler = Class.create({
		initialize: function(element, eventName, selector, callback) {
			if(typeof element === 'string'){
				this.callback = selector;
				this.selector = eventName;
				this.eventName = element;
				this.element = $P(this[0]);
			} else {
				this.element = $P(element);
				this.eventName = eventName;
				this.selector = selector;
				this.callback = callback;
			}
			this.handler = this.handleEvent.bind(this);
		},

		start: function() {
			Event.observe(this.element, this.eventName, this.handler);
			return this;
		},

		stop: function() {
			Event.stopObserving(this.element, this.eventName, this.handler);
			return this;
		},

		handleEvent: function(event) {
			var element = Event.findElement(event, this.selector);
			if (element)
				this.callback.call(this.element, event, element);
		}
	});

	function on(el, evName, sel, callback) {
		var element,eventName,selector;
		if(typeof el === 'string'){
			callback = sel;
			selector = evName;
			eventName = el;
			element = $P(this[0]);
		} else {
			element = $P(el);
			eventName = evName;
			selector = sel;
		}
		if (Object.isFunction(selector) && Object.isUndefined(callback)) {
			callback = selector, selector = null;
		}

		return new Event.Handler(element, eventName, selector, callback).start();
	}

	Object.extend(Event, Event.Methods);

	Object.extend(Event, {
		fire: fire,
		observe: observe,
		stopObserving: stopObserving,
		on: on
	});

	Element.addMethods({
		fire: fire,
		observe: observe,
		stopObserving: stopObserving,
		on: on
	});

	jQuery.fn.extend({
		fire:fire,
		observe: observe,
		stopObserving: stopObserving,
		_on:on
	});

	Object.extend(document, {
		fire: fire.methodize(),
		observe: observe.methodize(),
		stopObserving: stopObserving.methodize(),
		on: on.methodize(),
		loaded: false
	});

	if (window.Event)
		Object.extend(window.Event, Event);
	else
		window.Event = Event;
})();

(function() {
	/* Support for the DOMContentLoaded event is based on work by Dan Webb,
	 * Matthias Miller, Dean Edwards, John Resig, and Diego Perini.
	 */

	var timer;

	function fireContentLoadedEvent() {
		if (document.loaded)
			return;
		if (timer)
			window.clearTimeout(timer);
		jQuery.extend(window.$, window.jQuery);
		document.loaded = true;
		document.fire('dom:loaded');
	}

	function checkReadyState() {
		if (document.readyState === 'complete') {
			document.stopObserving('readystatechange', checkReadyState);
			fireContentLoadedEvent();
		}
	}

	function pollDoScroll() {
		try {
			document.documentElement.doScroll('left');
		}
		catch (e) {
			timer = pollDoScroll.defer();
			return;
		}
		fireContentLoadedEvent();
	}

	if (document.addEventListener) {
		document.addEventListener('DOMContentLoaded', fireContentLoadedEvent, false);
	} else {
		document.observe('readystatechange', checkReadyState);
		if (window == top)
			timer = pollDoScroll.defer();
	}
	Event.observe(window, 'load', fireContentLoadedEvent);
})();