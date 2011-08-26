
medea.stubs["Mesh"] = (function() {
	var medea = this, gl = medea.gl;
	
	medea._Require("VertexBuffer");
	medea._Require("IndexBuffer");
	medea._Require("Material");
	medea._Require("Entity");
	
	// class RenderJob
	this.RenderJob = medea.Class.extend({
		
		distance: null,
		
		init : function(mesh,node,viewport) {
			this.mesh = mesh;
			this.node = node;
			this.viewport = viewport;
			this.Draw = function(statepool) { mesh.DrawNow(statepool); };
		},
		
		// required methods for automatic sorting of renderqueues
		DistanceEstimate : function() {
			if (this.distance === null) {
				this.distance = V3.lengthSquared(V3.sub(this.viewport.GetCameraWorldPos(),this.node.GetWorldPos()));
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
	
		Render : function(viewport,node,rqmanager) {
			// construct a renderable capable of drawing this mesh upon request by the render queue manager
			rqmanager.Push(medea.RENDERQUEUE_DEFAULT,new medea.RenderJob(this,node,viewport));
		},
		
		Update : function() {
		},
		
		DrawNow : function(statepool) {
	
			var st = medea.GetStatistics();
			var vboc = this.vbo.GetItemCount();
			var iboc = this.ibo ? this.ibo.GetItemCount()/3 : null;
			
			// set vbo and ibo if needed
			gl.bindBuffer(gl.ELEMENT_BUFFER,this.vbo.GetBufferId());
			
			if (this.ibo) {
				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.ibo.GetBufferId());
			}
					
			this.material.Use(function() {
					// update statistics
					st.vertices_frame += vboc;
					
					if (this.ibo) {
						gl.drawElements(gl.TRIANGLES,iboc,this.ibo.GetGlType(),0);
						st.primitives_frame += iboc;
					}
					else {
						
						gl.drawArrays(gl.TRIANGLES,this.vboc);
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

