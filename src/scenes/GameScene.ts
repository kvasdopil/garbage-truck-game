import Phaser from 'phaser';

/*
 Main game scene
 - contains the truck and garbage bins
 - bins can be full or empty
 - bins can be dragged to the truck or any home zone
 - when a bin is in the truck zone, it will tip over if the bin is not empty
 - after a bin is tipped over it is empty and cannot be tipped over again
 - when a bin is in a home zone, it will reset to its original position
 - when a bin is dropped outside of the truck or home zones, it will reset to its previous position
 - after a bin is returned to any home zone it is full again
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

  // Animation parameters
  private tippingAnimParams = {
    rotationAngle: -120, // degrees (CCW)
    rotationDuration: 400, // ms
    holdDuration: 500, // ms
    returnDuration: 400, // ms
    easeFunction: 'Power1',
    pivotOrigin: { x: 0, y: 1 }, // Bottom left corner pivot
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
        binColorsFull[i] // Start with full bins
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

      // Initialize bin states
      this.activeBinZones.set(bin, this.homeDropZones[i]);
      this.zoneOccupants.set(this.homeDropZones[i], bin);
    }

    // Draw drop zones
    this.drawDropZones();

    // Setup drag events
    this.setupDragEvents();

    // Resize handler
    this.scale.on('resize', this.handleResize, this);
  }

  private setupDragEvents() {
    // Drag start event
    this.input.on(
      'dragstart',
      (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Sprite) => {
        // Don't allow dragging if bin is animating
        if (this.isAnimating) return;

        this.children.bringToTop(gameObject);

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

          // Check if over any drop zone
          this.checkDropZoneHover(body, gameObject);
        }
      }
    );

    // Drag end event
    this.input.on(
      'dragend',
      (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
        const bin = gameObject as Phaser.GameObjects.Sprite;
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

              // Reset bin to full when placed in any home zone
              this.emptyBins.delete(bin);

              // Update bin texture to show full bin
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
}
