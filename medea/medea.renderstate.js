/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medea._addMod('renderstate',[],function(undefined) {
	"use strict";
	var medea = this, gl = medea.gl;

	var setsimple = function(what,v) {
		(v ? gl.enable : gl.disable)(what);
	};

	var df_table = {
		'never' 		: gl.NEVER,
		'less' 			: gl.LESS,
		'equal' 		: gl.EQUAL,
		'less_equal' 	: gl.LEQUAL,
		'greater' 		: gl.GREATER,
		'greater_equal' : gl.GEQUAL,
		'not_equal' 	: gl.NOTEQUAL,
		'always'		: gl.ALWAYS,
	};

	var cfm_table = {
		'front' 		: gl.FRONT,
		'back' 			: gl.BACK,
		'both' 			: gl.FRONT_AND_BACK
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
	};
	
	
	var cur_default = {};
	
	this.SetDefaultState = function(s,pool) {
		cur_default = s;
		for (var k in s) {
			var v = s[k];

			var mapped = action_map[k];
			if(mapped !== undefined) {
				mapped(v);
			}
		}
	};

	this.SetState = function(s,pool) {
		for (var k in s) {
			var v = s[k];

			var mapped = action_map[k];
			if(mapped !== undefined) {
				mapped(v);
			}
		}
		
		for (var k in cur_default) {
			if (k in s) {
				continue;
			}
			
			var mapped = action_map[k];
			if(mapped !== undefined) {
				mapped(cur_default[k]);
			}
		}
	};
});

