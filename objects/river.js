const controlPoints = [
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

export function createRiver(getHeight, terrainSize = 120) {
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

export function createRiverPebbles(getHeight, getBaseHeight, river) {
    const pebbles = [];
    const path = river.path;
    const width = river.width;

    for (let i = 0; i < path.length; i += 10) {
        const p = path[i];
        const prev = path[Math.max(0, i - 1)];
        const next = path[Math.min(path.length - 1, i + 1)];
        const dx = next.x - prev.x;
        const dz = next.z - prev.z;
        const len = Math.sqrt(dx*dx + dz*dz) || 1;

        const px = -dz / len;
        const pz =  dx / len;

        for (let side = -1; side <= 1; side += 2) {
            const clusterJitter = Math.sin(i * 2.3) * 0.3;
            const clusterOffset = width * 0.5 + 0.3 + clusterJitter;

            const cx = p.x + px * side * clusterOffset;
            const cz = p.z + pz * side * clusterOffset;

            const clusterSize = 2 + Math.floor(Math.abs(Math.sin(i * 1.7 + side)) * 2);

            for (let k = 0; k < clusterSize; k++) {
                const spread = 0.3;
                const kx = cx + Math.sin(k * 2.1 + i * 0.7) * spread;
                const kz = cz + Math.cos(k * 1.9 + i * 0.5) * spread;

                // беремо максимум з двох висот — камінець завжди на поверхні
                const y0 = getHeight(kx, kz);
                const y1 = getHeight(kx + 0.2, kz);
                const y2 = getHeight(kx - 0.2, kz);
                const y3 = getHeight(kx, kz + 0.2);
                const y4 = getHeight(kx, kz - 0.2);
                const y = Math.min(y0, y1, y2, y3, y4) + 0.05;

                const baseSize = 0.15 + Math.abs(Math.sin(i * 1.3 + k * 3.7)) * 0.4;

                pebbles.push({
                    x: kx, y,
                    z: kz,
                    scaleX: baseSize * (0.7 + Math.abs(Math.sin(i + k * 2.3)) * 0.6),
                    scaleY: baseSize * 0.55,
                    scaleZ: baseSize * (0.7 + Math.abs(Math.cos(i + k * 1.7)) * 0.6),
                    angle: Math.sin(i * 1.1 + k) * Math.PI,
                    seed: i * 100 + k + (side > 0 ? 5000 : 0),
                    brown: Math.sin(i * 1.1 + k) > 0,
                    shape: Math.floor(Math.abs(Math.sin(i * 2.7 + k * 4.1)) * 2) 
                });
            }
        }
    }
    return pebbles;
}

export function initPebbleBuffers(gl) {
    const types = [0.6, 0.85].map(yScale => { 
        const vertices = [], normals = [], texcoords = [];
        const latSegs = 8, lonSegs = 12;
        for (let lat = 0; lat < latSegs; lat++) {
            const a1 = (lat / latSegs) * Math.PI;
            const a2 = ((lat + 1) / latSegs) * Math.PI;
            for (let lon = 0; lon < lonSegs; lon++) {
                const b1 = (lon / lonSegs) * Math.PI * 2;
                const b2 = ((lon + 1) / lonSegs) * Math.PI * 2;
                const pts = [
                    [Math.sin(a1)*Math.cos(b1), Math.cos(a1)*yScale, Math.sin(a1)*Math.sin(b1)],
                    [Math.sin(a1)*Math.cos(b2), Math.cos(a1)*yScale, Math.sin(a1)*Math.sin(b2)],
                    [Math.sin(a2)*Math.cos(b1), Math.cos(a2)*yScale, Math.sin(a2)*Math.sin(b1)],
                    [Math.sin(a2)*Math.cos(b2), Math.cos(a2)*yScale, Math.sin(a2)*Math.sin(b2)],
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
    });
    return types;
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

    for (const pebble of pebbles) {
        const buf = pebbleBuffers[pebble.shape ?? 0];
        if (!buf) continue;

        gl.bindBuffer(gl.ARRAY_BUFFER, buf.vbo);
        gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(aPosition);

        gl.bindBuffer(gl.ARRAY_BUFFER, buf.nbo);
        gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(aNormal);

        if (aTexCoord >= 0) {
            gl.bindBuffer(gl.ARRAY_BUFFER, buf.tbo);
            gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(aTexCoord);
        }

        const wx = pebble.x + terrainOffset[0];
        const wy = pebble.y + terrainOffset[1];
        const wz = pebble.z + terrainOffset[2];

        const sx = pebble.scaleX;
        const sy = pebble.scaleY;
        const sz = pebble.scaleZ;
        const c  = Math.cos(pebble.angle);
        const s  = Math.sin(pebble.angle);

        const gray = 0.45 + (pebble.seed % 9) * 0.03;
        const color = pebble.brown
            ? [0.55 + gray * 0.2, 0.38 + gray * 0.1, 0.22]
            : [gray, gray - 0.02, gray - 0.04];
        gl.uniform3fv(uObjectColor, color);

        const model = new Float32Array([
            sx*c,  0, sx*s, 0,
            0,     sy, 0,   0,
            -sz*s, 0, sz*c, 0,
            wx, wy, wz, 1
        ]);
        gl.uniformMatrix4fv(uModel, false, model);
        gl.drawArrays(gl.TRIANGLES, 0, buf.count);
    }
}