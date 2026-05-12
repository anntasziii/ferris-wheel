/**
 * @brief Creates procedural flower geometry with stem, petals, and center
 * @details Generates a flower with configurable petal count, shape, and stem.
 *          Petals are arranged radially around a central stem
 * @param {number} baseSize - Scale factor for all flower dimensions
 * @param {number} petalCount - Number of petals on flower
 * @param {number} petalLength - Length of each petal (relative to size)
 * @param {number} petalWidth - Width of each petal (relative to size)
 * @param {number} petalRoundness - Roundness/tessellation quality of petals
 * @param {number} stemHeight - Height of stem (relative to size)
 * @param {number} stemWidth - Width of stem (relative to size)
 * @return {Object} Object containing vertices, normals, texcoords arrays and geometry counts
 */
function createDetailedFlower(baseSize, petalCount, petalLength, petalWidth, petalRoundness, stemHeight, stemWidth) {
    const vertexArray = [];
    const normalArray  = [];
    const textureCoordArray = [];

    const stemWidthScaled = baseSize * stemWidth;
    const stemHeightScaled = baseSize * stemHeight;

    // ── STEM ──────────────────────────────────────────────────────────────────
    const stemVertexData = [
        -stemWidthScaled, 0, 0,  stemWidthScaled, 0, 0,  stemWidthScaled, stemHeightScaled, 0,
        -stemWidthScaled, 0, 0,  stemWidthScaled, stemHeightScaled, 0, -stemWidthScaled, stemHeightScaled, 0,
        0, 0, -stemWidthScaled,  0, 0, stemWidthScaled,  0, stemHeightScaled, stemWidthScaled,
        0, 0, -stemWidthScaled,  0, stemHeightScaled, stemWidthScaled,  0, stemHeightScaled, -stemWidthScaled,
    ];
    for (const vertex of stemVertexData) vertexArray.push(vertex);
    for (let i = 0; i < 12; i++) normalArray.push(0, 1, 0);
    for (let i = 0; i < 12; i++) textureCoordArray.push(0, 0);

    // ── PETALS ────────────────────────────────────────────────────────────────
    const petalBaseY = stemHeightScaled;
    const petalRadius = baseSize * petalLength;
    const petalHalfWidth = baseSize * petalWidth;
    const petalSegmentCount = Math.max(6, Math.round(petalRoundness * 4));

    for (let petalIndex = 0; petalIndex < petalCount; petalIndex++) {
        const verticalOffset = petalIndex * 0.001;  // Prevent z-fighting

        const petalAngle = (petalIndex / petalCount) * Math.PI * 2;
        const cosPetalAngle = Math.cos(petalAngle);
        const sinPetalAngle = Math.sin(petalAngle);

        const petalCenterX = cosPetalAngle * petalRadius * 0.55;
        const petalCenterZ = sinPetalAngle * petalRadius * 0.55;

        for (let segmentIndex = 0; segmentIndex < petalSegmentCount; segmentIndex++) {
            const angle1 = (segmentIndex / petalSegmentCount) * Math.PI * 2;
            const angle2 = ((segmentIndex + 1) / petalSegmentCount) * Math.PI * 2;

            const localX1 = Math.cos(angle1) * petalRadius * 0.5;
            const localZ1 = Math.sin(angle1) * petalHalfWidth * 0.5;
            const localX2 = Math.cos(angle2) * petalRadius * 0.5;
            const localZ2 = Math.sin(angle2) * petalHalfWidth * 0.5;

            const worldX1 = petalCenterX + cosPetalAngle * localX1 - sinPetalAngle * localZ1;
            const worldZ1 = petalCenterZ + sinPetalAngle * localX1 + cosPetalAngle * localZ1;
            const worldX2 = petalCenterX + cosPetalAngle * localX2 - sinPetalAngle * localZ2;
            const worldZ2 = petalCenterZ + sinPetalAngle * localX2 + cosPetalAngle * localZ2;

            vertexArray.push(
                petalCenterX, petalBaseY + verticalOffset, petalCenterZ,
                worldX1, petalBaseY + verticalOffset, worldZ1,
                worldX2, petalBaseY + verticalOffset, worldZ2
            );
            normalArray.push(0, 1, 0, 0, 1, 0, 0, 1, 0);

            // Texture coordinates: center=0, edge=1 for color gradient
            textureCoordArray.push(
                0.0, 0.0,
                1.0, 0.0,
                1.0, 0.0
            );
        }
    }

    // ── FLOWER CENTER ─────────────────────────────────────────────────────────
    const centerRadius = baseSize * 0.38;
    const centerY = petalBaseY + baseSize * 0.05;
    const centerSegmentCount = 10;

    for (let centerSegmentIndex = 0; centerSegmentIndex < centerSegmentCount; centerSegmentIndex++) {
        const angle1 = (centerSegmentIndex / centerSegmentCount) * Math.PI * 2;
        const angle2 = ((centerSegmentIndex + 1) / centerSegmentCount) * Math.PI * 2;
        
        vertexArray.push(
            0, centerY, 0,
            Math.cos(angle1) * centerRadius, centerY, Math.sin(angle1) * centerRadius,
            Math.cos(angle2) * centerRadius, centerY, Math.sin(angle2) * centerRadius
        );
        normalArray.push(0, 1, 0, 0, 1, 0, 0, 1, 0);
        textureCoordArray.push(0, 0, 0, 0, 0, 0);
    }

    const petalVertexCountPerPetal = petalSegmentCount;

    return {
        vertices:  new Float32Array(vertexArray),
        normals:   new Float32Array(normalArray),
        texcoords: new Float32Array(textureCoordArray),
        stemCount:   12,
        petalCount:  petalCount * petalVertexCountPerPetal * 3,
        centerCount: centerSegmentCount * 3,
        petalSegCount: petalVertexCountPerPetal,
    };
}

