/**
 * @brief River path control points for Catmull-Rom spline interpolation
 * @type {Array<Object>}
 * @property {number} x - X coordinate of control point
 * @property {number} z - Z coordinate of control point
 */
const controlPoints = [
    { x: 10,  z:  4  },
    { x: 20,  z: 16  },
    { x: 28,  z: 30  },
    { x: 36,  z: 44  },
    { x: 44,  z: 56  },
    { x: 56,  z: 66  },
    { x: 70,  z: 72  },
    { x: 84,  z: 76  },
    { x: 100, z: 84  },
    { x: 112, z: 96  },
];

/**
 * @brief Builds smooth river path using Catmull-Rom spline interpolation
 * @details Interpolates between control points to create smooth curve
 * @param {number} stepsPerSegment - Number of interpolation steps between control points (default 20)
 * @return {Array<Object>} Array of path points [{x, z}, ...] along the river
 */
function buildPath(stepsPerSegment = 20) {
    const pathPoints = [];
    for (let segmentIndex = 0; segmentIndex < controlPoints.length - 1; segmentIndex++) {
        const controlPoint0 = controlPoints[Math.max(0, segmentIndex - 1)];
        const controlPoint1 = controlPoints[segmentIndex];
        const controlPoint2 = controlPoints[segmentIndex + 1];
        const controlPoint3 = controlPoints[Math.min(controlPoints.length - 1, segmentIndex + 2)];

        for (let step = 0; step < stepsPerSegment; step++) {
            const parameterT = step / stepsPerSegment;
            const parameterT2 = parameterT * parameterT;
            const parameterT3 = parameterT2 * parameterT;
            
            // Catmull-Rom spline equation
            const interpolatedX = 0.5 * (
                (2*controlPoint1.x) + 
                (-controlPoint0.x+controlPoint2.x)*parameterT + 
                (2*controlPoint0.x-5*controlPoint1.x+4*controlPoint2.x-controlPoint3.x)*parameterT2 + 
                (-controlPoint0.x+3*controlPoint1.x-3*controlPoint2.x+controlPoint3.x)*parameterT3
            );
            const interpolatedZ = 0.5 * (
                (2*controlPoint1.z) + 
                (-controlPoint0.z+controlPoint2.z)*parameterT + 
                (2*controlPoint0.z-5*controlPoint1.z+4*controlPoint2.z-controlPoint3.z)*parameterT2 + 
                (-controlPoint0.z+3*controlPoint1.z-3*controlPoint2.z+controlPoint3.z)*parameterT3
            );
            pathPoints.push({ x: interpolatedX, z: interpolatedZ });
        }
    }
    pathPoints.push(controlPoints[controlPoints.length - 1]);
    return pathPoints;
}

/**
 * @brief Creates river geometry mesh with proper normals and texture coordinates
 * @details Builds a flat river surface following a curved path with width
 * @param {Function} getTerrainHeight - Function to get terrain height at (x, z)
 * @param {number} terrainSize - Size of terrain grid (default 120)
 * @return {Object} Object containing vertices, normals, texcoords, indices and path information
 */
