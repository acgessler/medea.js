
/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('imagestream',['nativeimagepool','filesystem'],function(undefined) {
	"use strict";
	var medea = this;

	

	var MAX_SIMULTANEOUS_REQUESTS = 12;

	// based on idea from here
	// http://blog.tojicode.com/2012/03/javascript-memory-optimization-and.html
	// this uses a fixed pool of Image's (which are a sub-pool of the general
	// nativeimagepool) to load images from the server.

	var top = 0;
	var remaining_slots = MAX_SIMULTANEOUS_REQUESTS;
	var pending = [];

	var get_pool_image = medea._GetNativeImageFromPool;
	var return_pool_image = medea._ReturnNativeImageToPool;


	// load image using stream loaders, call `callback` upon completion.
	// if `callback` returns true, it has taken ownership of the Image
	// which is otherwise return to the nativeimagepool.
	var load = medea._ImageStreamLoad = function(src, callback) {

	    if (remaining_slots > 0) {
	        var img = get_pool_image();
	        img.onload = function() { 
	        	if(!callback(img, src)) {
	        		return_pool_image(img);
	        	}

	        	++remaining_slots;
	        	if(pending.length > 0) {
			        var req = pending.shift();
			        load(req[0], req[1]);
			    } 

	        };
	        img.src = src;
	        --remaining_slots;
	    } 
	    else {
	        pending.push([src, callback]);
	    }
	};
});
