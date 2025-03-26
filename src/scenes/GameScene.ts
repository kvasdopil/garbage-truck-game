import Phaser from 'phaser';

/*
 Main game scene
 - contains the truck and garbage bins
 - bins can be full or empty
 - bins are empty by default
 - bins can be dragged to the truck or any home zone
 - when a bin is in the truck zone, it will tip over if the bin is not empty
 - after a bin is tipped over it is empty and cannot be tipped over again
 - when a bin is in a home zone, it will reset to its original position
 - when a bin is dropped outside of the truck or home zones, it will reset to its previous position
 - bins become full when garbage is dropped into them
 - a garbage piece appears occasionally at the top of the screen with a slide and bounce animation
 - only a certain number of garbage pieces can be visible at a time, when there's too many, they stop spawning
 - garbage pieces can be dragged to the bins, when the bin is parked in the home zone
 - when anything is dragged, spawning of garbage pieces is paused
*/
// import Phaser from 'phaser';
import { GarbageBin, BinType } from '../objects/GarbageBin';
import { GarbagePiece } from '../objects/GarbagePiece';
import { DropZone, ZoneType } from '../objects/DropZone';
import { GarbageManager } from '../objects/GarbageManager';

export class GameScene extends Phaser.Scene {
  private truck!: Phaser.GameObjects.Sprite;
  private bins: GarbageBin[] = [];
  private truckDropZone!: DropZone;
  private homeDropZones: DropZone[] = [];
  private isAnimating: boolean = false;
  private currentAnimatingBin: GarbageBin | null = null;
  private garbageManager!: GarbageManager;

  constructor() {
    super({ key: 'GameScene' });
  }

  preload() {
    // Load assets from public directory
    this.load.image('truck', 'textures/truck.png');
    this.load.image('bin-green', 'textures/bin-green.png'); // Empty bin
    this.load.image('bin-blue', 'textures/bin-green.png'); // Using same image for now, can be replaced with different colored bins
    this.load.image('bin-yellow', 'textures/bin-green.png'); // Using same image for now
    this.load.image('bin-green-full', 'textures/bin-green-full.png'); // Full bin with garbage
    this.load.image('bin-blue-full', 'textures/bin-green-full.png'); // Using same image for now
    this.load.image('bin-yellow-full', 'textures/bin-green-full.png'); // Using same image for now
    this.load.image('bin-plastic-empty', 'textures/bin-plastic-empty.png'); // Empty plastic bin
    this.load.image('bin-plastic-full', 'textures/bin-plastic-full.png'); // Full plastic bin
    this.load.image('bin-food-empty', 'textures/bin-food-empty.png'); // Empty food bin
    this.load.image('bin-food-full', 'textures/bin-food-full.png'); // Full food bin

    // Load food garbage as spritesheet (2x2 grid)
    this.load.spritesheet('garbage-food', 'textures/garbage-food.png', {
      frameWidth: 128, // Assuming each frame is 32x32 pixels
      frameHeight: 128,
      spacing: 0,
    });

    // Load plastic garbage as spritesheet (2x2 grid)
    this.load.spritesheet('garbage-plastic', 'textures/garbage-plastic.png', {
      frameWidth: 128, // Assuming each frame is 128x128 pixels
      frameHeight: 128,
      spacing: 0,
    });

    // Load paper garbage as spritesheet (2x2 grid)
    this.load.spritesheet('garbage-paper', 'textures/garbage-paper.png', {
      frameWidth: 128, // Assuming each frame is 128x128 pixels
      frameHeight: 128,
      spacing: 0,
    });

    this.load.image('drop-zone-icon', 'textures/drop-zone-icon.png'); // Drop zone icon
  }

  create() {
    // Create a light grey background for the home drop zone area
    const homeDockBg = this.add.rectangle(
      this.cameras.main.width, // Same x position as home zones
      this.cameras.main.height / 2, // Center of the screen
      this.cameras.main.width * 0.7, // Width of background
      this.cameras.main.height, // Full height of screen
      0xcccccc, // Light grey color
      0.5 // Alpha (transparency)
    );
    homeDockBg.setDepth(-1); // Place behind other elements

    // Create the truck sprite
    this.truck = this.add.sprite(
      this.cameras.main.width * 0.25, // Left third of screen
      this.cameras.main.height / 2,
      'truck'
    );

    // Create drop zones
    this.createDropZones();

    // Create bins
    this.createBins();

    // Setup input handlers
    this.setupInputHandlers();

    // Create garbage manager
    this.garbageManager = new GarbageManager(this);
    this.garbageManager.startSpawning();
  }

