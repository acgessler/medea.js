
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medealib.define('visualizer_showbbs',[ 'visualizer','material','frustum'],function() {
	"use strict";
	var medea = this;
	var ordinal = 10;

	var col_ent = [1.0,0.0,0.0,1.0], col_nodes = [1.0,1.0,0.0,1.0], col_partial = [0.0,1.0,0.0,1.0];

	var AddNodes = function(node,bbs,done) {
		if(node in done) {
			return;
		}

		var bb = node.GetWorldBB();
		if(bb === medea.BB_INFINITE) {
			return;
		}

		if (bb !== medea.BB_EMPTY) {
			bbs.push([node.GetWorldBB(),col_nodes]);
		}

		done[node.id] = true;
		if (node.parent) {
			AddNodes(node.parent,bbs,done);
		}
	};

	medea._initMod('visualizer');
	var VisualizerShowBBs = medea.Visualizer.extend({

		init : function(name, draw_range, draw_nodes, show_cull_state) {
			this._super(name);
			this.ordinal = ordinal;
			this.draw_range = draw_range || 1e6;
			this.draw_nodes = draw_nodes || false;
			this.show_cull_state = show_cull_state || false;

			this.material = medea.CreateSimpleMaterialFromShaderPair("remote:mcore_debug/shaders/show-normals");
			this.cached_mesh = null;
		},

		DrawRange : function(fr) {
			if (fr === undefined) {
				return this.draw_range;
			}
			this.draw_range = fr;
		},

		DrawNodes : function(fr) {
			if (fr === undefined) {
				return this.draw_nodes;
			}
			this.draw_nodes = fr;
		},

		ShowCullState : function(fr) {
			if (fr === undefined) {
				return this.show_cull_state;
			}
			this.show_cull_state = fr;
		},

		Apply : function(render_stub,original_render_stub,rq, renderer, viewport) {
			var outer = this;
			return function() {
				var cam = viewport.Camera(), cp = cam.GetWorldPos();
				var sqr = outer.draw_range * outer.draw_range, nodes_done = {};

				// walk the render queue and collect bounding boxes in one large mesh
				var bbs = [];
				var queues = rq.GetQueues();
				for (var i = medea.RENDERQUEUE_DEFAULT_EARLY; i < medea.RENDERQUEUE_BACKGROUND; ++i) {

					var entries = queues[i].GetEntries();
					for (var j = 0; entries && j < entries.length; ++j) {
						var job = entries[j], w = job.node.GetWorldPos();

						var bb = job.entity.GetWorldBB(job.node);
						if(bb === medea.BB_INFINITE || bb === medea.BB_EMPTY) {
							continue;
						}

						var d0 = w[0]-cp[0], d1 = w[1]-cp[1], d2 = w[2]-cp[2];
						if ( d0*d0 + d1*d1 + d2*d2 > sqr) {
							continue;
						}

						bbs.push([bb,col_ent]);

						if (outer.draw_nodes) {
							// we can omit the bounding box for the node if it has just one entity
							if (job.node.GetEntities().length === 1) {
								if (job.node.parent) {
									AddNodes(job.node.parent,bbs,nodes_done);
								}
							}
							else {
								AddNodes(job.node,bbs,nodes_done);
							}
						}
					}
				}

				if (bbs.length) {
					if (outer.show_cull_state) {

						var fr = cam.GetFrustum();
						for (var i = 0; i < bbs.length; ++i) {
							if (medea.BBInFrustum(fr, bbs[i][0]) === medea.VISIBLE_PARTIAL) {
								bbs[i][1] = col_partial;
							}
						}
					}

					var pout = new Float32Array(bbs.length*8*3), cout = new Float32Array(bbs.length*8*4), ind = new Int32Array(bbs.length*24);
					var ip = 0, ic = 0, ii = 0;

					for (var i = 0; i < bbs.length; ++i) {
						var bb = bbs[i][0], col = bbs[i][1];

						var max = bb[1], min = bb[0], b = ip/3;
						var push_vec;

						// handle OBB vs AABB
						if (bb.length === 3) {
							var mat = bb[2], tmpv = vec3.create();
							push_vec = function(v) {
								mat4.multiplyVec3(mat,v,tmpv);
								pout[ip++] = tmpv[0];
								pout[ip++] = tmpv[1];
								pout[ip++] = tmpv[2];
							};
						}
						else {
							push_vec = function(v) {
								pout[ip++] = v[0];
								pout[ip++] = v[1];
								pout[ip++] = v[2];
							};
						}

						push_vec([min[0],min[1],min[2]]);
						push_vec([min[0],max[1],min[2]]);
						push_vec([min[0],max[1],max[2]]);
						push_vec([min[0],min[1],max[2]]);

						push_vec([max[0],min[1],min[2]]);
						push_vec([max[0],max[1],min[2]]);
						push_vec([max[0],max[1],max[2]]);
						push_vec([max[0],min[1],max[2]]);

						for (var k = 0; k < 8; ++k) {
							for(var s = 0; s < 4; ++s) {
								cout[ic++] = col[s];
							}
						}

						ind[ii++] = b+0;
						ind[ii++] = b+1;
						ind[ii++] = b+1;
						ind[ii++] = b+2;
						ind[ii++] = b+2;
						ind[ii++] = b+3;
						ind[ii++] = b+3;
						ind[ii++] = b+0;

						ind[ii++] = b+4;
						ind[ii++] = b+5;
						ind[ii++] = b+5;
						ind[ii++] = b+6;
						ind[ii++] = b+6;
						ind[ii++] = b+7;
						ind[ii++] = b+7;
						ind[ii++] = b+4;

						ind[ii++] = b+0;
						ind[ii++] = b+4;

						ind[ii++] = b+1;
						ind[ii++] = b+5;

						ind[ii++] = b+2;
						ind[ii++] = b+6;

						ind[ii++] = b+3;
						ind[ii++] = b+7;
					}

					var vb = {positions:pout, colors:[cout]};
					if (!outer.cached_mesh) {
						outer.cached_mesh = medea.CreateSimpleMesh(vb,ind,outer.material,
							medea.VERTEXBUFFER_USAGE_DYNAMIC | medea.INDEXBUFFER_USAGE_DYNAMIC
						);

						outer.cached_mesh.PrimitiveType(medea.PT_LINES);
					}
					else {
						outer.cached_mesh.VB().Fill(vb);
						outer.cached_mesh.IB().Fill(ind);
					}
				}

				render_stub();

				if (bbs.length) {
					// setup a dummy statepool to draw the mesh on top of everything
					var statepool = new medea.StatePool(), cam = viewport.Camera();

					statepool.Set("V",cam.GetViewMatrix());
					statepool.Set("P",cam.GetProjectionMatrix());
					statepool.Set("W",mat4.identity(mat4.create()));

					outer.cached_mesh.DrawNow(statepool);
				}
			}
		},
	});


	medea.CreateVisualizer_showbbs = function(name) {
		return new VisualizerShowBBs(name);
	};
});

