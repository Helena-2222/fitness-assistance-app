import {
  angleBetween,
  centerOf,
  compareToStandardPose,
  isVisible,
  pointByName,
} from '../../pose-utils.js';
import { applyStandardPoseIdentityGate, runGuardChecks } from '../base-evaluator.js';
import fb from '../feedback/zh-CN.js';

export default {
  id: 'plank',
  focusKeypoints: [
    'left_shoulder', 'right_shoulder',
    'left_elbow', 'right_elbow',
    'left_hip', 'right_hip',
    'left_knee', 'right_knee',
  ],
  scoreWeights: { pose: 0.60, motion: 0.20, visibility: 0.20 },

  evaluate(context) {
    const guardResult = runGuardChecks(context);
    if (guardResult) return guardResult;

    const { pose, standardPose } = context;
    const lShoulder = pointByName(pose, 'left_shoulder');
    const rShoulder = pointByName(pose, 'right_shoulder');
    const lHip = pointByName(pose, 'left_hip');
    const rHip = pointByName(pose, 'right_hip');
    const lKnee = pointByName(pose, 'left_knee');
    const rKnee = pointByName(pose, 'right_knee');

    const shoulderCenter = centerOf(lShoulder, rShoulder);
    const hipCenter = centerOf(lHip, rHip);
    const kneeCenter = centerOf(lKnee, rKnee);

    // Body alignment: shoulder-hip-knee should form a straight line
    const hipSag = shoulderCenter && hipCenter
      ? Math.abs(hipCenter.y - shoulderCenter.y)
      : 0;

    // Knee angle (should be straight, not bent)
    const leftKneeAngle = angleBetween(lHip, lKnee, pointByName(pose, 'left_ankle'));
    const rightKneeAngle = angleBetween(rHip, rKnee, pointByName(pose, 'right_ankle'));
    const kneeStraight = [leftKneeAngle, rightKneeAngle].filter(Boolean);
    const avgKneeAngle = kneeStraight.length
      ? kneeStraight.reduce((s, v) => s + v, 0) / kneeStraight.length
      : 170;

    const matchResult = compareToStandardPose(pose, standardPose, this.focusKeypoints);

    let score = matchResult
      ? Math.round(matchResult.score * this.scoreWeights.pose
        + (hipSag < 30 ? 90 : hipSag < 60 ? 70 : 40) * this.scoreWeights.motion
        + (avgKneeAngle > 160 ? 90 : 60) * this.scoreWeights.visibility)
      : 60;

    score = Math.max(30, Math.min(98, Math.round(score)));

    let message = fb.shared.great.message;
    let cue = fb.shared.great.cue;
    let tone = fb.shared.great.tone;

    if (hipSag > 80) {
      score = Math.min(score, 55);
      message = fb.plank.hipsHigh.message;
      cue = fb.plank.hipsHigh.cue;
      tone = fb.plank.hipsHigh.tone;
    } else if (hipSag < 10 && avgKneeAngle > 165 && score >= 88) {
      message = fb.plank.good.message;
      cue = fb.plank.good.cue;
      tone = fb.plank.good.tone;
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
