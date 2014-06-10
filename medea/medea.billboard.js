
/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('billboard',['mesh'], function(medealib, undefined) {
	"use strict";
	var medea = this;

	var cnt_billboards = 0;

	// Creates a node that has an unit-size billboard attached to a node.
	//
	// This is for drawing singular billboards. Do not use to draw huge
	// amounts of billboards.
	//
	// By default, the texture is drawn with alpha blending, assuming
	// no pre-multiplied alpha. Pass |premultiplied_alpha| truthy to
	// assume pre-multiplied alpha.
	medea.CreateBillboardNode = function(texture, premultiplied_alpha) {
		var nd = medea.CreateNode("billboard_" + cnt_billboards++);

		var material = medea.CreateSimpleMaterialFromShaderPair('remote:mcore/shaders/billboard', {
			texture : medea.CreateTexture( texture ),
			scaling : function() {
				return 100; //nd.GetWorldUniformScale();
			},
		});
		var mesh = medea.CreateSimpleMesh({ 
				positions : [
				  0.0, 0.0, 0.0,
				  0.0, 0.0, 0.0,
				  0.0, 0.0, 0.0,
				  0.0, 0.0, 0.0
				], // !pos

				uvs: [[
					0.0,  0.0,
					1.0,  0.0,
					1.0,  1.0,
					0.0,  1.0
					]]
				},
			[
				0, 1, 2,     0, 2, 3  
			],
		material);

		mesh.Material().Passes().forEach( function(p) {
			p.State({
			'depth_test'  : true,
			'depth_write' : false,
			'cull_face'   : false,
			'cull_face_mode' : 'front'
			});
		});

		// The billboard is a plane mesh, but because it is aligned
		// with the camera axis, its bounding box is the unit cube.
		mesh.BB(medea.CreateBB([-1, -1, -1], [1, 1, 1]));
		
		if (premultiplied_alpha) {
			material.Pass(0).SetDefaultAlphaBlending();
		}
		else {
			material.Pass(0).SetDefaultAlphaBlendingNotPremultiplied();
		}
		mesh.RenderQueue(medea.RENDERQUEUE_ALPHA);

		nd.AddEntity(mesh);
		nd.SetStaticBB(medea.BB_INFINITE);
		return nd;
	};
});