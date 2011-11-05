
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler 
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medea._addMod('standardmesh',['mesh'],function(undefined) {
	var medea = this;
	
	medea.CreateStandardMesh_Plane = function(color_or_material) {
		return medea.CreateSimpleMesh(
		{ positions : [
			  // Bottom face
			  -1.0, 0.0, -1.0,
			   1.0, 0.0, -1.0,
			   1.0, 0.0,  1.0,
			  -1.0, 0.0,  1.0,
		], // !pos
		
		uvs: [[
			 // Front
			0.0,  0.0,
			1.0,  0.0,
			1.0,  1.0,
			0.0,  1.0,
			]]
		},
			 // indices
			[ 	
				0, 1, 2,     0, 2, 3,   // bottom  
			],
		color_or_material || [1.0,0.0,0.0,1.0]);
	};

	
	medea.CreateStandardMesh_Cube = function(color_or_material) {
		return medea.CreateSimpleMesh(
		{ positions :
			[ // (vertices taken from http://learningwebgl.com/blog/?p=370)
				 // Front face
			  -1.0, -1.0,  1.0,
			   1.0, -1.0,  1.0,
			   1.0,  1.0,  1.0,
			  -1.0,  1.0,  1.0,

			  // Back face
			  -1.0, -1.0, -1.0,
			  -1.0,  1.0, -1.0,
			   1.0,  1.0, -1.0,
			   1.0, -1.0, -1.0,

			  // Top face
			  -1.0,  1.0, -1.0,
			  -1.0,  1.0,  1.0,
			   1.0,  1.0,  1.0,
			   1.0,  1.0, -1.0,

			  // Bottom face
			  -1.0, -1.0, -1.0,
			   1.0, -1.0, -1.0,
			   1.0, -1.0,  1.0,
			  -1.0, -1.0,  1.0,

			  // Right face
			   1.0, -1.0, -1.0,
			   1.0,  1.0, -1.0,
			   1.0,  1.0,  1.0,
			   1.0, -1.0,  1.0,

			  // Left face
			  -1.0, -1.0, -1.0,
			  -1.0, -1.0,  1.0,
			  -1.0,  1.0,  1.0,
			  -1.0,  1.0, -1.0, 
		], // !pos
		
		uvs: [[
			 // Front
			0.0,  0.0,
			1.0,  0.0,
			1.0,  1.0,
			0.0,  1.0,
			// Back
			0.0,  0.0,
			1.0,  0.0,
			1.0,  1.0,
			0.0,  1.0,
			// Top
			0.0,  0.0,
			1.0,  0.0,
			1.0,  1.0,
			0.0,  1.0,
			// Bottom
			0.0,  0.0,
			1.0,  0.0,
			1.0,  1.0,
			0.0,  1.0,
			// Right
			0.0,  0.0,
			1.0,  0.0,
			1.0,  1.0,
			0.0,  1.0,
			// Left
			0.0,  0.0,
			1.0,  0.0,
			1.0,  1.0,
			0.0,  1.0
		]], // !uvs
		},
			 
			 // indices
			[ 	0,  1,  2,      0,  2,  3,    // front  
				4,  5,  6,      4,  6,  7,    // back  
				8,  9,  10,     8,  10, 11,   // top  
				12, 13, 14,     12, 14, 15,   // bottom  
				16, 17, 18,     16, 18, 19,   // right  
				20, 21, 22,     20, 22, 23    // left
			],
		color_or_material || [1.0,0.0,0.0,1.0]);
	};
});

