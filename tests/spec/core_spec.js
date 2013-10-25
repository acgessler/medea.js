
var DEFAULT_TIMEOUT = 1000;

describe("medea.core", function() {
	var dom_element;
	var medea
		,	ok = false
		,	fail = false
		;


	function ensureContextInit() {
		waitsFor(function() {
			return ok;
		}, 'context should have been created' ,DEFAULT_TIMEOUT);
	}


	beforeEach(function() {
		ok = false;
    	dom_element = 'canvas';
    	medea = new medealib.Context(dom_element, {}, [], function() {
			ok = true;
		},
		function() {
			fail = true;
		});
	});	

	afterEach(function() {
		//medea.Dispose();
		medea = null;
	});


	it("should be able to create a context", function () {
		ensureContextInit();
		expect(fail).toBeFalsy();
	});

	it("should have valid defaults", function () {
		var stats;
		ensureContextInit();

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
		ensureContextInit();

		expect(medea.Node).toBeTruthy();
		expect(medea.Viewport).toBeTruthy();
	});

	it("should be able to define() more modules and resolve their dependencies", function () {
		var init2 = false
		,	init1 = false 
		,	called = false
		;		

		ensureContextInit();

		// core itself should be loaded too
		medealib.define('__test2', ['__test1', 'core'], function() {
			expect(init1).toBeTruthy();
			init2 = true;
		});

		expect(init2).toBeFalsy();
		medealib.define('__test1', ['node'], function() {
			expect(init2).toBeFalsy();
			init1 = true;
		});
		expect(init2).toBeTruthy();
		expect(init1).toBeTruthy();

		medealib._RegisterMods(['__test1', '__test2'], function() {
			called = true;
		});
		expect(called).toBeTruthy();
	});

	it("should be able to fetch more modules", function () {
		var ok = false;

		ensureContextInit();

		expect(medea.Node).toBeDefined(); // node is there by default
		expect(medea.Mesh).not.toBeDefined();
		expect(medea.Shader).not.toBeDefined();

		runs(function() {
			medea._RegisterMods(['node', 'mesh', 'shader'], function() {
				ok = true;
			});
		});

		waitsFor(function() {
			return ok;
		}, 'should have fetched node, mesh, shader modules',DEFAULT_TIMEOUT);

		expect(medea.Node).toBeDefined(); // still here
		expect(medea.Mesh).toBeDefined();
		expect(medea.Shader).toBeDefined();
	});

	it("should not be able to render unless there is a viewport", function () {
		ensureContextInit();

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
		ensureContextInit();
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

	it("should be able to do a rendering loop, and be able to get callbacks and stop again", function () {
		var count = 0
		,	count_2 = 0
		,	stopped = false
		,	stats
		;
		waitsFor(function() {
			return ok;
		}, 'çontext should have been created' ,DEFAULT_TIMEOUT);

		var vp = medea.CreateViewport();

		expect(medea.IsStopMarkerSet()).toBeFalsy();
		medea.Start();
		expect(medea.IsStopMarkerSet()).toBeFalsy();

		runs(function() {
			medea.SetTickCallback(function() {
				++count;

				if(count === 5) {
					// redundant calls should be ok, this also tests if adding
					// or removing listeners works from within tick callbacks
					medea.RemoveTickCallback('keyed_callback');
					medea.RemoveTickCallback('keyed_callback'); 
				}

				if(count === 10) {
					medea.StopNextFrame(true);
					expect(medea.IsStopMarkerSet()).toBeTruthy();
					stopped = true;
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
		});

		waitsFor(function() {
			return stopped;
		}, 'should stop after 10 frames',DEFAULT_TIMEOUT);

		stats = medea.GetStatistics();
		expect(stats.count_frames).toBe(10);
		expect(count).toBe(10);
		expect(count_2).toBe(10);

		// stop marker should now be unset again
		expect(medea.IsStopMarkerSet()).toBeFalsy();

		// start again, first check if removing the unnamed tick callback works 
		medea.Start();
		expect(medea.IsStopMarkerSet()).toBeFalsy();

		medea.RemoveTickCallback();

		// now run again and check if stopping by returning something falsy works
		runs(function() {
			medea.SetTickCallback(function() {
				--count_2;
				return count_2 === 0;
			}, 'another_keyed_callback');
		});

		expect(medea.IsStopMarkerSet()).toBeFalsy();
		expect(count_2).toBe(0);
		expect(stats.count_frames).toBe(11);
	});

	it("should correctly call debug hooks", function () {
	});
});

