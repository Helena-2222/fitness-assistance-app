export const poseLinks = [
  ['left_ear', 'left_eye'],
  ['left_eye', 'nose'],
  ['nose', 'right_eye'],
  ['right_eye', 'right_ear'],
  ['left_shoulder', 'right_shoulder'],
  ['left_shoulder', 'left_elbow'],
  ['left_elbow', 'left_wrist'],
  ['right_shoulder', 'right_elbow'],
  ['right_elbow', 'right_wrist'],
  ['left_shoulder', 'left_hip'],
  ['right_shoulder', 'right_hip'],
  ['left_hip', 'right_hip'],
  ['left_hip', 'left_knee'],
  ['left_knee', 'left_ankle'],
  ['right_hip', 'right_knee'],
  ['right_knee', 'right_ankle']
];

export const DEFAULT_MATCH_KEYPOINTS = [
  'left_shoulder',
  'right_shoulder',
  'left_elbow',
  'right_elbow',
  'left_wrist',
  'right_wrist',
  'left_hip',
  'right_hip',
  'left_knee',
  'right_knee',
  'left_ankle',
  'right_ankle'
];

export function pointByName(pose, name) {
  return pose?.keypoints?.find((point) => point.name === name || point.part === name);
}

export function isVisible(point, minScore = 0.32) {
  return point && (point.score ?? 0) >= minScore;
}

export function angleBetween(a, b, c) {
  if (!isVisible(a) || !isVisible(b) || !isVisible(c)) return null;
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const abLength = Math.hypot(ab.x, ab.y);
  const cbLength = Math.hypot(cb.x, cb.y);
  if (!abLength || !cbLength) return null;
  const cosine = Math.min(1, Math.max(-1, dot / (abLength * cbLength)));
  return Math.round((Math.acos(cosine) * 180) / Math.PI);
}

export function centerOf(a, b) {
  if (!isVisible(a) || !isVisible(b)) return null;
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function getPoseAnchor(pose) {
  const leftHip = pointByName(pose, 'left_hip');
  const rightHip = pointByName(pose, 'right_hip');
  const leftShoulder = pointByName(pose, 'left_shoulder');
  const rightShoulder = pointByName(pose, 'right_shoulder');
  const hipCenter = centerOf(leftHip, rightHip);
  const shoulderCenter = centerOf(leftShoulder, rightShoulder);
  if (hipCenter && shoulderCenter) {
    const torsoLength = Math.hypot(shoulderCenter.x - hipCenter.x, shoulderCenter.y - hipCenter.y);
    return {
      center: { x: (hipCenter.x + shoulderCenter.x) / 2, y: (hipCenter.y + shoulderCenter.y) / 2 },
      scale: Math.max(40, torsoLength)
    };
  }
  if (hipCenter) return { center: hipCenter, scale: 80 };
  if (shoulderCenter) return { center: shoulderCenter, scale: 80 };
  return null;
}

export function normalizedPoint(pose, name, anchor) {
  const point = pointByName(pose, name);
  if (!isVisible(point) || !anchor) return null;
  return {
    x: (point.x - anchor.center.x) / anchor.scale,
    y: (point.y - anchor.center.y) / anchor.scale
  };
}

export function compareToStandardPose(userPose, standardPose, matchKeypoints = DEFAULT_MATCH_KEYPOINTS) {
  const userAnchor = getPoseAnchor(userPose);
  const standardAnchor = getPoseAnchor(standardPose);
  if (!userAnchor || !standardAnchor) return null;

  const distances = [];
  for (const name of matchKeypoints) {
    const userPoint = normalizedPoint(userPose, name, userAnchor);
    const standardPoint = normalizedPoint(standardPose, name, standardAnchor);
    if (!userPoint || !standardPoint) continue;
    distances.push({
      name,
      distance: Math.hypot(userPoint.x - standardPoint.x, userPoint.y - standardPoint.y)
    });
  }

  if (distances.length < 6) return null;
  const averageDistance = distances.reduce((sum, value) => sum + value.distance, 0) / distances.length;
  const score = Math.max(0, Math.min(100, Math.round(100 - averageDistance * 78)));
  const groupTotals = distances.reduce((groups, point) => {
    const group = point.name.includes('wrist') || point.name.includes('elbow') || point.name.includes('shoulder')
      ? 'arms'
      : point.name.includes('knee') || point.name.includes('ankle')
      ? 'legs'
      : 'torso';

    const current = groups[group] ?? { total: 0, count: 0 };
    groups[group] = { total: current.total + point.distance, count: current.count + 1 };
    return groups;
  }, {});
  const groupDistances = Object.fromEntries(
    Object.entries(groupTotals).map(([group, value]) => [group, value.total / value.count])
  );
  const worstGroup = Object.entries(groupDistances)
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'whole';

  return {
    score,
    matchedPoints: distances.length,
    averageDistance,
    pointDistances: distances,
    worstGroup
  };
}

export function poseDistance(poseA, poseB, matchKeypoints = DEFAULT_MATCH_KEYPOINTS) {
  const anchorA = getPoseAnchor(poseA);
  const anchorB = getPoseAnchor(poseB);
  if (!anchorA || !anchorB) return 0;

  const distances = [];
  for (const name of matchKeypoints) {
    const pointA = normalizedPoint(poseA, name, anchorA);
    const pointB = normalizedPoint(poseB, name, anchorB);
    if (!pointA || !pointB) continue;
    distances.push(Math.hypot(pointA.x - pointB.x, pointA.y - pointB.y));
  }

  if (distances.length < 5) return 0;
  return distances.reduce((sum, value) => sum + value, 0) / distances.length;
}

export function calculateRecentMotion(history) {
  if (!history || history.length < 10) return 0;
  const latest = history[history.length - 1];
  const previous = history[Math.max(0, history.length - 18)];
  return poseDistance(latest, previous);
}

export function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function hasEnoughKeypointsForStandard(pose, standardPose, matchKeypoints = DEFAULT_MATCH_KEYPOINTS) {
  if (!standardPose) return true;
  const requiredNames = matchKeypoints.filter((name) => isVisible(pointByName(standardPose, name), 0.28));
  if (requiredNames.length < 6) return true;
  const visibleRequiredCount = requiredNames.filter((name) => isVisible(pointByName(pose, name))).length;
  const minRequired = Math.max(6, Math.ceil(requiredNames.length * 0.72));
  return visibleRequiredCount >= minRequired;
}