export function createRiver(getTerrainHeight, terrainSize = 120) {
    const vertexArray  = [];
    const normalArray   = [];
    const textureCoordArray = [];
    const indexArray   = [];

    const riverPath = buildPath(20);
    const riverWidth = 5.0;

    // Build river mesh vertices
    for (let pathIndex = 0; pathIndex < riverPath.length; pathIndex++) {
        const currentPoint = riverPath[pathIndex];
        const previousPoint = riverPath[Math.max(0, pathIndex - 1)];
        const nextPoint = riverPath[Math.min(riverPath.length - 1, pathIndex + 1)];
        
        // Calculate perpendicular direction
        const directionDeltaX = nextPoint.x - previousPoint.x;
        const directionDeltaZ = nextPoint.z - previousPoint.z;
        const directionLength = Math.sqrt(directionDeltaX*directionDeltaX + directionDeltaZ*directionDeltaZ) || 1;

        const perpendicularX = -directionDeltaZ / directionLength * riverWidth * 0.5;
        const perpendicularZ =  directionDeltaX / directionLength * riverWidth * 0.5;

        const riverSurfaceY = getTerrainHeight(currentPoint.x, currentPoint.z) + 1.05;
        const textureCoordinateU = pathIndex / (riverPath.length - 1);

        // Left and right edges of river
        vertexArray.push(currentPoint.x + perpendicularX, riverSurfaceY, currentPoint.z + perpendicularZ);
        vertexArray.push(currentPoint.x - perpendicularX, riverSurfaceY, currentPoint.z - perpendicularZ);
        normalArray.push(0, 1, 0, 0, 1, 0);
        textureCoordArray.push(textureCoordinateU * 30, 0, textureCoordinateU * 30, 3);
    }

    // Build indices for river mesh
    for (let pathIndex = 0; pathIndex < riverPath.length - 1; pathIndex++) {
        const vertexIndex0 = pathIndex*2;
        const vertexIndex1 = pathIndex*2+1;
        const vertexIndex2 = pathIndex*2+2;
        const vertexIndex3 = pathIndex*2+3;
        indexArray.push(vertexIndex0, vertexIndex1, vertexIndex2);
        indexArray.push(vertexIndex1, vertexIndex3, vertexIndex2);
    }

    return {
        vertices:  new Float32Array(vertexArray),
        normals:   new Float32Array(normalArray),
        texcoords: new Float32Array(textureCoordArray),
        indices:   new Uint16Array(indexArray),
        count:     indexArray.length,
        path: riverPath,
        width: riverWidth,
    };
}

/**
 * @brief Creates pebble instances scattered around river edges
 * @details Generates clusters of pebbles positioned on terrain surface near river
 * @param {Function} getTerrainHeight - Function to get full terrain height at (x, z)
 * @param {Function} getBaseTerrainHeight - Function to get base terrain height at (x, z)
 * @param {Object} river - River object from createRiver containing path and width
 * @return {Array<Object>} Array of pebble objects with position, scale, rotation, and color
 */
export function createRiverPebbles(getTerrainHeight, getBaseTerrainHeight, river) {
    const pebbleArray = [];
    const riverPath = river.path;
    const riverWidth = river.width;

    // Generate pebbles at intervals along river path
    for (let pathIndex = 0; pathIndex < riverPath.length; pathIndex += 10) {
        const currentPoint = riverPath[pathIndex];
        const previousPoint = riverPath[Math.max(0, pathIndex - 1)];
        const nextPoint = riverPath[Math.min(riverPath.length - 1, pathIndex + 1)];
        
        const directionDeltaX = nextPoint.x - previousPoint.x;
        const directionDeltaZ = nextPoint.z - previousPoint.z;
        const directionLength = Math.sqrt(directionDeltaX*directionDeltaX + directionDeltaZ*directionDeltaZ) || 1;

        const perpendicularUnitX = -directionDeltaZ / directionLength;
        const perpendicularUnitZ =  directionDeltaX / directionLength;

        // Place pebbles on both sides of river
        for (let sideDirection = -1; sideDirection <= 1; sideDirection += 2) {
            const clusterJitterAmount = Math.sin(pathIndex * 2.3) * 0.3;
            const clusterOffsetFromEdge = riverWidth * 0.5 + 0.3 + clusterJitterAmount;

            const clusterCenterX = currentPoint.x + perpendicularUnitX * sideDirection * clusterOffsetFromEdge;
            const clusterCenterZ = currentPoint.z + perpendicularUnitZ * sideDirection * clusterOffsetFromEdge;

            const clusterPebbleCount = 2 + Math.floor(Math.abs(Math.sin(pathIndex * 1.7 + sideDirection)) * 2);

            for (let pebbleIndexInCluster = 0; pebbleIndexInCluster < clusterPebbleCount; pebbleIndexInCluster++) {
                const spreadRadius = 0.3;
                const pebblePositionX = clusterCenterX + Math.sin(pebbleIndexInCluster * 2.1 + pathIndex * 0.7) * spreadRadius;
                const pebblePositionZ = clusterCenterZ + Math.cos(pebbleIndexInCluster * 1.9 + pathIndex * 0.5) * spreadRadius;

                // Sample terrain height at multiple points for better placement
                const heightSample0 = getTerrainHeight(pebblePositionX, pebblePositionZ);
                const heightSample1 = getTerrainHeight(pebblePositionX + 0.2, pebblePositionZ);
                const heightSample2 = getTerrainHeight(pebblePositionX - 0.2, pebblePositionZ);
                const heightSample3 = getTerrainHeight(pebblePositionX, pebblePositionZ + 0.2);
                const heightSample4 = getTerrainHeight(pebblePositionX, pebblePositionZ - 0.2);
                const pebbleY = Math.min(heightSample0, heightSample1, heightSample2, heightSample3, heightSample4) + 0.05;

                const basePebbleSize = 0.15 + Math.abs(Math.sin(pathIndex * 1.3 + pebbleIndexInCluster * 3.7)) * 0.4;

                pebbleArray.push({
                    x: pebblePositionX,
                    y: pebbleY,
                    z: pebblePositionZ,
                    scaleX: basePebbleSize * (0.7 + Math.abs(Math.sin(pathIndex + pebbleIndexInCluster * 2.3)) * 0.6),
                    scaleY: basePebbleSize * 0.55,
                    scaleZ: basePebbleSize * (0.7 + Math.abs(Math.cos(pathIndex + pebbleIndexInCluster * 1.7)) * 0.6),
                    angle: Math.sin(pathIndex * 1.1 + pebbleIndexInCluster) * Math.PI,
                    seed: pathIndex * 100 + pebbleIndexInCluster + (sideDirection > 0 ? 5000 : 0),
                    isBrownColor: Math.sin(pathIndex * 1.1 + pebbleIndexInCluster) > 0,
                    shapeType: Math.floor(Math.abs(Math.sin(pathIndex * 2.7 + pebbleIndexInCluster * 4.1)) * 2)
                });
            }
        }
    }
    return pebbleArray;
}

