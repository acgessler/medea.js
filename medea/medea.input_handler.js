
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medea.define('input_handler',['input'],function(undefined) {
	"use strict";
	var medea = this;

	var settings = medea.settings;

	// class InputHandler
	medea.InputHandler = medea.Class.extend(
	{
		custom_keymap : null,

		init : function(custom_keymap) {
			this.acked_state = {};	
			this.custom_keymap = custom_keymap;
		},

		ConsumeKeyDown : function(keycode) {
			var acked = this.acked_state;
			var keymap = this.custom_keymap;
			if(keymap ) {
				keycode = keymap[keycode];
			}

			var old = acked[keycode] || false;
			var now = acked[keycode] = medea.IsKeyDown(keycode);
			return now && !old;
		},

		ConsumeKeyUp : function(keycode) {
			var acked = this.acked_state;
			var keymap = this.custom_keymap;
			if(keymap ) {
				keycode = keymap[keycode];
			}

			var old = acked[keycode] || true;
			var now = acked[keycode] = !medea.IsKeyDown(keycode);
			return !now && old;
		},

		IsKeyDown : function(keycode) {
			var keymap = this.custom_keymap;
			if(keymap ) {
				keycode = keymap[keycode];
			}
			return medea.IsKeyDown(keycode);
		}
	});

	medea.CreateInputHandler = function() {
		return new medea.InputHandler();
	}
});

