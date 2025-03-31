import Phaser from 'phaser';

// Import truck JSON data
import truckGeneralData from '../models/truck-general.json';
import truckCatData from '../models/truck-cat.json';
import truckWhiteData from '../models/truck-white.json';
import truckMonsterData from '../models/truck-monster.json';
import truckVintageData from '../models/truck-vintage.json';

type Animation = Phaser.Types.Tweens.TweenBuilderConfig;
type Sprite = {
  texture: string;
  x: number;
  y: number;
};

type Truck = {
  animations?: { [key: string]: Animation };
  children?: { [key: string]: Sprite };
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
  private visualContainer: Phaser.GameObjects.Container;
  private objects: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private targetX: number;

  private awayOffsetX: number = 500;
  private animations: Truck['animations'] = {};

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

    // Load named children into the map from the 'children' property
    for (const [objid, obj] of Object.entries(truck.children || {})) {
      const [textureKey, frameName] = obj.texture.split('/');
      const sprite = scene.make.sprite({
        key: textureKey,
        frame: frameName,
        x: obj.x,
        y: obj.y,
        add: false,
      });
      this.objects.set(objid, sprite);
      this.visualContainer.add(sprite);
    }

    // Set depth for named wheels (assuming same depth for all)
    for (const key of this.objects.keys()) {
      if (key.startsWith('wheel')) {
        this.objects.get(key)?.setDepth(1);
      }
    }

    // Store animations
    this.animations = truck.animations || {};

    // Add container to the scene
    scene.add.existing(this);
  }

  public async driveIn(): Promise<void> {
    // Start from off-screen left
    this.x = this.targetX - this.awayOffsetX;

    // Start animations using JSON definitions
    this.playAnimation('driveIn');
    this.playAnimation('bounce');

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

    // Stop animations
    this.stopAnimation('driveIn');
    this.stopAnimation('bounce');
  }

  public async driveOut(): Promise<void> {
    // Start animations using JSON definitions
    this.playAnimation('driveOut');
    this.playAnimation('bounce');

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

    // Stop animations
    this.stopAnimation('driveOut');
    this.stopAnimation('bounce');
  }

  // Method to get the truck's width (useful for positioning)
  public getTruckWidth(): number {
    return this.truckBody?.width ?? 0;
  }

  // Method to get the truck's height
  public getTruckHeight(): number {
    return this.truckBody?.height ?? 0;
  }

  // --- Animation Player ---
  private activeAnimations: Map<string, Phaser.Tweens.Tween> = new Map();

  public async playAnimation(animationName: string) {
    const animationConfig = this.animations?.[animationName];
    if (!animationConfig) {
      console.log('no animation', animationName);
      return;
    }

    // Prevent restarting if already playing
    if (this.activeAnimations.has(animationName)) {
      console.log('already playing', animationName);
      return;
    }

    // Resolve target names to actual objects
    const targets = animationConfig.targets
      .map((name: string) => this.objects.get(name))
      .filter((a: any) => a); // Filter out undefined targets

    const tween = this.scene.add.tween({
      ...animationConfig,
      targets: targets,
    });

    this.activeAnimations.set(animationName, tween);
    return tween;
  }

  public stopAnimation(animationName: string) {
    const tween = this.activeAnimations.get(animationName);
    if (tween) {
      tween.stop();
      this.activeAnimations.delete(animationName);
    } else {
      console.log('no tween to stop', animationName);
    }
  }
}
