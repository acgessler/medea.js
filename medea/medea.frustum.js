
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medea._addMod('frustum',[],function(undefined) {
	"use strict";
	var medea = this, min = Math.min, max = Math.max;

	// temporary storage for medea.BBInFrustum()
	var vt = vec3.create();
	var vtemp = vec3.create();

	// BB_INFINITE and BB_EMPTY are defined in the "node" module

	medea.CreateBB = function(vmin,vmax, mat) {
		var min_def = [1e10,1e10,1e10], max_def = [-1e10,-1e10,-1e10];
		return mat ? [vmin || min_def, vmax || max_def, mat] : [vmin || min_def, vmax || max_def];
	};

	medea.TransformBB = function(b,mat) {
		if(b === medea.BB_INFINITE || b === medea.BB_EMPTY) {
			return b;
		}

		if (b.length === 2) {
			return [b[0],b[1],mat4.create(mat)];
		}
		return [b[0],b[1],mat4.multiply(mat,b[2],mat4.create())];
	};

	medea.IsValidBB = function(bb) {
		return bb[0] < bb[1];
	};

	medea.MergeBBs = function(bbs) {
		if(!bbs.length) {
			return medea.BB_EMPTY;
		}

		var bout = medea.CreateBB();
		var bmin = bout[0], bmax = bout[1], p;

		for(var i = 0; i < bbs.length; ++i) {
			var b = bbs[i];

			if(b === medea.BB_INFINITE) {
				return medea.BB_INFINITE;
			}
			else if(b === medea.BB_EMPTY) {
				continue;
			}

			if (b.length === 2) {
				bmin[0] = min(bmin[0], b[0][0]);
				bmin[1] = min(bmin[1], b[0][1]);
				bmin[2] = min(bmin[2], b[0][2]);

				bmax[0] = max(bmax[0], b[1][0]);
				bmax[1] = max(bmax[1], b[1][1]);
				bmax[2] = max(bmax[2], b[1][2]);
			}
			else {
				if (!p) {
					p = new Array(8);
				}
				p[0] = [b[0][0],b[0][1],b[0][2]];
				p[1] = [b[0][0],b[0][1],b[1][2]];
				p[2] = [b[0][0],b[1][1],b[1][2]];
				p[3] = [b[0][0],b[1][1],b[0][2]];
				p[4] = [b[1][0],b[0][1],b[0][2]];
				p[5] = [b[1][0],b[0][1],b[1][2]];
				p[6] = [b[1][0],b[1][1],b[1][2]];
				p[7] = [b[1][0],b[1][1],b[0][2]];

				for (var n = 0; n < 8; ++n) {
					mat4.multiplyVec3( b[2], p[n], p[n] );

					var pn = p[n];
					bmin[0] = min(bmin[0], pn[0]);
					bmin[1] = min(bmin[1], pn[1]);
					bmin[2] = min(bmin[2], pn[2]);

					bmax[0] = max(bmax[0], pn[0]);
					bmax[1] = max(bmax[1], pn[1]);
					bmax[2] = max(bmax[2], pn[2]);
				}
			}
		}
		return bout;
	};

	medea.NormalizePlane = function(p,p_out) {
		if (!p_out) {
			p_out = p;
		}
		else p_out.length = 4;

		var l = Math.sqrt( p[0]*p[0] + p[1]*p[1] + p[2]*p[2] );
		// #ifdef DEBUG
		medea.DebugAssert(l > 1e-8,'length of plane normal is 0');
		// #endif

		p_out[0] = p[0] / l;
		p_out[1] = p[1] / l;
		p_out[2] = p[2] / l;
		p_out[3] = p[3] / l;
		return p_out;
	};

	medea.ExtractFrustum = function(view, proj) {
		var vp = mat4.multiply(proj, view, mat4.create());
		var f = [
			// left plane
			[
			 vp[3] + vp[0],
			 vp[7] + vp[4],
			 vp[11] + vp[8],
			 vp[15] + vp[12]
			],

			// right plane
			[
			 vp[3] - vp[0],
			 vp[7] - vp[4],
			 vp[11] - vp[8],
			 vp[15] - vp[12]
			],

			// near plane
			[
			 vp[3] + vp[2],
			 vp[7] + vp[6],
			 vp[11] + vp[10],
			 vp[15] + vp[14]
			],

			// far plane
			[
			 vp[3] - vp[2],
			 vp[7] - vp[6],
			 vp[11] - vp[10],
			 vp[15] - vp[14]
			],

			// bottom plane
			[
			 vp[3] + vp[1],
			 vp[7] + vp[5],
			 vp[11] + vp[9],
			 vp[15] + vp[13]
			],

			// top plane
			[
			 vp[3] - vp[1],
			 vp[7] - vp[5],
			 vp[11] - vp[9],
			 vp[15] - vp[13]
			],
		];

		for (var i = 0; i < 6; ++i) {
			medea.NormalizePlane(f[i]);
		}

		return f;
	};

	medea.PointInFrustum = function(f, v) {
		var v0 = v[0];
		for (var i = 0; i < 6; ++i) {
			var ff = f[i];
			if (ff[0] * v0 + ff[1] * v[1] + ff[2] * v[2] + v[3] <= 0) {
				return false;
			}
		}
		return true;
	};

	medea.BBInFrustum = function(f, bb, plane_hint) {
		if (bb === medea.BB_INFINITE) {
			return medea.VISIBLE_ALL;
		}

		if (bb === medea.BB_EMPTY) {
			return medea.VISIBLE_NONE;
		}

		if (!plane_hint) {
			plane_hint = [0];
		}

		var min = bb[0], max = bb[1], t = 0;

		var min0 = min[0];
		var min1 = min[1];
		var min2 = min[2];

		var max0 = max[0];
		var max1 = max[1];
		var max2 = max[2];

		// AABB
		if (bb.length === 2) {
			for (var i = plane_hint[0], ii = 0; ii < 6; ++ii, ++i) {
				if (i === 6) {
					i = 0;
				}
				var ff = f[i], c = 0;
				if (ff[0] * min0 + ff[1] * min1 + ff[2] * min2 + ff[3] > 0) {
					++c;
				}
				if (ff[0] * max0 + ff[1] * min1 + ff[2] * min2 + ff[3] > 0) {
					++c;
				}
				if (ff[0] * max0 + ff[1] * max1 + ff[2] * min2 + ff[3] > 0) {
					++c;
				}
				if (ff[0] * max0 + ff[1] * max1 + ff[2] * max2 + ff[3] > 0) {
					++c;
				}
				if (ff[0] * max0 + ff[1] * min1 + ff[2] * max2 + ff[3] > 0) {
					++c;
				}
				if (ff[0] * min0 + ff[1] * max1 + ff[2] * max2 + ff[3] > 0) {
					++c;
				}
				if (ff[0] * min0 + ff[1] * max1 + ff[2] * min2 + ff[3] > 0) {
					++c;
				}
				if (ff[0] * min0 + ff[1] * min1 + ff[2] * max2 + ff[3] > 0) {
					++c;
				}

				if (!c) {
					plane_hint[0] = i;
					return medea.VISIBLE_NONE;
				}
				if (c === 8) {
					++t;
				}
			}
		}
		// OBB
		else {
			var mat = bb[2];
			for (var i = plane_hint[0], ii = 0; ii < 6; ++ii, ++i) {
				if (i === 6) {
					i = 0;
				}
				var ff = f[i], c = 0;

				// vtemp and vt are global to avoid the extra allocation
				vtemp[0] = min0;
				vtemp[1] = min1;
				vtemp[2] = min2;
				mat4.multiplyVec3(mat,vtemp, vt);
				if (ff[0] * vt[0] + ff[1] * vt[1] + ff[2] * vt[2] + ff[3] > 0) {
					++c;
				}

				vtemp[0] = min0;
				vtemp[1] = max1;
				vtemp[2] = min2;
				mat4.multiplyVec3(mat,vtemp, vt);
				if (ff[0] * vt[0] + ff[1] * vt[1] + ff[2] * vt[2] + ff[3] > 0) {
					++c;
				}

				vtemp[0] = min0;
				vtemp[1] = max1;
				vtemp[2] = max2;
				mat4.multiplyVec3(mat,vtemp, vt);
				if (ff[0] * vt[0] + ff[1] * vt[1] + ff[2] * vt[2] + ff[3] > 0) {
					++c;
				}

				vtemp[0] = min0;
				vtemp[1] = min1;
				vtemp[2] = max2;
				mat4.multiplyVec3(mat,vtemp, vt);
				if (ff[0] * vt[0] + ff[1] * vt[1] + ff[2] * vt[2] + ff[3] > 0) {
					++c;
				}

				vtemp[0] = max0;
				vtemp[1] = min1;
				vtemp[2] = min2;
				mat4.multiplyVec3(mat,vtemp, vt);
				if (ff[0] * vt[0] + ff[1] * vt[1] + ff[2] * vt[2] + ff[3] > 0) {
					++c;
				}

				vtemp[0] = max0;
				vtemp[1] = max1;
				vtemp[2] = min2;
				mat4.multiplyVec3(mat,vtemp, vt);
				if (ff[0] * vt[0] + ff[1] * vt[1] + ff[2] * vt[2] + ff[3] > 0) {
					++c;
				}

				vtemp[0] = max0;
				vtemp[1] = max1;
				vtemp[2] = max2;
				mat4.multiplyVec3(mat,vtemp, vt);
				if (ff[0] * vt[0] + ff[1] * vt[1] + ff[2] * vt[2] + ff[3] > 0) {
					++c;
				}

				vtemp[0] = max0;
				vtemp[1] = min1;
				vtemp[2] = max2;
				mat4.multiplyVec3(mat,vtemp, vt);
				if (ff[0] * vt[0] + ff[1] * vt[1] + ff[2] * vt[2] + ff[3] > 0) {
					++c;
				}

				if (!c) {
					plane_hint[0] = i;
					return medea.VISIBLE_NONE;
				}
				if (c === 8) {
					++t;
				}
			}
		}
		return t === 6 ? medea.VISIBLE_ALL : medea.VISIBLE_PARTIAL;
	};
});




