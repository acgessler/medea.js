

/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */
 
#ifndef INCLUDED_MEDEA_TERRAIN_VSH
#define INCLUDED_MEDEA_TERRAIN_VSH

#include <remote:mcore/shaders/core.vsh>


/** */
struct TerrainVertex {

	vec3 POSITION;
	vec3 NORMAL;
	vec3 TANGENT;
	vec3 BITANGENT;
	vec2 TEXCOORD0;
};

/** */
void GetTerrainVertex(out TerrainVertex vert) {

	vert.POSITION = FetchPosition();

#ifdef ENABLE_TERRAIN_VERTEX_FETCH
	_add_uniform(vec4,_tvf_range);
	_add_uniform(vec3,_tvf_wpos);
	_add_uniform(vec3,_tvf_scale);
	_add_uniform(vec4,_tvf_uvdelta);
	_add_uniform(vec2,_tvf_uvoffset);
	_add_uniform(sampler2D,_tvf_height_map);

    vec2 uv = _tvf_range.xy + TEXCOORD0 * _tvf_range.zw;
	
    vert.POSITION.y = texture2D(_tvf_height_map, uv).r;
    vert.POSITION *= _tvf_scale.xyz;
	vert.POSITION += _tvf_wpos.xyz;
    
    // compute tangent space by weighting surrounding height deltas
	// (factor 0.5 omitted to get more contrast ...)
	float xd = _tvf_scale.y * (
			texture2D(_tvf_height_map, uv + _tvf_uvdelta.xw).r - 
			texture2D(_tvf_height_map, uv - _tvf_uvdelta.xw).r
	);
			
	float yd = _tvf_scale.y * (
			texture2D(_tvf_height_map, uv + _tvf_uvdelta.wy).r - 
			texture2D(_tvf_height_map, uv - _tvf_uvdelta.wy).r
	);
	
    vert.TANGENT = normalize( vec3(1.0,xd,0) );
    vert.BITANGENT = normalize( vec3(0,yd,1.0) );
	
	vert.NORMAL = cross(vert.TANGENT,vert.BITANGENT);
	
#else

	vert.NORMAL = FetchNormal();
	vert.TANGENT = FetchTangent();
	vert.BITANGENT = FetchBitangent();
	
#endif

	vert.TEXCOORD0 = FetchTexCoord();
	
#ifdef ENABLE_TERRAIN_VERTEX_FETCH
	vert.TEXCOORD0 *= _tvf_uvdelta.z;
	vert.TEXCOORD0 += _tvf_uvoffset.xy;
#endif
}


#endif //  INCLUDED_MEDEA_CORE_VSH




