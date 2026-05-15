// IMPORTS - SCENE OBJECTS
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


// IMPORTS - CONFIG
import { 
    loadConfig, 
    getConfig, 
    setupConfigReloadHotkey,
    onConfigReload,
    validateConfig 
} from "./configLoader.js";

/**
 * @brief Generates a ray from camera through a screen point
 * @param {Float32Array} viewMatrix - Camera view matrix
 * @param {Float32Array} projMatrix - Camera projection matrix
 * @param {number} screenX - Normalized device X coordinate (-1 to 1)
 * @param {number} screenY - Normalized device Y coordinate (-1 to 1)
 * @return {Object} Ray with origin and direction {rayOrigin, rayDirection}
 */
function getRayFromMouse(viewMatrix, projMatrix, screenX, screenY) {
    const projInv = invertMatrix4(projMatrix);
    const viewInv = invertMatrix4(viewMatrix);
    
    const ndcX = screenX;
    const ndcY = screenY;
    const nearZ = -1.0;
    
    const nearWorld = multiplyMatrix4Vec4(viewInv, 
        multiplyMatrix4Vec4(projInv, [ndcX, ndcY, nearZ, 1.0]));
    
    const rayOrigin = [nearWorld[0] / nearWorld[3], 
                      nearWorld[1] / nearWorld[3], 
                      nearWorld[2] / nearWorld[3]];
    
    const farZ = 1.0;
    const farWorld = multiplyMatrix4Vec4(viewInv, 
        multiplyMatrix4Vec4(projInv, [ndcX, ndcY, farZ, 1.0]));
    
    const farPoint = [farWorld[0] / farWorld[3], 
                     farWorld[1] / farWorld[3], 
                     farWorld[2] / farWorld[3]];
    
    const rayDir = normalize3([
        farPoint[0] - rayOrigin[0],
        farPoint[1] - rayOrigin[1],
        farPoint[2] - rayOrigin[2]
    ]);
    
    return { rayOrigin, rayDirection: rayDir };
}

/**
 * @brief Tests intersection between a ray and a sphere
 * @param {Array<number>} rayOrigin - Ray starting point [x, y, z]
 * @param {Array<number>} rayDir - Ray direction (normalized) [x, y, z]
 * @param {Array<number>} sphereCenter - Sphere center [x, y, z]
 * @param {number} sphereRadius - Sphere radius
 * @return {Object} Intersection result {hit: boolean, distance: number}
 */
function raySphereIntersection(rayOrigin, rayDir, sphereCenter, sphereRadius) {
    const oc = [
        rayOrigin[0] - sphereCenter[0],
        rayOrigin[1] - sphereCenter[1],
        rayOrigin[2] - sphereCenter[2]
    ];
    
    const a = dot3(rayDir, rayDir);
    const b = 2.0 * dot3(oc, rayDir);
    const c = dot3(oc, oc) - sphereRadius * sphereRadius;
    
    const discriminant = b * b - 4 * a * c;
    
    if (discriminant < 0) {
        return { hit: false, distance: Infinity };
    }
    
    const t1 = (-b - Math.sqrt(discriminant)) / (2 * a);
    const t2 = (-b + Math.sqrt(discriminant)) / (2 * a);
    
    const t = t1 > 0 ? t1 : (t2 > 0 ? t2 : -1);
    
    return { hit: t > 0, distance: t > 0 ? t : Infinity };
}

/**
 * @brief Inverts a 4x4 matrix
 * @param {Float32Array} m - Input matrix (4x4)
 * @return {Float32Array} Inverted matrix
 */
function invertMatrix4(m) {
    const out = new Float32Array(16);
    const a = m;
    
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
    
    const b00 = a00 * a11 - a01 * a10;
    const b01 = a00 * a12 - a02 * a10;
    const b02 = a00 * a13 - a03 * a10;
    const b03 = a01 * a12 - a02 * a11;
    const b04 = a01 * a13 - a03 * a11;
    const b05 = a02 * a13 - a03 * a12;
    const b06 = a20 * a31 - a21 * a30;
    const b07 = a20 * a32 - a22 * a30;
    const b08 = a20 * a33 - a23 * a30;
    const b09 = a21 * a32 - a22 * a31;
    const b10 = a21 * a33 - a23 * a31;
    const b11 = a22 * a33 - a23 * a32;
    
    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    
    if (!det) { return out; }
    
    det = 1 / det;
    
    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[3] = (a12 * b04 - a11 * b05 - a13 * b03) * det;
    out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[7] = (a10 * b05 - a12 * b02 + a13 * b01) * det;
    out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    out[11] = (a11 * b02 - a10 * b04 - a12 * b00) * det;
    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    out[15] = (a10 * b03 - a11 * b01 + a12 * b00) * det;
    
    return out;
}


