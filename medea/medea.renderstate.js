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

	var so_table = {
		'keep' : gl.KEEP,
		'zero' : gl.ZERO,
		'replace' : gl.REPLACE,
		'incr' : gl.INCR,
		'incr_wrap' : gl.INCR_WRAP,
		'decr' : gl.DECR,
		'decr_wrap' : gl.DECR_WRAP,
		'invert' : gl.INVERT,
	};

	// List of supported render states along with how they map to GL.
	//
	// Hardcoded, clear error messages here. It is easy to get those
	// states wrong, and very tedious to debug.
	var action_map = {
		'depth_test'  :  function(v) {
			// #ifdef DEBUG
			// To catch otherwise hard to find mistakes, only allow |true| and |false|.
			medealib.DebugAssert(v === true || v === false,
				"depth_test must be |true| or |false|: " + v);
			// #endif
			setsimple(gl.DEPTH_TEST,v);
		},

		'depth_write' :  function(v) {
			// #ifdef DEBUG
			// To catch otherwise hard to find mistakes, only allow |true| and |false|.
			medealib.DebugAssert(v === true || v === false,
				"depth_write must be |true| or |false|: " + v);
			// #endif
			gl.depthMask(v);
		},

		'depth_func'  :  function(v) {
			// #ifdef DEBUG
			medealib.DebugAssert(df_table[v] !== undefined,
				"Invalid depth_func: " + v);
			// #endif
			gl.depthFunc(df_table[v]);
		},

		'cull_face'  :  function(v) {
			// #ifdef DEBUG
			// To catch otherwise hard to find mistakes, only allow |true| and |false|.
			medealib.DebugAssert(v === true || v === false,
				"cull_face must be |true| or |false|: " + v);
			// #endif
			setsimple(gl.CULL_FACE,v);
		},

		'cull_face_mode'  :  function(v) {
			// #ifdef DEBUG
			medealib.DebugAssert(cfm_table[v] !== undefined,
				"Invalid cull_face_mode: " + v);
			// #endif
			gl.cullFace(cfm_table[v]);
		},

		'blend' : function(v) {
			// #ifdef DEBUG
			// To catch otherwise hard to find mistakes, only allow |true| and |false|.
			medealib.DebugAssert(v === true || v === false,
				"blend must be |true| or |false|: " + v);
			// #endif
			setsimple(gl.BLEND,v);
		},

		'blend_func' : function(v) {
			// #ifdef DEBUG
			medealib.DebugAssert(bf_table[v[0]] !== undefined && bf_table[v[1]] !== undefined,
				"Invalid blend function: " + v);
			// #endif
			gl.blendFunc(bf_table[v[0]], bf_table[v[1]]);
		},

		'color_mask' : function(v) {
			// #ifdef DEBUG
			medealib.DebugAssert(v.length === 4,
				"Invalid color_mask, expected list of four booleans: " + v);
			// #endif
			gl.colorMask(v[0], v[1], v[2], v[3]);
		},

		'stencil_op' : function(v) {
			// #ifdef DEBUG
			medealib.DebugAssert(so_table[v[0]] !== undefined &&
				so_table[v[1]] !== undefined &&
				so_table[v[2]] !== undefined,
				"Invalid stencil_op: " + v);
			// #endif
			gl.stencilOp(so_table[v[0]], so_table[v[1]], so_table[v[2]]);
		},

		'stencil_func' : function(v) {
			// #ifdef DEBUG
			medealib.DebugAssert(df_table[v[0]] !== undefined &&
				v[1] <= 0xff && v[1] >= 0x0 &&
				v[2] <= 0xff && v[2] >= 0x0,
				"Invalid stencil_func: " + v);
			// #endif
			gl.stencilFunc(df_table[v[0]], v[1], v[2]);
		},

		'stencil_mask' : function(v) {
			// #ifdef DEBUG
			medealib.DebugAssert(v <= 0xff && v >= 0x0,
				"Invalid stencil_mask: " + v);
			// #endif
			gl.stencilMask(v);
		},

		'stencil_test' : function(v) {
			// #ifdef DEBUG
			// To catch otherwise hard to find mistakes, only allow |true| and |false|.
			medealib.DebugAssert(v === true || v === false,
				"stencil_test must be |true| or |false|: " + v);
			// #endif
			setsimple(gl.STENCIL_TEST,v);
		},
	};


	var cur_default = {};
	var global_defaults = {

		'stencil_func' : ['always', 0x0, 0xff],
		'stencil_op' : ['keep', 'keep', 'keep'],
		'stencil_mask' : 0x0,
		'color_mask' : [true, true, true, true],
		'blend_func' : ['one', 'one_minus_src_alpha'],
		'blend' : false,
		'cull_face_mode' : 'back',
		'cull_face' : true,
		'depth_func' : 'less_equal',
		'depth_write' : true,
		'depth_test' : true,
		'stencil_test' : false,
	};

	medea.SetDefaultState = function(s, pool) {
		var cur = pool.Get('_gl');

		// Merge global defaults with the given defaults. This ensures
		// a default value exists for every possible render state.

		var merged_default_state = {};
		for (var k in s) {
			merged_default_state[k] = s[k];
		}
		for (var k in global_defaults) {
			if (merged_default_state[k] === undefined) {
				merged_default_state[k] = global_defaults[k];
			}
		}

		cur_default = merged_default_state;
		for (var k in merged_default_state) {
			var mapped = action_map[k];
			if(mapped !== undefined) {
				var v = merged_default_state[k];

				if (cur[k] !== v) {
					mapped(v);
					cur[k] = v;
				}
			}
		}
	};

	medea.SetState = function(s, pool) {
		var cur = pool.Get('_gl');

		// Set all states that are specified by the given state dictionary
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

		// Restore all other states from the current default state
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

