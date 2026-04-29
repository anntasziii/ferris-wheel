export function createGround(gl) {
    const vertices = new Float32Array([
        -5, 0, -5,
         5, 0, -5,
         5, 0,  5,

        -5, 0, -5,
         5, 0,  5,
        -5, 0,  5,
    ]);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    return {
        buffer,
        count: 6
    };
}