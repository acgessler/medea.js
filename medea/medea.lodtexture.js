
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medea.define('lodtexture',['texture'],function(undefined) {
	"use strict";
	var medea = this, gl = medea.gl;

	var neutral_textures = {}, TEX = gl.TEXTURE_2D;

	medea._initMod('texture');
	var DummyTexture = medea.DummyTexture;
	

	medea.CreateNeutralTexture = function(id) {
		if (id === 'normals') {
			// neutral normal map, i.e. y vector facing upwards as if there
			// were no normal map at all.
			id = [0.0,0.0,1.0,0.0];
		}
		else if (id.length === 3) {
			id = [id[0],id[1],id[2],1.0];
		}

		if (id.length === 4) {
			if (id in neutral_textures) {
				return neutral_textures[id];
			}
			return neutral_textures[id] = new DummyTexture(id);
		}

		// #ifdef LOG
		medea.LogDebug("neutral texture name not recognized: " + id);
		// #endif

		return medea.CreateDefaultTexture();
	};


	medea.LODTexture = medea.Resource.extend( {

		init : function(tuple, callback, no_client_cache) {

			this.textures = [null,null,null];
			this.textures[0] = medea.CreateNeutralTexture(tuple.neutral);

			// load the low-resolution version of the texture and mark the resource
			// as complete as soon as we have it.
			var outer = this;
			this.textures[1] = medea.CreateTexture( tuple.low, function() {
				outer.OnDelayedInit();
				if(callback) {
					callback();
				}
			}, no_client_cache );

			this.textures[2] = function() {
				outer.textures[2] = medea.CreateTexture( tuple.high, function() {
					outer.cur = 2;
				}, no_client_cache );
			};
			this.cur = 0;
		},

		Dispose : function() {
			for(var i = this.textures.length-1; i >= 0; --i) {
				this.textures[i].Dispose();
				this.textures[i] = null;
			}
		},

		OnDelayedInit : function() {
			this.cur = 1;
			this._super();

			this.textures[2]();
		},

		GetGlTexture : function() {
			return this.textures[this.cur].GetGlTexture();
		},


		_Bind : function(slot) {
			return this.textures[this.cur]._Bind(slot);
		},
	});

	medea.CreateLODTexture = function(tuple, callback) {
		return new medea.LODTexture(tuple, callback);
	}
});

