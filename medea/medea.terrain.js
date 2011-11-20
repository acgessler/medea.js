
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
			this.lod_count = cnt+1;
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
			
			var ub = this.desc.unitbase * real_scale;
			var xx = Math.floor(x*ub), yy = Math.floor(y*ub), ww = Math.floor(w*ub), hh = Math.floor(h*ub);
			
			var sbase = real_scale/want_scale;
			return this._CreateHeightField(match._cached_img, xx, yy, ww, hh, sbase*this.desc.scale[1], sbase*this.desc.scale[0] );
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
	
		_RegisterMap : function(map) {
			// #ifdef DEBUG
			medea.DebugAssert(!!map._cached_img,"expect image data to be loaded: " + map.img);
			// #endif
					
			this.maps_bysize[map.size[0] + '_'+ map.size[1]] = map; 
		},
		
		_FetchMap : function(map,callback) {
			var outer = this;
			medea.CreateImage(this.url_root + '/' + map.img, function(img) {
				map._cached_img = img;
				outer._RegisterMap(map);
				
				callback();
			});
		},
		
		_CreateHeightField : function(img, x,y,w,h) {
			return medea._HeightfieldFromOddSidedHeightmapPart(img, x,y,w+1,h+1, 1.0/16);
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

            this.startx = this.starty = 1e-10;            
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
			var t = this.terrain, d = t.data, ilod = 1<<this.lod, outer = this, ppos = this.ppos;
		
			d.RequestLOD( this.startx, this.starty,1*ilod,1*ilod,this.lod, function(tup) {
				var v = d.SampleLOD(tup);
				var pos = v[0], wv = v[1], hv = v[2], w = wv-1, h = hv-1;
				
				// center the heightfield and scale it according to its LOD
				outer._MoveHeightfield(pos, ilod, 13.5,-w/2, -h/2, ppos[0], ppos[2]);
                
				
				var nor = new Array(pos.length), tan = new Array(pos.length), bit = new Array(pos.length);
				medea._GenHeightfieldTangentSpace(pos, wv, hv, nor, tan, bit);
				
				var uv = new Array(wv*hv*2);
				medea._GenHeightfieldUVs(uv,wv,hv);
                
                var m, vertices = { positions: pos, normals: nor, uvs: [uv]};
                
                if(!outer.cached_mesh) {
                    var indices;
				
                    if (outer.lod === 0) {
                        indices = new Array(w*h*2*3);
                        medea._GenHeightfieldIndicesLOD(indices,w,h);
                    }
                    else {
                        indices = new Array(w*h*2*3*0.25);
                        var c = (outer.lod === d.GetLODCount()-1 ? medea._GenHeightfieldIndicesWithHole : medea._GenHeightfieldIndicesWithHoleLOD)(indices,w,h,w/4,h/4,w/2,h/2);
                    
                        // #ifdef DEBUG
                        medea.DebugAssert(c == indices.length, 'unexpected number of indices');
                        // #endif 
                    }
                
                    m = outer.cached_mesh = medea.CreateSimpleMesh(vertices, indices, 
                        medea.CreateSimpleMaterialFromColor([0.8,0.8*(outer.lod/d.GetLODCount()),0.8,1.0], true),
                        
                        medea.VERTEXBUFFER_USAGE_DYNAMIC
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
			});
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
			this._super(name);
			
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
		},
		
		_InitRings : function() {
			var lods = this.data.GetLODCount();
			this.rings = new Array(lods);
			
			for(var i = 0; i < lods; ++i) {
				this.rings[i] = new TerrainRing(this,i);
			}
		},
	});
	
	
	medea.CreateTerrainNode = function(data_provider, cam_node) {
		return new TerrainNode('terrain', data_provider, cam_node);
	};
});
