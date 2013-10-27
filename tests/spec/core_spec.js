
var DEFAULT_TIMEOUT = 2000;
var FRAME_DELTA = 1000/60;

describe("core", function() {
	var dom_element;
	var medea;

	beforeEach(function(done) {
		var init_fail = false
		, 	init_ok = false
		;

		medea = undefined;
    	dom_element = 'canvas';
    	
    	medealib.CreateContext(dom_element, {dataroot:'../../data'}, ['forwardrenderer'], function(_medea) {
    		medea = _medea;
    		init_ok = true;

    		expect(init_fail).toBeFalsy();
			expect(medea).toBeDefined();
			expect(medea.ForwardRenderer).toBeDefined();
			done();
		},

		function() {
			init_fail = true;
			expect(init_ok).toBeFalsy();
			expect(false).toBeTruthy();
			done();
		});
	});	

	afterEach(function() {
		//medea.Dispose();
	});


	it("should be able to create a context", function () {
		
	});

	it("should have valid defaults", function () {
		var stats;

		expect(medea.Node).toBeTruthy();
		expect(medea.RootNode()).toBeTruthy();
		expect(medea.EnsureIsResponsive()).toBeFalsy();
		expect(medea.CanRender()).toBeFalsy();

		stats = medea.GetStatistics();
		expect(stats.count_frames).toBe(0);
		expect(stats.primitives_frame).toBe(0);
		expect(stats.vertices_frame).toBe(0);
	});

	it("should have loaded the <node> and <viewport> modules", function () {
		expect(medea.Node).toBeTruthy();
		expect(medea.Viewport).toBeTruthy();
	});

	it("should be able to define() more modules and resolve their dependencies", function () {
		var init2 = false
		,	init1 = false
		,	called = false
		;		

		medealib.define('__test1', ['node'], function() {
			expect(init2).toBeFalsy();
			init1 = true;
		});
		expect(init1).toBeFalsy();
		expect(init2).toBeFalsy();

		// core itself should be loaded too, so should __test1
		medealib.define('__test2', ['__test1', 'core'], function() {
			expect(init1).toBeTruthy();
			init2 = true;
		});
		expect(init1).toBeFalsy();
		expect(init2).toBeFalsy();
		
		// registering the same module again should throw an exception
		expect(function() {
			medealib.define('__test1', ['node'], function() {
				expect(false).toBeTruthy();
			});
		}).toThrow();

		// now load the modules into the medea context
		medea.LoadModules(['__test2'], function() {
			expect(init1).toBeTruthy();
			expect(init2).toBeTruthy();
			called = true;
		});

		expect(called).toBeTruthy();
	});

	it("should be able to fetch more modules", function (done) {
		var ok = false;

		expect(medea.Node).toBeDefined(); // node is there by default
		expect(medea.Mesh).not.toBeDefined();
		expect(medea.Shader).not.toBeDefined();

		medea.LoadModules(['node', 'mesh', 'shader'], function() {
			
			expect(medea.Node).toBeDefined(); // still here
			expect(medea.Mesh).toBeDefined();
			expect(medea.Shader).toBeDefined();

			done();
		});
	});

	it("should not be able to render unless there is a viewport", function () {

		// this should throw an exception
		expect(function() {medea.DoSingleFrame(0);}).toThrow(new medealib.FatalError());
		expect(medea.CanRender()).toBeFalsy();

		var vp = medea.CreateViewport();

		//expect(medea.CanRender()).toBeFalsy();
		//vp1.Renderer(medea.CreateForwardRenderer());

		// this, however, should not
		expect(medea.CanRender()).toBeTruthy();
		expect(function() {medea.DoSingleFrame(0);}).not.toThrow(new medealib.FatalError());
	});

	it("should be able to do a single frame", function () {

		expect(medea.CanRender()).toBeFalsy();
		var vp = medea.CreateViewport();

		//expect(medea.CanRender()).toBeFalsy();
		//vp1.Renderer(medea.CreateForwardRenderer());

		expect(medea.CanRender()).toBeTruthy();
		expect(function() {medea.DoSingleFrame(0);}).not.toThrow(new medealib.FatalError());

		stats = medea.GetStatistics();
		expect(stats.count_frames).toBe(1);
		expect(stats.primitives_frame).toBe(0);
		expect(stats.vertices_frame).toBe(0);
		// can't make assumptions on fps values after one frame
	});

	it("should be able to do a rendering loop, and be able to get callbacks and stop again", function (done) {
		var count = 0
		,	count_2 = 0
		,	stopped = false
		,	stats
		;

		var vp = medea.CreateViewport();

		expect(medea.IsStopMarkerSet()).toBeFalsy();
		expect(medea.IsStopMarkerSet()).toBeFalsy();

		
		medea.SetTickCallback(function() {
			++count;

			if(count === 5) {
				// redundant calls should be ok, this also tests if adding
				// or removing listeners works from within tick callbacks
				medea.RemoveTickCallback('keyed_callback');
				medea.RemoveTickCallback('keyed_callback'); 
			}

			if(count === 10) {
				medea.StopNextFrame();
				expect(medea.IsStopMarkerSet()).toBeTruthy();
				stopped = true;

				setTimeout(function() {
					stats = medea.GetStatistics();
					expect(stats.count_frames).toBe(10);
					expect(count).toBe(10);
					expect(count_2).toBe(5);

					// stop marker should now be unset again
					expect(medea.IsStopMarkerSet()).toBeFalsy();

					// start again, first check if removing the unnamed tick callback works 
					// start() never runs a frame immediately, it always delays so 
					// RemoveTickCallback() should execute first.
					medea.Start();
					expect(medea.IsStopMarkerSet()).toBeFalsy();

					medea.RemoveTickCallback();

					// now run again and check if stopping by returning something falsy works
					medea.SetTickCallback(function() {
						--count_2;
						var stop = count_2 === 0;
						if(stop) {
							setTimeout(function() {
								expect(medea.IsStopMarkerSet()).toBeFalsy();
								expect(count_2).toBe(0);
								expect(stats.count_frames).toBe(15);
								done();

							}, FRAME_DELTA * 2);
						}
						return !stop;
					}, 'another_keyed_callback');
				}, FRAME_DELTA * 2);
			}
			// should not be called an 11th time
			expect(count).toBeLessThan(11);
			return true;
		});

		// also try with a keyed callback
		medea.SetTickCallback(function() {
			expect(count).toBeLessThan(6);
			count_2++;
			return true;
		}, 'keyed_callback');

		medea.Start();
	});

	it("should correctly call debug hooks", function () {
	});

	it("should correctly call debug hooks", function () {
	});
});

