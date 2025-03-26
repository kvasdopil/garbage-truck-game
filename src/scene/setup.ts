import * as THREE from 'three';

export class SceneSetup {
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  renderer: THREE.WebGLRenderer;

  constructor(canvas: HTMLCanvasElement) {
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xffffff);

    // Calculate camera frustum based on screen size
    const aspectRatio = window.innerWidth / window.innerHeight;
    const frustumSize = 5;
    const width = frustumSize * aspectRatio;
    const height = frustumSize;

    // Create orthographic camera
    this.camera = new THREE.OrthographicCamera(
      -width / 2, // left
      width / 2, // right
      height / 2, // top
      -height / 2, // bottom
      0.1, // near
      1000 // far
    );
    this.camera.position.z = 5;

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // Handle window resize
    window.addEventListener('resize', this.handleResize);
  }

  private handleResize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspectRatio = width / height;
    const frustumSize = 5;

    // Update camera frustum
    const newWidth = frustumSize * aspectRatio;
    const newHeight = frustumSize;
    this.camera.left = -newWidth / 2;
    this.camera.right = newWidth / 2;
    this.camera.top = newHeight / 2;
    this.camera.bottom = -newHeight / 2;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  };

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    window.removeEventListener('resize', this.handleResize);
    this.renderer.dispose();
  }
}
