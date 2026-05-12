attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec2 aTexCoord;

// UNIFORM INPUTS
uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;
uniform mediump float uTime;
uniform bool uIsFlower;
uniform bool uIsWater;

// VARYING OUTPUTS
varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vTexCoord;
varying mediump float vTime;

void main() {
    vec3 position = aPosition;
    vec3 normal = aNormal;
    
    // ── DYNAMIC WATER DEFORMATION (гвинтова деформація) ──
    if (uIsWater) {
        // Радіус від центру річки
        float radius = length(vec2(position.x, position.z));
        
        // Кут + спіраль
        float twist = atan(position.z, position.x) + radius * 0.2 + uTime;
        
        // Спіральне зміщення
        float offset = sin(twist) * 0.1;
        position.x += offset;
        position.z += offset;
        
        // Вертикальна хвиля
        position.y += sin(uTime + radius) * 0.15;
        
        // Деформуємо нормаль для правильного освітлення
        normal = normalize(normal + vec3(
            cos(twist) * 0.1,
            sin(uTime) * 0.05,
            sin(twist) * 0.1
        ));
    }
    
    // Transform to world space
    vec4 worldPosition = uModel * vec4(position, 1.0);
    vPosition = worldPosition.xyz;
    vNormal = mat3(uModel) * normal;
    vTexCoord = aTexCoord;
    vTime = uTime;
    
    // Transform to clip space
    gl_Position = uProjection * uView * worldPosition;
}
