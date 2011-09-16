
medea.stubs["Mesh"] = (function() {
	var medea = this, gl = medea.gl;
	
	medea._Require("VertexBuffer");
	medea._Require("IndexBuffer");
	medea._Require("Material");
	medea._Require("Entity");
	
	// class RenderJob
	this.RenderJob = medea.Class.extend({
		
		distance: null,
		
		init : function(mesh,entity,viewport) {
			this.mesh = mesh;
			this.entity = entity;
			this.viewport = viewport;
			this.Draw = function(statepool) { 
		
				statepool.Set("W",entity.parent.GetGlobalTransform());
				mesh.DrawNow(statepool); 
			};
		},
		
		// required methods for automatic sorting of renderqueues
		DistanceEstimate : function() {
			if (this.distance === null) {
				this.distance = vec3.lengthSquared(vec3.sub(this.viewport.GetCameraWorldPos(),this.entity.parent.GetWorldPos()));
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
		init : function(vbo,ibo,material) {
			this.vbo = vbo;
			this.ibo = ibo;
			this.material = material;
			
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
	
		Render : function(viewport,entity,rqmanager) {
			// construct a renderable capable of drawing this mesh upon request by the render queue manager
			rqmanager.Push(medea.RENDERQUEUE_DEFAULT,new medea.RenderJob(this,entity,viewport));
		},
		
		Update : function() {
		},
		
		Material : function(m) {
			if (m === undefined) {
				return this.material;
			}
			this.material = m;
		},
		
		DrawNow : function(statepool) {
	
			var st = medea.GetStatistics();
			var vboc = this.vbo.GetItemCount();
			var iboc = this.ibo ? this.ibo.GetItemCount() : null;

					
			var outer = this;
			this.material.Use(function(pass) {
					// set vbo and ibo if needed
					outer.vbo._Bind(pass.GetAttributeMap());
					
					if (outer.ibo) {
						outer.ibo._Bind();
					}
			
					// update statistics
					st.vertices_frame += vboc;
					
					if (outer.ibo) {
					
						gl.drawElements(gl.TRIANGLES,iboc,outer.ibo.GetGlType(),0);
						st.primitives_frame += iboc/3;
					}
					else {
						
						gl.drawArrays(gl.TRIANGLES,vboc);
						st.primitives_frame += vboc/3;
					}	
			},statepool);	
		
		}
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
	
	medea.stubs["Mesh"] = null;
});

