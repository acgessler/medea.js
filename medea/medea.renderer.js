
/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('renderer',['renderqueue'],function(undefined) {
	"use strict";

	var medea = this;

	medea.Renderer = medealib.Class.extend({
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