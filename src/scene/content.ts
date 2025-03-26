import * as THREE from 'three';
import type { SceneSetup } from './setup';

export class GameContent {
  private truck: THREE.Mesh;
  private bin: THREE.Mesh;
  private dropZone: THREE.Mesh;

  constructor(private sceneSetup: SceneSetup) {
    // Load the truck texture
    const textureLoader = new THREE.TextureLoader();
    const truckTexture = textureLoader.load('/truck.png');
    truckTexture.colorSpace = THREE.SRGBColorSpace;

    // Create truck plane
    const truckGeometry = new THREE.PlaneGeometry(3, 3); // Smaller truck
    const truckMaterial = new THREE.MeshBasicMaterial({
      map: truckTexture,
      transparent: true,
    });

    this.truck = new THREE.Mesh(truckGeometry, truckMaterial);
    this.truck.position.x = -2; // Move to left third of screen
    this.sceneSetup.scene.add(this.truck);

    // Create drop zone (rounded rectangle)
    const roundedRectShape = new THREE.Shape();
    const width = 1.1; // Smaller width
    const height = 1.3; // Smaller height
    const radius = 0.2; // Smaller radius

    roundedRectShape.moveTo(-width / 2, -height / 2 + radius);
    roundedRectShape.lineTo(-width / 2, height / 2 - radius);
    roundedRectShape.quadraticCurveTo(-width / 2, height / 2, -width / 2 + radius, height / 2);
    roundedRectShape.lineTo(width / 2 - radius, height / 2);
    roundedRectShape.quadraticCurveTo(width / 2, height / 2, width / 2, height / 2 - radius);
    roundedRectShape.lineTo(width / 2, -height / 2 + radius);
    roundedRectShape.quadraticCurveTo(width / 2, -height / 2, width / 2 - radius, -height / 2);
    roundedRectShape.lineTo(-width / 2 + radius, -height / 2);
    roundedRectShape.quadraticCurveTo(-width / 2, -height / 2, -width / 2, -height / 2 + radius);

    const dropZoneGeometry = new THREE.ShapeGeometry(roundedRectShape);
    const dropZoneMaterial = new THREE.MeshBasicMaterial({
      color: 0x4caf50,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
    });

    this.dropZone = new THREE.Mesh(dropZoneGeometry, dropZoneMaterial);
    this.dropZone.position.x = 0; // Centered position relative to new truck position
    this.dropZone.position.y = -0.2;
    this.sceneSetup.scene.add(this.dropZone);

    // Create drop zone border
    const borderGeometry = new THREE.EdgesGeometry(dropZoneGeometry);
    const borderMaterial = new THREE.LineBasicMaterial({
      color: 0x4caf50,
      linewidth: 2,
    });
    const border = new THREE.LineSegments(borderGeometry, borderMaterial);
    this.dropZone.add(border);

    // Load and create the bin
    const binTexture = textureLoader.load('/bin-green.png');
    binTexture.colorSpace = THREE.SRGBColorSpace;

    const binGeometry = new THREE.PlaneGeometry(1.5, 1.5); // Smaller bin
    const binMaterial = new THREE.MeshBasicMaterial({
      map: binTexture,
      transparent: true,
    });

    this.bin = new THREE.Mesh(binGeometry, binMaterial);
    this.bin.position.x = 3; // Position to the right of the drop zone
    this.sceneSetup.scene.add(this.bin);

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
    this.bin.geometry.dispose();
    (this.bin.material as THREE.Material).dispose();
    this.dropZone.geometry.dispose();
    (this.dropZone.material as THREE.Material).dispose();
    // Remove from scene
    this.sceneSetup.scene.remove(this.truck);
    this.sceneSetup.scene.remove(this.bin);
    this.sceneSetup.scene.remove(this.dropZone);
  }
}
