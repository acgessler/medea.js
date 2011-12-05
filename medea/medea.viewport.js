
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medea._addMod('viewport',['camera','renderqueue'],function(undefined) {
	"use strict";
	var medea = this, gl = medea.gl;

	medea._DefaultStateDependencies = {
		W : ["WVP","WV","WI","WIT",'CAM_POS_LOCAL'],
		V : ["WVP","WV","VP"],
		P : ["WVP","VP"],
		CAM_POS : ['CAM_POS_LOCAL']
	};

	medea._DefaultDerivedStates = {
	
		"CAM_POS_LOCAL": function(statepool) {
			return mat4.multiplyVec3(statepool.Get("WI"),statepool.GetQuick("CAM_POS"),vec3.create());
		},

		"VP": function(statepool) {
			return mat4.multiply(statepool.GetQuick("P"),statepool.GetQuick("V"),mat4.create());
		},

		"WVP": function(statepool) {
			return mat4.multiply(statepool.Get("VP"),statepool.GetQuick("W"),mat4.create());
		},

		"WIT": function(statepool) {
			return mat4.transpose(statepool.Get("WI"),mat4.create());
		},
		
		"WI": function(statepool) {
			return mat4.inverse(statepool.GetQuick("W"),mat4.create());
		},
	};

	// class StatePool
	medea.StatePool = medea.Class.extend({

		init : function(deps,derived_states) {
			this.states = {};
			this.deps = deps || medea._DefaultStateDependencies;
			this.derived_states = derived_states || medea._DefaultDerivedStates;
			this.dirty = {};
		},

		Set : function(key,value) {
			if (key in this.deps) {
				var v = this.deps[key];
				for(var i = 0, e = v.length; i < e; ++i) {
					this.dirty[v[i]] = true;
				}
			}
			return this.states[key] = value;
		},

		Get : function(key) {
			if (key in this.dirty) {
// #ifdef DEBUG
				if (!(key in this.derived_states)) {
					medea.DebugAssert("only derived states can be dirty: " + key);
				}
// #endif
				delete this.dirty[key];
				return this.states[key] = this.derived_states[key](this);
			}

			return this.states[key];
		},

		GetQuick : function(key) {
// #ifdef DEBUG
			if (key in this.derived_states) {
				medea.DebugAssert("only non-derived states can be queried using GetQuick(): " + key);
			}
// #endif
			return this.states[key];
		}
	});

	// class Viewport
	medea.Viewport = medea.Class.extend({
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
		rqManager : null,


		init : function(name,x,y,w,h,zorder,camera) {
			this.name = name;
			this.x = x || 0;
			this.y = y || 0;
			this.w = w || 1.0;
			this.h = h || 1.0;
			this.zorder = zorder || 0;
			this.visualizers = [];

			medea._Require("camera");
			this.SetCamera(camera || new medea.Camera());

			// viewports are initially enabled since this is what
			// users will most likely want.
			this.Enable();
		},


		AddVisualizer : function(vis) {
			if (this.visualizers.indexOf(vis) !== -1) {
				return;
			}

			var ord = vis.GetOrdinal();
			for (var i = 0; i < this.visualizers.length; ++i) {
				if (ord > this.visualizers[i].GetOrdinal()) {
					this.visualizers.insert(i,vis);
					vis._AddViewport(this);
					return;
				}
			}
			this.visualizers.push(vis);
			vis._AddViewport(this);
		},

		RemoveVisualizer : function(vis) {
			var idx = this.visualizers.indexOf(vis);
			if(idx !== -1) {
				vis._RemoveViewport(this);
				this.visualizers.splice(idx,1);
			}
		},


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


		GetAspect: function() {
			return (this.w*medea.canvas.width)/(this.h*medea.canvas.height);
		},


		GetCamera : function() {
			return this.camera;
		},

		SetCamera : function(cam) {
			if (this.camera) {
				this.camera.OnSetViewport(null);
			}
			this.camera = cam;
			if (this.camera) {
				this.camera.OnSetViewport(this);
			}
		},


		Render: function(dtime) {
			if (!this.enabled) {
				return;
			}

			if (!this.rqManager) {
				this.rqManager = medea.CreateRenderQueueManager();
			}

			var rq = this.rqManager;

			// setup the viewport - we usually only need to do this if we're competing with other viewports
			if (medea.enabled_viewports>1 || medea.frame_flags & medea.FRAME_VIEWPORT_UPDATED || this.updated) {
				var cw = medea.canvas.width, ch = medea.canvas.height;
				var cx = Math.floor(this.x*cw), cy = Math.floor(this.y*ch);
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
				gl.depthMask(true);
				gl.clear(this.clearFlags);
			}

			// let the camera class decide which items to render
			var statepool = this.camera._Render(rq);

			// ... and the default behaviour is to simply dispatch all render queues to the GPU
			var RenderProxy = function() {
				rq.Flush(statepool);

			}, RenderWithVisualizers = RenderProxy;

			// ... but we invoke all visualizers in the right order to have them inject their custom logic, if they wish
			for( var i = 0; i < this.visualizers.length; ++i) {
				RenderWithVisualizers = this.visualizers[i].Apply(RenderWithVisualizers,RenderProxy,rq,this);
			}

			RenderWithVisualizers();

			gl.flush();
			this.updated = false;
		}
	});
});



