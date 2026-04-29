export function createCabin(gl) {

    // 36 вершин куба
    const vertices = new Float32Array([
        // FRONT
        -0.2,-0.2, 0.2,  0.2,-0.2, 0.2,  0.2, 0.2, 0.2,
        -0.2,-0.2, 0.2,  0.2, 0.2, 0.2, -0.2, 0.2, 0.2,

        // BACK
        -0.2,-0.2,-0.2, -0.2, 0.2,-0.2,  0.2, 0.2,-0.2,
        -0.2,-0.2,-0.2,  0.2, 0.2,-0.2,  0.2,-0.2,-0.2,

        // LEFT
        -0.2,-0.2,-0.2, -0.2,-0.2, 0.2, -0.2, 0.2, 0.2,
        -0.2,-0.2,-0.2, -0.2, 0.2, 0.2, -0.2, 0.2,-0.2,

        // RIGHT
         0.2,-0.2,-0.2,  0.2, 0.2,-0.2,  0.2, 0.2, 0.2,
         0.2,-0.2,-0.2,  0.2, 0.2, 0.2,  0.2,-0.2, 0.2,

        // TOP
        -0.2, 0.2,-0.2, -0.2, 0.2, 0.2,  0.2, 0.2, 0.2,
        -0.2, 0.2,-0.2,  0.2, 0.2, 0.2,  0.2, 0.2,-0.2,

        // BOTTOM
        -0.2,-0.2,-0.2,  0.2,-0.2,-0.2,  0.2,-0.2, 0.2,
        -0.2,-0.2,-0.2,  0.2,-0.2, 0.2, -0.2,-0.2, 0.2,
    ]);

    const normals = new Float32Array([
        ...Array(6).fill([0,0,1]).flat(),
        ...Array(6).fill([0,0,-1]).flat(),
        ...Array(6).fill([-1,0,0]).flat(),
        ...Array(6).fill([1,0,0]).flat(),
        ...Array(6).fill([0,1,0]).flat(),
        ...Array(6).fill([0,-1,0]).flat(),
    ]);

    const vao = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vao);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const nbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nbo);
    gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);

    return {
        vertexBuffer: vao,
        normalBuffer: nbo,
        count: 36
    };
}