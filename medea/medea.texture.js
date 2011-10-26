
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander Ċ. Gessler 
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medea._addMod('texture',['filesystem'],function(undefined) {
	var medea = this, gl = medea.gl;
	
	medea.TEXTURE_TYPE_2D = gl.TEXTURE_2D;

	medea._initMod('filesystem');
	medea.Texture = medea.Resource.extend( {
	
		init : function(src) {
			this.texture = gl.createTexture();
			
			this.img = new Image();
			
			var outer = this;
			this.img.onload = function() {
				outer.OnDelayedInit();
			};
			
			this.src = src;
			this.img.src = medea.FixURL(src);
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
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D,this.texture);
			return 0;
		},
	});
	
	medea.CreateTexture = function(res) {
		return new medea.Texture(res);
	}
});
