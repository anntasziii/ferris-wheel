/**
 * @brief Radius of the ferris wheel main ring
 * @type {number}
 */
const WHEEL_RADIUS = 16.0;

/**
 * @brief Number of cabins on the ferris wheel
 * @type {number}
 */
const CABIN_COUNT  = 16;

/**
 * @brief Number of spokes connecting center to rim
 * @type {number}
 */
const SPOKE_COUNT  = 16;

/**
 * @brief Creates torus (donut) geometry for ferris wheel rim
 * @details Generates a torus using parametric surface with major radius and tube radius
 * @param {number} majorRadius - Distance from center to torus center
 * @param {number} tubeRadius - Radius of the tube cross-section
 * @param {number} majorSegments - Number of segments around major circle (default 32)
 * @param {number} tubeSegments - Number of segments around tube (default 8)
 * @return {Object} Object containing vertices, normals, texcoords, indices arrays and count
 */
function createRim(majorRadius, tubeRadius, majorSegments = 32, tubeSegments = 8) {
    const vertexArray = [], normalArray = [], textureCoordArray = [], indexArray = [];

    for (let majorIndex = 0; majorIndex <= majorSegments; majorIndex++) {
        const majorAngle = (majorIndex / majorSegments) * Math.PI * 2;
        const cosMajorAngle = Math.cos(majorAngle);
        const sinMajorAngle = Math.sin(majorAngle);

        for (let tubeIndex = 0; tubeIndex <= tubeSegments; tubeIndex++) {
            const tubeAngle = (tubeIndex / tubeSegments) * Math.PI * 2;
            const cosTubeAngle = Math.cos(tubeAngle);
            const sinTubeAngle = Math.sin(tubeAngle);

            const positionX = (majorRadius + tubeRadius * cosTubeAngle) * cosMajorAngle;
            const positionY = (majorRadius + tubeRadius * cosTubeAngle) * sinMajorAngle;
            const positionZ = tubeRadius * sinTubeAngle;

            vertexArray.push(positionX, positionY, positionZ);

            const normalX = cosTubeAngle * cosMajorAngle;
            const normalY = cosTubeAngle * sinMajorAngle;
            const normalZ = sinTubeAngle;
            normalArray.push(normalX, normalY, normalZ);
            
            textureCoordArray.push(majorIndex / majorSegments, tubeIndex / tubeSegments);
        }
    }

    for (let majorIndex = 0; majorIndex < majorSegments; majorIndex++) {
        for (let tubeIndex = 0; tubeIndex < tubeSegments; tubeIndex++) {
            const indexA = majorIndex * (tubeSegments + 1) + tubeIndex;
            const indexB = indexA + tubeSegments + 1;
            indexArray.push(indexA, indexB, indexA + 1);
            indexArray.push(indexB, indexB + 1, indexA + 1);
        }
    }

    return {
        vertices: new Float32Array(vertexArray),
        normals: new Float32Array(normalArray),
        texcoords: new Float32Array(textureCoordArray),
        indices: new Uint16Array(indexArray),
        count: indexArray.length
    };
}

/**
 * @brief Creates cylinder geometry for spokes and axles
 * @param {number} topRadius - Radius at top of cylinder
 * @param {number} bottomRadius - Radius at bottom of cylinder
 * @param {number} height - Height of cylinder
 * @param {number} segments - Number of segments around circumference (default 8)
 * @return {Object} Object containing vertices, normals, texcoords arrays and count
 */