  private createDropZones(): void {
    // Zone dimensions
    const zoneWidth = this.cameras.main.width * 0.105;
    const zoneHeight = this.cameras.main.height * 0.25;

    // Create truck drop zone
    this.truckDropZone = new DropZone(
      this,
      this.cameras.main.width * 0.25 + this.truck.width * 0.5 + zoneWidth * 0.5, // Right side of truck
      this.cameras.main.height / 2, // Same y as truck
      zoneWidth,
      zoneHeight,
      ZoneType.TRUCK
    );

    // Create three home drop zones (top, middle, bottom)
    const homePositionsY = [
      this.cameras.main.height * 0.2, // Top (moved up)
      this.cameras.main.height * 0.5, // Middle (unchanged)
      this.cameras.main.height * 0.8, // Bottom (moved down)
    ];

    for (const posY of homePositionsY) {
      const homeZone = new DropZone(
        this,
        this.cameras.main.width * 0.75, // Right side of screen
        posY,
        zoneWidth,
        zoneHeight,
        ZoneType.HOME
      );
      this.homeDropZones.push(homeZone);
    }
  }

  private createBins(): void {
    // Create the 3 bin sprites at each home position
    const binTypes = [BinType.PLASTIC, BinType.FOOD, BinType.GENERIC];

    for (let i = 0; i < 3; i++) {
      const bin = new GarbageBin(
        this,
        this.homeDropZones[i].x,
        this.homeDropZones[i].y,
        binTypes[i]
      );

      // Make bins interactive and draggable
      bin.setInteractive();
      this.input.setDraggable(bin);

      // Add to bins array
      this.bins.push(bin);

      // Set initial zone
      this.homeDropZones[i].setOccupant(bin);
    }
  }

  private setupInputHandlers(): void {
    // Drag start event
    this.input.on(
      'dragstart',
      (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
        // Don't allow dragging if animation is in progress
        if (this.isAnimating) return;

        // Set dragging state
        // this.isDragging = true;
        this.garbageManager.setDragging(true);

        // Bring the object to the top
        this.children.bringToTop(gameObject);

        // Handle different draggable object types
        if (gameObject instanceof GarbageBin) {
          this.handleBinDragStart(gameObject);
        } else if (gameObject instanceof GarbagePiece) {
          this.handleGarbageDragStart(gameObject);
        }
      }
    );

    // While dragging
    this.input.on(
      'drag',
      (
        pointer: Phaser.Input.Pointer,
        gameObject: Phaser.GameObjects.GameObject,
        dragX: number,
        dragY: number
      ) => {
        // Update position for GameObjects with x/y properties
        const gameObj = gameObject as Phaser.GameObjects.Sprite;
        gameObj.x = dragX;
        gameObj.y = dragY;

        // Handle different draggable object types
        if (gameObject instanceof GarbagePiece) {
          this.handleGarbageDrag(gameObject, pointer);
        }
      }
    );

    // Drag end event
    this.input.on(
      'dragend',
      (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
        // Reset dragging state
        // this.isDragging = false;
        this.garbageManager.setDragging(false);

        // Handle different draggable object types
        if (gameObject instanceof GarbageBin) {
          this.handleBinDragEnd(gameObject, pointer);
        } else if (gameObject instanceof GarbagePiece) {
          this.handleGarbageDragEnd(gameObject, pointer);
        }
      }
    );
  }

  private handleBinDragStart(bin: GarbageBin): void {
    bin.handleDragStart();
  }

  private handleGarbageDragStart(garbage: GarbagePiece): void {
    garbage.handleDragStart();
  }

  private handleGarbageDrag(garbage: GarbagePiece, pointer: Phaser.Input.Pointer): void {
    // Check if hovering over any bin
    garbage.highlightAcceptingBins(this.bins, pointer.x, pointer.y, this.currentAnimatingBin);
  }

