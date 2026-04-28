export { createUserWithTempPasswordHandler } from './createUserWithTempPassword';
export { getClimateAggregateHandler } from './getClimateAggregate';
export { submitClimateResponseHandler } from './submitClimateResponse';

import { createUserWithTempPasswordHandler } from './createUserWithTempPassword';
import { getClimateAggregateHandler } from './getClimateAggregate';
import { submitClimateResponseHandler } from './submitClimateResponse';

// Phase 3 MSW handlers — add to server via server.use(...phase3Handlers) or
// spread into setupServer() alongside existing handlers.
export const phase3Handlers = [
  createUserWithTempPasswordHandler,
  getClimateAggregateHandler,
  submitClimateResponseHandler,
];
