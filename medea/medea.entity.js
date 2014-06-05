
/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('entity',[],function(medealib, undefined) {
	"use strict";
	var medea = this;

	var id_source = 0;
	
	
	medea.ENTITY_UPDATE_WAS_REMOVED = 0x8;
	

	medea.Entity = medealib.Class.extend({
		name : "",
		bb : null,
		tag : null,

		// Derived from |bb|
		center : null,
		radius : null,

		init : function(name) {
			this.id = id_source++;
			this.name = name || ("UnnamedEntity_" + this.id);
		},

		Render : function(camera, rqmanager) {
			// At this level of abstraction Render() is empty, deriving classes will substitute their own logic
		},

		Update : function(dtime) {
		},
		
		// Tag() is used with node.RemoveAllEntities() 
		Tag : function(n) {
			if (n === undefined) {
				return this.tag;
			}
			this.tag = n;
		},

		// Note: manually setting the BB of an entity does *not*
		// inform any nodes the entity is attached to.
		//
		// To update nodes, detach the entity from the scenegraph and attach again.
		BB : function(b) {
			if(b === undefined) {
				if(this.bb === null) {
					this._AutoGenBB();
				}
				// #ifdef DEBUG
				medealib.DebugAssert(!!this.bb,'Failed to generate BB for entity');
				// #endif
				return this.bb;
			}
			this.bb = b;
		},

		IsUnbounded : function() {
			return this.bb === medea.BB_INFINITE;
		},

		GetRadius : function() {
			if (this.radius == null) {
				this._UpdateRadius();
			}
			return this.radius;
		},

		GetCenter : function() {
			if (this.center == null) {
				this._UpdateCenter();
			}
			return this.center;
		},

		GetWorldBB : function(parent) {
			var bb = this.BB();
			if(!bb) {
				return medea.BB_INFINITE;
			}
			return medea.TransformBB(bb, parent.GetGlobalTransform());
		},


		Cull : function(parent,frustum) {
			return medea.BBInFrustum(frustum, this.GetWorldBB(parent));
		},


		// Note that entities can be attached to multiple nodes by default.
		// deriving classes which do NOT want this, should assert this
		// case in OnAttach().
		OnAttach : function(node) {
		},

		OnDetach : function(node) {
		},


		_AutoGenBB : function() {
			// Deriving classes should supply a more meaningful implementation
			this.bb = medea.BB_INFINITE;
		},

		_UpdateCenter : function() {
			var bb = this.BB();
			if (bb.length === 2) {
				var a = bb[0];
				var b = bb[1];
				this.center = vec3.create([
					(a[0] + b[0]) * 0.5,
					(a[1] + b[1]) * 0.5,
					(a[2] + b[2]) * 0.5
				]);
				return;
			}
			this.center = vec3.create([0, 0, 0]);
		},

		_UpdateRadius : function() {
			var bb = this.BB();
			// Derive bounding radius from the BB. This may not be
			// the tightest-fit sphere.
			if (bb.length === 2) {
				var a = bb[0];
				var b = bb[1];
				this.radius = Math.max(b[0] - a[0], b[1] - a[1], b[2] - a[2]) * 0.5;
				return;
			}

			this.radius = 0.0;
		},
	});

	medea.CreateEntity = function(name) {
		return new medea.Entity(name);
	};
});

