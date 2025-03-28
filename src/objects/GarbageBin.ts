import Phaser from 'phaser';
import { DropZone } from './DropZone';

export enum BinType {
  PLASTIC = 'PLASTIC',
  FOOD = 'FOOD',
  GENERAL = 'GENERAL',
  METAL = 'METAL',
  GLASS = 'GLASS',
  PAPER = 'PAPER',
}

const BIN_TEXTURES = {
  [BinType.PLASTIC]: ['bin-plastic-empty', 'bin-plastic-full'],
  [BinType.FOOD]: ['bin-food-empty', 'bin-food-full'],
  [BinType.GENERAL]: ['bin-green', 'bin-green-full'],
  [BinType.METAL]: ['bin-metal-empty', 'bin-metal-full'],
  [BinType.GLASS]: ['bin-glass-empty', 'bin-glass-full'],
  [BinType.PAPER]: ['bin-paper-empty', 'bin-paper-full'],
};

export class GarbageBin extends Phaser.GameObjects.Sprite {
  private binType: BinType;
  private garbageCount: number = 0; // Counter for garbage pieces
  private currentZone: DropZone | null = null;
  private lastValidPosition: { x: number; y: number };

  // Textures for different bin states
  private emptyTexture: string;
  private fullTexture: string;

  // Animation parameters for tipping
  private tippingAnimParams = {
    rotationAngle: -120, // degrees (CCW)
    rotationDuration: 400, // ms
    holdDuration: 500, // ms
    returnDuration: 400, // ms
    easeFunction: 'Power1',
    pivotOrigin: { x: 0.1, y: 0.65 }, // Bottom left corner pivot
  };

  constructor(scene: Phaser.Scene, x: number, y: number, type: BinType) {
    // Select correct texture based on type
    const texture = GarbageBin.getTextureForType(type, true);
    super(scene, x, y, texture);

    // Store the bin type
    this.binType = type;

    // Enable physics
    scene.physics.world.enable(this);
    scene.add.existing(this);

    // Set a reasonable scale
    this.setScale(1.0);

    // Set initial position data
    this.lastValidPosition = { x, y };

    this.emptyTexture = GarbageBin.getTextureForType(type, true);
    this.fullTexture = GarbageBin.getTextureForType(type, false);
  }

  static getTextureForType(type: BinType, isEmpty: boolean): string {
    return BIN_TEXTURES[type][isEmpty ? 0 : 1];
  }

  /**
   * Update the bin's texture based on its state
   */
  updateTexture(): void {
    this.setTexture(this.getIsEmpty() ? this.emptyTexture : this.fullTexture);
  }

  /**
   * Increment the garbage count and update texture
   */
  addGarbage(): void {
    this.garbageCount++;
    this.updateTexture();
  }

  /**
   * Get the current garbage count
   */
  getGarbageCount(): number {
    return this.garbageCount;
  }

  /**
   * Reset the garbage count and update texture
   */
  emptyBin(): number {
    const previousCount = this.garbageCount;
    this.garbageCount = 0;
    this.updateTexture();
    return previousCount;
  }

  /**
   * Check if the bin is empty
   */
  getIsEmpty(): boolean {
    return this.garbageCount === 0;
  }

  /**
   * Get the bin type
   */
  getType(): BinType {
    return this.binType;
  }

  /**
   * Set the bin's current zone
   */
  setCurrentZone(zone: DropZone | null): void {
    this.currentZone = zone;
  }

  /**
   * Get the bin's current zone
   */
  getCurrentZone(): DropZone | null {
    return this.currentZone;
  }

  /**
   * Update the bin's last valid position
   */
  setLastValidPosition(x: number, y: number): void {
    this.lastValidPosition = { x, y };
  }

  /**
   * Get the bin's last valid position
   */
  getLastValidPosition(): { x: number; y: number } {
    return this.lastValidPosition;
  }

  /**
   * Get the original scale
   */
  getOriginalScale(): number {
    return 1.0;
  }

  /**
   * Handle start of drag operation
   */
  handleDragStart(): void {
    // Get the current zone
    const currentZone = this.getCurrentZone();

    // Remove bin from its current zone
    if (currentZone) {
      currentZone.setOccupant(null);

      // Double check that the zone doesn't still refer to this bin
      if (currentZone.getOccupant() === this) {
        console.error('Zone still referring to bin after setOccupant(null)');
        // Force cleanup
        currentZone.setOccupant(null);
      }
    }

    // Make sure the bin's zone reference is cleared
    this.setCurrentZone(null);

    // Increase size when dragging starts
    this.scene.tweens.add({
      targets: this,
      scale: 1.0 * 1.15,
      duration: 200,
      ease: 'Power1',
    });
  }

