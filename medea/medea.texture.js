
medea.stubs["Texture"] = (function() {
	var medea = this, gl = medea.gl;
	
	medea._Require("FileSystem");
	
	medea.TEXTURE_TYPE_2D = gl.TEXTURE_2D;

	
	medea.Texture = medea.Resource.extend( {
	
		init : function(src) {
			this.texture = gl.createTexture();
			
			this.img = new Image();
			this.img.onload = function() {
				outer.OnDelayedInit();
			};
			
			this.img.src = this.src = src;
		},
		
		OnDelayedInit : function() {
			gl.bindTexture(gl.TEXTURE_2D, this.texture);
			
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.img);  
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);  
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);  
			gl.generateMipmap(gl.TEXTURE_2D);  
			
			// #ifdef DEBUG
			gl.bindTexture(gl.TEXTURE_2D, null); 
			// #endif
		
			// mark this resource as complete
			this._super();
			
			medea.LogDebug("successfully loaded texture " + this.src);
		},
		
		GetGlTexture : function() {
			return this.texture;
		},
		
		
		_Bind : function() {
		},
	});
	
	medea.CreateTexture = function(res) {
		return new medea.Texture(res);
	}
	
	medea.stubs["Texture"] = null;
});
