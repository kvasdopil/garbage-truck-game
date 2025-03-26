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

export class GameScene extends Phaser.Scene {
  private truck!: Phaser.GameObjects.Sprite;
  private bins: Phaser.GameObjects.Sprite[] = [];
  private truckDropZone!: Phaser.GameObjects.Zone;
  private homeDropZones: Phaser.GameObjects.Zone[] = [];
  private dropZoneGraphics!: Phaser.GameObjects.Graphics;
  private binScale: number = 0.2; // Fixed scale for bins
  private lastValidPositions: { x: number; y: number }[] = []; // Track each bin's last valid position
  private activeBinZones: Map<Phaser.GameObjects.Sprite, Phaser.GameObjects.Zone | null> =
    new Map(); // Track which bin is in which zone
  private zoneOccupants: Map<Phaser.GameObjects.Zone, Phaser.GameObjects.Sprite | null> = new Map(); // Track which zone has which bin
  private isAnimating: boolean = false; // Track if bin is currently animating
  private emptyBins: Set<Phaser.GameObjects.Sprite> = new Set(); // Track which bins are empty
  private animContainer: Phaser.GameObjects.Container | null = null; // Container for animation
  private currentAnimatingBin: Phaser.GameObjects.Sprite | null = null; // Track which bin is animating
  private isDragging: boolean = false; // Track if any object is being dragged
  private binTypes: Map<Phaser.GameObjects.Sprite, string> = new Map(); // Track bin types
  private binAcceptedGarbage: Map<string, string[]> = new Map(); // Track which garbage types each bin type accepts

  // Garbage system
  private garbageTypes: string[] = [
    'garbage-can',
    'garbage-apple',
    'garbage-bottle',
    'garbage-bag',
  ]; // Types of garbage
  private garbagePieces: Phaser.GameObjects.Sprite[] = []; // Active garbage pieces
  private garbageTimer!: Phaser.Time.TimerEvent; // Timer for spawning garbage
  private maxGarbagePieces: number = 3; // Maximum number of garbage pieces visible
  private static GARBAGE_SPAWN_INTERVAL: number = 3000; // Garbage spawn interval in ms (3 seconds)

  // Animation parameters
  private tippingAnimParams = {
    rotationAngle: -120, // degrees (CCW)
    rotationDuration: 400, // ms
    holdDuration: 500, // ms
    returnDuration: 400, // ms
    easeFunction: 'Power1',
    pivotOrigin: { x: 0, y: 1 }, // Bottom left corner pivot
  };

  // Garbage animation params
  private garbageAnimParams = {
    entryDuration: 600, // ms
    bounceDuration: 250, // ms
    scale: 0.1, // Scale for garbage pieces
    bounceHeight: 20, // pixels
    spacing: 100, // Horizontal spacing between garbage pieces
    yPosition: 60, // Y-position for garbage pieces
  };

  private garbageStartPositions: Map<Phaser.GameObjects.Sprite, { x: number; y: number }> =
    new Map(); // Track original positions of garbage

  constructor() {
    super({ key: 'GameScene' });
  }

  preload() {
    // Load assets from public directory
    this.load.image('truck', 'truck.png');
    this.load.image('bin-green', 'bin-green.png'); // Empty bin
    this.load.image('bin-blue', 'bin-green.png'); // Using same image for now, can be replaced with different colored bins
    this.load.image('bin-yellow', 'bin-green.png'); // Using same image for now
    this.load.image('bin-green-full', 'bin-green-full.png'); // Full bin with garbage
    this.load.image('bin-blue-full', 'bin-green-full.png'); // Using same image for now
    this.load.image('bin-yellow-full', 'bin-green-full.png'); // Using same image for now
    this.load.image('bin-plastic-empty', 'bin-plastic-empty.png'); // Empty plastic bin
    this.load.image('bin-plastic-full', 'bin-plastic-full.png'); // Full plastic bin
    this.load.image('garbage-can', 'garbage-can.png'); // Garbage can image
    this.load.image('garbage-apple', 'garbage-apple.png'); // Apple garbage image
    this.load.image('garbage-bottle', 'garbage-bottle.png'); // Bottle garbage image
    this.load.image('garbage-bag', 'garbage-bag.png'); // Bag garbage image
  }

