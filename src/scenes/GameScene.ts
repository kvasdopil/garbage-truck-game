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
 - a score counter with a star icon appears in the top left corner
 - when a full bin is emptied into the truck, a star appears in the center of the screen
 - the star flies in a random direction for 0.5 seconds
 - after the star stops flying, the player can click/tap it
 - when clicked, the star flies to the score counter and increases the score by 1
*/
// import Phaser from 'phaser';
import { GarbageBin, BinType } from '../objects/GarbageBin';
import { GarbagePiece } from '../objects/GarbagePiece';
import { DropZone, ZoneType } from '../objects/DropZone';
import { GarbageManager } from '../objects/GarbageManager';
import { ScoreCounter } from '../objects/ScoreCounter';
import { FlyStar } from '../objects/FlyStar';

export class GameScene extends Phaser.Scene {
  private truck!: Phaser.GameObjects.Sprite;
  private bins: GarbageBin[] = [];
  private truckDropZone!: DropZone;
  private homeDropZones: DropZone[] = [];
  private isAnimating: boolean = false;
  private currentAnimatingBin: GarbageBin | null = null;
  private garbageManager!: GarbageManager;
  private scoreCounter!: ScoreCounter;

  constructor() {
    super({ key: 'GameScene' });
  }

  preload() {
    // Load background
    this.load.image('background', 'textures/background.png');

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
    this.load.image('bin-metal-empty', 'textures/bin-metal-empty.png'); // Empty metal bin
    this.load.image('bin-metal-full', 'textures/bin-metal-full.png'); // Full metal bin
    this.load.image('bin-glass-empty', 'textures/bin-glass-empty.png'); // Empty glass bin
    this.load.image('bin-glass-full', 'textures/bin-glass-full.png'); // Full glass bin
    this.load.image('bin-paper-empty', 'textures/bin-paper-empty.png'); // Empty paper bin
    this.load.image('bin-paper-full', 'textures/bin-paper-full.png'); // Full paper bin

    // Load icons spritesheet (2x2 grid with star, flag, cup, go)
    this.load.spritesheet('icons', 'textures/icons.png', {
      frameWidth: 64,
      frameHeight: 64,
      spacing: 0,
    });

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

    // Load metal garbage as spritesheet (2x2 grid)
    this.load.spritesheet('garbage-metal', 'textures/garbage-metal.png', {
      frameWidth: 128,
      frameHeight: 128,
      spacing: 0,
    });

    // Load glass garbage as spritesheet (2x2 grid)
    this.load.spritesheet('garbage-glass', 'textures/garbage-glass.png', {
      frameWidth: 128,
      frameHeight: 128,
      spacing: 0,
    });

    // Load general garbage as spritesheet (2x2 grid)
    this.load.spritesheet('garbage-general', 'textures/garbage-general.png', {
      frameWidth: 128,
      frameHeight: 128,
      spacing: 0,
    });

    this.load.image('drop-zone-icon', 'textures/drop-zone-icon.png'); // Drop zone icon

    // Load fullscreen toggle icon
    this.load.spritesheet('icons2', 'textures/icons2.png', {
      frameWidth: 64,
      frameHeight: 64,
      spacing: 0,
    });
  }

  create() {
    // Add the background image first so it's behind everything else
    const bg = this.add.image(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      'background'
    );

    // Scale the background to cover the entire screen while maintaining aspect ratio
    const scaleX = this.cameras.main.width / bg.width;
    const scaleY = this.cameras.main.height / bg.height;
    const scale = Math.max(scaleX, scaleY);
    bg.setScale(scale);
    bg.setDepth(-2); // Set depth lower than the home dock background

    // Create a light grey background for the home drop zone area
    const homeDockBg = this.add.rectangle(
      this.cameras.main.width, // Same x position as home zones
      this.cameras.main.height / 2, // Center of the screen
      this.cameras.main.width * 0.7, // Width of background
      this.cameras.main.height, // Full height of screen
      0xdec7a0, // Yellow-ish biege color
      1.0 // Alpha (transparency)
    );
    homeDockBg.setDepth(-1); // Place behind other elements

    // Create the score counter at the top left corner
    this.scoreCounter = new ScoreCounter(this, 50, 50);

    // Create the truck sprite
    this.truck = this.add.sprite(
      this.cameras.main.width * 0.25, // Left third of screen
      this.cameras.main.height * 0.6, // Move down to 70% of screen height
      'truck'
    );
    this.truck.setDepth(1); // Set truck to be above drop zones

    // Create drop zones
    this.createDropZones();

    // Create bins
    this.createBins();

    // Setup input handlers
    this.setupInputHandlers();

    // Create garbage manager
    this.garbageManager = new GarbageManager(this);
    this.garbageManager.startSpawning();

    // Add fullscreen button
    const fullscreenButton = this.add
      .image(this.cameras.main.width - 16, 16, 'icons2', 0)
      .setOrigin(1, 0)
      .setInteractive()
      .setScrollFactor(0)
      .setDepth(100);

    // Scale the button appropriately
    fullscreenButton.setScale(0.75);

    // Toggle fullscreen on click
    fullscreenButton.on('pointerup', () => {
      if (this.scale.isFullscreen) {
        this.scale.stopFullscreen();
        fullscreenButton.setFrame(0); // Use the non-fullscreen frame
      } else {
        this.scale.startFullscreen();
        fullscreenButton.setFrame(1); // Use the fullscreen frame
      }
    });

    // Listen for fullscreen change events
    this.scale.on('fullscreenunsupported', () => {
      console.log('Fullscreen not supported on this device');
    });

    this.scale.on('enterfullscreen', () => {
      fullscreenButton.setFrame(1);
    });

    this.scale.on('leavefullscreen', () => {
      fullscreenButton.setFrame(0);
    });
  }

