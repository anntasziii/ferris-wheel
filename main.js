import { Camera } from "./scene/camera.js";
import { createTerrain } from "./objects/terrain.js";
import { createFlowers, initFlowerBuffers, renderFlowers } from "./objects/flowers.js";
import { createRiver, initRiverBuffers, renderRiver, createRiverPebbles, initPebbleBuffers, renderPebbles } from "./objects/river.js";
import { initSkybox, renderSkybox } from "./objects/skybox.js";
import { initCloudBuffers, renderClouds } from "./objects/clouds.js";
import { initFerrisWheel, renderFerrisWheel, CABIN_COUNT } from "./objects/ferrisWheel.js";
import { initBirdBuffers, renderBirds } from "./objects/birds.js";
import { createTrees, initTreeBuffers, renderTrees } from "./objects/trees.js";
import { initLanternBuffers, renderLanterns } from "./objects/lights.js";
import { CollisionSystem } from "./scene/collisions.js";


// ══════════════════════════════════════════════════════════════════════════════
// ✅ NOVÁ: Import konfiguračního systému
// ══════════════════════════════════════════════════════════════════════════════
import { 
    loadConfig, 
    getConfig, 
    setupConfigReloadHotkey,
    onConfigReload,
    validateConfig 
} from "./configLoader.js";

let terrainVBO;
let terrainNBO;
let terrainIBO;
let terrain;
let lanternBuffers;
let pebbleTexture;
let pebbleSpecTexture;
let uTexMatrix;
let collisionSystem;
let wheelIsRotating = true;

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

function getSplineTangent(controlPoints, t) {
    const n = controlPoints.length;
    const scaledT = t * n;
    const segmentIndex = Math.floor(scaledT) % n;
    const localT = scaledT - Math.floor(scaledT);
    
    const p0 = controlPoints[(segmentIndex - 1 + n) % n];
    const p1 = controlPoints[segmentIndex];
    const p2 = controlPoints[(segmentIndex + 1) % n];
    const p3 = controlPoints[(segmentIndex + 2) % n];
    
    const catmullRomDerivative = (p0, p1, p2, p3, t) => {
        const t2 = t * t;
        return 0.5 * (
            (-p0 + p2) +
            (2 * p0 - 5 * p1 + 4 * p2 - p3) * 2 * t +
            (-p0 + 3 * p1 - 3 * p2 + p3) * 3 * t2
        );
    };
    
    return {
        x: catmullRomDerivative(p0.x, p1.x, p2.x, p3.x, localT),
        y: catmullRomDerivative(p0.y, p1.y, p2.y, p3.y, localT),
        z: catmullRomDerivative(p0.z, p1.z, p2.z, p3.z, localT)
    };
}

function normalizeVector(v) {
    const length = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    if (length === 0) return { x: 0, y: 0, z: 1 };
    return {
        x: v.x / length,
        y: v.y / length,
        z: v.z / length
    };
}

function getSplineTarget(position, tangent, distance = 15.0) {
    const normalizedTangent = normalizeVector(tangent);
    return [
        position.x + normalizedTangent.x * distance,
        position.y + normalizedTangent.y * distance + 2.0,
        position.z + normalizedTangent.z * distance
    ];
}

function makePerspective(fovY, aspect, near, far) {
    const f = 1.0 / Math.tan(fovY / 2);
    return new Float32Array([
        f / aspect, 0, 0, 0,
        0, f, 0, 0,
        0, 0, (far + near) / (near - far), -1,
        0, 0, (2 * far * near) / (near - far), 0
    ]);
}

class TimeManager {
    constructor(cycleDuration = 15.0) {  // ✅ Змінено на 15 сек
        this.cycleTime = 0;
        this.cycleDuration = cycleDuration;
        this.dayPhase = 0;
    }

    update(realTime) {
        this.cycleTime = (realTime % this.cycleDuration) / this.cycleDuration;
        this.dayPhase = this.cycleTime;
        
        return {
            cycleTime: this.cycleTime,
            dayPhase: this.dayPhase,
            // Sine波 для плавних переходів
            lightIntensity: 0.5 + 0.5 * Math.sin(this.cycleTime * Math.PI * 2),
            // Різні фази дня
            isMorning: this.dayPhase < 0.25,
            isDay: 0.25 <= this.dayPhase && this.dayPhase < 0.5,
            isEvening: 0.5 <= this.dayPhase && this.dayPhase < 0.75,
            isNight: this.dayPhase >= 0.75
        };
    }
}

