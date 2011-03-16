

medea.stubs["debug"] = (function() {
	var medea = this;

	this.DebugPanel = function(canvas) {
		this.canvas = canvas;

		this.ctx = this.canvas.getContext("2d");
		if (!this.ctx) {
			medea.NotifyFatal("Could not obtain 2d drawing context");
		}
	}

	this.DebugPanel.prototype = {
		
		Update: function() {
			var ctx = this.ctx, canvas = this.canvas;
			var stats = medea.GetStatistics();		

			ctx.save();
			ctx.clearRect(0,0,canvas.width,canvas.height);

 			ctx.fillText("FPS cur: " + stats.exact_fps + "avg: " + stats.smoothed_fps,0,20);
			
			ctx.restore();
		}
	};
	
	medea.stubs["debug"] = null;
});
