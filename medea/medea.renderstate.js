/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander Ċ. Gessler 
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medea._addMod('renderstate',[],function(undefined) {
	var medea = this, gl = medea.gl;
	
	var setsimple = function(what,v) {
		(v ? gl.enable : gl.disable)(what);
	};
	
	var action_map = {
		'depth_test' :  function(v) { setsimple(gl.DEPTH_TEST,v); },
	}; 
	
	this.SetState = function(s,pool) {
		for (var k in s) {
			var v = s[k];
			
			var mapped = action_map[k];
			if(mapped !== undefined) {
				mapped(v);
			}
		}
	};
});
