medea.js
========

#### A powerful yet simple WebGL-based 3D engine ####

medea is a scenegraph-based, lightweight and extremely straightforward 3D engine. Obviously it is written in Javascript.

It is currently in active development, but I try to keep the trunk constantly alive and the API relatively stable, so there is no need to be scared off. 
Things I focus on: 

 - asynchronous resource management and progressive loading (i.e. LODs) to minimize 'hard' loading times.
 - Data-driven, flexible material framework supporting stuff like automatic dynamic lighting whilst still offering a high degree of
   flexibility to shader authors.
 - offline content processing and optimization to save as much bandwidth and runtime overhead as possible. For example <a href="http://assimp.sourceforge.net">Open Asset Import Library</a> 
  (via <a href="https://github.com/acgessler/assimp2json">assimp2json</a>) is used to import geometry from douzens of common (and also not-so-common) 3D model formats.
 - automatic detail adjustment so medea-based applications can run on
   all platforms, including mobile devices. This is clearly the most difficult point on the list, but also the one of which I believe that developers would benefit the most from.
 - getting actual releases done - you better remind me on this :-)
 
Apart from that is medea's basic structure very similar to that of other, not browser-based 3D engines (i.e. Ogre), so anyone with some experience in 3D programming will need little time to get into it.

#### Media ####

At the time being there's only a rather boring video showing medea's experimental terrain system. 

<a href="http://www.youtube.com/watch?v=VGLvI7iFjsE"><img src="http://acgessler.github.com/medea.js/media/splash1.PNG" alt="terrain scene"></a>

__More screenshots will soon be added right here.__



#### Usage ####

This is effectively the whole code for the terrain in the video above.

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
