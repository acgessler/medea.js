
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
medealib = (function() {

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


	// #include "snippets/array_foreach_polyfill.js"
	
	// #include "snippets/array_isarray_polyfill.js"

	// #include "snippets/class_inheritance.js"

	// #include "snippets/request_anim_frame_shim.js"

	// #include "snippets/global_eval_shim.js"


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
// #ifndef DEBUG
	medealib.DebugAssert = function(what) {
	};
// #else
	medealib.DebugAssert = function(cond,what) {
		if (what === undefined) {
			what = cond;
			cond = false;
		}

		if (!cond) {
			what = "medealib DEBUG ASSERTION: " + what;
			console.error(what);
			// hack to disable message boxes when running tests
			if(!window.medealib_jasmine_no_alert) {
				alert(what);
			}
			throw new medealib.AssertionError(what);
		}
	};
// #endif


	// ---------------------------------------------------------------------------
	/** TODO: documentation 
	*/
	// ---------------------------------------------------------------------------
// #ifndef LOG
	medealib.Log = medealib.LogDebug = function() {};
// #else
	medealib.Log = function(message, kind) {
		console.log((kind||'info')+': ' + message);
	};
// #endif

	// ---------------------------------------------------------------------------
	/** TODO: documentation 
	*/
	// ---------------------------------------------------------------------------
// #ifndef DEBUG
	medealib.LogDebug = function() {};
// #else
	medealib.LogDebug = function(message) {
		console.log('debug: ' + message);
	};
// #endif

// #endif


	// ------------------------------------------------------------------------
	/** TODO: documentation 
	*/
	// ------------------------------------------------------------------------
	medealib.Merge = function(inp,template,out_opt) {
		var out = out_opt || {};
		for(var k in inp) {
			var v = inp[v];
			if (typeof v === 'object') {
				out[k] = medealib.Merge(v,template[k] || {});
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

	// #ifdef LOG
		var s = '';
		if (deps.length) {
			s = ', deps: ';
			for (var i = 0; i < deps.length; ++i) {
				var d = deps[i];
				if (!d) {
					continue;
				}
				s += d;
				if (_waiters[d]) {
					// dependency pending
					s += '~';
				}
				else if (_stubs[d] === undefined) {
					// dependency not loaded yet
					s += '!';
				}
				if (i !== deps.length-1) {
					s += ', ';
				}
			}
		}
		medealib.LogDebug("addmod: " + name + s);
	// #endif

		// mark the module as pending
		if(!_waiters[name]) {
			_waiters[name] = [];
		}

		// fetch dependencies
		medealib._RegisterMods(deps, function() {
	// #ifdef LOG
			medealib.LogDebug('modready: ' + name);
	// #endif

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

					// #ifdef LOG
						medealib.LogDebug("eval: " + n);
					// #endif

						// TODO: which way of evaluating scripts is best for debugging
						globalEval(text);

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
	 *  @param {Function} callback to be invoked
	 *  @param {bool} no_client_cache If set to true, an unique value is appended
	 *    to the URL (as ?nocache=<someToken>) parameter to prevent any kind
	 *    of client-side caching. If this parameter is not specified, it is assumed
	 *    true iff DEBUG is defined.
	*/
	// ---------------------------------------------------------------------------
	medealib._AjaxFetch = function(url, callback, no_client_cache) {
		// #ifdef DEBUG
		if (no_client_cache === undefined) {
			no_client_cache = true;
		}
		// #endif

		var ajax;
  		if (window.XMLHttpRequest) {
	  		ajax = new XMLHttpRequest();
		}
		else {
	  		ajax = new ActiveXObject("Microsoft.XMLHTTP");
		}

		ajax.onreadystatechange = function() {
			if (ajax.readyState === 4) {
				callback(ajax.responseText, ajax.status);
			}
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


	// #include "medea.context.js"

	return medealib;
})();