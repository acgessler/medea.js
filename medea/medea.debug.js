
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler 
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medea._addMod('debug',['visualizer'],function() {
	"use strict";
	var medea = this;

	medea._CanvasUtilFillTextMultiline = function(context,text,x,y,lineheight) {
		lineheight = lineheight || parseInt(context.font)+2;
		var lines = text.split('\n');

		for (var i = 0; i< lines.length; i++) {
			context.fillText(lines[i], x, y + (i*lineheight) );
		}
	}
	

	this.DebugPanel = medea.Class.extend({

		canvas: null,
		ctx: null,
		fetching: false,

		xs: 10,
		ys: 15,

		// small debug panel, to be displayed on the same page
		dimx_small : 500,
		dimy_small : 100,

		// full debug panel, to be displayed in a separate window
		dimx_full : 700,
		dimy_full : 500,

		
		init : function(where,win) {
			this.where = where;
			this.win = win;
			this.input = {};
			this.vis = {};
			
			this.TryInit();
		},
		

		TryInit : function() {

			var win = this.win || window;
			var doc = win.document;

			if(this.where) {
				
				this.canvas = doc.getElementById(this.where);
				if (!this.canvas) {
					return;
				}
			}
			if(!this.where) {

				// create a canvas element of appropriate size and
				// insert it on top of the page. 'course, this
				// can cause trouble with some page layouts.
				var parent = doc.createElement("div");
				parent.style.paddingTop = 10;
				
				var where = doc.createElement("canvas");
				where.width = this.dimx_small;
				where.height = this.dimy_small;
				
				parent.appendChild(where);
				
				/*
				var but = doc.createElement("input");
				parent.appendChild(but);
				but.type = "button";

				var outer = this;

				if (win === window) {
					but.onclick = function() {
						if (outer.fetching) {
							return;
						}

						var w = window.open('', '', sprintf("width= %d,height= %d,scrollbars=0,resizeable=0,location=0",outer.dimx_full+25,outer.dimy_full+25));
    						
						this.fetching = true;
						medea._AjaxFetch('./../../medea/debug/base.html',function(e) {

							w.document.write(e);
							w.document.close(); 

							outer.canvas = null;
							outer.where = 'dd';
							outer.win = w;

							this.fetching = false;
						});
					}
					but.value = "Open Full Debugger";
				}
				else {
					but.onclick = function() {
						win.close();

						outer.canvas = null;
					};
			
					but.value = "Close Full Debugger";
				}
				*/
				
				doc.body.appendChild(parent);
				this.canvas = where;
			}

			this.ctx = this.canvas.getContext("2d");
			if (!this.ctx) {
				medea.NotifyFatal("Could not obtain 2d drawing context");
			}
		},
		
		Update: function() {
			// switch windows if needed
			if(!this.canvas) {
				this.TryInit(this.where);
				if(!this.canvas) {
					return;
				}
			}

			var ctx = this.ctx, canvas = this.canvas;
			var stats = medea.GetStatistics();		

			ctx.save();
			ctx.clearRect(0,0,canvas.width,canvas.height);
			ctx.strokeRect(0,0,canvas.width,canvas.height);

			var xs = this.xs, ys = this.ys;

			ctx.fillText("Medea Debug Panel",xs,ys);

			ctx.fillStyle = "blue";
 			medea._CanvasUtilFillTextMultiline(ctx,sprintf("FPS cur: %.2f avg: %.2f min: %.2f max: %.2f\nPrimitives: %f\nVertices: %f\nBatches: %f",
				stats.exact_fps,
				stats.smoothed_fps,
				stats.min_fps,
				stats.max_fps,
				stats.primitives_frame,
				stats.vertices_frame,
				stats.batches_frame
			),xs,ys+14);
			
			ctx.restore();
			
			// P to toggle wireframe mode
			if(medea.IsKeyDownWasUp(80,this.input)) {
				// #ifdef LOG
				medea.LogDebug("debugview: toggle wireframe");
				// #endif LOG
                medea.Wireframe(!medea.Wireframe());
            }
			
			// N to show normals
			if(medea.IsKeyDownWasUp(78,this.input)) {
				this.ToggleVisualizer('ShowNormals');
            }
		},
		
		ToggleVisualizer : function(name) {
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
			
			this.vis[name] = null;
		},
	});
});



