
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medea._addMod('camera',['statepool'],function() {
	"use strict";
	var medea = this;

	medea._CAMERA_DIRTY_FRUSTUM = medea.NODE_FLAG_USER;
	medea._CAMERA_DIRTY_VIEW = medea.NODE_FLAG_USER << 1;
	medea._CAMERA_DIRTY_PROJ = medea.NODE_FLAG_USER << 2;


	// class Camera
	medea.Camera = medea.Node.extend(
	{
		init : function(name,fovy,aspect,znear,zfar,viewport,culling) {
			this._super(name);
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

		Culling: medea._GetSet('culling'),
		Name: medea._GetSet('name'),

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

			this.view = mat4.create(this.GetInverseGlobalTransform());

			this.flags &= ~medea._CAMERA_DIRTY_VIEW;
			return this.view;
		},

		_UpdateProjectionMatrix : function() {
			if (!(this.flags & medea._CAMERA_DIRTY_PROJ)) {
				return this.proj;
			}

			var aspect = this.aspect;
			if (aspect === undefined) {
// #ifdef DEBUG
				medea.DebugAssert(!!this.viewport,"aspect may only be omitted while the camera is assigned to a viewport");
// #endif
				aspect = this.viewport.GetAspect();
			}

			mat4.perspective(this.fovy,aspect,this.znear,this.zfar,this.proj);


			this.flags &= ~medea._CAMERA_DIRTY_PROJ;
			return this.proj;
		},

		_Render : function(rq) {
			var frustum = this.GetFrustum(), statepool = medea.GetDefaultStatePool(), outer = this;

			// traverse all nodes in the graph and collect their render jobs
			medea.VisitGraph(medea.RootNode(),function(node,parent_visible) {
				if(!node.Enabled()) {
					return medea.VISIBLE_NONE;
				}

				var vis = parent_visible === medea.VISIBLE_ALL ? medea.VISIBLE_ALL : node.Cull(frustum);
				var e = node.GetActiveEntities(outer);

				if(vis === medea.VISIBLE_NONE) {
					return medea.VISIBLE_NONE;
				}

				if(vis === medea.VISIBLE_ALL || e.length === 1) {
					e.forEach(function(val,idx,outer) {
						val.Render(this,val,node,rq);
					});

					return medea.VISIBLE_PARTIAL;
				}

				// partial visibility and more than one entity, cull per entity
				e.forEach(function(val,idx,outer) {
					if(val.Cull(node, frustum) !== medea.VISIBLE_NONE) {
						val.Render(this,val,node,rq);
					}
				});

				return medea.VISIBLE_PARTIAL;
			}, this.culling ? medea.VISIBLE_PARTIAL : medea.VISIBLE_ALL);

			// update state pool
			statepool.Set("V",this.GetViewMatrix());
			statepool.Set("P",this.GetProjectionMatrix());
			statepool.Set("W",mat4.identity(mat4.create()));

			statepool.Set("CAM_POS", this.GetWorldPos());

			// rq.Flush() is left to the caller
			return statepool;
		}
	});


	medea.CreateCameraNode = function(name,fovy,aspect,znear,zfar,viewport) {
		return new medea.Camera(name,fovy,aspect,znear,zfar,viewport);
	};
});


