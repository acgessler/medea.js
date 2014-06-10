
/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */
 
#include <remote:mcore/shaders/core.vsh>

uniform float scaling;
uniform vec3 CAM_POS;

void main()
{
	vec3 position = ModelToWorldSpace(FetchPosition());
	vec2 uv = FetchTexCoord();

	vec3 eye = CAM_POS - position;
	vec3 eye_norm = normalize(eye);
	
	// Use eye_norm.z for z to avoid degeneracy at up ~ eye
	vec3 up = normalize(vec3(0.0, 1.0, 0.0));
	vec3 right = cross(eye_norm, up);
	up = cross(right, eye_norm);

	// Make it a billboard by offsetting points along the plane
	// parallel to the camera.
	vec2 offset = (uv - 0.5) * 2.0 * scaling;
	position += offset.x * right + offset.y * up;

	// Forward final position and computed UV to PS
	PassClipPosition(WorldToClipSpace(position));
	PassTexCoord(uv);
}

