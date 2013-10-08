
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medea.define('debug',['visualizer', 'input_handler', 'sprintf-0.7.js', 'MiniStatsDisplay.js'],function() {
	"use strict";
	var medea = this;


	this.DebugPanel = medea.Class.extend({

		where 	: null,
		win 	: null,
		input 	: null,
		vis 	: null,

		init : function(where,win) {
			this.where = where;
			this.win = win;
			this.input = {};
			this.vis = {};

			this.fps_stats = new MiniStatsDisplay({
				  caption 	: 'fps'
				, width		: 140
				, left 		: 0
				, top 		: 0
				, style     : 0
			});

			this.primitives_stats = new MiniStatsDisplay({
				  caption 	: 'primitives'
				, width		: 140
				, left 		: 0
				, top 		: 46
				, style     : 1
			});


			this.batches_stats = new MiniStatsDisplay({
				  caption 	: 'batches'
				, width		: 140
				, left 		: 0
				, top 		: 92
				, style     : 3
			});
		},


		BeginFrame : function() {
			
		},

		EndFrame: function() {
			var stats = medea.GetStatistics();
			this.fps_stats.update(stats.smoothed_fps);
			this.primitives_stats.update(stats.primitives_frame);
			this.batches_stats.update(stats.batches_frame);
		},

		ToggleVisualizer : function(name, clb) {
			if (this.vis[name] === false) {
				return;
			}

			// #ifdef LOG
			medea.LogDebug("debugview: toggle visualizer: " + name);
			// #endif LOG

			if (!this.vis[name]) {
				this.vis[name] = false;

				var outer = this;
				medea.CreateVisualizer(name,'debug_panel_visualizer:'+name,function(vis) {
					outer.vis[name] = vis;
					outer._AddVisualizer(name);
					clb(vis);
				});
			}
			if (this.vis[name]) {
				if (this.vis[name].GetViewports().length) {
					this._RemoveVisualizer(name);
				}
				else {
					this._AddVisualizer(name);
				}
			}
		},

		_AddVisualizer : function(name) {
			var vps = medea.GetViewports();
			for(var i = 0; i < vps.length; ++i) {
				vps[i].AddVisualizer(this.vis[name]);
			}
		},

		_RemoveVisualizer : function(name) {
			var vps = this.vis[name].GetViewports().slice(0);
			for(var i = 0; i < vps.length; ++i) {
				vps[i].RemoveVisualizer(this.vis[name]);
			}
		},
	});
});

