export const keypointLabels = {
  nose: '鼻尖',
  left_eye: '左眼',
  right_eye: '右眼',
  left_ear: '左耳',
  right_ear: '右耳',
  left_shoulder: '左肩',
  right_shoulder: '右肩',
  left_elbow: '左肘',
  right_elbow: '右肘',
  left_wrist: '左腕',
  right_wrist: '右腕',
  left_hip: '左髋',
  right_hip: '右髋',
  left_knee: '左膝',
  right_knee: '右膝',
  left_ankle: '左踝',
  right_ankle: '右踝'
};

const keypointOrder = Object.keys(keypointLabels);

const defaultConfig = {
  windowSize: 24,
  representativeCount: 8,
  minScore: 0.28,
  currentAnchor: 0.62
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function pointName(point) {
  return point?.name || point?.part;
}

function visible(point, minScore) {
  return point && (point.score ?? 0) >= minScore && Number.isFinite(point.x) && Number.isFinite(point.y);
}

function clonePose(pose) {
  if (!pose) return null;
  return {
    ...pose,
    keypoints: (pose.keypoints ?? []).map((point) => ({ ...point }))
  };
}

function vectorizePose(pose, minScore) {
  const map = new Map((pose?.keypoints ?? []).map((point) => [pointName(point), point]));
  const visiblePoints = [];
  keypointOrder.forEach((name) => {
    const point = map.get(name);
    if (visible(point, minScore)) visiblePoints.push(point);
  });

  const xs = visiblePoints.map((point) => point.x);
  const ys = visiblePoints.map((point) => point.y);
  const minX = xs.length ? Math.min(...xs) : 0;
  const maxX = xs.length ? Math.max(...xs) : 1;
  const minY = ys.length ? Math.min(...ys) : 0;
  const maxY = ys.length ? Math.max(...ys) : 1;
  const scale = Math.max(maxX - minX, maxY - minY, 1);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  return keypointOrder.flatMap((name) => {
    const point = map.get(name);
    if (!visible(point, minScore)) return [0, 0, 0];
    return [(point.x - centerX) / scale, (point.y - centerY) / scale, point.score ?? 0];
  });
}

function vectorDistance(a, b) {
  let sum = 0;
  let count = 0;
  for (let index = 0; index < Math.min(a.length, b.length); index += 3) {
    const confidence = Math.min(a[index + 2], b[index + 2]);
    if (confidence <= 0) continue;
    const dx = a[index] - b[index];
    const dy = a[index + 1] - b[index + 1];
    sum += Math.sqrt(dx * dx + dy * dy) * confidence;
    count += confidence;
  }
  return count ? sum / count : 1;
}

function motionScores(vectors) {
  return vectors.map((vector, index) => {
    const prev = vectors[Math.max(0, index - 1)];
    const next = vectors[Math.min(vectors.length - 1, index + 1)];
    return vectorDistance(vector, prev) + vectorDistance(vector, next);
  });
}

function selectRepresentativeTokens(vectors, count) {
  if (vectors.length <= count) return vectors.map((_, index) => index);

  const motions = motionScores(vectors);
  const selected = new Set([0, vectors.length - 1, vectors.length - 2]);
  const candidates = motions
    .map((motion, index) => ({ motion, index }))
    .sort((a, b) => b.motion - a.motion);

  for (const candidate of candidates) {
    selected.add(candidate.index);
    if (selected.size >= count) break;
  }

  return Array.from(selected).sort((a, b) => a - b);
}

function recoverCurrentPose(history, representatives, minScore, currentAnchor) {
  const current = history[history.length - 1];
  const recovered = clonePose(current);
  if (!current || !recovered || representatives.length < 2) return recovered;

  const currentIndex = history.length - 1;
  const currentMap = new Map((current.keypoints ?? []).map((point) => [pointName(point), point]));

  recovered.keypoints = (recovered.keypoints ?? []).map((point) => {
    const name = pointName(point);
    let weightSum = 0;
    let x = 0;
    let y = 0;
    let score = 0;

    representatives.forEach((frameIndex) => {
      const refPoint = (history[frameIndex]?.keypoints ?? []).find((candidate) => pointName(candidate) === name);
      if (!visible(refPoint, minScore)) return;
      const temporalDistance = Math.abs(currentIndex - frameIndex);
      const weight = 1 / (1 + temporalDistance * temporalDistance);
      x += refPoint.x * weight;
      y += refPoint.y * weight;
      score += (refPoint.score ?? 0) * weight;
      weightSum += weight;
    });

    if (!weightSum) return point;
    const raw = currentMap.get(name) ?? point;
    const anchor = visible(raw, minScore) ? currentAnchor : 0;
    const recoveredPoint = {
      ...point,
      x: (raw.x ?? x / weightSum) * anchor + (x / weightSum) * (1 - anchor),
      y: (raw.y ?? y / weightSum) * anchor + (y / weightSum) * (1 - anchor),
      score: clamp(((raw.score ?? 0) * anchor) + (score / weightSum) * (1 - anchor), 0, 1)
    };
    return recoveredPoint;
  });

  return recovered;
}

export function applyHotTemporalTokenizer(history, config = {}) {
  const options = { ...defaultConfig, ...config };
  const window = history.slice(-options.windowSize).filter(Boolean);
  if (!window.length) {
    return { pose: null, representativeIndexes: [], windowSize: 0 };
  }

  const vectors = window.map((pose) => vectorizePose(pose, options.minScore));
  const representativeIndexes = selectRepresentativeTokens(
    vectors,
    Math.min(options.representativeCount, vectors.length)
  );
  const pose = recoverCurrentPose(window, representativeIndexes, options.minScore, options.currentAnchor);

  return {
    pose,
    representativeIndexes,
    windowSize: window.length
  };
}
