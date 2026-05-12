import { Camera } from "./scene/camera.js";
import { createTerrain } from "./objects/terrain.js";
import { createFlowers, initFlowerBuffers, renderFlowers } from "./objects/flowers.js";
import { createRiver, initRiverBuffers, renderRiver, createRiverPebbles, initPebbleBuffers, renderPebbles } from "./objects/river.js";
import { initSkybox, renderSkybox } from "./objects/skybox.js";
import { initCloudBuffers, renderClouds } from "./objects/clouds.js";
import { initFerrisWheel, renderFerrisWheel, CABIN_COUNT } from "./objects/ferrisWheel.js";
import { initBirdBuffers, renderBirds } from "./objects/birds.js";
import { createTrees, initTreeBuffers, renderTrees } from "./objects/trees.js";


let terrainVBO;
let terrainNBO;
let terrainIBO;
let terrain;


/**
 * @brief Renders terrain with grass texture
 * @param {WebGLRenderingContext} gl - WebGL context
 * @param {Object} terrainBuffers - Object containing VBO, NBO, IBO and TBO for terrain
 * @param {Object} terrain - Terrain data (vertex count, etc.)
 * @param {number} aPosition - Attribute location for position in shader
 * @param {number} aNormal - Attribute location for normal in shader
 * @param {number} aTexCoord - Attribute location for texture coordinates in shader
 * @param {number} uModel - Uniform location for model matrix
 * @param {number} uObjectColor - Uniform location for object color
 * @param {number} uTexture - Uniform location for texture
 * @param {number} uUseTexture - Uniform location for texture usage flag
 * @param {WebGLTexture} grassTexture - Grass texture
 */
function renderTerrain(gl, terrainBuffers, terrain, aPosition, aNormal, aTexCoord, uModel, uObjectColor, uTexture, uUseTexture, grassTexture) {
    gl.bindBuffer(gl.ARRAY_BUFFER, terrainBuffers.vbo);
    gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, terrainBuffers.nbo);
    gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aNormal);

    gl.bindBuffer(gl.ARRAY_BUFFER, terrainBuffers.tbo);
    gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aTexCoord);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, grassTexture);
    gl.uniform1i(uUseTexture, 1);  
    gl.uniform1i(uTexture, 0);    

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, terrainBuffers.ibo);

    const model = new Float32Array([
        1,0,0,0,
        0,1,0,0,
        0,0,1,0,
        -60, 0, -60, 1
    ]);
    gl.uniformMatrix4fv(uModel, false, model);
    gl.drawElements(gl.TRIANGLES, terrain.count, gl.UNSIGNED_SHORT, 0);

    gl.uniform1i(uUseTexture, 0);
}

/**
 * @brief Asynchronously loads shader source from file
 * @param {string} urlPath - Path to shader file
 * @return {Promise<string>} Shader source code
 */
async function loadShaderSource(url) {
    const response = await fetch(url);
    return await response.text();
}

/**
 * @brief Loads texture from image file and creates WebGL texture
 * @param {WebGLRenderingContext} gl - WebGL context
 * @param {string} urlPath - Path to image file
 * @return {WebGLTexture} WebGL texture object
 */
function loadTexture(gl, url) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Temporary green color while loading
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0,
        gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 128, 0, 255]));

    const image = new Image();
    image.src = url;
    image.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

        // Check if image dimensions are power of two
        const isPOT = (v) => v > 0 && (v & (v - 1)) === 0;
        if (isPOT(image.width) && isPOT(image.height)) {
            gl.generateMipmap(gl.TEXTURE_2D);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        } else {
            // Resize to power of two if necessary
            const canvas2d = document.createElement("canvas");
            canvas2d.width = 512;
            canvas2d.height = 512;
            const ctx = canvas2d.getContext("2d");
            ctx.drawImage(image, 0, 0, 512, 512);

            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas2d);
            gl.generateMipmap(gl.TEXTURE_2D);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        }
    };

    return texture;
}

/**
 * @brief Creates and compiles a shader
 * @param {WebGLRenderingContext} gl - WebGL context
 * @param {number} shaderType - Shader type (VERTEX_SHADER or FRAGMENT_SHADER)
 * @param {string} shaderSource - Shader source code
 * @return {WebGLShader} Compiled shader object
 */
