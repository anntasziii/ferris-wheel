/**
 * @brief Camera class for managing view transformations
 * @details Supports both free look and orbit camera modes with smooth interpolation
 */
export class Camera {
    constructor() {
        this.position = [0, 2, 6];
        this.target = [0, 0, 0];
        this.yaw = 0;
        this.pitch = 0;
        this.targetYaw = 0;
        this.targetPitch = 0;
        this.distance = 6;
        this.sensitivity = 0.005;
        this.smoothness = 0.08;
        this.isOrbit = false; 
    }

    /**
     * @brief Updates camera position based on mode (orbit or free look)
     * @details In orbit mode, updates position around target. In free look, position is controlled directly
     * @return {void}
     */
    update() {
        if (this.isOrbit) {
            // Smoothly interpolate rotation angles toward targets
            this.yaw   += (this.targetYaw   - this.yaw)   * this.smoothness;
            this.pitch += (this.targetPitch - this.pitch) * this.smoothness;

            // Calculate position on sphere around target
            const positionX = Math.cos(this.pitch) * Math.sin(this.yaw) * this.distance;
            const positionY = Math.sin(this.pitch) * this.distance;
            const positionZ = Math.cos(this.pitch) * Math.cos(this.yaw) * this.distance;

            this.position = [
                this.target[0] + positionX,
                this.target[1] + positionY,
                this.target[2] + positionZ
            ];
        }
    }

    /**
     * @brief Generates view matrix from camera position and target
     * @return {Float32Array} View matrix (4x4) for shader use
     */
    getViewMatrix() {
        return lookAt(this.position, this.target, [0, 1, 0]);
    }
}

/**
 * @brief Constructs view matrix using look-at convention
 * @param {Array<number>} eyePosition - Camera position [x, y, z]
 * @param {Array<number>} centerTarget - Look-at target point [x, y, z]
 * @param {Array<number>} upVector - Up vector, typically [0, 1, 0]
 * @return {Float32Array} View matrix (4x4)
 */
function lookAt(eyePosition, centerTarget, upVector) {
    const [eyeX, eyeY, eyeZ] = eyePosition;
    const [centerX, centerY, centerZ] = centerTarget;

    // Calculate forward vector (Z axis)
    let forwardX = eyeX - centerX;
    let forwardY = eyeY - centerY;
    let forwardZ = eyeZ - centerZ;

    // Normalize forward vector
    const forwardLength = Math.hypot(forwardX, forwardY, forwardZ);
    forwardX /= forwardLength;
    forwardY /= forwardLength;
    forwardZ /= forwardLength;

    // Calculate right vector (X axis) as cross product of up and forward
    let rightX = upVector[1] * forwardZ - upVector[2] * forwardY;
    let rightY = upVector[2] * forwardX - upVector[0] * forwardZ;
    let rightZ = upVector[0] * forwardY - upVector[1] * forwardX;

    // Normalize right vector
    const rightLength = Math.hypot(rightX, rightY, rightZ);
    rightX /= rightLength;
    rightY /= rightLength;
    rightZ /= rightLength;

    // Recalculate up vector (Y axis) as cross product of forward and right
    const recalculatedUpX = forwardY * rightZ - forwardZ * rightY;
    const recalculatedUpY = forwardZ * rightX - forwardX * rightZ;
    const recalculatedUpZ = forwardX * rightY - forwardY * rightX;

    // Construct view matrix
    return new Float32Array([
        rightX, recalculatedUpX, forwardX, 0,
        rightY, recalculatedUpY, forwardY, 0,
        rightZ, recalculatedUpZ, forwardZ, 0,
        -(rightX*eyeX + rightY*eyeY + rightZ*eyeZ),
        -(recalculatedUpX*eyeX + recalculatedUpY*eyeY + recalculatedUpZ*eyeZ),
        -(forwardX*eyeX + forwardY*eyeY + forwardZ*eyeZ),
        1
    ]);
}

/**
 * @brief Subtracts two 3D vectors
 * @param {Array<number>} vectorA - First vector [x, y, z]
 * @param {Array<number>} vectorB - Second vector [x, y, z]
 * @return {Array<number>} Result vector [x, y, z]
 */
function subtract(vectorA, vectorB) {
    return [
        vectorA[0] - vectorB[0],
        vectorA[1] - vectorB[1],
        vectorA[2] - vectorB[2]
    ];
}

/**
 * @brief Normalizes a 3D vector to unit length
 * @param {Array<number>} vector - Vector to normalize [x, y, z]
 * @return {Array<number>} Normalized vector [x, y, z]
 */
function normalize(vector) {
    const length = Math.hypot(vector[0], vector[1], vector[2]);
    return length > 0 
        ? [vector[0]/length, vector[1]/length, vector[2]/length]
        : [0, 0, 0];
}

/**
 * @brief Calculates cross product of two 3D vectors
 * @param {Array<number>} vectorA - First vector [x, y, z]
 * @param {Array<number>} vectorB - Second vector [x, y, z]
 * @return {Array<number>} Cross product vector [x, y, z]
 */
function cross(vectorA, vectorB) {
    return [
        vectorA[1]*vectorB[2] - vectorA[2]*vectorB[1],
        vectorA[2]*vectorB[0] - vectorA[0]*vectorB[2],
        vectorA[0]*vectorB[1] - vectorA[1]*vectorB[0]
    ];
}

/**
 * @brief Calculates dot product of two 3D vectors
 * @param {Array<number>} vectorA - First vector [x, y, z]
 * @param {Array<number>} vectorB - Second vector [x, y, z]
 * @return {number} Dot product scalar value
 */
function dot(vectorA, vectorB) {
    return vectorA[0]*vectorB[0] + vectorA[1]*vectorB[1] + vectorA[2]*vectorB[2];
}