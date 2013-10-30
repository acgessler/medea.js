
/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */
 
#include <remote:mcore/shaders/core.vsh>

uniform vec3 CAM_POS;
varying vec3 eye;

void main()
{
	PassClipPosition(ModelToClipSpace(FetchPosition()));
	PassNormal(ModelDirToWorldDir(FetchNormal()));

	eye = CAM_POS - ModelToWorldSpace(FetchPosition());
}

