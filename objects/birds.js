/**
 * @brief Bird configuration data for flight paths and animation
 * @type {Array<Object>}
 * @property {number} x - Center X position of circular flight path
 * @property {number} y - Center Y position of circular flight path
 * @property {number} z - Center Z position of circular flight path
 * @property {number} speed - Angular velocity of circular motion (radians per second)
 * @property {number} radius - Radius of circular flight path
 * @property {number} offset - Phase offset for animation (radians)
 * @property {number} height - Vertical oscillation frequency parameter
 */
const BIRD_CONFIGS = [
    { x: -25, y: 28, z: -20,  speed: 0.4, radius: 15, offset: 0.0,  height: 0.5 },
    { x:  35, y: 32, z: -30,  speed: 0.3, radius: 20, offset: 2.1,  height: 0.3 },
    { x: -30, y: 26, z:  25,  speed: 0.5, radius: 12, offset: 4.3,  height: 0.8 },
    { x:  40, y: 35, z: -15,  speed: 0.35, radius: 18, offset: 1.5,  height: 0.4 },
    { x: -35, y: 29, z:  35,  speed: 0.25, radius: 14, offset: 3.7,  height: 0.6 },
    { x:  30, y: 27, z: -40, speed: 0.45, radius: 16, offset: 5.2,  height: 0.3 },
];

/**
 * @brief Creates procedural bird geometry with body, head, tail, and wings
 * @details Constructs a simple bird model using triangles with:
 *          - Body: elongated ellipsoid shape
 *          - Head: spherical approximation
 *          - Tail: four feather-like triangles
 *          - Wings: left and right wings with feather segments
 * @return {Object} Object containing vertices, normals, texcoords arrays and vertex count
 */
