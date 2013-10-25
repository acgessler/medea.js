
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medealib.define('nativeimagepool',[],function(undefined) {
	"use strict";
	var medea = this;

	var pool = [];

	// cache all (DOM) Image instances in possession of medea.
	// This is to avoid constant re-creation of images if resources are
	// streamed. It only works if texture users Dispose() of their
	// images once they finish using them, though.

	medea._GetNativeImageFromPool = function() {
		if(pool.length) {
			return pool.shift();
		}
		return new Image();
	};

	medea._ReturnNativeImageToPool = function(image) {
		// #ifdef DEBUG
		medea.DebugAssert(image instanceof Image, 'expected native Image object');
		// #endif

		// reset the src attribute in the hope that this frees memory allocated
		// for the Image.
		image.src = "";

		// #ifdef DEBUG
		image.onload = function() {
			medea.DebugAssert(false, "onload() called for pooled Image");
		};
		// #endif

		pool.push(image);
	};
});