/**
 * @brief Multiplies a 4x4 matrix by a 4D vector
 * @param {Float32Array} m - 4x4 matrix
 * @param {Array<number>} v - 4D vector
 * @return {Array<number>} Result vector (4D)
 */
function multiplyMatrix4Vec4(m, v) {
    return [
        m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12] * v[3],
        m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13] * v[3],
        m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14] * v[3],
        m[3] * v[0] + m[7] * v[1] + m[11] * v[2] + m[15] * v[3]
    ];
}

/**
 * @brief Normalizes a 3D vector
 * @param {Array<number>} v - 3D vector [x, y, z]
 * @return {Array<number>} Normalized vector (length = 1)
 */
function normalize3(v) {
    const len = Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
    return [v[0]/len, v[1]/len, v[2]/len];
}

/**
 * @brief Calculates dot product of two 3D vectors
 * @param {Array<number>} a - First 3D vector
 * @param {Array<number>} b - Second 3D vector
 * @return {number} Dot product scalar
 */
function dot3(a, b) {
    return a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
}

// CONSTANTS
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
let wheelPausedAngle = 0;  
let globalTime = 0; 
let wheelTimeOffset = 0;

let treeAutumnStates = [];
let treeAutumnProgress = []; 

/**
 * @brief Renders terrain geometry with grass texture
 * @param {WebGLRenderingContext} gl - WebGL context
 * @param {Object} terrainBuffers - GPU buffers {vbo, nbo, ibo, tbo}
 * @param {Object} terrain - Terrain data {count, vertices, normals, indices}
 * @param {number} aPosition - Position attribute location
 * @param {number} aNormal - Normal attribute location
 * @param {number} aTexCoord - Texture coordinate attribute location
 * @param {number} uModel - Model matrix uniform location
 * @param {number} uObjectColor - Object color uniform location
 * @param {number} uTexture - Texture uniform location
 * @param {number} uUseTexture - Use texture flag uniform location
 * @param {WebGLTexture} grassTexture - Loaded grass texture
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
 * @brief Loads shader source from URL
 * @param {string} url - URL to shader file
 * @return {Promise<string>} Shader source code
 */
async function loadShaderSource(url) {
    const response = await fetch(url);
    return await response.text();
}

/**
 * @brief Loads texture from image file
 * @param {WebGLRenderingContext} gl - WebGL context
 * @param {string} url - Image URL
 * @return {WebGLTexture} Loaded texture
 */
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

/**
 * @brief Loads and compiles shader
 * @param {WebGLRenderingContext} gl - WebGL context
 * @param {number} type - gl.VERTEX_SHADER or gl.FRAGMENT_SHADER
 * @param {string} source - Shader source code
 * @return {WebGLShader} Compiled shader
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
 * @brief Links compiled shaders into program
 * @param {WebGLRenderingContext} gl - WebGL context
 * @param {WebGLShader} vs - Compiled vertex shader
 * @param {WebGLShader} fs - Compiled fragment shader
 * @return {WebGLProgram} Linked program
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
 * @brief Catmull-Rom interpolation for smooth curve approximation
 * @param {number} p0 - First control point value
 * @param {number} p1 - Second control point value
 * @param {number} p2 - Third control point value
 * @param {number} p3 - Fourth control point value
 * @param {number} t - Interpolation parameter (0.0 to 1.0)
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
 * @brief Calculates position on spline at parameter t
 * @param {Array<Object>} controlPoints - Array of {x, y, z} control points
 * @param {number} t - Spline parameter (0.0 to 1.0, wraps)
 * @return {Object} Position {x, y, z} on spline
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
 * @brief Calculates tangent vector on spline at parameter t
 * @param {Array<Object>} controlPoints - Array of {x, y, z} control points
 * @param {number} t - Spline parameter (0.0 to 1.0, wraps)
 * @return {Object} Tangent vector {x, y, z}
 */
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
/**
 * @brief Normalizes a vector object {x, y, z}
 * @param {Object} v - Vector with x, y, z properties
 * @return {Object} Normalized vector object
 */
