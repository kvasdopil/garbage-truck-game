import Phaser from 'phaser';
import { GarbageBin } from './GarbageBin';

export enum ZoneType {
  TRUCK = 'truck',
  HOME = 'home',
}

export class DropZone extends Phaser.GameObjects.Zone {
  private zoneType: ZoneType;
  private occupant: GarbageBin | null = null;
  private graphics: Phaser.GameObjects.Graphics;
  private icon: Phaser.GameObjects.Sprite | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    type: ZoneType,
    graphics: Phaser.GameObjects.Graphics
  ) {
    super(scene, x, y, width, height);

    this.zoneType = type;
    this.graphics = graphics;

    // Create icon for truck zone
    if (type === ZoneType.TRUCK) {
      this.icon = scene.add.sprite(x, y, 'drop-zone-icon');
      this.icon.setScale(0.5);
      this.icon.setDepth(1); // Make sure it appears above the background
      this.icon.setAlpha(0.8);

      // Add a subtle floating animation
      this.addIconAnimation();
    } else {
      this.icon = null;
    }

    // Enable physics
    scene.physics.world.enable(this, Phaser.Physics.Arcade.STATIC_BODY);
    scene.add.existing(this);

    // Set initial visibility
    this.updateIconVisibility();
  }

  /**
   * Get the zone type
   */
  getType(): ZoneType {
    return this.zoneType;
  }

  /**
   * Set the occupant bin
   */
  setOccupant(bin: GarbageBin | null): void {
    this.occupant = bin;

    // If we're setting a bin, update its zone reference
    if (bin) {
      bin.setCurrentZone(this);
    }

    // Update icon visibility
    this.updateIconVisibility();

    // Redraw
    this.draw();
  }

  /**
   * Update the visibility of the zone icon based on occupancy
   */
  private updateIconVisibility(): void {
    if (this.icon && this.zoneType === ZoneType.TRUCK) {
      this.icon.setVisible(!this.isOccupied());
    }
  }

  /**
   * Get the current occupant
   */
  getOccupant(): GarbageBin | null {
    return this.occupant;
  }

  /**
   * Check if zone is occupied
   */
  isOccupied(): boolean {
    return this.occupant !== null;
  }

  /**
   * Check if this is a truck zone
   */
  isTruckZone(): boolean {
    return this.zoneType === ZoneType.TRUCK;
  }

  /**
   * Check if this is a home zone
   */
  isHomeZone(): boolean {
    return this.zoneType === ZoneType.HOME;
  }

  /**
   * Draw the zone with optional highlight
   */
  draw(highlight: boolean = false): void {
    // Don't draw if zone is occupied
    if (this.isOccupied()) {
      return;
    }

    // Apply highlight effect to icon if it exists
    if (this.icon && this.zoneType === ZoneType.TRUCK) {
      this.icon.setScale(0.1); // Normal size
      this.icon.setFlipX(true);
      this.icon.setAlpha(0.5); // Slightly transparent when not highlighted
    }
  }

  /**
   * Check if a point is inside this zone
   */
  containsPoint(x: number, y: number): boolean {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const rect = new Phaser.Geom.Rectangle(body.x, body.y, body.width, body.height);
    return Phaser.Geom.Rectangle.Contains(rect, x, y);
  }

  /**
   * Add a subtle floating animation to the icon
   */
  private addIconAnimation(): void {
    if (!this.icon) return;

    // Create a floating animation
    this.scene.tweens.add({
      targets: this.icon,
      y: this.y - 5, // Float up slightly
      duration: 1500,
      ease: 'Sine.easeInOut',
      yoyo: true, // Go back down
      repeat: -1, // Loop forever
    });
  }
}
