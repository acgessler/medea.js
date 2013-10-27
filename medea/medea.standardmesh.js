
/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('standardmesh',['mesh'],function(undefined) {
	"use strict";
	var medea = this;

	
	medea.STANDARD_MESH_SMOOTH_NORMALS 	= 0x1;
	medea.STANDARD_MESH_HARD_NORMALS 	= 0x2;
	medea.STANDARD_MESH_UVS 			= 0x4;
	
	medea.STANDARD_MESH_DEFAULT			= medea.STANDARD_MESH_UVS;
	
	
	medea.CreateStandardMesh_Plane = function(color_or_material) {
		return medea.CreateSimpleMesh(
		{ positions : [
			  // Bottom face
			  -1.0, 0.0, -1.0,
			   1.0, 0.0, -1.0,
			   1.0, 0.0,  1.0,
			  -1.0, 0.0,  1.0
		], // !pos

		uvs: [[
			 // Front
			0.0,  0.0,
			1.0,  0.0,
			1.0,  1.0,
			0.0,  1.0
			]]
		},
			 // indices
			[
				0, 1, 2,     0, 2, 3   // bottom
			],
		color_or_material || [1.0,0.0,0.0]);
	};


	medea.CreateStandardMesh_Cube = function(color_or_material, flags) {
		flags = flags === undefined ? medea.STANDARD_MESH_DEFAULT : flags;
	
		var cache_name = "medea.CreateStandardMesh_Cube--"+flags;
		var cached = medea.QueryMeshCache(cache_name);
		if(cached) {
			return medea.CloneMesh(cached, color_or_material);
		}
		
		var vdata = { 
			positions :
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
				  -1.0,  1.0, -1.0
			] // !pos
		};
		
		if(flags & medea.STANDARD_MESH_UVS) {
			vdata.uvs = [[
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
			]];
		}
		
		if(flags & medea.STANDARD_MESH_HARD_NORMALS) {
			vdata.normals =
				[ 
					 // Front face
				  0.0,  0.0,  1.0,
				  0.0,  0.0,  1.0,
				  0.0,  0.0,  1.0,
				  0.0,  0.0,  1.0,

				  // Back face
				  0.0, 0.0, -1.0,
				  0.0, 0.0, -1.0,
				  0.0, 0.0, -1.0,
				  0.0, 0.0, -1.0,

				  // Top face
				  0.0,  1.0, 0.0,
				  0.0,  1.0, 0.0,
				  0.0,  1.0, 0.0,
				  0.0,  1.0, 0.0,

				  // Bottom face
				  0.0, -1.0, 0.0,
				  0.0, -1.0, 0.0,
				  0.0, -1.0, 0.0,
				  0.0, -1.0, 0.0,

				  // Right face
				   1.0, 0.0, 0.0,
				   1.0, 0.0, 0.0,
				   1.0, 0.0, 0.0,
				   1.0, 0.0, 0.0,

				  // Left face
				  -1.0, 0.0, 0.0,
				  -1.0, 0.0, 0.0,
				  -1.0, 0.0, 0.0,
				  -1.0, 0.0, 0.0
				];
		}
		else if(flags & medea.STANDARD_MESH_SMOOTH_NORMALS) {
			vdata.normals = vdata.positions;
		}
		

	
		return medea.CreateSimpleMesh(
			vdata,

			 // indices
			[ 	0,  1,  2,      0,  2,  3,    // front
				4,  5,  6,      4,  6,  7,    // back
				8,  9,  10,     8,  10, 11,   // top
				12, 13, 14,     12, 14, 15,   // bottom
				16, 17, 18,     16, 18, 19,   // right
				20, 21, 22,     20, 22, 23    // left
			],
			color_or_material || [1.0,0.0,0.0],
			0,
			cache_name);
	};
});

