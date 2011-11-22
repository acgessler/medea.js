
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler 
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medea._addMod('cubetexture',['filesystem'],function(undefined) {
	"use strict";
	var medea = this, gl = medea.gl;
	
	var CUBE = medea.TEXTURE_TYPE_CUBE = gl.TEXTURE_CUBE_MAP;
	
	var default_names = [
		'posx','negx','posy','negy','posz','negz'
	];

	medea._initMod('filesystem');
	medea.CubeTexture = medea.Resource.extend( {
	
		init : function(src, callback, no_client_cache) {
			// #ifdef DEBUG
			if (no_client_cache === undefined) {
				no_client_cache = true;
			}
			// #endif
				
			this.texture = gl.createTexture();
			this.callback = callback;
			
			this.img = new Array(6);
			
			if (!Array.isArray(src)) {
				// preserve the file extension and append the postfixes with '_'
				var s = src.split('.'), ext = s.length > 1 ? '.'+s[s.length-1] : '.jpg';
				if(s[0].length && s[0][s[0].length-1] != '/') {
					s[0] += '_';
				}
				src = new Array(6);
				for(var i = 0; i < 6; ++i) {
					src[i] = s[0] + default_names[i] + ext;
				}
			}
			
			var outer = this;
			this.counter = 6;
			this.src = src;
			
			for(var i = 0; i < 6; ++i) {
				(function(i) {
				outer.img[i] = new Image();
				outer.img[i].onload = function() {
					outer.OnDelayedInit(i);
				};
				outer.img[i].src = medea.FixURL(src[i],no_client_cache);
				}(i));
			}
		},
		
		OnDelayedInit : function(index) {
			gl.bindTexture(CUBE, this.texture);
			
			var face = gl.TEXTURE_CUBE_MAP_POSITIVE_X + index;
			gl.texImage2D(face, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.img[index]);  
		
			// mark this resource as complete if this was the last face
			if (--this.counter === 0) {
				gl.texParameteri(CUBE, gl.TEXTURE_MAG_FILTER, gl.LINEAR);  
				gl.texParameteri(CUBE, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);   
				gl.generateMipmap(CUBE);  
				
				this._super();
				medea.LogDebug("successfully loaded cube texture (URL is for posx face) " + this.src[0]);
			}
			
			// #ifdef DEBUG
			gl.bindTexture(CUBE, null); 
			// #endif
		},
		
		GetGlTexture : function() {
			return this.texture;
		},
		
		
		_Bind : function() {
			slot = slot || 0;

			gl.activeTexture(gl.TEXTURE0 + slot);
			gl.bindTexture(CUBE,this.texture);
			return slot;
		},
	});
	
	medea.CreateCubeTexture = function(res, callback) {
		return new medea.CubeTexture(res, callback);
	}
});

