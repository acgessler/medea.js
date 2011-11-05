
attribute vec3 POSITION;
attribute vec2 TEXCOORD0;

uniform mat4 VP;

varying highp vec2 va_TexCoord;

void main()
{
	// set w==z to ensure z becomes 1 after perspectivical divide
	mat4 m = mat4(VP[0],VP[1],VP[2],vec4(0.0,0.0,0.0,1.0));
	vec4 t = m * vec4(POSITION,1.0);
	gl_Position = vec4(t.xyzz);
	
	va_TexCoord = TEXCOORD0;
}


