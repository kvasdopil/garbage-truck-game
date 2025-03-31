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
  private visualContainer: Phaser.GameObjects.Container;
  // private backWheel: Phaser.GameObjects.Sprite;
  private bodyBounceTween?: Phaser.Tweens.Tween;
  private targetX: number;
  private wheelTweens: Phaser.Tweens.Tween[] = [];

  private awayOffsetX: number = 500;

  private bodyBounceTweenConfig: Phaser.Types.Tweens.TweenConfigDefaults & { y: any };

  constructor(scene: Phaser.Scene, x: number, y: number, truckType: keyof typeof Trucks) {
    super(scene, x, y);

    // Store target position
    this.targetX = x;
    this.setPosition(this.targetX - this.awayOffsetX, y);

    // Use the locally defined Trucks object
    const truck = Trucks[truckType];

    // Create and add the visual container
    this.visualContainer = scene.add.container(0, 0);
    this.add(this.visualContainer);

    if (truck.body) {
      const [textureKey, frameName] = truck.body.texture.split('/');
      // Create body sprite but don't add to scene yet
      this.truckBody = scene.make.sprite({
        key: textureKey,
        frame: frameName,
        x: truck.body.x,
        y: truck.body.y,
        add: false, // Important: don't add to scene automatically
      });
      this.visualContainer.add(this.truckBody); // Add to visualContainer
    }
    if (truck.caterpillars) {
      const [textureKey, frameName] = truck.caterpillars.texture.split('/');
      // Create caterpillars sprite
      this.truckCaterpillars = scene.make.sprite({
        key: textureKey,
        frame: frameName,
        x: truck.caterpillars.x,
        y: truck.caterpillars.y,
        add: false,
      });
      this.visualContainer.add(this.truckCaterpillars); // Add to visualContainer
    }
    if (truck.wheels) {
      truck.wheels.forEach(wheel => {
        const [textureKey, frameName] = wheel.texture.split('/');
        // Create wheel sprite
        const wheelSprite = scene.make.sprite({
          key: textureKey,
          frame: frameName,
          x: wheel.x,
          y: wheel.y,
          add: false,
        });
        this.truckWheels.push(wheelSprite);
        this.visualContainer.add(wheelSprite); // Add to visualContainer
      });
    }

    // Set explicit depth values *within* the visualContainer
    // Note: Depth is relative to other objects in the same container
    if (this.truckBody) {
      this.truckBody.setDepth(0); // Body at back within visualContainer
    }
    if (this.truckCaterpillars) {
      this.truckCaterpillars.setDepth(1); // Caterpillars in front within visualContainer
    }
    if (this.truckWheels) {
      this.truckWheels.forEach(wheel => {
        wheel.setDepth(1); // Wheels in front within visualContainer
      });
    }

    this.bodyBounceTweenConfig = {
      targets: this.truckBody!, // Target the visual container
      y: {
        // Animate its y property
        from: 0, // Start from its base position (0)
        to: -5, // Move up slightly
      },
      duration: 500, // Half a second up and down
      yoyo: true, // Makes it bounce back
      repeat: -1, // Repeat indefinitely
      ease: 'Sine.easeInOut', // Smooth bouncing motion
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
      this.wheelTweens.forEach(tween => tween.stop());
      this.bodyBounceTween?.stop();

      // Reset positions and rotations
      if (this.truckWheels) {
        this.truckWheels.forEach(wheel => {
          wheel.rotation = 0;
        });
      }

      if (this.truckBody) {
        // Bounce animation now targets the visualContainer
        this.visualContainer.y = 0; // Reset visual container position
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

    // Add bouncing animation to the visual container
    this.bodyBounceTween = this.scene.add.tween(this.bodyBounceTweenConfig);
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
