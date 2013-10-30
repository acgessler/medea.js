
/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */



medealib.define('camcontroller',['entity','input'],function(undefined) {
	"use strict";
	var medea = this;


	 // mouse movements are always tracked
	medea.CAMCONTROLLER_MOUSE_STYLE_ALWAYS = 0x1;

	 // mouse movements are tracked iff ctrl (or the key it maps to) is pressed
	medea.CAMCONTROLLER_MOUSE_STYLE_ON_CTRL = 0x2;

	 // mouse movements are tracked iff ctrl (or the key it maps to) is not pressed
	medea.CAMCONTROLLER_MOUSE_STYLE_OFF_CTRL = 0x3;

	// mouse movements are tracked iff the left mouse button is pressed
	medea.CAMCONTROLLER_MOUSE_STYLE_ON_LEFT_MBUTTON = 0x4;

	 
	
	medea.CamController = medea.Entity.extend({

		enabled: false,
		turn_speed : 0.005,
		walk_speed : 5.5,
		last_processed_mdelta : -1,
		last_processed_mwdelta : -1,
		mouse_style : -1,

		init : function(enabled, mouse_style) {
			this._super();

			this.Enabled(enabled || false);
			this.MouseStyle(mouse_style || medea.CAMCONTROLLER_MOUSE_STYLE_OFF_CTRL);
		},


		Enabled : medealib.Property('enabled'),
		MouseStyle : medealib.Property('mouse_style'),
		

		// TODO: deprecate in favour of Enabled()
		Enable : function(enable) {
			this.enabled = true;
		},

		Disable : function(enable) {
			this.enabled = false;
		},
		
		
		Update : function(dtime, node) {
			if(!this.enabled) {
				return;
			}

			this.ProcessMouse(dtime, node);
			this.ProcessKeyboard(dtime, node);
		},


		ProcessMouse : function(dtime, node) {
			var d = medea.GetMouseDelta();
			var responsive = false;
			if(d[2] !== this.last_processed_mdelta) {
				if (this._ShouldHandleMouseMovements()) {
					if (d[0] !== 0 || d[1] !== 0) {
						responsive = true;
					}
					this.ProcessMouseDelta(dtime, node, d);
				}
				
				this.last_processed_mdelta = d[2];
			}

			d = medea.GetMouseWheelDelta();
			if(d[1] !== this.last_processed_mwdelta) {
				this.ProcessMouseWheel(dtime, node, d[0]);
				this.last_processed_mwdelta = d[1];
				if(d[0] !== 0) {
					responsive = true;
				}
			}

			if(responsive) {
				this._prev_responsive_state = false;
				medea.EnsureIsResponsive(true);
			}
			else if(this._prev_responsive_state !== undefined) {
				medea.EnsureIsResponsive(this._prev_responsive_state);
			}
		},
		
		
		ProcessMouseDelta : function(dtime, node, d) {
		},

		ProcessMouseWheel : function(dtime, node, z) {
		},
		
		ProcessKeyboard : function(dtime, node) {
		},


		_ShouldHandleMouseMovements : function() {
			switch(this.mouse_style) {
				case medea.CAMCONTROLLER_MOUSE_STYLE_ALWAYS:
					return true;
				case medea.CAMCONTROLLER_MOUSE_STYLE_OFF_CTRL:
					return !medea.IsKeyDown(17);
				case medea.CAMCONTROLLER_MOUSE_STYLE_ON_CTRL:
					return  medea.IsKeyDown(17);
				case medea.CAMCONTROLLER_MOUSE_STYLE_ON_LEFT_MBUTTON:
					return medea.IsMouseDown();
			}
			// #ifdef DEBUG
			medealib.DebugAssert(false, 'mouse style not recognized: ' + this.mouse_style);
			// #endif 
		}
	});


	
	medea.FpsCamController = medea.CamController.extend({

		enabled: false,
		turn_speed : 0.005,
		walk_speed : 5.5,
		scratch_mat : null,

		hispeed_on_shift : true,
		terrain_entity : null,

		init : function(enabled) {
			this._super(enabled);
			this.scratch_mat = mat4.identity(mat4.create());
		},

		HispeedOnShift : medealib.Property('hispeed_on_shift'),
		TurnSpeed : medealib.Property('turn_speed'),
		WalkSpeed : medealib.Property('walk_speed'),
		TerrainEntity : medealib.Property('terrain_entity'),


		ProcessMouseDelta : function(dtime, n, d) {
			var mrot = this.scratch_mat;

			// process mouse movement on the y axis
			if(d[1] !== 0) {
				mrot = mat4.rotate(mat4.identity(mrot),-d[1]*this.turn_speed,n.LocalXAxis());
				n.LocalYAxis(mat4.multiplyVec3(mrot,n.LocalYAxis()));
				n.LocalZAxis(mat4.multiplyVec3(mrot,n.LocalZAxis()));
			}

			// process mouse movement on the x axis
			if(d[0] !== 0) {
				mrot = mat4.rotate(mat4.identity(mrot),-d[0]*this.turn_speed,[0,1,0]);
				n.LocalYAxis(mat4.multiplyVec3(mrot,n.LocalYAxis()));
				n.LocalZAxis(mat4.multiplyVec3(mrot,n.LocalZAxis()));
				n.LocalXAxis(vec3.cross(n.LocalYAxis(),n.LocalZAxis()));
			}
		},
			

		ProcessKeyboard : function(dtime, n) {

			var ws = this.walk_speed;
			if(this.hispeed_on_shift) {
				if(medea.IsKeyDown(16) /* SHIFT */) {
					ws *= 10;
				}
			}

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
			var terrain = this.terrain_entity;
			if(medea.IsKeyDown(33)) {
				if (terrain) {
					terrain.HeightOffset(terrain.HeightOffset()+ws * dtime);
				}
				else {
					n.Translate([0,ws * dtime,0]);
				}
			}
			
			// PAGE DOWN
			if(medea.IsKeyDown(34)) {
				if (terrain) {
					terrain.HeightOffset(terrain.HeightOffset()-ws * dtime);
				}
				else {
					n.Translate([0,-ws * dtime,0]);
				}
			}
		}
	});
	
	
	medea.OrbitCamController = medea.CamController.extend({
		turn_speed : 0.02,
		camera_distance : 2.5,
		pan_speed : 0.006,
		zoom_speed : 1.00105,
		minimum_camera_distance : 0.2,
		maximum_camera_distance : 10.0,
		dirty_trafo : true,
		pan_enable : true,
		zoom_enable : true,
		panning_mouse_buttons : null,
		axes_enabled : (1 | 2),
		phi : 0,
		theta : 0,
		theta_pole_dead_angle : 0.1,


		init : function(enabled, initial_rot_phi, initial_rot_theta) {
			this.panning_mouse_buttons = [1,2];
			this._super(enabled);

			this.Reset(initial_rot_phi, initial_rot_theta);
		},

		// 1 bit set is x, 2 bit set is y
		AxesEnabled : medealib.Property('axes_enabled'),

		ThetaPoleDeadAngle : medealib.Property('theta_pole_dead_angle'),
		TurnSpeed : medealib.Property('turn_speed'),
		ZoomSpeed : medealib.Property('zoom_speed'),
		PanSpeed : medealib.Property('pan_speed'),

		PanEnable : medealib.Property('pan_enable'),
		ZoomEnable : medealib.Property('zoom_enable'),
		
		CameraDistance : medealib.Property('camera_distance'),
		MinimumCameraDistance : medealib.Property('minimum_camera_distance'),
		MaximumCameraDistance : medealib.Property('maximum_camera_distance'),

		PanningMouseButtons : medealib.Property('panning_mouse_buttons'),


		Reset : function(initial_rot_phi, initial_rot_theta) {
			if(initial_rot_phi) {
				this.phi = initial_rot_phi;
			}
		
			if(initial_rot_theta) {
				this.theta = initial_rot_theta;
			}

			this.pan_vector = [0.0,0.0,0.0];
			this.camera_distance = 2.5;
			this.dirty_trafo = true;
		},



		Update : function(dtime, node) {
			this._super(dtime, node);
			this._UpdateNodeTransformation(node);
		},


		ProcessMouse : function(dtime, node) {
			var d = medea.GetMouseDelta();
			if(d[2] !== this.last_processed_mdelta) {
			
				// handle panning directly
				var did_panning = false;
				if (this.enabled && this.pan_enable) {
					if(!Array.isArray(this.panning_mouse_buttons)) {
						if(medea.IsMouseButtonDown(this.panning_mouse_buttons)) {
							did_panning = true;
							this.Pan(d[0], d[1]);
						}
					}
					else {
						for(var i = 0; i < this.panning_mouse_buttons.length; ++i) {
							if(medea.IsMouseButtonDown(this.panning_mouse_buttons[i])) {
								did_panning = true;
								this.Pan(d[0], d[1]);
								break;
							}
						}
					}
				}

				if (did_panning === false && this._ShouldHandleMouseMovements()) {
					this.ProcessMouseDelta(dtime, node, d);
				}
				this.last_processed_mdelta = d[2];
			}

			d = medea.GetMouseWheelDelta();
			if(d[1] !== this.last_processed_mwdelta) {
				this.ProcessMouseWheel(dtime, node, d[0]);
				this.last_processed_mwdelta = d[1];
			}
		},


		ProcessMouseDelta : function(dtime, node, d) {
			var	theta = this.theta
			,	theta_pole_dead_angle = this.theta_pole_dead_angle
			,	pi = Math.PI
			;

			// process mouse movement on the x axis
			if(d[0] !== 0 && (this.axes_enabled & 0x1)) {
				this.phi += d[0]*this.turn_speed;
			}
			
			// process mouse movement on the y axis
			if(d[1] !== 0 && (this.axes_enabled & 0x2)) {
				theta -= d[1]*this.turn_speed;
				if(theta < theta_pole_dead_angle) {
					theta = theta_pole_dead_angle;
				}
				else if(theta > pi - theta_pole_dead_angle) {
					theta = pi - theta_pole_dead_angle;
				}
				this.theta = theta;
			}

			this.dirty_trafo = true;
		},
		
		
		ProcessMouseWheel : function(dtime, node, z) {
			if(!this.zoom_enable) {
				return;
			}

			var d = this.camera_distance;
			d *= Math.pow(this.zoom_speed, -z * 50);
            d = Math.max(d, this.minimum_camera_distance);
            d = Math.min(d, this.maximum_camera_distance);
			this.camera_distance = d;

			this.dirty_trafo = true;
		},
		
		
		Pan : function(x, y) {
			if(!this.pan_enable) {
				return;
			}
			var ps = this.pan_speed;
            this.pan_vector[0] += -x * ps;
            this.pan_vector[1] += y * ps;
            this.pan_vector[2] = 0.0;

            this.dirty_trafo = true;
        },
		
		
		_UpdateNodeTransformation : (function() {
			var	view_with_offset 	= mat4.create()
			, 	vup 				= vec3.create()
			, 	vright 				= vec3.create()
			,	veye 				= vec3.create()
			;

			return function(node) {
				if (this.dirty_trafo === false) {
					return;
				}
				var	vo 			= view_with_offset
				,	dist 		= this.camera_distance
				,	phi 		= this.phi
				,	theta 		= this.theta
				,	sintheta 	= Math.sin(theta)
				;

				veye[0] = Math.cos(phi)*sintheta;
				veye[1] = Math.cos(theta);
				veye[2] = Math.sin(phi)*sintheta;
				vec3.normalize(veye);

				// note: the following is basically what gluLookAt() does

				// z-axis
				vo[8]  = veye[0];
				vo[9]  = veye[1];
				vo[10] = veye[2];
				vo[11] = 0;

				vup[0] = 0;
				vup[1] = 1;
				vup[2] = 0;
				
				vec3.cross(vup, veye, vright);
				vec3.normalize(vright); 

				// x axis
				vo[0]  = vright[0];
				vo[1]  = vright[1];
				vo[2]  = vright[2];
				vo[3]  = 0;

				vec3.cross(veye, vright, vup);
				vec3.normalize(vup);

				// y axis
				vo[4]  = vup[0];
				vo[5]  = vup[1];
				vo[6]  = vup[2];
				vo[7]  = 0;

				vo[12]  = 0;
				vo[13]  = 0;
				vo[14]  = 0;
				vo[15]  = 1;

				// translation
				vo[12] = veye[0] * dist;
				vo[13] = veye[1] * dist;
				vo[14] = veye[2] * dist;

				if(this.pan_enable) {
					mat4.translate(vo, this.pan_vector, vo);
				}

				node.LocalTransform(vo);
				this.dirty_trafo = false;
			};
		})()
	});
	
	
	
	medea.RotateXCamController = medea.CamController.extend({
		turn_speed : 0.005,
		

		init : function(enabled) {
			this._super(enabled);
		},
 

		
		TurnSpeed : medealib.Property('turn_speed'),


		ProcessMouseDelta : function(dtime, n, d) {
			
			// process mouse movement on the x axis
			if(d[0] !== 0) {
				var mrot = mat4.rotate(mat4.identity(mat4.create()),d[0]*this.turn_speed,[0,1,0]);
				n.LocalYAxis(mat4.multiplyVec3(mrot,n.LocalYAxis()));
				n.LocalZAxis(mat4.multiplyVec3(mrot,n.LocalZAxis()));
				n.LocalXAxis(vec3.cross(n.LocalYAxis(),n.LocalZAxis()));
			}		
		}
	});
	
	

	/** */
	medea.CreateCamController = function(kind, enabled) {
		kind = kind || 'fps';
		if(kind === 'fps') {
			return new medea.FpsCamController(enabled);
		}
		else if(kind === 'orbit') {
			return new medea.OrbitCamController(enabled);
		}
		else if(kind === 'rotatex') {
			return new medea.RotateXCamController(enabled);
		}
		else {
			medealib.DebugAssert("camcontroller mode not recognized: " + kind);
			return null;
		}
	};
});


