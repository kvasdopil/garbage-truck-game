import Phaser from 'phaser';
import { BinType } from './GarbageBin';

export enum GarbageType {
  FOOD1 = 'food1',
  FOOD2 = 'food2',
  FOOD3 = 'food3',
  FOOD4 = 'food4',
  PLASTIC1 = 'plastic1',
  PLASTIC2 = 'plastic2',
  PLASTIC3 = 'plastic3',
  PLASTIC4 = 'plastic4',
  PAPER1 = 'paper1',
  PAPER2 = 'paper2',
  PAPER3 = 'paper3',
  PAPER4 = 'paper4',
}

// Map of which bin types accept which garbage types
export const GARBAGE_ACCEPTANCE_MAP: Record<BinType, GarbageType[]> = {
  [BinType.GENERIC]: [
    GarbageType.PAPER1,
    GarbageType.PAPER2,
    GarbageType.PAPER3,
    GarbageType.PAPER4,
  ],
  [BinType.PLASTIC]: [
    GarbageType.PLASTIC1,
    GarbageType.PLASTIC2,
    GarbageType.PLASTIC3,
    GarbageType.PLASTIC4,
  ],
  [BinType.FOOD]: [GarbageType.FOOD1, GarbageType.FOOD2, GarbageType.FOOD3, GarbageType.FOOD4],
};

export class GarbagePiece extends Phaser.GameObjects.Sprite {
  private garbageType: GarbageType;
  private originalPosition: { x: number; y: number };
  private pieceScale: number = 1;

  // Animation parameters
  private animParams = {
    entryDuration: 600, // ms
    bounceDuration: 250, // ms
    bounceHeight: 20, // pixels
  };

  constructor(scene: Phaser.Scene, x: number, y: number, type: GarbageType) {
    // For food and plastic items, use the spritesheet with frame index
    let texture: string = type as string;
    let frame = undefined;

    if (
      type === GarbageType.FOOD1 ||
      type === GarbageType.FOOD2 ||
      type === GarbageType.FOOD3 ||
      type === GarbageType.FOOD4
    ) {
      // Map food types to frame indices (0-based)
      texture = 'garbage-food';
      switch (type) {
        case GarbageType.FOOD1:
          frame = 0;
          break;
        case GarbageType.FOOD2:
          frame = 1;
          break;
        case GarbageType.FOOD3:
          frame = 2;
          break;
        case GarbageType.FOOD4:
          frame = 3;
          break;
      }
    } else if (
      type === GarbageType.PLASTIC1 ||
      type === GarbageType.PLASTIC2 ||
      type === GarbageType.PLASTIC3 ||
      type === GarbageType.PLASTIC4
    ) {
      // Map plastic types to frame indices (0-based)
      texture = 'garbage-plastic';
      switch (type) {
        case GarbageType.PLASTIC1:
          frame = 0;
          break;
        case GarbageType.PLASTIC2:
          frame = 1;
          break;
        case GarbageType.PLASTIC3:
          frame = 2;
          break;
        case GarbageType.PLASTIC4:
          frame = 3;
          break;
      }
    } else if (
      type === GarbageType.PAPER1 ||
      type === GarbageType.PAPER2 ||
      type === GarbageType.PAPER3 ||
      type === GarbageType.PAPER4
    ) {
      // Map paper types to frame indices (0-based)
      texture = 'garbage-paper';
      switch (type) {
        case GarbageType.PAPER1:
          frame = 0;
          break;
        case GarbageType.PAPER2:
          frame = 1;
          break;
        case GarbageType.PAPER3:
          frame = 2;
          break;
        case GarbageType.PAPER4:
          frame = 3;
          break;
      }
    }

    // Call super with appropriate texture and frame
    super(scene, x, y, texture, frame);

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
            // Increment the garbage count in the bin
            bin.addGarbage();

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
