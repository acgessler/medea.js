/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medealib.define('renderqueue',['renderstate'],function(undefined) {
	"use strict";
	var medea = this;

	//
	this.RENDERQUEUE_FIRST = 0;

	this.RENDERQUEUE_LIGHT = 8;
	this.RENDERQUEUE_DEFAULT_EARLY = 10;
	this.RENDERQUEUE_DEFAULT = 11;
	this.RENDERQUEUE_DEFAULT_LATE = 12;

	this.RENDERQUEUE_ALPHA_EARLY = 14;
	this.RENDERQUEUE_ALPHA = 15;
	this.RENDERQUEUE_ALPHA_LATE = 16;

	this.RENDERQUEUE_BACKGROUND = 18;

	this.RENDERQUEUE_LAST = 19;


	// class DistanceSorter
	this.DistanceSorter = medealib.Class.extend({

		Run : function(entries) {
			entries.sort(function(a,b) {
				return a.DistanceEstimate() - b.DistanceEstimate();
			});
		}
	});


	// class MaterialSorter
	this.MaterialSorter = medealib.Class.extend({

		Run : function(entries) {
			entries.sort(function(a,b) {
				return a.MaterialId() - b.MaterialId();
			});
		}
	});

	// class NoSorter
	this.NoSorter = medealib.Class.extend({

		Run : function(entries) {
			// intentionally a no-op
		}
	});


	// class RenderQueue
	this.RenderQueue = medealib.Class.extend({

		init: function(sorter,default_state) {
			this.entries = [];
			this.sorter = sorter;
			this.default_state = default_state;
		},

		Push: function(e) {
			this.entries.push(e);
		},

		Flush: function(renderer, statepool) {
			if (this.default_state) {
				medea.SetDefaultState(this.default_state,statepool);
			}

			if (this.sorter) {
				this.sorter.Run(this.entries);
			}

			this.entries.forEach(function(e) {
				e.Draw(renderer, statepool);
			});
			this.entries = [];
		},

		Sorter : medea._GetSet('sorter'),
		DefaultState : medea._GetSet('default_state'),

		GetEntries : function() {
			return this.entries;
		}
	});


	// class RenderQueueManager
	this.RenderQueueManager = medealib.Class.extend({

		init : function(name) {
			// allocates queues, by default all queues have no further configuration
			// setting sorters and default states is done by the renderer.
			this.queues = new Array(medea.RENDERQUEUE_LAST+1);
			for(var i = 0, l = this.queues.length; i < l; ++i) {
				this.queues[i] = new medea.RenderQueue();
			}
		},

		Push : function(idx,renderable) {
// #ifdef DEBUG
			if (idx < 0 || idx >= this.queues.length) {
				medealib.NotifyFatal("render queue does not exist: " + idx);
				return;
			}
// #endif

			this.queues[idx].Push(renderable);
		},

		Flush : function(renderer, statepool) {
			this.queues.forEach(function(e) {
				e.Flush(renderer, statepool);
			});
		},

		// supply a custom queue implementation
		SetQueueImpl : function(idx,queue) {
			this.queues[idx] = queue;
		},

		GetQueues : function() {
			return this.queues;
		}
	});


	medea.CreateRenderQueueManager = function() {
		return new medea.RenderQueueManager();
	}
});
