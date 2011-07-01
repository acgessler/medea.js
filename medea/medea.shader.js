
medea.stubs["Shader"] = (function() {
	var medea = this, gl = medea.gl;
	
	medea._Require("FileSystem");
	
	medea.SHADER_TYPE_PIXEL = 'ps';
	medea.SHADER_TYPE_VERTEX = 'vs'; 
	
	medea.Shader = medea.Resource.extend( {
	
		init : function(src) {
	
			this.type = src.split('.').pop() == 'ps' ? medea.SHADER_TYPE_PIXEL : medea.SHADER_TYPE_VERTEX;
			this.shader = gl.createShader(this.type);
			
			// trigger deferred loading
			this._super(src);
		},
		
		OnDelayedInit : function(data) {
// #ifdef DEBUG
			if (!(data instanceof String)) {
				medea.DebugAssert("got unexpected argument, perhaps the source for the shader was not a single resource?");
			}
// #endif

			gl.shaderSource(this.shader,data);
			gl.compileShader(this.shader);
		
			// mark this resource as complete
			this._super();
		}
	});
	
	medea.CreateShader = function(res) {
		return new medea.Shader(res);
	}
	
	medea.stubs["Shader"] = null;
});
