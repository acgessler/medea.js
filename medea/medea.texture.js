
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler 
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medea._addMod('texture',['filesystem'],function(undefined) {
	"use strict";
	var medea = this, gl = medea.gl;
	
	var TEX = medea.TEXTURE_TYPE_2D = gl.TEXTURE_2D;

	medea._initMod('filesystem');
	medea.Texture = medea.Resource.extend( {
	
		init : function(src, callback, no_client_cache) {
			// #ifdef DEBUG
    		if (no_client_cache === undefined) {
    			no_client_cache = true;
    		}
    		// #endif
			
			this.texture = gl.createTexture();
			this.img = new Image();
			this.callback = callback;
			
			var outer = this;
			this.img.onload = function() {
				outer.OnDelayedInit();
			};
			
			this.src = src;
			this.img.src = medea.FixURL(src,no_client_cache);
		},
		
		OnDelayedInit : function() {
			gl.bindTexture(TEX, this.texture);
			
			gl.texImage2D(TEX, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.img);  
            
            gl.texParameteri(TEX, gl.TEXTURE_WRAP_S, gl.REPEAT);  
            gl.texParameteri(TEX, gl.TEXTURE_WRAP_T, gl.REPEAT);  
            
			gl.texParameteri(TEX, gl.TEXTURE_MAG_FILTER, gl.LINEAR);  
			gl.texParameteri(TEX, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);  
			gl.generateMipmap(TEX);  
			
			// #ifdef DEBUG
			gl.bindTexture(TEX, null); 
			// #endif
		
			// mark this resource as complete
			this._super();
			medea.LogDebug("successfully loaded texture " + this.src);
			
			// this hopefully frees some memory
			this.img = null;
		},
		
		GetGlTexture : function() {
			return this.texture;
		},
		
		
		_Bind : function() {
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(TEX,this.texture);
			return 0;
		},
	});
	
	medea.CreateTexture = function(res, callback) {
		return new medea.Texture(res, callback);
	}
});

