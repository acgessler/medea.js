
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medea._addMod('entity',[],function() {
	"use strict";
	var medea = this;

	var id_source = 0;

	medea.Entity = medea.Class.extend({
		name : "",
		bb : null,

		init : function(name) {
			this.id = id_source++;
			this.name = name || ("UnnamedEntity_" + this.id);
		},

		Render : function(viewport,rqmanager) {
			// at this level of abstraction Render() is empty, deriving classes will substitute their own logic
		},

		Update : function(dtime) {
		},

		BB : function(b) {
			if(b === undefined) {
				if(this.bb === null) {
					this._AutoGenBB();
				}
				// #ifdef DEBUG
				medea.DebugAssert(!!this.bb,'failed to generate BB for entity');
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
		},
	});

	medea.CreateEntity = function(name) {
		return new medea.Entity(name);
	};
});

