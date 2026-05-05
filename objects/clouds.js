/**
 * @brief Cloud configuration data for movement and positioning
 * @type {Array<Object>}
 * @property {number} x - Center X position of cloud movement path
 * @property {number} y - Y position (altitude) of cloud
 * @property {number} z - Center Z position of cloud movement path
 * @property {number} speed - Movement speed (units per second)
 * @property {number} offset - Phase offset for animation (radians)
 */
const CLOUD_CONFIGS = [
    { x: -20, y: 45, z: -20, speed: 0.8,  offset: 0.0 },
    { x:  15, y: 50, z: -30, speed: 0.6,  offset: 2.1 },
    { x: -5,  y: 42, z:  10, speed: 0.9,  offset: 4.3 },
    { x:  25, y: 48, z:   8, speed: 0.7,  offset: 1.5 },
    { x: -30, y: 46, z:  -5, speed: 0.5,  offset: 3.2 },
    { x:  5,  y: 52, z: -40, speed: 0.75, offset: 5.1 },
    { x: -40, y: 44, z:  20, speed: 0.65, offset: 1.8 },
    { x:  35, y: 49, z:  25, speed: 0.55, offset: 6.3 },
    { x: -15, y: 47, z:  35, speed: 0.7,  offset: 2.7 },
    { x:  20, y: 51, z: -15, speed: 0.85, offset: 0.9 },
    { x: -50, y: 43, z: -10, speed: 0.6,  offset: 3.8 },
    { x:  40, y: 53, z: -35, speed: 0.45, offset: 7.1 },
    { x:  -8, y: 55, z: -50, speed: 0.7,  offset: 4.5 },
    { x:  30, y: 44, z:  40, speed: 0.8,  offset: 1.2 },
    { x: -25, y: 50, z:  50, speed: 0.5,  offset: 8.3 },
];

/**
 * @brief Cloud parts configuration - defines the structure of a single cloud
 * @details Each cloud is composed of multiple scaled and offset quadrilaterals
 *          to create a fluffy, volumetric appearance
 * @type {Array<Object>}
 * @property {number} ox - Offset X from cloud center
 * @property {number} oy - Offset Y from cloud center
 * @property {number} oz - Offset Z from cloud center
 * @property {number} sx - Scale factor in X direction
 * @property {number} sy - Scale factor in Y direction
 * @property {number} sz - Scale factor in Z direction
 */
const CLOUD_PARTS = [
    { ox: 0,    oy: 0,    oz: 0,    sx: 16.0, sy: 4.0, sz: 9.0  },
    { ox: -7.0, oy: -0.3, oz: 0.2,  sx: 12.0, sy: 3.5, sz: 7.5  },
    { ox:  7.0, oy: -0.2, oz: -0.2, sx: 13.0, sy: 3.8, sz: 8.0  },
    { ox:  0.5, oy:  2.0, oz: 0.1,  sx:  8.0, sy: 3.0, sz: 6.0  },
    { ox:  0.2, oy: -0.5, oz:  2.0, sx: 10.0, sy: 3.2, sz: 5.5  },
    { ox: -2.5, oy:  1.5, oz: -1.5, sx:  7.0, sy: 2.5, sz: 5.0  },
];

/**
 * @brief Creates a single quadrilateral (quad) geometry for cloud rendering
 * @details A quad is a simple plane with 2 triangles. Multiple scaled quads
 *          are combined to create a fluffy cloud shape
 * @return {Object} Object containing vertices, normals, and texcoords arrays
 */
function createCloudQuad() {
    const vertexArray = new Float32Array([
        -0.5, 0, -0.5,
         0.5, 0, -0.5,
         0.5, 0,  0.5,
        -0.5, 0, -0.5,
         0.5, 0,  0.5,
        -0.5, 0,  0.5,
    ]);
    const normalArray = new Float32Array([
        0, 1, 0, 0, 1, 0, 0, 1, 0,
        0, 1, 0, 0, 1, 0, 0, 1, 0,
    ]);
    const textureCoordArray = new Float32Array([
        0, 0, 1, 0, 1, 1,
        0, 0, 1, 1, 0, 1,
    ]);
    return { vertices: vertexArray, normals: normalArray, texcoords: textureCoordArray };
}

/**
 * @brief Initializes GPU buffers for cloud geometry
 * @param {WebGLRenderingContext} gl - WebGL context
 * @return {Object} Buffer object containing VBO, NBO, TBO and vertex count
 */
