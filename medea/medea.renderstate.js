/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('renderstate',[],function(medealib, undefined) {
	"use strict";
	var medea = this, gl = medea.gl;

	var setsimple = function(what,v, cur) {
		if (v) {
			gl.enable(what);
		}
		else {
			gl.disable(what);
		}

	};

	var df_table = {
		'never' 		: gl.NEVER,
		'less' 			: gl.LESS,
		'equal' 		: gl.EQUAL,
		'less_equal' 	: gl.LEQUAL,
		'greater' 		: gl.GREATER,
		'greater_equal' : gl.GEQUAL,
		'not_equal' 	: gl.NOTEQUAL,
		'always'		: gl.ALWAYS
	};

	var cfm_table = {
		'front' 		: gl.FRONT,
		'back' 			: gl.BACK,
		'both' 			: gl.FRONT_AND_BACK
	};

	var bf_table = {
		'one_minus_src_alpha' : gl.ONE_MINUS_SRC_ALPHA,
		'src_alpha' : gl.SRC_ALPHA,
		'one_minus_dst_alpha' : gl.ONE_MINUS_DST_ALPHA,
		'dst_alpha' : gl.DST_ALPHA,
		'one_minus_src_color' : gl.ONE_MINUS_SRC_COLOR,
		'src_color' : gl.SRC_COLOR,
		'one_minus_dst_color' : gl.ONE_MINUS_DST_COLOR,
		'dst_color' : gl.DST_COLOR,
		'one' : gl.ONE
	};

	var action_map = {
		'depth_test'  :  function(v) { setsimple(gl.DEPTH_TEST,v); },
		'depth_write' :  function(v) {
			gl.depthMask(!!v);
		},
		'depth_func'  :  function(v) {
			gl.depthFunc(df_table[v]);
		},

		'cull_face'  :  function(v) { setsimple(gl.CULL_FACE,v); },
		'cull_face_mode'  :  function(v) {
			gl.cullFace(cfm_table[v]);
		},

		'blend' : function(v) { setsimple(gl.BLEND,v); },
		'blend_func' : function(v) {
			gl.blendFunc(bf_table[v[0]], bf_table[v[1]]);
		},
	};


	var cur_default = {};

	medea.SetDefaultState = function(s,pool) {
		var cur = pool.Get('_gl');

		cur_default = s;
		for (var k in s) {
			var mapped = action_map[k];
			if(mapped !== undefined) {
				var v = s[k];

				if (cur[k] !== v) {
					mapped(v);
					cur[k] = v;
				}
			}
		}
	};

	medea.SetState = function(s,pool) {
		var cur = pool.Get('_gl');

		for (var k in s) {

			var mapped = action_map[k];
			if(mapped !== undefined) {
				var v = s[k];

				if (cur[k] !== v) {
					mapped(v);
					cur[k] = v;
				}
			}
		}

		for (var k in cur_default) {
			if (k in s) {
				continue;
			}

			var mapped = action_map[k];
			if(mapped !== undefined) {
				var v = cur_default[k];
				if (cur[k] !== v) {
					mapped(v);
					cur[k] = v;
				}
			}
		}
	};
});

