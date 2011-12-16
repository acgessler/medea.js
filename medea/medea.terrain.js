
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

 // note: json2.js may be needed for contemporary browsers with incomplete HTML5 support
medea._addMod('terrain',[,'worker_terrain','terraintile', typeof JSON === undefined ? 'json2.js' : null],function(undefined) {
	"use strict";
	var medea = this;

	medea._initMod('terraintile');
	medea._initMod('worker_terrain');

	var terrain_ib_cache = {
	};

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

	var TerrainDefaultSettings = {
		use_vertex_fetch : true,
		use_worker : true,
		camera_timeout : 1000,
		update_treshold : 0.4,
		no_mens : 0.1,
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
			//medea.LogDebug('terrain rect: ' + lod + " " + xx + " " + yy + " " + ww + " " + hh);
			var hf = this._CreateHeightField(match._cached_img, xx, yy, ww, hh,
				sbase*this.desc.scale[1]*this.desc.base_hscale,
				sbase*this.desc.scale[0]);

			return [hf[0],hf[1],hf[2],x,y];
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

		Update : function() {
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
							outer.fetch_queue.splice(i,1);
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
			var def = this.desc.default_height || 0.0;

			++w;
			++h;

			var xofs = 0, yofs = 0, xofsr = 0, yofsr = 0, ow = w, oh = h;
			if (x < 0) {
				xofs = -x;
				w += x;
				x = 0;
			}
			if (y < 0) {
				yofs = -y;
				h += y;
				y = 0;
			}

			if (x + w > img.GetWidth()) {
				xofsr = x + w - img.GetWidth();
				w -= xofsr;
			}

			if (y + h > img.GetHeight()) {
				yofsr = y + h - img.GetHeight();
				h -= yofsr;
			}

			if (h <= 0 || w <= 0 || yofsr >= oh || xofsr >= ow) {
				// completely out of range, return dummy data
				var pos = new Array(oh*ow*3);
				for (var yy = 0, c = 0; yy < oh; ++yy) {
					for (var xx = 0; xx < ow; ++xx) {
						pos[c++] = xx * xzs;
						pos[c++] = def;
						pos[c++] = yy * xzs;
					}
				}
				return [pos, ow, oh];
			}

			var hf = medea._HeightfieldFromOddSidedHeightmapPart(img, x,y,w,h,ys, xzs);
			if (xofs || yofs || yofsr || xofsr) {
				// #ifdef LOG
				medea.LogDebug('Out of range: xofs=' + xofs + ', yofs=' + yofs +
					', xofsr=' + xofsr+ ', yofsr=' + yofsr);
				// #endif

				// partly out of range, move the height field and pad with dummy data
				var pos = new Array(oh*ow*3);
				for (var yy = 0, c = 0; yy < oh; ++yy) {
					for (var xx = 0; xx < ow; ++xx) {
						pos[c++] = xx * xzs;
						pos[c++] = def;
						pos[c++] = yy * xzs;
					}
				}

				for (var yy = 0, c = (yofs*ow + xofs) * 3 + 1, ci = 1; yy < h; ++yy, c += ow*3 ) {
					for (var xx = 0; xx < w; ++xx, ci+=3) {
						pos[c + xx*3] = hf[0][ci];
					}
				}
				return [pos, ow, oh];
			}

			return hf;
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

		init : function(terrain,lod,cam) {
			this.terrain = terrain;
			this.lod = lod;
			this.cam = cam;
			this.half_scale = 0.5*(1<<lod);

			this.startx = this.starty = 1e10;
			this.present = false;
			this.substituted = false;
			this.present_listeners = [];
			this.cur_meshes = [];
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

		Update : function(ppos, startx, starty) {

			this.ppos = ppos;
			this.startx = startx - this.half_scale;
			this.starty = starty - this.half_scale;

			this._BuildMesh();
		},

		_BuildMesh : function() {
			var t = this.terrain, d = t.data, ilod = 1<<this.lod, outer = this, ppos = this.ppos, sc = d.GetScale();

			d.RequestLOD( this.startx, this.starty,ilod,ilod,this.lod, function(tup) {
				var v = d.SampleLOD(tup);
				var pos = v[0], wv = v[1], hv = v[2], w = wv-1, h = hv-1, realx = v[3], realy = v[4], ub = d.GetUnitBase();

				// center the heightfield and scale it according to its LOD
				outer._MoveHeightfield(pos, ilod, 1.0,
					ppos[0] + (realx-outer.startx)*ub -w*ilod*sc[0]/2,
					ppos[2] + (realy-outer.starty)*ub -h*ilod*sc[0]/2
				);

				var uv  = new Float32Array(wv*hv*2);

				t._Dispatch('GenHeightfieldTangentSpace',function(res) {
					medea._GenHeightfieldUVs(uv,wv,hv, ilod);

					var m, vertices = { positions: pos, normals: res.nor, tangents: res.tan, bitangents: res.bit, uvs: [uv]};

					if(!outer.cached_mesh) {
						var indices = outer._GetIndices(w,h);

						m = outer.cached_mesh = medea.CreateSimpleMesh(vertices, indices,
							d.GetMaterial(outer.lod) || medea.CreateSimpleMaterialFromColor([0.7,0.7,0.5,1.0], true),

							medea.VERTEXBUFFER_USAGE_DYNAMIC
						);
					}
					else {
						m = outer.cached_mesh;
						m.VB().Fill(vertices, true);
						m.UpdateBB();
					}

					// #ifdef LOG
					medea.LogDebug('(re-)generate TerrainTile: lod=' + outer.lod + ', startx='
						+ outer.startx + ', starty=' + outer.starty
						+ ', posx=' + ppos[0] + ', posy=' + ppos[2]);
					// #endif

					outer._SetMeshes(m);
					outer._SetPresent();
				}, pos,wv,hv);
			});
		},

		_GetIndices : function(w,h) {
			var indices, t = this.terrain, cam = this.cam, ib;

			if (this.lod === 0) {
				var ib_key = this._GetIBCacheKey(w,h,0,0,0,0,true);
				var ib_cached = terrain_ib_cache[ib_key];
				if (ib_cached) {
					return ib_cached;
				}

				var indices = new Array(w*h*2*3);
				medea._GenHeightfieldIndicesLOD(indices,w,h);

				return terrain_ib_cache[ib_key] = medea.CreateIndexBuffer(indices, 0);
			}

			var whs = w/4, hhs = h/4, n = this.lod-1, extend = false;

			// see if higher LODs are not present yet, in this case we
			// make the hole larger to cover their area as well.
			for( var dt = 8; n >= 0 && !t.LOD(n,cam).IsPresent(); --n, whs += w/dt, hhs += h/dt, dt*=2, extend = true );

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
					t.LOD(nn,cam).substituted = true;
					(function(nn, outer) {
						var pf = function() {

							for( var m = outer.lod-1; m >= 0 && !t.LOD(m,cam).IsPresent(); --m );
							if(m === -1) {
								++m;
							}
							if (m === nn) {
								// #ifdef LOG
								medea.LogDebug('shrinking indices for ' + outer.lod + ' again now that lod ' + nn + ' is present');
								// #endif

								outer.cached_mesh.IB(outer._GetIndices(w,h));

								// remove the listener
								var pl = t.LOD(nn,cam).GetOnPresentListeners();
								pl.splice(pl.indexOf(pf));
							}
						};
						t.LOD(nn,cam).GetOnPresentListeners().push(pf);
					} (nn, this));
				}
			}

			var wh = w-whs*2, hh = h-hhs*2;

			var ib_key = this._GetIBCacheKey(w,h,whs,hhs,wh,hh, this.lod !== t.data.GetLODCount()-1);
			var ib_cached = terrain_ib_cache[ib_key];
			if (ib_cached) {
				return ib_cached;
			}

			var indices = new Array((w-wh)*(h-hh)*2*3);
			var c = (this.lod === t.data.GetLODCount()-1
				? medea._GenHeightfieldIndicesWithHole
				: medea._GenHeightfieldIndicesWithHoleLOD)
				(indices,w,h,whs,hhs,wh,hh);

			// #ifdef LOG
			medea.LogDebug('populate terrain IB cache: ' + ib_key);
			// #endif

			indices.length = c;
			return terrain_ib_cache[ib_key] = medea.CreateIndexBuffer(indices);
		},

		_GetIBCacheKey : function(w,h,whs,hhs,wh,hh,lod) {
			return Array.prototype.join.call(arguments,'-');
		},

		_SetMeshes : function(m) {
			this.cur_meshes = Array.isArray(m) ? m : [m];
		},

		GetMeshes : function() {
			return this.cur_meshes;
		},

		_SetPresent : function() {
			this.present = true;
			this.substituted = false;
			for (var i = 0; i < this.present_listeners.length; ++i) {
				this.present_listeners[i]();
			}
		},


		_MoveHeightfield : function(pos, xz_scale, yscale, abs_xofs, abs_yofs) {
			for(var i = 0, i3 = 0; i3 < pos.length; ++i, i3 += 3) {
				pos[i3+0] = pos[i3+0] * xz_scale + abs_xofs;
				pos[i3+1] *= yscale;
				pos[i3+2] = pos[i3+2] * xz_scale + abs_yofs;
			}
		}
	});


	medea.TerrainNode = medea.Node.extend({

		init : function(name, data, settings) {
			this.settings = medea.Merge(settings,TerrainDefaultSettings);
			this._super(name, medea.NODE_FLAG_NO_ROTATION | medea.NODE_FLAG_NO_SCALING);

			if(this.settings.use_worker) {
				this._StartWorker();
			}

			this.data = data;
			this.cameras = {};

			// add a dummy entity whose only purpose is to keep a static bounding
			// box for the terrain
			var ent = medea.CreateEntity('TerrainBBDummyEntity');
			var ub = data.GetUnitBase(), s = data.GetScale();

			var vmax = [0.5 * data.GetWidth() * ub * s[0],s[1],0.5 * data.GetHeight() * ub * s[0]];
			var vmin = [-vmax[0],0.0,-vmax[2]];

			ent.BB([vmin,vmax]);
			this.AddEntity(ent);
		},


		UpdateTreshold : function(ts) {
			if (ts === undefined) {
				return this.settings.update_treshold;
			}
			this.settings.update_treshold = ts;
		},

		NoMensLandBorder : function(ts) {
			if (ts === undefined) {
				return this.settings.no_mens;
			}
			this.settings.no_mens = ts;
		},

		GetActiveEntities: function(cam) {
			var c = this.cameras[cam.id];
			if (c === undefined) {
				this._AddCamera(cam);
				return this.GetActiveEntities(cam);
			}

			// it is being used, so keep the data for this camera alive
			c.alive = medea.GetStatistics.frame_count;

			var rc = c.rings.length, t = new Array(rc);
			for( var i = 0; i < rc; ++i) {
				t[i] = c.rings[i].GetMeshes();
			}
			return Array.prototype.concat.apply(this.entities,t);
		},

		Cull : function(frustum) {
			// terrain is never culled, but we want culling for the invidual
			// meshes it is made up of.
			return medea.VISIBLE_PARTIAL;
		},

		Update: function(dtime) {
			this._super(dtime);

			var ub = this.data.GetUnitBase(), w = this.data.GetWidth(), h = this.data.GetHeight(), ut = this.UpdateTreshold();
			for(var k in this.cameras) {
				var cam = this.cameras[k];
				var ppos = cam.cam.GetWorldPos();

				var newx = ppos[0]/ub + w * 0.5;
				var newy = ppos[2]/ub + h * 0.5;

				var dx = newx - cam.startx, dy = newy - cam.starty;
				if (Math.abs(dx) > ut || Math.abs(dy) > ut) {
					for( var i = 0; i < cam.rings.length; ++i) {
						cam.rings[i].Update(ppos, newx, newy);
					}

					cam.startx = newx;
					cam.starty = newy;
				}
			}
			this.data.Update();
			this._CleanupCameras();
		},

		GetWorldHeightForWorldPos : function(wx,wz) {
			var mypos = this.GetWorldPos(), w = this.data.GetWidth(), h = this.data.GetHeight();

			if (wx.length === 3) {
				wz = wx[2];
				wx = wx[0];
			}

			var ub = this.data.GetUnitBase(), b = this.no_mens;

			wx = w*0.5 + (wx-mypos[0])/ub;
			wz = h*0.5 + (wz-mypos[2])/ub;

			if (wx < b || wx >= w-b || wz < b || wz >= h-b) {
				return null;
			}

			var h = this.data.TryGetHeightAtPos(wx, wz);
			return h === null ? null : h - mypos[1];
		},

		LOD : function(i,cam) {
			return this.cameras[cam.id].rings[i];
		},

		_GetCamEntry : function(cam) {
			// #ifdef DEBUG
			medea.DebugAssert(!!this.cameras[cam.id],'camera doesn\'t exist');
			// #endif

			return this.cameras[cam.id];
		},

		_AddCamera : function(cam) {
			// #ifdef DEBUG
			medea.DebugAssert(!this.cameras[cam.id],'camera exists already');
			// #endif

			var c = this.cameras[cam.id] = {};
			c.startx = c.starty = 1e10;
			c.cam = cam;

			// this way it doesn't care if someone call _GetCamEntry by
			// the entity object or the hull dictionary.
			c.id = cam.id;
			this._InitRings(c);

			// #ifdef LOG
			medea.LogDebug('terrain: creating terrain data for camera ' + cam.Name());
			// #endif LOG
		},

		_CleanupCameras : function() {
			var fc = medea.GetStatistics.frame_count, disp = [];
			for(var k in this.cameras) {
				var cam = this.cameras[k];
				if (cam.alive !== undefined && (fc-cam.alive > this.settings.camera_timeout || cam.cam.GetViewport() === null)) {
					// #ifdef LOG
					medea.LogDebug('terrain: dropping data for camera ' + cam.Name());
					// #endif LOG
					disp.push(k);
				}
			}
			for( var i = 0; i < disp.length; ++i) {
				delete this.cameras[disp[i]];
			}
		},

		_Dispatch : function(command, callback) {
			var args = Array.prototype.slice.call(arguments,2);
			if (!this.worker) {
				return callback(medea._workers[command].apply(this, args));
			}

			this.pending_jobs[this.job_id] = callback;
			this.worker.postMessage({
				command : command,
				arguments : args,
				job_id : this.job_id++
			});
		},

		_InitRings : function(v) {
			var lods = this.data.GetLODCount();
			v.rings = new Array(lods);

			for(var i = 0; i < lods; ++i) {
				v.rings[i] = new TerrainRing(this,i,v);
			}
		},

		_StartWorker : function() {
			var outer = this;
			medea.CreateWorker('worker_terrain', function(w) {
				outer.worker = w;
				outer.pending_jobs = {};
				outer.job_id = 0;

				return function(e) {
					var res = e.data;

					var job = outer.pending_jobs[res.job_id];
					medea.DebugAssert(!!job,'job not in waitlist');

					delete outer.pending_jobs[res.job_id];
					job(res.result);
				};
			});
		},

		_EndWorker : function() {
			if (!this.worker) {
				return;
			}

			this.worker.close();

			// forget all pending jobs .. not sure if this is so clever, though
			this.pending_jobs = {};
		},
	});

	medea.CreateTerrainNode = function(data_provider, settings) {
		return new medea.TerrainNode('terrain', data_provider, settings);
	};
});
