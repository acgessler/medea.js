
/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('dummytexture',['filesystem'],function(medealib, undefined) {
	"use strict";
	var medea = this, gl = medea.gl;

	var TEX = gl.TEXTURE_2D
	,	neutral_textures = {}
	;

	medea.DummyTexture = medea.Resource.extend( {

		init : function(color) {
			var old = gl.getParameter(gl.TEXTURE_BINDING_2D);

			this.complete = true;
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

			// restore old Gl state
			gl.bindTexture(TEX, old);

			// call user callbacks - putting it here is consistent with
			// texture's behaviour.
			this._super(); 

			// #ifdef LOG
			medealib.LogDebug("Create dummy 1x1 texture with color: " + color);
			// #endif
		},

		GetGlTextureWidth : function() {
			return 1;
		},

		GetGlTextureHeight : function() {
			return 1;
		},

		GetPaddingCompensationFactor : function() {
			return [1, 1];
		},

		GetWidth : function() {
			return 1;
		},

		GetHeight : function() {
			return 1;
		},

		GetGlTexture : function() {
			return this.texture;
		},

		GetSource : function() {
			return '<dummy>';
		},

		GetImage : function() {
			return null;
		},

		GetDDSDataSource : function() {
			return null;
		},

		IsPowerOfTwo : function() {
			return true;
		},

		IsSquare : function() {
			return true;
		},

		IsUploaded : function() {
			return true;
		},

		IsRenderable : function() {
			return true;
		},

		Dispose : function() {
			if(this.texture) {
				gl.deleteTexture(this.texture);
				this.texture = null;
			}
		},

		_Bind : function(slot) {
			slot = slot || 0;
			gl.activeTexture(gl.TEXTURE0 + slot);
			gl.bindTexture(TEX,this.texture);
			return slot;
		}
	});


	medea.CreateDummyTexture = function(id) {
		if (id === 'normals') {
			// neutral normal map, i.e. y vector facing upwards as if there
			// were no normal map at all.
			id = [0.0,0.0,1.0,0.0];
		}
		else if (id.length === 3) {
			id = [id[0],id[1],id[2],1.0];
		}

		if (id.length === 4) {
			if (id in neutral_textures) {
				return neutral_textures[id];
			}
			return neutral_textures[id] = new medea.DummyTexture(id);
		}

		// #ifdef LOG
		medealib.LogDebug("neutral texture name not recognized: " + id);
		// #endif

		return medea.CreateDefaultTexture();
	};

});
