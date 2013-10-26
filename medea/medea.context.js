
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler
 * licensed under the terms and conditions of a 3 clause BSD license.
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


	// #ifdef DEBUG

	medealib.DebugAssert(!deps || Array.isArray(deps), 
		'`deps` parameter must be array, or undef');
	medealib.DebugAssert(where.substring, 
		'`where` parameter must be a string');

	// #endif


	// TODO: restructure constants
	// constants
	medeactx.FRAME_VIEWPORT_UPDATED = 0x1;
	medeactx.FRAME_CANVAS_SIZE_CHANGED = medeactx.FRAME_VIEWPORT_UPDATED | 0x2;

	medeactx.VISIBLE_NONE = 0x0;
	medeactx.VISIBLE_ALL = 0x1;
	medeactx.VISIBLE_PARTIAL = 0x2;

	
	var _modules_loaded = {};


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

				// #ifdef DEBUG
				medealib.DebugAssert(medealib.IsModuleRegistered(mod), "expect module to be registered: " + mod);
				// #endif

				// #ifdef LOG
				medealib.LogDebug("initmod: " + mod);
				// #endif

				// init_stub[0] init function for *this* module
				// init_stub[1] list of (direct) module dependencies - note that
				// the JS files have been fetched already by _RegisterMods(),
				// so LoadModules() does not need to do async ops and we don't
				// need to supply a callback.
				init_stub = medealib._GetModuleInfo( mod);
				medeactx.LoadModules(init_stub[1]);
					
				_modules_loaded[mod] = true;
				init_stub[0].apply(medeactx);
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
	/** TODO: documentation 
	*/
	// ------------------------------------------------------------------------
	medeactx.SetDebugPanel = function(where) {
		if(medeactx.debug_panel !== null) {
			return;
		}
		medeactx.debug_panel = false;
		medeactx.LoadModules("debug", function() {
			medeactx.debug_panel = new medeactx.DebugPanel(where);
		});
	};


	// ------------------------------------------------------------------------
	/** TODO: documentation 
	*/
	// ------------------------------------------------------------------------
	medeactx.Start = function() {
		if (!medeactx.stop_asap) {
			window.requestAnimationFrame(function() { 
				medeactx.Start(); 
			}, medeactx.canvas);

			if (medeactx.debug_panel) {
				//setTimeout(function(){medea.debug_panel.Update();},1000);
			}
		}

		// commented due to Chrome swallowing the stacktrace
	//	try {
			medeactx.DoSingleFrame();
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
	/** TODO: documentation 
	*/
	// ------------------------------------------------------------------------
	medeactx.DoSingleFrame = function(dtime) {
		var debug_panel = medeactx.debug_panel;
		if (!medeactx.CanRender()) {
			medealib.NotifyFatal("Not ready for rendering; need a GL context and a viewport");
			return;
		}

		if (debug_panel) {
			debug_panel.BeginFrame();
		}

		// get time delta if not specified
		if (!dtime) {
			var old = medeactx.time || 0;
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

		// call user-defined logic, operate on a copy of the dictionary just in case
		// somebody changed its contents while we're iterating it.
		var temp_callbacks = [];
		for(var k in medeactx.tick_callbacks) {
			temp_callbacks.push(medeactx.tick_callbacks[k]);
		}
		for(var i = 0; i < temp_callbacks.length; ++i) {
			if(!temp_callbacks[i](dtime)) {
				medeactx.StopNextFrame();
				return;
			}
		}

		// perform update
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

		if (debug_panel) {
			debug_panel.EndFrame();
		}

		medeactx.frame_flags = 0;
	};


	// ------------------------------------------------------------------------
	/** TODO: documentation 
	*/
	// ------------------------------------------------------------------------
	medeactx.VisitGraph = function(node,visitor,status_in) {
		var status = visitor(node,status_in);
		if (!status) {
			return false;
		}

		var c = node.GetChildren();
		for(var i = 0; i < c.length; ++i) {
			medeactx.VisitGraph(c[i],visitor,status);
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
			,	URL = window.URL || window.webkitURL;
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
	medeactx._GetSet = function(what) {
		return function(f) {
			if (f === undefined) {
				return medeactx[what];
			}
			medeactx[what] = f;
		};
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
		// #if DEBUG
		//medeactx.Assert(medeactx.canvas != null, "element with #id \"" + where + "\" not found");
		// #endif

		// create a webgl context
		// try out all the names under which webgl might be available
		var candidates = ["webgl", "experimental-webgl", "webkit-3d", "moz-webgl"]
		,	i
		,	context = null
		;

		for (i = 0; i < candidates.length; ++i) {
			try {
				context = medeactx.canvas.getContext(candidates[i]);
			} catch(ex) {

			}
			// no matter what happens, we take the first non-null context we get
			if (context) {
				break;
			}
		}

		if(!context) {
		// #if LOG
			medeactx.Log('webgl initialization failed','error');
		// #endif
			_callback = undefined;
			if(user_on_failure) {
				user_on_failure();
			}
			return false;
		}
		
		// automatically create debug context if webgl-debug.js is present
		if (window.WebGLDebugUtils !== undefined) {
			context = WebGLDebugUtils.makeDebugContext(context);
		}

	// #ifdef LOG
		medealib.LogDebug('webgl context successfully created');
	// #endif

		medeactx.gl = context;
		return true;
	};


	// ------------------------------------------------------------------------
	// second phase of initialization -- prepare the rest and invoke the 
	// user's callback function.
	function _init_level_1() {
		medeactx.cached_cw = medeactx.canvas.width, medeactx.cached_ch = medeactx.canvas.height;

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

		// always allocate a default root node for the visual scene
		medeactx.scene_root = medeactx.CreateNode("root");

	// #ifdef LOG
		medealib.LogDebug('initialization complete');
	// #endif

		user_on_ready(medeactx);
	};


	// ------------------------------------------------------------------------
	// initialization
	(function() {
		// collect initial dependencies - for example the scenegraph module and the mathlib is always needed
		var _initial_deps = ['node','viewport'];
		var _initial_pre_deps = []; 

		if (window.mat4 === undefined) {
			_initial_pre_deps.push('glMatrix.js');
		}

	// #ifdef LOG
		medealib.LogDebug('fetching first set of dependencies');
	// #endif

		// Initialization has two phases, the first of which is used to load utility libraries
		// that all medea modules may depend upon. medeactx also involves creating a webgl canvas
		// (which is accessible through the medea.gl namespace)
		medeactx.LoadModules(_initial_pre_deps, function() {
			if (!_init_level_0()) {
				return;
			}

	// #ifdef LOG
		medealib.LogDebug('fetching second set of dependencies');
	// #endif
			console.log(_initial_deps.concat(deps || []));
			medeactx.LoadModules(_initial_deps.concat(deps || []), function() {
				_init_level_1();
			});
		});
	}) ();
};