function createCylinder(topRadius, bottomRadius, height, segments = 8) {
    const vertexArray = [], normalArray = [], textureCoordArray = [];

    for (let segmentIndex = 0; segmentIndex < segments; segmentIndex++) {
        const angle1 = (segmentIndex / segments) * Math.PI * 2;
        const angle2 = ((segmentIndex + 1) / segments) * Math.PI * 2;

        const cosAngle1 = Math.cos(angle1);
        const sinAngle1 = Math.sin(angle1);
        const cosAngle2 = Math.cos(angle2);
        const sinAngle2 = Math.sin(angle2);

        const vertexX1Top = cosAngle1 * topRadius;
        const vertexZ1Top = sinAngle1 * topRadius;
        const vertexX2Top = cosAngle2 * topRadius;
        const vertexZ2Top = sinAngle2 * topRadius;
        const vertexX1Bottom = cosAngle1 * bottomRadius;
        const vertexZ1Bottom = sinAngle1 * bottomRadius;
        const vertexX2Bottom = cosAngle2 * bottomRadius;
        const vertexZ2Bottom = sinAngle2 * bottomRadius;

        const normalX1 = cosAngle1;
        const normalZ1 = sinAngle1;
        const normalX2 = cosAngle2;
        const normalZ2 = sinAngle2;

        // Side wall
        vertexArray.push(
            vertexX1Top, height/2, vertexZ1Top,
            vertexX1Bottom, -height/2, vertexZ1Bottom,
            vertexX2Top, height/2, vertexZ2Top
        );
        vertexArray.push(
            vertexX2Top, height/2, vertexZ2Top,
            vertexX1Bottom, -height/2, vertexZ1Bottom,
            vertexX2Bottom, -height/2, vertexZ2Bottom
        );
        normalArray.push(
            normalX1, 0, normalZ1,
            normalX1, 0, normalZ1,
            normalX2, 0, normalZ2,
            normalX2, 0, normalZ2,
            normalX1, 0, normalZ1,
            normalX2, 0, normalZ2
        );
        for (let j = 0; j < 6; j++) textureCoordArray.push(0, 0);

        // Top and bottom caps
        vertexArray.push(
            0, height/2, 0,
            vertexX1Top, height/2, vertexZ1Top,
            vertexX2Top, height/2, vertexZ2Top
        );
        vertexArray.push(
            0, -height/2, 0,
            vertexX2Bottom, -height/2, vertexZ2Bottom,
            vertexX1Bottom, -height/2, vertexZ1Bottom
        );
        normalArray.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0);
        for (let j = 0; j < 6; j++) textureCoordArray.push(0, 0);
    }

    return {
        vertices: new Float32Array(vertexArray),
        normals: new Float32Array(normalArray),
        texcoords: new Float32Array(textureCoordArray),
        count: vertexArray.length / 3
    };
}

/**
 * @brief Creates ferris wheel cabin geometry with body and glass windows
 * @details Constructs a cabin with trapezoid-shaped sides, bottom, top, and glass panels
 * @return {Object} Object with body and glass mesh data
 */
