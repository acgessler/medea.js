
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medea._addMod('vertexbuffer',[],function(undefined) {
	"use strict";
	var medea = this, gl = medea.gl;

	// http://blog.tojicode.com/2012/10/oesvertexarrayobject-extension.html
	var va_ext = gl.getExtension("OES_vertex_array_object");

	// #ifdef DEBUG
	if (va_ext) {
		medea.LogDebug('using OES_vertex_array_object extension');
	}
	else {
		medea.LogDebug('OES_vertex_array_object extension not available');
	}
	// #endif


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



	// NOTE: the constants below may not overlap with any of the IBuffer flags

	// mark data in the buffer as frequently changing and hint the driver to optimize for this
	medea.VERTEXBUFFER_USAGE_DYNAMIC = 0x1000;

	// enable GetSourceData()
	medea.VERTEXBUFFER_PRESERVE_CREATION_DATA = 0x2000;




	// some global utilities. IndexBuffer relies on those as well.
	medea._GLUtilGetFlatData = function(i,pack_dense) {
		pack_dense = pack_dense || false;

		if (i instanceof Float32Array) {
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

		init : function(data,flags, state_closure) {

			this.flags = flags;
			this.state_closure = state_closure || [];

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
			var state_closure = this.state_closure;

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

			// this is used to build the state_closure array, which is later used during rendering
			// to prepare the OpenGL pipeline for drawing this VBO. However, if the calling code
			// did already supply us with it, we make this a no-op.
			var addStateEntry = !state_closure.length ? function(attr_type,idx,elems,type) {
				type = type || gl.FLOAT;
				elems = elems || 3;

				(function(idx,stride,offset) {
					var entry_key = [elems,type,stride,offset].join('-');

					state_closure.push(function(in_map, state) {
						var real_idx = idx;
						if(in_map) {
							real_idx = in_map[attr_type];
							if (real_idx === undefined) {
								return; // don't set this attribute
							}
						}

						if(!state) {
							gl.enableVertexAttribArray(real_idx);
							gl.vertexAttribPointer(real_idx,elems, type,false,stride,offset);
							return
						}

						var gls = state.GetQuick('_gl'), va = gls.va;
						if (!va) {
							va = gls.va = [];
						}
						var	prev = va[real_idx];

						if (prev === undefined) {
							gl.enableVertexAttribArray(real_idx);
						}

						if (prev !== entry_key) {
							gl.vertexAttribPointer(real_idx,elems, type,false,stride,offset);
							va[real_idx] = entry_key;
						}
					});
				}) (idx,stride,offset);
			} : function() {};

			// now setup vertex attributes accordingly
			var offset = 0,  end = this.itemcount, mul = stride/4;
			if (this.positions) {
				var view = new Float32Array(ab,offset);
				for(var i = 0, i3 = 0,im = 0, p = this.positions; i < end; ++i, i3 += 3, im += mul) {
					view[im+0] = p[i3+0];
					view[im+1] = p[i3+1];
					view[im+2] = p[i3+2];

					// #ifdef DEBUG
					medea.DebugAssert(!isNaN(p[i3+0]) && !isNaN(p[i3+1]) && !isNaN(p[i3+2]),'found NaN vertex position ('+i+') - this is rather a "NotAVertex"');
					// #endif

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
				for(var i = 0, i3 = 0, im = 0, p = this.normals; i < end; ++i, i3 += 3, im += mul) {
					view[im+0] = p[i3+0];
					view[im+1] = p[i3+1];
					view[im+2] = p[i3+2];
				}

				addStateEntry(medea.ATTR_NORMAL,idx++);
				offset += 3*4;
			}


			if (this.tangents) {
				var view = new Float32Array(ab,offset);
				for(var i = 0, i3 = 0, im = 0, p = this.tangents; i < end; ++i, i3 += 3, im += mul) {
					view[im+0] = p[i3+0];
					view[im+1] = p[i3+1];
					view[im+2] = p[i3+2];
				}

				addStateEntry(medea.ATTR_TANGENT,idx++);
				offset += 3*4;
				if (this.bitangents) {
					view = new Float32Array(ab,offset);
					for(var i = 0, i3 = 0, im = 0, p = this.bitangents; i < end; ++i, i3 += 3, im += mul) {
						view[im+0] = p[i3+0];
						view[im+1] = p[i3+1];
						view[im+2] = p[i3+2];
					}

					addStateEntry(medea.ATTR_BITANGENT,idx++);
					offset += 3*4;
				}
			}

			if (this.colors) {
				this.colors.forEach(function(u,ii) {
					var elems = Math.floor(u.length / this.itemcount), type = medea._GLUtilIDForArrayType(u);

					var view = new Float32Array(ab,offset);
					for(var i = 0; i < end; ++i) {
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
					for(var i = 0, im = 0; i < end; ++i, im += mul) {
						for(var n = 0; n < elems; ++n) {
							view[im+n] = u[i*elems+n];
						}
					}

					addStateEntry(medea.ATTR_TEXCOORD(ii),idx++,elems,type);
					offset += elems * medea._GLUtilSpaceForSingleElement(type);
				},this);
			}

			this.stride = stride;

			gl.bufferData(gl.ARRAY_BUFFER,ab, this.flags & medea.VERTEXBUFFER_USAGE_DYNAMIC 
				? gl.DYNAMIC_DRAW 
				: gl.STATIC_DRAW);

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

		// only present if the PRESERVE_CREATION_DATA flag is set
		init_data : null,

		state_closure : [],

		init : function(init_data,flags) {
			this.flags = flags | 0;

			// #ifdef DEBUG
			this.flags |= medea.VERTEXBUFFER_PRESERVE_CREATION_DATA;
			// #endif

			this.Fill(init_data);
		},

		// medea.VERTEXBUFFER_USAGE_DYNAMIC recommended if this function is used
		Fill : function(init_data, same_layout) {

			if (this.buffer === -1) {
				this.buffer = gl.createBuffer();
			}

			gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);

			var access = new medea._VBOInitDataAccessor(init_data,this.flags, same_layout ? this.state_closure : null );
			access.SetupGlData();

			this.itemcount = access.GetItemCount();
			this.state_closure = access.GetStateClosure();
			this.minmax = access.GetMinMaxVerts();

			if (this.flags & medea.VERTEXBUFFER_PRESERVE_CREATION_DATA) {
				this.init_data = init_data;
			}
		},

		_TryPopulateVAO : function(attrMap) {
			if (!va_ext) {
				return;
			}
			this.vao = va_ext.createVertexArrayOES();
			if(!this.vao) {
				return;
			}

			va_ext.bindVertexArrayOES(this.vao);
			gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);

			this.state_closure.forEach(function(e) {
				e(attrMap);
			});

			va_ext.bindVertexArrayOES(null);
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

		GetSourceData : function() {
			return this.init_data;
		},

		Dispose : function() {
			if (this.buffer === -1) {
				return;
			}

			gl.deleteBuffer(this.buffer);
			this.buffer = -1;
		},

		_Bind : function(attrMap, statepool) {
			var id = this.GetBufferId(), gls = statepool.GetQuick('_gl');
			if (gls.ab === id) {
				return;
			}

			gls.ab = id;
			// use VAO if available. The VAO changes, however, with the input attribute
			// map so we have to quickly detect if the current VAO is still up to date.
			if(va_ext) {
				if(this.vao) {
					var cached = this._vao_attrmap;
					var dirty = false;
					
					if(attrMap && cached) {
						// TODO: better way of doing this?
						for(var key in attrMap) {
							if (attrMap[key] !== cached[key]) {
								dirty = true;
								break;
							}
						}
						for(var key in cached) {
							if (attrMap[key] !== cached[key]) {
								dirty = true;
								break;
							}
						}
					}
					else if (attrMap || cached) {
						dirty = true;
					}

					if(dirty) {
						va_ext.deleteVertexArrayOES(this.vao);
						this.vao = null;
					}
				}

				if(!this.vao) {
					this._TryPopulateVAO(attrMap);
				}

				if(this.vao) {
					va_ext.bindVertexArrayOES(this.vao);
					return;
				}
			}

			// invalidate the state cache for vertexAttrib binding
			// now that the buffer is changed.
			if (gls.va) {
				gls.va.length = 0;
			}

			gl.bindBuffer(gl.ARRAY_BUFFER,id);
			this.state_closure.forEach(function(e) {
				e(attrMap, statepool);
			});
		},
	});


	this.CreateVertexBuffer = function(init_data,flags) {
		return new medea.VertexBuffer(init_data,flags);
	}
});
