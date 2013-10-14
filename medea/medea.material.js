
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medea.define('material',['pass'],function(undefined) {
	"use strict";
	var medea = this, gl = medea.gl;


	medea.MATERIAL_CLONE_COPY_STATE 		= 0x1;
	medea.MATERIAL_CLONE_SHARE_STATE 		= 0x2;

	medea.MATERIAL_CLONE_COPY_CONSTANTS 	= 0x4;
	medea.MATERIAL_CLONE_SHARE_CONSTANTS 	= 0x8;


	// class Material
	medea.Material = medea.Class.extend({
		name : "",
		mat_gen : null,

		init : function(passes, name) {
			if(name) {
				this.name = name;
			}

			// the first parameter can also be a MaterialGenerator
			if (passes.Update !== undefined) {
				this.mat_gen = passes;
				this.passes = [];
				this.mat_gen.Update(this.passes);
			}
			else {
				this.passes = passes;
			}

			if (this.passes instanceof medea.Pass) {
				this.passes = [this.passes];
			}
// #ifdef DEBUG
			if (!this.passes) {
				medea.DebugAssert("need at least one pass for a material to be complete");
			}
// #endif
		},

		Pass : function(n,p) {
			if(p === undefined) {
				return this.passes[n];
			}
			if (n == this.passes.length) {
				this.passes.push(p);
				return;
			}
			// #ifdef DEBUG
			else if (n > this.passes.length) {
				medea.DebugAssert('pass index out of range, cannot add pass if there is no pass that preceedes it: ' + n);
				return;
			}
			// #endif
			this.passes[n] = p;
		},

		Passes : function(p) {
			if (p === undefined) {
				return this.passes;
			}
			this.passes = p;
		},

		GetId: function() {
			return 0;
		},

		Name : medea._GetSet(this,'name'),

		Use: function(drawfunc, statepool, semantic) {
			semantic = semantic || 0xffffffff;
			var passes = this.passes;
			if (this.mat_gen) {
				this.mat_gen.Update(passes);
			}

			// invoke the drawing callback once per pass
			for(var i = 0, e = passes.length; i < e; ++i) {
				var pass = passes[i];
				if(!(pass.semantic & semantic)) {
					continue;
				}
				if(!pass.Begin(statepool)) {
					// XXX substitute a default material?
					return;
				}

				drawfunc(pass);
				pass.End();
			}
		}
	});


	medea.CreateSimpleMaterialFromColor = function(color, dummy_light, shininess, spec_color) {
		if(color.length === 3) { 
			color = [color[0],color[1],color[2],1.0];
		}

		var name = "remote:mcore/shaders/simple-color"
		,	constants = {
				color:color
			}
		;

		if(dummy_light) {
			name += '-lit';
			if(shininess) {
				name += '-spec';

				if(!spec_color) { 
					spec_color = [1,1,1];
				}

				// cap shininess at 64 to avoid excessive exponentiation
				constants.spec_color_shininess = [
					spec_color[0],
					spec_color[1],
					spec_color[2],
					Math.min(64, shininess)
				];
			}
		}
		return new medea.Material(medea.CreatePassFromShaderPair(name,constants));
	};
	
	
	medea.CreateSimpleMaterialFromVertexColor = function(dummy_light) {
		var name = "remote:mcore/shaders/simple-vertex-color", constants = {
			
		};

		if(dummy_light) {
			name += '-lit';
		}
		return new medea.Material(medea.CreatePassFromShaderPair(name,constants));
	};
	

	medea.CreateSimpleMaterialFromTexture = function(texture, dummy_light, shininess, spec_color, normal_texture) {
		var	name = "remote:mcore/shaders/simple-textured"
		,	constants = {
				texture:texture
			}
		;

		if(dummy_light) {
			name += '-lit';
			if(shininess) {
				name += '-spec';
				if(!spec_color) { 
					spec_color = [1,1,1];
				}

				// cap shininess at 64 to avoid excessive exponentiation
				constants.spec_color_shininess = [
					spec_color[0],
					spec_color[1],
					spec_color[2],
					Math.min(64, shininess)
				];

				if(normal_texture) {
					constants.normal_texture = normal_texture;
					name += '-nm';
				}
			}
		}

		return new medea.Material(medea.CreatePassFromShaderPair(name,constants));
	};
	

	medea.CreateMaterial = function(passes, name) {
		return new medea.Material(passes, name);
	};


	medea.CloneMaterial = function(mat, name, clone_flags) {
		var passes = mat.Passes(), newp = new Array(passes.length);
		for (var i = 0; i < passes.length; ++i) {
			newp[i] = medea.ClonePass(passes[i], clone_flags);
		}
		return new medea.Material(newp, name || mat.Name()+'_clone');
	};

	medea.CreateSimpleMaterialFromShaderPair = function(name, constants, attr_map, defines) {
		return new medea.Material(medea.CreatePassFromShaderPair(name,constants, attr_map, defines));
	};
});

