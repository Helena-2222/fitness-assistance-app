import baseEvaluator, { runGuardChecks } from '../base-evaluator.js';
import fb from '../feedback/zh-CN.js';

export default {
  id: 'combo',
  focusKeypoints: baseEvaluator.focusKeypoints,
  scoreWeights: { pose: 0.50, motion: 0.40, visibility: 0.10 },

  evaluate(context) {
    const guardResult = runGuardChecks(context);
    if (guardResult) return guardResult;

    const result = baseEvaluator.evaluate({
      ...context,
      weights: this.scoreWeights,
      matchKeypoints: this.focusKeypoints,
    });

    if (result.message === fb.shared.great.message && result.score < 85) {
      return {
        ...result,
        message: fb.combo.follow.message,
        cue: fb.combo.follow.cue,
        tone: fb.combo.follow.tone,
      };
    }

    return result;
  }
};
