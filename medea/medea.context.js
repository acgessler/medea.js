
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler
 * licensed under the terms and conditions of a 3 clause BSD license.
 */


// note: this file is compiletime-included by medea.core.js and not used as a module.
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
var Context = this.Context = function(where, settings, deps, user_on_ready, user_on_failure) {
	var medea = this;

	if(!(this instanceof Context)) {
		return new Context(where, settings, deps, user_on_ready, user_on_failure);
	}

	// TODO: restructure constants
	// constants
	this.FRAME_VIEWPORT_UPDATED = 0x1;
	this.FRAME_CANVAS_SIZE_CHANGED = this.FRAME_VIEWPORT_UPDATED | 0x2;

	this.VISIBLE_NONE = 0x0;
	this.VISIBLE_ALL = 0x1;
	this.VISIBLE_PARTIAL = 0x2;

	var scripts = document.getElementsByTagName('script');
	this.root_url = scripts[scripts.length-1].src.replace(/^(.*[\\\/])?(.*)/,'$1');

	this.statepool = {};
	this._workers = {};

	// collect initial dependencies - for example the scenegraph module and the mathlib is always needed
	var _initial_deps = ['node','viewport'];
	var _initial_pre_deps = []; 

	if (window.mat4 === undefined) {
		_initial_pre_deps.push('glMatrix.js');
	}

	var _callback = undefined, _callback_pre = undefined, readyness = 0;


	// ---------------------------------------------------------------------------
	/** TODO: documentation 
	*/
	// ---------------------------------------------------------------------------
	this._initMod = function(name) {
		var s = _stubs[name];
		if(!s) {
			return;
		}

		// #ifdef LOG
		medea.LogDebug("initmod: " + name);
		// #endif

		s.apply(this);
		_stubs[name] = null;
	};



	// ------------------------------------------------------------------------
	/** TODO: documentation 
	*/
	// ------------------------------------------------------------------------
	this.GetSettings = function() {
		return this.settings;
	};


	// ------------------------------------------------------------------------
	/** TODO: documentation 
	*/
	// ------------------------------------------------------------------------
	this.RootNode = function(s) {
		if(s === undefined) {
			return this.scene_root;
		}
		this.scene_root = s;
	};


	// ------------------------------------------------------------------------
	/** TODO: documentation 
	*/
	// ------------------------------------------------------------------------
	this.GetStatistics = function() {
		return this.statistics;
	};


	// ------------------------------------------------------------------------
	/** TODO: documentation 
	*/
	// ------------------------------------------------------------------------
	this.SetTickCallback = function(clb,key) {
		this.tick_callbacks[key] = clb;
	};


	// ------------------------------------------------------------------------
	/** TODO: documentation 
	*/
	// ------------------------------------------------------------------------
	this.RemoveTickCallback = function(key) {
		try {
			delete this.tick_callbacks[key];
		} catch(e) {}
	};


	// ------------------------------------------------------------------------
	/** TODO: documentation 
	*/
	// ------------------------------------------------------------------------
	this.EnsureIsResponsive = (function() {
		var should_be_responsive = false;
		return function(enabled) {
			if (enabled === undefined) {
				return should_be_responsive;
			}
			should_be_responsive = enabled;
		}
	}) ();


	// ------------------------------------------------------------------------
	/** TODO: documentation 
	*/
	// ------------------------------------------------------------------------
	this.SetDebugPanel = function(where) {
		this._Require("debug");
		this.debug_panel = new this.DebugPanel(where);
	};


	// ------------------------------------------------------------------------
	/** TODO: documentation 
	*/
	// ------------------------------------------------------------------------
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


	// ------------------------------------------------------------------------
	/** TODO: documentation 
	*/
	// ------------------------------------------------------------------------
	this.StopNextFrame = function(unset_marker) {
		this.stop_asap = !unset_marker;
	};


	// ------------------------------------------------------------------------
	/** TODO: documentation 
	*/
	// ------------------------------------------------------------------------
	this.IsStopMarkerSet = function() {
		return this.stop_asap;
	};


	// ------------------------------------------------------------------------
	/** TODO: documentation 
	*/
	// ------------------------------------------------------------------------
	this.CanRender = function() {
		return this.gl && this.GetViewports().length;
	};


	// ------------------------------------------------------------------------
	/** TODO: documentation 
	*/
	// ------------------------------------------------------------------------
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


	// ------------------------------------------------------------------------
	/** TODO: documentation 
	*/
	// ------------------------------------------------------------------------
	this.GetTime = function() {
		return this.time;
	};


	// ------------------------------------------------------------------------
	/** TODO: documentation 
	*/
	// ------------------------------------------------------------------------
	this.DoSingleFrame = function(dtime) {
		var debug_panel = this.debug_panel;
		if (!this.CanRender()) {
			this.NotifyFatal("Not ready for rendering; need a GL context and a viewport");
			return;
		}

		if (debug_panel) {
			debug_panel.BeginFrame();
		}

		// get time delta if not specified
		if (!dtime) {
			var old = this.time || 0;
			this.time = Date.now() * 0.001;

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

		if (debug_panel) {
			debug_panel.EndFrame();
		}

		this.frame_flags = 0;
	};


	// ------------------------------------------------------------------------
	/** TODO: documentation 
	*/
	// ------------------------------------------------------------------------
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


	// ------------------------------------------------------------------------
	/** TODO: documentation 
	*/
	// ------------------------------------------------------------------------
	this.CreateWorker = function() {
		var worker_index_source = 0;
		return function(name, callback) {
			var Blob =  window.Blob
			,	BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder
			,	URL = window.URL || window.webkitURL;
			;


			if (!Blob && !BlobBuilder) {
				medea.LogDebug('BlobBuilder not available, cannot use web worker');
				callback(null);
				return false;
			}

			if (!Worker) {
				medea.LogDebug('Worker not available, cannot use web worker');
				callback(null);
				return false;
			}

			
			if (!URL || !URL.createObjectURL) {
				medea.LogDebug('URL.createObjectURL not available, cannot use web worker');
				callback(null);
				return false;
			}

			medea.FetchMods('worker_base', function() {
				var source = [medea.GetModSource('worker_base'),'\n',medea.GetModSource(name )]
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
			medea._FetchDeps(deps, function() {
				++readyness;
				if (_callback) {
					_callback.apply(medea);
				}
			});
		});

		this._initLibrary = null;
	};

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
		user_on_ready(this);
	};

	if (window.medea_is_compiled === undefined) {
		this._initLibrary();
	}
};
