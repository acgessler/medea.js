
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medea.define('posteffect',[ '' ],function() {
	"use strict";
	var medea = this;
	

	medea._initMod('visualizer');

	/** 
	 */
	medea.PostEffect = medea.Class.extend({
		init : function() {

		},

		/**  Return extra code to be prepended to the composition shader's
		 *   main(). This includes any required shader uniforms, #include's
		 *   or utility functions. The implementation needs to ensure that
		 *   the extra shader code causes no name conflicts with other
		 *   posteffects's code. By convention, this is achieved by prefixing 
		 *   it with the name of the posteffect.
		 */
		GetCompositionExtraShaderCode : function() {
			return '';
		},

		/**  Yields a single line of GLSL code that, assuming the current 
		 *   composition intermediate result is in a vec4 variable called
		 *   `acc`, alters this variable to include this post processing
		 *   effect's result. The GLSL code may make use of any symbols made
		 *   accessible with the extra shader code returned by 
		 *   {{GetCompositionExtraShaderCode()}}
		 *
		 *   @return an array of two elements, the first of which gives the
		 *      relative order in which this stub is placed relative to
		 *      other posteffects on the same compositor, the second of which
		 *      is the actual GLSL snippet.
		 */
		GetCompositionStub : function() {
			return [0, ''];
		},
	});

});