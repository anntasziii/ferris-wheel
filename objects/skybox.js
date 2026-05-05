/**
 * @brief Creates cube geometry for skybox rendering
 * @details Generates a unit cube with vertices arranged for counter-clockwise winding
 * @return {Object} Object containing vertices and indices arrays for cube geometry
 */
function createSkyboxGeometry() {
    /**
     * @brief Vertex positions for skybox cube
     * @details 24 vertices defining 6 faces of the cube
     * @type {Float32Array}
     */
    const vertexPositionArray = new Float32Array([
        -1, -1, -1,  1, -1, -1,  1,  1, -1,  -1,  1, -1,
        -1, -1,  1, -1,  1,  1,  1,  1,  1,   1, -1,  1,
        -1,  1, -1, -1,  1,  1, -1, -1,  1,  -1, -1, -1,
         1,  1,  1,  1,  1, -1,  1, -1, -1,   1, -1,  1,
        -1,  1, -1,  1,  1, -1,  1,  1,  1,  -1,  1,  1,
        -1, -1,  1,  1, -1,  1,  1, -1, -1,  -1, -1, -1,
    ]);

    /**
     * @brief Vertex indices for skybox cube triangles
     * @details 36 indices defining 12 triangles (2 per face) using counter-clockwise winding
     * @type {Uint16Array}
     */
    const triangleIndexArray = new Uint16Array([
         0,  1,  2,   0,  2,  3,
         4,  5,  6,   4,  6,  7,
         8,  9, 10,   8, 10, 11,
        12, 13, 14,  12, 14, 15,
        16, 17, 18,  16, 18, 19,
        20, 21, 22,  20, 22, 23,
    ]);

    return { vertices: vertexPositionArray, indices: triangleIndexArray };
}

/**
 * @brief Initializes GPU buffers for skybox geometry
 * @details Creates and uploads vertex and index buffers for the skybox cube
 * @param {WebGLRenderingContext} gl - WebGL context
 * @return {Object} Buffer object containing VBO, IBO and triangle count
 */
export function initSkybox(gl) {
    const skyboxGeometry = createSkyboxGeometry();

    const vertexBufferObject = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferObject);
    gl.bufferData(gl.ARRAY_BUFFER, skyboxGeometry.vertices, gl.STATIC_DRAW);

    const indexBufferObject = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBufferObject);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, skyboxGeometry.indices, gl.STATIC_DRAW);

    return {
        vbo: vertexBufferObject,
        ibo: indexBufferObject,
        count: skyboxGeometry.indices.length
    };
}

/**
 * @brief Renders the skybox as a background cube
 * @details The skybox is rendered with depth writing disabled to avoid depth conflicts.
 *          The view matrix is used without translation to keep the skybox centered on camera.
 *          Should be rendered before other objects to minimize fill-rate usage
 * @param {WebGLRenderingContext} gl - WebGL context
 * @param {Object} skyboxBuffers - Buffer object from initSkybox
 * @param {WebGLProgram} skyboxShaderProgram - Compiled skybox shader program
 * @param {number} attributePositionLocation - Position attribute location in skybox shader
 * @param {number} uniformViewLocation - View matrix uniform location in skybox shader
 * @param {number} uniformProjectionLocation - Projection matrix uniform location in skybox shader
 * @param {Float32Array} cameraViewMatrix - View matrix from camera (used without translation)
 * @param {Float32Array} projectionMatrix - Perspective projection matrix
 * @return {void}
 */
export function renderSkybox(gl, skyboxBuffers, skyboxShaderProgram, attributePositionLocation, uniformViewLocation, uniformProjectionLocation, cameraViewMatrix, projectionMatrix) {
    gl.useProgram(skyboxShaderProgram);

    // Disable depth writing to prevent depth conflicts
    gl.depthMask(false);

    // Bind vertex buffer and set up attribute pointer
    gl.bindBuffer(gl.ARRAY_BUFFER, skyboxBuffers.vbo);
    gl.vertexAttribPointer(attributePositionLocation, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(attributePositionLocation);

    // Set transformation matrices
    gl.uniformMatrix4fv(uniformViewLocation, false, cameraViewMatrix);
    gl.uniformMatrix4fv(uniformProjectionLocation, false, projectionMatrix);

    // Bind index buffer and render
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, skyboxBuffers.ibo);
    gl.drawElements(gl.TRIANGLES, skyboxBuffers.count, gl.UNSIGNED_SHORT, 0);

    // Re-enable depth writing for subsequent objects
    gl.depthMask(true);
}