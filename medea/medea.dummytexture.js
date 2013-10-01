
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medea.define('dummytexture',['filesystem'],function(undefined) {
	"use strict";
	var medea = this, gl = medea.gl;

	var TEX = gl.TEXTURE_2D;

	medea.DummyTexture = medea.Resource.extend( {

		init : function(color) {
			// this marks the resource as complete and disables delay init
			this._super(); 
			this.texture = gl.createTexture();

			gl.bindTexture(TEX, this.texture);
			gl.texImage2D(TEX, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(
				[
					Math.floor(color[0]*255),
					Math.floor(color[1]*255),
					Math.floor(color[2]*255),
					Math.floor(color[3]*255)
				]
			));

			// #ifdef DEBUG
			gl.bindTexture(TEX, null);
			// #endif

			// #ifdef LOG
			medea.LogDebug("Create neutral 1x1 texture with color: " + color);
			// #endif
		},

		Dispose : function() {
			if(this.texture) {
				gl.deleteTexture(this.texture);
				this.texture = null;
			}
		},

		GetGlTexture : function() {
			return this.texture;
		},

		_Bind : function(slot) {
			slot = slot || 0;
			gl.activeTexture(gl.TEXTURE0 + slot);
			gl.bindTexture(TEX,this.texture);
			return slot;
		}
	});
});