  create() {
    // Initialize bin type accepted garbage
    this.binAcceptedGarbage.set('generic', ['garbage-can', 'garbage-apple']); // Generic accepts only non-plastic garbage
    this.binAcceptedGarbage.set('plastic', ['garbage-bottle', 'garbage-bag']); // Plastic only accepts bottles and bags

    // Create the truck sprite
    this.truck = this.add.sprite(
      this.cameras.main.width * 0.25, // Left third of screen
      this.cameras.main.height / 2,
      'truck'
    );
    this.truck.setScale(0.5); // Fixed scale

    // Create drop zone graphics
    this.dropZoneGraphics = this.add.graphics();

    // Zone dimensions
    const zoneWidth = this.cameras.main.width * 0.105;
    const zoneHeight = this.cameras.main.height * 0.25;

    // Create drop zone immediately to the right of truck
    this.truckDropZone = this.add.zone(
      this.cameras.main.width * 0.25 + this.truck.width * 0.25 + zoneWidth * 0.5, // Right side of truck
      this.cameras.main.height / 2, // Same y as truck
      zoneWidth,
      zoneHeight
    );
    this.physics.world.enable(this.truckDropZone, Phaser.Physics.Arcade.STATIC_BODY);
    this.zoneOccupants.set(this.truckDropZone, null);

    // Create three home drop zones (top, middle, bottom)
    const homePositionsY = [
      this.cameras.main.height * 0.2, // Top (moved up)
      this.cameras.main.height * 0.5, // Middle (unchanged)
      this.cameras.main.height * 0.8, // Bottom (moved down)
    ];

    for (const posY of homePositionsY) {
      const homeZone = this.add.zone(
        this.cameras.main.width * 0.75, // Right side of screen
        posY,
        zoneWidth,
        zoneHeight
      );
      this.physics.world.enable(homeZone, Phaser.Physics.Arcade.STATIC_BODY);
      this.homeDropZones.push(homeZone);
      this.zoneOccupants.set(homeZone, null);
    }

    // Create the 3 bin sprites at each home position
    const binTypes = ['plastic', 'generic', 'generic']; // First bin is plastic, others are generic
    const binEmptyTextures = ['bin-plastic-empty', 'bin-green', 'bin-green']; // First bin uses plastic texture
    const binFullTextures = ['bin-plastic-full', 'bin-green-full', 'bin-green-full']; // First bin uses plastic full texture

    for (let i = 0; i < 3; i++) {
      const bin = this.add.sprite(
        this.cameras.main.width * 0.75, // Right side of screen
        homePositionsY[i],
        binEmptyTextures[i] // Start with empty bins
      );
      bin.setScale(this.binScale);

      // Set bin type
      this.binTypes.set(bin, binTypes[i]);

      // Set initial valid position
      this.lastValidPositions[i] = {
        x: this.cameras.main.width * 0.75,
        y: homePositionsY[i],
      };

      // Make bin interactive and draggable
      bin.setInteractive();
      this.input.setDraggable(bin);

      // Enable physics on the bin
      this.physics.world.enable(bin);

      // Add to bins array
      this.bins.push(bin);

      // Initialize bin states - all bins start empty
      this.activeBinZones.set(bin, this.homeDropZones[i]);
      this.zoneOccupants.set(this.homeDropZones[i], bin);
      this.emptyBins.add(bin); // Mark bins as empty initially
    }

    // Draw drop zones
    this.drawDropZones();

    // Setup drag events
    this.setupDragEvents();

    // Start the garbage spawning system
    this.garbageTimer = this.time.addEvent({
      delay: GameScene.GARBAGE_SPAWN_INTERVAL, // Use the constant value
      callback: this.spawnRandomGarbage,
      callbackScope: this,
      loop: true,
    });

    // Spawn initial garbage immediately
    this.spawnRandomGarbage();
  }

