
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler 
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medea._addMod('terraintile',['image','mesh'],function(undefined) {
	"use strict";
	var medea = this;
	
	var IsPowerOfTwo = function(n) {
		return n !== 0 && (n & (n - 1)) === 0;
	};
	
	var GenVerticesFromPow2Image = function(tex, scale) {
		var data = tex.GetData(), w = tex.GetWidth(), h = tex.GetHeight();
		
		var c = (w+1)*(h+1);
		var pos = new Array(c*3), nor = new Array(c*3), uv = new Array(c*2), ipos = 0, iuv = 0;
		
		// this is the index of the "up" output component, left flexible for now.
		var v = 1, v2 = (v+1) % 3, v3 = (v2+1) % 3;
		
		// this is the index of the RGBA component that contains the color data
		var t = 0;
		
		// height scaling
		scale = scale || w/(16*16*16);
		var scale2 = scale/2, scale4 = scale2/2;
		
		// a vertex is the average height of all surrounding quads,
		// a 4x4 heightmap yields a 5x5 point field, so LOD works
		// by leaving out indices.
		var pitch = w*4, opitch = (w+1) * 3;
		for (var y = 1, yb = 0, oyb = 0; y < h; ++y, yb += pitch, oyb += opitch) {
			for(var x = 1; x < w; ++x) {
				var b = yb+x*4, ob = oyb + x*3;

				pos[ob+v] = scale4 * ( data[b+v] + data[b-4+t] + data[b-pitch+t] + data[b-pitch-4+t] );
			}
		}
		
		// y == 0 || y == h
		for(var x = 1, lasty = opitch*h; x < w; ++x) {
			pos[x*3+v] = scale2 * ( data[x*4+t] + data[x*4-4+t] );
			pos[lasty+x*3+v] = scale2 * ( data[x*4-pitch+t] + data[x*4-pitch-4+t] );
		}
		
		// x == 0 || x == w
		for (var y = 1, yb = 0, oyb = 0; y < h; ++y, yb += pitch, oyb += opitch) {
			pos[oyb+v] = scale2 * ( data[yb+t] + data[yb-pitch+t] );
			pos[oyb+w*3+v] = scale2 * ( data[yb-4+t] + data[yb-4-pitch+t] );
		}
		
		// x == 0 && y == 0
		pos[v] = scale*data[t];
		
		// x == w && y == 0
		pos[v + w*3] = scale*data[t + (w-1)*4];
		
		// x == 0 && y == h
		pos[v + h*opitch] = scale*data[t + (h-1)*pitch];
		
		// x == w && y == h
		pos[v + h*opitch + w*3] = scale*data[t + (h-1)*pitch + (w-1)*4];
		
		// populate the two other components
		for (var y = 0, c = 0; y <= h; ++y) {
			for (var x = 0; x <= w; ++x, c+=3) {
				pos[c+v2] = y;
				pos[c+v3] = x;
			}
		}
		
		return [pos,w+1,h+1];
	};
	
	var GenVerticesFromPow2Plus1Image = function(tex) {
		// TODO
	};
	
	var ComputeTangentSpace = function(pos, wv,hv, nor, tan, bit) {
		var sqrt = Math.sqrt;
	
		// first pass: compute dx, dy derivates for all cells and duplicate
		// the vert last row/column since we have cell_count+1 vertices
		// on each axis.
		for(var y = 0, c = 0; y < hv-1; ++y) {
			for(var x = 0; x < wv-1; ++x) {
				tan[c+0] = pos[c+1] - pos[c+3+1];
				tan[c+1] = 1.0;
				tan[c+2] = 1.0;
				
				bit[c+0] = 1.0;
				bit[c+1] = 1.0;
				bit[c+2] = pos[c+1] - pos[c+3*wv+1];
				c += 3;
			}
			c += 3;
		}
		
		for(var y = 0, c = 0; y < hv; ++y, c+= 6) {
			c += (wv-2)*3;
			
			for(var v = 0; v < 3; ++v) {
				tan[c+v] = tan[c+3+v];
				bit[c+v] = bit[c+3+v];
			}
		}
		
		for(var x = 0, w3 = wv*3, c = w3*(hv-1); x < wv; ++x) {
			for(var v = 0; v < 3; ++v) {
				tan[c+v] = tan[c-w3+v];
				bit[c+v] = bit[c-w3+v];
			}
		}
		
		// second pass: weight two neighboring derivates to compute proper
		// derivates for singular vertices
		for(var y = hv, c = (hv * wv)*3-3; y > 0; --y) {
			for(var x = wv; x > 0; --x) {
				tan[c+0] = 0.5 * (tan[c] + tan[c-3]);
				bit[c+2] = 0.5 * (bit[c+2] + bit[c+2-3*wv]);
				c -= 3;
			}
		}
		
		// third pass: normalize tangents and bitangents and derive normals
		// using the cross product of the two former vectors
		for(var y = 0, c = 0; y < hv; ++y) {
			for(var x = 0; x < wv; ++x, c+= 3) {
			
				var txx = tan[c+0], tyy = tan[c+1], l = sqrt(txx*txx+1);
				txx /= l;
				tyy /= l;
				
				tan[c+0] = txx;
				tan[c+1] = tyy;
				tan[c+2] = tyy;
				
				var bzz = bit[c+2], byy = bit[c+1], l = sqrt(bzz*bzz+1);
				bzz /= l;
				byy /= l;
				
				bit[c+0] = byy;
				bit[c+1] = byy;
				bit[c+2] = bzz;
				
				nor[c+0] = tyy*bzz - tyy*byy;
				nor[c+1] = tyy*byy - txx*bzz;
				nor[c+2] = txx*byy - tyy*byy;
				
				nor[c+0] *= 0.5;
				nor[c+2] *= 0.5;
			}
		}
	};
	
	var ComputeUVs = function(uv, wv, hv) {
		for(var y = 0, c = 0; y < hv; ++y) {
			var yd = y/(hv-1);
			for(var x = 0; x < wv; ++x) {
				uv[c++] = x/(wv-1);
				uv[c++] = yd;
			}
		}
	};
	
	var ComputeIndices = function(ind, qtx, qty) {
		var min = Math.min;
		
		// index the terrain patch in groups of 4x4 quads to improve vertex cache locality
		for (var ty = 0, out = 0; ty < (qty+3)/4; ++ty) {
			for (var tx = 0; tx < (qtx+3)/4; ++tx) {
				var fullx = tx*4, fully = ty*4;

				for (var y = fully,bc=fully*(qtx+1)+fullx; y < min(fully+4,qty); ++y,bc+=(qtx+1)-4) {
					for (var x = fullx; x < min(fullx+4,qtx); ++x,++bc) {
						
						ind[out++] = bc;
						ind[out++] = bc+qtx+1;
						ind[out++] = bc+1;

						ind[out++] = bc+qtx+1;
						ind[out++] = bc+qtx+2;
						ind[out++] = bc+1;
					}
				}
			}
		}
	};
	
		
	medea.CreateTerrainTileMesh = function(height_map, material, callback) {
		medea.CreateImage(height_map, function(tex) {

			var data = tex.GetData(), w = tex.GetWidth(), h = tex.GetHeight();
			
			// the minimum size is chosen to get rid of nasty out-of-bounds checks during LOD generation
			if (w < 16 || h < 16) {
				// #ifdef DEBUG
				medea.DebugAssert("minimum size for terrain tile is 16x16");
				// #endif
				return;
			}
			
			var v;

			if (IsPowerOfTwo(w) && IsPowerOfTwo(h)) {
				v = GenVerticesFromPow2Image(tex);
			}
			else if (IsPowerOfTwo(w-1) && IsPowerOfTwo(h-1)) {
				v = GenVerticesFromPow2Plus1Image(tex);
				--w, --h;
			}
			else {
				// #ifdef DEBUG
				medea.DebugAssert("source for terrain tile must be either a power-of-two or a power-of-two-minus-one grid");
				// #endif
				return;
			}
			
			var pos = v[0], wv = v[1], hv = v[2];
			
			var nor = new Array(pos.length), tan = new Array(pos.length), bit = new Array(pos.length);
			ComputeTangentSpace(pos, wv, hv, nor, tan, bit);
			
			var uv = new Array(wv*hv*2);
			ComputeUVs(uv,wv,hv);
			
			var indices = new Array(w*h*2*3);
			ComputeIndices(indices,w,h);
			
			callback(medea.CreateSimpleMesh({ positions: pos, normals: nor, uvs: [uv]}, indices, material, callback));
		});
	};
});