function createCabin() {
    const bodyVertexArray = [], bodyNormalArray = [], bodyTexCoordArray = [];
    const glassVertexArray = [], glassNormalArray = [], glassTexCoordArray = [];

    const cabinWidthMid = 3.2;
    const cabinWidthBottom = 4.0;
    const cabinWidthTop = 4.0;
    const cabinHeightMid = 2.2;
    const cabinHeightBottom = 0.7;
    const cabinHeightTop = 0.4;
    const cabinDepth = 1.6;
    const windowThickness = 0.12;

    /**
     * @brief Adds a quadrilateral to cabin geometry
     * @param {Array} vertices - Vertex array to append to
     * @param {Array} normals - Normal array to append to
     * @param {Array} texCoords - Texture coordinate array to append to
     * @param {Array<number>} vertex0 - First vertex [x, y, z]
     * @param {Array<number>} vertex1 - Second vertex [x, y, z]
     * @param {Array<number>} vertex2 - Third vertex [x, y, z]
     * @param {Array<number>} vertex3 - Fourth vertex [x, y, z]
     * @param {number} normalX - Normal vector X component
     * @param {number} normalY - Normal vector Y component
     * @param {number} normalZ - Normal vector Z component
     * @return {void}
     */
    function addQuadrilateral(vertices, normals, texCoords, vertex0, vertex1, vertex2, vertex3, normalX, normalY, normalZ) {
        vertices.push(...vertex0, ...vertex1, ...vertex2, ...vertex0, ...vertex2, ...vertex3);
        for (let i = 0; i < 6; i++) normals.push(normalX, normalY, normalZ);
        texCoords.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1);
    }

    const halfDepth = cabinDepth/2;

    const bottomY = -(cabinHeightBottom + cabinHeightMid/2);
    const midY1 = -cabinHeightMid/2;
    const midY2 = cabinHeightMid/2;
    const topY = cabinHeightMid/2 + cabinHeightTop;

    const bottomX = cabinWidthBottom/2;
    const midX = cabinWidthMid/2;
    const topX = cabinWidthTop/2;

    // Front face
    addQuadrilateral(bodyVertexArray, bodyNormalArray, bodyTexCoordArray,
        [-bottomX, bottomY, -halfDepth], [bottomX, bottomY, -halfDepth], [midX, midY1, -halfDepth], [-midX, midY1, -halfDepth], 0, 0, -1);
    addQuadrilateral(bodyVertexArray, bodyNormalArray, bodyTexCoordArray,
        [-midX, midY1, -halfDepth], [midX, midY1, -halfDepth], [midX, midY2, -halfDepth], [-midX, midY2, -halfDepth], 0, 0, -1);
    addQuadrilateral(bodyVertexArray, bodyNormalArray, bodyTexCoordArray,
        [-midX, midY2, -halfDepth], [midX, midY2, -halfDepth], [topX, topY, -halfDepth], [-topX, topY, -halfDepth], 0, 0, -1);

    // Left side face
    addQuadrilateral(bodyVertexArray, bodyNormalArray, bodyTexCoordArray,
        [-bottomX, bottomY, -halfDepth], [-midX, midY1, -halfDepth], [-midX, midY1, halfDepth], [-bottomX, bottomY, halfDepth], -1, 0, 0);
    addQuadrilateral(bodyVertexArray, bodyNormalArray, bodyTexCoordArray,
        [-midX, midY1, -halfDepth], [-midX, midY2, -halfDepth], [-midX, midY2, halfDepth], [-midX, midY1, halfDepth], -1, 0, 0);
    addQuadrilateral(bodyVertexArray, bodyNormalArray, bodyTexCoordArray,
        [-midX, midY2, -halfDepth], [-topX, topY, -halfDepth], [-topX, topY, halfDepth], [-midX, midY2, halfDepth], -1, 0, 0);

    // Right side face
    addQuadrilateral(bodyVertexArray, bodyNormalArray, bodyTexCoordArray,
        [bottomX, bottomY, -halfDepth], [bottomX, bottomY, halfDepth], [midX, midY1, halfDepth], [midX, midY1, -halfDepth], 1, 0, 0);
    addQuadrilateral(bodyVertexArray, bodyNormalArray, bodyTexCoordArray,
        [midX, midY1, -halfDepth], [midX, midY1, halfDepth], [midX, midY2, halfDepth], [midX, midY2, -halfDepth], 1, 0, 0);
    addQuadrilateral(bodyVertexArray, bodyNormalArray, bodyTexCoordArray,
        [midX, midY2, -halfDepth], [midX, midY2, halfDepth], [topX, topY, halfDepth], [topX, topY, -halfDepth], 1, 0, 0);

    // Bottom face
    addQuadrilateral(bodyVertexArray, bodyNormalArray, bodyTexCoordArray,
        [-bottomX, bottomY, -halfDepth], [-bottomX, bottomY, halfDepth], [bottomX, bottomY, halfDepth], [bottomX, bottomY, -halfDepth], 0, -1, 0);

    // Top face
    addQuadrilateral(bodyVertexArray, bodyNormalArray, bodyTexCoordArray,
        [-topX, topY, -halfDepth], [topX, topY, -halfDepth], [topX, topY, halfDepth], [-topX, topY, halfDepth], 0, 1, 0);

    // Back panels
    addQuadrilateral(bodyVertexArray, bodyNormalArray, bodyTexCoordArray,
        [-bottomX, bottomY, halfDepth], [bottomX, bottomY, halfDepth], [midX, midY1, halfDepth], [-midX, midY1, halfDepth], 0, 0, 1);
    addQuadrilateral(bodyVertexArray, bodyNormalArray, bodyTexCoordArray,
        [-midX, midY2, halfDepth], [midX, midY2, halfDepth], [topX, topY, halfDepth], [-topX, topY, halfDepth], 0, 0, 1);

    // Window frame dividers on back
    addQuadrilateral(bodyVertexArray, bodyNormalArray, bodyTexCoordArray,
        [-midX, midY2-windowThickness, halfDepth], [midX, midY2-windowThickness, halfDepth], [midX, midY2, halfDepth], [-midX, midY2, halfDepth], 0, 0, 1);
    addQuadrilateral(bodyVertexArray, bodyNormalArray, bodyTexCoordArray,
        [-midX, midY1, halfDepth], [midX, midY1, halfDepth], [midX, midY1+windowThickness, halfDepth], [-midX, midY1+windowThickness, halfDepth], 0, 0, 1);
    addQuadrilateral(bodyVertexArray, bodyNormalArray, bodyTexCoordArray,
        [-midX, midY1+windowThickness, halfDepth], [-midX+windowThickness, midY1+windowThickness, halfDepth], [-midX+windowThickness, midY2-windowThickness, halfDepth], [-midX, midY2-windowThickness, halfDepth], 0, 0, 1);
    addQuadrilateral(bodyVertexArray, bodyNormalArray, bodyTexCoordArray,
        [midX-windowThickness, midY1+windowThickness, halfDepth], [midX, midY1+windowThickness, halfDepth], [midX, midY2-windowThickness, halfDepth], [midX-windowThickness, midY2-windowThickness, halfDepth], 0, 0, 1);
    addQuadrilateral(bodyVertexArray, bodyNormalArray, bodyTexCoordArray,
        [-windowThickness*0.5, midY1+windowThickness, halfDepth], [windowThickness*0.5, midY1+windowThickness, halfDepth], [windowThickness*0.5, midY2-windowThickness, halfDepth], [-windowThickness*0.5, midY2-windowThickness, halfDepth], 0, 0, 1);

    // Glass panes
    const glassX1 = -midX+windowThickness;
    const glassX2 = -windowThickness*0.5;
    const glassX3 = windowThickness*0.5;
    const glassX4 = midX-windowThickness;
    const glassY1 = midY1+windowThickness;
    const glassY2 = midY2-windowThickness;

    addQuadrilateral(glassVertexArray, glassNormalArray, glassTexCoordArray,
        [glassX1, glassY1, halfDepth], [glassX2, glassY1, halfDepth], [glassX2, glassY2, halfDepth], [glassX1, glassY2, halfDepth], 0, 0, 1);
    addQuadrilateral(glassVertexArray, glassNormalArray, glassTexCoordArray,
        [glassX1, glassY2, halfDepth], [glassX2, glassY2, halfDepth], [glassX2, glassY1, halfDepth], [glassX1, glassY1, halfDepth], 0, 0, -1);

    addQuadrilateral(glassVertexArray, glassNormalArray, glassTexCoordArray,
        [glassX3, glassY1, halfDepth], [glassX4, glassY1, halfDepth], [glassX4, glassY2, halfDepth], [glassX3, glassY2, halfDepth], 0, 0, 1);
    addQuadrilateral(glassVertexArray, glassNormalArray, glassTexCoordArray,
        [glassX3, glassY2, halfDepth], [glassX4, glassY2, halfDepth], [glassX4, glassY1, halfDepth], [glassX3, glassY1, halfDepth], 0, 0, -1);

    return {
        body: {
            vertices: new Float32Array(bodyVertexArray),
            normals: new Float32Array(bodyNormalArray),
            texcoords: new Float32Array(bodyTexCoordArray),
            count: bodyVertexArray.length / 3
        },
        glass: {
            vertices: new Float32Array(glassVertexArray),
            normals: new Float32Array(glassNormalArray),
            texcoords: new Float32Array(glassTexCoordArray),
            count: glassVertexArray.length / 3
        }
    };
}