function normalizeVector(v) {
    const length = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    if (length === 0) return { x: 0, y: 0, z: 1 };
    return {
        x: v.x / length,
        y: v.y / length,
        z: v.z / length
    };
}

/**
 * @brief Calculates target look-at point for camera following spline
 * @param {Object} position - Current position {x, y, z}
 * @param {Object} tangent - Spline tangent {x, y, z}
 * @param {number} distance - Distance to look ahead (default 15.0)
 * @return {Array<number>} Target point [x, y, z]
 */
function getSplineTarget(position, tangent, distance = 15.0) {
    const normalizedTangent = normalizeVector(tangent);
    return [
        position.x + normalizedTangent.x * distance,
        position.y + normalizedTangent.y * distance + 2.0,
        position.z + normalizedTangent.z * distance
    ];
}

/**
 * @brief Creates perspective projection matrix
 * @param {number} fovY - Vertical FOV in radians
 * @param {number} aspect - Width / height ratio
 * @param {number} near - Distance to near clipping plane
 * @param {number} farPlane - Distance to far clipping plane
 * @return {Float32Array} 4x4 perspective projection matrix
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
 * @brief Manages day/night cycle time progression
 * @details Converts real time into normalized day phase for lighting calculations
 */
class TimeManager {
    /**
     * @brief Constructs TimeManager
     * @param {number} cycleDurationSeconds - Total duration of day cycle (default 15.0)
     */
    constructor(cycleDuration = 15.0) {
        this.cycleTime = 0;
        this.cycleDuration = cycleDuration;
        this.dayPhase = 0;
    }

    /**
     * @brief Updates time manager with real elapsed time
     * @param {number} realTimeSeconds - Current time in seconds
     * @return {Object} Time data including phase and light intensity
     */
    update(realTime) {
        this.cycleTime = (realTime % this.cycleDuration) / this.cycleDuration;
        this.dayPhase = this.cycleTime;
        
        return {
            cycleTime: this.cycleTime,
            dayPhase: this.dayPhase,
            lightIntensity: 0.5 + 0.5 * Math.sin(this.cycleTime * Math.PI * 2),
            isMorning: this.dayPhase < 0.25,
            isDay: 0.25 <= this.dayPhase && this.dayPhase < 0.5,
            isEvening: 0.5 <= this.dayPhase && this.dayPhase < 0.75,
            isNight: this.dayPhase >= 0.75
        };
    }
}
/**
 * @brief Aktualizuje parametry slunečního světla (pozice, barva, intenzita)
 * @param {Object} timeData - Časová data
 * @param {Object} uniforms - Shader uniforms
 */
function updateLightParameters(timeManager, gl, uLightPos, uLightColor, uLightIntensity) {
    const phase = timeManager.dayPhase;
    
    const sunAngle = phase * Math.PI * 2;
    const sunHeight = Math.sin(phase * Math.PI) * 40; 
    const sunDistance = 80;
    
    const sunX = Math.cos(sunAngle) * sunDistance;
    const sunY = 20 + sunHeight;
    const sunZ = Math.sin(sunAngle) * sunDistance;
    
    gl.uniform3fv(uLightPos, [sunX, sunY, sunZ]);
    let lightColor = [1.0, 1.0, 1.0];
    
    if (phase < 0.25) {
        const t = phase / 0.25;
        lightColor = [
            0.3 + t * 0.7, 
            0.3 + t * 0.7, 
            1.0 - t * 0.5 
        ];
    } else if (phase < 0.5) {
        const t = (phase - 0.25) / 0.25;
        lightColor = [
            1.0,
            0.8 - t * 0.3, 
            0.5 - t * 0.3 
        ];
    } else if (phase < 0.75) {
        const t = (phase - 0.5) / 0.25;
        lightColor = [
            1.0 - t * 0.8, 
            0.5 - t * 0.4,
            0.2 + t * 0.3 
        ];
    } else {
        lightColor = [0.2, 0.1, 0.5];
    }
    
    gl.uniform3fv(uLightColor, lightColor);
    
    const intensity = 0.3 + Math.sin(phase * Math.PI) * 0.7;
    gl.uniform1f(uLightIntensity, intensity);
}

