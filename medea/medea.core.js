
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

var scripts = document.getElementsByTagName('script');

medea = new (function(sdom) {
	var medea = this;

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
				var tmp = this._super;

				// Add a new ._super() method that is the same method
				// but on the super-class
				this._super = _super[name];

				// The method only need to be bound temporarily, so we
				// remove it when we're done executing
				var ret = fn.apply(this, arguments);
				this._super = tmp;

				return ret;
			  };
			})(name, prop[name]) :
			prop[name];
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


	// TODO: restructure constants
	// constants
	this.FRAME_VIEWPORT_UPDATED = 0x1;
	this.FRAME_CANVAS_SIZE_CHANGED = this.FRAME_VIEWPORT_UPDATED | 0x2;

	this.VISIBLE_NONE = 0x0;
	this.VISIBLE_ALL = 0x1;
	this.VISIBLE_PARTIAL = 0x2;


	this.AssertionError = function(what) {this.what = what;};
	this.FatalError = function(what) {this.what = what;};

	this.root_url = sdom.src.replace(/^(.*[\\\/])?(.*)/,'$1');
	this.statepool = {};

	this._workers = {};

	// collect initial dependencies - for example the scenegraph module and the mathlib is always needed
	var _initial_deps = ['node','viewport'];
	var _initial_pre_deps = []; 

	if (window.mat4 === undefined) {
		_initial_pre_deps.push('glMatrix.js');
	}

	var _waiters = {}, _deps = {}, _stubs = {}, _sources = {}, _callback = undefined, _callback_pre = undefined, readyness = 0;
	
	//
	if(typeof JSON !== undefined) {
		_stubs['json2.js'] = function() {};
	}


	this.Ready = function(where, settings, deps, user_callback, failure_callback) {

		// first initialization phase -- create webgl canvas and prepare environment
		_callback_pre = function() {
			this.canvas  = document.getElementById(where);

			// #if DEBUG
			//this.Assert(this.canvas != null, "element with #id \"" + where + "\" not found");
			// #endif

			// create a webgl
			// try out all the names under which webgl might be available
			var candidates = ["webgl", "experimental-webgl", "webkit-3d", "moz-webgl"];
			var context = null;
			for (var i = 0; i < candidates.length; ++i) {
				try {
					context = this.canvas.getContext(candidates[i]);

				} catch(ex) {

				}
				// no matter what happens, we take the first non-null context we get
				if (context) {
					break;
				}
			}
			_callback_pre = _initial_pre_deps = undefined;

			if(!context) {
				// #if LOG
				this.Log('webgl initialization failed','error');
				// #endif
				_callback = undefined;
				if(failure_callback) {
					failure_callback();
				}
				return false;
			}
			
			// automatically create debug context if webgl-debug.js is present
			if (window.WebGLDebugUtils !== undefined) {
				context = WebGLDebugUtils.makeDebugContext(context);
			}

			this.gl = context;
			return true;
		};

		// second phase of initialization -- prepare the rest and invoke the Ready() callback
		// to pass control to the user.
		_callback = function() {
			this.cached_cw = this.canvas.width, this.cached_ch = this.canvas.height;

			this.settings = settings || {};
			this.settings.fps = this.settings.fps || 60;
			this.wireframe = false;

			this.statistics = {
				  count_frames : 0
				, smoothed_fps : -1
				, exact_fps    : -1
				, min_fps      : -1
				, max_fps      : -1
				, primitives_frame 	: 0
				, vertices_frame 	: 0
				, batches_frame : 0
			};

			this.dtacc = 0.0;
			this.dtcnt = 0;
			this.dtmin_fps = 1e6;
			this.dtmax_fps = 0;


			this.tick_callbacks = {};
			this.stop_asap = false;

			this.frame_flags = 0;
			this.debug_panel = null;

			// always allocate a default root node for the visual scene
			this.scene_root = medea.CreateNode("root");

			_callback = _initial_deps = undefined;
			user_callback();
		};

		if(deps) {
			var old = _callback;
			_callback = function() {
				medea._FetchDeps(deps, function() {
					old.apply(medea);
				});
			}
		}

		if(readyness > 0) {
			if(_callback_pre) {
				_callback_pre.apply(medea);
			}
			if(readyness > 1) {
				if(_callback) {
					_callback.apply(medea);
				}
			}
		}
	};

	this.Merge = function(inp,template,out_opt) {
		var out = out_opt || {};
		for(var k in inp) {
			var v = inp[v];
			if (typeof v === 'object') {
				out[k] = this.Merge(v,template[k] || {});
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
				out[k] = this.Merge(template[k],{});
			}
			else {
				out[k] = v;
			}
		}
		return out;
	};


