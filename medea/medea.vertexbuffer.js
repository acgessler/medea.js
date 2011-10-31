
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander Ċ. Gessler 
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medea._addMod('vertexbuffer',[],function(undefined) {
	var medea = this, gl = medea.gl;
	
	// constants for mappings of various vertex attributes, these map 1 one by one
    // to the standard names for shader attribute names.
	medea.ATTR_POSITION      = "POSITION";
	medea.ATTR_NORMAL        = "NORMAL";
	medea.ATTR_TANGENT       = "TANGENT";
	medea.ATTR_BITANGENT     = "BITANGENT";
	
	medea.ATTR_TEXCOORD_BASE = "TEXCOORD";
	medea.ATTR_COLOR_BASE    = "COLOR";
	
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
		
		minmax : null,
	
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
					this.tangents = medea._GLUtilGetFlatData( data.tangents );
					if ("bitangents" in data) {
						this.bitangents = medea._GLUtilGetFlatData( data.bitangents );
					}
				}
				if (data.colors) {
					// XXX 'pack' color values
					this.colors =  data.colors.map(medea._GLUtilGetFlatData); 
				}
				if (data.uvs) {
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
			
			this.minmax = medea.CreateBB();
			var mmin = this.minmax[0],mmax = this.minmax[1],min = Math.min, max = Math.max;
			
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
                        var real_idx = idx;
                        if(in_map) {
                            real_idx = in_map[attr_type];
                            if (real_idx === undefined) {
                                return; // don't set this attribute
                            }
                        }

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
					var i3 = i*3;
					view[i*mul+0] = p[i3+0]; 
					view[i*mul+1] = p[i3+1];
					view[i*mul+2] = p[i3+2];
					
					// gather minimum and maximum vertex values, those will be used to derive a suitable BB
					mmin[0] = min(p[i3+0],mmin[0]);
					mmin[1] = min(p[i3+1],mmin[1]);
					mmin[2] = min(p[i3+2],mmin[2]);
					
					mmax[0] = max(p[i3+0],mmax[0]);
					mmax[1] = max(p[i3+1],mmax[1]);
					mmax[2] = max(p[i3+2],mmax[2]);
                    
                    
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
			
		
			if (this.tangents) {
                var view = new Float32Array(ab,offset);
				for(var i = 0, end = this.itemcount, p = this.tangents, mul = stride/4; i < end; ++i) {
					view[i*mul+0] = p[i*3+0]; 
					view[i*mul+1] = p[i*3+1];
					view[i*mul+2] = p[i*3+2];
				}
                
				addStateEntry(medea.ATTR_TANGENT,idx++);
				offset += 3*4;
				if (this.bitangents) {
                    view = new Float32Array(ab,offset);
    				for(var i = 0, end = this.itemcount, p = this.bitangents, mul = stride/4; i < end; ++i) {
    					view[i*mul+0] = p[i*3+0]; 
    					view[i*mul+1] = p[i*3+1];
    					view[i*mul+2] = p[i*3+2];
    				}
                
					addStateEntry(medea.ATTR_BITANGENT,idx++);
					offset += 3*4;
				}
			}
			
			if (this.colors) {
				this.colors.forEach(function(u,ii) {
					var elems = Math.floor(u.length / this.itemcount), type = medea._GLUtilIDForArrayType(u);
					
					var view = new Float32Array(ab,offset);
					for(var i = 0, end = this.itemcount, mul = stride/4; i < end; ++i) {
						for(var n = 0; n < elems; ++n) {
							view[i*mul+n] = u[i*elems+n]; 
						}
					}
					
					addStateEntry(medea.ATTR_COLOR(ii),idx++,elems,type);
					offset += elems * medea._GLUtilSpaceForSingleElement(type);
				},this);
			}
			
			if (this.uvs) {
				this.uvs.forEach(function(u,ii) {
					var elems = Math.floor(u.length / this.itemcount), type = medea._GLUtilIDForArrayType(u);
					
					var view = new Float32Array(ab,offset);
					for(var i = 0, end = this.itemcount, mul = stride/4; i < end; ++i) {
						for(var n = 0; n < elems; ++n) {
							view[i*mul+n] = u[i*elems+n]; 
						}
					}
				
					addStateEntry(medea.ATTR_TEXCOORD(ii),idx++,elems,type);
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
		
		GetStateClosure : function() {
			return this.state_closure;
		},
		
		GetMinMaxVerts : function() {
			return this.minmax;
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
			
			this.minmax = access.GetMinMaxVerts();
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
		
		GetMinMaxVerts : function() {
			return this.minmax;
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
});
