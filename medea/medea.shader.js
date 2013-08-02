
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medea._addMod('shader',['filesystem','cpp.js'],function(undefined) {
	"use strict";
	var medea = this, gl = medea.gl;

	medea.SHADER_TYPE_PIXEL = gl.FRAGMENT_SHADER;
	medea.SHADER_TYPE_VERTEX = gl.VERTEX_SHADER;

	medea._initMod('filesystem');

	// counter for getting shader ids from
	var shader_id_counter = 0;

	// cache for compiled shader objects
	var sh_cache = {
	};

	// predefined macros
	var default_defines = {
		'GL_ES' : ''
	};

	var re_toplevel = /^\s*toplevel\(\s*"\s*(.+)\s*"\s*\)\s*$/;

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

			// _super() is dynamically assigned and ceases to exist as soon
			// as OnDelayedInit returns, so we need to grab a ref.
			var self = this;
			var call_outer_super = self._super;
	

			// check if the shader has already been loaded or is currently
			// being fetched/compiled.
			var c = this._GetCacheName();
			var s = sh_cache[c];
			if(s !== undefined) {
				var commit = function(s) {
					self.gen_source = s.gen_source;
					self.shader = s.shader;
					self.shader_id = s.shader_id;
					call_outer_super.apply(self);
				};
				if(Array.isArray(s)) {
					// loading is in process, wait for it.
					s.push(commit);
				}
				else {
					commit(s);
				}
				return;
			}

			var waiters = sh_cache[c] = [];

			// additional top-level declarations are specified in-place using
			// #pragma toplevel. Each time cpp.js encounters one, it invokes
			// settings.pragma_func.
			var top_level_decls = [];


			// preprocessing shaders is asynchronous
			var settings = {
				include_func : function(file, is_global, resumer) {
					if (!is_global) {
						file = medea._GetPath(self.src) + file;
					}

					medea.Fetch(file,
						function(data) {
							resumer(data);
						},
						function(error) {
							resumer(null);
						}
					);
				},

				completion_func : function(data) {
					// #ifdef DEBUG
					medea.DebugAssert(!!data,'unexpected null');
					// #endif
					self.gen_source = top_level_decls.join('\n') + '\n' + data;
					s = self.shader = gl.createShader(self.type);

					self.shader_id = ++shader_id_counter;

					// create a new cache entry for this shader
					var entry = sh_cache[c] = {
						shader : self.shader,
						source : self.source,
						gen_source : self.gen_source,
						shader_id : self.shader_id
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
					call_outer_super.apply(self);

					// callback all waiters
					for (var i = 0, e = waiters.length; i < e; ++i) {
						waiters[i](entry);
					}

					medea.LogDebug("successfully compiled shader "
						+ self.src
					);
				},

				error_func : function(message) {
					medea.NotifyFatal("failure preprocessing shader "
						+ ": " + message
					);
					return;
				},

				pragma_func : function(pragma_text) {
					var r = re_toplevel.exec(pragma_text);
					if (!r) {
						medea.NotifyFatal("syntax error in #pragma toplevel: " + pragma_text);
						return null;
					}

					top_level_decls.push(r[1]);
					return true;
				},
			};

			var cpp = cpp_js(settings);
			cpp.define_multiple(this.defines);
			cpp.run(data, this.src);

			// do _not_ mark the resource as complete yet. This is done
			// in the completion_func above, which is invoked by cpp.js.
		},

		GetSourceCode : function() {
			return this.source;
		},

		GetPreProcessedSourceCode : function() {
			return this.gen_source;
		},

		GetGlShader : function() {
			return this.shader;
		},

		GetShaderId : function() {
			return this.shader_id;
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
