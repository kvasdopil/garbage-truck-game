import Phaser from 'phaser';
import { GarbagePiece, GarbageType } from './GarbagePiece';

export class GarbageManager {
  private scene: Phaser.Scene;
  private garbagePieces: GarbagePiece[] = [];
  //private garbageTimer!: Phaser.Time.TimerEvent;
  private maxGarbagePieces: number = 3;
  private isDragging: boolean = false;
  private spawnInterval: number = 3000; // 3 seconds

  // Garbage animation params
  private garbageAnimParams = {
    yPosition: 60, // Y-position for garbage pieces
    spacing: 100, // Horizontal spacing between garbage pieces
  };

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Start the garbage spawning system
   */
  startSpawning(): void {
    // Start the timer
    this.scene.time.addEvent({
      delay: this.spawnInterval,
      callback: this.spawnRandomGarbage,
      callbackScope: this,
      loop: true,
    });

    // Spawn initial garbage immediately
    this.spawnRandomGarbage();
  }

  /**
   * Set the dragging state (to pause spawning when dragging)
   */
  setDragging(isDragging: boolean): void {
    this.isDragging = isDragging;
  }

  /**
   * Get all active garbage pieces
   */
  getGarbagePieces(): GarbagePiece[] {
    return this.garbagePieces;
  }

  /**
   * Spawn a random piece of garbage
   */
  private spawnRandomGarbage(): void {
    // Skip spawning if we're currently dragging something or at max capacity
    if (this.isDragging || this.garbagePieces.length >= this.maxGarbagePieces) {
      return;
    }

    // All garbage types
    const garbageTypes: GarbageType[] = [
      // Food garbage types
      GarbageType.FOOD1,
      GarbageType.FOOD2,
      GarbageType.FOOD3,
      GarbageType.FOOD4,
      // Plastic garbage types
      GarbageType.PLASTIC1,
      GarbageType.PLASTIC2,
      GarbageType.PLASTIC3,
      GarbageType.PLASTIC4,
      // Paper garbage types
      GarbageType.PAPER1,
      GarbageType.PAPER2,
      GarbageType.PAPER3,
      GarbageType.PAPER4,
    ];

    // Choose a random garbage type
    const randomIndex = Math.floor(Math.random() * garbageTypes.length);
    const garbageType = garbageTypes[randomIndex];

    // Find the first available position
    const finalX = this.findNextAvailablePosition();
    if (finalX === null) return; // No available spots

    // Create the garbage piece
    const garbage = new GarbagePiece(
      this.scene,
      finalX,
      this.garbageAnimParams.yPosition,
      garbageType
    );

    // Play entry animation
    garbage.playEntryAnimation(this.garbageAnimParams.yPosition);

    // Add to tracked pieces
    this.garbagePieces.push(garbage);
  }

  /**
   * Find next available position for a garbage piece
   */
  private findNextAvailablePosition(): number | null {
    // Define the positions where garbage can be placed
    const baseX = this.scene.cameras.main.width * 0.2;
    const totalPositions = this.maxGarbagePieces;

    // Create an array of all possible positions
    const allPositions = [];
    for (let i = 0; i < totalPositions; i++) {
      allPositions.push(baseX + i * this.garbageAnimParams.spacing);
    }

    // Check which positions are already occupied
    const occupiedPositions = this.garbagePieces.map(garbage => {
      return Math.round(garbage.x); // Round to handle slight positioning variations
    });

    // Find the first position that's not occupied
    for (const position of allPositions) {
      if (!occupiedPositions.some(occupied => Math.abs(occupied - position) < 10)) {
        return position;
      }
    }

    // If all positions are occupied
    return null;
  }

  /**
   * Remove a garbage piece from management
   */
  removeGarbagePiece(garbage: GarbagePiece): void {
    const index = this.garbagePieces.indexOf(garbage);
    if (index !== -1) {
      this.garbagePieces.splice(index, 1);
    }
  }
}