/**
 * @brief Initializes GPU buffers for pebble geometry (two shape types)
 * @details Creates ellipsoid geometry with different vertical compression for variety
 * @param {WebGLRenderingContext} gl - WebGL context
 * @return {Array<Object>} Array of buffer objects for each pebble shape type
 */
export function initPebbleBuffers(gl) {
    const pebbleShapeTypes = [0.6, 0.85].map(verticalCompressionFactor => {
        const vertexArray = [];
        const normalArray = [];
        const textureCoordArray = [];
        
        const latitudeSegments = 8;
        const longitudeSegments = 12;
        
        // Generate ellipsoid mesh
        for (let latitudeIndex = 0; latitudeIndex < latitudeSegments; latitudeIndex++) {
            const latitudeAngle1 = (latitudeIndex / latitudeSegments) * Math.PI;
            const latitudeAngle2 = ((latitudeIndex + 1) / latitudeSegments) * Math.PI;
            
            for (let longitudeIndex = 0; longitudeIndex < longitudeSegments; longitudeIndex++) {
                const longitudeAngle1 = (longitudeIndex / longitudeSegments) * Math.PI * 2;
                const longitudeAngle2 = ((longitudeIndex + 1) / longitudeSegments) * Math.PI * 2;
                
                // Four corner vertices of this mesh quad
                const meshVertex0 = [
                    Math.sin(latitudeAngle1)*Math.cos(longitudeAngle1),
                    Math.cos(latitudeAngle1)*verticalCompressionFactor,
                    Math.sin(latitudeAngle1)*Math.sin(longitudeAngle1)
                ];
                const meshVertex1 = [
                    Math.sin(latitudeAngle1)*Math.cos(longitudeAngle2),
                    Math.cos(latitudeAngle1)*verticalCompressionFactor,
                    Math.sin(latitudeAngle1)*Math.sin(longitudeAngle2)
                ];
                const meshVertex2 = [
                    Math.sin(latitudeAngle2)*Math.cos(longitudeAngle1),
                    Math.cos(latitudeAngle2)*verticalCompressionFactor,
                    Math.sin(latitudeAngle2)*Math.sin(longitudeAngle1)
                ];
                const meshVertex3 = [
                    Math.sin(latitudeAngle2)*Math.cos(longitudeAngle2),
                    Math.cos(latitudeAngle2)*verticalCompressionFactor,
                    Math.sin(latitudeAngle2)*Math.sin(longitudeAngle2)
                ];
                
                // Create two triangles from quad vertices
                const triangleIndices = [[0,2,1], [1,2,3]];
                triangleIndices.forEach(triangle => {
                    triangle.forEach(vertexIndexInQuad => {
                        const vertexToAdd = [meshVertex0, meshVertex1, meshVertex2, meshVertex3][vertexIndexInQuad];
                        vertexArray.push(...vertexToAdd);
                        normalArray.push(...vertexToAdd);  
                        textureCoordArray.push(0, 0);
                    });
                });
            }
        }
        
        // Upload to GPU
        const vertexBufferObject = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferObject);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexArray), gl.STATIC_DRAW);
        
        const normalBufferObject = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBufferObject);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normalArray), gl.STATIC_DRAW);
        
        const textureCoordBufferObject = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBufferObject);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordArray), gl.STATIC_DRAW);
        
        return {
            vbo: vertexBufferObject,
            nbo: normalBufferObject,
            tbo: textureCoordBufferObject,
            count: vertexArray.length / 3
        };
    });
    return pebbleShapeTypes;
}

