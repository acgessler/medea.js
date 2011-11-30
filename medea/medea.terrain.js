
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

 // note: json2.js may be needed for contemporary browsers with incomplete HTML5 support
medea._addMod('terrain',['terraintile', typeof JSON === undefined ? 'json2.js' : null],function(undefined) {
	"use strict";
	var medea = this;

	medea._initMod('terraintile');

	var sample_3x3_weights = [
		[0.05, 0.1, 0.05],
		[0.1, 0.4, 0.1],
		[0.05, 0.1, 0.05]
	];

	var FixTexturePaths = function(constants, url_root) {
		for(var k in constants) {
			var v = constants[k];
			if (typeof v === 'string') {
				if (v[0] === '.' && v[1] === '/') {
					constants[k] = url_root + v.slice(1);
				}
			}
			else if (typeof v === 'object') {
				FixTexturePaths(v, url_root);
			}
		}
	};

	var DefaultTerrainDataProvider = medea.Class.extend({

		desc : null,

		init : function(info, url_root) {
			try {
				this.desc = JSON.parse(info);
			}
			catch(e) {
				// #ifdef DEBUG
				medea.DebugAssert("Failed to read terrain description from JSON, JSON.parse failed: " + e);
				// #endif
				return;
			}

			this.url_root = url_root || this.desc.url_root || '';
			this.maps_bysize = {};

			var w = Math.min(this.desc.size[0],this.desc.size[1]), cnt = 0;
			for (; w >= 1; ++cnt, w /= 2);
			this.lod_count = cnt;

			this.desc.base_hscale = this.desc.base_hscale || 1.0/255.0;
			this.fetch_queue = [];
			this.materials = new Array(this.lod_count);
		},

		GetSize : function() {
			return this.desc.size;
		},

		GetWidth : function() {
			return this.desc.size[0];
		},

		GetHeight : function() {
			return this.desc.size[1];
		},

		GetLODCount : function() {
			return this.lod_count;
		},

		GetUnitBase : function() {
			return this.desc.unitbase;
		},

		GetScale : function() {
			return this.desc.scale;
		},

		TryGetHeightAtPos : function(x,y) {
			var map = this._FindLOD(this.desc.size[0],this.desc.size[1]);
			if(!map) {
				return null;
			}

			var iw = map._cached_img.GetWidth(), ih = map._cached_img.GetHeight();
			var xx = Math.floor(iw * x/this.desc.size[0]), yy = Math.floor(ih * y/this.desc.size[1]);

			// sample the 9 surrounding pixels using a (pseudo) gaussian filter
			var h = 0.0;
			for( var n = -1; n <= 1; ++n) {
				for( var m = -1; m <= 1; ++m) {
					h += map._cached_img.PixelComponent(xx+n, yy+m,0) * this.desc.base_hscale * sample_3x3_weights[n+1][m+1];
				}
			}

			// #ifdef DEBUG
			medea.DebugAssert(h !== undefined,'out of bounds access');
			// #endif
			return h * this.desc.scale[1];
		},

		// request a given rectangle on the terrain for a particular 'wanthave' LOD
		// callback is invoked as soon as this LOD level is available.
		RequestLOD : function(x,y,w,h,lod,callback)  {
			var wx = this.desc.size[0] / (1 << lod), hx = this.desc.size[1] / (1 << lod);
			var match = this._FindLOD(wx,hx);

			if (!match) {
				// load a suitable map
				for(var i = 0; i < this.desc.maps.length; ++i) {
					var m = this.desc.maps[i];
					if (!m.img) {
						continue;
					}

					if (m.size[0] == wx && m.size[1] == hx) {
						var outer = this;
						this._FetchMap(m, function() {
							outer.RequestLOD(x,y,w,h,lod,callback);
						});

						break;
					}
				}
				return;
			}

			callback([x,y,w,h,lod,match]);
		},

		// sample a given LOD and generate a field of terrain vertices from the
		// data.
		SampleLOD : function(x,y,w,h,lod) {
			var match = null;
			if (Array.isArray(x)) {
				y = x[1];
				w = x[2];
				h = x[3];
				lod = x[4];
				match = x[5];
				x = x[0];
			}

			if (!match) {
				var wx = this.desc.size[0] / (1 << lod), hx = this.desc.size[1] / (1 << lod);
				match = this._FindLOD(wx,hx);
				// #ifdef DEBUG
				medea.DebugAssert(!!match,"LOD not present: " + lod);
				// #endif
			}

			var real_scale = match.size[0]/this.desc.size[0];
			// #ifdef DEBUG
			medea.DebugAssert(real_scale == match.size[1]/this.desc.size[1],"LOD images with different aspect ratios than the main terrain are not supported");
			// #endif

			var want_scale = 1/(1 << lod);

			x = Math.floor(x*2.0)*0.5;
			y = Math.floor(y*2.0)*0.5;
			w = Math.floor(w);
			h = Math.floor(h);

			var ub = Math.floor(this.desc.unitbase * real_scale);
			var xx = x*ub, yy = y*ub, ww = w*ub, hh = h*ub;

			var sbase = real_scale/want_scale;
			medea.LogDebug('rect: ' + lod + " " + xx + " " + yy + " " + ww + " " + hh);
			return this._CreateHeightField(match._cached_img, xx, yy, ww, hh, sbase*this.desc.scale[1]*this.desc.base_hscale, sbase*this.desc.scale[0]);
		},


		_FindLOD : function(w,h) {
			// #ifdef DEBUG
			medea.DebugAssert(w <= this.GetWidth() && h <= this.GetHeight(),'width and height may not exceed terrain dimensions');
			// #endif
			if (!w || !h) {
				return null;
			}
			var k = w + '_'+ h;
			k = this.maps_bysize[k];
			return k || this._FindLOD(w/2,h/2);
		},

		Update : function(ppos) {
			// never try to fetch more than one map a frame, and always start with smaller maps
			var smallest = 1e10, match = -1;
			for( var i = 0; i < this.fetch_queue.length; ++i) {
				if (this.fetch_queue[i][2]) {
					continue;
				}

				var map = this.fetch_queue[i][0], size = map.size[0] * map.size[1];

				if (size < smallest) {
					match = i;
					smallest = size;
				}
			}

			if (match !== -1) {
				var outer = this, map = this.fetch_queue[match][0], clbs = this.fetch_queue[match][1];

				this.fetch_queue[match][2] = true;
				medea.CreateImage(this.url_root + '/' + map.img, function(img) {
					map._cached_img = img;
					outer._RegisterMap(map);

					for( var i = 0; i < clbs.length; ++i) {
						clbs[i]();
					}

					for( var i = 0; i < outer.fetch_queue.length; ++i) {
						if (outer.fetch_queue[i][0] == map) {
							outer.fetch_queue.splice(i);
							break;
						}
					}
				});
			}
		},

		GetMaterial : function(lod) {
			if (this.materials[lod]) {
				return this.materials[lod];
			}

			if (!this.desc.materials[lod]) {
				return null;
			}

			var mat = this.desc.materials[lod];
			if(mat.clonefrom !== undefined) {
				return this.GetMaterial(mat.clonefrom);
			}

			var name = this.url_root + '/' + mat.effect, constants = mat.constants;

			// make texture paths absolute
			FixTexturePaths(constants, this.url_root);
			var m = this.materials[lod] = new medea.Material(medea.CreatePassFromShaderPair(name,constants));

			// enable culling unless the user disables it explicitly
			var p = m.Passes();
			for(var i = 0; i < p.length; ++i) {
				var s = p[i].State();

				if ( ('cull_face' in s) || ('cull_face_mode' in s)) {
					continue;
				}
				s.cull_face = true;
				s.cull_face_mode = 'back';
			}

			return m;
		},

		_RegisterMap : function(map) {
			// #ifdef DEBUG
			medea.DebugAssert(!!map._cached_img,"expect image data to be loaded: " + map.img);
			// #endif

			this.maps_bysize[map.size[0] + '_'+ map.size[1]] = map;
		},

		_FetchMap : function(map,callback) {

			for( var i = 0; i < this.fetch_queue.length; ++i) {
				if (this.fetch_queue[i][0] == map) {
					this.fetch_queue[i][1].push(callback);
					return;
				}
			}
			this.fetch_queue.push([map,[callback],false]);
		},

		_CreateHeightField : function(img, x,y,w,h, ys, xzs) {
			return medea._HeightfieldFromOddSidedHeightmapPart(img, x,y,w+1,h+1,ys, xzs);
		},
	});



	medea.CreateDefaultTerrainDataProvider = function(info, url_root) {
		return new DefaultTerrainDataProvider(info, url_root);
	};

	medea.CreateDefaultTerrainDataProviderFromResource = function(src, callback) {
		medea.Fetch(src,function(data) {
			var c = medea.CreateDefaultTerrainDataProvider(data, src.replace(/^(.*[\\\/])?(.*)/,'$1'));
			if(callback) {
				callback(c);
			}
		}, function() {
			// XXX handle error
		});
	};


	var TerrainRing = medea.Class.extend({

		init : function(terrain,lod) {
			this.terrain = terrain;
			this.lod = lod;
			this.half_scale = 0.5*(1<<lod);

			this.startx = this.starty = 1e10;
			this.present = false;
			this.substituted = false;
			this.present_listeners = [];
		},

		IsPresent : function() {
			return this.present;
		},

		IsSubstituted : function() {
			return this.substituted;
		},

		GetOnPresentListeners : function() {
			return this.present_listeners;
		},

		Update : function(ppos) {

			this.ppos = ppos;

			var ub = this.terrain.data.GetUnitBase(), w = this.terrain.data.GetWidth(), h = this.terrain.data.GetHeight();
			var newx = ppos[0]/ub - this.half_scale + w * 0.5;
			var newy = ppos[2]/ub - this.half_scale + h * 0.5;

			newx = Math.min(w-(1<<this.lod),Math.max(0,newx));
			newy = Math.min(h-(1<<this.lod),Math.max(0,newy));

			var dx = newx - this.startx, dy = newy - this.starty;
			if (dx*dx + dy*dy > 0.3) {

				this.startx = newx;
				this.starty = newy;

				this._BuildMesh();
			}
		},

		_BuildMesh : function() {
			var t = this.terrain, d = t.data, ilod = 1<<this.lod, outer = this, ppos = this.ppos, sc = d.GetScale();

			d.RequestLOD( this.startx, this.starty,1*ilod,1*ilod,this.lod, function(tup) {
				var v = d.SampleLOD(tup);
				var pos = v[0], wv = v[1], hv = v[2], w = wv-1, h = hv-1;

				// center the heightfield and scale it according to its LOD
				outer._MoveHeightfield(pos, ilod, 1.0,-w*sc[0]/2, -h*sc[0]/2, ppos[0], ppos[2]);


				var nor = new Array(pos.length), tan = new Array(pos.length), bit = new Array(pos.length);
				medea._GenHeightfieldTangentSpace(pos, wv, hv, nor, tan, bit);

				var uv = new Array(wv*hv*2);
				medea._GenHeightfieldUVs(uv,wv,hv, Math.ceil(ilod/2));

				var m, vertices = { positions: pos, normals: nor, tangents: tan, bitangents: bit, uvs: [uv]};

				if(!outer.cached_mesh) {
					var indices = outer._GetIndices(w,h);

					m = outer.cached_mesh = medea.CreateSimpleMesh(vertices, indices,
						d.GetMaterial(outer.lod) || medea.CreateSimpleMaterialFromColor([0.7,0.7,0.5,1.0], true),

						medea.VERTEXBUFFER_USAGE_DYNAMIC | medea.INDEXBUFFER_USAGE_DYNAMIC
					);
				}
				else {
					m = outer.cached_mesh;
					m.VB().Fill(vertices);
				}

				// #ifdef LOG
				medea.LogDebug('(re-)generate TerrainTile: lod=' + outer.lod + ', startx=' + outer.startx + ', starty=' + outer.starty + ', posx=' + ppos[0] + ', posy=' + ppos[2]);
				// #endif

				outer._SetMesh(m);
				outer._SetPresent();
			});
		},

		_GetIndices : function(w,h) {
			var indices, t = this.terrain;

			if (this.lod === 0) {
				indices = new Array(w*h*2*3);
				medea._GenHeightfieldIndicesLOD(indices,w,h);
			}
			else {
				var whs = w/4, hhs = h/4, n = this.lod-1, extend = false;

				// see if higher LODs are not present yet, in this case we
				// make the hole larger to cover their area as well.
				for( var dt = 8; n >= 0 && !t.LOD(n).IsPresent(); --n, whs += w/dt, hhs += h/dt, dt*=2, extend = true );

				if(n === -1) {
					++n;
					whs = hhs = w/2;
				}
				whs = Math.floor(whs), hhs = Math.floor(hhs);

				// .. but make sure we get notified when those higher LODs
				// finish loading so we can shrink again.
				if (extend) {
					// #ifdef LOG
					medea.LogDebug('extending indices for lod ' + this.lod + ' down to cover lod ' + n + ' as well');
					// #endif

					for( var nn = n; nn < this.lod; ++nn) {
						t.LOD(nn).substituted = true;
						(function(nn, outer) {
							t.LOD(nn).GetOnPresentListeners().push(function() {

								for( var m = outer.lod-1; m >= 0 && !t.LOD(m).IsPresent(); --m );
								if(m === -1) {
									++m;
								}
								if (m === nn) {
									// #ifdef LOG
									medea.LogDebug('shrinking indices for ' + outer.lod + ' again now that lod ' + nn + ' is present');
									// #endif

									outer.cached_mesh.IB().Fill(outer._GetIndices(w,h));
								}
							});
						} (nn, this));
					}
				}

				var wh = w-whs*2, hh = h-hhs*2;
				indices = new Array((w-wh)*(h-hh)*2*3);

				var c = (this.lod === t.data.GetLODCount()-1
					? medea._GenHeightfieldIndicesWithHole
					: medea._GenHeightfieldIndicesWithHoleLOD)
					(indices,w,h,whs,hhs,wh,hh);

				indices.length = c;
			}

			return indices;
		},

		_SetMesh : function(m) {
			if (m === this.cur_mesh) {
				return;
			}

			if (this.cur_mesh) {
				this.terrain.RemoveEntity(this.cur_mesh);
			}

			this.cur_mesh = m;
			if(m) {
				this.terrain.AddEntity(m);
			}
		},

		_SetPresent : function() {
			this.present = true;
			this.substituted = false;
			for (var i = 0; i < this.present_listeners.length; ++i) {
				this.present_listeners[i]();
			}
		},


		_MoveHeightfield : function(pos, xz_scale, yscale, xofs, yofs, abs_xofs, abs_yofs) {
			for(var i = 0, i3 = 0; i < pos.length/3; ++i, i3 += 3) {
				pos[i3+0] = (pos[i3+0]+xofs) * xz_scale + abs_xofs;
				pos[i3+1] *= yscale;
				pos[i3+2] = (pos[i3+2]+yofs) * xz_scale + abs_yofs;
			}
		}
	});


	var TerrainNode = medea.Node.extend({

		init : function(name, data, cam_node) {
			this._super(name, medea.NODE_FLAG_NO_ROTATION | medea.NODE_FLAG_NO_SCALING);

			this.data = data;
			this.cam_node = cam_node;
			this._InitRings();
		},


		Update: function(dtime) {
			this._super(dtime);

			var ppos = this.cam_node.GetWorldPos();
			for( var i = 0; i < this.rings.length; ++i) {
				this.rings[i].Update(ppos);
			}

			this.data.Update(ppos);
		},

		GetWorldHeightForWorldPos : function(wx,wz) {
			var mypos = this.GetWorldPos();

			if (wz === undefined) {
				wz = wx[2];
				wx = wx[0];
			}

			var ub = this.data.GetUnitBase();

			wx -= mypos[0];
			wz -= mypos[2];

			var h = this.data.TryGetHeightAtPos(this.data.GetWidth()*0.5 + wx/ub,this.data.GetHeight()*0.5 + wz/ub);
			return h === null ? null : h - mypos[1];
		},

		LOD : function(i) {
			return this.rings[i];
		},

		_InitRings : function() {
			var lods = this.data.GetLODCount();
			this.rings = new Array(lods);

			for(var i = 0; i < lods; ++i) {
				this.rings[i] = new TerrainRing(this,i);
			}
		},
	});



	var SimpleTerrainPhysicsController = medea.Entity.extend(
	{
		init : function(terrain, height_offset) {
			this.terrain = terrain;
			this.height_offset = height_offset === undefined ? 2.0 : height_offset;

// #ifdef DEBUG
			medea.DebugAssert(this.terrain instanceof TerrainNode, "need valid terrain node");
// #endif


		},

		Render : function(viewport,entity,node,rqmanager) {
			// nothing to be done
		},

		Update : function(dtime) {
			var ppos = this.parent.GetWorldPos();
			var h = this.terrain.GetWorldHeightForWorldPos(ppos[0],ppos[2]);

			if (h === null) {
				// outside the terrain or terrain not present yet, do not touch.
			}
			else {
				ppos[1] = this.height_offset + h;

				var t = vec3.create();
				mat4.multiplyVec3(this.parent.parent.GetInverseGlobalTransform(),ppos,t);
				this.parent.LocalPos(t);
			}
		},

		HeightOffset : function(h) {
			if (h === undefined) {
				return this.height_offset;
			}
			this.height_offset = h;
		},
	});


	medea.CreateTerrainNode = function(data_provider, cam_node) {
		return new TerrainNode('terrain', data_provider, cam_node);
	};

	medea.CreateSimpleTerrainPhysicsController = function(terrain, ho) {
		return new SimpleTerrainPhysicsController(terrain, ho);
	};
});


