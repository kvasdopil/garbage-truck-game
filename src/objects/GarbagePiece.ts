import Phaser from 'phaser';
import { BinType } from './GarbageBin';

// GarbageType is now the same as BinType
export type GarbageType = BinType;

// Helper function to get the texture name for a garbage type
function getTextureForType(type: GarbageType): string {
  return `garbage-${type.toLowerCase()}`;
}

export class GarbagePiece extends Phaser.GameObjects.Sprite {
  private garbageType: GarbageType;
  private frameId: number;
  private originalPosition: { x: number; y: number };
  private pieceScale: number = 1;

  // Animation parameters
  private animParams = {
    entryDuration: 600, // ms
    bounceDuration: 250, // ms
    bounceHeight: 20, // pixels
  };

  constructor(scene: Phaser.Scene, x: number, y: number, type: GarbageType, frameId: number) {
    // Get the appropriate texture for this garbage type
    const texture = getTextureForType(type);

    // Call super with appropriate texture and frame
    super(scene, x, y, texture, frameId);

    this.garbageType = type;
    this.frameId = frameId;
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
   * Get the frame ID (variant) of this garbage piece
   */
  getFrameId(): number {
    return this.frameId;
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
  async handleDragEnd(): Promise<void> {
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
  async checkBinCollision(
    bins: Phaser.GameObjects.GameObject[],
    pointerX: number,
    pointerY: number,
    animatingBin: Phaser.GameObjects.GameObject | null
  ): Promise<boolean> {
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
            // Increment the garbage count in the bin
            bin.addGarbage();

            // Play bin feedback animation
            bin.playGarbageAddedFeedback();

            // Play collection animation and remove garbage
            await this.playCollectionAnimation();

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
   * Play the entry animation from bottom of screen
   */
  playEntryAnimation(finalY: number): void {
    // Simple animation from bottom to final position
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
  async playCollectionAnimation(): Promise<void> {
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
    return binType === this.garbageType;
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