/**
 * @brief Updates fog parameters based on time of day
 * @param {TimeManager} timeManager - Time management instance
 * @param {WebGLRenderingContext} gl - WebGL context
 * @param {WebGLUniformLocation} uFogMode - Fog mode uniform
 * @param {WebGLUniformLocation} uFogColor - Fog color uniform
 * @param {WebGLUniformLocation} uFogDensity - Fog density uniform
 */
function updateFogParameters(timeManager, gl, uFogMode, uFogColor, uFogDensity) {
    const phase = timeManager.dayPhase;
    
    // Calculate fog color based on time
    let fogColor = [0.45, 0.60, 0.80];
    
    if (phase < 0.2) {
        const t = phase / 0.2;
        fogColor = [0.05 + t * 0.25, 0.10 + t * 0.35, 0.35 + t * 0.30];
    } else if (phase < 0.3) {
        const t = (phase - 0.2) / 0.1;
        fogColor = [0.30 + t * 0.15, 0.45 + t * 0.15, 0.65 + t * 0.15];
    } else if (phase < 0.7) {
        fogColor = [0.45, 0.60, 0.80]; 
    } else if (phase < 0.8) {
        const t = (phase - 0.7) / 0.1;
        fogColor = [0.45 - t * 0.25, 0.60 - t * 0.35, 0.80 - t * 0.30];
    } else {
        const t = (phase - 0.8) / 0.2;
        fogColor = [0.20 - t * 0.15, 0.25 - t * 0.10, 0.50 - t * 0.15];
    }
    
    gl.uniform3fv(uFogColor, fogColor);
    
    let fogDensity = 0.0;
    
    // Calculate fog density (heavier at night and dawn)
    const nightDensity = 0.025;   
    const morningDensity = 0.012; 
    const zeroDensity = 0.0;    

    if (phase < 0.2) {
        const t = phase / 0.2;
        fogDensity = mix(nightDensity, morningDensity, t);
    } else if (phase < 0.3) {
        const t = (phase - 0.2) / 0.1;
        fogDensity = mix(morningDensity, zeroDensity, t);
    } else if (phase < 0.7) {
        fogDensity = zeroDensity; 
    } else if (phase < 0.8) {
        const t = (phase - 0.7) / 0.1;
        fogDensity = mix(zeroDensity, 0.015, t);
    } else {
        const t = (phase - 0.8) / 0.2;
        fogDensity = mix(0.015, nightDensity, t);
    }
    
    gl.uniform1f(uFogDensity, fogDensity);
    
    function mix(a, b, t) {
        return a * (1.0 - t) + b * t;
    }

    gl.uniform1i(uFogMode, 1); 
}

/**
 * @brief Updates sun position and appearance based on time of day
 * @param {TimeManager} timeManager - Time management instance with day phase
 * @param {WebGLRenderingContext} gl - WebGL context
 * @param {Function} renderSunGeometry - Callback function to render sun quad
 * @details Sun moves in an elliptical arc across the sky. Texture blending
 *          transitions between yellow (morning), white (day), orange (evening),
 *          and red (sunset) to match time-of-day lighting.
 */
function updateSunRenderer(timeManager, gl) {
    const phase = timeManager.dayPhase;
    
    const sunAngle = phase * Math.PI * 2;
    const sunHeight = Math.sin(phase * Math.PI) * 50; 
    const sunDistance = 100;
    
    const sunX = Math.cos(sunAngle) * sunDistance;
    const sunY = 20 + sunHeight;
    const sunZ = Math.sin(sunAngle) * sunDistance;
    
    let sunTexture1, sunTexture2, sunBlend;
    
    if (phase < 0.25 || phase >= 0.75) {
        sunTexture1 = sunTextureYellow;
        sunTexture2 = sunTextureOrange;
        sunBlend = Math.abs(Math.sin(phase * Math.PI * 4)) * 0.5;  
    } else if (phase < 0.5) {
        sunTexture1 = sunTextureYellow;
        sunTexture2 = sunTextureYellow;
        sunBlend = 0;
    } else {
        sunTexture1 = sunTextureOrange;
        sunTexture2 = sunTextureRed;
        sunBlend = (phase - 0.5) / 0.25; 
    }
    
    gl.uniform3fv(uSunPos, [sunX, sunY, sunZ]);
    gl.uniform1f(uSunBlend, sunBlend);
    
    drawSun(sunX, sunY, sunZ, sunTexture1, sunTexture2, sunBlend);
}

