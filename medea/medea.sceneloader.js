
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medea.define('sceneloader',['filesystem', 'material'],function(undefined) {
	"use strict";
	var medea = this;


	var DefaultMaterialResolver = function(mat_params, root) {
		// for now, just distinguish between textured and non-textured materials and leave more sophisticated stuff for later
		if(mat_params.diffuse_texture) {
			return medea.CreateSimpleMaterialFromTexture(root+'/'+ mat_params.diffuse_texture.replace(/^\.(\\|\/)(.*)/,'$2'),true);
		}

		return medea.CreateSimpleMaterialFromColor( mat_params.diffuse || [0.2,0.2,0.2,1.0], true );
	};

	var CreateDefaultMaterialResolver = function(url) {
		url = url || medea.root_url;
		return function(p) {
			return DefaultMaterialResolver(p,url);
		};
	};

	//
	medea.LoadScene = function(src,anchor,format_hint,callback, material_resolver,url_root) {
		format_hint = format_hint || 'assimp2json';
		material_resolver = material_resolver || CreateDefaultMaterialResolver(url_root);

		// XXX we need better (read: some) error handling here
		medea._FetchDeps('sceneloader_'+format_hint,function() {
				medea['_LoadScene_'+format_hint](src,anchor,callback, material_resolver);
		});
	};

	//
	medea.LoadSceneFromResource = function(src,anchor,format_hint,callback, material_resolver) {
		material_resolver = material_resolver || CreateDefaultMaterialResolver(src.replace(/^(.*[\\\/])?(.*)/,'$1'));
		medea.Fetch(src,function(data) {
			medea.LoadScene(data,anchor,format_hint,function() {
				// #ifdef LOG
				medea.LogDebug("sceneloader: scene hierarchy is present, but dependent resources may still be pending: " + src);
				// #endif
				callback();
			}, material_resolver);
		}, function() {
			// XXX handle error
		});
	};
});
