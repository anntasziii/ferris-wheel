
function createSkyboxGeometry() {
    const vertices = new Float32Array([
        -1,-1,-1,  1,-1,-1,  1, 1,-1,  -1, 1,-1,  
        -1,-1, 1, -1, 1, 1,  1, 1, 1,   1,-1, 1,  
        -1, 1,-1, -1, 1, 1, -1,-1, 1,  -1,-1,-1,  
         1, 1, 1,  1, 1,-1,  1,-1,-1,   1,-1, 1,  
        -1, 1,-1,  1, 1,-1,  1, 1, 1,  -1, 1, 1,  
        -1,-1, 1,  1,-1, 1,  1,-1,-1,  -1,-1,-1,  
    ]);

    const indices = new Uint16Array([
         0, 1, 2,  0, 2, 3,
         4, 5, 6,  4, 6, 7,
         8, 9,10,  8,10,11,
        12,13,14, 12,14,15,
        16,17,18, 16,18,19,
        20,21,22, 20,22,23,
    ]);

    return { vertices, indices };
}

export function initSkybox(gl) {
    const geo = createSkyboxGeometry();

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, geo.vertices, gl.STATIC_DRAW);

    const ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geo.indices, gl.STATIC_DRAW);

    return { vbo, ibo, count: geo.indices.length };
}

export function renderSkybox(gl, skyboxBuffers, skyboxProgram, aPositionSky, uViewSky, uProjectionSky, viewMatrix, projectionMatrix) {
    gl.useProgram(skyboxProgram);

    gl.depthMask(false);

    gl.bindBuffer(gl.ARRAY_BUFFER, skyboxBuffers.vbo);
    gl.vertexAttribPointer(aPositionSky, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aPositionSky);

    gl.uniformMatrix4fv(uViewSky, false, viewMatrix);
    gl.uniformMatrix4fv(uProjectionSky, false, projectionMatrix);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, skyboxBuffers.ibo);
    gl.drawElements(gl.TRIANGLES, skyboxBuffers.count, gl.UNSIGNED_SHORT, 0);

    gl.depthMask(true);
}