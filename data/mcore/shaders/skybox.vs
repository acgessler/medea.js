
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler
 * licensed under the terms and conditions of a 3 clause BSD license.
 */
 
#include <remote:mcore/shaders/core.vsh>
 
uniform mat4 VP;

void main()
{
	vec3 pos = FetchPosition();

	// set w==z to ensure z becomes 1 after perspectivical divide
	mat4 m = mat4(VP[0],VP[1],VP[2],vec4(0.0,0.0,0.0,1.0));
	vec4 t = m * vec4(pos.xzy,1.0);
	PassClipPosition(t.xyzz);
	Pass3DTexCoord(pos);
}


