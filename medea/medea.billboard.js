
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
	//
	// If |fixed_size| is true, the screen-size of the billboard is kept
	// constant. The world scaling of the node then determines the scaling
	// as if the billboard had a camera distance of 1.
	medea.CreateBillboardNode = function(texture, premultiplied_alpha, fixed_size) {
		var nd = medea.CreateNode("billboard_" + cnt_billboards++);

		var defines = {};
		if (fixed_size) {
			defines.FIXED_SIZE = '1';
		}

		var material = medea.CreateSimpleMaterialFromShaderPair('remote:mcore/shaders/billboard', {
			texture : medea.CreateTexture( texture ),
			scaling : function() {
				return nd.GetWorldUniformScale();
			},
		}, null, defines);
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

		material.Pass(0).CullFace(false);

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