function createBirdGeometry() {
    const vertexArray = [];
    const normalArray  = [];
    const texCoordArray = [];

    /**
     * @brief Adds a triangle to the bird geometry
     * @param {Array<number>} vertex0 - First vertex [x, y, z]
     * @param {Array<number>} vertex1 - Second vertex [x, y, z]
     * @param {Array<number>} vertex2 - Third vertex [x, y, z]
     * @param {number} normalX - Normal vector X component
     * @param {number} normalY - Normal vector Y component
     * @param {number} normalZ - Normal vector Z component
     * @return {void}
     */
    function addTriangle(vertex0, vertex1, vertex2, normalX, normalY, normalZ) {
        vertexArray.push(...vertex0, ...vertex1, ...vertex2);
        for (let i = 0; i < 3; i++) normalArray.push(normalX, normalY, normalZ);
        texCoordArray.push(0, 0, 0.5, 1, 1, 0);
    }

    const bodyLength = 0.9;
    const bodyWidth = 0.07;
    const bodyHeight = 0.08;

    // BODY
    addTriangle(
        [-bodyLength*0.15, 0, 0],
        [0, bodyHeight, bodyWidth*0.5],
        [bodyLength*0.5, 0, 0],
        0, 1, 0
    );
    addTriangle(
        [-bodyLength*0.15, 0, 0],
        [0, bodyHeight, -bodyWidth*0.5],
        [bodyLength*0.5, 0, 0],
        0, 1, 0
    );
    addTriangle(
        [-bodyLength*0.15, 0, 0],
        [bodyLength*0.5, 0, 0],
        [0, -bodyHeight*0.4, bodyWidth*0.5],
        0, -1, 0
    );
    addTriangle(
        [-bodyLength*0.15, 0, 0],
        [bodyLength*0.5, 0, 0],
        [0, -bodyHeight*0.4, -bodyWidth*0.5],
        0, -1, 0
    );

    // HEAD
    const headPositionX = bodyLength*0.52;
    const headRadius = 0.045;
    for (let i = 0; i < 10; i++) {
        const angle1 = (i/10)*Math.PI*2;
        const angle2 = ((i+1)/10)*Math.PI*2;
        addTriangle(
            [headPositionX, headRadius*0.2, 0],
            [headPositionX + Math.cos(angle1)*headRadius, Math.sin(angle1)*headRadius, Math.sin(angle1)*headRadius*0.4],
            [headPositionX + Math.cos(angle2)*headRadius, Math.sin(angle2)*headRadius, Math.sin(angle2)*headRadius*0.4],
            Math.cos((angle1+angle2)*0.5), 0.5, 0
        );
    }

    // BEAK
    addTriangle(
        [headPositionX+headRadius, headRadius*0.1, 0],
        [headPositionX+headRadius*3.0, -headRadius*0.05, 0],
        [headPositionX+headRadius, -headRadius*0.05, headRadius*0.05],
        1, 0.2, 0
    );
    addTriangle(
        [headPositionX+headRadius, headRadius*0.1, 0],
        [headPositionX+headRadius, -headRadius*0.05, -headRadius*0.05],
        [headPositionX+headRadius*3.0, -headRadius*0.05, 0],
        1, 0.2, 0
    );

    // TAIL
    const tailPositionX = -bodyLength*0.15;
    addTriangle(
        [tailPositionX, 0, 0],
        [tailPositionX-0.35, bodyHeight*0.15, 0.14],
        [tailPositionX-0.25, 0, 0.09],
        -1, 0, 0.2
    );
    addTriangle(
        [tailPositionX, 0, 0],
        [tailPositionX-0.35, bodyHeight*0.15, -0.14],
        [tailPositionX-0.25, 0, -0.09],
        -1, 0, -0.2
    );
    addTriangle(
        [tailPositionX, 0, 0],
        [tailPositionX-0.25, 0, 0.09],
        [tailPositionX-0.3, -bodyHeight*0.15, 0],
        -1, -0.1, 0
    );
    addTriangle(
        [tailPositionX, 0, 0],
        [tailPositionX-0.3, -bodyHeight*0.15, 0],
        [tailPositionX-0.25, 0, -0.09],
        -1, -0.1, 0
    );

    // WINGS
    const wingOffsetZ = bodyWidth*0.5;

    /**
     * @brief Left wing feather vertices
     * @type {Array<Array<number>>}
     */
    const leftWingFront = [
        [0.12, 0.01, wingOffsetZ],
        [0.02, 0.06, wingOffsetZ+0.25],
        [-0.04, 0.09, wingOffsetZ+0.5],
        [-0.06, 0.09, wingOffsetZ+0.75],
        [-0.04, 0.07, wingOffsetZ+1.0],
        [-0.06, 0.05, wingOffsetZ+1.2],
        [-0.02, 0.02, wingOffsetZ+1.35],
    ];

    /**
     * @brief Left wing feather vertices
     * @type {Array<Array<number>>}
     */
    const leftWingBack = [
        [0.12, -0.01, wingOffsetZ],
        [0.06, -0.02, wingOffsetZ+0.2],
        [0.02, -0.01, wingOffsetZ+0.45],
        [0.0,  0.01,  wingOffsetZ+0.7],
        [-0.01, 0.03, wingOffsetZ+0.95],
        [-0.03, 0.02, wingOffsetZ+1.15],
        [-0.02, 0.02, wingOffsetZ+1.35],
    ];

    // Left wing geometry
    for (let i = 0; i < leftWingFront.length - 1; i++) {
        addTriangle(leftWingFront[i], leftWingFront[i+1], leftWingBack[i], 0, 1, 0.05);
        addTriangle(leftWingFront[i+1], leftWingBack[i+1], leftWingBack[i], 0, 1, 0.05);
    }

    // Right wing geometry
    const rightWingFront = leftWingFront.map(vertex => [vertex[0], vertex[1], -vertex[2]]);
    const rightWingBack = leftWingBack.map(vertex => [vertex[0], vertex[1], -vertex[2]]);

    for (let i = 0; i < rightWingFront.length - 1; i++) {
        addTriangle(rightWingFront[i], rightWingBack[i], rightWingFront[i+1], 0, 1, -0.05);
        addTriangle(rightWingFront[i+1], rightWingBack[i], rightWingBack[i+1], 0, 1, -0.05);
    }

    return {
        vertices:  new Float32Array(vertexArray),
        normals:   new Float32Array(normalArray),
        texcoords: new Float32Array(texCoordArray),
        count: vertexArray.length / 3
    };
}

/**
 * @brief Initializes GPU buffers for bird geometry
 * @param {WebGLRenderingContext} gl - WebGL context
 * @return {Object} Buffer object containing VBO, NBO, TBO and vertex count
 */
export function initBirdBuffers(gl) {
    const birdGeometry = createBirdGeometry();

    const vertexBufferObject = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferObject);
    gl.bufferData(gl.ARRAY_BUFFER, birdGeometry.vertices, gl.STATIC_DRAW);

    const normalBufferObject = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBufferObject);
    gl.bufferData(gl.ARRAY_BUFFER, birdGeometry.normals, gl.STATIC_DRAW);

    const textureCoordBufferObject = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBufferObject);
    gl.bufferData(gl.ARRAY_BUFFER, birdGeometry.texcoords, gl.STATIC_DRAW);

    return {
        vbo: vertexBufferObject,
        nbo: normalBufferObject,
        tbo: textureCoordBufferObject,
        count: birdGeometry.count
    };
}

