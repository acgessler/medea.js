
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

	this.FullscreenMode = function(enable_fullscreen) {
		// based on https://developer.mozilla.org/en-US/docs/Web/Guide/DOM/Using_full_screen_mode
		if (enable_fullscreen === undefined) {
			return is_fullscreen_mode;
		}

		if (!!is_fullscreen_mode === !!enable_fullscreen) {
			return;
		}

		is_fullscreen_mode = enable_fullscreen;

		var canvas = this.canvas.parentNode;
		var on_change_to_fs = function() {
			if(document.mozFullScreen || document.webkitIsFullScreen) {
        		alert(1);
    		}
		};

		document.addEventListener('mozfullscreenchange', on_change_to_fs);
		document.addEventListener('webkitfullscreenchange', on_change_to_fs);

		if (is_fullscreen_mode) {
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
