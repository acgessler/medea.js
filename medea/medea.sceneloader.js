
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander Ċ. Gessler 
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medea._addMod('sceneloader',['mesh','filesystem', typeof JSON === undefined ? 'json2.js' : null],function(undefined) {
	"use strict";
	var medea = this;
	
	
	
	var LoadAssimpScene = function(scene, anchor, callback) {
		
	};
	

	//
	medea.LoadScene = function(src,anchor,format_hint,callback) {
		format_hint = format_hint || 'assimp2json';
		try {
		alert(src);
			var scene = JSON.parse(src);
		}
		catch(e) {
			// #ifdef DEBUG
			medea.DebugAssert("Failed to read scene from JSON, JSON input is malformed: " + e);
			// #endif
		}
		
		// assimp2json output format
		if(format_hint === 'assimp2json') {
			return LoadAssimpScene(scene,anchor,callback);
		}
		
		// #ifdef DEBUG
		medea.DebugAssert("Unrecognized scene format: " + format_hint);
		// #endif
	};
	
	//
	medea.LoadSceneFromResource = function(src,anchor,format_hint,callback) {
		medea.Fetch(src,function(data) {
			medea.LoadScene(data,anchor,format_hint,callback);
		}, function() {
			// XXX handle error
		});
	};
});
