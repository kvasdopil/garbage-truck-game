import Phaser from 'phaser';

export class GameScene extends Phaser.Scene {
  private truck!: Phaser.GameObjects.Sprite;
  private bin!: Phaser.GameObjects.Sprite;
  private truckDropZone!: Phaser.GameObjects.Zone;
  private homeDropZone!: Phaser.GameObjects.Zone;
  private dropZoneGraphics!: Phaser.GameObjects.Graphics;
  private originalBinScale: number = 0.27; // Store original bin scale for reference
  private lastValidPosition = { x: 0, y: 0 }; // Track the bin's last valid position

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
    const zoneWidth = this.cameras.main.width * 0.15;
    const zoneHeight = this.cameras.main.height * 0.25;

    // Create drop zone near truck
    this.truckDropZone = this.add.zone(
      this.cameras.main.width * 0.25, // Same x as truck
      this.cameras.main.height / 2 + this.truck.height * 0.3, // Slightly below truck
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
  }

  private setupDragEvents() {
    // Drag start event
    this.input.on(
      'dragstart',
      (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Sprite) => {
        this.children.bringToTop(gameObject);

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
        } else if (Phaser.Geom.Rectangle.Overlaps(binRect, homeZoneRect)) {
          // Dropped in home zone
          droppedInZone = true;
          targetPosition = {
            x: this.homeDropZone.x,
            y: this.homeDropZone.y,
          };
          this.lastValidPosition = targetPosition;
        }

        if (droppedInZone) {
          // Success animation and move to center of target zone
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

    // Draw truck zone
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

    // Draw home zone
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

  private handleResize(gameSize: Phaser.Structs.Size) {
    // Update camera
    this.cameras.main.setSize(gameSize.width, gameSize.height);

    // Update game object positions
    this.truck.setPosition(gameSize.width * 0.25, gameSize.height / 2);

    // Calculate zone dimensions
    const zoneWidth = gameSize.width * 0.15;
    const zoneHeight = gameSize.height * 0.25;

    // Update truck drop zone
    this.truckDropZone.setPosition(
      gameSize.width * 0.25,
      gameSize.height / 2 + this.truck.height * 0.3
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
    } else {
      this.bin.setPosition(this.homeDropZone.x, this.homeDropZone.y);
      this.lastValidPosition = { x: this.homeDropZone.x, y: this.homeDropZone.y };
    }

    // Redraw drop zones
    this.drawDropZones();
  }
}
