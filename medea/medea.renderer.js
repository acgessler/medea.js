
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medea.define('renderer',['renderqueue'],function(undefined) {
	"use strict";

	medea._initMod('renderqueue');

	medea.Renderer = medea.Class.extend({
		rq : null,
		visualizers : null,

		init : function() {
			this.visualizers = [];

			// create a render queue manager for the renderer.
			// this creates the full set of render queues
			this.rq = medea.CreateRenderQueueManager();
		},


		AddVisualizer : function(vis) {
			if (this.visualizers.indexOf(vis) !== -1) {
				return;
			}

			var ord = vis.GetOrdinal();
			for (var i = 0; i < this.visualizers.length; ++i) {
				if (ord > this.visualizers[i].GetOrdinal()) {
					this.visualizers.insert(i,vis);
					vis._AddViewport(this);
					return;
				}
			}
			this.visualizers.push(vis);
			vis._AddViewport(this);
		},


		RemoveVisualizer : function(vis) {
			var idx = this.visualizers.indexOf(vis);
			if(idx !== -1) {
				vis._RemoveViewport(this);
				this.visualizers.splice(idx,1);
			}
		},


		GetRQManager : function() {
			return this.rq;
		},


		Render : null,   // function(statepool) {}
		DrawMesh : null, // function(meshjob, statepool) {}
		DrawLight : null // function(lightjob, statepool) {}
	});

});