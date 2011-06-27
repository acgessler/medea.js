


medea = new (function() {

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

	// used to collect Init() functions for all delay-initialized modules
	this.stubs = {};


	// constants
	this.FRAME_VIEWPORT_UPDATED = 0x1;
	this.FRAME_CANVAS_SIZE_CHANGED = this.FRAME_VIEWPORT_UPDATED | 0x2;

	this.Init = function(where,settings) {
		this.canvas  = document.getElementById(where); 
		this.gl = WebGLUtils.setupWebGL(this.canvas);

		this.cached_cw = this.canvas.width, this.cached_ch = this.canvas.height;
		
		this.settings = settings || {};
		this.settings.fps = this.settings.fps || 60;

		this.statistics = {
			  count_frames : 0
			, smoothed_fps : -1
			, exact_fps    : -1	
			, min_fps      : -1
			, max_fps      : -1
		};

		this.dtacc = 0.0;
		this.dtcnt = 0;
		this.dtmin_fps = 1e6;
		this.dtmax_fps = 0;

		this.default_zorder = 0;

		this.tick_callback = null;
		this.stop_asap = false;

		this.frame_flags = 0;
		this.debug_panel = null;

		// always allocate a default root node
		this._Require("Node");
		this.root = new this.Node("root");

		this.viewports = [];
		this.enabled_viewports = 0;
		return this.context;
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

	this.GetTickCallback = function() {
		return this.tick_callback;
	};

	this.SetTickCallback = function(clb) {
		this.tick_callback = clb;
	};

	this.CreateNode = function(name,parent) {
		this._Require("Node");
		return new this.Node(name,parent);
	};

	this.CreateViewport = function(name,x,y,w,h,zorder) {
		this._Require("Viewport");

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
		alert("Medea: " + what);
	};

	this.Start = function() {
		if (!this.stop_asap) {
			window.requestAnimFrame(function() { medea.Start(); },this.canvas);

			if (this.debug_panel) {
				//setTimeout(function(){medea.debug_panel.Update();},1000);
			}
		}
		
		this.DoSingleFrame();
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

		// call user-defined logic
		if (this.tick_callback) {
			if(!this.tick_callback(dtime)) {
				this.StopNextFrame();
				return;
			}
		}

		// perform update
		this.VisitGraph(this.root,function(node) {
			var e = node.GetEntities();
			for(var i = 0; i < e.length; ++i) {
				e[i].Update(this,dtime);
			}

			node.Update(dtime);
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
			if(!visitor(c[i])) {
				return false;
			}
		}

		return true;
	};


	this._Require = function(whom) {
		var init = this.stubs[whom];
		if (!init) {
			return;
		}

		init.apply(this);
	};


	this._AjaxFetch = function(url, callback) {

		var ajax;
  		if (window.XMLHttpRequest) {              
      			ajax = new XMLHttpRequest();              
    		} else {                                  
      			ajax = new ActiveXObject("Microsoft.XMLHTTP");
    		}       

		ajax.onreadystatechange = function() {  
        		if (ajax.readyState==4) {                          
          			callback(ajax.responseText,ajax.status,ajax.responseXML);                                             
       			}       
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
	};
} )();