  private setupDragEvents() {
    // Drag start event
    this.input.on(
      'dragstart',
      (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Sprite) => {
        // Don't allow dragging if bin is animating
        if (this.isAnimating) return;

        // Set dragging state to true
        this.isDragging = true;

        this.children.bringToTop(gameObject);

        // Check if the dragged object is a bin
        if (this.bins.includes(gameObject)) {
          // Remove bin from its current zone
          const currentZone = this.activeBinZones.get(gameObject);
          if (currentZone) {
            this.zoneOccupants.set(currentZone, null);
          }
          this.activeBinZones.set(gameObject, null);

          // Redraw zones
          this.drawDropZones();

          // Increase size when dragging starts
          this.tweens.add({
            targets: gameObject,
            scale: this.binScale * 1.15,
            duration: 200,
            ease: 'Power1',
          });
        }
        // If it's a garbage piece
        else if (this.garbagePieces.includes(gameObject)) {
          // Store the original position
          this.garbageStartPositions.set(gameObject, { x: gameObject.x, y: gameObject.y });

          // Increase size slightly when dragging garbage
          this.tweens.add({
            targets: gameObject,
            scale: this.garbageAnimParams.scale * 1.2,
            duration: 200,
            ease: 'Power1',
          });
        }
      }
    );

    // While dragging
    this.input.on(
      'drag',
      (
        pointer: Phaser.Input.Pointer,
        gameObject: Phaser.GameObjects.Sprite,
        dragX: number,
        dragY: number
      ) => {
        gameObject.x = dragX;
        gameObject.y = dragY;

        // Update physics body position
        const body = gameObject.body as Phaser.Physics.Arcade.Body;
        if (body) {
          body.x = dragX - body.width / 2;
          body.y = dragY - body.height / 2;

          // Check if over any drop zone (only for bins)
          if (this.bins.includes(gameObject)) {
            // Use pointer position for intersection instead of object bounds
            this.checkDropZoneHover(pointer.x, pointer.y, gameObject);
          }
          // Check if garbage is over bins (only for garbage)
          else if (this.garbagePieces.includes(gameObject)) {
            // Use pointer position for intersection instead of object bounds
            this.checkGarbageHoverOverBins(pointer.x, pointer.y, gameObject);
          }
        }
      }
    );

    // Drag end event
    this.input.on(
      'dragend',
      (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
        // Reset dragging state
        this.isDragging = false;

        const sprite = gameObject as Phaser.GameObjects.Sprite;

        // If it's a bin
        if (this.bins.includes(sprite)) {
          const bin = sprite; // Rename for clarity
          const binIndex = this.bins.indexOf(bin);

          // Create a point for cursor position
          const pointerPosition = new Phaser.Math.Vector2(pointer.x, pointer.y);

          // Check which zone (if any) the bin was dropped in
          let droppedInZone = false;
          let targetPosition = { x: 0, y: 0 };
          let targetZone: Phaser.GameObjects.Zone | null = null;

          // Check truck zone first
          const truckZoneBody = this.truckDropZone.body as Phaser.Physics.Arcade.Body;
          const truckZoneRect = new Phaser.Geom.Rectangle(
            truckZoneBody.x,
            truckZoneBody.y,
            truckZoneBody.width,
            truckZoneBody.height
          );

          if (
            Phaser.Geom.Rectangle.Contains(truckZoneRect, pointerPosition.x, pointerPosition.y) &&
            !this.zoneOccupants.get(this.truckDropZone)
          ) {
            // Dropped in truck zone and it's empty
            droppedInZone = true;
            targetPosition = {
              x: this.truckDropZone.x,
              y: this.truckDropZone.y,
            };
            this.lastValidPositions[binIndex] = targetPosition;
            targetZone = this.truckDropZone;

            // Update zone mappings
            this.activeBinZones.set(bin, this.truckDropZone);
            this.zoneOccupants.set(this.truckDropZone, bin);

            // After positioning at truck zone, play the tipping animation if bin is not empty
            this.tweens.add({
              targets: bin,
              scale: this.binScale * 1.3,
              duration: 200,
              yoyo: true,
              onComplete: () => {
                this.tweens.add({
                  targets: bin,
                  x: targetPosition.x,
                  y: targetPosition.y,
                  scale: this.binScale,
                  duration: 300,
                  ease: 'Back.out',
                  onComplete: () => {
                    // Only play tipping animation if bin is not empty
                    if (!this.emptyBins.has(bin)) {
                      this.playBinTippingAnimation(bin);
                    }
                  },
                });
              },
            });
          } else {
            // Check all home zones
            for (let i = 0; i < this.homeDropZones.length; i++) {
              const homeZoneBody = this.homeDropZones[i].body as Phaser.Physics.Arcade.Body;
              const homeZoneRect = new Phaser.Geom.Rectangle(
                homeZoneBody.x,
                homeZoneBody.y,
                homeZoneBody.width,
                homeZoneBody.height
              );

              if (
                Phaser.Geom.Rectangle.Contains(
                  homeZoneRect,
                  pointerPosition.x,
                  pointerPosition.y
                ) &&
                !this.zoneOccupants.get(this.homeDropZones[i])
              ) {
                // Dropped in an empty home zone
                droppedInZone = true;
                targetPosition = {
                  x: this.homeDropZones[i].x,
                  y: this.homeDropZones[i].y,
                };
                this.lastValidPositions[binIndex] = targetPosition;
                targetZone = this.homeDropZones[i];

                // Update zone mappings
                this.activeBinZones.set(bin, this.homeDropZones[i]);
                this.zoneOccupants.set(this.homeDropZones[i], bin);

                // Update bin texture based on current state
                this.updateBinTexture(bin);

                // Regular animation for home zone (no tipping)
                this.tweens.add({
                  targets: bin,
                  scale: this.binScale * 1.3,
                  duration: 200,
                  yoyo: true,
                  onComplete: () => {
                    this.tweens.add({
                      targets: bin,
                      x: targetPosition.x,
                      y: targetPosition.y,
                      scale: this.binScale,
                      duration: 300,
                      ease: 'Back.out',
                    });
                  },
                });
                break;
              }
            }
          }

          if (!droppedInZone) {
            // Not dropped in any zone, return to last valid position
            this.tweens.add({
              targets: bin,
              x: this.lastValidPositions[binIndex].x,
              y: this.lastValidPositions[binIndex].y,
              scale: this.binScale,
              duration: 400,
              ease: 'Back.out',
              onComplete: () => {
                // Find which zone corresponds to this position and update mappings
                for (const zone of [...this.homeDropZones, this.truckDropZone]) {
                  if (
                    Math.abs(zone.x - this.lastValidPositions[binIndex].x) < 10 &&
                    Math.abs(zone.y - this.lastValidPositions[binIndex].y) < 10
                  ) {
                    // Update zone mappings
                    this.activeBinZones.set(bin, zone);
                    this.zoneOccupants.set(zone, bin);
                    break;
                  }
                }
                // Redraw zones
                this.drawDropZones();
              },
            });
          }

          // Reset drop zone colors
          this.drawDropZones();
        }
        // If it's a garbage piece
        else if (this.garbagePieces.includes(sprite)) {
          // Reset scale
          this.tweens.add({
            targets: sprite,
            scale: this.garbageAnimParams.scale,
            duration: 200,
            ease: 'Power1',
          });

          // Check for collision with bins using cursor position
          this.checkGarbageCollisionWithBins(sprite, pointer.x, pointer.y);
        }
      }
    );
  }

