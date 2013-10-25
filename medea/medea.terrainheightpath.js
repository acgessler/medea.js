
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medealib.define('terrainheightpath',['entity'],function(undefined) {
	"use strict";
	var medea = this;

	medea._initMod('entity');

	var TerrainHeightPath = medea.Entity.extend(
	{
		init : function(terrain, height_offset, smooth_factor) {
			this.terrain = terrain;
			this.height_offset = height_offset === undefined ? 2.0 : height_offset;
			this.smooth_factor = smooth_factor || 0.06;
			this.seen = {};

// #ifdef DEBUG
			medealib.DebugAssert(this.terrain instanceof medea.TerrainNode, "need valid terrain node");
// #endif
		},

		Render : function(viewport,entity,node,rqmanager) {
			// nothing to be done
		},

		Update : function(dtime,node) {
			var ppos = node.GetWorldPos();
			var h = this.terrain.GetWorldHeightForWorldPos(ppos[0],ppos[2]);

			if (h === null) {
				// outside the terrain or terrain not present yet, do not touch.
			}
			else {
				ppos[1] = this.height_offset + h;

				var t = vec3.create();
				mat4.multiplyVec3(node.parent.GetInverseGlobalTransform(),ppos,t);

				if (this.smooth_factor && node.id in this.seen) {
					var f = Math.pow(this.smooth_factor,dtime), oldh = t[1] - this.height_offset*0.5;
					t = vec3.add( vec3.scale(t,1.0 - f), vec3.scale(node.LocalPos(), f) );

					// add lower limit to make sure we don't fall below the terrain
					t[1] = Math.max(t[1], oldh);
				}

				node.LocalPos(t);
				this.seen[node.id] = true;
			}
		},

		HeightOffset : function(h) {
			if (h === undefined) {
				return this.height_offset;
			}
			this.height_offset = h;
		},

		SmoothFactor : function(h) {
			if (h === undefined) {
				return this.smooth_factor;
			}
			this.smooth_factor = h;
		},
	});

	medea.CreateTerrainHeightPathAnimator = function(terrain, ho) {
		return new TerrainHeightPath(terrain, ho);
	};
});