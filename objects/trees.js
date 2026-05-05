/**
 * @brief Creates tree geometry with trunk, branches, and foliage
 * @param {number} trunkHeight - Height of the tree trunk
 * @param {number} trunkRadius - Base radius of the tree trunk
 * @param {number} crownHeight - Total height of the foliage crown
 * @param {number} crownRadius - Base radius of the foliage crown
 * @return {Object} Object containing vertices, normals, texcoords arrays and vertex counts
 */
function createTree(trunkHeight = 1.5, trunkRadius = 0.15, crownHeight = 3.0, crownRadius = 1.0) {
    const vertices = [], normals = [], texcoords = [];
    const cylinderSegments = 150; 

    // TRUNK
    for (let i = 0; i < cylinderSegments; i++) {
        const angle1 = (i / cylinderSegments) * Math.PI * 2;
        const angle2 = ((i+1) / cylinderSegments) * Math.PI * 2;
        const cosAngle1 = Math.cos(angle1), sinAngle1 = Math.sin(angle1);
        const cosAngle2 = Math.cos(angle2), sinAngle2 = Math.sin(angle2);

        vertices.push(
            cosAngle1*trunkRadius, 0, sinAngle1*trunkRadius,
            cosAngle2*trunkRadius, 0, sinAngle2*trunkRadius,
            cosAngle2*trunkRadius*0.85, trunkHeight, sinAngle2*trunkRadius*0.85,
            cosAngle1*trunkRadius, 0, sinAngle1*trunkRadius,
            cosAngle2*trunkRadius*0.85, trunkHeight, sinAngle2*trunkRadius*0.85,
            cosAngle1*trunkRadius*0.85, trunkHeight, sinAngle1*trunkRadius*0.85
        );
        const normalX = cosAngle1*0.95, normalZ = sinAngle1*0.95;
        for (let j = 0; j < 6; j++) normals.push(normalX, 0.05, normalZ);
        for (let j = 0; j < 6; j++) texcoords.push(0, 0);
    }
    const trunkVertexCount = cylinderSegments * 6;

    // BRANCHES
    const branchCount = 2;
    for (let branchIndex = 0; branchIndex < branchCount; branchIndex++) {
        const branchAngle = (branchIndex / branchCount) * Math.PI * 2;
        const branchHeight = trunkHeight * (0.45 + branchIndex * 0.25);
        const branchLength = 0.5 + branchIndex * 0.1;
        const branchOffsetX = Math.cos(branchAngle) * branchLength;
        const branchOffsetZ = Math.sin(branchAngle) * branchLength;
        const branchRadius = trunkRadius * 0.3;

        for (let i = 0; i < 6; i++) {
            const angle1 = (i / 6) * Math.PI * 2;
            const angle2 = ((i+1) / 6) * Math.PI * 2;
            const cosAngle1 = Math.cos(angle1)*branchRadius, sinAngle1 = Math.sin(angle1)*branchRadius;
            const cosAngle2 = Math.cos(angle2)*branchRadius, sinAngle2 = Math.sin(angle2)*branchRadius;

            vertices.push(
                cosAngle1, branchHeight, sinAngle1,
                cosAngle2, branchHeight, sinAngle2,
                cosAngle2 + branchOffsetX*0.5, branchHeight + 0.25, sinAngle2 + branchOffsetZ*0.5,
                cosAngle1, branchHeight, sinAngle1,
                cosAngle2 + branchOffsetX*0.5, branchHeight + 0.25, sinAngle2 + branchOffsetZ*0.5,
                cosAngle1 + branchOffsetX*0.5, branchHeight + 0.25, sinAngle1 + branchOffsetZ*0.5
            );
            const normalX = Math.cos((angle1+angle2)*0.5), normalZ = Math.sin((angle1+angle2)*0.5);
            for (let j = 0; j < 6; j++) normals.push(normalX, 0.1, normalZ);
            for (let j = 0; j < 6; j++) texcoords.push(0, 0);
        }
    }
    const branchVertexCount = branchCount * 6 * 6;

    // FOLIAGE CROWN 
    const crownLayers = [
        { baseHeight: trunkHeight - 0.2, baseRadius: crownRadius*0.7, peakHeight: trunkHeight + crownHeight*0.45 },
        { baseHeight: trunkHeight + 0.05, baseRadius: crownRadius*1.05, peakHeight: trunkHeight + crownHeight*0.9 },
        { baseHeight: trunkHeight + 0.25, baseRadius: crownRadius*0.8, peakHeight: trunkHeight + crownHeight*1.3 },
    ];

    let crownVertexCount = 0;
    for (const crownLayer of crownLayers) {
        for (let i = 0; i < cylinderSegments; i++) {
            const angle1 = (i / cylinderSegments) * Math.PI * 2;
            const angle2 = ((i+1) / cylinderSegments) * Math.PI * 2;
            const cosAngle1 = Math.cos(angle1), sinAngle1 = Math.sin(angle1);
            const cosAngle2 = Math.cos(angle2), sinAngle2 = Math.sin(angle2);

            // Side faces
            vertices.push(
                cosAngle1*crownLayer.baseRadius, crownLayer.baseHeight, sinAngle1*crownLayer.baseRadius,
                cosAngle2*crownLayer.baseRadius, crownLayer.baseHeight, sinAngle2*crownLayer.baseRadius,
                0, crownLayer.peakHeight, 0
            );
            const normalX = (cosAngle1+cosAngle2)*0.5, normalZ = (sinAngle1+sinAngle2)*0.5;
            const normalY = crownLayer.baseRadius / Math.max(0.1, crownLayer.peakHeight - crownLayer.baseHeight);
            const normalLength = Math.sqrt(normalX*normalX + normalY*normalY + normalZ*normalZ);
            for (let j = 0; j < 3; j++) normals.push(normalX/normalLength, normalY/normalLength, normalZ/normalLength);
            for (let j = 0; j < 3; j++) texcoords.push(0, 0);

            // Base faces
            vertices.push(
                0, crownLayer.baseHeight, 0,
                cosAngle1*crownLayer.baseRadius, crownLayer.baseHeight, sinAngle1*crownLayer.baseRadius,
                cosAngle2*crownLayer.baseRadius, crownLayer.baseHeight, sinAngle2*crownLayer.baseRadius
            );
            for (let j = 0; j < 3; j++) normals.push(0, -1, 0);
            for (let j = 0; j < 3; j++) texcoords.push(0, 0);

            crownVertexCount += 6;
        }
    }

    return {
        vertices: new Float32Array(vertices),
        normals: new Float32Array(normals),
        texcoords: new Float32Array(texcoords),
        trunkCount: trunkVertexCount,
        branchCount: branchVertexCount,
        crownCount: crownVertexCount,
    };
}

