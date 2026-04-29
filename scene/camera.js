export class Camera {
    constructor() {
        this.position = [0, 2, 6];
        this.target = [0, 0, 0];
        this.up = [0, 1, 0];
    }

    getViewMatrix() {
        return lookAt(this.position, this.target, this.up);
    }
}