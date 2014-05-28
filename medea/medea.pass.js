
/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('pass',['shader','texture'],function(medealib, undefined) {
	"use strict";
	var medea = this, gl = medea.gl;

	// Maximum number of samplers in use at the same time
	medea.MAX_TEXTURE_UNITS = 12;

	medea.MATERIAL_CLONE_COPY_STATE 		= 0x1;
	medea.MATERIAL_CLONE_SHARE_STATE 		= 0x2;

	medea.MATERIAL_CLONE_COPY_CONSTANTS 	= 0x4;
	medea.MATERIAL_CLONE_SHARE_CONSTANTS 	= 0x8;


	medea.PASS_SEMANTIC_COLOR_FORWARD_LIGHTING 	= 0x1;
	medea.PASS_SEMANTIC_SHADOWMAP 				= 0x2;
	medea.PASS_SEMANTIC_DEPTH_PREPASS 			= 0x4;
	medea.PASS_SEMANTIC_DEFERRED_COLOR 			= 0x8;
	medea.PASS_SEMANTIC_DEFERRED_NORMAL 		= 0x10;


	/** medea.MAX_DIRECTIONAL_LIGHTS 
	 *
	 *  Maximum number of directional light sources supported for forward rendering.
	 * */
	medea.MAX_DIRECTIONAL_LIGHTS = 8;


	// Cache for gl program objects and their ids, keyed by "vs_id" + "ps_id" (
	// corresponding to pass.cache_id)
	var program_cache = {};
	var program_ids = {};
	var program_id_counter = 0;

	// Map from GLSL type identifiers to the corresponding GL enumerated types
	var glsl_typemap = {
		'float'	: gl.FLOAT,
		'int'	: gl.INT,
		'bool'	: gl.BOOL,
		'vec2'	: gl.FLOAT_VEC2,
		'vec3'	: gl.FLOAT_VEC3,
		'vec4'	: gl.FLOAT_VEC4,
		'ivec2'	: gl.INT_VEC2,
		'ivec3'	: gl.INT_VEC3,
		'ivec4'	: gl.INT_VEC4,
		'bvec2'	: gl.BOOL_VEC2,
		'bvec3'	: gl.BOOL_VEC2,
		'bvec4'	: gl.BOOL_VEC4,
		'mat2'	: gl.BOOL_MAT2,
		'mat3'	: gl.BOOL_MAT3,
		'mat4'	: gl.BOOL_MAT4,
		'sampler2D'	: gl.SAMPLER_2D,
		'samplerCube'	: gl.SAMPLER_CUBE
	};

	var glsl_type_picker = [];
	for (var k in glsl_typemap) {
		glsl_type_picker.push(k);
	}
	glsl_type_picker = '(' + glsl_type_picker.join('|') + ')';


	var setters = medea.ShaderSetters = {
		CAM_POS :  function(pos, state, change_flags) {
			if(change_flags & 0x2) { // no cam changes
				return;
			}
			gl.uniform3fv(pos, state.GetQuick("CAM_POS"));
		},

		CAM_POS_LOCAL :  function(pos, state, change_flags) {
			if(change_flags & 0x2) { // no cam changes
				return;
			}
			gl.uniform3fv(pos, state.Get("CAM_POS_LOCAL"));
		},

		WVP :  function(pos, state, change_flags) {
			if(change_flags & 0x7 === 0x7) { // no cam, no world and no projection changes
				return;
			}
			gl.uniformMatrix4fv(pos, false, state.Get("WVP"));
		},

		WIT :  function(pos, state, change_flags) {
			if(change_flags & 0x1) { // no world changes
				return;
			}
			gl.uniformMatrix4fv(pos, false, state.Get("WIT"));
		},

		WI :  function(pos, state, change_flags) {
			if(change_flags & 0x1) { // no world changes
				return;
			}
			gl.uniformMatrix4fv(pos, false, state.Get("WI"));
		},

		VP :  function(pos, state, change_flags) {
			if(change_flags & 0x6 === 0x6) { // no cam and no projection changes
				return;
			}
			gl.uniformMatrix4fv(pos, false, state.Get("VP"));
		},

		W :  function(pos, state, change_flags) {
			if(change_flags & 0x1) { // no world changes
				return;
			}
			gl.uniformMatrix4fv(pos, false, state.GetQuick("W"));
		},

		V :  function(pos, state, change_flags) {
			if(change_flags & 0x2) { // no cam changes
				return;
			}
			gl.uniformMatrix4fv(pos, false, state.GetQuick("V"));
		},

		P :  function(pos, state, change_flags) {
			if(change_flags & 0x4) { // no projection changes
				return;
			}
			gl.uniformMatrix4fv(pos, false, state.GetQuick("P"));
		}
	};

	var zero_light = [0,0,0];

	// Generate shader setters for directional lights
	for (var i = 0, e = medea.MAX_DIRECTIONAL_LIGHTS; i < e; ++i) {
		(function(i) { 
			// LIGHT_Dn_DIR -- global light direction vector
			setters["LIGHT_D"+i+"_DIR"] = function(pos, state) {
				var lights = state.Get("DIR_LIGHTS")
				,	dir
				;

				if(!lights || lights.length <= i) {
					// TODO: maybe reset it for debug builds
					return;
				}
				// important: pass the INVERSE light direction to save a 
				// negation (albeit cheap / free) in shader code.
				dir = lights[i].world_dir;
				gl.uniform3f(pos, -dir[0], -dir[1], -dir[2]);
			};

			// LIGHT_Dn_COLOR -- light color
			setters["LIGHT_D"+i+"_COLOR"] = function(pos, state) {
				var lights = state.Get("DIR_LIGHTS");
				if(!lights || lights.length <= i) {
					gl.uniform3fv(pos, zero_light);
					return;
				}
				gl.uniform3fv(pos, lights[i].color);
			};
		})(i);
	}

	// For every program (keyed on the cache name) the pass
	// instance that this material was last used with.
	var pass_last_used_with = {};

	// TODO: point and spot lights


	/** @class medea.Pass 
     *
     *
     *
	 */
	medea.Pass = medealib.Class.extend({

		wannabe_clones : null,
		vs : null,
		ps : null,
		constants : null,
		auto_setters : null,
		attr_map : null,
		state : null,
		program : null,
		semantic : medea.PASS_SEMANTIC_COLOR_FORWARD_LIGHTING,
		cache_name : null,

		clone_flags : null,
		original : null,

// #ifdef DEBUG
		ignore_uniform_errors : false,
// #endif

		/** @name medea.Pass.init(*) 
		 */
		init : function(vs,ps,constants,attr_map,state) {
			this.vs = vs;
			this.ps = ps;
			this.constants = constants || {};
			this.auto_setters = {};
			this.attr_map = attr_map;
			this.state = state || {};

// #ifdef DEBUG
			if (!vs || !ps) {
				medealib.DebugAssert("need valid vertex and pixel shader");
			}
// #endif

			this._TryAssembleProgram();
		},


		Semantic: medealib.Property('semantic'),


		AddSemantic : function(sem) {
			this.semantic |= sem;
		},

		RemoveSemantic : function(sem) {
			this.semantic &= ~sem;
		},


		/** @name medea.Pass.Begin(*)
		 *
		 *  
		 *
		 *  @param statepool 
		 */
		Begin : function(statepool, change_flags) {
			if (this.program === null) {
				this._TryAssembleProgram();
				if(!this.IsComplete()) {
					return false;
				}
			}

			var gl_state = statepool.GetQuick("_gl")
			,	program = this.program
			,	cache_name = this.cache_name
			;

			if(gl_state.program !== program) {
				gl_state.program = program;
				gl.useProgram(program);

				// program changes invalidates 'state not changed' flags
				change_flags = 0;
				pass_last_used_with[cache_name] = this;
			}

			// If this program was last used with _this_ pass, we can 
			// sometimes completely re-use shader state.
			else if(pass_last_used_with[cache_name] === this) {
				change_flags |= 0x8;
			}
			else {
				pass_last_used_with[cache_name] = this;
			}

			// TODO: currently, flag 0x8 is not checked for in the shader
			// setting closure.
			if(change_flags !== 0xf) {
				this._SetAutoState(statepool, change_flags);
			}
			return true;
		},

		End : function() {
		},

		GetAttributeMap : function() {
			return this.attr_map;
		},

		GetProgramId : function() {
			return this.program_id;
		},

		State : function(state) {
			if (state === undefined) {
				return this.state;
			}
			this.state = state;
		},


		// some shortcuts to simplify common state handling
		CullFace : function(c) {
			if (c === undefined) {
				return this.state.cull_face;
			}

			this.state.cull_face = c;
		},

		CullFaceMode : function(c) {
			if (c === undefined) {
				return this.state.cull_face_mode;
			}

			this.state.cull_face_mode = c;
		},

		DepthWrite : function(c) {
			if (c === undefined) {
				return this.state.depth_write;
			}

			this.state.depth_write = c;
		},

		DepthTest : function(c) {
			if (c === undefined) {
				return this.state.depth_test;
			}

			this.state.depth_test = c;
		},


		// Possible values for |c|:
		//   never, less, equal, less_equal, greater, greater_equal,
		//   not_equal, always.
		DepthFunc : function(c) {
			if (c === undefined) {
				return this.state.depth_func;
			}

			this.state.depth_func = c;
		},


		// Possible values for |c|:
		//   add, subtract, reverse_subtract
		BlendOp : function(c) {
			if (c === undefined) {
				return this.state.blend_op;
			}

			this.state.blend_op = c;
		},


		// Possible values for |src| and |dst|:
		//   src_alpha, dst_alpha, src_color, dst_color
		//   one_minus_src_alpha, one_minus_dst_alpha, one_minus_src_color,
		//	 one_minus_dst_color
		//
		// If parameters are omitted, returns a 2-tuple of
		// the current values.
		BlendFunc : function(src, dst) {
			if (src === undefined) {
				return this.state.blend_func;
			}

			this.state.blend_func = [src, dst];
		},


		BlendEnable : function(c) {
			if (c === undefined) {
				return this.state.blend;
			}

			this.state.blend = c;
		},


		// Convenience function to enable "normal" alpha blending for the
		// pass (if |doit| is true, else it is disabled).
		//
		// "Normal" alpha blending is equivalent to:
		//		BlendOp('add')
		//		BlendFunc(['src_alpha', 'one_minus_src_alpha'])
		//		BlendEnable(true)
		//
		// Note: when using alpha-blending, make sure you move all meshes
		// that are semi-transparent to one of the RENDERQUEUE_ALPHA_XXX
		// render queues to make sure they are rendered with depth
		// write access turned off and proper depth sorting.
		SetDefaultAlphaBlending : function(doit) {
			if (!doit) {
				this.BlendEnable(false);
			}
			this.BlendOp('add');
			this.BlendFunc('src_alpha', 'one_minus_src_alpha');
			this.BlendEnable(true);
		},


		// Set the |k| shader constant (uniform) to |val|.
		//
		// |val| must be one of:
		//   1) A value matching the data type of the uniform being set (otherwise
		//      a debug error is produced). Duck-typing applies: for example, a GLSL vec4
		//      can be set from anything that has allows indexing in range [0, 3].
		//   2) A closure that produces a value that fullfils 1). The closure will
		//      be invoked every time the pass is used to produce an up to date
		//      value for the uniform. Note that this causes a performance penalty.
		//   3) A string, the meaning of which depends on the data type:
		//       i) for textures (cube, normal, volume): a string that can be passed
		//          to |medea.CreateTexture|, |medea.CreateCubeTexture|, .. (respectively)
		//          in order to create a texture. While the texture is not available,
		//          a default texture is bound to the slot (the default texture is
		//          black in release builds and yellow-black in debug builds).
		//       ii) for other types: the string is eval()ed every time the pass is
		//          used, with performance characteristics similar to 2).
		//	  4) A dictionary, containing a |medea.LODTexture| input specification, i.e.
		//       it has at least |low| and |high| set to valid textures (or
		//       texture paths).
		Set : function(k, val) {
			if (val === undefined) {
				return;
			}

			this.constants[k] = val;
			if (this.program === null) {
				// do the real work later when we have the actual program
				return;
			}

			var pos = gl.getUniformLocation(this.program, k);
			if (!pos) {
				// #ifdef DEBUG
				if (!this.ignore_uniform_errors) {
					medealib.DebugAssert("Uniform variable location not found: " + k +
						". This is a debug check to help catch errors. Use " +
						" material.SetIgnoreUniformVarLocationNotFound() " +
						"to silence this message if this was intentional.");
				}
				// #endif
				return;
			}

			var handler = null;
			var prog = this.program;

			switch(this._GetUniformType(k)) {
				case gl.FLOAT:
					handler = function(pos, state, curval) {
						gl.uniform1f(pos, curval );
					};
					break;

				case gl.INT:
				case gl.BOOL:
					handler = function(pos, state, curval) {
						gl.uniform1i(pos, curval );
					};
					break;

				case gl.FLOAT_VEC4:
					handler = function(pos, state, curval) {
						gl.uniform4fv(pos, curval );
					};
					break;
				case gl.FLOAT_VEC3:
					handler = function(pos, state, curval) {
						gl.uniform3fv(pos, curval );
					};
					break;
				case gl.FLOAT_VEC2:
					handler = function(pos, state, curval) {
						gl.uniform2fv(pos, curval );
					};
					break;

				case gl.INT_VEC4:
				case gl.BOOL_VEC4:
					handler = function(pos, state, curval) {
						gl.uniform4iv(pos, curval );
					};
					break;
				case gl.INT_VEC3:
				case gl.BOOL_VEC3:
					handler = function(pos, state, curval) {
						gl.uniform3iv(pos, curval );
					};
					break;
				case gl.INT_VEC2:
				case gl.BOOL_VEC2:
					handler = function(pos, state, curval) {
						gl.uniform2iv(pos, curval );
					};
					break;

				case gl.FLOAT_MAT4:
					handler = function(pos, state, curval) {
						gl.uniformMatrix4fv(pos, false, curval);
					};
					break;

				case gl.FLOAT_MAT3:
					handler = function(pos, state, curval) {
						gl.uniformMatrix3fv(pos, false, curval);
					};
					break;

				case gl.FLOAT_MAT2:
					handler = function(pos, state, curval) {
						gl.uniformMatrix2fv(pos, false, curval);
					};
					break;

				case gl.SAMPLER_2D:
				case gl.SAMPLER_CUBE:
					this._SetTexture(k,val,pos);
					break;

				default:
					// #ifdef DEBUG
					medealib.DebugAssert('constant type not recognized, ignoring: ' + k);
					// #endif
			}

			if(!handler) {
				return;
			}

			// If the value is a closure, evaluate it every time
			if (typeof val == 'function') {
				this.auto_setters[k] = [pos, function(pos, state) {
					handler(pos, state, val());
				}];
			}
			// If the value is a string, eval() it every time
			// Note: texture paths are handled earlier and control
			// never reaches here for textures.
			else if (typeof val == 'string') {
				this.auto_setters[k] = [pos, function(pos, state) {
					var val_eval = null;

					try {
						val_eval = eval(val);
					} catch (e) {
						// #ifdef DEBUG
						medealib.DebugAssert('eval()ing constant failed: ' + e + ' name: ' + k + ', type: ' + type);
						// #endif
					}

					handler(pos, state, val_eval);
				}];
			}
			else {
				this.auto_setters[k] = [pos, function(pos, state) {
					handler(pos, state, val);
				}];
			}
		},

		_SetTexture : function(k, val, pos) {
			// Explicitly bound texture - this is a special case because string values
			// for texture parameters are not eval()ed but requested as textures from
			// the server.
			var prog = this.program;
			// #ifdef DEBUG
			medealib.DebugAssert(prog, 'program must exist already');
			// #endif

			this.auto_setters[k] = [pos, function(pos, state) {
				// Note: constants[k] is not set to be the texture as it is loaded.
				// this is because the user expects consistent values with the Get/Set
				// APIs, so we cannot change the object type in the background. The
				// texture object only exists in the Set() closure.
				var curval = val;

				if (!(curval instanceof medea.Resource) || !curval.IsRenderable()) {
					curval = medea.GetDefaultTexture();
				}

				// #ifdef DEBUG
				medealib.DebugAssert(curval.IsRenderable(), 
					'invariant, texture must be renderable');
				// #endif

				state = state.GetQuick('_gl');
				state.texage = state.texage || 0;

				// Check if this texture is already active, if not get rid of the
				// oldest texture in the sampler cache.
				var slots = state.tex_slots || new Array(medea.MAX_TEXTURE_UNITS);
				var oldest = state.texage+1;
				var oldesti = 0;
				var curgl = curval.GetGlTexture();

				for(var i = 0; i < slots.length; ++i) {
					if (!slots[i]) {
						oldest = state.texage+2;
						oldesti = i;
					}
					else if (slots[i][1] === curgl) {
						slots[i][0] = state.texage++;

						// XXX why do we need _Bind() here? Setting the index should suffice
						// since the texture is already set.
						var res = curval._Bind(i);
						// #ifdef DEBUG
						medealib.DebugAssert(res !== null, 
							'invariant, bind should not fail (2)');
						// #endif

						gl.uniform1i(pos, res);
						return;
					}
					else if ( slots[i][0] < oldest && oldest !== state.texage+2) {
						oldest = slots[i][0];
						oldesti = i;
					}
				}

				slots[oldesti] = [state.texage++,curgl];
				var res = curval._Bind(oldesti);
				// #ifdef DEBUG
				medealib.DebugAssert(res !== null, 
					'invariant, bind should not fail (1)');
				// #endif

				gl.uniform1i(pos, res);
				state.tex_slots = slots;
			}];

			if (typeof val === 'string') {
				// #ifdef DEBUG
				medealib.LogDebug('create texture for shader uniform with string value: ' + k + ', ' + val);
				// #endif
				medea.LoadModules(['texture'], function() {
					// See note above for why this.constants[k] is not changed
					val = medea.CreateTexture(val);
				});
			}
			else if (typeof val === 'object' && val.low) {
				// #ifdef DEBUG
				medealib.LogDebug('create lod texture for shader uniform with string value: ' + k + ', ' + val);
				// #endif
				medea.LoadModules(['lodtexture'], function() {
					// see note above for why this.constants[k] is not changed
					val = medea.CreateLODTexture(val);
				});
			}
		},

		Get : function(k) {
			return this.constants[k];
		},

		// A pass is complete iff the GL program underlying it is
		// linked successfully.
		//
		// IsComplete() updates only after attempts to call |Begin|
		// (which does nothing if the material is not complete yet)
		//
		// For cloned passes this is mirrored from the original
		// pass being complete.
		IsComplete : function() {
			return this.program !== null;
		},

		IsClone : function() {
			return this.clone_flags !== null;
		},


		_Clone : function(clone_flags, out) {
			var new_out = false;
			if(!out) {
				out = new medea.Pass(this.vs, this.ps);
				new_out = true;
			}

			if (new_out) {
				if (clone_flags & medea.MATERIAL_CLONE_COPY_STATE) {
					out.state = medealib.Merge(this.state, {}, {});
				}
				else if (clone_flags & medea.MATERIAL_CLONE_SHARE_STATE) {
					out.state = this.state;
				}

				if (clone_flags & medea.MATERIAL_CLONE_COPY_CONSTANTS) {
					out.constants = medealib.Merge(this.constants, {}, {});			
				}
				else if (clone_flags & medea.MATERIAL_CLONE_SHARE_CONSTANTS) {
					out.constants = this.constants;
				}
			}

			if (!this.IsComplete()) {
				// Since this instance isn't complete yet, we can't
				// clone the other yet. Add it to a list and do the actual cloning
				// as soon as all data is present. This is a bit dirty and imposes an
				// unwanted reference holder on the cloned pass, but it cannot be
				// avoided with the current design.
				if (!this.wannabe_clones) {
					this.wannabe_clones = [];
				}
				this.wannabe_clones.push(out);
				out.clone_flags = clone_flags;
				out.original = this;
				return out;
			}

			// #ifdef DEBUG
			out.ignore_uniform_errors = this.ignore_uniform_errors;
			// #endif

			out.program_id = this.program_id;
			out.cache_name = this.cache_name;

			// Program reference can be shared (XXX but this does not play well
			// with explicit disposal semantics).
			out.program = this.program;

			// Attribute mapping is always safe to share
			out.attr_map = this.attr_map;

			// However, we need to rebuild setters from scratch
			out.auto_setters = {};
			out._ExtractUniforms();
			out._RefreshState();

			return out;
		},

		_ExtractUniforms : function() {
			// extract uniforms that we update automatically and setup state managers for them
			for(var k in medea.ShaderSetters) {
				var pos = gl.getUniformLocation(this.program, k);
				if(pos) {
					this.auto_setters[k] = [pos, medea.ShaderSetters[k]];
				}
			};
		},

		_RefreshState : function() {
			// re-install state managers for all constants
			var old = this.constants;
			this.constants = {};
			for(var k in old) {
				this.Set(k, old[k]);
			}
		},

		_TryAssembleProgram : function() {
			if (this.IsClone()) {
				// Try assembling the original material. It will update us as well
				this.original._TryAssembleProgram();
				return;
			}

			if (this.IsComplete() || !this.vs.IsComplete() || !this.ps.IsComplete()) {
				// Can't assemble this program yet, for we first need to wait
				// for some dependent resources to load
				return;
			}

			// First check if we do already have a linked copy of this shader program
			var cache_name = this.cache_name =  this.vs.GetShaderId() + '#' + this.ps.GetShaderId();
			var p = program_cache[cache_name];
			if(p === undefined) {
				// There is none, so we have to link the program
				p = program_cache[cache_name] = this.program = gl.createProgram();
				gl.attachShader(p,this.vs.GetGlShader());
				gl.attachShader(p,this.ps.GetGlShader());

				// Increment program id to get a unique value
				// (unfortunately, there does not seem to be an easy way to directly
				//  derive an id from the program)
				this.program_id = program_ids[cache_name] = program_id_counter++;

				gl.linkProgram(p);
				if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
					medealib.NotifyFatal("failure linking program, error log: " + gl.getProgramInfoLog(p));
					return;
				}

				// #ifdef DEBUG
				gl.validateProgram(p);
				if (!gl.getProgramParameter(p, gl.VALIDATE_STATUS)) {
					medealib.NotifyFatal("failure validating program, error log: " + gl.getProgramInfoLog(p));
					return;
				}
				// #endif DEBUG

				// #ifdef LOG
				medealib.LogDebug('successfully linked program #' +p);
				// #endif
			}
			else {
				this.program_id = program_ids[cache_name];
				this.program = p;
				gl.useProgram(this.program);
			}

			this._ExtractUniforms();
			this._RefreshState();

			// If the user didn't supply an attribute mapping (i.e. which pre-defined
			// attribute type maps to which attribute in the shader), derive it
			// from the attribute names, assuming their names are recognized.
			if(!this.attr_map) {
				var a = this.attr_map = {};
				/*
				// TODO: this triggers a warning in chrome when the index for getActiveAttrib()
				// is out of range. So while this is not fixed, we duplicate the list of
				// known vertex attributes from medea.vertexbuffer.js with up to four
				// UV coord sets.
				for(var i = 0, n; n = gl.getActiveAttrib(p,i); ++i) {
					a[n.name] = i;
				} */

				var known_attrs = [
						"POSITION"
	 				,	"NORMAL"
					,	"TANGENT"
					,	"BITANGENT"
					,	"TEXCOORD0"
					,	"COLOR0"
					,	"TEXCOORD1"
					,	"COLOR1"
					,	"TEXCOORD2"
					,	"COLOR2"
					,	"TEXCOORD3"
					,	"COLOR3"
				];

				known_attrs.forEach(function(attr) {
					var loc = gl.getAttribLocation(p, attr);
					if(loc !== -1) {
						a[attr] = loc;
					}
				});


				// #ifdef DEBUG
				if(a['POSITION'] === undefined) {
					medealib.LogDebug('Failed to derive automatic attribute mapping table, '
						+'at least there is no POSITION input defined.');
				}
				// #endif
			}

			// Now transfer the dictionaries and the program reference to all pending
			// clones for this material.
			if (this.wannabe_clones) {
				// #ifdef DEBUG				
				medealib.LogDebug('Material ready: will now update clones');
				// #endif

				for (var i = 0; i < this.wannabe_clones.length; ++i) {
					this._Clone( this.wannabe_clones[i].clone_flags, this.wannabe_clones[i] );
				}

				// Do not delete to avoid changing the hidden class
				this.wannabe_clones = null;
			}
		},

		_SetAutoState : function(statepool, change_flags) {

			// Update shader variables automatically
			var setters = this.auto_setters;
			for(var k in setters) {
				var v = setters[k];
				v[1](v[0], statepool, change_flags);
			}

			// And apply global state blocks
			if (this.state) {
				medea.SetState(this.state,statepool);
			}
		},

		_GetUniformType : function(name) {
			/* Using getActiveUniform to obtain the type seems to be the most
			   straightforward way, but unfortunately it keeps telling me
			   that a lot of uniforms are in fact sampler2D's even if they
			   are not. Also, results seem to vary from system to system,
			   suggesting trouble with either the underlying GL implementation
			   or the browser's WebGL code

			   So for now, until all such issues are resolved in all major
			   browsers, scan the source code for the declaration of the
			   variable and extract the type.

			   This will fail for arrays, structures, etc. but those are not
			   currently handled anyway.
			*/

			var vs = this.vs.GetPreProcessedSourceCode(), ps = this.ps.GetPreProcessedSourceCode();
			var rex = new RegExp(glsl_type_picker + '\\s+' + name);

			// Further escaping should not be needed, name is required to be
			// a valid GLSL identifier.
			var typename = rex.exec(vs) || rex.exec(ps);

			// #ifdef DEBUG
			medealib.DebugAssert(typename !== null, 'could not find type declaration for uniform: ' + name);
			// #endif

			typename = typename[1];

			// #ifdef DEBUG
			medealib.DebugAssert(!!typename,"failed to determine data type of shader uniform " + name);
			// #endif

			return glsl_typemap[typename];

			/*
			var info = gl.getActiveUniform(this.program,pos), type = info.type;

			// This is a workaround for my secondary linux system on which the driver
			// for the builtin Intel GMA unit is not only not on the whitelist of ff/chrome,
			// but also keeps confusing sampler and matrix uniforms. The workaround
			// doesn't make it much betteŗ, though, because the driver manages to get
			// almost everything else wrong as well. Seems there is a reason that
			// whitelists are used to determine if Webgl is to be supported or not.
			// XXX SAME trouble on a GF 9600M. Hmpf.
			if (typeof val === 'string' && /.*\.(jpg|png|gif|bmp)/i.test(val) ) {
				type = gl.SAMPLER_2D;
			}
			*/
		}
	});

	medea.CreatePassFromShaderPair = function(name, constants, attr_map, defines, no_clone) {
		return new medea.Pass( 
			medea.CreateShader(name+'.vs', defines), 
			medea.CreateShader(name+'.ps', defines), constants, attr_map );
	};

	medea.ClonePass = function(pass, clone_flags) {
		return pass._Clone(clone_flags);
	};
});


