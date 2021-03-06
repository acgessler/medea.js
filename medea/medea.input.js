
/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('input',[],function(medealib, undefined) {
	"use strict";
	var medea = this;

	var key_state = {};
	var mouse_down = [false ,false, false];

	var lastMouseDelta, lastMousePosition;
	var lastMouseWheelDelta = [0,0];


	var HandleKeyDown = function(event) {
		key_state[event.keyCode] = true;
	};

	var HandleKeyUp = function(event) {
		key_state[event.keyCode] = false;
	};

	var HandleMouseWheel = function(event) {
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

	var HandleMouseDown = function(event) {
		if(event.which <= 3 && event.which > 0) {
			mouse_down[event.which - 1] = true;
		}
	};

	var HandleMouseUp = function(event) {
		if(event.which <= 3 && event.which > 0) {
			mouse_down[event.which - 1] = false;
		}
	};

	var HandleMouseMove = function(event) {
		// XXX use getCapture if available?
		lastMouseDelta = lastMousePosition
			? [	event.clientX - lastMousePosition[0],
				event.clientY - lastMousePosition[1],
				lastMouseDelta[2]+1
			]
			: [0,0,0];

		lastMousePosition = [event.clientX, event.clientY,lastMouseDelta[2]];
	};


	medea.canvas.onmousedown = HandleMouseDown;
	medea.canvas.onmouseup = HandleMouseUp;
	medea.canvas.onmousemove = HandleMouseMove;

	// TODO: should these really be global?
	window.addEventListener('keydown', HandleKeyDown, true);
	window.addEventListener('keyup', HandleKeyUp, true);

	// cross browser mouse wheel
	var wheel = /Firefox/i.test(navigator.userAgent) ? "DOMMouseScroll" : "mousewheel";
	medea.canvas.addEventListener(wheel, HandleMouseWheel, false); 

	var settings = medea.settings;


	medea.IsMouseDown = function() {
		return mouse_down[0];
	};

	medea.IsMouseButtonDown = function(which) {
		return mouse_down[which];
	};

	medea.IsKeyDown = function(keycode) {
		if(settings.keymap) {
			keycode = settings.keymap[keycode];
		}
		return key_state[keycode] || false;
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

