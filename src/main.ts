import * as THREE from 'three';

// Create scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff); // White background

// Create camera
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = 5;

// Create renderer
const canvas = document.querySelector('#game-canvas') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth * 0.8, window.innerHeight * 0.7);

// Create a triangle
const geometry = new THREE.BufferGeometry();
const vertices = new Float32Array([
  0.0, 1.0, 0.0,    // top
  -1.0, -1.0, 0.0,  // bottom left
  1.0, -1.0, 0.0    // bottom right
]);
geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

const material = new THREE.MeshBasicMaterial({
  color: 0x00ff00,
  side: THREE.DoubleSide
});

const triangle = new THREE.Mesh(geometry, material);
scene.add(triangle);

// Handle window resize
window.addEventListener('resize', () => {
  const width = window.innerWidth * 0.8;
  const height = window.innerHeight * 0.7;
  
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
});

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  
  // Rotate the triangle
  triangle.rotation.y += 0.01;
  
  renderer.render(scene, camera);
}

animate(); 