  private handleBinDragEnd(bin: GarbageBin, pointer: Phaser.Input.Pointer): void {
    let droppedInZone = false;
    let targetZone: DropZone | null = null;

    // Check if dropped in truck zone
    if (
      this.truckDropZone.containsPoint(pointer.x, pointer.y) &&
      !this.truckDropZone.isOccupied()
    ) {
      droppedInZone = true;
      targetZone = this.truckDropZone;

      // Update the bin's position and zone
      bin.setLastValidPosition(targetZone.x, targetZone.y);

      // Set animating flag
      this.isAnimating = true;
      this.currentAnimatingBin = bin;

      // Double check that the bin's previous zone (if any) is properly cleared
      for (const zone of [this.truckDropZone, ...this.homeDropZones]) {
        if (zone !== targetZone && zone.getOccupant() === bin) {
          console.log('Clearing previous zone reference to bin');
          zone.setOccupant(null);
        }
      }

      bin.animateToZone(targetZone, true).then(() => {
        this.isAnimating = false;
        this.currentAnimatingBin = null;
      });
    } else {
      // Check if dropped in any home zone
      for (const homeZone of this.homeDropZones) {
        if (homeZone.containsPoint(pointer.x, pointer.y) && !homeZone.isOccupied()) {
          droppedInZone = true;
          targetZone = homeZone;

          // Update the bin's position and zone
          bin.setLastValidPosition(targetZone.x, targetZone.y);

          // Set animating flag
          this.isAnimating = true;
          this.currentAnimatingBin = bin;

          // Double check that the bin's previous zone (if any) is properly cleared
          for (const zone of [this.truckDropZone, ...this.homeDropZones]) {
            if (zone !== targetZone && zone.getOccupant() === bin) {
              console.log('Clearing previous zone reference to bin');
              zone.setOccupant(null);
            }
          }

          bin.animateToZone(targetZone, false).then(() => {
            this.isAnimating = false;
            this.currentAnimatingBin = null;
          });
          break;
        }
      }
    }

    // If not dropped in any valid zone, return to last valid position
    if (!droppedInZone) {
      // Set animating flag
      this.isAnimating = true;
      this.currentAnimatingBin = bin;

      bin.resetPosition().then(() => {
        // Find which zone corresponds to this position
        let matchedZone: DropZone | null = null;
        const lastPosition = bin.getLastValidPosition();

        // Check all zones
        for (const zone of [this.truckDropZone, ...this.homeDropZones]) {
          if (Math.abs(zone.x - lastPosition.x) < 10 && Math.abs(zone.y - lastPosition.y) < 10) {
            matchedZone = zone;
            break;
          }
        }

        // If found matching zone, update relationships
        if (matchedZone) {
          matchedZone.setOccupant(bin);
        }

        this.isAnimating = false;
        this.currentAnimatingBin = null;
      });
    }

    // Run cleanup to fix any inconsistencies after a 500ms delay
    this.time.delayedCall(500, () => {
      this.cleanupZoneOccupancy();
    });
  }

  private handleGarbageDragEnd(garbage: GarbagePiece, pointer: Phaser.Input.Pointer): void {
    garbage.handleDragEnd().then(() => {
      // Check for collision with bins
      if (!this.checkGarbageCollisionWithBins(garbage, pointer.x, pointer.y)) {
        // If no collision, return to original position
        garbage.resetToOriginalPosition();
      }
    });
  }

  private checkGarbageCollisionWithBins(
    garbage: GarbagePiece,
    pointerX: number,
    pointerY: number
  ): boolean {
    return garbage.checkBinCollision(
      this.bins,
      pointerX,
      pointerY,
      this.currentAnimatingBin,
      () => {
        this.garbageManager.removeGarbagePiece(garbage);
      }
    );
  }

  private cleanupZoneOccupancy(): void {
    console.log('Running zone occupancy cleanup');

    // Check bin-zone consistency first
    for (const bin of this.bins) {
      bin.checkZoneConsistency();
    }

    // Step 1: Check which bins are in which zones
    const zoneOccupants = new Map<DropZone, GarbageBin | null>();

    // Start with all zones being empty
    zoneOccupants.set(this.truckDropZone, null);
    for (const homeZone of this.homeDropZones) {
      zoneOccupants.set(homeZone, null);
    }

    // Check which bins are in which zones
    for (const bin of this.bins) {
      const zone = bin.getCurrentZone();
      if (zone) {
        zoneOccupants.set(zone, bin);
      }
    }

    // Step 2: Update zone occupancy
    for (const [zone, bin] of zoneOccupants.entries()) {
      // If zone's current occupant doesn't match our map, update it
      if (zone.getOccupant() !== bin) {
        console.log('Fixing zone occupant mismatch', zone, bin);
        zone.setOccupant(bin);
      }
    }

    // Step 3: Make sure bins have correct zone references
    for (const bin of this.bins) {
      const zone = bin.getCurrentZone();
      if (zone && zone.getOccupant() !== bin) {
        console.log('Fixing bin zone reference', bin, zone);
        bin.setCurrentZone(null);
      }
    }
  }
}