  private checkDropZoneHover(pointerX: number, pointerY: number, bin: Phaser.GameObjects.Sprite) {
    // Check truck zone
    const truckZoneBody = this.truckDropZone.body as Phaser.Physics.Arcade.Body;
    const truckZoneRect = new Phaser.Geom.Rectangle(
      truckZoneBody.x,
      truckZoneBody.y,
      truckZoneBody.width,
      truckZoneBody.height
    );

    const highlightTruck =
      Phaser.Geom.Rectangle.Contains(truckZoneRect, pointerX, pointerY) &&
      !this.zoneOccupants.get(this.truckDropZone);

    // Check all home zones
    const highlightHomeZones = this.homeDropZones.map(zone => {
      const body = zone.body as Phaser.Physics.Arcade.Body;
      const rect = new Phaser.Geom.Rectangle(body.x, body.y, body.width, body.height);
      // Only highlight if zone is empty (or occupied by the current bin)
      return (
        Phaser.Geom.Rectangle.Contains(rect, pointerX, pointerY) &&
        (!this.zoneOccupants.get(zone) || this.zoneOccupants.get(zone) === bin)
      );
    });

    // Redraw drop zones with highlights
    this.drawDropZones(highlightTruck, highlightHomeZones);
  }

  private drawDropZones(highlightTruck: boolean = false, highlightHomeZones: boolean[] = []) {
    this.dropZoneGraphics.clear();

    // Draw truck zone only if it's empty
    if (!this.zoneOccupants.get(this.truckDropZone)) {
      const truckZoneBody = this.truckDropZone.body as Phaser.Physics.Arcade.Body;
      const truckAlpha = highlightTruck ? 0.4 : 0.2;

      // Fill
      this.dropZoneGraphics.fillStyle(0x4caf50, truckAlpha);
      this.dropZoneGraphics.fillRect(
        truckZoneBody.x,
        truckZoneBody.y,
        truckZoneBody.width,
        truckZoneBody.height
      );

      // Border
      this.dropZoneGraphics.lineStyle(2, 0x4caf50, 1);
      this.dropZoneGraphics.strokeRect(
        truckZoneBody.x,
        truckZoneBody.y,
        truckZoneBody.width,
        truckZoneBody.height
      );
    }

    // Draw each home zone only if it's empty
    this.homeDropZones.forEach((zone, index) => {
      if (!this.zoneOccupants.get(zone)) {
        const homeZoneBody = zone.body as Phaser.Physics.Arcade.Body;
        const homeAlpha = highlightHomeZones[index] ? 0.4 : 0.2;

        // Fill
        this.dropZoneGraphics.fillStyle(0x4caf50, homeAlpha);
        this.dropZoneGraphics.fillRect(
          homeZoneBody.x,
          homeZoneBody.y,
          homeZoneBody.width,
          homeZoneBody.height
        );

        // Border
        this.dropZoneGraphics.lineStyle(2, 0x4caf50, 1);
        this.dropZoneGraphics.strokeRect(
          homeZoneBody.x,
          homeZoneBody.y,
          homeZoneBody.width,
          homeZoneBody.height
        );
      }
    });
  }

