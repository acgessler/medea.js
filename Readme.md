medea.js
========

#### A powerful yet simple WebGL-based 3D engine ####

medea is a scenegraph-based, lightweight and extremely straightforward 3D engine. Obviously it is written in Javascript.

It is currently in active development, but I try to keep the trunk constantly alive and the API relatively stable so there is no need to be scared. 
Things I focus on: 

 - modular design
 - asynchronous resource management.
 - offline content processing to save as much bandwidth and runtime as possible
 - automatic detail adjustment so medea-based applications can run on
   all platforms, including mobile devices
 - getting an ctual releases done - you better remind me on this

#### Media ####

Right now there's a boring video showing medea's experimental terrain system. 

<a href="http://www.youtube.com/watch?v=VGLvI7iFjsE"><img src="http://acgessler.github.com/medea.js/media/splash1.PNG" alt="terrain scene"></a>

More screenshots will soon be added here.



#### Usage ####

This is effectively the whole code for the terrain in the video above.

```
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
	// camera controllers are so called entities and can be attached to
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
	
	// add skydome
	medea.FetchMods('skydome',function() {
		root.AddChild(medea.CreateSkydomeNode('remote:skydome_sample/midmorning/midmorning.png',0.4));
	});
	```
