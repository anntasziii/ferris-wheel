function createDetailedFlower(size, petalCount, petalLength, petalWidth, petalRoundness, stemHeight, stemWidth) {
    const vertices = [];
    const normals  = [];
    const texcoords = [];

    const sw = size * stemWidth;
    const sh = size * stemHeight;

    const stemVerts = [
        -sw, 0, 0,  sw, 0, 0,  sw, sh, 0,
        -sw, 0, 0,  sw, sh, 0, -sw, sh, 0,
         0, 0, -sw,  0, 0, sw,  0, sh, sw,
         0, 0, -sw,  0, sh, sw,  0, sh, -sw,
    ];
    for (const v of stemVerts) vertices.push(v);
    for (let i = 0; i < 12; i++) normals.push(0, 1, 0);
    for (let i = 0; i < 12; i++) texcoords.push(0, 0); 

    const py = sh;
    const pr = size * petalLength;
    const pw = size * petalWidth;
    const segments = Math.max(6, Math.round(petalRoundness * 4));

    for (let i = 0; i < petalCount; i++) {
        const yOffset = i * 0.001; 

        const angle = (i / petalCount) * Math.PI * 2;
        const ca = Math.cos(angle);
        const sa = Math.sin(angle);

        const pcx = ca * pr * 0.55;
        const pcz = sa * pr * 0.55;

        for (let s = 0; s < segments; s++) {
            const a1 = (s / segments) * Math.PI * 2;
            const a2 = ((s + 1) / segments) * Math.PI * 2;

            const lx1 = Math.cos(a1) * pr * 0.5;
            const lz1 = Math.sin(a1) * pw * 0.5;
            const lx2 = Math.cos(a2) * pr * 0.5;
            const lz2 = Math.sin(a2) * pw * 0.5;

            const wx1 = pcx + ca * lx1 - sa * lz1;
            const wz1 = pcz + sa * lx1 + ca * lz1;
            const wx2 = pcx + ca * lx2 - sa * lz2;
            const wz2 = pcz + sa * lx2 + ca * lz2;

            vertices.push(pcx, py + yOffset, pcz,  wx1, py + yOffset, wz1,  wx2, py + yOffset, wz2);
            normals.push(0, 1, 0,  0, 1, 0,  0, 1, 0);

            // texcoord.x: 0 = центр пелюстки, 1 = край — для градієнту кольору
            texcoords.push(
                0.0, 0.0,
                1.0, 0.0,
                1.0, 0.0
            );
        }
    }

    // ── ЦЕНТР ────────────────────────────────────────────────────────────────
    const cr = size * 0.38;
    const cy = py + size * 0.05;
    const centerSegments = 10;

    for (let i = 0; i < centerSegments; i++) {
        const a1 = (i / centerSegments) * Math.PI * 2;
        const a2 = ((i + 1) / centerSegments) * Math.PI * 2;
        vertices.push(
            0, cy, 0,
            Math.cos(a1) * cr, cy, Math.sin(a1) * cr,
            Math.cos(a2) * cr, cy, Math.sin(a2) * cr
        );
        normals.push(0, 1, 0,  0, 1, 0,  0, 1, 0);
        texcoords.push(0, 0,  0, 0,  0, 0);
    }

    const petalSegCount = segments;

    return {
        vertices:  new Float32Array(vertices),
        normals:   new Float32Array(normals),
        texcoords: new Float32Array(texcoords),
        stemCount:   12,
        petalCount:  petalCount * petalSegCount * 3,
        centerCount: centerSegments * 3,
        petalSegCount,
    };
}