  /**
   * Plays the bin tipping animation when bin is placed at the truck
   * The bin rotates 120 degrees CCW around its bottom left corner
   */
  private playBinTippingAnimation(bin: Phaser.GameObjects.Sprite) {
    // Disable interaction during animation
    this.isAnimating = true;
    this.currentAnimatingBin = bin;
    bin.disableInteractive();

    // Store original position
    const originalX = bin.x;
    const originalY = bin.y;

    // Remove bin from scene temporarily
    bin.setVisible(false);

    // Create container at the bin's position
    this.animContainer = this.add.container(originalX, originalY);

    // Create a clone of the bin for animation
    const animBin = this.add.sprite(0, 0, bin.texture.key);
    animBin.setScale(this.binScale);

    // Offset the bin within the container to rotate around bottom-left corner
    const width = animBin.width * this.binScale;
    const height = animBin.height * this.binScale;
    animBin.x = width * this.tippingAnimParams.pivotOrigin.x;
    animBin.y = -height * (1 - this.tippingAnimParams.pivotOrigin.y);

    // Add the bin to the container
    this.animContainer.add(animBin);

    // Create tipping animation sequence for the container
    this.tweens.add({
      targets: this.animContainer,
      rotation: Phaser.Math.DegToRad(this.tippingAnimParams.rotationAngle),
      duration: this.tippingAnimParams.rotationDuration,
      ease: this.tippingAnimParams.easeFunction,
      onComplete: () => {
        // Mark bin as empty exactly when it's tipped over
        this.emptyBins.add(bin);

        // Update the sprite (will be applied when bin becomes visible again)
        const binType = this.binTypes.get(bin) || 'generic';
        if (binType === 'plastic') {
          bin.setTexture('bin-plastic-empty');
          // Also update the animation sprite to show empty bin
          animBin.setTexture('bin-plastic-empty');
        } else {
          const binIndex = this.bins.indexOf(bin);
          const binColors = ['bin-green', 'bin-blue', 'bin-yellow'];
          bin.setTexture(binColors[binIndex]);
          // Also update the animation sprite to show empty bin
          animBin.setTexture(binColors[binIndex]);
        }

        // Hold for specified duration
        this.time.delayedCall(this.tippingAnimParams.holdDuration, () => {
          // Return to original rotation
          this.tweens.add({
            targets: this.animContainer,
            rotation: 0,
            duration: this.tippingAnimParams.returnDuration,
            ease: this.tippingAnimParams.easeFunction,
            onComplete: () => {
              // Restore original bin
              bin.setVisible(true);

              // Remove animation container
              if (this.animContainer) {
                this.animContainer.destroy();
                this.animContainer = null;
              }

              // Re-enable interaction
              bin.setInteractive();
              this.input.setDraggable(bin);
              this.isAnimating = false;
              this.currentAnimatingBin = null;
            },
          });
        });
      },
    });
  }