  private createDropZones(): void {
    // Zone dimensions
    const zoneWidth = this.cameras.main.width * 0.105;
    const zoneHeight = this.cameras.main.height * 0.25;

    // Create truck drop zone
    this.truckDropZone = new DropZone(
      this,
      this.cameras.main.width * 0.25 + this.truck.width * 0.5 + zoneWidth * 0.5, // Right side of truck
      this.cameras.main.height * 0.67, // Same y as truck (70% of screen height)
      zoneWidth,
      zoneHeight,
      ZoneType.TRUCK
    );

    // Create six home drop zones in a 2x3 grid
    const gridColumns = 2;
    const gridRows = 3;
    const startX = this.cameras.main.width * 0.75; // Left column
    const spacing = zoneWidth * 1.5; // Space between columns

    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridColumns; col++) {
        const posX = startX + col * spacing;
        const posY = this.cameras.main.height * (0.25 + row * 0.25); // Distribute vertically

        const homeZone = new DropZone(this, posX, posY, zoneWidth, zoneHeight, ZoneType.HOME);
        this.homeDropZones.push(homeZone);
      }
    }
  }

  private createBins(): void {
    // Create 6 bins: 1 plastic, 1 food, 1 metal, 1 glass, 1 paper, and 1 generic bin
    const binTypes = [
      BinType.PLASTIC,
      BinType.FOOD,
      BinType.METAL,
      BinType.GLASS,
      BinType.PAPER,
      BinType.GENERIC,
    ];

    for (let i = 0; i < 6; i++) {
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

  private async handleBinDragEnd(bin: GarbageBin, pointer: Phaser.Input.Pointer): Promise<void> {
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

      // Define onEmptied callback to spawn flying stars based on garbage count
      const onEmptied = (garbageCount: number) => {
        // Only spawn stars if the bin had garbage
        if (garbageCount > 0) {
          this.spawnFlyStar(garbageCount);
        }
      };

      await bin.animateToZone(targetZone, true, onEmptied);
      this.isAnimating = false;
      this.currentAnimatingBin = null;
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

          await bin.animateToZone(targetZone, false);
          this.isAnimating = false;
          this.currentAnimatingBin = null;
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
    await new Promise(resolve => this.time.delayedCall(500, resolve));
    this.cleanupZoneOccupancy();
  }

  private async handleGarbageDragEnd(garbage: GarbagePiece, pointer: Phaser.Input.Pointer) {
    await garbage.handleDragEnd();
    // Check for collision with bins
    const collided = await garbage.checkBinCollision(
      this.bins,
      pointer.x,
      pointer.y,
      this.currentAnimatingBin
    );
    if (collided) {
      this.garbageManager.removeGarbagePiece(garbage);
    }
    if (!collided) {
      // If no collision, return to original position
      garbage.resetToOriginalPosition();
    }
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

  private spawnFlyStar(count: number = 1): void {
    // Spawn stars at the center of the screen based on count
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    // Create spacing variation for multiple stars
    const baseSpacing = 20;

    // Spawn stars with slight offset if multiple stars
    for (let i = 0; i < count; i++) {
      // Add slight offset for each star to prevent overlapping
      const offsetX = count > 1 ? Phaser.Math.Between(-baseSpacing, baseSpacing) : 0;
      const offsetY = count > 1 ? Phaser.Math.Between(-baseSpacing, baseSpacing) : 0;

      // Add a small delay for each star if multiple stars
      this.time.delayedCall(i * 100, () => {
        // Create new flying star that targets the score counter
        new FlyStar(this, centerX + offsetX, centerY + offsetY, this.scoreCounter);
      });
    }
  }
}