/**
 * @brief Tree type definitions with dimensions and colors
 * @type {Array<Object>}
 * @property {number} trunkH - Height of tree trunk
 * @property {number} trunkR - Radius of tree trunk
 * @property {number} crownH - Height of foliage crown
 * @property {number} crownR - Radius of foliage crown
 * @property {Array<number>} trunkColor - Trunk RGB color [r, g, b]
 * @property {Array<Array<number>>} crownColors - Array of possible foliage colors
 */
const TREE_TYPES = [
    {
        trunkH: 2.5,
        trunkR: 0.2,
        crownH: 6.0,
        crownR: 1.2,
        trunkColor: [0.35, 0.22, 0.1],
        crownColors: [
            [0.05, 0.25, 0.08],
            [0.08, 0.30, 0.10], 
            [0.10, 0.28, 0.09],
            [0.06, 0.26, 0.07],
        ]
    },
    {
        trunkH: 3.0,
        trunkR: 0.25,
        crownH: 2.5,
        crownR: 2.8,
        trunkColor: [0.45, 0.28, 0.12],
        crownColors: [
            [0.2, 0.55, 0.15], 
            [0.28, 0.62, 0.20],
            [0.18, 0.52, 0.14], 
            [0.55, 0.45, 0.15],
        ]
    },
    {
        trunkH: 1.2,
        trunkR: 0.14,
        crownH: 2.5,
        crownR: 1.8,
        trunkColor: [0.4, 0.25, 0.1],
        crownColors: [
            [0.35, 0.48, 0.12],
            [0.42, 0.55, 0.18], 
            [0.30, 0.42, 0.10],
            [0.60, 0.48, 0.15],
        ]
    },
];

/**
 * @brief Creates array of tree instances placed on terrain
 * @param {Function} getTerrainHeight - Function to get full terrain height at (x, z)
 * @param {Function} getBaseTerrainHeight - Function to get base terrain height at (x, z)
 * @param {Array<Object>} riverControlPoints - River path control points [{x, z}, ...]
 * @param {number} treeCount - Target number of trees to place (default 80)
 * @param {number} terrainSize - Size of terrain grid (default 120)
 * @return {Array<Object>} Array of tree objects with position, type, angle, scale, and color
 */