/**
 * @constant {Array<Object>} River path control points
 * @details Defines the path of the river through the scene using Catmull-Rom
 *          spline interpolation. Points are distributed along a natural-looking
 *          curved path from lower-left to upper-right of the terrain.
 *          Format: each point has {x: number, z: number} coordinates in terrain space.
 */
const RIVER_PTS = [
    { x: 5,  z: 5  }, { x: 15, z: 15 }, { x: 25, z: 28 },
    { x: 36, z: 44 }, { x: 44, z: 56 }, { x: 56, z: 66 },
    { x: 70, z: 72 }, { x: 84, z: 76 }, { x: 100,z: 84 },
    { x: 112,z: 96 },
];


// GLOBAL STATE
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
let uniforms = {};

/**
 * @brief Reinitializes scene with new configuration
 * @param {Object} newConfig - New scene configuration
 * @details Called automatically when config is reloaded (Ctrl+R)
 */
async function reinitializeScene(newConfig) {
    
    // Clean up old terrain buffers
    if (terrain) {
        gl.deleteBuffer(terrainBuffers.vbo);
        gl.deleteBuffer(terrainBuffers.nbo);
        gl.deleteBuffer(terrainBuffers.ibo);
        gl.deleteBuffer(terrainBuffers.tbo);
    }
        
    // Create new terrain with configuration
    const terrainConfig = newConfig.terrain || getConfig('terrain');
    terrain = createTerrain(terrainConfig.gridSize, terrainConfig.gridStep);
    
    // Create terrain GPU buffers
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
    
     // Create scene objects with new configuration
    const flowerConfig = newConfig.flowers || getConfig('flowers');
    flowers = createFlowers(terrain.getHeight, terrain.getBaseHeight, flowerConfig.count, flowerConfig.terrainSize);
    
    const treeConfig = newConfig.terrain || getConfig('terrain');
    trees = createTrees(terrain.getHeight, terrain.getBaseHeight, RIVER_PTS, 80, treeConfig.gridSize);
    
    // Initialize tree animation states
    treeAutumnStates = new Array(trees.length).fill(false);
    treeAutumnProgress = new Array(trees.length).fill(0);
    
    // Create river and pebbles
    river = createRiver(terrain.getBaseHeight, 120);
    pebbles = createRiverPebbles(terrain.getHeight, terrain.getBaseHeight, river);
    
    // Reinitialize collision system
    collisionSystem = new CollisionSystem(
        terrain.getHeight,
        terrain.getBaseHeight,
        120  // terrainSize
    );
    
    // Add trees as collision objects
    for (const tree of trees) {
        collisionSystem.addCollisionObject(tree.x, tree.z, 2.5);
    }
    
    // Add Ferris wheel as collision object
    const wheelConfigInit = getConfig('ferrisWheel');
    collisionSystem.addCollisionObject(
        wheelConfigInit.position[0],
        wheelConfigInit.position[2],
        wheelConfigInit.radius + 5
    );
}

/**
 * @brief Main application initialization and render loop
 * @details Sets up WebGL context, loads shaders and textures, 
 *          initializes scene objects, and starts rendering
 */
