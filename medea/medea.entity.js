
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler 
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medea._addMod('entity',[],function() {
	"use strict";
	var medea = this;

	this.Entity = medea.Class.extend({
		name : "",
		parent : null,
		bb : null,
		
		init : function(name) {	
			if(name) {	
				this.name = name;
			}
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
				if(!this.bb) {
					medea.DebugAssert('failed to generate BB for entity');
				}
				// #endif 
				return this.bb;
			}
			this.bb = b;
		},
		
		GetParent : function() {
			return this.parent;
		},
		
		
		OnSetParent : function(parent) {
				this.parent = parent;
		},
		
		
		
		_AutoGenBB : function() {
			// deriving classes should supply a more meaningful implementation
			this.bb = medea.BB_INFINITE;
		},
	});
});