// #ifndef LOG
	this.Log = this.LogDebug = function() {};
// #else
	this.Log = function(message, kind) {
		console.log((kind||'info')+': ' + message);
	};

	// #ifndef DEBUG
	this.LogDebug = function() {};
	// #else
	this.LogDebug = function(message) {
		console.log('debug: ' + message);
	};
	// #endif

// #endif


	this.GetSettings = function() {
		return this.settings;
	};


	this.RootNode = function(s) {
		if(s === undefined) {
			return this.scene_root;
		}
		this.scene_root = s;
	};

	this.GetStatistics = function() {
		return this.statistics;
	};

	this.SetTickCallback = function(clb,key) {
		this.tick_callbacks[key] = clb;
	};

	this.RemoveTickCallback = function(key) {
		try {
			delete this.tick_callbacks[key];
		} catch(e) {}
	};

	var should_be_responsive = false;
	this.EnsureIsResponsive = function(enabled) {
		if (enabled === undefined) {
			return should_be_responsive;
		}
		should_be_responsive = enabled;
	}

	this.SetDebugPanel = function(where) {
		this._Require("debug");
		this.debug_panel = new this.DebugPanel(where);
	};

	this.NotifyFatal = function(what) {
		what = "Medea: " + what;
		alert(what);
		throw new medea.FatalError(what);
	};

// #ifndef DEBUG
	this.DebugAssert = function(what) {
	};
// #else
	this.DebugAssert = function(cond,what) {
		if (what === undefined) {
			what = cond;
			cond = false;
		}

		if (!cond) {
			what = "Medea DEBUG ASSERTION: " + what;
			alert(what);
			throw new medea.AssertionError(what);
		}
	};