function updateLightParameters(timeManager, gl, uLightPos, uLightColor, uLightIntensity) {
    const phase = timeManager.dayPhase;
    
    // ☀️ ПОЗИЦІЯ СОНЦЯ (по небу)
    const sunAngle = phase * Math.PI * 2;
    const sunHeight = Math.sin(phase * Math.PI) * 40;  // 0→40→0
    const sunDistance = 80;
    
    const sunX = Math.cos(sunAngle) * sunDistance;
    const sunY = 20 + sunHeight;
    const sunZ = Math.sin(sunAngle) * sunDistance;
    
    gl.uniform3fv(uLightPos, [sunX, sunY, sunZ]);
    
    // 🎨 КОЛІР СВІТЛА (теплий→жовтий→вечірній→темний)
    let lightColor = [1.0, 1.0, 1.0];
    
    if (phase < 0.25) {
        // Ранок: синій→жовтий
        const t = phase / 0.25;
        lightColor = [
            0.3 + t * 0.7,  // R: 0.3→1.0
            0.3 + t * 0.7,  // G: 0.3→1.0
            1.0 - t * 0.5   // B: 1.0→0.5
        ];
    } else if (phase < 0.5) {
        // День: жовтий→помаранчевий
        const t = (phase - 0.25) / 0.25;
        lightColor = [
            1.0,
            0.8 - t * 0.3,  // G: 0.8→0.5
            0.5 - t * 0.3   // B: 0.5→0.2
        ];
    } else if (phase < 0.75) {
        // Вечір: помаранчевий→темно-синій
        const t = (phase - 0.5) / 0.25;
        lightColor = [
            1.0 - t * 0.8,  // R: 1.0→0.2
            0.5 - t * 0.4,  // G: 0.5→0.1
            0.2 + t * 0.3   // B: 0.2→0.5
        ];
    } else {
        // Ніч: темно-синій (зіркова ніч)
        lightColor = [0.2, 0.1, 0.5];
    }
    
    gl.uniform3fv(uLightColor, lightColor);
    
    // 💡 ІНТЕНСИВНІСТЬ СВІТЛА
    const intensity = 0.3 + Math.sin(phase * Math.PI) * 0.7;  // 0.3→1.0→0.3
    gl.uniform1f(uLightIntensity, intensity);
}



function updateFogParameters(timeManager, gl, uFogMode, uFogColor, uFogDensity) {
    const phase = timeManager.dayPhase;
    
    // 🌫️ КОЛІР ТУМАНУ
    let fogColor = [0.45, 0.60, 0.80];
    
    if (phase < 0.2) {
        const t = phase / 0.2;
        fogColor = [0.05 + t * 0.25, 0.10 + t * 0.35, 0.35 + t * 0.30];
    } else if (phase < 0.3) {
        const t = (phase - 0.2) / 0.1;
        fogColor = [0.30 + t * 0.15, 0.45 + t * 0.15, 0.65 + t * 0.15];
    } else if (phase < 0.7) {
        fogColor = [0.45, 0.60, 0.80]; // Чистий денний колір
    } else if (phase < 0.8) {
        const t = (phase - 0.7) / 0.1;
        fogColor = [0.45 - t * 0.25, 0.60 - t * 0.35, 0.80 - t * 0.30];
    } else {
        const t = (phase - 0.8) / 0.2;
        fogColor = [0.20 - t * 0.15, 0.25 - t * 0.10, 0.50 - t * 0.15];
    }
    
    gl.uniform3fv(uFogColor, fogColor);
    
    // 🌫️ ЩІЛЬНІСТЬ ТУМАНУ
    let fogDensity = 0.0;
    
    const nightDensity = 0.025;   // Максимальна густота вночі
    const morningDensity = 0.012; // Легкий туман на світанку
    const zeroDensity = 0.0;      // ПОВНА ВІДСУТНІСТЬ туману вдень

    if (phase < 0.2) {
        // Ранок: від нічного до ранкового
        const t = phase / 0.2;
        fogDensity = mix(nightDensity, morningDensity, t);
    } else if (phase < 0.3) {
        // Перехід до дня: туман повністю розсіюється
        const t = (phase - 0.2) / 0.1;
        fogDensity = mix(morningDensity, zeroDensity, t);
    } else if (phase < 0.7) {
        // ДЕНЬ: Туману немає
        fogDensity = zeroDensity; 
    } else if (phase < 0.8) {
        // Вечір: починає з'являтися
        const t = (phase - 0.7) / 0.1;
        fogDensity = mix(zeroDensity, 0.015, t);
    } else {
        // Ніч: густішає до максимуму
        const t = (phase - 0.8) / 0.2;
        fogDensity = mix(0.015, nightDensity, t);
    }
    
    gl.uniform1f(uFogDensity, fogDensity);
    
    // Внутрішня функція міксування
    function mix(a, b, t) {
        return a * (1.0 - t) + b * t;
    }

    // Вмикаємо експоненціальний туман (Mode 1), 
    // бо він найбільш плавно реагує на параметр Density
    gl.uniform1i(uFogMode, 1); 
}

