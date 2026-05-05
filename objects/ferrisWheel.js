
const WHEEL_RADIUS = 16.0;    
const CABIN_COUNT  = 16;     
const SPOKE_COUNT  = 16;     

function createRim(radius, tubeRadius, segments = 32, tubeSegments = 8) {
    const vertices = [], normals = [], texcoords = [], indices = [];

    for (let i = 0; i <= segments; i++) {
        const u = (i / segments) * Math.PI * 2;
        const cu = Math.cos(u), su = Math.sin(u);

        for (let j = 0; j <= tubeSegments; j++) {
            const v = (j / tubeSegments) * Math.PI * 2;
            const cv = Math.cos(v), sv = Math.sin(v);

            const x = (radius + tubeRadius * cv) * cu;
            const y = (radius + tubeRadius * cv) * su;
            const z = tubeRadius * sv;

            vertices.push(x, y, z);

            const nx = cv * cu, ny = cv * su, nz = sv;
            normals.push(nx, ny, nz);
            texcoords.push(i / segments, j / tubeSegments);
        }
    }

    for (let i = 0; i < segments; i++) {
        for (let j = 0; j < tubeSegments; j++) {
            const a = i * (tubeSegments + 1) + j;
            const b = a + tubeSegments + 1;
            indices.push(a, b, a + 1);
            indices.push(b, b + 1, a + 1);
        }
    }

    return { vertices: new Float32Array(vertices), normals: new Float32Array(normals),
             texcoords: new Float32Array(texcoords), indices: new Uint16Array(indices),
             count: indices.length };
}

function createCylinder(radiusTop, radiusBot, height, segments = 8) {
    const vertices = [], normals = [], texcoords = [];

    for (let i = 0; i < segments; i++) {
        const a1 = (i / segments) * Math.PI * 2;
        const a2 = ((i + 1) / segments) * Math.PI * 2;

        const x1t = Math.cos(a1) * radiusTop, z1t = Math.sin(a1) * radiusTop;
        const x2t = Math.cos(a2) * radiusTop, z2t = Math.sin(a2) * radiusTop;
        const x1b = Math.cos(a1) * radiusBot, z1b = Math.sin(a1) * radiusBot;
        const x2b = Math.cos(a2) * radiusBot, z2b = Math.sin(a2) * radiusBot;

        const nx1 = Math.cos(a1), nz1 = Math.sin(a1);
        const nx2 = Math.cos(a2), nz2 = Math.sin(a2);

        vertices.push(x1t, height/2, z1t,  x1b, -height/2, z1b,  x2t, height/2, z2t);
        vertices.push(x2t, height/2, z2t,  x1b, -height/2, z1b,  x2b, -height/2, z2b);
        normals.push(nx1,0,nz1, nx1,0,nz1, nx2,0,nz2, nx2,0,nz2, nx1,0,nz1, nx2,0,nz2);
        for (let j = 0; j < 6; j++) texcoords.push(0, 0);

        vertices.push(0, height/2, 0,  x1t, height/2, z1t,  x2t, height/2, z2t);
        vertices.push(0, -height/2, 0, x2b, -height/2, z2b,  x1b, -height/2, z1b);
        normals.push(0,1,0, 0,1,0, 0,1,0, 0,-1,0, 0,-1,0, 0,-1,0);
        for (let j = 0; j < 6; j++) texcoords.push(0, 0);
    }

    return { vertices: new Float32Array(vertices), normals: new Float32Array(normals),
             texcoords: new Float32Array(texcoords), count: vertices.length / 3 };
}

