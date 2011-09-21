
medea.stubs["vertexbuffer"] = (function(undefined) {
	var medea = this, gl = medea.gl;
	
	
	// constants for mappings of various vertex attributes
	medea.ATTR_POSITION      = 0x10000;
	medea.ATTR_NORMAL        = 0x10001;
	medea.ATTR_TANGENT       = 0x10002;
	medea.ATTR_BITANGENT     = 0x10003;
	
	medea.ATTR_TEXCOORD_BASE = 0x20000;
	medea.ATTR_COLOR_BASE    = 0x30000;
	
	medea.ATTR_TEXCOORD = function(n) { return medea.ATTR_TEXCOORD_BASE + n; };
	medea.ATTR_COLOR = function(n) { return medea.ATTR_COLOR_BASE + n; };
	
	
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
		state_closure : [],
	
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
			var state_closure = this.state_closure = [];
			
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
					stride += Math.floor(u.length / this.itemcount) * 4; // XXX packing as UBYTE8?
				},this);
			}
			if (this.uvs) {
				this.uvs.forEach(function(u) {
					stride += Math.floor(u.length / this.itemcount) * 4;
				},this);
			}
			
			var ab = new ArrayBuffer(this.itemcount * stride);
			var addStateEntry = function(attr_type,idx,elems,type) { (function(idx,stride,offset) { 
					state_closure.push(function(in_map) {
						// first see if there is a mapping defined for this attribute, if so take the
						// index from the given mapping table rather than counting from zero.
						var real_idx = in_map[attr_type] || idx;
						gl.enableVertexAttribArray(real_idx);
						gl.vertexAttribPointer(real_idx,elems || 3, type || gl.FLOAT,false,stride,offset);
					});
				}) (idx,stride,offset);
			};
			
			// now setup vertex attributes accordingly
			var offset = 0;
			if (this.positions) {
				var view = new Float32Array(ab,offset);
				for(var i = 0, end = this.itemcount, p = this.positions, mul = stride/4; i < end; ++i) {
					view[i*mul+0] = p[i*3+0]; 
					view[i*mul+1] = p[i*3+1];
					view[i*mul+2] = p[i*3+2];
				}
				
				addStateEntry(medea.ATTR_POSITION,idx++);
				offset += 3*4;
			}
			
			if (this.normals) {
				var view = new Float32Array(ab,offset);
				for(var i = 0, end = this.itemcount, p = this.normals, mul = stride/4; i < end; ++i) {
					view[i*mul+0] = p[i*3+0]; 
					view[i*mul+1] = p[i*3+1];
					view[i*mul+2] = p[i*3+2];
				}
				
				addStateEntry(medea.ATTR_NORMAL,idx++);
				offset += 3*4;
			}
			
			// XXX
			if (this.tangents) {
				addStateEntry(medea.ATTR_TANGENT,idx++);
				offset += 3*4;
				if (bitangents) {
					addStateEntry(medea.ATTR_BITANGENT,idx++);
					offset += 3*4;
				}
			}
			
			if (this.colors) {
				this.colors.forEach(function(u,i) {
					var elems = Math.floor(u.length / this.itemcount), type = medea._GLUtilIDForArrayType(u);
					
					var view = new Float32Array(ab,offset);
					for(var i = 0, end = this.itemcount, mul = stride/4; i < end; ++i) {
						for(var n = 0; n < elems; ++n) {
							view[i*mul+n] = u[i*elems+n]; 
						}
					}
					
					addStateEntry(medea.ATTR_COLOR(i),idx++,elems,type);
					offset += elems * medea._GLUtilSpaceForSingleElement(type);
				},this);
			}
			
			if (this.uvs) {
				this.uvs.forEach(function(u,i) {
					var elems = Math.floor(u.length / this.itemcount), type = medea._GLUtilIDForArrayType(u);
					
					var view = new Float32Array(ab,offset);
					for(var i = 0, end = this.itemcount, mul = stride/4; i < end; ++i) {
						for(var n = 0; n < elems; ++n) {
							view[i*mul+n] = u[i*elems+n]; 
						}
					}
				
					addStateEntry(medea.ATTR_TEXCOORD(i),idx++,elems,type);
					offset += elems * medea._GLUtilSpaceForSingleElement(type);
				},this);
			}
			
			this.stride = stride;
			// HACK: WebGlInspector currently throws errors if it encounters a raw ArrayBuffer ---
	
			gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(ab,0), this.flags & medea.VERTEXBUFFER_USAGE_DYNAMIC ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
			this.interleaved = ab;
		},

		
		GetItemCount : function() {
			return this.itemcount;
		},
		
		GetStateClosure : function() {
			return this.state_closure;
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
		
		state_closure : [],
		
		init : function(init_data,flags) {	
			this.flags = flags | 0;
			var access = new medea._VBOInitDataAccessor(init_data,this.flags);
			
			this.buffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
			
			access.SetupGlData();
			this.itemcount = access.GetItemCount();
			this.state_closure = access.GetStateClosure();
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
		
		_Bind : function(attrMap) {
			gl.bindBuffer(gl.ARRAY_BUFFER,this.GetBufferId());
			this.state_closure.forEach(function(e) {
				e(attrMap);
			});
		},
	});
	
	
	this.CreateVertexBuffer = function(init_data,flags) {
		return new medea.VertexBuffer(init_data,flags);
	}
	
	medea.stubs["vertexbuffer"] = null;
});
