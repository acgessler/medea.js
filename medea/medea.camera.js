
/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('camera',['statepool'],function(medealib, undefined) {
	"use strict";
	var medea = this;

	medea._CAMERA_DIRTY_FRUSTUM = medea.NODE_FLAG_USER;
	medea._CAMERA_DIRTY_VIEW = medea.NODE_FLAG_USER << 1;
	medea._CAMERA_DIRTY_PROJ = medea.NODE_FLAG_USER << 2;

	var identity = mat4.identity(mat4.create());


	// class Camera
	medea.Camera = medea.Node.extend(
	{
		init : function(name,fovy,aspect,znear,zfar,viewport,culling) {
			this._super(name, medea.NODE_FLAG_NO_SCALING);
			this.name = name || ("UnnamedCamera_" + this.id);

			this.view = mat4.identity(mat4.create());
			this.proj = mat4.identity(mat4.create());
			this.frustum = null;

			this.fovy = fovy || 45;
			this.aspect = aspect;
			this.znear = znear || 1;
			this.zfar = zfar || 10000;
			this.culling = culling === undefined ? true: culling;

			this.viewport = null;
			if (viewport) {
				viewport.Camera(this);
			}

			this.flags |= medea._CAMERA_DIRTY_PROJ | medea._CAMERA_DIRTY_VIEW | medea._CAMERA_DIRTY_FRUSTUM;
		},


		GetViewMatrix : function() {
			this._UpdateViewMatrix();
			return this.view;
		},

		GetProjectionMatrix : function() {
			this._UpdateProjectionMatrix();
			return this.proj;
		},

		GetFrustum : function() {
			this._UpdateFrustum();
			return this.frustum;
		},

		Culling: medealib.Property('culling'),
		Name: medealib.Property('name'),

		GetViewport : function() {
			return this.viewport;
		},

		ZNear : function(f) {
			if (f === undefined) {
				return this.znear;
			}
			this.znear = f;
			this.flags |= medea._CAMERA_DIRTY_PROJ | medea._CAMERA_DIRTY_FRUSTUM;
		},

		ZFar : function(f) {
			if (f === undefined) {
				return this.zfar;
			}
			this.zfar = f;
			this.flags |= medea._CAMERA_DIRTY_PROJ | medea._CAMERA_DIRTY_FRUSTUM;
		},

		Aspect : function(f) {
			if (f === undefined) {
				return this.aspect;
			}
			this.aspect = f;
			this.flags |= medea._CAMERA_DIRTY_PROJ | medea._CAMERA_DIRTY_FRUSTUM;
		},

		FOV : function(f) {
			if (f === undefined) {
				return this.fovy;
			}
			this.fovy = f;
			this.flags |= medea._CAMERA_DIRTY_PROJ | medea._CAMERA_DIRTY_FRUSTUM;
		},


		_OnSetViewport : function(vp) {
			this.viewport = vp;
		},

		_SetTrafoDirty : function() {
			this._super();
			this.flags |= medea._CAMERA_DIRTY_VIEW | medea._CAMERA_DIRTY_FRUSTUM;
		},

		_UpdateFrustum : function() {
			if (!(this.flags & medea._CAMERA_DIRTY_FRUSTUM)) {
				return this.frustum;
			}

			this.frustum = medea.ExtractFrustum(this.GetViewMatrix(), this.GetProjectionMatrix());

			this.flags &= ~medea._CAMERA_DIRTY_FRUSTUM;
			return this.frustum;
		},

		_UpdateViewMatrix : function() {
			if (!(this.flags & medea._CAMERA_DIRTY_VIEW)) {
				return this.view;
			}

			// the view matrix is the inverse of the camera node's global
			// transformation. As we do not permit any scaling on this
			// matrix, it only consists of a translation vector t^T (whose
			// inverse is -t^T * r) and a orthogonal 3x3 sub matrix r (whose 
			// inverse is r^T).
			var global = this.GetGlobalTransform()

			var view = this.view;

			var v0  = view[0]  = global[0];
			var v1  = view[1]  = global[4];
			var v2  = view[2]  = global[8];

			var v4  = view[4]  = global[1];
			var v5  = view[5]  = global[5];
			var v6  = view[6]  = global[9];

			var v8  = view[8]  = global[2];
			var v9  = view[9]  = global[6];
			var v10 = view[10] = global[10];

			var ex = -global[12]
			var ey = -global[13]
			var ez = -global[14]

			view[12] = ex * v0 + ey * v4 + ez * v8
			view[13] = ex * v1 + ey * v5 + ez * v9
			view[14] = ex * v2 + ey * v6 + ez * v10

			this.flags &= ~medea._CAMERA_DIRTY_VIEW;
			return this.view;
		},

		_UpdateProjectionMatrix : function() {
			if (!(this.flags & medea._CAMERA_DIRTY_PROJ)) {
				return this.proj;
			}

			var aspect = this.aspect;
			if (aspect === undefined) {
				// #if DEBUG
				medealib.DebugAssert(!!this.viewport,"aspect may only be omitted while the camera is assigned to a viewport");
				// #endif

				aspect = this.viewport.GetAspect();
			}

			mat4.perspective(this.fovy,aspect,this.znear,this.zfar,this.proj);

			this.flags &= ~medea._CAMERA_DIRTY_PROJ;
			return this.proj;
		},

		// Optimized rendering if the subtree up to (and including) |root_node|
		// is known to be fully visible.
		_RenderRecursively : function(root_node, rq) {
			var outer = this;
			// Traverse all nodes in the graph and collect their render jobs
			medea.VisitGraph(root_node, function(node, parent_visible) {
				if(!node.Enabled()) {
					return medea.VISIBLE_NONE;
				}

				// Call node Render() implementation, then all entities
				node.Render(outer, rq, medea.VISIBLE_ALL);
				node.GetActiveEntities(outer).forEach(function(val) {
					val.Render(outer, node, rq);
				});

				return medea.VISIBLE_ALL;
			});
		},

		// Rendering of the subtree rooted at (and including) |root_node|
		// using view frustum culling to reduce waste draw.
		_RenderRecursivelyWithCulling : function(root_node, rq, frustum) {
			var outer = this;
			// Traverse all nodes in the graph and collect their render jobs
			medea.VisitGraph(root_node, function(node, parent_visible) {
				if(!node.Enabled()) {
					return medea.VISIBLE_NONE;
				}

				// #ifdef DEBUG
				//
				// Control should never reach here if the parent is not partially visible.
				medealib.DebugAssert(parent_visible === medea.VISIBLE_PARTIAL, 'traversal bug');
				//
				// #endif

				var vis = node.Cull(frustum);
				
				if(vis === medea.VISIBLE_NONE) {
					return medea.VISIBLE_NONE;
				}
				else if (vis === medea.VISIBLE_ALL) {
					// #ifdef DEBUG
					//
					// If a node has infinite extents, it should claim only partial visibility.
					// Otherwise, the entire subtree would accidentally be visible.
					medealib.DebugAssert(node.GetWorldBB() !== medea.BB_INFINITE,
						'infinite box culling bug');
					//
					// #endif

					// The entire sub-tree is visible, so dispatch to a more efficient codepath.
					outer._RenderRecursively(node, rq);
					return medea.VISIBLE_NONE;
				}

				// Call node Render() implementation
				node.Render(outer, rq, vis);

				// Render entities that are attached to the node
				var e = node.GetActiveEntities(outer);
				if(e.length === 1) {
					e[0].Render(outer, node, rq);
				}
				else {
					e.forEach(function(val) {
						if(val.Cull(node, frustum) !== medea.VISIBLE_NONE) {
							val.Render(outer, node, rq);
						}
					});
				}
				return medea.VISIBLE_PARTIAL;
			}, medea.VISIBLE_PARTIAL);
		},

		_FillRenderQueues : function(rq, statepool) {
			var outer = this;

			// (hack) check if the (logical) canvas size changed, if so, dirty the projection
			// matrix in case the angle depends on it.
			if(this.aspect === undefined) {
				var canvas = medea.canvas;
				if (canvas.width !== this.last_canvas_w || canvas.height !== this.last_canvas_h) {
					this.flags |= medea._CAMERA_DIRTY_PROJ;
				}

				this.last_canvas_w = canvas.width;
				this.last_canvas_h = canvas.height;
			}

			// Update state pool
			statepool.Set("V",this.GetViewMatrix());
			statepool.Set("P",this.GetProjectionMatrix());
			statepool.Set("W",identity);

			statepool.Set("CAM_POS", this.GetWorldPos());

			if (this.culling) {
				this._RenderRecursivelyWithCulling(medea.RootNode(), rq, this.GetFrustum());
			}
			else {
				this._RenderRecursively(medea.RootNode(), rq);
			}

			// rq.Flush() is left to the caller
			return statepool;
		}
	});


	medea.CreateCameraNode = function(name,fovy,aspect,znear,zfar,viewport) {
		return new medea.Camera(name,fovy,aspect,znear,zfar,viewport);
	};
});


