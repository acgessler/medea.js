
medea.stubs["Mesh"] = (function() {
	var medea = this, gl = medea.gl;
	
	medea._Require("VertexBuffer");
	medea._Require("IndexBuffer");
	medea._Require("Material");
	medea._Require("Entity");
	
	// class RenderJob
	this.RenderJob = medea.Class.extend({
		
		init : function(mesh) {
			this.mesh = mesh;
			this.Draw = function() { mesh.DrawNow(); };
		},
		
		// required methods for automatic sorting of renderqueues
		Distance : function() {
			return 0.0;
		},
		
		MaterialId : function() {
			return 0;
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
		},
	
		Render : function(viewport,node,rqmanager) {
			// construct a renderable capable of drawing this mesh upon request by the render queue manager
			rqmanager.Push(medea.RENDERQUEUE_DEFAULT,new medea.RenderJob(this));
		},
		
		Update : function() {
		},
		
		DrawNow : function() {
			gl.bindBuffer(gl.ELEMENT_BUFFER,this.vbo.GetBufferId());
			if (this.ibo) {
				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.ibo.GetBufferId());
				gl.drawElements(gl.TRIANGLES,this.ibo.GetItemCount()/3,this.ibo.GetGlType());
			}
			else {
				gl.drawArrays(gl.TRIANGLES,this.vbo.GetItemCount());
			}
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

