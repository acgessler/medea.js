
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medea._addMod('simpleanim',['entity'],function(undefined) {
	"use strict";
	var medea = this;

	var FromToAnimator = medea.Entity.extend(
	{
		init : function(from, to, duration, auto_unadd) {
			this.from = from;
			this.to = to;
			this.duration = duration;
			this.auto_unadd = auto_unadd;
		},

		Render : function(viewport,entity,node,rqmanager) {
			// nothing to be done
		},

		Update : function(dtime,node) {
			if (this.finished) {
				if(this.auto_unadd) {
					node.RemoveEntity(this);
					return medea.ENTITY_UPDATE_WAS_REMOVED;
				}
				return;
			}
			
			if(this.time === undefined) {
				this.time = 0.0;
			}
			
			this.time += dtime;
			if(this.time > this.duration) {
				// ensure proper end position
				node.LocalPos(this.to);
				this.finished = true;
				return;
			}
			
			var fraction = this.time / this.duration;
			var position = [this.from[0],this.from[1],this.from[2]];
			
			position[0] += (this.to[0] - this.from[0]) * fraction;
			position[1] += (this.to[1] - this.from[1]) * fraction;
			position[2] += (this.to[2] - this.from[2]) * fraction;
			
			node.LocalPos(position);
		},

		Finished : function(h) {
			if (h === undefined) {
				return this.finished;
			}
			this.finished = h;
		}
	});


	medea.CreateFromToAnimator = function(from, to, duration, auto_unadd) {
		return new FromToAnimator (from, to, duration, auto_unadd);
	};
});