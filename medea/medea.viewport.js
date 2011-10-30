
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander Ċ. Gessler 
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medea._addMod('viewport',['camera','renderqueue'],function(undefined) {
	var medea = this, gl = medea.gl;
	
	medea._DefaultStateDependencies = {
		W : ["WVP","WV"],
		V : ["WVP","WV","VP"],
		P : ["WVP","VP"],
	};
	
	medea._DefaultDerivedStates = {
	
		"VP": function(statepool) {
			var m = mat4.create();
			mat4.multiply(statepool.GetQuick("P"),statepool.GetQuick("V"),m);
			return m;
		},
	
		"WVP": function(statepool) {
			var m = mat4.create();
			mat4.multiply(statepool.Get("VP"),statepool.GetQuick("W"),m);
			return m;
		},
		
		"WIT": function(statepool) {
			var m = mat4.create();
			// XXX inverse() does not actually exist.
			mat4.inverse(statepool.GetQuick("W"),m);
			mat4.transpose(m,m);
			return m;
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
			
			medea._Require("camera");
			this.SetCamera(camera || new medea.Camera());

			// viewports are initially enabled since this is what 
			// users will most likely want.
			this.Enable();
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
				gl.clear(this.clearFlags);
			}

			// and traverse all nodes in the graph, collecting their render jobs
			var rq = this.rqManager;
			medea.VisitGraph(medea.RootNode(),function(node,parent_visible) {
			
				var vis = medea.VISIBLE_ALL /*parent_visible == medea.VISIBLE_ALL ? medea.VISIBLE_ALL : node.Cull(frustum)*/, e = node.GetEntities();
				if(vis == medea.VISIBLE_NONE) {
					return medea.VISIBLE_NONE;
				}
				
				if(vis == medea.VISIBLE_ALL || e.length === 1) {
					node.GetEntities().forEach(function(val,idx,outer) {
						val.Render(this,val,node,rq);
					});
					
					return vis;
				}
			
				// partial visibility and more than one entity, cull per entity
				e.forEach(function(val,idx,outer) {
					if(e.Cull(frustum) != medea.VISIBLE_NONE) {
						val.Render(this,val,node,rq);
					}
				});
				
				return medea.VISIBLE_PARTIAL;
			});
			
			// setup a fresh pool to easily pass global rendering states to all renderables
			// eventually these states will be automatically transferred to shaders.
			var statepool = new medea.StatePool();
			
			statepool.Set("V",this.camera.GetViewMatrix());
			statepool.Set("P",this.camera.GetProjectionMatrix());
			statepool.Set("W",mat4.identity(mat4.create()));
			
			this.rqManager.Flush(statepool);
			medea.gl.flush();
			
			this.updated = false;
		}
	});
});
