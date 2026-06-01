import {
  angleBetween,
  centerOf,
  compareToStandardPose,
  isVisible,
  pointByName
} from '../../pose-utils.js';
import { applyStandardPoseIdentityGate, runGuardChecks } from '../base-evaluator.js';
import fb from '../feedback/zh-CN.js';

export default {
  id: 'squat-jump',
  focusKeypoints: [
    'left_shoulder', 'right_shoulder',
    'left_hip', 'right_hip',
    'left_knee', 'right_knee',
    'left_ankle', 'right_ankle'
  ],
  scoreWeights: { pose: 0.50, motion: 0.40, visibility: 0.10 },

  evaluate(context) {
    const guardResult = runGuardChecks(context);
    if (guardResult) return guardResult;

    const { pose, standardPose, motion } = context;

    const leftHip = pointByName(pose, 'left_hip');
    const rightHip = pointByName(pose, 'right_hip');
    const leftKnee = pointByName(pose, 'left_knee');
    const rightKnee = pointByName(pose, 'right_knee');
    const leftAnkle = pointByName(pose, 'left_ankle');
    const rightAnkle = pointByName(pose, 'right_ankle');
    const leftShoulder = pointByName(pose, 'left_shoulder');
    const rightShoulder = pointByName(pose, 'right_shoulder');

    const kneeAngles = [
      angleBetween(leftHip, leftKnee, leftAnkle),
      angleBetween(rightHip, rightKnee, rightAnkle)
    ].filter(Boolean);
    const avgKneeAngle = kneeAngles.length
      ? kneeAngles.reduce((sum, v) => sum + v, 0) / kneeAngles.length
      : 145;

    const shoulderCenter = centerOf(leftShoulder, rightShoulder);
    const hipCenter = centerOf(leftHip, rightHip);
    const torsoLean = shoulderCenter && hipCenter
      ? Math.abs(shoulderCenter.x - hipCenter.x) / Math.max(1, Math.abs(shoulderCenter.y - hipCenter.y))
      : 0;

    const ankleWidth = isVisible(leftAnkle) && isVisible(rightAnkle)
      ? Math.abs(leftAnkle.x - rightAnkle.x) : 0;
    const kneeWidth = isVisible(leftKnee) && isVisible(rightKnee)
      ? Math.abs(leftKnee.x - rightKnee.x) : ankleWidth;

    const matchResult = compareToStandardPose(pose, standardPose, this.focusKeypoints);
    const isExplosive = motion.user > 0.08;

    let score = matchResult
      ? Math.round(matchResult.score * this.scoreWeights.pose
        + Math.min(100, motion.user * 400) * this.scoreWeights.motion
        + 80 * this.scoreWeights.visibility)
      : Math.round(Math.min(100, motion.user * 250));

    score = Math.max(30, Math.min(98, Math.round(score)));

    let message = fb.shared.great.message;
    let cue = fb.shared.great.cue;
    let tone = fb.shared.great.tone;

    if (!isExplosive) {
      score = Math.min(score, 50);
      message = fb['squat-jump'].explosiveUp.message;
      cue = fb['squat-jump'].explosiveUp.cue;
      tone = fb['squat-jump'].explosiveUp.tone;
    } else if (avgKneeAngle > 150) {
      score = Math.min(score, 68);
      message = fb['squat-jump'].tooShallow.message;
      cue = fb['squat-jump'].tooShallow.cue;
      tone = fb['squat-jump'].tooShallow.tone;
    } else if (torsoLean > 0.4) {
      score = Math.min(score, 70);
      message = fb['squat-jump'].posture.message;
      cue = fb['squat-jump'].posture.cue;
      tone = fb['squat-jump'].posture.tone;
    } else if (ankleWidth > 0 && kneeWidth < ankleWidth * 0.72) {
      score = Math.min(score, 72);
      message = fb['squat-jump'].landing.message;
      cue = fb['squat-jump'].landing.cue;
      tone = fb['squat-jump'].landing.tone;
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

    const result = { action: '跟练评分', score, message, cue, tone };
    return applyStandardPoseIdentityGate(result, matchResult, standardPose);
  }
};
