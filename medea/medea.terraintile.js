
/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('terraintile',['worker_terrain','image','lodmesh','indexbuffer'],function(medealib, undefined) {
	"use strict";
	var medea = this;

	// Populate |ind| with indices to draw a terrain tile of size |qtx| * |qty| quads
	// while only using every |divisor| row and column in the source space.
	medea._GenHeightfieldIndicesSkip = function(ind, qtx, qty, divisor) {
		var min = Math.min;

		// Index the terrain patch in groups of 3x3 vertex quads to improve vertex cache locality
		// Each group then uses 16 unique vertices, which should be a reasonable PTVC cache size
		var out = 0;
		var groups_x = (qtx+3)/4;
		var groups_y = (qty+3)/4;

		var row_pitch = (qtx * divisor + 1) * divisor;

		for (var ty = 0; ty < groups_y; ++ty) {
			for (var tx = 0; tx < groups_x; ++tx) {
				var xbase = tx * 4;
				var ybase = ty * 4;
				var base_index = divisor * ybase * (qtx * divisor + 1) + xbase * divisor;

				var group_h = min(ybase + 4, qty);
				var group_w = min(xbase + 4, qtx);

				var row_offset = row_pitch - (group_w - xbase) * divisor;
				for (var y = ybase; y < group_h; ++y, base_index += row_offset) {
					for (var x = xbase; x < group_w; ++x, base_index += divisor) {

						ind[out++] = base_index;
						ind[out++] = base_index + row_pitch;
						ind[out++] = base_index + divisor;

						ind[out++] = base_index + row_pitch;
						ind[out++] = base_index + row_pitch + divisor;
						ind[out++] = base_index + divisor;
					}
				}
			}
		}

		return out;
	};


	// TODO: clean up everything below this line. It doesn't need to be that messy,
	// making a terrain is not rocket science.


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
				medealib.DebugAssert("position array has undefined elements: " + i);
			}
		}
		// #endif DEBUG

		return [pos,w+1,h+1];
	};

	medea._HeightfieldFromEvenSidedHeightmapPart = function(tex, xs, ys, w, h, scale, xz_scale, t, v) {
		var data = tex.GetData(), fullw = tex.GetWidth(), fullh = tex.GetHeight();

		// #ifdef DEBUG
		medealib.DebugAssert(!(xs + w > fullw || w <= 0 || xs < 0 || ys + h > fullh || h <= 0 || ys < 0),"invalid input rectangle");
		// #endif DEBUG

		var c = (w+1)*(h+1);
		var pos = new Float32Array(c*3);

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
			medealib.DebugAssert(pos[i] !== undefined,"position array has undefined elements: " + i);
		}
		// #endif DEBUG

		return [pos,w+1,h+1];
	};

	medea._HeightfieldFromOddSidedHeightmapPart = function(tex, xs, ys, w, h, scale, xz_scale, t, v) {
		var data = tex.GetData(), fullw = tex.GetWidth(), fullh = tex.GetHeight();

		// #ifdef DEBUG
		medealib.DebugAssert(!(xs + w > fullw || w <= 0 || xs < 0 || ys + h > fullh || h <= 0 || ys < 0),"invalid input rectangle");
		// #endif DEBUG

		var c = w*h;
		var pos = new Float32Array(c*3);

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

	medea._HeightfieldFromOddSidedHeightmap = function(tex,scale, xz_scale, t, v) {
		return medea._HeightfieldFromOddSidedHeightmapPart(tex,0,0,tex.GetWidth(),tex.GetHeight(),scale,xz_scale, t,v);
	};

	medea._GenHeightfieldIndices = function(ind, qtx, qty) {
		return medea._GenHeightfieldIndicesWithHole(ind, qtx, qty, 0, 0, 0, 0);
	};

	medea._GenHeightfieldIndicesLOD = function(ind, qtx, qty) {
		return medea._GenHeightfieldIndicesWithHoleLOD(ind, qtx, qty, 0, 0, 0, 0);
	};

	medea._GenHeightfieldIndicesWithHole = function(ind, qtx, qty, holex, holey, holew, holeh) {
		var min = Math.min;

		// #ifdef DEBUG
		medealib.DebugAssert(holex + holew <= qtx && holey + holeh <= qty,'invalid input rectangle');
		// #endif

		holew += holex;
		holeh += holey;

		// index the terrain patch in groups of 3x3 vertex quads to improve vertex cache locality
		for (var ty = 0, out = 0; ty < (qty+3)/4; ++ty) {
			for (var tx = 0; tx < (qtx+3)/4; ++tx) {
				var fullx = tx*4, fully = ty*4;

				var last_x = 0;
				for (var y = fully,bc=fully*(qtx+1)+fullx; y < min(fully+4,qty); ++y,bc+=(qtx+1)-last_x) {
					for (var x = fullx; x < min(fullx+4,qtx); ++x,++bc) {

						last_x = x + 1 - fullx;
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
		medealib.DebugAssert(holex + holew <= qtx && holey + holeh <= qty,'invalid input rectangle');
		// #endif

		holew += holex;
		holeh += holey;

		var row = qtx+1;

		// index the terrain patch in groups of 4x4 quads to improve vertex cache locality
		for (var ty = 0, out = 0; ty < (qty+3)/4; ++ty) {
			for (var tx = 0; tx < (row+2)/4; ++tx) {
				var fullx = tx*4, fully = ty*4;

				for (var y = fully,cur=fully*(qtx+1)+fullx; y < min(fully+4,qty); ++y,cur+=(qtx+1)-4) {
					for (var x = fullx; x < min(fullx+4,qtx); ++x,++cur) {

						if (x >= holex && x < holew && y >= holey && y < holeh) {
							continue;
						}

						// XXX this code leaves small overlap region in all corners, also
						// some profiling may be required to see how to squeeze the most
						// out of V8/Gecko
						var reg = true;
						if (!x) {
							reg = false;
							if (!(y % 2) && y < qty-1) {
								ind[out++] = cur+row+row;
								ind[out++] = cur+row+1;
								ind[out++] = cur;

								ind[out++] = cur+row+row;
								ind[out++] = cur+row+1+row;
								ind[out++] = cur+row+1;

								ind[out++] = cur;
								ind[out++] = cur+row+1;
								ind[out++] = cur+1;
							}
						}
						else if (x === qtx-1) {
							reg = false;
							if (!(y % 2) && y < qty-1) {
								ind[out++] = cur;
								ind[out++] = cur+row;
								ind[out++] = cur+1;

								ind[out++] = cur+row;
								ind[out++] = cur+row+row;
								ind[out++] = cur+row+row+1;

								ind[out++] = cur+row;
								ind[out++] = cur+row+row+1;
								ind[out++] = cur+1;
							}
						}

						if (!y) {
							if (!(x % 2) && x < qtx-1) {
								ind[out++] = cur+row;
								ind[out++] = cur+row+1;
								ind[out++] = cur;

								ind[out++] = cur;
								ind[out++] = cur+row+1;
								ind[out++] = cur+2;

								ind[out++] = cur+row+1;
								ind[out++] = cur+row+2;
								ind[out++] = cur+2;
							}
						}
						else if (y === qty-1) {
							if (!(x % 2) && x < qtx-1) {
								ind[out++] = cur;
								ind[out++] = cur+row;
								ind[out++] = cur+1;

								ind[out++] = cur+row;
								ind[out++] = cur+row+2;
								ind[out++] = cur+1;

								ind[out++] = cur+1;
								ind[out++] = cur+row+2;
								ind[out++] = cur+2;
							}
						}

						else if (reg) {
							ind[out++] = cur;
							ind[out++] = cur+row;
							ind[out++] = cur+1;

							ind[out++] = cur+row;
							ind[out++] = cur+row+1;
							ind[out++] = cur+1;
						}
					}
				}
			}
		}

		return out;
	};


	var cached_terrain_ibos = {

	};

	// Obtain a cached terrain index buffer for the given 0 <= |lod| of
	// a |w| x |h| quad terrain.
	//
	// Require |w| and |h| to be multiple of |1 << lod|
	medea.GetTerrainIndexBuffer = function(w, h, lod) {
		var key = w + '_' + h + '_' + lod;
		var ibo = cached_terrain_ibos[key];
		if (ibo) {
			return ibo;
		}
		// #ifdef DEBUG
		medealib.LogDebug("Creating terrain index buffer: " + key);
		// #endif

		var indices = new Array((w+1)*(h+1)*2*3);
		var divisor = 1 << lod;
		medea._GenHeightfieldIndicesSkip(indices,w / divisor,h / divisor, divisor);
		ibo = cached_terrain_ibos[key] = medea.CreateIndexBuffer(indices);
		return ibo;
	};

	medea.DEFAULT_TERRAIN_LOD_LEVELS = 5;

	// Create a LODMesh of a terrain tile using |height_map| as source bitmap,
	// where |height_map| can be either a URL to fetch from, an |Image| or
	// an |medea.Image|. Prefer |medea.Image| if multiple terrain tiles are
	// created from the same source image, this avoids drawing to canvas
	// multiple times.
	//
	// |xs|, |ys|, |w|, |h| describe a subset of the source |height_map| to use.
	// |w| and |h| must be a power-of-two size.
	//
	// If omitted, the entire height map is made a mesh. In this case, the
	// source height map must either be of power-of-two resolution, or
	// power-of-two plus one (i.e. 129x129).
	//
	// The created terrain tile is in all cases a grid of quads with a
	// power-of-two number of quads on each axis.
	medea.CreateTerrainTileMesh = function(height_map, material, callback, xs, ys, ws, hs, lod_levels) {
		var init = function(tex) {
			lod_levels = lod_levels || medea.DEFAULT_TERRAIN_LOD_LEVELS;
			var data = tex.GetData(), w = tex.GetWidth(), h = tex.GetHeight();

			// The minimum size is chosen to get rid of nasty out-of-bounds checks during LOD generation
			// #ifdef DEBUG
			medealib.DebugAssert(w >= 16 && h >= 16,"Minimum size for a terrain tile is 16x16");
			// #endif

			var v;

			// Multiple legacy or non-legacy ways of deriving a terrain tile from an image
			// The preferred way is to use an explicit rectangle.
			if (ws > 0 && hs > 0) {
				// #ifdef DEBUG
				medealib.DebugAssert(medea._IsPow2(ws) && medea._IsPow2(hs),
					"Not power-of two sub rectangle dimension");
				// #endif

				xs = xs || 0;
				ys = ys || 0;
				// #ifdef DEBUG
				medealib.DebugAssert(xs + ws < w && ys + ws < h,"Invalid sub rectangle");
				// #endif
				v = medea._HeightfieldFromOddSidedHeightmapPart(tex, xs, ys, ws + 1, hs + 1, 1, 1);
			}
			else if (medea._IsPow2(w) && medea._IsPow2(h)) {
				v = medea._HeightfieldFromEvenSidedHeightmap(tex);
			}
			else if (medea._IsPow2(w-1) && medea._IsPow2(h-1)) {
				v = medea._HeightfieldFromOddSidedHeightmap(tex);
				--w, --h;
			}
			else {
				// #ifdef DEBUG
				medealib.DebugAssert("Unsupported height map size");
				// #endif
				return;
			}

			var pos = v[0], wv = v[1], hv = v[2];

			var nor = new Array(pos.length), tan = new Array(pos.length), bit = new Array(pos.length);
			medea._GenHeightfieldTangentSpace(pos, wv, hv, nor, tan, bit);

			var uv = new Array(wv * hv * 2);
			medea._GenHeightfieldUVs(uv,wv,hv);

			var lod_ibos = new Array(lod_levels);
			for (var i = 0; i < lod_levels; ++i) {
				lod_ibos[i] = medea.GetTerrainIndexBuffer(wv - 1, hv - 1, i);
			}

			var vertex_channels = {
				positions: pos,
				normals: nor,
				uvs: [uv]
			};

			var mesh = medea.CreateLODMesh(vertex_channels, lod_ibos, material);
			callback(mesh);
		};

		if (height_map instanceof medea.Image) {
			init(height_map);
			return;
		}
		medea.CreateImage(height_map, init);
	};
});
