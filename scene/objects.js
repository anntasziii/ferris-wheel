// objects.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160/build/three.module.js';

// КУБ
export function createCube() {
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
    return new THREE.Mesh(geometry, material);
}

// ПЛОЩИНА (ЗЕМЛЯ)
export function createGround() {
    const geometry = new THREE.PlaneGeometry(20, 20);
    const material = new THREE.MeshPhongMaterial({ color: 0x808080 });

    const plane = new THREE.Mesh(geometry, material);

    plane.rotation.x = -Math.PI / 2; // кладемо горизонтально
    plane.position.y = -1; // трохи вниз

    return plane;
}