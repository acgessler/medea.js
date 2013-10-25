
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medealib.define('visualizer',[],function() {
	"use strict";
	var medea = this;

	this.Visualizer = medealib.Class.extend({
		name : "",
		ordinal: 0,

		init : function(name) {
			this.name = name || "";
			this.viewports = [];
		},

		GetName : function() {
			return this.name;
		},

		GetOrdinal : function() {
			return this.ordinal;
		},

		Apply : function(render_stub,original_render_stub,rq) {
			// this default visualizer does nothing than to hand the current render
			// function chain over to the next visualizer, if any.
			return render_stub;
		},

		GetViewports : function() {
			return this.viewports;
		},

		_AddViewport : function(vp) {
			if (this.viewports.indexOf(vp) === -1) {
				this.viewports.push(vp);
			}
		},

		_RemoveViewport : function(vis) {
			var idx = this.viewports.indexOf(vis);
			if(idx !== -1) {
				this.viewports.splice(idx,1);
			}
		},
	});

	medea.CreateVisualizer = function(type, name, callback) {

		var modname = 'visualizer_'+type.toLowerCase();
		medea.FetchMods([modname],function() {
			medea._initMod(modname);
			callback(medea['CreateVisualizer_' + type](name));
		});
	};
});

