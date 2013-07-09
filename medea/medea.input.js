
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medea._addMod('input',[],function(undefined) {
	"use strict";
	var medea = this;

	var key_state = {};
	var mouse_down = false;
	var mouse_wheel_down = false;

	var lastMouseDelta, lastMousePosition;
	var lastMouseWheelDelta = [0,0];


	var HandleKeyDown = function(event) {
		key_state[event.keyCode] = true;
	};

	var HandleKeyUp = function(event) {
		key_state[event.keyCode] = false;
	};


	medea.canvas.onmousedown = function(event) {
		if(event.which === 1) {
			mouse_down = true;
		}
		else if(event.which === 2) {
			mouse_wheel_down = true;
		}
	};

	medea.canvas.onmouseup = function(event) {
		if(event.which === 1) {
			mouse_down = false;
		}
		else if(event.which === 2) {
			mouse_wheel_down = false;
		}
	};

	medea.canvas.onmousemove = function(event) {
		// XXX use getCapture if available?
		lastMouseDelta = lastMousePosition
			? [	event.clientX - lastMousePosition[0],
				event.clientY - lastMousePosition[1],
				lastMouseDelta[2]+1
			]
			: [0,0,0];

		lastMousePosition = [event.clientX, event.clientY,lastMouseDelta[2]];
	};

	medea.canvas.onmousewheel = function(event) {
		var delta = 0;
 
    	if (event.wheelDelta !== undefined) {
        	delta = event.wheelDelta / 60;
 
    	} 
    	else if (event.detail !== undefined) {
        	delta = -event.detail / 2;
   	 	}

   	 	lastMouseWheelDelta = [
   	 		delta,
   	 		lastMouseWheelDelta[1]+1
   	 	];

		event.preventDefault();
	};


	// set event handlers on the canvas panel
	window.addEventListener('keydown', HandleKeyDown, true);
	window.addEventListener('keyup', HandleKeyUp, true);




	medea.IsMouseDown = function() {
		return mouse_down;
	};

	medea.IsMouseWheelDown = function() {
		return mouse_wheel_down;
	};

	medea.IsKeyDown = function(keycode) {
		return key_state[keycode] || false;
	};

	medea.IsKeyDownWasUp = function(keycode, state) {
		var old = state[keycode] || false, now = state[keycode] = medea.IsKeyDown(keycode);
		return now && !old;
	};

	medea.GetMouseDelta = function() {
		return lastMouseDelta || [0,0,0];
	};

	medea.GetMouseWheelDelta = function() {
		return lastMouseWheelDelta || [0,0];
	};

	medea.GetMousePosition = function() {
		return lastMousePosition || [-1,-1];
	};
});

