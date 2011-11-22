
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler 
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medea._addMod('texture',['image','filesystem'],function(undefined) {
	"use strict";
	var medea = this, gl = medea.gl;
	
	var TEX = medea.TEXTURE_TYPE_2D = gl.TEXTURE_2D;

	medea._initMod('filesystem');
	medea._initMod('image');
	medea.Texture = medea.Image.extend( {
	
		init : function(src_or_img, callback, no_client_cache) {
			this.texture = gl.createTexture();
			this._super(src_or_img, callback, no_client_cache);
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
		
		
		_Bind : function(slot) {
			slot = slot || 0;

			gl.activeTexture(gl.TEXTURE0 + slot);
			gl.bindTexture(TEX,this.texture);
			return slot;
		},
	});
	
	medea.CreateTexture = function(src_or_image, callback) {
		return new medea.Texture(src_or_image, callback);
	}
});

