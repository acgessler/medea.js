
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medealib.define('sceneloader',['filesystem', 'material'],function(undefined) {
	"use strict";
	var medea = this;


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
		medea._FetchDeps('sceneloader_'+format_hint,function() {
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
				callback(false);
				return;
			}
			medea.LoadScene(data,anchor,format_hint,function(status) {
				if(!status) {
					callback(false);
					return;
				}
				// #ifdef LOG
				medealib.LogDebug("sceneloader: scene hierarchy is present, but dependent resources may still be pending: " + src);
				// #endif
				callback(true);
			}, material_resolver);
		});
	};
});