/**
 * @brief Renders all birds with circular flight paths and wing flapping animation
 * @details Each bird follows a circular path with vertical oscillation and animated wing flapping.
 *          The bird's orientation is calculated from flight direction, and wing flap is
 *          modulated by a sine function for smooth animation.
 *          
 *          UPDATED: Now supports animated texture with transformation matrix (punkt 14b)
 *          The texture coordinates are transformed with scale, rotation, and translation
 *          to create a dynamic visual effect on the birds.
 * 
 * @param {WebGLRenderingContext} gl - WebGL context
 * @param {Object} birdBuffers - Buffer object from initBirdBuffers
 * @param {number} currentTime - Current animation time in seconds
 * @param {number} attributePosition - Position attribute location in shader
 * @param {number} attributeNormal - Normal attribute location in shader
 * @param {number} attributeTexCoord - Texture coordinate attribute location in shader
 * @param {number} uniformModel - Model matrix uniform location
 * @param {number} uniformObjectColor - Object color uniform location
 * @param {number} uniformUseTexture - Use texture flag uniform location
 * @param {number} uniformIsWater - Is water flag uniform location
 * @param {number} uniformIsFlower - Is flower flag uniform location
 * @param {number} uniformIsBird - Is bird flag uniform location (punkt 14b)
 * @param {WebGLTexture} birdTexture - Bird texture for animation (punkt 14b)
 * @param {number} uniformTexture - Texture uniform location (punkt 14b)
 * @return {void}
 */
export function renderBirds(
    gl, birdBuffers, currentTime, attributePosition, attributeNormal, attributeTexCoord, 
    uniformModel, uniformObjectColor, uniformUseTexture, uniformIsWater, uniformIsFlower,
    uniformIsBird, birdTexture, uniformTexture
) {
    gl.uniform1i(uniformIsWater, 0);
    gl.uniform1i(uniformIsFlower, 0);

    gl.uniform1i(uniformIsBird, 1);
    gl.uniform1i(uniformUseTexture, 1);
    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, birdTexture);
    gl.uniform1i(uniformTexture, 4);

    // Bind vertex attributes
    gl.bindBuffer(gl.ARRAY_BUFFER, birdBuffers.vbo);
    gl.vertexAttribPointer(attributePosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(attributePosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, birdBuffers.nbo);
    gl.vertexAttribPointer(attributeNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(attributeNormal);

    if (attributeTexCoord >= 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, birdBuffers.tbo);
        gl.vertexAttribPointer(attributeTexCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(attributeTexCoord);
    }

    /**
     * @brief Color palette for different birds
     * @type {Array<Array<number>>}
     */
    const birdColorPalette = [
        [1.0,  0.98, 0.95],
        [0.2,  0.18, 0.22], 
        [0.7,  0.55, 0.35],
        [0.85, 0.3,  0.2 ],
        [0.3,  0.5,  0.7 ],
        [0.6,  0.65, 0.4 ],
    ];

    // Base bird color for shading
    gl.uniform3fv(uniformObjectColor, [0.15, 0.1, 0.1]);

    // Render each bird
    for (const birdConfig of BIRD_CONFIGS) {
        // Calculate circular flight path position
        const birdAngle = currentTime * birdConfig.speed + birdConfig.offset;
        const worldPositionX = birdConfig.x + Math.cos(birdAngle) * birdConfig.radius;
        const worldPositionY = birdConfig.y + Math.sin(currentTime * birdConfig.height + birdConfig.offset) * 1.5;
        const worldPositionZ = birdConfig.z + Math.sin(birdAngle) * birdConfig.radius * 0.6;

        // Calculate flight direction vector
        const directionX = -Math.sin(birdAngle);
        const directionZ = Math.cos(birdAngle) * 0.6;
        const directionLength = Math.sqrt(directionX*directionX + directionZ*directionZ);
        const normalizedDirX = directionX / directionLength;
        const normalizedDirZ = directionZ / directionLength;

        // Calculate wing flapping animation
        const wingFlapAngle = Math.sin(currentTime * 4.0 + birdConfig.offset) * 0.4;
        const cosWingFlap = Math.cos(wingFlapAngle);
        const sinWingFlap = Math.sin(wingFlapAngle);

        // Build model matrix: rotation based on flight direction and wing flap
        const modelScale = 3;
        const modelMatrix = new Float32Array([
            normalizedDirX * modelScale,  sinWingFlap * modelScale, normalizedDirZ * modelScale, 0,
            0,                            cosWingFlap * modelScale, 0,                           0,
            -normalizedDirZ * modelScale, sinWingFlap * modelScale, normalizedDirX * modelScale, 0,
            worldPositionX, worldPositionY, worldPositionZ, 1
        ]);

        // Select color for this bird based on configuration index
        const birdColorIndex = BIRD_CONFIGS.indexOf(birdConfig) % birdColorPalette.length;
        gl.uniform3fv(uniformObjectColor, birdColorPalette[birdColorIndex]);
        gl.uniformMatrix4fv(uniformModel, false, modelMatrix);

        // Render bird geometry
        gl.drawArrays(gl.TRIANGLES, 0, birdBuffers.count);
    }

    gl.uniform1i(uniformIsBird, 0);
    gl.uniform1i(uniformUseTexture, 0);
}