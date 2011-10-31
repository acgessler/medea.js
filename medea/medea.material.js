
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander Ċ. Gessler 
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medea._addMod('material',['shader','texture'],function(undefined) {
	"use strict";
	var medea = this, gl = medea.gl;
	
	medea.ShaderSetters = {
		"WVP" :  function(prog, pos, state) {
			gl.uniformMatrix4fv(pos, false, state.Get("WVP"));
		},
		
		"WIT" :  function(prog, pos, state) {
			gl.uniformMatrix4fv(pos, false, state.Get("WIT"));
		},
		
		"W" :  function(prog, pos, state) {
			gl.uniformMatrix4fv(pos, false, state.Get("W"));
		},
		
		"V" :  function(prog, pos, state) {
			gl.uniformMatrix4fv(pos, false, state.Get("V"));
		},
		
		"P" :  function(prog, pos, state) {
			gl.uniformMatrix4fv(pos, false, state.Get("P"));
		},
	};
	
	
	// class Pass
	medea.Pass = medea.Class.extend({
	
		program:null,
	
		init : function(vs,ps,constants,attr_map,state) {
			this.vs = vs;
			this.ps = ps;
			this.constants = constants;
			this.auto_setters = {};
			this.attr_map = attr_map;
			this.state = state;
			
// #ifdef DEBUG
			if (!vs || !ps) {
				medea.DebugAssert("need valid vertex and pixel shader");
			}
// #endif 

			this._TryAssembleProgram();
		},
		
		IsComplete : function() {
			return this.program !== null;
		},
		
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
		
		Set : function(k,val) {
			if (val === undefined) {
				return;
			}
		
			var c = this.constants;
			c[k] = val;	
			
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
			
			var info = gl.getActiveUniform(this.program,pos), type = info.type;
			var handler = null;

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
			
			switch(type) {
				case gl.FLOAT_VEC4:
					handler = function(prog, pos, state, curval) {
						gl.uniform4fv(pos, curval );
					};
					break;
				case gl.FLOAT_VEC3:
					handler = function(prog, pos, state, curval) {
						gl.uniform3fv(pos, curval );
					};
					break;
				case gl.FLOAT_VEC2:
					handler = function(prog, pos, state, curval) {
						gl.uniform2fv(pos, curval );
					};
					break;
					
				case gl.INT_VEC4:
				case gl.BOOL_VEC4:
					handler = function(prog, pos, state, curval) {
						gl.uniform4iv(pos, curval );
					};
					break;
				case gl.INT_VEC3:
				case gl.BOOL_VEC3:
					handler = function(prog, pos, state, curval) {
						gl.uniform3iv(pos, curval );
					};
					break;
				case gl.INT_VEC2:
				case gl.BOOL_VEC2:
					handler = function(prog, pos, state, curval) {
						gl.uniform2iv(pos, curval );
					};
					break;
					
				case gl.FLOAT_MAT4:
					handler = function(prog, pos, state,curval) {
						gl.uniformMatrix4fv(pos, false, curval);
					};
					break;
					
				case gl.FLOAT_MAT3:
					handler = function(prog, pos, state,curval) {
						gl.uniformMatrix3fv(pos, false, curval);
					};
					break;
					
				case gl.FLOAT_MAT2:
					handler = function(prog, pos, state,curval) {
						gl.uniformMatrix2fv(pos, false, curval);
					};
					break;
					
				case gl.SAMPLER_2D:
				case gl.SAMPLER_CUBE:
					
					// explicitly bound texture
					handler = function(prog, pos, state, curval) {
						if (typeof curval === 'string') {
							//curval = medea.GetDefaultTexture();
							return;
						}
						gl.uniform1i(pos, curval._Bind());
					};
					
					if (typeof val === 'string') {
						// #ifdef DEBUG
						medea.LogDebug('create texture for shader uniform with string value: ' + k + ', ' + val);
						// #endif
						c[k] = medea.CreateTexture(val); 
					}
					break;
					
				default:
					// #ifdef DEBUG
					medea.DebugAssert('constant type not recognized, ignoring: ' + k);
					// #endif
			}
			
			if(handler) {
				this.auto_setters[k] = [pos,function(prog,pos,state) {
					var value = c[k];
					
					if (typeof value === 'string') {
						try {
							value = eval(value);
						} catch (e) {
							// #ifdef DEBUG
							medea.DebugAssert('eval()ing constant failed: ' + e + ' name: ' + k + ', type: ' + type);
							// #endif
						}
					}
					
					handler(prog,pos,state,value);
				}]; 
			}
		},
		
		Get : function(k) {
			return this.constants[k];
		},
		
		
		_TryAssembleProgram : function() {
			if (this.program !== null || !this.vs.IsComplete() || !this.ps.IsComplete()) {
				// can't assemble this program yet, for we first need to wait for some dependent resources to load 
				return;
			}
			var p = this.program = gl.createProgram();

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
			// #endif
			
			// extract uniforms that we update automatically and setup state managers for them
			for(var k in medea.ShaderSetters) {
				var pos = gl.getUniformLocation(this.program, k);
				if(pos) {
					this.auto_setters[k] = [pos,medea.ShaderSetters[k]];
				}
			};
			
			// install state managers for all pre-defined constants that we got from the caller
			var old = this.constants;
			this.constants = {};
			for(var k in old) {
				this.Set(k,old[k]);
			}
            
            // if the user didn't supply an attribute mapping (i.e. which pre-defined
            // attribute type maps to which attribute in the shader), derive it 
            // from the attribute names, assuming their names are recognized.
            if(!this.attr_map) {
                var a = this.attr_map = {};
                for(var i = 0, n; n = gl.getActiveAttrib(p,i); ++i) {
                    a[n.name] = i;
                }
                
                // #ifdef DEBUG
                if(a['POSITION'] === undefined) {
                    medea.LogDebug('failed to derive automatic attribute mapping table, at least there is no POSITION input defind.');
                }
                // #endif
            }
		},
		
		_SetAutoState : function(statepool) {
		
			// update shader variables automatically
			for(var k in this.auto_setters) {
				var v = this.auto_setters[k];
				v[1](this.program,v[0],statepool);
			}
			
			// and apply global state blocks
			if (this.state) {
				medea.SetState(this.state,statepool);
			}
		},
	});

	// class Material
	medea.Material = medea.Class.extend({
		name : "",
		
		init : function(passes, name) {	
			if(name) {	
				this.name = name;
			}
			
			this.passes = passes;
			if (this.passes instanceof medea.Pass) {
				this.passes = [this.passes];
			}
// #ifdef DEBUG
			if (!this.passes) {
				medea.DebugAssert("need at least one pass for a material to be complete");
			}
// #endif
		},
		
		Pass : function(n,p) {
			if(p === undefined) {
				return this.passes[n];
			}
			if (n == this.passes.length) {
				this.passes.push(p);
				return;
			}
			// #ifdef DEBUG
			else if (n > this.passes.length) {
				medea.DebugAssert('pass index out of range, cannot add pass if there is no pass that preceedes it: ' + n);
				return;
			}
			// #endif 
			this.passes[n] = p;
		},
		
		GetId: function() {
			return 0;
		},
		
		Use: function(drawfunc,statepool) {
			// invoke the drawing callback once per pass
			this.passes.forEach(function(pass) {
	
				if(!pass.Begin(statepool)) {
					// XXX substitute a default material?
					return;
				}
				
				drawfunc(pass);
				pass.End();
			});
		},
	});
	
	medea.CreateSimpleMaterialFromColor = function(color, dummy_light) {
        if(color.length === 4) { // drop alpha. this is not a transparency effect.
            color = [color[0],color[1],color[2]];
        }
        var name = "remote:mcore/shaders/simple-color", constants = {
            color:color
        };
        
        if(dummy_light) {
            constants['lightdir'] = [0.0,0.709,0.709];
            name += '-lit';
        }
		return new medea.Material(medea.CreatePassFromShaderPair(name,constants));
	};
	
	medea.CreateSimpleMaterialFromTexture = function(texture, dummy_light) {
        var name = "remote:mcore/shaders/simple-textured", constants = {
            texture:texture
        };
        
        if(dummy_light) {
            constants['lightdir'] = [0.0,0.709,0.709];
            name += '-lit';
        }
        
		return new medea.Material(medea.CreatePassFromShaderPair(name,constants));
	};
	
	medea.CreatePassFromShaderPair = function(name, constants, attr_map) {
		return new medea.Pass( medea.CreateShader(name+'.vs'), medea.CreateShader(name+'.ps'), constants, attr_map );
	};

});





