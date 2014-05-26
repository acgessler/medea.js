
/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */
 // note: json2.js may be needed for contemporary browsers with incomplete HTML5 support
medealib.define('sceneloader_assimp2json',['mesh','filesystem', 'json2.js', 'continuation'],function(medealib, undefined) {
	"use strict";
	var medea = this;


	var LoadMaterial = function(w,material_idx) {
		if (w.materials[material_idx]) {
			return w.materials[material_idx];
		}
		var inmaterial = w.scene.materials[material_idx].properties, props = {};

		// scan for some common material properties and pass them on to
		// the user-defined material resolver, whose task is to match
		// those standard properties to the application's material
		// framework.
		for(var i = 0; i < inmaterial.length; ++i) {
			var prop = inmaterial[i];

			if(prop.key === '$clr.diffuse') {
				props['diffuse'] = prop.value;
			}
			else if(prop.key === '$clr.specular') {
				props['specular'] = prop.value;
			}
			else if(prop.key === '$clr.diffuse') {
				props['diffuse'] = prop.value;
			}
			else if(prop.key === '$clr.emissive') {
				props['emissive'] = prop.value;
			}
			else if(prop.key === '$mat.shininess') {
				props['shininess'] = prop.value;
			}
			else if(prop.key === '$mat.shadingm') {
				props['shading_model'] = {
					3 : 'Phong',
					4 : 'Blinn',
					5 : 'Toon'
				}[prop.value] || 'Gouraud';
			}
			else if(prop.key === '$tex.file') {
				var n = {
					1 : 'diffuse',
					2 : 'specular',
					3 : 'ambient',
					4 : 'emissive',
					5 : 'height',
					6 : 'normal',
					7 : 'shininess',
					8 : 'opacity'
				}[prop.semantic];

				if(n) {
					props[n+'_texture'] = prop.value;

				}
			}
		}

		var mat = w.materials[material_idx] = w.material_resolver(props);
		mat.imported_mat_data = props;
		return mat;
	};

	var LoadMesh = function(w,mesh_idx) {
		if (w.meshes[mesh_idx]) {
			return w.meshes[mesh_idx];
		}
		var inmesh = w.scene.meshes[mesh_idx];

		// requirements: only one primitive type per mesh, no polygons
		// this should always be fullfilled for scenes produced by the original assimp2json tool.
		if(inmesh.primitivetypes !== 1 && inmesh.primitivetypes !== 2 && inmesh.primitivetypes !== 4) {
			throw "expect pure, triangulated meshes with only a single type of primitives";
		}

		// the same applies to the number of unique vertices in the mesh -
		// with the original assimp2json tool, we can always fit them 
		// into 16 bit index buffers.
		if(inmesh.vertices.length > 65536 * 3) {
			throw "mesh size is too big, need to be able to use 16 bit indices";
		}

		var indices = new Array(inmesh.faces.length*inmesh.faces[0].length);
		for(var i = 0, n = 0, end = inmesh.faces.length; i < end; ++i) {
			var f = inmesh.faces[i];
			for(var j = 0, e = f.length; j < e; ++j, ++n) {
				indices[n] = f[j];
			}
		}

		// note: this modifies the input mesh, but copying would be too expensive
		// and would bring no extra value, after all we access each mesh only once.
		inmesh['positions'] = inmesh['vertices'];
		inmesh['uvs'] = inmesh['texturecoords'];

		// flip v component of UV coordinates
		if(inmesh['uvs']) {
			for(var i = 0; i < inmesh['uvs'].length; ++i) {
				var uv = inmesh['uvs'][i], c = inmesh['numuvcomponents'][i] || 2;
				for(var n = 0, e = uv.length/c; n < e; ++n) {
					uv[n*c+1] = 1.0-uv[n*c+1];
				}
			}
		}

		var outmesh = medea.CreateSimpleMesh(inmesh,indices,LoadMaterial(w,inmesh.materialindex));

		w.meshes[mesh_idx] = outmesh;
		return outmesh;
	};

	var LoadNode = function(w,anchor,node) {
		var outnd = anchor.AddChild(node.name);
		outnd.LocalTransform(mat4.transpose(mat4.create(node.transformation)), true);


		if(node.meshes) {
			for(var i = 0; i < node.meshes.length; ++i) {
			// #if DEBUG
				medealib.DebugAssert(!!w.meshes[node.meshes[i]], 'meshes should have been created before');
			// #endif
				outnd.AddEntity(w.meshes[node.meshes[i]]);
			}
		}

		if(node.children) {
			for(var i = 0; i < node.children.length; ++i) {
				LoadNode(w,outnd,node.children[i]);
			}
		}
	};


	var LoadScene = function(scene,anchor,callback,material_resolver) {
		// batch the working set together in a dumpbin and pass it around 
		var working = {
			callback : callback,
			scene : scene,
			material_resolver : material_resolver,

			meshes : new Array(scene.meshes.length),
			materials : new Array(scene.materials.length)
		}
		,	cont, i, e;


		// loading meshes can take a bit on slower systems, so we have to spread
		// the work across multiple frames to avoid unresponsive script errors.
		cont = medea.CreateContinuation();

		// one job per mesh
		if(scene.meshes) {
			scene.meshes.forEach(function(m,i) {
				cont.AddJob(function() {
					LoadMesh(working, i);
				});
			});
		}

		// final assembly job
		cont.AddJob(function() {
			LoadNode(working,anchor,scene.rootnode);

			if (working.callback) {
				working.callback(medea.SCENE_LOAD_STATUS_GEOMETRY_FINISHED);
			}
		});

		cont.Schedule();
	};


	medea._LoadScene_assimp2json = function(src, anchor, callback, material_resolver) {
		medealib.DebugAssert(material_resolver, "need a valid material resolver");

		// see if we got a JSON DOM or a unparsed string
		if(src.rootnode === undefined) {
			try {
				src = JSON.parse(src);
			}
			catch(e) {
				// #ifdef DEBUG
				medealib.DebugAssert("Failed to read assimp2json scene from JSON, JSON.parse failed: " + e);
				callback(false);
				// #endif
				return;
			}
		}

		try {
			LoadScene(src, anchor, callback, material_resolver);
		} 
		catch(e) {
			// #ifdef DEBUG
			console.log(e.stack);	
			medealib.DebugAssert("Failed to read assimp2json scene: " + e);		
			// #endif

			callback(false);
			return;
		} 
	};
}, ['_LoadScene_assimp2json']);


