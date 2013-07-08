
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medea._addMod('image',['filesystem'],function(undefined) {
	"use strict";
	var medea = this;

	medea.IMAGE_FLAG_USER = 0x1000;

	medea._initMod('filesystem');
	medea.Image = medea.Resource.extend( {

		init : function(src_or_image, callback, flags) {
			this.flags = flags || 0;

			// sentinel size as long as we don't know the real value yet
			this.width = this.height = -1;

			this.callback = callback;
			if (src_or_image instanceof Image) {
				this.img = src_or_image;
				this.src = this.img.src;

				this.OnDelayedInit();
			}
			else {
				this.src = src_or_image;
				this.img = new Image();
				var outer = this;
				this.img.onload = function() {
					outer.OnDelayedInit();
				};

				// XXX this circumvents the filesystem as we have to rely on the browser's
				// URl resolution. Find a better solution for this.
				this.img.src = medea.FixURL(src_or_image);
			}
		},

		// #ifdef DEBUG
		OnDelayedInit : function() {

			this.width = this.img.width;
			this.height = this.img.height;

			this.ispot = medea._IsPow2(this.width) && medea._IsPow2(this.height);

			// mark this resource as complete
			this._super();
			medea.LogDebug("successfully loaded raw image " + this.GetSource());
		},
		// #endif

		GetData : function() {
			// #ifdef DEBUG
			medea.DebugAssert(this.IsComplete(),'texture not loaded yet');
			medea.DebugAssert(!!this.img,'image data not present, forgot medea.TEXTURE_FLAG_KEEP_IMAGE flag on texture?');
			// #endif

			if (!this.raw) {
				var canvas = document.createElement('canvas');
				canvas.width = this.width;
				canvas.height = this.height;

				var context = canvas.getContext('2d');
				context.drawImage(this.img, 0, 0);

				this.raw = context.getImageData(0, 0, canvas.width, canvas.height);
				this.raw_data = this.raw.data;
			}

			return this.raw_data;
		},

		GetWidth : function() {
			return this.width;
		},

		GetHeight : function() {
			return this.height;
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

		GetSource : function() {
			return this.src;
		},

		Pixel : function(x,y, rgba) {
			var v = this.GetData(), n = (this.img.width*y+x) * 4;
			if (rgba === undefined) {
				return [v[n+0],v[n+1],v[n+2],v[n+3]];
			}

			// XXX this only changes the data copy, not the original image, nor the canvas
			v[n+0] = rgba[0];
			v[n+1] = rgba[1];
			v[n+2] = rgba[2];
			v[n+3] = rgba[3];
		},

		PixelComponent : function(x,y, which, value) {
			var v = this.GetData(), n = (this.img.width*y+x) * 4 + which;
			if (value === undefined) {
				return v[n];
			}
			v[n] = value;
		}
	});

	medea.CreateImage = function(res, callback) {
		return new medea.Image(res, callback);
	};
});

