
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medea.define('forwardrenderer',['renderqueue', 'statepool'],function(undefined) {
	"use strict";
	var medea = this, gl = medea.gl;

	// default config for normal, solid rendering
	var _initial_state_depth_test_enabled = {
		'depth_test' : true,
		'depth_func' : 'less_equal',

		// culling is turned on by default
		'cull_face' : true,
		'cull_face_mode' : 'back'
	};

	// default config for rendering of transparent objects
	var _initial_state_depth_test_disabled = {
		'depth_test' : false,

		// culling is turned on by default
		'cull_face' : true,
		'cull_face_mode' : 'back'
	};

	medea._initMod('renderqueue');

	var ForwardRenderer = medea.Class.extend({
		rq : null,

		init : function() {
			var	outer = this
			,	distance_sorter = new medea.DistanceSorter()
			,	material_sorter = new medea.MaterialSorter()
			,	no_sorter = new medea.NoSorter()
			,	light_queue 
			;

			// create a render queue manager for the renderer.
			// this creates the full set of render queues
			this.rq = medea.CreateRenderQueueManager();

			// setup default render states for all render queues and also pick
			// appropriate sorting algorithm implementations.
			light_queue = this.rq.queues[medea.RENDERQUEUE_LIGHT];
			light_queue.Sorter(no_sorter);
		
			[
				medea.RENDERQUEUE_DEFAULT_EARLY,
				medea.RENDERQUEUE_DEFAULT,
				medea.RENDERQUEUE_DEFAULT_LATE
			].forEach(function(s) {
				s = outer.rq.queues[s];
				s.Sorter(material_sorter);
				s.DefaultState(medea._initial_state_depth_test_enabled);
			});


			[
				medea.RENDERQUEUE_ALPHA_EARLY,
				medea.RENDERQUEUE_ALPHA,
				medea.RENDERQUEUE_ALPHA_LATE
			].forEach(function(s) {
				s = outer.rq.queues[s];
				s.Sorter(distance_sorter);
				s.DefaultState(medea._initial_state_depth_test_disabled);
			});
		},


		GetRQManager : function() {
			return this.rq;
		},


		Render : function(statepool) {
			var	rq = this.rq
			;

			// (hack) insert default light into statepool if there is no light in the scene
			var light_queue = rq.queues[medea.RENDERQUEUE_LIGHT];
			if(light_queue.GetEntries().length === 0) {
				statepool.Set("DIR_LIGHTS",[{
					  world_dir :  [0.309,1.209,-0.709]
					, color : [1,1,1]
				}]);
			}

			rq.Flush(this, statepool);
		},


		DrawMesh : function(meshjob, statepool) {
			// update the current world matrix to the node's global transformation matrix
			statepool.Set("W",meshjob.node.GetGlobalTransform());

			// Always set WI and WIT. Lighting naturally relies on
			// it, so we can assume that this is always needed.
			// By using the node's intelligent update mechanism
			// we can thus save lots of matrix math.
			var wi = meshjob.node.GetInverseGlobalTransform();
			statepool.Set("WI",wi);
			var wit = statepool.Get("WIT");
			if(wit === undefined) {
				wit = mat4.create();
			}

			mat4.transpose(wi, wit);
			statepool.SetQuick("WIT",wit);

			meshjob.mesh.DrawNow(statepool);
		},


		DrawLight : function(lightjob, statepool) {
			var light = lightjob.light;
			var list_name = null;

			var light_info = {
				color : light.color
			};

			// add this light to the statepool so that materials will find it
			if(light instanceof medea.DirectionalLight) {
				list_name = 'DIR_LIGHTS';

				light_info.world_dir = vec3.create();
				mat4.multiplyVec3(lightjob.node.GetGlobalTransform(), light_dir, light_info.world_dir);
			}
			/* else if(light instanceof medea.PointLight) {
				list_name = 'POINT_LIGHTS';
			}
			else if(light instanceof medea.SpotLight) {
				list_name = 'SPOT_LIGHTS';
			} */

			else {
				medea.DebugAssert('unknown kind of light');
			}

			var lights = statepool.GetQuick(list_name);
			if(lights === undefined) {
				dlights = statepool.Set(list_name,[]);
			}
			lights.append(light_info);
		}
	});


	medea.CreateForwardRenderer = function() {
		return new ForwardRenderer();
	};
});
