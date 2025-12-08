
import { calculateAnalysis, AnalysisPayload } from '../utils/analysisEngine';

// Listen for messages from the main thread
self.onmessage = (e: MessageEvent<{ type: 'CALCULATE', payload: AnalysisPayload }>) => {
  if (e.data.type === 'CALCULATE') {
    // Run calculation
    const result = calculateAnalysis(e.data.payload);
    // Send back results
    self.postMessage(result);
  }
};
