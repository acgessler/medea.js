
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medea._addMod('indexbuffer',[],function(undefined) {
	"use strict";
	var medea = this, gl = medea.gl;


	// NOTE: the constants below may not overlap with any of the VBO flags

	// mark data in the buffer as frequently changing and hint the driver to optimize for this
	medea.INDEXBUFFER_USAGE_DYNAMIC = 0x1;

	// enable 32 bit indices - NOT CURRENTLY SUPPORTED BY WEBGL!
	medea.INDEXBUFFER_LARGE_MESH = 0x2;

	// enable GetSourceData()
	medea.VERTEXBUFFER_PRESERVE_CREATION_DATA = 0x2;



	// class IndexBuffer
	medea.IndexBuffer = medea.Class.extend({

		// Id of underlying OpenGl buffer object
		buffer: -1,

		// number of indices in the buffer, NOT primitive count
		itemcount: 0,

		// original flags
		flags: 0,

		// only present if the PRESERVE_CREATION_DATA flag is set
		init_data : null,


		//
		gltype : 0,

		init : function(init_data,flags) {
			this.flags = flags || 0;

			// #ifdef DEBUG
			this.flags |= medea.INDEXBUFFER_PRESERVE_CREATION_DATA;
			// #endif

			// #ifdef DEBUG
			if (this.flags & medea.INDEXBUFFER_LARGE_MESH) {
				medea.DebugAssert('32 bit indices not currently supported');
			}
			// #endif

			this.Fill(init_data);
			this.gltype = this.flags & medea.INDEXBUFFER_LARGE_MESH ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
		},

		// medea.VERTEXBUFFER_USAGE_DYNAMIC recommended if this function is used
		Fill : function(init_data) {

			if (this.buffer === -1) {
				this.buffer = gl.createBuffer();
			}

			this.itemcount = init_data.length;

			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.buffer);
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new (this.flags & medea.INDEXBUFFER_LARGE_MESH ? Uint32Array : Uint16Array)(init_data),
				this.flags & medea.INDEXBUFFER_USAGE_DYNAMIC ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);

			if (this.flags & medea.INDEXBUFFER_PRESERVE_CREATION_DATA) {
				this.init_data = init_data;
			}
		},

		GetSourceData : function() {
			return this.init_data;
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


		_Bind : function(statepool) {
			var id = this.GetBufferId(), gls = statepool.GetQuick('_gl');
			if (gls.eab === id) {
				return;
			}

			gls.eab = id;
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,id);
		},
	});

	medea.CreateIndexBuffer = function(indices,flags) {
		return new medea.IndexBuffer(indices,flags);
	};
});
