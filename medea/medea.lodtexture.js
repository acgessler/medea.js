
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler 
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medea._addMod('lodtexture',['texture'],function(undefined) {
	"use strict";
	var medea = this, gl = medea.gl;
	
	var neutral_textures = {}, TEX = gl.TEXTURE_2D;
	
	var DummyTexture = medea.Resource.extend( {
	
		init : function(color) {
			this.texture = gl.createTexture();
			
			gl.bindTexture(TEX, this.texture);
			gl.texImage2D(TEX, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(
				[
					Math.floor(color[0]*255), 
					Math.floor(color[1]*255),
					Math.floor(color[2]*255), 
					Math.floor(color[3]*255)
				]
			));  
			
			// #ifdef DEBUG
			gl.bindTexture(TEX, null);
			// #endif
			
			// #ifdef LOG
			medea.LogDebug("Create neutral 1x1 texture with color: " + color);
			// #endif
		},
		
		GetGlTexture : function() {
			return this.texture;
		},
		
		_Bind : function(slot) {
			slot = slot || 0;
			gl.activeTexture(gl.TEXTURE0 + slot);
			gl.bindTexture(TEX,this.texture);
			return slot;
		}
	});
	
	var CreateNeutralTexture = function(id) {
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
		
			this.textures = [];
			this.textures[0] = CreateNeutralTexture(tuple.neutral);
			
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

