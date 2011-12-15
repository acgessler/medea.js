
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medea._addMod('shader',['filesystem'],function(undefined) {
	"use strict";
	var medea = this, gl = medea.gl;

	medea.SHADER_TYPE_PIXEL = gl.FRAGMENT_SHADER;
	medea.SHADER_TYPE_VERTEX = gl.VERTEX_SHADER;

	medea._initMod('filesystem');

	// cache for compiled shader objects.
	var sh_cache = {
	};


	medea.Shader = medea.Resource.extend( {

		init : function(src, defines, callback) {

			this.type = src.split('.').pop() == 'ps' ? medea.SHADER_TYPE_PIXEL : medea.SHADER_TYPE_VERTEX;
			this.shader = 0;
			this.defines = defines ? medea.Merge(defines,{}) : {};

			// trigger deferred loading
			this._super(src, callback);
		},

		OnDelayedInit : function(data) {

// #ifdef DEBUG
			medea.DebugAssert(typeof data === "string","got unexpected argument, perhaps the source for the shader was not a single resource?");
// #endif

			var c = this._GetCacheName();
			var s = sh_cache[c];
			if(s !== undefined) {
				this.shader = s;
				this._super();
				return;
			}

			s = this.shader = sh_cache[c] = gl.createShader(this.type);
			
			var gen_source = this._PrependDefines(data);
			gl.shaderSource(s,gen_source);

			gl.compileShader(s);
			if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
				medea.NotifyFatal("failure compiling shader " +  this.src + ", error log: " + gl.getShaderInfoLog(s));
				return;
			}

			// mark this resource as complete
			this._super();

			medea.LogDebug("successfully compiled shader " + this.src);
		},

		GetGlShader : function(gl) {
			return this.shader;
		},
		
		_PrependDefines : function(data) {
			var d = this.defines;
			
			var o = '';
			for(var k in d) {
				o += '#define ' + k + ' ' + (d[k] || '') + '\n';
			}
			if (o === '') {
				return data;
			}
			return	'/* !begin medea-generated head! */\n' + o +
					'/* !end medea-generated head! */\n' + data;
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