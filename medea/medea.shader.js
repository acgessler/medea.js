
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medea._addMod('shader',['filesystem','cpp/cpp.js'],function(undefined) {
	"use strict";
	var medea = this, gl = medea.gl;

	medea.SHADER_TYPE_PIXEL = gl.FRAGMENT_SHADER;
	medea.SHADER_TYPE_VERTEX = gl.VERTEX_SHADER;

	medea._initMod('filesystem');

	// cache for compiled shader objects.
	var sh_cache = {
	};
	
	// predefined macros
	var default_defines = {
		'GL_ES' : ''
	};

	medea.Shader = medea.Resource.extend( {

		init : function(src, defines, callback) {

			this.type = src.split('.').pop() == 'ps' 
				? medea.SHADER_TYPE_PIXEL 
				: medea.SHADER_TYPE_VERTEX;
				
			this.shader = 0;
			this.defines = medea.Merge(defines || {},default_defines);

			// trigger deferred loading
			this._super(src, callback);
		},

		OnDelayedInit : function(data) {
// #ifdef DEBUG
			medea.DebugAssert(typeof data === "string","got unexpected argument, perhaps " 
				+ "the source for the shader was not a single resource?"
			);
// #endif
			this.source = data;

			var c = this._GetCacheName();
			var s = sh_cache[c];
			if(s !== undefined) {
				this.gen_source = s.gen_source;
				this.shader = s.shader;
				this._super();
				return;
			}
			
			var self = this;
			
			// preprocessing shaders is asynchronous
			var settings = {
				include_func : function(file, is_global, resumer) {
					if (!is_global) {
						file = medea._GetPath(self.src) + file;
					}
					
					alert(file);
					medea.Fetch(file,
						function(data) {
						alert(data);
							resumer(data);
						},
						function(error) {
							resumer(null);
						}
					);
				},
				
				completion_func : function(data) {
					self.gen_source = data;
					s = self.shader = gl.createShader(self.type);

					// create a new cache entry for this shader
					sh_cache[c] = {
						shader : self.shader,
						source : self.source,
						gen_source : self.gen_source
					};
					
					// compile the preprocessed shader
					gl.shaderSource(s,self.gen_source);
					gl.compileShader(s);
					
					if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
						medea.NotifyFatal("failure compiling shader " +  self.src 
							+ ", error log: " + gl.getShaderInfoLog(s)
						);
						return;
					}

					// mark this resource as complete
					self._super();

					medea.LogDebug("successfully compiled shader " 
						+ self.src
					);
				},
				
				error_func : function(message) {
					medea.NotifyFatal("failure preprocessing shader " 
						+ ": " + message
					);
					return;
				}
			};
			
			var cpp = cpp_js(settings);
			cpp.define_multiple(this.defines);
			this.gen_source = cpp.run(data, this.src);
			
			// do _not_ mark the resource as complete yet. This is done
			// in the completion_func above, which is invoked by cpp.js.
		},
		
		GetSourceCode : function() {
			return this.source;
		},
		
		GetPreProcessedSourceCode : function() {
			return this.gen_source;
		},

		GetGlShader : function(gl) {
			return this.shader;
		},

		_GetCacheName : function() {
			var o = this.src;

			if (this.defines) {
				var d = this.defines;
				o += '#';
				for(var k in d) {
					o += k+'='+(d[k] || '');
				}
			}
			return o;
		},
	});

	medea.CreateShader = function(res, defines, callback) {
		return new medea.Shader(res, defines, callback);
	}
});
