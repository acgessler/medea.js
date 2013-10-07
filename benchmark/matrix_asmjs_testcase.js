
// trying super-fast matrix multiplication with asm.js by using a huge pool
// of matrices exclusively used as asm.js heap. User code indexes matrices
// by their position in that pool.

// Alexander Gessler, 2013 (github.com/acgessler)

var COUNT = 100;
var elements = 16 * COUNT * 4;

var matrixpool = new ArrayBuffer((Math.ceil(elements/4096.0) * 4096) | 0); // multiple of 4096 bytes
console.log('mpool: ' + matrixpool.length);

function mat_mod(stdlib, foreign, heap) {
	"use asm";

	var m = new stdlib.Float32Array(heap);

	function multiply(idx_a, idx_b, idx_dest) {
		idx_a = idx_a | 0;
		idx_b = idx_b | 0;
		idx_dest = idx_dest | 0;

		var  i = 0, j = 0, c = 0.0, k = 0, t0 = 0.0, t1 = 0.0, i0 = 0, i1 = 1;

		idx_a = idx_a << 4;
		idx_b = idx_b << 4;
		idx_dest = idx_dest << 4;

		for(i = 0; (i|0) < 4; i = (i + 1) | 0 ) {
			for(j = 0; (j|0) < 4; j = (j + 1) | 0 ) {
				c = 0.0;
				for(k = 0; (k|0) < 4; k = (k + 1) | 0 ) {
					i0 = (idx_a + (i<<2) + k) | 0;
					i1 = (idx_b + (k<<2) + j) | 0;
					t0 = +m[i0>>2];
					t1 = +m[i1>>2];
					c = +(c + t0 * t1);
				}
				i1 = (idx_dest + (i<<2) + j) | 0;
				m[i1>>2] = c;
			}
		}
	}

	function multiplyUnrolled(idx_a, idx_b, idx_dest) {
		idx_a = idx_a | 0;
		idx_b = idx_b | 0;
		idx_dest = idx_dest | 0;

		var 	
			a00 = 0.0
		,	a01 = 0.0
		,	a02 = 0.0
		,	a03 = 0.0
		,	a10 = 0.0
		,	a11 = 0.0
		,	a12 = 0.0
		,	a13 = 0.0
		,	a20 = 0.0
		,	a21 = 0.0
		,	a22 = 0.0
		,	a23 = 0.0
		,	a30 = 0.0
		,	a31 = 0.0
		,	a32 = 0.0
		,	a33 = 0.0
		;

		var 	
			b00 = 0.0
		,	b01 = 0.0
		,	b02 = 0.0
		,	b03 = 0.0
		,	b10 = 0.0
		,	b11 = 0.0
		,	b12 = 0.0
		,	b13 = 0.0
		,	b20 = 0.0
		,	b21 = 0.0
		,	b22 = 0.0
		,	b23 = 0.0
		,	b30 = 0.0
		,	b31 = 0.0
		,	b32 = 0.0
		,	b33 = 0.0
		;

		idx_a = idx_a << 4;
		idx_b = idx_b << 4;
		idx_dest = idx_dest << 4;


		a00 = +m[(idx_a+0) >> 2];
		a01 = +m[(idx_a+1) >> 2];
		a02 = +m[(idx_a+2) >> 2];
		a03 = +m[(idx_a+3) >> 2];
		a10 = +m[(idx_a+4) >> 2];
		a11 = +m[(idx_a+5) >> 2];
		a12 = +m[(idx_a+6) >> 2];
		a13 = +m[(idx_a+7) >> 2];
		a20 = +m[(idx_a+8) >> 2];
		a21 = +m[(idx_a+9) >> 2];
		a22 = +m[(idx_a+10) >> 2];
		a23 = +m[(idx_a+11) >> 2];
		a30 = +m[(idx_a+12) >> 2];
		a31 = +m[(idx_a+13) >> 2];
		a32 = +m[(idx_a+14) >> 2];
		a33 = +m[(idx_a+15) >> 2];

		b00 = +m[(idx_b+0) >> 2];
		b01 = +m[(idx_b+1) >> 2];
		b02 = +m[(idx_b+2) >> 2];
		b03 = +m[(idx_b+3) >> 2];
		b10 = +m[(idx_b+4) >> 2];
		b11 = +m[(idx_b+5) >> 2];
		b12 = +m[(idx_b+6) >> 2];
		b13 = +m[(idx_b+7) >> 2];
		b20 = +m[(idx_b+8) >> 2];
		b21 = +m[(idx_b+9) >> 2];
		b22 = +m[(idx_b+10) >> 2];
		b23 = +m[(idx_b+11) >> 2];
		b30 = +m[(idx_b+12) >> 2];
		b31 = +m[(idx_b+13) >> 2];
		b32 = +m[(idx_b+14) >> 2];
		b33 = +m[(idx_b+15) >> 2];

		m[(idx_dest+0) >> 2] = b00*a00 + b01*a10 + b02*a20 + b03*a30;
		m[(idx_dest+1) >> 2] = b00*a01 + b01*a11 + b02*a21 + b03*a31;
		m[(idx_dest+2) >> 2] = b00*a02 + b01*a12 + b02*a22 + b03*a32;
		m[(idx_dest+3) >> 2] = b00*a03 + b01*a13 + b02*a23 + b03*a33;
		m[(idx_dest+4) >> 2] = b10*a00 + b11*a10 + b12*a20 + b13*a30;
		m[(idx_dest+5) >> 2] = b10*a01 + b11*a11 + b12*a21 + b13*a31;
		m[(idx_dest+6) >> 2] = b10*a02 + b11*a12 + b12*a22 + b13*a32;
		m[(idx_dest+7) >> 2] = b10*a03 + b11*a13 + b12*a23 + b13*a33;
		m[(idx_dest+8) >> 2] = b20*a00 + b21*a10 + b22*a20 + b23*a30;
		m[(idx_dest+9) >> 2] = b20*a01 + b21*a11 + b22*a21 + b23*a31;
		m[(idx_dest+10) >> 2] = b20*a02 + b21*a12 + b22*a22 + b23*a32;
		m[(idx_dest+11) >> 2] = b20*a03 + b21*a13 + b22*a23 + b23*a33;
		m[(idx_dest+12) >> 2] = b30*a00 + b31*a10 + b32*a20 + b33*a30;
		m[(idx_dest+13) >> 2] = b30*a01 + b31*a11 + b32*a21 + b33*a31;
		m[(idx_dest+14) >> 2] = b30*a02 + b31*a12 + b32*a22 + b33*a32;
		m[(idx_dest+15) >> 2] = b30*a03 + b31*a13 + b32*a23 + b33*a33
	}

	return {
		  multiply : multiply
		, multiplyUnrolled : multiplyUnrolled
	}
}

var mod = mat_mod(window, undefined, matrixpool);


// fill all matrices with values
for(var i = matrixpool-1; i >= 0; --i) {
	matrixpool[i] = i % 2 ? 0.5 : 2.0;
}

// multiply lots of matrices
for(var k = 0; k < 5; ++k) {
	for(var i = 0; i < COUNT; ++i) {
		for(var j = COUNT - 1; j >= 0; --j) {
			mod.multiply(i, j, (i + j) % COUNT);
		}
	}
}

// multiply lots of matrices
for(var k = 0; k < 5; ++k) {
	for(var i = 0; i < COUNT; ++i) {
		for(var j = COUNT - 1; j >= 0; --j) {
			mod.multiplyUnrolled(i, j, (i + j) % COUNT);
		}
	}
}
