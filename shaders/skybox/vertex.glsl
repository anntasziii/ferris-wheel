precision mediump float;

// ATTRIBUTE INPUTS
attribute vec3 aPosition;

// UNIFORM INPUTS
uniform mat4 uView;
uniform mat4 uProjection;

// VARYING OUTPUTS
varying vec3 vDirection;

void main() {
    vDirection = aPosition;
    mat4 viewNoTranslation = uView;
    viewNoTranslation[3][0] = 0.0;
    viewNoTranslation[3][1] = 0.0;
    viewNoTranslation[3][2] = 0.0;
    gl_Position = uProjection * viewNoTranslation * vec4(aPosition * 100.0, 1.0);
}