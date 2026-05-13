/**
 * @file lights.js
 * @brief Lantern (фонарик) creation and rendering module
 * @details Manages procedural lantern geometry and rendering around the ferris wheel
 */

/**
 * @brief Initialize lantern buffers (кубики для ліхтариків)
 * @param {WebGLRenderingContext} gl - WebGL context
 * @return {Object} Object containing VBO, NBO, IBO and vertex count
 */
export function initLanternBuffers(gl) {
    const vertices = new Float32Array([
        // Back face
        -0.15, -1.0, -0.15,  0.15, -1.0, -0.15,  0.15,  1.0, -0.15, -0.15,  1.0, -0.15,
        // Front face
        -0.15, -1.0,  0.15,  0.15, -1.0,  0.15,  0.15,  1.0,  0.15, -0.15,  1.0,  0.15,
        // Left face
        -0.15, -1.0, -0.15, -0.15, -1.0,  0.15, -0.15,  1.0,  0.15, -0.15,  1.0, -0.15,
        // Right face
         0.15, -1.0, -0.15,  0.15, -1.0,  0.15,  0.15,  1.0,  0.15,  0.15,  1.0, -0.15,
        // Bottom face
        -0.15, -1.0, -0.15, -0.15, -1.0,  0.15,  0.15, -1.0,  0.15,  0.15, -1.0, -0.15,
        // Top face
        -0.15,  1.0, -0.15, -0.15,  1.0,  0.15,  0.15,  1.0,  0.15,  0.15,  1.0, -0.15
    ]);

    const normals = new Float32Array([
        // Back
        0, 0, -1,  0, 0, -1,  0, 0, -1,  0, 0, -1,
        // Front
        0, 0,  1,  0, 0,  1,  0, 0,  1,  0, 0,  1,
        // Left
        -1, 0,  0, -1, 0,  0, -1, 0,  0, -1, 0,  0,
        // Right
        1, 0,  0,  1, 0,  0,  1, 0,  0,  1, 0,  0,
        // Bottom
        0, -1, 0,  0, -1, 0,  0, -1, 0,  0, -1, 0,
        // Top
        0,  1, 0,  0,  1, 0,  0,  1, 0,  0,  1, 0
    ]);

    const texCoords = new Float32Array([
        // Back face
        0, 0,  1, 0,  1, 1, 0, 1,
        // Front face
        0, 0,  1, 0,  1, 1, 0, 1,
        // Left face
        0, 0,  1, 0,  1, 1, 0, 1,
        // Right face
        0, 0,  1, 0,  1, 1, 0, 1,
        // Bottom face
        0, 0,  1, 0,  1, 1, 0, 1,
        // Top face
        0, 0,  1, 0,  1, 1, 0, 1
    ]);

    const indices = new Uint16Array([
        0, 1, 2, 2, 3, 0,      // Back
        4, 6, 5, 4, 7, 6,      // Front
        8, 9, 10, 10, 11, 8,   // Left
        12, 14, 13, 12, 15, 14, // Right
        16, 18, 17, 16, 19, 18, // Bottom
        20, 21, 22, 22, 23, 20  // Top
    ]);

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const nbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nbo);
    gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);

    const ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    const tbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tbo);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

    return {
        vbo: vbo,
        nbo: nbo,
        ibo: ibo,
        tbo: tbo,
        count: indices.length
    };
}

/**
 * @brief Render lanterns (ліхтарики) around the ferris wheel
 * @param {WebGLRenderingContext} gl - WebGL context
 * @param {Object} lanternBuffers - Lantern geometry buffers
 * @param {number} aPosition - Position attribute location
 * @param {number} aNormal - Normal attribute location
 * @param {number} uModel - Model matrix uniform location
 * @param {number} uObjectColor - Object color uniform location
 * @param {number} uUseTexture - Use texture flag uniform
 * @param {number} uIsFlower - Is flower flag uniform
 * @param {number} uIsWater - Is water flag uniform
 * @param {number} uIsCloud - Is cloud flag uniform
 * @param {number} uAlpha - Alpha transparency uniform (optional)
 */
