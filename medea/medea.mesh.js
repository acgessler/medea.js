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
	
	// class RenderJob
	this.RenderJob = medea.Class.extend({
		
		distance: null,
		
		init : function(mesh,entity,node,viewport) {
			this.mesh = mesh;
			this.entity = entity;
			this.node = node;
			this.viewport = viewport;
			this.Draw = function(statepool) { 
		
				statepool.Set("W",node.GetGlobalTransform());
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
		init : function(vbo,ibo,material,rq) {
			this.vbo = vbo;
			this.ibo = ibo;
			this.material = material;
			this.rq_idx = rq === undefined ? medea.RENDERQUEUE_DEFAULT : rq;
			
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
		
		DrawNow : function(statepool) {
	
			var st = medea.GetStatistics();
			var vboc = this.vbo.GetItemCount();
			var iboc = this.ibo ? this.ibo.GetItemCount() : null, wf = medea.Wireframe();

					
			var outer = this;
			this.material.Use(function(pass) {
					// set vbo and ibo if needed
					outer.vbo._Bind(pass.GetAttributeMap());
					
					if (outer.ibo) {
						outer.ibo._Bind();
					}
			
					// update statistics
					st.vertices_frame += vboc;
					++st.batches_frame;
					
					// regular drawing
					if(!wf) {
						if (outer.ibo) {
						
							gl.drawElements(gl.TRIANGLES,iboc,outer.ibo.GetGlType(),0);
							st.primitives_frame += iboc/3;
						}
						else {
							
							gl.drawArrays(gl.TRIANGLES,vboc);
							st.primitives_frame += vboc/3;
						}	
					}
					// since we don't have glPolygonMode in WebGL, we need to do it manually. 
					// of course, substituting gl.LINES does *not* give correct results, but
					// it is relatively fast.
					else {
						if (outer.ibo) {
						
							gl.drawElements(gl.LINES,iboc,outer.ibo.GetGlType(),0);
							st.primitives_frame += iboc/3;
						}
						else {
							
							gl.drawArrays(gl.LINES,vboc);
							st.primitives_frame += vboc/3;
						}	
					}
			},statepool);	
		
		},
		
		
		
		_AutoGenBB : function() {
			this.bb = this.vbo.GetMinMaxVerts();
		},
	});
	
	// 
	medea.CreateSimpleMesh = function(vertices,indices,material_or_color) {
	
		return new medea.Mesh(medea.CreateVertexBuffer(vertices),
			indices ? medea.CreateIndexBuffer(indices) : null, 
			
			material_or_color instanceof Array 
				? medea.CreateSimpleMaterialFromColor(material_or_color) 
				: material_or_color
			);
	};
});

