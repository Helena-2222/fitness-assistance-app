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
  id: 'squat',
  focusKeypoints: [
    'left_shoulder', 'right_shoulder',
    'left_hip', 'right_hip',
    'left_knee', 'right_knee',
    'left_ankle', 'right_ankle'
  ],
  scoreWeights: { pose: 0.72, motion: 0.18, visibility: 0.10 },

  evaluate(context) {
    const guardResult = runGuardChecks(context);
    if (guardResult) return guardResult;

    const { pose, standardPose } = context;

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
    const averageKneeAngle = kneeAngles.length
      ? kneeAngles.reduce((sum, v) => sum + v, 0) / kneeAngles.length
      : 145;

    const shoulderCenter = centerOf(leftShoulder, rightShoulder);
    const hipCenter = centerOf(leftHip, rightHip);
    const torsoLean = shoulderCenter && hipCenter
      ? Math.abs(shoulderCenter.x - hipCenter.x) / Math.max(1, Math.abs(shoulderCenter.y - hipCenter.y))
      : 0;

    const ankleWidth = isVisible(leftAnkle) && isVisible(rightAnkle)
      ? Math.abs(leftAnkle.x - rightAnkle.x)
      : 0;
    const kneeWidth = isVisible(leftKnee) && isVisible(rightKnee)
      ? Math.abs(leftKnee.x - rightKnee.x)
      : ankleWidth;

    const matchResult = compareToStandardPose(pose, standardPose, this.focusKeypoints);
    let score = matchResult ? Math.round(matchResult.score * 0.72 + 24) : 91;
    let message = fb.squat.good.message;
    let cue = fb.squat.good.cue;
    let tone = fb.squat.good.tone;

    if (matchResult) {
      if (matchResult.score >= 86) {
        message = fb.squat.good.message;
        cue = fb.squat.good.cue;
        tone = fb.squat.good.tone;
      } else if (matchResult.score >= 70) {
        message = fb.squat.ok.message;
        cue = fb.squat.ok.cue;
        tone = fb.squat.ok.tone;
      } else {
        message = fb.squat.off.message;
        cue = fb.squat.off.cue;
        tone = fb.squat.off.tone;
      }
    }

    if (averageKneeAngle > 158) {
      score -= 5;
      if (!matchResult || matchResult.score >= 70) {
        message = fb.squat.notDeepEnough.message;
        cue = fb.squat.notDeepEnough.cue;
        tone = fb.squat.notDeepEnough.tone;
      }
    }

    if (averageKneeAngle < 72) {
      score -= 14;
      message = fb.squat.tooDeep.message;
      cue = fb.squat.tooDeep.cue;
      tone = fb.squat.tooDeep.tone;
    }

    if (torsoLean > 0.46) {
      score -= 13;
      message = fb.squat.chestUp.message;
      cue = fb.squat.chestUp.cue;
      tone = fb.squat.chestUp.tone;
    }

    if (ankleWidth > 0 && kneeWidth < ankleWidth * 0.72) {
      score -= 12;
      message = fb.squat.kneesInward.message;
      cue = fb.squat.kneesInward.cue;
      tone = fb.squat.kneesInward.tone;
    }

    const result = {
      action: '跟练评分',
      score: Math.max(45, Math.min(98, Math.round(score))),
      message,
      cue,
      tone
    };

    return applyStandardPoseIdentityGate(result, matchResult, standardPose);
  }
};
