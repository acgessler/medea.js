
/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('cubetexture',['filesystem', 'nativeimagepool', 'imagestream'],function(medealib, undefined) {
	"use strict";
	var medea = this, gl = medea.gl;

	var CUBE = medea.TEXTURE_TYPE_CUBE = gl.TEXTURE_CUBE_MAP;

	var default_names = [
		'posx','negx','posy','negy','posz','negz'
	];

	
	
	

	medea.CubeTexture = medea.Resource.extend( {

		init : function(src, callback, flags) {

			this.flags = flags || 0;
			this.texture = gl.createTexture();
			this.callback = callback;

			// sentinel size as long as we don't know the real value yet
			this.width = this.glwidth = this.height = this.glheight = -1;

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
					medea._ImageStreamLoad(medea.FixURL(src[i]), function(img) {
						outer.img[i] = img;
						outer.OnDelayedInit(i);
						// return true to indicate ownership of the Image
						// (if the LAZY flag was not specified, we already disposed of it)
						return true;
					});
				})(i);
			}
		},

		OnDelayedInit : function(index) {

			var w = this.img[index].width, h = this.img[index].height;

			// cube textures must be POTs and all faces must be squares. Anything else
			// doesn't make sense unlike for 2D textures.
			// #ifdef DEBUG
			medealib.DebugAssert(w === h && medea._IsPow2(w) && medea._IsPow2(h),'cube texture faces must be squared and POTs');
			medealib.DebugAssert(this.counter === 6 || (w === this.width && h === this.height),'cube texture faces must be all of the same size');
			// #endif

			this.width = this.glwidth = w;
			this.height = this.glheight = h;

			// mark this resource as complete if this was the last face
			if (--this.counter === 0) {
				this._super();

				if (!(this.flags & medea.TEXTURE_FLAG_LAZY_UPLOAD)) {
					this._Upload();
				}

				medealib.LogDebug("successfully loaded cube texture " + this.GetSource());
			}
		},

		GetWidth : function() {
			return this.width;
		},

		GetHeight : function() {
			return this.height;
		},

		GetGlTextureWidth : function() {
			return this.glwidth;
		},

		GetGlTextureHeight : function() {
			return this.glheight;
		},

		GetGlTexture : function() {
			return this.texture;
		},

		GetSource : function() {
			return this.src[0] + '...(1-6)';
		},

		IsPowerOfTwo : function() {
			return true;
		},

		IsSquared : function() {
			return true;
		},

		IsUploaded : function() {
			return this.uploaded;
		},

		IsRenderable : function() {
			return this.IsComplete() && (this.IsUploaded() || !medea.EnsureIsResponsive());
		},

		Dispose : function() {
			if(this.texture) {
				gl.deleteTexture(this.texture);
				this.texture = null;
			}
		},

		_Upload : function() {
			if (this.uploaded) {
				return;
			}

			var old = gl.getParameter(gl.TEXTURE_BINDING_CUBE);
			if(old !== this.texture) {
				gl.bindTexture(CUBE, this.texture);
			}

			// fill all faces
			for ( var i = 0; i < 6; ++i) {
				var face = gl.TEXTURE_CUBE_MAP_POSITIVE_X + i;
				gl.texImage2D(face, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.img[i]);
			}

			// setup sampler states and generate MIPs
			gl.texParameteri(CUBE, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

			if (!(this.flags & medea.TEXTURE_FLAG_NO_MIPS)) {
				gl.texParameteri(CUBE, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
				gl.generateMipmap(CUBE);
			}
			else {
				gl.texParameteri(CUBE, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			}

			// because _Upload may be called at virtually any time, we
			// need to ensure that the global state is not altered.
			if(old !== this.texture) {
				gl.bindTexture(CUBE, old);
			}

			// this hopefully frees some memory
			if (!(this.flags & medea.TEXTURE_FLAG_KEEP_IMAGE)) {
				if(this.img) {
					for(var i = 0; i < 6; ++i) {
						medea._ReturnNativeImageToPool(this.img[i]);
					}
					this.img = null;
				}
			}
			this.uploaded = true;
		},

		_Bind : function(slot) {
			if (!this.IsComplete()) {
				return null;
			}

			slot = slot || 0;

			gl.activeTexture(gl.TEXTURE0 + slot);
			gl.bindTexture(CUBE,this.texture);

			// no texture uploads while responsiveness is important
			if (!this.uploaded) {
				if(medea.EnsureIsResponsive()) {
					return null;
				}
				this._Upload();
			}

			return slot;
		},
	});

	medea.CreateCubeTexture = function(res, callback) {
		return new medea.CubeTexture(res, callback);
	}
});

