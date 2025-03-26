import Phaser from 'phaser';
import { BinType } from './GarbageBin';

export enum GarbageType {
  CAN = 'garbage-can',
  APPLE = 'garbage-apple',
  BOTTLE = 'garbage-bottle',
  BAG = 'garbage-bag',
  BANANA = 'garbage-banana',
}

// Map of which bin types accept which garbage types
export const GARBAGE_ACCEPTANCE_MAP: Record<BinType, GarbageType[]> = {
  [BinType.GENERIC]: [GarbageType.CAN],
  [BinType.PLASTIC]: [GarbageType.BOTTLE, GarbageType.BAG],
  [BinType.FOOD]: [GarbageType.APPLE, GarbageType.BANANA],
};

export class GarbagePiece extends Phaser.GameObjects.Sprite {
  private garbageType: GarbageType;
  private originalPosition: { x: number; y: number };
  private pieceScale: number = 0.1;

  // Animation parameters
  private animParams = {
    entryDuration: 600, // ms
    bounceDuration: 250, // ms
    bounceHeight: 20, // pixels
  };

  constructor(scene: Phaser.Scene, x: number, y: number, type: GarbageType) {
    super(scene, x, y, type);

    this.garbageType = type;
    this.originalPosition = { x, y };

    // Initialize the garbage piece
    this.setScale(this.pieceScale);
    this.setInteractive();
    scene.input.setDraggable(this);
    scene.physics.world.enable(this);
    scene.add.existing(this);
  }

  /**
   * Get the garbage type
   */
  getType(): GarbageType {
    return this.garbageType;
  }

  /**
   * Handle start of drag operation
   */
  handleDragStart(): void {
    // Store original position
    this.originalPosition = { x: this.x, y: this.y };

    // Increase size slightly when dragging
    this.scene.tweens.add({
      targets: this,
      scale: this.pieceScale * 1.2,
      duration: 200,
      ease: 'Power1',
    });
  }

  /**
   * Handle end of drag operation
   */
  handleDragEnd(): Promise<void> {
    return new Promise(resolve => {
      // Reset scale
      this.scene.tweens.add({
        targets: this,
        scale: this.pieceScale,
        duration: 200,
        ease: 'Power1',
        onComplete: () => {
          resolve();
        },
      });
    });
  }

  /**
   * Check if this garbage collides with any bin and handle the interaction
   */
  checkBinCollision(
    bins: Phaser.GameObjects.GameObject[],
    pointerX: number,
    pointerY: number,
    animatingBin: Phaser.GameObjects.GameObject | null,
    onCollected: () => void
  ): boolean {
    // Check each bin
    for (const gameObj of bins) {
      const bin = gameObj as any; // Using any to access bin methods

      // Skip if the bin is currently being animated
      if (bin === animatingBin) continue;

      const binBody = bin.body as Phaser.Physics.Arcade.Body;
      const binRect = new Phaser.Geom.Rectangle(
        binBody.x,
        binBody.y,
        binBody.width,
        binBody.height
      );

      // Check if pointer overlaps with bin
      if (Phaser.Geom.Rectangle.Contains(binRect, pointerX, pointerY)) {
        // Get the zone the bin is in
        const binZone = bin.getCurrentZone();

        // Only allow garbage to be placed in bins that are in home zones
        if (binZone && binZone.isHomeZone()) {
          // Check if bin accepts this garbage type
          if (this.isAcceptedBy(bin.getType())) {
            // Make the bin full if it was empty
            if (bin.getIsEmpty()) {
              bin.setEmpty(false);
            }

            // Play bin feedback animation
            bin.playGarbageAddedFeedback();

            // Play collection animation and remove garbage
            this.playCollectionAnimation().then(() => {
              onCollected();
            });

            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Reset the garbage piece to its original position with animation
   */
  resetToOriginalPosition(): void {
    this.scene.tweens.add({
      targets: this,
      x: this.originalPosition.x,
      y: this.originalPosition.y,
      scale: this.pieceScale,
      duration: 400,
      ease: 'Back.out',
    });
  }

  /**
   * Play the entry animation from top of screen
   */
  playEntryAnimation(finalY: number): void {
    // Start from above the screen
    this.y = -50;

    // Animate entry
    this.scene.tweens.add({
      targets: this,
      y: finalY,
      duration: this.animParams.entryDuration,
      ease: 'Back.out',
    });
  }

  /**
   * Play a collection animation (when garbage is put in bin)
   */
  playCollectionAnimation(): Promise<void> {
    return new Promise(resolve => {
      this.scene.tweens.add({
        targets: this,
        alpha: 0,
        scale: 0,
        duration: 300,
        ease: 'Power2',
        onComplete: () => {
          this.destroy();
          resolve();
        },
      });
    });
  }

  /**
   * Check if this garbage type is accepted by the given bin type
   */
  isAcceptedBy(binType: BinType): boolean {
    return GARBAGE_ACCEPTANCE_MAP[binType].includes(this.garbageType);
  }

  /**
   * Highlight bins that can accept this garbage piece
   */
  highlightAcceptingBins(
    bins: Phaser.GameObjects.GameObject[],
    pointerX: number,
    pointerY: number,
    animatingBin: Phaser.GameObjects.GameObject | null
  ): void {
    // Reset all bins to original scale first
    for (const gameObj of bins) {
      const bin = gameObj as any; // Using any to access bin methods

      // Skip the bin if it's currently being animated
      if (bin === animatingBin) continue;
      bin.highlight(false);
    }

    // Check each bin
    for (const gameObj of bins) {
      const bin = gameObj as any; // Using any to access bin methods

      // Skip if the bin is being animated
      if (bin === animatingBin) continue;

      const binBody = bin.body as Phaser.Physics.Arcade.Body;
      const binRect = new Phaser.Geom.Rectangle(
        binBody.x,
        binBody.y,
        binBody.width,
        binBody.height
      );

      // Check if pointer is over the bin
      if (Phaser.Geom.Rectangle.Contains(binRect, pointerX, pointerY)) {
        // Get the zone the bin is in
        const binZone = bin.getCurrentZone();

        // Only highlight bins that are in home zones (not truck zone)
        if (binZone && binZone.isHomeZone()) {
          // Check if this bin accepts this garbage type
          if (this.isAcceptedBy(bin.getType())) {
            // Highlight bin by scaling up
            bin.highlight(true);
          }
        }
      }
    }
  }
}
