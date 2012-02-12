
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medea._addMod('statepool',[],function(undefined) {
	"use strict";
	var medea = this;

	var _DefaultStateDependencies = {
		W : ["WVP","WV","WI","WIT",'CAM_POS_LOCAL'],
		V : ["WVP","WV","VP"],
		P : ["WVP","VP"],
		CAM_POS : ['CAM_POS_LOCAL']
	};

	var _DefaultDerivedStates = {

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
			this.states = { _gl : {} };
			this.deps = deps || _DefaultStateDependencies;
			this.derived_states = derived_states || _DefaultDerivedStates;
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
				medea.DebugAssert(key in this.derived_states,"only derived states can be 'dirty': " + key);
// #endif
				delete this.dirty[key];
				return this.states[key] = this.derived_states[key](this);
			}

			return this.states[key];
		},

		GetQuick : function(key) {
// #ifdef DEBUG
			medea.DebugAssert(!(key in this.derived_states),"only non-derived states can be queried using GetQuick(): " + key);
// #endif
			return this.states[key];
		}
	});

	medea.CreateStatePool = function(deps, derived_states) {
		return new medea.StatePool(deps,derived_states);
	};

	medea.CloneStatePool = function(sp) {
		var clone = new medea.StatePool();
		medea.Merge(this.states, {}, clone.states);
		medea.Merge(this.dirty, {}, clone.dirty);

		return clone;
	};


	var def_pool = medea.CreateStatePool();

	medea.GetDefaultStatePool = function(deps, derived_states) {
		// for debugging, use a new StatePool to prevent unwanted state leaking
		return def_pool;
	};
});

