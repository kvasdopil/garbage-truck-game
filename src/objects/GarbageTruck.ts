import Phaser from 'phaser';

type Truck = {
  texture: string;
  wheels?: { sprite: string; x: number; y: number }[];
  body: { sprite: string; x: number; y: number };
  caterpillars?: { sprite: string; x: number; y: number };
};

const Trucks: Record<string, Truck> = {
  'truck-general': {
    texture: 'truck-general',
    wheels: [
      {
        sprite: 'wheel',
        x: 90,
        y: 95,
      },
      {
        sprite: 'wheel',
        x: -125,
        y: 95,
      },
    ],
    body: {
      sprite: 'body',
      x: 0,
      y: 0,
    },
  },
  'truck-cat': {
    texture: 'truck-cat',
    caterpillars: {
      sprite: 'caterpillars',
      x: 90,
      y: 80,
    },
    body: {
      sprite: 'body',
      x: 0,
      y: 0,
    },
  },
  'truck-white': {
    texture: 'truck-white',
    body: {
      sprite: 'body',
      x: 0,
      y: 0,
    },
    wheels: [
      {
        sprite: 'wheel',
        x: -180,
        y: 95,
      },
      {
        sprite: 'wheel',
        x: 10,
        y: 95,
      },
      {
        sprite: 'wheel',
        x: 80,
        y: 95,
      },
      {
        sprite: 'wheel',
        x: 150,
        y: 95,
      },
    ],
  },
  'truck-monster': {
    texture: 'truck-monster',
    body: {
      sprite: 'body',
      x: 0,
      y: -30,
    },
    wheels: [
      {
        sprite: 'wheel',
        x: -180,
        y: 95,
      },
      {
        sprite: 'wheel',
        x: 95,
        y: 95,
      },
    ],
  },
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

  private awayOffsetX: number = 500;

  constructor(scene: Phaser.Scene, x: number, y: number, truckType: keyof typeof Trucks) {
    super(scene, x, y);

    // Store target position
    this.targetX = x;
    this.setPosition(this.targetX - this.awayOffsetX, y);

    const truck = Trucks[truckType];
    if (truck.body) {
      this.truckBody = scene.add.sprite(
        truck.body.x,
        truck.body.y,
        truck.texture,
        truck.body.sprite
      );
    }
    if (truck.caterpillars) {
      this.truckCaterpillars = scene.add.sprite(
        truck.caterpillars.x,
        truck.caterpillars.y,
        truck.texture,
        truck.caterpillars.sprite
      );
    }
    if (truck.wheels) {
      truck.wheels.forEach(wheel => {
        this.truckWheels.push(scene.add.sprite(wheel.x, wheel.y, truck.texture, wheel.sprite));
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
