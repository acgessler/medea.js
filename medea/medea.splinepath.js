
/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('splinepath',['entity'],function(medealib, undefined) {
	"use strict";
	var medea = this;

	var SplinePathAnimator = medea.Entity.extend(
	{
		init : function(points, duration, loop, ping_pong, tightness) {
			this.points = points;
			this.duration = duration || 1.0;
			this.loop = loop || false;
			this.ping_pong = ping_pong || false;
			this.tightness = tightness || 1.0;
			this.time = 0.0;
			this.finished = false;
		},

		Render : function(viewport,entity,node,rqmanager) {
			// nothing to be done
		},

		Update : function(dtime,node) {
			if (this.finished) {
				return;
			}

			this.time += dtime;

			// this is based on Irrlicht's CSceneNodeAnimatorFollowSpline::animateNode
			var p = this.points;
			if (p.length === 0) {
				if (this.loop) {
					this.finished = true;
				}
				return;
			}

			if (p.length === 1) {
				node.LocalPos(p[0]);
				if (this.time > 0) {
					if (this.loop) {
						this.finished = true;
					}
				}
				return;
			}

			var dt = this.time * p.length / this.duration;
			var uid = Math.floor(dt);
			if (!this.loop && uid >= p.length-1) {
				node.LocalPos(p[p.length-1]);
				this.finished = true;
				return;
			}

			var pong = this.ping_pong && !!(Math.floor(uid/(p.length-1)) %2), u = dt-Math.floor(dt), i;
			if (pong) {
				u = 1.0 - u;
				i = (p.length-2) - (uid % (p.length-1));
			}
			else {
				i = this.ping_pong ? uid % (p.length-1) : uid % p.length;
			}

			var clamp = function(idx) {
				return ( idx<0 ? p.length +idx : ( idx>=p.length ? idx-p.length : idx ) );
			};

			var p0 = p[ clamp(i-1) ];
			var p1 = p[ clamp(i+0) ];
			var p2 = p[ clamp(i+1) ];
			var p3 = p[ clamp(i+2) ];

			var h1 = 2.0 * u * u * u - 3.0 * u * u + 1.0;
			var h2 = -2.0 * u * u * u + 3.0 * u * u;
			var h3 = u * u * u - 2.0 * u * u + u;
			var h4 = u * u * u - u * u;

			var out = [0,0,0];
			for (var n = 0; n < 3; ++n) {
				var t1 = (p2[n]-p0[n]) * this.tightness;
				var t2 = (p3[n]-p1[n]) * this.tightness;

				out[n] = p1[n] * h1 + p2[n] + h2 +t1 * h3+ t2 * h4;
			}

			node.LocalPos(out);
		},

		Finished : function(h) {
			if (h === undefined) {
				return this.finished;
			}
			this.finished = h;
		},

		Points : function(h) {
			if (h === undefined) {
				return this.points;
			}
			this.points = h;
		},

		Duration : function(h) {
			if (h === undefined) {
				return this.duration;
			}
			this.duration = h;
		},

		Tightness : function(h) {
			if (h === undefined) {
				return this.tightness;
			}
			this.tightness = h;
		},

		Loop : function(h) {
			if (h === undefined) {
				return this.loop;
			}
			this.loop = h;
		},

		PingPong : function(h) {
			if (h === undefined) {
				return this.ping_pong;
			}
			this.ping_pong = h;
		},
	});


	medea.CreateSplinePathAnimator = function(points, duration, loop, ping_pong, tightness) {
		return new SplinePathAnimator (points, duration, loop, ping_pong, tightness);
	};
});