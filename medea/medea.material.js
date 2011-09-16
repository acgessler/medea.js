

medea.stubs["Material"] = (function() {
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
	
		init : function(vs,ps,constants,attr_map) {
			this.vs = vs;
			this.ps = ps;
			this.constants = constants;
			this.auto_setters = {};
			this.attr_map = attr_map || {};
			
// #ifdef DEBUG
			if (!vs || !ps) {
				medea.DebugAssert("need valid vertex and pixel shader");
			}
// #endif DEBUG

			this._TryAssembleProgram();
		},
		
		Begin : function(statepool) {
			if (!this.program) {
				this._TryAssembleProgram();
				return;
			}
			
			gl.useProgram(this.program);
			this._SetAutoState(statepool);
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
			
			if (!this.program) {
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
			// XXX WHY does isArray() not work here?
			if (val instanceof Array) {
				handler = function(prog, pos, state) {gl.uniform4fv(pos, c[k]);};
			}
			// note: presence of glMatrixArrayType depends on glMatrix.js
			else if (val instanceof glMatrixArrayType) {
				handler = function(prog, pos, state) {gl.uniformMatrix4fv(pos, false, c[k]);};
			}
			else if (val instanceof Image) {
				// explicitly bound texture
			}
			// #ifdef DEBUG
			else {
				medea.DebugAssert('constant type not recognized, ignoring: ' + k);
			}
			// #endif
			
			if(handler) {
				this.auto_setters[k] = [pos,handler]; 
			}
		},
		
		Get : function(k) {
			return this.constants[k];
		},
		
		
		_TryAssembleProgram : function() {
			if (this.program || !this.vs.IsComplete() || !this.ps.IsComplete()) {
				return;
			}
			var p = this.program = gl.createProgram();
			gl.attachShader(p,this.vs.GetGlShader());
			gl.attachShader(p,this.ps.GetGlShader());
			
			//gl.bindAttribLocation(this.program,0,"POSIN");
			
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
		},
		
		_SetAutoState : function(statepool) {
			for(k in this.auto_setters) {
				var v = this.auto_setters[k];
				v[1](this.program,v[0],statepool);
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
		
		Pass : function(n) {
			return this.passes[n];
		},
		
		GetId: function() {
			return 0;
		},
		
		Use: function(drawfunc,statepool) {
			// invoke the drawing callback once per pass
			this.passes.forEach(function(pass) {
				pass.Begin(statepool);
					drawfunc(pass);
				pass.End();
			});
		},
	});
	
	medea.CreateSimpleMaterialFromColor = function(color) {
		return new medea.Material(medea.CreatePassFromShaderPair("simple-color",{color:color}));
	};
	
	medea.CreateSimpleMaterialFromTexture = function(tex) {
		return new medea.Material(medea.CreatePassFromShaderPair("simple-textured",{texture:texture}));
	};
	
	medea.CreatePassFromShaderPair = function(name, constants, attr_map) {
		return new medea.Pass( medea.CreateShader('remote:mcore/shaders/'+name+'.vs'), medea.CreateShader('remote:mcore/shaders/'+name+'.ps'), constants, attr_map );
	};
	
	medea.stubs["Material"] = null;
});