/**
 * @brief Flower type definitions with colors and geometry parameters
 * @type {Array<Object>}
 * @property {Array<number>} petal - Petal color [r, g, b]
 * @property {Array<number>} center - Center color [r, g, b]
 * @property {Array<number>} stem - Stem color [r, g, b]
 * @property {number} size - Base size scale
 * @property {number} petals - Number of petals
 * @property {number} petalLength - Petal length factor
 * @property {number} petalWidth - Petal width factor
 * @property {number} petalRoundness - Petal roundness factor
 * @property {number} stemHeight - Stem height factor
 * @property {number} stemWidth - Stem width factor
 */
const FLOWER_TYPES = [
    {
        petal: [1.0, 0.1, 0.1],
        center: [1.0, 0.9, 0.0],
        stem: [0.15, 0.55, 0.1],
        size: 0.3,
        petals: 12,
        petalLength: 1.3,
        petalWidth: 0.3,
        petalRoundness: 1.5,
        stemHeight: 0.9,
        stemWidth: 0.1
    },
    {
        petal: [1.0, 1.0, 1.0],
        center: [1.0, 0.9, 0.0],
        stem: [0.25, 0.65, 0.15],
        size: 0.35,
        petals: 6,
        petalLength: 0.9,
        petalWidth: 0.85,
        petalRoundness: 6.0,
        stemHeight: 0.75,
        stemWidth: 0.1
    },
    {
        petal: [0.65, 0.2, 1.0],
        center: [1.0, 0.9, 0.0],
        stem: [0.2, 0.6, 0.12],
        size: 0.3,
        petals: 12,
        petalLength: 1.5,
        petalWidth: 0.55,
        petalRoundness: 0.5,
        stemHeight: 1.1,
        stemWidth: 0.1
    },
];

/**
 * @brief Creates array of flower instances placed on terrain
 * @param {Function} getTerrainHeight - Function to get full terrain height at (x, z)
 * @param {Function} getBaseTerrainHeight - Function to get base terrain height at (x, z)
 * @param {number} flowerCount - Target number of flowers to place (default 100)
 * @param {number} terrainSize - Size of terrain grid (default 60)
 * @return {Array<Object>} Array of flower objects with position and type
 */
export function createFlowers(getTerrainHeight, getBaseTerrainHeight, flowerCount = 100, terrainSize = 60) {
    const placedFlowers = [];
    let attemptCount = 0;
    const maximumAttempts = flowerCount * 10;

    while (placedFlowers.length < flowerCount && attemptCount < maximumAttempts) {
        attemptCount++;

        const flowerPositionX = Math.random() * terrainSize;
        const flowerPositionZ = Math.random() * terrainSize;

        const terrainHeightFull = getTerrainHeight(flowerPositionX, flowerPositionZ);
        const terrainHeightBase = getBaseTerrainHeight(flowerPositionX, flowerPositionZ);
        const riverBankHeight = terrainHeightFull - terrainHeightBase;

        // Skip flowers on river banks (too steep)
        if (riverBankHeight > 0.1) continue;

        // Check slope steepness
        const slopeStep = 1.0;
        const slopeDeltaX = Math.abs(getTerrainHeight(flowerPositionX + slopeStep, flowerPositionZ) - getTerrainHeight(flowerPositionX - slopeStep, flowerPositionZ));
        const slopeDeltaZ = Math.abs(getTerrainHeight(flowerPositionX, flowerPositionZ + slopeStep) - getTerrainHeight(flowerPositionX, flowerPositionZ - slopeStep));
        const maximumSlope = Math.max(slopeDeltaX, slopeDeltaZ);
        if (maximumSlope > 1.5) continue;

        // Select random flower type
        const selectedType = FLOWER_TYPES[Math.floor(Math.random() * FLOWER_TYPES.length)];
        placedFlowers.push({
            x: flowerPositionX,
            y: terrainHeightFull,
            z: flowerPositionZ,
            type: selectedType
        });
    }
    return placedFlowers;
}

/**
 * @brief Initializes GPU buffers for all flower types
 * @param {WebGLRenderingContext} gl - WebGL context
 * @return {Array<Object>} Array of buffer objects for each flower type
 */
