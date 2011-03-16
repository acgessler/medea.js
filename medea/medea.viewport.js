

medea.stubs["Viewport"] = (function() {

	var medea = this, gl = medea.gl;

	// use medea.CreateViewport() instead
	this.Viewport = function(name,x,y,w,h,zorder) {		
		this.name = name;
		this.x = x || 0;
		this.y = y || 0;
		this.w = w || 1.0;
		this.h = h || 1.0;
		this.zorder = zorder || 0;

		// viewports are initially enabled since this is what 
		// users will most likely want.
		this.Enable();
	}

	this.Viewport.prototype = {

		name:"",
		w : 1.0,
		h : 1.0,
		x : 0.0,
		y : 0.0,
		zorder : 0,
		ccolor : [0.0,0.0,0.0,1.0],
		clearFlags : gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT,
		enabled : 0xdeadbeef,
		updated : false,
		
		GetName: function() {
			return this.name;
		},

		IsEnabled: function() {
			return this.enabled;
		},

		Enable: function(doit) {
			doit = doit || true;
			if (this.enabled === doit) {
				return;
			}

			this.enabled = doit;

			// changing the 'enabled' state of a viewport has global effect
			medea.enabled_viewports += (doit?1:-1);
			medea.frame_flags |= medea.FRAME_VIEWPORT_UPDATED;

			this.updated = true;
		},

		GetZOrder: function() {
			return this.zorder;
		},

		GetClearColor: function() {
			return this.ccolor;
		},

		SetClearColor: function(col) {
			this.ccolor = col;
			this.updated = true;
		},		

		SetWidth: function(w) {
			this.w = w;
			this.updated = true;
		},

		SetHeight: function(h) {
			this.h = h;
			this.updated = true;
		},

		SetX: function(x) {
			this.x = x;
			this.updated = true;
		},

		SetY: function(y) {
			this.y = y;
			this.updated = true;
		},

		SetPos: function(x,y) {
			this.y = y;
			this.x = x;
			this.updated = true;
		},

		SetSize: function(w,h) {
			this.w = w;
			this.h = h;
			this.updated = true;
		},

		SetRect: function(x,y,w,h) {
			this.w = w;
			this.h = h;
			this.y = y;
			this.x = x;
			this.updated = true;
		},


		GetWidth: function() {
			return this.w;
		},

		GetHeight: function() {
			return this.h;
		},

		GetX: function() {
			return this.x;
		},

		GetY: function() {
			return this.y;
		},

		GetRect: function() {
			return [this.x,this.y,this.w,this.h];
		},

		GetPos: function() {
			return [this.x,this.y];
		},

		GetSize: function() {
			return [this.w,this.h];
		},



		Render: function(dtime) {
			if (!this.enabled) {
				return;
			}

			var rq = null; // medea.RenderQueueManager();
			
			// setup the viewport - we usually only need to do this if we're competing with other viewports
			if (medea.enabled_viewports>1 || medea.frame_flags & medea.FRAME_VIEWPORT_UPDATED || this.updated) {
				var cw = medea.canvas.width, ch = medea.canvas.height;
				var cx = Math.floor(this.x*cw), cy = Math.floor(this.y*cw);
				cw = Math.floor(this.w*cw), ch = Math.floor(this.h*ch);

				if (this.clearFlags) {
					if (this.clearFlags & gl.COLOR_BUFFER_BIT) {
						gl.clearColor(this.ccolor[0],this.ccolor[1],this.ccolor[2],this.ccolor[3]);
					}

					gl.scissor(cx,cy,cw,ch);
				}

				gl.viewport(cx,cy,cw,ch);
			}

			// clear the viewport
			if (this.clearFlags) {
				gl.clear(this.clearFlags);
			}

			// and traverse all nodes in the graph, collecting their render jobs
			medea.VisitGraph(medea.GetRootNode(),function(node) {
				var e = node.GetEntities();
				for(var i = 0; i < e.length; ++i) {
					e[i].Render(vl,rq);
				}
			});
			//rq.Flush();

			this.updated = false;
		}
	};
	
	medea.stubs["Viewport"] = null;
});
