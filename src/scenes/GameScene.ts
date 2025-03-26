import Phaser from 'phaser';

/*
 Main game scene
 contains the truck and garbage bin
 the bin can be dragged to the truck or the home zone
 when the bin is in the truck zone, it will tip over if the bin is not empty
 when the bin is in the home zone, it will reset to its original position
 when the bin is dropped outside of the truck or home zone, it will reset to its previous position
 after the bin is tipped over it is empty and cannot be tipped over again
 after the bin is returned to the home zone it is full again
*/

export class GameScene extends Phaser.Scene {
  private truck!: Phaser.GameObjects.Sprite;
  private bin!: Phaser.GameObjects.Sprite;
  private truckDropZone!: Phaser.GameObjects.Zone;
  private homeDropZone!: Phaser.GameObjects.Zone;
  private dropZoneGraphics!: Phaser.GameObjects.Graphics;
  private originalBinScale: number = 0.27; // Store original bin scale for reference
  private lastValidPosition = { x: 0, y: 0 }; // Track the bin's last valid position
  private activeBinZone: 'truck' | 'home' | null = null; // Track which zone has the bin
  private isAnimating: boolean = false; // Track if bin is currently animating
  private isBinEmpty: boolean = false; // Track if bin has been emptied
  private animContainer: Phaser.GameObjects.Container | null = null; // Container for animation

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
    this.load.image('bin', 'bin-green.png');
  }

  create() {
    // Create the truck sprite
    this.truck = this.add.sprite(
      this.cameras.main.width * 0.25, // Left third of screen
      this.cameras.main.height / 2,
      'truck'
    );
    this.truck.setScale(0.5); // Adjust scale as needed

    // Create the bin sprite
    this.bin = this.add.sprite(
      this.cameras.main.width * 0.75, // Right side of screen
      this.cameras.main.height / 2,
      'bin'
    );
    this.bin.setScale(this.originalBinScale); // Decreased by ~1/3 from original 0.4

    // Set initial valid position to bin's starting position
    this.lastValidPosition = {
      x: this.cameras.main.width * 0.75,
      y: this.cameras.main.height / 2,
    };

    // Make bin interactive and draggable
    this.bin.setInteractive();
    this.input.setDraggable(this.bin);

    // Enable physics on the bin
    this.physics.world.enable(this.bin);

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

    // Create drop zone at original bin position (home)
    this.homeDropZone = this.add.zone(
      this.cameras.main.width * 0.75, // Original bin position
      this.cameras.main.height / 2,
      zoneWidth,
      zoneHeight
    );
    this.physics.world.enable(this.homeDropZone, Phaser.Physics.Arcade.STATIC_BODY);

    // Draw both drop zones
    this.drawDropZones();

    // Setup drag events
    this.setupDragEvents();

    // Resize handler
    this.scale.on('resize', this.handleResize, this);

    // Initialize bin as full
    this.isBinEmpty = false;
  }

  private setupDragEvents() {
    // Drag start event
    this.input.on(
      'dragstart',
      (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Sprite) => {
        // Don't allow dragging if the bin is animating
        if (this.isAnimating) return;

        this.children.bringToTop(gameObject);

        // Clear the active bin zone when dragging starts
        this.activeBinZone = null;

        // Redraw zones to show both when dragging starts
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
          this.checkDropZoneHover(body);
        }
      }
    );

    // Drag end event
    this.input.on(
      'dragend',
      (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
        const bin = gameObject as Phaser.GameObjects.Sprite;
        const binBody = bin.body as Phaser.Physics.Arcade.Body;

        // Check if bin is dropped in either zone
        const binRect = new Phaser.Geom.Rectangle(
          binBody.x,
          binBody.y,
          binBody.width,
          binBody.height
        );

        const truckZoneBody = this.truckDropZone.body as Phaser.Physics.Arcade.Body;
        const truckZoneRect = new Phaser.Geom.Rectangle(
          truckZoneBody.x,
          truckZoneBody.y,
          truckZoneBody.width,
          truckZoneBody.height
        );

        const homeZoneBody = this.homeDropZone.body as Phaser.Physics.Arcade.Body;
        const homeZoneRect = new Phaser.Geom.Rectangle(
          homeZoneBody.x,
          homeZoneBody.y,
          homeZoneBody.width,
          homeZoneBody.height
        );

        // Check which zone (if any) the bin was dropped in
        let droppedInZone = false;
        let targetPosition = { x: 0, y: 0 };

        if (Phaser.Geom.Rectangle.Overlaps(binRect, truckZoneRect)) {
          // Dropped in truck zone
          droppedInZone = true;
          targetPosition = {
            x: this.truckDropZone.x,
            y: this.truckDropZone.y,
          };
          this.lastValidPosition = targetPosition;
          this.activeBinZone = 'truck';

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
                  if (!this.isBinEmpty) {
                    this.playBinTippingAnimation();
                  }
                },
              });
            },
          });
        } else if (Phaser.Geom.Rectangle.Overlaps(binRect, homeZoneRect)) {
          // Dropped in home zone
          droppedInZone = true;
          targetPosition = {
            x: this.homeDropZone.x,
            y: this.homeDropZone.y,
          };
          this.lastValidPosition = targetPosition;
          this.activeBinZone = 'home';

          // Reset bin to full when placed in home zone
          this.isBinEmpty = false;

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
        }

        if (droppedInZone) {
          // Do nothing here since we've moved the animations to their respective conditions
        } else {
          // Not dropped in any zone, return to last valid position
          this.tweens.add({
            targets: bin,
            x: this.lastValidPosition.x,
            y: this.lastValidPosition.y,
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

  private checkDropZoneHover(binBody: Phaser.Physics.Arcade.Body) {
    // Create bin rectangle
    const binRect = new Phaser.Geom.Rectangle(binBody.x, binBody.y, binBody.width, binBody.height);

    // Get truck zone rectangle
    const truckZoneBody = this.truckDropZone.body as Phaser.Physics.Arcade.Body;
    const truckZoneRect = new Phaser.Geom.Rectangle(
      truckZoneBody.x,
      truckZoneBody.y,
      truckZoneBody.width,
      truckZoneBody.height
    );

    // Get home zone rectangle
    const homeZoneBody = this.homeDropZone.body as Phaser.Physics.Arcade.Body;
    const homeZoneRect = new Phaser.Geom.Rectangle(
      homeZoneBody.x,
      homeZoneBody.y,
      homeZoneBody.width,
      homeZoneBody.height
    );

    // Redraw drop zones with highlight if bin is hovering over them
    this.drawDropZones(
      Phaser.Geom.Rectangle.Overlaps(binRect, truckZoneRect),
      Phaser.Geom.Rectangle.Overlaps(binRect, homeZoneRect)
    );
  }

  private drawDropZones(highlightTruck: boolean = false, highlightHome: boolean = false) {
    this.dropZoneGraphics.clear();

    // Draw truck zone only if it doesn't have the bin
    if (this.activeBinZone !== 'truck') {
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

    // Draw home zone only if it doesn't have the bin
    if (this.activeBinZone !== 'home') {
      const homeZoneBody = this.homeDropZone.body as Phaser.Physics.Arcade.Body;
      const homeAlpha = highlightHome ? 0.4 : 0.2;

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

    // Update home drop zone
    this.homeDropZone.setPosition(gameSize.width * 0.75, gameSize.height / 2);
    this.homeDropZone.setSize(zoneWidth, zoneHeight);
    (this.homeDropZone.body as Phaser.Physics.Arcade.Body).setSize(zoneWidth, zoneHeight);
    (this.homeDropZone.body as Phaser.Physics.Arcade.Body).updateFromGameObject();

    // Update bin position if it's in a drop zone (determine which one is closest)
    const distanceToTruckZone = Phaser.Math.Distance.Between(
      this.bin.x,
      this.bin.y,
      this.truckDropZone.x,
      this.truckDropZone.y
    );

    const distanceToHomeZone = Phaser.Math.Distance.Between(
      this.bin.x,
      this.bin.y,
      this.homeDropZone.x,
      this.homeDropZone.y
    );

    // Update the bin's position based on which zone it's closest to
    if (distanceToTruckZone < distanceToHomeZone) {
      this.bin.setPosition(this.truckDropZone.x, this.truckDropZone.y);
      this.lastValidPosition = { x: this.truckDropZone.x, y: this.truckDropZone.y };
      this.activeBinZone = 'truck';
    } else {
      this.bin.setPosition(this.homeDropZone.x, this.homeDropZone.y);
      this.lastValidPosition = { x: this.homeDropZone.x, y: this.homeDropZone.y };
      this.activeBinZone = 'home';
    }

    // Redraw drop zones
    this.drawDropZones();
  }

  /**
   * Plays the bin tipping animation when bin is placed at the truck
   * The bin rotates 120 degrees CCW around its bottom left corner
   */
  private playBinTippingAnimation() {
    // Disable interaction during animation
    this.isAnimating = true;
    this.bin.disableInteractive();

    // Store original position
    const originalX = this.bin.x;
    const originalY = this.bin.y;

    // Remove bin from scene temporarily
    this.bin.setVisible(false);

    // Create container at the bin's position
    this.animContainer = this.add.container(originalX, originalY);

    // Create a clone of the bin for animation
    const animBin = this.add.sprite(0, 0, 'bin');
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
              this.bin.setVisible(true);

              // Remove animation container
              if (this.animContainer) {
                this.animContainer.destroy();
                this.animContainer = null;
              }

              // Mark bin as empty after animation completes
              this.isBinEmpty = true;

              // Re-enable interaction
              this.bin.setInteractive();
              this.input.setDraggable(this.bin);
              this.isAnimating = false;
            },
          });
        });
      },
    });
  }
}
