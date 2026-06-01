import {
  angleBetween,
  compareToStandardPose,
  isVisible,
  pointByName
} from '../../pose-utils.js';
import { applyStandardPoseIdentityGate, runGuardChecks } from '../base-evaluator.js';
import fb from '../feedback/zh-CN.js';

export default {
  id: 'jumping-jack',
  focusKeypoints: [
    'left_shoulder', 'right_shoulder',
    'left_elbow', 'right_elbow',
    'left_wrist', 'right_wrist',
    'left_hip', 'right_hip',
    'left_ankle', 'right_ankle'
  ],
  scoreWeights: { pose: 0.40, motion: 0.50, visibility: 0.10 },

  evaluate(context) {
    const guardResult = runGuardChecks(context);
    if (guardResult) return guardResult;

    const { pose, standardPose, motion } = context;

    const lShoulder = pointByName(pose, 'left_shoulder');
    const rShoulder = pointByName(pose, 'right_shoulder');
    const lElbow = pointByName(pose, 'left_elbow');
    const rElbow = pointByName(pose, 'right_elbow');
    const lAnkle = pointByName(pose, 'left_ankle');
    const rAnkle = pointByName(pose, 'right_ankle');

    const leftArmAngle = angleBetween(lElbow, lShoulder, rShoulder);
    const rightArmAngle = angleBetween(lShoulder, rShoulder, rElbow);
    const avgArmAngle = (leftArmAngle ?? 0 + rightArmAngle ?? 0) / 2;

    const ankleSpread = isVisible(lAnkle) && isVisible(rAnkle)
      ? Math.abs(lAnkle.x - rAnkle.x) : 0;

    const matchResult = compareToStandardPose(pose, standardPose, this.focusKeypoints);
    const userActive = motion.user > 0.06;

    let score = matchResult
      ? Math.round(matchResult.score * this.scoreWeights.pose
        + Math.min(100, motion.user * 500) * this.scoreWeights.motion
        + Math.min(100, (ankleSpread / 60) * 80 + 20) * this.scoreWeights.visibility)
      : Math.round(Math.min(100, motion.user * 300));

    score = Math.max(30, Math.min(98, Math.round(score)));

    let message = fb.shared.great.message;
    let cue = fb.shared.great.cue;
    let tone = fb.shared.great.tone;

    if (!userActive) {
      score = Math.min(score, 45);
      message = fb['jumping-jack'].rhythm.message;
      cue = fb['jumping-jack'].rhythm.cue;
      tone = fb['jumping-jack'].rhythm.tone;
    } else if (avgArmAngle && avgArmAngle < 50) {
      score = Math.min(score, 70);
      message = fb['jumping-jack'].armsWide.message;
      cue = fb['jumping-jack'].armsWide.cue;
      tone = fb['jumping-jack'].armsWide.tone;
    } else if (score >= 88) {
      message = fb['jumping-jack'].good.message;
      cue = fb['jumping-jack'].good.cue;
      tone = fb['jumping-jack'].good.tone;
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

    const result = { action: '跟练评分', score, message, cue, tone };
    return applyStandardPoseIdentityGate(result, matchResult, standardPose);
  }
};
