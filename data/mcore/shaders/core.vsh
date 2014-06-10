

/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */
 
#ifndef INCLUDED_MEDEA_CORE_VSH
#define INCLUDED_MEDEA_CORE_VSH

#ifdef MEDEA_PIXEL_SHADER_LIB
#error core.vsh included but core.psh is already present 
#endif

#define MEDEA_VERTEX_SHADER_LIB

 // Set default floating-point precision to high
#ifdef GL_ES
#pragma toplevel("precision highp float;")
#pragma toplevel("precision highp int;")
#endif


#define _concat(a,b) a ## b
#define concat(a,b) _concat(a,b)

#define _stringize(a) # a
#define stringize(a) _stringize(a)
#define _pr(aa) _Pragma(aa)

#define _add_varying(type, name) \
	_pr(stringize(toplevel("varying " stringize(type) " " stringize(name) ";")))
	
#define _add_attribute(type, name) \
	_pr(stringize(toplevel("attribute " stringize(type) " " stringize(name) ";"))) 
	
#define _add_uniform(type, name) \
	_pr(stringize(toplevel("uniform " stringize(type) " " stringize(name) ";"))) 
 
 
#define Pass(type, type_destination, type_value) \
	_add_varying(type, concat(va_, type_destination)) \
	concat(va_, type_destination) = type_value
	
	
	/** */
#define PassVec4(vec4_destination, vec4_value) \
	Pass(vec4, vec4_destination, vec4_value)
	
	/** */
#define PassVec3(vec3_destination, vec3_value) \
	Pass(vec3, vec3_destination, vec3_value)
	
	/** */
#define PassVec2(vec2_destination, vec2_value) \
	Pass(vec2, vec2_destination, vec2_value)
	
	/** */
#define PassFloat(float_destination, float_value) \
	Pass(float, float_destination, float_value)	
	

	/** */
#define PassClipPosition(vec4_clip_position) \
	gl_Position = vec4_clip_position
	
	/** */
#define PassPosition(vec3_world_position) \
	PassVec3(WorldPosition, vec3_world_position)
	
	/** */
#define PassNormal(vec3_world_normal) \
	PassVec3(Normal, vec3_world_normal)

	/** */
#define PassTangent(vec3_world_tangent) \
	PassVec3(Tangent, vec3_world_tangent)

	/** */
#define PassBitangent(vec3_world_bitangent) \
	PassVec3(Bitangent, vec3_world_bitangent)

	/** */
#define PassTexCoordN(vec2_texcoord, channel) \
	PassVec2(concat(TexCoord,channel), vec2_texcoord)
	
	/** */
#define PassTexCoord(vec2_texcoord) \
	PassTexCoordN(vec2_texcoord, 0)
	
	/** */
#define Pass3DTexCoordN(vec3_texcoord, channel) \
	PassVec3(concat(TexCoord,channel), vec3_texcoord)
	
	/** */
#define Pass3DTexCoord(vec3_texcoord) \
	Pass3DTexCoordN(vec3_texcoord, 0)
	
	
		/** */
#define PassColorN(vec3_color, channel) \
	PassVec3(concat(Color,channel), vec3_color)
	
	/** */
#define PassColor(vec3_color) \
	PassColorN(vec3_color, 0)
	
	
	
	
	
	/** */
#define Fetch(type, name) \
	_add_attribute(type, name) \
	(name)
	
#define FetchVec3(name) \
	Fetch(vec3, name)
	
#define FetchVec2(name) \
	Fetch(vec2, name)
	
#define FetchVec4(name) \
	Fetch(vec4, name)
	
#define FetchFloat(name) \
	Fetch(highp float, name)
	
	
#define FetchTexCoordN(channel) \
	FetchVec2(concat(TEXCOORD,channel))
 
#define FetchTexCoord() \
	FetchTexCoordN(0)
	
#define Fetch3DTexCoordN(channel) \
	FetchVec3(concat(TEXCOORD,channel))
 
#define Fetch3DTexCoord() \
	FetchTexCoord3DN(0)
	
	
#define FetchColorN(channel) \
	FetchVec3(concat(COLOR,channel))
	
#define FetchColor() \
	FetchColorN(0)
	


	
#define FetchPosition() \
	FetchVec3(POSITION)
	
#define FetchNormal() \
	FetchVec3(NORMAL)
	
#define FetchTangent() \
	FetchVec3(TANGENT)
	
#define FetchBitangent() \
	FetchVec3(BITANGENT)
	
	
#define ModelNormalToWorldSpace(p) \
	_add_uniform(mat4, WIT) \
	((WIT * vec4(p.xyz, 0.0)).xyz)
	
#define ModelToWorldSpace(p) \
	_add_uniform(mat4, W) \
	((W * vec4(p.xyz, 1.0)).xyz)

#define ModelToViewSpace(p) \
	_add_uniform(mat4, WV) \
	((WV * vec4(p.xyz, 1.0)).xyz)
	
#define ModelDirToWorldDir(p) \
	_add_uniform(mat4, W) \
	((W * vec4(p.xyz, 0.0)).xyz)

#define WorldToClipSpace(p) \
	_add_uniform(mat4, VP) \
	((VP * vec4(p.xyz, 1.0)))
	
#define ModelToClipSpace(p) \
	_add_uniform(mat4, WVP) \
	(WVP * vec4(p.xyz, 1.0))

#define ViewToClipSpace(p) \
	_add_uniform(mat4, P) \
	(P * vec4(p.xyz, 1.0))

 
/** */
#define GetWorldEyeDistance(vec3_WORLD_POSITION) \
	_add_uniform(vec3, CAM_POS_LOCAL) \
	length(vec3_WORLD_POSITION - CAM_POS_LOCAL)
	
#endif // INCLUDED_MEDEA_CORE_VSH
 