/**
 * @brief Initializes GPU buffers for all ferris wheel components
 * @param {WebGLRenderingContext} gl - WebGL context
 * @return {Object} Object containing buffers for rim, spokes, axle, supports, and cabins
 */
export function initFerrisWheel(gl) {
    /**
     * @brief Uploads mesh geometry to GPU buffers
     * @param {Object} mesh - Mesh geometry with vertices, normals, etc.
     * @return {Object} Buffer object with VBO, NBO, TBO, IBO and count
     */
    function uploadMesh(mesh) {
        const vertexBufferObject = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferObject);
        gl.bufferData(gl.ARRAY_BUFFER, mesh.vertices, gl.STATIC_DRAW);

        const normalBufferObject = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBufferObject);
        gl.bufferData(gl.ARRAY_BUFFER, mesh.normals, gl.STATIC_DRAW);

        const textureCoordBufferObject = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBufferObject);
        gl.bufferData(gl.ARRAY_BUFFER, mesh.texcoords, gl.STATIC_DRAW);

        let indexBufferObject = null;
        if (mesh.indices) {
            indexBufferObject = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBufferObject);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
        }
        return {
            vbo: vertexBufferObject,
            nbo: normalBufferObject,
            tbo: textureCoordBufferObject,
            ibo: indexBufferObject,
            count: mesh.count
        };
    }

    const rimGeometry = createRim(WHEEL_RADIUS, 0.3, 48, 8);
    const spokeGeometry = createCylinder(0.12, 0.12, WHEEL_RADIUS, 6);
    const axleGeometry = createCylinder(0.5, 0.5, 2.0, 8);
    const supportGeometry = createCylinder(0.4, 0.4, WHEEL_RADIUS + 8.0, 8);
    const cabinGeometry = createCabin();

    return {
        rim:        uploadMesh(rimGeometry),
        spoke:      uploadMesh(spokeGeometry),
        axle:       uploadMesh(axleGeometry),
        support:    uploadMesh(supportGeometry),
        cabinBody:  uploadMesh(cabinGeometry.body),
        cabinGlass: uploadMesh(cabinGeometry.glass),
    };
}

