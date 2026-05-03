/**
 * @typedef {Object} SegmentationResponse
 * @property {string} mask base64 encoded PNG string
 */

/**
 * @typedef {Object} AIHealthResponse
 * @property {string} status
 * @property {string} service
 */

/**
 * @typedef {Object} SegmentationState
 * @property {string|null} maskBase64
 * @property {boolean} isLoading
 * @property {string|null} error
 */

export const segmentationInitialState = {
  maskBase64: null,
  isLoading: false,
  error: null,
};