async function main() {
    
    // STEP 1: Load configuration
    await loadConfig('./config.json');
    const config = getConfig();

    // STEP 2: Initialize WebGL context
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

    // STEP 3: Initialize scene objects
    const terrainConfig = config.terrain;
    terrain = createTerrain(terrainConfig.gridSize, terrainConfig.gridStep);
    
    const flowerConfig = config.flowers;
    flowers = createFlowers(terrain.getHeight, terrain.getBaseHeight, flowerConfig.count, flowerConfig.terrainSize);
    flowerBuffers = initFlowerBuffers(gl);

    trees = createTrees(terrain.getHeight, terrain.getBaseHeight, RIVER_PTS, 80, terrainConfig.gridSize);
    treeBuffers = initTreeBuffers(gl);
    
    treeAutumnStates = new Array(trees.length).fill(false);
    treeAutumnProgress = new Array(trees.length).fill(0);

    river = createRiver(terrain.getBaseHeight, 120);
    riverBuffers = initRiverBuffers(gl, river);

    pebbles = createRiverPebbles(terrain.getHeight, terrain.getBaseHeight, river);
    pebbleBuffers = initPebbleBuffers(gl);
    waterTexture = await loadTexture(gl, "./textures/water.jpg");

    blikiTexture = await loadTexture(gl, "./textures/bliki.jpg");
    paperTexture = await loadTexture(gl, "./textures/paper.jpg");

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
        120  
    );
    
    for (const tree of trees) {
        collisionSystem.addCollisionObject(tree.x, tree.z, 2.5);
    }
    
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

    // STEP 4: Initialize cameras    
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

    // Spline control points for camera animation
    const splineControlPoints = [
        { x: -10, y: 15, z: 10 },
        { x: -20, y: 20, z: -30 }, 
        { x: 40, y: 25, z: -10 }, 
        { x: 50, y: 25, z: 50 }, 
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
    
    // STEP 5: Load and compile shaders
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

    // Load skybox shaders
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

    const uLightColor = gl.getUniformLocation(program, "uLightColor");
    const uLightIntensity = gl.getUniformLocation(program, "uLightIntensity");
    
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

    // STEP 6: Register configuration reload callback    
    onConfigReload((newConfig) => {
        console.log('🔄 Aplikuji novou konfiguraci...', newConfig);
        reinitializeScene(newConfig);
    });

    // STEP 7: Setup config reload hotkey
    setupConfigReloadHotkey('r', './config.json');

    // STEP 8: Keyboard input handler
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
        cameraStatic.position = collisionSystem.resolveCollisions(cameraStatic.position);
    });

    // STEP 9: Mouse input handler
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
        
        // Handle Ferris wheel picking
        const wheelConfig = getConfig('ferrisWheel');
        
        const wheelCenterWorld = [
            wheelConfig.position[0] + 60, 
            wheelConfig.position[1],
            wheelConfig.position[2] + 60  
        ];
        
        const camPos = activeCamera.position;
        
        const distFromCenter = Math.sqrt(clickScreenX * clickScreenX + clickScreenY * clickScreenY);
        
        if (distFromCenter < 0.25) {
            const wheelConfig = getConfig('ferrisWheel');
            const currentAngle = wheelIsRotating 
                ? (globalTime - wheelTimeOffset) * wheelConfig.rotationSpeed 
                : wheelPausedAngle;
            
            if (wheelIsRotating) {
                wheelPausedAngle = currentAngle;
                wheelIsRotating = false;
            } else {
                wheelIsRotating = true;
                wheelTimeOffset = globalTime - (wheelPausedAngle / wheelConfig.rotationSpeed);
            }
        } else {
            console.log('Click too far from center');
        }
        
         // Handle tree picking
        const viewMatrix = activeCamera.getViewMatrix();
        const aspect = canvas.width / canvas.height;
        const projMatrix = makePerspective(Math.PI / 3, aspect, 0.1, 200.0);
        
        let closestTreeIndex = -1;
        let closestTreeScreenDist = Infinity;
        
        const treeTerrainOffset = [-60, 0, -60]; 
        
        for (let i = 0; i < trees.length; i++) {
            const tree = trees[i];
            
            const worldX = tree.x + treeTerrainOffset[0]; 
            const worldY = (tree.y || 0) + treeTerrainOffset[1];
            const worldZ = tree.z + treeTerrainOffset[2]; 
            
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
            
            if (screenDist < 0.15 && screenDist < closestTreeScreenDist) {
                closestTreeScreenDist = screenDist;
                closestTreeIndex = i;
            }
        }
        
        if (closestTreeIndex !== -1) {
            treeAutumnStates[closestTreeIndex] = !treeAutumnStates[closestTreeIndex];
        }
        
        // Handle flower picking
        let closestIndex = -1;
        let closestScreenDist = Infinity;
        
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

   // STEP 10: Main render loop
    const timeManager = new TimeManager(15.0);
    function render() {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        const t = performance.now() * 0.001;
        globalTime = t; 
        const timeData = timeManager.update(t);
    
        // Update lighting and atmosphere
        updateLightParameters(timeData, gl, uLightPos, uLightColor, uLightIntensity);
        updateFogParameters(timeData, gl, uFogMode, uFogColor, uFogDensity);
        
        gl.uniform1f(uTime, t);
        gl.uniform1i(uIsWater, 0);

        // Update flower animations
        const animationSpeed = 0.08;
        for (let i = 0; i < flowerScales.length; i++) {
            flowerScales[i] += (flowerTargetScales[i] - flowerScales[i]) * animationSpeed;
        }

        // Update tree autumn animations
        const treeAnimSpeed = 0.04; 
        for (let i = 0; i < treeAutumnProgress.length; i++) {
            if (treeAutumnStates[i]) {
                treeAutumnProgress[i] = Math.min(1, treeAutumnProgress[i] + treeAnimSpeed); 
            } else {
                treeAutumnProgress[i] = Math.max(0, treeAutumnProgress[i] - treeAnimSpeed); 
            }
        }
        
        if (treeAutumnProgress.some(p => p > 0 && p < 1)) {
        }

        gl.uniform1i(uFogMode, 2);

        // Update lighting mode from configuration
        const sceneConfig = getConfig('scene');
        
        if (lightingMode === 0) {
            gl.clearColor(...sceneConfig.backgroundColor, 1.0);
        } else if (lightingMode === 1) {
            gl.clearColor(0.05, 0.05, 0.15, 1.0); 
        } else if (lightingMode === 2) {
            gl.clearColor(0.25, 0.15, 0.1, 1.0);
        }

        // Update spotlight
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
 
        // Update point lights
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
 
        // Update camera and render
        activeCamera.update();
        gl.uniformMatrix4fv(uView, false, activeCamera.getViewMatrix());

        // Render skybox
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

        // Grass animation
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

        // Render scene objects
        renderTrees(gl, treeBuffers, trees, [-60, 0, -60], aPosition, aNormal, aTexCoord, uModel, uObjectColor, uUseTexture, uIsWater, uIsFlower, treeAutumnProgress);
        renderRiver(gl, riverBuffers, river, [-60, 0, -60], t, aPosition, aNormal, aTexCoord, uModel, uObjectColor, uUseTexture, uIsWater, uTime, waterTexture, uTexture, uIsWater);
        renderPebbles(gl, pebbleBuffers, pebbles, [-60, 0, -60],  aPosition, aNormal, aTexCoord, uModel, uObjectColor, uUseTexture, uIsWater, pebbleTexture, pebbleSpecTexture, uTexture, uSpecularMap, uIsPebble);

        const wheelCenterPosLocal = wheelConfig.position;
        
        const wheelCenterPosWorld = [
            wheelConfig.position[0] + 60, 
            wheelConfig.position[1],
            wheelConfig.position[2] + 60 
        ];
        
        const wheelAngle = wheelIsRotating ? (t - wheelTimeOffset) * wheelConfig.rotationSpeed : wheelPausedAngle;
        
        renderFerrisWheel(gl, ferrisWheel, wheelAngle, wheelCenterPosLocal, aPosition, aNormal, aTexCoord, uModel, uObjectColor, uUseTexture, cabinLightsOn);

        const WHEEL_RADIUS = wheelConfig.radius;
        const CAMERA_DISTANCE = 16.0; 
        const CAMERA_Z_OFFSET = 1.0;
        const cabinA = wheelAngle;
        
        // Update cabin camera
        const cameraAngle = cabinA + Math.PI;
        
        cameraCabin.position = [
            wheelCenterPosLocal[0] + Math.cos(cameraAngle) * CAMERA_DISTANCE,
            wheelCenterPosLocal[1] + WHEEL_RADIUS + Math.sin(cameraAngle) * WHEEL_RADIUS,
            wheelCenterPosLocal[2] + CAMERA_Z_OFFSET  
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

        // Update spline camera
        splineTime += 0.0005;
        if (splineTime > 1.0) splineTime = 0.0;
        
        const splinePos = getSplinePosition(splineControlPoints, splineTime);
        cameraSpline.position = [splinePos.x, splinePos.y, splinePos.z];
        const splineTangent = getSplineTangent(splineControlPoints, splineTime);
        cameraSpline.target = getSplineTarget(splinePos, splineTangent, 15.0);

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        gl.uniform1i(uUseLanternMultitex, 1);

        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, blikiTexture);
        gl.uniform1i(uBlikiTexture, 2); 

        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, paperTexture);
        gl.uniform1i(uPaperTexture, 3);

        renderLanterns(gl, lanternBuffers, aPosition, aNormal, aTexCoord, uModel, uObjectColor,uUseTexture, uIsFlower, uIsWater, uIsCloud, uAlpha, uUseLanternMultitex, uIsLantern);

        gl.uniform1i(uUseLanternMultitex, 0);

        const identityMatrix = new Float32Array([1,0,0, 0,1,0, 0,0,1]);
        gl.uniformMatrix3fv(uTexMatrix, false, identityMatrix);
        
        
        // Render remaining objects
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