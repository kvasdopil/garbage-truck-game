import Phaser from 'phaser';

// Import truck JSON data
import truckGeneralData from '../models/truck-general.json';
import truckCatData from '../models/truck-cat.json';
import truckWhiteData from '../models/truck-white.json';
import truckMonsterData from '../models/truck-monster.json';
import truckVintageData from '../models/truck-vintage.json';

type Truck = {
  // texture: string; // Removed root texture property
  wheels?: { texture: string; x: number; y: number }[]; // Changed sprite to texture
  body: { texture: string; x: number; y: number }; // Changed sprite to texture
  caterpillars?: { texture: string; x: number; y: number }; // Changed sprite to texture
};

// Recreate the Trucks object using imported data
const Trucks = {
  'truck-general': truckGeneralData as Truck,
  'truck-cat': truckCatData as Truck,
  'truck-white': truckWhiteData as Truck,
  'truck-monster': truckMonsterData as Truck,
  'truck-vintage': truckVintageData as Truck,
};

export class GarbageTruck extends Phaser.GameObjects.Container {
  private truckBody?: Phaser.GameObjects.Sprite;
  private truckCaterpillars?: Phaser.GameObjects.Sprite;
  private truckWheels: Phaser.GameObjects.Sprite[] = [];
  // private backWheel: Phaser.GameObjects.Sprite;
  private bodyBounceTween?: Phaser.Tweens.Tween;
  private originalBodyY: number = 0;
  private targetX: number;
  private wheelTweens: Phaser.Tweens.Tween[] = [];

  private driveInTween: Phaser.Types.Tweens.TweenConfigDefaults & { x: number };
  private driveOutTween: Phaser.Types.Tweens.TweenConfigDefaults & { x: number };

  private awayOffsetX: number = 500;

  constructor(scene: Phaser.Scene, x: number, y: number, truckType: keyof typeof Trucks) {
    super(scene, x, y);

    // Store target position
    this.targetX = x;
    this.setPosition(this.targetX - this.awayOffsetX, y);

    // Use the locally defined Trucks object
    const truck = Trucks[truckType];

    if (truck.body) {
      const [textureKey, frameName] = truck.body.texture.split('/');
      this.truckBody = scene.add.sprite(truck.body.x, truck.body.y, textureKey, frameName);
    }
    if (truck.caterpillars) {
      const [textureKey, frameName] = truck.caterpillars.texture.split('/');
      this.truckCaterpillars = scene.add.sprite(
        truck.caterpillars.x,
        truck.caterpillars.y,
        textureKey,
        frameName
      );
    }
    if (truck.wheels) {
      truck.wheels.forEach(wheel => {
        const [textureKey, frameName] = wheel.texture.split('/');
        this.truckWheels.push(scene.add.sprite(wheel.x, wheel.y, textureKey, frameName));
      });
    }

    // Store original y position of the body for bouncing
    this.originalBodyY = this.truckBody?.y ?? 0;

    // Set explicit depth values
    if (this.truckBody) {
      this.truckBody.setDepth(0); // Body at back
      this.add(this.truckBody);
    }
    if (this.truckCaterpillars) {
      this.truckCaterpillars.setDepth(1); // Wheels in front
      this.add(this.truckCaterpillars);
    }
    if (this.truckWheels) {
      this.truckWheels.forEach(wheel => {
        wheel.setDepth(1); // Wheels in front
        this.add(wheel);
      });
    }

    this.driveInTween = {
      targets: this,
      x: this.targetX,
      duration: 4000, // 2 seconds to drive in
      ease: 'Cubic.easeOut',
    };
    this.driveOutTween = {
      targets: this,
      x: this.targetX - this.awayOffsetX,
      duration: 2000, // 2 seconds to drive out
      ease: 'Cubic.easeIn',
    };

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
        ...this.driveInTween,
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
        ...this.driveOutTween,
        onComplete: resolve,
      });
    });

    this.animateWheels(0);
  }

  // Method to animate wheels and body
  public animateWheels(direction: number) {
    if (direction === 0) {
      // Stop all animations
      this.wheelTweens.forEach(tween => tween.stop());
      this.bodyBounceTween?.stop();

      // Reset positions and rotations
      if (this.truckWheels) {
        this.truckWheels.forEach(wheel => {
          wheel.rotation = 0;
        });
      }

      if (this.truckBody) {
        this.truckBody.y = this.originalBodyY;
      }
      return;
    }

    // Stop existing tweens if they exist
    this.wheelTweens.forEach(tween => tween.stop());
    this.bodyBounceTween?.stop();

    // create new tweens for continuous rotation for all wheels
    if (this.truckWheels) {
      this.truckWheels.forEach(wheel => {
        const tween = this.scene.add.tween({
          targets: wheel,
          rotation: { from: 0, to: direction * Math.PI * 2 },
          duration: 1000, // One full rotation per second
          repeat: -1, // Repeat indefinitely
          ease: 'Linear',
        });
        this.wheelTweens.push(tween);
      });
    }

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
    return this.truckBody?.width ?? 0;
  }

  // Method to get the truck's height
  public getTruckHeight(): number {
    return this.truckBody?.height ?? 0;
  }
}