  /**
   * Updates the bin texture based on whether it's empty or full
   */
  private updateBinTexture(bin: Phaser.GameObjects.Sprite) {
    const binType = this.binTypes.get(bin) || 'generic';

    if (this.emptyBins.has(bin)) {
      // Use empty bin texture based on type
      if (binType === 'plastic') {
        bin.setTexture('bin-plastic-empty');
      } else {
        const binIndex = this.bins.indexOf(bin);
        const binColors = ['bin-green', 'bin-blue', 'bin-yellow'];
        bin.setTexture(binColors[binIndex]);
      }
    } else {
      // Use full bin texture based on type
      if (binType === 'plastic') {
        bin.setTexture('bin-plastic-full');
      } else {
        const binIndex = this.bins.indexOf(bin);
        const binColorsFull = ['bin-green-full', 'bin-blue-full', 'bin-yellow-full'];
        bin.setTexture(binColorsFull[binIndex]);
      }
    }
  }

  /**
   * Spawns a random piece of garbage at the top of the screen
   */
  private spawnRandomGarbage() {
    // Skip spawning if we're currently dragging something or at max capacity
    if (this.isDragging || this.garbagePieces.length >= this.maxGarbagePieces) {
      return;
    }

    // Choose a random garbage type
    const randomIndex = Math.floor(Math.random() * this.garbageTypes.length);
    const garbageType = this.garbageTypes[randomIndex];

    // Find the first available position
    const finalX = this.findNextAvailablePosition();
    if (finalX === null) return; // No available spots

    // Create the garbage sprite at position above the screen
    const garbage = this.add.sprite(finalX, -50, garbageType);
    garbage.setScale(this.garbageAnimParams.scale);

    // Make garbage draggable
    garbage.setInteractive();
    this.input.setDraggable(garbage);

    // Enable physics for collision detection
    this.physics.world.enable(garbage);

    // Add to the tracked pieces array
    this.garbagePieces.push(garbage);

    // Animate the garbage entry from top
    this.tweens.add({
      targets: garbage,
      y: this.garbageAnimParams.yPosition,
      duration: this.garbageAnimParams.entryDuration,
      ease: 'Back.out',
    });
  }

