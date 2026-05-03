export class Camera {
    constructor() {
        this.position = [0, 2, 6];

        this.yaw = 0;
        this.pitch = 0;

        this.targetYaw = 0;
        this.targetPitch = 0;

        this.distance = 6;

        this.sensitivity = 0.005;
        this.smoothness = 0.08;
    }

    update() {
        this.yaw += (this.targetYaw - this.yaw) * this.smoothness;
        this.pitch += (this.targetPitch - this.pitch) * this.smoothness;

        const x = Math.cos(this.pitch) * Math.sin(this.yaw) * this.distance;
        const y = Math.sin(this.pitch) * this.distance;
        const z = Math.cos(this.pitch) * Math.cos(this.yaw) * this.distance;

        this.position = [x, y, z];
    }

    getViewMatrix() {
        const [x, y, z] = this.position;

        return lookAt(
            [x, y, z],
            [0, 0, 0],
            [0, 1, 0]
        );
    }
}

function lookAt(eye, center, up) {
    const [ex, ey, ez] = eye;
    const [cx, cy, cz] = center;

    let zx = ex - cx;
    let zy = ey - cy;
    let zz = ez - cz;

    const len = Math.hypot(zx, zy, zz);
    zx /= len; zy /= len; zz /= len;

    let xx = up[1] * zz - up[2] * zy;
    let xy = up[2] * zx - up[0] * zz;
    let xz = up[0] * zy - up[1] * zx;

    const len2 = Math.hypot(xx, xy, xz);
    xx /= len2; xy /= len2; xz /= len2;

    const yx = zy * xz - zz * xy;
    const yy = zz * xx - zx * xz;
    const yz = zx * xy - zy * xx;

    return new Float32Array([
        xx, yx, zx, 0,
        xy, yy, zy, 0,
        xz, yz, zz, 0,
        -(xx*ex + xy*ey + xz*ez),
        -(yx*ex + yy*ey + yz*ez),
        -(zx*ex + zy*ey + zz*ez),
        1
    ]);
}

function subtract(a, b) {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function normalize(v) {
    const len = Math.hypot(v[0], v[1], v[2]);
    return len > 0 ? [v[0]/len, v[1]/len, v[2]/len] : [0,0,0];
}

function cross(a, b) {
    return [
        a[1]*b[2] - a[2]*b[1],
        a[2]*b[0] - a[0]*b[2],
        a[0]*b[1] - a[1]*b[0]
    ];
}

function dot(a, b) {
    return a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
}