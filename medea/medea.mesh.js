/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medea.define('mesh',['vertexbuffer','indexbuffer','material','entity','renderqueue'],function(undefined) {
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
	var MeshRenderJob = medea.Class.extend({

		distance 	: null,
		mesh 		: null,
		entity 		: null,
		node 		: null,
		viewport 	: null,

		init : function(mesh,entity,node,viewport) {
			this.mesh = mesh;
			this.entity = entity;
			this.node = node;
			this.viewport = viewport;
		},

		Draw : function(renderer, statepool) {
			renderer.DrawMesh(this, statepool);
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
		}
	});


	// class Mesh
	this.Mesh = medea.Entity.extend(
	{
		vbo : null,
		ibo : null,
		material : null,
		rq_idx : -1,
		pt : -1,
		line_ibo : null,

		init : function(vbo, ibo, material, rq, pt, line_ibo) {
			this.vbo = vbo;
			this.ibo = ibo;
			this.material = material;
			this.rq_idx = rq === undefined ? medea.RENDERQUEUE_DEFAULT : rq;
			this.pt = pt || medea.PT_TRIANGLES;
			this.line_ibo = line_ibo;

// #ifdef DEBUG
			medea.DebugAssert(!!this.vbo,"need valid vbo for mesh to be complete");
			medea.DebugAssert(!!this.material,"need valid material for mesh to be complete");
// #endif

// #ifdef LOG
			medea.LogDebug("create mesh, " + this.vbo.GetItemCount() + " items in VBO, " + 
				(this.ibo ? this.ibo.GetItemCount() : -1) + " items in IBO");
// #endif
		},

		Render : function(viewport,entity,node,rqmanager) {
			// construct a renderable capable of drawing this mesh upon request by the render queue manager
			rqmanager.Push(this.rq_idx,new MeshRenderJob(this,entity,node,viewport));
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
		
		_Clone : function(material_or_color, deep_copy) {
			medea.DebugAssert(!deep_copy, 'not implemented yet');
			return medea.CreateSimpleMesh(this.vbo, this.ibo, material_or_color);
		},

		DrawNow : function(statepool, change_flags) {
			var outer = this
			,	st = medea.GetStatistics()
			,	vboc = this.vbo.GetItemCount()
			,	iboc = this.ibo ? this.ibo.GetItemCount() : null
			;

			if(medea.Wireframe() && (this.pt === medea.PT_TRIANGLES || this.pt === medea.PT_TRIANGLES_STRIPS)) {
				this._DrawNowWireframe(statepool);
				return;
			}

			this.material.Use(function(pass) {
				// set vbo and ibo if needed
				outer.vbo._Bind(pass.GetAttributeMap(), statepool);

				// non-wireframe, regular drawing:
				// NOTE: this must happen AFTER the VBO is bound, as Chrome validates the
				// indices when binding the index buffer, leading to undefined 
				// ELEMENT_ARRAY_BUFFER status if the old ARRAY_BUFFER is too small.
				// TODO: find out if this is WebGl per se, or a Chrome bug.
				if (outer.ibo) {
					outer.ibo._Bind(statepool);
				}

				// update statistics
				st.vertices_frame += vboc;
				++st.batches_frame;

				// regular drawing
				if (outer.ibo) {
					gl.drawElements(outer.pt,iboc,outer.ibo.GetGlType(),0);
					st.primitives_frame += outer._Calc_pt(iboc);
				}
				else {
					gl.drawArrays(outer.pt,0,vboc);
					st.primitives_frame += outer._Calc_pt(vboc);
				}
			}, statepool, 0xffffffff, change_flags);
		},

		_DrawNowWireframe : function(statepool) {
			var outer = this
			,	st = medea.GetStatistics()
			,	vboc = this.vbo.GetItemCount()
			,	iboc = this.ibo ? this.ibo.GetItemCount() : null
			;

			// wireframe is tricky because WebGl does not support the usual
			// gl API for setting the poly mode.

			medea._initMod('indexbuffer');
			if(this.pt === medea.PT_TRIANGLES_STRIPS) {
				// #ifdef DEBUG
				medea.LogDebug('not supported: wireframe and medea.PT_TRIANGLES_STRIPS');
				// #endif
				return;
			}

			// TODO: track changes to ibo, display proper wireframe also for meshes
			// with no index buffer.
			if(this.line_ibo != null || !this.ibo || (this.ibo.flags & medea.INDEXBUFFER_PRESERVE_CREATION_DATA)) {
				// we can use a substitute ibo that indexes the geometry such that 
				// a wireframe can be drawn using gl.LINES
				if(this.line_ibo == null) {
					this._CreateLineIBO();
				}

				this.line_ibo._Bind(statepool);
				this.material.Use(function(pass) {
					outer.vbo._Bind(pass.GetAttributeMap(), statepool);

					gl.drawElements(gl.LINES,iboc * 2,outer.line_ibo.GetGlType(),0);

					++st.batches_frame;
					st.primitives_frame += iboc;

				}, statepool);
				return;
			}

			// #ifdef DEBUG
			medea.DebugAssert(this.ibo && !(this.ibo.flags & medea.INDEXBUFFER_PRESERVE_CREATION_DATA), 'inv');
			// #endif

			// we have an ibo, but its creation data was not preserved
			this.ibo._Bind(statepool);
			this.material.Use(function(pass) {
				outer.vbo._Bind(pass.GetAttributeMap(), statepool);
				// TODO: this is super-slow, and it only draws 2/3 of each triangle
				if (outer.pt === medea.PT_TRIANGLES) {
					for (var i = 0; i < iboc/3; ++i) {
						++st.batches_frame;
						gl.drawElements(gl.LINE_STRIPS,3,outer.ibo.GetGlType(),i*3);
					}
					st.primitives_frame += Math.floor(iboc*2/3);
				}
			}, statepool);
		},

		// updating BBs is well-defined for meshes, so make this functionality public
		UpdateBB : function() {
			this._AutoGenBB();
		},


		_CreateLineIBO : function() {
			// #ifdef LOG
			medea.LogDebug('creating auxiliary index buffer to hold wireframe line mesh');
			// #endif

			if(this.ibo) {
				this.line_ibo = medea.CreateLineListIndexBufferFromTriListIndices(this.ibo);
			}
			else {
				this.line_ibo = medea.CreateLineListIndexBufferForUnindexedTriList( 
					this.vbo.GetItemCount() / 3 
				);
			}

			// #ifdef DEBUG
			medea.DebugAssert(!!this.line_ibo, 'invariant');
			// #endif
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
		}
	});
	
	
	var _mesh_cache = {
	
	};
	
	
	medea.QueryMeshCache = function(cache_name) {
		return _mesh_cache[cache_name];
	};
	

	// - supports both index- and vertexbuffer specific flags
	medea.CreateSimpleMesh = function(vertices,indices,material_or_color,flags, cache_name) {

		if (indices && (Array.isArray(indices) || typeof indices === 'object' && !(indices instanceof medea.Class))) {
			indices = medea.CreateIndexBuffer(indices,flags);
		}

		if (typeof vertices === 'object' && !(vertices instanceof medea.Class)) {
			vertices = medea.CreateVertexBuffer(vertices,flags);
		}

		if (material_or_color instanceof Array) {
			material_or_color = medea.CreateSimpleMaterialFromColor(material_or_color);
		}

		var mesh = new medea.Mesh(vertices,indices,material_or_color);
		if (cache_name !== undefined) {
			_mesh_cache[cache_name] = mesh;
		}
		return mesh;
	};
	
	
	// create clone of a mesh (shares vbo, ibo). Material can be different, though.
	medea.CloneMesh = function(mesh, material_or_color, deep_copy) {
		return mesh._Clone(material_or_color, deep_copy);
	};
});

