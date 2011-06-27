
medea.stubs["VertexBuffer"] = (function() {
	var medea = this, gl = medea.gl;
	
	// mark data in the buffer as frequently changing and hint the driver to optimize for this
	medea.VERTEXBUFFER_USAGE_DYNAMIC = 0x1;
	
	// some global utilities. IndexBuffer relies on those as well.
	medea._GLUtilGetFlatData = function(i,pack_dense) {
		pack_dense = pack_dense || false;
	
		if (i instanceof ArrayBuffer) {
			return i;
		}
	
		return new Float32Array(i);
	};
		
	medea._GLUtilIDForArrayType = function(e) {
		if (e instanceof Float32Array) {
			return gl.FLOAT;
		}
		else if (e instanceof Int16Array) {
			return gl.SHORT;
		}
		else if (e instanceof Uint8Array) {
			return gl.UNSIGNED_BYTE;
		}
		else if (e instanceof Uint32Array) {
			return gl.UNSIGNED_INT;
		}
		else if (e instanceof Int32Array) {
			return gl.INT;
		}
		else if (e instanceof Uint16Array) {
			return gl.UNSIGNED_SHORT;
		}
		else if (e instanceof Int8Array) {
			return gl.BYTE;
		}
		return null;
	};
		
	medea._GLUtilSpaceForSingleElement = function(id) {
		
		switch(id) {
			case gl.FLOAT:
			case gl.INT:
			case gl.UNSIGNED_INT:
				return 4;
			case gl.SHORT:
			case gl.UNSIGNED_SHORT:
				return 2;
			case gl.BYTE:
			case gl.UNSIGNED_BYTE:
				return 1;
		};
		return -1;
	};
		
		
	
	// private class _VBOInitDataAccessor
	this._VBOInitDataAccessor = medea.Class.extend({
	
		positions : null,
		normals : null,
		tangents : null,
		bitangents : null,
		colors : null,
		uvs : null,
		
		flags : 0,
		
		// cached number of full vertices
		itemcount : -1,
		
		interleaved : null,
	
		init : function(data,flags) {
		
			this.flags = flags;
			if (data instanceof Array) {
				this.positions = data;
				
			}
			else {
				if ("positions" in data) {
					this.positions = medea._GLUtilGetFlatData( data.positions );
				}
				if ("normals" in data) {
					this.normals = medea._GLUtilGetFlatData( data.normals );
				}
				if ("tangents" in data) {
					this.tangents = this._GetFlatData( data.tangents );
					if ("bitangents" in data) {
						this.bitangents = medea._GLUtilGetFlatData( data.bitangents );
					}
				}
				if ("colors" in data) {
					// XXX 'pack' color values
					this.colors =  data.colors.map(medea._GLUtilGetFlatData); 
				}
				if ("uvs" in data) {
					this.uvs = data.uvs.map(medea._GLUtilGetFlatData); 
				}
			}
			
// #ifdef DEBUG
			if (!this.positions) {
				medea.NotifyFatal("vertex positions must be present");
			}
// #endif
			this.itemcount = this.positions.length/3;
		},
		
		
		SetupGlData : function() {

			var stride = 0, idx = 0;
			
			// compute stride per vertex
			if (this.positions) {
				stride += 3*4;
			}
			if (this.normals) {
				stride += 3*4;
			}
			if (this.tangents) {
				stride += 3*4;
				if (this.bitangents) {
					stride += 3*4;
				}
			}
			if (this.colors) {
				this.colors.forEach(function(u) {
					stride += Math.floor(u.length / this.itemcount);
				},this);
			}
			if (this.uvs) {
				this.uvs.forEach(function(u) {
					stride += Math.floor(u.length / this.itemcount);
				},this);
			}
			
			var ab = new ArrayBuffer(this.itemcount * stride);
			
			// now setup vertex attributes accordingly
			var offset = 0;
			if (this.positions) {
				var view = new Float32Array(ab,offset);
				for(var i = 0, end = this.itemcount*3, p = this.positions, mul = stride/4; i < end; i += 3) {
					view[i*mul+0] = p[i+0]; 
					view[i*mul+1] = p[i+1];
					view[i*mul+2] = p[i+2];
				}
				
				gl.vertexAttribPointer(idx++,3,gl.FLOAT,false,stride,offset);
				offset += 3*4;
			}
			
			if (this.normals) {
				var view = new Float32Array(ab,offset);
				for(var i = 0, end = this.itemcount*3, p = this.normals, mul = stride/4; i < end; i += 3) {
					view[i*mul+0] = p[i+0]; 
					view[i*mul+1] = p[i+1];
					view[i*mul+2] = p[i+2];
				}
				
				gl.vertexAttribPointer(idx++,3,gl.FLOAT,false,stride,offset);
				offset += 3*4;
			}
			
			// XXX
			if (this.tangents) {
				gl.vertexAttribPointer(idx++,3,gl.FLOAT,false,stride,offset);
				offset += 3*4;
				if (bitangents) {
					gl.vertexAttribPointer(idx++,3,gl.FLOAT,false,stride,offset);
					offset += 3*4;
				}
			}
			
			if (this.colors) {
				this.colors.forEach(function(u) {
					var elems = Math.floor(u.length / this.itemcount), type = medea._GLUtilIDForArrayType(u);
					gl.vertexAttribPointer(idx++,elems,type,false,stride,offset);
					offset += elems * medea._GLUtilSpaceForSingleElement(type);
				},this);
			}
			
			if (this.uvs) {
				this.uvs.forEach(function(u) {
					var elems = Math.floor(u.length / this.itemcount), type = medea._GLUtilIDForArrayType(u);
					gl.vertexAttribPointer(idx++,elems,type,false,stride,offset);
					offset += elems * medea._GLUtilSpaceForSingleElement(type);
				},this);
			}
			
			this.stride = stride;
			gl.bufferData(gl.ARRAY_BUFFER,ab, this.flags & medea.VERTEXBUFFER_USAGE_DYNAMIC ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
			this.interleaved = ab;
		},

		
		GetItemCount : function() {
			return this.itemcount;
		},
		
	});
	
	// class VertexBuffer
	this.VertexBuffer = medea.Class.extend({
	
		// Id of underlying OpenGl buffer object
		buffer: -1,
		
		// number of complete vertices
		itemcount: 0,
		
		// initial flags
		flags: 0,
		
		init : function(init_data,flags) {	
			this.flags = flags | 0;
			var access = new medea._VBOInitDataAccessor(init_data,this.flags);
			
			this.buffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
			
			access.SetupGlData();
			this.itemcount = access.GetItemCount();
		},
		
		GetBufferId : function() {
			return this.buffer;
		},
		
		GetFlags : function() {
			return this.flags;
		},
		
		GetItemCount : function() {
			return this.itemcount;
		},
	});
	
	
	this.CreateVertexBuffer = function(init_data,flags) {
		return new medea.VertexBuffer(init_data,flags);
	}
	
	medea.stubs["VertexBuffer"] = null;
});
