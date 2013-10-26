/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler
 * licensed under the terms and conditions of a 3 clause BSD license.
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

