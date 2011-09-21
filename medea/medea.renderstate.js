

medea.stubs["renderstate"] = (function(undefined) {
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
	
	medea.stubs["renderstate"] = null;
});
