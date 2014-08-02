// ==ClosureCompiler==
// @output_file_name medea.core-compiled.min.js
// @compilation_level SIMPLE_OPTIMIZATIONS
// @language ECMASCRIPT5
// ==/ClosureCompiler==

/** @license
medea.js - High-performance WebGL 3D Engine
 See https://github.com/acgessler/medea.js

Copyright (c) 2011-2013, Alexander Christoph Gessler
All rights reserved.

Redistribution and use of this software in source and binary forms, 
with or without modification, are permitted provided that the 
following conditions are met:

* Redistributions of source code must retain the above
  copyright notice, this list of conditions and the
  following disclaimer.

* Redistributions in binary form must reproduce the above
  copyright notice, this list of conditions and the
  following disclaimer in the documentation and/or other
  materials provided with the distribution.

* Neither the name of the medea.js project, nor the names of its
  contributors may be used to endorse or promote products
  derived from this software without specific prior
  written permission of the medea.js copyright holder(s).

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS 
"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT 
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT 
OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT 
LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY 
THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT 
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE 
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

*/medea_is_compiled = true;
/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */


/** Defines core functionality for medea, and contains the {{Context}} class in which
 *  all the rendering magic happens. 
 *
 *  medealib globally holds a registry of all loaded medea and 3rdparty modules
 *  and contains some debugging and logging functions.
 *
 *  Functions prefixed with _ are for private use by {{Context}}
 *
 * TODO
 */
medealib = new function() {

	var old_medealib = window.medealib
	,	medealib = this

		// for currently pending modules, a list of observers waiting
		// to be notified when the request succeeds.
	, _waiters = {}

		// for every define()d module, a function to apply to a medea
		// context and a list of dependencies.
	, _stubs = {
		core : [function() {}, []]
	}
		// original module source
	, _sources = {}

		// raw .js files (3rdparty, i.e. not in medea module format)
		// that have been loaded already
	, _scripts_preloaded =  {}
	;


// **************************************************************************
// workaround if Array.forEach not available
// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/array/foreach
if (!Array.prototype.forEach)
{
  Array.prototype.forEach = function(fun /*, thisp */)
  {
	"use strict";

	if (this === void 0 || this === null)
	  throw new TypeError();

	var t = Object(this);
	var len = t.length >>> 0;
	if (typeof fun !== "function")
	  throw new TypeError();

	var thisp = arguments[1];
	for (var i = 0; i < len; i++)
	{
	  if (i in t)
		fun.call(thisp, t[i], i, t);
	}
  };
}
	
// **************************************************************************
// workaround for Array.isArray not available
// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/isArray
if (typeof Array.isArray != 'function') {
  Array.isArray = function (obj) {
	return Object.prototype.toString.call(obj) == '[object Array]';
  };
}


// **************************************************************************
/* Simple JavaScript Inheritance
 * By John Resig http://ejohn.org/
 * MIT Licensed.
 */
// Inspired by base2 and Prototype
  var initializing = false, fnTest = /xyz/.test(function(){xyz;}) ? /\b_super\b/ : /.*/;
  // The base Class implementation (does nothing)
  this.Class = function(){};

  // Create a new Class that inherits from this class
  this.Class.extend = function(prop) {
	var _super = this.prototype;

	// Instantiate a base class (but only create the instance,
	// don't run the init constructor)
	initializing = true;
	var prototype = new this();
	initializing = false;

	// Copy the properties over onto the new prototype
	for (var name in prop) {
	  // Check if we're overwriting an existing function
	  prototype[name] = typeof prop[name] == "function" &&
		typeof _super[name] == "function" && fnTest.test(prop[name]) ?
		(function(name, fn){
		  return function() {
		  	// omitted for performance reasons
			//var tmp = this._super;

			// Add a new ._super() method that is the same method
			// but on the super-class
			this._super = _super[name];

			// The method only need to be bound temporarily, so we
			// remove it when we're done executing
			var ret = fn.apply(this, arguments);

			// omitted for performance reasons
			//this._super = tmp;

			return ret;
		  };
		})(name, prop[name]) :
		prop[name];

		// Don't allow overwriting fields - right now there
		// is no way of keeping fields private (except for
		// wrapping them in a pimpl object) so deriving
		// classes would easily overwrite parent fields.
		console.assert (typeof prop[name] == "function" || _super[name] === undefined,
			"Field does already exist in parent: " + name);
	}

	// The dummy class constructor
	function Class() {
	  // All construction is actually done in the init method
	  if ( !initializing && this.init )
		this.init.apply(this, arguments);
	}

	// Populate our constructed prototype object
	Class.prototype = prototype;

	// Enforce the constructor to be what we expect
	Class.constructor = Class;

	// And make this class extendable
	Class.extend = arguments.callee;

	// always set the _super() attribute to make sure it exists
	// in the object. This is to keep the hidden class (v8) from
	// changing.
	prototype._super = null;

	return Class;
  };

// **************************************************************************
// Cross-browser requestAnimationFrame
// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
// http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
 
// requestAnimationFrame polyfill by Erik Möller. fixes from Paul Irish and Tino Zijdel
 
// MIT license
(function() {

    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];	   
    }
 
    if (!window.requestAnimationFrame) {
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); }, 
              timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
    }
})();

// **************************************************************************
// From http://perfectionkills.com/global-eval-what-are-the-options/

var globalEval = (function() {

  var isIndirectEvalGlobal = (function(original, Object) {
    try {
      // Does `Object` resolve to a local variable, or to a global, built-in `Object`,
      // reference to which we passed as a first argument?
      return (1,eval)('Object') === original;
    }
    catch(err) {
      // if indirect eval errors out (as allowed per ES3), then just bail out with `false`
      return false;
    }
  })(Object, 123);

  if (isIndirectEvalGlobal) {

    // if indirect eval executes code globally, use it
    return function(expression) {
      return (1,eval)(expression);
    };
  }
  else if (typeof window.execScript !== 'undefined') {

    // if `window.execScript exists`, use it
    return function(expression) {
      return window.execScript(expression);
    };
  }

  // otherwise, globalEval is `undefined` since nothing is returned
})();




	medealib.AssertionError = function(what) {medealib.what = what;};
	medealib.FatalError = function(what) {medealib.what = what;};


	// ---------------------------------------------------------------------------
	/** Similar to jQuery's NoConflict() API, restores the previous value of
	 *  window.medealib and returns this medealib instance.
	 *  @return {medealib} previous value of window.medealib
	*/
	// ---------------------------------------------------------------------------
	medealib.NoConflict = function() {
		window.medealib = old_medealib;
		return medealib;
	};


	// ---------------------------------------------------------------------------
	/** {{medealib.NotifyFatal}}
	 *
	 * @param {String} what
	*/
	// ---------------------------------------------------------------------------
	medealib.NotifyFatal = function(what) {
		what = "medealib: " + what;
		medealib.LogDebug(what);
		// hack to disable message boxes when running tests
		if(!window.medealib_jasmine_no_alert) {
			alert(what);
		}
		throw new medealib.FatalError(what);
	};


	// ---------------------------------------------------------------------------
	/** TODO: documentation 
	*/
	// ---------------------------------------------------------------------------
	medealib.DebugAssert = function(what) {
	};


	// ---------------------------------------------------------------------------
	/** TODO: documentation 
	*/
	// ---------------------------------------------------------------------------
	medealib.Log = medealib.LogDebug = function() {};

	// ---------------------------------------------------------------------------
	/** TODO: documentation 
	*/
	// ---------------------------------------------------------------------------
	medealib.LogDebug = function() {};




	// ------------------------------------------------------------------------
	/** TODO: documentation 
	*/
	// ------------------------------------------------------------------------
	medealib.Merge = function(inp,template,out_opt) {
		var out = out_opt || {};
		for(var k in inp) {
			var v = inp[k];
			if (typeof v === 'object' && v.prototype === Object.prototype) {
				out[k] = medealib.Merge(v, template[k] || {});
			}
			else {
				out[k] = v;
			}
		}
		for(var k in template) {
			if (k in out) {
				continue;
			}

			var v = template[k];
			if (typeof v === 'object') {
				out[k] = medealib.Merge(template[k],{});
			}
			else {
				out[k] = v;
			}
		}
		return out;
	};



	// ---------------------------------------------------------------------------
	/** Register a medealib module. 
	 *
	 *  medealib modules are registered/defined globally, but they need to be bound
	 *  to a context using @see
	*/
	// ---------------------------------------------------------------------------
	medealib.define = function(name, deps, init) {
		if(_stubs[name] !== undefined) {
			medealib.DebugAssert('module already present: ' + name);
			return;
		}


		// mark the module as pending
		if(!_waiters[name]) {
			_waiters[name] = [];
		}

		// fetch dependencies
		medealib._RegisterMods(deps, function() {

			var w = _waiters[name];

			_stubs[name] = [init, deps];
			delete _waiters[name];

			if (w) { 
				for(var i = 0; i < w.length; ++i) {
					w[i]();
				}
			}
		});
	};


	// ---------------------------------------------------------------------------
	/** Checks if a module has been registered with _RegisterMods() and been
	 *  fetched successfully.
	 *  
	 *  @param {String} name of the module
	 */
	// ---------------------------------------------------------------------------
	medealib.IsModuleRegistered = function(name) {
		return !!_stubs[name];
	},


	// ---------------------------------------------------------------------------
	/**
	 *
	 *  @private
	 */
	// ---------------------------------------------------------------------------
	medealib._GetModuleInfo = function(name) {
		return _stubs[name];
	},


	// ---------------------------------------------------------------------------
	/** Get the source code for a given module.
	 *
	 *  @param {String} name Module name, i.e. "viewport" or "someMod.js". See
	 *     {medealib._FetchMods()} for more information on module references.
	 *  @return {String} undefined iff the module is not loaded yet
	*/
	// ---------------------------------------------------------------------------
	medealib.GetModSource = function(name) {
		return _sources[n];
	},


	// ---------------------------------------------------------------------------
	/** Register a set of modules with medealib. This does not make them available 
	 *  for direct use, though. To actually call their APIs, apply them to a 
	 *  @see {medealib.Context} using @see {medealib.Context.LoadModules}.
	 *
	 *  This function also fetches all dependencies of the modules requested 
	 *  recursively.
	 *
	 *  @param {String} String or list of strings containing the names of the
	 *    modules to be fetched. There are two kinds of modules:
	 *     a) medea modules, which are referred to with their name suffixes and
	 *        without the file extension and -
	 *     b) JS files from /medealib/3rdparty, which are referred to by their file 
	 *        name, including their file extension, i.e. "someMod.js". 
	 *
	 *  @param {Function} Callback to be invoked once all the modules have 
	 *    been registered. This may happen immediately in case they are all available.
	 *
	 *  @private
	 */
	// ---------------------------------------------------------------------------
	medealib._RegisterMods = function(whom, callback) {
		callback = callback || function() {};
		
		var whom = Array.isArray(whom) ? whom : [whom]
		,	cnt = 0
		,	nodelay = true
		,	countdown_proxy = null
		;

		if(!whom.length) {
			if(callback) {
				callback();
			}
			return;
		}

		if(callback) {
			countdown_proxy = function() {
				if(--cnt === 0) {
					callback();
				};
			};
		}

		for(var i = 0; i < whom.length; ++i) {
			var n = whom[i], init = _stubs[n];

			if(!n || _scripts_preloaded[n] || _waiters[n]) {
				continue;
			}

			// see if the file has already been loaded, in which case `init` should be defined
			if (init === undefined) {
				var is_medealib_mod = !/\.js$/i.test(whom[i]);

				++cnt;
				nodelay = false;

				var b = false;
				if (!(n in _waiters)) {
					_waiters[n] = [];
					b = true;
				}

				if(countdown_proxy) {
					_waiters[n].push(countdown_proxy);
				}

				if(!b) {
					continue;
				}

				(function(n,is_medealib_mod) {
					var filename = medealib.root_url+(is_medealib_mod ? 'medea.' +n + '.js' : '3rdparty/' + n);
					
					medealib._AjaxFetch(filename, function(text, status) {
						if(status !== 200) {
							medealib.DebugAssert('failure loading script ' + n);
							return;
						}
						_sources[n] = text;


						// TODO: which way of evaluating scripts is best for debugging
						var old = window.medealib;
						window.medealib = medealib;

						// Based off http://stackoverflow.com/questions/3488994
						globalEval(text);
						window.medealib = old;

						/*
						var sc = document.createElement( 'script' );
						sc.type = 'text/javascript';

						// make sure to enclose the script source in CDATA blocks
						// to make XHTML parsers happy.
						sc.innerHTML = '//<![CDATA[\n' + text  + '\n//]]>';
						document.getElementsByTagName('head')[0].appendChild(sc);
						*/

						// non medealib modules won't call define, so we need to mimic parts of its behaviour
						// to satisfy all listeners and to keep the file from being loaded twice.
						if(!is_medealib_mod) {
							var w = _waiters[n];
							delete _waiters[n];

							_stubs[n] = null;
							for(var i = 0; i < w.length; ++i) {
								w[i]();
							}
						}
					});
				}(n,is_medealib_mod));
			}
		}

		if(nodelay) {
			callback();
		}
	};


	// ---------------------------------------------------------------------------
	/** Perform XHTTRequest for a given url.
	 *
	 *  @param {String} url Url to GET from
	 *  @param {Function} callback to be invoked once the response is available.
	 *    The callback receives the responseText as first parameter and the
	 *    status field of the XTTPRequest as second parameter.
	 *  @param {bool} [no_client_cache] If set to true, an unique value is appended
	 *    to the URL (as ?nocache=<someToken>) parameter to prevent any kind
	 *    of client-side caching. If this parameter is not specified, it is assumed
	 *    true iff DEBUG is defined.
	 *  @param {bool] [array_buffer] Specifies whether the response is parsed
	 *    into an ArrayBuffer. In this case, the first parameter received by the
	 *    callback is an ArrayBuffer object containing the response.
	*/
	// ---------------------------------------------------------------------------
	medealib._AjaxFetch = function(url, callback, no_client_cache, array_buffer) {

		var ajax;

		// TODO: re-use the XHTTPRequests or now? (i.e. also have a pool
		// for them as we have for Image's). As they are not part of the
		// DOM, constructing XHTTPs seems cheaper. 
  		if (window.XMLHttpRequest) {
	  		ajax = new XMLHttpRequest();
		}
		else {
	  		ajax = new ActiveXObject("Microsoft.XMLHTTP");
		}

		ajax.onreadystatechange = function() {
			if (ajax.readyState === 4) {
				callback(ajax.status === 200 ? (array_buffer ? ajax.response 
					: ajax.responseText) : null, ajax.status);
			}
		}

		if(array_buffer) {
			ajax.responseType = "arraybuffer";
		}

		ajax.open("GET",url + (no_client_cache ?  '?nocache='+(new Date()).getTime() : ''),true);
		ajax.send(null);
	};


	// ------------------------------------------------------------------------
	/** Construct a hybrid getter and setter for an object property.
	 *  
	 *  @param {String} what Name of the object property to be made accessible.
	 *  @return {Function} A closure that, when called with no parameter,
	 *     returns the `name` property on the `this` object, and when called 
	 *     with a parameter, sets this property to the given value.
	*/
	// ------------------------------------------------------------------------
	medealib.Property = function(what) {
		return function(f) {
			if (f === undefined) {
				return this[what];
			}
			this[what] = f;
		};
	};


	// ------------------------------------------------------------------------
	/** Cache result of |closure|
	 */
	medealib.Cached = function(closure) {
		var val = null;
		return function() {
			if (val != null) {
				return val;
			}
			val = closure.apply(this);
			return val;
		};
	};


	// ------------------------------------------------------------------------
	/** @private to build system */
	// ------------------------------------------------------------------------
	medealib._MarkScriptAsLoaded = function(name) {
		_scripts_preloaded[name] = true;
	};



	// global initialization code
	(function() {

		var scripts = document.getElementsByTagName('script');
		medealib.root_url = scripts[scripts.length-1].src.replace(/^(.*[\\\/])?(.*)/,'$1');

		// check if we need the JSON polyfill
		if(typeof JSON !== undefined) {
			medealib._MarkScriptAsLoaded('json2.js');
		}
	}) ();



/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */


// note: medeactx file is compiletime-included by medea.core.js and not used as a module.
// the Context API is always available.


 // ---------------------------------------------------------------------------
/** Constructs a new MedeaContext giving access to the medea API.
 *
 *  @param where <canvas> DOM element to be used to host medea's 3D output.
 *  @param settings Dictionary of initial settings. Currently recognized values include:
 *       - 
 *
 *
 **/
 // ---------------------------------------------------------------------------
medealib.CreateContext = function(where, settings, deps, user_on_ready, user_on_failure) {
	new medealib.Context(where, settings, deps, user_on_ready, user_on_failure);

	//  Do not return a value to discourage the following pattern:
	/*
	var medea = medealib.CreateContext(...,function() {
		var vp1 = medea.CreateViewport(); << medea not defined if callback is called instantly
	});
	*/
}


 // ---------------------------------------------------------------------------
 /** @private */
var Context = medealib.Context = function(where, settings, deps, user_on_ready, user_on_failure) {
	var medeactx = this;

	if(!(medeactx instanceof Context)) {
		return new Context(where, settings, deps, user_on_ready, user_on_failure);
	}




	// TODO: restructure constants
	// constants
	medeactx.FRAME_VIEWPORT_UPDATED = 0x1;
	medeactx.FRAME_CANVAS_SIZE_CHANGED = medeactx.FRAME_VIEWPORT_UPDATED | 0x2;

	medeactx.VISIBLE_NONE = 0x0;
	medeactx.VISIBLE_ALL = 0x1;
	medeactx.VISIBLE_PARTIAL = 0x2;


	// context state and statistics 
	medeactx.settings = settings || {};
	medeactx.settings.fps = medeactx.settings.fps || 60;
	medeactx.wireframe = false;

	medeactx.statistics = {
		  count_frames : 0
		, smoothed_fps : -1
		, exact_fps    : -1
		, min_fps      : -1
		, max_fps      : -1
		, primitives_frame 	: 0
		, vertices_frame 	: 0
		, batches_frame : 0
	};

	medeactx.time = 0.0;

	medeactx.dtacc = 0.0;
	medeactx.dtcnt = 0;
	medeactx.dtmin_fps = 1e6;
	medeactx.dtmax_fps = 0;

	medeactx.tick_callbacks = {};
	medeactx.stop_asap = false;

	medeactx.frame_flags = 0;
	medeactx.debug_panel = null;

	medeactx.statepool = {};
	medeactx._workers = {};

	
	var _modules_loaded = {}
	,	_disposed = false;


	// ---------------------------------------------------------------------------
	/** Dispose of all resources held by the context. 
	 * */
	// ---------------------------------------------------------------------------
	medeactx.Dispose = function() {

		_disposed = true;

		if(this.debug_panel) {
			this.debug_panel.Dispose();
		}

		// TODO: how to cleverly destroy all gl resources, including the
		// context? http://stackoverflow.com/questions/14970206
	} 



	// ---------------------------------------------------------------------------
	/** Check if a particular module has been loaded using LoadModules().
	 *
	 *  This becomes true for a module once the module is fully resolved,
	 *  and its APIs are available. So after LoadModules() returns it is likely
	 *  false, but it is true in the callback given to LoadModules(). Modules
	 *  cannot be unloades so the value remains true for the context's lifetime
	 *  then.
	 * */
	// ---------------------------------------------------------------------------
	medeactx.IsModuleLoaded = function(modname) {
		return !!_modules_loaded[modname];
	} 

	
	// ---------------------------------------------------------------------------
	/** Load a set of modules into this medea context.
	 *
	 *  Once loading is complete, the APIs of the respective modules are available
	 *  on the context object or in the global environment, depending on which
	 *  type of modules is being loaded.
	 *
	 *  @param {String} String or list of strings containing the names of the
	 *    modules to be fetched. There are two kinds of "modules":
	 *     a) medea modules, which are referred to with their name suffixes and
	 *        without the file extension. Such modules have their dependencies
	 *        resolved automatically, and they are applied to augment the medea
	 *        context such that their APIs become available on it.
	 *     b) JS files from /medea/3rdparty, which are referred to by their file 
	 *        name, including their file extension, i.e. "someMod.js". There
	 *        is no dependency resolution for such modules, they are simply
	 *        fetched and globally eval()ed.
	 *
	 *  @param {Function} Callback to be invoked once all the modules have 
	 *    been loaded. This may be called immediately if the modules are all 
	 *    registered with medealib.
	 *
	 *  @private
	 */
	// ---------------------------------------------------------------------------
	medeactx.LoadModules = function(whom, callback) {
		medealib._RegisterMods(whom, function() {
			if (!Array.isArray(whom)) {
				whom = [whom];
			}

			whom.forEach(function(mod) {
				var init_stub;

				// nothing to do for non-medea modules
				if(/\.js$/i.test(mod)) {
					return;
				}

				if (medeactx.IsModuleLoaded(mod)) {
					return;
				}



				// init_stub[0] init function for *this* module
				// init_stub[1] list of (direct) module dependencies - note that
				// the JS files have been fetched already by _RegisterMods(),
				// so LoadModules() does not need to do async ops and we don't
				// need to supply a callback.
				init_stub = medealib._GetModuleInfo( mod);
				medeactx.LoadModules(init_stub[1]);
					
				_modules_loaded[mod] = true;
				init_stub[0].call(medeactx, medealib);
			});

			if(callback) {
				callback(medeactx);
			}
		});
	};


	// ------------------------------------------------------------------------
	/** TODO: documentation 
	*/
	// ------------------------------------------------------------------------
	medeactx.GetSettings = function() {
		return medeactx.settings;
	};


	// ------------------------------------------------------------------------
	/** TODO: documentation 
	*/
	// ------------------------------------------------------------------------
	medeactx.RootNode = function(s) {
		if(s === undefined) {
			return medeactx.scene_root;
		}
		medeactx.scene_root = s;
	};


	// ------------------------------------------------------------------------
	/** TODO: documentation 
	*/
	// ------------------------------------------------------------------------
	medeactx.GetStatistics = function() {
		return medeactx.statistics;
	};


	// ------------------------------------------------------------------------
	/** TODO: documentation 
	*/
	// ------------------------------------------------------------------------
	medeactx.SetTickCallback = function(clb,key) {
		medeactx.tick_callbacks[key] = clb;
	};


	// ------------------------------------------------------------------------
	/** TODO: documentation 
	*/
	// ------------------------------------------------------------------------
	medeactx.RemoveTickCallback = function(key) {
		try {
			delete medeactx.tick_callbacks[key];
		} catch(e) {}
	};


	// ------------------------------------------------------------------------
	/** TODO: documentation 
	*/
	// ------------------------------------------------------------------------
	medeactx.EnsureIsResponsive = (function() {
		var should_be_responsive = false;
		return function(enabled) {
			if (enabled === undefined) {
				return should_be_responsive;
			}
			should_be_responsive = enabled;
		}
	}) ();


	// ------------------------------------------------------------------------
	/** Add a debug panel to the DOM.
	 *
	 *  This asynchonously fetches the "debug" module and creates a 
	 *  {@link medealib.Context.DebugPanel} instance, which is then set as the
	 *  context's global debug handler.
	 *
	 *  @param {DOMElement} [where] DOM element to host the debug panel, or falsy,
	 *    in which case the debug panel adds itself top-level.
	 *  @param {Function} [completion] Callback to be invoked once the debug
	 *    panel is ready.
	*/
	// ------------------------------------------------------------------------
	medeactx.SetDebugPanel = function(where, completion) {
		if(medeactx.debug_panel !== null) {
			return;
		}
		medeactx.debug_panel = false;
		medeactx.LoadModules("debug", function() {
			medeactx.debug_panel = new medeactx.DebugPanel(where);
			if (completion) {
				completion();
			}
		});
	};


	// ------------------------------------------------------------------------
	/** Start running the "main loop", that is, an infinite loop of calls 
	*  to {@link medealib.Context.DoSingleFrame()} to ensure continuous
	*  rendering.
	*
	*  The first loop iteration happens asynchronously, i.e. Start() itself
	*  returns immediately.
	*
	*  The framerate at which the frames are scheduled depends on the
	*  `fps` setting, as well as on the current performance situation (i.e.
	*   if CPU time is spare, the framerate is lower).
	*/
	// ------------------------------------------------------------------------
	medeactx.Start = function() {
		if (medeactx.stop_asap) {
			medeactx.stop_asap = false;
			return;
		}

		window.requestAnimationFrame(function() { 
			if (medeactx.stop_asap) {
				medeactx.stop_asap = false;
				return;
			}

			medeactx.DoSingleFrame();

			medeactx.Start();
		}, medeactx.canvas);
	};


	// ------------------------------------------------------------------------
	/** TODO: documentation 
	*/
	// ------------------------------------------------------------------------
	medeactx.StopNextFrame = function(unset_marker) {
		medeactx.stop_asap = !unset_marker;
	};


	// ------------------------------------------------------------------------
	/** TODO: documentation 
	*/
	// ------------------------------------------------------------------------
	medeactx.IsStopMarkerSet = function() {
		return medeactx.stop_asap;
	};


	// ------------------------------------------------------------------------
	/** Checks if rendering is currently possible. This is the case iff
	 *   a) the webgl context is ready, and not lost and
	 *   b) there is at least one viewport.
	*/
	// ------------------------------------------------------------------------
	medeactx.CanRender = function() {
		return medeactx.gl && medeactx.GetViewports().length;
	};


	// ------------------------------------------------------------------------
	/** TODO: documentation 
	*/
	// ------------------------------------------------------------------------
	medeactx.Wireframe = function(wf) {
		if (wf === undefined) {
			return medeactx.wireframe;
		}
		medeactx.wireframe = wf;
		// medeactx would be nice: medeactx.gl.polygonMode( medeactx.gl.FRONT_AND_BACK, wf?medeactx.gl.LINE:medeactx.gl.FILL );
		// .. but unfortunately we don't have glPolygonMode in WebGL. So leave the
		// implementation to the mesh drawing routines, which might use GL_LINES
		// to achieve the same effect.
		// http://stackoverflow.com/questions/3539205/is-there-a-substitute-for-glpolygonmode-in-open-gl-es-webgl
	};


	// ------------------------------------------------------------------------
	/** TODO: documentation 
	*/
	// ------------------------------------------------------------------------
	medeactx.GetTime = function() {
		return medeactx.time;
	};


	// ------------------------------------------------------------------------
	/** Performs a single frame.
	 *
	 *  This can be used if the application would like to have fine-grained
	 *  control on the timing of the drawing. To perform a automatic update
	 *  & drawing loop instead, use {@link medealib.Context.Start}.
	 *
	 *  Doing a frame involves (in this order):
	 *    - calling user callbacks
	 *    - visiting the scenegraph and calling Update() on dirty nodes
	 *    - rendering jobs to all viewports
	 *
	 *  @param {number} [dtime] Time passed since the last frame, in seconds. 
	 *     If omitted, the time is computed as the time elapsed since the
	 *     last call to {@link medealib.Context.DoSingleFrame}.
	*/
	// ------------------------------------------------------------------------
	medeactx.DoSingleFrame = function(dtime) {

		if (!medeactx.CanRender()) {
			medealib.NotifyFatal("Not ready for rendering; need a GL context and a viewport");
			return;
		}

		// get time delta and detect canvas changes
		function update_stats() {
			// get time delta if not specified
			if (dtime === undefined) {
				var old = medeactx.time;
				medeactx.time = Date.now() * 0.001;

				dtime = medeactx.time - old;
			}

			// check if the canvas sized changed
			if(medeactx.cached_cw != medeactx.canvas.width) {
				medeactx.cached_cw = medeactx.canvas.width;
				medeactx.frame_flags |= medeactx.FRAME_CANVAS_SIZE_CHANGED;
			}
			if(medeactx.cached_ch != medeactx.canvas.height) {
				medeactx.cached_ch = medeactx.canvas.height;
				medeactx.frame_flags |= medeactx.FRAME_CANVAS_SIZE_CHANGED;
			}

			medeactx._UpdateFrameStatistics(dtime);
		}

		// call user tick callbacks, result of false kills the frame
		function call_user_callbacks() {
			// call user-defined logic, operate on a copy of the dictionary just in case
			// somebody changed its contents while we're iterating it.
			var temp_callbacks = [];
			for(var k in medeactx.tick_callbacks) {
				temp_callbacks.push(medeactx.tick_callbacks[k]);
			}
			for(var i = 0; i < temp_callbacks.length; ++i) {
				if(!temp_callbacks[i](dtime)) {
					medeactx.StopNextFrame();
					return false;
				}
			}
			return true;
		}

		// perform scenegraph update 
		function update() {
			medeactx.VisitGraph(medeactx.scene_root,function(node) {
				if(!node.Enabled()) {
					return true;
				}
				var e = node.GetEntities();
				// if entities return medea.ENTITY_UPDATE_WAS_REMOVED  from Update(), medeactx means they removed
				for(var i = 0; i < e.length; ++i) {
					if(e[i].Update(dtime,node) === medeactx.ENTITY_UPDATE_WAS_REMOVED) {
						--i;
					}
				}

				node.Update(dtime);
				return true;
			});
		}

		// dispatch collected batch jobs to our viewport(s)
		function draw() {
			// adjust render settings if we switched to multiple viewports or vice versa
			if (medeactx.frame_flags & medeactx.FRAME_VIEWPORT_UPDATED) {
				if (medeactx.GetEnabledViewportCount()>1) {
					medeactx.gl.enable(medeactx.gl.SCISSOR_TEST);
				}
				else {
					medeactx.gl.disable(medeactx.gl.SCISSOR_TEST);
				}
			}

			// perform rendering
			var viewports = medeactx.GetViewports();
			for(var vn = 0; vn < viewports.length; ++vn) {
				viewports[vn].Render(medeactx,dtime);
			}
		}

		// putting it all together
		function do_frame() {
			update_stats();
			if(!call_user_callbacks()) {
				return;
			}
			update();
			draw();

			medeactx.frame_flags = 0;
		}

		// *****************
		var debug_panel = medeactx.debug_panel;

		if (debug_panel) {
			debug_panel.BeginFrame();
		}
		do_frame();
	
		if (debug_panel) {
			debug_panel.EndFrame();
		}
	};


	// ------------------------------------------------------------------------
	/** TODO: documentation 
	*/
	// ------------------------------------------------------------------------
	medeactx.VisitGraph = function(node,visitor,status_in) {
		var status = visitor(node, status_in);
		if (!status) {
			return false;
		}

		var c = node.GetChildren();
		for(var i = 0; i < c.length; ++i) {
			medeactx.VisitGraph(c[i], visitor, status);
		}

		return true;
	};


	// ------------------------------------------------------------------------
	/** TODO: documentation 
	*/
	// ------------------------------------------------------------------------
	medeactx.CreateWorker = function() {
		var worker_index_source = 0;
		return function(name, callback) {
			var Blob =  window.Blob
			,	BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder
			,	URL = window.URL || window.webkitURL
			;

			if (!Blob && !BlobBuilder) {
				medealib.LogDebug('BlobBuilder not available, cannot use web worker');
				callback(null);
				return false;
			}

			if (!Worker) {
				medealib.LogDebug('Worker not available, cannot use web worker');
				callback(null);
				return false;
			}

			if (!URL || !URL.createObjectURL) {
				medealib.LogDebug('URL.createObjectURL not available, cannot use web worker');
				callback(null);
				return false;
			}

			medea.LoadModules('worker_base', function() {
				var source = [
					medea.GetModSource('worker_base'),
					'\n',
					medea.GetModSource(name )]
				,	bb
				,	worker 
				,	worker_index
				,	msg
				;

				if (Blob) {
					blobURL = URL.createObjectURL(new Blob(source));
				}
				else {
					bb = new BlobBuilder();
					bb.append(source.join());
					blobURL = URL.createObjectURL(bb.getBlob());
				}

				worker = new Worker(blobURL);
				worker_index = worker_index_source++;

				msg = callback(worker, worker_index) || function() {};
				worker.onmessage = function(e) {

					if (e.data[0] === 'log') {
						medealib.Log('(worker ' + worker_index + ') ' + e.data[1], e.data[2] || 'debug');
						return;
					}
					else if (e.data[0] === 'assert') {
						medealib.DebugAssert('(worker ' + worker_index + ') ' + e.data[1]);
						return;
					}
					return msg(e);
				};
			});

			return true;
		};
	};


	// ------------------------------------------------------------------------
	/** TODO: documentation 
	*/
	// ------------------------------------------------------------------------
	medeactx._UpdateFrameStatistics = function(dtime) {
		medeactx.statistics.count_frames += 1;
		var e = medeactx.statistics.exact_fps = 1/dtime;

		medeactx.dtmin_fps = Math.min(medeactx.dtmin_fps,e);
		medeactx.dtmax_fps = Math.max(medeactx.dtmin_fps,e);

		medeactx.dtacc += dtime;
		++medeactx.dtcnt;

		if (medeactx.dtacc > 0.5) {
			if ( medeactx.statistics.smoothed_fps > 0) {
				medeactx.statistics.smoothed_fps = medeactx.statistics.smoothed_fps*0.3+ 0.7/(medeactx.dtacc/medeactx.dtcnt);
			}
			else {
				medeactx.statistics.smoothed_fps = medeactx.dtcnt/medeactx.dtacc;
			}

			medeactx.dtcnt *= 0.33;
			medeactx.dtacc *= 0.33;

			medeactx.statistics.min_fps = medeactx.dtmin_fps;
			medeactx.statistics.max_fps = medeactx.dtmax_fps;
		}

		medeactx.statistics.vertices_frame = medeactx.statistics.primitives_frame = medeactx.statistics.batches_frame = 0;
	};


	// ------------------------------------------------------------------------
	/** TODO: documentation 
	*/
	// ------------------------------------------------------------------------
	medeactx._NextPow2 = function( s ){
		// dumb way, might use the bit fiddling hack some day?
		return Math.pow( 2, Math.ceil( Math.log( s ) / Math.log( 2 ) ) );
	};


	// ------------------------------------------------------------------------
	/** TODO: documentation 
	*/
	// ------------------------------------------------------------------------
	medeactx._IsPow2 = function(w) {
		return w !== 0 && (w & (w - 1)) === 0;
	};


	// ------------------------------------------------------------------------
	/** TODO: documentation 
	*/
	// ------------------------------------------------------------------------
	medeactx._GetPath = function(src) {
		return src.replace(/^(.*[\\\/])?(.*)/,'$1');
	}


	// ------------------------------------------------------------------------
	// first initialization phase -- create webgl canvas and prepare environment
	function _init_level_0() {
		medeactx.canvas  = document.getElementById(where);

		// create a webgl context
		// try out all the names under which webgl might be available
		var candidates = ["webgl", "experimental-webgl", "webkit-3d", "moz-webgl"]
		,	i
		,	context = null
		;

		for (i = 0; i < candidates.length; ++i) {
			try {
				// Request a stencil buffer by default (D24S8 should be
				// universally available, if not this needs to be revised)
				context = medeactx.canvas.getContext(candidates[i], {
					stencil : true
				});
			} catch(ex) {

			}
			// no matter what happens, we take the first non-null context we get
			if (context) {
				break;
			}
		}

		if(!context) {
			if(user_on_failure) {
				user_on_failure();
			}
			return false;
		}
		
		// automatically create debug context if webgl-debug.js is present
		if (window.WebGLDebugUtils !== undefined) {
			context = WebGLDebugUtils.makeDebugContext(context);
		}


		medeactx.gl = context;
		return true;
	};


	// ------------------------------------------------------------------------
	// second phase of initialization -- prepare the rest and invoke the 
	// user's callback function.
	function _init_level_1() {
		medeactx.cached_cw = medeactx.canvas.width, medeactx.cached_ch = medeactx.canvas.height;

		// always allocate a default root node for the visual scene
		medeactx.scene_root = medeactx.CreateNode("root");


		user_on_ready(medeactx);
	};


	// ------------------------------------------------------------------------
	// initialization
	(function() {

		// collect initial dependencies - for example the scenegraph module and the mathlib is always needed
		var _initial_deps = ['node', 'viewport'];
		var _initial_pre_deps = []; 

		if (window.mat4 === undefined) {
			_initial_pre_deps.push('glMatrix.js');
		}


		// Initialization has two phases, the first of which is used to load utility libraries
		// that all medea modules may depend upon. medeactx also involves creating a webgl canvas
		// (which is accessible through the medea.gl namespace)
		medeactx.LoadModules(_initial_pre_deps, function() {
			if (!_init_level_0()) {
				return;
			}

			medeactx.LoadModules(_initial_deps.concat(deps || []), function() {
				_init_level_1();
			});
		});
	}) ();
};


	return medealib;
};

/*
 * glMatrix.js - High performance matrix and vector operations for WebGL
 * version 0.9.6
 */

/*
 * Copyright (c) 2011 Brandon Jones
 *
 * This software is provided 'as-is', without any express or implied
 * warranty. In no event will the authors be held liable for any damages
 * arising from the use of this software.
 *
 * Permission is granted to anyone to use this software for any purpose,
 * including commercial applications, and to alter it and redistribute it
 * freely, subject to the following restrictions:
 *
 *    1. The origin of this software must not be misrepresented; you must not
 *    claim that you wrote the original software. If you use this software
 *    in a product, an acknowledgment in the product documentation would be
 *    appreciated but is not required.
 *
 *    2. Altered source versions must be plainly marked as such, and must not
 *    be misrepresented as being the original software.
 *
 *    3. This notice may not be removed or altered from any source
 *    distribution.
 */

// Fallback for systems that don't support WebGL
if(typeof Float32Array != 'undefined') {
	glMatrixArrayType = Float32Array;
} else if(typeof WebGLFloatArray != 'undefined') {
	glMatrixArrayType = WebGLFloatArray; // This is officially deprecated and should dissapear in future revisions.
} else {
	glMatrixArrayType = Array;
}

/*
 * vec3 - 3 Dimensional Vector
 */
var vec3 = {};

/*
 * vec3.create
 * Creates a new instance of a vec3 using the default array type
 * Any javascript array containing at least 3 numeric elements can serve as a vec3
 *
 * Params:
 * vec - Optional, vec3 containing values to initialize with
 *
 * Returns:
 * New vec3
 */
vec3.create = function(vec) {
	var dest = new glMatrixArrayType(3);

	if(vec) {
		dest[0] = vec[0];
		dest[1] = vec[1];
		dest[2] = vec[2];
	}

	return dest;
};

/*
 * vec3.set
 * Copies the values of one vec3 to another
 *
 * Params:
 * vec - vec3 containing values to copy
 * dest - vec3 receiving copied values
 *
 * Returns:
 * dest
 */
vec3.set = function(vec, dest) {
	dest[0] = vec[0];
	dest[1] = vec[1];
	dest[2] = vec[2];

	return dest;
};

/*
 * vec3.add
 * Performs a vector addition
 *
 * Params:
 * vec - vec3, first operand
 * vec2 - vec3, second operand
 * dest - Optional, vec3 receiving operation result. If not specified result is written to vec
 *
 * Returns:
 * dest if specified, vec otherwise
 */
vec3.add = function(vec, vec2, dest) {
	if(!dest || vec == dest) {
		vec[0] += vec2[0];
		vec[1] += vec2[1];
		vec[2] += vec2[2];
		return vec;
	}

	dest[0] = vec[0] + vec2[0];
	dest[1] = vec[1] + vec2[1];
	dest[2] = vec[2] + vec2[2];
	return dest;
};

/*
 * vec3.subtract
 * Performs a vector subtraction
 *
 * Params:
 * vec - vec3, first operand
 * vec2 - vec3, second operand
 * dest - Optional, vec3 receiving operation result. If not specified result is written to vec
 *
 * Returns:
 * dest if specified, vec otherwise
 */
vec3.subtract = function(vec, vec2, dest) {
	if(!dest || vec == dest) {
		vec[0] -= vec2[0];
		vec[1] -= vec2[1];
		vec[2] -= vec2[2];
		return vec;
	}

	dest[0] = vec[0] - vec2[0];
	dest[1] = vec[1] - vec2[1];
	dest[2] = vec[2] - vec2[2];
	return dest;
};

/*
 * vec3.negate
 * Negates the components of a vec3
 *
 * Params:
 * vec - vec3 to negate
 * dest - Optional, vec3 receiving operation result. If not specified result is written to vec
 *
 * Returns:
 * dest if specified, vec otherwise
 */
vec3.negate = function(vec, dest) {
	if(!dest) { dest = vec; }

	dest[0] = -vec[0];
	dest[1] = -vec[1];
	dest[2] = -vec[2];
	return dest;
};

/*
 * vec3.scale
 * Multiplies the components of a vec3 by a scalar value
 *
 * Params:
 * vec - vec3 to scale
 * val - Numeric value to scale by
 * dest - Optional, vec3 receiving operation result. If not specified result is written to vec
 *
 * Returns:
 * dest if specified, vec otherwise
 */
vec3.scale = function(vec, val, dest) {
	if(!dest || vec == dest) {
		vec[0] *= val;
		vec[1] *= val;
		vec[2] *= val;
		return vec;
	}

	dest[0] = vec[0]*val;
	dest[1] = vec[1]*val;
	dest[2] = vec[2]*val;
	return dest;
};

/*
 * vec3.normalize
 * Generates a unit vector of the same direction as the provided vec3
 * If vector length is 0, returns [0, 0, 0]
 *
 * Params:
 * vec - vec3 to normalize
 * dest - Optional, vec3 receiving operation result. If not specified result is written to vec
 *
 * Returns:
 * dest if specified, vec otherwise
 */
vec3.normalize = function(vec, dest) {
	if(!dest) { dest = vec; }

	var x = vec[0], y = vec[1], z = vec[2];
	var len = Math.sqrt(x*x + y*y + z*z);

	if (!len) {
		dest[0] = 0;
		dest[1] = 0;
		dest[2] = 0;
		return dest;
	} else if (len == 1) {
		dest[0] = x;
		dest[1] = y;
		dest[2] = z;
		return dest;
	}

	len = 1 / len;
	dest[0] = x*len;
	dest[1] = y*len;
	dest[2] = z*len;
	return dest;
};

/*
 * vec3.cross
 * Generates the cross product of two vec3s
 *
 * Params:
 * vec - vec3, first operand
 * vec2 - vec3, second operand
 * dest - Optional, vec3 receiving operation result. If not specified result is written to vec
 *
 * Returns:
 * dest if specified, vec otherwise
 */
vec3.cross = function(vec, vec2, dest){
	if(!dest) { dest = vec; }

	var x = vec[0], y = vec[1], z = vec[2];
	var x2 = vec2[0], y2 = vec2[1], z2 = vec2[2];

	dest[0] = y*z2 - z*y2;
	dest[1] = z*x2 - x*z2;
	dest[2] = x*y2 - y*x2;
	return dest;
};

/*
 * vec3.length
 * Caclulates the length of a vec3
 *
 * Params:
 * vec - vec3 to calculate length of
 *
 * Returns:
 * Length of vec
 */
vec3.length = function(vec){
	var x = vec[0], y = vec[1], z = vec[2];
	return Math.sqrt(x*x + y*y + z*z);
};

/*
 * vec3.dot
 * Caclulates the dot product of two vec3s
 *
 * Params:
 * vec - vec3, first operand
 * vec2 - vec3, second operand
 *
 * Returns:
 * Dot product of vec and vec2
 */
vec3.dot = function(vec, vec2){
	return vec[0]*vec2[0] + vec[1]*vec2[1] + vec[2]*vec2[2];
};

/*
 * vec3.direction
 * Generates a unit vector pointing from one vector to another
 *
 * Params:
 * vec - origin vec3
 * vec2 - vec3 to point to
 * dest - Optional, vec3 receiving operation result. If not specified result is written to vec
 *
 * Returns:
 * dest if specified, vec otherwise
 */
vec3.direction = function(vec, vec2, dest) {
	if(!dest) { dest = vec; }

	var x = vec[0] - vec2[0];
	var y = vec[1] - vec2[1];
	var z = vec[2] - vec2[2];

	var len = Math.sqrt(x*x + y*y + z*z);
	if (!len) {
		dest[0] = 0;
		dest[1] = 0;
		dest[2] = 0;
		return dest;
	}

	len = 1 / len;
	dest[0] = x * len;
	dest[1] = y * len;
	dest[2] = z * len;
	return dest;
};

/*
 * vec3.lerp
 * Performs a linear interpolation between two vec3
 *
 * Params:
 * vec - vec3, first vector
 * vec2 - vec3, second vector
 * lerp - interpolation amount between the two inputs
 * dest - Optional, vec3 receiving operation result. If not specified result is written to vec
 *
 * Returns:
 * dest if specified, vec otherwise
 */
vec3.lerp = function(vec, vec2, lerp, dest){
	if(!dest) { dest = vec; }

	dest[0] = vec[0] + lerp * (vec2[0] - vec[0]);
	dest[1] = vec[1] + lerp * (vec2[1] - vec[1]);
	dest[2] = vec[2] + lerp * (vec2[2] - vec[2]);

	return dest;
}

/*
 * vec3.str
 * Returns a string representation of a vector
 *
 * Params:
 * vec - vec3 to represent as a string
 *
 * Returns:
 * string representation of vec
 */
vec3.str = function(vec) {
	return '[' + vec[0] + ', ' + vec[1] + ', ' + vec[2] + ']';
};

/*
 * mat3 - 3x3 Matrix
 */
var mat3 = {};

/*
 * mat3.create
 * Creates a new instance of a mat3 using the default array type
 * Any javascript array containing at least 9 numeric elements can serve as a mat3
 *
 * Params:
 * mat - Optional, mat3 containing values to initialize with
 *
 * Returns:
 * New mat3
 */
mat3.create = function(mat) {
	var dest = new glMatrixArrayType(9);

	if(mat) {
		dest[0] = mat[0];
		dest[1] = mat[1];
		dest[2] = mat[2];
		dest[3] = mat[3];
		dest[4] = mat[4];
		dest[5] = mat[5];
		dest[6] = mat[6];
		dest[7] = mat[7];
		dest[8] = mat[8];
	}

	return dest;
};

/*
 * mat3.set
 * Copies the values of one mat3 to another
 *
 * Params:
 * mat - mat3 containing values to copy
 * dest - mat3 receiving copied values
 *
 * Returns:
 * dest
 */
mat3.set = function(mat, dest) {
	dest[0] = mat[0];
	dest[1] = mat[1];
	dest[2] = mat[2];
	dest[3] = mat[3];
	dest[4] = mat[4];
	dest[5] = mat[5];
	dest[6] = mat[6];
	dest[7] = mat[7];
	dest[8] = mat[8];
	return dest;
};

/*
 * mat3.identity
 * Sets a mat3 to an identity matrix
 *
 * Params:
 * dest - mat3 to set
 *
 * Returns:
 * dest
 */
mat3.identity = function(dest) {
	dest[0] = 1;
	dest[1] = 0;
	dest[2] = 0;
	dest[3] = 0;
	dest[4] = 1;
	dest[5] = 0;
	dest[6] = 0;
	dest[7] = 0;
	dest[8] = 1;
	return dest;
};

/*
 * mat4.transpose
 * Transposes a mat3 (flips the values over the diagonal)
 *
 * Params:
 * mat - mat3 to transpose
 * dest - Optional, mat3 receiving transposed values. If not specified result is written to mat
 *
 * Returns:
 * dest is specified, mat otherwise
 */
mat3.transpose = function(mat, dest) {
	// If we are transposing ourselves we can skip a few steps but have to cache some values
	if(!dest || mat == dest) {
		var a01 = mat[1], a02 = mat[2];
		var a12 = mat[5];

		mat[1] = mat[3];
		mat[2] = mat[6];
		mat[3] = a01;
		mat[5] = mat[7];
		mat[6] = a02;
		mat[7] = a12;
		return mat;
	}

	dest[0] = mat[0];
	dest[1] = mat[3];
	dest[2] = mat[6];
	dest[3] = mat[1];
	dest[4] = mat[4];
	dest[5] = mat[7];
	dest[6] = mat[2];
	dest[7] = mat[5];
	dest[8] = mat[8];
	return dest;
};

/*
 * mat3.toMat4
 * Copies the elements of a mat3 into the upper 3x3 elements of a mat4
 *
 * Params:
 * mat - mat3 containing values to copy
 * dest - Optional, mat4 receiving copied values
 *
 * Returns:
 * dest if specified, a new mat4 otherwise
 */
mat3.toMat4 = function(mat, dest) {
	if(!dest) { dest = mat4.create(); }

	dest[0] = mat[0];
	dest[1] = mat[1];
	dest[2] = mat[2];
	dest[3] = 0;

	dest[4] = mat[3];
	dest[5] = mat[4];
	dest[6] = mat[5];
	dest[7] = 0;

	dest[8] = mat[6];
	dest[9] = mat[7];
	dest[10] = mat[8];
	dest[11] = 0;

	dest[12] = 0;
	dest[13] = 0;
	dest[14] = 0;
	dest[15] = 1;

	return dest;
}

/*
 * mat3.str
 * Returns a string representation of a mat3
 *
 * Params:
 * mat - mat3 to represent as a string
 *
 * Returns:
 * string representation of mat
 */
mat3.str = function(mat) {
	return '[' + mat[0] + ', ' + mat[1] + ', ' + mat[2] +
		', ' + mat[3] + ', '+ mat[4] + ', ' + mat[5] +
		', ' + mat[6] + ', ' + mat[7] + ', '+ mat[8] + ']';
};

/*
 * mat4 - 4x4 Matrix
 */
var mat4 = {};

/*
 * mat4.create
 * Creates a new instance of a mat4 using the default array type
 * Any javascript array containing at least 16 numeric elements can serve as a mat4
 *
 * Params:
 * mat - Optional, mat4 containing values to initialize with
 *
 * Returns:
 * New mat4
 */
mat4.create = function(mat) {
	var dest = new glMatrixArrayType(16);

	if(mat) {
		dest[0] = mat[0];
		dest[1] = mat[1];
		dest[2] = mat[2];
		dest[3] = mat[3];
		dest[4] = mat[4];
		dest[5] = mat[5];
		dest[6] = mat[6];
		dest[7] = mat[7];
		dest[8] = mat[8];
		dest[9] = mat[9];
		dest[10] = mat[10];
		dest[11] = mat[11];
		dest[12] = mat[12];
		dest[13] = mat[13];
		dest[14] = mat[14];
		dest[15] = mat[15];
	}

	return dest;
};

/*
 * mat4.set
 * Copies the values of one mat4 to another
 *
 * Params:
 * mat - mat4 containing values to copy
 * dest - mat4 receiving copied values
 *
 * Returns:
 * dest
 */
mat4.set = function(mat, dest) {
	dest[0] = mat[0];
	dest[1] = mat[1];
	dest[2] = mat[2];
	dest[3] = mat[3];
	dest[4] = mat[4];
	dest[5] = mat[5];
	dest[6] = mat[6];
	dest[7] = mat[7];
	dest[8] = mat[8];
	dest[9] = mat[9];
	dest[10] = mat[10];
	dest[11] = mat[11];
	dest[12] = mat[12];
	dest[13] = mat[13];
	dest[14] = mat[14];
	dest[15] = mat[15];
	return dest;
};

/*
 * mat4.identity
 * Sets a mat4 to an identity matrix
 *
 * Params:
 * dest - mat4 to set
 *
 * Returns:
 * dest
 */
mat4.identity = function(dest) {
	dest[0] = 1;
	dest[1] = 0;
	dest[2] = 0;
	dest[3] = 0;
	dest[4] = 0;
	dest[5] = 1;
	dest[6] = 0;
	dest[7] = 0;
	dest[8] = 0;
	dest[9] = 0;
	dest[10] = 1;
	dest[11] = 0;
	dest[12] = 0;
	dest[13] = 0;
	dest[14] = 0;
	dest[15] = 1;
	return dest;
};

/*
 * mat4.transpose
 * Transposes a mat4 (flips the values over the diagonal)
 *
 * Params:
 * mat - mat4 to transpose
 * dest - Optional, mat4 receiving transposed values. If not specified result is written to mat
 *
 * Returns:
 * dest is specified, mat otherwise
 */
mat4.transpose = function(mat, dest) {
	// If we are transposing ourselves we can skip a few steps but have to cache some values
	if(!dest || mat == dest) {
		var a01 = mat[1], a02 = mat[2], a03 = mat[3];
		var a12 = mat[6], a13 = mat[7];
		var a23 = mat[11];

		mat[1] = mat[4];
		mat[2] = mat[8];
		mat[3] = mat[12];
		mat[4] = a01;
		mat[6] = mat[9];
		mat[7] = mat[13];
		mat[8] = a02;
		mat[9] = a12;
		mat[11] = mat[14];
		mat[12] = a03;
		mat[13] = a13;
		mat[14] = a23;
		return mat;
	}

	dest[0] = mat[0];
	dest[1] = mat[4];
	dest[2] = mat[8];
	dest[3] = mat[12];
	dest[4] = mat[1];
	dest[5] = mat[5];
	dest[6] = mat[9];
	dest[7] = mat[13];
	dest[8] = mat[2];
	dest[9] = mat[6];
	dest[10] = mat[10];
	dest[11] = mat[14];
	dest[12] = mat[3];
	dest[13] = mat[7];
	dest[14] = mat[11];
	dest[15] = mat[15];
	return dest;
};

/*
 * mat4.determinant
 * Calculates the determinant of a mat4
 *
 * Params:
 * mat - mat4 to calculate determinant of
 *
 * Returns:
 * determinant of mat
 */
mat4.determinant = function(mat) {
	// Cache the matrix values (makes for huge speed increases!)
	var a00 = mat[0], a01 = mat[1], a02 = mat[2], a03 = mat[3];
	var a10 = mat[4], a11 = mat[5], a12 = mat[6], a13 = mat[7];
	var a20 = mat[8], a21 = mat[9], a22 = mat[10], a23 = mat[11];
	var a30 = mat[12], a31 = mat[13], a32 = mat[14], a33 = mat[15];

	return	a30*a21*a12*a03 - a20*a31*a12*a03 - a30*a11*a22*a03 + a10*a31*a22*a03 +
			a20*a11*a32*a03 - a10*a21*a32*a03 - a30*a21*a02*a13 + a20*a31*a02*a13 +
			a30*a01*a22*a13 - a00*a31*a22*a13 - a20*a01*a32*a13 + a00*a21*a32*a13 +
			a30*a11*a02*a23 - a10*a31*a02*a23 - a30*a01*a12*a23 + a00*a31*a12*a23 +
			a10*a01*a32*a23 - a00*a11*a32*a23 - a20*a11*a02*a33 + a10*a21*a02*a33 +
			a20*a01*a12*a33 - a00*a21*a12*a33 - a10*a01*a22*a33 + a00*a11*a22*a33;
};

/*
 * mat4.inverse
 * Calculates the inverse matrix of a mat4
 *
 * Params:
 * mat - mat4 to calculate inverse of
 * dest - Optional, mat4 receiving inverse matrix. If not specified result is written to mat
 *
 * Returns:
 * dest is specified, mat otherwise
 */
mat4.inverse = function(mat, dest) {
	if(!dest) { dest = mat; }

	// Cache the matrix values (makes for huge speed increases!)
	var a00 = mat[0], a01 = mat[1], a02 = mat[2], a03 = mat[3];
	var a10 = mat[4], a11 = mat[5], a12 = mat[6], a13 = mat[7];
	var a20 = mat[8], a21 = mat[9], a22 = mat[10], a23 = mat[11];
	var a30 = mat[12], a31 = mat[13], a32 = mat[14], a33 = mat[15];

	var b00 = a00*a11 - a01*a10;
	var b01 = a00*a12 - a02*a10;
	var b02 = a00*a13 - a03*a10;
	var b03 = a01*a12 - a02*a11;
	var b04 = a01*a13 - a03*a11;
	var b05 = a02*a13 - a03*a12;
	var b06 = a20*a31 - a21*a30;
	var b07 = a20*a32 - a22*a30;
	var b08 = a20*a33 - a23*a30;
	var b09 = a21*a32 - a22*a31;
	var b10 = a21*a33 - a23*a31;
	var b11 = a22*a33 - a23*a32;

	// Calculate the determinant (inlined to avoid double-caching)
	var invDet = 1/(b00*b11 - b01*b10 + b02*b09 + b03*b08 - b04*b07 + b05*b06);

	dest[0] = (a11*b11 - a12*b10 + a13*b09)*invDet;
	dest[1] = (-a01*b11 + a02*b10 - a03*b09)*invDet;
	dest[2] = (a31*b05 - a32*b04 + a33*b03)*invDet;
	dest[3] = (-a21*b05 + a22*b04 - a23*b03)*invDet;
	dest[4] = (-a10*b11 + a12*b08 - a13*b07)*invDet;
	dest[5] = (a00*b11 - a02*b08 + a03*b07)*invDet;
	dest[6] = (-a30*b05 + a32*b02 - a33*b01)*invDet;
	dest[7] = (a20*b05 - a22*b02 + a23*b01)*invDet;
	dest[8] = (a10*b10 - a11*b08 + a13*b06)*invDet;
	dest[9] = (-a00*b10 + a01*b08 - a03*b06)*invDet;
	dest[10] = (a30*b04 - a31*b02 + a33*b00)*invDet;
	dest[11] = (-a20*b04 + a21*b02 - a23*b00)*invDet;
	dest[12] = (-a10*b09 + a11*b07 - a12*b06)*invDet;
	dest[13] = (a00*b09 - a01*b07 + a02*b06)*invDet;
	dest[14] = (-a30*b03 + a31*b01 - a32*b00)*invDet;
	dest[15] = (a20*b03 - a21*b01 + a22*b00)*invDet;

	return dest;
};

/*
 * mat4.toRotationMat
 * Copies the upper 3x3 elements of a mat4 into another mat4
 *
 * Params:
 * mat - mat4 containing values to copy
 * dest - Optional, mat4 receiving copied values
 *
 * Returns:
 * dest is specified, a new mat4 otherwise
 */
mat4.toRotationMat = function(mat, dest) {
	if(!dest) { dest = mat4.create(); }

	dest[0] = mat[0];
	dest[1] = mat[1];
	dest[2] = mat[2];
	dest[3] = mat[3];
	dest[4] = mat[4];
	dest[5] = mat[5];
	dest[6] = mat[6];
	dest[7] = mat[7];
	dest[8] = mat[8];
	dest[9] = mat[9];
	dest[10] = mat[10];
	dest[11] = mat[11];
	dest[12] = 0;
	dest[13] = 0;
	dest[14] = 0;
	dest[15] = 1;

	return dest;
};

/*
 * mat4.toMat3
 * Copies the upper 3x3 elements of a mat4 into a mat3
 *
 * Params:
 * mat - mat4 containing values to copy
 * dest - Optional, mat3 receiving copied values
 *
 * Returns:
 * dest is specified, a new mat3 otherwise
 */
mat4.toMat3 = function(mat, dest) {
	if(!dest) { dest = mat3.create(); }

	dest[0] = mat[0];
	dest[1] = mat[1];
	dest[2] = mat[2];
	dest[3] = mat[4];
	dest[4] = mat[5];
	dest[5] = mat[6];
	dest[6] = mat[8];
	dest[7] = mat[9];
	dest[8] = mat[10];

	return dest;
};

/*
 * mat4.toInverseMat3
 * Calculates the inverse of the upper 3x3 elements of a mat4 and copies the result into a mat3
 * The resulting matrix is useful for calculating transformed normals
 *
 * Params:
 * mat - mat4 containing values to invert and copy
 * dest - Optional, mat3 receiving values
 *
 * Returns:
 * dest is specified, a new mat3 otherwise
 */
mat4.toInverseMat3 = function(mat, dest) {
	// Cache the matrix values (makes for huge speed increases!)
	var a00 = mat[0], a01 = mat[1], a02 = mat[2];
	var a10 = mat[4], a11 = mat[5], a12 = mat[6];
	var a20 = mat[8], a21 = mat[9], a22 = mat[10];

	var b01 = a22*a11-a12*a21;
	var b11 = -a22*a10+a12*a20;
	var b21 = a21*a10-a11*a20;

	var d = a00*b01 + a01*b11 + a02*b21;
	if (!d) { return null; }
	var id = 1/d;

	if(!dest) { dest = mat3.create(); }

	dest[0] = b01*id;
	dest[1] = (-a22*a01 + a02*a21)*id;
	dest[2] = (a12*a01 - a02*a11)*id;
	dest[3] = b11*id;
	dest[4] = (a22*a00 - a02*a20)*id;
	dest[5] = (-a12*a00 + a02*a10)*id;
	dest[6] = b21*id;
	dest[7] = (-a21*a00 + a01*a20)*id;
	dest[8] = (a11*a00 - a01*a10)*id;

	return dest;
};

/*
 * mat4.multiply
 * Performs a matrix multiplication
 *
 * Params:
 * mat - mat4, first operand
 * mat2 - mat4, second operand
 * dest - Optional, mat4 receiving operation result. If not specified result is written to mat
 *
 * Returns:
 * dest if specified, mat otherwise
 */
mat4.multiply = function(mat, mat2, dest) {
	if(!dest) { dest = mat }

	// Cache the matrix values (makes for huge speed increases!)
	var a00 = mat[0], a01 = mat[1], a02 = mat[2], a03 = mat[3];
	var a10 = mat[4], a11 = mat[5], a12 = mat[6], a13 = mat[7];
	var a20 = mat[8], a21 = mat[9], a22 = mat[10], a23 = mat[11];
	var a30 = mat[12], a31 = mat[13], a32 = mat[14], a33 = mat[15];

	var b00 = mat2[0], b01 = mat2[1], b02 = mat2[2], b03 = mat2[3];
	var b10 = mat2[4], b11 = mat2[5], b12 = mat2[6], b13 = mat2[7];
	var b20 = mat2[8], b21 = mat2[9], b22 = mat2[10], b23 = mat2[11];
	var b30 = mat2[12], b31 = mat2[13], b32 = mat2[14], b33 = mat2[15];

	dest[0] = b00*a00 + b01*a10 + b02*a20 + b03*a30;
	dest[1] = b00*a01 + b01*a11 + b02*a21 + b03*a31;
	dest[2] = b00*a02 + b01*a12 + b02*a22 + b03*a32;
	dest[3] = b00*a03 + b01*a13 + b02*a23 + b03*a33;
	dest[4] = b10*a00 + b11*a10 + b12*a20 + b13*a30;
	dest[5] = b10*a01 + b11*a11 + b12*a21 + b13*a31;
	dest[6] = b10*a02 + b11*a12 + b12*a22 + b13*a32;
	dest[7] = b10*a03 + b11*a13 + b12*a23 + b13*a33;
	dest[8] = b20*a00 + b21*a10 + b22*a20 + b23*a30;
	dest[9] = b20*a01 + b21*a11 + b22*a21 + b23*a31;
	dest[10] = b20*a02 + b21*a12 + b22*a22 + b23*a32;
	dest[11] = b20*a03 + b21*a13 + b22*a23 + b23*a33;
	dest[12] = b30*a00 + b31*a10 + b32*a20 + b33*a30;
	dest[13] = b30*a01 + b31*a11 + b32*a21 + b33*a31;
	dest[14] = b30*a02 + b31*a12 + b32*a22 + b33*a32;
	dest[15] = b30*a03 + b31*a13 + b32*a23 + b33*a33;

	return dest;
};

/*
 * mat4.multiplyVec3
 * Transforms a vec3 with the given matrix
 * 4th vector component is implicitly '1'
 *
 * Params:
 * mat - mat4 to transform the vector with
 * vec - vec3 to transform
 * dest - Optional, vec3 receiving operation result. If not specified result is written to vec
 *
 * Returns:
 * dest if specified, vec otherwise
 */
mat4.multiplyVec3 = function(mat, vec, dest) {
	if(!dest) { dest = vec }

	var x = vec[0], y = vec[1], z = vec[2];

	dest[0] = mat[0]*x + mat[4]*y + mat[8]*z + mat[12];
	dest[1] = mat[1]*x + mat[5]*y + mat[9]*z + mat[13];
	dest[2] = mat[2]*x + mat[6]*y + mat[10]*z + mat[14];

	return dest;
};

/*
 * mat4.multiplyVec4
 * Transforms a vec4 with the given matrix
 *
 * Params:
 * mat - mat4 to transform the vector with
 * vec - vec4 to transform
 * dest - Optional, vec4 receiving operation result. If not specified result is written to vec
 *
 * Returns:
 * dest if specified, vec otherwise
 */
mat4.multiplyVec4 = function(mat, vec, dest) {
	if(!dest) { dest = vec }

	var x = vec[0], y = vec[1], z = vec[2], w = vec[3];

	dest[0] = mat[0]*x + mat[4]*y + mat[8]*z + mat[12]*w;
	dest[1] = mat[1]*x + mat[5]*y + mat[9]*z + mat[13]*w;
	dest[2] = mat[2]*x + mat[6]*y + mat[10]*z + mat[14]*w;
	dest[3] = mat[3]*x + mat[7]*y + mat[11]*z + mat[15]*w;

	return dest;
};

/*
 * mat4.translate
 * Translates a matrix by the given vector
 *
 * Params:
 * mat - mat4 to translate
 * vec - vec3 specifying the translation
 * dest - Optional, mat4 receiving operation result. If not specified result is written to mat
 *
 * Returns:
 * dest if specified, mat otherwise
 */
mat4.translate = function(mat, vec, dest) {
	var x = vec[0], y = vec[1], z = vec[2];

	if(!dest || mat == dest) {
		mat[12] = mat[0]*x + mat[4]*y + mat[8]*z + mat[12];
		mat[13] = mat[1]*x + mat[5]*y + mat[9]*z + mat[13];
		mat[14] = mat[2]*x + mat[6]*y + mat[10]*z + mat[14];
		mat[15] = mat[3]*x + mat[7]*y + mat[11]*z + mat[15];
		return mat;
	}

	var a00 = mat[0], a01 = mat[1], a02 = mat[2], a03 = mat[3];
	var a10 = mat[4], a11 = mat[5], a12 = mat[6], a13 = mat[7];
	var a20 = mat[8], a21 = mat[9], a22 = mat[10], a23 = mat[11];

	dest[0] = a00;
	dest[1] = a01;
	dest[2] = a02;
	dest[3] = a03;
	dest[4] = a10;
	dest[5] = a11;
	dest[6] = a12;
	dest[7] = a13;
	dest[8] = a20;
	dest[9] = a21;
	dest[10] = a22;
	dest[11] = a23;

	dest[12] = a00*x + a10*y + a20*z + mat[12];
	dest[13] = a01*x + a11*y + a21*z + mat[13];
	dest[14] = a02*x + a12*y + a22*z + mat[14];
	dest[15] = a03*x + a13*y + a23*z + mat[15];
	return dest;
};

/*
 * mat4.scale
 * Scales a matrix by the given vector
 *
 * Params:
 * mat - mat4 to scale
 * vec - vec3 specifying the scale for each axis
 * dest - Optional, mat4 receiving operation result. If not specified result is written to mat
 *
 * Returns:
 * dest if specified, mat otherwise
 */
mat4.scale = function(mat, vec, dest) {
	var x = vec[0], y = vec[1], z = vec[2];

	if(!dest || mat == dest) {
		mat[0] *= x;
		mat[1] *= x;
		mat[2] *= x;
		mat[3] *= x;
		mat[4] *= y;
		mat[5] *= y;
		mat[6] *= y;
		mat[7] *= y;
		mat[8] *= z;
		mat[9] *= z;
		mat[10] *= z;
		mat[11] *= z;
		return mat;
	}

	dest[0] = mat[0]*x;
	dest[1] = mat[1]*x;
	dest[2] = mat[2]*x;
	dest[3] = mat[3]*x;
	dest[4] = mat[4]*y;
	dest[5] = mat[5]*y;
	dest[6] = mat[6]*y;
	dest[7] = mat[7]*y;
	dest[8] = mat[8]*z;
	dest[9] = mat[9]*z;
	dest[10] = mat[10]*z;
	dest[11] = mat[11]*z;
	dest[12] = mat[12];
	dest[13] = mat[13];
	dest[14] = mat[14];
	dest[15] = mat[15];
	return dest;
};

/*
 * mat4.rotate
 * Rotates a matrix by the given angle around the specified axis
 * If rotating around a primary axis (X,Y,Z) one of the specialized rotation functions should be used instead for performance
 *
 * Params:
 * mat - mat4 to rotate
 * angle - angle (in radians) to rotate
 * axis - vec3 representing the axis to rotate around
 * dest - Optional, mat4 receiving operation result. If not specified result is written to mat
 *
 * Returns:
 * dest if specified, mat otherwise
 */
mat4.rotate = function(mat, angle, axis, dest) {
	var x = axis[0], y = axis[1], z = axis[2];
	var len = Math.sqrt(x*x + y*y + z*z);
	if (!len) { return null; }
	if (len != 1) {
		len = 1 / len;
		x *= len;
		y *= len;
		z *= len;
	}

	var s = Math.sin(angle);
	var c = Math.cos(angle);
	var t = 1-c;

	// Cache the matrix values (makes for huge speed increases!)
	var a00 = mat[0], a01 = mat[1], a02 = mat[2], a03 = mat[3];
	var a10 = mat[4], a11 = mat[5], a12 = mat[6], a13 = mat[7];
	var a20 = mat[8], a21 = mat[9], a22 = mat[10], a23 = mat[11];

	// Construct the elements of the rotation matrix
	var b00 = x*x*t + c, b01 = y*x*t + z*s, b02 = z*x*t - y*s;
	var b10 = x*y*t - z*s, b11 = y*y*t + c, b12 = z*y*t + x*s;
	var b20 = x*z*t + y*s, b21 = y*z*t - x*s, b22 = z*z*t + c;

	if(!dest) {
		dest = mat
	} else if(mat != dest) { // If the source and destination differ, copy the unchanged last row
		dest[12] = mat[12];
		dest[13] = mat[13];
		dest[14] = mat[14];
		dest[15] = mat[15];
	}

	// Perform rotation-specific matrix multiplication
	dest[0] = a00*b00 + a10*b01 + a20*b02;
	dest[1] = a01*b00 + a11*b01 + a21*b02;
	dest[2] = a02*b00 + a12*b01 + a22*b02;
	dest[3] = a03*b00 + a13*b01 + a23*b02;

	dest[4] = a00*b10 + a10*b11 + a20*b12;
	dest[5] = a01*b10 + a11*b11 + a21*b12;
	dest[6] = a02*b10 + a12*b11 + a22*b12;
	dest[7] = a03*b10 + a13*b11 + a23*b12;

	dest[8] = a00*b20 + a10*b21 + a20*b22;
	dest[9] = a01*b20 + a11*b21 + a21*b22;
	dest[10] = a02*b20 + a12*b21 + a22*b22;
	dest[11] = a03*b20 + a13*b21 + a23*b22;
	return dest;
};

/*
 * mat4.rotateX
 * Rotates a matrix by the given angle around the X axis
 *
 * Params:
 * mat - mat4 to rotate
 * angle - angle (in radians) to rotate
 * dest - Optional, mat4 receiving operation result. If not specified result is written to mat
 *
 * Returns:
 * dest if specified, mat otherwise
 */
mat4.rotateX = function(mat, angle, dest) {
	var s = Math.sin(angle);
	var c = Math.cos(angle);

	// Cache the matrix values (makes for huge speed increases!)
	var a10 = mat[4], a11 = mat[5], a12 = mat[6], a13 = mat[7];
	var a20 = mat[8], a21 = mat[9], a22 = mat[10], a23 = mat[11];

	if(!dest) {
		dest = mat
	} else if(mat != dest) { // If the source and destination differ, copy the unchanged rows
		dest[0] = mat[0];
		dest[1] = mat[1];
		dest[2] = mat[2];
		dest[3] = mat[3];

		dest[12] = mat[12];
		dest[13] = mat[13];
		dest[14] = mat[14];
		dest[15] = mat[15];
	}

	// Perform axis-specific matrix multiplication
	dest[4] = a10*c + a20*s;
	dest[5] = a11*c + a21*s;
	dest[6] = a12*c + a22*s;
	dest[7] = a13*c + a23*s;

	dest[8] = a10*-s + a20*c;
	dest[9] = a11*-s + a21*c;
	dest[10] = a12*-s + a22*c;
	dest[11] = a13*-s + a23*c;
	return dest;
};

/*
 * mat4.rotateY
 * Rotates a matrix by the given angle around the Y axis
 *
 * Params:
 * mat - mat4 to rotate
 * angle - angle (in radians) to rotate
 * dest - Optional, mat4 receiving operation result. If not specified result is written to mat
 *
 * Returns:
 * dest if specified, mat otherwise
 */
mat4.rotateY = function(mat, angle, dest) {
	var s = Math.sin(angle);
	var c = Math.cos(angle);

	// Cache the matrix values (makes for huge speed increases!)
	var a00 = mat[0], a01 = mat[1], a02 = mat[2], a03 = mat[3];
	var a20 = mat[8], a21 = mat[9], a22 = mat[10], a23 = mat[11];

	if(!dest) {
		dest = mat
	} else if(mat != dest) { // If the source and destination differ, copy the unchanged rows
		dest[4] = mat[4];
		dest[5] = mat[5];
		dest[6] = mat[6];
		dest[7] = mat[7];

		dest[12] = mat[12];
		dest[13] = mat[13];
		dest[14] = mat[14];
		dest[15] = mat[15];
	}

	// Perform axis-specific matrix multiplication
	dest[0] = a00*c + a20*-s;
	dest[1] = a01*c + a21*-s;
	dest[2] = a02*c + a22*-s;
	dest[3] = a03*c + a23*-s;

	dest[8] = a00*s + a20*c;
	dest[9] = a01*s + a21*c;
	dest[10] = a02*s + a22*c;
	dest[11] = a03*s + a23*c;
	return dest;
};

/*
 * mat4.rotateZ
 * Rotates a matrix by the given angle around the Z axis
 *
 * Params:
 * mat - mat4 to rotate
 * angle - angle (in radians) to rotate
 * dest - Optional, mat4 receiving operation result. If not specified result is written to mat
 *
 * Returns:
 * dest if specified, mat otherwise
 */
mat4.rotateZ = function(mat, angle, dest) {
	var s = Math.sin(angle);
	var c = Math.cos(angle);

	// Cache the matrix values (makes for huge speed increases!)
	var a00 = mat[0], a01 = mat[1], a02 = mat[2], a03 = mat[3];
	var a10 = mat[4], a11 = mat[5], a12 = mat[6], a13 = mat[7];

	if(!dest) {
		dest = mat
	} else if(mat != dest) { // If the source and destination differ, copy the unchanged last row
		dest[8] = mat[8];
		dest[9] = mat[9];
		dest[10] = mat[10];
		dest[11] = mat[11];

		dest[12] = mat[12];
		dest[13] = mat[13];
		dest[14] = mat[14];
		dest[15] = mat[15];
	}

	// Perform axis-specific matrix multiplication
	dest[0] = a00*c + a10*s;
	dest[1] = a01*c + a11*s;
	dest[2] = a02*c + a12*s;
	dest[3] = a03*c + a13*s;

	dest[4] = a00*-s + a10*c;
	dest[5] = a01*-s + a11*c;
	dest[6] = a02*-s + a12*c;
	dest[7] = a03*-s + a13*c;

	return dest;
};

/*
 * mat4.frustum
 * Generates a frustum matrix with the given bounds
 *
 * Params:
 * left, right - scalar, left and right bounds of the frustum
 * bottom, top - scalar, bottom and top bounds of the frustum
 * near, far - scalar, near and far bounds of the frustum
 * dest - Optional, mat4 frustum matrix will be written into
 *
 * Returns:
 * dest if specified, a new mat4 otherwise
 */
mat4.frustum = function(left, right, bottom, top, near, far, dest) {
	if(!dest) { dest = mat4.create(); }
	var rl = (right - left);
	var tb = (top - bottom);
	var fn = (far - near);
	dest[0] = (near*2) / rl;
	dest[1] = 0;
	dest[2] = 0;
	dest[3] = 0;
	dest[4] = 0;
	dest[5] = (near*2) / tb;
	dest[6] = 0;
	dest[7] = 0;
	dest[8] = (right + left) / rl;
	dest[9] = (top + bottom) / tb;
	dest[10] = -(far + near) / fn;
	dest[11] = -1;
	dest[12] = 0;
	dest[13] = 0;
	dest[14] = -(far*near*2) / fn;
	dest[15] = 0;
	return dest;
};

/*
 * mat4.perspective
 * Generates a perspective projection matrix with the given bounds
 *
 * Params:
 * fovy - scalar, vertical field of view
 * aspect - scalar, aspect ratio. typically viewport width/height
 * near, far - scalar, near and far bounds of the frustum
 * dest - Optional, mat4 frustum matrix will be written into
 *
 * Returns:
 * dest if specified, a new mat4 otherwise
 */
mat4.perspective = function(fovy, aspect, near, far, dest) {
	var top = near*Math.tan(fovy*Math.PI / 360.0);
	var right = top*aspect;
	return mat4.frustum(-right, right, -top, top, near, far, dest);
};

/*
 * mat4.ortho
 * Generates a orthogonal projection matrix with the given bounds
 *
 * Params:
 * left, right - scalar, left and right bounds of the frustum
 * bottom, top - scalar, bottom and top bounds of the frustum
 * near, far - scalar, near and far bounds of the frustum
 * dest - Optional, mat4 frustum matrix will be written into
 *
 * Returns:
 * dest if specified, a new mat4 otherwise
 */
mat4.ortho = function(left, right, bottom, top, near, far, dest) {
	if(!dest) { dest = mat4.create(); }
	var rl = (right - left);
	var tb = (top - bottom);
	var fn = (far - near);
	dest[0] = 2 / rl;
	dest[1] = 0;
	dest[2] = 0;
	dest[3] = 0;
	dest[4] = 0;
	dest[5] = 2 / tb;
	dest[6] = 0;
	dest[7] = 0;
	dest[8] = 0;
	dest[9] = 0;
	dest[10] = -2 / fn;
	dest[11] = 0;
	dest[12] = -(left + right) / rl;
	dest[13] = -(top + bottom) / tb;
	dest[14] = -(far + near) / fn;
	dest[15] = 1;
	return dest;
};

/*
 * mat4.ortho
 * Generates a look-at matrix with the given eye position, focal point, and up axis
 *
 * Params:
 * eye - vec3, position of the viewer
 * center - vec3, point the viewer is looking at
 * up - vec3 pointing "up"
 * dest - Optional, mat4 frustum matrix will be written into
 *
 * Returns:
 * dest if specified, a new mat4 otherwise
 */
mat4.lookAt = function(eye, center, up, dest) {
	if(!dest) { dest = mat4.create(); }

	var eyex = eye[0],
		eyey = eye[1],
		eyez = eye[2],
		upx = up[0],
		upy = up[1],
		upz = up[2],
		centerx = center[0],
		centery = center[1],
		centerz = center[2];

	if (eyex == centerx && eyey == centery && eyez == centerz) {
		return mat4.identity(dest);
	}

	var z0,z1,z2,x0,x1,x2,y0,y1,y2,len;

	//vec3.direction(eye, center, z);
	z0 = eyex - center[0];
	z1 = eyey - center[1];
	z2 = eyez - center[2];

	// normalize (no check needed for 0 because of early return)
	len = 1/Math.sqrt(z0*z0 + z1*z1 + z2*z2);
	z0 *= len;
	z1 *= len;
	z2 *= len;

	//vec3.normalize(vec3.cross(up, z, x));
	x0 = upy*z2 - upz*z1;
	x1 = upz*z0 - upx*z2;
	x2 = upx*z1 - upy*z0;
	len = Math.sqrt(x0*x0 + x1*x1 + x2*x2);
	if (!len) {
		x0 = 0;
		x1 = 0;
		x2 = 0;
	} else {
		len = 1/len;
		x0 *= len;
		x1 *= len;
		x2 *= len;
	};

	//vec3.normalize(vec3.cross(z, x, y));
	y0 = z1*x2 - z2*x1;
	y1 = z2*x0 - z0*x2;
	y2 = z0*x1 - z1*x0;

	len = Math.sqrt(y0*y0 + y1*y1 + y2*y2);
	if (!len) {
		y0 = 0;
		y1 = 0;
		y2 = 0;
	} else {
		len = 1/len;
		y0 *= len;
		y1 *= len;
		y2 *= len;
	}

	dest[0] = x0;
	dest[1] = y0;
	dest[2] = z0;
	dest[3] = 0;
	dest[4] = x1;
	dest[5] = y1;
	dest[6] = z1;
	dest[7] = 0;
	dest[8] = x2;
	dest[9] = y2;
	dest[10] = z2;
	dest[11] = 0;
	dest[12] = -(x0*eyex + x1*eyey + x2*eyez);
	dest[13] = -(y0*eyex + y1*eyey + y2*eyez);
	dest[14] = -(z0*eyex + z1*eyey + z2*eyez);
	dest[15] = 1;

	return dest;
};

/*
 * mat4.str
 * Returns a string representation of a mat4
 *
 * Params:
 * mat - mat4 to represent as a string
 *
 * Returns:
 * string representation of mat
 */
mat4.str = function(mat) {
	return '[' + mat[0] + ', ' + mat[1] + ', ' + mat[2] + ', ' + mat[3] +
		', '+ mat[4] + ', ' + mat[5] + ', ' + mat[6] + ', ' + mat[7] +
		', '+ mat[8] + ', ' + mat[9] + ', ' + mat[10] + ', ' + mat[11] +
		', '+ mat[12] + ', ' + mat[13] + ', ' + mat[14] + ', ' + mat[15] + ']';
};

/*
 * quat4 - Quaternions
 */
quat4 = {};

/*
 * quat4.create
 * Creates a new instance of a quat4 using the default array type
 * Any javascript array containing at least 4 numeric elements can serve as a quat4
 *
 * Params:
 * quat - Optional, quat4 containing values to initialize with
 *
 * Returns:
 * New quat4
 */
quat4.create = function(quat) {
	var dest = new glMatrixArrayType(4);

	if(quat) {
		dest[0] = quat[0];
		dest[1] = quat[1];
		dest[2] = quat[2];
		dest[3] = quat[3];
	}

	return dest;
};

/*
 * quat4.set
 * Copies the values of one quat4 to another
 *
 * Params:
 * quat - quat4 containing values to copy
 * dest - quat4 receiving copied values
 *
 * Returns:
 * dest
 */
quat4.set = function(quat, dest) {
	dest[0] = quat[0];
	dest[1] = quat[1];
	dest[2] = quat[2];
	dest[3] = quat[3];

	return dest;
};

/*
 * quat4.calculateW
 * Calculates the W component of a quat4 from the X, Y, and Z components.
 * Assumes that quaternion is 1 unit in length.
 * Any existing W component will be ignored.
 *
 * Params:
 * quat - quat4 to calculate W component of
 * dest - Optional, quat4 receiving calculated values. If not specified result is written to quat
 *
 * Returns:
 * dest if specified, quat otherwise
 */
quat4.calculateW = function(quat, dest) {
	var x = quat[0], y = quat[1], z = quat[2];

	if(!dest || quat == dest) {
		quat[3] = -Math.sqrt(Math.abs(1.0 - x*x - y*y - z*z));
		return quat;
	}
	dest[0] = x;
	dest[1] = y;
	dest[2] = z;
	dest[3] = -Math.sqrt(Math.abs(1.0 - x*x - y*y - z*z));
	return dest;
}

/*
 * quat4.inverse
 * Calculates the inverse of a quat4
 *
 * Params:
 * quat - quat4 to calculate inverse of
 * dest - Optional, quat4 receiving inverse values. If not specified result is written to quat
 *
 * Returns:
 * dest if specified, quat otherwise
 */
quat4.inverse = function(quat, dest) {
	if(!dest || quat == dest) {
		quat[0] *= -1;
		quat[1] *= -1;
		quat[2] *= -1;
		return quat;
	}
	dest[0] = -quat[0];
	dest[1] = -quat[1];
	dest[2] = -quat[2];
	dest[3] = quat[3];
	return dest;
}

/*
 * quat4.length
 * Calculates the length of a quat4
 *
 * Params:
 * quat - quat4 to calculate length of
 *
 * Returns:
 * Length of quat
 */
quat4.length = function(quat) {
	var x = quat[0], y = quat[1], z = quat[2], w = quat[3];
	return Math.sqrt(x*x + y*y + z*z + w*w);
}

/*
 * quat4.normalize
 * Generates a unit quaternion of the same direction as the provided quat4
 * If quaternion length is 0, returns [0, 0, 0, 0]
 *
 * Params:
 * quat - quat4 to normalize
 * dest - Optional, quat4 receiving operation result. If not specified result is written to quat
 *
 * Returns:
 * dest if specified, quat otherwise
 */
quat4.normalize = function(quat, dest) {
	if(!dest) { dest = quat; }

	var x = quat[0], y = quat[1], z = quat[2], w = quat[3];
	var len = Math.sqrt(x*x + y*y + z*z + w*w);
	if(len == 0) {
		dest[0] = 0;
		dest[1] = 0;
		dest[2] = 0;
		dest[3] = 0;
		return dest;
	}
	len = 1/len;
	dest[0] = x * len;
	dest[1] = y * len;
	dest[2] = z * len;
	dest[3] = w * len;

	return dest;
}

/*
 * quat4.multiply
 * Performs a quaternion multiplication
 *
 * Params:
 * quat - quat4, first operand
 * quat2 - quat4, second operand
 * dest - Optional, quat4 receiving operation result. If not specified result is written to quat
 *
 * Returns:
 * dest if specified, quat otherwise
 */
quat4.multiply = function(quat, quat2, dest) {
	if(!dest) { dest = quat; }

	var qax = quat[0], qay = quat[1], qaz = quat[2], qaw = quat[3];
	var qbx = quat2[0], qby = quat2[1], qbz = quat2[2], qbw = quat2[3];

	dest[0] = qax*qbw + qaw*qbx + qay*qbz - qaz*qby;
	dest[1] = qay*qbw + qaw*qby + qaz*qbx - qax*qbz;
	dest[2] = qaz*qbw + qaw*qbz + qax*qby - qay*qbx;
	dest[3] = qaw*qbw - qax*qbx - qay*qby - qaz*qbz;

	return dest;
}

/*
 * quat4.multiplyVec3
 * Transforms a vec3 with the given quaternion
 *
 * Params:
 * quat - quat4 to transform the vector with
 * vec - vec3 to transform
 * dest - Optional, vec3 receiving operation result. If not specified result is written to vec
 *
 * Returns:
 * dest if specified, vec otherwise
 */
quat4.multiplyVec3 = function(quat, vec, dest) {
	if(!dest) { dest = vec; }

	var x = vec[0], y = vec[1], z = vec[2];
	var qx = quat[0], qy = quat[1], qz = quat[2], qw = quat[3];

	// calculate quat * vec
	var ix = qw*x + qy*z - qz*y;
	var iy = qw*y + qz*x - qx*z;
	var iz = qw*z + qx*y - qy*x;
	var iw = -qx*x - qy*y - qz*z;

	// calculate result * inverse quat
	dest[0] = ix*qw + iw*-qx + iy*-qz - iz*-qy;
	dest[1] = iy*qw + iw*-qy + iz*-qx - ix*-qz;
	dest[2] = iz*qw + iw*-qz + ix*-qy - iy*-qx;

	return dest;
}

/*
 * quat4.toMat3
 * Calculates a 3x3 matrix from the given quat4
 *
 * Params:
 * quat - quat4 to create matrix from
 * dest - Optional, mat3 receiving operation result
 *
 * Returns:
 * dest if specified, a new mat3 otherwise
 */
quat4.toMat3 = function(quat, dest) {
	if(!dest) { dest = mat3.create(); }

	var x = quat[0], y = quat[1], z = quat[2], w = quat[3];

	var x2 = x + x;
	var y2 = y + y;
	var z2 = z + z;

	var xx = x*x2;
	var xy = x*y2;
	var xz = x*z2;

	var yy = y*y2;
	var yz = y*z2;
	var zz = z*z2;

	var wx = w*x2;
	var wy = w*y2;
	var wz = w*z2;

	dest[0] = 1 - (yy + zz);
	dest[1] = xy - wz;
	dest[2] = xz + wy;

	dest[3] = xy + wz;
	dest[4] = 1 - (xx + zz);
	dest[5] = yz - wx;

	dest[6] = xz - wy;
	dest[7] = yz + wx;
	dest[8] = 1 - (xx + yy);

	return dest;
}

/*
 * quat4.toMat4
 * Calculates a 4x4 matrix from the given quat4
 *
 * Params:
 * quat - quat4 to create matrix from
 * dest - Optional, mat4 receiving operation result
 *
 * Returns:
 * dest if specified, a new mat4 otherwise
 */
quat4.toMat4 = function(quat, dest) {
	if(!dest) { dest = mat4.create(); }

	var x = quat[0], y = quat[1], z = quat[2], w = quat[3];

	var x2 = x + x;
	var y2 = y + y;
	var z2 = z + z;

	var xx = x*x2;
	var xy = x*y2;
	var xz = x*z2;

	var yy = y*y2;
	var yz = y*z2;
	var zz = z*z2;

	var wx = w*x2;
	var wy = w*y2;
	var wz = w*z2;

	dest[0] = 1 - (yy + zz);
	dest[1] = xy - wz;
	dest[2] = xz + wy;
	dest[3] = 0;

	dest[4] = xy + wz;
	dest[5] = 1 - (xx + zz);
	dest[6] = yz - wx;
	dest[7] = 0;

	dest[8] = xz - wy;
	dest[9] = yz + wx;
	dest[10] = 1 - (xx + yy);
	dest[11] = 0;

	dest[12] = 0;
	dest[13] = 0;
	dest[14] = 0;
	dest[15] = 1;

	return dest;
}

/*
 * quat4.slerp
 * Performs a spherical linear interpolation between two quat4
 *
 * Params:
 * quat - quat4, first quaternion
 * quat2 - quat4, second quaternion
 * slerp - interpolation amount between the two inputs
 * dest - Optional, quat4 receiving operation result. If not specified result is written to quat
 *
 * Returns:
 * dest if specified, quat otherwise
 */
quat4.slerp = function(quat, quat2, slerp, dest) {
	if(!dest) { dest = quat; }

	var cosHalfTheta =  quat[0]*quat2[0] + quat[1]*quat2[1] + quat[2]*quat2[2] + quat[3]*quat2[3];

	if (Math.abs(cosHalfTheta) >= 1.0){
		if(dest != quat) {
			dest[0] = quat[0];
			dest[1] = quat[1];
			dest[2] = quat[2];
			dest[3] = quat[3];
		}
		return dest;
	}

	var halfTheta = Math.acos(cosHalfTheta);
	var sinHalfTheta = Math.sqrt(1.0 - cosHalfTheta*cosHalfTheta);

	if (Math.abs(sinHalfTheta) < 0.001){
		dest[0] = (quat[0]*0.5 + quat2[0]*0.5);
		dest[1] = (quat[1]*0.5 + quat2[1]*0.5);
		dest[2] = (quat[2]*0.5 + quat2[2]*0.5);
		dest[3] = (quat[3]*0.5 + quat2[3]*0.5);
		return dest;
	}

	var ratioA = Math.sin((1 - slerp)*halfTheta) / sinHalfTheta;
	var ratioB = Math.sin(slerp*halfTheta) / sinHalfTheta;

	dest[0] = (quat[0]*ratioA + quat2[0]*ratioB);
	dest[1] = (quat[1]*ratioA + quat2[1]*ratioB);
	dest[2] = (quat[2]*ratioA + quat2[2]*ratioB);
	dest[3] = (quat[3]*ratioA + quat2[3]*ratioB);

	return dest;
}


/*
 * quat4.str
 * Returns a string representation of a quaternion
 *
 * Params:
 * quat - quat4 to represent as a string
 *
 * Returns:
 * string representation of quat
 */
quat4.str = function(quat) {
	return '[' + quat[0] + ', ' + quat[1] + ', ' + quat[2] + ', ' + quat[3] + ']';
}

medealib._MarkScriptAsLoaded("glMatrix.js");

/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('visualizer',[],function(medealib, undefined) {
	"use strict";
	var medea = this;

	this.Visualizer = medealib.Class.extend({
		name : "",
		ordinal: 0,

		init : function(name) {
			this.name = name || "";
			this.viewports = [];
		},

		GetName : function() {
			return this.name;
		},

		GetOrdinal : function() {
			return this.ordinal;
		},

		Apply : function(render_stub,original_render_stub,rq) {
			// this default visualizer does nothing than to hand the current render
			// function chain over to the next visualizer, if any.
			return render_stub;
		},

		GetViewports : function() {
			return this.viewports;
		},

		_AddViewport : function(vp) {
			if (this.viewports.indexOf(vp) === -1) {
				this.viewports.push(vp);
			}
		},

		_RemoveViewport : function(vis) {
			var idx = this.viewports.indexOf(vis);
			if(idx !== -1) {
				this.viewports.splice(idx,1);
			}
		},
	});

	medea.CreateVisualizer = function(type, name, callback) {

		var modname = 'visualizer_'+type.toLowerCase();
		medea.LoadModules([modname],function() {
			
			callback(medea['CreateVisualizer_' + type](name));
		});
	};
});



/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('entity',[],function(medealib, undefined) {
	"use strict";
	var medea = this;

	var id_source = 0;
	
	
	medea.ENTITY_UPDATE_WAS_REMOVED = 0x8;
	

	medea.Entity = medealib.Class.extend({
		name : "",
		bb : null,
		tag : null,

		// Derived from |bb|
		center : null,
		radius : null,

		init : function(name) {
			this.id = id_source++;
			this.name = name || ("UnnamedEntity_" + this.id);
		},

		Render : function(camera, rqmanager) {
			// At this level of abstraction Render() is empty, deriving classes will substitute their own logic
		},

		Update : function(dtime) {
		},
		
		// Tag() is used with node.RemoveAllEntities() 
		Tag : function(n) {
			if (n === undefined) {
				return this.tag;
			}
			this.tag = n;
		},

		// Note: manually setting the BB of an entity does *not*
		// inform any nodes the entity is attached to.
		//
		// To update nodes, detach the entity from the scenegraph and attach again.
		BB : function(b) {
			if(b === undefined) {
				if(this.bb === null) {
					this._AutoGenBB();
				}
				return this.bb;
			}
			this.bb = b;
		},

		IsUnbounded : function() {
			return this.bb === medea.BB_INFINITE;
		},

		GetRadius : function() {
			if (this.radius == null) {
				this._UpdateRadius();
			}
			return this.radius;
		},

		GetCenter : function() {
			if (this.center == null) {
				this._UpdateCenter();
			}
			return this.center;
		},

		GetWorldBB : function(parent) {
			var bb = this.BB();
			if(!bb) {
				return medea.BB_INFINITE;
			}
			return medea.TransformBB(bb, parent.GetGlobalTransform());
		},


		Cull : function(parent,frustum) {
			return medea.BBInFrustum(frustum, this.GetWorldBB(parent));
		},


		// Note that entities can be attached to multiple nodes by default.
		// deriving classes which do NOT want this, should assert this
		// case in OnAttach().
		OnAttach : function(node) {
		},

		OnDetach : function(node) {
		},


		_AutoGenBB : function() {
			// Deriving classes should supply a more meaningful implementation
			this.bb = medea.BB_INFINITE;
		},

		_UpdateCenter : function() {
			var bb = this.BB();
			if (bb.length === 2) {
				var a = bb[0];
				var b = bb[1];
				this.center = vec3.create([
					(a[0] + b[0]) * 0.5,
					(a[1] + b[1]) * 0.5,
					(a[2] + b[2]) * 0.5
				]);
				return;
			}
			this.center = vec3.create([0, 0, 0]);
		},

		_UpdateRadius : function() {
			var bb = this.BB();
			// Derive bounding radius from the BB. This may not be
			// the tightest-fit sphere.
			if (bb.length === 2) {
				var a = bb[0];
				var b = bb[1];
				this.radius = Math.max(b[0] - a[0], b[1] - a[1], b[2] - a[2]) * 0.5;
				return;
			}

			this.radius = 0.0;
		},
	});

	medea.CreateEntity = function(name) {
		return new medea.Entity(name);
	};
});


/**
 * dat-gui JavaScript Controller Library
 * http://code.google.com/p/dat-gui
 *
 * Copyright 2011 Data Arts Team, Google Creative Lab
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 */
var dat=dat||{};dat.gui=dat.gui||{};dat.utils=dat.utils||{};dat.controllers=dat.controllers||{};dat.dom=dat.dom||{};dat.color=dat.color||{};dat.utils.css=function(){return{load:function(e,a){var a=a||document,c=a.createElement("link");c.type="text/css";c.rel="stylesheet";c.href=e;a.getElementsByTagName("head")[0].appendChild(c)},inject:function(e,a){var a=a||document,c=document.createElement("style");c.type="text/css";c.innerHTML=e;a.getElementsByTagName("head")[0].appendChild(c)}}}();
dat.utils.common=function(){var e=Array.prototype.forEach,a=Array.prototype.slice;return{BREAK:{},extend:function(c){this.each(a.call(arguments,1),function(a){for(var f in a)this.isUndefined(a[f])||(c[f]=a[f])},this);return c},defaults:function(c){this.each(a.call(arguments,1),function(a){for(var f in a)this.isUndefined(c[f])&&(c[f]=a[f])},this);return c},compose:function(){var c=a.call(arguments);return function(){for(var d=a.call(arguments),f=c.length-1;f>=0;f--)d=[c[f].apply(this,d)];return d[0]}},
each:function(a,d,f){if(e&&a.forEach===e)a.forEach(d,f);else if(a.length===a.length+0)for(var b=0,n=a.length;b<n;b++){if(b in a&&d.call(f,a[b],b)===this.BREAK)break}else for(b in a)if(d.call(f,a[b],b)===this.BREAK)break},defer:function(a){setTimeout(a,0)},toArray:function(c){return c.toArray?c.toArray():a.call(c)},isUndefined:function(a){return a===void 0},isNull:function(a){return a===null},isNaN:function(a){return a!==a},isArray:Array.isArray||function(a){return a.constructor===Array},isObject:function(a){return a===
Object(a)},isNumber:function(a){return a===a+0},isString:function(a){return a===a+""},isBoolean:function(a){return a===false||a===true},isFunction:function(a){return Object.prototype.toString.call(a)==="[object Function]"}}}();
dat.controllers.Controller=function(e){var a=function(a,d){this.initialValue=a[d];this.domElement=document.createElement("div");this.object=a;this.property=d;this.__onFinishChange=this.__onChange=void 0};e.extend(a.prototype,{onChange:function(a){this.__onChange=a;return this},onFinishChange:function(a){this.__onFinishChange=a;return this},setValue:function(a){this.object[this.property]=a;this.__onChange&&this.__onChange.call(this,a);this.updateDisplay();return this},getValue:function(){return this.object[this.property]},
updateDisplay:function(){return this},isModified:function(){return this.initialValue!==this.getValue()}});return a}(dat.utils.common);
dat.dom.dom=function(e){function a(b){if(b==="0"||e.isUndefined(b))return 0;b=b.match(d);return!e.isNull(b)?parseFloat(b[1]):0}var c={};e.each({HTMLEvents:["change"],MouseEvents:["click","mousemove","mousedown","mouseup","mouseover"],KeyboardEvents:["keydown"]},function(b,a){e.each(b,function(b){c[b]=a})});var d=/(\d+(\.\d+)?)px/,f={makeSelectable:function(b,a){if(!(b===void 0||b.style===void 0))b.onselectstart=a?function(){return false}:function(){},b.style.MozUserSelect=a?"auto":"none",b.style.KhtmlUserSelect=
a?"auto":"none",b.unselectable=a?"on":"off"},makeFullscreen:function(b,a,d){e.isUndefined(a)&&(a=true);e.isUndefined(d)&&(d=true);b.style.position="absolute";if(a)b.style.left=0,b.style.right=0;if(d)b.style.top=0,b.style.bottom=0},fakeEvent:function(b,a,d,f){var d=d||{},m=c[a];if(!m)throw Error("Event type "+a+" not supported.");var l=document.createEvent(m);switch(m){case "MouseEvents":l.initMouseEvent(a,d.bubbles||false,d.cancelable||true,window,d.clickCount||1,0,0,d.x||d.clientX||0,d.y||d.clientY||
0,false,false,false,false,0,null);break;case "KeyboardEvents":m=l.initKeyboardEvent||l.initKeyEvent;e.defaults(d,{cancelable:true,ctrlKey:false,altKey:false,shiftKey:false,metaKey:false,keyCode:void 0,charCode:void 0});m(a,d.bubbles||false,d.cancelable,window,d.ctrlKey,d.altKey,d.shiftKey,d.metaKey,d.keyCode,d.charCode);break;default:l.initEvent(a,d.bubbles||false,d.cancelable||true)}e.defaults(l,f);b.dispatchEvent(l)},bind:function(b,a,d,c){b.addEventListener?b.addEventListener(a,d,c||false):b.attachEvent&&
b.attachEvent("on"+a,d);return f},unbind:function(b,a,d,c){b.removeEventListener?b.removeEventListener(a,d,c||false):b.detachEvent&&b.detachEvent("on"+a,d);return f},addClass:function(b,a){if(b.className===void 0)b.className=a;else if(b.className!==a){var d=b.className.split(/ +/);if(d.indexOf(a)==-1)d.push(a),b.className=d.join(" ").replace(/^\s+/,"").replace(/\s+$/,"")}return f},removeClass:function(b,a){if(a){if(b.className!==void 0)if(b.className===a)b.removeAttribute("class");else{var d=b.className.split(/ +/),
c=d.indexOf(a);if(c!=-1)d.splice(c,1),b.className=d.join(" ")}}else b.className=void 0;return f},hasClass:function(a,d){return RegExp("(?:^|\\s+)"+d+"(?:\\s+|$)").test(a.className)||false},getWidth:function(b){b=getComputedStyle(b);return a(b["border-left-width"])+a(b["border-right-width"])+a(b["padding-left"])+a(b["padding-right"])+a(b.width)},getHeight:function(b){b=getComputedStyle(b);return a(b["border-top-width"])+a(b["border-bottom-width"])+a(b["padding-top"])+a(b["padding-bottom"])+a(b.height)},
getOffset:function(a){var d={left:0,top:0};if(a.offsetParent){do d.left+=a.offsetLeft,d.top+=a.offsetTop;while(a=a.offsetParent)}return d},isActive:function(a){return a===document.activeElement&&(a.type||a.href)}};return f}(dat.utils.common);
dat.controllers.OptionController=function(e,a,c){var d=function(f,b,e){d.superclass.call(this,f,b);var h=this;this.__select=document.createElement("select");if(c.isArray(e)){var j={};c.each(e,function(a){j[a]=a});e=j}c.each(e,function(a,b){var d=document.createElement("option");d.innerHTML=b;d.setAttribute("value",a);h.__select.appendChild(d)});this.updateDisplay();a.bind(this.__select,"change",function(){h.setValue(this.options[this.selectedIndex].value)});this.domElement.appendChild(this.__select)};
d.superclass=e;c.extend(d.prototype,e.prototype,{setValue:function(a){a=d.superclass.prototype.setValue.call(this,a);this.__onFinishChange&&this.__onFinishChange.call(this,this.getValue());return a},updateDisplay:function(){this.__select.value=this.getValue();return d.superclass.prototype.updateDisplay.call(this)}});return d}(dat.controllers.Controller,dat.dom.dom,dat.utils.common);
dat.controllers.NumberController=function(e,a){var c=function(d,f,b){c.superclass.call(this,d,f);b=b||{};this.__min=b.min;this.__max=b.max;this.__step=b.step;d=this.__impliedStep=a.isUndefined(this.__step)?this.initialValue==0?1:Math.pow(10,Math.floor(Math.log(this.initialValue)/Math.LN10))/10:this.__step;d=d.toString();this.__precision=d.indexOf(".")>-1?d.length-d.indexOf(".")-1:0};c.superclass=e;a.extend(c.prototype,e.prototype,{setValue:function(a){if(this.__min!==void 0&&a<this.__min)a=this.__min;
else if(this.__max!==void 0&&a>this.__max)a=this.__max;this.__step!==void 0&&a%this.__step!=0&&(a=Math.round(a/this.__step)*this.__step);return c.superclass.prototype.setValue.call(this,a)},min:function(a){this.__min=a;return this},max:function(a){this.__max=a;return this},step:function(a){this.__step=a;return this}});return c}(dat.controllers.Controller,dat.utils.common);
dat.controllers.NumberControllerBox=function(e,a,c){var d=function(f,b,e){function h(){var a=parseFloat(l.__input.value);c.isNaN(a)||l.setValue(a)}function j(a){var b=o-a.clientY;l.setValue(l.getValue()+b*l.__impliedStep);o=a.clientY}function m(){a.unbind(window,"mousemove",j);a.unbind(window,"mouseup",m)}this.__truncationSuspended=false;d.superclass.call(this,f,b,e);var l=this,o;this.__input=document.createElement("input");this.__input.setAttribute("type","text");a.bind(this.__input,"change",h);
a.bind(this.__input,"blur",function(){h();l.__onFinishChange&&l.__onFinishChange.call(l,l.getValue())});a.bind(this.__input,"mousedown",function(b){a.bind(window,"mousemove",j);a.bind(window,"mouseup",m);o=b.clientY});a.bind(this.__input,"keydown",function(a){if(a.keyCode===13)l.__truncationSuspended=true,this.blur(),l.__truncationSuspended=false});this.updateDisplay();this.domElement.appendChild(this.__input)};d.superclass=e;c.extend(d.prototype,e.prototype,{updateDisplay:function(){var a=this.__input,
b;if(this.__truncationSuspended)b=this.getValue();else{b=this.getValue();var c=Math.pow(10,this.__precision);b=Math.round(b*c)/c}a.value=b;return d.superclass.prototype.updateDisplay.call(this)}});return d}(dat.controllers.NumberController,dat.dom.dom,dat.utils.common);
dat.controllers.NumberControllerSlider=function(e,a,c,d,f){var b=function(d,c,f,e,l){function o(b){b.preventDefault();var d=a.getOffset(g.__background),c=a.getWidth(g.__background);g.setValue(g.__min+(g.__max-g.__min)*((b.clientX-d.left)/(d.left+c-d.left)));return false}function y(){a.unbind(window,"mousemove",o);a.unbind(window,"mouseup",y);g.__onFinishChange&&g.__onFinishChange.call(g,g.getValue())}b.superclass.call(this,d,c,{min:f,max:e,step:l});var g=this;this.__background=document.createElement("div");
this.__foreground=document.createElement("div");a.bind(this.__background,"mousedown",function(b){a.bind(window,"mousemove",o);a.bind(window,"mouseup",y);o(b)});a.addClass(this.__background,"slider");a.addClass(this.__foreground,"slider-fg");this.updateDisplay();this.__background.appendChild(this.__foreground);this.domElement.appendChild(this.__background)};b.superclass=e;b.useDefaultStyles=function(){c.inject(f)};d.extend(b.prototype,e.prototype,{updateDisplay:function(){this.__foreground.style.width=
(this.getValue()-this.__min)/(this.__max-this.__min)*100+"%";return b.superclass.prototype.updateDisplay.call(this)}});return b}(dat.controllers.NumberController,dat.dom.dom,dat.utils.css,dat.utils.common,".slider {\n  box-shadow: inset 0 2px 4px rgba(0,0,0,0.15);\n  height: 1em;\n  border-radius: 1em;\n  background-color: #eee;\n  padding: 0 0.5em;\n  overflow: hidden;\n}\n\n.slider-fg {\n  padding: 1px 0 2px 0;\n  background-color: #aaa;\n  height: 1em;\n  margin-left: -0.5em;\n  padding-right: 0.5em;\n  border-radius: 1em 0 0 1em;\n}\n\n.slider-fg:after {\n  display: inline-block;\n  border-radius: 1em;\n  background-color: #fff;\n  border:  1px solid #aaa;\n  content: '';\n  float: right;\n  margin-right: -1em;\n  margin-top: -1px;\n  height: 0.9em;\n  width: 0.9em;\n}");
dat.controllers.FunctionController=function(e,a,c){var d=function(c,b,e){d.superclass.call(this,c,b);var h=this;this.__button=document.createElement("div");this.__button.innerHTML=e===void 0?"Fire":e;a.bind(this.__button,"click",function(a){a.preventDefault();h.fire();return false});a.addClass(this.__button,"button");this.domElement.appendChild(this.__button)};d.superclass=e;c.extend(d.prototype,e.prototype,{fire:function(){this.__onChange&&this.__onChange.call(this);this.__onFinishChange&&this.__onFinishChange.call(this,
this.getValue());this.getValue().call(this.object)}});return d}(dat.controllers.Controller,dat.dom.dom,dat.utils.common);
dat.controllers.BooleanController=function(e,a,c){var d=function(c,b){d.superclass.call(this,c,b);var e=this;this.__prev=this.getValue();this.__checkbox=document.createElement("input");this.__checkbox.setAttribute("type","checkbox");a.bind(this.__checkbox,"change",function(){e.setValue(!e.__prev)},false);this.domElement.appendChild(this.__checkbox);this.updateDisplay()};d.superclass=e;c.extend(d.prototype,e.prototype,{setValue:function(a){a=d.superclass.prototype.setValue.call(this,a);this.__onFinishChange&&
this.__onFinishChange.call(this,this.getValue());this.__prev=this.getValue();return a},updateDisplay:function(){this.getValue()===true?(this.__checkbox.setAttribute("checked","checked"),this.__checkbox.checked=true):this.__checkbox.checked=false;return d.superclass.prototype.updateDisplay.call(this)}});return d}(dat.controllers.Controller,dat.dom.dom,dat.utils.common);
dat.color.toString=function(e){return function(a){if(a.a==1||e.isUndefined(a.a)){for(a=a.hex.toString(16);a.length<6;)a="0"+a;return"#"+a}else return"rgba("+Math.round(a.r)+","+Math.round(a.g)+","+Math.round(a.b)+","+a.a+")"}}(dat.utils.common);
dat.color.interpret=function(e,a){var c,d,f=[{litmus:a.isString,conversions:{THREE_CHAR_HEX:{read:function(a){a=a.match(/^#([A-F0-9])([A-F0-9])([A-F0-9])$/i);return a===null?false:{space:"HEX",hex:parseInt("0x"+a[1].toString()+a[1].toString()+a[2].toString()+a[2].toString()+a[3].toString()+a[3].toString())}},write:e},SIX_CHAR_HEX:{read:function(a){a=a.match(/^#([A-F0-9]{6})$/i);return a===null?false:{space:"HEX",hex:parseInt("0x"+a[1].toString())}},write:e},CSS_RGB:{read:function(a){a=a.match(/^rgb\(\s*(.+)\s*,\s*(.+)\s*,\s*(.+)\s*\)/);
return a===null?false:{space:"RGB",r:parseFloat(a[1]),g:parseFloat(a[2]),b:parseFloat(a[3])}},write:e},CSS_RGBA:{read:function(a){a=a.match(/^rgba\(\s*(.+)\s*,\s*(.+)\s*,\s*(.+)\s*\,\s*(.+)\s*\)/);return a===null?false:{space:"RGB",r:parseFloat(a[1]),g:parseFloat(a[2]),b:parseFloat(a[3]),a:parseFloat(a[4])}},write:e}}},{litmus:a.isNumber,conversions:{HEX:{read:function(a){return{space:"HEX",hex:a,conversionName:"HEX"}},write:function(a){return a.hex}}}},{litmus:a.isArray,conversions:{RGB_ARRAY:{read:function(a){return a.length!=
3?false:{space:"RGB",r:a[0],g:a[1],b:a[2]}},write:function(a){return[a.r,a.g,a.b]}},RGBA_ARRAY:{read:function(a){return a.length!=4?false:{space:"RGB",r:a[0],g:a[1],b:a[2],a:a[3]}},write:function(a){return[a.r,a.g,a.b,a.a]}}}},{litmus:a.isObject,conversions:{RGBA_OBJ:{read:function(b){return a.isNumber(b.r)&&a.isNumber(b.g)&&a.isNumber(b.b)&&a.isNumber(b.a)?{space:"RGB",r:b.r,g:b.g,b:b.b,a:b.a}:false},write:function(a){return{r:a.r,g:a.g,b:a.b,a:a.a}}},RGB_OBJ:{read:function(b){return a.isNumber(b.r)&&
a.isNumber(b.g)&&a.isNumber(b.b)?{space:"RGB",r:b.r,g:b.g,b:b.b}:false},write:function(a){return{r:a.r,g:a.g,b:a.b}}},HSVA_OBJ:{read:function(b){return a.isNumber(b.h)&&a.isNumber(b.s)&&a.isNumber(b.v)&&a.isNumber(b.a)?{space:"HSV",h:b.h,s:b.s,v:b.v,a:b.a}:false},write:function(a){return{h:a.h,s:a.s,v:a.v,a:a.a}}},HSV_OBJ:{read:function(b){return a.isNumber(b.h)&&a.isNumber(b.s)&&a.isNumber(b.v)?{space:"HSV",h:b.h,s:b.s,v:b.v}:false},write:function(a){return{h:a.h,s:a.s,v:a.v}}}}}];return function(){d=
false;var b=arguments.length>1?a.toArray(arguments):arguments[0];a.each(f,function(e){if(e.litmus(b))return a.each(e.conversions,function(e,f){c=e.read(b);if(d===false&&c!==false)return d=c,c.conversionName=f,c.conversion=e,a.BREAK}),a.BREAK});return d}}(dat.color.toString,dat.utils.common);
dat.GUI=dat.gui.GUI=function(e,a,c,d,f,b,n,h,j,m,l,o,y,g,i){function q(a,b,r,c){if(b[r]===void 0)throw Error("Object "+b+' has no property "'+r+'"');c.color?b=new l(b,r):(b=[b,r].concat(c.factoryArgs),b=d.apply(a,b));if(c.before instanceof f)c.before=c.before.__li;t(a,b);g.addClass(b.domElement,"c");r=document.createElement("span");g.addClass(r,"property-name");r.innerHTML=b.property;var e=document.createElement("div");e.appendChild(r);e.appendChild(b.domElement);c=s(a,e,c.before);g.addClass(c,k.CLASS_CONTROLLER_ROW);
g.addClass(c,typeof b.getValue());p(a,c,b);a.__controllers.push(b);return b}function s(a,b,d){var c=document.createElement("li");b&&c.appendChild(b);d?a.__ul.insertBefore(c,params.before):a.__ul.appendChild(c);a.onResize();return c}function p(a,d,c){c.__li=d;c.__gui=a;i.extend(c,{options:function(b){if(arguments.length>1)return c.remove(),q(a,c.object,c.property,{before:c.__li.nextElementSibling,factoryArgs:[i.toArray(arguments)]});if(i.isArray(b)||i.isObject(b))return c.remove(),q(a,c.object,c.property,
{before:c.__li.nextElementSibling,factoryArgs:[b]})},name:function(a){c.__li.firstElementChild.firstElementChild.innerHTML=a;return c},listen:function(){c.__gui.listen(c);return c},remove:function(){c.__gui.remove(c);return c}});if(c instanceof j){var e=new h(c.object,c.property,{min:c.__min,max:c.__max,step:c.__step});i.each(["updateDisplay","onChange","onFinishChange"],function(a){var b=c[a],H=e[a];c[a]=e[a]=function(){var a=Array.prototype.slice.call(arguments);b.apply(c,a);return H.apply(e,a)}});
g.addClass(d,"has-slider");c.domElement.insertBefore(e.domElement,c.domElement.firstElementChild)}else if(c instanceof h){var f=function(b){return i.isNumber(c.__min)&&i.isNumber(c.__max)?(c.remove(),q(a,c.object,c.property,{before:c.__li.nextElementSibling,factoryArgs:[c.__min,c.__max,c.__step]})):b};c.min=i.compose(f,c.min);c.max=i.compose(f,c.max)}else if(c instanceof b)g.bind(d,"click",function(){g.fakeEvent(c.__checkbox,"click")}),g.bind(c.__checkbox,"click",function(a){a.stopPropagation()});
else if(c instanceof n)g.bind(d,"click",function(){g.fakeEvent(c.__button,"click")}),g.bind(d,"mouseover",function(){g.addClass(c.__button,"hover")}),g.bind(d,"mouseout",function(){g.removeClass(c.__button,"hover")});else if(c instanceof l)g.addClass(d,"color"),c.updateDisplay=i.compose(function(a){d.style.borderLeftColor=c.__color.toString();return a},c.updateDisplay),c.updateDisplay();c.setValue=i.compose(function(b){a.getRoot().__preset_select&&c.isModified()&&B(a.getRoot(),true);return b},c.setValue)}
function t(a,b){var c=a.getRoot(),d=c.__rememberedObjects.indexOf(b.object);if(d!=-1){var e=c.__rememberedObjectIndecesToControllers[d];e===void 0&&(e={},c.__rememberedObjectIndecesToControllers[d]=e);e[b.property]=b;if(c.load&&c.load.remembered){c=c.load.remembered;if(c[a.preset])c=c[a.preset];else if(c[w])c=c[w];else return;if(c[d]&&c[d][b.property]!==void 0)d=c[d][b.property],b.initialValue=d,b.setValue(d)}}}function I(a){var b=a.__save_row=document.createElement("li");g.addClass(a.domElement,
"has-save");a.__ul.insertBefore(b,a.__ul.firstChild);g.addClass(b,"save-row");var c=document.createElement("span");c.innerHTML="&nbsp;";g.addClass(c,"button gears");var d=document.createElement("span");d.innerHTML="Save";g.addClass(d,"button");g.addClass(d,"save");var e=document.createElement("span");e.innerHTML="New";g.addClass(e,"button");g.addClass(e,"save-as");var f=document.createElement("span");f.innerHTML="Revert";g.addClass(f,"button");g.addClass(f,"revert");var m=a.__preset_select=document.createElement("select");
a.load&&a.load.remembered?i.each(a.load.remembered,function(b,c){C(a,c,c==a.preset)}):C(a,w,false);g.bind(m,"change",function(){for(var b=0;b<a.__preset_select.length;b++)a.__preset_select[b].innerHTML=a.__preset_select[b].value;a.preset=this.value});b.appendChild(m);b.appendChild(c);b.appendChild(d);b.appendChild(e);b.appendChild(f);if(u){var b=document.getElementById("dg-save-locally"),l=document.getElementById("dg-local-explain");b.style.display="block";b=document.getElementById("dg-local-storage");
localStorage.getItem(document.location.href+".isLocal")==="true"&&b.setAttribute("checked","checked");var o=function(){l.style.display=a.useLocalStorage?"block":"none"};o();g.bind(b,"change",function(){a.useLocalStorage=!a.useLocalStorage;o()})}var h=document.getElementById("dg-new-constructor");g.bind(h,"keydown",function(a){a.metaKey&&(a.which===67||a.keyCode==67)&&x.hide()});g.bind(c,"click",function(){h.innerHTML=JSON.stringify(a.getSaveObject(),void 0,2);x.show();h.focus();h.select()});g.bind(d,
"click",function(){a.save()});g.bind(e,"click",function(){var b=prompt("Enter a new preset name.");b&&a.saveAs(b)});g.bind(f,"click",function(){a.revert()})}function J(a){function b(f){f.preventDefault();e=f.clientX;g.addClass(a.__closeButton,k.CLASS_DRAG);g.bind(window,"mousemove",c);g.bind(window,"mouseup",d);return false}function c(b){b.preventDefault();a.width+=e-b.clientX;a.onResize();e=b.clientX;return false}function d(){g.removeClass(a.__closeButton,k.CLASS_DRAG);g.unbind(window,"mousemove",
c);g.unbind(window,"mouseup",d)}a.__resize_handle=document.createElement("div");i.extend(a.__resize_handle.style,{width:"6px",marginLeft:"-3px",height:"200px",cursor:"ew-resize",position:"absolute"});var e;g.bind(a.__resize_handle,"mousedown",b);g.bind(a.__closeButton,"mousedown",b);a.domElement.insertBefore(a.__resize_handle,a.domElement.firstElementChild)}function D(a,b){a.domElement.style.width=b+"px";if(a.__save_row&&a.autoPlace)a.__save_row.style.width=b+"px";if(a.__closeButton)a.__closeButton.style.width=
b+"px"}function z(a,b){var c={};i.each(a.__rememberedObjects,function(d,e){var f={};i.each(a.__rememberedObjectIndecesToControllers[e],function(a,c){f[c]=b?a.initialValue:a.getValue()});c[e]=f});return c}function C(a,b,c){var d=document.createElement("option");d.innerHTML=b;d.value=b;a.__preset_select.appendChild(d);if(c)a.__preset_select.selectedIndex=a.__preset_select.length-1}function B(a,b){var c=a.__preset_select[a.__preset_select.selectedIndex];c.innerHTML=b?c.value+"*":c.value}function E(a){a.length!=
0&&o(function(){E(a)});i.each(a,function(a){a.updateDisplay()})}e.inject(c);var w="Default",u;try{u="localStorage"in window&&window.localStorage!==null}catch(K){u=false}var x,F=true,v,A=false,G=[],k=function(a){function b(){localStorage.setItem(document.location.href+".gui",JSON.stringify(d.getSaveObject()))}function c(){var a=d.getRoot();a.width+=1;i.defer(function(){a.width-=1})}var d=this;this.domElement=document.createElement("div");this.__ul=document.createElement("ul");this.domElement.appendChild(this.__ul);
g.addClass(this.domElement,"dg");this.__folders={};this.__controllers=[];this.__rememberedObjects=[];this.__rememberedObjectIndecesToControllers=[];this.__listening=[];a=a||{};a=i.defaults(a,{autoPlace:true,width:k.DEFAULT_WIDTH});a=i.defaults(a,{resizable:a.autoPlace,hideable:a.autoPlace});if(i.isUndefined(a.load))a.load={preset:w};else if(a.preset)a.load.preset=a.preset;i.isUndefined(a.parent)&&a.hideable&&G.push(this);a.resizable=i.isUndefined(a.parent)&&a.resizable;if(a.autoPlace&&i.isUndefined(a.scrollable))a.scrollable=
true;var e=u&&localStorage.getItem(document.location.href+".isLocal")==="true";Object.defineProperties(this,{parent:{get:function(){return a.parent}},scrollable:{get:function(){return a.scrollable}},autoPlace:{get:function(){return a.autoPlace}},preset:{get:function(){return d.parent?d.getRoot().preset:a.load.preset},set:function(b){d.parent?d.getRoot().preset=b:a.load.preset=b;for(b=0;b<this.__preset_select.length;b++)if(this.__preset_select[b].value==this.preset)this.__preset_select.selectedIndex=
b;d.revert()}},width:{get:function(){return a.width},set:function(b){a.width=b;D(d,b)}},name:{get:function(){return a.name},set:function(b){a.name=b;if(m)m.innerHTML=a.name}},closed:{get:function(){return a.closed},set:function(b){a.closed=b;a.closed?g.addClass(d.__ul,k.CLASS_CLOSED):g.removeClass(d.__ul,k.CLASS_CLOSED);this.onResize();if(d.__closeButton)d.__closeButton.innerHTML=b?k.TEXT_OPEN:k.TEXT_CLOSED}},load:{get:function(){return a.load}},useLocalStorage:{get:function(){return e},set:function(a){u&&
((e=a)?g.bind(window,"unload",b):g.unbind(window,"unload",b),localStorage.setItem(document.location.href+".isLocal",a))}}});if(i.isUndefined(a.parent)){a.closed=false;g.addClass(this.domElement,k.CLASS_MAIN);g.makeSelectable(this.domElement,false);if(u&&e){d.useLocalStorage=true;var f=localStorage.getItem(document.location.href+".gui");if(f)a.load=JSON.parse(f)}this.__closeButton=document.createElement("div");this.__closeButton.innerHTML=k.TEXT_CLOSED;g.addClass(this.__closeButton,k.CLASS_CLOSE_BUTTON);
this.domElement.appendChild(this.__closeButton);g.bind(this.__closeButton,"click",function(){d.closed=!d.closed})}else{if(a.closed===void 0)a.closed=true;var m=document.createTextNode(a.name);g.addClass(m,"controller-name");f=s(d,m);g.addClass(this.__ul,k.CLASS_CLOSED);g.addClass(f,"title");g.bind(f,"click",function(a){a.preventDefault();d.closed=!d.closed;return false});if(!a.closed)this.closed=false}a.autoPlace&&(i.isUndefined(a.parent)&&(F&&(v=document.createElement("div"),g.addClass(v,"dg"),g.addClass(v,
k.CLASS_AUTO_PLACE_CONTAINER),document.body.appendChild(v),F=false),v.appendChild(this.domElement),g.addClass(this.domElement,k.CLASS_AUTO_PLACE)),this.parent||D(d,a.width));g.bind(window,"resize",function(){d.onResize()});g.bind(this.__ul,"webkitTransitionEnd",function(){d.onResize()});g.bind(this.__ul,"transitionend",function(){d.onResize()});g.bind(this.__ul,"oTransitionEnd",function(){d.onResize()});this.onResize();a.resizable&&J(this);d.getRoot();a.parent||c()};k.toggleHide=function(){A=!A;i.each(G,
function(a){a.domElement.style.zIndex=A?-999:999;a.domElement.style.opacity=A?0:1})};k.CLASS_AUTO_PLACE="a";k.CLASS_AUTO_PLACE_CONTAINER="ac";k.CLASS_MAIN="main";k.CLASS_CONTROLLER_ROW="cr";k.CLASS_TOO_TALL="taller-than-window";k.CLASS_CLOSED="closed";k.CLASS_CLOSE_BUTTON="close-button";k.CLASS_DRAG="drag";k.DEFAULT_WIDTH=245;k.TEXT_CLOSED="Close Controls";k.TEXT_OPEN="Open Controls";g.bind(window,"keydown",function(a){document.activeElement.type!=="text"&&(a.which===72||a.keyCode==72)&&k.toggleHide()},
false);i.extend(k.prototype,{add:function(a,b){return q(this,a,b,{factoryArgs:Array.prototype.slice.call(arguments,2)})},addColor:function(a,b){return q(this,a,b,{color:true})},remove:function(a){this.__ul.removeChild(a.__li);this.__controllers.slice(this.__controllers.indexOf(a),1);var b=this;i.defer(function(){b.onResize()})},destroy:function(){this.autoPlace&&v.removeChild(this.domElement)},addFolder:function(a){if(this.__folders[a]!==void 0)throw Error('You already have a folder in this GUI by the name "'+
a+'"');var b={name:a,parent:this};b.autoPlace=this.autoPlace;if(this.load&&this.load.folders&&this.load.folders[a])b.closed=this.load.folders[a].closed,b.load=this.load.folders[a];b=new k(b);this.__folders[a]=b;a=s(this,b.domElement);g.addClass(a,"folder");return b},open:function(){this.closed=false},close:function(){this.closed=true},onResize:function(){var a=this.getRoot();if(a.scrollable){var b=g.getOffset(a.__ul).top,c=0;i.each(a.__ul.childNodes,function(b){a.autoPlace&&b===a.__save_row||(c+=
g.getHeight(b))});window.innerHeight-b-20<c?(g.addClass(a.domElement,k.CLASS_TOO_TALL),a.__ul.style.height=window.innerHeight-b-20+"px"):(g.removeClass(a.domElement,k.CLASS_TOO_TALL),a.__ul.style.height="auto")}a.__resize_handle&&i.defer(function(){a.__resize_handle.style.height=a.__ul.offsetHeight+"px"});if(a.__closeButton)a.__closeButton.style.width=a.width+"px"},remember:function(){if(i.isUndefined(x))x=new y,x.domElement.innerHTML=a;if(this.parent)throw Error("You can only call remember on a top level GUI.");
var b=this;i.each(Array.prototype.slice.call(arguments),function(a){b.__rememberedObjects.length==0&&I(b);b.__rememberedObjects.indexOf(a)==-1&&b.__rememberedObjects.push(a)});this.autoPlace&&D(this,this.width)},getRoot:function(){for(var a=this;a.parent;)a=a.parent;return a},getSaveObject:function(){var a=this.load;a.closed=this.closed;if(this.__rememberedObjects.length>0){a.preset=this.preset;if(!a.remembered)a.remembered={};a.remembered[this.preset]=z(this)}a.folders={};i.each(this.__folders,function(b,
c){a.folders[c]=b.getSaveObject()});return a},save:function(){if(!this.load.remembered)this.load.remembered={};this.load.remembered[this.preset]=z(this);B(this,false)},saveAs:function(a){if(!this.load.remembered)this.load.remembered={},this.load.remembered[w]=z(this,true);this.load.remembered[a]=z(this);this.preset=a;C(this,a,true)},revert:function(a){i.each(this.__controllers,function(b){this.getRoot().load.remembered?t(a||this.getRoot(),b):b.setValue(b.initialValue)},this);i.each(this.__folders,
function(a){a.revert(a)});a||B(this.getRoot(),false)},listen:function(a){var b=this.__listening.length==0;this.__listening.push(a);b&&E(this.__listening)}});return k}(dat.utils.css,'<div id="dg-save" class="dg dialogue">\n\n  Here\'s the new load parameter for your <code>GUI</code>\'s constructor:\n\n  <textarea id="dg-new-constructor"></textarea>\n\n  <div id="dg-save-locally">\n\n    <input id="dg-local-storage" type="checkbox"/> Automatically save\n    values to <code>localStorage</code> on exit.\n\n    <div id="dg-local-explain">The values saved to <code>localStorage</code> will\n      override those passed to <code>dat.GUI</code>\'s constructor. This makes it\n      easier to work incrementally, but <code>localStorage</code> is fragile,\n      and your friends may not see the same values you do.\n      \n    </div>\n    \n  </div>\n\n</div>',
".dg ul{list-style:none;margin:0;padding:0;width:100%;clear:both}.dg.ac{position:fixed;top:0;left:0;right:0;height:0;z-index:0}.dg:not(.ac) .main{overflow:hidden}.dg.main{-webkit-transition:opacity 0.1s linear;-o-transition:opacity 0.1s linear;-moz-transition:opacity 0.1s linear;transition:opacity 0.1s linear}.dg.main.taller-than-window{overflow-y:auto}.dg.main.taller-than-window .close-button{opacity:1;margin-top:-1px;border-top:1px solid #2c2c2c}.dg.main ul.closed .close-button{opacity:1 !important}.dg.main:hover .close-button,.dg.main .close-button.drag{opacity:1}.dg.main .close-button{-webkit-transition:opacity 0.1s linear;-o-transition:opacity 0.1s linear;-moz-transition:opacity 0.1s linear;transition:opacity 0.1s linear;border:0;position:absolute;line-height:19px;height:20px;cursor:pointer;text-align:center;background-color:#000}.dg.main .close-button:hover{background-color:#111}.dg.a{float:right;margin-right:15px;overflow-x:hidden}.dg.a.has-save ul{margin-top:27px}.dg.a.has-save ul.closed{margin-top:0}.dg.a .save-row{position:fixed;top:0;z-index:1002}.dg li{-webkit-transition:height 0.1s ease-out;-o-transition:height 0.1s ease-out;-moz-transition:height 0.1s ease-out;transition:height 0.1s ease-out}.dg li:not(.folder){cursor:auto;height:27px;line-height:27px;overflow:hidden;padding:0 4px 0 5px}.dg li.folder{padding:0;border-left:4px solid rgba(0,0,0,0)}.dg li.title{cursor:pointer;margin-left:-4px}.dg .closed li:not(.title),.dg .closed ul li,.dg .closed ul li > *{height:0;overflow:hidden;border:0}.dg .cr{clear:both;padding-left:3px;height:27px}.dg .property-name{cursor:default;float:left;clear:left;width:40%;overflow:hidden;text-overflow:ellipsis}.dg .c{float:left;width:60%}.dg .c input[type=text]{border:0;margin-top:4px;padding:3px;width:100%;float:right}.dg .has-slider input[type=text]{width:30%;margin-left:0}.dg .slider{float:left;width:66%;margin-left:-5px;margin-right:0;height:19px;margin-top:4px}.dg .slider-fg{height:100%}.dg .c input[type=checkbox]{margin-top:9px}.dg .c select{margin-top:5px}.dg .cr.function,.dg .cr.function .property-name,.dg .cr.function *,.dg .cr.boolean,.dg .cr.boolean *{cursor:pointer}.dg .selector{display:none;position:absolute;margin-left:-9px;margin-top:23px;z-index:10}.dg .c:hover .selector,.dg .selector.drag{display:block}.dg li.save-row{padding:0}.dg li.save-row .button{display:inline-block;padding:0px 6px}.dg.dialogue{background-color:#222;width:460px;padding:15px;font-size:13px;line-height:15px}#dg-new-constructor{padding:10px;color:#222;font-family:Monaco, monospace;font-size:10px;border:0;resize:none;box-shadow:inset 1px 1px 1px #888;word-wrap:break-word;margin:12px 0;display:block;width:440px;overflow-y:scroll;height:100px;position:relative}#dg-local-explain{display:none;font-size:11px;line-height:17px;border-radius:3px;background-color:#333;padding:8px;margin-top:10px}#dg-local-explain code{font-size:10px}#dat-gui-save-locally{display:none}.dg{color:#eee;font:11px 'Lucida Grande', sans-serif;text-shadow:0 -1px 0 #111}.dg.main::-webkit-scrollbar{width:5px;background:#1a1a1a}.dg.main::-webkit-scrollbar-corner{height:0;display:none}.dg.main::-webkit-scrollbar-thumb{border-radius:5px;background:#676767}.dg li:not(.folder){background:#1a1a1a;border-bottom:1px solid #2c2c2c}.dg li.save-row{line-height:25px;background:#dad5cb;border:0}.dg li.save-row select{margin-left:5px;width:108px}.dg li.save-row .button{margin-left:5px;margin-top:1px;border-radius:2px;font-size:9px;line-height:7px;padding:4px 4px 5px 4px;background:#c5bdad;color:#fff;text-shadow:0 1px 0 #b0a58f;box-shadow:0 -1px 0 #b0a58f;cursor:pointer}.dg li.save-row .button.gears{background:#c5bdad url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAsAAAANCAYAAAB/9ZQ7AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAQJJREFUeNpiYKAU/P//PwGIC/ApCABiBSAW+I8AClAcgKxQ4T9hoMAEUrxx2QSGN6+egDX+/vWT4e7N82AMYoPAx/evwWoYoSYbACX2s7KxCxzcsezDh3evFoDEBYTEEqycggWAzA9AuUSQQgeYPa9fPv6/YWm/Acx5IPb7ty/fw+QZblw67vDs8R0YHyQhgObx+yAJkBqmG5dPPDh1aPOGR/eugW0G4vlIoTIfyFcA+QekhhHJhPdQxbiAIguMBTQZrPD7108M6roWYDFQiIAAv6Aow/1bFwXgis+f2LUAynwoIaNcz8XNx3Dl7MEJUDGQpx9gtQ8YCueB+D26OECAAQDadt7e46D42QAAAABJRU5ErkJggg==) 2px 1px no-repeat;height:7px;width:8px}.dg li.save-row .button:hover{background-color:#bab19e;box-shadow:0 -1px 0 #b0a58f}.dg li.folder{border-bottom:0}.dg li.title{padding-left:16px;background:#000 url(data:image/gif;base64,R0lGODlhBQAFAJEAAP////Pz8////////yH5BAEAAAIALAAAAAAFAAUAAAIIlI+hKgFxoCgAOw==) 6px 10px no-repeat;cursor:pointer;border-bottom:1px solid rgba(255,255,255,0.2)}.dg .closed li.title{background-image:url(data:image/gif;base64,R0lGODlhBQAFAJEAAP////Pz8////////yH5BAEAAAIALAAAAAAFAAUAAAIIlGIWqMCbWAEAOw==)}.dg .cr.boolean{border-left:3px solid #806787}.dg .cr.function{border-left:3px solid #e61d5f}.dg .cr.number{border-left:3px solid #2fa1d6}.dg .cr.number input[type=text]{color:#2fa1d6}.dg .cr.string{border-left:3px solid #1ed36f}.dg .cr.string input[type=text]{color:#1ed36f}.dg .cr.function:hover,.dg .cr.boolean:hover{background:#111}.dg .c input[type=text]{background:#303030;outline:none}.dg .c input[type=text]:hover{background:#3c3c3c}.dg .c input[type=text]:focus{background:#494949;color:#fff}.dg .c .slider{background:#303030;cursor:ew-resize}.dg .c .slider-fg{background:#2fa1d6}.dg .c .slider:hover{background:#3c3c3c}.dg .c .slider:hover .slider-fg{background:#44abda}\n",
dat.controllers.factory=function(e,a,c,d,f,b,n){return function(h,j,m,l){var o=h[j];if(n.isArray(m)||n.isObject(m))return new e(h,j,m);if(n.isNumber(o))return n.isNumber(m)&&n.isNumber(l)?new c(h,j,m,l):new a(h,j,{min:m,max:l});if(n.isString(o))return new d(h,j);if(n.isFunction(o))return new f(h,j,"");if(n.isBoolean(o))return new b(h,j)}}(dat.controllers.OptionController,dat.controllers.NumberControllerBox,dat.controllers.NumberControllerSlider,dat.controllers.StringController=function(e,a,c){var d=
function(c,b){function e(){h.setValue(h.__input.value)}d.superclass.call(this,c,b);var h=this;this.__input=document.createElement("input");this.__input.setAttribute("type","text");a.bind(this.__input,"keyup",e);a.bind(this.__input,"change",e);a.bind(this.__input,"blur",function(){h.__onFinishChange&&h.__onFinishChange.call(h,h.getValue())});a.bind(this.__input,"keydown",function(a){a.keyCode===13&&this.blur()});this.updateDisplay();this.domElement.appendChild(this.__input)};d.superclass=e;c.extend(d.prototype,
e.prototype,{updateDisplay:function(){if(!a.isActive(this.__input))this.__input.value=this.getValue();return d.superclass.prototype.updateDisplay.call(this)}});return d}(dat.controllers.Controller,dat.dom.dom,dat.utils.common),dat.controllers.FunctionController,dat.controllers.BooleanController,dat.utils.common),dat.controllers.Controller,dat.controllers.BooleanController,dat.controllers.FunctionController,dat.controllers.NumberControllerBox,dat.controllers.NumberControllerSlider,dat.controllers.OptionController,
dat.controllers.ColorController=function(e,a,c,d,f){function b(a,b,c,d){a.style.background="";f.each(j,function(e){a.style.cssText+="background: "+e+"linear-gradient("+b+", "+c+" 0%, "+d+" 100%); "})}function n(a){a.style.background="";a.style.cssText+="background: -moz-linear-gradient(top,  #ff0000 0%, #ff00ff 17%, #0000ff 34%, #00ffff 50%, #00ff00 67%, #ffff00 84%, #ff0000 100%);";a.style.cssText+="background: -webkit-linear-gradient(top,  #ff0000 0%,#ff00ff 17%,#0000ff 34%,#00ffff 50%,#00ff00 67%,#ffff00 84%,#ff0000 100%);";
a.style.cssText+="background: -o-linear-gradient(top,  #ff0000 0%,#ff00ff 17%,#0000ff 34%,#00ffff 50%,#00ff00 67%,#ffff00 84%,#ff0000 100%);";a.style.cssText+="background: -ms-linear-gradient(top,  #ff0000 0%,#ff00ff 17%,#0000ff 34%,#00ffff 50%,#00ff00 67%,#ffff00 84%,#ff0000 100%);";a.style.cssText+="background: linear-gradient(top,  #ff0000 0%,#ff00ff 17%,#0000ff 34%,#00ffff 50%,#00ff00 67%,#ffff00 84%,#ff0000 100%);"}var h=function(e,l){function o(b){q(b);a.bind(window,"mousemove",q);a.bind(window,
"mouseup",j)}function j(){a.unbind(window,"mousemove",q);a.unbind(window,"mouseup",j)}function g(){var a=d(this.value);a!==false?(p.__color.__state=a,p.setValue(p.__color.toOriginal())):this.value=p.__color.toString()}function i(){a.unbind(window,"mousemove",s);a.unbind(window,"mouseup",i)}function q(b){b.preventDefault();var c=a.getWidth(p.__saturation_field),d=a.getOffset(p.__saturation_field),e=(b.clientX-d.left+document.body.scrollLeft)/c,b=1-(b.clientY-d.top+document.body.scrollTop)/c;b>1?b=
1:b<0&&(b=0);e>1?e=1:e<0&&(e=0);p.__color.v=b;p.__color.s=e;p.setValue(p.__color.toOriginal());return false}function s(b){b.preventDefault();var c=a.getHeight(p.__hue_field),d=a.getOffset(p.__hue_field),b=1-(b.clientY-d.top+document.body.scrollTop)/c;b>1?b=1:b<0&&(b=0);p.__color.h=b*360;p.setValue(p.__color.toOriginal());return false}h.superclass.call(this,e,l);this.__color=new c(this.getValue());this.__temp=new c(0);var p=this;this.domElement=document.createElement("div");a.makeSelectable(this.domElement,
false);this.__selector=document.createElement("div");this.__selector.className="selector";this.__saturation_field=document.createElement("div");this.__saturation_field.className="saturation-field";this.__field_knob=document.createElement("div");this.__field_knob.className="field-knob";this.__field_knob_border="2px solid ";this.__hue_knob=document.createElement("div");this.__hue_knob.className="hue-knob";this.__hue_field=document.createElement("div");this.__hue_field.className="hue-field";this.__input=
document.createElement("input");this.__input.type="text";this.__input_textShadow="0 1px 1px ";a.bind(this.__input,"keydown",function(a){a.keyCode===13&&g.call(this)});a.bind(this.__input,"blur",g);a.bind(this.__selector,"mousedown",function(){a.addClass(this,"drag").bind(window,"mouseup",function(){a.removeClass(p.__selector,"drag")})});var t=document.createElement("div");f.extend(this.__selector.style,{width:"122px",height:"102px",padding:"3px",backgroundColor:"#222",boxShadow:"0px 1px 3px rgba(0,0,0,0.3)"});
f.extend(this.__field_knob.style,{position:"absolute",width:"12px",height:"12px",border:this.__field_knob_border+(this.__color.v<0.5?"#fff":"#000"),boxShadow:"0px 1px 3px rgba(0,0,0,0.5)",borderRadius:"12px",zIndex:1});f.extend(this.__hue_knob.style,{position:"absolute",width:"15px",height:"2px",borderRight:"4px solid #fff",zIndex:1});f.extend(this.__saturation_field.style,{width:"100px",height:"100px",border:"1px solid #555",marginRight:"3px",display:"inline-block",cursor:"pointer"});f.extend(t.style,
{width:"100%",height:"100%",background:"none"});b(t,"top","rgba(0,0,0,0)","#000");f.extend(this.__hue_field.style,{width:"15px",height:"100px",display:"inline-block",border:"1px solid #555",cursor:"ns-resize"});n(this.__hue_field);f.extend(this.__input.style,{outline:"none",textAlign:"center",color:"#fff",border:0,fontWeight:"bold",textShadow:this.__input_textShadow+"rgba(0,0,0,0.7)"});a.bind(this.__saturation_field,"mousedown",o);a.bind(this.__field_knob,"mousedown",o);a.bind(this.__hue_field,"mousedown",
function(b){s(b);a.bind(window,"mousemove",s);a.bind(window,"mouseup",i)});this.__saturation_field.appendChild(t);this.__selector.appendChild(this.__field_knob);this.__selector.appendChild(this.__saturation_field);this.__selector.appendChild(this.__hue_field);this.__hue_field.appendChild(this.__hue_knob);this.domElement.appendChild(this.__input);this.domElement.appendChild(this.__selector);this.updateDisplay()};h.superclass=e;f.extend(h.prototype,e.prototype,{updateDisplay:function(){var a=d(this.getValue());
if(a!==false){var e=false;f.each(c.COMPONENTS,function(b){if(!f.isUndefined(a[b])&&!f.isUndefined(this.__color.__state[b])&&a[b]!==this.__color.__state[b])return e=true,{}},this);e&&f.extend(this.__color.__state,a)}f.extend(this.__temp.__state,this.__color.__state);this.__temp.a=1;var h=this.__color.v<0.5||this.__color.s>0.5?255:0,j=255-h;f.extend(this.__field_knob.style,{marginLeft:100*this.__color.s-7+"px",marginTop:100*(1-this.__color.v)-7+"px",backgroundColor:this.__temp.toString(),border:this.__field_knob_border+
"rgb("+h+","+h+","+h+")"});this.__hue_knob.style.marginTop=(1-this.__color.h/360)*100+"px";this.__temp.s=1;this.__temp.v=1;b(this.__saturation_field,"left","#fff",this.__temp.toString());f.extend(this.__input.style,{backgroundColor:this.__input.value=this.__color.toString(),color:"rgb("+h+","+h+","+h+")",textShadow:this.__input_textShadow+"rgba("+j+","+j+","+j+",.7)"})}});var j=["-moz-","-o-","-webkit-","-ms-",""];return h}(dat.controllers.Controller,dat.dom.dom,dat.color.Color=function(e,a,c,d){function f(a,
b,c){Object.defineProperty(a,b,{get:function(){if(this.__state.space==="RGB")return this.__state[b];n(this,b,c);return this.__state[b]},set:function(a){if(this.__state.space!=="RGB")n(this,b,c),this.__state.space="RGB";this.__state[b]=a}})}function b(a,b){Object.defineProperty(a,b,{get:function(){if(this.__state.space==="HSV")return this.__state[b];h(this);return this.__state[b]},set:function(a){if(this.__state.space!=="HSV")h(this),this.__state.space="HSV";this.__state[b]=a}})}function n(b,c,e){if(b.__state.space===
"HEX")b.__state[c]=a.component_from_hex(b.__state.hex,e);else if(b.__state.space==="HSV")d.extend(b.__state,a.hsv_to_rgb(b.__state.h,b.__state.s,b.__state.v));else throw"Corrupted color state";}function h(b){var c=a.rgb_to_hsv(b.r,b.g,b.b);d.extend(b.__state,{s:c.s,v:c.v});if(d.isNaN(c.h)){if(d.isUndefined(b.__state.h))b.__state.h=0}else b.__state.h=c.h}var j=function(){this.__state=e.apply(this,arguments);if(this.__state===false)throw"Failed to interpret color arguments";this.__state.a=this.__state.a||
1};j.COMPONENTS="r,g,b,h,s,v,hex,a".split(",");d.extend(j.prototype,{toString:function(){return c(this)},toOriginal:function(){return this.__state.conversion.write(this)}});f(j.prototype,"r",2);f(j.prototype,"g",1);f(j.prototype,"b",0);b(j.prototype,"h");b(j.prototype,"s");b(j.prototype,"v");Object.defineProperty(j.prototype,"a",{get:function(){return this.__state.a},set:function(a){this.__state.a=a}});Object.defineProperty(j.prototype,"hex",{get:function(){if(!this.__state.space!=="HEX")this.__state.hex=
a.rgb_to_hex(this.r,this.g,this.b);return this.__state.hex},set:function(a){this.__state.space="HEX";this.__state.hex=a}});return j}(dat.color.interpret,dat.color.math=function(){var e;return{hsv_to_rgb:function(a,c,d){var e=a/60-Math.floor(a/60),b=d*(1-c),n=d*(1-e*c),c=d*(1-(1-e)*c),a=[[d,c,b],[n,d,b],[b,d,c],[b,n,d],[c,b,d],[d,b,n]][Math.floor(a/60)%6];return{r:a[0]*255,g:a[1]*255,b:a[2]*255}},rgb_to_hsv:function(a,c,d){var e=Math.min(a,c,d),b=Math.max(a,c,d),e=b-e;if(b==0)return{h:NaN,s:0,v:0};
a=a==b?(c-d)/e:c==b?2+(d-a)/e:4+(a-c)/e;a/=6;a<0&&(a+=1);return{h:a*360,s:e/b,v:b/255}},rgb_to_hex:function(a,c,d){a=this.hex_with_component(0,2,a);a=this.hex_with_component(a,1,c);return a=this.hex_with_component(a,0,d)},component_from_hex:function(a,c){return a>>c*8&255},hex_with_component:function(a,c,d){return d<<(e=c*8)|a&~(255<<e)}}}(),dat.color.toString,dat.utils.common),dat.color.interpret,dat.utils.common),dat.utils.requestAnimationFrame=function(){return window.webkitRequestAnimationFrame||
window.mozRequestAnimationFrame||window.oRequestAnimationFrame||window.msRequestAnimationFrame||function(e){window.setTimeout(e,1E3/60)}}(),dat.dom.CenteredDiv=function(e,a){var c=function(){this.backgroundElement=document.createElement("div");a.extend(this.backgroundElement.style,{backgroundColor:"rgba(0,0,0,0.8)",top:0,left:0,display:"none",zIndex:"1000",opacity:0,WebkitTransition:"opacity 0.2s linear"});e.makeFullscreen(this.backgroundElement);this.backgroundElement.style.position="fixed";this.domElement=
document.createElement("div");a.extend(this.domElement.style,{position:"fixed",display:"none",zIndex:"1001",opacity:0,WebkitTransition:"-webkit-transform 0.2s ease-out, opacity 0.2s linear"});document.body.appendChild(this.backgroundElement);document.body.appendChild(this.domElement);var c=this;e.bind(this.backgroundElement,"click",function(){c.hide()})};c.prototype.show=function(){var c=this;this.backgroundElement.style.display="block";this.domElement.style.display="block";this.domElement.style.opacity=
0;this.domElement.style.webkitTransform="scale(1.1)";this.layout();a.defer(function(){c.backgroundElement.style.opacity=1;c.domElement.style.opacity=1;c.domElement.style.webkitTransform="scale(1)"})};c.prototype.hide=function(){var a=this,c=function(){a.domElement.style.display="none";a.backgroundElement.style.display="none";e.unbind(a.domElement,"webkitTransitionEnd",c);e.unbind(a.domElement,"transitionend",c);e.unbind(a.domElement,"oTransitionEnd",c)};e.bind(this.domElement,"webkitTransitionEnd",
c);e.bind(this.domElement,"transitionend",c);e.bind(this.domElement,"oTransitionEnd",c);this.backgroundElement.style.opacity=0;this.domElement.style.opacity=0;this.domElement.style.webkitTransform="scale(1.1)"};c.prototype.layout=function(){this.domElement.style.left=window.innerWidth/2-e.getWidth(this.domElement)/2+"px";this.domElement.style.top=window.innerHeight/2-e.getHeight(this.domElement)/2+"px"};return c}(dat.dom.dom,dat.utils.common),dat.dom.dom,dat.utils.common);medealib._MarkScriptAsLoaded("dat.gui.min.js");

/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('renderer', ['renderqueue'], function(medealib, undefined) {
	"use strict";

	var medea = this;

	// Base render job abstraction to be added to render queues.
	medea.RenderJob = medealib.Class.extend({
	
		entity 		: null,
		node 		: null,
		camera  	: null,

		init : function(entity, node, camera) {
			this.entity = entity;
			this.node = node;
			this.camera = camera;
		},

		// Required methods for automatic sorting of renderqueues
		DistanceEstimate : function() {
			return 0;
		},

		MaterialId : function() {
			return 0;
		},

		GetEntity : function() {
			return this.entity;
		},

		GetNode : function() {
			return this.node;
		},

		GetCamera : function() {
			return this.camera;
		},
	});


	// A |Renderer| is an abstraction that defines how render queues - see
	// |medea.RenderQueueManager| - are managed and the entities contained
	// therein eventually drawn. For this purpose, it defines
	// DrawXXX methods for all supported entities that draw entities with
	// no further batching or delay. When entities add themselves to
	// render queues, they submit an implementation of |RenderJob| to
	// a render queue, which then calls the corect DrawXXX method.
	//
	// |Renderer.Render()| takes the populated render queues and draws them,
	// using whichever settings are suitable for the semantics of the
	// queue (this is under the Renderer's control).
	//
	// |Renderer| controls:
	//  - How to draw each entity type
	//  - Which default states each render queue uses
	//  - In which order render queues are processed
	// In particular, |Renderer| determines how lights are applied to
	// the scene.
	//
	// A |Renderer| in medea is a much higher-level abstraction that it
	// is for example in Three.js. It does not affect how low-level
	// operation works i.e. it cannot change rendering from WebGL to
	// e.g. CSS3 as WebGL state handling is inherent to the framework.
	medea.Renderer = medealib.Class.extend({
		rq : null,
		visualizers : null,

		init : function() {
			this.visualizers = [];

			// Create a render queue manager for the renderer.
			// this creates the full set of render queues
			this.rq = medea.CreateRenderQueueManager();
		},



		GetRQManager : function() {
			return this.rq;
		},


		Render : null,   // function(viewport, statepool) {}
		DrawMesh : null, // function(meshjob, statepool) {}
		DrawLight : null // function(lightjob, statepool) {}
	});

});

/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('forwardrenderer', ['renderer'],function(medealib, undefined) {
	"use strict";
	var medea = this, gl = medea.gl;

	// default config for normal, solid rendering
	var _initial_state_depth_write_enabled = {
		'depth_test' : true,
		'depth_func' : 'less_equal',
		'depth_write' : true,

		// culling is turned on by default
		'cull_face' : true,
		'cull_face_mode' : 'back',

		'blend' : false
	};

	// default config for rendering of transparent objects
	var _initial_state_depth_write_disabled = {
		'depth_test' : true,
		'depth_func' : 'less_equal',

		// no depth write
		'depth_write' : false,

		// culling is turned on by default
		'cull_face' : true,
		'cull_face_mode' : 'back',

		'blend' : false
	};


	medea.ForwardRenderer = medea.Renderer.extend({

		init : function() {
			this._super();

			var	outer = this
			,	distance_sorter = new medea.DistanceSorter()
			,	material_sorter = new medea.MaterialSorter()
			,	no_sorter = new medea.NoSorter()
			,	light_queue 
			;

			// Setup default render states for all render queues and also pick
			// appropriate sorting algorithm implementations.
			light_queue = this.rq.queues[medea.RENDERQUEUE_LIGHT];
			light_queue.Sorter(no_sorter);
		
			[
				medea.RENDERQUEUE_DEFAULT_EARLY,
				medea.RENDERQUEUE_DEFAULT,
				medea.RENDERQUEUE_DEFAULT_LATE
			].forEach(function(s) {
				s = outer.rq.queues[s];
				s.Sorter(material_sorter);
				s.DefaultState(_initial_state_depth_write_enabled);
			});


			[
				medea.RENDERQUEUE_ALPHA_EARLY,
				medea.RENDERQUEUE_ALPHA,
				medea.RENDERQUEUE_ALPHA_LATE
			].forEach(function(s) {
				s = outer.rq.queues[s];
				s.Sorter(distance_sorter);
				s.DefaultState(_initial_state_depth_write_disabled);
			});
		},


		Render : function(viewport, statepool) {
			var	rq = this.rq
			,	outer = this
			,	RenderProxy
			,	RenderWithVisualizers
			;

			// (hack) insert default light into statepool if there is no light in the scene
			var light_queue = rq.queues[medea.RENDERQUEUE_LIGHT];
			if(light_queue.GetEntries().length === 0) {
				statepool.Set("DIR_LIGHTS",[{
					  world_dir :  [0.309,1.209,-0.709]
					, color : [1,1,1]
				}]);
			}

			// The default behaviour is to simply dispatch all render queues to the GPU,
			// which is going to invoke a DrawXXX() method on us for each entity.
			RenderProxy = function() {
				rq.Flush(outer, statepool);
			};

			RenderWithVisualizers = RenderProxy;

			// But we invoke all visualizers in the right order to have them change this
			// by injecting their own logic. They also get access to the original rq.
			viewport.GetVisualizers().forEach(function(vis) {
				RenderWithVisualizers = vis.Apply(RenderWithVisualizers,RenderProxy,rq,outer,viewport);
			});

			RenderWithVisualizers(); 

			// Clear out light records in the state pool. The state pool
			// may be re-used for next frame, but lights are added
			// from light entities anew each frame.
			statepool.Set("DIR_LIGHTS",[]);
			statepool.Set("POINT_LIGHTS",[]);
			statepool.Set("SPOT_LIGHTS",[]);
		},


		// Draws a given |meshjob| now, using |statepool| to minimize
		// GL state changes.
		DrawMesh : function(meshjob, statepool) {
			var old_w = statepool.GetQuick("W")
			,	new_w = meshjob.node.GetGlobalTransform()
			,	i
			,	abs = Math.abs
			,	change_flags = 0x4 | 0x2 /* no view, projection changes */
			;

			// Update the current world matrix to the node's global transformation matrix
			// if it is different than the previously set matrix
			if (old_w) {
				for(i = 15; i >= 0; --i) {
					// TODO: optimize comparison order - deviation is most
					// likely for the translational part and the main diagonal.
					if(abs(new_w[i] - old_w[i]) >= 1e-5) {
						old_w = null;
						break;
					}
				}
			}
			if(old_w) {
				change_flags |= 0x1; /* no world, view, projection changes */
			}
			else {
				statepool.Set("W",new_w);

				// Always set WI and WIT. Lighting naturally relies on
				// it, so we can assume that this is always needed.
				// By using the node's intelligent update mechanism
				// we can thus save lots of matrix math.
				var wi = meshjob.node.GetInverseGlobalTransform();
				statepool.Set("WI",wi);
				var wit = statepool.Get("WIT");
				if(wit === undefined) {
					wit = mat4.create();
				}

				mat4.transpose(wi, wit);
				statepool.SetQuick("WIT",wit);
			}
			meshjob.mesh.DrawNow(statepool, change_flags);
		},


		// Draws a given |lightjob| now, using |statepool| to minimize
		// GL state changes.
		DrawLight : function(lightjob, statepool) {
			var light = lightjob.light;
			var list_name = null;

			var light_info = {
				color : light.color
			};

			// Add this light to the statepool so that materials will find it
			if(light instanceof medea.DirectionalLight) {
				list_name = 'DIR_LIGHTS';

				light_info.world_dir = vec3.create();
				mat4.multiplyVec3(lightjob.node.GetGlobalTransform(), light.dir, light_info.world_dir);
			}
			/* else if(light instanceof medea.PointLight) {
				list_name = 'POINT_LIGHTS';
			}
			else if(light instanceof medea.SpotLight) {
				list_name = 'SPOT_LIGHTS';
			} */

			else {
				medealib.DebugAssert('unknown kind of light');
			}

			var lights = statepool.GetQuick(list_name);
			if(lights === undefined) {
				lights = statepool.Set(list_name,[]);
			}
			lights.push(light_info);
		}
	});


	medea.CreateForwardRenderer = function() {
		return new medea.ForwardRenderer();
	};
});


/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('frustum',[],function(medealib, undefined) {
	"use strict";
	var medea = this, min = Math.min, max = Math.max;

	// temporary storage for medea.BBInFrustum()
	var vt = vec3.create();
	var vtemp = vec3.create();

	// BB_INFINITE and BB_EMPTY are defined in the "node" module

	medea.CreateBB = function(vmin,vmax, mat) {
		var min_def = [1e10,1e10,1e10], max_def = [-1e10,-1e10,-1e10];
		return mat ? [vmin || min_def, vmax || max_def, mat] : [vmin || min_def, vmax || max_def];
	};

	medea.TransformBB = function(b,mat) {
		if(b === medea.BB_INFINITE || b === medea.BB_EMPTY) {
			return b;
		}

		if (b.length === 2) {
			return [b[0], b[1], mat4.create(mat)];
		}
		return [b[0], b[1], mat4.multiply(mat,b[2],mat4.create())];
	};

	medea.MakeAABB = function(bb) {
		if(bb === medea.BB_INFINITE || bb === medea.BB_EMPTY || bb.length === 2) {
			return bb;
		}
		return medea.MergeBBs([bb]);
	};

	medea.IsValidBB = function(bb) {
		return bb[0] < bb[1];
	};

	medea.MergeBBs = function(bbs) {
		if(!bbs.length) {
			return medea.BB_EMPTY;
		}

		var bout = medea.CreateBB();
		var bmin = bout[0], bmax = bout[1], p;

		for(var i = 0; i < bbs.length; ++i) {
			var b = bbs[i];

			if(b === medea.BB_INFINITE) {
				return medea.BB_INFINITE;
			}
			else if(b === medea.BB_EMPTY) {
				continue;
			}

			if (b.length === 2) {
				bmin[0] = min(bmin[0], b[0][0]);
				bmin[1] = min(bmin[1], b[0][1]);
				bmin[2] = min(bmin[2], b[0][2]);

				bmax[0] = max(bmax[0], b[1][0]);
				bmax[1] = max(bmax[1], b[1][1]);
				bmax[2] = max(bmax[2], b[1][2]);
			}
			else {
				if (!p) {
					p = new Array(8);
				}
				p[0] = [b[0][0],b[0][1],b[0][2]];
				p[1] = [b[0][0],b[0][1],b[1][2]];
				p[2] = [b[0][0],b[1][1],b[1][2]];
				p[3] = [b[0][0],b[1][1],b[0][2]];
				p[4] = [b[1][0],b[0][1],b[0][2]];
				p[5] = [b[1][0],b[0][1],b[1][2]];
				p[6] = [b[1][0],b[1][1],b[1][2]];
				p[7] = [b[1][0],b[1][1],b[0][2]];

				for (var n = 0; n < 8; ++n) {
					mat4.multiplyVec3( b[2], p[n], p[n] );

					var pn = p[n];
					bmin[0] = min(bmin[0], pn[0]);
					bmin[1] = min(bmin[1], pn[1]);
					bmin[2] = min(bmin[2], pn[2]);

					bmax[0] = max(bmax[0], pn[0]);
					bmax[1] = max(bmax[1], pn[1]);
					bmax[2] = max(bmax[2], pn[2]);
				}
			}
		}
		return bout;
	};

	medea.NormalizePlane = function(p,p_out) {
		if (!p_out) {
			p_out = p;
		}
		else p_out.length = 4;

		var l = Math.sqrt( p[0]*p[0] + p[1]*p[1] + p[2]*p[2] );

		p_out[0] = p[0] / l;
		p_out[1] = p[1] / l;
		p_out[2] = p[2] / l;
		p_out[3] = p[3] / l;
		return p_out;
	};

	medea.ExtractFrustum = function(view, proj) {
		var vp = mat4.multiply(proj, view, mat4.create());
		var f = [
			// left plane
			[
			 vp[3] + vp[0],
			 vp[7] + vp[4],
			 vp[11] + vp[8],
			 vp[15] + vp[12]
			],

			// right plane
			[
			 vp[3] - vp[0],
			 vp[7] - vp[4],
			 vp[11] - vp[8],
			 vp[15] - vp[12]
			],

			// near plane
			[
			 vp[3] + vp[2],
			 vp[7] + vp[6],
			 vp[11] + vp[10],
			 vp[15] + vp[14]
			],

			// far plane
			[
			 vp[3] - vp[2],
			 vp[7] - vp[6],
			 vp[11] - vp[10],
			 vp[15] - vp[14]
			],

			// bottom plane
			[
			 vp[3] + vp[1],
			 vp[7] + vp[5],
			 vp[11] + vp[9],
			 vp[15] + vp[13]
			],

			// top plane
			[
			 vp[3] - vp[1],
			 vp[7] - vp[5],
			 vp[11] - vp[9],
			 vp[15] - vp[13]
			]
		];

		for (var i = 0; i < 6; ++i) {
			medea.NormalizePlane(f[i]);
		}

		return f;
	};

	medea.PointInFrustum = function(f, v) {
		var v0 = v[0];
		for (var i = 0; i < 6; ++i) {
			var ff = f[i];
			if (ff[0] * v0 + ff[1] * v[1] + ff[2] * v[2] + v[3] <= 0) {
				return false;
			}
		}
		return true;
	};

	medea.BBInFrustum = function(f, bb, plane_hint) {
		if (bb === medea.BB_INFINITE) {
			// Important: if we return medea.VISIBLE_ALL for BB_INFINITE,
			// then a single element with no well-defined bounding box
			// would bubble up so the entire scene would be rendered with
			// no culling at all.
			return medea.VISIBLE_PARTIAL;
		}

		if (bb === medea.BB_EMPTY) {
			return medea.VISIBLE_NONE;
		}

		if (!plane_hint) {
			plane_hint = [0];
		}

		var min = bb[0], max = bb[1], t = 0;

		var min0 = min[0];
		var min1 = min[1];
		var min2 = min[2];

		var max0 = max[0];
		var max1 = max[1];
		var max2 = max[2];

		// AABB
		if (bb.length === 2) {
			for (var i = plane_hint[0], ii = 0; ii < 6; ++ii, ++i) {
				if (i === 6) {
					i = 0;
				}
				var ff = f[i], c = 0;
				if (ff[0] * min0 + ff[1] * min1 + ff[2] * min2 + ff[3] > 0) {
					++c;
				}
				if (ff[0] * max0 + ff[1] * min1 + ff[2] * min2 + ff[3] > 0) {
					++c;
				}
				if (ff[0] * max0 + ff[1] * max1 + ff[2] * min2 + ff[3] > 0) {
					++c;
				}
				if (ff[0] * max0 + ff[1] * max1 + ff[2] * max2 + ff[3] > 0) {
					++c;
				}
				if (ff[0] * max0 + ff[1] * min1 + ff[2] * max2 + ff[3] > 0) {
					++c;
				}
				if (ff[0] * min0 + ff[1] * max1 + ff[2] * max2 + ff[3] > 0) {
					++c;
				}
				if (ff[0] * min0 + ff[1] * max1 + ff[2] * min2 + ff[3] > 0) {
					++c;
				}
				if (ff[0] * min0 + ff[1] * min1 + ff[2] * max2 + ff[3] > 0) {
					++c;
				}

				if (!c) {
					plane_hint[0] = i;
					return medea.VISIBLE_NONE;
				}
				if (c === 8) {
					++t;
				}
			}
		}
		// OBB
		else {
			var mat = bb[2];
			for (var i = plane_hint[0], ii = 0; ii < 6; ++ii, ++i) {
				if (i === 6) {
					i = 0;
				}
				var ff = f[i], c = 0;

				// vtemp and vt are global to avoid the extra allocation
				vtemp[0] = min0;
				vtemp[1] = min1;
				vtemp[2] = min2;
				mat4.multiplyVec3(mat,vtemp, vt);
				if (ff[0] * vt[0] + ff[1] * vt[1] + ff[2] * vt[2] + ff[3] > 0) {
					++c;
				}

				vtemp[0] = min0;
				vtemp[1] = max1;
				vtemp[2] = min2;
				mat4.multiplyVec3(mat,vtemp, vt);
				if (ff[0] * vt[0] + ff[1] * vt[1] + ff[2] * vt[2] + ff[3] > 0) {
					++c;
				}

				vtemp[0] = min0;
				vtemp[1] = max1;
				vtemp[2] = max2;
				mat4.multiplyVec3(mat,vtemp, vt);
				if (ff[0] * vt[0] + ff[1] * vt[1] + ff[2] * vt[2] + ff[3] > 0) {
					++c;
				}

				vtemp[0] = min0;
				vtemp[1] = min1;
				vtemp[2] = max2;
				mat4.multiplyVec3(mat,vtemp, vt);
				if (ff[0] * vt[0] + ff[1] * vt[1] + ff[2] * vt[2] + ff[3] > 0) {
					++c;
				}

				vtemp[0] = max0;
				vtemp[1] = min1;
				vtemp[2] = min2;
				mat4.multiplyVec3(mat,vtemp, vt);
				if (ff[0] * vt[0] + ff[1] * vt[1] + ff[2] * vt[2] + ff[3] > 0) {
					++c;
				}

				vtemp[0] = max0;
				vtemp[1] = max1;
				vtemp[2] = min2;
				mat4.multiplyVec3(mat,vtemp, vt);
				if (ff[0] * vt[0] + ff[1] * vt[1] + ff[2] * vt[2] + ff[3] > 0) {
					++c;
				}

				vtemp[0] = max0;
				vtemp[1] = max1;
				vtemp[2] = max2;
				mat4.multiplyVec3(mat,vtemp, vt);
				if (ff[0] * vt[0] + ff[1] * vt[1] + ff[2] * vt[2] + ff[3] > 0) {
					++c;
				}

				vtemp[0] = max0;
				vtemp[1] = min1;
				vtemp[2] = max2;
				mat4.multiplyVec3(mat,vtemp, vt);
				if (ff[0] * vt[0] + ff[1] * vt[1] + ff[2] * vt[2] + ff[3] > 0) {
					++c;
				}

				if (!c) {
					plane_hint[0] = i;
					return medea.VISIBLE_NONE;
				}
				if (c === 8) {
					++t;
				}
			}
		}
		return t === 6 ? medea.VISIBLE_ALL : medea.VISIBLE_PARTIAL;
	};
});






/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('fullscreen',[],function(medealib, undefined) {
	"use strict";
	var medea = this, gl = medea.gl;

	var is_fullscreen_mode = false;
	var fullscreen_mode_key = null;

	var check_is_fullscreen = function() {
		return document.mozFullScreen || document.webkitIsFullScreen;
	};


	var old_width = null, old_height = null;
	var on_change_to_fs = function() {
		is_fullscreen_mode = check_is_fullscreen();

		// set the canvas to the size of its parent node
		var canvas = medea.canvas;
		if(is_fullscreen_mode) {
  			canvas.width = window.innerWidth;
        	canvas.height = window.innerHeight;
    	}
    	else {
    		canvas.width = old_width;
        	canvas.height = old_height;
    	}
	};


	var is_fullscreen_mode_key_down = false;
	var key_up = function(event) {
		if(event.keyCode === fullscreen_mode_key) {
			is_fullscreen_mode_key_down = false;
		}
	};

	var key_down = function(event) {
		if(event.keyCode === fullscreen_mode_key) {
			if (is_fullscreen_mode_key_down === false) {
				medea.FullscreenMode(!medea.FullscreenMode());
			}
			is_fullscreen_mode_key_down = true;
		}
	};


	/** medea.IsFullscreenModeKey(*)
	 *
	 *  TODO
	 */
	this.FullscreenModeKey = function(key) {

		// this utility function is here to offer a straightforward way of binding
		// the fullscreen functionality to a key - this is not so easy otherwise
		// due to the limitation that fullscreen DOM APIs are only available from
		// within event handlers, but medeas input handling is asynchronous.
		//
		// even though this registers event handlers, it is designed as to not
		// interfere with the input module.
		if (key === undefined) {
			return fullscreen_mode_key;
		}

		if(fullscreen_mode_key === key) {
			return;
		}

		fullscreen_mode_key = key;
		if (key === null) {
			window.removeEventListener('keydown', key_down, true);
			window.removeEventListener('keyup', key_up, true);
			return;
		}

		window.addEventListener('keydown', key_down, true);
		window.addEventListener('keyup', key_up, true);
	};


	/** medea.IsFullscreenMode(*)
	 *  
	 *  TODO
	 *  Browser APIs for fullscreen mode are only available from within an event handler. 
	*/
	this.FullscreenMode = function(enable_fullscreen) {
		// based on https://developer.mozilla.org/en-US/docs/Web/Guide/DOM/Using_full_screen_mode
		if (enable_fullscreen === undefined) {
			return is_fullscreen_mode;
		}

		if (!!is_fullscreen_mode === !!enable_fullscreen) {
			return;
		}

		// is_fullscreen_mode is not changed until the fullscreenchange event occurs
		//is_fullscreen_mode = enable_fullscreen;
		var canvas = this.canvas;

		if(enable_fullscreen) {
			old_width = canvas.width;
			old_height = canvas.height;
		}
		
		// TODO: since going to fullscreen mode is asynchronous, we could offer a callback
		document.addEventListener('mozfullscreenchange', on_change_to_fs);
		document.addEventListener('webkitfullscreenchange', on_change_to_fs);

		if (enable_fullscreen) {
			if (canvas.requestFullscreen) {
	      		canvas.requestFullscreen();
	    	} 
	    	else if (canvas.mozRequestFullScreen) {
	      		canvas.mozRequestFullScreen();
	    	} 
	    	else if (canvas.webkitRequestFullScreen) {
	    		// TODO: http://stackoverflow.com/questions/8427413/ - do we need a workaround
	    		// for this? 
	      		canvas.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
	   		}
   		}
   		else {
   			if (document.cancelFullScreen) {
      			document.cancelFullScreen();
    		} 
    		else if (document.mozCancelFullScreen) {
      			document.mozCancelFullScreen();
    		} 
    		else if (document.webkitCancelFullScreen) {
      			document.webkitCancelFullScreen();
    		}
   		}
	};
});


/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('simpleanim',['entity'],function(medealib, undefined) {
	"use strict";
	var medea = this;

	var FromToAnimator = medea.Entity.extend(
	{
	
		finished_clb : null,
		
	
		init : function(from, to, duration, auto_unadd) {
			this.from = from;
			this.to = to;
			this.duration = duration;
			this.auto_unadd = auto_unadd;
		},

		Render : function(viewport,entity,node,rqmanager) {
			// nothing to be done
		},

		Update : function(dtime,node) {
			if (this.finished) {
				if(this.auto_unadd) {
					node.RemoveEntity(this);
					return medea.ENTITY_UPDATE_WAS_REMOVED;
				}
				return;
			}
			
			if(this.time === undefined) {
				this.time = 0.0;
			}
			
			this.time += dtime;
			if(this.time > this.duration) {
				// ensure proper end position
				node.LocalPos(this.to);
				this.Finished(true);
				return;
			}
			
			var fraction = this.time / this.duration;
			var position = [this.from[0],this.from[1],this.from[2]];
			
			position[0] += (this.to[0] - this.from[0]) * fraction;
			position[1] += (this.to[1] - this.from[1]) * fraction;
			position[2] += (this.to[2] - this.from[2]) * fraction;
			
			node.LocalPos(position);
		},

		Finished : function(h) {
			if (h === undefined) {
				return this.finished;
			}
			this.finished = h;
			if(h && this.finished_clb != null) {
				this.finished_clb(this);
			}
		},
		
		FinishingCallback : function(c) {
			if (c === undefined) {
				return this.finished_clb;
			}
			this.finished_clb = c;
		}
	});


	medea.CreateFromToAnimator = function(from, to, duration, auto_unadd) {
		return new FromToAnimator (from, to, duration, auto_unadd);
	};
});

/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

try {
	medea; // this should throw ReferenceError etc. from within a web worker

	medealib.define('worker_base',[], function(undefined) {
	});
}
catch (e) {
	if (!(e instanceof ReferenceError)) {
		console.log(e);
		//return;
	}
	// subset of medea's core interface that is available to workers
	medea = {
		define : function(a,b,clb) {
			clb.apply(medea);
		},

		Log : function(message,kind) {
		},

		LogDebug : function(message) {
		},

		DebugAssert : function(e,v) {
			if (v !== undefined) {
				if (e) {
					return;
				}
			}
			else {
				v = e;
			}
		},

		_workers : {
		},
	};

	onmessage = function(e) {
		var call = medea._workers[e.data.command];
		if (call) {
			var r = call.apply(medea,e.data.arguments);
			postMessage( {
				job_id : e.data.job_id,
				result : r
			});
		}
		else {
			medealib.DebugAssert(false,'command ' + call + ' not recognized');
		}
	};
 }


/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('splinepath',['entity'],function(medealib, undefined) {
	"use strict";
	var medea = this;

	var SplinePathAnimator = medea.Entity.extend(
	{
		init : function(points, duration, loop, ping_pong, tightness) {
			this.points = points;
			this.duration = duration || 1.0;
			this.loop = loop || false;
			this.ping_pong = ping_pong || false;
			this.tightness = tightness || 1.0;
			this.time = 0.0;
			this.finished = false;
		},

		Render : function(viewport,entity,node,rqmanager) {
			// nothing to be done
		},

		Update : function(dtime,node) {
			if (this.finished) {
				return;
			}

			this.time += dtime;

			// this is based on Irrlicht's CSceneNodeAnimatorFollowSpline::animateNode
			var p = this.points;
			if (p.length === 0) {
				if (this.loop) {
					this.finished = true;
				}
				return;
			}

			if (p.length === 1) {
				node.LocalPos(p[0]);
				if (this.time > 0) {
					if (this.loop) {
						this.finished = true;
					}
				}
				return;
			}

			var dt = this.time * p.length / this.duration;
			var uid = Math.floor(dt);
			if (!this.loop && uid >= p.length-1) {
				node.LocalPos(p[p.length-1]);
				this.finished = true;
				return;
			}

			var pong = this.ping_pong && !!(Math.floor(uid/(p.length-1)) %2), u = dt-Math.floor(dt), i;
			if (pong) {
				u = 1.0 - u;
				i = (p.length-2) - (uid % (p.length-1));
			}
			else {
				i = this.ping_pong ? uid % (p.length-1) : uid % p.length;
			}

			var clamp = function(idx) {
				return ( idx<0 ? p.length +idx : ( idx>=p.length ? idx-p.length : idx ) );
			};

			var p0 = p[ clamp(i-1) ];
			var p1 = p[ clamp(i+0) ];
			var p2 = p[ clamp(i+1) ];
			var p3 = p[ clamp(i+2) ];

			var h1 = 2.0 * u * u * u - 3.0 * u * u + 1.0;
			var h2 = -2.0 * u * u * u + 3.0 * u * u;
			var h3 = u * u * u - 2.0 * u * u + u;
			var h4 = u * u * u - u * u;

			var out = [0,0,0];
			for (var n = 0; n < 3; ++n) {
				var t1 = (p2[n]-p0[n]) * this.tightness;
				var t2 = (p3[n]-p1[n]) * this.tightness;

				out[n] = p1[n] * h1 + p2[n] + h2 +t1 * h3+ t2 * h4;
			}

			node.LocalPos(out);
		},

		Finished : function(h) {
			if (h === undefined) {
				return this.finished;
			}
			this.finished = h;
		},

		Points : function(h) {
			if (h === undefined) {
				return this.points;
			}
			this.points = h;
		},

		Duration : function(h) {
			if (h === undefined) {
				return this.duration;
			}
			this.duration = h;
		},

		Tightness : function(h) {
			if (h === undefined) {
				return this.tightness;
			}
			this.tightness = h;
		},

		Loop : function(h) {
			if (h === undefined) {
				return this.loop;
			}
			this.loop = h;
		},

		PingPong : function(h) {
			if (h === undefined) {
				return this.ping_pong;
			}
			this.ping_pong = h;
		},
	});


	medea.CreateSplinePathAnimator = function(points, duration, loop, ping_pong, tightness) {
		return new SplinePathAnimator (points, duration, loop, ping_pong, tightness);
	};
});

/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('statepool',[],function(medealib, undefined) {
	"use strict";
	var medea = this

		// every statepool instance has a _gl member, which is a dictionary
		// that they all share. OpenGl state is global relative to a Gl
		// context (~= one medea context).
	,	_global_gl_state = {}
	;

	var _DefaultStateDependencies = {
		W : ["WVP","WV","WI","WIT",'CAM_POS_LOCAL'],
		V : ["WVP","WV","VP"],
		P : ["WVP","VP"],
		CAM_POS : ['CAM_POS_LOCAL']
	};

	var _DefaultDerivedStates = {

		CAM_POS_LOCAL: function(statepool, old) {
			return mat4.multiplyVec3(statepool.Get("WI"),statepool.GetQuick("CAM_POS"),
				old || vec3.create());
		},

		VP: function(statepool, old) {
			return mat4.multiply(statepool.GetQuick("P"),statepool.GetQuick("V"),
				old || mat4.create());
		},

		WVP: function(statepool, old) {
			return mat4.multiply(statepool.Get("VP"),statepool.GetQuick("W"),
				old || mat4.create());
		},

		WV: function(statepool, old) {
			return mat4.multiply(statepool.GetQuick("V"),statepool.GetQuick("W"),
				old || mat4.create());
		},

		WIT: function(statepool, old) {
			return mat4.transpose(statepool.Get("WI"),
				old || mat4.create());
		},

		WI: function(statepool, old) {
			return mat4.inverse(statepool.GetQuick("W"),
				old || mat4.create());
		}
	};

	// class StatePool
	medea.StatePool = medealib.Class.extend({

		deps : null,
		derived_states : null,
		dirty : null,

		init : function(deps,derived_states) {
			this.states = { 
				_gl : _global_gl_state
			 };
			this.deps = deps || _DefaultStateDependencies;
			this.derived_states = derived_states || _DefaultDerivedStates;
			this.dirty = {};
		},

		Set : function(key,value) {
			var dep_entry = this.deps[key];
			if (dep_entry !== undefined) {
				var dirty = this.dirty;
				for(var i = dep_entry.length - 1; i >= 0; --i) {
					dirty[dep_entry[i]] = true;
				}
			}
			if(key in this.derived_states) {
				this.dirty[key] = false;
			}
			return this.states[key] = value;
		},

		SetQuick : function(key,value) {
			if(key in this.derived_states) {
				this.dirty[key] = false;
			}
			return this.states[key] = value;
		},

		Get : function(key) {
			if (this.dirty[key] === true) {
				this.dirty[key] = false;
				return this.states[key] = this.derived_states[key](this, this.states[key]);
			}

			return this.states[key];
		},

		GetQuick : function(key) {
			return this.states[key];
		}
	});

	medea.CreateStatePool = function(deps, derived_states) {
		return new medea.StatePool(deps,derived_states);
	};

	medea.CloneStatePool = function(sp) {
		var clone = new medea.StatePool();
		medealib.Merge(this.states, {}, clone.states);
		medealib.Merge(this.dirty, {}, clone.dirty);

		return clone;
	};


	var def_pool = medea.CreateStatePool();

	medea.GetDefaultStatePool = function(deps, derived_states) {
		// TODO for debugging, use a new StatePool to prevent unwanted state leaking
		return def_pool;
	};


	/** Drop any cached Gl state values. This is required after any modifications
	 *  to the webgl state that are external to medea. A typical use case is an
	 *  application wishing to use custom WebGl drawing commands to achieve
	 *  things not directly possible or too slow with medea. Any WebGl APIs may 
	 *  be used and medea is able to resume afterwards if DropGlCache() is invoked
	 *  before control returns to medea.
 	 *
 	 *  Calling this API is also expensive, as it kills lots of internal optimizations
 	 *  and caches in the next frame.
	 */
	medea.DropGlCache = function() {
		
		// does not work as the old object would still be used in statepools.gls
		//_global_gl_state = {};
		for(var v in _global_gl_state) {
			delete _global_gl_state[v];
		}
	};
});



/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('camera',['statepool'],function(medealib, undefined) {
	"use strict";
	var medea = this;

	medea._CAMERA_DIRTY_FRUSTUM = medea.NODE_FLAG_USER;
	medea._CAMERA_DIRTY_VIEW = medea.NODE_FLAG_USER << 1;
	medea._CAMERA_DIRTY_PROJ = medea.NODE_FLAG_USER << 2;

	var identity = mat4.identity(mat4.create());


	// class Camera
	medea.Camera = medea.Node.extend(
	{
		init : function(name,fovy,aspect,znear,zfar,viewport,culling) {
			this._super(name, medea.NODE_FLAG_NO_SCALING);
			this.name = name || ("UnnamedCamera_" + this.id);

			this.view = mat4.identity(mat4.create());
			this.proj = mat4.identity(mat4.create());
			this.frustum = null;

			this.fovy = fovy || 45;
			this.aspect = aspect;
			this.znear = znear || 1;
			this.zfar = zfar || 10000;
			this.culling = culling === undefined ? true: culling;

			this.viewport = null;
			if (viewport) {
				viewport.Camera(this);
			}

			this.flags |= medea._CAMERA_DIRTY_PROJ | medea._CAMERA_DIRTY_VIEW | medea._CAMERA_DIRTY_FRUSTUM;
		},


		GetViewMatrix : function() {
			this._UpdateViewMatrix();
			return this.view;
		},

		GetProjectionMatrix : function() {
			this._UpdateProjectionMatrix();
			return this.proj;
		},

		GetFrustum : function() {
			this._UpdateFrustum();
			return this.frustum;
		},

		Culling: medealib.Property('culling'),
		Name: medealib.Property('name'),

		GetViewport : function() {
			return this.viewport;
		},

		ZNear : function(f) {
			if (f === undefined) {
				return this.znear;
			}
			this.znear = f;
			this.flags |= medea._CAMERA_DIRTY_PROJ | medea._CAMERA_DIRTY_FRUSTUM;
		},

		ZFar : function(f) {
			if (f === undefined) {
				return this.zfar;
			}
			this.zfar = f;
			this.flags |= medea._CAMERA_DIRTY_PROJ | medea._CAMERA_DIRTY_FRUSTUM;
		},

		Aspect : function(f) {
			if (f === undefined) {
				return this.aspect;
			}
			this.aspect = f;
			this.flags |= medea._CAMERA_DIRTY_PROJ | medea._CAMERA_DIRTY_FRUSTUM;
		},

		FOV : function(f) {
			if (f === undefined) {
				return this.fovy;
			}
			this.fovy = f;
			this.flags |= medea._CAMERA_DIRTY_PROJ | medea._CAMERA_DIRTY_FRUSTUM;
		},


		_OnSetViewport : function(vp) {
			this.viewport = vp;
		},

		_SetTrafoDirty : function() {
			this._super();
			this.flags |= medea._CAMERA_DIRTY_VIEW | medea._CAMERA_DIRTY_FRUSTUM;
		},

		_UpdateFrustum : function() {
			if (!(this.flags & medea._CAMERA_DIRTY_FRUSTUM)) {
				return this.frustum;
			}

			this.frustum = medea.ExtractFrustum(this.GetViewMatrix(), this.GetProjectionMatrix());

			this.flags &= ~medea._CAMERA_DIRTY_FRUSTUM;
			return this.frustum;
		},

		_UpdateViewMatrix : function() {
			if (!(this.flags & medea._CAMERA_DIRTY_VIEW)) {
				return this.view;
			}

			// the view matrix is the inverse of the camera node's global
			// transformation. As we do not permit any scaling on this
			// matrix, it only consists of a translation vector t^T (whose
			// inverse is -t^T * r) and a orthogonal 3x3 sub matrix r (whose 
			// inverse is r^T).
			var global = this.GetGlobalTransform()

			var view = this.view;

			var v0  = view[0]  = global[0];
			var v1  = view[1]  = global[4];
			var v2  = view[2]  = global[8];

			var v4  = view[4]  = global[1];
			var v5  = view[5]  = global[5];
			var v6  = view[6]  = global[9];

			var v8  = view[8]  = global[2];
			var v9  = view[9]  = global[6];
			var v10 = view[10] = global[10];

			var ex = -global[12]
			var ey = -global[13]
			var ez = -global[14]

			view[12] = ex * v0 + ey * v4 + ez * v8
			view[13] = ex * v1 + ey * v5 + ez * v9
			view[14] = ex * v2 + ey * v6 + ez * v10

			this.flags &= ~medea._CAMERA_DIRTY_VIEW;
			return this.view;
		},

		_UpdateProjectionMatrix : function() {
			if (!(this.flags & medea._CAMERA_DIRTY_PROJ)) {
				return this.proj;
			}

			var aspect = this.aspect;
			if (aspect === undefined) {

				aspect = this.viewport.GetAspect();
			}

			mat4.perspective(this.fovy,aspect,this.znear,this.zfar,this.proj);

			this.flags &= ~medea._CAMERA_DIRTY_PROJ;
			return this.proj;
		},

		_FillRenderQueues : function(rq, statepool) {
			var frustum = null;
			if (this.culling) {
				frustum = this.GetFrustum();
			}
			var outer = this;

			// (hack) check if the (logical) canvas size changed, if so, dirty the projection
			// matrix in case the angle depends on it.
			if(this.aspect === undefined) {
				var canvas = medea.canvas;
				if (canvas.width !== this.last_canvas_w || canvas.height !== this.last_canvas_h) {
					this.flags |= medea._CAMERA_DIRTY_PROJ;
				}

				this.last_canvas_w = canvas.width;
				this.last_canvas_h = canvas.height;
			}

			// Update state pool
			statepool.Set("V",this.GetViewMatrix());
			statepool.Set("P",this.GetProjectionMatrix());
			statepool.Set("W",identity);

			statepool.Set("CAM_POS", this.GetWorldPos());

			// Traverse all nodes in the graph and collect their render jobs
			medea.VisitGraph(medea.RootNode(),function(node, parent_visible) {
				if(!node.Enabled()) {
					return medea.VISIBLE_NONE;
				}

				var vis = parent_visible === medea.VISIBLE_ALL ? medea.VISIBLE_ALL : node.Cull(frustum);
				var e = node.GetActiveEntities(outer);

				if(vis === medea.VISIBLE_NONE) {
					return medea.VISIBLE_NONE;
				}

				node.Render(outer, rq);

				if(vis === medea.VISIBLE_ALL || e.length === 1) {					
					e.forEach(function(val, idx) {
						val.Render(outer, node, rq);
					});

					return medea.VISIBLE_ALL;
				}

				// Partial visibility and more than one entity, cull per entity
				e.forEach(function(val, idx) {
					if(val.Cull(node, frustum) !== medea.VISIBLE_NONE) {
						val.Render(outer, node, rq);
					}
				});

				return medea.VISIBLE_PARTIAL;
			}, this.culling ? medea.VISIBLE_PARTIAL : medea.VISIBLE_ALL);

			// rq.Flush() is left to the caller
			return statepool;
		}
	});


	medea.CreateCameraNode = function(name,fovy,aspect,znear,zfar,viewport) {
		return new medea.Camera(name,fovy,aspect,znear,zfar,viewport);
	};
});




/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('input',[],function(medealib, undefined) {
	"use strict";
	var medea = this;

	var key_state = {};
	var mouse_down = [false ,false, false];

	var lastMouseDelta, lastMousePosition;
	var lastMouseWheelDelta = [0,0];


	var HandleKeyDown = function(event) {
		key_state[event.keyCode] = true;
	};

	var HandleKeyUp = function(event) {
		key_state[event.keyCode] = false;
	};

	var HandleMouseWheel = function(event) {
		var delta = 0;
 
    	if (event.wheelDelta !== undefined) {
        	delta = event.wheelDelta / 60;
 
    	} 
    	else if (event.detail !== undefined) {
        	delta = -event.detail / 2;
   	 	}

   	 	lastMouseWheelDelta = [
   	 		delta,
   	 		lastMouseWheelDelta[1]+1
   	 	];
		event.preventDefault();
	};

	var HandleMouseDown = function(event) {
		if(event.which <= 3 && event.which > 0) {
			mouse_down[event.which - 1] = true;
		}
	};

	var HandleMouseUp = function(event) {
		if(event.which <= 3 && event.which > 0) {
			mouse_down[event.which - 1] = false;
		}
	};

	var HandleMouseMove = function(event) {
		// XXX use getCapture if available?
		lastMouseDelta = lastMousePosition
			? [	event.clientX - lastMousePosition[0],
				event.clientY - lastMousePosition[1],
				lastMouseDelta[2]+1
			]
			: [0,0,0];

		lastMousePosition = [event.clientX, event.clientY,lastMouseDelta[2]];
	};


	medea.canvas.onmousedown = HandleMouseDown;
	medea.canvas.onmouseup = HandleMouseUp;
	medea.canvas.onmousemove = HandleMouseMove;

	// TODO: should these really be global?
	window.addEventListener('keydown', HandleKeyDown, true);
	window.addEventListener('keyup', HandleKeyUp, true);

	// cross browser mouse wheel
	var wheel = /Firefox/i.test(navigator.userAgent) ? "DOMMouseScroll" : "mousewheel";
	medea.canvas.addEventListener(wheel, HandleMouseWheel, false); 

	var settings = medea.settings;


	medea.IsMouseDown = function() {
		return mouse_down[0];
	};

	medea.IsMouseButtonDown = function(which) {
		return mouse_down[which];
	};

	medea.IsKeyDown = function(keycode) {
		if(settings.keymap) {
			keycode = settings.keymap[keycode];
		}
		return key_state[keycode] || false;
	};
	
	medea.GetMouseDelta = function() {
		return lastMouseDelta || [0,0,0];
	};

	medea.GetMouseWheelDelta = function() {
		return lastMouseWheelDelta || [0,0];
	};

	medea.GetMousePosition = function() {
		return lastMousePosition || [-1,-1];
	};
});



/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */



medealib.define('camcontroller',['entity','input'],function(undefined) {
	"use strict";
	var medea = this;


	 // mouse movements are always tracked
	medea.CAMCONTROLLER_MOUSE_STYLE_ALWAYS = 0x1;

	 // mouse movements are tracked iff ctrl (or the key it maps to) is pressed
	medea.CAMCONTROLLER_MOUSE_STYLE_ON_CTRL = 0x2;

	 // mouse movements are tracked iff ctrl (or the key it maps to) is not pressed
	medea.CAMCONTROLLER_MOUSE_STYLE_OFF_CTRL = 0x3;

	// mouse movements are tracked iff the left mouse button is pressed
	medea.CAMCONTROLLER_MOUSE_STYLE_ON_LEFT_MBUTTON = 0x4;

	 
	
	medea.CamController = medea.Entity.extend({

		enabled: false,
		turn_speed : 0.005,
		walk_speed : 5.5,
		last_processed_mdelta : -1,
		last_processed_mwdelta : -1,
		mouse_style : -1,

		init : function(enabled, mouse_style) {
			this._super();

			this.Enabled(enabled || false);
			this.MouseStyle(mouse_style || medea.CAMCONTROLLER_MOUSE_STYLE_OFF_CTRL);
		},


		Enabled : medealib.Property('enabled'),
		MouseStyle : medealib.Property('mouse_style'),
		

		// TODO: deprecate in favour of Enabled()
		Enable : function(enable) {
			this.enabled = true;
		},

		Disable : function(enable) {
			this.enabled = false;
		},
		
		
		Update : function(dtime, node) {
			if(!this.enabled) {
				return;
			}

			this.ProcessMouse(dtime, node);
			this.ProcessKeyboard(dtime, node);
		},


		ProcessMouse : function(dtime, node) {
			var d = medea.GetMouseDelta();
			var responsive = false;
			if(d[2] !== this.last_processed_mdelta) {
				if (this._ShouldHandleMouseMovements()) {
					if (d[0] !== 0 || d[1] !== 0) {
						responsive = true;
					}
					this.ProcessMouseDelta(dtime, node, d);
				}
				
				this.last_processed_mdelta = d[2];
			}

			d = medea.GetMouseWheelDelta();
			if(d[1] !== this.last_processed_mwdelta) {
				this.ProcessMouseWheel(dtime, node, d[0]);
				this.last_processed_mwdelta = d[1];
				if(d[0] !== 0) {
					responsive = true;
				}
			}

			if(responsive) {
				this._prev_responsive_state = false;
				medea.EnsureIsResponsive(true);
			}
			else if(this._prev_responsive_state !== undefined) {
				medea.EnsureIsResponsive(this._prev_responsive_state);
			}
		},
		
		
		ProcessMouseDelta : function(dtime, node, d) {
		},

		ProcessMouseWheel : function(dtime, node, z) {
		},
		
		ProcessKeyboard : function(dtime, node) {
		},


		_ShouldHandleMouseMovements : function() {
			switch(this.mouse_style) {
				case medea.CAMCONTROLLER_MOUSE_STYLE_ALWAYS:
					return true;
				case medea.CAMCONTROLLER_MOUSE_STYLE_OFF_CTRL:
					return !medea.IsKeyDown(17);
				case medea.CAMCONTROLLER_MOUSE_STYLE_ON_CTRL:
					return  medea.IsKeyDown(17);
				case medea.CAMCONTROLLER_MOUSE_STYLE_ON_LEFT_MBUTTON:
					return medea.IsMouseDown();
			}
		}
	});


	
	medea.FpsCamController = medea.CamController.extend({

		scratch_mat : null,
		hispeed_on_shift : true,
		terrain_entity : null,

		init : function(enabled) {
			this._super(enabled);

			this.turn_speed = 0.005;
			this.walk_speed = 5.5;

			this.scratch_mat = mat4.identity(mat4.create());
		},

		HispeedOnShift : medealib.Property('hispeed_on_shift'),
		TurnSpeed : medealib.Property('turn_speed'),
		WalkSpeed : medealib.Property('walk_speed'),
		TerrainEntity : medealib.Property('terrain_entity'),


		ProcessMouseDelta : function(dtime, n, d) {
			var mrot = this.scratch_mat;

			// process mouse movement on the y axis
			if(d[1] !== 0) {
				mrot = mat4.rotate(mat4.identity(mrot),-d[1]*this.turn_speed,n.LocalXAxis());
				n.LocalYAxis(mat4.multiplyVec3(mrot,n.LocalYAxis()));
				n.LocalZAxis(mat4.multiplyVec3(mrot,n.LocalZAxis()));
			}

			// process mouse movement on the x axis
			if(d[0] !== 0) {
				mrot = mat4.rotate(mat4.identity(mrot),-d[0]*this.turn_speed,[0,1,0]);
				n.LocalYAxis(mat4.multiplyVec3(mrot,n.LocalYAxis()));
				n.LocalZAxis(mat4.multiplyVec3(mrot,n.LocalZAxis()));
				n.LocalXAxis(vec3.cross(n.LocalYAxis(),n.LocalZAxis()));
			}
		},
			

		ProcessKeyboard : function(dtime, n) {

			var ws = this.walk_speed;
			if(this.hispeed_on_shift) {
				if(medea.IsKeyDown(16) /* SHIFT */) {
					ws *= 10;
				}
			}

			// W
			if(medea.IsKeyDown(87)) {
				n.Translate([0,0,-ws * dtime]);
			}
			// A
			if(medea.IsKeyDown(65)) {
				n.Translate([-ws * dtime,0,0]);
			}
			// S
			if(medea.IsKeyDown(83)) {
				n.Translate([0,0,ws * dtime]);
			}
			// D
			if(medea.IsKeyDown(68)) {
				n.Translate([ws * dtime,0,0]);
			}

			// PAGE UP
			var terrain = this.terrain_entity;
			if(medea.IsKeyDown(33)) {
				if (terrain) {
					terrain.HeightOffset(terrain.HeightOffset()+ws * dtime);
				}
				else {
					n.Translate([0,ws * dtime,0]);
				}
			}
			
			// PAGE DOWN
			if(medea.IsKeyDown(34)) {
				if (terrain) {
					terrain.HeightOffset(terrain.HeightOffset()-ws * dtime);
				}
				else {
					n.Translate([0,-ws * dtime,0]);
				}
			}
		}
	});
	
	
	medea.OrbitCamController = medea.CamController.extend({
		
		camera_distance : 2.5,
		pan_speed : 0.006,
		zoom_speed : 1.00105,
		minimum_camera_distance : 0.2,
		maximum_camera_distance : 10.0,
		dirty_trafo : true,
		pan_enable : true,
		zoom_enable : true,
		panning_mouse_buttons : null,
		axes_enabled : (1 | 2),
		phi : 0,
		theta : 0,
		theta_pole_dead_angle : 0.1,
		smoothing : false,
		target_smoothing_camera_distance : null,
		smooth_speed : 0.9,


		init : function(enabled, initial_rot_phi, initial_rot_theta) {
			this.panning_mouse_buttons = [1,2];
			this._super(enabled);
			this.turn_speed = 0.02;

			this.Reset(initial_rot_phi, initial_rot_theta);
		},

		// 1 bit set is x, 2 bit set is y
		AxesEnabled : medealib.Property('axes_enabled'),

		ThetaPoleDeadAngle : medealib.Property('theta_pole_dead_angle'),
		TurnSpeed : medealib.Property('turn_speed'),
		ZoomSpeed : medealib.Property('zoom_speed'),
		PanSpeed : medealib.Property('pan_speed'),

		PanEnable : medealib.Property('pan_enable'),
		ZoomEnable : medealib.Property('zoom_enable'),
		
		CameraDistance : function(distance, smooth) {
			if (distance === undefined) {
				return this.camera_distance;
			}

			this.target_smoothing_camera_distance = distance;
			if (!this.smoothing || !smooth) {
				this.camera_distance = distance;	
			}
		},

		// Speed of movement smoothing, in % per second.
		// A value of 0.9 means that the difference between the
		// current and the final camera position is reduced by 90%
		// every second.
		SmoothSpeed : medealib.Property('smooth_speed'),

		MinimumCameraDistance : medealib.Property('minimum_camera_distance'),
		MaximumCameraDistance : medealib.Property('maximum_camera_distance'),

		PanningMouseButtons : medealib.Property('panning_mouse_buttons'),
		Smoothing : medealib.Property('smoothing'),

		Reset : function(initial_rot_phi, initial_rot_theta) {
			if(initial_rot_phi) {
				this.phi = initial_rot_phi;
			}
		
			if(initial_rot_theta) {
				this.theta = initial_rot_theta;
			}

			this.pan_vector = [0.0,0.0,0.0];
			this.camera_distance = this.target_smoothing_camera_distance = 2.5;
			this.dirty_trafo = true;
		},

		Update : function(dtime, node) {
			this._super(dtime, node);

			// Smooth zooming
			if (this.smoothing) {
				var delta = this.target_smoothing_camera_distance - this.camera_distance;
				if (delta != 0) {
					delta *= 1.0 - Math.pow(1.0 - this.smooth_speed, dtime);
					this.camera_distance += delta;
					this.dirty_trafo = true;
				}
			}

			this._UpdateNodeTransformation(node);
		},

		ProcessMouse : function(dtime, node) {
			var d = medea.GetMouseDelta();
			if(d[2] !== this.last_processed_mdelta) {
			
				// Handle panning directly
				var did_panning = false;
				if (this.enabled && this.pan_enable) {
					if(!Array.isArray(this.panning_mouse_buttons)) {
						if(medea.IsMouseButtonDown(this.panning_mouse_buttons)) {
							did_panning = true;
							this.Pan(d[0], d[1]);
						}
					}
					else {
						for(var i = 0; i < this.panning_mouse_buttons.length; ++i) {
							if(medea.IsMouseButtonDown(this.panning_mouse_buttons[i])) {
								did_panning = true;
								this.Pan(d[0], d[1]);
								break;
							}
						}
					}
				}

				if (did_panning === false && this._ShouldHandleMouseMovements()) {
					this.ProcessMouseDelta(dtime, node, d);
				}
				this.last_processed_mdelta = d[2];
			}

			d = medea.GetMouseWheelDelta();
			if(d[1] !== this.last_processed_mwdelta) {
				this.ProcessMouseWheel(dtime, node, d[0]);
				this.last_processed_mwdelta = d[1];
			}
		},

		ProcessMouseDelta : function(dtime, node, d) {
			var	theta = this.theta
			,	theta_pole_dead_angle = this.theta_pole_dead_angle
			,	pi = Math.PI
			,	distance_scale = 2.0 * (this.camera_distance - this.minimum_camera_distance) /
					(this.maximum_camera_distance - this.minimum_camera_distance)
			;

			// Process mouse movement on the x axis
			if(d[0] !== 0 && (this.axes_enabled & 0x1)) {
				this.phi += d[0] * this.turn_speed * distance_scale;
			}
			
			// Process mouse movement on the y axis
			if(d[1] !== 0 && (this.axes_enabled & 0x2)) {
				theta -= d[1] * this.turn_speed * distance_scale;
				if(theta < theta_pole_dead_angle) {
					theta = theta_pole_dead_angle;
				}
				else if(theta > pi - theta_pole_dead_angle) {
					theta = pi - theta_pole_dead_angle;
				}
				this.theta = theta;
			}

			this.dirty_trafo = true;
		},
		
		ProcessMouseWheel : function(dtime, node, z) {
			if(!this.zoom_enable) {
				return;
			}

			var d = this.smoothing ? this.target_smoothing_camera_distance : this.camera_distance;
			d *= Math.pow(this.zoom_speed, -z * 50);
            d = Math.max(d, this.minimum_camera_distance);
            d = Math.min(d, this.maximum_camera_distance);

            if (this.smoothing) {
            	this.target_smoothing_camera_distance = d;
            }
            else {
				this.camera_distance = d;
			}
			this.dirty_trafo = true;
		},
		
		Pan : function(x, y) {
			if(!this.pan_enable) {
				return;
			}
			var ps = this.pan_speed;
            this.pan_vector[0] += -x * ps;
            this.pan_vector[1] += y * ps;
            this.pan_vector[2] = 0.0;

            this.dirty_trafo = true;
        },
		
		_UpdateNodeTransformation : (function() {
			var	view_with_offset 	= mat4.create()
			, 	vup 				= vec3.create()
			, 	vright 				= vec3.create()
			,	veye 				= vec3.create()
			;

			return function(node) {
				if (this.dirty_trafo === false) {
					return;
				}
				var	vo 			= view_with_offset
				,	dist 		= this.camera_distance
				,	phi 		= this.phi
				,	theta 		= this.theta
				,	sintheta 	= Math.sin(theta)
				;

				veye[0] = Math.cos(phi)*sintheta;
				veye[1] = Math.cos(theta);
				veye[2] = Math.sin(phi)*sintheta;
				vec3.normalize(veye);

				// note: the following is basically what gluLookAt() does

				// z-axis
				vo[8]  = veye[0];
				vo[9]  = veye[1];
				vo[10] = veye[2];
				vo[11] = 0;

				vup[0] = 0;
				vup[1] = 1;
				vup[2] = 0;
				
				vec3.cross(vup, veye, vright);
				vec3.normalize(vright); 

				// x axis
				vo[0]  = vright[0];
				vo[1]  = vright[1];
				vo[2]  = vright[2];
				vo[3]  = 0;

				vec3.cross(veye, vright, vup);
				vec3.normalize(vup);

				// y axis
				vo[4]  = vup[0];
				vo[5]  = vup[1];
				vo[6]  = vup[2];
				vo[7]  = 0;

				vo[12]  = 0;
				vo[13]  = 0;
				vo[14]  = 0;
				vo[15]  = 1;

				// translation
				vo[12] = veye[0] * dist;
				vo[13] = veye[1] * dist;
				vo[14] = veye[2] * dist;

				if(this.pan_enable) {
					mat4.translate(vo, this.pan_vector, vo);
				}

				node.LocalTransform(vo);
				this.dirty_trafo = false;
			};
		})()
	});
	
	
	
	medea.RotateXCamController = medea.CamController.extend({
		init : function(enabled) {
			this.turn_speed = 0.005;
			this._super(enabled);
		},
 
		TurnSpeed : medealib.Property('turn_speed'),

		ProcessMouseDelta : function(dtime, n, d) {
			
			// process mouse movement on the x axis
			if(d[0] !== 0) {
				var mrot = mat4.rotate(mat4.identity(mat4.create()),d[0]*this.turn_speed,[0,1,0]);
				n.LocalYAxis(mat4.multiplyVec3(mrot,n.LocalYAxis()));
				n.LocalZAxis(mat4.multiplyVec3(mrot,n.LocalZAxis()));
				n.LocalXAxis(vec3.cross(n.LocalYAxis(),n.LocalZAxis()));
			}		
		}
	});
	
	

	/** */
	medea.CreateCamController = function(kind, enabled) {
		kind = kind || 'fps';
		if(kind === 'fps') {
			return new medea.FpsCamController(enabled);
		}
		else if(kind === 'orbit') {
			return new medea.OrbitCamController(enabled);
		}
		else if(kind === 'rotatex') {
			return new medea.RotateXCamController(enabled);
		}
		else {
			medealib.DebugAssert("camcontroller mode not recognized: " + kind);
			return null;
		}
	};
});



/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('renderstate',[],function(medealib, undefined) {
	"use strict";
	var medea = this, gl = medea.gl;

	var setsimple = function(what,v, cur) {
		if (v) {
			gl.enable(what);
		}
		else {
			gl.disable(what);
		}

	};

	var df_table = {
		'never' 		: gl.NEVER,
		'less' 			: gl.LESS,
		'equal' 		: gl.EQUAL,
		'less_equal' 	: gl.LEQUAL,
		'greater' 		: gl.GREATER,
		'greater_equal' : gl.GEQUAL,
		'not_equal' 	: gl.NOTEQUAL,
		'always'		: gl.ALWAYS
	};

	var cfm_table = {
		'front' 		: gl.FRONT,
		'back' 			: gl.BACK,
		'both' 			: gl.FRONT_AND_BACK
	};

	var bf_table = {
		'one_minus_src_alpha' : gl.ONE_MINUS_SRC_ALPHA,
		'src_alpha' : gl.SRC_ALPHA,
		'one_minus_dst_alpha' : gl.ONE_MINUS_DST_ALPHA,
		'dst_alpha' : gl.DST_ALPHA,
		'one_minus_src_color' : gl.ONE_MINUS_SRC_COLOR,
		'src_color' : gl.SRC_COLOR,
		'one_minus_dst_color' : gl.ONE_MINUS_DST_COLOR,
		'dst_color' : gl.DST_COLOR,
		'one' : gl.ONE
	};

	var so_table = {
		'keep' : gl.KEEP,
		'zero' : gl.ZERO,
		'replace' : gl.REPLACE,
		'incr' : gl.INCR,
		'incr_wrap' : gl.INCR_WRAP,
		'decr' : gl.DECR,
		'decr_wrap' : gl.DECR_WRAP,
		'invert' : gl.INVERT,
	};

	// List of supported render states along with how they map to GL.
	//
	// Hardcoded, clear error messages here. It is easy to get those
	// states wrong, and very tedious to debug.
	var action_map = {
		'depth_test'  :  function(v) {
			setsimple(gl.DEPTH_TEST,v);
		},

		'depth_write' :  function(v) {
			gl.depthMask(v);
		},

		'depth_func'  :  function(v) {
			gl.depthFunc(df_table[v]);
		},

		'cull_face'  :  function(v) {
			setsimple(gl.CULL_FACE,v);
		},

		'cull_face_mode'  :  function(v) {
			gl.cullFace(cfm_table[v]);
		},

		'blend' : function(v) {
			setsimple(gl.BLEND,v);
		},

		'blend_func' : function(v) {
			gl.blendFunc(bf_table[v[0]], bf_table[v[1]]);
		},

		'color_mask' : function(v) {
			gl.colorMask(v[0], v[1], v[2], v[3]);
		},

		'stencil_op' : function(v) {
			gl.stencilOp(so_table[v[0]], so_table[v[1]], so_table[v[2]]);
		},

		'stencil_func' : function(v) {
			gl.stencilFunc(df_table[v[0]], v[1], v[2]);
		},

		'stencil_mask' : function(v) {
			gl.stencilMask(v);
		},

		'stencil_test' : function(v) {
			setsimple(gl.STENCIL_TEST,v);
		},
	};


	var cur_default = {};
	var global_defaults = {

		'stencil_func' : ['always', 0x0, 0xff],
		'stencil_op' : ['keep', 'keep', 'keep'],
		'stencil_mask' : 0x0,
		'color_mask' : [true, true, true, true],
		'blend_func' : ['one', 'one_minus_src_alpha'],
		'blend' : false,
		'cull_face_mode' : 'back',
		'cull_face' : true,
		'depth_func' : 'less_equal',
		'depth_write' : true,
		'depth_test' : true,
		'stencil_test' : false,
	};

	medea.SetDefaultState = function(s, pool) {
		var cur = pool.Get('_gl');

		// Merge global defaults with the given defaults. This ensures
		// a default value exists for every possible render state.

		var merged_default_state = {};
		for (var k in s) {
			merged_default_state[k] = s[k];
		}
		for (var k in global_defaults) {
			if (merged_default_state[k] === undefined) {
				merged_default_state[k] = global_defaults[k];
			}
		}

		cur_default = merged_default_state;
		for (var k in merged_default_state) {
			var mapped = action_map[k];
			if(mapped !== undefined) {
				var v = merged_default_state[k];

				if (cur[k] !== v) {
					mapped(v);
					cur[k] = v;
				}
			}
		}
	};

	medea.SetState = function(s, pool) {
		var cur = pool.Get('_gl');

		// Set all states that are specified by the given state dictionary
		for (var k in s) {
			var mapped = action_map[k];
			if(mapped !== undefined) {
				var v = s[k];

				if (cur[k] !== v) {
					mapped(v);
					cur[k] = v;
				}
			}
		}

		// Restore all other states from the current default state
		for (var k in cur_default) {
			if (k in s) {
				continue;
			}

			var mapped = action_map[k];
			if(mapped !== undefined) {
				var v = cur_default[k];
				if (cur[k] !== v) {
					mapped(v);
					cur[k] = v;
				}
			}
		}
	};
});



/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('node',['frustum'],function(medealib, undefined) {
	"use strict";

	var medea = this;

	medea.BB_INFINITE = 'i';
	medea.BB_EMPTY = 'e';

	medea._NODE_FLAG_DIRTY = 0x1;
	medea._NODE_FLAG_DIRTY_BB = 0x2;
	medea._NODE_FLAG_DIRTY_GI = 0x4;
	medea._NODE_FLAG_STATIC_BB = 0x8;

	medea.NODE_FLAG_NO_ROTATION = 0x40;
	medea.NODE_FLAG_NO_SCALING = 0x80;

	medea.NODE_FLAG_USER = 0x100000;

	var id_source = 0;

	medea.Node = medealib.Class.extend({

		// this is to allow subclasses to have their own flags set when the node's transformation
		// matrix is altered. By default we only set DIRTY.
		trafo_dirty_flag: medea._NODE_FLAG_DIRTY |
			medea._NODE_FLAG_DIRTY_GI |
			medea._NODE_FLAG_DIRTY_BB,

		parent : null,
		children : null,
		entities : null,
		id : null,
		name : null,
		plane_hint : null,
		listeners : null,
		lmatrix : null,
		gmatrix : null,
		gimatrix : null,
		bb : null,
		flags : null,
		enabled : null,
		static_bb : null,

		init : function(name, flags) {
			this.children = [];
			this.entities = [];
			this.id = id_source++;
			this.name = name || ("UnnamedNode_" + this.id);

			// For culling purposes, saves the index of the frustun plane
			// that caused this node to be culled recently. This exploits
			// temporal coherence in the scene.
			this.plane_hint = [0];

			this.listeners = {
				'OnUpdateGlobalTransform' : {},
				'OnUpdateBB' : {}
			};

			this.lmatrix = mat4.identity(mat4.create());
			this.gmatrix = mat4.create();
			this.gimatrix = mat4.create();

			this.bb = medea.CreateBB();

			this.flags = this.trafo_dirty_flag | (flags || 0);
			this.enabled = true;
		},
		
		// Enable or disable a node for rendering and updating.
		//
		// Disabled nodes still contribute their BB to the parent's
		// bounding box, but are neither updated or rendered.
		//
		// This is a cheap way of selectively enabling parts of a
		// scene without incurring expensive scenegraph changes.
		//
		// A node is initially enabled.
		Enabled : function(e) {
			if (e === undefined) {
				return this.enabled;
			}
			this.enabled = e;
		},

		Name : function(n) {
			if (n === undefined) {
				return this.name;
			}
			this.name = n;
		},

		GetEntities: function() {
			return this.entities;
		},

		GetActiveEntities: function(cam) {
			return this.entities;
		},

		AddEntity: function(ent) {

			this.entities.push(ent);
			ent.OnAttach(this);

			this._SetBBDirty();
		},

		// note: when doing this from within Entity.Update(), return medea.ENTITY_UPDATE_WAS_REMOVED
		RemoveEntity: function(ent) {
			var idx = this.entities.indexOf(ent);
			if(idx !== -1) {
				ent.OnDetach(this);

				this._SetBBDirty();
				this.entities.splice(idx,1);
			}
		},
		
		RemoveAllEntities: function(tag) {
			if(tag === undefined) {
				for (var i = 0; i < this.entities.length; ++i) {
					this.entities[i].OnDetach(this);
				}
				
				this.entities = [];
				this._SetBBDirty();
				return;
			}
			for (var i = 0; i < this.entities.length; ++i) {
				var ent = this.entities[i];
				if(ent.Tag() !== tag) {
					continue;
				}
				
				ent.OnDetach(this);

				this._SetBBDirty();
				this.entities.splice(i,1);
			}
		},

		FilterEntities : function(classes, callback) {
			if (Array.isArray(classes)) {
				var ce = classes.length;
				for (var i = 0, e = this.entities.length; i < e; ++i) {
					var ent = this.entities[i];
					for (var c = 0; c < ce; ++c) {
						if (ent instanceof classes[c]) {
							callback(ent);
						}
					}
				}
				return;
			}

			for (var i = 0, e = this.entities.length; i < e; ++i) {
				var ent = this.entities[i];
				if (ent instanceof classes) {
					callback(ent);
				}
			}
		},

		FilterEntitiesRecursively : function(classes, callback) {
			this.FilterEntities(classes, callback);
			var e = this.children.length;
			for (var i = 0; i < e; ++i) {
				this.children[i].FilterEntitiesRecursively(classes, callback);
			}
		},

		GetChildren: function() {
			return this.children;
		},

		GetParent: function() {
			return this.parent;
		},

		AddChild: function(child) {

			if(typeof child !== 'object' || !( child instanceof medea.Node )) {
				child = new medea.Node(child);
			}

			if(child.parent === this) {
				return;
			}

			this.children.push(child);
			this._SetBBDirty();

			child.OnAttach(this);
			return child;
		},

		RemoveChild: function(child) {
			var idx = this.children.indexOf(child);
			if(idx !== -1) {

				this._SetBBDirty();
				child.OnAttach(null);

				this.children.splice(idx,1);
				child.parent = null;
			}
		},

		OnAttach : function(parent) {

			this.parent = parent;
			this._SetTrafoDirty();
		},

		// Update gets called once per frame with the |dtime| passed
		// since the last frame, in seconds.
		Update: function(dtime) {
			// All regular updates are carried out lazily, so this is a no-op
		},

		// Render gets called once per frame per camera for nodes that are
		// at least partially visible with respect to the camera.
		//
		// The default implementation does nothing.
		//
		// It gets called *before* Render() is called on all entities that are
		// attached to the node. It is also called *before* recursing into node
		// children (or even checking if they are visible), so any changes made
		// to the node's children take effect immediately.
		Render : function(camera, rqmanager) {
		},

		// Assign a static (local) AABB to the node.
		//
		// |static_bb| will be the static Bounding Box (can be an oriented BB)
		// that is used for culling the node from now on. Automatic upwards
		// propagation of changes to bounding boxes is disabled in sub trees
		// rooted at a static bounding box, saving updates. Changes to the
		// static BB are still propagated to its own parents, though.
		//
		// The static BB is specified in local space. It is transformed
		// by and affected by changes to the node's world matrix.
		//
		// Use this to
		//   1) force a specific bounding box size (i.e. for nodes whose child
		//      nodes are dynamically populated, i.e. a terrain quad tree).
		//   2) avoid any further BB updates if further changes are negligible.
		//      To do so, use |SetStaticBB(GetBB())|
		//
		// To go back to automatic BB calculation, pass |static_bb| falsy.
		SetStaticBB : function(static_bb) {
			if (!static_bb) {
				this.flags &= ~medea._NODE_FLAG_STATIC_BB;
				this.flags |= medea._NODE_FLAG_DIRTY_BB;
				this._UpdateBB();
				return;
			}
			this.flags |= medea._NODE_FLAG_STATIC_BB | medea._NODE_FLAG_DIRTY_BB;
			this.static_bb = static_bb;

			this.bb = null;
			this._FireListener("OnUpdateBB");

			// Propagate the static bounding box up in the tree
			if (this.parent) {
				this.parent._SetBBDirty();
			}
		},

		// Returns a static BB previously set using |SetStaticBB| or |null|
		// if no static bounding box is set.
		GetStaticBB : function() {
			if (this.flags & medea._NODE_FLAG_STATIC_BB) {
				return null;
			}
			return this.static_bb;
		},

		// Returns a world-space AABB for this node.
		//
		// Possible results are also the two special BBs |medea.BB_EMPTY|
		// and |medea.BB_INFINITE|. Unless one of the two occurs, the
		// resulting AABB is always an array of length 2, the first
		// element being a vec3 with the minimum vertices and the second
		// element being a vec3 with the maximum vertices for the
		// AABB that contains the node in world-space.
		//
		// TODO: rename to GetAABB(), the current name is misleading
		// as the BB returned by |GetBB| is strictly speaking also
		// given in world space.
		GetWorldBB: function() {
			this._UpdateBB();
			return this.bb;
		},

		// Returns any BB for this node.
		//
		// Unlike |GetWorldBB| the result value can also be an oriented
		// bounding box for which a third array element contains the
		// transformation matrix by which to transform all corner points
		// of the box.
		//
		// |medea.MakeAABB(GetBB()) equals GetWorldBB()| always holds.
		GetBB: function() {
			this._UpdateBB();
			return this.bb;
		},

		Cull : function(frustum) {
			return medea.BBInFrustum(frustum, this.GetWorldBB(), this.plane_hint);
		},

		// pure getter, nowadays deprecated
		GetLocalTransform: function() {
			return this.lmatrix;
		},

		LocalTransform: function(l, no_copy) {
			if(l === undefined) {
				return this.lmatrix;
			}

			this._SetTrafoDirty();

			if(no_copy) {
				this.lmatrix = l;
			}
			else {
				mat4.set(l, this.lmatrix);
			}
		},

		GetGlobalTransform: function() {
			this._UpdateGlobalTransform();
			return this.gmatrix;
		},

		GetInverseGlobalTransform: function() {
			this._UpdateInverseGlobalTransform();
			return this.gimatrix;
		},

		TryGetInverseGlobalTransform: function() {
			return this.flags & medea._NODE_FLAG_DIRTY_GI ? null : this.gimatrix;
		},

		Translate: function(vec) {
			mat4.translate(this.lmatrix, vec);
			this._SetTrafoDirty();
			return this;
		},

		TransformBy : function(mat) {
			mat4.multiply(this.lmatrix, mat, this.lmatrix);
			this._SetTrafoDirty();
			return this;
		},

		Rotate: function(angle,axis) {

			mat4.rotate(this.lmatrix,angle,axis);
			this._SetTrafoDirty();
			return this;
		},

		// Order of translate and scale matters
		Scale: function(s) {

			mat4.scale(this.lmatrix, typeof s === 'number' ? [s,s,s] : s);
			this._SetTrafoDirty();
			return this;
		},

		ScaleToFit : function(s) {
			var bb = this.GetBB()
			,	m
			,	e
			;

			e = Math.max(-bb[0][0],bb[1][0],-bb[0][1],bb[1][1],-bb[0][2],bb[1][2]);
			if(e > 1e-6) {
				e = ( s === undefined ? 1.0 : s) / e;

				var vec = [e, e, e, 0];

				// bbs are in world-space, so we have to make it a world-space scaling
				// it is not our job to correct non-uniform scale occuring anywhere
				// in the tree stem, so take the min scale that is in the parent transform
				if(this.parent) {
					var pinv = this.parent.GetGlobalTransform()
					,	v1 = [pinv[0],pinv[4],pinv[8]]
					,	v2 = [pinv[1],pinv[5],pinv[9]]
					,	v3 = [pinv[2],pinv[6],pinv[10]]
					;
					e = e / Math.sqrt(Math.min(vec3.dot(v1,v1), vec3.dot(v2,v2), vec3.dot(v3,v3)));
				}
				
				this.Scale(e);

				// also apply scaling to the translation component
				this.lmatrix[12] *= e;
				this.lmatrix[13] *= e;
				this.lmatrix[14] *= e;
			}		
		},

		Center : function(world_point) {
			world_point = world_point || [0,0,0];

			var bb = this.GetBB();


			var x = bb[1][0] + bb[0][0];
			var y = bb[1][1] + bb[0][1];
			var z = bb[1][2] + bb[0][2];
			var vec = [-x/2 + world_point[0], -y/2 + world_point[1], -z/2 + world_point[2]];

			// bbs are in world-space, so we have to make it a world-space translation
			// by using the parent global transform as offset
			if(this.parent) {
				var pinv = this.parent.GetInverseGlobalTransform();
				mat4.multiplyVec3(pinv, vec);
			}
			this.Translate(vec);
		},


		ResetTransform: function() {
			mat4.identity(this.lmatrix);
			this._SetTrafoDirty();
			return this;
		},

		LocalXAxis: function(l) {
			if(l === undefined) {
				return [this.lmatrix[0],this.lmatrix[1],this.lmatrix[2]];
			}
			var m = this.lmatrix;
			m[0] = l[0];
			m[1] = l[1];
			m[2] = l[2];
			this._SetTrafoDirty();
		},

		LocalYAxis: function(l) {
			if(l === undefined) {
				return [this.lmatrix[4],this.lmatrix[5],this.lmatrix[6]];
			}
			var m = this.lmatrix;
			m[4] = l[0];
			m[5] = l[1];
			m[6] = l[2];
			this._SetTrafoDirty();
		},

		LocalZAxis: function(l) {
			if(l === undefined) {
				return [this.lmatrix[8],this.lmatrix[9],this.lmatrix[10]];
			}
			var m = this.lmatrix;
			m[8] = l[0];
			m[9] = l[1];
			m[10] = l[2];
			this._SetTrafoDirty();
		},

		LocalPos: function(l) {
			if(l === undefined) {
				return [this.lmatrix[12],this.lmatrix[13],this.lmatrix[14]];
			}
			var m = this.lmatrix;
			m[12] = l[0];
			m[13] = l[1];
			m[14] = l[2];
			this._SetTrafoDirty();
		},

		GetWorldScale: function() {
			this._UpdateGlobalTransform();
			var m = this.gmatrix;

			// Scaling factors can be found as the lengths of the row vectors
			var x_len = Math.sqrt(m[0] * m[0] + m[4] * m[4] + m[8] * m[8]);
			var y_len = Math.sqrt(m[1] * m[1] + m[5] * m[5] + m[11] * m[11]);
			var z_len = Math.sqrt(m[2] * m[2] + m[6] * m[6] + m[12] * m[12]);
			return [x_len, y_len, z_len];
		},

		// Returns the scaling factor that is applied along the world
		// x-axis. If all scaling transformations applied to the
		// node are uniform scalings, this can be considered the world
		// scaling.
		GetWorldUniformScale: function() {
			this._UpdateGlobalTransform();
			var m = this.gmatrix;

			// Scaling factors can be found as the lengths of the row vectors
			// So any row will do.
			var x_len = Math.sqrt(m[0] * m[0] + m[4] * m[4] + m[8] * m[8]);

			// TODO: If the scalings along the axes disagree, a suitable
			// generalization would be the spectral norm of the world
			// transformation matrix given by
			//
			// |sqrt(lambda_max(M^T * M))|
			//
			// where lambda_max(X) denotes the largest eigen value of X.
			return x_len;
		},

		GetWorldPos : function() {
			this._UpdateGlobalTransform();
			return [this.gmatrix[12],this.gmatrix[13],this.gmatrix[14]];
		},

		GetWorldXAxis : function() {
			this._UpdateGlobalTransform();
			return [this.gmatrix[0],this.gmatrix[1],this.gmatrix[2]];
		},

		GetWorldYAxis : function() {
			this._UpdateGlobalTransform();
			return [this.gmatrix[4],this.gmatrix[5],this.gmatrix[6]];
		},

		GetWorldZAxis : function() {
			this._UpdateGlobalTransform();
			return [this.gmatrix[8],this.gmatrix[9],this.gmatrix[10]];
		},

		AddListener : function(what,l, key) {
			this.listeners[what][key] = l;
		},

		RemoveListener : function(key) {
			for(var k in this.listeners) {
				try {
					delete this.listeners[k][key];
				}
				catch(e) {
				}
			}
		},


		_UpdateGlobalTransform: function() {
			if (!(this.flags & medea._NODE_FLAG_DIRTY)) {
				return;
			}
			this.flags &= ~medea._NODE_FLAG_DIRTY;
			if (this.parent) {
				mat4.multiply(this.parent.GetGlobalTransform(),this.lmatrix,this.gmatrix);
			}
			else {
				this.gmatrix = mat4.create( this.lmatrix );
			}
			this._FireListener("OnUpdateGlobalTransform");
		},

		_UpdateInverseGlobalTransform: function() {
			if (!(this.flags & medea._NODE_FLAG_DIRTY_GI)) {
				return;
			}

			this._UpdateGlobalTransform();

			this.flags &= ~medea._NODE_FLAG_DIRTY_GI;
			mat4.inverse(this.gmatrix,this.gimatrix);
		},

		_SetTrafoDirty : function() {
			this.flags |= this.trafo_dirty_flag;
			this._SetBBDirty();

			var children = this.children;
			for( var i = children.length-1; i >= 0; --i ) {
				children[i]._SetTrafoDirty();
			}
		},

		_SetBBDirty : function() {
			// No upwards propagation for static bounding boxes.
			// See SetStaticBB()
			if (this.flags & medea._NODE_FLAG_STATIC_BB) {
				return;
			}
			var node = this, flag = medea._NODE_FLAG_DIRTY_BB;
			do {
				node.flags |= flag;
				node = node.parent;
			}
			while(node != null);
		},

		_UpdateBB: function() {
			if (!(this.flags & medea._NODE_FLAG_DIRTY_BB)) {
				return;
			}

			var trafo = this.GetGlobalTransform();
			this.flags &= ~medea._NODE_FLAG_DIRTY_BB;

			// For static bounding boxes, the BB is only transformed to a
			// worldspace AABB. Children are not taken into account.
			// See SetStaticBB()
			if (this.flags & medea._NODE_FLAG_STATIC_BB) {
				this.bb = medea.MakeAABB(medea.TransformBB( this.static_bb, trafo ));
				return;
			}

			var bbs = new Array(this.children.length + this.entities.length);

			var children = this.children;
			for( var i = children.length-1; i >= 0; --i ) {
				bbs[i] = children[i].GetBB();
			}

			var entities = this.entities;
			for( var i = entities.length-1; i >= 0; --i ) {
				bbs[i + children.length] = medea.TransformBB( entities[i].BB(), trafo );
			}

			this.bb = medea.MergeBBs(bbs);


			this._FireListener("OnUpdateBB");
			return this.bb;
		},

		_FireListener : function(what) {
			var l = this.listeners[what];
			if(l) {
				for(var k in l) {
					l[k].apply(this,arguments);
				}
			}
		}
	});

	//
	medea.CreateNode = function(name, flags) {
		return new medea.Node(name, flags);
	};
});





/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('vertexbuffer',[],function(medealib, undefined) {
	"use strict";
	var medea = this, gl = medea.gl;

	// http://blog.tojicode.com/2012/10/oesvertexarrayobject-extension.html
	var va_ext =  gl.getExtension("OES_vertex_array_object") ||
		gl.getExtension("MOZ_OES_vertex_array_object") ||
		gl.getExtension("WEBKIT_OES_vertex_array_object");



	// constants for mappings of various vertex attributes, these map 1 one by one
	// to the standard names for shader attribute names.
	medea.ATTR_POSITION      = "POSITION";
	medea.ATTR_NORMAL        = "NORMAL";
	medea.ATTR_TANGENT       = "TANGENT";
	medea.ATTR_BITANGENT     = "BITANGENT";

	medea.ATTR_TEXCOORD_BASE = "TEXCOORD";
	medea.ATTR_COLOR_BASE    = "COLOR";

	medea.ATTR_TEXCOORD = function(n) { return medea.ATTR_TEXCOORD_BASE + n; };
	medea.ATTR_COLOR = function(n) { return medea.ATTR_COLOR_BASE + n; };



	// NOTE: the constants below may not overlap with any of the IBuffer flags

	// mark data in the buffer as frequently changing and hint the driver to optimize for this
	medea.VERTEXBUFFER_USAGE_DYNAMIC = 0x1000;

	// enable GetSourceData()
	medea.VERTEXBUFFER_PRESERVE_CREATION_DATA = 0x2000;




	// some global utilities. IndexBuffer relies on those as well.
	medea._GLUtilGetFlatData = function(i,pack_dense) {
		pack_dense = pack_dense || false;

		if (i instanceof Float32Array) {
			return i;
		}

		return new Float32Array(i);
	};

	medea._GLUtilIDForArrayType = function(e) {
		if (e instanceof Float32Array) {
			return gl.FLOAT;
		}
		else if (e instanceof Int16Array) {
			return gl.SHORT;
		}
		else if (e instanceof Uint8Array) {
			return gl.UNSIGNED_BYTE;
		}
		else if (e instanceof Uint32Array) {
			return gl.UNSIGNED_INT;
		}
		else if (e instanceof Int32Array) {
			return gl.INT;
		}
		else if (e instanceof Uint16Array) {
			return gl.UNSIGNED_SHORT;
		}
		else if (e instanceof Int8Array) {
			return gl.BYTE;
		}
		return null;
	};

	medea._GLUtilSpaceForSingleElement = function(id) {

		switch(id) {
			case gl.FLOAT:
			case gl.INT:
			case gl.UNSIGNED_INT:
				return 4;
			case gl.SHORT:
			case gl.UNSIGNED_SHORT:
				return 2;
			case gl.BYTE:
			case gl.UNSIGNED_BYTE:
				return 1;
		};
		return -1;
	};



	// private class _VBOInitDataAccessor
	this._VBOInitDataAccessor = medealib.Class.extend({

		positions : null,
		normals : null,
		tangents : null,
		bitangents : null,
		colors : null,
		uvs : null,

		flags : 0,

		// cached number of full vertices
		itemcount : -1,

		interleaved : null,
		state_closure : [],

		minmax : null,

		init : function(data,flags, state_closure) {

			this.flags = flags;
			this.state_closure = state_closure || [];

			if (data instanceof Array) {
				this.positions = data;

			}
			else {
				if ("positions" in data) {
					this.positions = medea._GLUtilGetFlatData( data.positions );
				}
				if ("normals" in data) {
					this.normals = medea._GLUtilGetFlatData( data.normals );
				}
				if ("tangents" in data) {
					this.tangents = medea._GLUtilGetFlatData( data.tangents );
					if ("bitangents" in data) {
						this.bitangents = medea._GLUtilGetFlatData( data.bitangents );
					}
				}
				if (data.colors) {
					// XXX 'pack' color values
					this.colors =  data.colors.map(medea._GLUtilGetFlatData);
				}
				if (data.uvs) {
					this.uvs = data.uvs.map(medea._GLUtilGetFlatData);
				}
			}

			this.itemcount = this.positions.length/3;
		},


		SetupGlData : function() {

			var stride = 0, idx = 0;
			var state_closure = this.state_closure;

			this.minmax = medea.CreateBB();
			var mmin = this.minmax[0],mmax = this.minmax[1],min = Math.min, max = Math.max;

			// compute stride per vertex
			if (this.positions) {
				stride += 3*4;
			}
			if (this.normals) {
				stride += 3*4;
			}
			if (this.tangents) {
				stride += 3*4;
				if (this.bitangents) {
					stride += 3*4;
				}
			}
			if (this.colors) {
				this.colors.forEach(function(u) {
					stride += Math.floor(u.length / this.itemcount) * 4; // XXX packing as UBYTE8?
				},this);
			}
			if (this.uvs) {
				this.uvs.forEach(function(u) {
					stride += Math.floor(u.length / this.itemcount) * 4;
				},this);
			}

			var ab = new ArrayBuffer(this.itemcount * stride);

			// this is used to build the state_closure array, which is later used during rendering
			// to prepare the OpenGL pipeline for drawing this VBO. However, if the calling code
			// did already supply us with it, we make this a no-op.
			var addStateEntry = !state_closure.length ? function(attr_type,idx,elems,type) {
				type = type || gl.FLOAT;
				elems = elems || 3;

				(function(idx,stride,offset) {
					var entry_key = [elems,type,stride,offset].join('-');

					state_closure.push(function(in_map, state) {
						var real_idx = idx;
						if(in_map) {
							real_idx = in_map[attr_type];
							if (real_idx === undefined) {
								return; // don't set this attribute
							}
						}

						if(!state) {
							gl.enableVertexAttribArray(real_idx);
							gl.vertexAttribPointer(real_idx,elems, type,false,stride,offset);
							return
						}

						var gls = state.GetQuick('_gl'), va = gls.va;
						if (!va) {
							va = gls.va = [];
						}
						var	prev = va[real_idx];

						if (prev === undefined) {
							gl.enableVertexAttribArray(real_idx);
						}

						if (prev !== entry_key) {
							gl.vertexAttribPointer(real_idx,elems, type,false,stride,offset);
							va[real_idx] = entry_key;
						}
					});
				}) (idx,stride,offset);
			} : function() {};

			// now setup vertex attributes accordingly
			var offset = 0,  end = this.itemcount, mul = stride/4;
			if (this.positions) {
				var view = new Float32Array(ab,offset);
				for(var i = 0, i3 = 0,im = 0, p = this.positions; i < end; ++i, i3 += 3, im += mul) {
					view[im+0] = p[i3+0];
					view[im+1] = p[i3+1];
					view[im+2] = p[i3+2];


					// gather minimum and maximum vertex values, those will be used to derive a suitable BB
					mmin[0] = min(p[i3+0],mmin[0]);
					mmin[1] = min(p[i3+1],mmin[1]);
					mmin[2] = min(p[i3+2],mmin[2]);

					mmax[0] = max(p[i3+0],mmax[0]);
					mmax[1] = max(p[i3+1],mmax[1]);
					mmax[2] = max(p[i3+2],mmax[2]);
				}

				addStateEntry(medea.ATTR_POSITION,idx++);
				offset += 3*4;
			}


			if (this.normals) {
				var view = new Float32Array(ab,offset);
				for(var i = 0, i3 = 0, im = 0, p = this.normals; i < end; ++i, i3 += 3, im += mul) {
					view[im+0] = p[i3+0];
					view[im+1] = p[i3+1];
					view[im+2] = p[i3+2];
				}

				addStateEntry(medea.ATTR_NORMAL,idx++);
				offset += 3*4;
			}


			if (this.tangents) {
				var view = new Float32Array(ab,offset);
				for(var i = 0, i3 = 0, im = 0, p = this.tangents; i < end; ++i, i3 += 3, im += mul) {
					view[im+0] = p[i3+0];
					view[im+1] = p[i3+1];
					view[im+2] = p[i3+2];
				}

				addStateEntry(medea.ATTR_TANGENT,idx++);
				offset += 3*4;
				if (this.bitangents) {

					view = new Float32Array(ab,offset);
					for(var i = 0, i3 = 0, im = 0, p = this.bitangents; i < end; ++i, i3 += 3, im += mul) {
						view[im+0] = p[i3+0];
						view[im+1] = p[i3+1];
						view[im+2] = p[i3+2];
					}

					addStateEntry(medea.ATTR_BITANGENT,idx++);
					offset += 3*4;
				}
			}

			if (this.colors) {
				this.colors.forEach(function(u,ii) {
					var elems = Math.floor(u.length / this.itemcount), type = medea._GLUtilIDForArrayType(u);


					var view = new Float32Array(ab,offset);
					for(var i = 0; i < end; ++i) {
						for(var n = 0; n < elems; ++n) {
							view[i*mul+n] = u[i*elems+n];
						}
					}

					addStateEntry(medea.ATTR_COLOR(ii),idx++,elems,type);
					offset += elems * medea._GLUtilSpaceForSingleElement(type);
				},this);
			}

			if (this.uvs) {
				this.uvs.forEach(function(u,ii) {
					var elems = Math.floor(u.length / this.itemcount), type = medea._GLUtilIDForArrayType(u);


					var view = new Float32Array(ab,offset);
					for(var i = 0, im = 0; i < end; ++i, im += mul) {
						for(var n = 0; n < elems; ++n) {
							view[im+n] = u[i*elems+n];
						}
					}

					addStateEntry(medea.ATTR_TEXCOORD(ii),idx++,elems,type);
					offset += elems * medea._GLUtilSpaceForSingleElement(type);
				},this);
			}

			this.stride = stride;

			gl.bufferData(gl.ARRAY_BUFFER,ab, this.flags & medea.VERTEXBUFFER_USAGE_DYNAMIC 
				? gl.DYNAMIC_DRAW 
				: gl.STATIC_DRAW);

			this.interleaved = ab;
		},


		GetItemCount : function() {
			return this.itemcount;
		},

		GetStateClosure : function() {
			return this.state_closure;
		},

		GetMinMaxVerts : function() {
			return this.minmax;
		}

	});

	// class VertexBuffer
	this.VertexBuffer = medealib.Class.extend({

		// Id of underlying OpenGl buffer object
		buffer: -1,

		// number of complete vertices
		itemcount: 0,

		// initial flags
		flags: 0,

		// only present if the PRESERVE_CREATION_DATA flag is set
		init_data : null,

		state_closure : [],

		init : function(init_data,flags) {
			this.flags = flags | 0;


			this.Fill(init_data);
		},

		// medea.VERTEXBUFFER_USAGE_DYNAMIC recommended if this function is used
		Fill : function(init_data, same_layout) {
			var old = gl.getParameter(gl.ARRAY_BUFFER_BINDING)
			,	access
			;

			if (this.buffer === -1) {
				this.buffer = gl.createBuffer();
			}
			gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);

			access = new medea._VBOInitDataAccessor(init_data,this.flags, same_layout ? this.state_closure : null );
			access.SetupGlData();

			// restore state - this is crucial, as redundant buffer changes are
			// optimized away based on info in medea's statepool, 
			// not glGetInteger()
			if(old) {
				gl.bindBuffer(gl.ARRAY_BUFFER,old);
			}

			this.itemcount = access.GetItemCount();
			this.state_closure = access.GetStateClosure();
			this.minmax = access.GetMinMaxVerts();

			if (this.flags & medea.VERTEXBUFFER_PRESERVE_CREATION_DATA) {
				this.init_data = init_data;
			}
		},

		_TryPopulateVAO : function(attrMap) {
			if (!va_ext) {
				return;
			}

			var old = gl.getParameter(gl.ARRAY_BUFFER_BINDING);

			this.vao = va_ext.createVertexArrayOES();
			if(!this.vao) {
				return;
			}

			va_ext.bindVertexArrayOES(this.vao);
			gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);

			this.state_closure.forEach(function(e) {
				e(attrMap);
			});

			va_ext.bindVertexArrayOES(null);
			this._vao_attrmap = attrMap;

			if(old) {
				gl.bindBuffer(gl.ARRAY_BUFFER,old);
			}
		},

		GetBufferId : function() {
			return this.buffer;
		},

		GetFlags : function() {
			return this.flags;
		},

		GetItemCount : function() {
			return this.itemcount;
		},

		GetMinMaxVerts : function() {
			return this.minmax;
		},

		GetSourceData : function() {
			return this.init_data;
		},

		Dispose : function() {
			if (this.buffer === -1) {
				return;
			}

			gl.deleteBuffer(this.buffer);
			this.buffer = -1;
		},

		_Bind : function(attrMap, statepool) {
			var id = this.buffer, gls = statepool.GetQuick('_gl');

			// TODO: what if the attribute mapping object changes its contents?
			// is this allowed to happen? Either case it needs to be documented.
			if (gls.ab === id && gls.amap === attrMap) {
				return;
			}

			gls.ab = id;
			gls.amap = attrMap;

			// use VAO if available. The VAO changes, however, with the input attribute
			// map so we have to quickly detect if the current VAO is still up to date.
			if(va_ext) {
				if(this.vao) {
					var cached = this._vao_attrmap;
					var dirty = false;
					
					if(attrMap && cached) {
						if (attrMap !== cached) {
						
							// TODO: better way of doing this?
							for(var key in attrMap) {
								if (attrMap[key] !== cached[key]) {
									dirty = true;
									break;
								}
							}
							for(var key in cached) {
								if (attrMap[key] !== cached[key]) {
									dirty = true;
									break;
								}
							}
						}
					}
					else if (attrMap || cached) {
						dirty = true;
					}

					if(dirty) {
						va_ext.deleteVertexArrayOES(this.vao);
						this.vao = null;
					}
				}

				if(!this.vao) {
					this._TryPopulateVAO(attrMap);
				}

				if(this.vao) {
					va_ext.bindVertexArrayOES(this.vao);
					return;
				}
			}

			// invalidate the state cache for vertexAttrib binding
			// now that the buffer is changed.
			if (gls.va) {
				gls.va.length = 0;
			}

			gl.bindBuffer(gl.ARRAY_BUFFER,id);
			this.state_closure.forEach(function(e) {
				e(attrMap, statepool);
			});
		}
	});


	this.CreateVertexBuffer = function(init_data,flags) {
		return new medea.VertexBuffer(init_data,flags);
	}
});


/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('nativeimagepool',[],function(medealib, undefined) {
	"use strict";
	var medea = this;

	var pool = [];

	// cache all (DOM) Image instances in possession of medea.
	// This is to avoid constant re-creation of images if resources are
	// streamed. It only works if texture users Dispose() of their
	// images once they finish using them, though.

	medea._GetNativeImageFromPool = function() {
		if(pool.length) {
			return pool.shift();
		}
		return new Image();
	};

	medea._ReturnNativeImageToPool = function(image) {

		// reset the src attribute in the hope that this frees memory allocated
		// for the Image.
		image.src = "";


		pool.push(image);
	};
});



// Based on https://github.com/mrdoob/stats.js, this is a stats display
// that relies on external input instead of measuring by itself.

// It can, therefore, be used to measure any stats data.
// For performance (DOM!) update() call frequency should be throttled.
var MiniStatsDisplay = function (config) {
	var predef_styles = [
		  ['#002','#0ff','#133']
		, ['#020','#0f0','#130']
		, ['#200','#f00','#131']
		, ['#220','#ff0','#131']
	];

	var	width 			= config.width || 80
	,	caption 		= config.caption || 'stat'
	,	stat 			= 0
	,	stat_min 		= Infinity
	,	stat_max 		= 0
	,	frames 			= 0
	,	style 			= predef_styles[config.style || 0]
	,	bar_width		= config.bar_width || 4
	,	bar_count		= Math.floor((width-6)/bar_width)
	,	left			= config.left || 0
	,	top				= config.top || 0
	,	range			= config.range ? [config.range[0], config.range[1]] : [0,100]
	,	range_changed 	= false
	,	range_upd_freq	= config.autorange
	;

	var container = document.createElement( 'div' );
	container.id = 'stats';
	container.style.cssText = 'width:'+width+'px;opacity:0.9;cursor:pointer';

	var statDiv = document.createElement( 'div' );
	statDiv.id = 'stat';
	statDiv.style.cssText = 'padding:0 0 3px 3px;text-align:left;'+
		'background-color:'+style[0];
	container.appendChild( statDiv );

	var statText = document.createElement( 'div' );
	statText.id = 'statText';
	statText.style.cssText = 'font-family:Helvetica,Arial,sans-serif;'+
		'font-size:9px;font-weight:bold;line-height:15px;color:' + style[1];
	statText.innerHTML = 'stat';
	statDiv.appendChild( statText );

	var stat_graph = document.createElement( 'div' );
	stat_graph.id = 'stat_graph';
	stat_graph.style.cssText = 'position:relative;width:' + 
		(bar_count * bar_width)+'px;height:30px;background-color:'+style[1];
	statDiv.appendChild( stat_graph );

	while ( stat_graph.children.length < bar_count ) {
		var bar = document.createElement( 'span' );
		bar.style.cssText = 'width:'+bar_width+'px;height:30px;float:left;'+
			'background-color:'+style[2];
		stat_graph.appendChild( bar );
	}

	container.style.position = 'absolute';
	container.style.left = left + 'px';
	container.style.top = top + 'px';
	document.body.appendChild( container );

	var updateGraph = function ( dom, value ) {
		var child = dom.appendChild( dom.firstChild );
		child.style.height = value + 'px';
	}

	return {

		container : container,

		destroy : function() {
			document.body.removeChild( container );
		},

		range : function(lower, upper) {
			range = [lower|0, upper|0];
			range_changed = true;
		},

		autorange : function(update_frequency) {
			range_upd_freq = update_frequency|0;
		},

		update: function (new_val) {
			var i, kids, new_range, e;

			new_val = new_val|0;
			stat_min = Math.min( stat_min, new_val );
			stat_max = Math.max( stat_max, new_val );

			// if autorange is enabled, update the range every n frames
			// with the minimum/maximum values collected in this time
			// and clear those.
			if(range_upd_freq && (frames % range_upd_freq) === range_upd_freq - 1) {
				e = Math.max(1, (range[1] - range[0]) >> 3);

				new_range = [Math.floor(stat_min * 0.9), Math.ceil(stat_max * 1.1)];
				if (Math.abs(new_range[0] - range[0]) > e || Math.abs(new_range[1] - range[1]) > e) {
					range = new_range;
					range_changed = true;
				}
			}

			// if the range changed, reset all bars
			if(range_changed) {
				kids = stat_graph.children;
				for(i = kids.length-1; i >= 0; --i) {
					kids[i].style.height = '30px';
				}
				range_changed = false;
			}

			statText.textContent = new_val + ' '+ caption +' (' + stat_min + '-' + stat_max + ')';
			updateGraph( stat_graph, Math.max(0, Math.min( 30, 30 - ( (new_val - range[0]) / (range[1] - range[0]) ) * 30)));
			frames++;
		},
	}
};
medealib._MarkScriptAsLoaded("MiniStatsDisplay.js");

/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */


 // This file is usable both as regular medea module and as
 // web worker running in parallel to the main page.

 medealib.define('worker_terrain',[],function(undefined) {
	"use strict";
	var medea = this;

	medea._GenHeightfieldTangentSpace = function(pos, wv,hv, nor, tan, bit) {
		var sqrt = Math.sqrt, w3 = wv*3;

		// first pass: compute dx, dy derivates for all cells and duplicate
		// the vert last row/column since we have cell_count+1 vertices
		// on each axis.
		for(var y = 0, c = 0; y < hv; ++y, c += 3) {
			for(var x = 0; x < wv-1; ++x, c += 3) {
				tan[c+0] = pos[c+1] - pos[c+3+1];
			}
		}

		for(var y = 0, c = 0; y < hv-1; ++y) {
			for(var x = 0; x < wv; ++x, c += 3) {
				bit[c+2] = pos[c+1] - pos[c+w3+1];
			}
		}

		for(var y = 0, c = w3-3; y < hv; ++y, c += w3) {
			tan[c] = tan[c-3];
		}

		for(var x = 0, c = w3*hv-1; x < wv; ++x,c -= 3) {
			bit[c] = bit[c-w3];
		}

		// second pass: weight two neighboring derivates to compute proper
		// derivates for singular vertices
		for(var y = hv, c = (hv * wv)*3-3; y > 0; --y, c -= 3) {
			for(var x = wv; x > 1; --x, c -= 3) {
				tan[c] = 0.5 * (tan[c] + tan[c-3]);
			}
		}

		for(var y = hv, c = (hv * wv)*3-1; y > 1; --y) {
			for(var x = wv; x > 0; --x, c -= 3) {
				bit[c] = 0.5 * (bit[c] + bit[c-w3]);
			}
		}

		// third pass: normalize tangents and bitangents and derive normals
		// using the cross product of the two former vectors
		for(var y = 0, c = 0; y < hv; ++y) {
			for(var x = 0; x < wv; ++x, c += 3) {
				// *0.5 to get less hard and edgy results
				var txx = 1.0, tyy = tan[c+0], l = sqrt(tyy*tyy+1);
				txx /= l;
				tyy /= l;

				tan[c+0] = txx;
				tan[c+1] = tyy;
				tan[c+2] = 0.0;

				var bzz = 1.0, byy = bit[c+2], l = sqrt(byy*byy+1);
				bzz /= l;
				byy /= l;

				bit[c+0] = 0.0;
				bit[c+1] = byy;
				bit[c+2] = bzz;

				nor[c+0] = -tyy*bzz;
				nor[c+1] = txx*bzz;
				nor[c+2] = -txx*byy;
			}
		}
	};

	medea._GenHeightfieldUVs = function(uv, wv, hv, scale) {
		scale = scale || 1.0;
		for(var y = 0, c = 0; y < hv; ++y) {
			var yd = y/(hv-1);
			for(var x = 0; x < wv; ++x) {
				uv[c++] = x/(wv-1) * scale;
				uv[c++] = yd * scale;
			}
		}
	};

	// public worker interface
	medea._workers.GenHeightfieldTangentSpace = function(pos,wv,hv) {

		var nor = new Float32Array(pos.length);
		var bit = new Float32Array(pos.length);
		var tan = new Float32Array(pos.length);

		medea._GenHeightfieldTangentSpace(pos,wv,hv,nor,tan,bit);

		return {
			nor : nor,
			bit : bit,
			tan : tan
		};
	};
});



/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('texture_dds',[],function(medealib, undefined) {
	"use strict";
	var medea = this, gl = medea.gl;

/**
 * @fileoverview dds - Utilities for loading DDS texture files
 * @author Brandon Jones
 * @version 0.1
 */

/*
 * Copyright (c) 2012 Brandon Jones
 *
 * This software is provided 'as-is', without any express or implied
 * warranty. In no event will the authors be held liable for any damages
 * arising from the use of this software.
 *
 * Permission is granted to anyone to use this software for any purpose,
 * including commercial applications, and to alter it and redistribute it
 * freely, subject to the following restrictions:
 *
 *    1. The origin of this software must not be misrepresented; you must not
 *    claim that you wrote the original software. If you use this software
 *    in a product, an acknowledgment in the product documentation would be
 *    appreciated but is not required.
 *
 *    2. Altered source versions must be plainly marked as such, and must not
 *    be misrepresented as being the original software.
 *
 *    3. This notice may not be removed or altered from any source
 *    distribution.
 */

// commented for use in medea
//define([], function () {
 //   "use strict";
    
    // All values and structures referenced from:
    // http://msdn.microsoft.com/en-us/library/bb943991.aspx/
    var DDS_MAGIC = 0x20534444;
    
    var DDSD_CAPS = 0x1,
        DDSD_HEIGHT = 0x2,
        DDSD_WIDTH = 0x4,
        DDSD_PITCH = 0x8,
        DDSD_PIXELFORMAT = 0x1000,
        DDSD_MIPMAPCOUNT = 0x20000,
        DDSD_LINEARSIZE = 0x80000,
        DDSD_DEPTH = 0x800000;

    var DDSCAPS_COMPLEX = 0x8,
        DDSCAPS_MIPMAP = 0x400000,
        DDSCAPS_TEXTURE = 0x1000;
        
    var DDSCAPS2_CUBEMAP = 0x200,
        DDSCAPS2_CUBEMAP_POSITIVEX = 0x400,
        DDSCAPS2_CUBEMAP_NEGATIVEX = 0x800,
        DDSCAPS2_CUBEMAP_POSITIVEY = 0x1000,
        DDSCAPS2_CUBEMAP_NEGATIVEY = 0x2000,
        DDSCAPS2_CUBEMAP_POSITIVEZ = 0x4000,
        DDSCAPS2_CUBEMAP_NEGATIVEZ = 0x8000,
        DDSCAPS2_VOLUME = 0x200000;

    var DDPF_ALPHAPIXELS = 0x1,
        DDPF_ALPHA = 0x2,
        DDPF_FOURCC = 0x4,
        DDPF_RGB = 0x40,
        DDPF_YUV = 0x200,
        DDPF_LUMINANCE = 0x20000;

    function fourCCToInt32(value) {
        return value.charCodeAt(0) +
            (value.charCodeAt(1) << 8) +
            (value.charCodeAt(2) << 16) +
            (value.charCodeAt(3) << 24);
    }

    function int32ToFourCC(value) {
        return String.fromCharCode(
            value & 0xff,
            (value >> 8) & 0xff,
            (value >> 16) & 0xff,
            (value >> 24) & 0xff
        );
    }

    var FOURCC_DXT1 = fourCCToInt32("DXT1");
    var FOURCC_DXT3 = fourCCToInt32("DXT3");
    var FOURCC_DXT5 = fourCCToInt32("DXT5");

    var headerLengthInt = 31; // The header length in 32 bit ints

    // Offsets into the header array
    var off_magic = 0;

    var off_size = 1;
    var off_flags = 2;
    var off_height = 3;
    var off_width = 4;

    var off_mipmapCount = 7;

    var off_pfFlags = 20;
    var off_pfFourCC = 21;
    
    // Little reminder for myself where the above values come from
    /*DDS_PIXELFORMAT {
        int32 dwSize; // offset: 19
        int32 dwFlags;
        char[4] dwFourCC;
        int32 dwRGBBitCount;
        int32 dwRBitMask;
        int32 dwGBitMask;
        int32 dwBBitMask;
        int32 dwABitMask; // offset: 26
    };
    
    DDS_HEADER {
        int32 dwSize; // 1
        int32 dwFlags;
        int32 dwHeight;
        int32 dwWidth;
        int32 dwPitchOrLinearSize;
        int32 dwDepth;
        int32 dwMipMapCount; // offset: 7
        int32[11] dwReserved1;
        DDS_PIXELFORMAT ddspf; // offset 19
        int32 dwCaps; // offset: 27
        int32 dwCaps2;
        int32 dwCaps3;
        int32 dwCaps4;
        int32 dwReserved2; // offset 31
    };*/

    /**
     * Transcodes DXT into RGB565.
     * Optimizations:
     * 1. Use integer math to compute c2 and c3 instead of floating point
     *    math.  Specifically:
     *      c2 = 5/8 * c0 + 3/8 * c1
     *      c3 = 3/8 * c0 + 5/8 * c1
     *    This is about a 40% performance improvement.  It also appears to
     *    match what hardware DXT decoders do, as the colors produced
     *    by this integer math match what hardware produces, while the
     *    floating point in dxtToRgb565Unoptimized() produce slightly
     *    different colors (for one GPU this was tested on).
     * 2. Unroll the inner loop.  Another ~10% improvement.
     * 3. Compute r0, g0, b0, r1, g1, b1 only once instead of twice.
     *    Another 10% improvement.
     * 4. Use a Uint16Array instead of a Uint8Array.  Another 10% improvement.
     * @author Evan Parker
     * @param {Uint16Array} src The src DXT bits as a Uint16Array.
     * @param {number} srcByteOffset
     * @param {number} width
     * @param {number} height
     * @return {Uint16Array} dst
     */
    function dxtToRgb565(src, src16Offset, width, height) {
        var c = new Uint16Array(4);
        var dst = new Uint16Array(width * height);
        var nWords = (width * height) / 4;
        var m = 0;
        var dstI = 0;
        var i = 0;
        var r0 = 0, g0 = 0, b0 = 0, r1 = 0, g1 = 0, b1 = 0;
    
        var blockWidth = width / 4;
        var blockHeight = height / 4;
        for (var blockY = 0; blockY < blockHeight; blockY++) {
            for (var blockX = 0; blockX < blockWidth; blockX++) {
                i = src16Offset + 4 * (blockY * blockWidth + blockX);
                c[0] = src[i];
                c[1] = src[i + 1];
                r0 = c[0] & 0x1f;
                g0 = c[0] & 0x7e0;
                b0 = c[0] & 0xf800;
                r1 = c[1] & 0x1f;
                g1 = c[1] & 0x7e0;
                b1 = c[1] & 0xf800;
                // Interpolate between c0 and c1 to get c2 and c3.
                // Note that we approximate 1/3 as 3/8 and 2/3 as 5/8 for
                // speed.  This also appears to be what the hardware DXT
                // decoder in many GPUs does :)
                c[2] = ((5 * r0 + 3 * r1) >> 3)
                    | (((5 * g0 + 3 * g1) >> 3) & 0x7e0)
                    | (((5 * b0 + 3 * b1) >> 3) & 0xf800);
                c[3] = ((5 * r1 + 3 * r0) >> 3)
                    | (((5 * g1 + 3 * g0) >> 3) & 0x7e0)
                    | (((5 * b1 + 3 * b0) >> 3) & 0xf800);
                m = src[i + 2];
                dstI = (blockY * 4) * width + blockX * 4;
                dst[dstI] = c[m & 0x3];
                dst[dstI + 1] = c[(m >> 2) & 0x3];
                dst[dstI + 2] = c[(m >> 4) & 0x3];
                dst[dstI + 3] = c[(m >> 6) & 0x3];
                dstI += width;
                dst[dstI] = c[(m >> 8) & 0x3];
                dst[dstI + 1] = c[(m >> 10) & 0x3];
                dst[dstI + 2] = c[(m >> 12) & 0x3];
                dst[dstI + 3] = c[(m >> 14)];
                m = src[i + 3];
                dstI += width;
                dst[dstI] = c[m & 0x3];
                dst[dstI + 1] = c[(m >> 2) & 0x3];
                dst[dstI + 2] = c[(m >> 4) & 0x3];
                dst[dstI + 3] = c[(m >> 6) & 0x3];
                dstI += width;
                dst[dstI] = c[(m >> 8) & 0x3];
                dst[dstI + 1] = c[(m >> 10) & 0x3];
                dst[dstI + 2] = c[(m >> 12) & 0x3];
                dst[dstI + 3] = c[(m >> 14)];
            }
        }
        return dst;
    }



    /**
     * Parses a DDS file from the given arrayBuffer and uploads it into the currently bound texture
     *
     * @param {WebGLRenderingContext} gl WebGL rendering context
     * @param {WebGLCompressedTextureS3TC} ext WEBGL_compressed_texture_s3tc extension object
     * @param {TypedArray} arrayBuffer Array Buffer containing the DDS files data
     * @param {boolean} [loadMipmaps] If false only the top mipmap level will be loaded, otherwise all available mipmaps will be uploaded
     *
     * @returns {number} Number of mipmaps uploaded, 0 if there was an error
     */
    function uploadDDSLevels(gl, ext, arrayBuffer, loadMipmaps) {
        var header = new Int32Array(arrayBuffer, 0, headerLengthInt),
            fourCC, blockBytes, internalFormat,
            width, height, dataLength, dataOffset,
            rgb565Data, byteArray, mipmapCount, i;

        if(header[off_magic] != DDS_MAGIC) {
            console.error("Invalid magic number in DDS header");
            return 0;
        }
        
        if(!header[off_pfFlags] & DDPF_FOURCC) {
            console.error("Unsupported format, must contain a FourCC code");
            return 0;
        }

        fourCC = header[off_pfFourCC];
        switch(fourCC) {
            case FOURCC_DXT1:
                blockBytes = 8;
                internalFormat = ext ? ext.COMPRESSED_RGB_S3TC_DXT1_EXT : null;
                break;

            case FOURCC_DXT3:
                blockBytes = 16;
                internalFormat = ext ? ext.COMPRESSED_RGBA_S3TC_DXT3_EXT : null;
                break;

            case FOURCC_DXT5:
                blockBytes = 16;
                internalFormat = ext ? ext.COMPRESSED_RGBA_S3TC_DXT5_EXT : null;
                break;

            default:
                console.error("Unsupported FourCC code:", int32ToFourCC(fourCC));
                return null;
        }

        mipmapCount = 1;
        if(header[off_flags] & DDSD_MIPMAPCOUNT && loadMipmaps !== false) {
            mipmapCount = Math.max(1, header[off_mipmapCount]);
        }

        width = header[off_width];
        height = header[off_height];
        dataOffset = header[off_size] + 4;

        if(ext) {
            for(i = 0; i < mipmapCount; ++i) {
                dataLength = Math.max( 4, width )/4 * Math.max( 4, height )/4 * blockBytes;
                byteArray = new Uint8Array(arrayBuffer, dataOffset, dataLength);
                gl.compressedTexImage2D(gl.TEXTURE_2D, i, internalFormat, width, height, 0, byteArray);
                dataOffset += dataLength;
                width *= 0.5;
                height *= 0.5;
            }
        } else {
            if(fourCC == FOURCC_DXT1) {
                dataLength = Math.max( 4, width )/4 * Math.max( 4, height )/4 * blockBytes;
                byteArray = new Uint16Array(arrayBuffer);
                rgb565Data = dxtToRgb565(byteArray, dataOffset / 2, width, height);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, width, height, 0, gl.RGB, gl.UNSIGNED_SHORT_5_6_5, rgb565Data);
                if(loadMipmaps) {
                    gl.generateMipmap(gl.TEXTURE_2D);
                }
            } else {
                console.error("No manual decoder for", int32ToFourCC(fourCC), "and no native support");
                return 0;
            }
        }

        return mipmapCount;
    }



// commented for use in medea
/*
    return {
        dxtToRgb565: dxtToRgb565,
        uploadDDSLevels: uploadDDSLevels,
        loadDDSTextureEx: loadDDSTextureEx,
        loadDDSTexture: loadDDSTexture
    };

}); */


	 /** Extract the width and height of a DDS iimage from a given arrayBuffer */
    function getDDSDimension(arrayBuffer) {
        var header = new Int32Array(arrayBuffer, 0, headerLengthInt);
        return [header[off_width], header[off_height]];
    }

    // publish API for texture module to use
    medea._DDSgetDDSDimension = getDDSDimension;
    medea._DDSuploadDDSLevels = uploadDDSLevels;
});

/** @license
sprintf() for JavaScript 0.7-beta1
http://www.diveintojavascript.com/projects/javascript-sprintf

Copyright (c) Alexandru Marasteanu <alexaholic [at) gmail (dot] com>
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:
	* Redistributions of source code must retain the above copyright
	  notice, this list of conditions and the following disclaimer.
	* Redistributions in binary form must reproduce the above copyright
	  notice, this list of conditions and the following disclaimer in the
	  documentation and/or other materials provided with the distribution.
	* Neither the name of sprintf() for JavaScript nor the
	  names of its contributors may be used to endorse or promote products
	  derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL Alexandru Marasteanu BE LIABLE FOR ANY
DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
**/

/*
Changelog:
2010.09.06 - 0.7-beta1
  - features: vsprintf, support for named placeholders
  - enhancements: format cache, reduced global namespace pollution

2010.05.22 - 0.6:
 - reverted to 0.4 and fixed the bug regarding the sign of the number 0
 Note:
 Thanks to Raphael Pigulla <raph (at] n3rd [dot) org> (http://www.n3rd.org/)
 who warned me about a bug in 0.5, I discovered that the last update was
 a regress. I appologize for that.

2010.05.09 - 0.5:
 - bug fix: 0 is now preceeded with a + sign
 - bug fix: the sign was not at the right position on padded results (Kamal Abdali)
 - switched from GPL to BSD license

2007.10.21 - 0.4:
 - unit test and patch (David Baird)

2007.09.17 - 0.3:
 - bug fix: no longer throws exception on empty paramenters (Hans Pufal)

2007.09.11 - 0.2:
 - feature: added argument swapping

2007.04.03 - 0.1:
 - initial release
*/

var sprintf = (function() {
	function get_type(variable) {
		return Object.prototype.toString.call(variable).slice(8, -1).toLowerCase();
	}
	function str_repeat(input, multiplier) {
		for (var output = []; multiplier > 0; output[--multiplier] = input) {/* do nothing */}
		return output.join('');
	}

	var str_format = function() {
		if (!str_format.cache.hasOwnProperty(arguments[0])) {
			str_format.cache[arguments[0]] = str_format.parse(arguments[0]);
		}
		return str_format.format.call(null, str_format.cache[arguments[0]], arguments);
	};

	str_format.format = function(parse_tree, argv) {
		var cursor = 1, tree_length = parse_tree.length, node_type = '', arg, output = [], i, k, match, pad, pad_character, pad_length;
		for (i = 0; i < tree_length; i++) {
			node_type = get_type(parse_tree[i]);
			if (node_type === 'string') {
				output.push(parse_tree[i]);
			}
			else if (node_type === 'array') {
				match = parse_tree[i]; // convenience purposes only
				if (match[2]) { // keyword argument
					arg = argv[cursor];
					for (k = 0; k < match[2].length; k++) {
						if (!arg.hasOwnProperty(match[2][k])) {
							throw(sprintf('[sprintf] property "%s" does not exist', match[2][k]));
						}
						arg = arg[match[2][k]];
					}
				}
				else if (match[1]) { // positional argument (explicit)
					arg = argv[match[1]];
				}
				else { // positional argument (implicit)
					arg = argv[cursor++];
				}

				if (/[^s]/.test(match[8]) && (get_type(arg) != 'number')) {
					throw(sprintf('[sprintf] expecting number but found %s', get_type(arg)));
				}
				switch (match[8]) {
					case 'b': arg = arg.toString(2); break;
					case 'c': arg = String.fromCharCode(arg); break;
					case 'd': arg = parseInt(arg, 10); break;
					case 'e': arg = match[7] ? arg.toExponential(match[7]) : arg.toExponential(); break;
					case 'f': arg = match[7] ? parseFloat(arg).toFixed(match[7]) : parseFloat(arg); break;
					case 'o': arg = arg.toString(8); break;
					case 's': arg = ((arg = String(arg)) && match[7] ? arg.substring(0, match[7]) : arg); break;
					case 'u': arg = Math.abs(arg); break;
					case 'x': arg = arg.toString(16); break;
					case 'X': arg = arg.toString(16).toUpperCase(); break;
				}
				arg = (/[def]/.test(match[8]) && match[3] && arg >= 0 ? '+'+ arg : arg);
				pad_character = match[4] ? match[4] == '0' ? '0' : match[4].charAt(1) : ' ';
				pad_length = match[6] - String(arg).length;
				pad = match[6] ? str_repeat(pad_character, pad_length) : '';
				output.push(match[5] ? arg + pad : pad + arg);
			}
		}
		return output.join('');
	};

	str_format.cache = {};

	str_format.parse = function(fmt) {
		var _fmt = fmt, match = [], parse_tree = [], arg_names = 0;
		while (_fmt) {
			if ((match = /^[^\x25]+/.exec(_fmt)) !== null) {
				parse_tree.push(match[0]);
			}
			else if ((match = /^\x25{2}/.exec(_fmt)) !== null) {
				parse_tree.push('%');
			}
			else if ((match = /^\x25(?:([1-9]\d*)\$|\(([^\)]+)\))?(\+)?(0|'[^$])?(-)?(\d+)?(?:\.(\d+))?([b-fosuxX])/.exec(_fmt)) !== null) {
				if (match[2]) {
					arg_names |= 1;
					var field_list = [], replacement_field = match[2], field_match = [];
					if ((field_match = /^([a-z_][a-z_\d]*)/i.exec(replacement_field)) !== null) {
						field_list.push(field_match[1]);
						while ((replacement_field = replacement_field.substring(field_match[0].length)) !== '') {
							if ((field_match = /^\.([a-z_][a-z_\d]*)/i.exec(replacement_field)) !== null) {
								field_list.push(field_match[1]);
							}
							else if ((field_match = /^\[(\d+)\]/.exec(replacement_field)) !== null) {
								field_list.push(field_match[1]);
							}
							else {
								throw('[sprintf] huh?');
							}
						}
					}
					else {
						throw('[sprintf] huh?');
					}
					match[2] = field_list;
				}
				else {
					arg_names |= 2;
				}
				if (arg_names === 3) {
					throw('[sprintf] mixing positional and named placeholders is not (yet) supported');
				}
				parse_tree.push(match);
			}
			else {
				throw('[sprintf] huh?');
			}
			_fmt = _fmt.substring(match[0].length);
		}
		return parse_tree;
	};

	return str_format;
})();

var vsprintf = function(fmt, argv) {
	argv.unshift(fmt);
	return sprintf.apply(null, argv);
};
medealib._MarkScriptAsLoaded("sprintf-0.7.js");
/* @license

cpp.js - Simple implementation of the C Preprocessor in Javascript

Copyright (c) 2011, Alexander Christoph Gessler
All rights reserved.

Redistribution and use of this software in source and binary forms, 
with or without modification, are permitted provided that the 
following conditions are met:

* Redistributions of source code must retain the above
  copyright notice, this list of conditions and the
  following disclaimer.

* Redistributions in binary form must reproduce the above
  copyright notice, this list of conditions and the
  following disclaimer in the documentation and/or other
  materials provided with the distribution.

* Neither the name of the cpp.js team, nor the names of its
  contributors may be used to endorse or promote products
  derived from this software without specific prior
  written permission of the cpp.js Development Team.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS 
"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT 
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT 
OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT 
LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY 
THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT 
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE 
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

function cpp_js(settings) {
	"use strict";

	var trim = function (str) {
		// http://blog.stevenlevithan.com/archives/faster-trim-javascript
		str = str.replace(/^\s+/, '');
		for (var i = str.length - 1; i >= 0; i--) {
			if (/\S/.test(str.charAt(i))) {
				str = str.substring(0, i + 1);
				break;
			}
		}
		return str;
	};
	
	var strip_cpp_comments = function(str) {
		// very loosely based on http://james.padolsey.com/javascript/removing-comments-in-javascript/,
		// but removed JS-specific stuff and added handling of line continuations. Also, newlines
		// are generally preserved to keep line numbers intact.
		str = ('__' + str.replace(/\r\n/g,'\n') + '__').split('');
		var block_comment = false, line_comment = false, quote = false, lines_lost = 0;
		for (var i = 0, l = str.length; i < l; i++) {
	
			if (quote) {
				if ((str[i] === "'" || str[i] === '"') && str[i-1] !== '\\') {
					quote = false;
				}
				continue;
			}
	 
			if (block_comment) {
				if (str[i] === '*' && str[i+1] === '/') {
					str[i+1] = '';
					block_comment = false;
				}
				str[i] = '';
				
				if (str[i] === '\n') {
					++lines_lost;
				}
				continue;
			}
	 
			if (line_comment) {
				if (str[i+1] === '\n') {
					line_comment = false;
				}
				str[i] = '';
				continue;
			}
			
			if (str[i] === '\n') {
				if (str[i-1] == '\\') {
					// line continuation, replace by whitespace
					str[i-1] = '';
					str[i] = '';
					++lines_lost;
				}
				else {
					while(lines_lost > 0) {
						str[i] += '\n';
						--lines_lost;
					}
				}
			}
	 
			quote = str[i] === "'" || str[i] === '"';
			if (str[i] === '/') {
	 
				if (str[i+1] === '*') {
					str[i] = '';
					block_comment = true;
					continue;
				}
				if (str[i+1] === '/') {
					str[i] = '';
					line_comment = true;
					continue;
				}	 
			}
		}
		return str.join('').slice(2, -2);
	};
	
	var is_string_boundary = function(text, idx) {
		return (text[idx] == '"' || text[idx] == "'") && 
			(!idx || text[idx-1] != '\\' ||
			(idx > 1 && text[idx-2] == '\\'));
	};

	// dictionary of default settings, including default error handlers
	var default_settings = {
		signal_char : '#',
		
		warn_func : function(s) {
			console.log(s);
		},
		
		error_func : function(s) {
			console.log(s);
			throw s;
		},
		
		comment_stripper : strip_cpp_comments,
		
		include_func : null,
		completion_func : null,
		
		pragma_func : function(pragma) {
			return null;
		},

		keep_unknown_preprocessor_statements : false,
	};
	
	// apply default settings
	if (settings) {
		for(var k in default_settings) {
			if (!(k in settings)) {
				settings[k] = default_settings[k];
			}
		}
	}
	else {
		settings = default_settings;
	}
	
	if (settings.include_func && !settings.completion_func) {
		settings.error_func("include_func but not completion_func specified");
	}
	
	// make sure that execution never continues when an error occurs.
	var user_err = settings.error_func;
	settings.error_func = function(e) {
		user_err(e);
		throw e;
	}
	
	// generate a 3 tuple (command, arguments, code_block)
	var block_re = new RegExp("^"+settings.signal_char+
		"(\\w+)[ \t]*(.*?)[ \t]*$","m"
	);
	
	// match identifiers according to 6.4.2.1, do not match 'defined',
	// do not match quote strings either
	var is_identifier_re = /\b(d(?!efined)|[a-ce-zA-Z_])\w*(?![\w"])/g;
	
	// same, but checks if the entire string is an identifier
	var is_identifier_only_re = /^(d(?!efined)|[a-ce-zA-Z_])\w*$/g;
	
	// same, but checks if the entire string is a macro
	var is_macro_only_re = /^((?:d(?!efined)|[a-ce-zA-Z_])\w*)\s*\((.*)\)$/g;
	
	// defined <identifier>
	var defined_no_parens_re = /defined\s+([a-zA-Z_]\w*)/g;
	
	// defined (<identifier>)
	var defined_re = /defined\s*\((\s*[a-zA-Z_]\w*\s*)\)/g;
	
	// __defined_magic_<identifier>_ (a special sentinel value used to
	// temporarily exclude operands to defined from macro substitution.
	var defined_magic_sentinel_re = /__defined_magic_([a-zA-Z_]\w*)_/;
	
	// Match hexadecimal, octal and decimal integer literals with or
	// without L,l,U,u suffix and separate all components.
	var is_integer_re = /\b(\+|-|)(0|0x|)([1-9a-f][0-9a-f]*|0)([ul]*)\b/ig;
	
	// Grab doubly quoted strings
	var is_string_re = /"(.*?)"/g;
	
	// Grab compound assignments. Extra fix for !=, ==, <=, >= needed
	var is_assignment_re = /[+\-*%\/&^|]?=/g; 
	
	// Grab instances of the increment/decrement operators
	var is_increment_re = /--|\+\+/g;
	
	// Grav <included_file> or "included_file"
	var include_re = /(?:(<)(.*)>|"(.*)")(.*)/;
	
	// Magic token to signify the '##' token (to keep it from being
	// treated as the operator of the same signature).
	var pseudo_token_doublesharp = '__doublesharp_magic__';
	var is_pseudo_token_doublesharp = new RegExp(pseudo_token_doublesharp,'g');
	
	// Magic token to signify the ' ' token (to keep it from being
	// treated as token boundary).
	var pseudo_token_space = '__whitespace_magic__';
	var is_pseudo_token_space = new RegExp(pseudo_token_space,'g');
	
	var pseudo_token_empty = '__empty_magic__';
	var is_pseudo_token_empty = new RegExp(pseudo_token_empty,'g');
	
	var pseudo_token_nosubs = '__nosubs__';
	var is_pseudo_token_nosubs = new RegExp(pseudo_token_nosubs,'g');
	
	// List of preprocessing tokens.
	var pp_special_token_list = {
		'==':1,
		'!=':1,
		'+':1,
		'-':1,
		'*':1,
		'/':1,
		'%':1,
		'<=':1,
		'>=':1,
		'<':1,
		'>':1,
		'=':1,
		'+=':1,
		'*=':1,
		'/=':1,
		'&=':1,
		'|=':1,
		'^=':1,
		'#':1,
		'##':1,
		'->':1
	};
	
	
	var state = {};
	var macro_cache = {};
	
	var eval_mask = null;
	
	var max_macro_length = 0;
	var macro_counts_by_length = {};
	
	return {
	
		// ----------------------
		// (public) Clear the current status code. i.e. reset all defines.
		clear : function() {
			state = {};
			macro_counts_by_length = {};
			macro_cache = {};
			max_macro_length = 0;
		},
		
		// ----------------------
		// (public) Check if macro `k` is defined.
		defined : function(k) {
			return k in state;
		},
	
		// ----------------------
		// (public) Define macro `k` with replacement value `v`. To define macros with
		// parameters, include the parameter list in the macro name, i.e. 
		// k <= "foo(a,b)", v <= "a ## b". The function invokes the error
		// callback if the macro contains syntax errors.
		define : function(k,v) {
			var macro = this._get_macro_info(k);
			if (!this._is_identifier(k) && !macro) {
				settings.error_func("not a valid preprocessor identifier: '" + k + "'");
			}
			
			if (typeof v === 'number') {
				v = v.toString(10);
			}
	
			if (macro) {
				k = macro.name;
				this.undefine(k);
				
				// This inserts the macro into the macro cache, which
				// holds pre-parsed data to simplify substitution.
				macro_cache[k] = macro;
			}
			else {
				this.undefine(k);
			}
			
			state[k] = v || '';
			
			// macro length table housekeeping
			macro_counts_by_length[k.length] = (macro_counts_by_length[k.length] || 0 ) + 1;
			if (k.length > max_macro_length) {
				max_macro_length = k.length;
			}
		},
		
		// ----------------------
		// (public) Undefine `k`. A no-op if `k` is not defined.
		undefine : function(k) {
			if(k in state) {
				delete state[k];
				
				// update macro length table
				var nl = macro_counts_by_length[k.length] - 1;
				if (k.length === max_macro_length && !nl) {
					max_macro_length = 0;
					for (var i = k.length-1; i >= 0; --i) {
						if (macro_counts_by_length[i]) {
							max_macro_length = i;
							break;
						}
					}
				}
				
				macro_counts_by_length[k.length] = nl;
				delete macro_cache[k];
			}
			else {
			
				// this happens if the user includes the parameter list
				// in the name. This is not part of the specification,
				// but implemented for reasons of API symmetry.
				var macro = this._get_macro_info(k);
				if (macro) {
					this.undefine(macro.name);
				}
			}
		},
		
		// ----------------------
		// (public) Given a dictionary of macro_name, replacement pairs, invoke
		// `define` on all of them.
		define_multiple : function(dict) {
			for(var k in dict) {
				this.define(k,dict[k]);
			}
		},
	
		// ----------------------
		// (public) Preprocess `text` and return the preprocessed text (or receive
		// a completion callback if asynchronous processing is enabled). `name` is 
		// an optional string that is used in error messages as file name.
		run : function(text, name) {
			name = name || '<unnamed>';
			
			if (!text) {
				error('input empty or null');
			}
			
			text = settings.comment_stripper(text);
			var blocks = text.split(block_re);
			
			var out = new Array(Math.floor(blocks.length/3) + 2), outi = 0;
			for (var i = 0; i < out.length; ++i) {
				out[i] = '';
			}
			
			var ifs_nested = 0, ifs_failed = 0, if_done = false, line = 1, command;
			var if_stack = [];
			
			// wrapped error function, augments line number and file
			var error = function(text) {
				settings.error_func("(cpp) error # "+name+":"+line+": " + text);
			};
			
			// wrapped warning function, augments line number and file
			var warn = function(text) {
				settings.warn_func("(cpp) warning # "+name+":"+line+": " + text);
			};
			
			var skip = false;
			var self = this;
			
			var process_directive = function(command, elem, i) {
				switch (command) {
				case "define":
					var head, tail;
					
					elem = trim(elem);
					
					var par_count = undefined;
					for (var j = 0; j < elem.length; ++j) {
						if (elem[j] == '(') {
							par_count = (par_count || 0) + 1;
						}
						else if ((elem[j] == ')' && --par_count === 0) || elem[j].match(/\s/) && par_count === undefined) {
							if (elem[j] == ')') {
								++j;
							}
							head = elem.slice(0,j);
							tail = trim( elem.slice(j) );
							break;
						}
					}
					
					if (par_count) {
						error('unbalanced parentheses in define: ' + elem);
					}
					
					if (head === undefined) {
						head = elem;
					}
					
					if (self.defined(head)) {
						warn(head + ' redefined');
					}
					
					if (!self._is_identifier(head) && !self._is_macro(head)) {
						error("not a valid preprocessor identifier: '" + head + "'");
					}
			
					self.define(head, tail);
					break;
					
				case "undef":
					self.undefine(elem);
					break;
					
				case "include":
					elem = self.subs(elem, {}, error, warn);
					var parts = elem.match(include_re);
					if (parts[4]) {
						error("unrecognized characters in include: " + elem);
					}
					var file = (parts[2] || '') + (parts[3] || '');
					
					if (!settings.include_func) {
						error("include directive not supported, " +
							"no handler specified");
					}
					
					settings.include_func(file, parts[1] === '<', function(contents) {
						if (contents === null) {
							error("failed to access include file: " +
								file);
						}
						var s = {};
						for(var k in settings) {
							s[k] = settings[k]; 
						}
						
						var processor;
						
						s.completion_func = function(data, lines, new_state) {
							out.length = outi;
							
							outi += lines.length;
							out = out.concat(lines);
			
							// grab any state changes
							self._set_state(processor);
							
							for (++i; i < blocks.length; ++i) {
								if(!process_block(i,blocks[i])) {
									return false;
								}
							}
							self._result(out, state);
						};
						
						// construct a child preprocessor and let it share our
						// state.
						processor = cpp_js(s);
						processor._set_state(self);
						processor.run(contents, file);
					});
					return false;
					
				case "error":
					error("#error: " + elem);
					break;
					
				case "pragma":
					if(!settings.pragma_func(elem)) {
						warn('ignoring unrecognized #pragma: ' + elem);
					}
					break;
					
				default:
					warn("unrecognized preprocessor command: "
						+ command + ' ' + elem
					);
					if (settings.keep_unknown_preprocessor_statements) {
						out[outi++] = '#' + command + ' ' + elem + '\n';
					}
					break;
				};
				return true;
			};
			
			var process_block = function(i, elem) {
				var elem = blocks[i];
				switch(i % 3) {
				// code line, apply macro substitutions and copy to output.
				case 0:
	
					line += elem.split('\n').length-1;
					if (!ifs_failed && trim(elem).length) {
						out[outi++] = self.subs(elem, error, warn);
					}
					break;
				// preprocessor statement, such as ifdef, endif, ..
				case 1:
					//++line;
					command = elem;
					break;
				// the rest of the preprocessor line, this is where expression 
				// evaluation happens
				case 2:
					var done = true;
					switch (command) {
						case "ifdef":
						case "ifndef":
							if (!elem) {
								error("expected identifier after " + 
									command);
							}
							// translate ifdef/ifndef to regular if by using defined()
							elem = "(defined " + elem + ")";
							if(command == 'ifndef') {
								elem = '!' + elem;
							}
							// fallthrough
							
						case "if":
							if_stack.push(false);
							if (!elem.length) {
								error("expected identifier after if");
							}
							// fallthrough
							
						case "else":
						case "elif":
							var not_reached = false;
							if (command == 'elif' || command == 'else') {
								not_reached = if_stack[if_stack.length-1];
								if (ifs_failed > 0) {
									--ifs_failed;
								}
								
								if (command == 'else' && elem.length) {
									warn('ignoring tokens after else');
								}
							}
							
							if (ifs_failed > 0 || not_reached || 
								(command != 'else' && 
								!self._eval(elem, error, warn)
								
							)){
								++ifs_failed;
							}
							else {
								// we run self branch, so skip any further else/
								// elsif branches
								if_stack[if_stack.length-1] = true;
							}
							break;
							
						case "endif":
							if(!if_stack.length) {
								error("endif with no matching if");
							}
							if (ifs_failed > 0) {
								--ifs_failed;
							}
							if_stack.pop();
							// ignore trailing junk on endifs
							break;
							
						default:
							done = ifs_failed > 0;
					};

					// not done yet, so this is a plain directive (i.e. include)
					if(!done) {
						if(!process_directive(command, elem, i)) {
							return false;
						}
					}
					break;
				}
				return true;
			};
			
			for (var i = 0; i < blocks.length; ++i) {
				if(!process_block(i,blocks[i])) {
					return null;
				}
			}
			
			if(if_stack.length > 0) {
				error("unexpected EOF, expected endif");
			}
			
			return this._result(out, state);
		},
		
		// ----------------------
		// (public) Given a `text`, substitute macros until no further substitutions
		// are possible. `blacklist` is an optional set of macro names to be ignored,
		// these are not substituted and remain as is.
		// `error` and `warn` are optional callbacks, by default the corresponding
		// callbacks from settings are used. Users should never assign a value to
		// `nest_sub`, which is used to keep track of recursive invocations internally.
		subs : function(text, blacklist_in, error, warn, nest_sub) {
			error = error || settings.error_func;
			warn = warn || settings.warn_func;
			
			var TOTALLY_BLACK = 1e10;
			
			// create a copy of the blacklist and make sure that all incoming
			// macros are totally blacked out. 
			var blacklist = {};
			if (blacklist_in) {
				for (var k in blacklist_in) {
					blacklist[k] = TOTALLY_BLACK;
				}
			}
			
			nest_sub = nest_sub || 0;
		
			var new_text = text;
			var rex = /\b.|["']/g, m_boundary;
			
			// XXX This scales terribly. Possible optimization:
			//   use KMP for substring searches
			var pieces = [], last = 0, in_string = false;
			
			while (m_boundary = rex.exec(new_text)) {
			
				var idx = m_boundary.index;
				if (is_string_boundary(new_text, idx)) {
					in_string = !in_string;
				}
				
				if (in_string) {
					continue;
				}
				
				for (var i = Math.min(new_text.length - idx,max_macro_length); i >= 1; --i) {
					if(!macro_counts_by_length[i]) {
						continue;
					}
					var k = new_text.slice(idx,idx+i);
					if (k in state) {
					
						// if this would be a match, but the macro is blacklisted,
						// we need to skip it alltogether or parts of it might be
						// interpreted as macros on their own.
						if (blacklist[k] > idx) {
			
							pieces.push(new_text.slice(0,idx));
							pieces.push(pseudo_token_nosubs+k);
							new_text = new_text.slice(idx+k.length);
							rex.lastIndex = 0;
						
							// adjust blacklist indices
							for(var kk in blacklist) {
								if (blacklist[kk] != TOTALLY_BLACK) {
									if (blacklist[kk] > idx) {
										blacklist[kk] -= idx+k.length;
									}
									else delete blacklist[kk];
								}
							};
							break;
						}
						else {
							delete blacklist[k];
						}
						
						var sub;
						if (this._is_macro(k)) {
							sub = this._subs_macro(new_text, k, {}, 
								error, warn, nest_sub, idx
							);
						}
						else {
							sub = this._subs_simple(new_text, k, {}, 
								error, warn, nest_sub, idx
							);
						}
						if (sub === null) {
							continue;
						}
						
						// handle # and ## operator
						sub[0] = this._handle_ops(sub[0], error, warn);
						
						// handle _Pragma()
						sub[0] = this._handle_pragma(sub[0], error, warn);
						
						// XXX a bit too expensive ... but not too easy to avoid.
						pieces.push(new_text.slice(0,idx));
						new_text = sub[0] + new_text.slice(idx+sub[1]);
						rex.lastIndex = 0;
						
						// adjust blacklist indices
						for(var kk in blacklist) {
							if (blacklist[kk] != TOTALLY_BLACK) {
								if (blacklist[kk] > idx) {
									blacklist[kk] = (sub[0].length-sub[1]) +( blacklist[kk] - idx);
								}
								else delete blacklist[kk];
							}
						}
						
						// rescan this string, but keep the macro that we just replaced
						// blacklisted until we're beyond the replacement. This 
						// prevents infinite recursion and is also mandated by the
						// standard and crucial for proper evaluation of several of
						// its more ... evil ehm elaborate samples.
						blacklist[k] = sub[0].length;
						break;
					}
				}
			}
			
			pieces.push(new_text);
			new_text = pieces.join('');
			
			// if macro substitution is complete, re-introduce any
			// '##' tokens previously substituted in order to keep them 
			// from being treated as operators. Same for spaces and empty
			// tokens.
			if (!nest_sub) {
				new_text = this._remove_sentinels(new_text);
			}
			
			return new_text;
		}, 
		
		// ----------------------
		// Transfer the state from another cpp.js instance to us.
		_set_state : function(other) {
			other = other._get_state();
		
			state = other.state;
			macro_counts_by_length = other.macro_counts_by_length;
			macro_cache = other.macro_cache;
			max_macro_length = other.max_macro_length;
		},
		
		// ----------------------
		// Get a dictionary containing the full processing state of us
		_get_state : function(other) {
			return {
				state : state,
				macro_counts_by_length : macro_counts_by_length,
				macro_cache : macro_cache,
				max_macro_length : max_macro_length
			};
		},
		
		// ----------------------
		// Given an array of single lines, produce the result text by merging lines
		// and trimming the result. The function also invokes the user-defined
		// completion callback, but it also returns the preprocessed text to the caller.
		_result : function(arr, state) {
			// drop empty lines at the end
			for (var i = arr.length-1; i >= 0; --i) {
				if (!arr[i]) {
					arr.pop();
				}
				else {
					break;
				}
			}
		
			var text = arr.join('\n');
			if (settings.completion_func) {
				settings.completion_func(text,arr, state);
			}
			
			return text;
		},
		
		// ----------------------
		// Check if `identifier` is a well-formed identifier according to C rules.
		_is_identifier : function(identifier) {
			// Note: important to use match() because test() would update
			// the 'lastIndex' property on the regex.
			return !!identifier.match(is_identifier_only_re);
		},
		
		// ----------------------
		// Check if `macro` is a well-formed macro name.
		_is_macro : function(macro) {
			return this._get_macro_info(macro) != null;
		},
		
		// ----------------------
		// Check if `tok` is a special preprocessor token (such as ==, <=, >=).
		// These tokens are handled differently when participating on either side
		// of the ## operator.
		_is_pp_special_token : function(tok) {
			return trim(tok) in pp_special_token_list;
		},
		
		// ----------------------
		// Get the description dictionary for a macro named `k` or null if the macro
		// is malformed (i.e. syntax wrong). Does not add new macros to the macro
		// cache but uses the cache to speed-up looking up known macros.
		_get_macro_info : function(k) {
			if (macro_cache[k]) {
				return macro_cache[k];
			}
		
			var m = is_macro_only_re.exec(k);
			if (!m) {
				return null;
			}
			is_macro_only_re.lastIndex = 0;
			
			var params = m[2].split(',');
			if (params.length === 1 && !trim(params[0])) {
				// parameterless macro (i.e. #define p () )
				params = [];
			}
			else {
				for (var i = 0; i < params.length; ++i) {
					var t = params[i] = trim(params[i]);
					if(!this._is_identifier(t) && !this._is_macro(t)) {
						return null;
					}
				}
			}
			
			// ES 1.8's sticky flag would be useful, but sadly it is not
			// universally supported yet.
			var pat = new RegExp(m[1] + '\\s*\\(','g');
			
			return {
				params:params,
				pat:pat,
				name:m[1],
				full:k
			};
		},
		
		// ----------------------
		// Remove all sentinel strings (i.e. placeholders for spaces
		// or empty tokens to indicate placeholder tokens) from the 
		// given string.
		_remove_sentinels : function(new_text) {
			new_text = new_text.replace(is_pseudo_token_doublesharp,'##');
			new_text = new_text.replace(is_pseudo_token_space,' ');
			new_text = new_text.replace(is_pseudo_token_empty,'');
			new_text = new_text.replace(is_pseudo_token_nosubs,'');
			return new_text;
		},
		
		// ----------------------
		// Evaluate the _Pragma(string) preprocessor operator in the given 
		// (partially substituted) sequence of preprocessor tokens.
		_handle_pragma : function(text, error, warn) {
			var self = this;
			// XXX obviously RE aren't sufficient here either, do proper parse.
			return text.replace(/_Pragma\s*\(\s*"(.*?([^\\]|\\\\))"\s*\)/g, function(match, pragma) {
				// destringize 
				pragma =  pragma.replace(/\\"/g,'"').replace(/\\\\/g,'\\');
				pragma = self._remove_sentinels(pragma);
				pragma = self._concatenate_strings(pragma);
				
				if (!settings.pragma_func(pragma)) {
					warn('unrecognized _Pragma(): ' + pragma);
				}
			
				// always substitute an empty string so processing
				// can continue.
				return '';
			});
		},
		
		// ----------------------
		// Concatenate neighbouring string literals such as " hello "
		// "world " and return the result.
		_concatenate_strings : function(text) {
			var in_string = false, last = null, last_taken = 0;
			var text_out = [];
			for (var i = 0; i < text.length; ++i) {
				if (is_string_boundary(text,i)) {
					if (in_string) {
						last = i;
					}
					else if (last !== null) {
						text_out.push(text.slice(last_taken, last));
						last_taken = i+1;
					}
					in_string = !in_string;
				}
				else if (!text[i].match(/\s/)){
					text_out.push(text.slice(last_taken, i));
					last_taken = i;
					last = null;
				}
			}
			text_out.push(text.slice(last_taken));
			return text_out.join('');
		},
		
		// ----------------------
		// Evaluate the '##' and '#' preprocessor operator in the given (partially
		// substituted) sequence of preprocessor tokens.
		_handle_ops : function(text, error, warn) {
	
		
			// XXX The code below is not only extremely slow, it also doesn't
			// take into account that the # operator can only be applied to
			// macro parameter, an information that is no longer available
			// at this point.
		
			// 6.10.3.2: "The order of evaluation of # and ## operators 
			// is unspecified.". We pick '##' first.
			var op, pieces = [], in_string = false; 
			for (var op = 0; op < text.length-1; ++op) {
			
				if (is_string_boundary(text,op)) {
					in_string = !in_string;
					continue;
				}
				
				if (text[op] !== '#' || in_string) {
					continue;
				}
				
				var is_concat = text[op+1] === '#';
				var left = null, right = null;
				
				// identify the tokens on either side of the ## operator or
				// only on the right side of the # operator.
				var in_inner_string = false, nest = 0;
				if(is_concat) {
					for (var i = op-1; i >= 0; --i) {
						if (!text[i].match(/\s/)) {
							if (is_string_boundary(text,i)) {
								in_inner_string = !in_inner_string;
							}
							else if (text[i] === '(') {
								++nest;
							}
							else if (text[i] === ')') {
								--nest;
							}
							left = text[i] + (left || '');
						}
						else if (left !== null) {
							if(!in_inner_string && !nest) {
								break;
							}
							left = ' ' + left;
						}
					}
					++i;
				}
				else {
					i = op;
				}
				
				in_inner_string = false;
				nest = 0;
				
				var first_space = true; 
				for (var j = op+(is_concat?2:1); j < text.length; ++j) {
					if (!text[j].match(/\s/)) {
						first_space = true;
						if (is_string_boundary(text,j)) {
							in_inner_string = !in_inner_string;
						}
						else if (text[j] === '(') {
							++nest;
						}
						else if (text[j] === ')') {
							--nest;
						}
						right = (right || '') + text[j];
					}
					else if (right !== null && !in_inner_string  && !nest) {
						break;
					}
					else {
						// 6.10.3.2 (#): each occurrence of white space between the 
						// argument's preprocessing tokens becomes a single space 
						// character in the character string literal
						if ((is_concat || first_space || in_inner_string) && right !== null) {
							right = right + ' ';
							first_space = false;
						}
					}
				}
				
				right = trim(right || '');
				
				var concat;
				if(is_concat) { 
				
					left = trim(left || '');
					if (!right || !left) {
						error('## cannot appear at either end of a macro expansion');
					}
					
					// To my reading of the standard, it works like this:
					// if both sides are *not* preprocessing special tokens,
					// the concatenation is always ok. Otherwise the result
					// must be a valid preprocessing special token as well.
					if ((this._is_pp_special_token(left) || this._is_pp_special_token(right)) && 
						!this._is_pp_special_token(left + right)) {
						error('pasting "' + left + '" and "' + right + 
							'" does not give a valid preprocessing token'
						);
					}
					
					// the result of the concatenation is another token, but
					// we must take care that the '##' token is not treated
					// as concatenation operator in further replacements.
					concat = left + right;
					if (concat == '##') {
						concat = pseudo_token_doublesharp;
					}
					else {
						// tokens that we marked as no longer available for
						// substitution become available again when they're
						// concatenated with other tokens.
						concat = concat.replace(is_pseudo_token_nosubs,'');
					}
				
				}
				else {
					if (!right) {
						error('# cannot appear at the end of a macro expansion');
					}
					
					concat = '"' + right.replace(/\\/g,'\\\\').replace(/"/g,'\\"') + '"';
				}
				
				pieces.push(text.slice(0,i));
				pieces.push(concat);
				
				if (j < text.length) {
					pieces.push(text.slice(j));
				}
				
				text = pieces.join('');
				pieces.length = 0;
				
				op = 0;
			}

			return text;
		},
		
		// ----------------------
		// Substitute an occurences of `macro_name` in `text` that begins at offset
		// `start_idx`. `macro_name` must be a simple macro with no parameter list. 
		// Return a 2-tuple with the substitution string and the substituted length 
		// in the original string.
		_subs_simple : function(text, macro_name, blacklist_in, error, warn, nest_sub, start_idx) {
			// no macro but just a parameterless substitution
			var rex = new RegExp(macro_name+"(\\b|"+pseudo_token_space+"|"+pseudo_token_empty+")",'g');
			
			rex.lastIndex = start_idx || 0;
			var m_found = rex.exec(text);
			if (!m_found || m_found.index != start_idx) {
				return null;
			}
			
			return [state[macro_name],m_found[0].length];
		},
		
		// ----------------------
		// Substitute an occurences of `macro_name` in `text` that begins at offset
		// `start_idx`. `macro_name` must be a simple macro with parameters. 
		// Return a 2-tuple with the substitution string and the substituted length 
		// in the original string.
		_subs_macro : function(text, macro_name, blacklist, error, warn, nest_sub, start_idx) {
			var info = this._get_macro_info(macro_name);
			var old_text = text;
			
			info.pat.lastIndex = start_idx || 0;
			var m_found = info.pat.exec(text);
			if (!m_found || m_found.index != start_idx) {
				return null;
			}
			
			var params_found = [], last, nest = -1, in_string = false;
			
			// here macro invocations may be nested, so a regex is not
			// sufficient to "parse" this.
			for (var i = m_found.index; i < text.length; ++i) {
				if (text[i] == ',' && !nest) {
					params_found.push(trim(text.slice(last, i)));
					last = i+1;
				}
				
				if ( text[i] == '(' ) {
					if (++nest === 0) {
						last = i+1;
					}
				}
				else if ( (text[i] == '"' || text[i] == "'") && (!i || text[i-1] != '\\')) {
					if (in_string) {
						--nest;
					}
					else {
						++nest;
					}
					in_string = !in_string;
				}
				else if ( text[i] == ')' ) {
					if(--nest === -1) {
						params_found.push(trim(text.slice(last, i)));
						last = i+1;
						break;
					}
				}
			}
			
			if (nest !== -1) {
				error('unbalanced parentheses, expected )');
			}
		
			if (params_found.length != info.params.length) {
				// special case: if no arguments are expected and none passed either,
				// we will still get one empty argument from the previous logic.
				if (info.params.length || params_found.length > 1 || params_found[0]) {
					error('illegal invocation of macro ' + macro_name + ', expected ' + 
						info.params.length + ' parameters but got ' + 
						params_found.length);
				}
				else {
					params_found = [];
				}
			}
			
			// macro parameters may potentially be empty, but this would lead
			// to trouble in subsequent substitutions. So substitute a sentinel
			// string.
			for (var i = 0; i < params_found.length; ++i) {
				if (!params_found[i]) {
					params_found[i] = pseudo_token_empty;
				}
			}
		
			// insert arguments into replacement list, but evaluate them
			// PRIOR to doing this (6.10.3.1). We need, however, to 
			// exclude all arguments directly preceeded or succeeded by
			// either the stringization or the token concatenation operator
			var repl = state[macro_name];
			
			for (var  i = 0; i < info.params.length; ++i) {
				// what applies to empty parameter applies to whitespace in the
				// parameter text as well (only whitespace that concates two
				// otherwise distinct tokens). Substitute by a magic sentinel.
				// This must be done PRIOR to evaluating the parameters -
				// a parameter might evaluate to something like '2, 4'
				// which should obviously not be escaped.
				var param_subs = params_found[i].replace(/(\w)\s+(\w)/g,'$1' + pseudo_token_space+'$2');
				param_subs = this.subs( param_subs, blacklist, error, warn, nest_sub + 1);
				
				var rex = new RegExp("^"+info.params[i]+"\\b");
				var ignore = false, pieces = [], m, bound = true;
				for (var j = 0; j < repl.length; ++j) {
					if (repl[j] == '#') {
						ignore = true;
					}
					else if (bound && (m = rex.exec(repl.slice(j)))) {
						if (!ignore) {
							for (var k = j + m[0].length; k < repl.length; ++k) {
								if (repl[k] == '#') {
									ignore = true;
								}
								else if (!repl[k].match(/\s/)) {
									break;
								}
							}
						}
					
						pieces.push(repl.slice(0,j));
						pieces.push(ignore ? params_found[i] : param_subs);
						repl = repl.slice(j + m[0].length);
						
						j = -1;
						continue;
					}
					else if (!repl[j].match(/\s/)) {
						ignore = false;
					}
					bound = repl[j].match(/\W/);
				}
				
				
			
				pieces.push(repl);
				repl = pieces.join('');
			}
			return [repl,last - start_idx];
		},
		
		// ----------------------
		// Execute a sanitized arithmetic expression given by `scr` and return 
		// the result. This is not intended to be for 'security'. We do trust any
		// code that we preprocess. However, it would not be desirable if the
		// JS environment could be accidentially altered from within 
		// #if's, so let's try to hide eval()'s power as good as we can.
		_masked_eval : function(scr) {
			// based on http://stackoverflow.com/questions/543533/restricting-eval-to-a-narrow-scope
			if (!eval_mask) {
				// set up an object to serve as the context for the code
				// being evaluated. 
				eval_mask = {};
				
				// mask global properties 
				var glob = [];
				try {
					// browser environment, window object present
					glob = [window, {
						window:1
					}];
				}
				catch(e) {
					try {
						// node.js top-level objects present
						glob = [global, {
							global : 1,
							process : 1,
							require : 1,
							module : 1,
							__filename : 1,
							__dirname : 1
						}];
					} 
					catch(e) {}
				}
				
				for (var i = 0; i < glob.length; ++i) {
					for (var p in glob[i]) {
						eval_mask[p] = undefined;
					}
				}
				
				// bring defined() function into scope
				eval_mask.defined = this.defined;
			}
		
			eval_mask.__result__ = false;

			// execute script in private context
			(new Function( "with(this) { __result__ = (" + scr + "); }")).call(eval_mask);
			return eval_mask.__result__;
		},
		
		// ----------------------
		// Evaluate a raw and not yet preprocessed expression from a 
		// #if/#ifdef clause and return the result.
		_eval : function(val, error, warn) {
			var old_val = val;
			// see 6.10.1.2-3
			
			// string literals are not allowed 
			if (val.match(is_string_re)) {
				error('string literal not allowed in if expression');
			}
			
			// neither are assignment or compound assignment ops
			if (val.replace(/[=!<>]=/g,'').match(is_assignment_re)) {
				error('assignment operator not allowed in if expression');
			}
			
			// same for increment/decrement - we need to catch these
			// cases because they might be used to exploit eval().
			if (val.match(is_increment_re)) {
				error('--/++ operators not allowed in if expression');
			}
			
			// XXX handle character constants
			
			// drop the L,l,U,u suffixes for integer literals
			val = val.replace(is_integer_re,'$1$2$3');
			
			// macro substitution - but do not touch unary operands to 'defined',
			// this is done by substituting a safe sentinel value (which starts
			// with two underscores and is thus reserved).
			val = val.replace(defined_no_parens_re,'defined($1)');
			val = val.replace(defined_re,' __defined_magic_$1_ ');
			
			val = this.subs(val, {}, error, warn);
		
			// re-substitute defined() terms and quote the argument
			val = val.replace(defined_magic_sentinel_re,'defined("$1")');
			
			// replace all remaining identifiers with '0'
			val = val.replace(is_identifier_re,' 0 ');
		
			// what remains _should_ be safe to use with eval() since
			// it doesn't contain any identifiers and is thus not able
			// to invoke global functions. This version of eval is
			// even a bit safer and masks all global functions so 
			// anything we missed should eventually get caught.
			// See _masked_eval() for the details.
			try {
				var res = !!this._masked_eval(val);
			}
			catch (e) {
				error("error in expression: " + old_val + " (" + e + ")");
			}
			
			return res;
		}
	};
};

// node.js interface
if (typeof module !== 'undefined' && module.exports) {
    module.exports.create = cpp_js;
}



medealib._MarkScriptAsLoaded("cpp.js");

/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('indexbuffer',[],function(medealib, undefined) {
	"use strict";
	var medea = this, gl = medea.gl;


	// NOTE: the constants below may not overlap with any of the VBO flags

	// mark data in the buffer as frequently changing and hint the driver to optimize for this
	medea.INDEXBUFFER_USAGE_DYNAMIC = 0x1;

	// enable 32 bit indices - NOT CURRENTLY SUPPORTED BY WEBGL!
	medea.INDEXBUFFER_LARGE_MESH = 0x2;

	// enable GetSourceData()
	medea.INDEXBUFFER_PRESERVE_CREATION_DATA = 0x4;



	// class IndexBuffer
	medea.IndexBuffer = medealib.Class.extend({

		// Id of underlying OpenGl buffer object
		buffer: -1,

		// number of indices in the buffer, NOT primitive count
		itemcount: 0,

		// original flags
		flags: 0,

		// only present if the PRESERVE_CREATION_DATA flag is set
		init_data : null,


		//
		gltype : 0,

		init : function(init_data,flags) {
			this.flags = flags | 0;



			this.gltype = this.flags & medea.INDEXBUFFER_LARGE_MESH ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
			this.Fill(init_data);
		},

		// medea.VERTEXBUFFER_USAGE_DYNAMIC recommended if this function is used
		Fill : function(init_data) {
			var arr = init_data
			,	old = gl.getParameter(gl.ELEMENT_ARRAY_BUFFER_BINDING)
			;

			if (this.buffer === -1) {
				this.buffer = gl.createBuffer();
			}

			this.itemcount = init_data.length;

			if(!(arr instanceof Uint32Array) && !(arr instanceof Uint16Array)) {
				// TODO: maybe this would be a better spot for a debug check on exceeded index ranges
				// than the scene loader code.
				arr = new (this.flags & medea.INDEXBUFFER_LARGE_MESH ? Uint32Array : Uint16Array)(init_data);
			}

			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.buffer);
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,arr,
				this.flags & medea.INDEXBUFFER_USAGE_DYNAMIC ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);

			// restore state - this is crucial, as redundant buffer changes are
			// optimized away based on info in medea's statepool, 
			// not glGetInteger()
			if(old) {
				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,old);
			}

			if (this.flags & medea.INDEXBUFFER_PRESERVE_CREATION_DATA) {
				this.init_data = arr;
			}
		},

		GetSourceData : function() {
			return this.init_data;
		},

		GetBufferId : function() {
			return this.buffer;
		},

		GetItemCount : function() {
			return this.itemcount;
		},

		GetGlType : function() {
			return this.gltype;
		},

		GetFlags : function() {
			return this.flags;
		},

		Dispose : function() {
			if (this.buffer === -1) {
				return;
			}

			gl.deleteBuffer(this.buffer);
			this.buffer = -1;
		},

		_Bind : function(statepool) {
			var id = this.GetBufferId(), gls = statepool.GetQuick('_gl');

			// note: caching eab's causes Chrome and Firefox warnings when the ab is changed.
		// it seems, after every ab change, eab's need to be rebound to pass some validation.
		// have to find out if this is only temporary behaviour, or per spec.

		//	if (gls.eab === id) {
		//		return;
		//	}
		//	gls.eab = id;
		
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,id);
		}
	});

	medea.CreateIndexBuffer = function(indices,flags) {
		return new medea.IndexBuffer(indices,flags);
	};

	medea.CreateLineListIndexBufferFromTriListIndices = function(indices,flags) {
		if(indices instanceof medea.IndexBuffer) {
			flags = flags || indices.flags;
			indices = indices.GetSourceData();
			
		}


		var tri_count = indices.length / 3
		,	line_indices = new ((flags | 0) & medea.INDEXBUFFER_LARGE_MESH 
			? Uint32Array 
			: Uint16Array)(tri_count * 6)
		,	tri = 0
		,	cur = 0
		,	a
		,	b
		,	c
		;

		for(; tri < tri_count; ++tri) {
			a = indices[tri * 3 + 0];
			b = indices[tri * 3 + 1];
			c = indices[tri * 3 + 2];

			line_indices[cur++] = a;
			line_indices[cur++] = b;
			line_indices[cur++] = c;
			line_indices[cur++] = a;
			line_indices[cur++] = b;
			line_indices[cur++] = c;
		}

		return new medea.IndexBuffer(line_indices,flags);
	};

	medea.CreateLineListIndexBufferForUnindexedTriList = function(tri_count, flags) {
		var in_cur = 0
		,	line_indices = new (tri_count * 3 > (1 << 16) || ((flags | 0) & medea.INDEXBUFFER_LARGE_MESH) 
			? Uint32Array 
			: Uint16Array)(tri_count * 6)
		,	tri = 0
		,	cur = 0
		,	a
		,	b
		,	c
		;

		for(; tri < tri_count; ++tri) {
			a = in_cur++;
			b = in_cur++;
			c = in_cur++;

			line_indices[cur++] = a;
			line_indices[cur++] = b;
			line_indices[cur++] = c;
			line_indices[cur++] = a;
			line_indices[cur++] = b;
			line_indices[cur++] = c;
		}
		return new medea.IndexBuffer(line_indices,flags);
	};
});

/* continue.js - Simple JavaScript continuations implementation.
 *
 * (c) 2013, Alexander C. Gessler
 *  https://github.com/acgessler/continue.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 */


/** JavaScript continuation (kind of) implementation.
 *
 *  This is useful for splitting CPU heavy tasks into multiple slices, which
 *  are processed sequentially, leaving some time in between to avoid rendering
 *  the browser unresponsive. The user provides a a list of 'jobs', each of
 *  which should only do a part of the work. Assignment of jobs to time slices,
 *  and execution thereof is handled by the library then. Additionally, 
 *  jobs get access to timing information (i.e. how much time is remaining in
 *  the current slice), allowing them to voluntarily yield and return another 
 *  continuation job to be run in the next slice.
 *
 *  Basic API usage looks like this:
 *
 *      // a continuation with 100 ms time in between slices
 *      var c = new Continuation(100);
 *      c.add(function(timer) {
 *
 *          // do some work - use timer() to check how many ms we have
 *			// left in this time slice.
 *
 *      });
 *
 *      c.add( ... do more work ...);
 *
 *      // schedule the continuation: by default this runs one
 *      // slice of work and offloads the rest to a later
 *      // point in time. 
 *      c.schedule();
 *
 *   For more information on adding jobs, see the add() member function.
 *   To get a callback once the continuation has finished, see
 *   on_finished()
 *
 */
function Continuation(tick_getter_or_interval) {
	"use strict";

	if(!(this instanceof Continuation)) {
		return new Continuation(tick_getter_or_interval);
	}

	var _tick_getter = tick_getter_or_interval || 100
	,	_jobs = []
	,	_call_next
	,	_done = false
	,	_running = false
	,	_aborted = false
	,	_on_finished_callback = null
	;

	_tick_getter = typeof _tick_getter == 'number' ? function(f) {
		setTimeout(f, _tick_getter);
	} : _tick_getter;

	_call_next = function(slice_duration) {
		var time_remaining = slice_duration
		,	start_time
		,	time_remaining_updater
		;

		if(_done) {
			return;
		}

		start_time = Date.now();
		time_remaining_updater = function() {
			return Math.max(0, slice_duration - (Date.now() - start_time));
		};

		do {
			var job = _jobs.shift();

			var result = job(time_remaining_updater);
			if(typeof result === 'function') {
				_jobs.unshift(result);
			}

			if(!_jobs.length) {
				_done = true;
			}
			else {
				time_remaining = time_remaining_updater();
			}
		}
		while(!_done && time_remaining > 0);

		if(_done) {
			if (_on_finished_callback) {
				_on_finished_callback(!_aborted);
			}
		}
		else {
			_tick_getter(function() {
				_call_next(slice_duration);
			});
		}
	};


	return {

		/** Returns true iff the continuation is finished, i.e. schedule()
		 *  has been called and all jobs registered for the continuation,
		 *  (including dynamically inserted ones) have been called. A
		 *  continuation is also finished() if job execution has been
		 *  abort()ed.  */
		finished : function() {
			return _done;
		},


		/** Returns true iff the continuation is running, i.e. schedule()
		 *  has been called, but it has not finished() yet. */
		running : function() {
			return _running && !_done;
		},


		/** Add a job to the continuation. This is possible iff the continuation 
		 *  is not finished, as per the finished() member function.
		 *
		 *  add() can be called before schedule() happens, or from within existing
		 *  jobs when they get to run. Calling add() enables continuations to
		 *  dynamically add more jobs to the back of the queue. To dynamically
		 *  add jobs to the front of the queue (i.e. jobs that will execute
		 *  next), they can use return values from the job callback as shown 
		 *  below.
		 *
		 *  @param {function} job Job to be added to the continuation.
		 *     A job is simply a function that has the following semantics:
		 *       function(time_remaining_getter) {
		 *     		// optional: return continuation function
		 *			// return function() { ... }
		 *       }
		 *     Where `time_remaining_getter` receives a function taking no 
		 *     parameters which measures the up-to-date time remaining in the current
		 *     time slice. The time is given as non-negative milliseconds value. 
		 *     This function can be called multiple times to help jobs determine 
		 *     whether to offload part of their remaining work to the next time 
		 *     slice.
		 *
		 *     The basic strategy for jobs is:
		 *        i) If the work is simple, constant cost and very likely
		 *        to not exceed the time slice by more than you wish to
		 *        tolerate, simply run your computation.
		 *
		 *        ii) If the work is more complex, not predictable or potentially
		 *        very CPU heavy and therefore device-dependent, structure
		 *        your job in a way that it regularly calls `time_remaining_getter`
		 *        to check if time is remaining, and if not, returns a continuation
		 *        function.
		 **/
		add : function(job) {
			if(_done) {
				return;
			}
			_jobs.push(job);
		},

		/** Add a callback to be called once the continuation has finished.
		 *  
		 *  The completion function is technically similar to a job, but it 
		 *  is kept separately from the normal work queue and is always 
		 *  processed last. Therefore, even if the computation keep adding jobs
		 *  dynamically using add() from within running jobs, the completion
		 *  callback is the last function executed.
		 *
		 *  The callback receives as parameter a boolean value which is 
		 *  false iff the continuation was aborted with abort(), and true otherwise.
		 *
		 *  @param {function} [_on_finished_callback] If undefined, returns the
		 *     currently set completion func (initially a null). Otherwise,
		 *     the parameter specifies a new completion callback.
		 **/
		on_finished : function(on_finished_callback) {
			if (on_finished_callback === undefined) {
				return _on_finished_callback;
			}

			_on_finished_callback = on_finished_callback;
		},


		/** Starts running the continuation.
		 *
		 *  Any Continuation instance can only be scheduled once. After finishing,
		 *  the finished() member returns true and no more jobs are accepted.
		 *  While the continuation runs, more jobs can be added dynamically by
		 *  either calling add() or by returning a new continuation from a job.
		 *  See the docs for add() for the details.
		 *
		 *  @param {number} [slice_duration] Time slice in milliseconds
		 *     to run jobs in. The scheduler runs jobs until this time
		 *     slice is exceeded, and offloads running the remaining jobs
		 *     to a later time slice, which is scheduled using the tick
		 *     getter or setTimeout interval set via the Continue constructor.
		 *  @param {boolean} [force_async] If this parameter is falsy, the
		 *     first time slice runs immediately. If truthy, the first time
		 *     slice is already delayed.
		 */
		schedule : function(slice_duration, force_async) {
			slice_duration = slice_duration || 100;
			if(_done || _running) {
				return;
			}

			if (!_jobs.length) {
				_done = true;
				if (_on_finished_callback) {
					_on_finished_callback(true);
				}
				return;
			}

			_running = true;

			// call one slice immediately unless otherwise requested
			if(force_async) {
				_tick_getter(function() {
					_call_next(slice_duration);
				});
			}
			else {
				_call_next(slice_duration);
			}
		},


		/** Aborts a running continuation.
		 *
		 *  Continuations can only be aborted while they are running().
		 *  After calling abort(), no further jobs will be executed.
		 *  If abort() is called from within a job, and that jobs returns a
		 *  continuation, that continuation is also not executed.
		 **/
		abort : function() {
			if(this.running()) {
				_done = true;
				_aborted = true;
			}
		}
	};
}
medealib._MarkScriptAsLoaded("continue.js");

/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */
medealib.define('continuation',['continue.js'],function(medealib, undefined) {
	"use strict";
	var medea = this
	,	counter = 0
	,	prefix = '__medea_continuation__'
	;

	// just a slim wrapper around continue.js, which is independent of medea
	medea.Continuation = medealib.Class.extend({
		c : null,
		max_time : -1,

		init : function(max_time) {
			this.max_time = max_time || 20;

			var key = prefix + (counter++);
			// problem: when the main loop is not running, or is terminated,
			// continuations may never fully execute. For this, a rework
			// of the main loop is needed. So for now, back to setTimeout()
			this.c = new Continuation( /*function(f) {

				// go through medea's regular tick system to make sure the
				// debug tools are able to include this in the frame-time.
				medea.SetTickCallback( function() {
					medea.RemoveTickCallback(key);
					f();
				}, key);


			} */);
		},

		MaxTime : medealib.Property('max_time'),

		AddJob : function(f) {
			this.c.add(f);
		},

		Schedule : function(force_async) {
			this.c.schedule(this.max_time, force_async);
		},

		Finished : function() {
			return this.c.finished();
		},

		Running : function() {
			return this.c.running();
		},
	});

	medea.CreateContinuation = function(max_time) {
		return new medea.Continuation(max_time);
	};
});


/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('terrainheightpath',['entity'],function(medealib, undefined) {
	"use strict";
	var medea = this;

	

	var TerrainHeightPath = medea.Entity.extend(
	{
		init : function(terrain, height_offset, smooth_factor) {
			this.terrain = terrain;
			this.height_offset = height_offset === undefined ? 2.0 : height_offset;
			this.smooth_factor = smooth_factor || 0.06;
			this.seen = {};

		},

		Render : function(viewport,entity,node,rqmanager) {
			// nothing to be done
		},

		Update : function(dtime,node) {
			var ppos = node.GetWorldPos();
			var h = this.terrain.GetWorldHeightForWorldPos(ppos[0],ppos[2]);

			if (h === null) {
				// outside the terrain or terrain not present yet, do not touch.
			}
			else {
				ppos[1] = this.height_offset + h;

				var t = vec3.create();
				mat4.multiplyVec3(node.parent.GetInverseGlobalTransform(),ppos,t);

				if (this.smooth_factor && node.id in this.seen) {
					var f = Math.pow(this.smooth_factor,dtime), oldh = t[1] - this.height_offset*0.5;
					t = vec3.add( vec3.scale(t,1.0 - f), vec3.scale(node.LocalPos(), f) );

					// add lower limit to make sure we don't fall below the terrain
					t[1] = Math.max(t[1], oldh);
				}

				node.LocalPos(t);
				this.seen[node.id] = true;
			}
		},

		HeightOffset : function(h) {
			if (h === undefined) {
				return this.height_offset;
			}
			this.height_offset = h;
		},

		SmoothFactor : function(h) {
			if (h === undefined) {
				return this.smooth_factor;
			}
			this.smooth_factor = h;
		},
	});

	medea.CreateTerrainHeightPathAnimator = function(terrain, ho) {
		return new TerrainHeightPath(terrain, ho);
	};
});
/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('light', ['entity', 'renderer'],function(medealib, undefined) {
	"use strict";
	var medea = this, gl = medea.gl;

	

	// class LightJob
	medea.LightJob = medea.RenderJob.extend({

		distance 	: null,
		light 		: null,

		init : function(light, node, camera) {
			this._super(light, node, camera);
			this.light = light;
		},

		Draw : function(renderer, statepool) {
			renderer.DrawLight(this, statepool);
		},
	});



	// class Light
	this.Light = medea.Entity.extend(
	{
		cast_shadows : false,
		shadowmap_res_bias : 0,
		rq_idx : -1,

		init : function(color, rq) {
			this.color = color || [1,1,1];
			this.rq_idx = rq === undefined ? medea.RENDERQUEUE_LIGHT : rq;
		},


		Render : function(camera, node, rqmanager) {
			// Construct a renderable capable of drawing this light later
			rqmanager.Push(this.rq_idx, new medea.LightJob(this, node, camera));
		},


		CastShadows : medealib.Property('cast_shadows'),
		ShadowMapResolutionBias : medealib.Property('shadowmap_res_bias'),
	});


	// class DirectionalLight
	this.DirectionalLight = medea.Light.extend(
	{
		dir : null,
		
		init : function(color, dir) {
			this._super(color);
			this.dir = vec3.create(dir || [0,-1,0]); 
			vec3.normalize(this.dir);
		},

		Direction : function(dir) {
			if (dir === undefined) {
				return this.dir;
			}
			this.dir = vec3.create(dir);
			vec3.normalize(this.dir);
		},
	});


	medea.CreateDirectionalLight = function(color, dir) {
		return new medea.DirectionalLight(color, dir);
	};
});
/*
	http://www.JSON.org/json2.js
	2011-02-23

	Public Domain.

	NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.

	See http://www.JSON.org/js.html


	This code should be minified before deployment.
	See http://javascript.crockford.com/jsmin.html

	USE YOUR OWN COPY. IT IS EXTREMELY UNWISE TO LOAD CODE FROM SERVERS YOU DO
	NOT CONTROL.


	This file creates a global JSON object containing two methods: stringify
	and parse.

		JSON.stringify(value, replacer, space)
			value       any JavaScript value, usually an object or array.

			replacer    an optional parameter that determines how object
						values are stringified for objects. It can be a
						function or an array of strings.

			space       an optional parameter that specifies the indentation
						of nested structures. If it is omitted, the text will
						be packed without extra whitespace. If it is a number,
						it will specify the number of spaces to indent at each
						level. If it is a string (such as '\t' or '&nbsp;'),
						it contains the characters used to indent at each level.

			This method produces a JSON text from a JavaScript value.

			When an object value is found, if the object contains a toJSON
			method, its toJSON method will be called and the result will be
			stringified. A toJSON method does not serialize: it returns the
			value represented by the name/value pair that should be serialized,
			or undefined if nothing should be serialized. The toJSON method
			will be passed the key associated with the value, and this will be
			bound to the value

			For example, this would serialize Dates as ISO strings.

				Date.prototype.toJSON = function (key) {
					function f(n) {
						// Format integers to have at least two digits.
						return n < 10 ? '0' + n : n;
					}

					return this.getUTCFullYear()   + '-' +
						 f(this.getUTCMonth() + 1) + '-' +
						 f(this.getUTCDate())      + 'T' +
						 f(this.getUTCHours())     + ':' +
						 f(this.getUTCMinutes())   + ':' +
						 f(this.getUTCSeconds())   + 'Z';
				};

			You can provide an optional replacer method. It will be passed the
			key and value of each member, with this bound to the containing
			object. The value that is returned from your method will be
			serialized. If your method returns undefined, then the member will
			be excluded from the serialization.

			If the replacer parameter is an array of strings, then it will be
			used to select the members to be serialized. It filters the results
			such that only members with keys listed in the replacer array are
			stringified.

			Values that do not have JSON representations, such as undefined or
			functions, will not be serialized. Such values in objects will be
			dropped; in arrays they will be replaced with null. You can use
			a replacer function to replace those with JSON values.
			JSON.stringify(undefined) returns undefined.

			The optional space parameter produces a stringification of the
			value that is filled with line breaks and indentation to make it
			easier to read.

			If the space parameter is a non-empty string, then that string will
			be used for indentation. If the space parameter is a number, then
			the indentation will be that many spaces.

			Example:

			text = JSON.stringify(['e', {pluribus: 'unum'}]);
			// text is '["e",{"pluribus":"unum"}]'


			text = JSON.stringify(['e', {pluribus: 'unum'}], null, '\t');
			// text is '[\n\t"e",\n\t{\n\t\t"pluribus": "unum"\n\t}\n]'

			text = JSON.stringify([new Date()], function (key, value) {
				return this[key] instanceof Date ?
					'Date(' + this[key] + ')' : value;
			});
			// text is '["Date(---current time---)"]'


		JSON.parse(text, reviver)
			This method parses a JSON text to produce an object or array.
			It can throw a SyntaxError exception.

			The optional reviver parameter is a function that can filter and
			transform the results. It receives each of the keys and values,
			and its return value is used instead of the original value.
			If it returns what it received, then the structure is not modified.
			If it returns undefined then the member is deleted.

			Example:

			// Parse the text. Values that look like ISO date strings will
			// be converted to Date objects.

			myData = JSON.parse(text, function (key, value) {
				var a;
				if (typeof value === 'string') {
					a =
/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/.exec(value);
					if (a) {
						return new Date(Date.UTC(+a[1], +a[2] - 1, +a[3], +a[4],
							+a[5], +a[6]));
					}
				}
				return value;
			});

			myData = JSON.parse('["Date(09/09/2001)"]', function (key, value) {
				var d;
				if (typeof value === 'string' &&
						value.slice(0, 5) === 'Date(' &&
						value.slice(-1) === ')') {
					d = new Date(value.slice(5, -1));
					if (d) {
						return d;
					}
				}
				return value;
			});


	This is a reference implementation. You are free to copy, modify, or
	redistribute.
*/

/*jslint evil: true, strict: false, regexp: false */

/*members "", "\b", "\t", "\n", "\f", "\r", "\"", JSON, "\\", apply,
	call, charCodeAt, getUTCDate, getUTCFullYear, getUTCHours,
	getUTCMinutes, getUTCMonth, getUTCSeconds, hasOwnProperty, join,
	lastIndex, length, parse, prototype, push, replace, slice, stringify,
	test, toJSON, toString, valueOf
*/


// Create a JSON object only if one does not already exist. We create the
// methods in a closure to avoid creating global variables.

var JSON;
if (!JSON) {
	JSON = {};
}

(function () {
	"use strict";

	function f(n) {
		// Format integers to have at least two digits.
		return n < 10 ? '0' + n : n;
	}

	if (typeof Date.prototype.toJSON !== 'function') {

		Date.prototype.toJSON = function (key) {

			return isFinite(this.valueOf()) ?
				this.getUTCFullYear()     + '-' +
				f(this.getUTCMonth() + 1) + '-' +
				f(this.getUTCDate())      + 'T' +
				f(this.getUTCHours())     + ':' +
				f(this.getUTCMinutes())   + ':' +
				f(this.getUTCSeconds())   + 'Z' : null;
		};

		String.prototype.toJSON      =
			Number.prototype.toJSON  =
			Boolean.prototype.toJSON = function (key) {
				return this.valueOf();
			};
	}

	var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
		escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
		gap,
		indent,
		meta = {    // table of character substitutions
			'\b': '\\b',
			'\t': '\\t',
			'\n': '\\n',
			'\f': '\\f',
			'\r': '\\r',
			'"' : '\\"',
			'\\': '\\\\'
		},
		rep;


	function quote(string) {

// If the string contains no control characters, no quote characters, and no
// backslash characters, then we can safely slap some quotes around it.
// Otherwise we must also replace the offending characters with safe escape
// sequences.

		escapable.lastIndex = 0;
		return escapable.test(string) ? '"' + string.replace(escapable, function (a) {
			var c = meta[a];
			return typeof c === 'string' ? c :
				'\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
		}) + '"' : '"' + string + '"';
	}


	function str(key, holder) {

// Produce a string from holder[key].

		var i,          // The loop counter.
			k,          // The member key.
			v,          // The member value.
			length,
			mind = gap,
			partial,
			value = holder[key];

// If the value has a toJSON method, call it to obtain a replacement value.

		if (value && typeof value === 'object' &&
				typeof value.toJSON === 'function') {
			value = value.toJSON(key);
		}

// If we were called with a replacer function, then call the replacer to
// obtain a replacement value.

		if (typeof rep === 'function') {
			value = rep.call(holder, key, value);
		}

// What happens next depends on the value's type.

		switch (typeof value) {
		case 'string':
			return quote(value);

		case 'number':

// JSON numbers must be finite. Encode non-finite numbers as null.

			return isFinite(value) ? String(value) : 'null';

		case 'boolean':
		case 'null':

// If the value is a boolean or null, convert it to a string. Note:
// typeof null does not produce 'null'. The case is included here in
// the remote chance that this gets fixed someday.

			return String(value);

// If the type is 'object', we might be dealing with an object or an array or
// null.

		case 'object':

// Due to a specification blunder in ECMAScript, typeof null is 'object',
// so watch out for that case.

			if (!value) {
				return 'null';
			}

// Make an array to hold the partial results of stringifying this object value.

			gap += indent;
			partial = [];

// Is the value an array?

			if (Object.prototype.toString.apply(value) === '[object Array]') {

// The value is an array. Stringify every element. Use null as a placeholder
// for non-JSON values.

				length = value.length;
				for (i = 0; i < length; i += 1) {
					partial[i] = str(i, value) || 'null';
				}

// Join all of the elements together, separated with commas, and wrap them in
// brackets.

				v = partial.length === 0 ? '[]' : gap ?
					'[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']' :
					'[' + partial.join(',') + ']';
				gap = mind;
				return v;
			}

// If the replacer is an array, use it to select the members to be stringified.

			if (rep && typeof rep === 'object') {
				length = rep.length;
				for (i = 0; i < length; i += 1) {
					if (typeof rep[i] === 'string') {
						k = rep[i];
						v = str(k, value);
						if (v) {
							partial.push(quote(k) + (gap ? ': ' : ':') + v);
						}
					}
				}
			} else {

// Otherwise, iterate through all of the keys in the object.

				for (k in value) {
					if (Object.prototype.hasOwnProperty.call(value, k)) {
						v = str(k, value);
						if (v) {
							partial.push(quote(k) + (gap ? ': ' : ':') + v);
						}
					}
				}
			}

// Join all of the member texts together, separated with commas,
// and wrap them in braces.

			v = partial.length === 0 ? '{}' : gap ?
				'{\n' + gap + partial.join(',\n' + gap) + '\n' + mind + '}' :
				'{' + partial.join(',') + '}';
			gap = mind;
			return v;
		}
	}

// If the JSON object does not yet have a stringify method, give it one.

	if (typeof JSON.stringify !== 'function') {
		JSON.stringify = function (value, replacer, space) {

// The stringify method takes a value and an optional replacer, and an optional
// space parameter, and returns a JSON text. The replacer can be a function
// that can replace values, or an array of strings that will select the keys.
// A default replacer method can be provided. Use of the space parameter can
// produce text that is more easily readable.

			var i;
			gap = '';
			indent = '';

// If the space parameter is a number, make an indent string containing that
// many spaces.

			if (typeof space === 'number') {
				for (i = 0; i < space; i += 1) {
					indent += ' ';
				}

// If the space parameter is a string, it will be used as the indent string.

			} else if (typeof space === 'string') {
				indent = space;
			}

// If there is a replacer, it must be a function or an array.
// Otherwise, throw an error.

			rep = replacer;
			if (replacer && typeof replacer !== 'function' &&
					(typeof replacer !== 'object' ||
					typeof replacer.length !== 'number')) {
				throw new Error('JSON.stringify');
			}

// Make a fake root object containing our value under the key of ''.
// Return the result of stringifying the value.

			return str('', {'': value});
		};
	}


// If the JSON object does not yet have a parse method, give it one.

	if (typeof JSON.parse !== 'function') {
		JSON.parse = function (text, reviver) {

// The parse method takes a text and an optional reviver function, and returns
// a JavaScript value if the text is a valid JSON text.

			var j;

			function walk(holder, key) {

// The walk method is used to recursively walk the resulting structure so
// that modifications can be made.

				var k, v, value = holder[key];
				if (value && typeof value === 'object') {
					for (k in value) {
						if (Object.prototype.hasOwnProperty.call(value, k)) {
							v = walk(value, k);
							if (v !== undefined) {
								value[k] = v;
							} else {
								delete value[k];
							}
						}
					}
				}
				return reviver.call(holder, key, value);
			}


// Parsing happens in four stages. In the first stage, we replace certain
// Unicode characters with escape sequences. JavaScript handles many characters
// incorrectly, either silently deleting them, or treating them as line endings.

			text = String(text);
			cx.lastIndex = 0;
			if (cx.test(text)) {
				text = text.replace(cx, function (a) {
					return '\\u' +
						('0000' + a.charCodeAt(0).toString(16)).slice(-4);
				});
			}

// In the second stage, we run the text against regular expressions that look
// for non-JSON patterns. We are especially concerned with '()' and 'new'
// because they can cause invocation, and '=' because it can cause mutation.
// But just to be safe, we want to reject all unexpected forms.

// We split the second stage into 4 regexp operations in order to work around
// crippling inefficiencies in IE's and Safari's regexp engines. First we
// replace the JSON backslash pairs with '@' (a non-JSON character). Second, we
// replace all simple value tokens with ']' characters. Third, we delete all
// open brackets that follow a colon or comma or that begin the text. Finally,
// we look to see that the remaining characters are only whitespace or ']' or
// ',' or ':' or '{' or '}'. If that is so, then the text is safe for eval.

			if (/^[\],:{}\s]*$/
					.test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@')
						.replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']')
						.replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {

// In the third stage we use the eval function to compile the text into a
// JavaScript structure. The '{' operator is subject to a syntactic ambiguity
// in JavaScript: it can begin a block or an object literal. We wrap the text
// in parens to eliminate the ambiguity.

				j = eval('(' + text + ')');

// In the optional fourth stage, we recursively walk the new structure, passing
// each name/value pair to a reviver function for possible transformation.

				return typeof reviver === 'function' ?
					walk({'': j}, '') : j;
			}

// If the text is not JSON parseable, then a SyntaxError is thrown.

			throw new SyntaxError('JSON.parse');
		};
	}
}());medealib._MarkScriptAsLoaded("json2.js");

/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('input_handler',['input'],function(medealib, undefined) {
	"use strict";
	var medea = this;

	var settings = medea.settings;

	// class InputHandler
	medea.InputHandler = medealib.Class.extend(
	{
		custom_keymap : null,

		init : function(custom_keymap) {
			this.acked_state = {};	
			this.custom_keymap = custom_keymap;
		},

		ConsumeKeyDown : function(keycode) {
			var acked = this.acked_state;
			var keymap = this.custom_keymap;
			if(keymap ) {
				keycode = keymap[keycode];
			}

			var old = acked[keycode] || false;
			var now = acked[keycode] = medea.IsKeyDown(keycode);
			return now && !old;
		},

		ConsumeKeyUp : function(keycode) {
			var acked = this.acked_state;
			var keymap = this.custom_keymap;
			if(keymap ) {
				keycode = keymap[keycode];
			}

			var old = acked[keycode] || true;
			var now = acked[keycode] = !medea.IsKeyDown(keycode);
			return !now && old;
		},

		IsKeyDown : function(keycode) {
			var keymap = this.custom_keymap;
			if(keymap ) {
				keycode = keymap[keycode];
			}
			return medea.IsKeyDown(keycode);
		}
	});

	medea.CreateInputHandler = function() {
		return new medea.InputHandler();
	}
});


/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('keymap',[],function(medealib, undefined) {
	"use strict";
	var medea = this;


	medea.SetKeyMap = function(keymap) {
		medea.settings.keymap = keymap;

		// augment with identity map for all other keys
		for (var i = 0; i < 200; ++i) {
			if (keymap[i] === undefined) {
				keymap[i] = i;
			}
		}
	};


	medea.GetKeyMap = function(keymap) {
		return medea.settings.keymap;
	};
});



/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('keycodes',[],function(medealib, undefined) {
  "use strict";
  var medea = this;

  medea.KeyCode = {
    ENTER: 13,
    SHIFT: 16,
    CTRL: 17,

    SPACE: 32,
    PAGE_UP: 33,
    PAGE_DOWN: 34,
    UP: 38,
    DOWN: 40,
    LEFT: 37,
    RIGHT: 39,

    NUM0: 48,
    NUM1: 49,
    NUM2: 50,
    NUM3: 51,
    NUM4: 52,
    NUM5: 53,
    NUM6: 54,
    NUM7: 55,
    NUM8: 56,
    NUM9: 57,

    A: 65,
    B: 66,
    C: 67,
    D: 68,
    E: 69,
    F: 70,
    G: 71,
    H: 72,
    I: 73,
    J: 74,
    K: 75,
    L: 76,
    M: 77,
    N: 78,
    O: 79,
    P: 80,
    Q: 81,
    R: 82,
    S: 83,
    T: 84,
    U: 85,
    V: 86,
    W: 87,
    X: 88,
    Y: 89,
    Z: 90,

    PERIOD: 190
  };

});


/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */


// note: medeactx file is compiletime-included by medea.core.js and not used as a module.
// the Context API is always available.


 // ---------------------------------------------------------------------------
/** Constructs a new MedeaContext giving access to the medea API.
 *
 *  @param where <canvas> DOM element to be used to host medea's 3D output.
 *  @param settings Dictionary of initial settings. Currently recognized values include:
 *       - 
 *
 *
 **/
 // ---------------------------------------------------------------------------
medealib.CreateContext = function(where, settings, deps, user_on_ready, user_on_failure) {
	new medealib.Context(where, settings, deps, user_on_ready, user_on_failure);

	//  Do not return a value to discourage the following pattern:
	/*
	var medea = medealib.CreateContext(...,function() {
		var vp1 = medea.CreateViewport(); << medea not defined if callback is called instantly
	});
	*/
}


 // ---------------------------------------------------------------------------
 /** @private */
var Context = medealib.Context = function(where, settings, deps, user_on_ready, user_on_failure) {
	var medeactx = this;

	if(!(medeactx instanceof Context)) {
		return new Context(where, settings, deps, user_on_ready, user_on_failure);
	}




	// TODO: restructure constants
	// constants
	medeactx.FRAME_VIEWPORT_UPDATED = 0x1;
	medeactx.FRAME_CANVAS_SIZE_CHANGED = medeactx.FRAME_VIEWPORT_UPDATED | 0x2;

	medeactx.VISIBLE_NONE = 0x0;
	medeactx.VISIBLE_ALL = 0x1;
	medeactx.VISIBLE_PARTIAL = 0x2;


	// context state and statistics 
	medeactx.settings = settings || {};
	medeactx.settings.fps = medeactx.settings.fps || 60;
	medeactx.wireframe = false;

	medeactx.statistics = {
		  count_frames : 0
		, smoothed_fps : -1
		, exact_fps    : -1
		, min_fps      : -1
		, max_fps      : -1
		, primitives_frame 	: 0
		, vertices_frame 	: 0
		, batches_frame : 0
	};

	medeactx.time = 0.0;

	medeactx.dtacc = 0.0;
	medeactx.dtcnt = 0;
	medeactx.dtmin_fps = 1e6;
	medeactx.dtmax_fps = 0;

	medeactx.tick_callbacks = {};
	medeactx.stop_asap = false;

	medeactx.frame_flags = 0;
	medeactx.debug_panel = null;

	medeactx.statepool = {};
	medeactx._workers = {};

	
	var _modules_loaded = {}
	,	_disposed = false;


	// ---------------------------------------------------------------------------
	/** Dispose of all resources held by the context. 
	 * */
	// ---------------------------------------------------------------------------
	medeactx.Dispose = function() {

		_disposed = true;

		if(this.debug_panel) {
			this.debug_panel.Dispose();
		}

		// TODO: how to cleverly destroy all gl resources, including the
		// context? http://stackoverflow.com/questions/14970206
	} 



	// ---------------------------------------------------------------------------
	/** Check if a particular module has been loaded using LoadModules().
	 *
	 *  This becomes true for a module once the module is fully resolved,
	 *  and its APIs are available. So after LoadModules() returns it is likely
	 *  false, but it is true in the callback given to LoadModules(). Modules
	 *  cannot be unloades so the value remains true for the context's lifetime
	 *  then.
	 * */
	// ---------------------------------------------------------------------------
	medeactx.IsModuleLoaded = function(modname) {
		return !!_modules_loaded[modname];
	} 

	
	// ---------------------------------------------------------------------------
	/** Load a set of modules into this medea context.
	 *
	 *  Once loading is complete, the APIs of the respective modules are available
	 *  on the context object or in the global environment, depending on which
	 *  type of modules is being loaded.
	 *
	 *  @param {String} String or list of strings containing the names of the
	 *    modules to be fetched. There are two kinds of "modules":
	 *     a) medea modules, which are referred to with their name suffixes and
	 *        without the file extension. Such modules have their dependencies
	 *        resolved automatically, and they are applied to augment the medea
	 *        context such that their APIs become available on it.
	 *     b) JS files from /medea/3rdparty, which are referred to by their file 
	 *        name, including their file extension, i.e. "someMod.js". There
	 *        is no dependency resolution for such modules, they are simply
	 *        fetched and globally eval()ed.
	 *
	 *  @param {Function} Callback to be invoked once all the modules have 
	 *    been loaded. This may be called immediately if the modules are all 
	 *    registered with medealib.
	 *
	 *  @private
	 */
	// ---------------------------------------------------------------------------
	medeactx.LoadModules = function(whom, callback) {
		medealib._RegisterMods(whom, function() {
			if (!Array.isArray(whom)) {
				whom = [whom];
			}

			whom.forEach(function(mod) {
				var init_stub;

				// nothing to do for non-medea modules
				if(/\.js$/i.test(mod)) {
					return;
				}

				if (medeactx.IsModuleLoaded(mod)) {
					return;
				}



				// init_stub[0] init function for *this* module
				// init_stub[1] list of (direct) module dependencies - note that
				// the JS files have been fetched already by _RegisterMods(),
				// so LoadModules() does not need to do async ops and we don't
				// need to supply a callback.
				init_stub = medealib._GetModuleInfo( mod);
				medeactx.LoadModules(init_stub[1]);
					
				_modules_loaded[mod] = true;
				init_stub[0].call(medeactx, medealib);
			});

			if(callback) {
				callback(medeactx);
			}
		});
	};


	// ------------------------------------------------------------------------
	/** TODO: documentation 
	*/
	// ------------------------------------------------------------------------
	medeactx.GetSettings = function() {
		return medeactx.settings;
	};


	// ------------------------------------------------------------------------
	/** TODO: documentation 
	*/
	// ------------------------------------------------------------------------
	medeactx.RootNode = function(s) {
		if(s === undefined) {
			return medeactx.scene_root;
		}
		medeactx.scene_root = s;
	};


	// ------------------------------------------------------------------------
	/** TODO: documentation 
	*/
	// ------------------------------------------------------------------------
	medeactx.GetStatistics = function() {
		return medeactx.statistics;
	};


	// ------------------------------------------------------------------------
	/** TODO: documentation 
	*/
	// ------------------------------------------------------------------------
	medeactx.SetTickCallback = function(clb,key) {
		medeactx.tick_callbacks[key] = clb;
	};


	// ------------------------------------------------------------------------
	/** TODO: documentation 
	*/
	// ------------------------------------------------------------------------
	medeactx.RemoveTickCallback = function(key) {
		try {
			delete medeactx.tick_callbacks[key];
		} catch(e) {}
	};


	// ------------------------------------------------------------------------
	/** TODO: documentation 
	*/
	// ------------------------------------------------------------------------
	medeactx.EnsureIsResponsive = (function() {
		var should_be_responsive = false;
		return function(enabled) {
			if (enabled === undefined) {
				return should_be_responsive;
			}
			should_be_responsive = enabled;
		}
	}) ();


	// ------------------------------------------------------------------------
	/** Add a debug panel to the DOM.
	 *
	 *  This asynchonously fetches the "debug" module and creates a 
	 *  {@link medealib.Context.DebugPanel} instance, which is then set as the
	 *  context's global debug handler.
	 *
	 *  @param {DOMElement} [where] DOM element to host the debug panel, or falsy,
	 *    in which case the debug panel adds itself top-level.
	 *  @param {Function} [completion] Callback to be invoked once the debug
	 *    panel is ready.
	*/
	// ------------------------------------------------------------------------
	medeactx.SetDebugPanel = function(where, completion) {
		if(medeactx.debug_panel !== null) {
			return;
		}
		medeactx.debug_panel = false;
		medeactx.LoadModules("debug", function() {
			medeactx.debug_panel = new medeactx.DebugPanel(where);
			if (completion) {
				completion();
			}
		});
	};


	// ------------------------------------------------------------------------
	/** Start running the "main loop", that is, an infinite loop of calls 
	*  to {@link medealib.Context.DoSingleFrame()} to ensure continuous
	*  rendering.
	*
	*  The first loop iteration happens asynchronously, i.e. Start() itself
	*  returns immediately.
	*
	*  The framerate at which the frames are scheduled depends on the
	*  `fps` setting, as well as on the current performance situation (i.e.
	*   if CPU time is spare, the framerate is lower).
	*/
	// ------------------------------------------------------------------------
	medeactx.Start = function() {
		if (medeactx.stop_asap) {
			medeactx.stop_asap = false;
			return;
		}

		window.requestAnimationFrame(function() { 
			if (medeactx.stop_asap) {
				medeactx.stop_asap = false;
				return;
			}

			medeactx.DoSingleFrame();

			medeactx.Start();
		}, medeactx.canvas);
	};


	// ------------------------------------------------------------------------
	/** TODO: documentation 
	*/
	// ------------------------------------------------------------------------
	medeactx.StopNextFrame = function(unset_marker) {
		medeactx.stop_asap = !unset_marker;
	};


	// ------------------------------------------------------------------------
	/** TODO: documentation 
	*/
	// ------------------------------------------------------------------------
	medeactx.IsStopMarkerSet = function() {
		return medeactx.stop_asap;
	};


	// ------------------------------------------------------------------------
	/** Checks if rendering is currently possible. This is the case iff
	 *   a) the webgl context is ready, and not lost and
	 *   b) there is at least one viewport.
	*/
	// ------------------------------------------------------------------------
	medeactx.CanRender = function() {
		return medeactx.gl && medeactx.GetViewports().length;
	};


	// ------------------------------------------------------------------------
	/** TODO: documentation 
	*/
	// ------------------------------------------------------------------------
	medeactx.Wireframe = function(wf) {
		if (wf === undefined) {
			return medeactx.wireframe;
		}
		medeactx.wireframe = wf;
		// medeactx would be nice: medeactx.gl.polygonMode( medeactx.gl.FRONT_AND_BACK, wf?medeactx.gl.LINE:medeactx.gl.FILL );
		// .. but unfortunately we don't have glPolygonMode in WebGL. So leave the
		// implementation to the mesh drawing routines, which might use GL_LINES
		// to achieve the same effect.
		// http://stackoverflow.com/questions/3539205/is-there-a-substitute-for-glpolygonmode-in-open-gl-es-webgl
	};


	// ------------------------------------------------------------------------
	/** TODO: documentation 
	*/
	// ------------------------------------------------------------------------
	medeactx.GetTime = function() {
		return medeactx.time;
	};


	// ------------------------------------------------------------------------
	/** Performs a single frame.
	 *
	 *  This can be used if the application would like to have fine-grained
	 *  control on the timing of the drawing. To perform a automatic update
	 *  & drawing loop instead, use {@link medealib.Context.Start}.
	 *
	 *  Doing a frame involves (in this order):
	 *    - calling user callbacks
	 *    - visiting the scenegraph and calling Update() on dirty nodes
	 *    - rendering jobs to all viewports
	 *
	 *  @param {number} [dtime] Time passed since the last frame, in seconds. 
	 *     If omitted, the time is computed as the time elapsed since the
	 *     last call to {@link medealib.Context.DoSingleFrame}.
	*/
	// ------------------------------------------------------------------------
	medeactx.DoSingleFrame = function(dtime) {

		if (!medeactx.CanRender()) {
			medealib.NotifyFatal("Not ready for rendering; need a GL context and a viewport");
			return;
		}

		// get time delta and detect canvas changes
		function update_stats() {
			// get time delta if not specified
			if (dtime === undefined) {
				var old = medeactx.time;
				medeactx.time = Date.now() * 0.001;

				dtime = medeactx.time - old;
			}

			// check if the canvas sized changed
			if(medeactx.cached_cw != medeactx.canvas.width) {
				medeactx.cached_cw = medeactx.canvas.width;
				medeactx.frame_flags |= medeactx.FRAME_CANVAS_SIZE_CHANGED;
			}
			if(medeactx.cached_ch != medeactx.canvas.height) {
				medeactx.cached_ch = medeactx.canvas.height;
				medeactx.frame_flags |= medeactx.FRAME_CANVAS_SIZE_CHANGED;
			}

			medeactx._UpdateFrameStatistics(dtime);
		}

		// call user tick callbacks, result of false kills the frame
		function call_user_callbacks() {
			// call user-defined logic, operate on a copy of the dictionary just in case
			// somebody changed its contents while we're iterating it.
			var temp_callbacks = [];
			for(var k in medeactx.tick_callbacks) {
				temp_callbacks.push(medeactx.tick_callbacks[k]);
			}
			for(var i = 0; i < temp_callbacks.length; ++i) {
				if(!temp_callbacks[i](dtime)) {
					medeactx.StopNextFrame();
					return false;
				}
			}
			return true;
		}

		// perform scenegraph update 
		function update() {
			medeactx.VisitGraph(medeactx.scene_root,function(node) {
				if(!node.Enabled()) {
					return true;
				}
				var e = node.GetEntities();
				// if entities return medea.ENTITY_UPDATE_WAS_REMOVED  from Update(), medeactx means they removed
				for(var i = 0; i < e.length; ++i) {
					if(e[i].Update(dtime,node) === medeactx.ENTITY_UPDATE_WAS_REMOVED) {
						--i;
					}
				}

				node.Update(dtime);
				return true;
			});
		}

		// dispatch collected batch jobs to our viewport(s)
		function draw() {
			// adjust render settings if we switched to multiple viewports or vice versa
			if (medeactx.frame_flags & medeactx.FRAME_VIEWPORT_UPDATED) {
				if (medeactx.GetEnabledViewportCount()>1) {
					medeactx.gl.enable(medeactx.gl.SCISSOR_TEST);
				}
				else {
					medeactx.gl.disable(medeactx.gl.SCISSOR_TEST);
				}
			}

			// perform rendering
			var viewports = medeactx.GetViewports();
			for(var vn = 0; vn < viewports.length; ++vn) {
				viewports[vn].Render(medeactx,dtime);
			}
		}

		// putting it all together
		function do_frame() {
			update_stats();
			if(!call_user_callbacks()) {
				return;
			}
			update();
			draw();

			medeactx.frame_flags = 0;
		}

		// *****************
		var debug_panel = medeactx.debug_panel;

		if (debug_panel) {
			debug_panel.BeginFrame();
		}
		do_frame();
	
		if (debug_panel) {
			debug_panel.EndFrame();
		}
	};


	// ------------------------------------------------------------------------
	/** TODO: documentation 
	*/
	// ------------------------------------------------------------------------
	medeactx.VisitGraph = function(node,visitor,status_in) {
		var status = visitor(node, status_in);
		if (!status) {
			return false;
		}

		var c = node.GetChildren();
		for(var i = 0; i < c.length; ++i) {
			medeactx.VisitGraph(c[i], visitor, status);
		}

		return true;
	};


	// ------------------------------------------------------------------------
	/** TODO: documentation 
	*/
	// ------------------------------------------------------------------------
	medeactx.CreateWorker = function() {
		var worker_index_source = 0;
		return function(name, callback) {
			var Blob =  window.Blob
			,	BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder
			,	URL = window.URL || window.webkitURL
			;

			if (!Blob && !BlobBuilder) {
				medealib.LogDebug('BlobBuilder not available, cannot use web worker');
				callback(null);
				return false;
			}

			if (!Worker) {
				medealib.LogDebug('Worker not available, cannot use web worker');
				callback(null);
				return false;
			}

			if (!URL || !URL.createObjectURL) {
				medealib.LogDebug('URL.createObjectURL not available, cannot use web worker');
				callback(null);
				return false;
			}

			medea.LoadModules('worker_base', function() {
				var source = [
					medea.GetModSource('worker_base'),
					'\n',
					medea.GetModSource(name )]
				,	bb
				,	worker 
				,	worker_index
				,	msg
				;

				if (Blob) {
					blobURL = URL.createObjectURL(new Blob(source));
				}
				else {
					bb = new BlobBuilder();
					bb.append(source.join());
					blobURL = URL.createObjectURL(bb.getBlob());
				}

				worker = new Worker(blobURL);
				worker_index = worker_index_source++;

				msg = callback(worker, worker_index) || function() {};
				worker.onmessage = function(e) {

					if (e.data[0] === 'log') {
						medealib.Log('(worker ' + worker_index + ') ' + e.data[1], e.data[2] || 'debug');
						return;
					}
					else if (e.data[0] === 'assert') {
						medealib.DebugAssert('(worker ' + worker_index + ') ' + e.data[1]);
						return;
					}
					return msg(e);
				};
			});

			return true;
		};
	};


	// ------------------------------------------------------------------------
	/** TODO: documentation 
	*/
	// ------------------------------------------------------------------------
	medeactx._UpdateFrameStatistics = function(dtime) {
		medeactx.statistics.count_frames += 1;
		var e = medeactx.statistics.exact_fps = 1/dtime;

		medeactx.dtmin_fps = Math.min(medeactx.dtmin_fps,e);
		medeactx.dtmax_fps = Math.max(medeactx.dtmin_fps,e);

		medeactx.dtacc += dtime;
		++medeactx.dtcnt;

		if (medeactx.dtacc > 0.5) {
			if ( medeactx.statistics.smoothed_fps > 0) {
				medeactx.statistics.smoothed_fps = medeactx.statistics.smoothed_fps*0.3+ 0.7/(medeactx.dtacc/medeactx.dtcnt);
			}
			else {
				medeactx.statistics.smoothed_fps = medeactx.dtcnt/medeactx.dtacc;
			}

			medeactx.dtcnt *= 0.33;
			medeactx.dtacc *= 0.33;

			medeactx.statistics.min_fps = medeactx.dtmin_fps;
			medeactx.statistics.max_fps = medeactx.dtmax_fps;
		}

		medeactx.statistics.vertices_frame = medeactx.statistics.primitives_frame = medeactx.statistics.batches_frame = 0;
	};


	// ------------------------------------------------------------------------
	/** TODO: documentation 
	*/
	// ------------------------------------------------------------------------
	medeactx._NextPow2 = function( s ){
		// dumb way, might use the bit fiddling hack some day?
		return Math.pow( 2, Math.ceil( Math.log( s ) / Math.log( 2 ) ) );
	};


	// ------------------------------------------------------------------------
	/** TODO: documentation 
	*/
	// ------------------------------------------------------------------------
	medeactx._IsPow2 = function(w) {
		return w !== 0 && (w & (w - 1)) === 0;
	};


	// ------------------------------------------------------------------------
	/** TODO: documentation 
	*/
	// ------------------------------------------------------------------------
	medeactx._GetPath = function(src) {
		return src.replace(/^(.*[\\\/])?(.*)/,'$1');
	}


	// ------------------------------------------------------------------------
	// first initialization phase -- create webgl canvas and prepare environment
	function _init_level_0() {
		medeactx.canvas  = document.getElementById(where);

		// create a webgl context
		// try out all the names under which webgl might be available
		var candidates = ["webgl", "experimental-webgl", "webkit-3d", "moz-webgl"]
		,	i
		,	context = null
		;

		for (i = 0; i < candidates.length; ++i) {
			try {
				// Request a stencil buffer by default (D24S8 should be
				// universally available, if not this needs to be revised)
				context = medeactx.canvas.getContext(candidates[i], {
					stencil : true
				});
			} catch(ex) {

			}
			// no matter what happens, we take the first non-null context we get
			if (context) {
				break;
			}
		}

		if(!context) {
			if(user_on_failure) {
				user_on_failure();
			}
			return false;
		}
		
		// automatically create debug context if webgl-debug.js is present
		if (window.WebGLDebugUtils !== undefined) {
			context = WebGLDebugUtils.makeDebugContext(context);
		}


		medeactx.gl = context;
		return true;
	};


	// ------------------------------------------------------------------------
	// second phase of initialization -- prepare the rest and invoke the 
	// user's callback function.
	function _init_level_1() {
		medeactx.cached_cw = medeactx.canvas.width, medeactx.cached_ch = medeactx.canvas.height;

		// always allocate a default root node for the visual scene
		medeactx.scene_root = medeactx.CreateNode("root");


		user_on_ready(medeactx);
	};


	// ------------------------------------------------------------------------
	// initialization
	(function() {

		// collect initial dependencies - for example the scenegraph module and the mathlib is always needed
		var _initial_deps = ['node', 'viewport'];
		var _initial_pre_deps = []; 

		if (window.mat4 === undefined) {
			_initial_pre_deps.push('glMatrix.js');
		}


		// Initialization has two phases, the first of which is used to load utility libraries
		// that all medea modules may depend upon. medeactx also involves creating a webgl canvas
		// (which is accessible through the medea.gl namespace)
		medeactx.LoadModules(_initial_pre_deps, function() {
			if (!_init_level_0()) {
				return;
			}

			medeactx.LoadModules(_initial_deps.concat(deps || []), function() {
				_init_level_1();
			});
		});
	}) ();
};


/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('filesystem',[],function(medealib, undefined) {
	"use strict";
	var medea = this, gl = medea.gl;

	var baked_resources = medealib._bakedResources;



	// find root location for remote files
	var settings_root = medea.GetSettings().dataroot || 'data';
	if (settings_root.charAt(settings_root.length-1) !== '/') {
		settings_root += '/';
	}
	
	
	var AppendUrlParameters = function(s, no_client_cache) {
		if (no_client_cache) {
			s += (s.indexOf('?') !== -1 ? '&' : '?') + 'nocache='+(new Date()).getTime();
		}
		return s;
	}
	

	// TODO this is only necessary because the image module still relies on the
	// browser's URL resolution.
	medea.FixURL = function(s, no_client_cache, root) {
	
		if (s.slice(0,7) === 'remote:') {
			s = (root || settings_root) + s.slice(7);
		}
		else if (s.slice(0,4) === 'url:') {
			s = s.slice(4);
		}
		else {
			return null;
		}

		// cleanup URL to avoid trouble in some browsers
		s = medea.FixResourceName(s);

		s = AppendUrlParameters(s);
		return s;
	};
	
	
	medea.FixResourceName = function(name) {
		// a) replace backslashes by forward slashes
		name = name.replace(/\\/,'/');
		// b) drop double slashes
		name = name.replace(/\/\//,'/');
		return name;
	};
	

	// class Resource
	medea.Resource = medealib.Class.extend({

		ref_count : 1,
		complete : false,
		callback : null,
		src : null,

		init : function(src, callback, do_not_load) {
			if(!src) {
				this.complete = true;
				this.src = '';
				return;
			}
			this.callback = callback;
			this.complete = false;
			this.src = src;

			if (!do_not_load) {
				var outer = this;
				(src instanceof Array ? medea.FetchMultiple : medea.Fetch)(src,
					function() {
						outer.OnDelayedInit.apply(outer,arguments);
					},
					function(error) {
						medealib.LogDebug('failed to delay initialize resource from ' + src + 
							', resource remains non-complete: '+error, 'error');
					}
				);
			}
		},

		AddRef : function() {
			this.ref_count++;
		},

		Release : function() {
			if(--this.ref_count === 0) {
				this.Dispose();
			}
		},

		Dispose : function() {
			// TODO: suitable debug behaviour 
		},

		IsComplete : function() {
			return this.complete;
		},

		IsRenderable : function() {
			return this.IsComplete();
		},

		OnDelayedInit : function() {
			this.complete = true;

			if(this.callback) {
				this.callback(this);
			}
		}
	});


	// class FileSystemHandler
	medea.FileSystemHandler = medealib.Class.extend({

		CanHandle : function(name) {
			return false;
		},

		Load : function(name) {
			return null;
		}
	});

	// class LocalFileSystemHandler
	medea.LocalFileSystemHandler = medea.FileSystemHandler.extend({

		init : function(root) {
			this.root = root || settings_root;
		},

		CanHandle : function(prefix) {
			return prefix == "local";
		},

		Load : function(what,callback,onerror) {
			medealib.LogDebug("begin loading: " + what + " from local disk");

			this.root.getFile(what, {}, function(fileEntry) {

				var reader = new FileReader();
				reader.onload = function(e) {
					callback(e.target.result);
				};

				reader.onerror = onerror || function() {
					callback(null);
				};
				reader.readAsText(fileEntry);
				return true;
			},
			function(e) {
				onerror("got error from getFile: " + e);
			});
		}
	});

	// class LocalFileSystemHandler
	medea.HTTPRemoteFileSystemHandler = medea.FileSystemHandler.extend({
	
		init : function(root_name, prefix) {
			this.root = root_name;
			this.prefix = prefix;
		},
	

		CanHandle : function(prefix) {
			return prefix == this.prefix;
		},

		Load : function(what_orig, callback, onerror) {
			var what = this.root + AppendUrlParameters(what_orig);
		

			medealib.LogDebug("begin loading: " + what + " via HTTP");
			medealib._AjaxFetch(what,function(response,status) {

				medealib.LogDebug("end loading " + what + ", HTTP status " + status);
				if (status >= 300 || status < 200) {
					if (onerror) {
						onerror(status);
					}
					else {
						callback(null);
					}
					return;
				}
				callback(response);
			});
			return true;
		}
	});

	// class DocumentFileSystemHandler
	medea.DocumentFileSystemHandler = medea.FileSystemHandler.extend({

		CanHandle : function(prefix) {
			return prefix == "document";
		},

		Load : function(name,callback,onerror) {
			var element = document.getElementById(name);
			if (!element) {
				if(onerror) {
					onerror('element not found in DOM: ' + name);
				}
				else {
					callback(null);
				}
			}

			callback(element.innerHTML);
			return true;
		}
	});


	medea.AddFileSystemHandler = function(fs) {
		medea._fs_handlers.push(fs);
	};


	medea.GetFileSystemHandler = function(name) {
		var pidx = name.indexOf(':');
		var prefix = pidx==-1 ? '' : name.slice(0,pidx);

		name = name.slice(pidx+1);

		var fs = medea._fs_handlers;
		for(var i = 0, e = fs.length; i < e; ++i) {
			if (fs[i].CanHandle(prefix,name)) {	
				return [fs[i],name];
			}
		}

		return null;
	}


	// load a particular resource from any filesystem location
	medea.Fetch = function(what,callback,onerror) {

		if(baked_resources !== undefined) {
			var entry = baked_resources[what];
			if(entry !== undefined) {
				callback(entry);
				return;
			}
		}

		var tuple = medea.GetFileSystemHandler(what);
		if (!tuple) {
			if(onerror) {
				onerror('no handler found for this filesystem location');
			}
			else {
				callback(null);
			}
			return;
		}

		return tuple[0].Load(tuple[1],callback,onerror);
	};

	// load multiple files, the ok-callback receives a dictionary of the files along with their
	// contents while the optional onerror callback receives a dictionary of the files that
	// failed along with their respective (HTTP) error codes.
	medea.FetchMultiple = function(_whatlist,callback,onerror) {
		var ok = [], error = [], whatlist = _whatlist.slice(0);

		var fire_callback = function() {
			if (ok.length + error.length == whatlist.length) {
				if (error.length() && onerror) {
					onerror(error);
				}
				if (ok.length()) {
					callback(ok);
				}
				else if (!onerror) {
					// if onerror is not given, the main callback receives the
					// sad truth.
					callback(null);
				}
			}
		};

		whatlist.forEach(function(ename) {
			medea.Fetch(ename,function(contents) {
				ok[ename] = contents;
				fire_callback();
			},
			function(status) {
				error[ename] = status;
				fire_callback();
			});
		});
	};


	// default file system handlers
	medea._fs_handlers = [
		new medea.DocumentFileSystemHandler()
	];

	medea.AddFileSystemHandler(new medea.HTTPRemoteFileSystemHandler(settings_root, "remote"));
	medea.AddFileSystemHandler(new medea.HTTPRemoteFileSystemHandler("","url"));
});



/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('image',['filesystem', 'nativeimagepool'],function(medealib, undefined) {
	"use strict";
	var medea = this;

	medea.IMAGE_FLAG_USER = 0x1000;

	
	

	medea.Image = medea.Resource.extend( {

		// note: takes ownership of passed Image
		init : function(src_or_image, callback, flags) {
			this.flags = flags || 0;

			// sentinel size as long as we don't know the real value yet
			this.width = this.height = -1;

			this.callback = callback;
			if (src_or_image instanceof Image) {
				this.img = src_or_image;
				this.src = this.img.src;

				this.OnDelayedInit();
			}
			else {
				this.src = src_or_image;
				this.img = medea._GetNativeImageFromPool();

				var outer = this;
				this.img.onload = function() {
					outer.OnDelayedInit();
				};

				// XXX this circumvents the filesystem as we have to rely on the browser's
				// URl resolution. Find a better solution for this.
				var url = medea.FixURL(src_or_image);
				this.img.src = url;
			}
		},

		
		Dispose : function() {
			if(this.img) {
				medea._ReturnNativeImageToPool(this.img);
				this.img = null;
			}
		},

		GetData : function() {

			if (!this.raw) {
				var canvas = document.createElement('canvas');
				canvas.width = this.width;
				canvas.height = this.height;

				var context = canvas.getContext('2d');
				context.drawImage(this.img, 0, 0);

				this.raw = context.getImageData(0, 0, canvas.width, canvas.height);
				this.raw_data = this.raw.data;
			}

			return this.raw_data;
		},

		GetWidth : function() {
			return this.width;
		},

		GetHeight : function() {
			return this.height;
		},

		IsPowerOfTwo : function() {
			return this.ispot;
		},

		IsSquare : function() {
			return this.width === this.height;
		},

		GetSource : function() {
			return this.src;
		},

		GetImage : function() {
			return this.img;
		},

		Pixel : function(x,y, rgba) {
			var v = this.GetData(), n = (this.img.width*y+x) * 4;
			if (rgba === undefined) {
				return [v[n+0],v[n+1],v[n+2],v[n+3]];
			}

			// XXX this only changes the data copy, not the original image, nor the canvas
			v[n+0] = rgba[0];
			v[n+1] = rgba[1];
			v[n+2] = rgba[2];
			v[n+3] = rgba[3];
		},

		PixelComponent : function(x,y, which, value) {
			var v = this.GetData(), n = (this.img.width*y+x) * 4 + which;
			if (value === undefined) {
				return v[n];
			}
			v[n] = value;
		}
	});

	medea.CreateImage = function(res, callback) {
		return new medea.Image(res, callback);
	};
});



/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('dummytexture',['filesystem'],function(medealib, undefined) {
	"use strict";
	var medea = this, gl = medea.gl;

	var TEX = gl.TEXTURE_2D
	,	neutral_textures = {}
	;

	medea.DummyTexture = medea.Resource.extend( {

		init : function(color) {
			var old = gl.getParameter(gl.TEXTURE_BINDING_2D);

			this.complete = true;
			this.texture = gl.createTexture();

			gl.bindTexture(TEX, this.texture);
			gl.texImage2D(TEX, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(
				[
					Math.floor(color[0]*255),
					Math.floor(color[1]*255),
					Math.floor(color[2]*255),
					Math.floor(color[3]*255)
				]
			));

			// restore old Gl state
			gl.bindTexture(TEX, old);

			// call user callbacks - putting it here is consistent with
			// texture's behaviour.
			this._super(); 

		},

		GetGlTextureWidth : function() {
			return 1;
		},

		GetGlTextureHeight : function() {
			return 1;
		},

		GetPaddingCompensationFactor : function() {
			return [1, 1];
		},

		GetWidth : function() {
			return 1;
		},

		GetHeight : function() {
			return 1;
		},

		GetGlTexture : function() {
			return this.texture;
		},

		GetSource : function() {
			return '<dummy>';
		},

		GetImage : function() {
			return null;
		},

		GetDDSDataSource : function() {
			return null;
		},

		IsPowerOfTwo : function() {
			return true;
		},

		IsSquare : function() {
			return true;
		},

		IsUploaded : function() {
			return true;
		},

		IsRenderable : function() {
			return true;
		},

		Dispose : function() {
			if(this.texture) {
				gl.deleteTexture(this.texture);
				this.texture = null;
			}
		},

		_Bind : function(slot) {
			slot = slot || 0;
			gl.activeTexture(gl.TEXTURE0 + slot);
			gl.bindTexture(TEX,this.texture);
			return slot;
		}
	});


	medea.CreateDummyTexture = function(id) {
		if (id === 'normals') {
			// neutral normal map, i.e. y vector facing upwards as if there
			// were no normal map at all.
			id = [0.0,0.0,1.0,0.0];
		}
		else if (id.length === 3) {
			id = [id[0],id[1],id[2],1.0];
		}

		if (id.length === 4) {
			if (id in neutral_textures) {
				return neutral_textures[id];
			}
			return neutral_textures[id] = new medea.DummyTexture(id);
		}


		return medea.CreateDefaultTexture();
	};

});


/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('shader',['filesystem','cpp.js'],function(medealib, undefined) {
	"use strict";
	var medea = this, gl = medea.gl;

	var stddev_ext = gl.getExtension("OES_standard_derivatives");
	

	medea.SHADER_TYPE_PIXEL = gl.FRAGMENT_SHADER;
	medea.SHADER_TYPE_VERTEX = gl.VERTEX_SHADER;

	

	// counter for getting shader ids from
	var shader_id_counter = 0;

	// cache for compiled shader objects
	var sh_cache = {
	};

	// cache for shader source code
	var sh_source_cache = {
	};

	var sh_source_waiters = {
	};

	// predefined macros
	var default_defines = {
		'GL_ES' : ''
	};

	var re_toplevel = /^\s*toplevel\(\s*"\s*(.+)\s*"\s*\)\s*$/;

	medea.Shader = medea.Resource.extend( {

		type : null,
		shader : null,
		source_cache_name : null,

		init : function(src, defines, callback, from_source, type, cache_key) {
			this.type = type || src.split('.').pop() == 'ps'
				? medea.SHADER_TYPE_PIXEL
				: medea.SHADER_TYPE_VERTEX;

			this.shader = 0;
			this.defines = medealib.Merge(defines || {},default_defines);

			this.source_cache_name = from_source && !cache_key ? null :
				(from_source ? cache_key : src);

			// if the shader source is given without an explicit cache key, disable caching.
			var	self = this
			,	source_cache_name = this.source_cache_name
			,	cached_source = !source_cache_name ? null : sh_source_cache[source_cache_name]
			,	complete
			;

			if(cached_source) {
				this._super(src, callback, true);

				complete = function() {
					self.OnDelayedInit(sh_source_cache[self.src]);
				};

				if(Array.isArray(cached_source)) {
					cached_source.push(complete);
				}
				else {
					complete();
				}
				return;
			}

			if(this.source_cache_name) {
				sh_source_cache[this.source_cache_name] = [];
			}

			if(from_source) {	
				this.OnDelayedInit(src);
				this._super('<shader source>', callback, true);
				return;
			}

			// trigger deferred loading
			this._super(src, callback);
		},


		OnDelayedInit : function(data) {
			this.source = data;

			if(this.source_cache_name) {
				// update cache entry, inform anyone waiting
				var source_cache_entry = sh_source_cache[this.source_cache_name];
				sh_source_cache[this.source_cache_name] = data;
				if(Array.isArray(source_cache_entry)) {
					source_cache_entry.forEach(function(e) {
						e();
					});
				}
			}

			// _super() is dynamically assigned and ceases to exist as soon
			// as OnDelayedInit returns, so we need to grab a ref.
			var self = this;
			var call_outer_super = self._super;
	
			// check if the shader has already been loaded or is currently
			// being fetched/compiled.
			var c = this._GetCacheName();
			var s = sh_cache[c];
			if(s !== undefined) {
				var commit = function(s) {
					self.gen_source = s.gen_source;
					self.shader = s.shader;
					self.shader_id = s.shader_id;
					call_outer_super.apply(self);
				};
				if(Array.isArray(s)) {
					// loading is in process, wait for it.
					s.push(commit);
				}
				else {
					commit(s);
				}
				return;
			}

			var waiters = sh_cache[c] = [];

			// additional top-level declarations are specified in-place using
			// #pragma toplevel. Each time cpp.js encounters one, it invokes
			// settings.pragma_func.
			var top_level_decls = [];

			// preprocessing shaders is asynchronous
			var settings = {
				// Required so #extension is preserved for the GLSL parser to handle
				keep_unknown_preprocessor_statements : true,
				include_func : function(file, is_global, resumer) {
					if (!is_global) {
						file = medea._GetPath(self.src) + file;
					}

					medea.Fetch(file,
						function(data) {
							resumer(data);
						},
						function(error) {
							resumer(null);
						}
					);
				},

				completion_func : function(data) {

					var arr = [];
					for(var e in top_level_decls) {
						arr.push(e);
					}

					self.gen_source = arr.join('\n') + '\n' + data;
					s = self.shader = gl.createShader(self.type);

					self.shader_id = ++shader_id_counter;

					// create a new cache entry for this shader
					var entry = sh_cache[c] = {
						shader : self.shader,
						source : self.source,
						gen_source : self.gen_source,
						shader_id : self.shader_id
					};

					// compile the preprocessed shader
					gl.shaderSource(s,self.gen_source);
					gl.compileShader(s);

					if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
						medealib.NotifyFatal("failure compiling shader " +  self.src
							+ ", error log: " + gl.getShaderInfoLog(s)
						);
						return;
					}

					// mark this resource as complete
					call_outer_super.apply(self);

					// callback all waiters
					for (var i = 0, e = waiters.length; i < e; ++i) {
						waiters[i](entry);
					}

					medealib.LogDebug("successfully compiled shader "
						+ self.src
					);
				},

				error_func : function(message) {
					medealib.NotifyFatal("failure preprocessing shader "
						+ ": " + message
					);
					return;
				},

				pragma_func : function(pragma_text) {
					var r = re_toplevel.exec(pragma_text);
					if (!r) {
						medealib.NotifyFatal("syntax error in #pragma toplevel: " + pragma_text);
						return null;
					}

					top_level_decls[r[1]] = 1;
					return true;
				}
			};

			var cpp = cpp_js(settings);
			cpp.define_multiple(this.defines);
			cpp.run(data, this.src);

			// do _not_ mark the resource as complete yet. This is done
			// in the completion_func above, which is invoked by cpp.js.
		},

		GetSourceCode : function() {
			return this.source;
		},

		GetPreProcessedSourceCode : function() {
			return this.gen_source;
		},

		GetGlShader : function() {
			return this.shader;
		},

		GetShaderId : function() {
			return this.shader_id;
		},

		_GetCacheName : function() {
			var o = this.src;

			if (this.defines) {
				var d = this.defines;
				o += '#';
				for(var k in d) {
					o += k+'='+(d[k] || '');
				}
			}
			return o;
		}
	});

	medea.CreateShader = function(res, defines, callback) {
		return new medea.Shader(res, defines, callback);
	};

	medea.CreateShaderFromSource = function(type, source, defines, callback, cache_key) {
		return new medea.Shader(source, defines, callback, true, type, cache_key);
	};
});


/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('imagestream',['nativeimagepool','filesystem'],function(medealib, undefined) {
	"use strict";
	var medea = this;

	

	var MAX_SIMULTANEOUS_REQUESTS = 12;

	// based on idea from here
	// http://blog.tojicode.com/2012/03/javascript-memory-optimization-and.html
	// this uses a fixed pool of Image's (which are a sub-pool of the general
	// nativeimagepool) to load images from the server.

	var top = 0;
	var remaining_slots = MAX_SIMULTANEOUS_REQUESTS;
	var pending = [];

	var get_pool_image = medea._GetNativeImageFromPool;
	var return_pool_image = medea._ReturnNativeImageToPool;


	// load image using stream loaders, call `callback` upon completion.
	// if `callback` returns true, it has taken ownership of the Image
	// which is otherwise return to the nativeimagepool.
	var load = medea._ImageStreamLoad = function(src, callback) {

	    if (remaining_slots > 0) {
	        var img = get_pool_image();
	        img.onload = function() { 
	        	if(!callback(img, src)) {
	        		return_pool_image(img);
	        	}

	        	++remaining_slots;
	        	if(pending.length > 0) {
			        var req = pending.shift();
			        load(req[0], req[1]);
			    } 

	        };
	        img.src = src;
	        --remaining_slots;
	    } 
	    else {
	        pending.push([src, callback]);
	    }
	};
});


/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('texture',['nativeimagepool','filesystem', 'imagestream', 'dummytexture'],function(medealib, undefined) {
	"use strict";
	var medea = this, gl = medea.gl;

	
	// check for presence of the EXT_texture_filter_anisotropic extension,
	// which enables us to use anistropic filtering.
	var aniso_ext = (
			gl.getExtension("EXT_texture_filter_anisotropic") ||
			gl.getExtension("MOZ_EXT_texture_filter_anisotropic") ||
			gl.getExtension("WEBKIT_EXT_texture_filter_anisotropic")
		)
	,	max_anisotropy = aniso_ext ? gl.getParameter(aniso_ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT) : 0
	,	compr_ext = (
			gl.getExtension("WEBGL_compressed_texture_s3tc") ||
			gl.getExtension("MOZ_WEBGL_compressed_texture_s3tc") ||
			gl.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc")
		)
	;



	var TEX = medea.TEXTURE_TYPE_2D = gl.TEXTURE_2D;

	// flags specific to medea.Texture
	medea.TEXTURE_FLAG_KEEP_IMAGE    = 0x1;
	medea.TEXTURE_FLAG_LAZY_UPLOAD   = 0x2;
	medea.TEXTURE_FLAG_NPOT_PAD      = 0x4;
	medea.TEXTURE_FLAG_NO_MIPS       = 0x8;

	// Hint that vertex shader access will be required for this texture
	//
	// Depending on the hardware, this may disable certain filtering options.
	//
	medea.TEXTURE_VERTEX_SHADER_ACCESS = 0x10;

	// Set clamp-to-edge mode for the texture. If not specified, textures
	// default to wrap on all axes.
	medea.TEXTURE_FLAG_CLAMP_TO_EDGE = 0x20;


	// possible values for the `format` parameter
	medea.TEXTURE_FORMAT_RGBA        = 'rgba';
	medea.TEXTURE_FORMAT_RGB         = 'rgb';
	medea.TEXTURE_FORMAT_LUM         = 'lum';
	medea.TEXTURE_FORMAT_LUM_ALPHA   = 'luma';
	medea.TEXTURE_FORMAT_DEFAULT	 = medea.TEXTURE_FORMAT_RGBA;

	var texfmt_to_gl = function(f) {
		switch(f) {
			case medea.TEXTURE_FORMAT_RGBA:
				return gl.RGBA;
			case medea.TEXTURE_FORMAT_RGB:
				return gl.RGB;
			case medea.TEXTURE_FORMAT_LUM:
				return gl.LUMINANCE;
			case medea.TEXTURE_FORMAT_LUM_ALPHA:
				return gl.LUMINANCE_ALPHA;
		}
	}

	medea.MAX_TEXTURE_SIZE = gl.getParameter(gl.MAX_TEXTURE_SIZE);
	
	var texture_cache = {};
	var GetTextureCacheName = function(src_url, format, flags) {
		return src_url + '#' + (format || medea.TEXTURE_FORMAT_DEFAULT) + '#' + (flags || 0);
	};
	
	var GetTextureSizeSuffix = function(w,h) {
		return '#' + w + '#' + h;
	};
	
	var IsEligibleForCaching = function(flags) {
		// TODO: a copy-on-write approach could enable caching also for textures
		// with modifyable source images.
		return !((flags || 0) & medea.TEXTURE_FLAG_KEEP_IMAGE);
	};

	// note: textures can be created from, but need not necessarily be backed by Image objects.
	// use CreateTexture(image.GetImage()) to create from a Texture
	// standalone textures utilize ImageStreamLoader for their loading business.
	medea.Texture = medea.Resource.extend( {

		img : null,
		data_src : null,
		uploaded : false,

		init : function(src_or_img, callback, flags, format, force_width, force_height) {
			var outer = this;

			this.texture = gl.createTexture();
			this.glwidth = force_width || -1;
			this.glheight = force_height || -1;
			this.format = format || medea.TEXTURE_FORMAT_DEFAULT;

			// sentinel size as long as we don't know the real value yet
			this.width = this.height = -1;
			this.flags = flags || 0;
			
			// Image data requires special handling, so instruct the Resource
			// base class not to ajax-fetch the URI.
			this._super(src_or_img.src || src_or_img, callback, true);

			if(src_or_img instanceof Image) {
				// TODO: who owns the Image? 
				// Appearantly we do, because OnDelatedInit disposes it. This
				// makes no sense, however, if the user keeps modifying or
				// accessing the source image.
				this.img = src_or_img;
				this.OnDelayedInit();
				return;
			}

			// For .dds images, we fetch the data as an ArrayBuffer using AJAX
			// and directly fill a WebGl texture. minimeow.
			// for other images, we decode them into an Image first.
			if(src_or_img.match(/.dds/i)) {
				medea.LoadModules(['texture_dds'], function() {
					medealib._AjaxFetch(medea.FixURL(src_or_img), function(ab, status) {
						if(!ab || !ab.byteLength) {
							// TODO: set to permanently failed state
							return;
						}
						
						outer.data_src = ab;
						outer.OnDelayedInit();
					}, undefined, true);
				});
				return;
			}

			medea._ImageStreamLoad(medea.FixURL(src_or_img), function(img) {
				outer.img = img;
				outer.OnDelayedInit();
				// Return true to indicate ownership of the Image
				// (if the LAZY flag was not specified, we already disposed of it)
				return true;
			});
		},

		OnDelayedInit : function() {
			var dim;

			// Obtain image width and height. For DDS textures, this requires
			// us to dig into the DDS header while the information is readily
			// available for textures decoded into Image objects.
			if(!this.data_src) {
				this.width = this.img.width;
				this.height = this.img.height;
			}
			else {
				 dim = medea._DDSgetDDSDimension(this.data_src);
				 this.width = dim[0];
				 this.height = dim[1];
			}

			this.ispot = medea._IsPow2(this.width) && medea._IsPow2(this.height);


			// If the size of the input image is nPOT, round to the next higher
			// POT size unless there is a user override.
			if (this.ispot) {
				if (this.glwidth === -1) {
					this.glwidth = this.width;
				}
				if (this.glheight === -1) {
					this.glheight = this.height;
				}
			}
			else {
				if (this.glwidth === -1) {
					this.glwidth = medea._NextPow2(this.width);
				}
				if (this.glheight === -1) {
					this.glheight = medea._NextPow2(this.height);
				}
			}

			// Check if the hardware size limit for textures is exceeded
			if (this.glwidth > medea.MAX_TEXTURE_SIZE || this.glheight > medea.MAX_TEXTURE_SIZE) {
				this.glwidth = Math.min(this.glwidth, medea.MAX_TEXTURE_SIZE);
				this.glheight = Math.min(this.glheight, medea.MAX_TEXTURE_SIZE);

			}

			// Mark this texture resource as complete
			this.complete = true;

			// Trigger immediate upload if the LAZY flag is not specified, and
			// responsiveness is not required at this time.
			if (!(this.flags & medea.TEXTURE_FLAG_LAZY_UPLOAD) && !medea.EnsureIsResponsive()) {
				this._Upload();
			}
			
			// And let the parent implementation call user callbacks
			this._super();

			// Also create a cache entry for this texture
			if(IsEligibleForCaching(this.flags)) {
				var name = GetTextureCacheName(this.GetSource(), this.format, this.flags) + 
					GetTextureSizeSuffix(this.width, this.height);
					
				texture_cache[name] = this;
			}

			medealib.LogDebug("successfully loaded texture " + this.GetSource());
		},

		GetGlTextureWidth : function() {
			return this.glwidth;
		},

		GetGlTextureHeight : function() {
			return this.glheight;
		},

		GetPaddingCompensationFactor : function() {
			return [this.width / this.glwidth, this.height / this.glheight];
		},

		GetWidth : function() {
			return this.width;
		},

		GetHeight : function() {
			return this.height;
		},

		GetGlTexture : function() {
			return this.texture;
		},

		GetSource : function() {
			return this.src;
		},

		GetImage : function() {
			return this.img;
		},

		GetDDSDataSource : function() {
			return this.data_src;
		},

		IsPowerOfTwo : function() {
			return this.ispot;
		},

		IsSquare : function() {
			return this.width === this.height;
		},

		IsUploaded : function() {
			return this.uploaded;
		},

		IsRenderable : function() {
			return this.IsComplete() && (this.IsUploaded() || !medea.EnsureIsResponsive());
		},

		Dispose : function() {
			if(this.texture) {
				gl.deleteTexture(this.texture);
				this.texture = null;
			}
		},

		_Upload : function() {
			if (this.uploaded) {
				return;
			}

			var old = gl.getParameter(gl.TEXTURE_BINDING_2D)
			,	mips = !(this.flags & medea.TEXTURE_FLAG_NO_MIPS)
			,	gen_mips = mips
			,	img = this.img
			,	data_src = this.data_src
			,	intfmt = texfmt_to_gl(this.format)
			,	canvas
			,	ctx
			,	c
			;

			if(old !== this.texture) {
				gl.bindTexture(TEX, this.texture);
			}

			// Scale or pad nPOT or oversized textures
			if (this.glwidth !== this.width || this.glheight !== this.height) {


				// http://www.khronos.org/webgl/wiki/WebGL_and_OpenGL_Differences#Non-Power_of_Two_Texture_Support
				canvas = document.createElement("canvas");
				canvas.width = this.glwidth;
				canvas.height = this.glheight;
				ctx = canvas.getContext("2d");

				if (this.flags & medea.TEXTURE_FLAG_NPOT_PAD) {
					ctx.drawImage(img, 0, 0, Math.min(img.width,canvas.width),
						Math.min(img.height,canvas.height));
				}
				else {
					ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
				}

				// According to http://jsperf.com/texture-sources this should be fastest,
				// but it also consumes loads of memory and quickly screws up Webkit and
				// Gecko. `texImage2D(TEX,0,canvas)` keeps throwing type errors in both
				// engines, though.
				c = ctx.getImageData(0, 0, canvas.width, canvas.height);

				ctx = canvas = null;
				gl.texImage2D(TEX, 0, intfmt, intfmt, gl.UNSIGNED_BYTE, c);
			}
			else {

				if(img) {
					// Copy to the gl texture
					gl.texImage2D(TEX, 0, intfmt, intfmt, gl.UNSIGNED_BYTE, img);
				}
				else {
					c = medea._DDSuploadDDSLevels(gl, compr_ext, data_src, mips);
					if(mips && c > 1) {
						gen_mips = false;
					}
				}
			}

			// Setup sampler states and generate MIPs
			if (this.flags & medea.TEXTURE_FLAG_CLAMP_TO_EDGE) {
				// Important to set this first as it influences MIP generation
				gl.texParameteri(TEX, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
				gl.texParameteri(TEX, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			}
			else {
				gl.texParameteri(TEX, gl.TEXTURE_WRAP_S, gl.REPEAT);
				gl.texParameteri(TEX, gl.TEXTURE_WRAP_T, gl.REPEAT);
			}

			gl.texParameteri(TEX, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

			if (mips) {
				gl.texParameteri(TEX, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

				if(gen_mips) {
					gl.generateMipmap(TEX);
				}

				// Setup anistropic filter unless the texture is going to
				// be used with Vertex Texture Fetch (VTF)
				if (aniso_ext && !(this.flags & medea.TEXTURE_VERTEX_SHADER_ACCESS)) {
					gl.texParameterf(gl.TEXTURE_2D, aniso_ext.TEXTURE_MAX_ANISOTROPY_EXT, 
						max_anisotropy);
				}
			}
			else {
				gl.texParameteri(TEX, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			}


			// Because _Upload may be called at virtually any time, we
			// need to ensure that the global state is not altered.
			if(old !== this.texture) {
				gl.bindTexture(TEX, old);
			}

			// Free up memory unless an user override is active
			if (!(this.flags & medea.TEXTURE_FLAG_KEEP_IMAGE)) {
				if(img) {
					medea._ReturnNativeImageToPool(this.img);
					this.img = null;
				}
				if(data_src) {
					this.data_src = null;
				}
			}

			this.uploaded = true;
		},


		_PremultiplyAlpha : function(buffer, w, h) {
			for (var y = 0, c = 0; y < h; ++y) {
				for (var x = 0; x < w; ++x, c += 4) {
					var a = buffer[c + 3] / 255;
					buffer[c    ] *= a;
					buffer[c + 1] *= a;
					buffer[c + 2] *= a;
				}
			}
		},
 

		_Bind : function(slot) {
			if (!this.IsComplete()) {
				return null;
			} 
			slot = slot || 0;

			gl.activeTexture(gl.TEXTURE0 + slot);
			gl.bindTexture(TEX,this.texture);

			// No texture uploads while responsiveness is important
			if (!this.uploaded) {
				if(medea.EnsureIsResponsive()) {
					return null;
				}
				this._Upload();
			}
			return slot;
		}
	});
	

	medea.CreateTexture = function(src_or_image, callback, flags, format, force_width, force_height) {
		medealib.DebugAssert((force_width === undefined) === (force_height === undefined), 
			'Explicit size must always be given for both axes');
			
		var create = function() {
			return new medea.Texture(src_or_image, callback, flags, format, force_width, force_height);
		};

		if (!(src_or_image instanceof Image) && IsEligibleForCaching(flags)) {
			// normalize the resource name as it is used to derive the cache key
			src_or_image = medea.FixResourceName(src_or_image);
			
			var cache_name = GetTextureCacheName(src_or_image, format, flags);
			var cache_name_w = null;
		
			// Was a specific texture size requested? If so, check if we have a cache entry 
			// for exactly this texture size. Such entries are created by Texture.DelayedInit()
			// once the size of the texture is known.
			if (force_width !== undefined) {
				cache_name_w = cache_name + GetTextureSizeSuffix(force_width, force_height);
				var cache_entry_w = texture_cache[cache_name_w];
				if(cache_entry_w !== undefined) {
					medealib.LogDebug('Texture found in cache (1): ' + src_or_image);
					return cache_entry_w;
				}
			}
		
			// Check regular cache. This is supposed to be the texture at its default
			// size, which however is not known before the texture is loaded. Therefore,
			// there is a small possibility that a texture is loaded twice. Browser
			// caching should make the effect on the loading time negligible though (
			// the GL texture gets created twice).
			var cache_entry = texture_cache[cache_name];
			if(cache_entry === undefined) {
				if(cache_name_w !== null) {
					return texture_cache[cache_name_w] = create();
				}
				return texture_cache[cache_name] = create();
			}
			
			if (cache_name_w === null || (force_width === cache_entry.GetWidth() 
				&& force_height === cache_entry.GetHeight())) {
				
				return cache_entry;
			}
		}
		return create();
	}

	var default_texture = null;
	medea.GetDefaultTexture = function() {
		if (!default_texture ) {
			// TODO: use signal color for debug builds
			
			default_texture = new medea.DummyTexture([0.3,0.3,0.3,1.0]);
		}
		return default_texture;
	}
});



/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('pass',['shader','texture'],function(medealib, undefined) {
	"use strict";
	var medea = this, gl = medea.gl;

	// Maximum number of samplers in use at the same time
	medea.MAX_TEXTURE_UNITS = 12;

	medea.MATERIAL_CLONE_COPY_STATE 		= 0x1;
	medea.MATERIAL_CLONE_SHARE_STATE 		= 0x2;

	medea.MATERIAL_CLONE_COPY_CONSTANTS 	= 0x4;
	medea.MATERIAL_CLONE_SHARE_CONSTANTS 	= 0x8;


	medea.PASS_SEMANTIC_COLOR_FORWARD_LIGHTING 	= 0x1;
	medea.PASS_SEMANTIC_SHADOWMAP 				= 0x2;
	medea.PASS_SEMANTIC_DEPTH_PREPASS 			= 0x4;
	medea.PASS_SEMANTIC_DEFERRED_COLOR 			= 0x8;
	medea.PASS_SEMANTIC_DEFERRED_NORMAL 		= 0x10;


	/** medea.MAX_DIRECTIONAL_LIGHTS 
	 *
	 *  Maximum number of directional light sources supported for forward rendering.
	 * */
	medea.MAX_DIRECTIONAL_LIGHTS = 8;


	// Cache for gl program objects and their ids, keyed by "vs_id" + "ps_id" (
	// corresponding to pass.cache_id)
	var program_cache = {};
	var program_ids = {};
	var program_id_counter = 0;

	// Map from GLSL type identifiers to the corresponding GL enumerated types
	var glsl_typemap = {
		'float'	: gl.FLOAT,
		'int'	: gl.INT,
		'bool'	: gl.BOOL,
		'vec2'	: gl.FLOAT_VEC2,
		'vec3'	: gl.FLOAT_VEC3,
		'vec4'	: gl.FLOAT_VEC4,
		'ivec2'	: gl.INT_VEC2,
		'ivec3'	: gl.INT_VEC3,
		'ivec4'	: gl.INT_VEC4,
		'bvec2'	: gl.BOOL_VEC2,
		'bvec3'	: gl.BOOL_VEC2,
		'bvec4'	: gl.BOOL_VEC4,
		'mat2'	: gl.BOOL_MAT2,
		'mat3'	: gl.BOOL_MAT3,
		'mat4'	: gl.BOOL_MAT4,
		'sampler2D'	: gl.SAMPLER_2D,
		'samplerCube'	: gl.SAMPLER_CUBE
	};

	var glsl_type_picker = [];
	for (var k in glsl_typemap) {
		glsl_type_picker.push(k);
	}
	glsl_type_picker = '(' + glsl_type_picker.join('|') + ')';


	var setters = medea.ShaderSetters = {
		CAM_POS :  function(pos, state, change_flags) {
			if(change_flags & 0x2) { // no cam changes
				return;
			}
			gl.uniform3fv(pos, state.GetQuick("CAM_POS"));
		},

		CAM_POS_LOCAL :  function(pos, state, change_flags) {
			if(change_flags & 0x2) { // no cam changes
				return;
			}
			gl.uniform3fv(pos, state.Get("CAM_POS_LOCAL"));
		},

		WVP :  function(pos, state, change_flags) {
			if(change_flags & 0x7 === 0x7) { // no cam, no world and no projection changes
				return;
			}
			gl.uniformMatrix4fv(pos, false, state.Get("WVP"));
		},

		WV :  function(pos, state, change_flags) {
			if(change_flags & 0x3 === 0x3) { // no cam, no world changes
				return;
			}
			gl.uniformMatrix4fv(pos, false, state.Get("WV"));
		},

		WIT :  function(pos, state, change_flags) {
			if(change_flags & 0x1) { // no world changes
				return;
			}
			gl.uniformMatrix4fv(pos, false, state.Get("WIT"));
		},

		WI :  function(pos, state, change_flags) {
			if(change_flags & 0x1) { // no world changes
				return;
			}
			gl.uniformMatrix4fv(pos, false, state.Get("WI"));
		},

		VP :  function(pos, state, change_flags) {
			if(change_flags & 0x6 === 0x6) { // no cam and no projection changes
				return;
			}
			gl.uniformMatrix4fv(pos, false, state.Get("VP"));
		},

		W :  function(pos, state, change_flags) {
			if(change_flags & 0x1) { // no world changes
				return;
			}
			gl.uniformMatrix4fv(pos, false, state.GetQuick("W"));
		},

		V :  function(pos, state, change_flags) {
			if(change_flags & 0x2) { // no cam changes
				return;
			}
			gl.uniformMatrix4fv(pos, false, state.GetQuick("V"));
		},

		P :  function(pos, state, change_flags) {
			if(change_flags & 0x4) { // no projection changes
				return;
			}
			gl.uniformMatrix4fv(pos, false, state.GetQuick("P"));
		}
	};

	var zero_light = [0,0,0];

	// Generate shader setters for directional lights
	for (var i = 0, e = medea.MAX_DIRECTIONAL_LIGHTS; i < e; ++i) {
		(function(i) { 
			// LIGHT_Dn_DIR -- global light direction vector
			setters["LIGHT_D"+i+"_DIR"] = function(pos, state) {
				var lights = state.Get("DIR_LIGHTS")
				,	dir
				;

				if(!lights || lights.length <= i) {
					// TODO: maybe reset it for debug builds
					return;
				}
				// important: pass the INVERSE light direction to save a 
				// negation (albeit cheap / free) in shader code.
				dir = lights[i].world_dir;
				gl.uniform3f(pos, -dir[0], -dir[1], -dir[2]);
			};

			// LIGHT_Dn_COLOR -- light color
			setters["LIGHT_D"+i+"_COLOR"] = function(pos, state) {
				var lights = state.Get("DIR_LIGHTS");
				if(!lights || lights.length <= i) {
					gl.uniform3fv(pos, zero_light);
					return;
				}
				gl.uniform3fv(pos, lights[i].color);
			};
		})(i);
	}

	// For every program (keyed on the cache name) the pass
	// instance that this material was last used with.
	var pass_last_used_with = {};

	// TODO: point and spot lights


	/** @class medea.Pass 
     *
     *
     *
	 */
	medea.Pass = medealib.Class.extend({

		wannabe_clones : null,
		vs : null,
		ps : null,
		constants : null,
		auto_setters : null,
		attr_map : null,
		state : null,
		program : null,
		semantic : medea.PASS_SEMANTIC_COLOR_FORWARD_LIGHTING,
		cache_name : null,

		clone_flags : null,
		original : null,

		uniform_type_cache : null,


		/** @name medea.Pass.init(*) 
		 */
		init : function(vs, ps, constants, attr_map, state) {
			this.vs = vs;
			this.ps = ps;
			this.constants = constants || {};
			this.auto_setters = {};
			this.attr_map = attr_map;
			this.state = state || {};
			this.uniform_type_cache = {};


			this._TryAssembleProgram();
		},


		Semantic: medealib.Property('semantic'),


		AddSemantic : function(sem) {
			this.semantic |= sem;
		},

		RemoveSemantic : function(sem) {
			this.semantic &= ~sem;
		},

		CopyConstantsFrom : function(other) {
			for (var k in other.constants) {
				this.Set(k, other.constants[k]);
			}
		},

		// TODO: with WebGL2, add a ShareConstantsWith() API that uses uniform
		// buffer objects to share state.

		CopyStateFrom : function(other) {
			for (var k in other.state) {
				this.state[k] = other.state[k];
			}
		},

		ShareStateWith : function(other) {
			this.state = other.state;
		},


		/** @name medea.Pass.Begin(*)
		 *
		 *  
		 *
		 *  @param statepool 
		 */
		Begin : function(statepool, change_flags) {
			if (this.program === null) {
				this._TryAssembleProgram();
				if(!this.IsComplete()) {
					return false;
				}
			}

			var gl_state = statepool.GetQuick("_gl")
			,	program = this.program
			,	cache_name = this.cache_name
			;

			if(gl_state.program !== program) {
				gl_state.program = program;
				gl.useProgram(program);

				// program changes invalidates 'state not changed' flags
				change_flags = 0;
				pass_last_used_with[cache_name] = this;
			}

			// If this program was last used with _this_ pass, we can 
			// sometimes completely re-use shader state.
			else if(pass_last_used_with[cache_name] === this) {
				change_flags |= 0x8;
			}
			else {
				pass_last_used_with[cache_name] = this;
			}

			// TODO: currently, flag 0x8 is not checked for in the shader
			// setting closure.
			if(change_flags !== 0xf) {
				this._SetAutoState(statepool, change_flags);
			}

			// Apply global render state blocks
			// This must be called even if no state block is associated
			// with this pass to make sure any changes made by previous
			// passes are reset to their defaults.
			medea.SetState(this.state || {}, statepool);
			return true;
		},

		End : function() {
		},

		GetAttributeMap : function() {
			return this.attr_map;
		},

		GetProgramId : function() {
			return this.program_id;
		},

		State : function(state) {
			if (state === undefined) {
				return this.state;
			}
			this.state = state;
		},


		// some shortcuts to simplify common state handling
		CullFace : function(c) {
			if (c === undefined) {
				return this.state.cull_face;
			}

			this.state.cull_face = c;
		},

		CullFaceMode : function(c) {
			if (c === undefined) {
				return this.state.cull_face_mode;
			}

			this.state.cull_face_mode = c;
		},

		DepthWrite : function(c) {
			if (c === undefined) {
				return this.state.depth_write;
			}

			this.state.depth_write = c;
		},

		DepthTest : function(c) {
			if (c === undefined) {
				return this.state.depth_test;
			}

			this.state.depth_test = c;
		},


		// Possible values for |c|:
		//   never, less, equal, less_equal, greater, greater_equal,
		//   not_equal, always.
		DepthFunc : function(c) {
			if (c === undefined) {
				return this.state.depth_func;
			}

			this.state.depth_func = c;
		},


		// Possible values for |c|:
		//   add, subtract, reverse_subtract
		BlendOp : function(c) {
			if (c === undefined) {
				return this.state.blend_op;
			}

			this.state.blend_op = c;
		},


		// Possible values for |src| and |dst|:
		//   src_alpha, dst_alpha, src_color, dst_color
		//   one_minus_src_alpha, one_minus_dst_alpha, one_minus_src_color,
		//	 one_minus_dst_color
		//
		// If parameters are omitted, returns a 2-tuple of
		// the current values.
		BlendFunc : function(src, dst) {
			if (src === undefined) {
				return this.state.blend_func;
			}

			this.state.blend_func = [src, dst];
		},


		BlendEnable : function(c) {
			if (c === undefined) {
				return this.state.blend;
			}

			this.state.blend = c;
		},


		// Convenience function to enable "normal" alpha blending for the
		// pass (if |doit| is true, else it is disabled).
		//
		// Use with premultiplied alpha (which, with WebGL, is default for
		// blending targets with the underlying layers and therefore is
		// best used consistently across an app).
		//
		// "Normal" alpha blending is equivalent to:
		//		BlendOp('add')
		//		BlendFunc(['one', 'one_minus_src_alpha'])
		//		BlendEnable(true)
		//
		// Note: when using alpha-blending, make sure you move all meshes
		// that are semi-transparent to one of the RENDERQUEUE_ALPHA_XXX
		// render queues to make sure they are rendered with depth
		// write access turned off and proper depth sorting.
		SetDefaultAlphaBlending : function(doit) {
			if (!doit) {
				this.BlendEnable(false);
			}
			this.BlendOp('add');
			this.BlendFunc('one', 'one_minus_src_alpha');
			this.BlendEnable(true);
		},


		// Convenience function to enable "normal" alpha blending for the
		// pass (if |doit| is true, else it is disabled).
		//
		// Use with non-premultiplied alpha.
		//
		// "Normal" alpha blending without premultiplied alpha is equivalent to:
		//		BlendOp('add')
		//		BlendFunc(['src_alpha', 'one_minus_src_alpha'])
		//		BlendEnable(true)
		//
		// Note: when using alpha-blending, make sure you move all meshes
		// that are semi-transparent to one of the RENDERQUEUE_ALPHA_XXX
		// render queues to make sure they are rendered with depth
		// write access turned off and proper depth sorting.
		SetDefaultAlphaBlendingNotPremultiplied : function(doit) {
			if (!doit) {
				this.BlendEnable(false);
			}
			this.BlendOp('add');
			this.BlendFunc('src_alpha', 'one_minus_src_alpha');
			this.BlendEnable(true);
		},


		// Set the |k| shader constant (uniform) to |val|.
		//
		// |val| must be one of:
		//   1) A value matching the data type of the uniform being set (otherwise
		//      a debug error is produced). Duck-typing applies: for example, a GLSL vec4
		//      can be set from anything that has allows indexing in range [0, 3].
		//   2) A closure that produces a value that fullfils 1). The closure will
		//      be invoked every time the pass is used to produce an up to date
		//      value for the uniform. Note that this causes a performance penalty.
		//   3) A string, the meaning of which depends on the data type:
		//       i) for textures (cube, normal, volume): a string that can be passed
		//          to |medea.CreateTexture|, |medea.CreateCubeTexture|, .. (respectively)
		//          in order to create a texture. While the texture is not available,
		//          a default texture is bound to the slot (the default texture is
		//          black in release builds and yellow-black in debug builds).
		//       ii) for other types: the string is eval()ed every time the pass is
		//          used, with performance characteristics similar to 2).
		//	  4) A dictionary, containing a |medea.LODTexture| input specification, i.e.
		//       it has at least |low| and |high| set to valid textures (or
		//       texture paths).
		Set : function(k, val) {
			if (val === undefined) {
				return;
			}

			this.constants[k] = val;
			if (this.program === null) {
				// do the real work later when we have the actual program
				return;
			}

			var pos = gl.getUniformLocation(this.program, k);
			if (!pos) {
				return;
			}

			var handler = null;
			var prog = this.program;

			switch(this._GetUniformType(k)) {
				case gl.FLOAT:
					handler = function(pos, state, curval) {
						gl.uniform1f(pos, curval );
					};
					break;

				case gl.INT:
				case gl.BOOL:
					handler = function(pos, state, curval) {
						gl.uniform1i(pos, curval );
					};
					break;

				case gl.FLOAT_VEC4:
					handler = function(pos, state, curval) {
						gl.uniform4fv(pos, curval );
					};
					break;
				case gl.FLOAT_VEC3:
					handler = function(pos, state, curval) {
						gl.uniform3fv(pos, curval );
					};
					break;
				case gl.FLOAT_VEC2:
					handler = function(pos, state, curval) {
						gl.uniform2fv(pos, curval );
					};
					break;

				case gl.INT_VEC4:
				case gl.BOOL_VEC4:
					handler = function(pos, state, curval) {
						gl.uniform4iv(pos, curval );
					};
					break;
				case gl.INT_VEC3:
				case gl.BOOL_VEC3:
					handler = function(pos, state, curval) {
						gl.uniform3iv(pos, curval );
					};
					break;
				case gl.INT_VEC2:
				case gl.BOOL_VEC2:
					handler = function(pos, state, curval) {
						gl.uniform2iv(pos, curval );
					};
					break;

				case gl.FLOAT_MAT4:
					handler = function(pos, state, curval) {
						gl.uniformMatrix4fv(pos, false, curval);
					};
					break;

				case gl.FLOAT_MAT3:
					handler = function(pos, state, curval) {
						gl.uniformMatrix3fv(pos, false, curval);
					};
					break;

				case gl.FLOAT_MAT2:
					handler = function(pos, state, curval) {
						gl.uniformMatrix2fv(pos, false, curval);
					};
					break;

				case gl.SAMPLER_2D:
				case gl.SAMPLER_CUBE:
					this._SetTexture(k,val,pos);
					break;

				default:
			}

			if(!handler) {
				return;
			}

			// If the value is a closure, evaluate it every time
			if (typeof val == 'function') {
				this.auto_setters[k] = [pos, function(pos, state) {
					handler(pos, state, val());
				}];
			}
			// If the value is a string, eval() it every time
			// Note: texture paths are handled earlier and control
			// never reaches here for textures.
			else if (typeof val == 'string') {
				this.auto_setters[k] = [pos, function(pos, state) {
					var val_eval = null;

					try {
						val_eval = eval(val);
					} catch (e) {
					}

					handler(pos, state, val_eval);
				}];
			}
			else {
				this.auto_setters[k] = [pos, function(pos, state) {
					handler(pos, state, val);
				}];
			}
		},

		_SetTexture : function(k, val, pos) {
			// Explicitly bound texture - this is a special case because string values
			// for texture parameters are not eval()ed but requested as textures from
			// the server.
			var prog = this.program;

			this.auto_setters[k] = [pos, function(pos, state) {
				// Note: constants[k] is not set to be the texture as it is loaded.
				// this is because the user expects consistent values with the Get/Set
				// APIs, so we cannot change the object type in the background. The
				// texture object only exists in the Set() closure.
				var curval = val;

				if (!(curval instanceof medea.Resource) || !curval.IsRenderable()) {
					curval = medea.GetDefaultTexture();
				}


				state = state.GetQuick('_gl');
				state.texage = state.texage || 0;

				// Check if this texture is already active, if not get rid of the
				// oldest texture in the sampler cache.
				var slots = state.tex_slots || new Array(medea.MAX_TEXTURE_UNITS);
				var oldest = state.texage+1;
				var oldesti = 0;
				var curgl = curval.GetGlTexture();

				for(var i = 0; i < slots.length; ++i) {
					if (!slots[i]) {
						oldest = state.texage+2;
						oldesti = i;
					}
					else if (slots[i][1] === curgl) {
						slots[i][0] = state.texage++;

						// XXX why do we need _Bind() here? Setting the index should suffice
						// since the texture is already set.
						var res = curval._Bind(i);

						gl.uniform1i(pos, res);
						return;
					}
					else if ( slots[i][0] < oldest && oldest !== state.texage+2) {
						oldest = slots[i][0];
						oldesti = i;
					}
				}

				slots[oldesti] = [state.texage++,curgl];
				var res = curval._Bind(oldesti);

				gl.uniform1i(pos, res);
				state.tex_slots = slots;
			}];

			if (typeof val === 'string') {
				medea.LoadModules(['texture'], function() {
					// See note above for why this.constants[k] is not changed
					val = medea.CreateTexture(val);
				});
			}
			else if (typeof val === 'object' && val.low) {
				medea.LoadModules(['lodtexture'], function() {
					// see note above for why this.constants[k] is not changed
					val = medea.CreateLODTexture(val);
				});
			}
		},

		Get : function(k) {
			return this.constants[k];
		},

		// A pass is complete iff the GL program underlying it is
		// linked successfully.
		//
		// IsComplete() updates only after attempts to call |Begin|
		// (which does nothing if the material is not complete yet)
		//
		// For cloned passes this is mirrored from the original
		// pass being complete.
		IsComplete : function() {
			return this.program !== null;
		},

		IsClone : function() {
			return this.clone_flags !== null;
		},


		_Clone : function(clone_flags, out) {
			var new_out = false;
			if(!out) {
				out = new medea.Pass(this.vs, this.ps);
				new_out = true;
			}

			if (new_out) {
				if (clone_flags & medea.MATERIAL_CLONE_COPY_STATE) {
					out.state = medealib.Merge(this.state, {}, {});
				}
				else if (clone_flags & medea.MATERIAL_CLONE_SHARE_STATE) {
					out.state = this.state;
				}

				if (clone_flags & medea.MATERIAL_CLONE_COPY_CONSTANTS) {
					out.constants = medealib.Merge(this.constants, {}, {});			
				}
				else if (clone_flags & medea.MATERIAL_CLONE_SHARE_CONSTANTS) {
					out.constants = this.constants;
				}
			}

			if (!this.IsComplete()) {
				// Since this instance isn't complete yet, we can't
				// clone the other yet. Add it to a list and do the actual cloning
				// as soon as all data is present. This is a bit dirty and imposes an
				// unwanted reference holder on the cloned pass, but it cannot be
				// avoided with the current design.
				if (!this.wannabe_clones) {
					this.wannabe_clones = [];
				}
				this.wannabe_clones.push(out);
				out.clone_flags = clone_flags;
				out.original = this;
				return out;
			}


			out.program_id = this.program_id;
			out.cache_name = this.cache_name;

			// Program reference can be shared (XXX but this does not play well
			// with explicit disposal semantics).
			out.program = this.program;

			// Attribute mapping is always safe to share
			out.attr_map = this.attr_map;

			// Uniform type cache can be shared between clones
			out.uniform_type_cache = this.uniform_type_cache;

			// However, we need to rebuild setters from scratch
			out.auto_setters = {};
			out._ExtractUniforms();
			out._RefreshState();

			return out;
		},

		_ExtractUniforms : function() {
			// extract uniforms that we update automatically and setup state managers for them
			for(var k in medea.ShaderSetters) {
				var pos = gl.getUniformLocation(this.program, k);
				if(pos) {
					this.auto_setters[k] = [pos, medea.ShaderSetters[k]];
				}
			};
		},

		_RefreshState : function() {
			// re-install state managers for all constants
			var old = this.constants;
			this.constants = {};
			for(var k in old) {
				this.Set(k, old[k]);
			}
		},

		_TryAssembleProgram : function() {
			if (this.IsClone()) {
				// Try assembling the original material. It will update us as well
				this.original._TryAssembleProgram();
				return;
			}

			if (this.IsComplete() || !this.vs.IsComplete() || !this.ps.IsComplete()) {
				// Can't assemble this program yet, for we first need to wait
				// for some dependent resources to load
				return;
			}

			// First check if we do already have a linked copy of this shader program
			var cache_name = this.cache_name =  this.vs.GetShaderId() + '#' + this.ps.GetShaderId();
			var p = program_cache[cache_name];
			if(p === undefined) {
				// There is none, so we have to link the program
				p = program_cache[cache_name] = this.program = gl.createProgram();
				gl.attachShader(p,this.vs.GetGlShader());
				gl.attachShader(p,this.ps.GetGlShader());

				// Increment program id to get a unique value
				// (unfortunately, there does not seem to be an easy way to directly
				//  derive an id from the program)
				this.program_id = program_ids[cache_name] = program_id_counter++;

				gl.linkProgram(p);
				if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
					medealib.NotifyFatal("failure linking program, error log: " + gl.getProgramInfoLog(p));
					return;
				}


			}
			else {
				this.program_id = program_ids[cache_name];
				this.program = p;
				gl.useProgram(this.program);
			}

			this._ExtractUniforms();
			this._RefreshState();

			// If the user didn't supply an attribute mapping (i.e. which pre-defined
			// attribute type maps to which attribute in the shader), derive it
			// from the attribute names, assuming their names are recognized.
			if(!this.attr_map) {
				var a = this.attr_map = {};
				/*
				// TODO: this triggers a warning in chrome when the index for getActiveAttrib()
				// is out of range. So while this is not fixed, we duplicate the list of
				// known vertex attributes from medea.vertexbuffer.js with up to four
				// UV coord sets.
				for(var i = 0, n; n = gl.getActiveAttrib(p,i); ++i) {
					a[n.name] = i;
				} */

				var known_attrs = [
						"POSITION"
	 				,	"NORMAL"
					,	"TANGENT"
					,	"BITANGENT"
					,	"TEXCOORD0"
					,	"COLOR0"
					,	"TEXCOORD1"
					,	"COLOR1"
					,	"TEXCOORD2"
					,	"COLOR2"
					,	"TEXCOORD3"
					,	"COLOR3"
				];

				known_attrs.forEach(function(attr) {
					var loc = gl.getAttribLocation(p, attr);
					if(loc !== -1) {
						a[attr] = loc;
					}
				});


			}

			// Now transfer the dictionaries and the program reference to all pending
			// clones for this material.
			if (this.wannabe_clones) {

				for (var i = 0; i < this.wannabe_clones.length; ++i) {
					this._Clone( this.wannabe_clones[i].clone_flags, this.wannabe_clones[i] );
				}

				// Do not delete to avoid changing the hidden class
				this.wannabe_clones = null;
			}
		},

		_SetAutoState : function(statepool, change_flags) {
			// Update shader variables automatically
			var setters = this.auto_setters;
			for(var k in setters) {
				var v = setters[k];
				v[1](v[0], statepool, change_flags);
			}
		},

		_GetUniformType : function(name) {
			/* Using getActiveUniform to obtain the type seems to be the most
			   straightforward way, but unfortunately it keeps telling me
			   that a lot of uniforms are in fact sampler2D's even if they
			   are not. Also, results seem to vary from system to system,
			   suggesting trouble with either the underlying GL implementation
			   or the browser's WebGL code

			   So for now, until all such issues are resolved in all major
			   browsers, scan the source code for the declaration of the
			   variable and extract the type.

			   This will fail for arrays, structures, etc. but those are not
			   currently handled anyway.
			*/

			var cache = this.uniform_type_cache;
			var cached_type = cache[name];
			if (cached_type !== undefined) {
				return cached_type;
			}

			var vs = this.vs.GetPreProcessedSourceCode(), ps = this.ps.GetPreProcessedSourceCode();
			var rex = new RegExp(glsl_type_picker + '\\s+' + name);

			// Further escaping should not be needed, name is required to be
			// a valid GLSL identifier.
			var typename = rex.exec(vs) || rex.exec(ps);


			typename = typename[1];


			var type = glsl_typemap[typename];
			cache[name] = type;
			return type;

			/*
			var info = gl.getActiveUniform(this.program,pos), type = info.type;

			// This is a workaround for my secondary linux system on which the driver
			// for the builtin Intel GMA unit is not only not on the whitelist of ff/chrome,
			// but also keeps confusing sampler and matrix uniforms. The workaround
			// doesn't make it much betteŗ, though, because the driver manages to get
			// almost everything else wrong as well. Seems there is a reason that
			// whitelists are used to determine if Webgl is to be supported or not.
			// XXX SAME trouble on a GF 9600M. Hmpf.
			if (typeof val === 'string' && /.*\.(jpg|png|gif|bmp)/i.test(val) ) {
				type = gl.SAMPLER_2D;
			}
			*/
		}
	});

	medea.CreatePassFromShaderPair = function(name, constants, attr_map, defines, no_clone) {
		return new medea.Pass( 
			medea.CreateShader(name+'.vs', defines), 
			medea.CreateShader(name+'.ps', defines), constants, attr_map );
	};

	medea.ClonePass = function(pass, clone_flags) {
		return pass._Clone(clone_flags);
	};
});




/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('cubetexture',['filesystem', 'nativeimagepool', 'imagestream'],function(medealib, undefined) {
	"use strict";
	var medea = this, gl = medea.gl;

	var CUBE = medea.TEXTURE_TYPE_CUBE = gl.TEXTURE_CUBE_MAP;

	var default_names = [
		'posx','negx','posy','negy','posz','negz'
	];

	
	
	

	medea.CubeTexture = medea.Resource.extend( {

		init : function(src, callback, flags) {

			this.flags = flags || 0;
			this.texture = gl.createTexture();
			this.callback = callback;

			// sentinel size as long as we don't know the real value yet
			this.width = this.glwidth = this.height = this.glheight = -1;

			this.img = new Array(6);

			if (!Array.isArray(src)) {
				// preserve the file extension and append the postfixes with '_'
				var s = src.split('.'), ext = s.length > 1 ? '.'+s[s.length-1] : '.jpg';
				if(s[0].length && s[0][s[0].length-1] != '/') {
					s[0] += '_';
				}
				src = new Array(6);
				for(var i = 0; i < 6; ++i) {
					src[i] = s[0] + default_names[i] + ext;
				}
			}

			var outer = this;
			this.counter = 6;
			this.src = src;

			for(var i = 0; i < 6; ++i) {
				(function(i) {
					medea._ImageStreamLoad(medea.FixURL(src[i]), function(img) {
						outer.img[i] = img;
						outer.OnDelayedInit(i);
						// return true to indicate ownership of the Image
						// (if the LAZY flag was not specified, we already disposed of it)
						return true;
					});
				})(i);
			}
		},

		OnDelayedInit : function(index) {

			var w = this.img[index].width, h = this.img[index].height;

			// cube textures must be POTs and all faces must be squares. Anything else
			// doesn't make sense unlike for 2D textures.

			this.width = this.glwidth = w;
			this.height = this.glheight = h;

			// mark this resource as complete if this was the last face
			if (--this.counter === 0) {
				this._super();

				if (!(this.flags & medea.TEXTURE_FLAG_LAZY_UPLOAD)) {
					this._Upload();
				}

				medealib.LogDebug("successfully loaded cube texture " + this.GetSource());
			}
		},

		GetWidth : function() {
			return this.width;
		},

		GetHeight : function() {
			return this.height;
		},

		GetGlTextureWidth : function() {
			return this.glwidth;
		},

		GetGlTextureHeight : function() {
			return this.glheight;
		},

		GetGlTexture : function() {
			return this.texture;
		},

		GetSource : function() {
			return this.src[0] + '...(1-6)';
		},

		IsPowerOfTwo : function() {
			return true;
		},

		IsSquared : function() {
			return true;
		},

		IsUploaded : function() {
			return this.uploaded;
		},

		IsRenderable : function() {
			return this.IsComplete() && (this.IsUploaded() || !medea.EnsureIsResponsive());
		},

		Dispose : function() {
			if(this.texture) {
				gl.deleteTexture(this.texture);
				this.texture = null;
			}
		},

		_Upload : function() {
			if (this.uploaded) {
				return;
			}

			var old = gl.getParameter(gl.TEXTURE_BINDING_CUBE);
			if(old !== this.texture) {
				gl.bindTexture(CUBE, this.texture);
			}

			// fill all faces
			for ( var i = 0; i < 6; ++i) {
				var face = gl.TEXTURE_CUBE_MAP_POSITIVE_X + i;
				gl.texImage2D(face, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.img[i]);
			}

			// setup sampler states and generate MIPs
			gl.texParameteri(CUBE, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

			if (!(this.flags & medea.TEXTURE_FLAG_NO_MIPS)) {
				gl.texParameteri(CUBE, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
				gl.generateMipmap(CUBE);
			}
			else {
				gl.texParameteri(CUBE, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			}

			// because _Upload may be called at virtually any time, we
			// need to ensure that the global state is not altered.
			if(old !== this.texture) {
				gl.bindTexture(CUBE, old);
			}

			// this hopefully frees some memory
			if (!(this.flags & medea.TEXTURE_FLAG_KEEP_IMAGE)) {
				if(this.img) {
					for(var i = 0; i < 6; ++i) {
						medea._ReturnNativeImageToPool(this.img[i]);
					}
					this.img = null;
				}
			}
			this.uploaded = true;
		},

		_Bind : function(slot) {
			if (!this.IsComplete()) {
				return null;
			}

			slot = slot || 0;

			gl.activeTexture(gl.TEXTURE0 + slot);
			gl.bindTexture(CUBE,this.texture);

			// no texture uploads while responsiveness is important
			if (!this.uploaded) {
				if(medea.EnsureIsResponsive()) {
					return null;
				}
				this._Upload();
			}

			return slot;
		},
	});

	medea.CreateCubeTexture = function(res, callback) {
		return new medea.CubeTexture(res, callback);
	}
});



/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('material',['pass'],function(medealib, undefined) {
	"use strict";
	var medea = this, gl = medea.gl;


	medea.MATERIAL_CLONE_COPY_STATE 		= 0x1;
	medea.MATERIAL_CLONE_SHARE_STATE 		= 0x2;

	medea.MATERIAL_CLONE_COPY_CONSTANTS 	= 0x4;
	medea.MATERIAL_CLONE_SHARE_CONSTANTS 	= 0x8;


	// class Material
	medea.Material = medealib.Class.extend({
		name : "",
		mat_gen : null,

		init : function(passes, name) {
			if(name) {
				this.name = name;
			}

			// the first parameter can also be a MaterialGenerator
			if (passes.Update !== undefined) {
				this.mat_gen = passes;
				this.passes = [];
				this.mat_gen.Update(this.passes);
			}
			else {
				this.passes = passes;
			}

			if (this.passes instanceof medea.Pass) {
				this.passes = [this.passes];
			}
		},

		// Disable debug checks on uniform variable locations being available.
		// Usually it is an error to try setting uniforms that don't exist.
		// However, given that GLSL kills all uniforms that do not contribute
		// to the result, it can become very tedious to quickly iterate on
		// shaders. In such a case, calling this method avoids any assertions.
		//
		// The operation cannot be undone, it is permanent for this material.
		//
		// While the API is still provided, it is a no-op in release builds
		SetIgnoreUniformVarLocationNotFound : function() {
		},

		Pass : function(n,p) {
			if(p === undefined) {
				return this.passes[n];
			}
			if (n == this.passes.length) {
				this.passes.push(p);
				return;
			}
			this.passes[n] = p;
		},

		Passes : function(p) {
			if (p === undefined) {
				return this.passes;
			}
			this.passes = p;
		},

		GetId: function() {
			var id = 0
			,	passes = this.passes;
			for(var i = passes.length - 1; i >= 0; --i) {
				id ^= passes[i].GetProgramId();
			}
			return id;
		},

		Name : medealib.Property(this,'name'),

		Use: function(drawfunc, statepool, semantic, change_flags) {
			semantic = semantic || 0xffffffff;
			var passes = this.passes;
			if (this.mat_gen) {
				this.mat_gen.Update(passes);
			}

			// invoke the drawing callback once per pass
			for(var i = 0, e = passes.length; i < e; ++i) {
				var pass = passes[i];
				if(!(pass.semantic & semantic)) {
					continue;
				}
				if(!pass.Begin(statepool, change_flags)) {
					// XXX substitute a default material?
					return;
				}

				drawfunc(pass);
				pass.End();
			}
		}
	});


	medea.CreateSimpleMaterialFromColor = function(color, dummy_light, shininess, spec_color) {
		if(color.length === 3) { 
			color = [color[0],color[1],color[2],1.0];
		}

		var name = "remote:mcore/shaders/simple-color"
		,	constants = {
				color:color
			}
		;

		if(dummy_light) {
			name += '-lit';
			if(shininess) {
				name += '-spec';

				if(!spec_color) { 
					spec_color = [1,1,1];
				}

				// cap shininess at 64 to avoid excessive exponentiation
				constants.spec_color_shininess = [
					spec_color[0],
					spec_color[1],
					spec_color[2],
					Math.min(64, shininess)
				];
			}
		}
		return new medea.Material(medea.CreatePassFromShaderPair(name,constants));
	};
	
	
	medea.CreateSimpleMaterialFromVertexColor = function(dummy_light) {
		var name = "remote:mcore/shaders/simple-vertex-color", constants = {
			
		};

		if(dummy_light) {
			name += '-lit';
		}
		return new medea.Material(medea.CreatePassFromShaderPair(name,constants));
	};
	

	medea.CreateSimpleMaterialFromTexture = function(texture, dummy_light, shininess, spec_color, normal_texture) {
		var	name = "remote:mcore/shaders/simple-textured"
		,	constants = {
				texture:texture
			}
		;

		if(dummy_light) {
			name += '-lit';
			if(shininess) {
				name += '-spec';
				if(!spec_color) { 
					spec_color = [1,1,1];
				}

				// cap shininess at 64 to avoid excessive exponentiation
				constants.spec_color_shininess = [
					spec_color[0],
					spec_color[1],
					spec_color[2],
					Math.min(64, shininess)
				];

				if(normal_texture) {
					constants.normal_texture = normal_texture;
					name += '-nm';
				}
			}
		}

		return new medea.Material(medea.CreatePassFromShaderPair(name,constants));
	};
	

	medea.CreateMaterial = function(passes, name) {
		return new medea.Material(passes, name);
	};


	// Create a clone of a given |mat|, with |name| being the name of
	// the clone material. 
	//
	// |clone_flags| is a bitwise ORed combination of the medea.MATERIAL_CLONE_XXX
	// constants and describes whether constants and render state are shared
	// between original and copy or whether the clone receives a deep copy.
	//
	// When sharing state between clones, care must be taken - medea does
	// not retain the information that clonest exist, so there will be
	// no debugging aid and state changes may easily have unintended
	// side-effects. As a trade-off, sharing state greatly reduces necessary
	// GL state changes and thereby improves performance.
	//
	// |clone_flags| default to MATERIAL_CLONE_COPY_CONSTANTS | medea.MATERIAL_CLONE_COPY_STATE
	medea.CloneMaterial = function(mat, clone_flags, name) {
		if (clone_flags === undefined) {
			clone_flags = medea.MATERIAL_CLONE_COPY_CONSTANTS | medea.MATERIAL_CLONE_COPY_STATE
		}
		var passes = mat.Passes(), newp = new Array(passes.length);
		for (var i = 0; i < passes.length; ++i) {
			newp[i] = medea.ClonePass(passes[i], clone_flags);
		}
		return new medea.Material(newp, name || mat.Name()+'_clone');
	};

	medea.CreateSimpleMaterialFromShaderPair = function(name, constants, attr_map, defines) {
		return new medea.Material(medea.CreatePassFromShaderPair(name,constants, attr_map, defines));
	};
});



/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('materialgen',['shader','material'],function(medealib, undefined) {
	"use strict";
	var medea = this, gl = medea.gl;

	var semik = ';';

	var raw_vertex_shader = 
		"#include <remote:mcore/shaders/core.vsh>\n" +

		"void main()" +
		"{" + 
			"PassClipPosition(ModelToClipSpace(FetchPosition()));" + 
			"PassNormal(ModelNormalToWorldSpace(FetchNormal()));" +
			"PassTexCoord(FetchTexCoord());" +
		"}";


	var raw_fragment_shader = 
		"uniform sampler2D texture;" +
		"$lighting_uniforms" +

		"#include <remote:mcore/shaders/core.psh>\n" +
		"void ComputeLighting(vec3 _normal, out vec3 _diffuse, out vec3 _specular, out vec3 _ambient) {" +
		"	$lighting_body" +
		"} " +

		"void main()" +
		"{" +
			"vec3 normal = FetchNormal(); " +

			"vec3 diffuse = vec3(0.0,0.0,0.0);" +
			"vec3 specular = vec3(0.0,0.0,0.0);" +
			"vec3 ambient = vec3(0.0,0.0,0.0);" +
			"ComputeLighting(normal, diffuse, specular, ambient); " +

			"vec4 texture = texture2D(texture, FetchTexCoord() ); " +
			"gl_FragColor.rgba = texture * vec4(diffuse,1.0) + vec4(specular,0.0) + vec4(ambient,0.0);" +
		"}";


	// class MaterialGen
	medea.MaterialGen = medealib.Class.extend({
		name : "",
		mat_gen : null,

		init : function(blorb) {
		},

		Update : function(statepool, passes) {


			if(passes.length === 0) {
				var vertex = this.GenVertexShader(statepool);
				var fragment = this.GenFragmentShader(statepool);

				
			}
			else if(passes.length === 1) {
				return;
			}
		},

		GenFragmentShader : function(state) {
			var fragment_code = new String(raw_fragment_shader);

			var dir_lights = state.Get("DIR_LIGHTS");

			var lighting_uniforms = [];
			var lighting_code = "";
			for(var i = 0; i < dir_lights.length; ++i) {
				var light = dir_lights[i];
				var snippet = this.EvaluateDirectionalLight();

				uniforms.push("vec3 LIGHT_D"+i+"_DIR");

				lighting_code += "{";
				lighting_code += snippet.prefix
					.replace('$normal_world', '_normal')
					.replace('$light_dir_world', "LIGHT_D"+i+"_DIR") + semik;

				lighting_code += "_diffuse += "  + snippet.diffuse  + semik;
				lighting_code += "_specular += " + snippet.specular + semik;
				lighting_code += "_ambient += "  + snippet.ambient  + semik;
				lighting_code += "}";
			}

			// TODO: point and spot lights

			fragment_code = fragment_code
				.replace('$lighting_body', lighting_code)
				.replace('$lighting_uniforms', lighting_uniforms.join(";\n"));

			return fragment_code;
		},

		GeVertexShader : function(state) {
			var vertex_code = new String(raw_vertex_shader);
			return vertex_code;
		},

		EvaluateDirectionalLight : function() {
			return {
				prefix		: 'float strength = dot($normal_world, $light_dir_world)',
				diffuse 	: 'strength * $light_diffuse_color',
				specular 	: 'strength * $light_specular_color',
				ambient		: '$light_ambient_color'
			};
		},

		EvaluatePointLight : function() {
			return {
				prefix		: 
					'vec3 dir = $pos_world - $light_pos_world; \
					 float distance = length(dir); \
					 float attenuation = 1.0-clamp(distance/$light_range,0.0,1.0); \
					 float strength = dot($normal_world, dir) * attenuation',
				diffuse 	: 'strength * $light_diffuse_color',
				specular 	: 'strength * $light_specular_color',
				ambient		: '$light_ambient_color'
			};
		},

		EvaluateSpotLight : function() {
			return {
				prefix		: 
					'vec3 dir = $pos_world - $light_pos_world; \
					 float distance = length(dir); \
					 float attenuation = 1.0-clamp(distance/$light_range,0.0,1.0); \
					 float angle = smoothstep($light_spot_angle_inner, $light_spot_angle_outer) \
					 	* dot($light_dir_world, normalize(distance)) \
					 float strength = dot($normal_world, dir) * attenuation * angle;',
				diffuse 	: 'strength * $light_diffuse_color',
				specular 	: 'strength * $light_specular_color',
				ambient		: '$light_ambient_color'
			};
		}
	});

	medea.CreateMaterialGen = function(color, dummy_light) {
		return new medea.MaterialGen();
	};
});


/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('visualizer_showbbs',[ 'visualizer','material','frustum'],function(medealib, undefined) {
	"use strict";
	var medea = this;
	var ordinal = 10;

	var col_ent = [1.0,0.0,0.0,1.0], col_nodes = [1.0,1.0,0.0,1.0], col_partial = [0.0,1.0,0.0,1.0];

	var AddNodes = function(node, bbs, done) {
		if(node in done) {
			return;
		}

		var bb = node.GetWorldBB();
		if(bb === medea.BB_INFINITE) {
			return;
		}

		if (bb !== medea.BB_EMPTY) {
			bbs.push([node.GetWorldBB(),col_nodes]);
		}

		done[node.id] = true;
		if (node.parent) {
			AddNodes(node.parent,bbs,done);
		}
	};

	
	var VisualizerShowBBs = medea.Visualizer.extend({

		init : function(name, draw_range, draw_nodes, show_cull_state) {
			this._super(name);
			this.ordinal = ordinal;
			this.draw_range = draw_range || 1e6;
			this.draw_nodes = draw_nodes || false;
			this.show_cull_state = show_cull_state || false;

			this.material = medea.CreateSimpleMaterialFromShaderPair("remote:mcore_debug/shaders/show-normals");
			this.cached_mesh = null;
		},

		DrawRange : function(fr) {
			if (fr === undefined) {
				return this.draw_range;
			}
			this.draw_range = fr;
		},

		DrawNodes : function(fr) {
			if (fr === undefined) {
				return this.draw_nodes;
			}
			this.draw_nodes = fr;
		},

		ShowCullState : function(fr) {
			if (fr === undefined) {
				return this.show_cull_state;
			}
			this.show_cull_state = fr;
		},

		Apply : function(render_stub, original_render_stub, rq, renderer, viewport) {
			var outer = this;
			return function() {
				var cam = viewport.Camera(), cp = cam.GetWorldPos();
				var sqr = outer.draw_range * outer.draw_range, nodes_done = {};

				// Walk the render queue and collect bounding boxes in one large mesh
				var bbs = [];
				var queues = rq.GetQueues();
				for (var i = medea.RENDERQUEUE_DEFAULT_EARLY; i < medea.RENDERQUEUE_BACKGROUND; ++i) {

					var entries = queues[i].GetEntries();
					for (var j = 0; entries && j < entries.length; ++j) {
						var job = entries[j], w = job.GetNode().GetWorldPos();

						var bb = job.GetEntity().GetWorldBB(job.GetNode());
						if(bb === medea.BB_INFINITE || bb === medea.BB_EMPTY) {
							continue;
						}

						var d0 = w[0]-cp[0], d1 = w[1]-cp[1], d2 = w[2]-cp[2];
						if ( d0*d0 + d1*d1 + d2*d2 > sqr) {
							continue;
						}

						bbs.push([bb,col_ent]);

						if (outer.draw_nodes) {
							// we can omit the bounding box for the node if it has just one entity
							if (job.GetNode().GetEntities().length === 1) {
								if (job.GetNode().parent) {
									AddNodes(job.GetNode().parent, bbs, nodes_done);
								}
							}
							else {
								AddNodes(job.GetNode(), bbs, nodes_done);
							}
						}
					}
				}

				if (bbs.length) {
					if (outer.show_cull_state) {

						var fr = cam.GetFrustum();
						for (var i = 0; i < bbs.length; ++i) {
							if (medea.BBInFrustum(fr, bbs[i][0]) === medea.VISIBLE_PARTIAL) {
								bbs[i][1] = col_partial;
							}
						}
					}

					var pout = new Float32Array(bbs.length*8*3), cout = new Float32Array(bbs.length*8*4), ind = new Int32Array(bbs.length*24);
					var ip = 0, ic = 0, ii = 0;

					for (var i = 0; i < bbs.length; ++i) {
						var bb = bbs[i][0], col = bbs[i][1];

						var max = bb[1], min = bb[0], b = ip/3;
						var push_vec;

						// handle OBB vs AABB
						if (bb.length === 3) {
							var mat = bb[2], tmpv = vec3.create();
							push_vec = function(v) {
								mat4.multiplyVec3(mat,v,tmpv);
								pout[ip++] = tmpv[0];
								pout[ip++] = tmpv[1];
								pout[ip++] = tmpv[2];
							};
						}
						else {
							push_vec = function(v) {
								pout[ip++] = v[0];
								pout[ip++] = v[1];
								pout[ip++] = v[2];
							};
						}

						push_vec([min[0],min[1],min[2]]);
						push_vec([min[0],max[1],min[2]]);
						push_vec([min[0],max[1],max[2]]);
						push_vec([min[0],min[1],max[2]]);

						push_vec([max[0],min[1],min[2]]);
						push_vec([max[0],max[1],min[2]]);
						push_vec([max[0],max[1],max[2]]);
						push_vec([max[0],min[1],max[2]]);

						for (var k = 0; k < 8; ++k) {
							for(var s = 0; s < 4; ++s) {
								cout[ic++] = col[s];
							}
						}

						ind[ii++] = b+0;
						ind[ii++] = b+1;
						ind[ii++] = b+1;
						ind[ii++] = b+2;
						ind[ii++] = b+2;
						ind[ii++] = b+3;
						ind[ii++] = b+3;
						ind[ii++] = b+0;

						ind[ii++] = b+4;
						ind[ii++] = b+5;
						ind[ii++] = b+5;
						ind[ii++] = b+6;
						ind[ii++] = b+6;
						ind[ii++] = b+7;
						ind[ii++] = b+7;
						ind[ii++] = b+4;

						ind[ii++] = b+0;
						ind[ii++] = b+4;

						ind[ii++] = b+1;
						ind[ii++] = b+5;

						ind[ii++] = b+2;
						ind[ii++] = b+6;

						ind[ii++] = b+3;
						ind[ii++] = b+7;
					}

					var vb = {positions:pout, colors:[cout]};
					if (!outer.cached_mesh) {
						outer.cached_mesh = medea.CreateSimpleMesh(vb,ind,outer.material,
							medea.VERTEXBUFFER_USAGE_DYNAMIC | medea.INDEXBUFFER_USAGE_DYNAMIC
						);

						outer.cached_mesh.PrimitiveType(medea.PT_LINES);
					}
					else {
						outer.cached_mesh.VB().Fill(vb);
						outer.cached_mesh.IB().Fill(ind);
					}
				}

				render_stub();

				if (bbs.length) {
					// setup a dummy statepool to draw the mesh on top of everything
					var statepool = new medea.StatePool(), cam = viewport.Camera();

					statepool.Set("V",cam.GetViewMatrix());
					statepool.Set("P",cam.GetProjectionMatrix());
					statepool.Set("W",mat4.identity(mat4.create()));

					outer.cached_mesh.DrawNow(statepool);
				}
			}
		},
	});


	medea.CreateVisualizer_showbbs = function(name) {
		return new VisualizerShowBBs(name);
	};
});



/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('sceneloader',['filesystem', 'material'],function(medealib, undefined) {
	"use strict";
	var medea = this;


	// failure loading a scene
	medea.SCENE_LOAD_STATUS_FAILED = 0;

	// scene has been downloaded, now starting to decode it
	medea.SCENE_LOAD_STATUS_DOWNLOADED = 1;

	// scene geometry and topology has been fully loaded, but materials
	// and textures may still be pending.
	medea.SCENE_LOAD_STATUS_GEOMETRY_FINISHED = 2;

	// (not supported yet)
	// all pending resources are loaded
	medea.SCENE_LOAD_STATUS_FINISHED = 3;



	var FixTexturePath = function(path, root) {
		return root+'/'+ path.replace(/^\.(\\|\/)(.*)/,'$2');
	};


	var DefaultMaterialResolver = function(mat_params, root) {
		// for now, just distinguish between textured and non-textured materials and leave more sophisticated stuff for later
		if(mat_params.diffuse_texture) {
			var nm = mat_params.normal_texture || mat_params.height_texture;
			if(nm) {
				nm = FixTexturePath(nm, root);
			}
			return medea.CreateSimpleMaterialFromTexture(FixTexturePath(mat_params.diffuse_texture, root),
				true,
				mat_params.shininess,
				false,
				nm);
		}

		return medea.CreateSimpleMaterialFromColor( mat_params.diffuse || [0.2,0.2,0.2,1.0], 
			true,
			mat_params.shininess);
	};

	var CreateDefaultMaterialResolver = function(url) {
		url = url || medea.root_url;
		return function(p) {
			return DefaultMaterialResolver(p,url);
		};
	};

	/** note: callback is called with either true or false depending whether 
	 *  loading was successful or not. 
	 */
	medea.LoadScene = function(src, anchor, format_hint, callback, material_resolver, url_root) {
		format_hint = format_hint || 'assimp2json';
		material_resolver = material_resolver || CreateDefaultMaterialResolver(url_root);

		if((new String(format_hint)).slice(0,8) === 'function') {
			format_hint(src, anchor, callback, material_resolver);
			return;
		}
			
		// XXX we need better (read: some) error handling here
		medea.LoadModules('sceneloader_'+format_hint,function() {
				medea['_LoadScene_'+format_hint](src, anchor, callback, material_resolver);
		});
	};

	/** note: callback is called with either true or false depending whether 
	 *  loading was successful or not. 
	 */
	medea.LoadSceneFromResource = function(src, anchor, format_hint, callback, material_resolver) {
		material_resolver = material_resolver || CreateDefaultMaterialResolver(src.replace(/^(.*[\\\/])?(.*)/,'$1'));
		medea.Fetch(src, function(data) {
			if(!data) {
				if (callback) {
					callback(medea.SCENE_LOAD_STATUS_FAILED);
				}
				return;
			}
			if (callback) {
				callback(medea.SCENE_LOAD_STATUS_DOWNLOADED);
			}
			medea.LoadScene(data, anchor, format_hint, callback, material_resolver);
		});
	};
});


/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('lodtexture',['texture', 'dummytexture'],function(medealib, undefined) {
	"use strict";
	var medea = this, gl = medea.gl;

	var TEX = gl.TEXTURE_2D;

	medea.LODTexture = medea.Resource.extend( {

		init : function(tuple, callback, no_client_cache) {

			this.textures = [null,null,null];
			this.textures[0] = medea.CreateDummyTexture(tuple.neutral);

			// load the low-resolution version of the texture and mark the resource
			// as complete as soon as we have it.
			var outer = this;
			this.textures[1] = medea.CreateTexture( tuple.low, function() {
				outer.OnDelayedInit();
				if(callback) {
					callback();
				}
			}, no_client_cache );

			this.textures[2] = function() {
				outer.textures[2] = medea.CreateTexture( tuple.high, function() {
					outer.cur = 2;
				}, no_client_cache );
			};
			this.cur = 0;
		},

		Dispose : function() {
			for(var i = this.textures.length-1; i >= 0; --i) {
				this.textures[i].Dispose();
				this.textures[i] = null;
			}
		},

		OnDelayedInit : function() {
			this.cur = 1;
			this._super();

			this.textures[2]();
		},

		GetGlTexture : function() {
			return this.textures[this.cur].GetGlTexture();
		},


		_Bind : function(slot) {
			return this.textures[this.cur]._Bind(slot);
		},
	});

	medea.CreateLODTexture = function(tuple, callback) {
		return new medea.LODTexture(tuple, callback);
	}
});



/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('visualizer_shownormals',[ 'visualizer','material'],function(medealib, undefined) {
	"use strict";
	var medea = this;
	var ordinal = 10;

	var color_palette = [
		[1.0,1.0,1.0,1.0],
		[1.0,0.0,0.0,1.0],
		[0.0,0.0,1.0,1.0],
		[0.0,1.0,0.0,1.0],
		[0.0,0.0,0.0,1.0],
		[1.0,1.0,0.0,1.0],
		[1.0,0.0,1.0,1.0],
		[0.0,1.0,1.0,1.0],
		[0.8,0.8,0.8,1.0],
		[0.4,0.4,0.4,1.0],
		[0.6,0.0,0.2,1.0],
		[0.6,0.4,0.2,1.0],
		[0.6,0.2,0.0,1.0],
		[0.3,0.1,0.7,1.0]
	];

	
	var VisualizerShowNormals = medea.Visualizer.extend({

		init : function(name, draw_range, full_ts) {
			this._super(name);
			this.ordinal = ordinal;
			this.draw_range = draw_range || 50;
			this.full_ts = full_ts || false;

			this.material = medea.CreateSimpleMaterialFromShaderPair("remote:mcore_debug/shaders/show-normals");
			this.cached_mesh = null;
		},

		DrawRange : function(fr) {
			if (fr === undefined) {
				return this.draw_range;
			}
			this.draw_range = fr;
		},

		DrawFullTangentSpace : function(fr) {
			if (fr === undefined) {
				return this.full_ts;
			}
			this.full_ts = fr;
		},

		Apply : function(render_stub,original_render_stub, rq, renderer, viewport) {
			var outer = this;
			return function() {

				// walk the render queue and collect normals in one large mesh
				var count = 0;
				var queues = rq.GetQueues();
				for (var i = medea.RENDERQUEUE_DEFAULT_EARLY; i < medea.RENDERQUEUE_BACKGROUND; ++i) {

					var entries = queues[i].GetEntries();
					for (var j = 0; entries && j < entries.length; ++j) {
						var job = entries[j];
						var data = job.mesh.VB().GetSourceData();

						if(!data || !data.positions || !data.normals) {
							continue;
						}

						count += data.positions.length;
					}
				}

				if (count) {

					var cp = viewport.Camera().GetWorldPos();
					var sqr = outer.draw_range * outer.draw_range;

					var pout = new Float32Array(count*6*(outer.full_ts ?3:1)), cout = new Float32Array(count*8*(outer.full_ts ?3:1)), ip = 0, ic = 0, c = 0;
					for (var i = medea.RENDERQUEUE_DEFAULT_EARLY; i < medea.RENDERQUEUE_BACKGROUND; ++i) {

						var entries = queues[i].GetEntries();
						for (var j = 0; entries && j < entries.length; ++j) {
							var job = entries[j];
							var data = job.mesh.VB().GetSourceData(), world = job.node.GetGlobalTransform();

							if(!data) {
								continue;
							}

							var pos = data.positions, nor = data.normals, tan = data.tangents, bit = data.bitangents;
							if (!pos || !nor || pos.length != nor.length || pos.length % 3) {
								continue;
							}

							var col = color_palette[c = (c+1) % color_palette.length];
							var do_ts = outer.full_ts && tan && bit;

							for(var n = 0; n < pos.length; n+=3) {
								var v = vec3.create(), w = vec3.create();

								mat4.multiplyVec3(world,[pos[n],pos[n+1],pos[n+2]],w);

								var d0 = w[0]-cp[0], d1 = w[1]-cp[1], d2 = w[2]-cp[2];
								if ( d0*d0 + d1*d1 + d2*d2 > sqr) {
									continue;
								}

								pout[ip++] = w[0];
								pout[ip++] = w[1];
								pout[ip++] = w[2];

								mat4.multiplyVec3(world,[pos[n]+nor[n],pos[n+1]+nor[n+1],pos[n+2]+nor[n+2]],v);
								pout[ip++] = v[0];
								pout[ip++] = v[1];
								pout[ip++] = v[2];

								for(var s = 0; s < 4; ++s) {
									cout[ic+4] = col[s];
									cout[ic++] = col[s];
								}
								ic += 4;

								if (do_ts) {
									pout[ip++] = w[0];
									pout[ip++] = w[1];
									pout[ip++] = w[2];

									mat4.multiplyVec3(world,[pos[n]+tan[n],pos[n+1]+tan[n+1],pos[n+2]+tan[n+2]],v);
									pout[ip++] = v[0];
									pout[ip++] = v[1];
									pout[ip++] = v[2];

									pout[ip++] = w[0];
									pout[ip++] = w[1];
									pout[ip++] = w[2];

									mat4.multiplyVec3(world,[pos[n]+bit[n],pos[n+1]+bit[n+1],pos[n+2]+bit[n+2]],v);
									pout[ip++] = v[0];
									pout[ip++] = v[1];
									pout[ip++] = v[2];

									for( var n = 0; n < 2; ++n) {
										for(var s = 0; s < 4; ++s) {
											cout[ic+4] = 1.0-col[s];
											cout[ic++] = 1.0-col[s];
										}
										ic += 4;
									}
								}
							}
						}
					}

					pout = pout.subarray(0,ip);
					cout = cout.subarray(0,ic);

					var vb = {positions:pout, colors:[cout]};
					if (!outer.cached_mesh) {
						outer.cached_mesh = medea.CreateSimpleMesh(vb,null,outer.material,
							medea.VERTEXBUFFER_USAGE_DYNAMIC
						);

						outer.cached_mesh.PrimitiveType(medea.PT_LINES);
					}
					else {
						outer.cached_mesh.VB().Fill(vb);
					}
				}

				render_stub();

				if (count) {
					// setup a dummy statepool to draw the mesh on top of everything
					var statepool = new medea.StatePool(), cam = viewport.Camera();

					statepool.Set("V",cam.GetViewMatrix());
					statepool.Set("P",cam.GetProjectionMatrix());
					statepool.Set("W",mat4.identity(mat4.create()));

					outer.cached_mesh.DrawNow(statepool);
				}
			}
		},
	});


	medea.CreateVisualizer_shownormals = function(name) {
		return new VisualizerShowNormals(name);
	};
});



/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('debug',['visualizer', 'input_handler', 'sprintf-0.7.js', 'MiniStatsDisplay.js', 'dat.gui.min.js'],function(medealib, undefined) {
	"use strict";
	var medea = this;


	this.DebugPanel = medealib.Class.extend({

		  where 						: null
		, win 							: null
		, input 						: null
		, vis 							: null
		, show_normals 					: false
		, show_bbs 						: false
		, show_bbs_draw_range 			: 50
		, show_bbs_draw_nodes 			: true
		, show_bbs_show_cull_state 		: true
		, show_ministats 				: true
		, last_update_time 				: 0.0
		, wireframe 					: false
		, last_show_ministats			: null
		, stats_shortlist				: null
		,


		init : function(where,win) {
			var f1, f2;

			this.where = where;
			this.win = win;
			this.input = {};
			this.vis = {};

			this.fps_stats = new MiniStatsDisplay({
				  caption 	: 'fps'
				, width		: 140
				, left 		: 0
				, top 		: 0
				, style     : 0
				, autorange	: 50
			});

			this.primitives_stats = new MiniStatsDisplay({
				  caption 	: 'primitives'
				, width		: 140
				, left 		: 0
				, top 		: 46
				, style     : 1
				, autorange	: 50
			});


			this.batches_stats = new MiniStatsDisplay({
				  caption 	: 'batches'
				, width		: 140
				, left 		: 0
				, top 		: 92
				, style     : 3
				, autorange	: 50
			});

			this.stats_shortlist = [
				this.fps_stats,
				this.primitives_stats,
				this.batches_stats
			];

			this.gui = new dat.GUI();
			f1 = this.gui.addFolder('Core');
			f1.add(this, 'wireframe');

			f1 = this.gui.addFolder('Visualizers');
			f1.add(this, 'show_normals');

			f1.add(this, 'show_bbs');
				f2 = f1.addFolder('show_bbs Settings');
				f2.add(this, 'show_bbs_draw_range');
				f2.add(this, 'show_bbs_draw_nodes');
				f2.add(this, 'show_bbs_show_cull_state');

			f1 = this.gui.addFolder('Debug');
			f1.add(this, 'show_ministats');
		},


		Dispose : function() {
			this.gui.destroy();

			this.stats_shortlist.forEach(function(e) {
				e.destroy();
			});
		},


		BeginFrame : function() {
			this._SetVisualizer('showbbs', this.show_bbs);
			this._SetVisualizer('shownormals', this.show_normals);

			if(this.vis.showbbs) {
				this.vis.showbbs.ShowCullState(this.show_bbs_show_cull_state);
				this.vis.showbbs.DrawNodes(this.show_bbs_draw_nodes);
				this.vis.showbbs.DrawRange(this.show_bbs_draw_range);
			}

			if(this.show_ministats !== this.last_show_ministats){
				for(var i = this.stats_shortlist.length - 1; i >= 0; --i) {
					this.stats_shortlist[i].container.style.display = this.show_ministats ? 'block' : 'none';
				}
				this.last_show_ministats = this.show_ministats;
			}

			medea.Wireframe(this.wireframe);
		},


		EndFrame: function() {
			var stats = medea.GetStatistics()
			,	time = medea.GetTime()
			;

			// update stats every 1/10th second to save DOM cost
			if (time - this.last_update_time >= 0.1) {
				this.last_update_time =  time;

				this.fps_stats.update(stats.smoothed_fps);
				this.primitives_stats.update(stats.primitives_frame);
				this.batches_stats.update(stats.batches_frame);
			}
		},


		_SetVisualizer : function(name, state, clb) {
			var vis = this.vis;
			if (vis[name] === false) {
				return;
			}

			if (state && !vis[name]) {
				vis[name] = false;

				var outer = this;
				medea.CreateVisualizer(name,'debug_panel_visualizer:'+name,function(vis) {
					outer.vis[name] = vis;
					outer._AddVisualizer(name);
					if(clb) {
						clb(vis);
					}
				});
			}
			else if (vis[name]) {
				if (!state) {
					this._RemoveVisualizer(name);
				}
				else {
					this._AddVisualizer(name);
				}
			}
		},


		_AddVisualizer : function(name) {
			var vps = medea.GetViewports();
			for(var i = 0; i < vps.length; ++i) {
				vps[i].AddVisualizer(this.vis[name]);
			}
		},


		_RemoveVisualizer : function(name) {
			var vps = this.vis[name].GetViewports().slice(0);
			for(var i = 0; i < vps.length; ++i) {
				vps[i].RemoveVisualizer(this.vis[name]);
			}
		},
	});
});


/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('renderqueue',['renderstate'],function(medealib, undefined) {
	"use strict";
	var medea = this;

	//
	this.RENDERQUEUE_FIRST = 0;

	this.RENDERQUEUE_LIGHT = 8;
	this.RENDERQUEUE_DEFAULT_EARLY = 10;
	this.RENDERQUEUE_DEFAULT = 11;
	this.RENDERQUEUE_DEFAULT_LATE = 12;

	// Since background drawing (i.e. skybox) typically runs on the
	// full screen size with depth_write=false, depth_test=true and
	// therefore overrides geometry that doesn't leave traces in
	// the depth buffer, it need be rendered before alpha geometry.
	this.RENDERQUEUE_BACKGROUND = 13;

	this.RENDERQUEUE_ALPHA_EARLY = 14;
	this.RENDERQUEUE_ALPHA = 15;
	this.RENDERQUEUE_ALPHA_LATE = 16;

	

	this.RENDERQUEUE_LAST = 19;


	// class DistanceSorter
	this.DistanceSorter = medealib.Class.extend({

		Run : function(entries) {
			entries.sort(function(a,b) {
				return a.DistanceEstimate() - b.DistanceEstimate();
			});
		}
	});


	// class MaterialSorter
	this.MaterialSorter = medealib.Class.extend({

		Run : function(entries) {
			entries.sort(function(a,b) {
				return a.MaterialId() - b.MaterialId();
			});
		}
	});

	// class NoSorter
	this.NoSorter = medealib.Class.extend({

		Run : function(entries) {
			// intentionally a no-op
		}
	});


	// class RenderQueue
	this.RenderQueue = medealib.Class.extend({

		init: function(sorter,default_state) {
			this.entries = [];
			this.sorter = sorter;
			this.default_state = default_state;
		},

		Push: function(e) {
			this.entries.push(e);
		},

		Flush: function(renderer, statepool) {
			medea.SetDefaultState(this.default_state || {},statepool);

			if (this.sorter) {
				this.sorter.Run(this.entries);
			}

			this.entries.forEach(function(e) {
				e.Draw(renderer, statepool);
			});
			this.entries = [];
		},

		Sorter : medealib.Property('sorter'),
		DefaultState : medealib.Property('default_state'),

		GetEntries : function() {
			return this.entries;
		}
	});


	// class RenderQueueManager
	this.RenderQueueManager = medealib.Class.extend({

		init : function(name) {
			// allocates queues, by default all queues have no further configuration
			// setting sorters and default states is done by the renderer.
			this.queues = new Array(medea.RENDERQUEUE_LAST+1);
			for(var i = 0, l = this.queues.length; i < l; ++i) {
				this.queues[i] = new medea.RenderQueue();
			}
		},

		Push : function(idx,renderable) {

			this.queues[idx].Push(renderable);
		},

		Flush : function(renderer, statepool) {
			this.queues.forEach(function(e) {
				e.Flush(renderer, statepool);
			});
		},

		// supply a custom queue implementation
		SetQueueImpl : function(idx,queue) {
			this.queues[idx] = queue;
		},

		GetQueues : function() {
			return this.queues;
		}
	});


	medea.CreateRenderQueueManager = function() {
		return new medea.RenderQueueManager();
	}
});

/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('mesh',['vertexbuffer','indexbuffer','material','entity','renderqueue', 'renderer'],function(medealib, undefined) {
	"use strict";
	var medea = this, gl = medea.gl;


	// primitive types supported by the medea.Mesh class
	medea.PT_TRIANGLES = gl.TRIANGLES;
	medea.PT_LINES = gl.LINES;
	medea.PT_TRIANGLE_STRIPS = gl.TRIANGLE_STRIPS;
	medea.PT_LINE_STRIPS = gl.LINE_STRIPS;

	

	// class RenderJob
	medea.MeshRenderJob = medea.RenderJob.extend({

		distance 	: null,
		mesh 		: null,
		sort_matid  : -1,

		init : function(mesh, node, camera) {
			this._super(mesh, node, camera);
			this.mesh = mesh;
			this.sort_matid = mesh.material.GetId();
		},

		Draw : function(renderer, statepool) {
			renderer.DrawMesh(this, statepool);
		},

		// Required methods for automatic sorting of renderqueues
		DistanceEstimate : (function() {
			var scratch_vec = vec3.create();
			return function() {
				if (this.distance === null) {
					if (this.mesh.IsUnbounded()) {
						this.distance = 0;
					}
					else {
						// TODO: this does *not* handle scaled meshes correctly
						var cam_pos = this.camera.GetWorldPos();
						var node_pos = vec3.add(this.node.GetWorldPos(), this.mesh.GetCenter(), scratch_vec);
						var delta = vec3.subtract(cam_pos, node_pos, scratch_vec);

						// Subtract the mesh' bounding radius from the estimate
						var radius = this.mesh.GetRadius();
						this.distance = Math.max(0, vec3.dot(delta, delta) - radius * radius);
					}
				}
				return this.distance;
			};
		})(),

		MaterialId : function() {
			return this.sort_matid;
		}
	});


	// class Mesh
	medea.Mesh = medea.Entity.extend(
	{
		vbo : null,
		ibo : null,
		material : null,
		rq_idx : -1,
		pt : -1,
		line_ibo : null,

		init : function(vbo, ibo, material, rq, pt, line_ibo) {
			this.vbo = vbo;
			this.ibo = ibo;
			this.material = material;
			this.rq_idx = rq === undefined ? medea.RENDERQUEUE_DEFAULT : rq;
			this.pt = pt || medea.PT_TRIANGLES;
			this.line_ibo = line_ibo;


		},

		Render : function(camera, node, rqmanager) {
			// construct a renderable capable of drawing this mesh upon request by the render queue manager
			rqmanager.Push(this.rq_idx,new medea.MeshRenderJob(this, node, camera));
		},

		Update : function() {
		},

		Material : function(m) {
			if (m === undefined) {
				return this.material;
			}
			this.material = m;
		},

		RenderQueue : function(m) {
			if (m === undefined) {
				return this.rq_idx;
			}
			this.rq_idx = m;
		},

		PrimitiveType : function(pt) {
			if (pt === undefined) {
				return this.pt;
			}
			this.pt = pt;
		},

		VB : function(vbo) {
			if (vbo === undefined) {
				return this.vbo;
			}
			this.vbo = vbo;
		},

		IB : function(ibo) {
			if (ibo === undefined) {
				return this.ibo;
			}
			this.ibo = ibo;
		},
		
		_Clone : function(material_or_color) {
			var mesh = medea.CreateSimpleMesh(this.vbo, this.ibo,
				material_or_color || this.Material(),
				this.rq,
				this.pt,
				this.line_ibo);
			// Copy BB: this is necessary if this.BB has been
			// manually specified as opposed to the BB being
			// derived from the VBO's extents.
			mesh.BB(this.BB());
			return mesh;
		},

		DrawNow : function(statepool, change_flags) {
			var outer = this
			,	st = medea.GetStatistics()
			,	vboc = this.vbo.GetItemCount()
			,	iboc = this.ibo ? this.ibo.GetItemCount() : null
			;

			if(medea.Wireframe() && (this.pt === medea.PT_TRIANGLES || this.pt === medea.PT_TRIANGLES_STRIPS)) {
				this._DrawNowWireframe(statepool, change_flags);
				return;
			}

			this.material.Use(function(pass) {
				// Set vbo and ibo if needed
				outer.vbo._Bind(pass.GetAttributeMap(), statepool);

				// Non-wireframe, regular drawing:
				// NOTE: this must happen AFTER the VBO is bound, as Chrome validates the
				// indices when binding the index buffer, leading to undefined 
				// ELEMENT_ARRAY_BUFFER status if the old ARRAY_BUFFER is too small.
				// TODO: find out if this is WebGl per se, or a Chrome bug.
				if (outer.ibo) {
					outer.ibo._Bind(statepool);
				}

				// Update statistics
				st.vertices_frame += vboc;
				++st.batches_frame;

				// Regular drawing
				if (outer.ibo) {
					gl.drawElements(outer.pt, iboc, outer.ibo.GetGlType(), 0);
					st.primitives_frame += outer._Calc_pt(iboc);
				}
				else {
					gl.drawArrays(outer.pt, 0, vboc);
					st.primitives_frame += outer._Calc_pt(vboc);
				}
			}, statepool, 0xffffffff, change_flags);
		},

		_DrawNowWireframe : function(statepool, change_flags) {
			var outer = this
			,	st = medea.GetStatistics()
			,	vboc = this.vbo.GetItemCount()
			,	iboc = this.ibo ? this.ibo.GetItemCount() : null
			;

			// Wireframe is tricky because WebGl does not support the usual
			// gl API for setting the poly mode.

			
			if(this.pt === medea.PT_TRIANGLES_STRIPS) {
				return;
			}

			// TODO: track changes to ibo, display proper wireframe also for meshes
			// with no index buffer.
			if(this.line_ibo != null || !this.ibo || (this.ibo.flags & medea.INDEXBUFFER_PRESERVE_CREATION_DATA)) {
				// we can use a substitute ibo that indexes the geometry such that 
				// a wireframe can be drawn using gl.LINES
				if(this.line_ibo == null) {
					this._CreateLineIBO();
				}

				this.material.Use(function(pass) {
					outer.vbo._Bind(pass.GetAttributeMap(), statepool);

					// See note in DrawNode()
					outer.line_ibo._Bind(statepool);

					gl.drawElements(gl.LINES,iboc * 2,outer.line_ibo.GetGlType(),0);

					++st.batches_frame;
					st.primitives_frame += iboc;

				}, statepool, 0xffffffff, change_flags);
				return;
			}


			// We have an ibo, but its creation data was not preserved
			this.ibo._Bind(statepool);
			this.material.Use(function(pass) {
				outer.vbo._Bind(pass.GetAttributeMap(), statepool);
				// TODO: this is super-slow, and it only draws 2/3 of each triangle
				if (outer.pt === medea.PT_TRIANGLES) {
					for (var i = 0; i < iboc/3; ++i) {
						++st.batches_frame;
						gl.drawElements(gl.LINE_STRIPS,3,outer.ibo.GetGlType(),i*3);
					}
					st.primitives_frame += Math.floor(iboc*2/3);
				}
			}, statepool);
		},

		// Updating BBs is well-defined for meshes, so make this functionality public
		UpdateBB : function() {
			this._AutoGenBB();
		},


		_CreateLineIBO : function() {

			if(this.ibo) {
				this.line_ibo = medea.CreateLineListIndexBufferFromTriListIndices(this.ibo);
			}
			else {
				this.line_ibo = medea.CreateLineListIndexBufferForUnindexedTriList( 
					this.vbo.GetItemCount() / 3 
				);
			}

		},

		_Calc_pt : function(v) {
			switch(this.pt) {
				case medea.PT_TRIANGLES:
					return v/3;
				case medea.PT_LINES:
					return v/2;
				case medea.PT_TRIANGLE_STRIPS:
					return v-2;
				case medea.PT_LINE_STRIPS:
					return v-1;
			};

		},

		_AutoGenBB : function() {
			this.bb = this.vbo.GetMinMaxVerts();
		}
	});
	
	
	var _mesh_cache = {
	
	};

	medea._mesh_cache = _mesh_cache;
	
	
	medea.QueryMeshCache = function(cache_name) {
		return _mesh_cache[cache_name];
	};
	

	// Assemble a medea.Mesh from a source of vertices, indices and a material.
	//
	// |vertices| can be a medea.VertexBuffer, or vertex data sources from which
	// to construct a medea.VertexBuffer (go there for the details).
	//
	// Same for |indices|.
	// |material_or_color| can be a color, in which case a plain default
	// material with that color is assigned.
	//
	// |flags| supports both index- and vertexbuffer specific creation flags. If
	// existing vertex and index buffers are passed in, |flags| are ignored.
	// Mesh will not be cached unless |cache_name| is given.
	medea.CreateSimpleMesh = function(vertices,indices, material_or_color, flags, cache_name, rq, pt, line_ibo) {

		if (indices && (Array.isArray(indices) || typeof indices === 'object' && !(indices instanceof medealib.Class))) {
			indices = medea.CreateIndexBuffer(indices,flags);
		}

		if (typeof vertices === 'object' && !(vertices instanceof medealib.Class)) {
			vertices = medea.CreateVertexBuffer(vertices,flags);
		}

		if (Array.isArray(material_or_color)) {
			material_or_color = medea.CreateSimpleMaterialFromColor(material_or_color);
		}

		var mesh = new medea.Mesh(vertices, indices, material_or_color, rq, pt, line_ibo);
		if (cache_name !== undefined) {
			_mesh_cache[cache_name] = mesh;
		}
		return mesh;
	};
	
	
	// Create clone of a mesh (sharing vbo and ibo).
	//
	// |material_or_color| is the material (or plain RGBA color) to use for
	// the cloned mesh. If this argument is omitted, the cloned mesh shares
	// the material of the original.
	//
	// To further specify how materials are shared between meshes, use
	// |medea.CloneMesh(mesh, medea.CloneMaterial(mesh.Material(), flags))|
	medea.CloneMesh = function(mesh, material_or_color) {
		return mesh._Clone(material_or_color);
	};
});



/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('billboard',['mesh'], function(medealib, undefined) {
	"use strict";
	var medea = this;

	var cnt_billboards = 0;

	// Creates a node that has an unit-size billboard attached to a node.
	//
	// This is for drawing singular billboards. Do not use to draw huge
	// amounts of billboards.
	//
	// By default, the texture is drawn with alpha blending, assuming
	// no pre-multiplied alpha. Pass |premultiplied_alpha| truthy to
	// assume pre-multiplied alpha.
	//
	// If |fixed_size| is true, the screen-size of the billboard is kept
	// constant. The world scaling of the node then determines the scaling
	// as if the billboard had a camera distance of 1.
	medea.CreateBillboardNode = function(texture, premultiplied_alpha, fixed_size) {
		var nd = medea.CreateNode("billboard_" + cnt_billboards++);

		var defines = {};
		if (fixed_size) {
			defines.FIXED_SIZE = '1';
		}

		var material = medea.CreateSimpleMaterialFromShaderPair('remote:mcore/shaders/billboard', {
			texture : medea.CreateTexture( texture ),
			scaling : function() {
				return nd.GetWorldUniformScale();
			},
		}, null, defines);
		var mesh = medea.CreateSimpleMesh({ 
				positions : [
				  0.0, 0.0, 0.0,
				  0.0, 0.0, 0.0,
				  0.0, 0.0, 0.0,
				  0.0, 0.0, 0.0
				], // !pos

				uvs: [[
					0.0,  0.0,
					1.0,  0.0,
					1.0,  1.0,
					0.0,  1.0
					]]
				},
			[
				0, 1, 2,     0, 2, 3  
			],
		material);

		material.Pass(0).CullFace(false);

		// The billboard is a plane mesh, but because it is aligned
		// with the camera axis, its bounding box is the unit cube.
		mesh.BB(medea.CreateBB([-1, -1, -1], [1, 1, 1]));
		
		if (premultiplied_alpha) {
			material.Pass(0).SetDefaultAlphaBlending();
		}
		else {
			material.Pass(0).SetDefaultAlphaBlendingNotPremultiplied();
		}
		mesh.RenderQueue(medea.RENDERQUEUE_ALPHA);

		nd.AddEntity(mesh);
		nd.SetStaticBB(medea.BB_INFINITE);
		return nd;
	};
});

/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('standardmesh',['mesh'],function(medealib, undefined) {
	"use strict";
	var medea = this;

	
	medea.STANDARD_MESH_SMOOTH_NORMALS 	= 0x1;
	medea.STANDARD_MESH_HARD_NORMALS 	= 0x2;
	medea.STANDARD_MESH_UVS 			= 0x4;
	
	medea.STANDARD_MESH_DEFAULT			= medea.STANDARD_MESH_UVS;
	
	
	medea.CreateStandardMesh_Plane = function(color_or_material) {
		return medea.CreateSimpleMesh(
		{ positions : [
			  -1.0, 0.0, -1.0,
			   1.0, 0.0, -1.0,
			   1.0, 0.0,  1.0,
			  -1.0, 0.0,  1.0
		], // !pos

		uvs: [[
			 // Front
			0.0,  0.0,
			1.0,  0.0,
			1.0,  1.0,
			0.0,  1.0
			]]
		},
			 // indices
			[
				0, 1, 2,     0, 2, 3   // bottom
			],
		color_or_material || [1.0,0.0,0.0]);
	};


	medea.CreateStandardMesh_Cube = function(color_or_material, flags) {
		flags = flags === undefined ? medea.STANDARD_MESH_DEFAULT : flags;
	
		var cache_name = "medea.CreateStandardMesh_Cube--"+flags;
		var cached = medea.QueryMeshCache(cache_name);
		if(cached) {
			return medea.CloneMesh(cached, color_or_material);
		}
		
		var vdata = { 
			positions :
				[ // (vertices taken from http://learningwebgl.com/blog/?p=370)
					 // Front face
				  -1.0, -1.0,  1.0,
				   1.0, -1.0,  1.0,
				   1.0,  1.0,  1.0,
				  -1.0,  1.0,  1.0,

				  // Back face
				  -1.0, -1.0, -1.0,
				  -1.0,  1.0, -1.0,
				   1.0,  1.0, -1.0,
				   1.0, -1.0, -1.0,

				  // Top face
				  -1.0,  1.0, -1.0,
				  -1.0,  1.0,  1.0,
				   1.0,  1.0,  1.0,
				   1.0,  1.0, -1.0,

				  // Bottom face
				  -1.0, -1.0, -1.0,
				   1.0, -1.0, -1.0,
				   1.0, -1.0,  1.0,
				  -1.0, -1.0,  1.0,

				  // Right face
				   1.0, -1.0, -1.0,
				   1.0,  1.0, -1.0,
				   1.0,  1.0,  1.0,
				   1.0, -1.0,  1.0,

				  // Left face
				  -1.0, -1.0, -1.0,
				  -1.0, -1.0,  1.0,
				  -1.0,  1.0,  1.0,
				  -1.0,  1.0, -1.0
			] // !pos
		};
		
		if(flags & medea.STANDARD_MESH_UVS) {
			vdata.uvs = [[
				 // Front
				0.0,  0.0,
				1.0,  0.0,
				1.0,  1.0,
				0.0,  1.0,
				// Back
				0.0,  0.0,
				1.0,  0.0,
				1.0,  1.0,
				0.0,  1.0,
				// Top
				0.0,  0.0,
				1.0,  0.0,
				1.0,  1.0,
				0.0,  1.0,
				// Bottom
				0.0,  0.0,
				1.0,  0.0,
				1.0,  1.0,
				0.0,  1.0,
				// Right
				0.0,  0.0,
				1.0,  0.0,
				1.0,  1.0,
				0.0,  1.0,
				// Left
				0.0,  0.0,
				1.0,  0.0,
				1.0,  1.0,
				0.0,  1.0
			]];
		}
		
		if(flags & medea.STANDARD_MESH_HARD_NORMALS) {
			vdata.normals =
				[ 
					 // Front face
				  0.0,  0.0,  1.0,
				  0.0,  0.0,  1.0,
				  0.0,  0.0,  1.0,
				  0.0,  0.0,  1.0,

				  // Back face
				  0.0, 0.0, -1.0,
				  0.0, 0.0, -1.0,
				  0.0, 0.0, -1.0,
				  0.0, 0.0, -1.0,

				  // Top face
				  0.0,  1.0, 0.0,
				  0.0,  1.0, 0.0,
				  0.0,  1.0, 0.0,
				  0.0,  1.0, 0.0,

				  // Bottom face
				  0.0, -1.0, 0.0,
				  0.0, -1.0, 0.0,
				  0.0, -1.0, 0.0,
				  0.0, -1.0, 0.0,

				  // Right face
				   1.0, 0.0, 0.0,
				   1.0, 0.0, 0.0,
				   1.0, 0.0, 0.0,
				   1.0, 0.0, 0.0,

				  // Left face
				  -1.0, 0.0, 0.0,
				  -1.0, 0.0, 0.0,
				  -1.0, 0.0, 0.0,
				  -1.0, 0.0, 0.0
				];
		}
		else if(flags & medea.STANDARD_MESH_SMOOTH_NORMALS) {
			vdata.normals = vdata.positions;
		}
		

	
		return medea.CreateSimpleMesh(
			vdata,

			 // indices
			[ 	0,  1,  2,      0,  2,  3,    // front
				4,  5,  6,      4,  6,  7,    // back
				8,  9,  10,     8,  10, 11,   // top
				12, 13, 14,     12, 14, 15,   // bottom
				16, 17, 18,     16, 18, 19,   // right
				20, 21, 22,     20, 22, 23    // left
			],
			color_or_material || [1.0,0.0,0.0],
			0,
			cache_name);
	};
});



/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('skybox',['material','standardmesh','cubetexture'],function(medealib, undefined) {
	"use strict";
	var medea = this;


	medea.CreateSkyboxNode = function(texbase) {
		var nd = medea.CreateNode("skybox");

		var mesh = medea.CreateStandardMesh_Cube(medea.CreateSimpleMaterialFromShaderPair('remote:mcore/shaders/skybox',{
			texture : medea.CreateCubeTexture( texbase )
		}));

		mesh.BB(medea.BB_INFINITE);

		
		mesh.RenderQueue(medea.RENDERQUEUE_BACKGROUND);
		mesh.Material().Passes().forEach( function(p) {
			p.State({
			'depth_test'  : true,
			'depth_write' : false,
			'cull_face' : true,
			'cull_face_mode' : 'front'
			});
		});

		nd.AddEntity(mesh);
		return nd;
	};
});


/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */
 // note: json2.js may be needed for contemporary browsers with incomplete HTML5 support
medealib.define('sceneloader_assimp2json',['mesh','filesystem', 'json2.js', 'continuation'],function(medealib, undefined) {
	"use strict";
	var medea = this;


	var LoadMaterial = function(w,material_idx) {
		if (w.materials[material_idx]) {
			return w.materials[material_idx];
		}
		var inmaterial = w.scene.materials[material_idx].properties, props = {};

		// scan for some common material properties and pass them on to
		// the user-defined material resolver, whose task is to match
		// those standard properties to the application's material
		// framework.
		for(var i = 0; i < inmaterial.length; ++i) {
			var prop = inmaterial[i];

			if(prop.key === '$clr.diffuse') {
				props['diffuse'] = prop.value;
			}
			else if(prop.key === '$clr.specular') {
				props['specular'] = prop.value;
			}
			else if(prop.key === '$clr.diffuse') {
				props['diffuse'] = prop.value;
			}
			else if(prop.key === '$clr.emissive') {
				props['emissive'] = prop.value;
			}
			else if(prop.key === '$mat.shininess') {
				props['shininess'] = prop.value;
			}
			else if(prop.key === '$mat.shadingm') {
				props['shading_model'] = {
					3 : 'Phong',
					4 : 'Blinn',
					5 : 'Toon'
				}[prop.value] || 'Gouraud';
			}
			else if(prop.key === '$tex.file') {
				var n = {
					1 : 'diffuse',
					2 : 'specular',
					3 : 'ambient',
					4 : 'emissive',
					5 : 'height',
					6 : 'normal',
					7 : 'shininess',
					8 : 'opacity'
				}[prop.semantic];

				if(n) {
					props[n+'_texture'] = prop.value;

				}
			}
		}

		var mat = w.materials[material_idx] = w.material_resolver(props);
		mat.imported_mat_data = props;
		return mat;
	};

	var LoadMesh = function(w,mesh_idx) {
		if (w.meshes[mesh_idx]) {
			return w.meshes[mesh_idx];
		}
		var inmesh = w.scene.meshes[mesh_idx];

		// requirements: only one primitive type per mesh, no polygons
		// this should always be fullfilled for scenes produced by the original assimp2json tool.
		if(inmesh.primitivetypes !== 1 && inmesh.primitivetypes !== 2 && inmesh.primitivetypes !== 4) {
			throw "expect pure, triangulated meshes with only a single type of primitives";
		}

		// the same applies to the number of unique vertices in the mesh -
		// with the original assimp2json tool, we can always fit them 
		// into 16 bit index buffers.
		if(inmesh.vertices.length > 65536 * 3) {
			throw "mesh size is too big, need to be able to use 16 bit indices";
		}

		var indices = new Array(inmesh.faces.length*inmesh.faces[0].length);
		for(var i = 0, n = 0, end = inmesh.faces.length; i < end; ++i) {
			var f = inmesh.faces[i];
			for(var j = 0, e = f.length; j < e; ++j, ++n) {
				indices[n] = f[j];
			}
		}

		// note: this modifies the input mesh, but copying would be too expensive
		// and would bring no extra value, after all we access each mesh only once.
		inmesh['positions'] = inmesh['vertices'];
		inmesh['uvs'] = inmesh['texturecoords'];

		// flip v component of UV coordinates
		if(inmesh['uvs']) {
			for(var i = 0; i < inmesh['uvs'].length; ++i) {
				var uv = inmesh['uvs'][i], c = inmesh['numuvcomponents'][i] || 2;
				for(var n = 0, e = uv.length/c; n < e; ++n) {
					uv[n*c+1] = 1.0-uv[n*c+1];
				}
			}
		}

		var outmesh = medea.CreateSimpleMesh(inmesh,indices,LoadMaterial(w,inmesh.materialindex));

		w.meshes[mesh_idx] = outmesh;
		return outmesh;
	};

	var LoadNode = function(w,anchor,node) {
		var outnd = anchor.AddChild(node.name);
		outnd.LocalTransform(mat4.transpose(mat4.create(node.transformation)), true);

		if(node.meshes) {
			for(var i = 0; i < node.meshes.length; ++i) {
				outnd.AddEntity(w.meshes[node.meshes[i]]);
			}
		}

		if(node.children) {
			for(var i = 0; i < node.children.length; ++i) {
				LoadNode(w,outnd,node.children[i]);
			}
		}
	};


	var LoadScene = function(scene, anchor, callback, material_resolver) {
		// batch the working set together in a dumpbin and pass it around 
		var working = {
			callback : callback,
			scene : scene,
			material_resolver : material_resolver,

			meshes : new Array(scene.meshes.length),
			materials : new Array(scene.materials.length)
		}
		,	cont, i, e;


		// loading meshes can take a bit on slower systems, so we have to spread
		// the work across multiple frames to avoid unresponsive script errors.
		cont = medea.CreateContinuation();

		// one job per mesh
		if(scene.meshes) {
			scene.meshes.forEach(function(m,i) {
				cont.AddJob(function() {
					LoadMesh(working, i);
				});
			});
		}

		// final assembly job
		cont.AddJob(function() {
			LoadNode(working, anchor, scene.rootnode);

			if (working.callback) {
				working.callback(medea.SCENE_LOAD_STATUS_GEOMETRY_FINISHED);
			}
		});

		cont.Schedule();
	};


	medea._LoadScene_assimp2json = function(src, anchor, callback, material_resolver) {
		medealib.DebugAssert(material_resolver, "need a valid material resolver");

		// see if we got a JSON DOM or a unparsed string
		if(src.rootnode === undefined) {
			try {
				src = JSON.parse(src);
			}
			catch(e) {
				return;
			}
		}

		try {
			LoadScene(src, anchor, callback, material_resolver);
		} 
		catch(e) {

			callback(false);
			return;
		} 
	};
}, ['_LoadScene_assimp2json']);




/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('viewport',['camera','renderqueue','statepool'],function(medealib, undefined) {
	"use strict";
	var medea = this, gl = medea.gl;

	var id_source = 0;

	var viewports = [];
	var enabled_viewports = 0, default_zorder = 0;


	// class Viewport
	medea.Viewport = medealib.Class.extend({
		name:"",
		w : 1.0,
		h : 1.0,
		x : 0.0,
		y : 0.0,
		zorder : 0,
		ccolor : [0.0,0.0,0.0,1.0],
		clearFlags : gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT,
		enabled : 0xdeadbeef,
		updated : true,
		renderer : null,
		visualizers : null,
		waiting_for_renderer_to_load : false,

		// no rendering happens until Renderer() is set to valid value
		init : function(name,x,y,w,h,zorder,camera,enable,renderer) {
			this.x = x || 0;
			this.y = y || 0;
			this.w = w || 1.0;
			this.h = h || 1.0;
			this.zorder = zorder || 0;
			this.id = id_source++;
			this.name = name || 'UnnamedViewport_' + this.id;
			this.renderer = renderer;
			this.visualizers = [];

			this.Camera(camera || medea.CreateCameraNode(this.name+'_DefaultCam'));

			// viewports are initially enabled since this is what
			// users will most likely want.
			this.Enable(enable);
		},


		AddVisualizer : function(vis) {
			if (this.visualizers.indexOf(vis) !== -1) {
				return;
			}

			var ord = vis.GetOrdinal();
			for (var i = 0; i < this.visualizers.length; ++i) {
				if (ord > this.visualizers[i].GetOrdinal()) {
					this.visualizers.insert(i,vis);
					vis._AddRenderer(this);
					return;
				}
			}
			this.visualizers.push(vis);
			vis._AddViewport(this);
		},


		RemoveVisualizer : function(vis) {
			var idx = this.visualizers.indexOf(vis);
			if(idx !== -1) {
				vis._RemoveViewport(this);
				this.visualizers.splice(idx,1);
			}
		},


		GetVisualizers : function() {
			return this.visualizers;
		},


		Name: medealib.Property('name'),
		Renderer: medealib.Property('renderer'),

		Enabled: function(f) {
			if(f === undefined) {
				return this.enabled;
			}
			this.Enable(f);
		},

		Enable: function(doit) {
			doit = doit === undefined ? true : doit;
			if (this.enabled === doit) {
				return;
			}

			this.enabled = doit;

			// changing the 'enabled' state of a viewport has global effect
			enabled_viewports += (doit?1:-1);
			medea.frame_flags |= medea.FRAME_VIEWPORT_UPDATED;

			this.updated = true;
		},

		GetZOrder: function() {
			return this.zorder;
		},

		ClearColor: function(col) {
			if( col === undefined) {
				return this.ccolor;
			}
			this.ccolor = col;
			this.updated = true;
		},

		Width: function(w) {
			if (w === undefined) {
				return this.w;
			}
			this.w = w;
			this.updated = true;
		},

		SetHeight: function(h) {
			if (h === undefined) {
				return this.h;
			}
			this.h = h;
			this.updated = true;
		},

		X: function(x) {
			if (x === undefined) {
				return this.x;
			}
			this.x = x;
			this.updated = true;
		},

		Y: function(y) {
			if (y === undefined) {
				return this.y;
			}
			this.y = y;
			this.updated = true;
		},

		Pos: function(x,y) {
			if (x === undefined) {
				return [this.x,this.y];
			}
			else if (Array.isArray(x)) {
				this.y = x[1];
				this.x = x[0];
			}
			else {
				this.y = y;
				this.x = x;
			}
			this.updated = true;
		},

		Size: function(w,h) {
			if (w === undefined) {
				return [this.w,this.h];
			}
			else if (Array.isArray(w)) {
				this.h = h[1];
				this.w = w[0];
			}
			else {
				this.h = h;
				this.w = w;
			}
			this.updated = true;
		},

		Rect: function(x,y,w,h) {
			if (x === undefined) {
				return [this.x,this.y,this.w,this.h];
			}
			else if (Array.isArray(x)) {
				this.w = x[3];
				this.h = x[2];
				this.y = x[1];
				this.x = x[0];
			}
			else {
				this.w = w;
				this.h = h;
				this.y = y;
				this.x = x;
			}
			this.updated = true;
		},

		GetAspect: function() {
			var c = medea.canvas;
			medealib.DebugAssert(c.width !== 0 && c.height !== 0, 'canvas width and height may not be 0');
			return (this.w*c.width)/(this.h*c.height);
		},

		Camera : function(cam) {
			if (cam === undefined) {
				return this.camera;
			}
			if (this.camera) {
				this.camera._OnSetViewport(null);
			}
			this.camera = cam;
			if (this.camera) {
				this.camera._OnSetViewport(this);
			}
		},

		// Utility to obtain the current camera world position
		// for this viewport. This handles the corner case
		// that a viewport need not have a camera and returns
		// [0, 0, 0] in this case.
		GetCameraWorldPos : function() {
			if (this.camera) {
				return this.camera.GetWorldPos();
			}
			return [0, 0, 0];
		},

		Render: function(dtime) {
			if (!this.enabled) {
				return;
			}
			if (!this.renderer) {
				if (this.waiting_for_renderer_to_load) {
					return;
				}
				this.waiting_for_renderer_to_load = true;
				medealib.LogDebug('viewport.Render() called, but no Renderer set. Loading ForwardRenderer');

				var outer = this;
				medea.LoadModules('forwardrenderer', function() {
					outer.Renderer(medea.CreateForwardRenderer());
				});
				return;
			}

			var renderer = this.renderer
			, rq = renderer.GetRQManager()
			, statepool = medea.GetDefaultStatePool()
			, cw
			, ch
			, cx
			, cy
			;

			// setup the viewport - we usually only need to do this if we're competing with other viewports
			if (enabled_viewports>1 || (medea.frame_flags & medea.FRAME_VIEWPORT_UPDATED) || this.updated) {
				var cw = medea.canvas.width, ch = medea.canvas.height;
				var cx = Math.floor(this.x*cw), cy = Math.floor(this.y*ch);
				cw = Math.floor(this.w*cw), ch = Math.floor(this.h*ch);

				if (this.clearFlags) {
					if (this.clearFlags & gl.COLOR_BUFFER_BIT) {
						var color = this.ccolor;
						gl.clearColor(color[0], color[1], color[2], color.length === 4 ? color[3] : 1.0);
					}

					gl.scissor(cx,cy,cw,ch);
				}

				gl.viewport(cx,cy,cw,ch);
			}

			// clear the viewport
			if (this.clearFlags) {
				gl.depthMask(true);
				gl.clear(this.clearFlags);
			}

			// let the camera class decide which items to render
			this.camera._FillRenderQueues(rq, statepool);
			renderer.Render(this, statepool);

			// Calling gl.flush() empirically improves performance at 
			// least with firefox.
			gl.flush();
			this.updated = false;
		}
	});


	medea.CreateViewport = function(name,x,y,w,h,zorder,camera,enable) {
		// if no z-order is given, default to stacking
		// viewports on top of each other in creation order.
		if (zorder === undefined) {
			zorder = default_zorder++;
		}

		var vp = new medea.Viewport(name,x,y,w,h,zorder,camera,enable);

		zorder = vp.GetZOrder();
		var vps = viewports;

		for(var i = 0; i < vps.length; ++i) {
			if (vps[i].GetZOrder() >= zorder) {
				vps.slice(i,0,vp);
				vps = null;
				break;
			}
		}

		if (vps) {
			vps.push(vp);
		}

		return vp;
	}

	medea.GetViewports = function() {
		return viewports;
	};

	medea.GetEnabledViewportCount = function() {
		return enabled_viewports;
	};
});




/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('lodmesh',['mesh'],function(medealib, undefined) {
	"use strict";
	var medea = this, gl = medea.gl;


	// Special render job that selects the most suitable LOD before
	// dispatching the draw command to the renderer.
	//
	// This ensures that, if a mesh is drawn multiple times in a scene,
	// the correct LOD is selected for each instance.
	//
	// See |medea.LODMesh._SelectLOD|, |medea.LODMesh._ComputeLODLevel|
	medea.LODMeshRenderJob = medea.MeshRenderJob.extend({
		
		Draw : function(renderer, statepool) {
			// This implicitly assumes that MeshRenderJob's distance
			// estimate is indeed the squared distance.
			this.mesh._SelectLOD(this.DistanceEstimate());
			renderer.DrawMesh(this, statepool);
		},
	});

	// Mesh with a simple LOD implementation that changes the index
	// buffer (but not the vertex buffer) depending on a function
	// of the distance to the camera.
	//
	// To tweak the LOD selection logic, yu have two options:
	//   1) Override |_SelectLOD| for full control. As control returns,
	//      |this.ibo| should be the actual IBO to use for rendering.
	//   2) Override |_ComputeLODLevel| to tweak the selection of the
	//      LOD index, but not change the way how this maps to IBOs.
	medea.LODMesh = medea.Mesh.extend({

		lod_attenuation_scale : 1,
		ibo_levels : null,
		ibo_creation_flags : 0,
		lod_offset : 0,

		init : function(vbo, ibo_levels, material, rq, pt, line_ibo, ibo_creation_flags) {
			// Submit a null IBO to the base class, we will update
			// |this.ibo| before drawing.
			this._super(vbo, null, material, rq, pt, line_ibo);

			this.ibo_creation_flags = ibo_creation_flags | 0;
			this.ibo_levels = ibo_levels;
		},

		Render : function(viewport, node, rqmanager) {
			// Construct a renderable capable of drawing this mesh with the correct LOD
			rqmanager.Push(this.rq_idx, new medea.LODMeshRenderJob(this, node, viewport));
		},

		LODAttenuationScale :  medealib.Property('lod_attenuation_scale'),
		LODOffset :  medealib.Property('lod_offset'),

		_Clone : function(material_or_color) {
			var mesh = medea.CreateLODMesh(this.vbo, this.ibo_levels,
				material_or_color || this.Material(),
				this.rq,
				this.pt,
				this.line_ibo, 
				this.ibo_creation_flags);

			// Copy BB: this is necessary if this.BB has been
			// manually specified as opposed to the BB being
			// derived from the VBO's extents.
			mesh.BB(this.BB());
			mesh.LODAttenuationScale(this.LODAttenuationScale());
			mesh.LODOffset(this.LODOffset());
			return mesh;
		},

		_ComputeLODLevel : function(sq_distance) {
			// Multiply by two to undo the square in log space
			var log_distance = Math.log(sq_distance * 0.0001) * 2 * this.lod_attenuation_scale;
			return Math.max(0, Math.min(this.ibo_levels.length - 1,
				~~log_distance + this.lod_offset));
		},

		_SelectLOD : function(sq_distance) {
			var lod = this._ComputeLODLevel(sq_distance);

			// Eval the LOD level as needed
			var indices = this.ibo_levels[lod];

			if (typeof indices == "function") {
				indices = this.ibo_levels[lod] = indices();
			}
			if (Array.isArray(indices) && typeof indices === 'object' && !(indices instanceof medealib.Class)) {
				indices = this.ibo_levels[lod] = medea.CreateIndexBuffer(indices, this.ibo_creation_flags);
			}
			
			this.ibo = indices;
			return 0;
		}
	});

	// Variant of |medea.CreateSimpleMesh| for creating LOD meshes.
	//
	// |ibo_levels| is an array of the index buffer sources for all
	// supported LOD levels. Each entry can be one of:
	//
	//  1) Array of indices
	//  2) medea.IndexBuffer
	//  3) function() -> |medea.IndexBuffer|
	//
	//  Unlike CreateSimpleMesh(), 1) and 3) are not evaluated immediately but
	//  the first time the respective LOD level is requested.
	//
	// Supports both index- and vertexbuffer specific |flags|.
	//
	// Mesh will not be cached unless |cache_name| is given.
	medea.CreateLODMesh = function(vertices, ibo_levels, material_or_color, flags, cache_name, rq, pt, line_ibo) {
		if (typeof vertices === 'object' && !(vertices instanceof medealib.Class)) {
			vertices = medea.CreateVertexBuffer(vertices,flags);
		}

		if (Array.isArray(material_or_color)) {
			material_or_color = medea.CreateSimpleMaterialFromColor(material_or_color);
		}

		var mesh = new medea.LODMesh(vertices, ibo_levels, material_or_color, rq, pt, line_ibo);
		if (cache_name !== undefined) {
			medea._mesh_cache[cache_name] = mesh;
		}
		return mesh;
	};
});

/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('terraintile',['worker_terrain','image','lodmesh','indexbuffer'],function(medealib, undefined) {
	"use strict";
	var medea = this;

	// Populate |ind| with indices to draw a terrain tile of size |qtx| * |qty| quads
	// while only using every |divisor| row and column in the source space.
	medea._GenHeightfieldIndicesSkip = function(ind, qtx, qty, divisor) {
		var min = Math.min;

		// Index the terrain patch in groups of 3x3 vertex quads to improve vertex cache locality
		// Each group then uses 16 unique vertices, which should be a reasonable PTVC cache size
		var out = 0;
		var groups_x = (qtx+3)/4;
		var groups_y = (qty+3)/4;

		var row_pitch = (qtx * divisor + 1) * divisor;

		for (var ty = 0; ty < groups_y; ++ty) {
			for (var tx = 0; tx < groups_x; ++tx) {
				var xbase = tx * 4;
				var ybase = ty * 4;
				var base_index = divisor * ybase * (qtx * divisor + 1) + xbase * divisor;

				var group_h = min(ybase + 4, qty);
				var group_w = min(xbase + 4, qtx);

				var row_offset = row_pitch - (group_w - xbase) * divisor;
				for (var y = ybase; y < group_h; ++y, base_index += row_offset) {
					for (var x = xbase; x < group_w; ++x, base_index += divisor) {

						ind[out++] = base_index;
						ind[out++] = base_index + row_pitch;
						ind[out++] = base_index + divisor;

						ind[out++] = base_index + row_pitch;
						ind[out++] = base_index + row_pitch + divisor;
						ind[out++] = base_index + divisor;
					}
				}
			}
		}

		return out;
	};


	// TODO: clean up everything below this line. It doesn't need to be that messy,
	// making a terrain is not rocket science.


	medea._HeightfieldFromEvenSidedHeightmap = function(tex, scale, xz_scale, t, v) {
		var data = tex.GetData(), w = tex.GetWidth(), h = tex.GetHeight();

		var c = (w+1)*(h+1);
		var pos = new Array(c*3);

		// this is the index of the "up" output component, left flexible for now.
		v = v === undefined ? 1 : v;
		var v2 = (v+1) % 3, v3 = (v2+1) % 3;

		// this is the index of the RGBA component that contains the color data
		t = t === undefined ? 0 : t;

		// height scaling
		scale = scale || w/(16*16*16);
		var scale2 = scale/2, scale4 = scale2/2;
		xz_scale = xz_scale || 1.0;

		// a vertex is the average height of all surrounding quads,
		// a 4x4 heightmap yields a 5x5 point field, so LOD works
		// by leaving out indices.
		var pitch = w*4, opitch = (w+1) * 3;
		for (var y = 1, yb = pitch, oyb = opitch; y < h; ++y, yb += pitch, oyb += opitch) {
			for(var x = 1, ob = oyb + 3; x < w; ++x, ob += 3) {
				var b = yb+x*4;

				pos[ob+v] = scale4 * ( data[b+t] + data[b-4+t] + data[b-pitch+t] + data[b-pitch-4+t] );
			}
		}

		// y == 0 || y == h
		for(var x = 1, lasty = opitch*h, lastyin = pitch*(h-1); x < w; ++x) {
			pos[x*3+v] = scale2 * ( data[x*4+t] + data[x*4-4+t] );
			pos[lasty+x*3+v] = scale2 * ( data[lastyin+x*4-pitch+t] + data[lastyin+x*4-pitch-4+t] );
		}

		// x == 0 || x == w
		for (var y = 1, yb = pitch, oyb = opitch; y < h; ++y, yb += pitch, oyb += opitch) {
			pos[oyb+v] = scale2 * ( data[yb+t] + data[yb-pitch+t] );
			pos[oyb+(opitch-3)+v] = scale2 * ( data[yb-4+t] + data[yb-4-pitch+t] );
		}

		// x == 0 && y == 0
		pos[v] = scale*data[t];

		// x == w && y == 0
		pos[v + w*3] = scale*data[t + pitch-4];

		// x == 0 && y == h
		pos[v + h*opitch] = scale*data[t + (h-1)*pitch];

		// x == w && y == h
		pos[v + h*opitch + w*3] = scale*data[t + (h*pitch)-4];

		// populate the two other components
		for (var y = 0, c = 0; y <= h; ++y) {
			for (var x = 0; x <= w; ++x, c+=3) {
				pos[c+v2] = y * xz_scale;
				pos[c+v3] = x * xz_scale;
			}
		}


		return [pos,w+1,h+1];
	};

	medea._HeightfieldFromEvenSidedHeightmapPart = function(tex, xs, ys, w, h, scale, xz_scale, t, v) {
		var data = tex.GetData(), fullw = tex.GetWidth(), fullh = tex.GetHeight();


		var c = (w+1)*(h+1);
		var pos = new Float32Array(c*3);

		// this is the index of the "up" output component, left flexible for now.
		v = v === undefined ? 1 : v;
		var v2 = (v+1) % 3, v3 = (v2+1) % 3;

		// this is the index of the RGBA component that contains the color data
		t = t === undefined ? 0 : t;

		// height scaling
		scale = scale || w/(16*16*16);
		var scale2 = scale/2, scale4 = scale2/2;
		xz_scale = xz_scale || 1.0;

		// a vertex is the average height of all surrounding quads,
		// a 4x4 heightmap yields a 5x5 point field, so LOD works
		// by leaving out indices.
		var pitch = fullw*4, opitch = (w+1) * 3;
		for (var y = 1, yb = pitch*(1+ys), oyb = opitch; y < h; ++y, yb += pitch, oyb += opitch) {
			for(var x = 1+xs, ob = oyb + 3; x < w+xs; ++x, ob += 3) {
				var b = yb+x*4;

				pos[ob+v] = scale4 * ( data[b+t] + data[b-4+t] + data[b-pitch+t] + data[b-pitch-4+t] );
			}
		}

		// y == 0 || y == h
		for(var x = xs+1, lasty = opitch*h, ybase = ys*pitch, lastyin = pitch*(ys+h-1); x < w+xs; ++x) {
			pos[(x-xs)*3+v] = scale2 * ( data[ybase+x*4+t] + data[ybase+x*4-4+t] );
			pos[lasty+(x-xs)*3+v] = scale2 * ( data[lastyin+x*4+t] + data[lastyin+x*4-4+t] );
		}

		// x == 0 || x == w
		for (var y = ys+1, yb = pitch*(1+ys) + xs*4, oyb = opitch; y < h+ys; ++y, yb += pitch, oyb += opitch) {
			pos[oyb+v] = scale2 * ( data[yb+t] + data[yb-pitch+t] );
			pos[oyb+(opitch-3)+v] = scale2 * ( data[yb+w*4+t] + data[yb+w*4-pitch+t] );
		}

		// x == 0 && y == 0
		pos[v] = scale*data[t + pitch*ys + xs*4];

		// x == w && y == 0
		pos[v + w*3] = scale*data[t + pitch-4*(1+fullw-w-xs) + pitch*ys];

		// x == 0 && y == h
		pos[v + h*opitch] = scale*data[t + (ys+h-1)*pitch + xs*4];

		// x == w && y == h
		pos[v + h*opitch + w*3] = scale*data[t + ((ys+h)*pitch)-4*(1+fullw-w-xs)  + xs*4];

		// populate the two other components
		for (var y = 0, c = 0; y <= h; ++y) {
			for (var x = 0; x <= w; ++x, c+=3) {
				pos[c+v2] = y * xz_scale;
				pos[c+v3] = x * xz_scale;
			}
		}


		return [pos,w+1,h+1];
	};

	medea._HeightfieldFromOddSidedHeightmapPart = function(tex, xs, ys, w, h, scale, xz_scale, t, v) {
		var data = tex.GetData(), fullw = tex.GetWidth(), fullh = tex.GetHeight();


		var c = w*h;
		var pos = new Float32Array(c*3);

		// this is the index of the "up" output component, left flexible for now.
		v = v === undefined ? 1 : v;
		var v2 = (v+1) % 3, v3 = (v2+1) % 3;

		// this is the index of the RGBA component that contains the color data
		t = t === undefined ? 0 : t;

		scale = scale || w/(16*16*16);
		xz_scale = xz_scale || 1.0;

		var pitch = fullw*4;
		for (var y = 0, c = 0, inb = ys*pitch + xs*4; y < h; ++y, inb += pitch) {
			for (var x = 0; x < w; ++x, c+=3) {

				pos[c+v ] = data[inb + x*4 + t] * scale;
				pos[c+v2] = y * xz_scale;
				pos[c+v3] = x * xz_scale;
			}
		}

		return [pos,w,h];
	};

	medea._HeightfieldFromOddSidedHeightmap = function(tex,scale, xz_scale, t, v) {
		return medea._HeightfieldFromOddSidedHeightmapPart(tex,0,0,tex.GetWidth(),tex.GetHeight(),scale,xz_scale, t,v);
	};

	medea._GenHeightfieldIndices = function(ind, qtx, qty) {
		return medea._GenHeightfieldIndicesWithHole(ind, qtx, qty, 0, 0, 0, 0);
	};

	medea._GenHeightfieldIndicesLOD = function(ind, qtx, qty) {
		return medea._GenHeightfieldIndicesWithHoleLOD(ind, qtx, qty, 0, 0, 0, 0);
	};

	medea._GenHeightfieldIndicesWithHole = function(ind, qtx, qty, holex, holey, holew, holeh) {
		var min = Math.min;


		holew += holex;
		holeh += holey;

		// index the terrain patch in groups of 3x3 vertex quads to improve vertex cache locality
		for (var ty = 0, out = 0; ty < (qty+3)/4; ++ty) {
			for (var tx = 0; tx < (qtx+3)/4; ++tx) {
				var fullx = tx*4, fully = ty*4;

				var last_x = 0;
				for (var y = fully,bc=fully*(qtx+1)+fullx; y < min(fully+4,qty); ++y,bc+=(qtx+1)-last_x) {
					for (var x = fullx; x < min(fullx+4,qtx); ++x,++bc) {

						last_x = x + 1 - fullx;
						if (x >= holex && x < holew && y >= holey && y < holeh) {
							continue;
						}

						ind[out++] = bc;
						ind[out++] = bc+qtx+1;
						ind[out++] = bc+1;

						ind[out++] = bc+qtx+1;
						ind[out++] = bc+qtx+2;
						ind[out++] = bc+1;

					}
				}
			}
		}

		return out;
	};

	medea._GenHeightfieldIndicesWithHoleLOD = function(ind, qtx, qty, holex, holey, holew, holeh) {
		var min = Math.min;


		holew += holex;
		holeh += holey;

		var row = qtx+1;

		// index the terrain patch in groups of 4x4 quads to improve vertex cache locality
		for (var ty = 0, out = 0; ty < (qty+3)/4; ++ty) {
			for (var tx = 0; tx < (row+2)/4; ++tx) {
				var fullx = tx*4, fully = ty*4;

				for (var y = fully,cur=fully*(qtx+1)+fullx; y < min(fully+4,qty); ++y,cur+=(qtx+1)-4) {
					for (var x = fullx; x < min(fullx+4,qtx); ++x,++cur) {

						if (x >= holex && x < holew && y >= holey && y < holeh) {
							continue;
						}

						// XXX this code leaves small overlap region in all corners, also
						// some profiling may be required to see how to squeeze the most
						// out of V8/Gecko
						var reg = true;
						if (!x) {
							reg = false;
							if (!(y % 2) && y < qty-1) {
								ind[out++] = cur+row+row;
								ind[out++] = cur+row+1;
								ind[out++] = cur;

								ind[out++] = cur+row+row;
								ind[out++] = cur+row+1+row;
								ind[out++] = cur+row+1;

								ind[out++] = cur;
								ind[out++] = cur+row+1;
								ind[out++] = cur+1;
							}
						}
						else if (x === qtx-1) {
							reg = false;
							if (!(y % 2) && y < qty-1) {
								ind[out++] = cur;
								ind[out++] = cur+row;
								ind[out++] = cur+1;

								ind[out++] = cur+row;
								ind[out++] = cur+row+row;
								ind[out++] = cur+row+row+1;

								ind[out++] = cur+row;
								ind[out++] = cur+row+row+1;
								ind[out++] = cur+1;
							}
						}

						if (!y) {
							if (!(x % 2) && x < qtx-1) {
								ind[out++] = cur+row;
								ind[out++] = cur+row+1;
								ind[out++] = cur;

								ind[out++] = cur;
								ind[out++] = cur+row+1;
								ind[out++] = cur+2;

								ind[out++] = cur+row+1;
								ind[out++] = cur+row+2;
								ind[out++] = cur+2;
							}
						}
						else if (y === qty-1) {
							if (!(x % 2) && x < qtx-1) {
								ind[out++] = cur;
								ind[out++] = cur+row;
								ind[out++] = cur+1;

								ind[out++] = cur+row;
								ind[out++] = cur+row+2;
								ind[out++] = cur+1;

								ind[out++] = cur+1;
								ind[out++] = cur+row+2;
								ind[out++] = cur+2;
							}
						}

						else if (reg) {
							ind[out++] = cur;
							ind[out++] = cur+row;
							ind[out++] = cur+1;

							ind[out++] = cur+row;
							ind[out++] = cur+row+1;
							ind[out++] = cur+1;
						}
					}
				}
			}
		}

		return out;
	};


	var cached_terrain_ibos = {

	};

	// Obtain a cached terrain index buffer for the given 0 <= |lod| of
	// a |w| x |h| quad terrain.
	//
	// Require |w| and |h| to be multiple of |1 << lod|
	medea.GetTerrainIndexBuffer = function(w, h, lod) {
		var key = w + '_' + h + '_' + lod;
		var ibo = cached_terrain_ibos[key];
		if (ibo) {
			return ibo;
		}

		var divisor = 1 << lod;
		w /= divisor;
		h /= divisor;

		var indices = new Array((w + 1) * (h + 1) * 2 * 3);
		medea._GenHeightfieldIndicesSkip(indices, w, h, divisor);
		ibo = cached_terrain_ibos[key] = medea.CreateIndexBuffer(indices);
		return ibo;
	};


	medea.DEFAULT_TERRAIN_LOD_LEVELS = 5;

	// Create a LODMesh of a terrain tile using |height_map| as source bitmap,
	// where |height_map| can be either a URL to fetch from, an |Image| or
	// an |medea.Image|. Prefer |medea.Image| if multiple terrain tiles are
	// created from the same source image, this avoids drawing to canvas
	// multiple times.
	//
	// |xs|, |ys|, |w|, |h| describe a subset of the source |height_map| to use.
	// |w| and |h| must be a power-of-two size.
	//
	// If omitted, the entire height map is made a mesh. In this case, the
	// source height map must either be of power-of-two resolution, or
	// power-of-two plus one (i.e. 129x129).
	//
	// The created terrain tile is in all cases a grid of quads with a
	// power-of-two number of quads on each axis.
	//
	// |lod_levels| is the number of LOD levels for which index buffers
	// are added to the LODMesh. It defaults to |medea.DEFAULT_TERRAIN_LOD_LEVELS|
	medea.CreateTerrainTileMesh = function(height_map, material, callback, xs, ys, ws, hs, lod_levels) {
		var init = function(tex) {
			lod_levels = lod_levels || medea.DEFAULT_TERRAIN_LOD_LEVELS;
			var data = tex.GetData(), w = tex.GetWidth(), h = tex.GetHeight();


			var v;

			// Multiple legacy or non-legacy ways of deriving a terrain tile from an image
			// The preferred way is to use an explicit rectangle.
			if (ws > 0 && hs > 0) {

				xs = xs || 0;
				ys = ys || 0;
				v = medea._HeightfieldFromOddSidedHeightmapPart(tex, xs, ys, ws + 1, hs + 1, 1, 1);
			}
			else if (medea._IsPow2(w) && medea._IsPow2(h)) {
				v = medea._HeightfieldFromEvenSidedHeightmap(tex);
			}
			else if (medea._IsPow2(w-1) && medea._IsPow2(h-1)) {
				v = medea._HeightfieldFromOddSidedHeightmap(tex);
				--w, --h;
			}
			else {
				return;
			}

			var pos = v[0], wv = v[1], hv = v[2];

			var nor = new Float32Array(pos.length);
			var tan = new Float32Array(pos.length);
			var bit = new Float32Array(pos.length);
			medea._GenHeightfieldTangentSpace(pos, wv, hv, nor, tan, bit);

			var uv = new Float32Array(wv * hv * 2);
			medea._GenHeightfieldUVs(uv,wv,hv);

			var lod_ibos = new Array(lod_levels);
			for (var i = 0; i < lod_levels; ++i) {
				lod_ibos[i] = medea.GetTerrainIndexBuffer(wv - 1, hv - 1, i);
			}

			var vertex_channels = {
				positions: pos,
				normals: nor,
				uvs: [uv]
			};

			var mesh = medea.CreateLODMesh(vertex_channels, lod_ibos, material);
			callback(mesh);
		};

		if (height_map instanceof medea.Image) {
			init(height_map);
			return;
		}
		medea.CreateImage(height_map, init);
	};


	// Create a LODMesh of a completely planar terrain tile.
	//
	// The resulting mesh has only positions and UV coordinates, except
	// if |no_uvs| is truthy in which case it has only positions.
	//
	// |w| and |h| must be a power-of-two size.
	//
	// |lod_levels| is the number of LOD levels for which index buffers
	// are added to the LODMesh. It defaults to |medea.DEFAULT_TERRAIN_LOD_LEVELS|.
	//
	// Note: the resulting mesh has a zero-volume bounding box that should
	// be changed to a more sensible value.
	medea.CreateFlatTerrainTileMesh = function(material, w, h, lod_levels, no_uvs) {
		lod_levels = lod_levels || medea.DEFAULT_TERRAIN_LOD_LEVELS;


		var pos = new Float32Array((w + 1) * (h + 1) * 3);
		for (var y = 0, cursor = 0; y <= h; ++y) {
			for (var x = 0; x <= w; ++x) {
				pos[cursor++] = x; 
				pos[cursor++] = 0.0; 
				pos[cursor++] = y; 
			}
		}

		var uv = null;
		if (!no_uvs) {
			uv = new Float32Array((w + 1) * (h + 1) * 2);
			medea._GenHeightfieldUVs(uv, w + 1, h + 1);
		}

		var lod_ibos = new Array(lod_levels);
		for (var i = 0; i < lod_levels; ++i) {
			lod_ibos[i] = medea.GetTerrainIndexBuffer(w, h, i);
		}

		var vertex_channels = {
			positions: pos,
		};

		if (uv) {
			vertex_channels.uvs = [uv];
		}

		return medea.CreateLODMesh(vertex_channels, lod_ibos, material);
	};
});


/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

 // note: json2.js may be needed for contemporary browsers with incomplete HTML5 support
medealib.define('terrain',[,'worker_terrain','terraintile', 'json2.js'],function(medealib, undefined) {
	"use strict";
	var medea = this;

	
	


	medea.TERRAIN_MATERIAL_ENABLE_VERTEX_FETCH = 0x1;


	var terrain_ib_cache = {
	};

	var sample_3x3_weights = [
		[0.05, 0.1, 0.05],
		[0.1, 0.4, 0.1],
		[0.05, 0.1, 0.05]
	];

	var FixTexturePaths = function(constants, url_root) {
		for(var k in constants) {
			var v = constants[k];
			if (typeof v === 'string') {
				if (v[0] === '.' && v[1] === '/') {
					constants[k] = url_root + v.slice(1);
				}
			}
			else if (typeof v === 'object') {
				FixTexturePaths(v, url_root);
			}
		}
	};

	var TerrainDefaultSettings = {
		use_vertex_fetch : false,
		use_worker : true,
		camera_timeout : 1000,
		update_treshold : 0.4,
		no_mens : 0.1,
	};

	var DefaultTerrainDataProvider = medealib.Class.extend({

		desc : null,

		init : function(info, url_root) {
			try {
				this.desc = JSON.parse(info);
			}
			catch(e) {
				return;
			}


			var w = Math.min(this.desc.size[0],this.desc.size[1]), cnt = 0;
			for (; w >= 1; ++cnt, w /= 2);
			this.lod_count = cnt;

			this.desc.base_hscale = this.desc.base_hscale || 1.0/255.0;

			this.url_root = url_root || this.desc.url_root || '';
			this.maps_bysize = {};
			this.fetch_queue = [];
			this.materials = {};
		},

		GetSize : function() {
			return this.desc.size;
		},

		GetWidth : function() {
			return this.desc.size[0];
		},

		GetHeight : function() {
			return this.desc.size[1];
		},

		GetLODCount : function() {
			return this.lod_count;
		},

		GetUnitBase : function() {
			return this.desc.unitbase;
		},

		GetScale : function() {
			return this.desc.scale;
		},

		TryGetHeightAtPos : function(x,y) {
			var map = this._FindLOD(this.desc.size[0],this.desc.size[1]);
			if(!map) {
				return null;
			}

			var iw = map._cached_img[0].GetWidth(), ih = map._cached_img[0].GetHeight();
			var xx = Math.floor(iw * x/this.desc.size[0]), yy = Math.floor(ih * y/this.desc.size[1]);

			// sample the 9 surrounding pixels using a (somewhat) gaussian convolution kernel
			var h = 0.0, hs = this.desc.base_hscale, weights = sample_3x3_weights;
			for( var n = -1; n <= 1; ++n) {
				for( var m = -1; m <= 1; ++m) {
					h += map._cached_img[0].PixelComponent(xx+n, yy+m,0) * hs * weights[n+1][m+1];
				}
			}

			return h * this.desc.scale[1];
		},

		// request a given rectangle on the terrain for a particular 'wanthave' LOD
		// callback is invoked as soon as this LOD level is available.
		RequestLOD : function(x,y,w,h,lod,callback)  {
			var wx = this.desc.size[0] / (1 << lod), hx = this.desc.size[1] / (1 << lod);
			var match = this._FindLOD(wx,hx);

			if (!match) {
				// load a suitable map
				for(var i = 0; i < this.desc.maps.length; ++i) {
					var m = this.desc.maps[i];
					if (!m.img) {
						continue;
					}

					if (m.size[0] == wx && m.size[1] == hx) {
						var outer = this;
						this._FetchMap(m, function() {
							outer.RequestLOD(x,y,w,h,lod,callback);
						});

						break;
					}
				}
				return;
			}

			callback([x,y,w,h,lod,match]);
		},

		// sample a given LOD and generate a field of terrain vertices from the
		// data.
		SampleLOD : function(x,y,w,h,lod) {
			var match = null;
			if (Array.isArray(x)) {
				y = x[1];
				w = x[2];
				h = x[3];
				lod = x[4];
				match = x[5];
				x = x[0];
			}

			if (!match) {
				var wx = this.desc.size[0] / (1 << lod), hx = this.desc.size[1] / (1 << lod);
				match = this._FindLOD(wx,hx);
			}

			var real_scale = match.size[0]/this.desc.size[0];

			var want_scale = 1/(1 << lod);

			x = Math.floor(x*2.0)*0.5;
			y = Math.floor(y*2.0)*0.5;
			w = Math.floor(w);
			h = Math.floor(h);

			var ub = Math.floor(this.desc.unitbase * real_scale);
			var xx = x*ub, yy = y*ub, ww = w*ub, hh = h*ub;

			var sbase = real_scale/want_scale;

			var hf = this._CreateHeightField(match._cached_img[0], xx, yy, ww, hh,
				sbase*this.desc.scale[1]*this.desc.base_hscale,
				sbase*this.desc.scale[0]);

			return [hf[0],hf[1],hf[2],x,y];
		},

	
		SetupVertexFetchParams : function(tup, material, ppos) {
			// extract parameters
			var x = tup[0];
			var y = tup[1];
			var w = tup[2];
			var h = tup[3];
			var lod = tup[4];
			var match = tup[5];

			var sx = this.desc.size[0], sy = this.desc.size[1];
			var ilod = (1 << lod);

			if (!match) {
				var wx = sx / ilod, hx = sy / ilod;
				match = this._FindLOD(wx,hx);
			}

			var real_scale = match.size[0]/sx;


			var tex = match._cached_img[1];
			
			var want_scale = 1/ilod;
			var ub = this.desc.unitbase, iub = 1/ub, ox = x, oy = y;
			
			x = Math.floor(x*ub)/ub;
			y = Math.floor(y*ub)/ub;
			w = Math.floor(w);
			h = Math.floor(h);
			
			var sbase = real_scale/want_scale;
			var uv = [x / sx, y / sy, w / sx, w / sy];
			
			// the original height data is (pow2+1)^2, but we cropped
			// it to pow2^2. This means UV coordinates need adjustment
			// to account for this.
			var bias = tex.GetPaddingCompensationFactor();
			uv[0] *= bias[0];
			uv[1] *= bias[1];
			uv[2] *= bias[0];
			uv[3] *= bias[1];

			// and this is to move the sampling point to the center of
			// a texel, which effectively disables any filtering no
			// matter if we turn it on or off.
			uv[0] += 0.5/tex.GetGlTextureWidth();
			uv[1] += 0.5/tex.GetGlTextureHeight();
			
			var wpos = [
				ppos[0] + ub*(x-ox),
				0,
				ppos[2] + ub*(y-oy)
			];
			
			var sc = this.desc.scale;
			var wscale = [
				ilod*sc[0],
				sbase*sc[1],
				ilod*sc[0]
			];
			
			var uvdelta = [
				uv[2] / ub,
				uv[3] / ub,
				1.0,
				0 // fourth component must be 0, see the default shader for the details
			];
			
			var uvoffset = [
				(x-Math.floor(ox)),
				(y-Math.floor(oy))
			];

			material.Passes().forEach(function(pass) {
				pass.Set('_tvf_range',uv);
				pass.Set('_tvf_scale',wscale);
				pass.Set('_tvf_wpos',wpos);
				pass.Set('_tvf_uvdelta',uvdelta);
				pass.Set('_tvf_uvoffset',uvoffset);
				pass.Set('_tvf_height_map',tex);
			});
		},


		_FindLOD : function(w,h) {
			if (!w || !h) {
				return null;
			}
			var k = w + '_'+ h;
			k = this.maps_bysize[k];
			return k || this._FindLOD(w/2,h/2);
		},

		Update : function() {
			// never try to fetch more than one map a frame, and always start with smaller maps
			var smallest = 1e10, match = -1;
			for( var i = 0; i < this.fetch_queue.length; ++i) {
				if (this.fetch_queue[i][2]) {
					continue;
				}

				var map = this.fetch_queue[i][0], size = map.size[0] * map.size[1];

				if (size < smallest) {
					match = i;
					smallest = size;
				}
			}

			if (match !== -1) {
				var outer = this, map = this.fetch_queue[match][0], clbs = this.fetch_queue[match][1];

				this.fetch_queue[match][2] = true;
				medea.CreateImage(this.url_root + '/' + map.img, function(image) {;
					medea.CreateTexture(image.GetImage(), function(tex) {
						map._cached_img = [image, tex];
						outer._RegisterMap(map);

						for( var i = 0; i < clbs.length; ++i) {
							clbs[i]();
						}

						for( var i = 0; i < outer.fetch_queue.length; ++i) {
							if (outer.fetch_queue[i][0] == map) {
								outer.fetch_queue.splice(i,1);
								break;
							}
						}
					},

					// Flags:

					// preserve the original image data (even if vertex fetching is active,
					// we need it for height queries.
					medea.TEXTURE_FLAG_KEEP_IMAGE |

					// we don't know whether we need the texture data on the GPU
					medea.TEXTURE_FLAG_LAZY_UPLOAD |

					// no MIP maps, if any, we need only vertex shader access where
					// the gradients for MIP map sampling aren't available anyway.
					medea.TEXTURE_FLAG_NO_MIPS |

					// non power of two input data should be padded, not scaled
					// to preserve the original pixel data. The down side is that we
					// need to do some manual corrections in the shaders.
					medea.TEXTURE_FLAG_NPOT_PAD,


					// Format:

					// only one component needed, input image is grayscale anyway
					medea.TEXTURE_FORMAT_LUM,


					// Overwrite size to make sure 4097x407 inputs won't get padded
					// to 8096x8096, which kills almost all memory limits.
					map.size[0] * outer.desc.unitbase,
					map.size[1] * outer.desc.unitbase
					);
				});
			}
		},

		GetMaterial : function(lod, behaviour_flags) {
			var key = lod + '_' + behaviour_flags;
			if (this.materials[key]) {
				return medea.CloneMaterial(this.materials[key], medea.MATERIAL_CLONE_SHARE_STATE);
			}

			if (!this.desc.materials[lod]) {
				return null;
			}

			var mat = this.desc.materials[lod];
			if(mat.clonefrom !== undefined) {
				return this.materials[key] = this.GetMaterial(mat.clonefrom,
					behaviour_flags);
			}

			var name = this.url_root + '/' + mat.effect, constants = mat.constants;

			var defines = {};
			if (behaviour_flags & medea.TERRAIN_MATERIAL_ENABLE_VERTEX_FETCH) {
				defines['ENABLE_TERRAIN_VERTEX_FETCH'] = null;
			}

			// make texture paths absolute
			FixTexturePaths(constants, this.url_root);
			var m = new medea.Material(medea.CreatePassFromShaderPair(name,constants,undefined,defines));
			this.materials[key] = m;

			// enable culling unless the user disables it explicitly
			var p = m.Passes();
			for(var i = 0; i < p.length; ++i) {
				var s = p[i].State();

				if ( ('cull_face' in s) || ('cull_face_mode' in s)) {
					continue;
				}
				s.cull_face = true;
				s.cull_face_mode = 'back';
			}

			return m;
		},

		_RegisterMap : function(map) {

			this.maps_bysize[map.size[0] + '_'+ map.size[1]] = map;
		},

		_FetchMap : function(map,callback) {
			for( var i = 0; i < this.fetch_queue.length; ++i) {
				if (this.fetch_queue[i][0] == map) {
					this.fetch_queue[i][1].push(callback);
					return;
				}
			}
			this.fetch_queue.push([map,[callback],false]);
		},

		_CreateHeightField : function(img, x,y,w,h, ys, xzs) {
			var def = this.desc.default_height || 0.0;

			++w;
			++h;

			var xofs = 0, yofs = 0, xofsr = 0, yofsr = 0, ow = w, oh = h;
			if (x < 0) {
				xofs = -x;
				w += x;
				x = 0;
			}
			if (y < 0) {
				yofs = -y;
				h += y;
				y = 0;
			}

			if (x + w > img.GetWidth()) {
				xofsr = x + w - img.GetWidth();
				w -= xofsr;
			}

			if (y + h > img.GetHeight()) {
				yofsr = y + h - img.GetHeight();
				h -= yofsr;
			}

			if (h <= 0 || w <= 0 || yofsr >= oh || xofsr >= ow) {
				// completely out of range, return dummy data
				var pos = new Float32Array(oh*ow*3);
				for (var yy = 0, c = 0; yy < oh; ++yy) {
					for (var xx = 0; xx < ow; ++xx) {
						pos[c++] = xx * xzs;
						pos[c++] = def;
						pos[c++] = yy * xzs;
					}
				}
				return [pos, ow, oh];
			}

			var hf = medea._HeightfieldFromOddSidedHeightmapPart(img, x,y,w,h,ys, xzs);
			if (xofs || yofs || yofsr || xofsr) {

				// partly out of range, move the height field and pad with dummy data
				var pos = new Float32Array(oh*ow*3);
				for (var yy = 0, c = 0; yy < oh; ++yy) {
					for (var xx = 0; xx < ow; ++xx) {
						pos[c++] = xx * xzs;
						pos[c++] = def;
						pos[c++] = yy * xzs;
					}
				}

				for (var yy = 0, c = (yofs*ow + xofs) * 3 + 1, ci = 1; yy < h; ++yy, c += ow*3 ) {
					for (var xx = 0; xx < w; ++xx, ci+=3) {
						pos[c + xx*3] = hf[0][ci];
					}
				}
				return [pos, ow, oh];
			}

			return hf;
		},
	});



	medea.CreateDefaultTerrainDataProvider = function(info, url_root) {
		return new DefaultTerrainDataProvider(info, url_root);
	};

	medea.CreateDefaultTerrainDataProviderFromResource = function(src, callback) {
		medea.Fetch(src,function(data) {
			var c = medea.CreateDefaultTerrainDataProvider(data, medea._GetPath(src));
			if(callback) {
				callback(c);
			}
		}, function() {
			// XXX handle error
		});
	};


	var TerrainRing = medealib.Class.extend({

		init : function(terrain,lod,cam) {
			this.terrain = terrain;
			this.lod = lod;
			this.cam = cam;
			this.half_scale = 0.5*(1<<lod);

			this.startx = this.starty = 1e10;
			this.present = false;
			this.substituted = false;
			this.present_listeners = [];
			this.cur_meshes = [];
		},

		IsPresent : function() {
			return this.present;
		},

		IsSubstituted : function() {
			return this.substituted;
		},

		GetOnPresentListeners : function() {
			return this.present_listeners;
		},

		Update : function(ppos, startx, starty) {

			this.ppos = ppos;
			this.startx = startx - this.half_scale;
			this.starty = starty - this.half_scale;

			this._BuildMesh();
		},

		_Dispose : function() {
			this.is_obsolete = true;
		},

		_BuildMesh : function() {
			var t = this.terrain, ilod = 1<<this.lod, outer = this;
			var vertex_fetch = t.UseVertexFetch();
			
			if(!this.material) {
				// Fetch the material as early as possible to improve parallelization
				var flags = vertex_fetch ? medea.TERRAIN_MATERIAL_ENABLE_VERTEX_FETCH : 0;
				this.material = t.data.GetMaterial(this.lod, flags);
				if (!this.material) {
					// Data provider failed to deliver us a material for this setup.
					// XXX default material doesn't support vertex fetching.
					this.material = medea.CreateSimpleMaterialFromColor([0.7,0.7,0.5,1.0], true);

				}
			}

			var ppos = this.ppos;
			t.data.RequestLOD( this.startx, this.starty,ilod,ilod,this.lod, function(tup) {
				// This happens if the request for the LOD takes so long that the terrain
				// ring is no longer active / already disposed when control returns.
				if(outer.is_obsolete) {
					return;
				}

				// Note: `vertex_fetch` has still the same value since any changes
				// would cause all terrain data to be disposed.
				if (vertex_fetch) {
					outer._BuildVFetchingMesh(tup, ilod, ppos);
					return;
				}

				outer._BuildHeightfieldMesh(tup, outer.material, ilod, ppos);
			});
		},

		_BuildVFetchingMesh : function(tup, ilod, ppos) {
			if(!this.cached_mesh) {
				var ub = this.terrain.data.GetUnitBase();
				var indices = this._GetIndices(ub,ub);

				this.cached_mesh = medea.CreateSimpleMesh(this.terrain._GetVBOForVertexFetch(),
					indices,
					this.material
				);
			}

			this.terrain.data.SetupVertexFetchParams(tup, this.material, ppos);

			this._SetMeshes(this.cached_mesh);
			this._SetPresent();
		},

		_BuildHeightfieldMesh : function(tup, material, ilod, ppos) {
			var v = this.terrain.data.SampleLOD(tup);
			var pos = v[0], wv = v[1], hv = v[2], w = wv-1, h = hv-1, realx = v[3], realy = v[4];

			var sc = this.terrain.data.GetScale(), ub = this.terrain.data.GetUnitBase();

			// center the heightfield and scale it according to its LOD
			this._MoveHeightfield(pos, ilod, 1.0,
				ppos[0] + (realx-this.startx)*ub -w*ilod*sc[0]/2,
				ppos[2] + (realy-this.starty)*ub -h*ilod*sc[0]/2
			);

			var uv  = new Float32Array(wv*hv*2);

			var outer = this;
			this.terrain._Dispatch('GenHeightfieldTangentSpace',function(res) {
				// make sure this closure is not the only interested party remaining
				if(outer.is_obsolete) {
					return;
				}

				medea._GenHeightfieldUVs(uv,wv,hv, ilod);

				var m;
				var vertices = {
					positions: pos,
					normals: res.nor,
					tangents: res.tan,
					bitangents: res.bit,
					uvs: [uv]
				};

				if(!outer.cached_mesh) {
					var indices = outer._GetIndices(w,h);

					m = outer.cached_mesh = medea.CreateSimpleMesh(vertices, indices,
						outer.material,
						medea.VERTEXBUFFER_USAGE_DYNAMIC
					);
				}
				else {
					m = outer.cached_mesh;
					m.VB().Fill(vertices, true);
					m.UpdateBB();
				}


				outer._SetMeshes(m);
				outer._SetPresent();
			}, pos,wv,hv);
		},

		_GetIndices : function(w,h) {
			var indices, t = this.terrain, cam = this.cam, ib;

			if (this.lod === 0) {
				var ib_key = this._GetIBCacheKey(w,h,0,0,0,0,true);
				var ib_cached = terrain_ib_cache[ib_key];
				if (ib_cached) {
					return ib_cached;
				}

				var indices = new Uint16Array(w*h*2*3);
				medea._GenHeightfieldIndicesLOD(indices,w,h);

				return terrain_ib_cache[ib_key] = medea.CreateIndexBuffer(indices, 0);
			}

			var whs = w/4, hhs = h/4, n = this.lod-1, extend = false;

			// see if higher LODs are not present yet, in this case we
			// make the hole larger to cover their area as well.
			for( var dt = 8; n >= 0 && !t.LOD(n,cam).IsPresent(); --n, whs += w/dt, hhs += h/dt, dt*=2, extend = true );

			if(n === -1) {
				++n;
				whs = hhs = w/2;
			}
			whs = Math.floor(whs), hhs = Math.floor(hhs);

			// .. but make sure we get notified when those higher LODs
			// finish loading so we can shrink again.
			if (extend) {

				for( var nn = n; nn < this.lod; ++nn) {
					t.LOD(nn,cam).substituted = true;
					(function(nn, outer) {
						var pf = function() {
							// This happens if stuff goes wrong and the ring is no longer active /
							// already disposed when control reaches here.
							if(outer.is_obsolete) {
								return;
							}

							for( var m = outer.lod-1; m >= 0 && !t.LOD(m,cam).IsPresent(); --m );
							if(m === -1) {
								++m;
							}
							if (m === nn) {

								outer.cached_mesh.IB(outer._GetIndices(w,h));

								// remove the listener
								var pl = t.LOD(nn,cam).GetOnPresentListeners();
								pl.splice(pl.indexOf(pf));
							}
						};
						t.LOD(nn,cam).GetOnPresentListeners().push(pf);
					} (nn, this));
				}
			}

			var wh = w-whs*2, hh = h-hhs*2;

			var ib_key = this._GetIBCacheKey(w,h,whs,hhs,wh,hh, this.lod !== t.data.GetLODCount()-1);
			var ib_cached = terrain_ib_cache[ib_key];
			if (ib_cached) {
				return ib_cached;
			}

			var indices = new Uint16Array((w-wh)*(h-hh)*2*3 * 4); // TODO: *4 is just a rough upper bound
			var c = (this.lod === t.data.GetLODCount()-1
				? medea._GenHeightfieldIndicesWithHole
				: medea._GenHeightfieldIndicesWithHoleLOD)
				(indices,w,h,whs,hhs,wh,hh);


			return terrain_ib_cache[ib_key] = medea.CreateIndexBuffer(indices.subarray(0, c));
		},

		_GetIBCacheKey : function(w,h,whs,hhs,wh,hh,lod) {
			return Array.prototype.join.call(arguments,'-');
		},

		_SetMeshes : function(m) {
			this.cur_meshes = Array.isArray(m) ? m : [m];
		},

		GetMeshes : function() {
			return this.cur_meshes;
		},

		_SetPresent : function() {
			this.present = true;
			this.substituted = false;
			for (var i = 0; i < this.present_listeners.length; ++i) {
				this.present_listeners[i]();
			}
		},

		_MoveHeightfield : function(pos, xz_scale, yscale, abs_xofs, abs_yofs) {
			for(var i = 0, i3 = 0; i3 < pos.length; ++i, i3 += 3) {
				pos[i3+0] = pos[i3+0] * xz_scale + abs_xofs;
				pos[i3+1] *= yscale;
				pos[i3+2] = pos[i3+2] * xz_scale + abs_yofs;
			}
		},
	});


	medea.TerrainNode = medea.Node.extend({

		init : function(name, data, settings) {
			medealib.Merge(settings,TerrainDefaultSettings,this);
			this._super(name, medea.NODE_FLAG_NO_ROTATION | medea.NODE_FLAG_NO_SCALING);

			if(this.use_worker) {
				this._StartWorker();
			}

			this.data = data;
			this.cameras = {};

			// add a dummy entity whose only purpose is to keep a static bounding
			// box for the terrain
			var ent = medea.CreateEntity('TerrainBBDummyEntity');
			var ub = data.GetUnitBase(), s = data.GetScale();

			var vmax = [0.5 * data.GetWidth() * ub * s[0],s[1],0.5 * data.GetHeight() * ub * s[0]];
			var vmin = [-vmax[0],0.0,-vmax[2]];

			ent.BB([vmin,vmax]);
			this.AddEntity(ent);
		},

		CameraTimeout : medealib.Property('camera_timeout'),
		UpdateTreshold : medealib.Property('update_treshold'),
		NoMensLandBorder : medealib.Property('no_mens'),

		UseVertexFetch : function(ts) {
			if (ts === undefined) {
				return this.use_vertex_fetch;
			}

			if(ts === this.use_vertex_fetch) {
				return;
			}
			this._DropAllData();
			this.use_vertex_fetch = ts;
		},

		UseWorker : function(ts) {
			if (ts === undefined) {
				return this.use_worker;
			}

			if(ts === this.use_worker) {
				return;
			}

			this.use_worker = ts;
			if(ts) {
				this._StartWorker();
			}
			else {
				this._EndWorker();
			}
		},

		GetActiveEntities: function(cam) {
			var c = this.cameras[cam.id];
			if (c === undefined) {
				this._AddCamera(cam);
				return this.GetActiveEntities(cam);
			}

			// it is being used, so keep the data for this camera alive
			c.alive = medea.GetStatistics.frame_count;

			var rc = c.rings.length, t = new Array(rc);
			for( var i = 0; i < rc; ++i) {
				t[i] = c.rings[i].GetMeshes();
			}
			return Array.prototype.concat.apply(this.entities,t);
		},

		Cull : function(frustum) {
			// terrain is never culled, but we want culling for the individual
			// meshes it is made up of.
			return medea.VISIBLE_PARTIAL;
		},

		Update: function(dtime) {
			this._super(dtime);

			var ub = this.data.GetUnitBase(), w = this.data.GetWidth(), h = this.data.GetHeight(), ut = this.UpdateTreshold();
			for(var k in this.cameras) {
				var cam = this.cameras[k];
				var ppos = cam.cam.GetWorldPos();

				var newx = ppos[0]/ub + w * 0.5;
				var newy = ppos[2]/ub + h * 0.5;

				var dx = newx - cam.startx, dy = newy - cam.starty;
				
				// updating the terrain is much cheaper with vertex fetching, so
				// interpret the update treshold differently.
				if (this.UseVertexFetch()) {
					ut *= 0.01;
				}
				
				if (Math.abs(dx) > ut || Math.abs(dy) > ut) {
					for( var i = 0; i < cam.rings.length; ++i) {
						cam.rings[i].Update(ppos, newx, newy);
					}

					cam.startx = newx;
					cam.starty = newy;
				}
			}
			this.data.Update();
			this._CleanupCameras();
		},

		GetWorldHeightForWorldPos : function(wx,wz) {
			var mypos = this.GetWorldPos(), w = this.data.GetWidth(), h = this.data.GetHeight();

			if (wx.length === 3) {
				wz = wx[2];
				wx = wx[0];
			}

			var ub = this.data.GetUnitBase(), b = this.no_mens;

			wx = w*0.5 + (wx-mypos[0])/ub;
			wz = h*0.5 + (wz-mypos[2])/ub;

			if (wx < b || wx >= w-b || wz < b || wz >= h-b) {
				return null;
			}

			var h = this.data.TryGetHeightAtPos(wx, wz);
			return h === null ? null : h - mypos[1];
		},

		LOD : function(i,cam) {
			return this.cameras[cam.id].rings[i];
		},

		_GetCamEntry : function(cam) {

			return this.cameras[cam.id];
		},

		_AddCamera : function(cam) {

			var c = this.cameras[cam.id] = {};
			c.startx = c.starty = 1e10;
			c.cam = cam;

			// this way it doesn't care if someone call _GetCamEntry by
			// the entity object or the hull dictionary.
			c.id = cam.id;
			this._InitRings(c);

		},

		_RemoveCamera : function(cam) {

			var rings = this.cameras[cam.id].rings;
			for (var i = 0; i < rings.length; ++i) {
				rings[i].Dispose();
			}
			delete this.cameras[cam.id];
		},

		_DropAllData : function() {
			var t = [];
			for(var k in this.cameras) {
				t.push(this.cameras[k]);
			}
			t.forEach(function(c) {
				this._RemoveCamera(c);
			},this);

			if (this._vf_vbo) {
				this._vf_vbo.Dispose();
				delete this._vf_vbo;
			}
		},

		_CleanupCameras : function() {
			var fc = medea.GetStatistics.frame_count, disp = [];
			for(var k in this.cameras) {
				var cam = this.cameras[k];
				if (cam.alive !== undefined && (fc-cam.alive > this.camera_timeout || cam.cam.GetViewport() === null)) {
					disp.push(k);
				}
			}
			for( var i = 0; i < disp.length; ++i) {
				delete this.cameras[disp[i]];
			}
		},

		_Dispatch : function(command, callback) {
			var args = Array.prototype.slice.call(arguments,2);
			if (!this.worker) {
				return callback(medea._workers[command].apply(this, args));
			}

			this.pending_jobs[this.job_id] = callback;
			this.worker.postMessage({
				command : command,
				arguments : args,
				job_id : this.job_id++
			});
		},

		_InitRings : function(v) {
			var lods = this.data.GetLODCount();
			v.rings = new Array(lods);

			for(var i = 0; i < lods; ++i) {
				v.rings[i] = new TerrainRing(this,i,v);
			}
		},

		_StartWorker : function() {
			var outer = this;
			medea.CreateWorker('worker_terrain', function(w) {
				outer.worker = w;
				outer.pending_jobs = {};
				outer.job_id = 0;

				return function(e) {
					var res = e.data;

					var job = outer.pending_jobs[res.job_id];
					medealib.DebugAssert(!!job,'job not in waitlist');

					delete outer.pending_jobs[res.job_id];
					job(res.result);
				};
			});
		},

		_EndWorker : function() {
			if (!this.worker) {
				return;
			}

			this.worker.close();

			// forget all pending jobs .. not sure if this is so clever, though
			this.pending_jobs = {};
		},

		_GetVBOForVertexFetch : function() {
			if (this._vf_vbo) {
				return this._vf_vbo;
			}

			var ub = this.data.GetUnitBase(), ub2 = ub/2, ubplus1 = ub+1;
			var vertices = new Float32Array(ubplus1*ubplus1*3);
			for(var y = -ub2, c = 0; y <= ub2; ++y) {
				for(var x = -ub2; x <= ub2; ++x) {
					vertices[c++] = x;
					vertices[c++] = 0;
					vertices[c++] = y;
				}
			}

			var uv = new Float32Array(ubplus1*ubplus1*2);
			medea._GenHeightfieldUVs(uv,ubplus1,ubplus1, 1.0);

			return this._vf_vbo = medea.CreateVertexBuffer({
				positions:vertices,
				uvs : [uv]
			});
		},
	});

	medea.CreateTerrainNode = function(data_provider, settings) {
		return new medea.TerrainNode('terrain', data_provider, settings);
	};
});


/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('skydome',['mesh'],function(medealib, undefined) {
	"use strict";
	var medea = this;

	// based on my old engine code, which itself took this algorithm from
	// this paper on athmospheric scattering:
	// http://www2.imm.dtu.dk/pubdb/views/edoc_download.php/2554/pdf/imm2554.pdf
	var CreateDomeMesh = medea.CreateDomeMesh = function(mat, lower_amount, rings, equator_overlap) {
		var pi = Math.PI, sin = Math.sin, cos = Math.cos, sqrt = Math.sqrt, round = Math.round, abs = Math.abs;

		rings = rings || 35;
		lower_amount = lower_amount || 0.0;

		// gather storage requirements upfront and populate ring_info
		var ring_info = new Array(rings);
		ring_info[0] = [0,0.0];

		var lat = 0.0, lad = pi*0.5/(rings - (equator_overlap | 0)), fac = pi*2.0/sin(lad), pcnt = 1;
		for(var r = 1; r < rings; ++r) {
			lat += lad;

			var rad = sin(lat)*fac, nmp = round(rad);
			ring_info[r] = [nmp,nmp - ring_info[r-1][0]];
			pcnt += nmp;
		}

		var pos = new Float32Array(pcnt*3);
		var nor = new Float32Array(pcnt*3);
		var uv = new Float32Array(pcnt*2);
		
		// pole
		pos[0] = 0;
		pos[1] = 1.0 - lower_amount;
		pos[2] = 0;

		nor[0] = 0;
		nor[1] = -1.0;
		nor[2] = 0;

		uv[0] = 0.5;
		uv[1] = 0.5;

		// generate vertices
		var ipos = 3, iuv = 2;
		lat = 0.0;
		for(var r = 1; r < rings; ++r) {
			lat += lad;
			nmp = ring_info[r][0];

			var sinlat = sin(lat);
			var coslat = cos(lat);

			var lon = 0.0, ldf = pi*2.0/nmp;
			for(var p = 0; p < nmp; ++p, lon += ldf) {

				var x = pos[ipos+0] = cos(lon) * sinlat;
				var y = pos[ipos+1] = coslat - lower_amount;
				var z = pos[ipos+2] = sin(lon) * sinlat;

				if(y < 0) {
					y = 0;
				}

				var l = -sqrt( x*x + y*y + z*z );
				nor[ipos++] = x/l;
				nor[ipos++] = y/l;
				nor[ipos++] = z/l;

				uv[iuv++] = (x + 1.0)*0.5;
				uv[iuv++] = (z + 1.0)*0.5;
			}
		}

		// assert(pcnt * 3 == ipos);	
		// assert(pcnt * 2 == iuv);

		var n = 0;
		for(var i = 1; i < rings; ++i) {
			n += ring_info[i][0]*3; // XXX improve accuracy, this is just a very rough upper boundary
		}

		var ind = new Array(n);
		n = 0;

		// generate indices
		var ct1 = 0, ct2 = 1;
		for(var i = 1; i < rings; ++i) {

			var rinfo = ring_info[i], fs = abs(rinfo[0]/rinfo[1]), spaces = 0, ct1s = ct1, ct2s = ct2, ns = 0;
			for(var j = 0; j < rinfo[0]; ++j) {

				if (j === 0 && rinfo[1] > 0) {
					ind[n++] = ct2;
					ind[n++] = ct1;
					ind[n++] = ct2+1;

					++ct2, ++spaces;
					ns = round(spaces*fs);
				}
				else if (j === 0 && rinfo[1] < 0) {
					ind[n++] = ct2;
					ind[n++] = ct1;
					ind[n++] = ct1+1;

					ind[n++] = ct2;
					ind[n++] = ct1+1;
					ind[n++] = ct2+1;

					++ct2, ++ct1, ++spaces;
					ns = round(spaces*fs);
				}
				else if (j === rinfo[0]-1 && ct1 === 0) {
					ind[n++] = ct2;
					ind[n++] = ct1;
					ind[n++] = ct2s;

					++ct2, ++ct1;
				}
				else if (j === rinfo[0]-1 && rinfo[1] >= 0 && ct1 > 0) {
					ind[n++] = ct2;
					ind[n++] = ct1;
					ind[n++] = ct1s;

					ind[n++] = ct2;
					ind[n++] = ct1s;
					ind[n++] = ct2s;

					++ct2, ++ct1;
				}
				else if (j === rinfo[0]-1 && rinfo[1] < 0) {
					ind[n++] = ct2;
					ind[n++] = ct1;
					ind[n++] = ct1+1;

					ind[n++] = ct2;
					ind[n++] = ct1+1;
					ind[n++] = ct2s;

					ind[n++] = ct2s;
					ind[n++] = ct1+1;
					ind[n++] = ct1s;

					++ct2, ct1 += 2;
				}
				else if (j === ns && rinfo[1] > 0) {
					ind[n++] = ct2;
					ind[n++] = ct1;
					ind[n++] = ct2+1;

					++ct2, ++spaces;
					ns = round(spaces*fs);
				}
				else if (j === ns && rinfo[1] < 0) {
					ind[n++] = ct2;
					ind[n++] = ct1;
					ind[n++] = ct1+1;

					--j, ++ct1, ++spaces;
					ns = round(spaces*fs);
				}
				else {
					ind[n++] = ct2;
					ind[n++] = ct1;
					ind[n++] = ct1+1;

					ind[n++] = ct2;
					ind[n++] = ct1+1;
					ind[n++] = ct2+1;

					++ct2, ++ct1;
				}
			}
		}

		ind.length = n;
		return medea.CreateSimpleMesh({ positions:pos, normals:nor, uvs:[uv] }, ind, mat);
	};

	/*

	// second version, creates rings with equal triangle counts and thus much 
	// higher density at the pole than at the equator.
	var CreateDomeMesh2 = function(mat, lower_amount, rings, hres) {
		var pi = Math.PI, sin = Math.sin, cos = Math.cos, sqrt = Math.sqrt, round = Math.round, abs = Math.abs;

		hres = hres || rings;

		var pcnt = hres * rings + 1;

		var pos = new Array(pcnt*3);
		var nor = new Array(pcnt*3);
		var uv = new Array(pcnt*2);
		
		pos[0] = 0;
		pos[1] = 1.0 - lower_amount;
		pos[2] = 0;

		nor[0] = 0;
		nor[1] = -1.0;
		nor[2] = 0;

		uv[0] = 0.5;
		uv[1] = 0.5;

		// generate vertices and indices
		var ipos = 3, iuv = 3, lat = 0.0, lad = pi*0.5/rings, x,z,y, l;
		for(var r = 0; r < rings; ++r) {
			lat += lad;

			var sinlat = sin(lat);
			var coslat = cos(lat);

			var lon = 0.0, ldf = pi*2.0/hres;
			for(var p = 0; p < hres; ++p) {

				x = pos[ipos+0] = Math.cos(lon) * sinlat;
				y = pos[ipos+1] = coslat - lower_amount;
				z = pos[ipos+2] = Math.sin(lon) * sinlat;

				if(y < 0) {
					y = 0;
				}

				l = -sqrt( x*x + y*y + z*z );
				nor[ipos++] = x/l;
				nor[ipos++] = y/l;
				nor[ipos++] = z/l;

				uv[iuv++] = (x + 1.0)*0.485;
				uv[iuv++] = (z + 1.0)*0.485;
				lon += ldf;
			}
		}

		// generate indices
		var ind = new Array( ((rings-2) * hres * 2 + hres ) * 3 );
		var il = ind.length;
		var n = 0;
		var base_src = 1;
		for(var r = 0; r < rings - 1; ++r) {
			if(r === 0) {
				for(var i = 0; i < hres; ++i) {
					ind[n++] = base_src + i;
					ind[n++] = 0;
					ind[n++] = base_src + (i + 1) % hres;
				}
			}
			else {
				for(var i = 0; i < hres; ++i) {
					ind[n++] = base_src + i;
					ind[n++] = base_src + i - hres;
					ind[n++] = base_src + (i + 1) % hres;

					ind[n++] = base_src + (i + 1) % hres;
					ind[n++] = base_src + i - hres;
					ind[n++] = base_src + ((i + 1) % hres) - hres;
				}
			}
			base_src += hres;
		}
		return medea.CreateSimpleMesh({ positions:pos, normals:nor, uvs:[uv] }, ind, mat);
	} */


	/* --{
	@entry medea CreateSkydomeNode

	Create a scenegraph node and attach a skydome to it. The skydome is simply a mesh
	that is configured to add itself to the {background rendering queue -> medea
	RenderQueue}. The default skydome effect is located in "mcore/shaders/skydome"
	and draws the skydome behind the rest of the scene, using a single sphere texture.

	`CreateSkydomeNode(texbase, lower_amount, rings)`

	texbase:
	@a URI; of the texture to be displayed on the skydome.

	lower_amount:
	Amount by which the skydome is shifted downwards on the y-axis. This is to make
	sure that the horizon is fully covered. Typical values are 0 ... 0.5 depending
	on the setting.

	rings:
	Number of longitudial 'rings' to subdivide the skydome into. This determines
	how smooth the texture will look on the dome, but high values affect rendering
	speed negatively. Typical values range from 10 ... 35.

	Returns a {medea Node} instance.
	}-- */
	medea.CreateSkydomeNode = function(texbase, lower_amount, rings) {
		var nd = medea.CreateNode("skydome");

		var mesh = CreateDomeMesh(medea.CreateSimpleMaterialFromShaderPair('remote:mcore/shaders/skydome',{
			texture : medea.CreateTexture( texbase )
		}), lower_amount, rings);

		mesh.BB(medea.BB_INFINITE);

		
		mesh.RenderQueue(medea.RENDERQUEUE_BACKGROUND);
		mesh.Material().Passes().forEach( function(p) {
			p.State({
			'depth_test'  : true,
			'depth_write' : false,
			'cull_face'   : true,
			'cull_face_mode' : 'front'
			});
		});

		nd.AddEntity(mesh);
		return nd;
	};
});

delete window.medea_is_compiled;