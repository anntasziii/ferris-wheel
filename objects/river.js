const controlPoints = [
    { x:  5, z:  2 },
    { x: 10, z:  8 },
    { x: 14, z: 15 },
    { x: 18, z: 22 },
    { x: 22, z: 28 },
    { x: 28, z: 33 },
    { x: 35, z: 36 },
    { x: 42, z: 38 },
    { x: 50, z: 42 },
    { x: 56, z: 48 },
];


function buildPath(stepsPerSegment = 20) {
    const path = [];
    for (let i = 0; i < controlPoints.length - 1; i++) {
        const p0 = controlPoints[Math.max(0, i - 1)];
        const p1 = controlPoints[i];
        const p2 = controlPoints[i + 1];
        const p3 = controlPoints[Math.min(controlPoints.length - 1, i + 2)];

        for (let s = 0; s < stepsPerSegment; s++) {
            const t = s / stepsPerSegment;
            const t2 = t * t;
            const t3 = t2 * t;
            const x = 0.5 * ((2*p1.x) + (-p0.x+p2.x)*t + (2*p0.x-5*p1.x+4*p2.x-p3.x)*t2 + (-p0.x+3*p1.x-3*p2.x+p3.x)*t3);
            const z = 0.5 * ((2*p1.z) + (-p0.z+p2.z)*t + (2*p0.z-5*p1.z+4*p2.z-p3.z)*t2 + (-p0.z+3*p1.z-3*p2.z+p3.z)*t3);
            path.push({ x, z });
        }
    }
    path.push(controlPoints[controlPoints.length - 1]);
    return path;
}

export function createRiver(getHeight, terrainSize = 60) {
    const vertices  = [];
    const normals   = [];
    const texcoords = [];
    const indices   = [];

    const path = buildPath(20);
    const width = 5.0; 

    for (let i = 0; i < path.length; i++) {
        const p = path[i];
        const prev = path[Math.max(0, i - 1)];
        const next = path[Math.min(path.length - 1, i + 1)];
        const dx = next.x - prev.x;
        const dz = next.z - prev.z;
        const len = Math.sqrt(dx*dx + dz*dz) || 1;

        const px = -dz / len * width * 0.5;
        const pz =  dx / len * width * 0.5;

        const y = getHeight(p.x, p.z) + 1.05;
        const t = i / (path.length - 1);

        vertices.push(p.x + px, y, p.z + pz);
        vertices.push(p.x - px, y, p.z - pz);
        normals.push(0, 1, 0,  0, 1, 0);
        texcoords.push(t * 30, 0,  t * 30, 3);
    }

    for (let i = 0; i < path.length - 1; i++) {
        const i0 = i*2, i1 = i*2+1, i2 = i*2+2, i3 = i*2+3;
        indices.push(i0, i1, i2);
        indices.push(i1, i3, i2);
    }

    return {
        vertices:  new Float32Array(vertices),
        normals:   new Float32Array(normals),
        texcoords: new Float32Array(texcoords),
        indices:   new Uint16Array(indices),
        count:     indices.length,
        path, width,
    };
}

export function createRiverPebbles(getHeight, river) {
    const pebbles = [];
    const path = river.path;
    const width = river.width;

    for (let i = 0; i < path.length; i += 4) {
        const p = path[i];
        const prev = path[Math.max(0, i - 1)];
        const next = path[Math.min(path.length - 1, i + 1)];
        const dx = next.x - prev.x;
        const dz = next.z - prev.z;
        const len = Math.sqrt(dx*dx + dz*dz) || 1;

        const px = -dz / len;
        const pz =  dx / len;

        const count = 1 + Math.floor(Math.abs(Math.sin(i * 1.7)) * 2);

        for (let j = 0; j < count; j++) {
            const jitter = Math.sin(i * 3.7 + j * 7.3) * 0.3;
            const offset = width * 0.5 + jitter; // БЕЗ j * щось

            const lx = p.x + px * offset;
            const lz = p.z + pz * offset;
            pebbles.push({
                x: lx, y: getHeight(lx, lz) + 0.02,
                z: lz,
                scaleX: 0.08 + Math.abs(Math.sin(i * 2.1 + j)) * 0.18,
                scaleY: 0.12 + Math.abs(Math.cos(i + j * 3)) * 0.1, 
                scaleZ: 0.08 + Math.abs(Math.sin(i * 1.3 + j * 2)) * 0.15,
                angle: Math.sin(i * 1.1 + j) * Math.PI,
                seed: i * 10 + j
            });

            const rx = p.x - px * offset;
            const rz = p.z - pz * offset;
            pebbles.push({
                x: rx, y: getHeight(rx, rz) + 0.02,
                z: rz,
                scaleX: 0.08 + Math.abs(Math.cos(i * 1.7 + j)) * 0.18,
                scaleY: 0.12 + Math.abs(Math.sin(i * 2 + j)) * 0.1, 
                scaleZ: 0.08 + Math.abs(Math.cos(i + j * 1.5)) * 0.15,
                angle: Math.cos(i * 0.9 + j) * Math.PI,
                seed: i * 10 + j + 1000
            });
        }
    }
    return pebbles;
}