export function renderLanterns(
    gl, lanternBuffers, aPosition, aNormal, aTexCoord, uModel, uObjectColor,
    uUseTexture, uIsFlower, uIsWater, uIsCloud, uAlpha = null
) {
    if (!lanternBuffers) return;
    
    const wheelCenter = [10, 0, -12];
    const lanternCount = 4;
    const lanternDistance = 20.0;
    const lanternHeight = 5.0;

    // Спільні налаштування
    gl.bindBuffer(gl.ARRAY_BUFFER, lanternBuffers.vbo);
    gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, lanternBuffers.nbo);
    gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aNormal);

    gl.bindBuffer(gl.ARRAY_BUFFER, lanternBuffers.tbo);
    gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aTexCoord);


    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, lanternBuffers.ibo);

    gl.uniform1i(uUseTexture, 1);
    gl.uniform1i(uIsFlower, 0);
    gl.uniform1i(uIsWater, 0);
    gl.uniform1i(uIsCloud, 0);
    
    // Установи альфу якщо передана
    if (uAlpha !== null) {
        gl.uniform1f(uAlpha, 1.0);
    }

    // ─── ПЕРШИЙ ПРОХІД: Непрозорі частини (Стовпи та Світло) ───
    for (let i = 0; i < lanternCount; i++) {
        const angle = (Math.PI * 2 / lanternCount) * i;
        const lanternX = wheelCenter[0] + Math.cos(angle) * lanternDistance;
        const lanternZ = wheelCenter[2] + Math.sin(angle) * lanternDistance;

        // Стовп
        const poleModel = new Float32Array([
            0.8, 0, 0, 0,
            0, 3.0, 0, 0,
            0, 0, 0.8, 0,
            lanternX, lanternHeight - 3.0, lanternZ, 1
        ]);
        gl.uniformMatrix4fv(uModel, false, poleModel);
        gl.uniform3fv(uObjectColor, [0.02, 0.02, 0.02]);
        gl.drawElements(gl.TRIANGLES, lanternBuffers.count, gl.UNSIGNED_SHORT, 0);

        // Яскраве внутрішнє світло
        const lightModel = new Float32Array([
            2.2, 0, 0, 0,
            0, 1.2, 0, 0,
            0, 0, 2.2, 0,
            lanternX, lanternHeight, lanternZ, 1
        ]);
        gl.uniformMatrix4fv(uModel, false, lightModel);
        gl.uniform3fv(uObjectColor, [1.0, 0.95, 0.5]);
        gl.drawElements(gl.TRIANGLES, lanternBuffers.count, gl.UNSIGNED_SHORT, 0);
    }

    // ─── ДРУГИЙ ПРОХІД: Напівпрозорі частини (Корпуси) ───
    if (uAlpha !== null) {
        gl.uniform1f(uAlpha, 0.5); // Встановлюємо 50% прозорості
    }

    for (let i = 0; i < lanternCount; i++) {
        const angle = (Math.PI * 2 / lanternCount) * i;
        const lanternX = wheelCenter[0] + Math.cos(angle) * lanternDistance;
        const lanternZ = wheelCenter[2] + Math.sin(angle) * lanternDistance;

        const headModel = new Float32Array([
            3.5, 0, 0, 0,
            0, 1.0, 0, 0,
            0, 0, 3.5, 0,
            lanternX, lanternHeight + 0.2, lanternZ, 1
        ]);
        gl.uniformMatrix4fv(uModel, false, headModel);
        gl.uniform3fv(uObjectColor, [0.98, 0.98, 0.90]);
        gl.drawElements(gl.TRIANGLES, lanternBuffers.count, gl.UNSIGNED_SHORT, 0);
    }

    // Скидаємо альфу назад для наступних об'єктів
    if (uAlpha !== null) {
        gl.uniform1f(uAlpha, 1.0);
    }
}