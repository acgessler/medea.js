
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler 
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medea._addMod('indexbuffer',[],function(undefined) {
	var medea = this, gl = medea.gl;

	// mark data in the buffer as frequently changing and hint the driver to optimize for this
	medea.INDEXBUFFER_USAGE_DYNAMIC = 0x1;
	
	// enable 32 bit indices
	medea.INDEXBUFFER_LARGE_MESH = 0x2;
	
	
	// class IndexBuffer
	medea.IndexBuffer = medea.Class.extend({
		
		// Id of underlying OpenGl buffer object
		buffer: -1,
	
		// number of indices in the buffer, NOT primitive count
		itemcount: 0,
		
		// original flags
		flags: 0,
		
		//
		gltype : 0,
		
		init : function(init_data,flags) {	
			this.flags = flags | 0;
			
			this.itemcount = init_data.length;
			this.buffer = gl.createBuffer();
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.buffer);
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new (this.flags & medea.INDEXBUFFER_LARGE_MESH ? Uint32Array : Uint16Array)(init_data),
				this.flags & medea.VERTEXBUFFER_USAGE_DYNAMIC ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
				
			this.gltype = this.flags & medea.INDEXBUFFER_LARGE_MESH ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
		},
		
		GetBufferId : function() {
			return this.buffer;
		},
		
		GetItemCount : function() {
			return this.itemcount;
		},
		
		GetGlType : function() {
			return this.gltype;
		},
		
		GetFlags : function() {
			return this.flags;
		},
		
		
		_Bind : function() {
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.GetBufferId());
		},
	});
	
	medea.CreateIndexBuffer = function(indices,flags) {
		return new medea.IndexBuffer(indices,flags);
	};
});
