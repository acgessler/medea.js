
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medea._addMod('terrainheightpath',['entity'],function(undefined) {
	"use strict";
	var medea = this;
	
	var TerrainHeightPath = medea.Entity.extend(
	{
		init : function(terrain, height_offset) {
			this.terrain = terrain;
			this.height_offset = height_offset === undefined ? 2.0 : height_offset;

// #ifdef DEBUG
			medea.DebugAssert(this.terrain instanceof medea.TerrainNode, "need valid terrain node");
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
				node.LocalPos(t);
			}
		},

		HeightOffset : function(h) {
			if (h === undefined) {
				return this.height_offset;
			}
			this.height_offset = h;
		},
	});
	
	medea.CreateTerrainHeightPathAnimator = function(terrain, ho) {
		return new TerrainHeightPath(terrain, ho);
	};
});