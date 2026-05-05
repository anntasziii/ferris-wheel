
const BIRD_CONFIGS = [
    { x: -5, y: 18, z: -5,  speed: 0.4, radius: 15, offset: 0.0,  height: 0.5 },
    { x:  3, y: 20, z: -8,  speed: 0.3, radius: 20, offset: 2.1,  height: 0.3 },
    { x: -2, y: 16, z:  3,  speed: 0.5, radius: 12, offset: 4.3,  height: 0.8 },
    { x:  5, y: 22, z: -3,  speed: 0.35,radius: 18, offset: 1.5,  height: 0.4 },
    { x: -8, y: 19, z:  5,  speed: 0.25,radius: 14, offset: 3.7,  height: 0.6 },
    { x:  0, y: 17, z: -10, speed: 0.45,radius: 16, offset: 5.2,  height: 0.3 },
];

function createBirdGeometry() {
    const vertices = [];
    const normals  = [];
    const texcoords = [];

    function addTri(v0, v1, v2, nx, ny, nz) {
        vertices.push(...v0, ...v1, ...v2);
        for (let i = 0; i < 3; i++) normals.push(nx, ny, nz);
        texcoords.push(0,0, 0.5,1, 1,0);
    }

    const bl = 0.9, bw = 0.07, bh = 0.08; 

    addTri([-bl*0.15, 0, 0], [0, bh, bw*0.5], [bl*0.5, 0, 0], 0,1,0);
    addTri([-bl*0.15, 0, 0], [0, bh, -bw*0.5], [bl*0.5, 0, 0], 0,1,0);
    addTri([-bl*0.15, 0, 0], [bl*0.5, 0, 0], [0, -bh*0.4, bw*0.5], 0,-1,0);
    addTri([-bl*0.15, 0, 0], [bl*0.5, 0, 0], [0, -bh*0.4, -bw*0.5], 0,-1,0);

    const hx = bl*0.52, hr = 0.045;
    for (let i = 0; i < 10; i++) {
        const a1 = (i/10)*Math.PI*2, a2 = ((i+1)/10)*Math.PI*2;
        addTri(
            [hx, hr*0.2, 0],
            [hx + Math.cos(a1)*hr, Math.sin(a1)*hr, Math.sin(a1)*hr*0.4],
            [hx + Math.cos(a2)*hr, Math.sin(a2)*hr, Math.sin(a2)*hr*0.4],
            Math.cos((a1+a2)*0.5), 0.5, 0
        );
    }

    addTri([hx+hr, hr*0.1, 0], [hx+hr*3.0, -hr*0.05, 0], [hx+hr, -hr*0.05, hr*0.05], 1,0.2,0);
    addTri([hx+hr, hr*0.1, 0], [hx+hr, -hr*0.05, -hr*0.05], [hx+hr*3.0, -hr*0.05, 0], 1,0.2,0);

    const tx = -bl*0.15;
    addTri([tx, 0, 0], [tx-0.35, bh*0.15, 0.14], [tx-0.25, 0, 0.09], -1,0,0.2);
    addTri([tx, 0, 0], [tx-0.35, bh*0.15, -0.14], [tx-0.25, 0, -0.09], -1,0,-0.2);
    addTri([tx, 0, 0], [tx-0.25, 0, 0.09], [tx-0.3, -bh*0.15, 0], -1,-0.1,0);
    addTri([tx, 0, 0], [tx-0.3, -bh*0.15, 0], [tx-0.25, 0, -0.09], -1,-0.1,0);

    const wz = bw*0.5;

    const lWing = [
        [0.12, 0.01, wz],
        [0.02, 0.06, wz+0.25], 
        [-0.04, 0.09, wz+0.5], 
        [-0.06, 0.09, wz+0.75],
        [-0.04, 0.07, wz+1.0],   
        [-0.06, 0.05, wz+1.2],   
        [-0.02, 0.02, wz+1.35], 
    ];
    const lWingBack = [
        [0.12, -0.01, wz],
        [0.06, -0.02, wz+0.2],
        [0.02, -0.01, wz+0.45],
        [0.0,  0.01,  wz+0.7],
        [-0.01, 0.03, wz+0.95],
        [-0.03, 0.02, wz+1.15],
        [-0.02, 0.02, wz+1.35],
    ];

    for (let i = 0; i < lWing.length - 1; i++) {
        addTri(lWing[i], lWing[i+1], lWingBack[i], 0, 1, 0.05);
        addTri(lWing[i+1], lWingBack[i+1], lWingBack[i], 0, 1, 0.05);
    }

    const rWing = lWing.map(p => [p[0], p[1], -p[2]]);
    const rWingBack = lWingBack.map(p => [p[0], p[1], -p[2]]);

    for (let i = 0; i < rWing.length - 1; i++) {
        addTri(rWing[i], rWingBack[i], rWing[i+1], 0, 1, -0.05);
        addTri(rWing[i+1], rWingBack[i], rWingBack[i+1], 0, 1, -0.05);
    }

    return {
        vertices:  new Float32Array(vertices),
        normals:   new Float32Array(normals),
        texcoords: new Float32Array(texcoords),
        count: vertices.length / 3
    };
}

