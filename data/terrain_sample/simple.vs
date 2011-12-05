
attribute vec3 POSITION;
attribute vec3 NORMAL;
attribute vec3 TANGENT;
attribute vec3 BITANGENT;
attribute vec2 TEXCOORD0;

uniform vec3 CAM_POS_LOCAL;
uniform mat4 W;
uniform mat4 WVP;
uniform mat4 WIT;

varying highp vec2 va_TexCoord;
varying highp vec3 va_Normal;
varying highp vec3 va_TSLightDir;
varying highp float va_EyeDist;

void main()
{
	vec4 PO = vec4(POSITION,1.0);

	gl_Position = WVP * PO;
	va_TexCoord = TEXCOORD0 * 4.0;
    va_Normal = (WIT * vec4(NORMAL,0.0)).xzy;
	
	va_EyeDist = length(POSITION - CAM_POS_LOCAL);
	
	mat3 rotmat = mat3(TANGENT, BITANGENT, NORMAL);
	va_TSLightDir = normalize( rotmat * normalize(vec3(0.0,1.0,-1.0)) );
}

