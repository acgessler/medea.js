
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medea.define('pass',['shader','texture'],function(undefined) {
	"use strict";
	var medea = this, gl = medea.gl;


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


	// cache for gl program objects, indexed by "vs_id" + "ps_id"
	var program_cache = {};

	// map from GLSL type identifiers to the corresponding GL enumerated types
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
		CAM_POS :  function(pos, state) {
			gl.uniform3fv(pos, state.GetQuick("CAM_POS"));
		},

		CAM_POS_LOCAL :  function(pos, state) {
			gl.uniform3fv(pos, state.Get("CAM_POS_LOCAL"));
		},

		WVP :  function(pos, state) {
			gl.uniformMatrix4fv(pos, false, state.Get("WVP"));
		},

		WIT :  function(pos, state) {
			gl.uniformMatrix4fv(pos, false, state.Get("WIT"));
		},

		WI :  function(pos, state) {
			gl.uniformMatrix4fv(pos, false, state.Get("WI"));
		},

		VP :  function(pos, state) {
			gl.uniformMatrix4fv(pos, false, state.Get("VP"));
		},

		W :  function(pos, state) {
			gl.uniformMatrix4fv(pos, false, state.GetQuick("W"));
		},

		V :  function(pos, state) {
			gl.uniformMatrix4fv(pos, false, state.GetQuick("V"));
		},

		P :  function(pos, state) {
			gl.uniformMatrix4fv(pos, false, state.GetQuick("P"));
		}
	};

	var zero_light = [0,0,0];

	// generate shader setters for directional lights
	for (var i = 0, e = medea.MAX_DIRECTIONAL_LIGHTS; i < e; ++i) {
		(function(i) { 
			// LIGHT_Dn_DIR -- global light direction vector
			setters["LIGHT_D"+i+"_DIR"] = function(pos, state) {
				var lights = state.Get("DIR_LIGHTS");
				if(!lights || lights.length <= i) {
					// TODO: maybe reset it for debug builds
					return;
				}
				gl.uniform3fv(pos, lights[i].world_dir);
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

	// TODO: point and spot lights


	/** @class medea.Pass 
     *
     *
     *
	 */
	medea.Pass = medea.Class.extend({

		wannabe_clones : null,
		vs : null,
		ps : null,
		constants : null,
		auto_setters : null,
		attr_map : null,
		state : null,
		program : null,
		clone_flags : null,
		semantic : medea.PASS_SEMANTIC_COLOR_FORWARD_LIGHTING,


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
				medea.DebugAssert("need valid vertex and pixel shader");
			}
// #endif

			this._TryAssembleProgram();
		},


		Semantic: medea._GetSet('semantic'),


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
		Begin : function(statepool) {
			if (this.program === null) {
				this._TryAssembleProgram();
				if(!this.IsComplete()) {
					return false;
				}
			}

			gl.useProgram(this.program);
			this._SetAutoState(statepool);

			return true;
		},

		End : function() {
		},

		GetAttributeMap : function() {
			return this.attr_map;
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

		DepthFunc : function(c) {
			if (c === undefined) {
				return this.state.depth_func;
			}

			this.state.depth_func = c;
		},



		Set : function(k,val) {
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
				medea.DebugAssert("uniform variable location not found: " + k);
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
					handler = function(pos, state,curval) {
						gl.uniformMatrix4fv(pos, false, curval);
					};
					break;

				case gl.FLOAT_MAT3:
					handler = function(pos, state,curval) {
						gl.uniformMatrix3fv(pos, false, curval);
					};
					break;

				case gl.FLOAT_MAT2:
					handler = function(pos, state,curval) {
						gl.uniformMatrix2fv(pos, false, curval);
					};
					break;

				case gl.SAMPLER_2D:
				case gl.SAMPLER_CUBE:
					this._SetTexture(k,val,pos);
					break;

				default:
					// #ifdef DEBUG
					medea.DebugAssert('constant type not recognized, ignoring: ' + k);
					// #endif
			}

			if(!handler) {
				return;
			}

			if (typeof value === 'string') {
				this.auto_setters[k] = [pos,function(pos, state) {
					var val_eval = null;

					try {
						val_eval = eval(val);
					} catch (e) {
						// #ifdef DEBUG
						medea.DebugAssert('eval()ing constant failed: ' + e + ' name: ' + k + ', type: ' + type);
						// #endif
					}

					handler(pos,state,val_eval);
				}];
			}
			else {
				this.auto_setters[k] = [pos, function(pos, state) {
					handler(pos, state, val);
				}];
			}
		},

		_SetTexture : function(k, val, pos) {
			// explicitly bound texture - this is a special case because string values
			// for texture parameters are not eval()ed but requested as textures from
			// the server.
			var prog = this.program;
			// #ifdef DEBUG
			medea.DebugAssert(prog, 'program must exist already');
			// #endif

			this.auto_setters[k] = [pos,function(pos, state) {
				// note: constants[k] is not set to be the texture as it is loaded.
				// this is because the user expects consistent values with the Get/Set
				// APIs, so we cannot change the object type in the background. The
				// texture object only exists in the Set() closure.
				var curval = val;

				if (!(curval instanceof medea.Resource) || !curval.IsRenderable()) {
					curval = medea.GetDefaultTexture();
				}

				// #ifdef DEBUG
				medea.DebugAssert(curval.IsRenderable(), 
					'invariant, texture must be renderable');
				// #endif

				state = state.GetQuick('_gl');
				state.texage = state.texage || 0;

				// check if this texture is already active, if not get rid of the
				// oldest texture in the sampler cache.
				var slots = state.tex_slots || new Array(6);
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
						medea.DebugAssert(res !== null, 
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
				medea.DebugAssert(res !== null, 
					'invariant, bind should not fail (1)');
				// #endif

				gl.uniform1i(pos, res);
				state.tex_slots = slots;
			}];

			if (typeof val === 'string') {
				// #ifdef DEBUG
				medea.LogDebug('create texture for shader uniform with string value: ' + k + ', ' + val);
				// #endif
				medea.FetchMods(['texture'], function() {
					// see note above for why this.constants[k] is not changed
					val = medea.CreateTexture(val);
				});

			}
			else if (typeof val === 'object' && val.low) {
				// #ifdef DEBUG
				medea.LogDebug('create lod texture for shader uniform with string value: ' + k + ', ' + val);
				// #endif
				medea.FetchMods(['lodtexture'], function() {
					// see note above for why this.constants[k] is not changed
					val = medea.CreateLODTexture(val);
				});
			}
		},

		Get : function(k) {
			return this.constants[k];
		},

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
					out.state = medea.Merge(this.state, {}, {});
				}
				else if (clone_flags & medea.MATERIAL_CLONE_SHARE_STATE) {
					out.state = this.state;
				}

				if (clone_flags & medea.MATERIAL_CLONE_COPY_CONSTANTS) {
					out.constants = medea.Merge(this.constants, {}, {});
				}
				else if (clone_flags & medea.MATERIAL_CLONE_SHARE_CONSTANTS) {
					out.constants = this.constants;
				}
			}

			if (!this.IsComplete()) {
				// since this instance isn't complete yet, we can't
				// clone the other yet. Add it to a list and do the actual cloning
				// as soon as all data is present. This is a bit dirty and imposes an
				// unwanted reference holder on the cloned pass, but it cannot be
				// avoided with the current design.
				if (!this.wannabe_clones) {
					this.wannabe_clones = [];
				}
				this.wannabe_clones.push(out);
				out.clone_flags = clone_flags;
				return out;
			}

			// program reference can be shared (XXX but this does not play well
			// with explicit disposal semantics).
			out.program = this.program;

			// attribute mapping is always safe to share
			out.attr_map = this.attr_map;

			// however, we need to rebuild setters from scratch
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
				this.Set(k,old[k]);
			}
		},

		_TryAssembleProgram : function() {
			if (this.IsComplete() || !this.vs.IsComplete() || !this.ps.IsComplete() || this.IsClone()) {
				// can't assemble this program yet, for we first need to wait for some dependent resources to load
				return;
			}

			// first check if we do already have a linked copy of this shader program
			var cache_name =  this.vs.GetShaderId() + '#' + this.ps.GetShaderId();
			var p = program_cache[cache_name];
			if(p === undefined) {
				// there is none, so we have to link the program
				p = program_cache[cache_name] = this.program = gl.createProgram();
				gl.attachShader(p,this.vs.GetGlShader());
				gl.attachShader(p,this.ps.GetGlShader());


				gl.linkProgram(p);
				if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
					medea.NotifyFatal("failure linking program, error log: " + gl.getProgramInfoLog(p));
					return;
				}

				// #ifdef DEBUG
				gl.validateProgram(p);
				if (!gl.getProgramParameter(p, gl.VALIDATE_STATUS)) {
					medea.NotifyFatal("failure validating program, error log: " + gl.getProgramInfoLog(p));
					return;
				}

				// #ifdef DEBUG
				medea.LogDebug('successfully linked program #' +p);
				// #endif
			}
			else {
				this.program = p;
				gl.useProgram(this.program);
			}

			this._ExtractUniforms();
			this._RefreshState();

			// if the user didn't supply an attribute mapping (i.e. which pre-defined
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
					medea.LogDebug('failed to derive automatic attribute mapping table, '
						+'at least there is no POSITION input defined.');
				}
				// #endif
			}

			// now transfer the dictionaries and the program reference to all pending
			// clones for this material.
			if (this.wannabe_clones) {
				for (var i = 0; i < this.wannabe_clones.length; ++i) {
					this._Clone( this.wannabe_clones[i].clone_flags, this.wannabe_clones[i] );
				}

				// do not delete to avoid changing the hidden class
				this.wannabe_clones = null;
			}
		},

		_SetAutoState : function(statepool) {

			// update shader variables automatically
			var setters = this.auto_setters;
			for(var k in setters) {
				var v = setters[k];
				v[1](v[0], statepool);
			}

			// and apply global state blocks
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

			// further escaping should not be needed, name is required to be
			// a valid GLSL identifier.
			var typename = rex.exec(vs) || rex.exec(ps);
			if(typename === null) {
				// should not happen
				medea.DebugAssert('could not find type declaration for uniform: ' + name);
			}

			typename = typename[1];

			// #ifdef DEBUG
			medea.DebugAssert(!!typename,"failed to determine data type of shader uniform " + name);
			// #endif

			return glsl_typemap[typename];

			/*
			var info = gl.getActiveUniform(this.program,pos), type = info.type;

			// this is a workaround for my secondary linux system on which the driver
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


