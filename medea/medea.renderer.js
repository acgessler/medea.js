
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



		GetRQManager : function() {
			return this.rq;
		},


		Render : null,   // function(viewport, statepool) {}
		DrawMesh : null, // function(meshjob, statepool) {}
		DrawLight : null // function(lightjob, statepool) {}
	});

});