function updateSunRenderer(timeManager, gl) {
    const phase = timeManager.dayPhase;
    
    // 🌞 ПОЗИЦІЯ СОНЦЯ (ellipse)
    const sunAngle = phase * Math.PI * 2;
    const sunHeight = Math.sin(phase * Math.PI) * 50;  // 0→50→0 по Y
    const sunDistance = 100;
    
    const sunX = Math.cos(sunAngle) * sunDistance;
    const sunY = 20 + sunHeight;
    const sunZ = Math.sin(sunAngle) * sunDistance;
    
    // 🎨 BLEND ДВОХ ТЕКСТУР СОНЦЯ
    let sunTexture1, sunTexture2, sunBlend;
    
    if (phase < 0.25 || phase >= 0.75) {
        // Ранок/Ніч: жовте-помаранчеве сонце
        sunTexture1 = sunTextureYellow;
        sunTexture2 = sunTextureOrange;
        sunBlend = Math.abs(Math.sin(phase * Math.PI * 4)) * 0.5;  // Пульсація
    } else if (phase < 0.5) {
        // День: яскраво-жовте сонце
        sunTexture1 = sunTextureYellow;
        sunTexture2 = sunTextureYellow;
        sunBlend = 0;
    } else {
        // Вечір: червоне-помаранчеве сонце (закат)
        sunTexture1 = sunTextureOrange;
        sunTexture2 = sunTextureRed;
        sunBlend = (phase - 0.5) / 0.25;  // 0→1
    }
    
    // Встав позицію та текстури
    gl.uniform3fv(uSunPos, [sunX, sunY, sunZ]);
    gl.uniform1f(uSunBlend, sunBlend);
    
    // Малюй сонце як велику сферу
    drawSun(sunX, sunY, sunZ, sunTexture1, sunTexture2, sunBlend);
}


const RIVER_PTS = [
    { x: 5,  z: 5  }, { x: 15, z: 15 }, { x: 25, z: 28 },
    { x: 36, z: 44 }, { x: 44, z: 56 }, { x: 56, z: 66 },
    { x: 70, z: 72 }, { x: 84, z: 76 }, { x: 100,z: 84 },
    { x: 112,z: 96 },
];

// ══════════════════════════════════════════════════════════════════════════════
// ✅ NOVÁ: Funkcionalita pro reinicializaci scény (volaná při reload config)
// ══════════════════════════════════════════════════════════════════════════════

let gl, canvas;
let terrainBuffers;
let flowers, flowerBuffers;
let trees, treeBuffers;
let river, riverBuffers;
let pebbles, pebbleBuffers;
let skyboxBuffers, ferrisWheel, birdBuffers;
let waterTexture, grassTexture;
let program, skyboxProgram;
let cloudBuffers;

let blikiTexture, paperTexture;

// Uložit všechny uniform lokace pro snadný přístup
let uniforms = {};

/**
 * @brief Reinicializuje scénu s novou konfigurací
 * @details Volá se automaticky když je config přenačten (Ctrl+R)
 * @param {Object} newConfig - Nová konfigurace
 */