// #endif

	this.Start = function() {
		if (!this.stop_asap) {
			window.requestAnimationFrame(function() { 
				medea.Start(); 
			}, this.canvas);

			if (this.debug_panel) {
				//setTimeout(function(){medea.debug_panel.Update();},1000);
			}
		}

		// commented due to Chrome swallowing the stacktrace
	//	try {
			this.DoSingleFrame();
	//	}
	//	catch(a) {
	//		// resume if an assertion occured during frame processing, greater good stems from the
	//		// user being able to see what happens next frame.
	//		if (!(a instanceof medea.AssertionError)) {
	//			throw a;
	//		}
	//	}
	};

	this.StopNextFrame = function(unset_marker) {
		this.stop_asap = !unset_marker;
	};

	this.IsStopMarkerSet = function() {
		return this.stop_asap;
	};

	this.CanRender = function() {
		return this.gl && this.GetViewports().length;
	};

	this.Wireframe = function(wf) {
		if (wf === undefined) {
			return this.wireframe;
		}
		this.wireframe = wf;
		// this would be nice: this.gl.polygonMode( this.gl.FRONT_AND_BACK, wf?this.gl.LINE:this.gl.FILL );
		// .. but unfortunately we don't have glPolygonMode in WebGL. So leave the
		// implementation to the mesh drawing routines, which might use GL_LINES
		// to achieve the same effect.
		// http://stackoverflow.com/questions/3539205/is-there-a-substitute-for-glpolygonmode-in-open-gl-es-webgl
	};

	this.GetTime = function() {
		return this.time;
	};


	this.DoSingleFrame = function(dtime) {
		if (!this.CanRender()) {
			this.NotifyFatal("Not ready for rendering; need a GL context and a viewport");
			return;
		}

		// get time delta if not specified
		if (!dtime) {
			var old = this.time || 0;
			this.time = (new Date).getTime() * 0.001;

			dtime = this.time - old;
		}

		// check if the canvas sized changed
		if(this.cached_cw != this.canvas.width) {
			this.cached_cw = this.canvas.width;
			this.frame_flags |= this.FRAME_CANVAS_SIZE_CHANGED;
		}
		if(this.cached_ch != this.canvas.height) {
			this.cached_ch = this.canvas.height;
			this.frame_flags |= this.FRAME_CANVAS_SIZE_CHANGED;
		}

		this._UpdateFrameStatistics(dtime);

		// call user-defined logic, operate on a copy of the dictionary just in case
		// somebody changed its contents while we're iterating it.
		var temp_callbacks = [];
		for(var k in this.tick_callbacks) {
			temp_callbacks.push(this.tick_callbacks[k]);
		}
		for(var i = 0; i < temp_callbacks.length; ++i) {
			if(!temp_callbacks[i](dtime)) {
				this.StopNextFrame();
				return;
			}
		}

		// perform update
		this.VisitGraph(this.scene_root,function(node) {
			if(!node.Enabled()) {
				return true;
			}
			var e = node.GetEntities();
			// if entities return medea.ENTITY_UPDATE_WAS_REMOVED  from Update(), this means they removed
			for(var i = 0; i < e.length; ++i) {
				if(e[i].Update(dtime,node) === medea.ENTITY_UPDATE_WAS_REMOVED) {
					--i;
				}
			}

			node.Update(dtime);
			return true;
		});

		// adjust render settings if we switched to multiple viewports or vice versa
		if (this.frame_flags & medea.FRAME_VIEWPORT_UPDATED) {
			if (medea.GetEnabledViewportCount()>1) {
				this.gl.enable(this.gl.SCISSOR_TEST);
			}
			else {
				this.gl.disable(this.gl.SCISSOR_TEST);
			}
		}

		// perform rendering
		var viewports = this.GetViewports();
		for(var vn = 0; vn < viewports.length; ++vn) {
			viewports[vn].Render(this,dtime);
		}

		// draw debug pannel
		if (this.debug_panel) {
			this.debug_panel.Update();
		}

		this.frame_flags = 0;
	};


	this.VisitGraph = function(node,visitor,status_in) {
		var status = visitor(node,status_in);
		if (!status) {
			return false;
		}

		var c = node.GetChildren();
		for(var i = 0; i < c.length; ++i) {
			this.VisitGraph(c[i],visitor,status);
		}

		return true;
	};

	var worker_index_source = 0;
	this.CreateWorker = function(name, callback) {

		var BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder;
		if (!BlobBuilder) {
			medea.LogDebug('BlobBuilder not available, can\t use web worker');
			callback(null);
			return false;
		}

		if (!Worker) {
			medea.LogDebug('Worker not available, can\t use web worker');
			callback(null);
			return false;
		}

		var URL = window.URL || window.webkitURL;
		if (!URL || !URL.createObjectURL) {
			medea.LogDebug('URL.createObjectURL not available, can\t use web worker');
			callback(null);
			return false;
		}

		medea.FetchMods('worker_base', function() {
			var bb = new BlobBuilder();
			bb.append([medea.GetModSource('worker_base'),medea.GetModSource(name )].join('\n'));

			var blobURL = URL.createObjectURL(bb.getBlob());
			var worker = new Worker(blobURL);

			var worker_index = worker_index_source++;

			var msg = callback(worker, worker_index) || function() {};
			worker.onmessage = function(e) {

				if (e.data[0] === 'log') {
					medea.Log('(worker ' + worker_index + ') ' + e.data[1], e.data[2] || 'debug');
					return;
				}
				else if (e.data[0] === 'assert') {
					medea.DebugAssert('(worker ' + worker_index + ') ' + e.data[1]);
					return;
				}
				return msg(e);
			};
		});

		return true;
	};



	this.define = function(name,deps,init,symbols) {
		if(_stubs[name] !== undefined) {
			medea.DebugAssert('module already present: ' + name);
			return;
		}

		if(symbols) {
			for(var i = 0; i < symbols.length; ++i) {
				medea._SetFunctionStub(symbols[i],name);
			}
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
		medea.LogDebug("addmod: " + name + s);
		// #endif

		// fetch all dependencies first
		medea._FetchDeps(deps,function() {
			// #ifdef LOG
			medea.LogDebug('modready: ' + name);
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

	this._initMod = function(name) {
		var s = _stubs[name];
		if(!s) {
			return;
		}

		// #ifdef LOG
		medea.LogDebug("initmod: " + name);
		// #endif

		s.apply(medea);
		_stubs[name] = null;
	};

	this.GetModSource = function(n) {
		return _sources[n];
	},

	this.FetchMods = this._FetchDeps = function(whom,callback) {
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

			// see if the file has already been loaded, in which case `init` should be either
			// null or a function.
			if (init === undefined) {
				var is_medea_mod = !/\.js$/i.test(whom[i]);

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

				(function(n,is_medea_mod) {
				medea._AjaxFetch(medea.root_url+(is_medea_mod ? 'medea.' +n + '.js' : n),function(text,status) {
					if(status !== 200) {
						medea.DebugAssert('failure loading script ' + n);
						return;
					}

					// #ifdef LOG
					medea.LogDebug("run: " + n);
					// #endif LOG

					_sources[n] = text;

					// global eval() is best for debugging

					// http://perfectionkills.com/global-eval-what-are-the-options/
					window.eval(text);

					/*
					var sc = document.createElement( 'script' );
					sc.type = 'text/javascript';

					// make sure to enclose the script source in CDATA blocks
					// to make XHTML parsers happy.
					sc.innerHTML = '//<![CDATA[\n' + text  + '\n//]]>';
					document.getElementsByTagName('head')[0].appendChild(sc);
					*/

					// non medea modules won't call define, so we need to mimic parts of its behaviour
					// to satisfy all listeners and to keep the file from being loaded twice.
					if(!is_medea_mod) {
						var w = _waiters[n];
						delete _waiters[n];

						_stubs[n] = null;
						for(var i = 0; i < w.length; ++i) {
							w[i]();
						}
					}

				});
				}(n,is_medea_mod));
			}
		}

		if(nodelay) {
			callback();
		}
	};

	this._Require = function(whom,callback) {
		var whom = whom instanceof Array ? whom : [whom];
		var cnt = 0;

		for(var i = 0; i < whom.length; ++i) {
			var init = _stubs[whom[i]];
			if (init === undefined) {
				medea.DebugAssert('init stub missing for file ' + whom[i] + ', maybe not loaded yet?');
				continue;
			}
			if (!init) {
				continue;
			}

			medea._initMod(whom[i]);
		}
	};

	this._AjaxFetch = function(url, callback, no_client_cache) {
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
				callback(ajax.responseText,ajax.status);
			}
		}

		ajax.open("GET",url + (no_client_cache ?  '?nocache='+(new Date()).getTime() : ''),true);
		ajax.send(null);
	};

	this._UpdateFrameStatistics = function(dtime) {
		this.statistics.count_frames += 1;
		var e = this.statistics.exact_fps = 1/dtime;

		this.dtmin_fps = Math.min(this.dtmin_fps,e);
		this.dtmax_fps = Math.max(this.dtmin_fps,e);

		this.dtacc += dtime;
		++this.dtcnt;

		if (this.dtacc > 0.5) {
			if ( this.statistics.smoothed_fps > 0) {
				this.statistics.smoothed_fps = this.statistics.smoothed_fps*0.3+ 0.7/(this.dtacc/this.dtcnt);
			}
			else {
				this.statistics.smoothed_fps = this.dtcnt/this.dtacc;
			}

			this.dtcnt *= 0.33;
			this.dtacc *= 0.33;

			this.statistics.min_fps = this.dtmin_fps;
			this.statistics.max_fps = this.dtmax_fps;
		}

		this.statistics.vertices_frame = this.statistics.primitives_frame = this.statistics.batches_frame = 0;
	};

	this._GetSet = function(what) {
		return function(f) {
			if (f === undefined) {
				return this[what];
			}
			this[what] = f;
		};
	};


	this._SetFunctionStub = function(name,module_dep) {
	// #ifdef DEBUG
			if (this[name]) {
				medea.DebugAssert("function stub already registered: " + name);
				return;
			}
// #endif
		
		_deps[name] = module_dep = module_dep instanceof Array ? module_dep : [module_dep];
		this[name] = function() {
// #ifdef DEBUG
			var old = this[name];
// #endif

			this._Require(module_dep);

// #ifdef DEBUG
			if (old == this[name]) {
				medea.DebugAssert("infinite recursion, something is wrong here, function stub should have been removed: " + name);
				return;
			}
// #endif
 			return this[name].apply(this,arguments);
		};
	};

	this._NextPow2 = function( s ){
		// dumb way, might use the bit fiddling hack some day?
		return Math.pow( 2, Math.ceil( Math.log( s ) / Math.log( 2 ) ) );
	};

	this._IsPow2 = function(w) {
		return w !== 0 && (w & (w - 1)) === 0;
	};

	this._GetPath = function(src) {
		return src.replace(/^(.*[\\\/])?(.*)/,'$1');
	}


	var medea_api = function() {
		medea._SetFunctionStub.apply(medea,arguments);
	};

	// **************************************************************************
	// List of all API functions along with the modules in which they can be found.
	// If an API is called without the corresponding module, an error message 
	// is displayed.

	medea_api("CreateDirectionalLight","light");

	medea_api("FullscreenMode","fullscreen");
	medea_api("FullscreenModeKey","fullscreen");

	medea_api("CreateInputHandler","input_handler");
	medea_api("IsMouseDown","input");
	medea_api("IsMouseButtonDown","input");
	medea_api("IsKeyDown","input");
	medea_api("GetMousePosition","input");
	medea_api("GetMouseDelta","input");

	medea_api("SetKeyMap","keymap");
	medea_api("GetKeyMap","keymap");

	medea_api("CreateNode","node");
	medea_api("CreateEntity","entity");

	medea_api("CreateViewport","viewport");
	medea_api("GetViewports","viewport");
	medea_api("CreateCameraNode","camera");

	medea_api("FixResourceName","filesystem");
	medea_api("MakeResource","filesystem");
	medea_api("Fetch","filesystem");
	medea_api("FetchMultiple","filesystem");

	medea_api("CreatePassFromShaderPair","material");
	medea_api("CloneMaterial","material");
	medea_api("ClonePass","material");
	medea_api("CreateMaterial","material");
	medea_api("CreateSimpleMaterialFromShaderPair","material");
	medea_api("CreateSimpleMaterialFromColor","material");
	medea_api("CreateSimpleMaterialFromTexture","material");
	medea_api("CreateSimpleMaterialFromVertexColor","material");

	medea_api("CreateVertexBuffer","vertexbuffer");
	medea_api("CreateIndexBuffer","indexbuffer");

	medea_api("CreateShader","shader");
	medea_api("CreateImage","image");
	medea_api("CreateTexture","texture");
	medea_api("CreateDefaultTexture","texture");
	medea_api("CreateLODTexture","lodtexture");
	medea_api("CreateNeutralTexture","lodtexture");
	medea_api("CreateCubeTexture","cubetexture");

	medea_api("CreateStandardMesh_Plane","standardmesh");
	medea_api("CreateStandardMesh_Cube","standardmesh");
	
	medea_api("CreateSimpleMesh","mesh");
	medea_api("CloneMesh","mesh");
	medea_api("QueryMeshCache","mesh");

	medea_api("SetState","renderstate");
	medea_api("SetDefaultState","renderstate");
	medea_api("CreateRenderQueueManager","renderqueue");

	medea_api("CreateCamera","camera");
	medea_api("CreateCamController","camcontroller");

	medea_api("CreateBB","frustum");
	medea_api("MergeBBs","frustum");
	medea_api("TransformBB","frustum");

	medea_api("LoadScene","sceneloader");
	medea_api("LoadSceneFromResource","sceneloader");

	medea_api("CreateSkyboxNode","skybox");
	medea_api("CreateSkydomeNode","skydome");

	medea_api("CreateTerrainTileMesh","terraintile");

	medea_api("CreateDefaultTerrainDataProviderFromResource","terrain");
	medea_api("CreateDefaultTerrainDataProvider","terrain");
	medea_api("CreateTerrainNode","terrain");

	medea_api("CreateVisualizer","visualizer");
	medea_api("CreateVisualizer_ShowNormals","visualizer_shownormals");
	medea_api("CreateVisualizer_ShowBBs","visualizer_showbbs");
	medea_api("CreateCompositor","compositor");

	medea_api("CreateFromToAnimator","simpleanim");
	medea_api("CreateSplinePathAnimator","splinepath");
	medea_api("CreateTerrainHeightPathAnimator","terrainheightpath");

	medea_api("CreateStatePool","statepool");
	medea_api("GetDefaultStatePool","statepool");

	// for internal use by build.py only
	this._markScriptAsLoaded = function(name) {
		_stubs[name] = null;
	}

	// for internal use by build.py only
	this._initLibrary = function() {

		// Initialization has two phases, the first of which is used to load utility libraries
		// that all medea modules may depend upon. This also involves creating a webgl canvas
		// (which is accessible through the medea.gl namespace)
		this._FetchDeps(_initial_pre_deps, function() {
			if (_callback_pre) {
				if(!_callback_pre.apply(medea)) {
					return;
				}
			}

			++readyness;
			medea._FetchDeps(_initial_deps, function() {
				++readyness;
				if (_callback) {
					_callback.apply(medea);
				}
			});
		});

		this._initLibrary = null;
	};

	if (window.medea_is_compiled === undefined) {
		this._initLibrary();
	}

} )(scripts[scripts.length-1]);