function createCabin() {
    const bodyVerts = [], bodyNorms = [], bodyTex = [];
    const glassVerts = [], glassNorms = [], glassTex = [];

    const wMid = 3.2;  
    const wBot = 4.0;  
    const wTop = 4.0;  
    const hMid = 2.2; 
    const hBot = 0.7; 
    const hTop = 0.4; 
    const d = 1.6; 
    const wt = 0.12; 

    function addQuad(verts, norms, tex, v0, v1, v2, v3, nx, ny, nz) {
        verts.push(...v0, ...v1, ...v2, ...v0, ...v2, ...v3);
        for (let i = 0; i < 6; i++) norms.push(nx, ny, nz);
        tex.push(0,0, 1,0, 1,1, 0,0, 1,1, 0,1);
    }

    const hz = d/2;

    const yBot  = -(hBot + hMid/2);
    const yMid1 = -hMid/2;
    const yMid2 =  hMid/2;
    const yTop  =  hMid/2 + hTop;

    const xBot  = wBot/2;
    const xMid  = wMid/2;
    const xTopV = wTop/2;

    addQuad(bodyVerts, bodyNorms, bodyTex,
        [-xBot,yBot,-hz], [xBot,yBot,-hz], [xMid,yMid1,-hz], [-xMid,yMid1,-hz], 0,0,-1);
    addQuad(bodyVerts, bodyNorms, bodyTex,
        [-xMid,yMid1,-hz], [xMid,yMid1,-hz], [xMid,yMid2,-hz], [-xMid,yMid2,-hz], 0,0,-1);
    addQuad(bodyVerts, bodyNorms, bodyTex,
        [-xMid,yMid2,-hz], [xMid,yMid2,-hz], [xTopV,yTop,-hz], [-xTopV,yTop,-hz], 0,0,-1);

    addQuad(bodyVerts, bodyNorms, bodyTex,
        [-xBot,yBot,-hz], [-xMid,yMid1,-hz], [-xMid,yMid1,hz], [-xBot,yBot,hz], -1,0,0);
    addQuad(bodyVerts, bodyNorms, bodyTex,
        [-xMid,yMid1,-hz], [-xMid,yMid2,-hz], [-xMid,yMid2,hz], [-xMid,yMid1,hz], -1,0,0);
    addQuad(bodyVerts, bodyNorms, bodyTex,
        [-xMid,yMid2,-hz], [-xTopV,yTop,-hz], [-xTopV,yTop,hz], [-xMid,yMid2,hz], -1,0,0);

    addQuad(bodyVerts, bodyNorms, bodyTex,
        [xBot,yBot,-hz], [xBot,yBot,hz], [xMid,yMid1,hz], [xMid,yMid1,-hz], 1,0,0);
    addQuad(bodyVerts, bodyNorms, bodyTex,
        [xMid,yMid1,-hz], [xMid,yMid1,hz], [xMid,yMid2,hz], [xMid,yMid2,-hz], 1,0,0);
    addQuad(bodyVerts, bodyNorms, bodyTex,
        [xMid,yMid2,-hz], [xMid,yMid2,hz], [xTopV,yTop,hz], [xTopV,yTop,-hz], 1,0,0);

    addQuad(bodyVerts, bodyNorms, bodyTex,
        [-xBot,yBot,-hz], [-xBot,yBot,hz], [xBot,yBot,hz], [xBot,yBot,-hz], 0,-1,0);

    addQuad(bodyVerts, bodyNorms, bodyTex,
        [-xTopV,yTop,-hz], [xTopV,yTop,-hz], [xTopV,yTop,hz], [-xTopV,yTop,hz], 0,1,0);

    addQuad(bodyVerts, bodyNorms, bodyTex,
        [-xBot,yBot,hz], [xBot,yBot,hz], [xMid,yMid1,hz], [-xMid,yMid1,hz], 0,0,1);
    addQuad(bodyVerts, bodyNorms, bodyTex,
        [-xMid,yMid2,hz], [xMid,yMid2,hz], [xTopV,yTop,hz], [-xTopV,yTop,hz], 0,0,1);

    addQuad(bodyVerts, bodyNorms, bodyTex,
        [-xMid,yMid2-wt,hz], [xMid,yMid2-wt,hz], [xMid,yMid2,hz], [-xMid,yMid2,hz], 0,0,1);
    addQuad(bodyVerts, bodyNorms, bodyTex,
        [-xMid,yMid1,hz], [xMid,yMid1,hz], [xMid,yMid1+wt,hz], [-xMid,yMid1+wt,hz], 0,0,1);
    addQuad(bodyVerts, bodyNorms, bodyTex,
        [-xMid,yMid1+wt,hz], [-xMid+wt,yMid1+wt,hz], [-xMid+wt,yMid2-wt,hz], [-xMid,yMid2-wt,hz], 0,0,1);
    addQuad(bodyVerts, bodyNorms, bodyTex,
        [xMid-wt,yMid1+wt,hz], [xMid,yMid1+wt,hz], [xMid,yMid2-wt,hz], [xMid-wt,yMid2-wt,hz], 0,0,1);
    addQuad(bodyVerts, bodyNorms, bodyTex,
        [-wt*0.5,yMid1+wt,hz], [wt*0.5,yMid1+wt,hz], [wt*0.5,yMid2-wt,hz], [-wt*0.5,yMid2-wt,hz], 0,0,1);

    const gx1 = -xMid+wt, gx2 = -wt*0.5;
    const gx3 =  wt*0.5,  gx4 =  xMid-wt;
    const gy1 = yMid1+wt, gy2 = yMid2-wt;

    addQuad(glassVerts, glassNorms, glassTex,
        [gx1,gy1,hz], [gx2,gy1,hz], [gx2,gy2,hz], [gx1,gy2,hz], 0,0,1);
    addQuad(glassVerts, glassNorms, glassTex,
        [gx1,gy2,hz], [gx2,gy2,hz], [gx2,gy1,hz], [gx1,gy1,hz], 0,0,-1);

    addQuad(glassVerts, glassNorms, glassTex,
        [gx3,gy1,hz], [gx4,gy1,hz], [gx4,gy2,hz], [gx3,gy2,hz], 0,0,1);
    addQuad(glassVerts, glassNorms, glassTex,
        [gx3,gy2,hz], [gx4,gy2,hz], [gx4,gy1,hz], [gx3,gy1,hz], 0,0,-1);

    return {
        body:  { vertices: new Float32Array(bodyVerts),  normals: new Float32Array(bodyNorms),
                 texcoords: new Float32Array(bodyTex),   count: bodyVerts.length / 3 },
        glass: { vertices: new Float32Array(glassVerts), normals: new Float32Array(glassNorms),
                 texcoords: new Float32Array(glassTex),  count: glassVerts.length / 3 }
    };
}