/**
 * @brief Renders a mesh using stored buffers
 * @param {WebGLRenderingContext} gl - WebGL context
 * @param {Object} bufferData - Buffer object containing VBO, NBO, TBO, IBO
 * @param {number} attributePosition - Position attribute location
 * @param {number} attributeNormal - Normal attribute location
 * @param {number} attributeTexCoord - Texture coordinate attribute location
 * @return {void}
 */
function drawMesh(gl, bufferData, attributePosition, attributeNormal, attributeTexCoord) {
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferData.vbo);
    gl.vertexAttribPointer(attributePosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(attributePosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, bufferData.nbo);
    gl.vertexAttribPointer(attributeNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(attributeNormal);

    if (attributeTexCoord >= 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, bufferData.tbo);
        gl.vertexAttribPointer(attributeTexCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(attributeTexCoord);
    }

    if (bufferData.ibo) {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufferData.ibo);
        gl.drawElements(gl.TRIANGLES, bufferData.count, gl.UNSIGNED_SHORT, 0);
    } else {
        gl.drawArrays(gl.TRIANGLES, 0, bufferData.count);
    }
}

/**
 * @brief Creates transformation matrix from translation, rotation, and scale
 * @param {number} translationX - Translation in X axis
 * @param {number} translationY - Translation in Y axis
 * @param {number} translationZ - Translation in Z axis
 * @param {number} rotationX - Rotation around X axis (radians)
 * @param {number} rotationY - Rotation around Y axis (radians)
 * @param {number} rotationZ - Rotation around Z axis (radians)
 * @param {number} scaleX - Scale factor in X axis
 * @param {number} scaleY - Scale factor in Y axis
 * @param {number} scaleZ - Scale factor in Z axis
 * @return {Float32Array} 4x4 transformation matrix
 */
function makeModel(translationX, translationY, translationZ, rotationX, rotationY, rotationZ, scaleX, scaleY, scaleZ) {
    const cosRotX = Math.cos(rotationX);
    const sinRotX = Math.sin(rotationX);
    const cosRotY = Math.cos(rotationY);
    const sinRotY = Math.sin(rotationY);
    const cosRotZ = Math.cos(rotationZ);
    const sinRotZ = Math.sin(rotationZ);

    return new Float32Array([
        (cosRotY*cosRotZ + sinRotY*sinRotX*sinRotZ)*scaleX, (-cosRotY*sinRotZ + sinRotY*sinRotX*cosRotZ)*scaleY, sinRotY*cosRotX*scaleZ, 0,
        cosRotX*sinRotZ*scaleX, cosRotX*cosRotZ*scaleY, -sinRotX*scaleZ, 0,
        (-sinRotY*cosRotZ + cosRotY*sinRotX*sinRotZ)*scaleX, (sinRotY*sinRotZ + cosRotY*sinRotX*cosRotZ)*scaleY, cosRotY*cosRotX*scaleZ, 0,
        translationX, translationY, translationZ, 1
    ]);
}

/**
 * @brief Renders the complete ferris wheel with all components
 * @details Renders in order: supports, axle, main rim, spokes, decorative inner rim,
 *          cabin bodies, and cabin glass with alpha blending
 * @param {WebGLRenderingContext} gl - WebGL context
 * @param {Object} wheelBuffers - Wheel buffer object from initFerrisWheel
 * @param {number} rotationAngle - Current rotation angle of wheel (radians)
 * @param {Array<number>} wheelPosition - World position of wheel center [x, y, z]
 * @param {number} attributePosition - Position attribute location
 * @param {number} attributeNormal - Normal attribute location
 * @param {number} attributeTexCoord - Texture coordinate attribute location
 * @param {number} uniformModel - Model matrix uniform location
 * @param {number} uniformObjectColor - Object color uniform location
 * @param {number} uniformUseTexture - Use texture flag uniform location
 * @return {void}
 */
