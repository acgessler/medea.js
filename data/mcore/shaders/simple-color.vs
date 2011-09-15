
attribute vec3 POSIN;
uniform mat4 WVP;

void main()
{
	gl_Position = WVP * vec4(POSIN,1.0);
}
