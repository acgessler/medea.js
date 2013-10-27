/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('keymap',[],function(undefined) {
	"use strict";
	var medea = this;


	medea.SetKeyMap = function(keymap) {
		medea.settings.keymap = keymap;

		// augment with identity map for all other keys
		for (var i = 0; i < 200; ++i) {
			if (keymap[i] === undefined) {
				keymap[i] = i;
			}
		}
	};


	medea.GetKeyMap = function(keymap) {
		return medea.settings.keymap;
	};
});

