
/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */
medealib.define('continuation',['continue.js'],function(medealib, undefined) {
	"use strict";
	var medea = this
	,	counter = 0
	,	prefix = '__medea_continuation__'
	;

	// just a slim wrapper around continue.js, which is independent of medea
	medea.Continuation = medealib.Class.extend({
		c : null,
		max_time : -1,

		init : function(max_time) {
			this.max_time = max_time || 20;

			var key = prefix + (counter++);
			// problem: when the main loop is not running, or is terminated,
			// continuations may never fully execute. For this, a rework
			// of the main loop is needed. So for now, back to setTimeout()
			this.c = new Continuation( /*function(f) {

				// go through medea's regular tick system to make sure the
				// debug tools are able to include this in the frame-time.
				medea.SetTickCallback( function() {
					medea.RemoveTickCallback(key);
					f();
				}, key);


			} */);
		},

		MaxTime : medealib.Property('max_time'),

		AddJob : function(f) {
			this.c.add(f);
		},

		Schedule : function(force_async) {
			this.c.schedule(this.max_time, force_async);
		},

		Finished : function() {
			return this.c.finished();
		},

		Running : function() {
			return this.c.running();
		},
	});

	medea.CreateContinuation = function(max_time) {
		return new medea.Continuation(max_time);
	};
});
