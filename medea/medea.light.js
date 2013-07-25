/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medea._addMod('light',['entity'],function(undefined) {
	"use strict";
	var medea = this, gl = medea.gl;

	medea._initMod('entity');


	// class ForwardLightJob
	this.ForwardLightJob = medea.Class.extend({

		distance: null,

		init : function(light,entity,node,viewport) {
			this.light = light;
			this.entity = entity;
			this.node = node;
			this.viewport = viewport;

			this.Draw = function(statepool) {

				var light = this.light;
				var list_name = null;

				var light_info = {
					color : light.color
				};

				// add this light to the statepool so that materials will find it
				if(light instanceof medea.DirectionalLight) {
					list_name = 'DIR_LIGHTS';

					light_info.world_dir = vec3.create();
					mat4.multiplyVec3(node.GetGlobalTransform(), light_dir, light_info.world_dir);
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
			};
		},
	});


	// class DeferredLightJob
	this.DeferredLightJob = medea.Class.extend({

		distance: null,

		init : function(light,entity,node,viewport) {
			this.light = light;
			this.entity = entity;
			this.node = node;
			this.viewport = viewport;

			this.Draw = function(statepool) {

				// TODO
			};
		},
	});
	

	// class Light
	this.Light = medea.Light.extend(
	{
		cast_shadows : false,
		shadowmap_res_bias : 0,
		rq_idx : -1,

		init : function(color, rq) {
			this.color = color || [1,1,1];
			this.rq_idx = rq === undefined ? medea.RENDERQUEUE_LIGHT : rq;
		},


		Render : function(viewport,entity,node,rqmanager) {
			// construct a renderable capable of drawing this light upon request by the render queue manager
			rqmanager.Push(this.rq_idx,new medea.ForwardLightJob(this,entity,node,viewport));
		},


		CastShadows : medea._GetSet('cast_shadows'),
		ShadowMapResolutionBias : medea._GetSet('shadowmap_res_bias'),
	});


	// class DirectionalLight
	this.DirectionalLight = medea.Light.extend(
	{
		init : function(color, dir) {
			this._super(color);
			this.dir = dir || [0,-1,0]; 
			vec3.norm(this.dir);
		},
	});


	medea.CreateDirectionalLight = function(color, dir) {
		return new medea.DirectionalLight(color, dir);
	};
});