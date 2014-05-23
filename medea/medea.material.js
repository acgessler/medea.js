
/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('material',['pass'],function(medealib, undefined) {
	"use strict";
	var medea = this, gl = medea.gl;


	medea.MATERIAL_CLONE_COPY_STATE 		= 0x1;
	medea.MATERIAL_CLONE_SHARE_STATE 		= 0x2;

	medea.MATERIAL_CLONE_COPY_CONSTANTS 	= 0x4;
	medea.MATERIAL_CLONE_SHARE_CONSTANTS 	= 0x8;


	// class Material
	medea.Material = medealib.Class.extend({
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
				medealib.DebugAssert("need at least one pass for a material to be complete");
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
				medealib.DebugAssert('pass index out of range, cannot add pass if there is no pass that preceedes it: ' + n);
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
			var id = 0
			,	passes = this.passes;
			for(var i = passes.length - 1; i >= 0; --i) {
				id ^= passes[i].GetProgramId();
			}
			return id;
		},

		Name : medealib.Property(this,'name'),

		Use: function(drawfunc, statepool, semantic, change_flags) {
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
				if(!pass.Begin(statepool, change_flags)) {
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


	// Create a clone of a given |mat|, with |name| being the name of
	// the clone material. 
	//
	// |clone_flags| is a bitwise ORed combination of the medea.MATERIAL_CLONE_XXX
	// constants and describes whether constants and render state are shared
	// between original and copy or whether the clone receives a deep copy.
	//
	// When sharing state between clones, care must be taken - medea does
	// not retain the information that clonest exist, so there will be
	// no debugging aid and state changes may easily have unintended
	// side-effects. As a trade-off, sharing state greatly reduces necessary
	// GL state changes and thereby improves performance.
	//
	// |clone_flags| default to MATERIAL_CLONE_COPY_CONSTANTS | medea.MATERIAL_CLONE_COPY_STATE
	medea.CloneMaterial = function(mat, clone_flags, name) {
		// #ifdef DEBUG
		medealib.DebugAssert(Object.prototype.toString.call(clone_flags) != '[object String]',
			"Breaking API change (2015-05-23): CloneMaterial(); name is now the last parameter");
		// #endif
		if (clone_flags === undefined) {
			clone_flags = medea.MATERIAL_CLONE_COPY_CONSTANTS | medea.MATERIAL_CLONE_COPY_STATE
		}
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

