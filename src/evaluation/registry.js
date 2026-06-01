import baseEvaluator from './base-evaluator.js';
import squatEvaluator from './evaluators/squat.js';
import jumpingJackEvaluator from './evaluators/jumping-jack.js';
import crossJackEvaluator from './evaluators/cross-jack.js';
import highKneeEvaluator from './evaluators/high-knee.js';
import squatJumpEvaluator from './evaluators/squat-jump.js';
import kickEvaluator from './evaluators/kick.js';
import punchEvaluator from './evaluators/punch.js';
import sideStepEvaluator from './evaluators/side-step.js';
import comboEvaluator from './evaluators/combo.js';
import pushUpEvaluator from './evaluators/push-up.js';
import plankEvaluator from './evaluators/plank.js';
import coreEvaluator from './evaluators/core.js';
import bridgeEvaluator from './evaluators/bridge.js';
import stretchEvaluator from './evaluators/stretch.js';

const registry = new Map([
  ['base', baseEvaluator],
  ['squat', squatEvaluator],
  ['jumping-jack', jumpingJackEvaluator],
  ['cross-jack', crossJackEvaluator],
  ['high-knee', highKneeEvaluator],
  ['squat-jump', squatJumpEvaluator],
  ['kick', kickEvaluator],
  ['punch', punchEvaluator],
  ['side-step', sideStepEvaluator],
  ['combo', comboEvaluator],
  ['push-up', pushUpEvaluator],
  ['plank', plankEvaluator],
  ['core', coreEvaluator],
  ['bridge', bridgeEvaluator],
  ['stretch', stretchEvaluator],
]);

export function getEvaluator(exerciseType) {
  return registry.get(exerciseType) ?? baseEvaluator;
}

export function registerEvaluator(evaluator) {
  registry.set(evaluator.id, evaluator);
}

export default registry;
