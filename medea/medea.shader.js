
medea.stubs["shader"] = (function() {
	var medea = this, gl = medea.gl;
	
	medea._Require("filesystem");
	
	medea.SHADER_TYPE_PIXEL = gl.FRAGMENT_SHADER;
	medea.SHADER_TYPE_VERTEX = gl.VERTEX_SHADER; 
	
	medea.Shader = medea.Resource.extend( {
	
		init : function(src) {
	
			this.type = src.split('.').pop() == 'ps' ? medea.SHADER_TYPE_PIXEL : medea.SHADER_TYPE_VERTEX;
			this.shader = gl.createShader(this.type);
			
			// trigger deferred loading
			this._super(src);
		},
		
		OnDelayedInit : function(data) {

// #ifdef DEBUG
			if (typeof data != "string") {
				medea.DebugAssert("got unexpected argument, perhaps the source for the shader was not a single resource?");
			}
// #endif

			var s = this.shader;
			gl.shaderSource(s,data);
			
			gl.compileShader(s);
			if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
				medea.NotifyFatal("failure compiling shader " +  this.src + ", error log: " + gl.getShaderInfoLog(s));
				return;
			}
		
			// mark this resource as complete
			this._super();
			
			medea.LogDebug("successfully compiled shader " + this.src);
		},
		
		GetGlShader : function(gl) {
			return this.shader;
		}
	});
	
	medea.CreateShader = function(res) {
		return new medea.Shader(res);
	}
	
	medea.stubs["shader"] = null;
});
