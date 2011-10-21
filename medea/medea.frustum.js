
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander Ċ. Gessler 
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medea._addMod('frustum',[],function(undefined) {
	var medea = this, min = Math.min, max = Math.max;
	
	medea.BB_INFINITE = 'i';
	medea.BB_EMPTY = 'e';
	
	medea.CreateBB = function(vmin,vmax) {
		return [vmin || [1e10,1e10,1e10], vmax || [-1e10,-1e10,-1e10]];
	};
	
	medea.TransformBB = function(b,mat,dest) {
		if(dest === undefined) {
			dest = b;
		}
		
		if(b === medea.BB_INFINITE || b === medea.BB_EMPTY) {
			dest[0] = b[0];
			dest[1] = b[1];
			return dest;
		}
			
		mat4.multiplyVec3(mat,b[0],dest[0]);
		mat4.multiplyVec3(mat,b[1],dest[1]);
		return dest;
	};
	
	medea.IsValidBB = function(bb) {
		return bb[0] < bb[1];
	};
	
	medea.MergeBBs = function(bbs) {
		var bout = medea.CreateBB();
		var bmin = bout[0], bmax = bout[1];
		for(var i = 0; i < bbs.length; ++i) {
			var b = bbs[i];
			
			if(b === medea.BB_INFINITE) {
				bout = medea.BB_INFINITE;
				break;
			}
			else if(b === medea.BB_EMPTY) {
				continue;
			}
			
			bmin[0] = min(bmin[0], b[0][0]);
			bmin[1] = min(bmin[1], b[0][1]);
			bmin[2] = min(bmin[2], b[0][2]);
			
			bmax[0] = max(bmax[0], b[1][0]);
			bmax[1] = max(bmax[1], b[1][1]);
			bmax[2] = max(bmax[2], b[1][2]);
		}
		return bout;
	};
});


