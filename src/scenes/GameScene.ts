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
*/

export class GameScene extends Phaser.Scene {
  private truck!: Phaser.GameObjects.Sprite;
  private bins: Phaser.GameObjects.Sprite[] = [];
  private truckDropZone!: Phaser.GameObjects.Zone;
  private homeDropZones: Phaser.GameObjects.Zone[] = [];
  private dropZoneGraphics!: Phaser.GameObjects.Graphics;
  private originalBinScale: number = 0.27; // Store original bin scale for reference
  private lastValidPositions: { x: number; y: number }[] = []; // Track each bin's last valid position
  private activeBinZones: Map<Phaser.GameObjects.Sprite, Phaser.GameObjects.Zone | null> =
    new Map(); // Track which bin is in which zone
  private zoneOccupants: Map<Phaser.GameObjects.Zone, Phaser.GameObjects.Sprite | null> = new Map(); // Track which zone has which bin
  private isAnimating: boolean = false; // Track if bin is currently animating
  private emptyBins: Set<Phaser.GameObjects.Sprite> = new Set(); // Track which bins are empty
  private animContainer: Phaser.GameObjects.Container | null = null; // Container for animation
  private currentAnimatingBin: Phaser.GameObjects.Sprite | null = null; // Track which bin is animating

  // Garbage system
  private garbageTypes: string[] = ['garbage-can', 'garbage-apple', 'garbage-bottle']; // Types of garbage
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
    scale: 0.1, // Smaller scale for garbage pieces
    bounceHeight: 20, // pixels
    spacing: 100, // Horizontal spacing between garbage pieces
    yPosition: 60, // Y-position for garbage pieces
  };

  constructor() {
    super({ key: 'GameScene' });
  }

  preload() {
    // Load assets from public directory
    this.load.image('truck', 'truck.png');
    this.load.image('bin-green', 'bin-green.png'); // Empty bin
    this.load.image('bin-blue', 'bin-green.png'); // Using same image for now, can be replaced with different colored bins
    this.load.image('bin-yellow', 'bin-green.png'); // Using same image for now, can be replaced with different colored bins
    this.load.image('bin-green-full', 'bin-green-full.png'); // Full bin with garbage
    this.load.image('bin-blue-full', 'bin-green-full.png'); // Using same image for now
    this.load.image('bin-yellow-full', 'bin-green-full.png'); // Using same image for now
    this.load.image('garbage-can', 'garbage-can.png'); // Garbage can image
    this.load.image('garbage-apple', 'garbage-apple.png'); // Apple garbage image
    this.load.image('garbage-bottle', 'garbage-bottle.png'); // Bottle garbage image
  }

  create() {
    // Create the truck sprite
    this.truck = this.add.sprite(
      this.cameras.main.width * 0.25, // Left third of screen
      this.cameras.main.height / 2,
      'truck'
    );
    this.truck.setScale(0.5); // Adjust scale as needed

    // Create drop zone graphics
    this.dropZoneGraphics = this.add.graphics();

    // Zone dimensions
    const zoneWidth = this.cameras.main.width * 0.105; // Reduced by 30% from 0.15
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
      this.cameras.main.height * 0.25, // Top
      this.cameras.main.height * 0.5, // Middle
      this.cameras.main.height * 0.75, // Bottom
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
    const binColors = ['bin-green', 'bin-blue', 'bin-yellow'];
    const binColorsFull = ['bin-green-full', 'bin-blue-full', 'bin-yellow-full'];

    for (let i = 0; i < 3; i++) {
      const bin = this.add.sprite(
        this.cameras.main.width * 0.75, // Right side of screen
        homePositionsY[i],
        binColors[i] // Start with empty bins
      );
      bin.setScale(this.originalBinScale);

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

    // Resize handler
    this.scale.on('resize', this.handleResize, this);

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
            scale: this.originalBinScale * 1.15,
            duration: 200,
            ease: 'Power1',
          });
        }
        // If it's a garbage piece
        else if (this.garbagePieces.includes(gameObject)) {
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
        _pointer: Phaser.Input.Pointer,
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
            this.checkDropZoneHover(body, gameObject);
          }
        }
      }
    );

    // Drag end event
    this.input.on(
      'dragend',
      (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
        const sprite = gameObject as Phaser.GameObjects.Sprite;

        // If it's a bin
        if (this.bins.includes(sprite)) {
          const bin = sprite; // Rename for clarity
          const binBody = bin.body as Phaser.Physics.Arcade.Body;
          const binIndex = this.bins.indexOf(bin);

          // Check if bin is dropped in any zone
          const binRect = new Phaser.Geom.Rectangle(
            binBody.x,
            binBody.y,
            binBody.width,
            binBody.height
          );

          // Get truck zone rectangle
          const truckZoneBody = this.truckDropZone.body as Phaser.Physics.Arcade.Body;
          const truckZoneRect = new Phaser.Geom.Rectangle(
            truckZoneBody.x,
            truckZoneBody.y,
            truckZoneBody.width,
            truckZoneBody.height
          );

          // Create rectangles for all home zones
          const homeZoneRects = this.homeDropZones.map(zone => {
            const body = zone.body as Phaser.Physics.Arcade.Body;
            return new Phaser.Geom.Rectangle(body.x, body.y, body.width, body.height);
          });

          // Check which zone (if any) the bin was dropped in
          let droppedInZone = false;
          let targetPosition = { x: 0, y: 0 };
          let targetZone: Phaser.GameObjects.Zone | null = null;

          // Check truck zone first
          if (
            Phaser.Geom.Rectangle.Overlaps(binRect, truckZoneRect) &&
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
              scale: this.originalBinScale * 1.3,
              duration: 200,
              yoyo: true,
              onComplete: () => {
                this.tweens.add({
                  targets: bin,
                  x: targetPosition.x,
                  y: targetPosition.y,
                  scale: this.originalBinScale,
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
              if (
                Phaser.Geom.Rectangle.Overlaps(binRect, homeZoneRects[i]) &&
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
                  scale: this.originalBinScale * 1.3,
                  duration: 200,
                  yoyo: true,
                  onComplete: () => {
                    this.tweens.add({
                      targets: bin,
                      x: targetPosition.x,
                      y: targetPosition.y,
                      scale: this.originalBinScale,
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
              scale: this.originalBinScale,
              duration: 400,
              ease: 'Back.out',
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

          // Check for collision with bins
          this.checkGarbageCollisionWithBins(sprite);
        }
      }
    );
  }

  private checkDropZoneHover(binBody: Phaser.Physics.Arcade.Body, bin: Phaser.GameObjects.Sprite) {
    // Create bin rectangle
    const binRect = new Phaser.Geom.Rectangle(binBody.x, binBody.y, binBody.width, binBody.height);

    // Check truck zone
    const truckZoneBody = this.truckDropZone.body as Phaser.Physics.Arcade.Body;
    const truckZoneRect = new Phaser.Geom.Rectangle(
      truckZoneBody.x,
      truckZoneBody.y,
      truckZoneBody.width,
      truckZoneBody.height
    );
    const highlightTruck =
      Phaser.Geom.Rectangle.Overlaps(binRect, truckZoneRect) &&
      !this.zoneOccupants.get(this.truckDropZone);

    // Check all home zones
    const highlightHomeZones = this.homeDropZones.map((zone, index) => {
      const body = zone.body as Phaser.Physics.Arcade.Body;
      const rect = new Phaser.Geom.Rectangle(body.x, body.y, body.width, body.height);
      // Only highlight if zone is empty (or occupied by the current bin)
      return (
        Phaser.Geom.Rectangle.Overlaps(binRect, rect) &&
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

  private handleResize(gameSize: Phaser.Structs.Size) {
    // Update camera
    this.cameras.main.setSize(gameSize.width, gameSize.height);

    // Update game object positions
    this.truck.setPosition(gameSize.width * 0.25, gameSize.height / 2);

    // Calculate zone dimensions
    const zoneWidth = gameSize.width * 0.07; // Reduced by 30% from 0.1
    const zoneHeight = gameSize.height * 0.1;

    // Update truck drop zone - now to the right of the truck
    this.truckDropZone.setPosition(
      gameSize.width * 0.25 + this.truck.width * 0.25 + zoneWidth * 0.5,
      gameSize.height / 2
    );
    this.truckDropZone.setSize(zoneWidth, zoneHeight);
    (this.truckDropZone.body as Phaser.Physics.Arcade.Body).setSize(zoneWidth, zoneHeight);
    (this.truckDropZone.body as Phaser.Physics.Arcade.Body).updateFromGameObject();

    // Update home drop zones
    const homePositionsY = [
      gameSize.height * 0.25, // Top
      gameSize.height * 0.5, // Middle
      gameSize.height * 0.75, // Bottom
    ];

    this.homeDropZones.forEach((zone, index) => {
      zone.setPosition(gameSize.width * 0.75, homePositionsY[index]);
      zone.setSize(zoneWidth, zoneHeight);
      (zone.body as Phaser.Physics.Arcade.Body).setSize(zoneWidth, zoneHeight);
      (zone.body as Phaser.Physics.Arcade.Body).updateFromGameObject();
    });

    // Update bins' positions
    this.bins.forEach((bin, index) => {
      const currentZone = this.activeBinZones.get(bin);
      if (currentZone) {
        // If bin is in a zone, update its position to the zone's position
        bin.setPosition(currentZone.x, currentZone.y);
        this.lastValidPositions[index] = { x: currentZone.x, y: currentZone.y };
      }
    });

    // Update garbage pieces positions
    this.updateGarbagePositions();

    // Redraw drop zones
    this.drawDropZones();
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
    animBin.setScale(this.originalBinScale);

    // Offset the bin within the container to rotate around bottom-left corner
    const width = animBin.width * this.originalBinScale;
    const height = animBin.height * this.originalBinScale;
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
        const binIndex = this.bins.indexOf(bin);
        const binColors = ['bin-green', 'bin-blue', 'bin-yellow'];
        bin.setTexture(binColors[binIndex]);

        // Also update the animation sprite to show empty bin
        animBin.setTexture(binColors[binIndex]);

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
    const binIndex = this.bins.indexOf(bin);
    const binColors = ['bin-green', 'bin-blue', 'bin-yellow'];
    const binColorsFull = ['bin-green-full', 'bin-blue-full', 'bin-yellow-full'];

    if (this.emptyBins.has(bin)) {
      // Use empty bin texture
      bin.setTexture(binColors[binIndex]);
    } else {
      // Use full bin texture
      bin.setTexture(binColorsFull[binIndex]);
    }
  }

  /**
   * Spawns a random piece of garbage at the top of the screen
   */
  private spawnRandomGarbage() {
    // Only spawn if we don't already have the maximum number of garbage pieces
    if (this.garbagePieces.length >= this.maxGarbagePieces) {
      return;
    }

    // Choose a random garbage type
    const randomIndex = Math.floor(Math.random() * this.garbageTypes.length);
    const garbageType = this.garbageTypes[randomIndex];

    // Calculate position
    this.updateGarbagePositions();
    const startX = -50; // Start off-screen to the left
    const finalX = this.calculateGarbageXPosition(this.garbagePieces.length);

    // Create the garbage sprite
    const garbage = this.add.sprite(startX, this.garbageAnimParams.yPosition, garbageType);
    garbage.setScale(this.garbageAnimParams.scale);

    // Make garbage draggable
    garbage.setInteractive();
    this.input.setDraggable(garbage);

    // Enable physics for collision detection
    this.physics.world.enable(garbage);

    // Add to the tracked pieces array
    this.garbagePieces.push(garbage);

    // Animate the garbage entry
    this.tweens.add({
      targets: garbage,
      x: finalX,
      duration: this.garbageAnimParams.entryDuration,
      ease: 'Back.out',
      onComplete: () => {
        // Add a bounce effect
        this.tweens.add({
          targets: garbage,
          y: this.garbageAnimParams.yPosition + this.garbageAnimParams.bounceHeight,
          duration: this.garbageAnimParams.bounceDuration,
          yoyo: true,
          ease: 'Sine.out',
        });
      },
    });
  }

  /**
   * Updates the positions of all garbage pieces
   */
  private updateGarbagePositions() {
    for (let i = 0; i < this.garbagePieces.length; i++) {
      const garbage = this.garbagePieces[i];
      const finalX = this.calculateGarbageXPosition(i);

      // Only animate if the position is significantly different
      if (Math.abs(garbage.x - finalX) > 5) {
        this.tweens.add({
          targets: garbage,
          x: finalX,
          duration: 300,
          ease: 'Power1',
        });
      } else {
        garbage.x = finalX;
      }
    }
  }

  /**
   * Calculates the X position for a garbage piece based on its index
   */
  private calculateGarbageXPosition(index: number): number {
    const startX = this.cameras.main.width * 0.2; // Start position
    return startX + index * this.garbageAnimParams.spacing;
  }

  /**
   * Checks if a garbage piece collides with any bin that is in a home drop zone
   */
  private checkGarbageCollisionWithBins(garbage: Phaser.GameObjects.Sprite) {
    const garbageBody = garbage.body as Phaser.Physics.Arcade.Body;
    const garbageRect = new Phaser.Geom.Rectangle(
      garbageBody.x,
      garbageBody.y,
      garbageBody.width,
      garbageBody.height
    );

    let collidedWithValidBin = false;

    // Check each bin
    for (const bin of this.bins) {
      // Remove restriction that only allows empty bins to accept garbage
      // if (!this.emptyBins.has(bin)) continue;

      const binBody = bin.body as Phaser.Physics.Arcade.Body;
      const binRect = new Phaser.Geom.Rectangle(
        binBody.x,
        binBody.y,
        binBody.width,
        binBody.height
      );

      // Check if garbage overlaps with bin
      if (Phaser.Geom.Rectangle.Overlaps(garbageRect, binRect)) {
        // Get the zone the bin is in (if any)
        const binZone = this.activeBinZones.get(bin);

        // Only allow garbage to be placed in bins that are in home zones (not truck zone)
        if (binZone && this.homeDropZones.includes(binZone)) {
          collidedWithValidBin = true;

          // Make the bin full if it was empty
          if (this.emptyBins.has(bin)) {
            this.emptyBins.delete(bin);
            this.updateBinTexture(bin);
          }

          // Play a quick scale animation as visual feedback
          this.tweens.add({
            targets: bin,
            scale: this.originalBinScale * 1.1,
            duration: 100,
            yoyo: true,
            ease: 'Power1',
          });

          // Remove garbage from display and array
          const garbageIndex = this.garbagePieces.indexOf(garbage);
          if (garbageIndex !== -1) {
            this.garbagePieces.splice(garbageIndex, 1);
          }

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

    // If not collided with any valid bin, return to original position
    if (!collidedWithValidBin) {
      const garbageIndex = this.garbagePieces.indexOf(garbage);
      const finalX = this.calculateGarbageXPosition(garbageIndex);

      this.tweens.add({
        targets: garbage,
        x: finalX,
        y: this.garbageAnimParams.yPosition,
        duration: 400,
        ease: 'Back.out',
      });
    }
  }
}
