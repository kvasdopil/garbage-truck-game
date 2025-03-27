import Phaser from 'phaser';
import { ScoreCounter } from './ScoreCounter';

export class FlyStar extends Phaser.GameObjects.Sprite {
  private targetCounter: ScoreCounter;
  private isFlying: boolean = true;
  private isCollected: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number, targetCounter: ScoreCounter) {
    // Use the star icon from the icons spritesheet (frame 0)
    super(scene, x, y, 'icons', 0);

    this.targetCounter = targetCounter;

    // Add to scene and enable physics
    scene.add.existing(this);
    scene.physics.world.enable(this);

    // Make interactive for click/tap
    this.setInteractive();

    // Set a reasonable scale
    this.setScale(1.0);

    // Add glow effect
    // this.setBlendMode(Phaser.BlendModes.ADD);

    // Gentle pulse animation
    scene.tweens.add({
      targets: this,
      scale: 1.2,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Set random direction and speed for initial flight
    this.flyRandomDirection();

    // Handle click/tap on star
    this.on('pointerdown', this.onStarClicked, this);
  }

  private flyRandomDirection(): void {
    // Generate random angle in radians
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);

    // Convert to direction vector
    const speed = Phaser.Math.FloatBetween(150, 250);
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    // Set velocity
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(vx, vy);

    // Stop flying after 0.5 seconds
    this.scene.time.delayedCall(500, () => {
      body.setVelocity(0, 0);
      this.isFlying = false;
    });
  }

  private onStarClicked(): void {
    // Only collect if not already collected and not in initial flying phase
    if (this.isCollected || this.isFlying) return;

    this.isCollected = true;

    // Disable interaction during collection animation
    this.disableInteractive();

    // Stop any existing tweens
    this.scene.tweens.killTweensOf(this);

    // Get the position of the score counter's star icon
    const targetX = this.targetCounter.x;
    const targetY = this.targetCounter.y;

    // Fly to the score counter
    this.scene.tweens.add({
      targets: this,
      x: targetX,
      y: targetY,
      scale: 0.5,
      duration: 400,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        // Increment the score when star reaches the counter
        this.targetCounter.incrementScore();

        // Final flash effect before destroying
        this.scene.tweens.add({
          targets: this,
          scale: 1.5,
          alpha: 0,
          duration: 200,
          onComplete: () => {
            this.destroy();
          },
        });
      },
    });
  }
}