export function initFlowerBuffers(gl) {
    const bufferArray = [];
    for (const flowerType of FLOWER_TYPES) {
        const flowerGeometry = createDetailedFlower(
            flowerType.size,
            flowerType.petals,
            flowerType.petalLength,
            flowerType.petalWidth,
            flowerType.petalRoundness,
            flowerType.stemHeight,
            flowerType.stemWidth
        );

        const vertexBufferObject = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferObject);
        gl.bufferData(gl.ARRAY_BUFFER, flowerGeometry.vertices, gl.STATIC_DRAW);

        const normalBufferObject = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBufferObject);
        gl.bufferData(gl.ARRAY_BUFFER, flowerGeometry.normals, gl.STATIC_DRAW);

        const textureCoordBufferObject = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBufferObject);
        gl.bufferData(gl.ARRAY_BUFFER, flowerGeometry.texcoords, gl.STATIC_DRAW);

        bufferArray.push({
            vbo: vertexBufferObject,
            nbo: normalBufferObject,
            tbo: textureCoordBufferObject,
            stemCount:   flowerGeometry.stemCount,
            petalCount:  flowerGeometry.petalCount,
            centerCount: flowerGeometry.centerCount,
        });
    }
    return bufferArray;
}

/**
 * @brief Renders all flowers with stem, petals, and center
 * @details Each flower is rendered in three passes: stem, petals, and center.
 *          Petals use the uIsFlower flag for shader-side color effects
 * @param {WebGLRenderingContext} gl - WebGL context
 * @param {Array<Object>} flowerBuffers - Buffer objects for each flower type
 * @param {Array<Object>} flowerInstances - Array of flower instances to render
 * @param {Array<number>} terrainOffsetVector - World offset for terrain [x, y, z]
 * @param {number} attributePosition - Position attribute location
 * @param {number} attributeNormal - Normal attribute location
 * @param {number} attributeTexCoord - Texture coordinate attribute location
 * @param {number} uniformModel - Model matrix uniform location
 * @param {number} uniformObjectColor - Object color uniform location
 * @param {number} uniformUseTexture - Use texture flag uniform location
 * @param {number} uniformIsFlower - Is flower flag uniform location (enables shader effects)
 * @return {void}
 */
export function renderFlowers(gl, flowerBuffers, flowerInstances, terrainOffsetVector,
                               attributePosition, attributeNormal, attributeTexCoord,
                               uniformModel, uniformObjectColor, uniformUseTexture, uniformIsFlower, flowerScales = null) {
    gl.uniform1i(uniformUseTexture, 0);
    gl.uniform1i(uniformIsFlower, 1);

    for (let flowerIndex = 0; flowerIndex < flowerInstances.length; flowerIndex++) {
        const flowerInstance = flowerInstances[flowerIndex];
        const typeIndex = FLOWER_TYPES.indexOf(flowerInstance.type);
        const flowerBuffer = flowerBuffers[typeIndex];

        // Bind vertex attributes
        gl.bindBuffer(gl.ARRAY_BUFFER, flowerBuffer.vbo);
        gl.vertexAttribPointer(attributePosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(attributePosition);

        gl.bindBuffer(gl.ARRAY_BUFFER, flowerBuffer.nbo);
        gl.vertexAttribPointer(attributeNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(attributeNormal);

        if (attributeTexCoord >= 0) {
            gl.bindBuffer(gl.ARRAY_BUFFER, flowerBuffer.tbo);
            gl.vertexAttribPointer(attributeTexCoord, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(attributeTexCoord);
        }

        // Calculate world position
        const worldPositionX = flowerInstance.x + terrainOffsetVector[0];
        const worldPositionY = flowerInstance.y + terrainOffsetVector[1];
        const worldPositionZ = flowerInstance.z + terrainOffsetVector[2];

        // Get scale for this flower
        const scale = flowerScales && flowerScales[flowerIndex] ? flowerScales[flowerIndex] : 1.0;

        const modelMatrix = new Float32Array([
            scale, 0, 0, 0,
            0, scale, 0, 0,
            0, 0, scale, 0,
            worldPositionX, worldPositionY, worldPositionZ, 1
        ]);
        gl.uniformMatrix4fv(uniformModel, false, modelMatrix);

        // Render stem
        gl.uniform1i(uniformIsFlower, 0);
        gl.uniform3fv(uniformObjectColor, flowerInstance.type.stem);
        gl.drawArrays(gl.TRIANGLES, 0, flowerBuffer.stemCount);

        // Render petals (with shader effects from uIsFlower flag)
        gl.uniform1i(uniformIsFlower, 1);
        gl.uniform3fv(uniformObjectColor, flowerInstance.type.petal);
        gl.drawArrays(gl.TRIANGLES, flowerBuffer.stemCount, flowerBuffer.petalCount);
        gl.drawArrays(gl.TRIANGLES, flowerBuffer.stemCount, flowerBuffer.petalCount);
        gl.depthMask(true);

        // Render center
        gl.uniform1i(uniformIsFlower, 0);
        gl.uniform3fv(uniformObjectColor, flowerInstance.type.center);
        gl.drawArrays(gl.TRIANGLES, flowerBuffer.stemCount + flowerBuffer.petalCount, flowerBuffer.centerCount);
    }

    gl.uniform1i(uniformIsFlower, 0);
}