function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
    }

    return shader;
}

/**
 * @brief Creates a shader program by linking vertex and fragment shaders
 * @param {WebGLRenderingContext} gl - WebGL context
 * @param {WebGLShader} vertexShader - Compiled vertex shader
 * @param {WebGLShader} fragmentShader - Compiled fragment shader
 * @return {WebGLProgram} Linked shader program
 */
function createProgram(gl, vs, fs) {
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
    }

    return program;
}

/**
 * @brief Catmull-Rom spline interpolation
 * @param {Array} p0, p1, p2, p3 - Control points
 * @param {number} t - Parameter (0-1)
 * @return {number} Interpolated value
 */
function catmullRom(p0, p1, p2, p3, t) {
    const t2 = t * t;
    const t3 = t2 * t;
    
    return 0.5 * (
        2 * p1 +
        (-p0 + p2) * t +
        (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
        (-p0 + 3 * p1 - 3 * p2 + p3) * t3
    );
}

/**
 * @brief Get position on spline curve
 * @param {Array} controlPoints - Array of control points
 * @param {number} t - Time parameter (0-1)
 * @return {Object} Position {x, y, z}
 */
function getSplinePosition(controlPoints, t) {
    const n = controlPoints.length;
    const scaledT = t * n;
    const segmentIndex = Math.floor(scaledT) % n;
    const localT = scaledT - Math.floor(scaledT);
    
    const p0 = controlPoints[(segmentIndex - 1 + n) % n];
    const p1 = controlPoints[segmentIndex];
    const p2 = controlPoints[(segmentIndex + 1) % n];
    const p3 = controlPoints[(segmentIndex + 2) % n];
    
    return {
        x: catmullRom(p0.x, p1.x, p2.x, p3.x, localT),
        y: catmullRom(p0.y, p1.y, p2.y, p3.y, localT),
        z: catmullRom(p0.z, p1.z, p2.z, p3.z, localT)
    };
}

/**
 * @brief Creates perspective projection matrix
 * @param {number} fieldOfViewYradians - Field of view in Y axis in radians
 * @param {number} aspectRatio - Aspect ratio (width/height)
 * @param {number} zNear - Near clipping plane
 * @param {number} zFar - Far clipping plane
 * @return {Float32Array} Perspective projection matrix (4x4)
 */
function makePerspective(fovY, aspect, near, far) {
    const f = 1.0 / Math.tan(fovY / 2);
    return new Float32Array([
        f / aspect, 0, 0, 0,
        0, f, 0, 0,
        0, 0, (far + near) / (near - far), -1,
        0, 0, (2 * far * near) / (near - far), 0
    ]);
}

/**
 * @brief Control points for river path along the terrain
 * @type {Array<{x: number, z: number}>}
 */
const RIVER_PTS = [
    { x: 5,  z: 5  }, { x: 15, z: 15 }, { x: 25, z: 28 },
    { x: 36, z: 44 }, { x: 44, z: 56 }, { x: 56, z: 66 },
    { x: 70, z: 72 }, { x: 84, z: 76 }, { x: 100,z: 84 },
    { x: 112,z: 96 },
];

/**
 * @brief Main application entry point - initializes WebGL and sets up the scene
 * @details Loads all resources, sets up cameras, initializes buffers, and starts render loop
 * @return {void}
 */

async function main() {
    const canvas = document.getElementById("glCanvas");
    const gl = canvas.getContext("webgl");

     if (!gl) {
        alert("WebGL not supported");
        return;
    }

    // Create terrain and related objects
    const terrain = createTerrain(120, 1);
    const flowers = createFlowers(terrain.getHeight, terrain.getBaseHeight, 300, 120);
    const flowerBuffers = initFlowerBuffers(gl);

    const trees = createTrees(terrain.getHeight, terrain.getBaseHeight, RIVER_PTS, 80, 120);
    const treeBuffers = initTreeBuffers(gl);

    const river = createRiver(terrain.getBaseHeight, 120);
    const riverBuffers = initRiverBuffers(gl, river);

    const pebbles = createRiverPebbles(terrain.getHeight, terrain.getBaseHeight, river);
    const pebbleBuffers = initPebbleBuffers(gl);
    const waterTexture = await loadTexture(gl, "./textures/water.jpg");

    const skyboxBuffers = initSkybox(gl);
    const ferrisWheel = initFerrisWheel(gl);
    const birdBuffers = initBirdBuffers(gl);

    // Create terrain buffers
    const terrainBuffers = {
        vbo: gl.createBuffer(),
        nbo: gl.createBuffer(),
        ibo: gl.createBuffer(),
        tbo: gl.createBuffer()
    };

    gl.bindBuffer(gl.ARRAY_BUFFER, terrainBuffers.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, terrain.vertices, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, terrainBuffers.nbo);
    gl.bufferData(gl.ARRAY_BUFFER, terrain.normals, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, terrainBuffers.ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, terrain.indices, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, terrainBuffers.tbo);
    gl.bufferData(gl.ARRAY_BUFFER, terrain.texcoords, gl.STATIC_DRAW);

    // Initialize cameras
    const cameraStatic = new Camera();
    const cameraOrbit = new Camera();
    const cameraCabin = new Camera();
    const cameraSpline = new Camera();  // ← НОВА: камера по spline кривій

    let activeCamera = cameraStatic;
    let lightingMode = 0;
    let cabinLightsOn = false;
    let flowerScales = new Array(flowers.length).fill(1.0);  // Поточний масштаб
    let flowerTargetScales = new Array(flowers.length).fill(1.0);  // Цільовий масштаб
    let selectedFlowerIndex = -1;  // Індекс вибраної квітки
    let draggedFlowerIndex = -1;  // Індекс квітки при перетягуванні
    let splineTime = 0;  // ← НОВА: час вздовж spline кривої (0-1)

    // ── SPLINE CURVE CONTROL POINTS ──
    const splineControlPoints = [
        { x: 50, y: 15, z: 50 },   // Точка 0
        { x: 80, y: 20, z: 40 },   // Точка 1
        { x: 90, y: 18, z: 10 },   // Точка 2
        { x: 70, y: 25, z: -20 },  // Точка 3
        { x: 30, y: 20, z: -30 },  // Точка 4
        { x: 10, y: 15, z: 10 },   // Точка 5
    ];

    cameraStatic.position = [0, 20, 35];
    cameraStatic.target   = [0, 0, 0];
    cameraStatic.isOrbit  = false;

    cameraOrbit.target    = [0, 2, 0];  
    cameraOrbit.distance  = 25;
    cameraOrbit.pitch     = 0.4;
    cameraOrbit.targetPitch = 0.4;
    cameraOrbit.isOrbit   = true;
    cameraOrbit.position  = [0, 0, 0];  

    cameraCabin.isOrbit   = false;
    cameraSpline.isOrbit  = false;  // ← НОВА: не орбітальна
    
    // Keyboard input handler
    window.addEventListener("keydown", (e) => {
        if (e.key === "1") activeCamera = cameraStatic;
        if (e.key === "2") activeCamera = cameraOrbit;
        if (e.key === "3") activeCamera = cameraCabin;
        if (e.key === "4") activeCamera = cameraSpline; 

        if (e.key === "q" || e.key === "Q") lightingMode = 0;
        if (e.key === "w" || e.key === "W") lightingMode = 1;
        if (e.key === "e" || e.key === "E") lightingMode = 2;

        // Cabin lights toggle
        if (e.key === "a" || e.key === "A") {
            cabinLightsOn = true;
        }
        if (e.key === "s" || e.key === "S") {
            cabinLightsOn = false;
        }

        const speed = 1.0;
        if (activeCamera === cameraStatic) {
            if (e.key === "ArrowUp")    { cameraStatic.position[1] += speed; cameraStatic.target[1] += speed; }
            if (e.key === "ArrowDown")  { cameraStatic.position[1] -= speed; cameraStatic.target[1] -= speed; }
            if (e.key === "ArrowLeft")  { cameraStatic.position[0] -= speed; cameraStatic.target[0] -= speed; }
            if (e.key === "ArrowRight") { cameraStatic.position[0] += speed; cameraStatic.target[0] += speed; }
        }
    });

    // Mouse input handler
    let isDragging = false;
    let lastX = 0;
    let lastY = 0;
    let clickStartX = 0;
    let clickStartY = 0;

    window.addEventListener("mousedown", (e) => {
        isDragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
        clickStartX = e.clientX;
        clickStartY = e.clientY;
        
        // Знаходимо квітку під мишею для перетягування
        const rect = canvas.getBoundingClientRect();
        const clickScreenX = (clickStartX - rect.left) / rect.width * 2 - 1;
        const clickScreenY = 1 - (clickStartY - rect.top) / rect.height * 2;
        
        let closestIndex = -1;
        let closestScreenDist = Infinity;
        
        const viewMatrix = activeCamera.getViewMatrix();
        const aspect = canvas.width / canvas.height;
        const projMatrix = makePerspective(Math.PI / 3, aspect, 0.1, 200.0);
        
        for (let i = 0; i < flowers.length; i++) {
            const flower = flowers[i];
            
            // Шукаємо ВСІ квітки, не тільки з жовтим центром
            const worldX = flower.x - 60;
            const worldY = flower.y;
            const worldZ = flower.z - 60;
            
            // Перетворюємо в view space
            const viewX = viewMatrix[0] * worldX + viewMatrix[4] * worldY + viewMatrix[8] * worldZ + viewMatrix[12];
            const viewY = viewMatrix[1] * worldX + viewMatrix[5] * worldY + viewMatrix[9] * worldZ + viewMatrix[13];
            const viewZ = viewMatrix[2] * worldX + viewMatrix[6] * worldY + viewMatrix[10] * worldZ + viewMatrix[14];
            
            // Пропускаємо квітки позаду камери
            if (viewZ >= 0) continue;
            
            // Перетворюємо в projection space
            const projX = projMatrix[0] * viewX + projMatrix[8] * viewZ;
            const projY = projMatrix[5] * viewY + projMatrix[9] * viewZ;
            const projW = projMatrix[11] * viewZ + projMatrix[15];
            
            // Нормалізуємо на екран
            const screenX = projX / projW;
            const screenY = projY / projW;
            
            // Відстань на екрані
            const screenDist = Math.sqrt(
                (screenX - clickScreenX) * (screenX - clickScreenX) +
                (screenY - clickScreenY) * (screenY - clickScreenY)
            );
            
            // Вибираємо ближайшу квітку (в радіусі 0.2)
            if (screenDist < 0.2 && screenDist < closestScreenDist) {
                closestScreenDist = screenDist;
                closestIndex = i;
            }
        }
        
        draggedFlowerIndex = closestIndex;
    });

    window.addEventListener("mouseup", (e) => {
        isDragging = false;
        draggedFlowerIndex = -1;  // Скасуємо перетягування
        
        // Простий picking - клік без перетягування
        if (Math.abs(lastX - clickStartX) < 5 && Math.abs(lastY - clickStartY) < 5) {
            // Координати клику в нормалізованому простосі (-1 до 1)
            const rect = canvas.getBoundingClientRect();
            const clickScreenX = (clickStartX - rect.left) / rect.width * 2 - 1;
            const clickScreenY = 1 - (clickStartY - rect.top) / rect.height * 2;
            
            // Знаходимо ближайшу квітку з жовтим центром
            let closestIndex = -1;
            let closestScreenDist = Infinity;
            
            const viewMatrix = activeCamera.getViewMatrix();
            const aspect = canvas.width / canvas.height;
            const projMatrix = makePerspective(Math.PI / 3, aspect, 0.1, 200.0);
            
            for (let i = 0; i < flowers.length; i++) {
                const flower = flowers[i];
                
                // Перевіряємо чи це квітка з жовтим центром
                const hasYellowCenter = flower.type.center[0] === 1.0 && 
                                        flower.type.center[1] === 0.9 && 
                                        flower.type.center[2] === 0.0;
                
                if (!hasYellowCenter) continue;
                
                // Світові координати квітки
                const worldX = flower.x - 60;
                const worldY = flower.y;
                const worldZ = flower.z - 60;
                
                // Перетворюємо в координати вигляду (view space)
                const viewX = viewMatrix[0] * worldX + viewMatrix[4] * worldY + viewMatrix[8] * worldZ + viewMatrix[12];
                const viewY = viewMatrix[1] * worldX + viewMatrix[5] * worldY + viewMatrix[9] * worldZ + viewMatrix[13];
                const viewZ = viewMatrix[2] * worldX + viewMatrix[6] * worldY + viewMatrix[10] * worldZ + viewMatrix[14];
                const viewW = viewMatrix[3] * worldX + viewMatrix[7] * worldY + viewMatrix[11] * worldZ + viewMatrix[15];
                
                // Пропускаємо квітки позаду камери
                if (viewZ >= 0) continue;
                
                // Перетворюємо в координати проекції
                const projX = projMatrix[0] * viewX + projMatrix[8] * viewZ;
                const projY = projMatrix[5] * viewY + projMatrix[9] * viewZ;
                const projW = projMatrix[11] * viewZ + projMatrix[15];
                
                // Нормалізуємо на екранні координати
                const screenX = projX / projW;
                const screenY = projY / projW;
                
                // Відстань на екрані від точки клику
                const screenDist = Math.sqrt(
                    (screenX - clickScreenX) * (screenX - clickScreenX) +
                    (screenY - clickScreenY) * (screenY - clickScreenY)
                );
                
                // Вибираємо ближайшу квітку на екрані (в радіусі 0.15)
                if (screenDist < 0.15 && screenDist < closestScreenDist) {
                    closestScreenDist = screenDist;
                    closestIndex = i;
                }
            }
            
            if (closestIndex !== -1) {
                flowerTargetScales[closestIndex] = flowerTargetScales[closestIndex] === 1.0 ? 3.0 : 1.0;
            } 
        }
    });

    window.addEventListener("mousemove", (e) => {
        if (!isDragging) return;
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;

        // Якщо перетягуємо квітку - рухаємо її по горизонтальній площині за мишею
        if (draggedFlowerIndex !== -1) {
            const flower = flowers[draggedFlowerIndex];
            
            // Отримуємо поточну камеру
            const cameraPos = activeCamera.position;
            const cameraTarget = activeCamera.target;
            
            // Напрямок від камери (перед)
            const forwardX = cameraTarget[0] - cameraPos[0];
            const forwardZ = cameraTarget[2] - cameraPos[2];
            const forwardLen = Math.sqrt(forwardX * forwardX + forwardZ * forwardZ);
            const forwardNormX = forwardX / forwardLen;
            const forwardNormZ = forwardZ / forwardLen;
            
            // Праворуч (перпендикуляр до напрямку, на горизонтальній площині)
            const rightX = -forwardNormZ;
            const rightZ = forwardNormX;
            
            // Рухаємо квітку тільки по X та Z (горизонтально за мишею)
            flower.x += dx * 0.05 * rightX;  // Горизонтально за X рухом миші
            flower.z += dx * 0.05 * rightZ;
            
            flower.x -= dy * 0.05 * forwardNormX;  // Вперед/назад за Y рухом миші (мінус для правильного напрямку)
            flower.z -= dy * 0.05 * forwardNormZ;
            
            // Утримуємо в межах
            flower.x = Math.max(0, Math.min(120, flower.x));
            flower.z = Math.max(0, Math.min(120, flower.z));
            
            console.log("🌼 Перетягування квітки", draggedFlowerIndex, "позиція:", [flower.x.toFixed(1), flower.z.toFixed(1)]);
        } else if (activeCamera.isOrbit) {
            // Стандартне обертання камери орбітою
            activeCamera.targetYaw   += dx * activeCamera.sensitivity;
            activeCamera.targetPitch += dy * activeCamera.sensitivity;
            activeCamera.targetPitch = Math.max(-1.2, Math.min(1.2, activeCamera.targetPitch));
        } else {
            // Стандартне обертання статичної камери
            activeCamera.targetYaw   = (activeCamera.targetYaw   || 0) + dx * 0.005;
            activeCamera.targetPitch = (activeCamera.targetPitch || 0) + dy * 0.005;
            activeCamera.targetPitch = Math.max(-0.8, Math.min(0.8, activeCamera.targetPitch));
            const yaw   = activeCamera.targetYaw;
            const pitch = activeCamera.targetPitch;
            activeCamera.target = [
                activeCamera.position[0] + Math.sin(yaw) * Math.cos(pitch),
                activeCamera.position[1] - Math.sin(pitch),
                activeCamera.position[2] - Math.cos(yaw) * Math.cos(pitch)
            ];
        }
    });


    if (!gl) {
        alert("WebGL not supported");
        return;
    }

    // Setup canvas and WebGL state
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Load and compile shaders
    const vsSource = await loadShaderSource("./shaders/basic/vertex.glsl");
    const fsSource = await loadShaderSource("./shaders/basic/fragment.glsl");

    const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
    const program = createProgram(gl, vs, fs);
    gl.useProgram(program);

    // Get attribute and uniform locations
    const aTexCoord = gl.getAttribLocation(program, "aTexCoord");
    const uTexture = gl.getUniformLocation(program, "uTexture");
    const uUseTexture = gl.getUniformLocation(program, "uUseTexture");

    const grassTexture = loadTexture(gl, "./textures/grass.jpg");

    const positionLocation = gl.getAttribLocation(program, "aPosition");
    const aPosition = gl.getAttribLocation(program, "aPosition");
    const aNormal = gl.getAttribLocation(program, "aNormal");

    const uModel = gl.getUniformLocation(program, "uModel");
    const uView = gl.getUniformLocation(program, "uView");
    const uProjection = gl.getUniformLocation(program, "uProjection");

    const uLightPos = gl.getUniformLocation(program, "uLightPos");
    const uViewPos = gl.getUniformLocation(program, "uViewPos");
    const uObjectColor = gl.getUniformLocation(program, "uObjectColor");

    const uTime    = gl.getUniformLocation(program, "uTime");
    const uIsWater = gl.getUniformLocation(program, "uIsWater");

    const uIsFlower = gl.getUniformLocation(program, "uIsFlower");

    // Load and compile skybox shaders
    const vsSkySource = await loadShaderSource("./shaders/skybox/vertex.glsl");
    const fsSkySource = await loadShaderSource("./shaders/skybox/fragment.glsl");
    const vsSky = createShader(gl, gl.VERTEX_SHADER, vsSkySource);
    const fsSky = createShader(gl, gl.FRAGMENT_SHADER, fsSkySource);
    const skyboxProgram = createProgram(gl, vsSky, fsSky);

    const aPositionSky  = gl.getAttribLocation(skyboxProgram, "aPosition");
    const uViewSky      = gl.getUniformLocation(skyboxProgram, "uView");
    const uProjectionSky = gl.getUniformLocation(skyboxProgram, "uProjection");
    const uLightingMode = gl.getUniformLocation(skyboxProgram, "uLightingMode");

    // Initialize cloud rendering
    const cloudBuffers = initCloudBuffers(gl);
    const uIsCloud = gl.getUniformLocation(program, "uIsCloud");

    // Set light and camera uniforms
    gl.uniform3fv(uLightPos, [50, 15, 10]); 
    gl.uniform3fv(uViewPos, [0, 0, 4]);

    const view = new Float32Array([
        1,0,0,0,
        0,1,0,0,
        0,0,1,0,
        0,0,-4,1
    ]);

    const aspect = canvas.width / canvas.height;
    const projection = makePerspective(Math.PI / 3, aspect, 0.1, 200.0);

    gl.uniformMatrix4fv(uView, false, view);
    gl.uniformMatrix4fv(uProjection, false, projection);

    gl.clearColor(0.45, 0.25, 0.1, 1.0);

/**
 * @brief Main render loop - called every frame
 * @details Updates camera, clears buffers, and renders all scene objects
 * @return {void}
 */

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const t = performance.now() * 0.001;
    gl.uniform1f(uTime, t);
    gl.uniform1i(uIsWater, 0);

    // ── ANIMATE FLOWER SCALES ──
    const animationSpeed = 0.08; // Швидкість анімації (0-1, більше = швидше)
    for (let i = 0; i < flowerScales.length; i++) {
        flowerScales[i] += (flowerTargetScales[i] - flowerScales[i]) * animationSpeed;
    }

    // ── UPDATE LIGHTING MODE ──
    if (lightingMode === 0) {
        // Sunset
        gl.uniform3fv(uLightPos, [50, 15, 10]);
        gl.clearColor(0.45, 0.25, 0.1, 1.0);
    } else if (lightingMode === 1) {
        // Night
        gl.uniform3fv(uLightPos, [-40, 30, 20]);
        gl.clearColor(0.05, 0.05, 0.15, 1.0); 
    } else if (lightingMode === 2) {
        // Dark sunset 
        gl.uniform3fv(uLightPos, [50, 10, 10]);
        gl.clearColor(0.25, 0.15, 0.1, 1.0);
    }

    // Update active camera
    activeCamera.update();
    gl.uniformMatrix4fv(uView, false, activeCamera.getViewMatrix());

    gl.useProgram(skyboxProgram);
    gl.uniform1f(uLightingMode, lightingMode);
    renderSkybox(gl, skyboxBuffers, skyboxProgram, aPositionSky, uViewSky, uProjectionSky, activeCamera.getViewMatrix(), projection);
    gl.useProgram(program);

    gl.uniformMatrix4fv(uProjection, false, projection);
    gl.uniformMatrix4fv(uView, false, activeCamera.getViewMatrix());
    gl.uniform1i(uIsCloud, 0);
    gl.uniform1i(uIsWater, 0);
    gl.uniform1i(uIsFlower, 0);

    // Render terrain
    renderTerrain(gl, terrainBuffers, terrain, aPosition, aNormal, aTexCoord, uModel, uObjectColor, uTexture, uUseTexture, grassTexture);

    // Render distant objects
    renderTrees(gl, treeBuffers, trees, [-60, 0, -60], aPosition, aNormal, aTexCoord, uModel, uObjectColor, uUseTexture, uIsWater, uIsFlower);
    renderRiver(gl, riverBuffers, river, [-60, 0, -60], t, aPosition, aNormal, aTexCoord, uModel, uObjectColor, uUseTexture, uIsWater, uTime, waterTexture, uTexture, uIsWater);
    renderPebbles(gl, pebbleBuffers, pebbles, [-60, 0, -60], aPosition, aNormal, aTexCoord, uModel, uObjectColor, uUseTexture, uIsWater);

    // Update and render ferris wheel
    const wheelAngle = t * 0.4;
    const wheelPos = [10, 0, -12];

    renderFerrisWheel(gl, ferrisWheel, wheelAngle, wheelPos, aPosition, aNormal, aTexCoord, uModel, uObjectColor, uUseTexture, cabinLightsOn);

    // Update cabin camera position
    const WHEEL_RADIUS = 16.0;
    const CAMERA_DISTANCE = 16.0; 
    const CAMERA_Z_OFFSET = 1.0;
    const cabinA = wheelAngle;
    
    const cameraAngle = cabinA + Math.PI;
    
    cameraCabin.position = [
        wheelPos[0] + Math.cos(cameraAngle) * CAMERA_DISTANCE,
        wheelPos[1] + WHEEL_RADIUS + Math.sin(cameraAngle) * WHEEL_RADIUS,
        wheelPos[2] + CAMERA_Z_OFFSET  
    ];
    
    cameraCabin.targetYaw = cameraCabin.targetYaw || 0;
    cameraCabin.targetPitch = cameraCabin.targetPitch || 0;
    
    const yaw = cameraCabin.targetYaw + Math.PI;
    const pitch = cameraCabin.targetPitch;
    
    cameraCabin.target = [
        cameraCabin.position[0] + Math.sin(yaw) * Math.cos(pitch) * 50.0,
        cameraCabin.position[1] + Math.sin(pitch) * 50.0,
        cameraCabin.position[2] - Math.cos(yaw) * Math.cos(pitch) * 50.0
    ];

    // ── UPDATE SPLINE CAMERA POSITION ──
    splineTime += 0.0005;  // Швидкість руху вздовж спліна
    if (splineTime > 1.0) splineTime = 0.0;
    
    const splinePos = getSplinePosition(splineControlPoints, splineTime);
    cameraSpline.position = [splinePos.x, splinePos.y, splinePos.z];
    
    // Дивиться на центр колеса
    cameraSpline.target = [10, 8, -12];

    // Render foreground objects
    renderFlowers(gl, flowerBuffers, flowers, [-60, 0, -60], aPosition, aNormal, aTexCoord, uModel, uObjectColor, uUseTexture, uIsFlower, flowerScales);
    renderClouds(gl, cloudBuffers, t, aPosition, aNormal, aTexCoord, uModel, uObjectColor, uUseTexture, uIsWater, uIsFlower, uIsCloud, uTime);
    renderBirds(gl, birdBuffers, t, aPosition, aNormal, aTexCoord, uModel, uObjectColor, uUseTexture, uIsWater, uIsFlower);

    requestAnimationFrame(render);
}

    render();
}

main();