
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medea._addMod('camcontroller',['entity'],function(undefined) {
	"use strict";
	var medea = this;
    
    medea._initMod('entity');
    

	medea.CamController = medea.Entity.extend({

		enabled: false,
		turn_speed : 0.005,
		walk_speed : 5.5,

		terrain_entity : null,
		last_processed_mdelta : -1,

		init : function(kind,enabled) {

			this.kind = kind || 'fps';
			this.Enabled(enabled || false);
		},

        
        Enable : function() {
            this.enabled = true;
        },
        
        Disable : function() {
            this.enabled = false;
        },
        

		Enabled : medea._GetSet('enabled'),
		TurnSpeed : medea._GetSet('turn_speed'),
        WalkSpeed : medea._GetSet('walk_speed'),
        TerrainEntity : medea._GetSet('terrain_entity'),

        
		Update : function(dtime, n) {
			if(!this.enabled || medea.IsMouseDown()) {
				return;
			}

			var d = medea.GetMouseDelta();
			if(d[2] !== this.last_processed_mdelta) {

				// do not process mouse movements while the CTRL key is pressed
				if (!medea.IsKeyDown(17)) {

					// "First-Person-Shooter" view control style
					if(this.kind === 'fps') {

						// process mouse movement on the y axis
						if(d[1]) {
							var mrot = mat4.rotate(mat4.identity(mat4.create()),-d[1]*this.turn_speed,n.LocalXAxis());
							n.LocalYAxis(mat4.multiplyVec3(mrot,n.LocalYAxis()));
							n.LocalZAxis(mat4.multiplyVec3(mrot,n.LocalZAxis()));
						}

						// process mouse movement on the x axis
						if(d[0]) {
							var mrot = mat4.rotate(mat4.identity(mat4.create()),-d[0]*this.turn_speed,[0,1,0]);
							n.LocalYAxis(mat4.multiplyVec3(mrot,n.LocalYAxis()));
							n.LocalZAxis(mat4.multiplyVec3(mrot,n.LocalZAxis()));
							n.LocalXAxis(vec3.cross(n.LocalYAxis(),n.LocalZAxis()));
						}
					}
					// #ifdef DEBUG
					else {
						medea.DebugAssert("Camera mode not recognized: " + this.kind);
					}
					// #endif
				}

				this.last_processed_mdelta = d[2];
			}

			var ws = this.walk_speed;
			if(medea.IsKeyDown(16)) {
				ws *= 10;
			}

			// process movements
			if(this.kind === 'fps') {
				// W
				if(medea.IsKeyDown(87)) {
					n.Translate([0,0,-ws * dtime]);
				}
				// A
				if(medea.IsKeyDown(65)) {
					n.Translate([-ws * dtime,0,0]);
				}
				// S
				if(medea.IsKeyDown(83)) {
					n.Translate([0,0,ws * dtime]);
				}
				// D
				if(medea.IsKeyDown(68)) {
					n.Translate([ws * dtime,0,0]);
				}


				// PAGE UP
				if(medea.IsKeyDown(33)) {
					if (this.terrain_entity) {
						this.terrain_entity.HeightOffset(this.terrain_entity.HeightOffset()+ws * dtime);
					}
					else {
						n.Translate([0,ws * dtime,0]);
					}
				}
				// PAGE DOWN
				if(medea.IsKeyDown(34)) {
					if (this.terrain_entity) {
						this.terrain_entity.HeightOffset(this.terrain_entity.HeightOffset()-ws * dtime);
					}
					else {
						n.Translate([0,-ws * dtime,0]);
					}
				}
			}
		},
	});

	medea.CreateCamController = function(camera,kind,enabled) {
		return new medea.CamController(camera,kind,enabled);
	};
});
