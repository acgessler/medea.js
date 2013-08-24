
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler
 * licensed under the terms and conditions of a 3 clause BSD license.
 */


 // This file is usable both as regular medea module and as
 // web worker running in parallel to the main page.

 medea.define('worker_terrain',[],function(undefined) {
	"use strict";
	var medea = this;

	medea._GenHeightfieldTangentSpace = function(pos, wv,hv, nor, tan, bit) {
		var sqrt = Math.sqrt, w3 = wv*3;

		// first pass: compute dx, dy derivates for all cells and duplicate
		// the vert last row/column since we have cell_count+1 vertices
		// on each axis.
		for(var y = 0, c = 0; y < hv; ++y, c += 3) {
			for(var x = 0; x < wv-1; ++x, c += 3) {
				tan[c+0] = pos[c+1] - pos[c+3+1];
			}
		}

		for(var y = 0, c = 0; y < hv-1; ++y) {
			for(var x = 0; x < wv; ++x, c += 3) {
				bit[c+2] = pos[c+1] - pos[c+w3+1];
			}
		}

		for(var y = 0, c = w3-3; y < hv; ++y, c += w3) {
			tan[c] = tan[c-3];
		}

		for(var x = 0, c = w3*hv-1; x < wv; ++x,c -= 3) {
			bit[c] = bit[c-w3];
		}

		// second pass: weight two neighboring derivates to compute proper
		// derivates for singular vertices
		for(var y = hv, c = (hv * wv)*3-3; y > 0; --y, c -= 3) {
			for(var x = wv; x > 1; --x, c -= 3) {
				tan[c] = 0.5 * (tan[c] + tan[c-3]);
			}
		}

		for(var y = hv, c = (hv * wv)*3-1; y > 1; --y) {
			for(var x = wv; x > 0; --x, c -= 3) {
				bit[c] = 0.5 * (bit[c] + bit[c-w3]);
			}
		}

		// third pass: normalize tangents and bitangents and derive normals
		// using the cross product of the two former vectors
		for(var y = 0, c = 0; y < hv; ++y) {
			for(var x = 0; x < wv; ++x, c += 3) {
				// *0.5 to get less hard and edgy results
				var txx = 1.0, tyy = tan[c+0], l = sqrt(tyy*tyy+1);
				txx /= l;
				tyy /= l;

				tan[c+0] = txx;
				tan[c+1] = tyy;
				tan[c+2] = 0.0;

				var bzz = 1.0, byy = bit[c+2], l = sqrt(byy*byy+1);
				bzz /= l;
				byy /= l;

				bit[c+0] = 0.0;
				bit[c+1] = byy;
				bit[c+2] = bzz;

				nor[c+0] = -tyy*bzz;
				nor[c+1] = txx*bzz;
				nor[c+2] = -txx*byy;
			}
		}
	};

	medea._GenHeightfieldUVs = function(uv, wv, hv, scale) {
		scale = scale || 1.0;
		for(var y = 0, c = 0; y < hv; ++y) {
			var yd = y/(hv-1);
			for(var x = 0; x < wv; ++x) {
				uv[c++] = x/(wv-1) * scale;
				uv[c++] = yd * scale;
			}
		}
	};

	// public worker interface
	medea._workers.GenHeightfieldTangentSpace = function(pos,wv,hv) {
		// #ifdef LOG
		medea.LogDebug('gen-tangents ' + wv + ' ' + hv);
		// #endif

		var nor = new Float32Array(pos.length);
		var bit = new Float32Array(pos.length);
		var tan = new Float32Array(pos.length);

		medea._GenHeightfieldTangentSpace(pos,wv,hv,nor,tan,bit);

		return {
			nor : nor,
			bit : bit,
			tan : tan
		};
	};
});

