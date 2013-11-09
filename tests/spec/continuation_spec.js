
test_runners.push(testConfig);

function testConfig(medealib, dom_element) {

	describe("continuations", function() {
		var medea;

		beforeEach(function(done) {
			medea = undefined;
	    	medealib.CreateContext(dom_element, {dataroot:'../../data'}, ['continuation'], function(_medea) {
	    		medea = _medea;
	    		medea.CreateViewport();
	    		done();
	    	});
		});	

		afterEach(function() {
			medea.Dispose();
		});


		it("should be able to create a continuation and run it immediately", function () {
			var cont = medea.CreateContinuation()
			,	c = 0
			;
			cont.AddJob(function() {
				expect(cont.Running()).toBeTruthy();
				expect(cont.Finished()).toBeFalsy();
				++c;
			});
			cont.AddJob(function() {
				expect(cont.Running()).toBeTruthy();
				expect(cont.Finished()).toBeFalsy();
				++c;
			});

			expect(cont.Running()).toBeFalsy();
			expect(cont.Finished()).toBeFalsy();
			expect(c).toBe(0);
			cont.Schedule();

			expect(cont.Running()).toBeFalsy();
			expect(cont.Finished()).toBeTruthy();
			expect(c).toBe(2);

			medea.DoSingleFrame(0);
			expect(c).toBe(2);
		});

		it("should be able to create a continuation and run it across multiple frames", function () {
			var cont = medea.CreateContinuation()
			,	c = 0
			,	f
			;

			f = function() {
				expect(cont.Running()).toBeTruthy();
				expect(cont.Finished()).toBeFalsy();
				++c;
			};

			cont.AddJob(function() {
				expect(cont.Running()).toBeTruthy();
				expect(cont.Finished()).toBeFalsy();
				++c;
				return f;
			});
			cont.AddJob(f);

			expect(cont.Running()).toBeFalsy();
			expect(cont.Finished()).toBeFalsy();
			expect(c).toBe(0);
			cont.Schedule(true);

			expect(cont.Running()).toBeTruthy();
			expect(cont.Finished()).toBeFalsy();
			expect(c).toBe(0);

			medea.DoSingleFrame(0);
			expect(c).toBe(3);
			expect(cont.Running()).toBeFalsy();
			expect(cont.Finished()).toBeTruthy();
		});

		// because medea continuations are just a slim wrapper around continue.js,
		// further test coverage is given by the continue.js test suite. The
		// tests here only verify the integration with medea's event loop
	});
};