import { Camera } from "./scene/camera.js";
import { createTerrain } from "./objects/terrain.js";
import { createFlowers, initFlowerBuffers, renderFlowers } from "./objects/flowers.js";
import { createRiver, initRiverBuffers, renderRiver, createRiverPebbles, initPebbleBuffers, renderPebbles } from "./objects/river.js";


let terrainVBO;
let terrainNBO;
let terrainIBO;
let terrain;

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
        -30, 0, -30, 1
    ]);
    gl.uniformMatrix4fv(uModel, false, model);
    gl.drawElements(gl.TRIANGLES, terrain.count, gl.UNSIGNED_SHORT, 0);

    gl.uniform1i(uUseTexture, 0);
}

async function loadShaderSource(url) {
    const response = await fetch(url);
    return await response.text();
}

function loadTexture(gl, url) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0,
        gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 128, 0, 255]));

    const image = new Image();
    image.src = url;
    image.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

        const isPOT = (v) => v > 0 && (v & (v - 1)) === 0;
        if (isPOT(image.width) && isPOT(image.height)) {
            gl.generateMipmap(gl.TEXTURE_2D);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        } else {
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

function drawCabin(cabin, modelMatrix, color) {

    gl.bindBuffer(gl.ARRAY_BUFFER, cabin.vertexBuffer);
    gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, cabin.normalBuffer);
    gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aNormal);

    gl.uniformMatrix4fv(uModel, false, modelMatrix);
    gl.uniform3fv(uObjectColor, color);

    gl.drawArrays(gl.TRIANGLES, 0, cabin.count);
}

