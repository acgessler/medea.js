
attribute vec3 POSIN;
attribute vec2 TEXIN0;

uniform mat4 WVP;

varying highp vec2 va_TexCoord;
varying highp vec3 va_Normal;

void main()
{
	gl_Position = WVP * vec4(POSIN,1.0);
	va_Normal = normalize( POSIN ).xyz;
	va_TexCoord = TEXIN0;
}

