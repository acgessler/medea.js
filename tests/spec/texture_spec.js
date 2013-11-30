
test_runners.push(test_texture);

function test_texture(medealib, dom_element) {

	describe("texture", function() {
		var medea;

		beforeEach(function(done) {
			medea = undefined;
	    	medealib.CreateContext(dom_element, {dataroot:'../../data'}, ['texture'], function(_medea) {
	    		medea = _medea;
	    		medea.CreateViewport();
	    		done();
	    	});
		});	

		afterEach(function() {
			medea.Dispose();
		});


		it("should have a default texture", function () {
			var def = medea.GetDefaultTexture();

			// default texture must be immediately available for use
			expect(def.GetWidth()).toBeGreaterThan(0);
			expect(def.GetHeight()).toBeGreaterThan(0);
			expect(def.IsSquare()).toBeTruthy();
			expect(def.IsPowerOfTwo()).toBeTruthy();
			expect(def.IsUploaded()).toBeTruthy();
			expect(def.IsRenderable()).toBeTruthy();
		});

		it("should be able to upload a texture lazily", function (done) {
			medea.CreateTexture('url:data/texture_test_4.jpg', function(tex) {
				expect(tex.IsUploaded()).toBeFalsy();
				expect(tex.IsRenderable()).toBeTruthy();

				tex._Bind();

				expect(tex.IsUploaded()).toBeTruthy();
				expect(tex.IsRenderable()).toBeTruthy();

				done();
			}, medea.TEXTURE_FLAG_LAZY_UPLOAD);
		});

		it("should let the user decide whether the source image is kept or not", function (done) {
			medea.CreateTexture('url:data/texture_test_4.jpg', function(tex) {

				expect(tex.IsUploaded()).toBeTruthy();
				expect(tex.GetImage()).toBeNull();

				// try the same texture again - this should not interfere
				medea.CreateTexture('url:data/texture_test_4.jpg', function(tex) {
					expect(tex.IsUploaded()).toBeTruthy();
					expect(tex.GetImage()).not.toBeNull();

					// also try a different texture
					medea.CreateTexture('url:data/texture_test_1.png', function(tex) {
						expect(tex.IsUploaded()).toBeTruthy();
						expect(tex.GetImage()).not.toBeNull();

						done();
					}, medea.TEXTURE_FLAG_KEEP_IMAGE);

				}, medea.TEXTURE_FLAG_KEEP_IMAGE);

				done();
			});
		});

		// note: the following tests indirectly cover the texture cache as we
		// request the same texture multiple times, but with different parameters so
		// in all cases a new instance should be returned.

		it("should be able to load a POT texture", function (done) {
			medea.CreateTexture('url:data/texture_test_1.png', function(tex) {
				expect(tex.GetWidth()).toBe(128);
				expect(tex.GetHeight()).toBe(128);
				expect(tex.GetGlTextureWidth()).toBe(128);
				expect(tex.GetGlTextureHeight()).toBe(128);
				expect(tex.IsSquare()).toBeTruthy();
				expect(tex.IsPowerOfTwo()).toBeTruthy();
				expect(tex.GetPaddingCompensationFactor()[0]).toBe(1);
				expect(tex.GetPaddingCompensationFactor()[1]).toBe(1);

				// should be uploaded as the lazy flag was not specified
				expect(tex.IsUploaded()).toBeTruthy();
				expect(tex.IsRenderable()).toBeTruthy();
				done();
			});
		});

		it("should be able to load a nPOT texture and upscale it", function (done) {
			medea.CreateTexture('url:data/texture_test_2.png', function(tex) {
				expect(tex.GetWidth()).toBe(129);
				expect(tex.GetHeight()).toBe(129);
				expect(tex.GetGlTextureWidth()).toBe(256);
				expect(tex.GetGlTextureHeight()).toBe(256);
				expect(tex.IsSquare()).toBeTruthy();
				expect(tex.IsPowerOfTwo()).toBeFalsy();
				expect(tex.GetPaddingCompensationFactor()[0]).toBeLessThan(1);
				expect(tex.GetPaddingCompensationFactor()[1]).toBeLessThan(1);

				done();
			});
		});

		it("should be able to load a nPOT texture and pad it", function (done) {
			medea.CreateTexture('url:data/texture_test_2.png', function(tex) {
				expect(tex.GetWidth()).toBe(129);
				expect(tex.GetHeight()).toBe(129);
				expect(tex.GetGlTextureWidth()).toBe(256);
				expect(tex.GetGlTextureHeight()).toBe(256);
				expect(tex.IsSquare()).toBeTruthy();
				expect(tex.IsPowerOfTwo()).toBeFalsy();
				expect(tex.GetPaddingCompensationFactor()[0]).toBeLessThan(1);
				expect(tex.GetPaddingCompensationFactor()[1]).toBeLessThan(1);

				// TODO: verify actual image contents
				done();
			}, medea.TEXTURE_FLAG_NPOT_PAD);
		});

		it("should be able to load a nPOT texture and force it to be scaled to a smaller size", function (done) {
			medea.CreateTexture('url:data/texture_test_2.png', function(tex) {
				expect(tex.GetWidth()).toBe(129);
				expect(tex.GetHeight()).toBe(129);
				expect(tex.GetGlTextureWidth()).toBe(128);
				expect(tex.GetGlTextureHeight()).toBe(128);
				expect(tex.IsSquare()).toBeTruthy();
				expect(tex.IsPowerOfTwo()).toBeFalsy();

				// TODO: verify actual image contents
				done();
			}, undefined, undefined, 128, 128);
		});

		it("should be able to load a non-square nPOT texture", function (done) {
			medea.CreateTexture('url:data/texture_test_3.png', function(tex) {
				expect(tex.GetWidth()).toBe(63);
				expect(tex.GetHeight()).toBe(129);
				expect(tex.GetGlTextureWidth()).toBe(64);
				expect(tex.GetGlTextureHeight()).toBe(256);
				expect(tex.IsSquare()).toBeFalsy();
				expect(tex.IsPowerOfTwo()).toBeFalsy();

				// TODO: verify actual image contents
				done();
			});
		});

		it("should be able to react to loading failures", function (done) {
			medea.CreateTexture('url:data/texture_does_not_exist.png', function(tex) {
				expect(tex).toBe(null);
				done();
			});
		});

		it("should be able to load DXT textures from DDS", function () {
			medea.CreateTexture('url:data/texture_does_not_exist.png', function(tex) {
			});
			// TODO
			expect(false).toBeTruthy();
		});
	});
}
