import {
  angleBetween,
  compareToStandardPose,
  isVisible,
  pointByName
} from '../../pose-utils.js';
import { applyStandardPoseIdentityGate, runGuardChecks } from '../base-evaluator.js';
import fb from '../feedback/zh-CN.js';

export default {
  id: 'kick',
  focusKeypoints: [
    'left_hip', 'right_hip',
    'left_knee', 'right_knee',
    'left_ankle', 'right_ankle'
  ],
  scoreWeights: { pose: 0.45, motion: 0.45, visibility: 0.10 },

  evaluate(context) {
    const guardResult = runGuardChecks(context);
    if (guardResult) return guardResult;

    const { pose, standardPose, motion } = context;

    const lHip = pointByName(pose, 'left_hip');
    const lKnee = pointByName(pose, 'left_knee');
    const lAnkle = pointByName(pose, 'left_ankle');
    const rHip = pointByName(pose, 'right_hip');
    const rKnee = pointByName(pose, 'right_knee');
    const rAnkle = pointByName(pose, 'right_ankle');

    // Check knee extension during kick: angle at knee (hip-knee-ankle) should be high
    const leftKneeAngle = angleBetween(lHip, lKnee, lAnkle);
    const rightKneeAngle = angleBetween(rHip, rKnee, rAnkle);
    const maxKneeAngle = Math.max(leftKneeAngle ?? 0, rightKneeAngle ?? 0);

    const matchResult = compareToStandardPose(pose, standardPose, this.focusKeypoints);
    const userActive = motion.user > 0.05;

    let score = matchResult
      ? Math.round(matchResult.score * this.scoreWeights.pose
        + Math.min(100, motion.user * 400) * this.scoreWeights.motion
        + Math.min(100, maxKneeAngle / 160 * 80 + 20) * this.scoreWeights.visibility)
      : Math.round(Math.min(100, motion.user * 280));

    score = Math.max(30, Math.min(98, Math.round(score)));

    let message = fb.shared.great.message;
    let cue = fb.shared.great.cue;
    let tone = fb.shared.great.tone;

    if (!userActive) {
      score = Math.min(score, 50);
      message = fb.shared.notMoving.message;
      cue = fb.shared.notMoving.cue;
      tone = fb.shared.notMoving.tone;
    } else if (maxKneeAngle < 130) {
      score = Math.min(score, 68);
      message = fb.kick.legStraight.message;
      cue = fb.kick.legStraight.cue;
      tone = fb.kick.legStraight.tone;
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
