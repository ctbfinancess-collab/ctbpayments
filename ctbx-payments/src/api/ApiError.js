export default class ApiError extends Error {
  constructor(message, { code = 'API_ERROR', status = null, details = null } = {}) {
    super(message); this.name = 'ApiError'; this.code = code; this.status = status; this.details = details;
  }
}
