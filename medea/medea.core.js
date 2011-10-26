
// #include "sprintf-0.7.js"

var scripts = document.getElementsByTagName('script');

medea = new (function(sdom) {
	var medea = this;

	// workaround if Array.forEach is not available
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
	
	// https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/isArray
	if (typeof Array.isArray != 'function') {
	  Array.isArray = function (obj) {
		return Object.prototype.toString.call(obj) == '[object Array]';
	  };
	}
	
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


	// constants
	this.FRAME_VIEWPORT_UPDATED = 0x1;
	this.FRAME_CANVAS_SIZE_CHANGED = this.FRAME_VIEWPORT_UPDATED | 0x2;
	
	
	this.VISIBLE_NONE = 0x0;
	this.VISIBLE_ALL = 0x1;
	this.VISIBLE_PARTIAL = 0x2;
	
	this.AssertionError = function(what) {this.what = what;};
	this.FatalError = function(what) {this.what = what;};
	
	this.root = sdom.src.replace(/^(.*[\\\/])?(.*)/,'$1');
	
	// collect initial dependencies - for example the scenegraph module is always needed
	var _initial_deps = ['node','viewport'], _initial_pre_deps = ['webgl-utils.js','webgl-debug.js','sprintf-0.7.js','glMatrix.js'];
	var _waiters = {}, _deps = {}, _stubs = {}, _callback = undefined, _callback_pre = undefined;
	
	this.Ready = function(where,settings,deps,callback) {
		if(deps) {
			_initial_deps = _initial_deps.concat(deps);
		}
		
		// first initialization phase -- create webgl canvas and prepare environment
		_callback_pre = function() {
			this.sprintf = sprintf;
			this.canvas  = document.getElementById(where); 
			this.gl = WebGLUtils.setupWebGL(this.canvas);
			
			_callback_pre = _initial_pre_deps = undefined;
		};
		
		// second phase of initialization -- prepare the rest and invoke the Ready() callback
		// to pass control to the user.
		_callback = function() {
			this.cached_cw = this.canvas.width, this.cached_ch = this.canvas.height;
			
			this.settings = settings || {};
			this.settings.fps = this.settings.fps || 60;

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

			this.default_zorder = 0;

			this.tick_callbacks = {};
			this.stop_asap = false;

			this.frame_flags = 0;
			this.debug_panel = null;

			// always allocate a default root node
			this.root = medea.CreateNode("root");

			this.viewports = [];
			this.enabled_viewports = 0;
			
			this.key_state = {};
			
			// set event handlers on the canvas panel
			window.addEventListener('keydown', function (event) { medea._HandleKeyDown(event); }, true);
			window.addEventListener('keyup', function (event) { medea._HandleKeyUp(event);  }, true);
			
			canvas.onmousedown = function (event) { medea._HandleMouseDown(event); };
			canvas.onmouseup   = function (event) { medea._HandleMouseUp(event);  };
			canvas.onmousemove = function (event) { medea._HandleMouseMove(event); };
			this.mouse_down = false;
		
			_callback = _initial_deps = undefined;
			callback();
		};
	};
	
	this.IsMouseDown = function() {
		return this.mouse_down;
	};
	
	this.IsKeyDown = function(keycode) {
		return this.key_state[keycode] || false;
	};
	
	this.GetMouseDelta = function() {
		return this.lastMouseDelta || [0,0,0];
	};
	
	this.GetMousePosition = function() {
		return this.lastMousePosition || [-1,-1];
	};
	
	
// #ifndef DEBUG
	this.LogDebug = function(message) {
	};
// #else
	this.LogDebug = function(message) {
		console.log('DEBUG: ' + message);
	};
// #endif
	
	this.LogError = function(message) {
		console.log('ERROR: ' + message);
	};
	

	this.GetSettings = function() {
		return this.settings;
	};

	this.GetRootNode = function() {
		return this.root;
	};

	this.SetRootNode = function(node) {
		this.root = node;
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

	this.CreateNode = function(name,parent) {
		this._Require("node");
		return new this.Node(name,parent);
	};

	this.CreateViewport = function(name,x,y,w,h,zorder) {
		this._Require("viewport");

		// if no z-order is given, default to stacking
		// viewports on top of each other in creation order.
		if (zorder === undefined) {
			zorder = this.default_zorder++;
		}

		var vp = new this.Viewport(name,x,y,w,h,zorder);

		zorder = vp.GetZOrder();
		var vps = this.viewports;		

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
	};
	

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
	this.DebugAssert = function(what) {
		what = "Medea DEBUG ASSERTION: " + what;
		alert(what);
		throw new medea.AssertionError(what);
	};
// #endif

	this.Start = function() {
		if (!this.stop_asap) {
			window.requestAnimFrame(function() { medea.Start(); },this.canvas);

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
		return this.gl && this.viewports.length;
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
		this.VisitGraph(this.root,function(node) {
			var e = node.GetEntities();
			for(var i = 0; i < e.length; ++i) {
				e[i].Update(dtime);
			}

			node.Update(dtime);
			return true;
		});

		// adjust render settings if we switched to multiple viewports or vice versa
		if (this.frame_flags & medea.FRAME_VIEWPORT_UPDATED) {
			// XXX
			if (this.enabled_viewports>1) {
				this.gl.enable(this.gl.SCISSOR_TEST);
			}
			else {
				this.gl.disable(this.gl.SCISSOR_TEST);
			}
		}

		// perform rendering
		for(var vn = 0; vn < this.viewports.length; ++vn) {
			this.viewports[vn].Render(this,dtime);
		}

		// draw debug pannel
		if (this.debug_panel) {
			this.debug_panel.Update();
		}

		this.frame_flags = 0;
	};	


	this.VisitGraph = function(node,visitor) {
		if (!visitor(node)) {
			return false;
		}

		var c = node.children;
		for(var i = 0; i < c.length; ++i) {
			if(!this.VisitGraph(c[i],visitor)) {
				return false;
			}
		}

		return true;
	};
	
	
	this.Invoke = function(func) {
		// #ifdef DEBUG
		if (typeof func !== 'string') {
			medea.DebugAssert('Invoke expects a string');
		}
		// #endif
					
		func = this[func];
		var outer_arguments = arguments;
		
		this._Require(deps[func],function() {
			func.apply(this,Array.prototype.slice.apply(outer_arguments,1));
		});
	};

	this._HandleKeyDown = function(event) {
		this.key_state[event.keyCode] = true;
	};
	
	this._HandleKeyUp = function(event) {
		this.key_state[event.keyCode] = false;
	};
	
	
	this._HandleMouseDown = function(event) {
		this.mouse_down = true;
	};
	
	this._HandleMouseUp = function(event) {
		this.mouse_down = false;
	};
	
	this._HandleMouseMove = function(event) {
		// XXX use getCapture if available?
		this.lastMouseDelta = this.lastMousePosition 
			? [	event.clientX - this.lastMousePosition[0],
				event.clientY - this.lastMousePosition[1],
				this.lastMouseDelta[2]+1
			] 
			: [0,0,0];
			
		this.lastMousePosition = [event.clientX, event.clientY,this.lastMouseDelta[2]];
	};
	
	this._addMod = function(name,deps,init) {
		if(_stubs[name] !== undefined) {
			medea.DebugAssert('module already present: ' + name);
			return;
		}
		
		// #ifdef LOG
		medea.LogDebug("addmod: " + name + (deps.length ? ', deps: ' + deps : ''));
		// #endif
		
		var w = _waiters[name];
		
		// fetch all dependencies first 
		medea._Fetch(deps,function() {
			// #ifdef LOG
			medea.LogDebug('modready: ' + name);
			// #endif
			
			_stubs[name] = init;
			for(var i = 0; i < w.length; ++i) {
				w[i]();
			}
			
			delete _waiters[name];
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

	this._Fetch = function(whom,callback) {
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
				medea._AjaxFetch(medea.root+'/'+(is_medea_mod ? 'medea.' +n + '.js' : n),function(text,status) {
					if(status !== 200) {
						medea.DebugAssert('failure loading script ' + n);
						return;
					}
					
					// #ifdef LOG
					medea.LogDebug("run: " + n);
					// #endif LOG
					
					var sc = document.createElement( 'script' );
					sc.type = 'text/javascript';
					
					// make sure to enclose the script source in CDATA blocks 
					// to make XHTML parsers happy.
					sc.innerHTML = '//<![CDATA[\n' + text  + '\n//]]>';                      
					document.body.appendChild(sc);  
					
					// non medea modules won't call _addMod, so we need to mimic parts of its behaviour
					// to satisfy all listeners and to keep the file from being loaded twice.
					if(!is_medea_mod) {
						var w = _waiters[n];
						
						_stubs[n] = null;
						for(var i = 0; i < w.length; ++i) {
							w[i]();
						}
						delete _waiters[n];
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
    		} else {                                  
      			ajax = new ActiveXObject("Microsoft.XMLHTTP");
    		}       

		ajax.onreadystatechange = function() {  
        		if (ajax.readyState==4) {                          
          			callback(ajax.responseText,ajax.status);                                             
       			}       
		}               
		
		if (no_client_cache) {
			url += '?nocache='+(new Date()).getTime();
		}

		ajax.open("GET",url,true);
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
	

	this._SetFunctionStub = function(name,module_dep) {
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
	
	this._SetFunctionStub("CreateNode","node");
	
	this._SetFunctionStub("MakeResource","filesystem");
	this._SetFunctionStub("Fetch","filesystem");
	this._SetFunctionStub("FetchMultiple","filesystem");
	
	this._SetFunctionStub("CreateSimpleMaterialFromColor","material");
	this._SetFunctionStub("CreateSimpleMaterialFromTexture","material");
	this._SetFunctionStub("CreatePassFromShaderPair","material");
	
	this._SetFunctionStub("CreateVertexBuffer","vertexbuffer");
	this._SetFunctionStub("CreateIndexBuffer","indexbuffer");
	
	this._SetFunctionStub("CreateShader","shader");
	this._SetFunctionStub("CreateTexture","texture");
	
	this._SetFunctionStub("CreateStandardMesh_Plane","standardmesh");
	this._SetFunctionStub("CreateStandardMesh_Cube","standardmesh");
	this._SetFunctionStub("CreateSimpleMesh","mesh");
	
	this._SetFunctionStub("SetState","renderstate");
	this._SetFunctionStub("CreateRenderQueueManager","renderqueue");
	
	this._SetFunctionStub("CreateCamera","camera");
	this._SetFunctionStub("CreateCamController","camcontroller");
	
	this._SetFunctionStub("CreateBB","frustum");
	this._SetFunctionStub("MergeBBs","frustum");
	this._SetFunctionStub("TransformBB","frustum");
	
	
	// Initialization has two phases, the first of which is used to load utility libraries
	// that all medea modules may depend upon. This also involves creating a webgl canvas
	// (which is accessible through the medea.gl namespace)
	this._Fetch(_initial_pre_deps, function() {
		_callback_pre.apply(medea);
		medea._Fetch(_initial_deps, function() {
			_callback.apply(medea);
		});
	});
	
} )(scripts[scripts.length-1]);




