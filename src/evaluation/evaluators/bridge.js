import {
  centerOf,
  compareToStandardPose,
  isVisible,
  pointByName,
} from '../../pose-utils.js';
import { applyStandardPoseIdentityGate, runGuardChecks } from '../base-evaluator.js';
import fb from '../feedback/zh-CN.js';

export default {
  id: 'bridge',
  focusKeypoints: [
    'left_shoulder', 'right_shoulder',
    'left_hip', 'right_hip',
    'left_knee', 'right_knee',
  ],
  scoreWeights: { pose: 0.55, motion: 0.35, visibility: 0.10 },

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

    const shoulderCenter = centerOf(lShoulder, rShoulder);
    const hipCenter = centerOf(lHip, rHip);
    const kneeCenter = centerOf(lKnee, rKnee);

    // Hip elevation: hips should be lifted to form a straight line shoulder-hip-knee
    const hipLift = hipCenter && shoulderCenter
      ? shoulderCenter.y - hipCenter.y
      : 0; // positive = hips above shoulders (bridged up)

    const matchResult = compareToStandardPose(pose, standardPose, this.focusKeypoints);
    const userActive = motion.user > 0.02;

    let score = matchResult
      ? Math.round(matchResult.score * this.scoreWeights.pose
        + Math.min(100, motion.user * 300) * this.scoreWeights.motion
        + (hipLift > 20 ? 90 : hipLift > 5 ? 65 : 30) * this.scoreWeights.visibility)
      : Math.round(Math.min(100, motion.user * 200));

    score = Math.max(30, Math.min(98, Math.round(score)));

    let message = fb.shared.great.message;
    let cue = fb.shared.great.cue;
    let tone = fb.shared.great.tone;

    if (!userActive) {
      score = Math.min(score, 50);
      message = fb.bridge.notMoving.message;
      cue = fb.bridge.notMoving.cue;
      tone = fb.bridge.notMoving.tone;
    } else if (hipLift < 5) {
      score = Math.min(score, 65);
      message = fb.bridge.liftHigher.message;
      cue = fb.bridge.liftHigher.cue;
      tone = fb.bridge.liftHigher.tone;
    } else if (score >= 88) {
      message = fb.bridge.good.message;
      cue = fb.bridge.good.cue;
      tone = fb.bridge.good.tone;
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
