
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
    	medea = new medealib.Context(dom_element, {}, function() {
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
		expect(fail).toBe(false);
		expect(medea.CanRender()).toBe(true);
	});

	it("should have valid defaults", function () {
		ensureContextInit();

		expect(medea.Node).toBeTruthy();
		expect(medea.RootNode()).toBeTruthy();
		expect(medea.EnsureIsResponsive()).toBe(false);
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
			expect(init1).toBeFalse();
			init2 = true;
		});

		expect(init2).toBeFalse();
		medealib.define('__test1', ['node'], function() {
			expect(init2).toBeTruthy();
			init1 = true;
		});
		expect(init2).toBeTruthy();
		expect(init1).toBeTruthy();

		medealib.FetchMods(['__test1', '__test2'], function() {
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
			medea.FetchMods(['node', 'mesh', 'shader'], function() {
				ok = true;
			});
		});

		medea.waitsFor(function() {
			return ok;
		}, 'should have fetched node, mesh, shader modules',DEFAULT_TIMEOUT);

		expect(medea.Node).toBeDefined(); // still here
		expect(medea.Mesh).toBeDefined();
		expect(medea.Shader).toBeDefined();
	});

	it("should be able to do a single frame", function () {
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

		expext(medea.IsStopMarkerSet()).toBeFalse();
		medea.Start();
		expext(medea.IsStopMarkerSet()).toBeFalse();

		runs(function() {
			medea.SetTickCallback(function() {
				++count;

				if(count === 5) {
					it("should be able to remove a callback from another callback", function() {
						medea.RemoveTickCallback('keyed_callback');
						medea.RemoveTickCallback('keyed_callback'); // redundant calls are ok
					});
				}

				if(count === 10) {
					medea.StopNextFrame(true);
					expext(medea.IsStopMarkerSet()).toBeTrue();
					stopped = true;
				}

				// should not be called an 11th time
				expect(count).toBeLessThan(11);
			});

			// also try with a keyed callback
			medea.SetTickCallback(function() {
				count_2++;
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
		expext(medea.IsStopMarkerSet()).toBeFalse();
	});

	it("should correctly call debug hooks", function () {
	});
});

