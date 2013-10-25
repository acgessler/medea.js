
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medealib.define('materialgen',['shader','material'],function(undefined) {
	"use strict";
	var medea = this, gl = medea.gl;

	var semik = ';';

	var raw_vertex_shader = 
		"#include <remote:mcore/shaders/core.vsh>\n" +

		"void main()" +
		"{" + 
			"PassClipPosition(ModelToClipSpace(FetchPosition()));" + 
			"PassNormal(ModelNormalToWorldSpace(FetchNormal()));" +
			"PassTexCoord(FetchTexCoord());" +
		"}";


	var raw_fragment_shader = 
		"uniform sampler2D texture;" +
		"$lighting_uniforms" +

		"#include <remote:mcore/shaders/core.psh>\n" +
		"void ComputeLighting(vec3 _normal, out vec3 _diffuse, out vec3 _specular, out vec3 _ambient) {" +
		"	$lighting_body" +
		"} " +

		"void main()" +
		"{" +
			"vec3 normal = FetchNormal(); " +

			"vec3 diffuse = vec3(0.0,0.0,0.0);" +
			"vec3 specular = vec3(0.0,0.0,0.0);" +
			"vec3 ambient = vec3(0.0,0.0,0.0);" +
			"ComputeLighting(normal, diffuse, specular, ambient); " +

			"vec4 texture = texture2D(texture, FetchTexCoord() ); " +
			"gl_FragColor.rgba = texture * vec4(diffuse,1.0) + vec4(specular,0.0) + vec4(ambient,0.0);" +
		"}";


	// class MaterialGen
	medea.MaterialGen = medea.Class.extend({
		name : "",
		mat_gen : null,

		init : function(blorb) {
		},

		Update : function(statepool, passes) {

			// #ifdef DEBUG
			medea.DebugAssert (passes.length > 1, 'not a generated pass');
			// #endif

			if(passes.length === 0) {
				var vertex = this.GenVertexShader(statepool);
				var fragment = this.GenFragmentShader(statepool);

				
			}
			else if(passes.length === 1) {
				return;
			}
		},

		GenFragmentShader : function(state) {
			var fragment_code = new String(raw_fragment_shader);

			var dir_lights = state.Get("DIR_LIGHTS");

			var lighting_uniforms = [];
			var lighting_code = "";
			for(var i = 0; i < dir_lights.length; ++i) {
				var light = dir_lights[i];
				var snippet = this.EvaluateDirectionalLight();

				uniforms.push("vec3 LIGHT_D"+i+"_DIR");

				lighting_code += "{";
				lighting_code += snippet.prefix
					.replace('$normal_world', '_normal')
					.replace('$light_dir_world', "LIGHT_D"+i+"_DIR") + semik;

				lighting_code += "_diffuse += "  + snippet.diffuse  + semik;
				lighting_code += "_specular += " + snippet.specular + semik;
				lighting_code += "_ambient += "  + snippet.ambient  + semik;
				lighting_code += "}";
			}

			// TODO: point and spot lights

			fragment_code = fragment_code
				.replace('$lighting_body', lighting_code);
				.replace('$lighting_uniforms', lighting_uniforms.join(";\n"));

			return fragment_code;
		}

		GeVertexShader : function(state) {
			var vertex_code = new String(raw_vertex_shader);
			return vertex_code;
		}

		EvaluateDirectionalLight : function() {
			return {
				prefix		: 'float strength = dot($normal_world, $light_dir_world)'
				diffuse 	: 'strength * $light_diffuse_color'
				specular 	: 'strength * $light_specular_color'
				ambient		: '$light_ambient_color'
			};
		},

		EvaluatePointLight : function() {
			return {
				prefix		: 
					'vec3 dir = $pos_world - $light_pos_world; \
					 float distance = length(dir); \
					 float attenuation = 1.0-clamp(distance/$light_range,0.0,1.0); \
					 float strength = dot($normal_world, dir) * attenuation'
				diffuse 	: 'strength * $light_diffuse_color'
				specular 	: 'strength * $light_specular_color'
				ambient		: '$light_ambient_color'
			};
		},

		EvaluateSpotLight : function() {
			return {
				prefix		: 
					'vec3 dir = $pos_world - $light_pos_world; \
					 float distance = length(dir); \
					 float attenuation = 1.0-clamp(distance/$light_range,0.0,1.0); \
					 float angle = smoothstep($light_spot_angle_inner, $light_spot_angle_outer) \
					 	* dot($light_dir_world, normalize(distance))
					 float strength = dot($normal_world, dir) * attenuation * angle;'
				diffuse 	: 'strength * $light_diffuse_color'
				specular 	: 'strength * $light_specular_color'
				ambient		: '$light_ambient_color'
			};
		}
	});

	medea.CreateMaterialGen = function(color, dummy_light) {
		return new medea.MaterialGen();
	};
});
