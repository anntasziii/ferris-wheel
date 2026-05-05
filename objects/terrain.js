/**
 * @brief River control points used for terrain generation
 * @type {Array<Object>}
 * @property {number} x - X coordinate of river control point
 * @property {number} z - Z coordinate of river control point
 */
const RIVER_POINTS = [
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
 * @brief Calculates shortest distance from point to river path
 * @details Uses closest point on line segment algorithm to find distance to river
 * @param {number} pointX - X coordinate of point
 * @param {number} pointZ - Z coordinate of point
 * @return {number} Shortest distance to river path
 */
function distanceToRiver(pointX, pointZ) {
    let minimumDistance = Infinity;
    for (let segmentIndex = 0; segmentIndex < RIVER_POINTS.length - 1; segmentIndex++) {
        const segmentPointA = RIVER_POINTS[segmentIndex];
        const segmentPointB = RIVER_POINTS[segmentIndex + 1];
        
        const deltaX = segmentPointB.x - segmentPointA.x;
        const deltaZ = segmentPointB.z - segmentPointA.z;
        const segmentLengthSquared = deltaX*deltaX + deltaZ*deltaZ;
        
        let parameter = ((pointX - segmentPointA.x)*deltaX + (pointZ - segmentPointA.z)*deltaZ) / segmentLengthSquared;
        parameter = Math.max(0, Math.min(1, parameter));
        
        const closestPointX = segmentPointA.x + parameter*deltaX;
        const closestPointZ = segmentPointA.z + parameter*deltaZ;
        const distance = Math.sqrt((pointX-closestPointX)*(pointX-closestPointX) + (pointZ-closestPointZ)*(pointZ-closestPointZ));
        
        if (distance < minimumDistance) minimumDistance = distance;
    }
    return minimumDistance;
}

/**
 * @brief Creates procedural terrain mesh with noise and river banks
 * @details Generates terrain using Perlin-like noise with edge hills and river bank elevation.
 * @param {number} gridSize - Size of terrain grid (default 120)
 * @param {number} gridStep - Vertex spacing in grid (default 1)
 * @return {Object} Object containing vertices, normals, indices, texcoords arrays, vertex count, and height query functions
 */
export function createTerrain(gridSize = 120, gridStep = 1) {
    const vertexArray = [];
    const normalArray = [];
    const indexArray = [];
    const textureCoordArray = [];

    const riverWidth = 3.0;
    const bankTransitionWidth = 3.5;
    const bankElevationHeight = 1.5;

    /**
     * @brief Base terrain noise without river modifications
     * @details Combines multiple sine/cosine waves at different frequencies for natural terrain
     * @param {number} noiseX - X coordinate for noise sampling
     * @param {number} noiseZ - Z coordinate for noise sampling
     * @return {number} Height value from base noise
     */
    function baseTerrainNoise(noiseX, noiseZ) {
        const scaledX = noiseX * 0.08;
        const scaledZ = noiseZ * 0.08;
        
        // Multiple octaves of noise
        const mountainFeature = Math.sin(scaledX * 0.5) * Math.cos(scaledZ * 0.5) * 1.0;
        const hillFeature = Math.sin(scaledX * 1.2 + scaledZ * 0.8) * 0.8;
        const detailFeature = Math.sin(scaledX * 3.0) * Math.cos(scaledZ * 3.0) * 0.3;
        const bumpFeature = Math.cos(scaledX * 2.3) * Math.sin(scaledZ * 2.7) * 0.4;
        const baseHeight = mountainFeature + hillFeature + detailFeature + bumpFeature;
        
        // Edge boost to gradually raise terrain towards edges
        const centerZ = gridSize / 2;
        const distanceFromCenterZ = Math.abs(noiseZ - centerZ) / centerZ;
        const edgeBoostFactor = distanceFromCenterZ * distanceFromCenterZ * 3.0;

        // Edge hills - raised terrain at map edges
        const distanceFromCenterX = Math.abs(noiseX - gridSize / 2) / (gridSize / 2);
        const distanceFromCenterZEdge = Math.abs(noiseZ - gridSize / 2) / (gridSize / 2);
        const maximumDistance = Math.max(distanceFromCenterX, distanceFromCenterZEdge);

        let edgeHillHeight = 0;
        if (maximumDistance > 0.5) {
            const edgeIntensity = (maximumDistance - 0.5) / 0.5;
            // Smooth interpolation using Hermite curve
            const smoothEdgeIntensity = edgeIntensity * edgeIntensity * (3.0 - 2.0 * edgeIntensity);
            edgeHillHeight = Math.pow(smoothEdgeIntensity, 0.7) * 9.5;
        }

        return baseHeight + edgeBoostFactor + edgeHillHeight;
    }

    /**
     * @brief Complete terrain noise including river bank modifications
     * @param {number} noiseX - X coordinate for noise sampling
     * @param {number} noiseZ - Z coordinate for noise sampling
     * @return {number} Height value with river bank elevation applied
     */
    function terrainNoise(noiseX, noiseZ) {
        const baseHeight = baseTerrainNoise(noiseX, noiseZ);
        const distanceToRiverValue = distanceToRiver(noiseX, noiseZ);
        
        const riverEdgeDistance = riverWidth * 0.5;
        let bankElevationBoost = 0.0;
        
        // Add river bank elevation within transition zone
        if (distanceToRiverValue > riverEdgeDistance && distanceToRiverValue < riverEdgeDistance + bankTransitionWidth) {
            const transitionParameter = (distanceToRiverValue - riverEdgeDistance) / bankTransitionWidth;
            // Smooth Hermite interpolation
            const smoothTransition = transitionParameter * transitionParameter * (3.0 - 2.0 * transitionParameter);
            // Sinusoidal elevation peak at mid-transition
            bankElevationBoost = Math.sin(transitionParameter * Math.PI) * bankElevationHeight;
        }
        
        return baseHeight + bankElevationBoost;
    }

    const verticesPerRow = gridSize / gridStep + 1;

    // BUILD VERTICES
    for (let gridZ = 0; gridZ <= gridSize; gridZ += gridStep) {
        for (let gridX = 0; gridX <= gridSize; gridX += gridStep) {
            const heightY = terrainNoise(gridX, gridZ);
            vertexArray.push(gridX, heightY, gridZ);
            
            // Placeholder normal - will be recalculated after all vertices
            normalArray.push(0, 1, 0);
            
            // Texture coordinates for grass tiling
            textureCoordArray.push(gridX / 8, gridZ / 8);
        }
    }

    // BUILD INDICES
    for (let gridZ = 0; gridZ < gridSize; gridZ += gridStep) {
        for (let gridX = 0; gridX < gridSize; gridX += gridStep) {
            const vertexIndex0 = (gridZ / gridStep) * verticesPerRow + (gridX / gridStep);
            const vertexIndex1 = vertexIndex0 + 1;
            const vertexIndex2 = vertexIndex0 + verticesPerRow;
            const vertexIndex3 = vertexIndex2 + 1;
            
            // Two triangles per grid quad
            indexArray.push(vertexIndex0, vertexIndex2, vertexIndex1);
            indexArray.push(vertexIndex1, vertexIndex2, vertexIndex3);
        }
    }

    // ── CALCULATE NORMALS ─────────────────────────────────────────────────────
    // Use finite differences to calculate per-vertex normals
    for (let gridZ = 0; gridZ <= gridSize; gridZ += gridStep) {
        for (let gridX = 0; gridX <= gridSize; gridX += gridStep) {
            const heightLeft = terrainNoise(gridX - gridStep, gridZ);
            const heightRight = terrainNoise(gridX + gridStep, gridZ);
            const heightDown = terrainNoise(gridX, gridZ - gridStep);
            const heightUp = terrainNoise(gridX, gridZ + gridStep);
            
            // Tangent vectors via finite differences
            let normalX = heightLeft - heightRight;
            let normalY = 2.0 * gridStep;
            let normalZ = heightDown - heightUp;
            
            // Normalize
            const normalLength = Math.sqrt(normalX*normalX + normalY*normalY + normalZ*normalZ);
            const vertexIndex = (Math.round(gridZ / gridStep) * verticesPerRow + Math.round(gridX / gridStep)) * 3;
            normalArray[vertexIndex]   = normalX / normalLength;
            normalArray[vertexIndex+1] = normalY / normalLength;
            normalArray[vertexIndex+2] = normalZ / normalLength;
        }
    }

    return {
        vertices:  new Float32Array(vertexArray),
        normals:   new Float32Array(normalArray),
        indices:   new Uint16Array(indexArray),
        texcoords: new Float32Array(textureCoordArray),
        count:     indexArray.length,
        getHeight: terrainNoise,
        getBaseHeight: baseTerrainNoise
    };
}