const RIVER_POINTS = [
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

function distToRiver(x, z) {
    let minDist = Infinity;
    for (let i = 0; i < RIVER_POINTS.length - 1; i++) {
        const a = RIVER_POINTS[i];
        const b = RIVER_POINTS[i + 1];
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const len2 = dx*dx + dz*dz;
        let t = ((x - a.x)*dx + (z - a.z)*dz) / len2;
        t = Math.max(0, Math.min(1, t));
        const cx = a.x + t*dx;
        const cz = a.z + t*dz;
        const d = Math.sqrt((x-cx)*(x-cx) + (z-cz)*(z-cz));
        if (d < minDist) minDist = d;
    }
    return minDist;
}

export function createTerrain(size = 120, step = 1) {
    const vertices = [];
    const normals = [];
    const indices = [];
    const texcoords = [];

    const riverWidth = 3.0;  
    const bankWidth  = 3.5;   
    const bankHeight = 1.5;   

    function baseNoise(x, z) {
        const nx = x * 0.08;
        const nz = z * 0.08;
        const mountains = Math.sin(nx * 0.5) * Math.cos(nz * 0.5) * 1.0;
        const hills     = Math.sin(nx * 1.2 + nz * 0.8) * 0.8;
        const detail    = Math.sin(nx * 3.0) * Math.cos(nz * 3.0) * 0.3;
        const bumps     = Math.cos(nx * 2.3) * Math.sin(nz * 2.7) * 0.4;
        const base = mountains + hills + detail + bumps;
        
        const centerZ = size / 2;
        const distZ = Math.abs(z - centerZ) / centerZ;
        const edgeBoost = distZ * distZ * 3.0;

        const distX = Math.abs(x - size / 2) / (size / 2);
        const distZ_edge = Math.abs(z - size / 2) / (size / 2);
        const maxDist = Math.max(distX, distZ_edge);

        let edgeHill = 0;
        if (maxDist > 0.5) {
            const edgeAmount = (maxDist - 0.5) / 0.5; 
            const smooth = edgeAmount * edgeAmount * (3.0 - 2.0 * edgeAmount);
            edgeHill = Math.pow(smooth, 0.7) * 9.5;
        }

        return base + edgeBoost + edgeHill;
    }

    function noise(x, z) {
        const base = baseNoise(x, z);
        const dist = distToRiver(x, z);
        const riverEdge = riverWidth * 0.5;
        let bankBoost = 0.0;
        if (dist > riverEdge && dist < riverEdge + bankWidth) {
            const t = (dist - riverEdge) / bankWidth;
            const smooth = t * t * (3.0 - 2.0 * t);
            bankBoost = Math.sin(t * Math.PI) * bankHeight;
        }
        return base + bankBoost;
    }

    const vertsPerRow = size / step + 1;

    for (let z = 0; z <= size; z += step) {
        for (let x = 0; x <= size; x += step) {
            const y = noise(x, z);
            vertices.push(x, y, z);
            normals.push(0, 1, 0);
            texcoords.push(x / 8, z / 8);
        }
    }

    for (let z = 0; z < size; z += step) {
        for (let x = 0; x < size; x += step) {
            const i0 = z * vertsPerRow + x;
            const i1 = i0 + 1;
            const i2 = i0 + vertsPerRow;
            const i3 = i2 + 1;
            indices.push(i0, i2, i1);
            indices.push(i1, i2, i3);
        }
    }

    for (let z = 0; z <= size; z += step) {
        for (let x = 0; x <= size; x += step) {
            const hL = noise(x - step, z);
            const hR = noise(x + step, z);
            const hD = noise(x, z - step);
            const hU = noise(x, z + step);
            let nx = hL - hR;
            let ny = 2.0 * step;
            let nz = hD - hU;
            const len = Math.sqrt(nx*nx + ny*ny + nz*nz);
            const idx = (z * vertsPerRow + x) * 3;
            normals[idx]   = nx / len;
            normals[idx+1] = ny / len;
            normals[idx+2] = nz / len;
        }
    }

    return {
        vertices:  new Float32Array(vertices),
        normals:   new Float32Array(normals),
        indices:   new Uint16Array(indices),
        texcoords: new Float32Array(texcoords),
        count:     indices.length,
        getHeight: noise,
        getBaseHeight: baseNoise 
    };
}