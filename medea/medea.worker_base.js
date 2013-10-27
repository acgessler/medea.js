
/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

try {
	medea; // this should throw ReferenceError etc. from within a web worker

	medealib.define('worker_base',[], function(undefined) {
	});
}
catch (e) {
	if (!(e instanceof ReferenceError)) {
		console.log(e);
		return;
	}
	// subset of medea's core interface that is available to workers
	medea = {
		define : function(a,b,clb) {
			clb.apply(medea);
		},

		Log : function(message,kind) {
			// #ifdef LOG
			postMessage(['log',message,kind]);
			// #endif
		},

		LogDebug : function(message) {
			// #ifdef DEBUG
			this.Log(message,'debug');
			// #endif
		},

		DebugAssert : function(e,v) {
			if (v !== undefined) {
				if (e) {
					return;
				}
			}
			else {
				v = e;
			}
			// #ifdef LOG
			postMessage(['assert',v]);
			// #endif
		},

		_workers : {
		},
	};

	onmessage = function(e) {
		var call = medea._workers[e.data.command];
		if (call) {
			var r = call.apply(medea,e.data.arguments);
			postMessage( {
				job_id : e.data.job_id,
				result : r
			});
		}
		else {
			medealib.DebugAssert(false,'command ' + call + ' not recognized');
		}
	};
 }
