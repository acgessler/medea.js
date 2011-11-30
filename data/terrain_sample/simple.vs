
attribute vec3 POSITION;
attribute vec3 NORMAL;
attribute vec3 TANGENT;
attribute vec3 BITANGENT;
attribute vec2 TEXCOORD0;

uniform mat4 WVP;
uniform mat4 WIT;
uniform vec3 lightdir;

varying highp vec2 va_TexCoord;
varying highp vec3 va_Normal;
varying highp vec3 va_TSLightDir;

void main()
{
	gl_Position = WVP * vec4(POSITION,1.0);
	va_TexCoord = TEXCOORD0 * 4.0;
    va_Normal = (WIT * vec4(NORMAL,0.0)).xzy;
	
	mat3 rotmat = mat3(TANGENT, BITANGENT, NORMAL);
	va_TSLightDir = normalize( rotmat * normalize(vec3(0.4,0.6,0.0)) );
}

