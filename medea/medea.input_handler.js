
/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('input_handler',['input'],function(undefined) {
	"use strict";
	var medea = this;

	var settings = medea.settings;

	// class InputHandler
	medea.InputHandler = medealib.Class.extend(
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

