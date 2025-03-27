import Phaser from 'phaser';

export class ScoreCounter extends Phaser.GameObjects.Container {
  private score: number = 0;
  private starIcon: Phaser.GameObjects.Sprite;
  private scoreText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    // Create the star icon using the first frame (0) of the icons spritesheet
    this.starIcon = scene.add.sprite(0, 0, 'icons', 0);
    this.starIcon.setScale(1.0); // Scale down the icon

    // Create the score text
    this.scoreText = scene.add.text(
      this.starIcon.width * 0.5, // Position right of the star
      5, // Same y as the star
      '0', // Initial score value
      {
        fontSize: '30px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4,
      }
    );
    this.scoreText.setOrigin(0, 0.5); // Align from left, centered vertically

    // Add icon and text to the container
    this.add([this.starIcon, this.scoreText]);

    // Add container to the scene
    scene.add.existing(this);
  }

  public incrementScore(): void {
    this.score++;
    this.scoreText.setText(this.score.toString());
    this.animateStar();
  }

  private animateStar(): void {
    // Play a pulse animation on the star icon
    this.scene.tweens.add({
      targets: this.starIcon,
      scaleX: 1.25,
      scaleY: 1.25,
      duration: 200,
      yoyo: true, // Return to original scale
      ease: 'Sine.easeInOut',
    });
  }

  public getScore(): number {
    return this.score;
  }

  public setScore(value: number): void {
    this.score = value;
    this.scoreText.setText(this.score.toString());
  }

  public destroy(): void {
    super.destroy();
  }
}
