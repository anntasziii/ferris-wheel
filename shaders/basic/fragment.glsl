precision mediump float;

varying vec3 vNormal;
varying vec3 vPosition;

uniform vec3 uLightPos;
uniform vec3 uViewPos;

// матеріал
uniform vec3 uObjectColor;

void main() {

    // нормалізація
    vec3 N = normalize(vNormal);
    vec3 L = normalize(uLightPos - vPosition);
    vec3 V = normalize(uViewPos - vPosition);

    // ---------------- AMBIENT ----------------
    float ambientStrength = 0.2;
    vec3 ambient = ambientStrength * uObjectColor;

    // ---------------- DIFFUSE ----------------
    float diff = max(dot(N, L), 0.0);
    vec3 diffuse = diff * uObjectColor;

    // ---------------- SPECULAR ----------------
    float specularStrength = 0.5;
    vec3 R = reflect(-L, N);

    float spec = pow(max(dot(V, R), 0.0), 32.0);
    vec3 specular = specularStrength * spec * vec3(1.0);

    vec3 result = ambient + diffuse + specular;

    gl_FragColor = vec4(result, 1.0);
}