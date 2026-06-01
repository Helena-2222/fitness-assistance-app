import {
  compareToStandardPose,
  isVisible,
} from '../../pose-utils.js';
import { runGuardChecks } from '../base-evaluator.js';
import fb from '../feedback/zh-CN.js';

export default {
  id: 'stretch',
  focusKeypoints: [
    'left_shoulder', 'right_shoulder',
    'left_elbow', 'right_elbow',
    'left_wrist', 'right_wrist',
    'left_hip', 'right_hip',
    'left_knee', 'right_knee',
    'left_ankle', 'right_ankle',
  ],
  scoreWeights: { pose: 0.65, motion: 0.10, visibility: 0.25 },

  evaluate(context) {
    const guardResult = runGuardChecks(context);
    if (guardResult) return guardResult;

    const { pose, standardPose, motion, seconds } = context;

    const matchResult = compareToStandardPose(pose, standardPose, this.focusKeypoints);
    const visiblePoints = pose?.keypoints?.filter((p) => isVisible(p)) ?? [];
    const visibilityScore = Math.min(100, Math.round((visiblePoints.length / this.focusKeypoints.length) * 100));

    // For stretching, low motion = good (holding the stretch)
    const isHolding = motion.user < 0.05;
    const holdingBonus = isHolding ? 15 : -10;

    let score = matchResult
      ? Math.round(matchResult.score * this.scoreWeights.pose
        + (isHolding ? 85 : Math.max(30, 70 - motion.user * 300)) * this.scoreWeights.motion
        + visibilityScore * this.scoreWeights.visibility)
      : Math.round(visibilityScore * 0.7 + (isHolding ? 30 : 0));

    score = Math.max(30, Math.min(98, Math.round(score)));

    let message = fb.stretch.hold.message;
    let cue = fb.stretch.hold.cue;
    let tone = fb.stretch.hold.tone;

    if (seconds < 10) {
      message = fb.stretch.enter.message;
      cue = fb.stretch.enter.cue;
      tone = fb.stretch.enter.tone;
    } else if (!isHolding && motion.user > 0.08) {
      score = Math.min(score, 60);
      message = fb.stretch.tooMuchMovement.message;
      cue = fb.stretch.tooMuchMovement.cue;
      tone = fb.stretch.tooMuchMovement.tone;
    } else if (matchResult && matchResult.score < 50) {
      score = Math.min(score, 60);
      message = fb.stretch.deeper.message;
      cue = fb.stretch.deeper.cue;
      tone = fb.stretch.deeper.tone;
    } else if (score >= 88) {
      message = fb.stretch.good.message;
      cue = fb.stretch.good.cue;
      tone = fb.stretch.good.tone;
    } else if (score >= 74) {
      message = fb.shared.good.message;
      cue = fb.shared.good.cue;
      tone = fb.shared.good.tone;
    } else if (score >= 58) {
      message = fb.shared.warn.message;
      cue = fb.shared.warn.cue;
      tone = fb.shared.warn.tone;
    } else {
      message = fb.shared.poor.message;
      cue = fb.shared.poor.cue;
      tone = fb.shared.poor.tone;
    }

    return { action: '跟练评分', score, message, cue, tone };
  }
};
