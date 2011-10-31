
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander Ċ. Gessler 
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medea._addMod('camera',['entity'],function() {
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
			this.znear = znear || 0.1;
			this.zfar = zfar || 1000;
			
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
	});
	
	
	medea.CreateCamera = function(name,fovy,aspect,znear,zfar,viewport) {
		return new medea.Camera(name,fovy,aspect,znear,zfar,viewport);
	};
});


