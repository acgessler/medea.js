medea.js
========

#### High-performance WebGL-based 3D engine ####

medea is a scenegraph-based, lightweight and highly optimized 3D engine for JavaScript. While all planned features are not yet implemented, the framework is ready for productive use. In a long-term view, the library aims to be a solid, industry-strength platform for use of 3D content on the web.

**Major design goals**:

 - _Data-driven material system_ supporting automatic dynamic lighting and shadowing. The framework abstracts both forward and deferred lighting methods while still offering full flexibility to shader authors.
 - _Asynchronous and progressive loading_ to minimize 'hard' loading times.
 - Optimized _scene management and visibility detection_ to minimize rendering time.
 - _Offline content processing_ to save as much bandwidth and runtime overhead as possible. For instance <a href="http://assimp.sourceforge.net">Open Asset Import Library</a> 
  (via <a href="https://github.com/acgessler/assimp2json">assimp2json</a>) is used to import geometry from about thirty 3D model formats.
 - _Automatic detail management_ so medea-based applications can scale to all platforms, including mobile devices.



### Media ###

A rather boring video showing medea's experimental terrain system (<a href="http://www.youtube.com/watch?v=VGLvI7iFjsE">youtube</a>).

<a href="http://www.youtube.com/watch?v=VGLvI7iFjsE"><img src="http://acgessler.github.com/medea.js/media/splash1.PNG" alt="terrain scene"></a>

Crytek's Sponza Test Scene with dynamic lighting without shadows running in fullscreen mode (loaded via <a href="https://github.com/acgessler/assimp2json">assimp2json</a>).

<img src="http://www10.pic-upload.de/04.08.13/telps3yuwbt2.png"> </img>

### Documentation ###

Medea's basic structure is very similar to that of other, non-browser-based 3D engines, so anyone with some experience in 3D programming will not need much time to get to work with it. 

Documentation will soon be available; for now, have a look at the `samples/` folder.

### Usage Sample ###

This is effectively the whole code for the terrain in the above video.

```javascript
medea.Ready("canvas",{dataroot:'../../data'},['camcontroller'],function() {

	// create a viewport to fill the entire <canvas>
	var viewport = medea.CreateViewport();
	viewport.ClearColor([1.0,1.0,1.0]);
 
	var root = medea.RootNode();

	// create a camera node and attach it to both the scenegraph and the viewport.
	var cam = medea.CreateCameraNode("MainCamera");
	root.AddChild(cam);
	viewport.Camera(cam);
	
	// add a first-person-style camera controller (i.e. input handler).
	// camera controllers are entities and can be attached to
	// arbitrary nodes, not only cameras.
	var cam_controller = medea.CreateCamController('fps');
	cam.AddEntity(cam_controller);
	cam_controller.Enabled(true);
		
	// add terrain - this is highly asynchronous because a lot of data needs to be loaded
	medea.FetchMods(['terrain'], function() {
		medea.CreateDefaultTerrainDataProviderFromResource('remote:terrain_sample/terrain.json', function(p) {
		
			var ter = medea.CreateTerrainNode(p);
			root.AddChild(ter);
			
			medea.FetchMods('terrainheightpath', function() {
				var terrain_animator = medea.CreateTerrainHeightPathAnimator(ter,15.0);
				cam.AddEntity(terrain_animator);
				cam_controller.TerrainEntity(terrain_animator);
			});
		});
	});
	
	// add skydome (the texture will be fetched in the background)
	medea.FetchMods('skydome',function() {
		root.AddChild(medea.CreateSkydomeNode('remote:skydome_sample/midmorning/midmorning.png',0.4));
	});
}
```

### Deployment ###

The `compile.py` script is used to compile all the medea modules that are needed by an application into one file. It optionally embeds textual resources, such as shaders, into the compiled package. The resulting files can then be minified using standard JS minifiers (Google Closure Compiler is recommended because it knows how to keep necessary license headers).

An _average_ medea distribution is only about `120 KiB`.

### License ###

The license of medea is based on a 3-clause BSD-style license. This means, you are free to use medea even in your commercial websites provided the copyright notice, conditions and disclaimer of the license are included. 

See the `LICENSE file for the full wording.

### Contributions ###

Are very welcome! Fork it on Github, and do a pull request against the main repository.

