
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medea.define('visualizer_posteffect',[ 'visualizer', 'shader' ],function() {
	"use strict";
	var medea = this
	,	_composition_global_prefix
	,	_composition_main_prefix
	,	_composition_main_suffix
	;
	

	medea._initMod('visualizer');


	medea._VISUALIZER_POSTFX_DIRTY = 0x1;


	_composition_global_prefix = "";
	_composition_main_prefix = "";
	_composition_main_suffix = "";


	/** Compositor for post-processing effects. A PostFX compositor can have
	 *  multiple postprocessing effects attached, which are executed in arbitrary
	 *  order and their results are then composed together in a final 
	 *  composition pass.
	 *
	 *  The composition pass is an auto-generated shader for which each posteffect
	 *  supplies a small piece of text to inject their logic, and parametrizes
	 *  that snippet accordingly at runtime.
	 *
	 *  While posteffects can do offload arbitrary computations to the composition
	 *  pass, any computation that requires drawing to custom render targets or
	 *  multiple passes needs to be carried out by them earlier, and then passed to 
	 *  the composition pass via a texture or uniforms.
	 *
	 *  While posteffects get to pick in which order their snippet are executed
	 *  in the final composition pass, they have no control over the order in which
	 *  they get to do their custom logic and as such also cannot depend on each
	 *  other's output.
	 *
	 *  To make a chain of postprocessing effects taking the composite result
	 *  of previous posteffects as input to the next effect, apply multiple
	 *  VisualizerPostEffectCompositors to the scene and use them as 
	 *  "synchronization" points.
	 *
	 *  A complex postprocessing chain may, for example, look like this:
	 *
	 *   - compute hdr luminance
	 *   - compute bloom extra targets
	 *   - compute ssao 
	 *   ## composition point1: apply hdr, bloom, ssao to scene
	 *   - compute horizontally blurred version of the scene
	 *   ## composition point2: apply vertical blur to scene, change gamma
	 *       and output brightness.
	 *
	 *  Changing posteffects can lead to re-generation of the composition pass
	 *  and should therefore avoided if possible. However, enabling or disabling
	 *  whole visualizers has very little overhead. So consider structuring your
	 *  postprocessing setup such that  parts you need to turn on or off frequently,
	 *  are put to separate compositors. If this is not possible performance-wise,
	 *  avoid using too many permutations of post processing effects, as there is
	 *  a small cache for previous compositor effects
	 */
	medea.VisualizerPostEffectCompositor = medea.Visualizer.extend({
		dirty : false,
		effects : null,
		flags : medea._VISUALIZER_POSTFX_DIRTY,

		init : function() {
			this.effects = [];
		},

		/** {{copydoc}} */
		Apply : function(render_stub,original_render_stub,rq) {
			var self = this;

			if(!this.effects.length) {
				return render_stub;
			}
			
			return function() {
				if (self.flags & medea._VISUALIZER_POSTFX_DIRTY) {
					self._GenCompositionShader();
				}
				render_stub();
			};
		},

		/** Add an effect to the set of posteffects associated with this 
		 *  compositor.
		 *
		 *  This causes the OnAddToCompositor() method of that effect to be invoked.
		 *  Effects can be associated with multiple compositors. 
		 */
		AddEffect : function(e) {
			var idx = this.effects.indexOf(e);
			if(idx === -1) {
				return;
			}
			this.effects.push(e);
			e.OnAddToCompositor(this);
		},


		/** Remove an effect to the set of posteffects associated with this 
		 *  compositor.
		 *
		 *  This causes the OnRemoveFromCompositor() method of that effect to be 
		 *  invoked. Effects can be associated with multiple compositors. 
		 */
		RemoveEffect : function(e) {
			var idx = this.effects.indexOf(e);
			if(idx === -1) {
				return;
			}
			this.effects = this.effects.splice(idx, 1);
			e.OnRemoveFromCompositor(this);
		},


		/** Triggers re-generation of the composition shader. Post effects
		 *  may call this whenever their composition logic changes due to
		 *  configuration changes.
		 *
		 *  Note that this is an expensive operation, see remarks on the
		 *  class head for more tips.
		 * */
		MarkDirty : function() {
			this.flags |= medea._VISUALIZER_POSTFX_DIRTY;
		},


		_GenCompositionShader : function() {
			var stubs = []
			, extra = []
			, i
			, shader_source
			;

			this.effects.forEach(function(e) {
				stubs.push(e.GetCompositionStub());
				extra.push(e.GetCompositionExtraShaderCode());
			});

			// sort by ordinal
			stubs.sort(function(a,b) {
				return a[0] - b[0];
			});

			for(i = stubs.length - 1; i >= 0; --i) {
				stubs[i] = stubs[i][1];
			}

			shader_source = _composition_global_prefix + extra.join('\n') + 
				_composition_main_prefix +
				stubs.join('\n') +
				_composition_main_suffix;

			var m = medea.CreateShaderFromSource(medea.SHADER_TYPE_PIXEL, shader_source, [], cache_key);
			self.flags &= ~medea._VISUALIZER_POSTFX_DIRTY;
		},
	});


	medea.CreateVisualizerPostEffectCompositor = function() {
		return new medea.VisualizerPostEffectCompositor();
	};

	medea.CreateVisualizer_posteffect = medea.CreateVisualizerPostEffectCompositor;


	/** */
	medea.GetPassthruVertexShader : function() {
		// TODO
	};
});