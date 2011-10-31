
attribute vec3 POSITION;
attribute vec3 NORMAL;

uniform mat4 WVP;
uniform mat4 WIT;

varying highp vec3 va_Normal;

void main()
{
	gl_Position = WVP * vec4(POSITION,1.0);
    va_Normal = (WIT * vec4(NORMAL,0.0)).xzy;
}
