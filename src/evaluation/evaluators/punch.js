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
  id: 'punch',
  focusKeypoints: [
    'left_shoulder', 'right_shoulder',
    'left_elbow', 'right_elbow',
    'left_wrist', 'right_wrist',
    'left_hip', 'right_hip'
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
    const lHip = pointByName(pose, 'left_hip');
    const rHip = pointByName(pose, 'right_hip');

    // Elbow extension: angle at elbow should be high when punching
    const leftElbowAngle = angleBetween(lShoulder, lElbow, pointByName(pose, 'left_wrist'));
    const rightElbowAngle = angleBetween(rShoulder, rElbow, pointByName(pose, 'right_wrist'));
    const maxElbowExtend = Math.max(leftElbowAngle ?? 0, rightElbowAngle ?? 0);

    // Shoulder rotation: angle between shoulder line and hip line
    const shoulderCenter = centerOf(lShoulder, rShoulder);
    const hipCenter = centerOf(lHip, rHip);
    const shoulderHipTwist = shoulderCenter && hipCenter
      ? Math.abs(shoulderCenter.x - hipCenter.x) / Math.max(1, Math.abs(shoulderCenter.y - hipCenter.y))
      : 0;

    const matchResult = compareToStandardPose(pose, standardPose, this.focusKeypoints);
    const userActive = motion.user > 0.04;

    let score = matchResult
      ? Math.round(matchResult.score * this.scoreWeights.pose
        + Math.min(100, motion.user * 450) * this.scoreWeights.motion
        + Math.min(100, maxElbowExtend / 150 * 70 + 30) * this.scoreWeights.visibility)
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
    } else if (maxElbowExtend < 120) {
      score = Math.min(score, 68);
      message = fb.punch.armExtend.message;
      cue = fb.punch.armExtend.cue;
      tone = fb.punch.armExtend.tone;
    } else if (shoulderHipTwist < 0.15) {
      score = Math.min(score, 70);
      message = fb.punch.shoulderRotate.message;
      cue = fb.punch.shoulderRotate.cue;
      tone = fb.punch.shoulderRotate.tone;
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