/**
 * @brief Initializes GPU buffers for river geometry
 * @param {WebGLRenderingContext} gl - WebGL context
 * @param {Object} river - River object from createRiver
 * @return {Object} Buffer object containing VBO, NBO, TBO, and IBO
 */
export function initRiverBuffers(gl, river) {
    const vertexBufferObject = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferObject);
    gl.bufferData(gl.ARRAY_BUFFER, river.vertices, gl.STATIC_DRAW);

    const normalBufferObject = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBufferObject);
    gl.bufferData(gl.ARRAY_BUFFER, river.normals, gl.STATIC_DRAW);

    const textureCoordBufferObject = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBufferObject);
    gl.bufferData(gl.ARRAY_BUFFER, river.texcoords, gl.STATIC_DRAW);

    const indexBufferObject = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBufferObject);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, river.indices, gl.STATIC_DRAW);

    return {
        vbo: vertexBufferObject,
        nbo: normalBufferObject,
        tbo: textureCoordBufferObject,
        ibo: indexBufferObject
    };
}

/**
 * @brief Renders the river with animated water texture
 * @details Uses water texture with animated UV coordinates for flowing effect
 * @param {WebGLRenderingContext} gl - WebGL context
 * @param {Object} riverBuffers - Buffer object from initRiverBuffers
 * @param {Object} river - River object from createRiver
 * @param {Array<number>} terrainOffsetVector - World offset for terrain [x, y, z]
 * @param {number} animationTime - Current animation time in seconds
 * @param {number} attributePosition - Position attribute location
 * @param {number} attributeNormal - Normal attribute location
 * @param {number} attributeTexCoord - Texture coordinate attribute location
 * @param {number} uniformModel - Model matrix uniform location
 * @param {number} uniformObjectColor - Object color uniform location
 * @param {number} uniformUseTexture - Use texture flag uniform location
 * @param {number} uniformIsWater - Is water flag uniform location (enables shader effects)
 * @param {number} uniformTime - Time uniform location
 * @param {WebGLTexture} waterTexture - Water texture
 * @param {number} uniformTexture - Texture unit uniform location
 * @return {void}
 */

export function renderRiver(gl, riverBuffers, river, terrainOffsetVector, animationTime, attributePosition, attributeNormal, attributeTexCoord, uniformModel, uniformObjectColor, uniformUseTexture, uniformIsWater, uniformTime, waterTexture, uniformTexture, uIsWater) {
    gl.uniform1i(uIsWater, 1);
    gl.uniform1i(uniformIsWater, 0);
    gl.uniform1f(uniformTime, animationTime);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, waterTexture);
    gl.uniform1i(uniformTexture, 0);
    gl.uniform1i(uniformUseTexture, 0);
    gl.uniform1i(uniformIsWater, 1);

    gl.bindBuffer(gl.ARRAY_BUFFER, riverBuffers.vbo);
    gl.vertexAttribPointer(attributePosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(attributePosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, riverBuffers.nbo);
    gl.vertexAttribPointer(attributeNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(attributeNormal);

    if (attributeTexCoord >= 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, riverBuffers.tbo);
        gl.vertexAttribPointer(attributeTexCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(attributeTexCoord);
    }

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, riverBuffers.ibo);

    const modelMatrix = new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        terrainOffsetVector[0], terrainOffsetVector[1], terrainOffsetVector[2], 1
    ]);
    gl.uniformMatrix4fv(uniformModel, false, modelMatrix);
    gl.drawElements(gl.TRIANGLES, river.count, gl.UNSIGNED_SHORT, 0);

    gl.uniform1i(uniformIsWater, 0);
    gl.uniform1i(uIsWater, 0);
}

