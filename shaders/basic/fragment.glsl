precision mediump float;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vTexCoord;
varying float vTime;

uniform vec3 uLightPos;
uniform vec3 uViewPos;
uniform vec3 uObjectColor;
uniform sampler2D uTexture;
uniform bool uUseTexture;
uniform float uTime;
uniform bool uIsWater;

void main() {
    vec3 N = normalize(vNormal);
    vec3 L = normalize(uLightPos - vPosition);
    vec3 V = normalize(uViewPos - vPosition);

    if (uIsWater) {
        vec2 uv = vTexCoord * 0.15; 

        float flow = uTime * 0.04; 

        vec2 uv1 = uv + vec2(flow, flow * 0.5);
        vec2 uv2 = uv + vec2(-flow * 0.7, flow * 0.3) + vec2(0.3, 0.1);

        vec3 color1 = texture2D(uTexture, uv1).rgb;
        vec3 color2 = texture2D(uTexture, uv2).rgb;

        float mixFactor = sin(uTime * 0.3) * 0.2 + 0.5;
        vec3 waterColor = mix(color1, color2, mixFactor);

        waterColor.b = min(waterColor.b * 1.1, 1.0);

        float ambientStrength = 0.4;
        vec3 ambient = ambientStrength * waterColor;
        float diff = max(dot(N, L), 0.0);
        vec3 diffuse = diff * waterColor;

        vec3 R = reflect(-L, N);
        float spec = pow(max(dot(V, R), 0.0), 64.0);
        vec3 specular = spec * vec3(1.0) * 0.6;

        gl_FragColor = vec4(ambient + diffuse + specular, 0.9);
        return;
    }

    vec3 baseColor = uUseTexture ? texture2D(uTexture, vTexCoord).rgb : uObjectColor;

    float ambientStrength = 0.2;
    vec3 ambient = ambientStrength * baseColor;
    float diff = max(dot(N, L), 0.0);
    vec3 diffuse = diff * baseColor;
    float specularStrength = uUseTexture ? 0.1 : 0.5;
    vec3 R = reflect(-L, N);
    float spec = pow(max(dot(V, R), 0.0), 32.0);
    vec3 specular = specularStrength * spec * vec3(1.0);

    gl_FragColor = vec4(ambient + diffuse + specular, 1.0);
}