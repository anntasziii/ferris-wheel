
function createTree(trunkH = 1.5, trunkR = 0.15, crownH = 3.0, crownR = 1.0) {
    const vertices = [], normals = [], texcoords = [];
    const segments = 150; 

    for (let i = 0; i < segments; i++) {
        const a1 = (i / segments) * Math.PI * 2;
        const a2 = ((i+1) / segments) * Math.PI * 2;
        const x1 = Math.cos(a1), z1 = Math.sin(a1);
        const x2 = Math.cos(a2), z2 = Math.sin(a2);

        vertices.push(
            x1*trunkR, 0, z1*trunkR,
            x2*trunkR, 0, z2*trunkR,
            x2*trunkR*0.85, trunkH, z2*trunkR*0.85,
            x1*trunkR, 0, z1*trunkR,
            x2*trunkR*0.85, trunkH, z2*trunkR*0.85,
            x1*trunkR*0.85, trunkH, z1*trunkR*0.85
        );
        const nx = x1*0.95, nz = z1*0.95;
        for (let j = 0; j < 6; j++) normals.push(nx, 0.05, nz);
        for (let j = 0; j < 6; j++) texcoords.push(0, 0);
    }
    const trunkCount = segments * 6;

    const branchCount = 2;
    for (let b = 0; b < branchCount; b++) {
        const bangle = (b / branchCount) * Math.PI * 2;
        const bheight = trunkH * (0.45 + b * 0.25);
        const blen = 0.5 + b * 0.1;
        const bx = Math.cos(bangle) * blen;
        const bz = Math.sin(bangle) * blen;
        const br = trunkR * 0.3;

        for (let i = 0; i < 6; i++) {
            const a1 = (i / 6) * Math.PI * 2;
            const a2 = ((i+1) / 6) * Math.PI * 2;
            const x1 = Math.cos(a1)*br, z1 = Math.sin(a1)*br;
            const x2 = Math.cos(a2)*br, z2 = Math.sin(a2)*br;

            vertices.push(
                x1, bheight, z1, x2, bheight, z2, x2 + bx*0.5, bheight + 0.25, z2 + bz*0.5,
                x1, bheight, z1, x2 + bx*0.5, bheight + 0.25, z2 + bz*0.5, x1 + bx*0.5, bheight + 0.25, z1 + bz*0.5
            );
            const nx = Math.cos((a1+a2)*0.5), nz = Math.sin((a1+a2)*0.5);
            for (let j = 0; j < 6; j++) normals.push(nx, 0.1, nz);
            for (let j = 0; j < 6; j++) texcoords.push(0, 0);
        }
    }
    const branchVertCount = branchCount * 6 * 6;

    const crowns = [
        { h: trunkH - 0.2, r: crownR*0.7, peak: trunkH + crownH*0.45 },
        { h: trunkH + 0.05, r: crownR*1.05, peak: trunkH + crownH*0.9 },
        { h: trunkH + 0.25, r: crownR*0.8, peak: trunkH + crownH*1.3 },
    ];

    let crownCount = 0;
    for (const crown of crowns) {
        for (let i = 0; i < segments; i++) {
            const a1 = (i / segments) * Math.PI * 2;
            const a2 = ((i+1) / segments) * Math.PI * 2;
            const x1 = Math.cos(a1), z1 = Math.sin(a1);
            const x2 = Math.cos(a2), z2 = Math.sin(a2);

            const h1 = crown.h + (crown.peak - crown.h) * 0.15;
            const h2 = crown.h + (crown.peak - crown.h) * 0.5;

            vertices.push(
                x1*crown.r, crown.h, z1*crown.r,
                x2*crown.r, crown.h, z2*crown.r,
                0, crown.peak, 0
            );
            const nx = (x1+x2)*0.5, nz = (z1+z2)*0.5;
            const ny = crown.r / Math.max(0.1, crown.peak - crown.h);
            const nl = Math.sqrt(nx*nx + ny*ny + nz*nz);
            for (let j = 0; j < 3; j++) normals.push(nx/nl, ny/nl, nz/nl);
            for (let j = 0; j < 3; j++) texcoords.push(0, 0);

            vertices.push(
                0, crown.h, 0,
                x1*crown.r, crown.h, z1*crown.r,
                x2*crown.r, crown.h, z2*crown.r
            );
            for (let j = 0; j < 3; j++) normals.push(0, -1, 0);
            for (let j = 0; j < 3; j++) texcoords.push(0, 0);

            crownCount += 6;
        }
    }

    return {
        vertices: new Float32Array(vertices),
        normals: new Float32Array(normals),
        texcoords: new Float32Array(texcoords),
        trunkCount, branchCount: branchVertCount, crownCount,
    };
}

const TREE_TYPES = [
    { trunkH: 2.5, trunkR: 0.2, crownH: 6.0, crownR: 1.2,
      trunkColor: [0.35, 0.22, 0.1], crownColors: [
        [0.05, 0.25, 0.08],
        [0.08, 0.30, 0.10],
        [0.10, 0.28, 0.09],
        [0.06, 0.26, 0.07], 
      ] },
    { trunkH: 3.0, trunkR: 0.25, crownH: 2.5, crownR: 2.8,
      trunkColor: [0.45, 0.28, 0.12], crownColors: [
        [0.2, 0.55, 0.15], 
        [0.28, 0.62, 0.20], 
        [0.18, 0.52, 0.14], 
        [0.55, 0.45, 0.15],
      ] },
    { trunkH: 1.2, trunkR: 0.14, crownH: 2.5, crownR: 1.8,
      trunkColor: [0.4, 0.25, 0.1], crownColors: [
        [0.35, 0.48, 0.12], 
        [0.42, 0.55, 0.18], 
        [0.30, 0.42, 0.10],  
        [0.60, 0.48, 0.15], 
      ] },
];