export function createTrees(getTerrainHeight, getBaseTerrainHeight, riverControlPoints, treeCount = 80, terrainSize = 120) {
    const placedTrees = [];

    /**
     * @brief Calculates shortest distance from point to river curve
     * @param {number} pointX - X coordinate of point
     * @param {number} pointZ - Z coordinate of point
     * @return {number} Shortest distance to river
     */
    function distanceToRiver(pointX, pointZ) {
        let minimumDistance = Infinity;
        for (let i = 0; i < riverControlPoints.length - 1; i++) {
            const controlPoint1 = riverControlPoints[i];
            const controlPoint2 = riverControlPoints[i+1];
            const deltaX = controlPoint2.x - controlPoint1.x;
            const deltaZ = controlPoint2.z - controlPoint1.z;
            const segmentLengthSquared = deltaX*deltaX + deltaZ*deltaZ;
            
            let parameter = ((pointX-controlPoint1.x)*deltaX + (pointZ-controlPoint1.z)*deltaZ) / segmentLengthSquared;
            parameter = Math.max(0, Math.min(1, parameter));
            
            const closestX = controlPoint1.x + parameter*deltaX;
            const closestZ = controlPoint1.z + parameter*deltaZ;
            const distanceSquared = (pointX-closestX)*(pointX-closestX) + (pointZ-closestZ)*(pointZ-closestZ);
            const distance = Math.sqrt(distanceSquared);
            
            if (distance < minimumDistance) minimumDistance = distance;
        }
        return minimumDistance;
    }

    /**
     * @brief Calculates shortest distance from point to nearest tree
     * @param {number} pointX - X coordinate of point
     * @param {number} pointZ - Z coordinate of point
     * @param {Array<Object>} treeList - Array of already placed trees
     * @return {number} Shortest distance to another tree
     */
    function distanceToOtherTree(pointX, pointZ, treeList) {
        if (treeList.length === 0) return Infinity;
        let minimumDistance = Infinity;
        for (const treeItem of treeList) {
            const distanceSquared = (pointX-treeItem.x)*(pointX-treeItem.x) + (pointZ-treeItem.z)*(pointZ-treeItem.z);
            const distance = Math.sqrt(distanceSquared);
            if (distance < minimumDistance) minimumDistance = distance;
        }
        return minimumDistance;
    }

    // Placement attempt loop
    let attemptCount = 0;
    while (placedTrees.length < treeCount && attemptCount < treeCount * 30) {
        attemptCount++;

        // Randomly choose edge region
        let treePositionX, treePositionZ;
        const edgeSelection = Math.random();
        if (edgeSelection < 0.25) {
            treePositionX = Math.random() * 25;  // Left edge
            treePositionZ = Math.random() * terrainSize;
        } else if (edgeSelection < 0.5) {
            treePositionX = terrainSize - Math.random() * 25;  // Right edge
            treePositionZ = Math.random() * terrainSize;
        } else if (edgeSelection < 0.75) {
            treePositionX = Math.random() * terrainSize;
            treePositionZ = Math.random() * 25;  // Top edge
        } else {
            treePositionX = Math.random() * terrainSize;
            treePositionZ = terrainSize - Math.random() * 25;  // Bottom edge
        }

        // Check terrain bounds
        if (treePositionX < 1 || treePositionX > terrainSize-1 || treePositionZ < 1 || treePositionZ > terrainSize-1) continue;

        // Check river proximity
        const riverDistance = distanceToRiver(treePositionX, treePositionZ);
        if (riverDistance < 5.0) continue;

        // Check tree spacing
        const otherTreeDistance = distanceToOtherTree(treePositionX, treePositionZ, placedTrees);
        if (otherTreeDistance < 8.0) continue;

        // Check bank height
        const terrainHeightFull = getTerrainHeight(treePositionX, treePositionZ);
        const terrainHeightBase = getBaseTerrainHeight(treePositionX, treePositionZ);
        const bankHeight = terrainHeightFull - terrainHeightBase;
        if (bankHeight > 0.8) continue;

        // Check slope steepness
        const slopeValue = Math.abs(getTerrainHeight(treePositionX+1, treePositionZ) - getTerrainHeight(treePositionX-1, treePositionZ)) +
                           Math.abs(getTerrainHeight(treePositionX, treePositionZ+1) - getTerrainHeight(treePositionX, treePositionZ-1));
        if (slopeValue > 3.0) continue;

        // Place tree
        const treeTypeIndex = placedTrees.length % 3;
        const treeScale = 0.95 + Math.random() * 0.3;
        const crownColorIndex = Math.floor(Math.random() * TREE_TYPES[treeTypeIndex].crownColors.length);

        placedTrees.push({
            x: treePositionX,
            y: terrainHeightFull,
            z: treePositionZ,
            type: treeTypeIndex,
            angle: Math.random() * Math.PI * 2,
            scale: treeScale,
            colorIdx: crownColorIndex,
        });
    }
    return placedTrees;
}

/**
 * @brief Initializes GPU buffers for all tree types
 * @param {WebGLRenderingContext} gl - WebGL context
 * @return {Array<Object>} Array of buffer objects for each tree type
 */