async function reinitializeScene(newConfig) {
    
    // Vyčisti stare buffery pokud existují
    if (terrain) {
        gl.deleteBuffer(terrainBuffers.vbo);
        gl.deleteBuffer(terrainBuffers.nbo);
        gl.deleteBuffer(terrainBuffers.ibo);
        gl.deleteBuffer(terrainBuffers.tbo);
    }
    
    // Vytvoř nový terén s konfigovanými parametry
    const terrainConfig = newConfig.terrain || getConfig('terrain');
    terrain = createTerrain(terrainConfig.gridSize, terrainConfig.gridStep);
    
    // Vytvoř terénní buffery
    terrainBuffers = {
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
    
    // Vytvoř objekty s novými parametry
    const flowerConfig = newConfig.flowers || getConfig('flowers');
    flowers = createFlowers(terrain.getHeight, terrain.getBaseHeight, flowerConfig.count, flowerConfig.terrainSize);
    
    const treeConfig = newConfig.terrain || getConfig('terrain');
    trees = createTrees(terrain.getHeight, terrain.getBaseHeight, RIVER_PTS, 80, treeConfig.gridSize);
    
    river = createRiver(terrain.getBaseHeight, 120);
    pebbles = createRiverPebbles(terrain.getHeight, terrain.getBaseHeight, river);
    
// ══════════════════════════════════════════════════════════════════════════════
    // ✅ PUNKT 19.1: COLLISION SYSTEM
    // ══════════════════════════════════════════════════════════════════════════════
    
    collisionSystem = new CollisionSystem(
        terrain.getHeight,
        terrain.getBaseHeight,
        120  // terrainSize
    );
    
    // Додай дерева як collision objects
    for (const tree of trees) {
        collisionSystem.addCollisionObject(tree.x, tree.z, 2.5);
    }
    
    // Додай колесо огляду
    const wheelConfigInit = getConfig('ferrisWheel');
    collisionSystem.addCollisionObject(
        wheelConfigInit.position[0],
        wheelConfigInit.position[2],
        wheelConfigInit.radius + 5
    );
    
    console.log('✅ Collision system aktualizován');
}

async function main() {
    // ══════════════════════════════════════════════════════════════════════════════
    // ✅ KROK 1: Načti konfiguraci na samém začátku
    // ══════════════════════════════════════════════════════════════════════════════
    
    console.log('📋 Načítám konfiguraci...');
    await loadConfig('./config.json');
    const config = getConfig();
    
    // Validuj konfiguraci
    if (!validateConfig(config)) {
        console.error('❌ Konfigurace není validní!');
        return;
    }
    
    console.log('✅ Konfigurace úspěšně načtena', config);

    // ══════════════════════════════════════════════════════════════════════════════
    // ✅ KROK 2: Setup canvas a WebGL (NEZMĚNĚNO)
    // ══════════════════════════════════════════════════════════════════════════════
    
    canvas = document.getElementById("glCanvas");
    gl = canvas.getContext("webgl");

    if (!gl) {
        alert("WebGL not supported");
        return;
    }

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // ══════════════════════════════════════════════════════════════════════════════
    // ✅ KROK 3: Inicializuj scénu s parametry z config
    // ══════════════════════════════════════════════════════════════════════════════
    
    const terrainConfig = config.terrain;
    terrain = createTerrain(terrainConfig.gridSize, terrainConfig.gridStep);
    
    const flowerConfig = config.flowers;
    flowers = createFlowers(terrain.getHeight, terrain.getBaseHeight, flowerConfig.count, flowerConfig.terrainSize);
    flowerBuffers = initFlowerBuffers(gl);

    trees = createTrees(terrain.getHeight, terrain.getBaseHeight, RIVER_PTS, 80, terrainConfig.gridSize);
    treeBuffers = initTreeBuffers(gl);

    river = createRiver(terrain.getBaseHeight, 120);
    riverBuffers = initRiverBuffers(gl, river);

    pebbles = createRiverPebbles(terrain.getHeight, terrain.getBaseHeight, river);
    pebbleBuffers = initPebbleBuffers(gl);
    waterTexture = await loadTexture(gl, "./textures/water.jpg");

    blikiTexture = await loadTexture(gl, "./textures/bliki.jpg");
    paperTexture = await loadTexture(gl, "./textures/paper.jpg");

    // Приклад завантаження
    pebbleTexture = await loadTexture(gl, "./textures/pebble.jpg");
    pebbleSpecTexture = await loadTexture(gl, "./textures/pebble_spec.jpg");

    const birdTexture = await loadTexture(gl, "./textures/bird.jpg");
    const grassAnimationSheet = grassTexture;

    skyboxBuffers = initSkybox(gl);
    ferrisWheel = initFerrisWheel(gl);
    birdBuffers = initBirdBuffers(gl);

    collisionSystem = new CollisionSystem(
        terrain.getHeight,
        terrain.getBaseHeight,
        120  // terrainSize
    );
    
    // Додай дерева як collision objects
    for (const tree of trees) {
        collisionSystem.addCollisionObject(tree.x, tree.z, 2.5);
    }
    
    // Додай колесо огляду
    const wheelConfigCollision = getConfig('ferrisWheel');
    collisionSystem.addCollisionObject(
        wheelConfigCollision.position[0],
        wheelConfigCollision.position[2],
        wheelConfigCollision.radius + 5
    );
    
    // Create terrain buffers
    terrainBuffers = {
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

    // ══════════════════════════════════════════════════════════════════════════════
    // ✅ KROK 4: Initialize cameras (NEZMĚNĚNO)
    // ══════════════════════════════════════════════════════════════════════════════
    
    const cameraStatic = new Camera();
    const cameraOrbit = new Camera();
    const cameraCabin = new Camera();
    const cameraSpline = new Camera();

    let activeCamera = cameraStatic;
    let lightingMode = 0;
    let cabinLightsOn = false;
    let flowerScales = new Array(flowers.length).fill(1.0);
    let flowerTargetScales = new Array(flowers.length).fill(1.0);
    let selectedFlowerIndex = -1;
    let draggedFlowerIndex = -1;
    let splineTime = 0;

const splineControlPoints = [
    { x: -10, y: 15, z: 10 },
    { x: -20, y: 20, z: -30 },
    { x: 40, y: 25, z: -20 }, 
    { x: 45, y: 18, z: 10 },  
    { x: 40, y: 20, z: 40 },  
    { x: 25, y: 15, z: 50 },
];

    cameraStatic.position = [0, 10, 35];
    cameraStatic.target   = [0, 0, 0];
    cameraStatic.isOrbit  = false;

    cameraOrbit.target    = [0, 2, 0];  
    cameraOrbit.distance  = 25;
    cameraOrbit.pitch     = 0.4;
    cameraOrbit.targetPitch = 0.4;
    cameraOrbit.isOrbit   = true;
    cameraOrbit.position  = [0, 0, 0];  

    cameraCabin.isOrbit   = false;
    cameraSpline.isOrbit  = false;
    
    // ══════════════════════════════════════════════════════════════════════════════
    // ✅ KROK 5: Load a compile shaders (NEZMĚNĚNO)
    // ══════════════════════════════════════════════════════════════════════════════
    
    const vsSource = await loadShaderSource("./shaders/basic/vertex.glsl");
    const fsSource = await loadShaderSource("./shaders/basic/fragment.glsl");

    const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
    program = createProgram(gl, vs, fs);
    gl.useProgram(program);

    // Get attribute and uniform locations
    const aTexCoord = gl.getAttribLocation(program, "aTexCoord");
    const uTexture = gl.getUniformLocation(program, "uTexture");
    const uUseTexture = gl.getUniformLocation(program, "uUseTexture");
    const uIsBird = gl.getUniformLocation(program, "uIsBird");

    grassTexture = loadTexture(gl, "./textures/grass.jpg");

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

    const uSpotlightPos = gl.getUniformLocation(program, "uSpotlightPos");
    const uSpotlightDir = gl.getUniformLocation(program, "uSpotlightDir");
    const uSpotlightColor = gl.getUniformLocation(program, "uSpotlightColor");
    const uSpotlightIntensity = gl.getUniformLocation(program, "uSpotlightIntensity");
    const uSpotlightAngle = gl.getUniformLocation(program, "uSpotlightAngle");

    const uPointLightPos = gl.getUniformLocation(program, "uPointLightPos");
    const uPointLightColor = gl.getUniformLocation(program, "uPointLightColor");
    const uPointLightIntensity = gl.getUniformLocation(program, "uPointLightIntensity");
    const uPointLightRadius = gl.getUniformLocation(program, "uPointLightRadius");

    const uUseLanternMultitex = gl.getUniformLocation(program, "uUseLanternMultitex");
    const uIsLantern = gl.getUniformLocation(program, "uIsLantern");
    const uPaperTexture = gl.getUniformLocation(program, "uPaperTexture");
    const uBlikiTexture = gl.getUniformLocation(program, "uBlikiTexture");
    const uAlpha = gl.getUniformLocation(program, "uAlpha");

    const uSpecularMap = gl.getUniformLocation(program, "uSpecularMap");
    const uIsPebble = gl.getUniformLocation(program, "uIsPebble");

    // Load and compile skybox shaders
    const vsSkySource = await loadShaderSource("./shaders/skybox/vertex.glsl");
    const fsSkySource = await loadShaderSource("./shaders/skybox/fragment.glsl");
    const vsSky = createShader(gl, gl.VERTEX_SHADER, vsSkySource);
    const fsSky = createShader(gl, gl.FRAGMENT_SHADER, fsSkySource);
    skyboxProgram = createProgram(gl, vsSky, fsSky);

    const aPositionSky  = gl.getAttribLocation(skyboxProgram, "aPosition");
    const uViewSky      = gl.getUniformLocation(skyboxProgram, "uView");
    const uProjectionSky = gl.getUniformLocation(skyboxProgram, "uProjection");
    const uLightingMode = gl.getUniformLocation(skyboxProgram, "uLightingMode");

    const uGrassAnimationSheet = gl.getUniformLocation(program, "uGrassAnimationSheet");
    const uGrassGridX = gl.getUniformLocation(program, "uGrassGridX");
    const uGrassGridY = gl.getUniformLocation(program, "uGrassGridY");
    const uGrassCurrentFrame = gl.getUniformLocation(program, "uGrassCurrentFrame");
    const uUseGrassAnimation = gl.getUniformLocation(program, "uUseGrassAnimation");

    const uFogMode = gl.getUniformLocation(program, "uFogMode");

    // ✅ PUNKT 18a: ДИНАМІЧНІ СВІТЛА
    const uLightColor = gl.getUniformLocation(program, "uLightColor");
    const uLightIntensity = gl.getUniformLocation(program, "uLightIntensity");
    
    // ✅ PUNKT 18b: ДИНАМІЧНА ТУМАНЕНЬ
    const uFogColor = gl.getUniformLocation(program, "uFogColor");
    const uFogDensity = gl.getUniformLocation(program, "uFogDensity");

    cloudBuffers = initCloudBuffers(gl);
    const uIsCloud = gl.getUniformLocation(program, "uIsCloud");

    uTexMatrix = gl.getUniformLocation(program, "uTexMatrix");

    cloudBuffers = initCloudBuffers(gl);

    uTexMatrix = gl.getUniformLocation(program, "uTexMatrix");

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
    lanternBuffers = initLanternBuffers(gl);

    // ══════════════════════════════════════════════════════════════════════════════
    // ✅ KROK 6: Registruj config reload callback
    // ══════════════════════════════════════════════════════════════════════════════
    
    onConfigReload((newConfig) => {
        console.log('🔄 Aplikuji novou konfiguraci...', newConfig);
        reinitializeScene(newConfig);
    });

    // ══════════════════════════════════════════════════════════════════════════════
    // ✅ KROK 7: Setup hotkey pro reload (Ctrl+R / Cmd+R)
    // ══════════════════════════════════════════════════════════════════════════════
    
    setupConfigReloadHotkey('r', './config.json');

    // ══════════════════════════════════════════════════════════════════════════════
    // ✅ KROK 8: Keyboard input handler (NEZMĚNĚNO)
    // ══════════════════════════════════════════════════════════════════════════════
    
    window.addEventListener("keydown", (e) => {
        if (e.key === "1") activeCamera = cameraStatic;
        if (e.key === "2") activeCamera = cameraOrbit;
        if (e.key === "3") activeCamera = cameraCabin;
        if (e.key === "4") activeCamera = cameraSpline; 

        if (e.key === "q" || e.key === "Q") lightingMode = 0;
        if (e.key === "w" || e.key === "W") lightingMode = 1;
        if (e.key === "e" || e.key === "E") lightingMode = 2;

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

    // ══════════════════════════════════════════════════════════════════════════════
    // ✅ KROK 9: Mouse input handler (NEZMĚNĚNO - bez změn)
    // ══════════════════════════════════════════════════════════════════════════════
    
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
            
            const worldX = flower.x - 60;
            const worldY = flower.y;
            const worldZ = flower.z - 60;
            
            const viewX = viewMatrix[0] * worldX + viewMatrix[4] * worldY + viewMatrix[8] * worldZ + viewMatrix[12];
            const viewY = viewMatrix[1] * worldX + viewMatrix[5] * worldY + viewMatrix[9] * worldZ + viewMatrix[13];
            const viewZ = viewMatrix[2] * worldX + viewMatrix[6] * worldY + viewMatrix[10] * worldZ + viewMatrix[14];
            
            if (viewZ >= 0) continue;
            
            const projX = projMatrix[0] * viewX + projMatrix[8] * viewZ;
            const projY = projMatrix[5] * viewY + projMatrix[9] * viewZ;
            const projW = projMatrix[11] * viewZ + projMatrix[15];
            
            const screenX = projX / projW;
            const screenY = projY / projW;
            
            const screenDist = Math.sqrt(
                (screenX - clickScreenX) * (screenX - clickScreenX) +
                (screenY - clickScreenY) * (screenY - clickScreenY)
            );
            
            if (screenDist < 0.2 && screenDist < closestScreenDist) {
                closestScreenDist = screenDist;
                closestIndex = i;
            }
        }
        
        draggedFlowerIndex = closestIndex;
    });

    window.addEventListener("mouseup", (e) => {
        isDragging = false;
        draggedFlowerIndex = -1;
        
        if (Math.abs(lastX - clickStartX) < 5 && Math.abs(lastY - clickStartY) < 5) {
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
                
                const hasYellowCenter = flower.type.center[0] === 1.0 && 
                                        flower.type.center[1] === 0.9 && 
                                        flower.type.center[2] === 0.0;
                
                if (!hasYellowCenter) continue;
                
                const worldX = flower.x - 60;
                const worldY = flower.y;
                const worldZ = flower.z - 60;
                
                const viewX = viewMatrix[0] * worldX + viewMatrix[4] * worldY + viewMatrix[8] * worldZ + viewMatrix[12];
                const viewY = viewMatrix[1] * worldX + viewMatrix[5] * worldY + viewMatrix[9] * worldZ + viewMatrix[13];
                const viewZ = viewMatrix[2] * worldX + viewMatrix[6] * worldY + viewMatrix[10] * worldZ + viewMatrix[14];
                
                if (viewZ >= 0) continue;
                
                const projX = projMatrix[0] * viewX + projMatrix[8] * viewZ;
                const projY = projMatrix[5] * viewY + projMatrix[9] * viewZ;
                const projW = projMatrix[11] * viewZ + projMatrix[15];
                
                const screenX = projX / projW;
                const screenY = projY / projW;
                
                const screenDist = Math.sqrt(
                    (screenX - clickScreenX) * (screenX - clickScreenX) +
                    (screenY - clickScreenY) * (screenY - clickScreenY)
                );
                
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

        if (draggedFlowerIndex !== -1) {
            const flower = flowers[draggedFlowerIndex];
            
            const cameraPos = activeCamera.position;
            const cameraTarget = activeCamera.target;
            
            const forwardX = cameraTarget[0] - cameraPos[0];
            const forwardZ = cameraTarget[2] - cameraPos[2];
            const forwardLen = Math.sqrt(forwardX * forwardX + forwardZ * forwardZ);
            const forwardNormX = forwardX / forwardLen;
            const forwardNormZ = forwardZ / forwardLen;
            
            const rightX = -forwardNormZ;
            const rightZ = forwardNormX;
            
            flower.x += dx * 0.05 * rightX;
            flower.z += dx * 0.05 * rightZ;
            
            flower.x -= dy * 0.05 * forwardNormX;
            flower.z -= dy * 0.05 * forwardNormZ;
            
            flower.x = Math.max(0, Math.min(120, flower.x));
            flower.z = Math.max(0, Math.min(120, flower.z));
            
            console.log("🌼 Flower dragged", draggedFlowerIndex, "position:", [flower.x.toFixed(1), flower.z.toFixed(1)]);
        } else if (activeCamera.isOrbit) {
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

    // ══════════════════════════════════════════════════════════════════════════════
    // ✅ RENDER LOOP - (TÉMĚŘ NEZMĚNĚNO)
    // ══════════════════════════════════════════════════════════════════════════════
    
    const timeManager = new TimeManager(15.0);
    function render() {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        const t = performance.now() * 0.001;
        const timeData = timeManager.update(t);
    
        // Оновлюй все по часу
        updateLightParameters(timeData, gl, uLightPos, uLightColor, uLightIntensity);
        updateFogParameters(timeData, gl, uFogMode, uFogColor, uFogDensity);
        // updateSkybox(timeData, gl, skyboxTextures);
        // updateSunRenderer(timeData, gl);
        
        gl.uniform1f(uTime, t);
        gl.uniform1i(uIsWater, 0);

        const animationSpeed = 0.08;
        for (let i = 0; i < flowerScales.length; i++) {
            flowerScales[i] += (flowerTargetScales[i] - flowerScales[i]) * animationSpeed;
        }

        gl.uniform1i(uFogMode, 2);

        // ── UPDATE LIGHTING MODE (Z CONFIG) ──
// ── UPDATE LIGHTING MODE (Z CONFIG) ──
        const sceneConfig = getConfig('scene');
        
        if (lightingMode === 0) {
            // ✅ Light now updated by updateLightParameters()
            gl.clearColor(...sceneConfig.backgroundColor, 1.0);
        } else if (lightingMode === 1) {
            gl.clearColor(0.05, 0.05, 0.15, 1.0); 
        } else if (lightingMode === 2) {
            gl.clearColor(0.25, 0.15, 0.1, 1.0);
        }

        gl.uniform3fv(uSpotlightPos, activeCamera.position);
        const spotDir = [
            activeCamera.target[0] - activeCamera.position[0],
            activeCamera.target[1] - activeCamera.position[1],
            activeCamera.target[2] - activeCamera.position[2]
        ];
        const spotDirLen = Math.sqrt(spotDir[0]*spotDir[0] + spotDir[1]*spotDir[1] + spotDir[2]*spotDir[2]);
        gl.uniform3fv(uSpotlightDir, [spotDir[0]/spotDirLen, spotDir[1]/spotDirLen, spotDir[2]/spotDirLen]);
        gl.uniform3fv(uSpotlightColor, [1.0, 1.0, 0.8]);
        gl.uniform1f(uSpotlightIntensity, 0.6);
        gl.uniform1f(uSpotlightAngle, Math.cos(Math.PI / 8.0));
 
        // ── UPDATE POINT LIGHTS (Z CONFIG) ──
        const lightsConfig = getConfig('lights');
        const wheelConfig = getConfig('ferrisWheel');
        const wheelCenterPos = wheelConfig.position;
        const numLights = lightsConfig.lanternCount;
        const lightRadius = lightsConfig.lanternDistance;
        const lanternHeight = lightsConfig.lanternHeight;
        const lanternTopY = wheelCenterPos[1] + lanternHeight + 0.5;
 
        const activeLanternIndex = Math.floor((t * 0.5) % numLights);
        let activeLanternPos = [...wheelCenterPos];
 
        for (let i = 0; i < numLights; i++) {
            const angle = (Math.PI * 2 / numLights) * i;
            const lanternX = wheelCenterPos[0] + Math.cos(angle) * lightRadius;
            const lanternY = lanternTopY;
            const lanternZ = wheelCenterPos[2] + Math.sin(angle) * lightRadius;
            
            if (i === activeLanternIndex) {
                activeLanternPos = [lanternX, lanternY, lanternZ];
            }
        }
 
        gl.uniform3fv(uPointLightPos, activeLanternPos);
        gl.uniform3fv(uPointLightColor, [1.0, 0.9, 0.4]);
        const pulsing = Math.sin(t * 3.0) * 0.5 + 0.5;
        gl.uniform1f(uPointLightIntensity, pulsing * 1.5);
        gl.uniform1f(uPointLightRadius, 40.0);
 
        // ✅ PUNKT 19.1: Применяй колізії для камери
        if (activeCamera === cameraStatic || activeCamera === cameraSpline) {
            // Статична камера - обмежуємо позицію
            activeCamera.position = collisionSystem.resolveCollisions(activeCamera.position);
        }
        
        // Orbit камера - лише bounds check (не близько до об'єктів)
        if (activeCamera === cameraOrbit) {
            const orbPos = activeCamera.position;
            if (!collisionSystem.isWithinTerrainBounds(orbPos[0], orbPos[2])) {
                activeCamera.position = collisionSystem.clampToTerrainBounds(orbPos);
            }
        }
        
        activeCamera.update();
        gl.uniformMatrix4fv(uView, false, activeCamera.getViewMatrix());

       gl.useProgram(skyboxProgram);
        gl.uniform1f(uLightingMode, lightingMode);
        
        const phase = timeData.dayPhase;
        const sunX = 80 - phase * 160;
        const sunY = -0 + Math.sin(phase * Math.PI) * 80;
        const sunZ = -80 - phase * 80;
        
        const uLightPosSky = gl.getUniformLocation(skyboxProgram, "uLightPos");
        gl.uniform3fv(uLightPosSky, [sunX, sunY, sunZ]);
        
        const uDayPhaseSky = gl.getUniformLocation(skyboxProgram, "uDayPhase");
        gl.uniform1f(uDayPhaseSky, phase);

        renderSkybox(gl, skyboxBuffers, skyboxProgram, aPositionSky, uViewSky, uProjectionSky, activeCamera.getViewMatrix(), projection);
        
        gl.useProgram(program);
        updateLightParameters(timeData, gl, uLightPos, uLightColor, uLightIntensity);

        gl.uniformMatrix4fv(uProjection, false, projection);
        gl.uniformMatrix4fv(uView, false, activeCamera.getViewMatrix());
        gl.uniform1i(uIsCloud, 0);
        gl.uniform1i(uIsWater, 0);
        gl.uniform1i(uIsFlower, 0);

        // ── GRASS ANIMATION (punkt 15b) ──
        const grassAnimSpeed = 8.0;
        const grassFrameIndex = Math.floor((t * grassAnimSpeed) % 16);
        
        gl.uniform1i(uUseGrassAnimation, 1);
        gl.uniform1i(uGrassGridX, 4);
        gl.uniform1i(uGrassGridY, 4);
        gl.uniform1i(uGrassCurrentFrame, grassFrameIndex);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, grassAnimationSheet);
        gl.uniform1i(uGrassAnimationSheet, 0);

        renderTerrain(gl, terrainBuffers, terrain, aPosition, aNormal, aTexCoord, uModel, uObjectColor, uTexture, uUseTexture, grassTexture);
        gl.uniform1i(uUseGrassAnimation, 0);

        renderTrees(gl, treeBuffers, trees, [-60, 0, -60], aPosition, aNormal, aTexCoord, uModel, uObjectColor, uUseTexture, uIsWater, uIsFlower);
        renderRiver(gl, riverBuffers, river, [-60, 0, -60], t, aPosition, aNormal, aTexCoord, uModel, uObjectColor, uUseTexture, uIsWater, uTime, waterTexture, uTexture, uIsWater);
        renderPebbles(gl, pebbleBuffers, pebbles, [-60, 0, -60],  aPosition, aNormal, aTexCoord, uModel, uObjectColor, uUseTexture, uIsWater, pebbleTexture, pebbleSpecTexture, uTexture, uSpecularMap, uIsPebble);

        const wheelAngle = wheelIsRotating ? t * wheelConfig.rotationSpeed : 0;
        renderFerrisWheel(gl, ferrisWheel, wheelAngle, wheelCenterPos, aPosition, aNormal, aTexCoord, uModel, uObjectColor, uUseTexture, cabinLightsOn);

        const WHEEL_RADIUS = wheelConfig.radius;
        const CAMERA_DISTANCE = 16.0; 
        const CAMERA_Z_OFFSET = 1.0;
        const cabinA = wheelAngle;
        
        const cameraAngle = cabinA + Math.PI;
        
        cameraCabin.position = [
            wheelCenterPos[0] + Math.cos(cameraAngle) * CAMERA_DISTANCE,
            wheelCenterPos[1] + WHEEL_RADIUS + Math.sin(cameraAngle) * WHEEL_RADIUS,
            wheelCenterPos[2] + CAMERA_Z_OFFSET  
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

        splineTime += 0.0005;
        if (splineTime > 1.0) splineTime = 0.0;
        
        const splinePos = getSplinePosition(splineControlPoints, splineTime);
        cameraSpline.position = [splinePos.x, splinePos.y, splinePos.z];
        const splineTangent = getSplineTangent(splineControlPoints, splineTime);
        cameraSpline.target = getSplineTarget(splinePos, splineTangent, 15.0);

        // ════════════════════════════════════════════════════════════════════════
        // ✨ RENDER LANTERNS WITH MULTITEXTURING ✨
        // ════════════════════════════════════════════════════════════════════════
        
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        // Кажемо шейдеру використовувати спеціальний режим для ліхтарів
        gl.uniform1i(uUseLanternMultitex, 1);

        // Прив'язуємо бліки до TEXTURE2
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, blikiTexture);
        gl.uniform1i(uBlikiTexture, 2); 

        // Прив'язуємо папір до TEXTURE3
        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, paperTexture);
        gl.uniform1i(uPaperTexture, 3);

        // Малюємо
        renderLanterns(gl, lanternBuffers, aPosition, aNormal, aTexCoord, uModel, uObjectColor,uUseTexture, uIsFlower, uIsWater, uIsCloud, uAlpha, uUseLanternMultitex, uIsLantern);

        // ПІСЛЯ малювання ліхтарів ОБОВ'ЯЗКОВО вимикаємо цей режим
        gl.uniform1i(uUseLanternMultitex, 0);

        const identityMatrix = new Float32Array([1,0,0, 0,1,0, 0,0,1]);
        gl.uniformMatrix3fv(uTexMatrix, false, identityMatrix);
        
        // RENDER FLOWERS, CLOUDS, BIRDS
        
        renderFlowers(gl, flowerBuffers, flowers, [-60, 0, -60], aPosition, aNormal, aTexCoord, uModel, uObjectColor, uUseTexture, uIsFlower, flowerScales);
        renderClouds(gl, cloudBuffers, t, aPosition, aNormal, aTexCoord, uModel, uObjectColor, uUseTexture, uIsWater, uIsFlower, uIsCloud, uTime);
        renderBirds(gl, birdBuffers, t, aPosition, aNormal, aTexCoord, uModel, uObjectColor, uUseTexture, uIsWater, uIsFlower, uIsBird, birdTexture, uTexture);
        
        gl.disable(gl.BLEND);

        requestAnimationFrame(render);
    }

    render();
}

function getTextureMatrix(t) {
    const angle = t * 0.2;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return new Float32Array([
        c, s, 0,
       -s, c, 0,
        0, 0, 1
    ]);
}

main();