medea.js
========

#### Highly optimized, robust, lightweight __3D engine for JavaScript__.  ####

Medea is a __stable, clean and consistent API__ with testing coverage. It enables productive WebGl development and strives to meet high requirements in terms of performance and robustness. In a long-term view it is to become a solid, industry-strength platform for use of 3D content on the web.  

**Design Goals**

 - Fast: The framework internally optimizes rendering as to maximize Gl performance.
 - A content pipeline for distributing 3D content on the web. 3D data from authoring tools is converted offline to an optimized representation.  <a href="http://assimp.sourceforge.net">Open Asset Import Library</a> 
  (via <a href="https://github.com/acgessler/assimp2json">assimp2json</a>) imports geometry from about thirty 3D formats.
 - Exact and transparent resource management to avoid exhausting browser memory.
 - Library tools for managing Level of Detail to ease running across a wide range of devices, including Mobile/Tablets.
 - Automatic Scene Management and Visibility Detection.


### Media ###


Crytek's Sponza Test Scene with dynamic lighting without shadows with medea debug tools enabled (loaded via <a href="https://github.com/acgessler/assimp2json">assimp2json</a>).

<img src="http://www7.pic-upload.de/19.10.13/bxig953ohjh7.png"> </img>

A video showing medea's experimental terrain system (<a href="http://www.youtube.com/watch?v=VGLvI7iFjsE">youtube</a>).

<a href="http://www.youtube.com/watch?v=VGLvI7iFjsE"><img src="http://acgessler.github.com/medea.js/media/splash1.PNG" alt="terrain scene"></a>

### Documentation ###

Medea's basic structure is very similar to that of other, non-browser-based 3D engines, so anyone with some experience in 3D programming will not need much time to get to work with it. 

Documentation will soon be available; for now, have a look at the `samples/` folder.

### Usage Sample ###

This is effectively the whole code for the terrain in the above video.

```javascript
medealib.CreateContext("canvas",
   {   // some (initial) settings
       fps : 60,
       dataroot : '../../data'
   },
   
   // initial module dependencies
   ['camcontroller', 'forwardrenderer'],
   
   // Startup function gets called once the context is ready to use
   function(medea) {

	// Create a viewport to fill the entire <canvas>
	var viewport = medea.CreateViewport();
	viewport.Renderer(medea.CreateForwardRenderer());
	viewport.ClearColor([1.0,1.0,1.0]);
 
	var root = medea.RootNode();

	// Create a camera node and attach it to both the scenegraph and the viewport.
	var cam = medea.CreateCameraNode("MainCamera");
	root.AddChild(cam);
	viewport.Camera(cam);
	
	// Add a first-person-style camera controller (i.e. input handler).
	// camera controllers are entities and can be attached to
	// arbitrary nodes, not only cameras.
	var cam_controller = medea.CreateCamController('fps');
	cam.AddEntity(cam_controller);
	cam_controller.Enabled(true);
		
	// Add terrain - this is highly asynchronous because a lot of data needs to be loaded
	medea.LoadModules(['terrain'], function() {
		medea.CreateDefaultTerrainDataProviderFromResource('remote:terrain_sample/terrain.json', function(p) {
		
			var ter = medea.CreateTerrainNode(p);
			root.AddChild(ter);
			
			medea.LoadModules('terrainheightpath', function() {
				var terrain_animator = medea.CreateTerrainHeightPathAnimator(ter,15.0);
				cam.AddEntity(terrain_animator);
				cam_controller.TerrainEntity(terrain_animator);
			});
		});
	});
	
	// add skydome (the texture will be fetched in the background)
	medea.LoadModules('skydome',function() {
		root.AddChild(medea.CreateSkydomeNode('remote:skydome_sample/midmorning/midmorning.png',0.4));
	});
    }
);
```

### Deployment ###

The `compile.py` script is used to compile all medea modules needed by an application into a single file. It optionally embeds text resources such as shaders into the compiled package as well. The resulting files can then be minified using standard JS minifiers (Google Closure Compiler is recommended).

An _average_ medea distribution is only about `120 KiB`.

### License ###

Medea is licensed under a 3-clause BSD-style license. This means, in short and non-lawyerish, you are free to use medea even in your commercial websites provided the copyright notice, conditions and disclaimer of the license are included. 

See the `LICENSE` file for the full wording.

### Contributions ###

Are very welcome! Fork it on Github, and do a pull request against the main repository.




