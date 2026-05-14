/**
 * @brief Collision detection and response system
 * @details Handles terrain bounds, height, and object collisions
 */

export class CollisionSystem {
    constructor(terrainGetHeight, terrainGetBaseHeight, terrainSize = 120) {
        this.terrainGetHeight = terrainGetHeight;
        this.terrainGetBaseHeight = terrainGetBaseHeight;
        this.terrainSize = terrainSize;
        this.terrainOffset = 60;  // Terrain je posunuta do (-60, -60)
        
        // Collision objects (must be added manually)
        this.collisionObjects = [];
        
        // Camera collision radius
        this.cameraRadius = 2.0;
    }

    /**
     * @brief Add collision object (tree, ferris wheel, etc)
     * @param {Object} obj - Object with {x, y, z, radius}
     */
    addCollisionObject(x, z, radius = 3.0) {
        this.collisionObjects.push({
            x: x,
            z: z,
            radius: radius
        });
    }

    /**
     * @brief Check if position is within terrain bounds
     * @param {number} x - World X coordinate
     * @param {number} z - World Z coordinate
     * @return {boolean} True if within bounds
     */
    isWithinTerrainBounds(x, z) {
        // Terrain spans from 0 to terrainSize
        return x >= 0 && x <= this.terrainSize && z >= 0 && z <= this.terrainSize;
    }

    /**
     * @brief Clamp position to terrain bounds
     * @param {Array} position - [x, y, z] camera position
     * @return {Array} Clamped position
     */
    clampToTerrainBounds(position) {
        const clamped = [...position];
        
        // Clamp X and Z to terrain bounds
        clamped[0] = Math.max(this.cameraRadius, Math.min(this.terrainSize - this.cameraRadius, clamped[0]));
        clamped[2] = Math.max(this.cameraRadius, Math.min(this.terrainSize - this.cameraRadius, clamped[2]));
        
        return clamped;
    }

    /**
     * @brief Get terrain height at position
     * @param {number} x - World X coordinate (0-120)
     * @param {number} z - World Z coordinate (0-120)
     * @return {number} Terrain height at position
     */
    getTerrainHeightAt(x, z) {
        // Convert world coords to terrain local coords
        const localX = x + this.terrainOffset;
        const localZ = z + this.terrainOffset;
        
        // Call terrain's getHeight function
        if (this.terrainGetHeight) {
            return this.terrainGetHeight(localX, localZ);
        }
        return 0;
    }

    /**
     * @brief Check distance to nearest collision object
     * @param {number} x - Camera X
     * @param {number} z - Camera Z
     * @return {Object} {distance, object, colliding}
     */
    checkObjectCollision(x, z) {
        let minDistance = Infinity;
        let nearestObject = null;
        
        for (const obj of this.collisionObjects) {
            const dx = x - obj.x;
            const dz = z - obj.z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            
            if (distance < minDistance) {
                minDistance = distance;
                nearestObject = obj;
            }
        }
        
        const minCollisionDistance = this.cameraRadius + (nearestObject?.radius || 0);
        
        return {
            distance: minDistance,
            object: nearestObject,
            colliding: minDistance < minCollisionDistance
        };
    }

    /**
     * @brief Resolve collision by pushing camera away
     * @param {Array} position - Current position [x, y, z]
     * @param {number} x - Collision object X
     * @param {number} z - Collision object Z
     * @param {number} pushDistance - Distance to push away
     * @return {Array} New position
     */
    resolveObjectCollision(position, objX, objZ, pushDistance) {
        const dx = position[0] - objX;
        const dz = position[2] - objZ;
        const dist = Math.sqrt(dx * dx + dz * dz);
        
        if (dist === 0) {
            // Camera exactly at object center - push randomly
            return [position[0] + pushDistance, position[1], position[2]];
        }
        
        // Push camera away from object
        const nx = dx / dist;
        const nz = dz / dist;
        
        return [
            objX + nx * pushDistance,
            position[1],
            objZ + nz * pushDistance
        ];
    }

    /**
     * @brief Apply all collision checks and responses
     * @param {Array} position - Current camera position [x, y, z]
     * @return {Array} Corrected position
     */
/**
     * @brief Check if position is within terrain bounds
     * @details Враховуємо зміщення: сцена від -60 до 60 (всього 120 одиниць)
     */
    isWithinTerrainBounds(x, z) {
        const minBound = -this.terrainOffset; // -60
        const maxBound = this.terrainSize - this.terrainOffset; // 120 - 60 = 60
        return x >= minBound && x <= maxBound && z >= minBound && z <= maxBound;
    }

    /**
     * @brief Apply all collision checks and responses
     */
    resolveCollisions(position) {
        let newPos = [...position];
        
        // Визначаємо реальні межі сцени з урахуванням зміщення
        const minBound = -this.terrainOffset; // -60
        const maxBound = this.terrainSize - this.terrainOffset; // 60

        // 1️⃣ ОБМЕЖЕННЯ ПО ВЕРТИКАЛІ (Y)
        const terrainHeight = this.getTerrainHeightAt(newPos[0], newPos[2]);
        const minHeight = terrainHeight + this.cameraRadius;
        const maxHeight = 60.0; // Максимальна висота польоту

        // Тримаємо камеру не нижче землі
        if (newPos[1] < minHeight) {
            newPos[1] = minHeight;
        }
        // Тримаємо камеру не вище ліміту
        if (newPos[1] > maxHeight) {
            newPos[1] = maxHeight;
        }

        // 2️⃣ ОБМЕЖЕННЯ ПО ГОРИЗОНТАЛІ (X та Z)
        // Використовуємо радіус камери, щоб вона не врізалася в "невидиму стіну" на самому краї
        const padding = this.cameraRadius;
        
        // Обмеження X: від -60 до 60
        newPos[0] = Math.max(minBound + padding, Math.min(maxBound - padding, newPos[0]));
        
        // Обмеження Z: від -60 до 60
        newPos[2] = Math.max(minBound + padding, Math.min(maxBound - padding, newPos[2]));

        // 3️⃣ КОЛІЗІЇ З ОБ'ЄКТАМИ (дерева, колесо)
        // Перевіряємо колізії тільки якщо ми не летимо занадто високо
        if (newPos[1] < 40) {
            const collision = this.checkObjectCollision(newPos[0], newPos[2]);
            if (collision.colliding && collision.object) {
                const pushDist = collision.object.radius + this.cameraRadius + 0.5;
                newPos = this.resolveObjectCollision(newPos, collision.object.x, collision.object.z, pushDist);
                
                // Після того, як об'єкт "відштовхнув" камеру, ще раз перевіряємо межі сцени
                newPos[0] = Math.max(minBound + padding, Math.min(maxBound - padding, newPos[0]));
                newPos[2] = Math.max(minBound + padding, Math.min(maxBound - padding, newPos[2]));
            }
        }
        
        return newPos;
    }
    /**
     * @brief Debug: Draw collision visualization (console output)
     */
    debugInfo(position) {
        const terrainH = this.getTerrainHeightAt(position[0], position[2]);
        const collision = this.checkObjectCollision(position[0], position[2]);
        
    }
}