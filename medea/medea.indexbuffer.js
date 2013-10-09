
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medea.define('indexbuffer',[],function(undefined) {
	"use strict";
	var medea = this, gl = medea.gl;


	// NOTE: the constants below may not overlap with any of the VBO flags

	// mark data in the buffer as frequently changing and hint the driver to optimize for this
	medea.INDEXBUFFER_USAGE_DYNAMIC = 0x1;

	// enable 32 bit indices - NOT CURRENTLY SUPPORTED BY WEBGL!
	medea.INDEXBUFFER_LARGE_MESH = 0x2;

	// enable GetSourceData()
	medea.INDEXBUFFER_PRESERVE_CREATION_DATA = 0x4;



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
			// TODO: necessary for now in order to be able to display wireframes
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

			var arr = init_data;
			if(!(arr instanceof Uint32Array) && !(arr instanceof Uint16Array)) {
				// TODO: maybe this would be a better spot for a debug check on exceeded index ranges
				// than the scene loader code.
				arr = new (this.flags & medea.INDEXBUFFER_LARGE_MESH ? Uint32Array : Uint16Array)(init_data)
			}

			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.buffer);
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,arr,
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

		Dispose : function() {
			if (this.buffer === -1) {
				return;
			}

			gl.deleteBuffer(this.buffer);
			this.buffer = -1;
		},

		_Bind : function(statepool) {
			var id = this.GetBufferId(), gls = statepool.GetQuick('_gl');
			if (gls.eab === id) {
				return;
			}

			gls.eab = id;
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,id);
		}
	});

	medea.CreateIndexBuffer = function(indices,flags) {
		return new medea.IndexBuffer(indices,flags);
	};

	medea.CreateLineListIndexBufferFromTriListIndices = function(indices,flags) {
		if(indices instanceof medea.IndexBuffer) {
			flags = indices.flags;
			indices = indices.GetSourceData();
			
			// #ifdef DEBUG
			medea.DebugAssert(!!indices, 'source index buffer must specify medea.INDEXBUFFER_PRESERVE_CREATION_DATA');
			// #endif
		}
		var tri_count = indices.length / 3
		,	line_indices = new Uint16Array(tri_count * 6)
		,	tri = 0
		,	cur = 0
		,	a
		,	b
		,	c
		;

		for(; tri < tri_count; ++tri) {
			a = indices[tri * 3 + 0];
			b = indices[tri * 3 + 1];
			c = indices[tri * 3 + 2];

			line_indices[cur++] = a;
			line_indices[cur++] = b;
			line_indices[cur++] = c;
			line_indices[cur++] = a;
			line_indices[cur++] = b;
			line_indices[cur++] = c;
		}

		return new medea.IndexBuffer(line_indices,flags);
	};
});
