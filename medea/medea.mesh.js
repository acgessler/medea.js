/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medea._addMod('mesh',['vertexbuffer','indexbuffer','material','entity'],function(undefined) {
	"use strict";
	var medea = this, gl = medea.gl;

	medea._initMod('entity');
	medea._initMod('renderqueue');

	// primitive types supported by the medea.Mesh class
	medea.PT_TRIANGLES = gl.TRIANGLES;
	medea.PT_LINES = gl.LINES;
	medea.PT_TRIANGLE_STRIPS = gl.TRIANGLE_STRIPS;
	medea.PT_LINE_STRIPS = gl.LINE_STRIPS;

	// class RenderJob
	this.RenderJob = medea.Class.extend({

		distance: null,

		init : function(mesh,entity,node,viewport) {
			this.mesh = mesh;
			this.entity = entity;
			this.node = node;
			this.viewport = viewport;
			this.Draw = function(statepool) {

				// update the current world matrix to the node's global transformation matrix
				statepool.Set("W",node.GetGlobalTransform());
				
				// If the global inverse is already cached in the node,
				// copy it to the statepool to avoid inverting twice.
				var g = node.TryGetInverseGlobalTransform();
				if (g) {
					statepool.Set("WI",g);
				}
				
				mesh.DrawNow(statepool);
			};
		},

		// required methods for automatic sorting of renderqueues
		DistanceEstimate : function() {
			if (this.distance === null) {
				this.distance = vec3.lengthSquared(vec3.sub(this.viewport.GetCameraWorldPos(),this.node.GetWorldPos()));
			}
			return this.distance;
		},

		MaterialId : function() {
			return this.mesh.material.GetId();
		},
	});


	// class Mesh
	this.Mesh = medea.Entity.extend(
	{
		init : function(vbo,ibo,material,rq, pt) {
			this.vbo = vbo;
			this.ibo = ibo;
			this.material = material;
			this.rq_idx = rq === undefined ? medea.RENDERQUEUE_DEFAULT : rq;
			this.pt = pt | medea.PT_TRIANGLES;

// #ifdef DEBUG
			if (!this.vbo) {
				medea.DebugAssert("need valid vbo for mesh to be complete");
			}
			if (!this.material) {
				medea.DebugAssert("need valid material for mesh to be complete");
			}
// #endif

// #ifdef LOG
			medea.LogDebug(medea.sprintf("create mesh, %s items in VBO, %s items in IBO",
				this.vbo.GetItemCount(),
				this.ibo ? this.ibo.GetItemCount() : -1));
// #endif
		},

		Render : function(viewport,entity,node,rqmanager) {
			// construct a renderable capable of drawing this mesh upon request by the render queue manager
			rqmanager.Push(this.rq_idx,new medea.RenderJob(this,entity,node,viewport));
		},

		Update : function() {
		},

		Material : function(m) {
			if (m === undefined) {
				return this.material;
			}
			this.material = m;
		},

		RenderQueue : function(m) {
			if (m === undefined) {
				return this.rq_idx;
			}
			this.rq_idx = m;
		},

		PrimitiveType : function(pt) {
			if (pt === undefined) {
				return this.pt;
			}
			this.pt = pt;
		},

		VB : function(vbo) {
			if (vbo === undefined) {
				return this.vbo;
			}
			this.vbo = vbo;
		},

		IB : function(ibo) {
			if (ibo === undefined) {
				return this.ibo;
			}
			this.ibo = ibo;
		},

		DrawNow : function(statepool) {

			var st = medea.GetStatistics();
			var vboc = this.vbo.GetItemCount();
			var iboc = this.ibo ? this.ibo.GetItemCount() : null, wf = medea.Wireframe();


			var outer = this;
			this.material.Use(function(pass) {
					// set vbo and ibo if needed
					outer.vbo._Bind(pass.GetAttributeMap(), statepool);

					if (outer.ibo) {
						outer.ibo._Bind(statepool);
					}

					// update statistics
					st.vertices_frame += vboc;
					++st.batches_frame;

					// regular drawing
					if(!wf || outer.pt != medea.PT_TRIANGLES && outer.pt != medea.PT_TRIANGLES_STRIPS) {
						if (outer.ibo) {

							gl.drawElements(outer.pt,iboc,outer.ibo.GetGlType(),0);
							st.primitives_frame += outer._Calc_pt(iboc);
						}
						else {

							gl.drawArrays(outer.pt,0,vboc);
							st.primitives_frame += outer._Calc_pt(vboc);
						}
					}
					// since we don't have glPolygonMode in WebGL, we need to do it manually.
					// of course, substituting gl.LINES does *not* give correct results, but
					// it is relatively fast so it is enabled by default.
					else {
						if (true) {
							if (outer.ibo) {

								gl.drawElements(gl.LINES,iboc,outer.ibo.GetGlType(),0);
								st.primitives_frame += outer._Calc_pt(iboc);
							}
							else {

								gl.drawArrays(gl.LINES,0,vboc);
								st.primitives_frame += outer._Calc_pt(vboc);
							}
						}
						else {
							if (outer.pt == medea.PT_TRIANGLES) {
								for (var i = 0; i < iboc/3; ++i) {
									gl.drawElements(gl.LINE_STRIPS,3,outer.ibo.GetGlType(),i*3);
								}
							}
						}
					}
			},statepool);

		},
		
		// updating BBs is well-defined for meshes, so make this functionality public
		UpdateBB : function() {
			this._AutoGenBB();
		},


		_Calc_pt : function(v) {
			switch(this.pt) {
				case medea.PT_TRIANGLES:
					return v/3;
				case medea.PT_LINES:
					return v/2;
				case medea.PT_TRIANGLE_STRIPS:
					return v-2;
				case medea.PT_LINE_STRIPS:
					return v-1;
			};

			// #ifdef DEBUG
			medea.DebugAssert('unrecognized primitive type: ' + this.pt);
			// #endif
		},

		_AutoGenBB : function() {
			this.bb = this.vbo.GetMinMaxVerts();
		},
	});

	// - supports both index- and vertexbuffer specific flags
	medea.CreateSimpleMesh = function(vertices,indices,material_or_color,flags) {

		if (indices && (Array.isArray(indices) || typeof indices === 'object' && !(indices instanceof medea.Class))) {
			indices = medea.CreateIndexBuffer(indices,flags);
		}
		
		if (typeof vertices === 'object' && !(vertices instanceof medea.Class)) {
			vertices = medea.CreateVertexBuffer(vertices,flags);
		}
		
		if (material_or_color instanceof Array) {
			material_or_color = medea.CreateSimpleMaterialFromColor(material_or_color);
		}
		
		return new medea.Mesh(vertices,indices,material_or_color);
	};
});

