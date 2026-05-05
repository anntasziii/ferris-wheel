const CLOUD_CONFIGS = [
    { x: -20, y: 45, z: -20, speed: 0.8,  offset: 0.0 },
    { x:  15, y: 50, z: -30, speed: 0.6,  offset: 2.1 },
    { x: -5,  y: 42, z:  10, speed: 0.9,  offset: 4.3 },
    { x:  25, y: 48, z:   8, speed: 0.7,  offset: 1.5 },
    { x: -30, y: 46, z:  -5, speed: 0.5,  offset: 3.2 },
    { x:  5,  y: 52, z: -40, speed: 0.75, offset: 5.1 },
    { x: -40, y: 44, z:  20, speed: 0.65, offset: 1.8 },
    { x:  35, y: 49, z:  25, speed: 0.55, offset: 6.3 },
    { x: -15, y: 47, z:  35, speed: 0.7,  offset: 2.7 },
    { x:  20, y: 51, z: -15, speed: 0.85, offset: 0.9 },
    { x: -50, y: 43, z: -10, speed: 0.6,  offset: 3.8 },
    { x:  40, y: 53, z: -35, speed: 0.45, offset: 7.1 },
    { x:  -8, y: 55, z: -50, speed: 0.7,  offset: 4.5 },
    { x:  30, y: 44, z:  40, speed: 0.8,  offset: 1.2 },
    { x: -25, y: 50, z:  50, speed: 0.5,  offset: 8.3 },
];

const CLOUD_PARTS = [
    { ox: 0,    oy: 0,    oz: 0,    sx: 16.0, sy: 4.0, sz: 9.0  },
    { ox: -7.0, oy: -0.3, oz: 0.2,  sx: 12.0, sy: 3.5, sz: 7.5  },
    { ox:  7.0, oy: -0.2, oz: -0.2, sx: 13.0, sy: 3.8, sz: 8.0  },
    { ox:  0.5, oy:  2.0, oz: 0.1,  sx:  8.0, sy: 3.0, sz: 6.0  },
    { ox:  0.2, oy: -0.5, oz:  2.0, sx: 10.0, sy: 3.2, sz: 5.5  },
    { ox: -2.5, oy:  1.5, oz: -1.5, sx:  7.0, sy: 2.5, sz: 5.0  },
];

function createCloudQuad() {
    const vertices = new Float32Array([
        -0.5, 0, -0.5,
         0.5, 0, -0.5,
         0.5, 0,  0.5,
        -0.5, 0, -0.5,
         0.5, 0,  0.5,
        -0.5, 0,  0.5,
    ]);
    const normals = new Float32Array([
        0,1,0, 0,1,0, 0,1,0,
        0,1,0, 0,1,0, 0,1,0,
    ]);
    const texcoords = new Float32Array([
        0,0, 1,0, 1,1,
        0,0, 1,1, 0,1,
    ]);
    return { vertices, normals, texcoords };
}

export function initCloudBuffers(gl) {
    const geo = createCloudQuad();

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, geo.vertices, gl.STATIC_DRAW);

    const nbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nbo);
    gl.bufferData(gl.ARRAY_BUFFER, geo.normals, gl.STATIC_DRAW);

    const tbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tbo);
    gl.bufferData(gl.ARRAY_BUFFER, geo.texcoords, gl.STATIC_DRAW);

    return { vbo, nbo, tbo, count: 6 };
}

export function renderClouds(gl, cloudBuffers, t,
                              aPosition, aNormal, aTexCoord,
                              uModel, uObjectColor, uUseTexture, uIsWater, uIsFlower, uIsCloud, uTime) {
    gl.uniform1i(uIsWater, 0);
    gl.uniform1i(uIsFlower, 0);
    gl.uniform1i(uUseTexture, 0);
    gl.uniform1i(uIsCloud, 1);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);

    gl.bindBuffer(gl.ARRAY_BUFFER, cloudBuffers.vbo);
    gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, cloudBuffers.nbo);
    gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aNormal);

    if (aTexCoord >= 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, cloudBuffers.tbo);
        gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(aTexCoord);
    }

    for (const cloud of CLOUD_CONFIGS) {
        const wx = cloud.x + Math.sin(t * cloud.speed + cloud.offset) * 6.0;
        const wy = cloud.y + Math.sin(t * 0.08 + cloud.offset) * 0.3;
        const wz = cloud.z + Math.cos(t * cloud.speed * 0.5 + cloud.offset) * 2.0;

        for (const part of CLOUD_PARTS) {
            const model = new Float32Array([
                part.sx, 0, 0, 0,
                0, part.sy, 0, 0,
                0, 0, part.sz, 0,
                wx + part.ox, wy + part.oy, wz + part.oz, 1
            ]);
            gl.uniformMatrix4fv(uModel, false, model);
            gl.uniform3fv(uObjectColor, [0.95, 0.88, 0.82]);
            gl.drawArrays(gl.TRIANGLES, 0, cloudBuffers.count);
        }
    }

    gl.uniform1i(uIsCloud, 0);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
}