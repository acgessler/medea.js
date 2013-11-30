
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

		init : function(name) {
			this.id = id_source++;
			this.name = name || ("UnnamedEntity_" + this.id);
		},

		Render : function(viewport,rqmanager) {
			// at this level of abstraction Render() is empty, deriving classes will substitute their own logic
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

		BB : function(b) {
			if(b === undefined) {
				if(this.bb === null) {
					this._AutoGenBB();
				}
				// #ifdef DEBUG
				medealib.DebugAssert(!!this.bb,'failed to generate BB for entity');
				// #endif
				return this.bb;
			}
			this.bb = b;
		},

		GetWorldBB : function(parent) {
			if(!this.bb) {
				return medea.BB_INFINITE;
			}
			return medea.TransformBB(this.bb, parent.GetGlobalTransform());
		},

		Cull : function(parent,frustum) {
			return medea.BBInFrustum(frustum, this.GetWorldBB(parent));
		},



		// note that entities can be attached to multiple nodes by default.
		// deriving classes which do NOT want this, should assert this
		// case in OnAttach().
		OnAttach : function(node) {
		},

		OnDetach : function(node) {
		},


		_AutoGenBB : function() {
			// deriving classes should supply a more meaningful implementation
			this.bb = medea.BB_INFINITE;
		}
	});

	medea.CreateEntity = function(name) {
		return new medea.Entity(name);
	};
});

