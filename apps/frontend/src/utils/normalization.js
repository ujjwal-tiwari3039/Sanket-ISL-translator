/**
 * Coordinate normalization for sign recognition keypoints.
 *
 * Extracted from App.jsx extractKeypoints() for testability.
 * Implementation must remain identical to the Python training pipeline.
 *
 * Normalization approach:
 * - Center relative to nose landmark (pose[0])
 * - Scale by shoulder width (pose landmarks 11-12)
 * - Applied to pose (0-132) and hand (1566-1692) sub-arrays
 * - Face coordinates (132-1566) are normalized but subsequently trimmed
 *
 * Feature layout (1692 total before trim):
 *   [0-131]    Pose: 33 × 4 (x, y, z, visibility)
 *   [132-1565] Face: 478 × 3 (x, y, z)
 *   [1566-1691] Left hand: 21 × 3 (x, y, z)
 *   [1692-1755] Right hand: 21 × 3 — but trimmed; actual hands start at 1566
 *
 * Final output: 258 features (pose 132 + hands 126)
 *
 * @param {Float32Array} result - Raw 1692-element feature vector
 * @returns {Float32Array} Normalized 258-element feature vector
 */
export function normalizeKeypoints(result) {
  // Normalize coordinates relative to nose and scale by shoulder width
  if (result[0] !== 0 || result[1] !== 0) {
    const noseX = result[0];
    const noseY = result[1];

    const lShoulderX = result[11 * 4];
    const lShoulderY = result[11 * 4 + 1];
    const rShoulderX = result[12 * 4];
    const rShoulderY = result[12 * 4 + 1];

    const shoulderWidth = Math.sqrt(
      Math.pow(lShoulderX - rShoulderX, 2) + Math.pow(lShoulderY - rShoulderY, 2)
    );
    const scale = shoulderWidth > 0.01 ? shoulderWidth : 1.0;

    // Pose
    for (let i = 0; i < 132; i += 4) {
      if (result[i] !== 0 || result[i + 1] !== 0) {
        result[i] = (result[i] - noseX) / scale;
        result[i + 1] = (result[i + 1] - noseY) / scale;
      }
    }

    // Face
    for (let i = 132; i < 1566; i += 3) {
      if (result[i] !== 0 || result[i + 1] !== 0) {
        result[i] = (result[i] - noseX) / scale;
        result[i + 1] = (result[i + 1] - noseY) / scale;
      }
    }

    // Hands
    for (let i = 1566; i < 1692; i += 3) {
      if (result[i] !== 0 || result[i + 1] !== 0) {
        result[i] = (result[i] - noseX) / scale;
        result[i + 1] = (result[i + 1] - noseY) / scale;
      }
    }
  }

  // Trim out face landmarks (1434 features) to prevent LSTM from keying on facial noise.
  // Pose: 0-132, Hands: 1566-1692 → Total 258 features
  const finalResult = new Float32Array(258);
  finalResult.set(result.slice(0, 132), 0);
  finalResult.set(result.slice(1566, 1692), 132);
  return finalResult;
}
