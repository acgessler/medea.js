


medea = new (function() {

	// used to collect Init() functions for all delay-initialized modules
	this.stubs = {};

	this.Init = function(where,settings) {
		this.canvas  = document.getElementById(where); 
		this.gl = WebGLUtils.setupWebGL(this.canvas);
		
		this.settings = settings || {};
		this.settings.fps = this.settings.fps || 60;

		this.statistics = {
			  count_frames : 0
			, smoothed_fps : 0
			, exact_fps    : 0	
		};

		this.dtacc = 0.0;
		this.dtcnt = 0;

		// always allocate a default root node
		this._Require("Node");
		this.root = new this.Node("root");

		this.viewports = [];
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

	this.CreateNode = function(name,parent) {
		this._Require("Node");
		return new this.Node(name,parent);
	}

	this.CreateViewport = function(name,x,y,z,w,h,zorder) {
		this._Require("Viewport");
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
	}

	this.NotifyFatal = function(what) {
		alert("Medea: " + what);
	}

	this.Start = function() {
		window.requestAnimFrame(function() { medea.Start(); },this.canvas);
		this.DoSingleFrame();
	};

	this.CanRender = function() {
		return this.gl && this.viewports.length;
	}

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

		this._UpdateFrameStatistics(dtime);

		// perform update
		this.VisitGraph(this.root,function(node) {
			var e = node.GetEntities();
			for(var i = 0; i < e.length; ++i) {
				e[i].Update(this,dtime);
			}

			node.Update(dtime);
		});

		// perform rendering
		for(var vn = 0; vn < this.viewports.length; ++vn) {
			this.viewports[vn].Render(this,dtime);
		}
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


	this._UpdateFrameStatistics = function(dtime) {
		this.statistics.count_frames += 1;
		this.statistics.exact_fps = 1/dtime;
		
		this.dtacc += dtime;
		++this.dtcnt;

		if (this.dtcnt > 25) {
			this.statistics.smoothed_fps = this.statistics.smoothed_fps*0.3+ 0.7/(this.dtacc/this.dtcnt);
			
			this.dtcnt *= 0.33;
			this.dtacc *= 0.33;
		}
	};
} )();