export function initBirdBuffers(gl) {
    const geo = createBirdGeometry();

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, geo.vertices, gl.STATIC_DRAW);

    const nbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nbo);
    gl.bufferData(gl.ARRAY_BUFFER, geo.normals, gl.STATIC_DRAW);

    const tbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tbo);
    gl.bufferData(gl.ARRAY_BUFFER, geo.texcoords, gl.STATIC_DRAW);

    return { vbo, nbo, tbo, count: geo.count };
}

export function renderBirds(gl, birdBuffers, t,
                             aPosition, aNormal, aTexCoord,
                             uModel, uObjectColor, uUseTexture, uIsWater, uIsFlower) {
    gl.uniform1i(uIsWater, 0);
    gl.uniform1i(uIsFlower, 0);
    gl.uniform1i(uUseTexture, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, birdBuffers.vbo);
    gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, birdBuffers.nbo);
    gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aNormal);

    if (aTexCoord >= 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, birdBuffers.tbo);
        gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(aTexCoord);
    }

const birdColors = [
    [1.0,  0.98, 0.95], 
    [0.2,  0.18, 0.22], 
    [0.7,  0.55, 0.35], 
    [0.85, 0.3,  0.2 ],
    [0.3,  0.5,  0.7 ], 
    [0.6,  0.65, 0.4 ], 
];

    gl.uniform3fv(uObjectColor, [0.15, 0.1, 0.1]);

    for (const bird of BIRD_CONFIGS) {
        const bAngle = t * bird.speed + bird.offset;
        const wx = bird.x + Math.cos(bAngle) * bird.radius;
        const wy = bird.y + Math.sin(t * bird.height + bird.offset) * 1.5;
        const wz = bird.z + Math.sin(bAngle) * bird.radius * 0.6;

        const dirX = -Math.sin(bAngle);
        const dirZ = Math.cos(bAngle) * 0.6;
        const dirLen = Math.sqrt(dirX*dirX + dirZ*dirZ);
        const ndx = dirX / dirLen;
        const ndz = dirZ / dirLen;

        const flapAngle = Math.sin(t * 4.0 + bird.offset) * 0.4;
        const cf = Math.cos(flapAngle), sf = Math.sin(flapAngle);

        const scale = 1;
        const model = new Float32Array([
            ndx * scale,  sf * scale, ndz * scale, 0,
            0,            cf * scale, 0,            0,
           -ndz * scale,  sf * scale, ndx * scale,  0,
            wx, wy, wz, 1
        ]);
        const colorIdx = BIRD_CONFIGS.indexOf(bird) % birdColors.length;

        gl.uniform3fv(uObjectColor, birdColors[colorIdx]);
        gl.uniformMatrix4fv(uModel, false, model);

        gl.drawArrays(gl.TRIANGLES, 0, birdBuffers.count);
    }
}