/**
 * @brief Renders all pebbles scattered along river banks
 * @details Each pebble is rendered with individual position, scale, rotation, and color
 * @param {WebGLRenderingContext} gl - WebGL context
 * @param {Array<Object>} pebbleBuffers - Buffer objects for pebble shapes from initPebbleBuffers
 * @param {Array<Object>} pebbleInstances - Array of pebble objects from createRiverPebbles
 * @param {Array<number>} terrainOffsetVector - World offset for terrain [x, y, z]
 * @param {number} attributePosition - Position attribute location
 * @param {number} attributeNormal - Normal attribute location
 * @param {number} attributeTexCoord - Texture coordinate attribute location
 * @param {number} uniformModel - Model matrix uniform location
 * @param {number} uniformObjectColor - Object color uniform location
 * @param {number} uniformUseTexture - Use texture flag uniform location
 * @param {number} uniformIsWater - Is water flag uniform location
 * @return {void}
 */
export function renderPebbles(gl, pebbleBuffers, pebbleInstances, terrainOffsetVector,
                               attributePosition, attributeNormal, attributeTexCoord,
                               uniformModel, uniformObjectColor, uniformUseTexture, uniformIsWater) {
    gl.uniform1i(uniformIsWater, 0);
    gl.uniform1i(uniformUseTexture, 0);

    for (const pebbleInstance of pebbleInstances) {
        const pebbleShapeBuffer = pebbleBuffers[pebbleInstance.shapeType ?? 0];
        if (!pebbleShapeBuffer) continue;

        // Bind vertex attributes
        gl.bindBuffer(gl.ARRAY_BUFFER, pebbleShapeBuffer.vbo);
        gl.vertexAttribPointer(attributePosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(attributePosition);

        gl.bindBuffer(gl.ARRAY_BUFFER, pebbleShapeBuffer.nbo);
        gl.vertexAttribPointer(attributeNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(attributeNormal);

        if (attributeTexCoord >= 0) {
            gl.bindBuffer(gl.ARRAY_BUFFER, pebbleShapeBuffer.tbo);
            gl.vertexAttribPointer(attributeTexCoord, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(attributeTexCoord);
        }

        // Calculate world position
        const worldPositionX = pebbleInstance.x + terrainOffsetVector[0];
        const worldPositionY = pebbleInstance.y + terrainOffsetVector[1];
        const worldPositionZ = pebbleInstance.z + terrainOffsetVector[2];

        // Calculate color with variation
        const grayscaleValue = 0.45 + (pebbleInstance.seed % 9) * 0.03;
        const pebbleColor = pebbleInstance.isBrownColor
            ? [0.55 + grayscaleValue * 0.2, 0.38 + grayscaleValue * 0.1, 0.22]
            : [grayscaleValue, grayscaleValue - 0.02, grayscaleValue - 0.04];
        gl.uniform3fv(uniformObjectColor, pebbleColor);

        // Build model matrix with rotation and scale
        const cosRotation = Math.cos(pebbleInstance.angle);
        const sinRotation = Math.sin(pebbleInstance.angle);

        const modelMatrix = new Float32Array([
            pebbleInstance.scaleX*cosRotation,  0, pebbleInstance.scaleX*sinRotation, 0,
            0, pebbleInstance.scaleY, 0, 0,
            -pebbleInstance.scaleZ*sinRotation, 0, pebbleInstance.scaleZ*cosRotation, 0,
            worldPositionX, worldPositionY, worldPositionZ, 1
        ]);
        gl.uniformMatrix4fv(uniformModel, false, modelMatrix);
        gl.drawArrays(gl.TRIANGLES, 0, pebbleShapeBuffer.count);
    }
}