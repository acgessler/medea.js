
/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('statepool',[],function(medealib, undefined) {
	"use strict";
	var medea = this

		// every statepool instance has a _gl member, which is a dictionary
		// that they all share. OpenGl state is global relative to a Gl
		// context (~= one medea context).
	,	_global_gl_state = {}
	;

	var _DefaultStateDependencies = {
		W : ["WVP","WV","WI","WIT",'CAM_POS_LOCAL'],
		V : ["WVP","WV","VP"],
		P : ["WVP","VP"],
		CAM_POS : ['CAM_POS_LOCAL']
	};

	var _DefaultDerivedStates = {

		CAM_POS_LOCAL: function(statepool, old) {
			return mat4.multiplyVec3(statepool.Get("WI"),statepool.GetQuick("CAM_POS"),
				old || vec3.create());
		},

		VP: function(statepool, old) {
			return mat4.multiply(statepool.GetQuick("P"),statepool.GetQuick("V"),
				old || mat4.create());
		},

		WVP: function(statepool, old) {
			return mat4.multiply(statepool.Get("VP"),statepool.GetQuick("W"),
				old || mat4.create());
		},

		WIT: function(statepool, old) {
			return mat4.transpose(statepool.Get("WI"),
				old || mat4.create());
		},

		WI: function(statepool, old) {
			return mat4.inverse(statepool.GetQuick("W"),
				old || mat4.create());
		}
	};

	// class StatePool
	medea.StatePool = medealib.Class.extend({

		deps : null,
		derived_states : null,
		dirty : null,

		init : function(deps,derived_states) {
			this.states = { 
				_gl : _global_gl_state
			 };
			this.deps = deps || _DefaultStateDependencies;
			this.derived_states = derived_states || _DefaultDerivedStates;
			this.dirty = {};
		},

		Set : function(key,value) {
			var dep_entry = this.deps[key];
			if (dep_entry !== undefined) {
				var dirty = this.dirty;
				for(var i = dep_entry.length - 1; i >= 0; --i) {
					dirty[dep_entry[i]] = true;
				}
			}
			if(key in this.derived_states) {
				this.dirty[key] = false;
			}
			return this.states[key] = value;
		},

		SetQuick : function(key,value) {
// #ifdef DEBUG
			medealib.DebugAssert(!(key in this.deps),"only states with no dependent states can be set using SetQuick(): " + key);
// #endif
			if(key in this.derived_states) {
				this.dirty[key] = false;
			}
			return this.states[key] = value;
		},

		Get : function(key) {
			if (this.dirty[key] === true) {
// #ifdef DEBUG
				medealib.DebugAssert(key in this.derived_states,"only derived states can be 'dirty': " + key);
// #endif
				this.dirty[key] = false;
				return this.states[key] = this.derived_states[key](this, this.states[key]);
			}

			return this.states[key];
		},

		GetQuick : function(key) {
// #ifdef DEBUG
			medealib.DebugAssert(!(key in this.derived_states),"only non-derived states can be queried using GetQuick(): " + key);
// #endif
			return this.states[key];
		}
	});

	medea.CreateStatePool = function(deps, derived_states) {
		return new medea.StatePool(deps,derived_states);
	};

	medea.CloneStatePool = function(sp) {
		var clone = new medea.StatePool();
		medealib.Merge(this.states, {}, clone.states);
		medealib.Merge(this.dirty, {}, clone.dirty);

		return clone;
	};


	var def_pool = medea.CreateStatePool();

	medea.GetDefaultStatePool = function(deps, derived_states) {
		// TODO for debugging, use a new StatePool to prevent unwanted state leaking
		return def_pool;
	};
});

