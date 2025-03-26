import * as THREE from 'three';
import type { SceneSetup } from './setup';

export class GameContent {
  private truck: THREE.Mesh;

  constructor(private sceneSetup: SceneSetup) {
    // Load the truck texture
    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load('/truck.png');
    texture.colorSpace = THREE.SRGBColorSpace;

    // Create a plane geometry
    const geometry = new THREE.PlaneGeometry(4, 4); // Adjust size as needed

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
    });

    this.truck = new THREE.Mesh(geometry, material);
    this.sceneSetup.scene.add(this.truck);

    // Setup animations
    this.setupAnimations();
  }

  private setupAnimations() {
    // Create an infinite rotation animation using GSAP (clockwise around Z-axis)
    // gsap.to(this.truck.rotation, {
    //   z: -Math.PI * 2, // Negative for clockwise rotation
    //   duration: 2,
    //   ease: 'none',
    //   repeat: -1,
    // });
  }

  dispose() {
    // Clean up geometry and material
    this.truck.geometry.dispose();
    (this.truck.material as THREE.Material).dispose();
    // Remove from scene
    this.sceneSetup.scene.remove(this.truck);
  }
}
