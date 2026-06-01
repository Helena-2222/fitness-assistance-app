import {
  angleBetween,
  compareToStandardPose,
  pointByName,
} from '../../pose-utils.js';
import { runGuardChecks } from '../base-evaluator.js';
import fb from '../feedback/zh-CN.js';

export default {
  id: 'core',
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

    // Torso curl: angle between shoulder-hip-vertical
    // For sit-ups/crunches, shoulders should move toward hips
    const shoulderY = lShoulder && rShoulder ? (lShoulder.y + rShoulder.y) / 2 : 0;
    const hipY = lHip && rHip ? (lHip.y + rHip.y) / 2 : 0;
    const torsoCurl = shoulderY - hipY; // positive = shoulders above hips

    const matchResult = compareToStandardPose(pose, standardPose, this.focusKeypoints);
    const userActive = motion.user > 0.03;

    let score = matchResult
      ? Math.round(matchResult.score * this.scoreWeights.pose
        + Math.min(100, motion.user * 350) * this.scoreWeights.motion
        + (Math.abs(torsoCurl) > 15 ? 85 : 55) * this.scoreWeights.visibility)
      : Math.round(Math.min(100, motion.user * 250));

    score = Math.max(30, Math.min(98, Math.round(score)));

    let message = fb.shared.great.message;
    let cue = fb.shared.great.cue;
    let tone = fb.shared.great.tone;

    if (!userActive) {
      score = Math.min(score, 45);
      message = fb.core.notMoving.message;
      cue = fb.core.notMoving.cue;
      tone = fb.core.notMoving.tone;
    } else if (Math.abs(torsoCurl) < 10) {
      score = Math.min(score, 68);
      message = fb.core.curlMore.message;
      cue = fb.core.curlMore.cue;
      tone = fb.core.curlMore.tone;
    } else if (score >= 88) {
      message = fb.core.good.message;
      cue = fb.core.good.cue;
      tone = fb.core.good.tone;
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
