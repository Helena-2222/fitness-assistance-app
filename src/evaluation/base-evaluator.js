import {
  DEFAULT_MATCH_KEYPOINTS,
  compareToStandardPose,
  hasEnoughKeypointsForStandard,
  isVisible
} from '../pose-utils';
import fb from './feedback/zh-CN.js';

function fallbackFeedback(seconds) {
  const cycle = seconds % 12;
  if (cycle < 4) {
    return { ...fb.shared.fallback1, score: 92 };
  }
  if (cycle < 8) {
    return { ...fb.shared.fallback2, score: 78 };
  }
  return { ...fb.shared.fallback3, score: 96 };
}

function stableTrainingFeedback(trainingStatus) {
  if (trainingStatus === 'paused') {
    return { ...fb.shared.paused, score: 0, locked: true };
  }
  return { ...fb.shared.notStarted, score: 0, locked: true };
}

export function runGuardChecks(context) {
  const { trainingStatus, cameraState, detectorState, pose, standardPose, seconds, matchKeypoints } = context;

  if (trainingStatus !== 'active') return stableTrainingFeedback(trainingStatus);
  if (cameraState !== 'ready') return fallbackFeedback(seconds);

  if (detectorState === 'loading') {
    return { ...fb.shared.modelLoading, score: 68 };
  }
  if (detectorState === 'error') {
    return { ...fb.shared.modelError, score: 70 };
  }

  const visiblePoints = pose?.keypoints?.filter((point) => isVisible(point)) ?? [];
  const kp = matchKeypoints || DEFAULT_MATCH_KEYPOINTS;
  if (visiblePoints.length < 7) {
    return { ...fb.shared.notInFrame, score: 0, locked: true };
  }
  if (!hasEnoughKeypointsForStandard(pose, standardPose, kp)) {
    return { ...fb.shared.notInFrame, score: 0, locked: true };
  }

  return null;
}

function scoreBand(score, standardIsMoving, userMotion, motionRatio, seconds, matchResult) {
  if (!matchResult) {
    return { score: Math.min(score, 68), ...fb.shared.matching };
  }
  if (seconds < 4) {
    return { score: Math.min(score, 58), ...fb.shared.warmingUp };
  }
  if (standardIsMoving && userMotion < 0.035 && motionRatio < 0.22) {
    return { score: Math.min(score, 45), ...fb.shared.notMoving };
  }
  if (standardIsMoving && motionRatio < 0.45) {
    return { score: Math.min(score, 70), ...fb.shared.smallAmplitude };
  }
  if (score >= 88) {
    return { score, ...fb.shared.great };
  }
  if (score >= 74) {
    return { score, ...fb.shared.good };
  }
  if (score >= 58) {
    return { score, ...fb.shared.warn };
  }
  return { score, ...fb.shared.poor };
}

function correctionForWorstGroup(worstGroup) {
  const corrections = {
    arms: {
      message: '手臂位置偏差较大',
      cue: '先对齐肩膀、手肘和手腕的位置，再跟着标准动作同方向打开或收回手臂'
    },
    legs: {
      message: '腿部位置偏差较大',
      cue: '先对齐膝盖和脚踝位置，注意脚步打开、抬腿或支撑方向是否和标准动作一致'
    },
    torso: {
      message: '身体朝向偏差较大',
      cue: '先调整肩膀、髋部和躯干角度，让身体中线接近标准动作'
    },
    whole: {
      message: '动作整体和标准差异较大',
      cue: '先暂停看清当前动作，再从标准动作的起始姿态重新跟练'
    }
  };

  return corrections[worstGroup] ?? corrections.whole;
}

export function applyStandardPoseIdentityGate(result, matchResult, standardPose) {
  if (!standardPose || !matchResult) return result;

  const correction = correctionForWorstGroup(matchResult.worstGroup);

  if (matchResult.score < 55) {
    return {
      ...result,
      score: Math.min(result.score, 45),
      message: correction.message,
      cue: correction.cue,
      tone: 'warn'
    };
  }

  if (matchResult.score < 68) {
    return {
      ...result,
      score: Math.min(result.score, 62),
      message: correction.message,
      cue: `接近标准了，${correction.cue}`,
      tone: 'warn'
    };
  }

  return result;
}

export default {
  id: 'base',
  focusKeypoints: DEFAULT_MATCH_KEYPOINTS,
  scoreWeights: { pose: 0.55, motion: 0.35, visibility: 0.10 },

  evaluate(context) {
    const guardResult = runGuardChecks(context);
    if (guardResult) return guardResult;

    const { pose, standardPose, motion } = context;
    const weights = context.weights || this.scoreWeights;
    const matchResult = compareToStandardPose(pose, standardPose, this.focusKeypoints);

    const visiblePoints = pose?.keypoints?.filter((point) => isVisible(point)) ?? [];
    const visibilityScore = Math.min(100, Math.round((visiblePoints.length / this.focusKeypoints.length) * 100));

    const standardMotion = Math.max(0.04, motion.standardAverage || motion.standard);
    const userMotion = Math.max(motion.user, motion.userAverage);
    const standardIsMoving = standardMotion > 0.1;
    const motionRatio = standardIsMoving ? userMotion / Math.max(0.08, standardMotion) : 1;
    const motionScore = standardIsMoving
      ? Math.max(0, Math.min(100, Math.round(motionRatio * 135)))
      : Math.max(62, Math.min(100, Math.round(100 - Math.abs(userMotion - standardMotion) * 160)));

    let score = matchResult
      ? Math.round(matchResult.score * weights.pose + motionScore * weights.motion + visibilityScore * weights.visibility)
      : Math.round(motionScore * 0.55 + visibilityScore * 0.25);

    const band = scoreBand(score, standardIsMoving, userMotion, motionRatio, context.seconds, matchResult);
    score = band.score ?? score;

    const result = {
      action: '跟练评分',
      score: Math.max(30, Math.min(98, Math.round(score))),
      message: band.message,
      cue: band.cue,
      tone: band.tone
    };

    return applyStandardPoseIdentityGate(result, matchResult, standardPose);
  }
};
