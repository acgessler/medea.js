
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medea.define('skydome',['mesh'],function(undefined) {
	"use strict";
	var medea = this;

	// based on my old engine code, which itself took this algorithm from
	// this paper on athmospheric scattering:
	// http://www2.imm.dtu.dk/pubdb/views/edoc_download.php/2554/pdf/imm2554.pdf
	var CreateDomeMesh = function(mat, lower_amount, rings) {
		var pi = Math.PI, sin = Math.sin, cos = Math.cos, sqrt = Math.sqrt, round = Math.round, abs = Math.abs;

		rings = rings || 35;
		lower_amount = lower_amount || 0.0;
		var pcnt = round(rings*0.5*rings*2*pi);

		var pos = new Array(pcnt*3);
		var nor = new Array(pcnt*3);
		var uv = new Array(pcnt*2);
		var ring_info = new Array(rings);

		ring_info[0] = [0,0.0];
		pos[0] = 0;
		pos[1] = 1.0 - lower_amount;
		pos[2] = 0;

		nor[0] = 0;
		nor[1] = -1.0;
		nor[2] = 0;

		uv[0] = 0.5;
		uv[1] = 0.5;

		// generate vertices
		var ipos = 3, iuv = 2, lat = 0.0, lad = pi*0.5/rings, fac = pi*2.0/sin(lad), x,z,y, l;
		for(var r = 1; r < rings; ++r) {
			lat += lad;

			var rad = sin(lat)*fac, nmp = round(rad);
			ring_info[r] = [nmp,nmp - ring_info[r-1][0]];


			var lon = 0.0, ldf = pi*2.0/nmp;
			for(var p = 0; p < nmp; ++p, lon += ldf) {

				x = pos[ipos+0] = cos(lon) * sin(lat);
				y = pos[ipos+1] = cos(lat) - lower_amount;
				z = pos[ipos+2] = sin(lon) * sin(lat);

				if(y < 0) {
					y = 0;
				}

				l = -sqrt( x*x + y*y + z*z );
				nor[ipos++] = x/l;
				nor[ipos++] = y/l;
				nor[ipos++] = z/l;

				uv[iuv++] = (x + 1.0)*0.5;
				uv[iuv++] = (z + 1.0)*0.5;
			}
		}

		// XXX
		pos.length = ipos;
		nor.length = ipos;
		uv.length = iuv;

		var n = 0;
		for(var i = 1; i < rings; ++i) {
			n += ring_info[i][0]*3; // XXX improve accuracy, this is just a very rough upper boundary
		}

		var ind = new Array(n);
		n = 0;

		// generate indices
		var ct1 = 0, ct2 = 1;
		for(var i = 1; i < rings; ++i) {

			var rinfo = ring_info[i], fs = abs(rinfo[0]/rinfo[1]), spaces = 0, ct1s = ct1, ct2s = ct2, ns = 0;
			console.log(fs);
			for(var j = 0; j < rinfo[0]; ++j) {

				if (j === 0 && rinfo[1] > 0) {
					ind[n++] = ct2;
					ind[n++] = ct1;
					ind[n++] = ct2+1;

					++ct2, ++spaces;
					ns = round(spaces*fs);
				}
				else if (j === 0 && rinfo[1] < 0) {
					ind[n++] = ct2;
					ind[n++] = ct1;
					ind[n++] = ct1+1;

					ind[n++] = ct2;
					ind[n++] = ct1+1;
					ind[n++] = ct2+1;

					++ct2, ++ct1, ++spaces;
					ns = round(spaces*fs);
				}
				else if (j === rinfo[0]-1 && ct1 === 0) {
					ind[n++] = ct2;
					ind[n++] = ct1;
					ind[n++] = ct2s;

					++ct2, ++ct1;
				}
				else if (j === rinfo[0]-1 && rinfo[1] >= 0 && ct1 > 0) {
					ind[n++] = ct2;
					ind[n++] = ct1;
					ind[n++] = ct1s;

					ind[n++] = ct2;
					ind[n++] = ct1s;
					ind[n++] = ct2s;

					++ct2, ++ct1;
				}
				else if (j === rinfo[0]-1 && rinfo[1] < 0) {
					ind[n++] = ct2;
					ind[n++] = ct1;
					ind[n++] = ct1+1;

					ind[n++] = ct2;
					ind[n++] = ct1+1;
					ind[n++] = ct2s;

					ind[n++] = ct2s;
					ind[n++] = ct1+1;
					ind[n++] = ct1s;

					++ct2, ct1 += 2;
				}
				else if (j === ns && rinfo[1] > 0) {
					ind[n++] = ct2;
					ind[n++] = ct1;
					ind[n++] = ct2+1;

					++ct2, ++spaces;
					ns = round(spaces*fs);
				}
				else if (j === ns && rinfo[1] < 0) {
					ind[n++] = ct2;
					ind[n++] = ct1;
					ind[n++] = ct1+1;

					--j, ++ct1, ++spaces;
					ns = round(spaces*fs);
				}
				else {
					ind[n++] = ct2;
					ind[n++] = ct1;
					ind[n++] = ct1+1;

					ind[n++] = ct2;
					ind[n++] = ct1+1;
					ind[n++] = ct2+1;

					++ct2, ++ct1;
				}
			}
		}

		ind.length = n;
		return medea.CreateSimpleMesh({ positions:pos, normals:nor, uvs:[uv] }, ind, mat);
	};


	/* --{
	@entry medea CreateSkydomeNode

	Create a scenegraph node and attach a skydome to it. The skydome is simply a mesh
	that is configured to add itself to the {background rendering queue -> medea
	RenderQueue}. The default skydome effect is located in "mcore/shaders/skydome"
	and draws the skydome behind the rest of the scene, using a single sphere texture.

	`CreateSkydomeNode(texbase, lower_amount, rings)`

	texbase:
	@a URI; of the texture to be displayed on the skydome.

	lower_amount:
	Amount by which the skydome is shifted downwards on the y-axis. This is to make
	sure that the horizon is fully covered. Typical values are 0 ... 0.5 depending
	on the setting.

	rings:
	Number of longitudial 'rings' to subdivide the skydome into. This determines
	how smooth the texture will look on the dome, but high values affect rendering
	speed negatively. Typical values range from 10 ... 35.

	Returns a {medea Node} instance.
	}-- */
	medea.CreateSkydomeNode = function(texbase, lower_amount, rings) {
		var nd = medea.CreateNode("skydome");

		var mesh = CreateDomeMesh(medea.CreateSimpleMaterialFromShaderPair('remote:mcore/shaders/skydome',{
			texture : medea.CreateTexture( texbase )
		}), lower_amount, rings);

		mesh.BB(medea.BB_INFINITE);

		medea._initMod('renderqueue');
		mesh.RenderQueue(medea.RENDERQUEUE_BACKGROUND);
		mesh.Material().Passes().forEach( function(p) {
			p.State({
			'depth_test'  : true,
			'depth_write' : false,
			'cull_face'   : true,
			'cull_face_mode' : 'front'
			});
		});

		nd.AddEntity(mesh);
		return nd;
	};
});
