
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medea._addMod('image',['filesystem'],function(undefined) {
	"use strict";
	var medea = this;

	medea._initMod('filesystem');
	medea.Image = medea.Resource.extend( {

		init : function(src_or_image, callback, no_client_cache) {
			// #ifdef DEBUG
			if (no_client_cache === undefined) {
				no_client_cache = true;
			}
			// #endif

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

				this.img.src = medea.FixURL(src_or_image,no_client_cache);
			}
		},

		// #ifdef DEBUG
		OnDelayedInit : function() {
			// mark this resource as complete
			this._super();
			medea.LogDebug("successfully loaded raw image " + this.src);
		},
		// #endif

		GetData : function() {
			// #ifdef DEBUG
			if (!this.IsComplete()) {
				medea.DebugAssert('GetData() not possible on image, loading is not yet complete');
			}
			// #endif

			if (!this.raw) {
				var canvas = document.createElement('canvas');
				canvas.width = this.img.width;
				canvas.height = this.img.height;

				var context = canvas.getContext('2d');
				context.drawImage(this.img, 0, 0);

				this.raw = context.getImageData(0, 0, canvas.width, canvas.height);
				this.raw_data = this.raw.data;
			}

			return this.raw_data;
		},

		GetWidth : function() {
			return this.img.width;
		},

		GetHeight : function() {
			return this.img.height;
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

