import { SceneSetup } from './scene/setup';
import { GameContent } from './scene/content';

// Get canvas element
const canvas = document.querySelector('#game-canvas') as HTMLCanvasElement;

// Create scene setup
const sceneSetup = new SceneSetup(canvas);

// Create game content
const gameContent = new GameContent(sceneSetup);

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  sceneSetup.render();
}

// Start animation loop
animate();

// Clean up on window unload
window.addEventListener('unload', () => {
  gameContent.dispose();
  sceneSetup.dispose();
});
