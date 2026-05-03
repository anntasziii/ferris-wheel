attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec2 aTexCoord;

uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;
uniform mediump float uTime;  

varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vTexCoord;
varying mediump float vTime; 

void main() {
    vec4 worldPos = uModel * vec4(aPosition, 1.0);
    vPosition = worldPos.xyz;
    vNormal = mat3(uModel) * aNormal;
    vTexCoord = aTexCoord;
    vTime = uTime;
    gl_Position = uProjection * uView * worldPos;
}