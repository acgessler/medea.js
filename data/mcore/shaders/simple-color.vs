
uniform mat4 WVP;
attribute vec4 POSIN;

void main()
{
	gl_Position = WVP * POSIN;
}
