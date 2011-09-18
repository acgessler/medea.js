
attribute vec3 POSIN;
attribute vec2 TEXIN0;

uniform mat4 WVP;

varying vec2 va_TexCoord;

void main()
{
	gl_Position = WVP * vec4(POSIN,1.0);
	va_TexCoord = TEXIN0;
}

