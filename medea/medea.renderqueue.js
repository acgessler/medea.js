/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medea._addMod('renderqueue',['renderstate'],function(undefined) {
	"use strict";
	var medea = this;

	//
	this.RENDERQUEUE_FIRST = 0;

	this.RENDERQUEUE_DEFAULT_EARLY = 10;
	this.RENDERQUEUE_DEFAULT = 11;
	this.RENDERQUEUE_DEFAULT_LATE = 12;

	this.RENDERQUEUE_ALPHA_EARLY = 14;
	this.RENDERQUEUE_ALPHA = 15;
	this.RENDERQUEUE_ALPHA_LATE = 16;

	this.RENDERQUEUE_BACKGROUND = 18;

	this.RENDERQUEUE_LAST = 19;


	this._initial_state_depth_test_enabled = {
		'depth_test' : true,
		'depth_func' : 'less_equal',

		// culling is turned on by default
		'cull_face' : true,
		'cull_face_mode' : 'back'
	};

	this._initial_state_depth_test_disabled = {
		'depth_test' : false,

		// culling is turned on by default
		'cull_face' : true,
		'cull_face_mode' : 'back'
	};


	// class DistanceSorter
	this.DistanceSorter = medea.Class.extend({

		Run : function(entries) {
			entries.sort(function(a,b) {
				return a.DistanceEstimate() < b.DistanceEstimate();
			});
		}
	});


	// class MaterialSorter
	this.MaterialSorter = medea.Class.extend({

		Run : function(entries) {
			entries.sort(function(a,b) {
				return a.MaterialId() < b.MaterialId();
			});
		}
	});


	// class RenderQueue
	this.RenderQueue = medea.Class.extend({

		init: function(sorter,default_state) {
			this.entries = [];
			this.sorter = sorter;
			this.default_state = default_state;
		},

		Push: function(e) {
			this.entries.push(e);
		},

		Flush: function(statepool) {
			if (this.default_state) {
				medea.SetDefaultState(this.default_state,statepool);
			}

			if (this.sorter) {
				this.sorter.Run(this.entries);
			}

			this.entries.forEach(function(e) {
				e.Draw(statepool);
			});
			this.entries = [];
		},

		Sorter : function(sorter) {
			if(!sorter) {
				return this.sorter;
			}
			this.sorter = sorter;
		},

		DefaultState : function(default_state) {
			if(!default_state) {
				return this.default_state;
			}
			this.default_state = default_state;
		},

		GetEntries : function() {
			return this.entries;
		},
	});


	// class RenderQueueManager
	this.RenderQueueManager = medea.Class.extend({

		init : function(name) {
			// allocates queues, by default all queues use the same implementation
			this.queues = new Array(medea.RENDERQUEUE_LAST+1);
			for(var i = 0, l = this.queues.length; i < l; ++i) {
				this.queues[i] = new medea.RenderQueue();
			}

			// choose some suitable default sorting algorithms
			var distance_sorter = new medea.DistanceSorter();
			var material_sorter = new medea.MaterialSorter();

			var defs = [medea.RENDERQUEUE_DEFAULT_EARLY,medea.RENDERQUEUE_DEFAULT,medea.RENDERQUEUE_DEFAULT_LATE], outer = this;
			defs.forEach(function(s) {
				s = outer.queues[s];
				s.Sorter(material_sorter);
				s.DefaultState(medea._initial_state_depth_test_enabled);
			});

			defs = [medea.RENDERQUEUE_ALPHA_EARLY,medea.RENDERQUEUE_ALPHA,medea.RENDERQUEUE_ALPHA_LATE];
			defs.forEach(function(s) {
				s = outer.queues[s];
				s.Sorter(distance_sorter);
				s.DefaultState(medea._initial_state_depth_test_disabled);
			});
		},

		Push : function(idx,renderable) {
// #ifdef DEBUG
			if (idx < 0 || idx >= this.queues.length) {
				medea.NotifyFatal("render queue does not exist: " + idx);
				return;
			}
// #endif

			this.queues[idx].Push(renderable);
		},

		Flush : function(statepool) {
			this.queues.forEach(function(e) {
				e.Flush(statepool);
			});
		},

		// supply a custom queue implementation
		SetQueueImpl : function(idx,queue) {
			this.queues[idx] = queue;
		},

		GetQueues : function() {
			return this.queues;
		},
	});


	medea.CreateRenderQueueManager = function() {
		return new medea.RenderQueueManager();
	}
});