export function initPebbleBuffers(gl) {
    const vertices = [];
    const normals  = [];
    const texcoords = [];

    const latSegs = 8;
    const lonSegs = 12;

    for (let lat = 0; lat < latSegs; lat++) {
        const a1 = (lat / latSegs) * Math.PI;
        const a2 = ((lat + 1) / latSegs) * Math.PI;

        for (let lon = 0; lon < lonSegs; lon++) {
            const b1 = (lon / lonSegs) * Math.PI * 2;
            const b2 = ((lon + 1) / lonSegs) * Math.PI * 2;

            const pts = [
                [Math.sin(a1)*Math.cos(b1), Math.cos(a1)*0.6, Math.sin(a1)*Math.sin(b1)],
                [Math.sin(a1)*Math.cos(b2), Math.cos(a1)*0.6, Math.sin(a1)*Math.sin(b2)],
                [Math.sin(a2)*Math.cos(b1), Math.cos(a2)*0.6, Math.sin(a2)*Math.sin(b1)],
                [Math.sin(a2)*Math.cos(b2), Math.cos(a2)*0.6, Math.sin(a2)*Math.sin(b2)],
            ];

            [[0,2,1],[1,2,3]].forEach(tri => {
                tri.forEach(idx => {
                    vertices.push(...pts[idx]);
                    normals.push(...pts[idx]); 
                    texcoords.push(0, 0);
                });
            });
        }
    }

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    const nbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

    const tbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texcoords), gl.STATIC_DRAW);

    return { vbo, nbo, tbo, count: vertices.length / 3 };
}

export function initRiverBuffers(gl, river) {
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, river.vertices, gl.STATIC_DRAW);

    const nbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nbo);
    gl.bufferData(gl.ARRAY_BUFFER, river.normals, gl.STATIC_DRAW);

    const tbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tbo);
    gl.bufferData(gl.ARRAY_BUFFER, river.texcoords, gl.STATIC_DRAW);

    const ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, river.indices, gl.STATIC_DRAW);

    return { vbo, nbo, tbo, ibo };
}

export function renderRiver(gl, riverBuffers, river, terrainOffset, t,
                             aPosition, aNormal, aTexCoord,
                             uModel, uObjectColor, uUseTexture, uIsWater, uTime,
                             waterTexture, uTexture) {
    gl.uniform1i(uIsWater, 0);
    gl.uniform1f(uTime, t);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, waterTexture);
    gl.uniform1i(uTexture, 0);
    gl.uniform1i(uUseTexture, 0); 
    gl.uniform1i(uIsWater, 1);

    gl.bindBuffer(gl.ARRAY_BUFFER, riverBuffers.vbo);
    gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, riverBuffers.nbo);
    gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aNormal);

    if (aTexCoord >= 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, riverBuffers.tbo);
        gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(aTexCoord);
    }

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, riverBuffers.ibo);

    const model = new Float32Array([
        1,0,0,0, 0,1,0,0, 0,0,1,0,
        terrainOffset[0], terrainOffset[1], terrainOffset[2], 1
    ]);
    gl.uniformMatrix4fv(uModel, false, model);
    gl.drawElements(gl.TRIANGLES, river.count, gl.UNSIGNED_SHORT, 0);

    gl.uniform1i(uIsWater, 0);
}

export function renderPebbles(gl, pebbleBuffers, pebbles, terrainOffset,
                               aPosition, aNormal, aTexCoord,
                               uModel, uObjectColor, uUseTexture, uIsWater) {
    gl.uniform1i(uIsWater, 0);
    gl.uniform1i(uUseTexture, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, pebbleBuffers.vbo);
    gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, pebbleBuffers.nbo);
    gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aNormal);

    if (aTexCoord >= 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, pebbleBuffers.tbo);
        gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(aTexCoord);
    }

    for (const pebble of pebbles) {
        const wx = pebble.x + terrainOffset[0];
        const wy = pebble.y + terrainOffset[1];
        const wz = pebble.z + terrainOffset[2];

        const sx = pebble.scaleX;
        const sy = pebble.scaleY;
        const sz = pebble.scaleZ;
        const c  = Math.cos(pebble.angle);
        const s  = Math.sin(pebble.angle);

        const gray = 0.42 + (pebble.seed % 9) * 0.04;
        const warm = (pebble.seed % 3 === 0) ? 0.05 : 0.0;
        gl.uniform3fv(uObjectColor, [gray + warm, gray - 0.02, gray - 0.04]);

        const model = new Float32Array([
            sx*c,  0, sx*s, 0,
            0,     sy, 0,   0,
            -sz*s, 0, sz*c, 0,
            wx, wy, wz, 1
        ]);
        gl.uniformMatrix4fv(uModel, false, model);
        gl.drawArrays(gl.TRIANGLES, 0, pebbleBuffers.count);
    }
}