
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler 
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medea._addMod('visualizer_shownormals',[ 'visualizer','material'],function() {
	"use strict";
	var medea = this;
	var ordinal = 10;
	
	var color_palette = [
		[1.0,1.0,1.0,1.0],
		[1.0,0.0,0.0,1.0],
		[0.0,0.0,1.0,1.0],
		[0.0,1.0,0.0,1.0],
		[0.0,0.0,0.0,1.0],
		[1.0,1.0,0.0,1.0],
		[1.0,0.0,1.0,1.0],
		[0.0,1.0,1.0,1.0],
		[0.8,0.8,0.8,1.0],
		[0.4,0.4,0.4,1.0],
		[0.6,0.0,0.2,1.0],
		[0.6,0.4,0.2,1.0],
		[0.6,0.2,0.0,1.0],
		[0.3,0.1,0.7,1.0]
	];
	
	medea._initMod('visualizer');
	this.VisualizerShowNormals = medea.Visualizer.extend({
		
		init : function(name, draw_range) {	
			this._super(name);
			this.ordinal = ordinal;
			this.draw_range = draw_range || 50;
			
			this.material = medea.CreateSimpleMaterialFromShaderPair("remote:mcore_debug/shaders/show-normals");
			this.cached_mesh = null;
		},
		
		DrawRange : function(fr) {
			if (fr === undefined) {
				return this.draw_range;
			}
			this.draw_range = fr;
		},
		
		Apply : function(render_stub,original_render_stub,rq, viewport) {
			var outer = this;
			return function() {
				
				// walk the render queue and collect normals in one large mesh
				var count = 0;
				var queues = rq.GetQueues();
				for (var i = medea.RENDERQUEUE_DEFAULT_EARLY; i < medea.RENDERQUEUE_BACKGROUND; ++i) {
			
					var entries = queues[i].GetEntries();
					for (var j = 0; entries && j < entries.length; ++j) {
						var job = entries[j];
						var data = job.mesh.VB().GetSourceData();
						
						if(!data || !data.positions || !data.normals) {
							continue;
						}
						
						count += data.positions.length;
					}
				}
				
				if (count) {
					
					var cp = viewport.GetCamera().GetParent().GetWorldPos();
					var sqr = outer.draw_range * outer.draw_range;
			
					var pout = new Float32Array(count*6), cout = new Float32Array(count*8), ip = 0, ic = 0, c = 0;
					for (var i = medea.RENDERQUEUE_DEFAULT_EARLY; i < medea.RENDERQUEUE_BACKGROUND; ++i) {
			
						var entries = queues[i].GetEntries();
						for (var j = 0; entries && j < entries.length; ++j) {
							var job = entries[j];
							var data = job.mesh.VB().GetSourceData(), world = job.node.GetGlobalTransform();
							
							if(!data) {
								continue;
							}
								
							var pos = data.positions, nor = data.normals;
							if (!pos || !nor || pos.length != nor.length || pos.length % 3) {
								continue;
							}
							
							var col = color_palette[c = (c+1) % color_palette.length];
							
							for(var n = 0; n < pos.length; n+=3) {
								var v = vec3.create();
								
								mat4.multiplyVec3(world,[pos[n],pos[n+1],pos[n+2]],v);
								
								var d0 = v[0]-cp[0], d1 = v[1]-cp[1], d2 = v[2]-cp[2];
								if ( d0*d0 + d1*d1 + d2*d2 > sqr) {
									continue;
								}
								
								pout[ip++] = v[0];
								pout[ip++] = v[1];
								pout[ip++] = v[2];
								
								mat4.multiplyVec3(world,[pos[n]+nor[n],pos[n+1]+nor[n+1],pos[n+2]+nor[n+2]],v);
								pout[ip++] = v[0];
								pout[ip++] = v[1];
								pout[ip++] = v[2];
								
								for(var s = 0; s < 4; ++s) {
									cout[ic+4] = col[s];
									cout[ic++] = col[s];
								}
								ic += 4;
							}
						}
					}
					
					pout = pout.subarray(0,ip);
					cout = cout.subarray(0,ic);
					
					var vb = {positions:pout, colors:[cout]};
					if (!outer.cached_mesh) {
						outer.cached_mesh = medea.CreateSimpleMesh(vb,null,outer.material,
							medea.VERTEXBUFFER_USAGE_DYNAMIC
						);
						
						outer.cached_mesh.PrimitiveType(medea.PT_LINES);
					}
					else {
						outer.cached_mesh.VB().Fill(vb);
					}
				}
				
				render_stub();
				
				if (count) {
					// setup a dummy statepool to draw the mesh on top of everything
					var statepool = new medea.StatePool(), cam = viewport.GetCamera();
			
					statepool.Set("V",cam.GetViewMatrix());
					statepool.Set("P",cam.GetProjectionMatrix());
					statepool.Set("W",mat4.identity(mat4.create()));
			
					outer.cached_mesh.DrawNow(statepool);
				}
			}
		},
	});
	
	
	medea.CreateVisualizer_ShowNormals = function(name) {
		return new this.VisualizerShowNormals(name);
	};
});

