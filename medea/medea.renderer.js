
/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('renderer', ['renderqueue'], function(medealib, undefined) {
	"use strict";

	var medea = this;

	// Base render job abstraction to be added to render queues.
	medea.RenderJob = medealib.Class.extend({
	
		entity 		: null,
		node 		: null,
		camera  	: null,

		init : function(entity, node, camera) {
			this.entity = entity;
			this.node = node;
			this.camera = camera;
		},

		// Required methods for automatic sorting of renderqueues
		DistanceEstimate : function() {
			return 0;
		},

		MaterialId : function() {
			return 0;
		},

		GetEntity : function() {
			return this.entity;
		},

		GetNode : function() {
			return this.node;
		},

		GetCamera : function() {
			return this.camera;
		},
	});


	// A |Renderer| is an abstraction that defines how render queues - see
	// |medea.RenderQueueManager| - are managed and the entities contained
	// therein eventually drawn. For this purpose, it defines
	// DrawXXX methods for all supported entities that draw entities with
	// no further batching or delay. When entities add themselves to
	// render queues, they submit an implementation of |RenderJob| to
	// a render queue, which then calls the corect DrawXXX method.
	//
	// |Renderer.Render()| takes the populated render queues and draws them,
	// using whichever settings are suitable for the semantics of the
	// queue (this is under the Renderer's control).
	//
	// |Renderer| controls:
	//  - How to draw each entity type
	//  - Which default states each render queue uses
	//  - In which order render queues are processed
	// In particular, |Renderer| determines how lights are applied to
	// the scene.
	//
	// A |Renderer| in medea is a much higher-level abstraction that it
	// is for example in Three.js. It does not affect how low-level
	// operation works i.e. it cannot change rendering from WebGL to
	// e.g. CSS3 as WebGL state handling is inherent to the framework.
	medea.Renderer = medealib.Class.extend({
		rq : null,
		visualizers : null,

		init : function() {
			this.visualizers = [];

			// Create a render queue manager for the renderer.
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