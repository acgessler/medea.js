
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler 
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medea._addMod('camcontroller',['camera'],function(undefined) {
	"use strict";
	var medea = this;
	
	// class CamController
	medea.CamController = medea.Class.extend({
	
		enabled: false,
		turn_speed : 0.005,
		walk_speed : 1.0,
		
		last_processed_mdelta : -1,
		
		init : function(camera,kind,enabled) {
		
			if (camera instanceof medea.Camera) {
				camera = camera.parent;
			}
		
// #ifdef DEBUG
			if (!(camera instanceof medea.Node)) {
				medea.DebugAssert("CamController needs a valid scenegraph node to work with");
				return;
			}
// #endif

			this.camera_node = camera;
			this.kind = kind || 'fps';
			this.Enable(enabled || false);
		},
		
		
		Enable : function(doit) {
			if(doit === undefined) {
				doit = true;
			}
			if(this.enabled === doit) {
				return ;
			}
			this.enabled = doit;
			if(doit) {
				var outer = this;
				medea.SetTickCallback(function(dtime) {
					outer._Update(dtime);
					return true;
				},this);
				return;
			}
			medea.RemoveTickCallback(this);
		},
		
		TurnSpeed : function(t) {
			if(t === undefined) {
				return this.turn_speed;
			}
			this.turn_speed = t;
		},
		
		WalkSpeed : function(t) {
			if(t === undefined) {
				return this.walk_speed;
			}
			this.walk_speed = t;
		},
		
		
		_Update : function(dtime) {
			if(medea.IsMouseDown()) {
				return;
			}
			
			var d = medea.GetMouseDelta(), n = this.camera_node;
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
			
			// process movements
			if(this.kind === 'fps') {
				// W
				if(medea.IsKeyDown(87)) {
					n.Translate([0,0,-this.walk_speed * dtime]);
				}
				// A
				if(medea.IsKeyDown(65)) {
					n.Translate([-this.walk_speed * dtime,0,0]);
				}
				// S
				if(medea.IsKeyDown(83)) {
					n.Translate([0,0,this.walk_speed * dtime]);
				}
				// D
				if(medea.IsKeyDown(68)) {
					n.Translate([this.walk_speed * dtime,0,0]);
				}
			}
		},
	});
	
	medea.CreateCamController = function(camera,kind,enabled) {
		return new medea.CamController(camera,kind,enabled);
	};
});
