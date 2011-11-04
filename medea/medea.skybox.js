
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander Ċ. Gessler 
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medea._addMod('skybox',['standardmesh','cubetexture'],function(undefined) {
	var medea = this;
	
	
	medea.CreateSkyboxNode = function(texbase) {
		var nd = medea.CreateNode("skybox");
		
		var mesh = medea.CreateStandardMesh_Cube(medea.CreateSimpleMaterialFromShaderPair('remote:mcore/shaders/skybox',{
			texture : medea.CreateCubeTexture( texbase )
		}));
		
		medea._initMod('renderqueue');
		mesh.RenderQueue(medea.RENDERQUEUE_BACKGROUND);
		mesh.Material().Pass(0).State({
			'depth_test'  : true,
			'depth_write' : false,
		});
		
		nd.AddEntity(mesh);
		return nd;
	};
});
