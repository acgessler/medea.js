
/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('sceneloader',['filesystem', 'material'],function(medealib, undefined) {
	"use strict";
	var medea = this;


	// failure loading a scene
	medea.SCENE_LOAD_STATUS_FAILED = 0;

	// scene has been downloaded, now starting to decode it
	medea.SCENE_LOAD_STATUS_DOWNLOADED = 1;

	// scene geometry and topology has been fully loaded, but materials
	// and textures may still be pending.
	medea.SCENE_LOAD_STATUS_GEOMETRY_FINISHED = 2;

	// (not supported yet)
	// all pending resources are loaded
	medea.SCENE_LOAD_STATUS_FINISHED = 3;



	var FixTexturePath = function(path, root) {
		return root+'/'+ path.replace(/^\.(\\|\/)(.*)/,'$2');
	};


	var DefaultMaterialResolver = function(mat_params, root) {
		// for now, just distinguish between textured and non-textured materials and leave more sophisticated stuff for later
		if(mat_params.diffuse_texture) {
			var nm = mat_params.normal_texture || mat_params.height_texture;
			if(nm) {
				nm = FixTexturePath(nm, root);
			}
			return medea.CreateSimpleMaterialFromTexture(FixTexturePath(mat_params.diffuse_texture, root),
				true,
				mat_params.shininess,
				false,
				nm);
		}

		return medea.CreateSimpleMaterialFromColor( mat_params.diffuse || [0.2,0.2,0.2,1.0], 
			true,
			mat_params.shininess);
	};

	var CreateDefaultMaterialResolver = function(url) {
		url = url || medea.root_url;
		return function(p) {
			return DefaultMaterialResolver(p,url);
		};
	};

	/** note: callback is called with either true or false depending whether 
	 *  loading was successful or not. 
	 */
	medea.LoadScene = function(src, anchor, format_hint, callback, material_resolver, url_root) {
		format_hint = format_hint || 'assimp2json';
		material_resolver = material_resolver || CreateDefaultMaterialResolver(url_root);

		if((new String(format_hint)).slice(0,8) === 'function') {
			format_hint(src, anchor, callback, material_resolver);
			return;
		}
			
		// XXX we need better (read: some) error handling here
		medea.LoadModules('sceneloader_'+format_hint,function() {
				medea['_LoadScene_'+format_hint](src, anchor, callback, material_resolver);
		});
	};

	/** note: callback is called with either true or false depending whether 
	 *  loading was successful or not. 
	 */
	medea.LoadSceneFromResource = function(src, anchor, format_hint, callback, material_resolver) {
		material_resolver = material_resolver || CreateDefaultMaterialResolver(src.replace(/^(.*[\\\/])?(.*)/,'$1'));
		medea.Fetch(src,function(data) {
			if(!data) {
				if (callback) {
					callback(medea.SCENE_LOAD_STATUS_FAILED);
				}
				return;
			}
			if (callback) {
				callback(medea.SCENE_LOAD_STATUS_DOWNLOADED);
			}
			medea.LoadScene(data,anchor,format_hint,callback, material_resolver);
		});
	};
});
