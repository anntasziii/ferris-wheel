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

    let activeCamera = cameraStatic;

    cameraStatic.position = [0, 20, 35];
    cameraStatic.target   = [0, 0, 0];
    cameraStatic.isOrbit  = false;

    cameraOrbit.target    = [0, 2, 0];  
    cameraOrbit.distance  = 25;
    cameraOrbit.pitch     = 0.4;
    cameraOrbit.targetPitch = 0.4;
    cameraOrbit.isOrbit   = true;

    cameraCabin.isOrbit   = false; 

    // Keyboard input handler
    window.addEventListener("keydown", (e) => {
        if (e.key === "1") activeCamera = cameraStatic;
        if (e.key === "2") activeCamera = cameraOrbit;
        if (e.key === "3") activeCamera = cameraCabin;

        const speed = 1.0;
        if (activeCamera === cameraStatic) {
            if (e.key === "ArrowUp")    { cameraStatic.position[1] += speed; cameraStatic.target[1] += speed; }
            if (e.key === "ArrowDown")  { cameraStatic.position[1] -= speed; cameraStatic.target[1] -= speed; }
            if (e.key === "ArrowLeft")  { cameraStatic.position[0] -= speed; cameraStatic.target[0] -= speed; }
            if (e.key === "ArrowRight") { cameraStatic.position[0] += speed; cameraStatic.target[0] += speed; }
            if (e.key === "w") { cameraStatic.position[2] -= speed; cameraStatic.target[2] -= speed; }
            if (e.key === "s") { cameraStatic.position[2] += speed; cameraStatic.target[2] += speed; }
        }
    });

    // Mouse input handler
    let isDragging = false;
    let lastX = 0;
    let lastY = 0;

    window.addEventListener("mousedown", (e) => {
        isDragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
    });

    window.addEventListener("mouseup", () => {
        isDragging = false;
    });

    window.addEventListener("mousemove", (e) => {
        if (!isDragging) return;
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;

        if (activeCamera.isOrbit) {
            activeCamera.targetYaw   += dx * activeCamera.sensitivity;
            activeCamera.targetPitch += dy * activeCamera.sensitivity;
            activeCamera.targetPitch = Math.max(-1.2, Math.min(1.2, activeCamera.targetPitch));
        } else {
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

    // Update active camera
    activeCamera.update();
    gl.uniformMatrix4fv(uView, false, activeCamera.getViewMatrix());

    // Render skybox
    renderSkybox(gl, skyboxBuffers, skyboxProgram, aPositionSky, uViewSky, uProjectionSky, activeCamera.getViewMatrix(), projection);
    gl.useProgram(program);

    gl.uniformMatrix4fv(uProjection, false, projection);
    gl.uniformMatrix4fv(uView, false, activeCamera.getViewMatrix());
    gl.uniform1i(uIsCloud, 0);
    gl.uniform1i(uIsWater, 0);
    gl.uniform1i(uIsFlower, 0);

    // Render scene objects
    renderTerrain(gl, terrainBuffers, terrain, aPosition, aNormal, aTexCoord, uModel, uObjectColor, uTexture, uUseTexture, grassTexture);

    // Update and render ferris wheel
    const wheelAngle = t * 0.4;
    const wheelPos = [10, 0, -12];

    renderFerrisWheel(gl, ferrisWheel, wheelAngle, wheelPos, aPosition, aNormal, aTexCoord,uModel, uObjectColor, uUseTexture);

    // Update cabin camera position
    const cabinA = wheelAngle;
    cameraCabin.position = [
        wheelPos[0] + Math.cos(cabinA) * 4.0,
        wheelPos[1] + 5.0 + Math.sin(cabinA) * 4.0,
        wheelPos[2]
    ];
    cameraCabin.target = [wheelPos[0], wheelPos[1] + 5.0, wheelPos[2]];

    // Render remaining scene elements
    renderFlowers(gl, flowerBuffers, flowers, [-60, 0, -60], aPosition, aNormal, aTexCoord, uModel, uObjectColor, uUseTexture, uIsFlower);
    renderRiver(gl, riverBuffers, river, [-60, 0, -60], t, aPosition, aNormal, aTexCoord, uModel, uObjectColor, uUseTexture, uIsWater, uTime, waterTexture, uTexture);
    renderPebbles(gl, pebbleBuffers, pebbles, [-60, 0, -60], aPosition, aNormal, aTexCoord, uModel, uObjectColor, uUseTexture, uIsWater);
    renderClouds(gl, cloudBuffers, t, aPosition, aNormal, aTexCoord, uModel, uObjectColor, uUseTexture, uIsWater, uIsFlower, uIsCloud, uTime);
    renderBirds(gl, birdBuffers, t, aPosition, aNormal, aTexCoord,uModel, uObjectColor, uUseTexture, uIsWater, uIsFlower);
    renderTrees(gl, treeBuffers, trees, [-60, 0, -60], aPosition, aNormal, aTexCoord, uModel, uObjectColor, uUseTexture, uIsWater, uIsFlower);

    requestAnimationFrame(render);
}

    render();
}

main();