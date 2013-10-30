
/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */
 
#include <remote:mcore/shaders/core.vsh>
 
uniform mat4 VP;

void main()
{
	vec3 pos = FetchPosition();

	// set w==z to ensure z becomes 1 after perspectivical divide
	mat4 m = mat4(VP[0],VP[1],VP[2],vec4(0.0,0.0,0.0,1.0));
	vec4 t = m * vec4(pos.xyz,1.0);
	PassClipPosition(t.xyzz);
	Pass3DTexCoord(pos);
}


