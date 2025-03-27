import Phaser from 'phaser';
import { DropZone } from './DropZone';

export enum BinType {
  PLASTIC = 'plastic',
  FOOD = 'food',
  GENERIC = 'generic',
}

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
    pivotOrigin: { x: 0, y: 1 }, // Bottom left corner pivot
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
    switch (type) {
      case BinType.PLASTIC:
        return isEmpty ? 'bin-plastic-empty' : 'bin-plastic-full';
      case BinType.FOOD:
        return isEmpty ? 'bin-food-empty' : 'bin-food-full';
      case BinType.GENERIC:
      default:
        return isEmpty ? 'bin-green' : 'bin-green-full';
    }
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
  animateToZone(
    zone: DropZone,
    isTruckZone: boolean,
    onEmptied?: (garbageCount: number) => void
  ): Promise<void> {
    return new Promise(resolve => {
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
      this.scene.tweens.add({
        targets: this,
        scale: 1.3,
        duration: 200,
        yoyo: true,
        onComplete: () => {
          this.scene.tweens.add({
            targets: this,
            x: zone.x,
            y: zone.y,
            scale: 1.0,
            duration: 300,
            ease: 'Back.out',
            onComplete: () => {
              // If it's the truck zone and bin is not empty, play tipping animation
              if (isTruckZone && !this.getIsEmpty()) {
                this.playTippingAnimation(onEmptied).then(() => resolve());
              } else {
                resolve();
              }
            },
          });
        },
      });
    });
  }

  /**
   * Reset bin to its last valid position
   */
  resetPosition(): Promise<void> {
    return new Promise(resolve => {
      const lastPosition = this.getLastValidPosition();

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
    if (shouldHighlight) {
      this.setScale(1.1);
    } else {
      this.setScale(1.0);
    }
  }

  /**
   * Play feedback animation when garbage is added
   */
  playGarbageAddedFeedback(): Promise<void> {
    return new Promise(resolve => {
      this.scene.tweens.add({
        targets: this,
        scale: 1.1,
        duration: 100,
        yoyo: true,
        ease: 'Power1',
        onComplete: () => {
          // Make sure bin returns to original scale
          this.setScale(1.0);
          resolve();
        },
      });
    });
  }

  /**
   * Play the bin tipping animation
   */
  playTippingAnimation(onEmptied?: (garbageCount: number) => void): Promise<void> {
    return new Promise(resolve => {
      // Disable interaction during animation
      this.disableInteractive();

      // Store original position
      const originalX = this.x;
      const originalY = this.y;

      // Remove bin from scene temporarily
      this.setVisible(false);

      // Create container at the bin's position
      const animContainer = this.scene.add.container(originalX, originalY);

      // Create a clone of the bin for animation
      const animBin = this.scene.add.sprite(0, 0, this.texture.key);
      animBin.setScale(1.0);

      // Offset the bin within the container to rotate around bottom-left corner
      const width = animBin.width * 1.0;
      const height = animBin.height * 1.0;
      animBin.x = width * this.tippingAnimParams.pivotOrigin.x;
      animBin.y = -height * (1 - this.tippingAnimParams.pivotOrigin.y);

      // Add the bin to the container
      animContainer.add(animBin);

      // Create tipping animation sequence for the container
      this.scene.tweens.add({
        targets: animContainer,
        rotation: Phaser.Math.DegToRad(this.tippingAnimParams.rotationAngle),
        duration: this.tippingAnimParams.rotationDuration,
        ease: this.tippingAnimParams.easeFunction,
        onComplete: () => {
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
          this.scene.time.delayedCall(this.tippingAnimParams.holdDuration, () => {
            // Return to original rotation
            this.scene.tweens.add({
              targets: animContainer,
              rotation: 0,
              duration: this.tippingAnimParams.returnDuration,
              ease: this.tippingAnimParams.easeFunction,
              onComplete: () => {
                // Restore original bin
                this.setVisible(true);

                // Remove animation container
                animContainer.destroy();

                // Re-enable interaction
                this.setInteractive();

                // Resolve the promise to signal animation completion
                resolve();
              },
            });
          });
        },
      });
    });
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
