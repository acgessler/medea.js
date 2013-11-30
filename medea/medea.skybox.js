
/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('skybox',['material','standardmesh','cubetexture'],function(medealib, undefined) {
	"use strict";
	var medea = this;


	medea.CreateSkyboxNode = function(texbase) {
		var nd = medea.CreateNode("skybox");

		var mesh = medea.CreateStandardMesh_Cube(medea.CreateSimpleMaterialFromShaderPair('remote:mcore/shaders/skybox',{
			texture : medea.CreateCubeTexture( texbase )
		}));

		mesh.BB(medea.BB_INFINITE);

		
		mesh.RenderQueue(medea.RENDERQUEUE_BACKGROUND);
		mesh.Material().Passes().forEach( function(p) {
			p.State({
			'depth_test'  : true,
			'depth_write' : false,
			'cull_face' : true,
			'cull_face_mode' : 'front'
			});
		});

		nd.AddEntity(mesh);
		return nd;
	};
});