  /**
   * Finds the next available position for a new garbage piece
   * Returns null if no positions are available
   */
  private findNextAvailablePosition(): number | null {
    // Define the positions where garbage can be placed
    const baseX = this.cameras.main.width * 0.2;
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
   * Checks if a garbage piece collides with any bin that is in a home drop zone
   */
  private checkGarbageCollisionWithBins(
    garbage: Phaser.GameObjects.Sprite,
    pointerX: number,
    pointerY: number
  ) {
    let collidedWithValidBin = false;
    const startPosition = this.garbageStartPositions.get(garbage);

    // Check each bin
    for (const bin of this.bins) {
      const binBody = bin.body as Phaser.Physics.Arcade.Body;
      const binRect = new Phaser.Geom.Rectangle(
        binBody.x,
        binBody.y,
        binBody.width,
        binBody.height
      );

      // Check if pointer position overlaps with bin
      if (Phaser.Geom.Rectangle.Contains(binRect, pointerX, pointerY)) {
        // Get the zone the bin is in (if any)
        const binZone = this.activeBinZones.get(bin);

        // Only allow garbage to be placed in bins that are in home zones (not truck zone)
        if (binZone && this.homeDropZones.includes(binZone)) {
          // Check if this bin type accepts this garbage type
          const binType = this.binTypes.get(bin) || 'generic';
          const garbageType = garbage.texture.key;
          const acceptedGarbageTypes = this.binAcceptedGarbage.get(binType) || [];

          if (acceptedGarbageTypes.includes(garbageType)) {
            collidedWithValidBin = true;

            // Make the bin full if it was empty
            if (this.emptyBins.has(bin)) {
              this.emptyBins.delete(bin);
              this.updateBinTexture(bin);
            }

            // Play a quick scale animation as visual feedback
            this.tweens.add({
              targets: bin,
              scale: this.binScale * 1.1,
              duration: 100,
              yoyo: true,
              ease: 'Power1',
            });

            // Remove garbage from display and array
            const garbageIndex = this.garbagePieces.indexOf(garbage);
            if (garbageIndex !== -1) {
              this.garbagePieces.splice(garbageIndex, 1);
            }

            // Clean up the stored position
            this.garbageStartPositions.delete(garbage);

            // Fade out and destroy the garbage
            this.tweens.add({
              targets: garbage,
              alpha: 0,
              scale: 0,
              duration: 300,
              ease: 'Power2',
              onComplete: () => {
                garbage.destroy();
              },
            });

            break;
          }
        }
      }
    }

    // If not collided with any valid bin, return to original position
    if (!collidedWithValidBin && startPosition) {
      this.tweens.add({
        targets: garbage,
        x: startPosition.x,
        y: startPosition.y,
        scale: this.garbageAnimParams.scale,
        duration: 400,
        ease: 'Back.out',
      });
    }
  }

  /**
   * Checks if a garbage piece is hovering over bins and shows visual feedback
   */
  private checkGarbageHoverOverBins(
    pointerX: number,
    pointerY: number,
    garbage: Phaser.GameObjects.Sprite
  ) {
    // Reset all bins to original scale first
    this.bins.forEach(bin => {
      // Skip the bin if it's currently being animated
      if (bin === this.currentAnimatingBin) return;
      bin.setScale(this.binScale);
    });

    // Get the garbage type
    const garbageType = garbage.texture.key;

    // Check each bin
    for (const bin of this.bins) {
      // Skip the bin if it's currently being animated
      if (bin === this.currentAnimatingBin) continue;

      const binBody = bin.body as Phaser.Physics.Arcade.Body;
      const binRect = new Phaser.Geom.Rectangle(
        binBody.x,
        binBody.y,
        binBody.width,
        binBody.height
      );

      // Check if pointer position overlaps with bin
      if (Phaser.Geom.Rectangle.Contains(binRect, pointerX, pointerY)) {
        // Get the zone the bin is in (if any)
        const binZone = this.activeBinZones.get(bin);

        // Only highlight bins that are in home zones (not truck zone)
        if (binZone && this.homeDropZones.includes(binZone)) {
          // Check if this bin type accepts this garbage type
          const binType = this.binTypes.get(bin) || 'generic';
          const acceptedGarbageTypes = this.binAcceptedGarbage.get(binType) || [];

          // Only highlight the bin if it accepts this type of garbage
          if (acceptedGarbageTypes.includes(garbageType)) {
            // Highlight bin by increasing its scale
            bin.setScale(this.binScale * 1.1);
          }
          break;
        }
      }
    }
  }
}
