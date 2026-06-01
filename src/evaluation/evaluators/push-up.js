import {
  angleBetween,
  pointByName,
  compareToStandardPose,
  isVisible,
} from '../../pose-utils.js';
import { applyStandardPoseIdentityGate, runGuardChecks } from '../base-evaluator.js';
import fb from '../feedback/zh-CN.js';

export default {
  id: 'push-up',
  focusKeypoints: [
    'left_shoulder', 'right_shoulder',
    'left_elbow', 'right_elbow',
    'left_wrist', 'right_wrist',
    'left_hip', 'right_hip',
  ],
  scoreWeights: { pose: 0.60, motion: 0.30, visibility: 0.10 },

  evaluate(context) {
    const guardResult = runGuardChecks(context);
    if (guardResult) return guardResult;

    const { pose, standardPose, motion } = context;
    const lShoulder = pointByName(pose, 'left_shoulder');
    const lElbow = pointByName(pose, 'left_elbow');
    const lWrist = pointByName(pose, 'left_wrist');
    const rShoulder = pointByName(pose, 'right_shoulder');
    const rElbow = pointByName(pose, 'right_elbow');
    const rWrist = pointByName(pose, 'right_wrist');
    const lHip = pointByName(pose, 'left_hip');
    const rHip = pointByName(pose, 'right_hip');

    const leftElbowAngle = angleBetween(lShoulder, lElbow, lWrist);
    const rightElbowAngle = angleBetween(rShoulder, rElbow, rWrist);
    const avgElbowAngle = (leftElbowAngle ?? 180 + rightElbowAngle ?? 180) / 2;

    // Check body alignment - hips should stay inline with shoulders
    const hipY = lHip && rHip ? (lHip.y + rHip.y) / 2 : 0;
    const shoulderY = lShoulder && rShoulder ? (lShoulder.y + rShoulder.y) / 2 : 0;
    const bodyDip = Math.abs(hipY - shoulderY);

    const matchResult = compareToStandardPose(pose, standardPose, this.focusKeypoints);
    const userActive = motion.user > 0.03;

    let score = matchResult
      ? Math.round(matchResult.score * this.scoreWeights.pose
        + Math.min(100, motion.user * 300) * this.scoreWeights.motion
        + (avgElbowAngle < 140 ? 80 : avgElbowAngle < 160 ? 60 : 40) * this.scoreWeights.visibility)
      : Math.round(Math.min(100, motion.user * 200));

    score = Math.max(30, Math.min(98, Math.round(score)));

    let message = fb.shared.great.message;
    let cue = fb.shared.great.cue;
    let tone = fb.shared.great.tone;

    if (!userActive) {
      score = Math.min(score, 45);
      message = fb['push-up'].notMoving.message;
      cue = fb['push-up'].notMoving.cue;
      tone = fb['push-up'].notMoving.tone;
    } else if (avgElbowAngle > 150) {
      score = Math.min(score, 68);
      message = fb['push-up'].deeper.message;
      cue = fb['push-up'].deeper.cue;
      tone = fb['push-up'].deeper.tone;
    } else if (bodyDip > 50) {
      score = Math.min(score, 70);
      message = fb['push-up'].hipsDown.message;
      cue = fb['push-up'].hipsDown.cue;
      tone = fb['push-up'].hipsDown.tone;
    } else if (score >= 88) {
      message = fb['push-up'].good.message;
      cue = fb['push-up'].good.cue;
      tone = fb['push-up'].good.tone;
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
