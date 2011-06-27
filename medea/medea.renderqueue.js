
medea.stubs["RenderQueue"] = (function() {

	//
	this.RENDERQUEUE_FIRST = 0;
	
	this.RENDERQUEUE_DEFAULT_EARLY = 10;
	this.RENDERQUEUE_DEFAULT = 11;
	this.RENDERQUEUE_DEFAULT_LATE = 12;
	
	this.RENDERQUEUE_ALPHA_EARLY = 14;
	this.RENDERQUEUE_ALPHA = 15;
	this.RENDERQUEUE_ALPHA_LATE = 16;
	
	this.RENDERQUEUE_LAST = 19;


	var medea = this;
	
	
	// class DistanceSorter
	this.DistanceSorter = function() {
	}
	
	this.DistanceSorter.prototype = {
	
		Run : function(entries) {
			entries.sort(function(a,b) {
				return a.Distance() < b.Distance();
			});
		}
	}
	
	
	// class MaterialSorter
	this.MaterialSorter = function() {
	}
	
	this.MaterialSorter.prototype = {
	
		Run : function(entries) {
			entries.sort(function(a,b) {
				return a.MaterialHash() < b.MaterialHash();
			});
		}
	}
	
	
	// class RenderQueue
	this.RenderQueue = function() {		
		this.entries = [];
	}

	this.RenderQueue.prototype = {
		sorter : null,
		
		Flush: function() {
			if (this.sorter) {
				this.sorter.Run(this.entries);
			}
			
			this.entries.forEach(function(e) {
				e.Draw();
			});
			this.entries = [];
		},
		
		SetSorter : function(sorter) {
			this.sorter = sorter;
		},
		
		GetSorter : function() {
			return this.sorter;
		}
	};


	this.RenderQueueManager = function(name) {		
	
		// allocates queues, by default all queues use the same implementation
		this.queues = new Array(medea.RENDERQUEUE_LAST+1);
		for(var i = 0, l = this.queues.length; i < l; ++i) {
			this.queues[i] = new medea.RenderQueue();
		}
		
		// choose some suitable default sorting algorithms
		var distance_sorter = new medea.DistanceSorter();
		var material_sorter = new medea.MaterialSorter();
		
		this.queues[medea.RENDERQUEUE_DEFAULT_EARLY].SetSorter(material_sorter);
		this.queues[medea.RENDERQUEUE_DEFAULT].SetSorter(material_sorter);
		this.queues[medea.RENDERQUEUE_DEFAULT_LATE].SetSorter(material_sorter);
		
		this.queues[medea.RENDERQUEUE_ALPHA_EARLY].SetSorter(distance_sorter);
		this.queues[medea.RENDERQUEUE_ALPHA].SetSorter(distance_sorter);
		this.queues[medea.RENDERQUEUE_ALPHA_LATE].SetSorter(distance_sorter);
	}
	

	this.RenderQueueManager.prototype = {
	
		Push : function(idx,renderable) {
// #ifdef DEBUG
			if (idx < 0 || idx >= this.queues.length) {
				medea.NotifyFatal("render queue does not exist: " + idx);
				return;
			}
// #endif

			this.queues[idx].push(renderable);
		},
		
		Flush : function() {
			this.queues.forEach(function(e) {
				e.Flush();
			});
		},
		
		// supply a custom queue implementation
		SetQueueImpl : function(idx,queue) {
			this.queues[idx] = queue;
		}
	};
	
	medea.stubs["RenderQueue"] = null;
});
