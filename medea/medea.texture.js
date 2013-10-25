
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medealib.define('texture',['nativeimagepool','filesystem', 'imagestream', 'dummytexture'],function(undefined) {
	"use strict";
	var medea = this, gl = medea.gl;

	medea._initMod('filesystem');
	medea._initMod('imagestream');
	medea._initMod('nativeimagepool');

	// check for presence of the EXT_texture_filter_anisotropic extension,
	// which enables us to use anistropic filtering.
	var aniso_ext = gl.getExtension("EXT_texture_filter_anisotropic") ||
		gl.getExtension("MOZ_EXT_texture_filter_anisotropic") ||
		gl.getExtension("WEBKIT_EXT_texture_filter_anisotropic");

	// #ifdef DEBUG
	var max_anisotropy;
	if (aniso_ext) {
		medea.LogDebug('using EXT_texture_filter_anisotropic extension');
		max_anisotropy = gl.getParameter(aniso_ext.
			MAX_TEXTURE_MAX_ANISOTROPY_EXT);
	}
	else {
		medea.LogDebug('EXT_texture_filter_anisotropic extension not available');
	}
	// #endif


	var TEX = medea.TEXTURE_TYPE_2D = gl.TEXTURE_2D;

	// flags specific to medea.Texture
	medea.TEXTURE_FLAG_KEEP_IMAGE    = 0x1;
	medea.TEXTURE_FLAG_LAZY_UPLOAD   = 0x2;
	medea.TEXTURE_FLAG_NPOT_PAD      = 0x4;
	medea.TEXTURE_FLAG_NO_MIPS       = 0x8;

	// possible values for the `format` parameter
	medea.TEXTURE_FORMAT_RGBA        = 'rgba';
	medea.TEXTURE_FORMAT_RGB         = 'rgb';
	medea.TEXTURE_FORMAT_LUM         = 'lum';
	medea.TEXTURE_FORMAT_LUM_ALPHA   = 'luma';
	medea.TEXTURE_FORMAT_DEFAULT	 = medea.TEXTURE_FORMAT_RGBA;

	var texfmt_to_gl = function(f) {
		switch(f) {
			case medea.TEXTURE_FORMAT_RGBA:
				return gl.RGBA;
			case medea.TEXTURE_FORMAT_RGB:
				return gl.RGB;
			case medea.TEXTURE_FORMAT_LUM:
				return gl.LUMINANCE;
			case medea.TEXTURE_FORMAT_LUM_ALPHA:
				return gl.LUMINANCE_ALPHA;
		}
		// #ifdef DEBUG
		medea.DebugAssert('unrecognized texture format: ' + f);
		// #endif
	}

	medea.MAX_TEXTURE_SIZE = gl.getParameter(gl.MAX_TEXTURE_SIZE);
	
	var texture_cache = {};
	var GetTextureCacheName = function(src_url, format, flags) {
		return src_url + '#' + (format || medea.TEXTURE_FORMAT_DEFAULT) + '#' + (flags || 0);
	};
	
	var GetTextureSizeSuffix = function(w,h) {
		return '#' + w + '#' + h;
	};
	
	var IsEligibleForCaching = function(flags) {
		// TODO: a copy-on-write approach could enable caching also for textures
		// with modifyable source images.
		return !((flags || 0) & medea.TEXTURE_FLAG_KEEP_IMAGE);
	};

	// note: textures can be created from, but need not necessarily be backed by Image objects.
	// use CreateTexture(image.GetImage()) to create from a Texture
	// standalone textures utilize ImageStreamLoader for their loading business.
	medea.Texture = medea.Resource.extend( {

		init : function(src_or_img, callback, flags, format, force_width, force_height) {
			this.texture = gl.createTexture();
			this.glwidth = force_width || -1;
			this.glheight = force_height || -1;
			this.format = format || medea.TEXTURE_FORMAT_DEFAULT;

			// sentinel size as long as we don't know the real value yet
			this.width = this.height = -1;
			this.flags = flags || 0;
			
			// image data requires special handling, so instruct the Resource
			// base class not to ajax-fetch the URI.
			this._super(src_or_img.src || src_or_img, callback, true);

			if(src_or_img instanceof Image) {
				// TODO: who owns the Image? 
				// Appearantly we do, because OnDelatedInit disposes it. This
				// makes no sense, however, if the user keeps modifying or
				// accessing the source image.
				this.img = src_or_img;
				this.OnDelayedInit();
				return;
			}

			var outer = this;
			medea._ImageStreamLoad(medea.FixURL(src_or_img), function(img) {
				outer.img = img;
				outer.OnDelayedInit();
				// return true to indicate ownership of the Image
				// (if the LAZY flag was not specified, we already disposed of it)
				return true;
			});
		},

		OnDelayedInit : function() {
			
			this.width = this.img.width;
			this.height = this.img.height;

			this.ispot = medea._IsPow2(this.width) && medea._IsPow2(this.height);

			if (this.ispot) {
				if (this.glwidth === -1) {
					this.glwidth = this.width;
				}
				if (this.glheight === -1) {
					this.glheight = this.height;
				}
			}
			else {
				if (this.glwidth === -1) {
					this.glwidth = medea._NextPow2(this.width);
				}
				if (this.glheight === -1) {
					this.glheight = medea._NextPow2(this.height);
				}
			}

			if (this.glwidth > medea.MAX_TEXTURE_SIZE || this.glheight > medea.MAX_TEXTURE_SIZE) {
				this.glwidth = Math.min(this.glwidth, medea.MAX_TEXTURE_SIZE);
				this.glheight = Math.min(this.glheight, medea.MAX_TEXTURE_SIZE);

				// #ifdef LOG

				// normally we should warn about this immediately, but in some cases
				// textures are created but never uploaded to the GPU (i.e. the
				// terrain code does this intentionally to be able to switch from
				// GPU to CPU terrain generation without recreating all heightmaps.
				this.hits_size_limit = true;

				// #endif
			}

			// mark this texture as complete
			this._super();

			if (!(this.flags & medea.TEXTURE_FLAG_LAZY_UPLOAD) && !medea.EnsureIsResponsive()) {
				this._Upload();
			}
			
			// also create a cache entry for this texture
			if(IsEligibleForCaching(this.flags)) {
				var name = GetTextureCacheName(this.GetSource(), this.format, this.flags) + 
					GetTextureSizeSuffix(this.width, this.height);
					
				texture_cache[name] = this;
			}

			medea.LogDebug("successfully loaded texture " + this.GetSource());
		},

		GetGlTextureWidth : function() {
			return this.glwidth;
		},

		GetGlTextureHeight : function() {
			return this.glheight;
		},

		GetPaddingCompensationFactor : function() {
			return [this.width / this.glwidth, this.height / this.glheight];
		},

		GetWidth : function() {
			return this.width;
		},

		GetHeight : function() {
			return this.height;
		},

		GetGlTexture : function() {
			return this.texture;
		},

		GetSource : function() {
			return this.src;
		},

		GetImage : function() {
			// #ifdef DEBUG
			medea.DebugAssert(this.flags & medea.TEXTURE_FLAG_KEEP_IMAGE,'GetImage() ist not available: '+
				'TEXTURE_FLAG_KEEP_IMAGE not specified');
			// #endif
			return this.img;
		},

		IsPowerOfTwo : function() {
			// #ifdef DEBUG
			medea.DebugAssert(this.IsComplete(),'IsPowerOfTwo() ist not available: texture not loaded yet');
			// #endif
			return this.ispot;
		},

		IsSquare : function() {
			// #ifdef DEBUG
			medea.DebugAssert(this.IsComplete(),'IsSquare() ist not available: texture not loaded yet');
			// #endif
			return this.width === this.height;
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

			var old = gl.getParameter(gl.TEXTURE_BINDING_2D);
			if(old !== this.texture) {
				gl.bindTexture(TEX, this.texture);
			}

			var img = this.img;
			var intfmt = texfmt_to_gl(this.format);

			// scale or pad NPOT or oversized textures
			if (this.glwidth !== this.width || this.glheight !== this.height) {
				// #ifdef LOG
				var newsize = '(' + this.glwidth + ' x ' + this.glheight + ')';
				if (!this.IsPowerOfTwo()) {
					medea.Log('texture ' + this.GetSource() + ' is not of a power-of-two size, this means it will be ' + (
						this.flags & medea.TEXTURE_FLAG_NPOT_PAD ? 'padded' : 'scaled') + ' to ' + newsize,'warn');
				}

				if (this.hits_size_limit) {
					medea.Log('texture ' + this.GetSource() + ' is exceeds the maximum size so it will be ' + (
						this.flags & medea.TEXTURE_FLAG_NPOT_PAD ? 'padded' : 'scaled') + ' to '  + newsize,'warn');
				}
				// #endif

				// http://www.khronos.org/webgl/wiki/WebGL_and_OpenGL_Differences#Non-Power_of_Two_Texture_Support
				var canvas = document.createElement("canvas");
				canvas.width = this.glwidth;
				canvas.height = this.glheight;
				var ctx = canvas.getContext("2d");

				if (this.flags & medea.TEXTURE_FLAG_NPOT_PAD) {
					ctx.drawImage(img, 0, 0, Math.min(img.width,canvas.width),
						Math.min(img.height,canvas.height));
				}
				else {
					ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
				}

				// according to http://jsperf.com/texture-sources this should be fastest,
				// but it also consumes loads of memory and quickly screws up Webkit and
				// Gecko. `texImage2D(TEX,0,canvas)` keeps throwing type errors in both
				// engines, though.
				var c = ctx.getImageData(0,0,canvas.width,canvas.height);
				ctx = canvas = null;
				gl.texImage2D(TEX, 0, intfmt, intfmt, gl.UNSIGNED_BYTE, c);
			}
			else {

				// copy to the gl texture
				gl.texImage2D(TEX, 0, intfmt, intfmt, gl.UNSIGNED_BYTE, img);
			}

			// setup sampler states and generate MIPs
			gl.texParameteri(TEX, gl.TEXTURE_WRAP_S, gl.REPEAT);
			gl.texParameteri(TEX, gl.TEXTURE_WRAP_T, gl.REPEAT);
			gl.texParameteri(TEX, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

			if (!(this.flags & medea.TEXTURE_FLAG_NO_MIPS)) {
				gl.texParameteri(TEX, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
				gl.generateMipmap(TEX);

				// setup anistropic filter
				// TODO: quality adjust
				if (aniso_ext) {
					gl.texParameterf(gl.TEXTURE_2D, aniso_ext.TEXTURE_MAX_ANISOTROPY_EXT, 
						max_anisotropy);
				}
			}
			else {
				gl.texParameteri(TEX, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			}

			// because _Upload may be called at virtually any time, we
			// need to ensure that the global state is not altered.
			if(old !== this.texture) {
				gl.bindTexture(TEX, old);
			}

			// this hopefully frees some memory
			if (!(this.flags & medea.TEXTURE_FLAG_KEEP_IMAGE)) {
				if(this.img) {
					medea._ReturnNativeImageToPool(this.img);
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
			gl.bindTexture(TEX,this.texture);

			// no texture uploads while responsiveness is important
			if (!this.uploaded) {
				if(medea.EnsureIsResponsive()) {
					return null;
				}
				this._Upload();
			}
			return slot;
		}
	});
	

	medea.CreateTexture = function(src_or_image, callback, flags, format, force_width, force_height) {
		medea.DebugAssert((force_width === undefined) === (force_height === undefined), 
			'explicit size must always be given for both axes');
			
		var create = function() {
			return new medea.Texture(src_or_image, callback, flags, format, force_width, force_height);
		};

		if (!(src_or_image instanceof Image) && IsEligibleForCaching(flags)) {
			// normalize the resource name as it is used to derive the cache key
			src_or_image = medea.FixResourceName(src_or_image);
			
			var cache_name = GetTextureCacheName(src_or_image, format, flags);
			var cache_name_w = null;
		
			// was a specific texture size requested? If so, check if we have a cache entry 
			// for exactly this texture size. Such entries are created by Texture.DelayedInit()
			// once the size of the texture is known.
			if (force_width !== undefined) {
				cache_name_w = cache_name + GetTextureSizeSuffix(force_width, force_height);
				var cache_entry_w = texture_cache[cache_name_w];
				if(cache_entry_w !== undefined) {
					medea.LogDebug('texture found in cache (1): ' + src_or_image);
					return cache_entry_w;
				}
			}
		
			// check regular cache. This is supposed to be the texture at its default
			// size, which however is not known before the texture is loaded. Therefore,
			// there is a small possibility that a texture is loaded twice. Browser
			// caching should make the effect on the loading time negligible though (
			// the GL texture gets created twice).
			var cache_entry = texture_cache[cache_name];
			if(cache_entry === undefined) {
				if(cache_name_w !== null) {
					return texture_cache[cache_name_w] = create();
				}
				return texture_cache[cache_name] = create();
			}
			
			if (cache_name_w === null || (force_width === cache_entry.GetWidth() 
				&& force_height === cache_entry.GetHeight())) {
				
				medea.LogDebug('texture found in cache (2): ' + src_or_image);
				return cache_entry;
			}
		}
		return create();
	}

	var default_texture = null;
	medea.GetDefaultTexture = function() {
		if (!default_texture ) {
			// TODO: use signal color for debug builds
			medea._initMod('dummytexture');
			default_texture = new medea.DummyTexture([0.3,0.3,0.3,1.0]);
		}
		return default_texture;
	}
});