export function createTrees(getHeight, getBaseHeight, riverPoints, count = 80, terrainSize = 120) {
    const trees = [];

    function distToRiver(x, z) {
        let minDist = Infinity;
        for (let i = 0; i < riverPoints.length - 1; i++) {
            const a = riverPoints[i], b = riverPoints[i+1];
            const dx = b.x - a.x, dz = b.z - a.z;
            const len2 = dx*dx + dz*dz;
            let t = ((x-a.x)*dx + (z-a.z)*dz) / len2;
            t = Math.max(0, Math.min(1, t));
            const cx = a.x + t*dx, cz = a.z + t*dz;
            const d = Math.sqrt((x-cx)*(x-cx) + (z-cz)*(z-cz));
            if (d < minDist) minDist = d;
        }
        return minDist;
    }

    function distToOtherTree(x, z, trees) {
        if (trees.length === 0) return Infinity;
        let minDist = Infinity;
        for (const t of trees) {
            const d = Math.sqrt((x-t.x)*(x-t.x) + (z-t.z)*(z-t.z));
            if (d < minDist) minDist = d;
        }
        return minDist;
    }

    let attempts = 0;
    while (trees.length < count && attempts < count * 30) {
        attempts++;

        let x, z;
        const edge = Math.random();
        if (edge < 0.25) {
            x = Math.random() * 25;  
            z = Math.random() * terrainSize;
        } else if (edge < 0.5) {
            x = terrainSize - Math.random() * 25;
            z = Math.random() * terrainSize;
        } else if (edge < 0.75) {
            x = Math.random() * terrainSize;
            z = Math.random() * 25;
        } else {
            x = Math.random() * terrainSize;
            z = terrainSize - Math.random() * 25;
        }

        if (x < 1 || x > terrainSize-1 || z < 1 || z > terrainSize-1) continue;

        const riverDist = distToRiver(x, z);
        if (riverDist < 5.0) continue;

        const treeDist = distToOtherTree(x, z, trees);
        if (treeDist < 8.0) continue;

        const fullY = getHeight(x, z);
        const baseY = getBaseHeight(x, z);
        const bankBoost = fullY - baseY;
        if (bankBoost > 0.8) continue;

        const slope = Math.abs(getHeight(x+1, z) - getHeight(x-1, z)) +
                      Math.abs(getHeight(x, z+1) - getHeight(x, z-1));
        if (slope > 3.0) continue;

        const typeIdx = trees.length % 3;
        const scale = 0.95 + Math.random() * 0.3;

        trees.push({
            x, y: fullY, z,
            type: typeIdx,
            angle: Math.random() * Math.PI * 2,
            scale,
            colorIdx: Math.floor(Math.random() * TREE_TYPES[typeIdx].crownColors.length), 
        });
    }
    return trees;
}

export function initTreeBuffers(gl) {
    return TREE_TYPES.map(type => {
        const geo = createTree(type.trunkH, type.trunkR, type.crownH, type.crownR);

        function upload(data) {
            const buf = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, buf);
            gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
            return buf;
        }

        const vbo = upload(geo.vertices);
        const nbo = upload(geo.normals);
        const tbo = upload(geo.texcoords);

        return { vbo, nbo, tbo, trunkCount: geo.trunkCount, branchCount: geo.branchCount,crownCount: geo.crownCount };
    });
}

export function renderTrees(gl, treeBuffers, trees, terrainOffset, aPosition, aNormal, aTexCoord, uModel, uObjectColor, uUseTexture, uIsWater, uIsFlower) {
    gl.uniform1i(uIsWater, 0);
    gl.uniform1i(uIsFlower, 0);
    gl.uniform1i(uUseTexture, 0);

    for (const tree of trees) {
        const buf = treeBuffers[tree.type];
        const type = TREE_TYPES[tree.type];
        const wx = tree.x + terrainOffset[0];
        const wy = tree.y + terrainOffset[1];
        const wz = tree.z + terrainOffset[2];
        const s = tree.scale;
        const ca = Math.cos(tree.angle), sa = Math.sin(tree.angle);

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

        const model = new Float32Array([
            s*ca, 0, s*sa, 0,
            0,    s, 0,    0,
           -s*sa, 0, s*ca, 0,
            wx, wy, wz, 1
        ]);
        gl.uniformMatrix4fv(uModel, false, model);

        gl.uniform3fv(uObjectColor, type.trunkColor);
        gl.drawArrays(gl.TRIANGLES, 0, buf.trunkCount);

        const branchColor = [
            type.trunkColor[0] * 1.2,
            type.trunkColor[1] * 1.2,
            type.trunkColor[2] * 1.2
        ];
        gl.uniform3fv(uObjectColor, branchColor);
        gl.drawArrays(gl.TRIANGLES, buf.trunkCount, buf.branchCount);

        const colorIdx = Math.floor(Math.random() * type.crownColors.length);
        const crownColor = type.crownColors[tree.colorIdx];
        gl.uniform3fv(uObjectColor, crownColor);
        gl.drawArrays(gl.TRIANGLES, buf.trunkCount + buf.branchCount, buf.crownCount);
    }
}