export function initCloudBuffers(gl) {
    const cloudGeometry = createCloudQuad();

    const vertexBufferObject = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferObject);
    gl.bufferData(gl.ARRAY_BUFFER, cloudGeometry.vertices, gl.STATIC_DRAW);

    const normalBufferObject = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBufferObject);
    gl.bufferData(gl.ARRAY_BUFFER, cloudGeometry.normals, gl.STATIC_DRAW);

    const textureCoordBufferObject = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBufferObject);
    gl.bufferData(gl.ARRAY_BUFFER, cloudGeometry.texcoords, gl.STATIC_DRAW);

    return {
        vbo: vertexBufferObject,
        nbo: normalBufferObject,
        tbo: textureCoordBufferObject,
        count: 6
    };
}

/**
 * @brief Renders all clouds with alpha blending and movement animation
 * @details Each cloud is composed of multiple scaled quads. Clouds move in sine-wave
 *          patterns and use alpha blending for transparency. Depth writing is disabled
 *          during cloud rendering to prevent depth buffer artifacts
 * @param {WebGLRenderingContext} gl - WebGL context
 * @param {Object} cloudBuffers - Buffer object from initCloudBuffers
 * @param {number} currentTime - Current animation time in seconds
 * @param {number} attributePosition - Position attribute location in shader
 * @param {number} attributeNormal - Normal attribute location in shader
 * @param {number} attributeTexCoord - Texture coordinate attribute location in shader
 * @param {number} uniformModel - Model matrix uniform location
 * @param {number} uniformObjectColor - Object color uniform location
 * @param {number} uniformUseTexture - Use texture flag uniform location
 * @param {number} uniformIsWater - Is water flag uniform location
 * @param {number} uniformIsFlower - Is flower flag uniform location
 * @param {number} uniformIsCloud - Is cloud flag uniform location (enables alpha in shader)
 * @param {number} uniformTime - Time uniform location
 * @return {void}
 */
export function renderClouds(gl, cloudBuffers, currentTime, attributePosition, attributeNormal, attributeTexCoord, uniformModel, uniformObjectColor, uniformUseTexture, uniformIsWater, uniformIsFlower, uniformIsCloud, uniformTime) {
    gl.uniform1i(uniformIsWater, 0);
    gl.uniform1i(uniformIsFlower, 0);
    gl.uniform1i(uniformUseTexture, 0);
    gl.uniform1i(uniformIsCloud, 1);

    // Enable alpha blending for transparent clouds
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);

    // Bind vertex attributes
    gl.bindBuffer(gl.ARRAY_BUFFER, cloudBuffers.vbo);
    gl.vertexAttribPointer(attributePosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(attributePosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, cloudBuffers.nbo);
    gl.vertexAttribPointer(attributeNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(attributeNormal);

    if (attributeTexCoord >= 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, cloudBuffers.tbo);
        gl.vertexAttribPointer(attributeTexCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(attributeTexCoord);
    }

    // Render each cloud
    for (const cloudConfig of CLOUD_CONFIGS) {
        // Calculate cloud position with sine-wave movement
        const worldPositionX = cloudConfig.x + Math.sin(currentTime * cloudConfig.speed + cloudConfig.offset) * 6.0;
        const worldPositionY = cloudConfig.y + Math.sin(currentTime * 0.08 + cloudConfig.offset) * 0.3;
        const worldPositionZ = cloudConfig.z + Math.cos(currentTime * cloudConfig.speed * 0.5 + cloudConfig.offset) * 2.0;

        // Render each part (quad) of the cloud
        for (const cloudPart of CLOUD_PARTS) {
            const modelMatrix = new Float32Array([
                cloudPart.sx, 0, 0, 0,
                0, cloudPart.sy, 0, 0,
                0, 0, cloudPart.sz, 0,
                worldPositionX + cloudPart.ox, worldPositionY + cloudPart.oy, worldPositionZ + cloudPart.oz, 1
            ]);
            gl.uniformMatrix4fv(uniformModel, false, modelMatrix);
            
            // Set cloud color (off-white)
            gl.uniform3fv(uniformObjectColor, [0.95, 0.88, 0.82]);
            gl.drawArrays(gl.TRIANGLES, 0, cloudBuffers.count);
        }
    }

    // Restore rendering state
    gl.uniform1i(uniformIsCloud, 0);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
}