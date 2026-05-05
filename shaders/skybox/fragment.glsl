precision mediump float;

varying vec3 vDirection;

void main() {
    vec3 dir = normalize(vDirection);
    float h = dir.y;

    vec3 zenith  = vec3(0.15, 0.4,  0.85);
    vec3 midSky  = vec3(0.65, 0.4,  0.55);
    vec3 horizon = vec3(0.95, 0.4,  0.1);
    vec3 sunGlow = vec3(1.0,  0.75, 0.2);
    vec3 ground  = vec3(0.75, 0.35, 0.1); 

    vec3 skyColor;

    if (h > 0.3) {
        float t = (h - 0.3) / 0.7;
        skyColor = mix(midSky, zenith, t);
    } else if (h > 0.0) {
        float t = h / 0.3;
        skyColor = mix(horizon, midSky, t);
    } else if (h > -0.5) {  
        float t = (h + 0.5) / 0.5;
        t = t * t * (3.0 - 2.0 * t);
        skyColor = mix(ground, horizon, t);
    } else {
        skyColor = ground;
    }

    vec3 sunDir = normalize(vec3(1.0, 0.1, 0.0));
    float sunDot = dot(dir, sunDir);
    float sunDisc = smoothstep(0.997, 1.0, sunDot);
    float sunHalo = smoothstep(0.95,  0.997, sunDot) * 0.4;

    skyColor = mix(skyColor, sunGlow, sunHalo);
    skyColor = mix(skyColor, vec3(1.0, 0.95, 0.8), sunDisc);

    gl_FragColor = vec4(skyColor, 1.0);
}