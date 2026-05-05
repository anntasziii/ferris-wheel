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
uniform bool uIsFlower;
uniform bool uIsCloud;

vec3 applyFog(vec3 color) {
    float fogDensity = 0.012; 
    vec3  fogColor   = vec3(0.65, 0.4, 0.22);

    float dist = length(vPosition - uViewPos);

    float fogFactor = exp(-fogDensity * dist);
    fogFactor = clamp(fogFactor, 0.0, 1.0);

    return mix(fogColor, color, fogFactor);
}

void main() {
    vec3 N = normalize(vNormal);
    vec3 L = normalize(uLightPos - vPosition);
    vec3 V = normalize(uViewPos - vPosition);

    if (uIsWater) {
        vec2 uv = vTexCoord * 0.15;
        float flow = uTime * 0.15;

        vec2 uv1 = uv + vec2(flow, flow * 0.3);

        vec3 color1 = texture2D(uTexture, uv1).rgb;

        color1 = (color1 - 0.5) * 1.8 + 0.5;
        color1 = clamp(color1, 0.0, 1.0);

        vec3 darkBlue = vec3(0.02, 0.1, 0.35);
        vec3 waterColor = mix(darkBlue, color1, 0.65);
        waterColor.b = min(waterColor.b * 1.15, 1.0);

        float ambientStrength = 0.4;
        vec3 ambient = ambientStrength * waterColor;
        float diff = max(dot(N, L), 0.0);
        vec3 diffuse = diff * waterColor;
        vec3 R = reflect(-L, N);
        float spec = pow(max(dot(V, R), 0.0), 64.0);
        vec3 specular = spec * vec3(1.0) * 0.6;

        vec3 result = ambient + diffuse + specular;
        gl_FragColor = vec4(applyFog(result), 0.9);
        return;
    }

    if (uIsFlower) {
        float dist = clamp(vTexCoord.x, 0.0, 1.0);

        vec3 innerColor = uObjectColor * 0.55;
        vec3 outerColor = min(uObjectColor * 1.2, vec3(1.0));
        vec3 baseColor = mix(innerColor, outerColor, dist);

        float ambientStrength = 0.25;
        vec3 ambient = ambientStrength * baseColor;
        float diff = max(dot(N, L), 0.0);
        vec3 diffuse = diff * baseColor;
        vec3 R = reflect(-L, N);
        float spec = pow(max(dot(V, R), 0.0), 16.0);
        vec3 specular = spec * vec3(1.0) * 0.15;

        vec3 result = ambient + diffuse + specular;
        gl_FragColor = vec4(applyFog(result), 1.0);
        return;
    }

    if (uIsCloud) {
        vec2 uv = vTexCoord;
        float flow = uTime * 0.02;
        uv.x += flow;

        float n1 = sin(uv.x * 4.0 + uv.y * 2.0) * 0.5 + 0.5;
        float n2 = sin(uv.x * 7.0 - uv.y * 3.0 + 1.5) * 0.5 + 0.5;
        float n3 = sin(uv.x * 2.0 + uv.y * 5.0 + 3.0) * 0.5 + 0.5;
        float cloud = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;

        // м'якші краї — більший степінь згасання
        float edgeX = 1.0 - abs(vTexCoord.x - 0.5) * 2.0;
        float edgeZ = 1.0 - abs(vTexCoord.y - 0.5) * 2.0;
        edgeX = max(0.0, edgeX);
        edgeZ = max(0.0, edgeZ);

        // більший степінь = м'якший перехід до прозорого
        float edge = pow(edgeX, 1.5) * pow(edgeZ, 1.5);

        // менший максимальний alpha = більш прозора хмара
        float alpha = cloud * edge * 0.55;  // було 0.85

        vec3 cloudColor = mix(vec3(0.80, 0.72, 0.62), vec3(1.0, 0.95, 0.9), cloud);

        gl_FragColor = vec4(cloudColor, alpha);
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

    vec3 result = ambient + diffuse + specular;

    float alpha = 1.0;
    if (uObjectColor.b > 0.85 && uObjectColor.r < 0.8 && uObjectColor.g > 0.8) {
        alpha = 0.35;
    }
    gl_FragColor = vec4(applyFog(result), alpha);
}