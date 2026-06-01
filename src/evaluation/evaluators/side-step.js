import {
  compareToStandardPose,
  isVisible,
  pointByName
} from '../../pose-utils.js';
import { runGuardChecks } from '../base-evaluator.js';
import fb from '../feedback/zh-CN.js';

export default {
  id: 'side-step',
  focusKeypoints: [
    'left_hip', 'right_hip',
    'left_knee', 'right_knee',
    'left_ankle', 'right_ankle'
  ],
  scoreWeights: { pose: 0.40, motion: 0.50, visibility: 0.10 },

  evaluate(context) {
    const guardResult = runGuardChecks(context);
    if (guardResult) return guardResult;

    const { pose, standardPose, motion } = context;

    const lAnkle = pointByName(pose, 'left_ankle');
    const rAnkle = pointByName(pose, 'right_ankle');
    const ankleSpread = isVisible(lAnkle) && isVisible(rAnkle)
      ? Math.abs(lAnkle.x - rAnkle.x) : 0;

    const matchResult = compareToStandardPose(pose, standardPose, this.focusKeypoints);
    const userActive = motion.user > 0.04;

    let score = matchResult
      ? Math.round(matchResult.score * this.scoreWeights.pose
        + Math.min(100, motion.user * 400) * this.scoreWeights.motion
        + Math.min(100, ankleSpread / 50 * 60 + 40) * this.scoreWeights.visibility)
      : Math.round(Math.min(100, motion.user * 250));

    score = Math.max(30, Math.min(98, Math.round(score)));

    let message = fb.shared.great.message;
    let cue = fb.shared.great.cue;
    let tone = fb.shared.great.tone;

    if (!userActive) {
      score = Math.min(score, 50);
      message = fb['side-step'].bounceEngage.message;
      cue = fb['side-step'].bounceEngage.cue;
      tone = fb['side-step'].bounceEngage.tone;
    } else if (ankleSpread < 30) {
      score = Math.min(score, 70);
      message = fb['side-step'].lateralMove.message;
      cue = fb['side-step'].lateralMove.cue;
      tone = fb['side-step'].lateralMove.tone;
    } else if (score >= 88) {
      tone = 'great';
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