  /**
   * Animate bin to a drop zone
   */
  async animateToZone(
    zone: DropZone,
    isTruckZone: boolean,
    onEmptied?: (garbageCount: number) => void
  ) {
    // Clear any previous zone reference first
    const currentZone = this.getCurrentZone();
    if (currentZone && currentZone !== zone) {
      currentZone.setOccupant(null);
    }

    // Assign the bin to the zone
    zone.setOccupant(this);
    this.setCurrentZone(zone);

    // Double check zone-bin relationship
    if (zone.getOccupant() !== this || this.getCurrentZone() !== zone) {
      console.error('Zone-bin relationship inconsistent after setting');
    }

    // Animation sequence
    await new Promise(resolve => {
      this.scene.tweens.add({
        targets: this,
        scale: 1.3,
        duration: 200,
        yoyo: true,
        onComplete: resolve,
      });
    });

    await new Promise(resolve => {
      this.scene.tweens.add({
        targets: this,
        x: zone.x,
        y: zone.y,
        scale: 1.0,
        duration: 300,
        ease: 'Back.out',
        onComplete: resolve,
      });
    });

    // If it's the truck zone and bin is not empty, play tipping animation
    if (isTruckZone && !this.getIsEmpty()) {
      await this.playTippingAnimation(onEmptied);
    }
  }

  /**
   * Reset bin to its last valid position
   */
  async resetPosition(): Promise<void> {
    const lastPosition = this.getLastValidPosition();

    return new Promise(resolve => {
      this.scene.tweens.add({
        targets: this,
        x: lastPosition.x,
        y: lastPosition.y,
        scale: 1.0,
        duration: 400,
        ease: 'Back.out',
        onComplete: () => {
          resolve();
        },
      });
    });
  }

  /**
   * Highlight the bin when garbage hovers over it
   */
  highlight(shouldHighlight: boolean): void {
    this.scene.tweens.add({
      targets: this,
      scale: shouldHighlight ? 1.1 : 1.0,
      duration: 150,
      ease: 'Power1',
    });
  }

  /**
   * Play feedback animation when garbage is added
   */
  async playGarbageAddedFeedback() {
    // First a quick squash effect
    await new Promise(resolve =>
      this.scene.tweens.add({
        targets: this,
        scaleX: 1.2,
        scaleY: 0.9,
        duration: 100,
        ease: 'Power1',
        onComplete: resolve,
      })
    );

    // Then bounce back with a slight stretch
    await new Promise(resolve =>
      this.scene.tweens.add({
        targets: this,
        scaleX: 0.95,
        scaleY: 1.15,
        duration: 100,
        ease: 'Power1',
        onComplete: resolve,
      })
    );

    // Finally return to normal with a small bounce
    await new Promise(resolve =>
      this.scene.tweens.add({
        targets: this,
        scaleX: 1.0,
        scaleY: 1.0,
        duration: 200,
        ease: 'Back.out',
        onComplete: resolve,
      })
    );
  }

  /**
   * Play the bin tipping animation
   */
  async playTippingAnimation(onEmptied?: (garbageCount: number) => void) {
    // Disable interaction during animation
    this.disableInteractive();

    // Store original position
    const originalX = this.x;
    const originalY = this.y;

    // Remove bin from scene temporarily
    this.setVisible(false);

    // Create a container at the pivot point position
    const width = this.width * this.scale;
    const height = this.height * this.scale;
    const pivotX = originalX - width * (0.5 - this.tippingAnimParams.pivotOrigin.x);
    const pivotY = originalY + height * (0.5 - this.tippingAnimParams.pivotOrigin.y);

    const animContainer = this.scene.add.container(pivotX, pivotY);

    // Create a clone of the bin for animation, positioned relative to pivot
    const animBin = this.scene.add.sprite(
      width * (0.5 - this.tippingAnimParams.pivotOrigin.x),
      height * (this.tippingAnimParams.pivotOrigin.y - 0.5),
      this.texture.key
    );
    animBin.setScale(this.scale);
    animContainer.add(animBin);

    // Create tipping animation sequence for the container
    await new Promise(resolve =>
      this.scene.tweens.add({
        targets: animContainer,
        rotation: Phaser.Math.DegToRad(this.tippingAnimParams.rotationAngle),
        duration: this.tippingAnimParams.rotationDuration,
        ease: this.tippingAnimParams.easeFunction,
        onComplete: resolve,
      })
    );

    // Get garbage count before emptying
    const garbageCount = this.garbageCount;

    // Empty the bin
    this.emptyBin();

    // Call the onEmptied callback at the exact moment the bin is emptied
    if (onEmptied && garbageCount > 0) {
      onEmptied(garbageCount);
    }

    // Update the animation sprite to show empty bin
    animBin.setTexture(this.emptyTexture);

    // Hold for specified duration
    await new Promise(resolve =>
      this.scene.time.delayedCall(this.tippingAnimParams.holdDuration, resolve)
    );

    // Return to original rotation
    await new Promise(resolve =>
      this.scene.tweens.add({
        targets: animContainer,
        rotation: 0,
        duration: this.tippingAnimParams.returnDuration,
        ease: this.tippingAnimParams.easeFunction,
        onComplete: resolve,
      })
    );

    // Restore original bin
    this.setVisible(true);

    // Remove animation container
    animContainer.destroy();

    // Re-enable interaction
    this.setInteractive();
  }

  /**
   * Check if this bin's zone relationship is consistent
   * Returns true if everything is ok, false if there's an issue
   */
  checkZoneConsistency(): boolean {
    const zone = this.getCurrentZone();

    // If bin has no zone, that's fine
    if (!zone) return true;

    // If bin has a zone, the zone should have this bin as occupant
    if (zone.getOccupant() !== this) {
      console.error(
        'Bin-zone inconsistency detected: bin has zone but zone has different occupant'
      );
      return false;
    }

    return true;
  }
}
