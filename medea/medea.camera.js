
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medea._addMod('camera',['entity'],function() {
	"use strict";
	var medea = this;

	medea._CAMERA_DIRTY_VIEW = 0x1;
	medea._CAMERA_DIRTY_PROJ = 0x2;

	medea._initMod('entity');

	// class Camera
	medea.Camera = medea.Entity.extend(
	{
		init : function(name,fovy,aspect,znear,zfar,viewport) {
			this._super(name);

			this.view = mat4.identity(mat4.create());
			this.proj = mat4.identity(mat4.create());

			this.fovy = fovy || 45;
			this.aspect = aspect;
			this.znear = znear || 1;
			this.zfar = zfar || 10000;

			this.viewport = null;
			if (viewport) {
				viewport.SetCamera(this);
			}

			this.flags |= medea._CAMERA_DIRTY_PROJ | medea._CAMERA_DIRTY_VIEW;
		},


		Render : function(viewport,rqmanager) {
			// we don't need any rendering logic for cameras, as rendering is implicitly triggered
			// through the viewport the camera is assigned to.
		},

		Update : function(dtime) {
			// transformation matrix updates are performed lazily as needed so this is empty, too.
		},



		GetViewMatrix : function() {
			this._UpdateViewMatrix();
			return this.view;
		},

		GetProjectionMatrix : function() {
			this._UpdateProjectionMatrix();
			return this.proj;
		},

		OnSetParent : function(parent) {
			if(this.parent) {
				this.parent.RemoveListener("OnUpdateGlobalTransform",this);
			}

			this._super(parent);
			this.flags |= medea._CAMERA_DIRTY_VIEW;

			if(parent) {
				var outer = this;
				this.parent.AddListener("OnUpdateGlobalTransform",function() {
					outer.flags |= medea._CAMERA_DIRTY_VIEW;
				},this);
			}
		},

		OnSetViewport : function(vp) {
			this.viewport = vp;
		},



		GetZNear : function() {
			return this.znear;
		},

		GetZFar : function() {
			return this.zfar;
		},

		GetAspect : function() {
			return this.aspect;
		},

		GetFOV : function() {
			return this.fovy;
		},


		SetZNear : function(v) {
			this.flags |= medea._CAMERA_DIRTY_PROJ;
			this.znear = v;
		},

		SetZFar : function(v) {
			this.flags |= medea._CAMERA_DIRTY_PROJ;
			this.zfar = v;
		},

		// aspect may be set to null to have the camera implementation take it from the viewport
		SetAspect : function(v) {
			this.flags |= medea._CAMERA_DIRTY_PROJ;
			this.aspect = v;
		},

		SetFOV : function(v) {
			this.flags |= medea._CAMERA_DIRTY_PROJ;
			this.fovy = v;
		},


		_UpdateViewMatrix : function() {
			if (!(this.flags & medea._CAMERA_DIRTY_VIEW)) {
				return this.view;
			}

			// if the camera does not have a parent (which happens for example for the
			// default camera that is initially assigned to a viewport), we just
			// return the identity matrix for view transform.
			if(!this.parent) {
				return this.view = mat4.identity(mat4.create());
			}


			mat4.inverse(this.parent.GetGlobalTransform(),this.view);

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
				if (!this.viewport) {
					medea.DebugAssert("aspect may only be omitted if the camera is assigned to a viewport");
				}
// #endif
				aspect = this.viewport.GetAspect();
			}

			mat4.perspective(this.fovy,aspect,this.znear,this.zfar,this.proj);


			this.flags &= ~medea._CAMERA_DIRTY_PROJ;
			return this.proj;
		},

		_Render : function(rq) {

			// traverse all nodes in the graph and collect their render jobs
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

			statepool.Set("V",this.GetViewMatrix());
			statepool.Set("P",this.GetProjectionMatrix());
			statepool.Set("W",mat4.identity(mat4.create()));
			
			statepool.Set("CAM_POS",this.parent.GetWorldPos());

			// rq.Flush() is left to the caller
			return statepool;
		}
	});


	medea.CreateCamera = function(name,fovy,aspect,znear,zfar,viewport) {
		return new medea.Camera(name,fovy,aspect,znear,zfar,viewport);
	};
});


