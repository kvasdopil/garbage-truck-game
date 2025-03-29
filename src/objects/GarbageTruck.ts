import Phaser from 'phaser';

export class GarbageTruck extends Phaser.GameObjects.Container {
  private truckBody: Phaser.GameObjects.Sprite;
  private frontWheel: Phaser.GameObjects.Sprite;
  private backWheel: Phaser.GameObjects.Sprite;
  private frontWheelTween?: Phaser.Tweens.Tween;
  private backWheelTween?: Phaser.Tweens.Tween;
  private bodyBounceTween?: Phaser.Tweens.Tween;
  private originalBodyY: number = 0;
  private targetX: number;

  private awayOffsetX: number = 500;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    // Store target position
    this.targetX = x;
    this.setPosition(this.targetX - this.awayOffsetX, y);

    // Create wheels using the atlas frame
    this.backWheel = scene.add.sprite(90, 95, 'truck-general', 'truck-wheel');
    this.frontWheel = scene.add.sprite(-125, 95, 'truck-general', 'truck-wheel');
    this.truckBody = scene.add.sprite(0, 0, 'truck-general', 'truck-body');

    // Store original y position of the body for bouncing
    this.originalBodyY = this.truckBody.y;

    // Set explicit depth values
    this.truckBody.setDepth(0); // Body at back
    this.backWheel.setDepth(1); // Wheels in front
    this.frontWheel.setDepth(1); // Wheels in front

    // Add all parts to the container
    this.add(this.truckBody);
    this.add(this.backWheel);
    this.add(this.frontWheel);

    // Add container to the scene
    scene.add.existing(this);
  }

  public async driveIn(): Promise<void> {
    // Start from off-screen left
    this.x = this.targetX - this.awayOffsetX;

    // Start animations
    this.animateWheels(1);

    // Create and return a promise that resolves when the movement is complete
    await new Promise(resolve => {
      this.scene.add.tween({
        targets: this,
        x: this.targetX,
        duration: 4000, // 2 seconds to drive in
        ease: 'Cubic.easeOut',
        onComplete: resolve,
      });
    });

    this.animateWheels(0);
  }

  public async driveOut(): Promise<void> {
    // Start animations
    this.animateWheels(-1);

    // Create and return a promise that resolves when the movement is complete
    await new Promise(resolve => {
      this.scene.add.tween({
        targets: this,
        x: this.targetX - this.awayOffsetX,
        duration: 2000, // 2 seconds to drive out
        ease: 'Cubic.easeIn',
        onComplete: resolve,
      });
    });

    this.animateWheels(0);
  }

  // Method to animate wheels and body
  public animateWheels(direction: number) {
    if (direction === 0) {
      // Stop all animations
      this.frontWheelTween?.stop();
      this.backWheelTween?.stop();
      this.bodyBounceTween?.stop();

      // Reset positions and rotations
      this.frontWheel.rotation = 0;
      this.backWheel.rotation = 0;
      this.truckBody.y = this.originalBodyY;
      return;
    }

    // Stop existing tweens if they exist
    this.frontWheelTween?.stop();
    this.backWheelTween?.stop();
    this.bodyBounceTween?.stop();

    // Create new tweens for continuous rotation
    this.frontWheelTween = this.scene.add.tween({
      targets: this.frontWheel,
      rotation: { from: 0, to: direction * Math.PI * 2 },
      duration: 1000, // One full rotation per second
      repeat: -1, // Repeat indefinitely
      ease: 'Linear',
    });

    this.backWheelTween = this.scene.add.tween({
      targets: this.backWheel,
      rotation: { from: 0, to: direction * Math.PI * 2 },
      duration: 1000, // One full rotation per second
      repeat: -1, // Repeat indefinitely
      ease: 'Linear',
    });

    // Add bouncing animation to the truck body
    this.bodyBounceTween = this.scene.add.tween({
      targets: this.truckBody,
      y: {
        from: this.originalBodyY,
        to: this.originalBodyY - 5,
      },
      duration: 500, // Half a second up and down
      yoyo: true, // Makes it bounce back
      repeat: -1, // Repeat indefinitely
      ease: 'Sine.easeInOut', // Smooth bouncing motion
    });
  }

  // Method to get the truck's width (useful for positioning)
  public getTruckWidth(): number {
    return this.truckBody.width;
  }

  // Method to get the truck's height
  public getTruckHeight(): number {
    return this.truckBody.height;
  }
}
