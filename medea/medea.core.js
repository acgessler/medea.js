
/* medealib - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medealib is (c) 2011, Alexander C. Gessler
 * licensed under the terms and conditions of a 3 clause BSD license.
 */


/** {{medealib}} */
var medealib = (function() {
	var medealib = this
	, _waiters = {}
	, _deps = {}
	, _stubs = {}
	, _sources = {}
	;


	// #include "snippets/array_foreach_polyfill.js"
	
	// #include "snippets/array_isarray_polyfill.js"

	// #include "snippets/class_inheritance.js"

	// #include "snippets/request_anim_frame_shim.js"

	// #include "snippets/global_eval_shim.js"


	medealib.AssertionError = function(what) {medealib.what = what;};
	medealib.FatalError = function(what) {medealib.what = what;};


	// ---------------------------------------------------------------------------
	/** {{medealib.NotifyFatal}}
	 *
	 * @param {String} what
	*/
	// ---------------------------------------------------------------------------
	medealib.NotifyFatal = function(what) {
		what = "medealib: " + what;
		medealib.LogDebug(what);
		alert(what);
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
			alert(what);
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

		// fetch dependencies
		medealib._RegisterMods(deps,function() {
			// #ifdef LOG
			medealib.LogDebug('modready: ' + name);
			// #endif

			var w = _waiters[name];

			_stubs[name] = init;
			delete _waiters[name];

			if (w) { 
				for(var i = 0; i < w.length; ++i) {
					w[i]();
				}
			}
		});
	};



	// ---------------------------------------------------------------------------
	/** Get the source code for a given module.
	 *
	 *  @param {String} name Module name, i.e. "viewport" or "someMod.js". See
	 *     {medealib._FetchMods()} for more information on package references.
	 *  @return {String} undefined iff the module is not loaded yet
	*/
	// ---------------------------------------------------------------------------
	medealib.GetModSource = function(name) {
		return _sources[n];
	},


	// ---------------------------------------------------------------------------
	/** Fetch a set of modules, run them and invoke a callback once they are
	 *  loaded. For loading medealib extension modules, medealib only registers the 
	 *  modules. To actually call their APIs, apply them to a 
	 *  @see {medealib.Context} using @see {medealib.Context.Fetch()}.
	 *
	 *  @param {String} String or list of strings containing the names of the
	 *    modules to be fetched. There are two kinds of modules:
	 *     a) medealib modules, which are referred to with their name suffixes and
	 *        without the file extension and -
	 *     b) JS files from /medealib/3rdparty, which are referred to by their file 
	 *        name, including their file extension, i.e. "someMod.js". 
	 *
	 *  @param {Function} Callback to be invoked once all the modules have 
	 *    been registered. medealib may happen immediately in case they are all available.
	 *
	 *  @private
	 */
	// ---------------------------------------------------------------------------
	medealib._RegisterMods = function(whom, callback) {
		callback = callback || function() {};
		var whom = whom instanceof Array ? whom : [whom];
		var cnt = 0, nodelay = true;

		if(!whom.length) {
			callback();
			return;
		}

		var proxy = function() {
			if(--cnt === 0) {
				callback();
			};
		};

		for(var i = 0; i < whom.length; ++i) {
			var n=whom[i], init = _stubs[n];

			if(!n) {
				continue;
			}

			// see if the file has already been loaded, in which case `init` should 
			// be either null or a function.
			if (init === undefined) {
				var is_medealib_mod = !/\.js$/i.test(whom[i]);

				++cnt;
				nodelay = false;

				var b = false;
				if (!(n in _waiters)) {
					_waiters[n] = [];
					b = true;
				}

				_waiters[n].push(proxy);

				if(!b) {
					continue;
				}

				(function(n,is_medealib_mod) {
				medealib._AjaxFetch(medealib.root_url+(is_medealib_mod ? 'medea.' +n + '.js' : '3rdparty/' + n), function(text,status) {
					if(status !== 200) {
						medealib.DebugAssert('failure loading script ' + n);
						return;
					}

					// #ifdef LOG
					medealib.LogDebug("run: " + n);
					// #endif LOG

					_sources[n] = text;

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
	/** TODO: documentation 
	*/
	// ---------------------------------------------------------------------------
	medealib._Require = function(whom,callback) {
		var whom = whom instanceof Array ? whom : [whom];
		var cnt = 0;

		for(var i = 0; i < whom.length; ++i) {
			var init = _stubs[whom[i]];
			if (init === undefined) {
				medealib.DebugAssert('init stub missing for file ' + whom[i] + ', maybe not loaded yet?');
				continue;
			}
			if (!init) {
				continue;
			}

			medealib._initMod(whom[i]);
		}
	};


	// ---------------------------------------------------------------------------
	/** TODO: documentation 
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
			if (ajax.readyState==4) {
				callback(ajax.responseText, ajax.status);
			}
		}

		ajax.open("GET",url + (no_client_cache ?  '?nocache='+(new Date()).getTime() : ''),true);
		ajax.send(null);
	};


	// global initialization code
	(function() {

		var scripts = document.getElementsByTagName('script');
		medealib.root_url = scripts[scripts.length-1].src.replace(/^(.*[\\\/])?(.*)/,'$1');

		// check if we need the JSON polyfill
		if(typeof JSON !== undefined) {
			_stubs['json2.js'] = function() {};
		}
	}) ();


	// #include "medea.context.js"

	return medealib;
})();