export function initTreeBuffers(gl) {
    return TREE_TYPES.map(treeType => {
        const treeGeometry = createTree(treeType.trunkH, treeType.trunkR, treeType.crownH, treeType.crownR);

        /**
         * @brief Uploads geometry data to GPU buffer
         * @param {Float32Array} geometryData - Vertex data to upload
         * @return {WebGLBuffer} Created and populated buffer
         */
        function uploadBufferData(geometryData) {
            const buffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.bufferData(gl.ARRAY_BUFFER, geometryData, gl.STATIC_DRAW);
            return buffer;
        }

        const vertexBufferObject = uploadBufferData(treeGeometry.vertices);
        const normalBufferObject = uploadBufferData(treeGeometry.normals);
        const textureCoordBufferObject = uploadBufferData(treeGeometry.texcoords);

        return {
            vbo: vertexBufferObject,
            nbo: normalBufferObject,
            tbo: textureCoordBufferObject,
            trunkCount: treeGeometry.trunkCount,
            branchCount: treeGeometry.branchCount,
            crownCount: treeGeometry.crownCount
        };
    });
}

/**
 * @brief Renders all tree instances
 * @param {WebGLRenderingContext} gl - WebGL context
 * @param {Array<Object>} treeBuffers - Buffer objects for each tree type
 * @param {Array<Object>} treeInstances - Array of tree instances to render
 * @param {Array<number>} terrainOffsetVector - World offset for terrain [x, y, z]
 * @param {number} attributePosition - Position attribute location
 * @param {number} attributeNormal - Normal attribute location
 * @param {number} attributeTexCoord - Texture coordinate attribute location
 * @param {number} uniformModel - Model matrix uniform location
 * @param {number} uniformObjectColor - Object color uniform location
 * @param {number} uniformUseTexture - Use texture flag uniform location
 * @param {number} uniformIsWater - Is water flag uniform location
 * @param {number} uniformIsFlower - Is flower flag uniform location
 * @return {void}
 */
export function renderTrees(gl, treeBuffers, treeInstances, terrainOffsetVector, attributePosition, attributeNormal, attributeTexCoord, uniformModel, uniformObjectColor, uniformUseTexture, uniformIsWater, uniformIsFlower) {
    gl.uniform1i(uniformIsWater, 0);
    gl.uniform1i(uniformIsFlower, 0);
    gl.uniform1i(uniformUseTexture, 0);

    for (const treeInstance of treeInstances) {
        const treeBuffer = treeBuffers[treeInstance.type];
        const treeType = TREE_TYPES[treeInstance.type];
        
        const worldPositionX = treeInstance.x + terrainOffsetVector[0];
        const worldPositionY = treeInstance.y + terrainOffsetVector[1];
        const worldPositionZ = treeInstance.z + terrainOffsetVector[2];
        const treeScale = treeInstance.scale;
        const cosRotation = Math.cos(treeInstance.angle);
        const sinRotation = Math.sin(treeInstance.angle);

        // Bind vertex attributes
        gl.bindBuffer(gl.ARRAY_BUFFER, treeBuffer.vbo);
        gl.vertexAttribPointer(attributePosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(attributePosition);

        gl.bindBuffer(gl.ARRAY_BUFFER, treeBuffer.nbo);
        gl.vertexAttribPointer(attributeNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(attributeNormal);

        if (attributeTexCoord >= 0) {
            gl.bindBuffer(gl.ARRAY_BUFFER, treeBuffer.tbo);
            gl.vertexAttribPointer(attributeTexCoord, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(attributeTexCoord);
        }

        // Set model matrix with rotation and scale
        const modelMatrix = new Float32Array([
            treeScale*cosRotation, 0, treeScale*sinRotation, 0,
            0, treeScale, 0, 0,
            -treeScale*sinRotation, 0, treeScale*cosRotation, 0,
            worldPositionX, worldPositionY, worldPositionZ, 1
        ]);
        gl.uniformMatrix4fv(uniformModel, false, modelMatrix);

        // Render trunk
        gl.uniform3fv(uniformObjectColor, treeType.trunkColor);
        gl.drawArrays(gl.TRIANGLES, 0, treeBuffer.trunkCount);

        // Render branches (slightly lighter than trunk)
        const branchColor = [
            treeType.trunkColor[0] * 1.2,
            treeType.trunkColor[1] * 1.2,
            treeType.trunkColor[2] * 1.2
        ];
        gl.uniform3fv(uniformObjectColor, branchColor);
        gl.drawArrays(gl.TRIANGLES, treeBuffer.trunkCount, treeBuffer.branchCount);

        // Render foliage crown with stored color index
        const selectedCrownColor = treeType.crownColors[treeInstance.colorIdx];
        gl.uniform3fv(uniformObjectColor, selectedCrownColor);
        gl.drawArrays(gl.TRIANGLES, treeBuffer.trunkCount + treeBuffer.branchCount, treeBuffer.crownCount);
    }
}