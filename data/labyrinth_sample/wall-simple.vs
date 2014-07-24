
attribute vec3 POSITION;
attribute vec2 TEXCOORD0;

uniform mat4 WVP;

varying highp vec2 va_TexCoord;
varying highp vec3 va_Normal;

void main()
{
	gl_Position = WVP * vec4(POSITION,1.0);
	va_Normal = normalize( POSITION ).xyz;
	va_TexCoord = TEXCOORD0;
}

