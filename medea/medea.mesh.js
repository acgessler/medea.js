/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('mesh',['vertexbuffer','indexbuffer','material','entity','renderqueue', 'renderer'],function(medealib, undefined) {
	"use strict";
	var medea = this, gl = medea.gl;


	// primitive types supported by the medea.Mesh class
	medea.PT_TRIANGLES = gl.TRIANGLES;
	medea.PT_LINES = gl.LINES;
	medea.PT_TRIANGLE_STRIPS = gl.TRIANGLE_STRIPS;
	medea.PT_LINE_STRIPS = gl.LINE_STRIPS;

	

	// class RenderJob
	medea.MeshRenderJob = medea.RenderJob.extend({

		distance 	: null,
		mesh 		: null,
		sort_matid  : -1,

		init : function(mesh, node, camera) {
			this._super(mesh, node, camera);
			this.mesh = mesh;
			this.sort_matid = mesh.material.GetId();
		},

		Draw : function(renderer, statepool) {
			renderer.DrawMesh(this, statepool);
		},

		// Required methods for automatic sorting of renderqueues
		DistanceEstimate : (function() {
			var scratch_vec = vec3.create();
			return function() {
				var node = this.node;
				var mesh = this.mesh;
				if (this.distance === null) {
					if (mesh.IsUnbounded()) {
						this.distance = 0;
					}
					else {
						// TODO: this does *not* handle scaled meshes correctly
						var cam_pos = this.camera.GetWorldPos();
						var node_pos = vec3.add(node.GetWorldPos(), mesh.GetCenter(), scratch_vec);
						var delta = vec3.subtract(cam_pos, node_pos, scratch_vec);

						// Subtract the mesh' bounding radius from the estimate
						var radius = mesh.GetRadius();
						var offset = radius * radius * node.GetWorldUniformScaleSqr();
						this.distance = Math.max(0, vec3.dot(delta, delta) - offset);
					}
				}
				return this.distance;
			};
		})(),

		MaterialId : function() {
			return this.sort_matid;
		}
	});


	// class Mesh
	medea.Mesh = medea.Entity.extend(
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
			medealib.DebugAssert(!!this.vbo,"need valid vbo for mesh to be complete");
			medealib.DebugAssert(!!this.material,"need valid material for mesh to be complete");
// #endif

// #ifdef LOG
			medealib.LogDebug("create mesh, " + this.vbo.GetItemCount() + " items in VBO, " + 
				(this.ibo ? this.ibo.GetItemCount() : -1) + " items in IBO");
// #endif
		},

		Render : function(camera, node, rqmanager) {
			// construct a renderable capable of drawing this mesh upon request by the render queue manager
			rqmanager.Push(this.rq_idx,new medea.MeshRenderJob(this, node, camera));
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
		
		_Clone : function(material_or_color) {
			var mesh = medea.CreateSimpleMesh(this.vbo, this.ibo,
				material_or_color || this.Material(),
				this.rq,
				this.pt,
				this.line_ibo);
			// Copy BB: this is necessary if this.BB has been
			// manually specified as opposed to the BB being
			// derived from the VBO's extents.
			mesh.BB(this.BB());
			return mesh;
		},

		DrawNow : function(statepool, change_flags) {
			var outer = this
			,	st = medea.GetStatistics()
			,	vboc = this.vbo.GetItemCount()
			,	iboc = this.ibo ? this.ibo.GetItemCount() : null
			;

			if(medea.Wireframe() && (this.pt === medea.PT_TRIANGLES || this.pt === medea.PT_TRIANGLES_STRIPS)) {
				this._DrawNowWireframe(statepool, change_flags);
				return;
			}

			this.material.Use(function(pass) {
				// Set vbo and ibo if needed
				outer.vbo._Bind(pass.GetAttributeMap(), statepool);

				// Non-wireframe, regular drawing:
				// NOTE: this must happen AFTER the VBO is bound, as Chrome validates the
				// indices when binding the index buffer, leading to undefined 
				// ELEMENT_ARRAY_BUFFER status if the old ARRAY_BUFFER is too small.
				// TODO: find out if this is WebGl per se, or a Chrome bug.
				if (outer.ibo) {
					outer.ibo._Bind(statepool);
				}

				// Update statistics
				st.vertices_frame += vboc;
				++st.batches_frame;

				// Regular drawing
				if (outer.ibo) {
					gl.drawElements(outer.pt, iboc, outer.ibo.GetGlType(), 0);
					st.primitives_frame += outer._Calc_pt(iboc);
				}
				else {
					gl.drawArrays(outer.pt, 0, vboc);
					st.primitives_frame += outer._Calc_pt(vboc);
				}
			}, statepool, 0xffffffff, change_flags);
		},

		_DrawNowWireframe : function(statepool, change_flags) {
			var outer = this
			,	st = medea.GetStatistics()
			,	vboc = this.vbo.GetItemCount()
			,	iboc = this.ibo ? this.ibo.GetItemCount() : null
			;

			// Wireframe is tricky because WebGl does not support the usual
			// gl API for setting the poly mode.

			
			if(this.pt === medea.PT_TRIANGLES_STRIPS) {
				// #ifdef DEBUG
				medealib.LogDebug('not supported: wireframe and medea.PT_TRIANGLES_STRIPS');
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

				this.material.Use(function(pass) {
					outer.vbo._Bind(pass.GetAttributeMap(), statepool);

					// See note in DrawNode()
					outer.line_ibo._Bind(statepool);

					gl.drawElements(gl.LINES,iboc * 2,outer.line_ibo.GetGlType(),0);

					++st.batches_frame;
					st.primitives_frame += iboc;

				}, statepool, 0xffffffff, change_flags);
				return;
			}

			// #ifdef DEBUG
			medealib.DebugAssert(this.ibo && !(this.ibo.flags & medea.INDEXBUFFER_PRESERVE_CREATION_DATA), 'inv');
			// #endif

			// We have an ibo, but its creation data was not preserved
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

		// Updating BBs is well-defined for meshes, so make this functionality public
		UpdateBB : function() {
			this._AutoGenBB();
		},


		_CreateLineIBO : function() {
			// #ifdef LOG
			medealib.LogDebug('creating auxiliary index buffer to hold wireframe line mesh');
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
			medealib.DebugAssert(!!this.line_ibo, 'invariant');
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
			medealib.DebugAssert('unrecognized primitive type: ' + this.pt);
			// #endif
		},

		_AutoGenBB : function() {
			this.bb = this.vbo.GetMinMaxVerts();
		}
	});
	
	
	var _mesh_cache = {
	
	};

	medea._mesh_cache = _mesh_cache;
	
	
	medea.QueryMeshCache = function(cache_name) {
		return _mesh_cache[cache_name];
	};
	

	// Assemble a medea.Mesh from a source of vertices, indices and a material.
	//
	// |vertices| can be a medea.VertexBuffer, or vertex data sources from which
	// to construct a medea.VertexBuffer (go there for the details).
	//
	// Same for |indices|.
	// |material_or_color| can be a color, in which case a plain default
	// material with that color is assigned.
	//
	// |flags| supports both index- and vertexbuffer specific creation flags. If
	// existing vertex and index buffers are passed in, |flags| are ignored.
	// Mesh will not be cached unless |cache_name| is given.
	medea.CreateSimpleMesh = function(vertices,indices, material_or_color, flags, cache_name, rq, pt, line_ibo) {

		if (indices && (Array.isArray(indices) || typeof indices === 'object' && !(indices instanceof medealib.Class))) {
			indices = medea.CreateIndexBuffer(indices,flags);
		}

		if (typeof vertices === 'object' && !(vertices instanceof medealib.Class)) {
			vertices = medea.CreateVertexBuffer(vertices,flags);
		}

		if (Array.isArray(material_or_color)) {
			material_or_color = medea.CreateSimpleMaterialFromColor(material_or_color);
		}

		var mesh = new medea.Mesh(vertices, indices, material_or_color, rq, pt, line_ibo);
		if (cache_name !== undefined) {
			_mesh_cache[cache_name] = mesh;
		}
		return mesh;
	};
	
	
	// Create clone of a mesh (sharing vbo and ibo).
	//
	// |material_or_color| is the material (or plain RGBA color) to use for
	// the cloned mesh. If this argument is omitted, the cloned mesh shares
	// the material of the original.
	//
	// To further specify how materials are shared between meshes, use
	// |medea.CloneMesh(mesh, medea.CloneMaterial(mesh.Material(), flags))|
	medea.CloneMesh = function(mesh, material_or_color) {
		return mesh._Clone(material_or_color);
	};
});