export function renderFerrisWheel(gl, wheelBuffers, rotationAngle, wheelPosition,
                                   attributePosition, attributeNormal, attributeTexCoord,
                                   uniformModel, uniformObjectColor, uniformUseTexture, cabinLightsOn = false) {
    gl.uniform1i(uniformUseTexture, 0);

    const [wheelPositionX, wheelPositionY, wheelPositionZ] = wheelPosition;
    const cosWheelAngle = Math.cos(rotationAngle);
    const sinWheelAngle = Math.sin(rotationAngle);
    const wheelCenterY = wheelPositionY + WHEEL_RADIUS + 6.0;

    // ── SUPPORTS ──────────────────────────────────────────────────────────────
    gl.uniform3fv(uniformObjectColor, [0.55, 0.5, 0.45]);

    const supportHeight = WHEEL_RADIUS + 6.0;
    const supportPositions = [
        [wheelPositionX - 4.0, wheelPositionZ + 1.0],
        [wheelPositionX + 4.0, wheelPositionZ + 1.0],
        [wheelPositionX - 4.0, wheelPositionZ - 1.0],
        [wheelPositionX + 4.0, wheelPositionZ - 1.0],
    ];

    for (const [supportX, supportZ] of supportPositions) {
        const supportModel = new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            supportX, wheelPositionY + supportHeight / 2, supportZ, 1
        ]);
        gl.uniformMatrix4fv(uniformModel, false, supportModel);
        drawMesh(gl, wheelBuffers.support, attributePosition, attributeNormal, attributeTexCoord);
    }

    // ── AXLE ───────────────────────────────────────────────────────────────────
    gl.uniform3fv(uniformObjectColor, [0.4, 0.4, 0.45]);
    const axleModel = new Float32Array([
        1, 0, 0, 0,
        0, 0, -1, 0,
        0, 1, 0, 0,
        wheelPositionX, wheelCenterY, wheelPositionZ, 1
    ]);
    gl.uniformMatrix4fv(uniformModel, false, axleModel);
    drawMesh(gl, wheelBuffers.axle, attributePosition, attributeNormal, attributeTexCoord);

    // ── RIM (main rotating) ────────────────────────────────────────────────────
    gl.uniform3fv(uniformObjectColor, [0.3, 0.35, 0.8]);
    const rimModel = new Float32Array([
        cosWheelAngle, sinWheelAngle, 0, 0,
        -sinWheelAngle, cosWheelAngle, 0, 0,
        0, 0, 1, 0,
        wheelPositionX, wheelCenterY, wheelPositionZ, 1
    ]);
    gl.uniformMatrix4fv(uniformModel, false, rimModel);
    drawMesh(gl, wheelBuffers.rim, attributePosition, attributeNormal, attributeTexCoord);

    // ── SPOKES ────────────────────────────────────────────────────────────────
    gl.uniform3fv(uniformObjectColor, [0.5, 0.5, 0.55]);

    for (let spokeIndex = 0; spokeIndex < SPOKE_COUNT; spokeIndex++) {
        const spokeAngleOnRim = (spokeIndex / SPOKE_COUNT) * Math.PI * 2 + rotationAngle;
        const spokeRotationAngle = spokeAngleOnRim + Math.PI / 2;

        const spokeMidX = Math.cos(spokeAngleOnRim) * WHEEL_RADIUS * 0.5;
        const spokeMidY = Math.sin(spokeAngleOnRim) * WHEEL_RADIUS * 0.5;

        const cosSpokeRotation = Math.cos(spokeRotationAngle);
        const sinSpokeRotation = Math.sin(spokeRotationAngle);

        const spokeModel = new Float32Array([
            cosSpokeRotation, sinSpokeRotation, 0, 0,
            -sinSpokeRotation, cosSpokeRotation, 0, 0,
            0, 0, 1, 0,
            wheelPositionX + spokeMidX, wheelCenterY + spokeMidY, wheelPositionZ, 1
        ]);
        gl.uniformMatrix4fv(uniformModel, false, spokeModel);
        drawMesh(gl, wheelBuffers.spoke, attributePosition, attributeNormal, attributeTexCoord);
    }

    // ── DECORATIVE INNER RIM ───────────────────────────────────────────────────
    gl.uniform3fv(uniformObjectColor, [0.9, 0.7, 0.2]);
    const innerRimScale = WHEEL_RADIUS * 0.6;
    const innerRimModel = new Float32Array([
        cosWheelAngle * 0.6, sinWheelAngle * 0.6, 0, 0,
        -sinWheelAngle * 0.6, cosWheelAngle * 0.6, 0, 0,
        0, 0, 1, 0,
        wheelPositionX, wheelCenterY, wheelPositionZ, 1
    ]);
    gl.uniformMatrix4fv(uniformModel, false, innerRimModel);
    drawMesh(gl, wheelBuffers.rim, attributePosition, attributeNormal, attributeTexCoord);

    // ── CABIN BODIES ───────────────────────────────────────────────────────────
    const cabinColorPalette = [
        [0.9, 0.2, 0.3], [0.2, 0.5, 0.9],
        [0.9, 0.75, 0.1], [0.2, 0.75, 0.3],
        [0.9, 0.4, 0.1], [0.6, 0.2, 0.85],
    ];

    for (let cabinIndex = 0; cabinIndex < CABIN_COUNT; cabinIndex++) {
        const cabinAngle = (cabinIndex / CABIN_COUNT) * Math.PI * 2 + rotationAngle;
        const cabinOffsetX = Math.cos(cabinAngle) * WHEEL_RADIUS;
        const cabinOffsetY = Math.sin(cabinAngle) * WHEEL_RADIUS;

        // Змініть колір якщо світло ввімкнено
        let cabinColor;
        if (cabinLightsOn) {
            // Яскраві кольори з жовтуватим відблиском (світло)
            const brightPalette = [
                [1.0, 0.4, 0.4], [0.4, 0.7, 1.0],
                [1.0, 0.95, 0.3], [0.4, 0.95, 0.4],
                [1.0, 0.6, 0.2], [0.9, 0.4, 1.0],
            ];
            cabinColor = brightPalette[cabinIndex % brightPalette.length];
        } else {
            // Темні кольори (світло вимкнено)
            cabinColor = cabinColorPalette[cabinIndex % cabinColorPalette.length];
        }
        
        gl.uniform3fv(uniformObjectColor, cabinColor);
        const cabinModel = new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            wheelPositionX + cabinOffsetX, wheelCenterY + cabinOffsetY, wheelPositionZ, 1
        ]);
        gl.uniformMatrix4fv(uniformModel, false, cabinModel);
        drawMesh(gl, wheelBuffers.cabinBody, attributePosition, attributeNormal, attributeTexCoord);
    }

    // ── CABIN GLASS (with alpha blending) ──────────────────────────────────────
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);

    for (let cabinIndex = 0; cabinIndex < CABIN_COUNT; cabinIndex++) {
        const cabinAngle = (cabinIndex / CABIN_COUNT) * Math.PI * 2 + rotationAngle;
        const cabinOffsetX = Math.cos(cabinAngle) * WHEEL_RADIUS;
        const cabinOffsetY = Math.sin(cabinAngle) * WHEEL_RADIUS;

        // Interior light colors based on cabin lights state
        let glassColor;
        if (cabinLightsOn) {
            // Яскраве теплое світло всередині (жовтаво-помаранчеве)
            const lightPalette = [
                [1.0, 0.9, 0.3],   // золотистий
                [1.0, 0.8, 0.2],   // помаранчевий
                [1.0, 0.95, 0.4],  // світло-жовтий
                [0.95, 0.85, 0.2], // теплий жовтий
                [1.0, 0.88, 0.3],  // мідь
                [1.0, 0.92, 0.35], // кремовий
            ];
            glassColor = lightPalette[cabinIndex % lightPalette.length];
        } else {
            // Темне скло (прозорий синій)
            glassColor = [0.7, 0.85, 1.0];
        }

        gl.uniform3fv(uniformObjectColor, glassColor);

        const cabinModel = new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            wheelPositionX + cabinOffsetX, wheelCenterY + cabinOffsetY, wheelPositionZ, 1
        ]);
        gl.uniformMatrix4fv(uniformModel, false, cabinModel);
        drawMesh(gl, wheelBuffers.cabinGlass, attributePosition, attributeNormal, attributeTexCoord);
    }

    gl.depthMask(true);
    gl.disable(gl.BLEND);
}

export { WHEEL_RADIUS, CABIN_COUNT };