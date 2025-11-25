// GameConfig - Responsive Coordinate System
// Provides proportional dimensions for mobile viewport adaptation

export class GameConfig {
  // Reference dimensions (current fixed 400×600 canvas)
  static REFERENCE_WIDTH = 400;
  static REFERENCE_HEIGHT = 600;

  // Current canvas dimensions (updated via updateDimensions)
  static canvasWidth = 400;
  static canvasHeight = 600;

  // Game Mode
  static isTurtleMode = false;

  /**
   * Update canvas dimensions and trigger recalculation of all proportional values
   * @param {number} width - New canvas width
   * @param {number} height - New canvas height
   */
  static updateDimensions(width, height) {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  // ==========================================
  // Entity Position & Size Getters
  // ==========================================

  /**
   * Bird X position (12.5% from left edge)
   * Reference: 50px at 400×600
   */
  static get birdX() {
    return this.canvasWidth * 0.125; // 50/400 = 12.5%
  }

  /**
   * Bird size (width and height, 5% of canvas height)
   * Reference: 30px at 400×600
   */
  static get birdSize() {
    return this.canvasHeight * 0.05; // 30/600 = 5%
  }

  /**
   * Pipe width (15% of canvas width)
   * Reference: 60px at 400×600
   */
  static get pipeWidth() {
    return this.canvasWidth * 0.15; // 60/400 = 15%
  }

  /**
   * Initial pipe gap (28.3% of canvas height)
   * Reference: 170px at 400×600
   */
  static get initialPipeGap() {
    if (this.isTurtleMode) {
      return this.scaleHeight(300); // 300px unscaled (TURTLE_PIPE_GAP)
    }
    return this.canvasHeight * 0.283; // 170/600 ≈ 28.3%
  }

  /**
   * Minimum pipe gap (20% of canvas height)
   * Reference: 120px at 400×600
   */
  static get minPipeGap() {
    return this.canvasHeight * 0.2; // 120/600 = 20%
  }

  // ==========================================
  // Physics Constants (scaled with height)
  // ==========================================

  /**
   * Gravity force (scaled proportionally to canvas height)
   * Reference: 0.25 at 600px height
   */
  static get gravity() {
    const heightRatio = this.canvasHeight / this.REFERENCE_HEIGHT;
    return 0.25 * heightRatio;
  }

  /**
   * Jump strength (scaled proportionally to canvas height)
   * Reference: -5 at 600px height
   */
  static get jumpStrength() {
    const heightRatio = this.canvasHeight / this.REFERENCE_HEIGHT;
    return -5 * heightRatio;
  }

  // ==========================================
  // Helper Methods
  // ==========================================

  /**
   * Get current scale factor relative to reference dimensions
   * @returns {{x: number, y: number}} Scale factors for width and height
   */
  static getScaleFactors() {
    return {
      x: this.canvasWidth / this.REFERENCE_WIDTH,
      y: this.canvasHeight / this.REFERENCE_HEIGHT
    };
  }

  /**
   * Scale a value proportionally to canvas width
   * @param {number} referenceValue - Value at reference width (400px)
   * @returns {number} Scaled value
   */
  static scaleWidth(referenceValue) {
    return referenceValue * (this.canvasWidth / this.REFERENCE_WIDTH);
  }

  /**
   * Scale a value proportionally to canvas height
   * @param {number} referenceValue - Value at reference height (600px)
   * @returns {number} Scaled value
   */
  static scaleHeight(referenceValue) {
    return referenceValue * (this.canvasHeight / this.REFERENCE_HEIGHT);
  }

  static toggleTurtleMode(enabled) {
    this.isTurtleMode = enabled;
  }
}
