


medea = new (function() {

	this.Init = function(where,settings) {
		this.canvas  = document.getElementById(where); 
		this.gl = WebGLUtils.setupWebGL(this.canvas);
		
		this.settings = settings || {};
		this.settings.fps = this.settings.fps || 60;

		this.statistics = {
			'count_frames' : 0
		};

		this.root = this.Node("root");
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
		return new this.Node(name,parent);
	}

	this.CreateViewport = function(name,x,y,z,w,h,zorder) {
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
		window.requestAnimFrame(function() { medea.Start; },null);
		this.DoSingleFrame();
	};

	this.CanRender = function() {
		return this.gl && this.viewports.length;
	}

	this.DoSingleFrame = function(dtime) {
		this.statistics.count_frames++;
		if (!this.CanRender()) {
			this.NotifyFatal("Not ready for rendering; need a GL context and a viewport");
			return;
		}

		// get time delta if not specified
		if (!dtime) {
			if(!this.timer) {
				this.timer = new Date();
				this.time = this.timer.getTime();
				dtime = 0.0;
			}
			else {
				var old = this.time;
				this.time = this.timer.getTime();

				dtime = this.time - old;
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

} )();


