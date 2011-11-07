
attribute vec3 POSITION;
attribute vec4 COLOR0;

uniform mat4 VP;

varying vec4 color;

void main()
{
	gl_Position = VP * vec4(POSITION,1.0);
	color = COLOR0;
}