async function main() {
    const canvas = document.getElementById("glCanvas");
    const gl = canvas.getContext("webgl");

     if (!gl) {
        alert("WebGL not supported");
        return;
    }

    const terrain = createTerrain(60, 1);
    const flowers = createFlowers(terrain.getHeight, 120, 60);
    const flowerBuffers = initFlowerBuffers(gl);
    const river = createRiver(terrain.getHeight, 60);
    const riverBuffers = initRiverBuffers(gl, river);

    const pebbles = createRiverPebbles(terrain.getHeight, river);
    const pebbleBuffers = initPebbleBuffers(gl);
    const waterTexture = await loadTexture(gl, "./textures/water.jpg");

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

    const cameraStatic = new Camera();
    const cameraOrbit = new Camera();
    const cameraCabin = new Camera();

    let activeCamera = cameraStatic;

    cameraStatic.position = [0, 2, 6];
    cameraOrbit.position = [6, 2, 0];
    cameraCabin.position = [0, 0.5, 2];

    window.addEventListener("keydown", (e) => {

        if (e.key === "1") activeCamera = cameraStatic;
        if (e.key === "2") activeCamera = cameraOrbit;
        if (e.key === "3") activeCamera = cameraCabin;

    });

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

        activeCamera.targetYaw += dx * activeCamera.sensitivity;
        activeCamera.targetPitch += dy * activeCamera.sensitivity;

        activeCamera.targetPitch = Math.max(
            -1.2,
            Math.min(1.2, activeCamera.targetPitch)
        );
    });

    if (!gl) {
        alert("WebGL not supported");
        return;
    }

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.enable(gl.DEPTH_TEST);

    const vsSource = await loadShaderSource("./shaders/basic/vertex.glsl");
    const fsSource = await loadShaderSource("./shaders/basic/fragment.glsl");

    const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
    const program = createProgram(gl, vs, fs);
    gl.useProgram(program);

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

    gl.uniform3fv(uLightPos, [5, 5, 5]);
    gl.uniform3fv(uViewPos, [0, 0, 4]);

    const cubeVertices = new Float32Array([
        // front
        -0.5,-0.5, 0.5,  0.5,-0.5, 0.5,  0.5, 0.5, 0.5,
        -0.5,-0.5, 0.5,  0.5, 0.5, 0.5, -0.5, 0.5, 0.5,

        -0.5,-0.5,-0.5, -0.5, 0.5,-0.5,  0.5, 0.5,-0.5,
        -0.5,-0.5,-0.5,  0.5, 0.5,-0.5,  0.5,-0.5,-0.5,

        -0.5,-0.5,-0.5, -0.5,-0.5, 0.5, -0.5, 0.5, 0.5,
        -0.5,-0.5,-0.5, -0.5, 0.5, 0.5, -0.5, 0.5,-0.5,

        0.5,-0.5,-0.5,  0.5, 0.5,-0.5,  0.5, 0.5, 0.5,
        0.5,-0.5,-0.5,  0.5, 0.5, 0.5,  0.5,-0.5, 0.5,

        -0.5, 0.5,-0.5, -0.5, 0.5, 0.5,  0.5, 0.5, 0.5,
        -0.5, 0.5,-0.5,  0.5, 0.5, 0.5,  0.5, 0.5,-0.5,

        -0.5,-0.5,-0.5,  0.5,-0.5,-0.5,  0.5,-0.5, 0.5,
        -0.5,-0.5,-0.5,  0.5,-0.5, 0.5, -0.5,-0.5, 0.5
    ]);

    const cubeNormals = new Float32Array([
        0,0,1, 0,0,1, 0,0,1,
        0,0,1, 0,0,1, 0,0,1,

        0,0,-1, 0,0,-1, 0,0,-1,
        0,0,-1, 0,0,-1, 0,0,-1,

        -1,0,0, -1,0,0, -1,0,0,
        -1,0,0, -1,0,0, -1,0,0,

        1,0,0, 1,0,0, 1,0,0,
        1,0,0, 1,0,0, 1,0,0,

        0,1,0, 0,1,0, 0,1,0,
        0,1,0, 0,1,0, 0,1,0,

        0,-1,0, 0,-1,0, 0,-1,0,
        0,-1,0, 0,-1,0, 0,-1,0
    ]);

    const cubeNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, cubeNormals, gl.STATIC_DRAW);

    const cubeBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, cubeVertices, gl.STATIC_DRAW);

    const groundVertices = new Float32Array([
        -5,0,-5, 5,0,-5, 5,0,5,
        -5,0,-5, 5,0,5, -5,0,5
    ]);

    const groundBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, groundBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, groundVertices, gl.STATIC_DRAW);

    const view = new Float32Array([
        1,0,0,0,
        0,1,0,0,
        0,0,1,0,
        0,0,-4,1
    ]);

    const projection = new Float32Array([
        1,0,0,0,
        0,1,0,0,
        0,0,-1,-1,
        0,0,-0.2,0
    ]);

    gl.uniformMatrix4fv(uView, false, view);
    gl.uniformMatrix4fv(uProjection, false, projection);

    gl.clearColor(0,0,0,1);

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const t = performance.now() * 0.001;  
    gl.uniform1f(uTime, t);      
    gl.uniform1i(uIsWater, 0);

    renderTerrain(gl, terrainBuffers, terrain, aPosition, aNormal, aTexCoord,
              uModel, uObjectColor, uTexture, uUseTexture, grassTexture);

    cameraOrbit.position = [
        Math.cos(t * 0.5) * 6,
        2,
        Math.sin(t * 0.5) * 6
    ];

    activeCamera.update();
    gl.uniformMatrix4fv(uView, false, activeCamera.getViewMatrix());

    const wheelAngle = t * 0.5;

    const hubModel = new Float32Array([
        Math.cos(wheelAngle),0,Math.sin(wheelAngle),0,
        0,1,0,0,
        -Math.sin(wheelAngle),0,Math.cos(wheelAngle),0,
        0,0,0,1
    ]);

    gl.bindBuffer(gl.ARRAY_BUFFER, cubeNormalBuffer);
    gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aNormal);

    gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffer);
    gl.vertexAttribPointer(positionLocation,3,gl.FLOAT,false,0,0);
    gl.enableVertexAttribArray(positionLocation);

    gl.uniformMatrix4fv(uModel,false,hubModel);
    gl.uniform3fv(uObjectColor,[0.2,0.8,0.2]);
    gl.drawArrays(gl.TRIANGLES, 0, 36);

    const radius = 2.5;

    for (let i = 0; i < 8; i++) {

        const a = i / 8 * Math.PI * 2;

        const x = Math.cos(a + wheelAngle) * radius;
        const z = Math.sin(a + wheelAngle) * radius;

        let model = new Float32Array([
            1,0,0,0,
            0,1,0,0,
            0,0,1,0,
            x,0,z,1
        ]);

        const c = Math.cos(-(a + wheelAngle));
        const s = Math.sin(-(a + wheelAngle));

        model[0] = c; model[2] = s;
        model[8] = -s; model[10] = c;

        gl.uniformMatrix4fv(uModel, false, model);
        gl.uniform3fv(uObjectColor, [0.7, 0.7, 0.7]);

        gl.drawArrays(gl.TRIANGLES, 0, 36);

        if (i === 0) {
            cameraCabin.position = [x, 0.5, z];
            cameraCabin.target = [0, 0, 0];
        }
    }
    renderFlowers(gl, flowerBuffers, flowers, [-30, 0, -30], aPosition, aNormal, aTexCoord, uModel, uObjectColor, uUseTexture);
    renderRiver(gl, riverBuffers, river, [-30, 0, -30], t, aPosition, aNormal, aTexCoord, uModel, uObjectColor, uUseTexture, uIsWater, uTime, waterTexture, uTexture);
    renderPebbles(gl, pebbleBuffers, pebbles, [-30, 0, -30], aPosition, aNormal, aTexCoord, uModel, uObjectColor, uUseTexture, uIsWater);

    requestAnimationFrame(render);
}

    render();
}

main();