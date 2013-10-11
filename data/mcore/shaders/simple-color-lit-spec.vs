
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler
 * licensed under the terms and conditions of a 3 clause BSD license.
 */
 
#include <remote:mcore/shaders/core.vsh>

uniform vec3 CAM_POS;
varying vec3 eye;

void main()
{
	PassClipPosition(ModelToClipSpace(FetchPosition()));
	PassNormal(ModelDirToWorldDir(FetchNormal()));

	eye = ModelToWorldSpace(FetchPosition()) - CAM_POS;
}