export function initFerrisWheel(gl) {

    function uploadMesh(mesh) {
        const vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, mesh.vertices, gl.STATIC_DRAW);

        const nbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, nbo);
        gl.bufferData(gl.ARRAY_BUFFER, mesh.normals, gl.STATIC_DRAW);

        const tbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, tbo);
        gl.bufferData(gl.ARRAY_BUFFER, mesh.texcoords, gl.STATIC_DRAW);

        let ibo = null;
        if (mesh.indices) {
            ibo = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
        }
        return { vbo, nbo, tbo, ibo, count: mesh.count };
    }

    const rim      = createRim(WHEEL_RADIUS, 0.3, 48, 8);
    const spoke    = createCylinder(0.12, 0.12, WHEEL_RADIUS, 6);
    const axle     = createCylinder(0.5, 0.5, 2.0, 8);
    const support  = createCylinder(0.4, 0.4, WHEEL_RADIUS + 8.0, 8); 
    const cabinGeo = createCabin();

    return {
        rim:        uploadMesh(rim),
        spoke:      uploadMesh(spoke),
        axle:       uploadMesh(axle),
        support:    uploadMesh(support),
        cabinBody:  uploadMesh(cabinGeo.body),
        cabinGlass: uploadMesh(cabinGeo.glass),
    };
}

function drawMesh(gl, buf, aPosition, aNormal, aTexCoord) {
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

    if (buf.ibo) {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buf.ibo);
        gl.drawElements(gl.TRIANGLES, buf.count, gl.UNSIGNED_SHORT, 0);
    } else {
        gl.drawArrays(gl.TRIANGLES, 0, buf.count);
    }
}

function makeModel(tx, ty, tz, rx, ry, rz, sx, sy, sz) {
    const cx = Math.cos(rx), sx_ = Math.sin(rx);
    const cy = Math.cos(ry), sy_ = Math.sin(ry);
    const cz = Math.cos(rz), sz_ = Math.sin(rz);

    return new Float32Array([
        (cy*cz + sy_*sx_*sz_)*sx, (-cy*sz_ + sy_*sx_*cz)*sy, sy_*cx*sz,  0,
        cx*sz_*sx,                 cx*cz*sy,                  -sx_*sz,    0,
        (-sy_*cz + cy*sx_*sz_)*sx,( sy_*sz_ + cy*sx_*cz)*sy,  cy*cx*sz,  0,
        tx, ty, tz, 1
    ]);
}

