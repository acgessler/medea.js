

medea.stubs["Material"] = (function() {
	var medea = this, gl = medea.gl;
	
	// class Pass
	medea.Pass = medea.Class.extend({
	
		program:null,
	
		init : function(vs,ps,constants) {
			this.vs = vs;
			this.ps = ps;
			this.constants = constants;
			
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
			this._SetAutoState();
		},
		
		End : function() {
		},
		
		_TryAssembleProgram : function() {
			if (this.program || !this.vs.IsComplete() || !this.ps.IsComplete()) {
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
		},
		
		_SetAutoState : function() {
		}
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
		
		GetId: function() {
			return 0;
		},
		
		Use: function(drawfunc,statepool) {
			// invoke the drawing callback once per pass
			this.passes.forEach(function(pass) {
				pass.Begin(statepool);
					drawfunc();
				pass.End();
			});
		}
	});
	
	medea.CreateSimpleMaterialFromColor = function(color) {
		return new medea.Material(medea.CreatePassFromShaderPair("simple-color",{color:color}));
	};
	
	medea.CreatePassFromShaderPair = function(name) {
		return new medea.Pass( medea.CreateShader('remote:mcore/shaders/'+name+'.vs'), medea.CreateShader('remote:mcore/shaders/'+name+'.ps') );
	};
	
	medea.stubs["Material"] = null;
});
