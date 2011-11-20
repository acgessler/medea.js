
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
	
	medea._HeightfieldFromEvenSidedHeightmap = function(tex, scale, xz_scale, t, v) {
		var data = tex.GetData(), w = tex.GetWidth(), h = tex.GetHeight();
		
		var c = (w+1)*(h+1);
		var pos = new Array(c*3);
		
		// this is the index of the "up" output component, left flexible for now.
		v = v === undefined ? 1 : v;
        var v2 = (v+1) % 3, v3 = (v2+1) % 3;
		
		// this is the index of the RGBA component that contains the color data
		t = t === undefined ? 0 : t;
		
		// height scaling
		scale = scale || w/(16*16*16);
		var scale2 = scale/2, scale4 = scale2/2;
		xz_scale = xz_scale || 1.0;
		
		// a vertex is the average height of all surrounding quads,
		// a 4x4 heightmap yields a 5x5 point field, so LOD works
		// by leaving out indices.
		var pitch = w*4, opitch = (w+1) * 3;
		for (var y = 1, yb = pitch, oyb = opitch; y < h; ++y, yb += pitch, oyb += opitch) {
			for(var x = 1, ob = oyb + 3; x < w; ++x, ob += 3) {
				var b = yb+x*4;

				pos[ob+v] = scale4 * ( data[b+t] + data[b-4+t] + data[b-pitch+t] + data[b-pitch-4+t] );
			}
		}
		
		// y == 0 || y == h
		for(var x = 1, lasty = opitch*h, lastyin = pitch*(h-1); x < w; ++x) {
			pos[x*3+v] = scale2 * ( data[x*4+t] + data[x*4-4+t] );
			pos[lasty+x*3+v] = scale2 * ( data[lastyin+x*4-pitch+t] + data[lastyin+x*4-pitch-4+t] );
		}
		
		// x == 0 || x == w
		for (var y = 1, yb = pitch, oyb = opitch; y < h; ++y, yb += pitch, oyb += opitch) {
			pos[oyb+v] = scale2 * ( data[yb+t] + data[yb-pitch+t] );
			pos[oyb+(opitch-3)+v] = scale2 * ( data[yb-4+t] + data[yb-4-pitch+t] );
		}
		
		// x == 0 && y == 0
		pos[v] = scale*data[t];
		
		// x == w && y == 0
		pos[v + w*3] = scale*data[t + pitch-4];
		
		// x == 0 && y == h
		pos[v + h*opitch] = scale*data[t + (h-1)*pitch];
		
		// x == w && y == h
		pos[v + h*opitch + w*3] = scale*data[t + (h*pitch)-4];
		
		// populate the two other components
		for (var y = 0, c = 0; y <= h; ++y) {
			for (var x = 0; x <= w; ++x, c+=3) {
				pos[c+v2] = y * xz_scale;
				pos[c+v3] = x * xz_scale;
			}
		}
		
		// #ifdef DEBUG
		for (var i = 0; i < pos.length; ++i) {
			if (pos[i] === undefined) {
				medea.DebugAssert("position array has undefined elements: " + i);
			}
		}
		// #endif DEBUG
		
		return [pos,w+1,h+1];
	};
	
	medea._HeightfieldFromEvenSidedHeightmapPart = function(tex, xs, ys, w, h, scale, xz_scale, t, v) {
		var data = tex.GetData(), fullw = tex.GetWidth(), fullh = tex.GetHeight();
		
		// #ifdef DEBUG
		medea.DebugAssert(!(xs + w > fullw || w <= 0 || xs < 0 || ys + h > fullh || h <= 0 || ys < 0),"invalid input rectangle");
		// #endif DEBUG
		
		var c = (w+1)*(h+1);
		var pos = new Array(c*3);
		
		// this is the index of the "up" output component, left flexible for now.
		v = v === undefined ? 1 : v;
        var v2 = (v+1) % 3, v3 = (v2+1) % 3;
		
		// this is the index of the RGBA component that contains the color data
		t = t === undefined ? 0 : t;
		
		// height scaling
		scale = scale || w/(16*16*16);
		var scale2 = scale/2, scale4 = scale2/2;
		xz_scale = xz_scale || 1.0;
		
		// a vertex is the average height of all surrounding quads,
		// a 4x4 heightmap yields a 5x5 point field, so LOD works
		// by leaving out indices.
		var pitch = fullw*4, opitch = (w+1) * 3;
		for (var y = 1, yb = pitch*(1+ys), oyb = opitch; y < h; ++y, yb += pitch, oyb += opitch) {
			for(var x = 1+xs, ob = oyb + 3; x < w+xs; ++x, ob += 3) {
				var b = yb+x*4;

				pos[ob+v] = scale4 * ( data[b+t] + data[b-4+t] + data[b-pitch+t] + data[b-pitch-4+t] );
			}
		}
		
		// y == 0 || y == h
		for(var x = xs+1, lasty = opitch*h, ybase = ys*pitch, lastyin = pitch*(ys+h-1); x < w+xs; ++x) {
			pos[(x-xs)*3+v] = scale2 * ( data[ybase+x*4+t] + data[ybase+x*4-4+t] );
			pos[lasty+(x-xs)*3+v] = scale2 * ( data[lastyin+x*4+t] + data[lastyin+x*4-4+t] );
		}
		
		// x == 0 || x == w
		for (var y = ys+1, yb = pitch*(1+ys) + xs*4, oyb = opitch; y < h+ys; ++y, yb += pitch, oyb += opitch) {
			pos[oyb+v] = scale2 * ( data[yb+t] + data[yb-pitch+t] );
			pos[oyb+(opitch-3)+v] = scale2 * ( data[yb+w*4+t] + data[yb+w*4-pitch+t] );
		}
		
		// x == 0 && y == 0
		pos[v] = scale*data[t + pitch*ys + xs*4];
		
		// x == w && y == 0
		pos[v + w*3] = scale*data[t + pitch-4*(1+fullw-w-xs) + pitch*ys];
		
		// x == 0 && y == h
		pos[v + h*opitch] = scale*data[t + (ys+h-1)*pitch + xs*4];
		
		// x == w && y == h
		pos[v + h*opitch + w*3] = scale*data[t + ((ys+h)*pitch)-4*(1+fullw-w-xs)  + xs*4];
		
		// populate the two other components
		for (var y = 0, c = 0; y <= h; ++y) {
			for (var x = 0; x <= w; ++x, c+=3) {
				pos[c+v2] = y * xz_scale;
				pos[c+v3] = x * xz_scale;
			}
		}
		
		// #ifdef DEBUG
		for (var i = 0; i < pos.length; ++i) {
			medea.DebugAssert(pos[i] !== undefined,"position array has undefined elements: " + i);
		}
		// #endif DEBUG
		
		return [pos,w+1,h+1];
	};
	
	medea._HeightfieldFromOddSidedHeightmapPart = function(tex, xs, ys, w, h, scale, xz_scale, t, v) {
		var data = tex.GetData(), fullw = tex.GetWidth(), fullh = tex.GetHeight();
		
		// #ifdef DEBUG
		medea.DebugAssert(!(xs + w > fullw || w <= 0 || xs < 0 || ys + h > fullh || h <= 0 || ys < 0),"invalid input rectangle");
		// #endif DEBUG
		
		var c = w*h;
		var pos = new Array(c*3);
        
        // this is the index of the "up" output component, left flexible for now.
		v = v === undefined ? 1 : v;
        var v2 = (v+1) % 3, v3 = (v2+1) % 3;
		
		// this is the index of the RGBA component that contains the color data
		t = t === undefined ? 0 : t;
        
        scale = scale || w/(16*16*16);
        xz_scale = xz_scale || 1.0;
        
        var pitch = fullw*4;
		for (var y = 0, c = 0, inb = ys*pitch + xs*4; y < h; ++y, inb += pitch) {
			for (var x = 0; x < w; ++x, c+=3) {
            
                pos[c+v ] = data[inb + x*4 + t] * scale;               
				pos[c+v2] = y * xz_scale;
				pos[c+v3] = x * xz_scale;
			}
		}
        
        return [pos,w,h];
	};
	
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
				var txx = 1.0, tyy = -tan[c+0], l = sqrt(tyy*tyy+1);
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
	
	medea._GenHeightfieldUVs = function(uv, wv, hv) {
		for(var y = 0, c = 0; y < hv; ++y) {
			var yd = y/(hv-1);
			for(var x = 0; x < wv; ++x) {
				uv[c++] = x/(wv-1);
				uv[c++] = yd;
			}
		}
	};
	
	
	
	medea._GenHeightfieldIndices = function(ind, qtx, qty) {
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
	
	medea._GenHeightfieldIndicesLOD = function(ind, qtx, qty) {
		var min = Math.min;
		
		// index the terrain patch in groups of 4x4 quads to improve vertex cache locality
		for (var ty = 1, out = 0; ty < (qty+3)/4 - 1; ++ty) {
			for (var tx = 1; tx < (qtx+3)/4 - 1; ++tx) {
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
	
	medea._GenHeightfieldIndicesWithHole = function(ind, qtx, qty, holex, holey, holew, holeh) {
		var min = Math.min;
		
		// #ifdef DEBUG
		medea.DebugAssert(holex + holew <= qtx && holey + holeh <= qty,'invalid input rectangle');
		// #endif
		
		holew += holex;
		holeh += holey;
		
		// index the terrain patch in groups of 4x4 quads to improve vertex cache locality
		for (var ty = 0, out = 0; ty < (qty+3)/4; ++ty) {
			for (var tx = 0; tx < (qtx+3)/4; ++tx) {
				var fullx = tx*4, fully = ty*4;

				for (var y = fully,bc=fully*(qtx+1)+fullx; y < min(fully+4,qty); ++y,bc+=(qtx+1)-4) {
					for (var x = fullx; x < min(fullx+4,qtx); ++x,++bc) {
						
						if (x >= holex && x < holew && y >= holey && y < holeh) {
							continue;
						}
						
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
		
		return out;
	};
	
	medea._GenHeightfieldIndicesWithHoleLOD = function(ind, qtx, qty, holex, holey, holew, holeh) {
		var min = Math.min;
		
		// #ifdef DEBUG
		medea.DebugAssert(holex + holew <= qtx && holey + holeh <= qty,'invalid input rectangle');
		// #endif
		
		holew += holex;
		holeh += holey;
		
		// index the terrain patch in groups of 4x4 quads to improve vertex cache locality
		for (var ty = 0, out = 0; ty < (qty+3)/4; ++ty) {
			for (var tx = 0; tx < (qtx+3)/4; ++tx) {
				var fullx = tx*4, fully = ty*4;

				for (var y = fully,bc=fully*(qtx+1)+fullx; y < min(fully+4,qty); ++y,bc+=(qtx+1)-4) {
					for (var x = fullx; x < min(fullx+4,qtx); ++x,++bc) {
						
						if (x >= holex && x < holew && y >= holey && y < holeh) {
							continue;
						}
						
						if (!x) {
							if ((fully % 2) || fully >= qty-5) {
								for(var i = 0; i < 6; ++i) {
									ind[out++] = bc;
								}
							}
							else {
								ind[out++] = bc;
								ind[out++] = bc+qtx+1+qtx+1;
								ind[out++] = bc+1;

								ind[out++] = bc+qtx+1+qtx+1;
								ind[out++] = bc+qtx+2+qtx+1;
								ind[out++] = bc+1;
							}
							continue;
						}
						
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
		
		return out;
	};
	
		
	medea.CreateTerrainTileMesh = function(height_map, material, callback) {
		medea.CreateImage(height_map, function(tex) {

			var data = tex.GetData(), w = tex.GetWidth(), h = tex.GetHeight();
			
			// the minimum size is chosen to get rid of nasty out-of-bounds checks during LOD generation
			// #ifdef DEBUG
			medea.DebugAssert(w >= 16 && h >+ 16,"minimum size for terrain tile is 16x16");
			// #endif
			
			var v;

			if (IsPowerOfTwo(w) && IsPowerOfTwo(h)) {
				v = medea._HeightfieldFromEvenSidedHeightmap(tex);
			}
			else if (IsPowerOfTwo(w-1) && IsPowerOfTwo(h-1)) {
				v = medea._HeightfieldFromOddSidedHeightmap(tex);
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
			medea._GenHeightfieldTangentSpace(pos, wv, hv, nor, tan, bit);
			
			var uv = new Array(wv*hv*2);
			medea._GenHeightfieldUVs(uv,wv,hv);
			
			var indices = new Array(w*h*2*3);
			medea._GenHeightfieldIndices(indices,wv-1,hv-1);
			
			callback(medea.CreateSimpleMesh({ positions: pos, normals: nor, uvs: [uv]}, indices, material, callback));
		});
	};
});
