uniform sampler2D tDiffuse;
uniform float uTime;
varying vec2 vUv;

float amount = 0.3;
float angle = 3.14159;

void main() {

	amount = cos(uTime)*.02;

	angle = uTime*.1;

	vec2 offset = amount * vec2( cos(angle), sin(angle));
	vec4 cr  = texture2D(tDiffuse, vUv + offset);
	vec4 cga = texture2D(tDiffuse, vUv);
	vec4 cb  = texture2D(tDiffuse, vUv - offset);
	gl_FragColor = vec4(cr.r, cga.g, cb.b, cga.a);

}