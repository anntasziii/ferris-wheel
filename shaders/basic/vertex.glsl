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
uniform mat3 uTexMatrix;

// VARYING OUTPUTS
varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vTexCoord;
varying mediump float vTime;


void main() {
    vec3 position = aPosition;
    vec3 normal = aNormal;
    
    // DYNAMIC WATER DEFORMATION
    if (uIsWater) {
        // Calculate radial distance from center of river
        float radius = length(vec2(position.x, position.z));
        
        // Calculate spiral angle based on position and time
        float twist = atan(position.z, position.x) + radius * 0.2 + uTime;
        
        // Calculate radial offset (perpendicular to radius direction)
        // Creates circular motion around center
        float offset = sin(twist) * 0.1;
        position.x += offset;
        position.z += offset;
        
        // Calculate vertical wave deformation
        position.y += sin(uTime + radius) * 0.15;
        
        // Recalculate surface normal for proper lighting
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
    vTexCoord = (uTexMatrix * vec3(aTexCoord, 1.0)).xy;
    vTime = uTime;
    
    // Transform to clip space
    gl_Position = uProjection * uView * worldPosition;
}