export function renderFerrisWheel(gl, wheel, angle, position,
                                   aPosition, aNormal, aTexCoord,
                                   uModel, uObjectColor, uUseTexture) {
    gl.uniform1i(uUseTexture, 0);

    const [px, py, pz] = position;
    const ca = Math.cos(angle), sa = Math.sin(angle);
    const centerY = py + WHEEL_RADIUS + 6.0;

    gl.uniform3fv(uObjectColor, [0.55, 0.5, 0.45]);

    const supportHeight = WHEEL_RADIUS + 6.0;  
    const supportPositions = [
        [px - 4.0, pz + 1.0],
        [px + 4.0, pz + 1.0],
        [px - 4.0, pz - 1.0],
        [px + 4.0, pz - 1.0],
    ];

    for (const [sx, sz] of supportPositions) {
        const model = new Float32Array([
            1,0,0,0, 
            0,1,0,0, 
            0,0,1,0,
            sx, py + supportHeight / 2, sz, 1  
        ]);
        gl.uniformMatrix4fv(uModel, false, model);
        drawMesh(gl, wheel.support, aPosition, aNormal, aTexCoord);
    }

    gl.uniform3fv(uObjectColor, [0.4, 0.4, 0.45]);
    const axleModel = new Float32Array([
        1,0,0,0, 0,0,-1,0, 0,1,0,0,
        px, centerY, pz, 1
    ]);
    gl.uniformMatrix4fv(uModel, false, axleModel);
    drawMesh(gl, wheel.axle, aPosition, aNormal, aTexCoord);

    gl.uniform3fv(uObjectColor, [0.3, 0.35, 0.8]);
    const rimModel = new Float32Array([
        ca,  sa, 0, 0,
        -sa, ca, 0, 0,
        0,   0,  1, 0,
        px, centerY, pz, 1
    ]);
    gl.uniformMatrix4fv(uModel, false, rimModel);
    drawMesh(gl, wheel.rim, aPosition, aNormal, aTexCoord);

    gl.uniform3fv(uObjectColor, [0.5, 0.5, 0.55]);

    for (let i = 0; i < SPOKE_COUNT; i++) {
        const a = (i / SPOKE_COUNT) * Math.PI * 2 + angle;
        const spokeAngle = a + Math.PI / 2;

        const midX = Math.cos(a) * WHEEL_RADIUS * 0.5;
        const midY = Math.sin(a) * WHEEL_RADIUS * 0.5;

        const cs = Math.cos(spokeAngle), ss = Math.sin(spokeAngle);

        const spokeModel = new Float32Array([
            cs,  ss, 0, 0,
            -ss, cs, 0, 0,
            0,   0,  1, 0,
            px + midX, centerY + midY, pz, 1
        ]);
        gl.uniformMatrix4fv(uModel, false, spokeModel);
        drawMesh(gl, wheel.spoke, aPosition, aNormal, aTexCoord);
    }

    gl.uniform3fv(uObjectColor, [0.9, 0.7, 0.2]); 
    const innerRim = WHEEL_RADIUS * 0.6; 
    const innerRimModel = new Float32Array([
        ca * 0.6, sa * 0.6, 0, 0,
        -sa * 0.6, ca * 0.6, 0, 0,
        0, 0, 1, 0,
        px, centerY, pz, 1
    ]);
    gl.uniformMatrix4fv(uModel, false, innerRimModel);
    drawMesh(gl, wheel.rim, aPosition, aNormal, aTexCoord);


    const colors = [
        [0.9, 0.2, 0.3], [0.2, 0.5, 0.9],
        [0.9, 0.75, 0.1], [0.2, 0.75, 0.3],
        [0.9, 0.4, 0.1], [0.6, 0.2, 0.85],
    ];

    for (let i = 0; i < CABIN_COUNT; i++) {
        const a = (i / CABIN_COUNT) * Math.PI * 2 + angle;
        const cx_ = Math.cos(a) * WHEEL_RADIUS;
        const cy_ = Math.sin(a) * WHEEL_RADIUS;

        gl.uniform3fv(uObjectColor, colors[i % colors.length]);
        const cabinModel = new Float32Array([
            1,0,0,0, 0,1,0,0, 0,0,1,0,
            px + cx_, centerY + cy_, pz, 1
        ]);
        gl.uniformMatrix4fv(uModel, false, cabinModel);
        drawMesh(gl, wheel.cabinBody, aPosition, aNormal, aTexCoord);
    }

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);

    for (let i = 0; i < CABIN_COUNT; i++) {
        const a = (i / CABIN_COUNT) * Math.PI * 2 + angle;
        const cx_ = Math.cos(a) * WHEEL_RADIUS;
        const cy_ = Math.sin(a) * WHEEL_RADIUS;

        gl.uniform3fv(uObjectColor, [0.7, 0.85, 1.0]);

        const cabinModel = new Float32Array([
            1,0,0,0, 0,1,0,0, 0,0,1,0,
            px + cx_, centerY + cy_, pz, 1
        ]);
        gl.uniformMatrix4fv(uModel, false, cabinModel);
        drawMesh(gl, wheel.cabinGlass, aPosition, aNormal, aTexCoord);
    }

    gl.depthMask(true);
    gl.disable(gl.BLEND);
}

export { WHEEL_RADIUS, CABIN_COUNT };