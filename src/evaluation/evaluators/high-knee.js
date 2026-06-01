import {
  angleBetween,
  compareToStandardPose,
  isVisible,
  pointByName,
  centerOf
} from '../../pose-utils.js';
import { runGuardChecks } from '../base-evaluator.js';
import fb from '../feedback/zh-CN.js';

export default {
  id: 'high-knee',
  focusKeypoints: [
    'left_shoulder', 'right_shoulder',
    'left_hip', 'right_hip',
    'left_knee', 'right_knee',
    'left_ankle', 'right_ankle'
  ],
  scoreWeights: { pose: 0.45, motion: 0.45, visibility: 0.10 },

  evaluate(context) {
    const guardResult = runGuardChecks(context);
    if (guardResult) return guardResult;

    const { pose, standardPose, motion } = context;

    const lShoulder = pointByName(pose, 'left_shoulder');
    const rShoulder = pointByName(pose, 'right_shoulder');
    const lHip = pointByName(pose, 'left_hip');
    const rHip = pointByName(pose, 'right_hip');
    const lKnee = pointByName(pose, 'left_knee');
    const rKnee = pointByName(pose, 'right_knee');

    // Hip angle: smaller = knee lifted higher
    const leftHipAngle = angleBetween(lShoulder, lHip, lKnee);
    const rightHipAngle = angleBetween(rShoulder, rHip, rKnee);
    const hipAngles = [leftHipAngle, rightHipAngle].filter(Boolean);
    const avgHipAngle = hipAngles.length
      ? hipAngles.reduce((sum, v) => sum + v, 0) / hipAngles.length
      : 120;

    // Torso lean (should be upright for high knees)
    const shoulderCenter = centerOf(lShoulder, rShoulder);
    const hipCenter = centerOf(lHip, rHip);
    const torsoLean = shoulderCenter && hipCenter
      ? Math.abs(shoulderCenter.x - hipCenter.x) / Math.max(1, Math.abs(shoulderCenter.y - hipCenter.y))
      : 0;

    const matchResult = compareToStandardPose(pose, standardPose, this.focusKeypoints);
    const userActive = motion.user > 0.05;

    let score = matchResult
      ? Math.round(matchResult.score * this.scoreWeights.pose
        + Math.min(100, motion.user * 450) * this.scoreWeights.motion
        + (avgHipAngle < 110 ? 90 : avgHipAngle < 130 ? 75 : 50) * this.scoreWeights.visibility)
      : Math.round(Math.min(100, motion.user * 280));

    score = Math.max(30, Math.min(98, Math.round(score)));

    let message = fb.shared.great.message;
    let cue = fb.shared.great.cue;
    let tone = fb.shared.great.tone;

    if (!userActive) {
      score = Math.min(score, 45);
      message = fb['high-knee'].rhythm.message;
      cue = fb['high-knee'].rhythm.cue;
      tone = fb['high-knee'].rhythm.tone;
    } else if (avgHipAngle > 130) {
      score = Math.min(score, 70);
      message = fb['high-knee'].kneesLow.message;
      cue = fb['high-knee'].kneesLow.cue;
      tone = fb['high-knee'].kneesLow.tone;
    } else if (torsoLean > 0.4) {
      score = Math.min(score, 72);
      message = fb['high-knee'].postureLean.message;
      cue = fb['high-knee'].postureLean.cue;
      tone = fb['high-knee'].postureLean.tone;
    } else if (score >= 88) {
      message = fb['high-knee'].good.message;
      cue = fb['high-knee'].good.cue;
      tone = fb['high-knee'].good.tone;
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
