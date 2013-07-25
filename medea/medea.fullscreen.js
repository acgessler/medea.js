
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medea._addMod('fullscreen',[],function(undefined) {
	"use strict";
	var medea = this, gl = medea.gl;

	var is_fullscreen_mode = false;
	var fullscreen_mode_key = null;

	var check_is_fullscreen = function() {
		return document.mozFullScreen || document.webkitIsFullScreen;
	};


	var old_width = null, old_height = null;
	var on_change_to_fs = function() {
		is_fullscreen_mode = check_is_fullscreen();

		// set the canvas to the size of its parent node
		var canvas = medea.canvas;
		if(is_fullscreen_mode) {
  			canvas.width = window.innerWidth;
        	canvas.height = window.innerHeight;
    	}
    	else {
    		canvas.width = old_width;
        	canvas.height = old_height;
    	}
	};


	var is_fullscreen_mode_key_down = false;
	var key_up = function(event) {
		if(event.keyCode === fullscreen_mode_key) {
			is_fullscreen_mode_key_down = false;
		}
	};

	var key_down = function(event) {
		if(event.keyCode === fullscreen_mode_key) {
			if (is_fullscreen_mode_key_down === false) {
				medea.FullscreenMode(!medea.FullscreenMode());
			}
			is_fullscreen_mode_key_down = true;
		}
	};


	/** medea.IsFullscreenModeKey(*)
	 *
	 *  TODO
	 */
	this.FullscreenModeKey = function(key) {

		// this utility function is here to offer a straightforward way of binding
		// the fullscreen functionality to a key - this is not so easy otherwise
		// due to the limitation that fullscreen DOM APIs are only available from
		// within event handlers, but medeas input handling is asynchronous.
		//
		// even though this registers event handlers, it is designed as to not
		// interfere with the input module.
		if (key === undefined) {
			return fullscreen_mode_key;
		}

		if(fullscreen_mode_key === key) {
			return;
		}

		fullscreen_mode_key = key;
		if (key === null) {
			window.removeEventListener('keydown', key_down, true);
			window.removeEventListener('keyup', key_up, true);
			return;
		}

		window.addEventListener('keydown', key_down, true);
		window.addEventListener('keyup', key_up, true);
	};


	/** medea.IsFullscreenMode(*)
	 *  
	 *  TODO
	 *  Browser APIs for fullscreen mode are only available from within an event handler. 
	*/
	this.FullscreenMode = function(enable_fullscreen) {
		// based on https://developer.mozilla.org/en-US/docs/Web/Guide/DOM/Using_full_screen_mode
		if (enable_fullscreen === undefined) {
			return is_fullscreen_mode;
		}

		if (!!is_fullscreen_mode === !!enable_fullscreen) {
			return;
		}

		// is_fullscreen_mode is not changed until the fullscreenchange event occurs
		//is_fullscreen_mode = enable_fullscreen;
		var canvas = this.canvas;

		old_width = canvas.width;
		old_height = canvas.height;

		// TODO: since going to fullscreen mode is asynchronous, we could offer a callback
		document.addEventListener('mozfullscreenchange', on_change_to_fs);
		document.addEventListener('webkitfullscreenchange', on_change_to_fs);

		if (enable_fullscreen) {
			if (canvas.requestFullscreen) {
	      		canvas.requestFullscreen();
	    	} 
	    	else if (canvas.mozRequestFullScreen) {
	      		canvas.mozRequestFullScreen();
	    	} 
	    	else if (canvas.webkitRequestFullScreen) {
	    		// http://stackoverflow.com/questions/8427413/
	      		canvas.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
				if (!document.webkitCurrentFullScreenElement) {
    				// Element.ALLOW_KEYBOARD_INPUT does not work, document is not in full screen mode
					canvas.webkitRequestFullScreen();
				}
	   		}
   		}
   		else {
   			if (document.cancelFullScreen) {
      			document.cancelFullScreen();
    		} 
    		else if (document.mozCancelFullScreen) {
      			document.mozCancelFullScreen();
    		} 
    		else if (document.webkitCancelFullScreen) {
      			document.webkitCancelFullScreen();
    		}
   		}
	};
});