const FLOWER_TYPES = [
    {
        petal: [1.0, 0.1, 0.1], center: [1.0, 0.9, 0.0], stem: [0.15, 0.55, 0.1],
        size: 0.3, petals: 12, petalLength: 1.3, petalWidth: 0.3,
        petalRoundness: 1.5, stemHeight: 0.9, stemWidth: 0.1
    },
    {
        petal: [1.0, 1.0, 1.0], center: [1.0, 0.9, 0.0], stem: [0.25, 0.65, 0.15],
        size: 0.35, petals: 6, petalLength: 0.9, petalWidth: 0.85,
        petalRoundness: 6.0, stemHeight: 0.75, stemWidth: 0.1
    },
    {
        petal: [0.65, 0.2, 1.0], center: [1.0, 0.9, 0.0], stem: [0.2, 0.6, 0.12],
        size: 0.3, petals: 12, petalLength: 1.5, petalWidth: 0.55,
        petalRoundness: 0.5, stemHeight: 1.1, stemWidth: 0.1
    },
];

export function createFlowers(getHeight, getBaseHeight, count = 100, terrainSize = 60) {
    const flowers = [];
    let attempts = 0;
    const maxAttempts = count * 10; 

    while (flowers.length < count && attempts < maxAttempts) {
        attempts++;

        const x = Math.random() * terrainSize;
        const z = Math.random() * terrainSize;

        const fullY    = getHeight(x, z);      
        const baseY    = getBaseHeight(x, z);  
        const bankBoost = fullY - baseY;       

        if (bankBoost > 0.1) continue; 

        const step = 1.0;
        const dX = Math.abs(getHeight(x + step, z) - getHeight(x - step, z));
        const dZ = Math.abs(getHeight(x, z + step) - getHeight(x, z - step));
        const slope = Math.max(dX, dZ);
        if (slope > 1.5) continue;

        const type = FLOWER_TYPES[Math.floor(Math.random() * FLOWER_TYPES.length)];
        flowers.push({ x, y: fullY, z, type });
    }
    return flowers;
}

export function initFlowerBuffers(gl) {
    const buffers = [];
    for (const type of FLOWER_TYPES) {
        const geo = createDetailedFlower(
            type.size, type.petals, type.petalLength, type.petalWidth,
            type.petalRoundness, type.stemHeight, type.stemWidth
        );

        const vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, geo.vertices, gl.STATIC_DRAW);

        const nbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, nbo);
        gl.bufferData(gl.ARRAY_BUFFER, geo.normals, gl.STATIC_DRAW);

        const tbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, tbo);
        gl.bufferData(gl.ARRAY_BUFFER, geo.texcoords, gl.STATIC_DRAW);

        buffers.push({
            vbo, nbo, tbo,
            stemCount:   geo.stemCount,
            petalCount:  geo.petalCount,
            centerCount: geo.centerCount,
        });
    }
    return buffers;
}

export function renderFlowers(gl, flowerBuffers, flowers, terrainOffset,
                               aPosition, aNormal, aTexCoord,
                               uModel, uObjectColor, uUseTexture, uIsFlower) {
    gl.uniform1i(uUseTexture, 0);
    gl.uniform1i(uIsFlower, 1); 

    for (const f of flowers) {
        const typeIdx = FLOWER_TYPES.indexOf(f.type);
        const buf = flowerBuffers[typeIdx];

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

        const wx = f.x + terrainOffset[0];
        const wy = f.y + terrainOffset[1];
        const wz = f.z + terrainOffset[2];

        const model = new Float32Array([
            1,0,0,0,
            0,1,0,0,
            0,0,1,0,
            wx, wy, wz, 1
        ]);
        gl.uniformMatrix4fv(uModel, false, model);

        gl.uniform1i(uIsFlower, 0);
        gl.uniform3fv(uObjectColor, f.type.stem);
        gl.drawArrays(gl.TRIANGLES, 0, buf.stemCount);

        gl.uniform1i(uIsFlower, 1);
        gl.uniform3fv(uObjectColor, f.type.petal);
        gl.drawArrays(gl.TRIANGLES, buf.stemCount, buf.petalCount);
        gl.drawArrays(gl.TRIANGLES, buf.stemCount, buf.petalCount);
        gl.depthMask(true); 

        gl.uniform1i(uIsFlower, 0);
        gl.uniform3fv(uObjectColor, f.type.center);
        gl.drawArrays(gl.TRIANGLES, buf.stemCount + buf.petalCount, buf.centerCount);
    }

    gl.uniform1i(uIsFlower, 0); 
}