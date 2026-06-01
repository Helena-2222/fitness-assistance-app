import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity,
  BatteryFull,
  CalendarDays,
  Camera,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  CircleUserRound,
  Clock3,
  Dumbbell,
  Edit3,
  Flame,
  Heart,
  Info,
  Lightbulb,
  LogOut,
  Medal,
  Pause,
  Play,
  Search,
  Settings,
  Signal,
  Star,
  Tag,
  Trophy,
  UserRound,
  UsersRound,
  Wifi,
  X
} from 'lucide-react';
import { applyHotTemporalTokenizer, keypointLabels } from './hotPose';
import {
  poseLinks,
  isVisible,
  poseDistance,
  calculateRecentMotion,
  average
} from './pose-utils';
import { getEvaluator } from './evaluation/registry.js';
import './styles.css';

const asset = (name) => `/assets/${name}`;

function getCurrentSegment(course, seconds) {
  if (!course.segments?.length) return null;
  return course.segments.find(s => seconds >= s.start && seconds < s.end) ?? null;
}

function resolveEvaluator(course, seconds) {
  const segment = getCurrentSegment(course, seconds);
  if (!segment) return getEvaluator('base');
  return getEvaluator(segment.exerciseType);
}

function analyzePoseFeedback(
  pose,
  standardPose,
  seconds,
  cameraState,
  detectorState,
  course,
  trainingStatus = 'active',
  motion = { user: 0, standard: 0, userAverage: 0, standardAverage: 0 }
) {
  const evaluator = resolveEvaluator(course, seconds);
  const segment = getCurrentSegment(course, seconds);

  return evaluator.evaluate({
    pose,
    standardPose,
    seconds,
    cameraState,
    detectorState,
    trainingStatus,
    motion,
    segment,
    course,
    matchKeypoints: evaluator.focusKeypoints,
    weights: evaluator.scoreWeights,
  });
}

const CATEGORIES = [
  { key: 'all', label: '全部' },
  { key: 'cardio', label: '有氧训练' },
  { key: 'strength', label: '力量训练' },
  { key: 'hiit', label: 'HIIT' },
  { key: 'stretch', label: '放松拉伸' },
];

const courses = [
  {
    id: 'fat-burn',
    title: '全身燃脂训练',
    desc: '高效燃脂，快速提升心肺功能，适合初学者',
    duration: '15分钟',
    type: 'HIIT',
    level: '基础',
    image: asset('course-fat-burn.jpg'),
    badge: '基础',
    badgeTone: 'green',
    category: 'hiit',
    tags: ['燃脂', '全身', '入门'],
  },
  {
    id: 'pamela-hiit-10min',
    title: '帕梅拉 - 10分钟HIIT燃脂',
    desc: '高强度全身燃脂，无器械，快速暴汗高效训练',
    duration: '10分钟',
    type: 'HIIT',
    level: '进阶',
    image: asset('course-fat-burn.jpg'),
    standardVideo: '/courses/pamela-hiit-10min.mp4',
    badge: '热门',
    badgeTone: 'red',
    category: 'hiit',
    tags: ['燃脂', '全身', '高强度', '帕梅拉'],
    segments: [
      { start:   0, end:  17, exerciseType: 'base',         name: '片头' },
      { start:  17, end:  47, exerciseType: 'jumping-jack', name: '开合跳' },
      { start:  47, end:  77, exerciseType: 'high-knee',    name: '高抬腿' },
      { start:  77, end: 107, exerciseType: 'squat-jump',   name: '深蹲+侧步跳' },
      { start: 107, end: 137, exerciseType: 'high-knee',    name: '登山者' },
      { start: 137, end: 167, exerciseType: 'plank',        name: '高位平板撑' },
      { start: 167, end: 197, exerciseType: 'plank',        name: '平板支撑+开合跳' },
      { start: 197, end: 227, exerciseType: 'punch',        name: '开合出拳跳' },
      { start: 227, end: 257, exerciseType: 'high-knee',    name: '高抬腿' },
      { start: 257, end: 287, exerciseType: 'squat-jump',   name: '深蹲跳+保持' },
      { start: 287, end: 317, exerciseType: 'high-knee',    name: '对角登山跑' },
      { start: 317, end: 347, exerciseType: 'push-up',      name: '跪姿俯卧撑' },
      { start: 347, end: 377, exerciseType: 'combo',        name: '海豚式' },
      { start: 377, end: 407, exerciseType: 'combo',        name: '平板撑跳+出拳' },
      { start: 407, end: 437, exerciseType: 'high-knee',    name: '高抬腿' },
      { start: 437, end: 467, exerciseType: 'squat-jump',   name: '深蹲+侧步跳' },
      { start: 467, end: 497, exerciseType: 'jumping-jack', name: '开合跳' },
      { start: 497, end: 527, exerciseType: 'plank',        name: '平板支撑+开合跳' },
      { start: 527, end: 557, exerciseType: 'high-knee',    name: '登山者' },
      { start: 557, end: 587, exerciseType: 'plank',        name: '高位平板撑' },
      { start: 587, end: 617, exerciseType: 'plank',        name: '平板支撑' },
    ],
  },
  {
    id: 'strength',
    title: '核心力量强化',
    desc: '强化核心稳定，改善发力路径，适合进阶训练',
    duration: '22分钟',
    type: '力量',
    level: '进阶',
    image: asset('course-strength.jpg'),
    standardVideo: '/courses/strength2_30s_h264.mp4',
    standardPose: '/courses/strength2_30s_pose.json',
    evaluationType: 'follow-along',
    badge: '进阶',
    badgeTone: 'yellow',
    category: 'strength',
    tags: ['核心', '无器械', '进阶'],
  },
  {
    id: 'strength-core-5min',
    title: '5分钟入门级无氧跟练',
    desc: '抗阻力训练增强核心力量，俯卧撑+平板支撑+核心训练',
    duration: '5分钟',
    type: '力量',
    level: '入门',
    image: asset('course-strength.jpg'),
    standardVideo: '/courses/strength-5min-core.mp4',
    badge: '入门',
    badgeTone: 'green',
    category: 'strength',
    tags: ['核心', '抗阻', '无器械', '入门'],
    segments: [
      { start:   0, end:   7, exerciseType: 'base',    name: '准备' },
      { start:   7, end:  27, exerciseType: 'push-up', name: '半程俯卧撑' },
      { start:  27, end:  37, exerciseType: 'base',    name: '休息' },
      { start:  37, end:  57, exerciseType: 'plank',   name: '平板支撑' },
      { start:  57, end:  67, exerciseType: 'base',    name: '休息' },
      { start:  67, end:  87, exerciseType: 'plank',   name: '支撑平移' },
      { start:  87, end:  97, exerciseType: 'base',    name: '休息' },
      { start:  97, end: 117, exerciseType: 'core',    name: '仰卧起坐' },
      { start: 117, end: 127, exerciseType: 'base',    name: '休息' },
      { start: 127, end: 147, exerciseType: 'core',    name: '卷腹摸膝' },
      { start: 147, end: 157, exerciseType: 'base',    name: '休息' },
      { start: 157, end: 177, exerciseType: 'plank',   name: '移动平板支撑' },
      { start: 177, end: 187, exerciseType: 'base',    name: '休息' },
      { start: 187, end: 207, exerciseType: 'plank',   name: '抬腿支撑' },
      { start: 207, end: 217, exerciseType: 'base',    name: '休息' },
      { start: 217, end: 237, exerciseType: 'bridge',  name: '臀桥' },
      { start: 237, end: 247, exerciseType: 'base',    name: '休息' },
      { start: 247, end: 267, exerciseType: 'high-knee', name: '登山跑' },
      { start: 267, end: 277, exerciseType: 'base',    name: '休息' },
      { start: 277, end: 297, exerciseType: 'combo',   name: '挺身划船' },
      { start: 297, end: 307, exerciseType: 'base',    name: '休息' },
    ],
  },
  {
    id: 'pamela-cardio',
    title: '帕梅拉 - 15分钟跳跃有氧',
    desc: '中级进阶高效燃脂，全程站立无舞步，花式跳跃组合',
    duration: '15分钟',
    type: '有氧',
    level: '进阶',
    image: asset('course-fat-burn.jpg'),
    standardVideo: '/courses/pamela-cardio-15min.mp4',
    standardPose: '/courses/pamela-cardio-15min_pose.json',
    badge: '热门',
    badgeTone: 'yellow',
    category: 'cardio',
    tags: ['燃脂', '跳跃', '帕梅拉'],
    segments: [
      { start:   0, end:   6, exerciseType: 'base',         name: '片头' },
      { start:   6, end:  21, exerciseType: 'base',         name: '准备' },
      { start:  21, end:  36, exerciseType: 'jumping-jack', name: '开合跳' },
      { start:  36, end:  51, exerciseType: 'jumping-jack', name: '臂展开合跳' },
      { start:  51, end:  66, exerciseType: 'cross-jack',   name: '丝滑脚跟+交叉手臂' },
      { start:  66, end:  81, exerciseType: 'punch',        name: '丝滑脚跟+侧出拳' },
      { start:  81, end:  96, exerciseType: 'jumping-jack', name: '展臂+举臂开合跳' },
      { start:  96, end: 111, exerciseType: 'jumping-jack', name: '展臂+举臂开合跳' },
      { start: 111, end: 126, exerciseType: 'combo',        name: '丝滑脚跟+背拉' },
      { start: 126, end: 141, exerciseType: 'punch',        name: '丝滑脚跟+侧出拳' },
      { start: 141, end: 156, exerciseType: 'jumping-jack', name: '展臂+举臂开合跳' },
      { start: 156, end: 171, exerciseType: 'jumping-jack', name: '展臂+举臂开合跳' },
      { start: 171, end: 181, exerciseType: 'base',         name: '休息十秒' },
      { start: 181, end: 196, exerciseType: 'jumping-jack', name: '开合跳' },
      { start: 196, end: 211, exerciseType: 'squat',        name: '深蹲保持+1臂外踏步' },
      { start: 211, end: 226, exerciseType: 'jumping-jack', name: '1臂开合跳' },
      { start: 226, end: 241, exerciseType: 'punch',        name: '1臂+2X拳击步' },
      { start: 241, end: 256, exerciseType: 'squat',        name: '深蹲保持+1臂外踏步' },
      { start: 256, end: 271, exerciseType: 'punch',        name: '1臂+2X拳击步' },
      { start: 271, end: 286, exerciseType: 'jumping-jack', name: '1臂+举臂开合跳' },
      { start: 286, end: 301, exerciseType: 'squat',        name: '深蹲保持' },
      { start: 301, end: 316, exerciseType: 'combo',        name: '组合拳跳' },
      { start: 316, end: 331, exerciseType: 'jumping-jack', name: '1臂+举臂开合跳' },
      { start: 331, end: 346, exerciseType: 'base',         name: '休息十五秒' },
      { start: 346, end: 361, exerciseType: 'jumping-jack', name: '站立+展臂' },
      { start: 361, end: 376, exerciseType: 'side-step',    name: '0臂外踏步' },
      { start: 376, end: 391, exerciseType: 'jumping-jack', name: '0臂开合跳' },
      { start: 391, end: 406, exerciseType: 'punch',        name: '深蹲保持+出拳' },
      { start: 406, end: 421, exerciseType: 'side-step',    name: '0臂外踏步' },
      { start: 421, end: 436, exerciseType: 'jumping-jack', name: '0臂开合跳+快走开' },
      { start: 436, end: 451, exerciseType: 'jumping-jack', name: '0臂开合跳+快走开' },
      { start: 451, end: 466, exerciseType: 'punch',        name: '深蹲保持+上出拳' },
      { start: 466, end: 481, exerciseType: 'combo',        name: '泵感压胸' },
      { start: 481, end: 496, exerciseType: 'jumping-jack', name: '0臂开合跳+快走开' },
      { start: 496, end: 511, exerciseType: 'jumping-jack', name: '0臂+开合跳' },
      { start: 511, end: 517, exerciseType: 'base',         name: '休息' },
      { start: 517, end: 532, exerciseType: 'jumping-jack', name: '0臂+开合跳' },
      { start: 532, end: 547, exerciseType: 'jumping-jack', name: '开合跳' },
      { start: 547, end: 562, exerciseType: 'jumping-jack', name: '举臂开合跳+对角外踏步' },
      { start: 562, end: 577, exerciseType: 'punch',        name: '丝滑脚跟+侧出拳' },
      { start: 577, end: 592, exerciseType: 'jumping-jack', name: '开合跳' },
      { start: 592, end: 607, exerciseType: 'jumping-jack', name: '举臂开合跳+对角外踏步' },
      { start: 607, end: 622, exerciseType: 'jumping-jack', name: '举臂开合跳+对角外踏步' },
      { start: 622, end: 644, exerciseType: 'jumping-jack', name: '丝滑脚跟+外展臂' },
      { start: 644, end: 659, exerciseType: 'jumping-jack', name: '举臂开合跳+对角外踏步' },
      { start: 659, end: 674, exerciseType: 'jumping-jack', name: '举臂开合跳+对角外踏步' },
      { start: 674, end: 679, exerciseType: 'base',         name: '休息' },
      { start: 679, end: 694, exerciseType: 'jumping-jack', name: '展臂+拍掌' },
      { start: 694, end: 709, exerciseType: 'high-knee',    name: '踏步举肩' },
      { start: 709, end: 739, exerciseType: 'jumping-jack', name: '开合跳+展臂' },
      { start: 739, end: 746, exerciseType: 'high-knee',    name: '左提膝' },
      { start: 746, end: 753, exerciseType: 'high-knee',    name: '右提膝' },
      { start: 753, end: 768, exerciseType: 'jumping-jack', name: '展臂+拍掌' },
      { start: 768, end: 783, exerciseType: 'punch',        name: '上出拳+开合跳' },
      { start: 783, end: 798, exerciseType: 'high-knee',    name: '踩点高抬腿' },
      { start: 798, end: 813, exerciseType: 'jumping-jack', name: '走步开合跳' },
      { start: 813, end: 828, exerciseType: 'jumping-jack', name: '开合跳+展臂' },
      { start: 828, end: 843, exerciseType: 'high-knee',    name: '踩点高抬腿' },
      { start: 843, end: 928, exerciseType: 'base',         name: '冷却拉伸' },
    ],
  },
  {
    id: 'pamela-warmup',
    title: '帕梅拉 - 3分钟有氧热身',
    desc: '歌曲热身快速激活能量，提升心率，有氧燃脂',
    duration: '3分钟',
    type: '有氧',
    level: '基础',
    image: asset('course-fat-burn.jpg'),
    standardVideo: '/courses/pamela-warmup-3min.mp4',
    badge: '热身',
    badgeTone: 'green',
    category: 'cardio',
    tags: ['热身', '燃脂', '帕梅拉', '入门'],
    segments: [
      { start:   0, end:  19, exerciseType: 'base',         name: '片头' },
      { start:  19, end:  34, exerciseType: 'jumping-jack', name: 'Y型开合跳' },
      { start:  34, end:  49, exerciseType: 'punch',        name: '歌舞团-拳击' },
      { start:  49, end:  64, exerciseType: 'jumping-jack', name: '1-1-2有氧能量跳' },
      { start:  64, end:  79, exerciseType: 'high-knee',    name: '高抬腿' },
      { start:  79, end:  94, exerciseType: 'squat',        name: '飞机深蹲' },
      { start:  94, end: 109, exerciseType: 'jumping-jack', name: 'Y型开合跳' },
      { start: 109, end: 124, exerciseType: 'combo',        name: '歌舞团-泵感十足' },
      { start: 124, end: 139, exerciseType: 'jumping-jack', name: '1-1-2有氧能量跳' },
      { start: 139, end: 168, exerciseType: 'base',         name: '冷却拉伸' },
    ],
  },
  {
    id: 'mobility',
    title: '瑜伽舒展恢复',
    desc: '缓解久坐僵硬，建立肩髋灵活度',
    duration: '18分钟',
    type: '瑜伽',
    level: '基础',
    image: asset('standard-squat.jpg'),
    badge: '恢复',
    badgeTone: 'blue',
    category: 'stretch',
    tags: ['瑜伽', '柔韧', '恢复'],
  },
  {
    id: 'anna-stretch-5min',
    title: '安娜 - 5分钟运动后全身拉伸',
    desc: '运动后静态拉伸放松，缓解肌肉紧张，提升柔韧性',
    duration: '5分钟',
    type: '拉伸',
    level: '基础',
    image: asset('standard-squat.jpg'),
    standardVideo: '/courses/anna-stretch-5min.mp4',
    badge: '恢复',
    badgeTone: 'blue',
    category: 'stretch',
    tags: ['拉伸', '恢复', '柔韧', '安娜'],
    segments: [
      { start:   0, end:  15, exerciseType: 'base',    name: '片头' },
      { start:  15, end:  45, exerciseType: 'stretch', name: '体前屈' },
      { start:  45, end:  55, exerciseType: 'base',    name: '休息' },
      { start:  55, end:  85, exerciseType: 'stretch', name: '腿前侧拉伸右' },
      { start:  85, end:  95, exerciseType: 'base',    name: '休息' },
      { start:  95, end: 125, exerciseType: 'stretch', name: '腿前侧拉伸左' },
      { start: 125, end: 135, exerciseType: 'base',    name: '休息' },
      { start: 135, end: 165, exerciseType: 'stretch', name: '上肢拉伸' },
      { start: 165, end: 175, exerciseType: 'base',    name: '休息' },
      { start: 175, end: 205, exerciseType: 'stretch', name: '背部拉伸' },
      { start: 205, end: 215, exerciseType: 'base',    name: '休息' },
      { start: 215, end: 245, exerciseType: 'stretch', name: '三头肌拉伸左' },
      { start: 245, end: 255, exerciseType: 'base',    name: '休息' },
      { start: 255, end: 285, exerciseType: 'stretch', name: '三头肌拉伸右' },
      { start: 285, end: 295, exerciseType: 'base',    name: '休息' },
      { start: 295, end: 325, exerciseType: 'stretch', name: '宽距体前屈' },
      { start: 325, end: 335, exerciseType: 'base',    name: '休息' },
    ],
  }
];

const trainers = [
  { name: '健身教练Leo', short: '健身教练L...', fans: '1234粉丝', avatar: asset('avatar-leo.jpg') },
  { name: '瑜伽达人小白', short: '瑜伽达人...', fans: '856粉丝', avatar: asset('avatar-yoga.jpg') },
  { name: '减脂日记', short: '减脂日记', fans: '2341粉丝', avatar: asset('avatar-life.jpg') }
];

const reviews = [
  {
    user: '运动达人小王',
    date: '2024-01-15',
    avatar: asset('avatar-leo.jpg'),
    stars: 5,
    text: '动作讲解很清晰，燃脂效果明显！'
  },
  {
    user: '健身小白',
    date: '2024-01-12',
    avatar: asset('avatar-yoga.jpg'),
    stars: 4,
    text: '适合初学者，节奏适中'
  },
  {
    user: '健康生活家',
    date: '2024-01-10',
    avatar: asset('avatar-life.jpg'),
    stars: 5,
    text: '坚持了一周，腹肌开始显现了！'
  }
];

const featureRows = [
  { icon: CalendarDays, title: '训练记录', sub: '查看历史训练' },
  { icon: Heart, title: '我的收藏', sub: '收藏的课程和文章' },
  { icon: CircleUserRound, title: '身体数据', sub: '体脂率、肌肉量等' },
  { icon: Settings, title: '设置', sub: '账号、通知等' },
  { icon: CircleHelp, title: '帮助中心', sub: '常见问题解答' },
  { icon: Info, title: '关于我们', sub: '版本信息、隐私政策' }
];

const achievements = [
  { icon: Flame, title: '连续7天', tone: 'red', locked: false },
  { icon: Medal, title: '完成100次', tone: 'gold', locked: false },
  { icon: Dumbbell, title: '累计50h', tone: 'muted', locked: true },
  { icon: Trophy, title: '分享10次', tone: 'muted', locked: true }
];

const navItems = [
  { key: 'training', label: '训练', icon: Activity },
  { key: 'community', label: '社群', icon: UsersRound },
  { key: 'profile', label: '我的', icon: UserRound }
];

const deviceOptions = [
  { key: 'phone', label: '手机端', meta: '390 x 844' },
  { key: 'tablet', label: '平板端', meta: '768 x 960' },
  { key: 'desktop', label: '电脑端', meta: '1180 x 760' }
];

function App() {
  const [device, setDevice] = useState('desktop');
  const [activeTab, setActiveTab] = useState('training');
  const [screen, setScreen] = useState('main');
  const [selectedCourse, setSelectedCourse] = useState(courses[0]);
  const [selectedMode, setSelectedMode] = useState('smart');
  const [showConsent, setShowConsent] = useState(false);
  const [cameraAllowed, setCameraAllowed] = useState(false);

  const openTab = (tab) => {
    setActiveTab(tab);
    setScreen('main');
    setShowConsent(false);
  };

  const openCourse = (course) => {
    setSelectedCourse(course);
    setSelectedMode('smart');
    setScreen('course');
  };

  const startTraining = () => {
    if (selectedMode === 'smart') {
      setShowConsent(true);
      return;
    }
    setCameraAllowed(false);
    setScreen('session');
  };

  const agreeConsent = () => {
    setCameraAllowed(true);
    setShowConsent(false);
    setScreen('session');
  };

  const closeSession = () => {
    setScreen('course');
    setCameraAllowed(false);
  };

  return (
    <div className="preview-workspace">
      <header className="preview-header" aria-label="设备预览控制">
        <div>
          <p className="eyebrow">Fitness AI Assistant</p>
          <h1>智能健身辅助 APP</h1>
        </div>
        <div className="device-switch" role="tablist" aria-label="预览设备">
          {deviceOptions.map((option) => (
            <button
              key={option.key}
              className={device === option.key ? 'active' : ''}
              onClick={() => setDevice(option.key)}
              type="button"
              role="tab"
              aria-selected={device === option.key}
            >
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </header>

      <main className="preview-stage">
        <div className={`device-frame ${device}`} data-device={device}>
          <div className="app-shell">
            <StatusBar />
            {screen === 'session' ? (
              <TrainingSession
                course={selectedCourse}
                cameraAllowed={cameraAllowed}
                onClose={closeSession}
              />
            ) : (
              <>
                <section className="screen-body">
                  {screen === 'course' && activeTab === 'training' ? (
                    <CourseDetail
                      course={selectedCourse}
                      selectedMode={selectedMode}
                      onSelectMode={setSelectedMode}
                      onBack={() => setScreen('main')}
                      onStart={startTraining}
                    />
                  ) : (
                    <MainScreen
                      activeTab={activeTab}
                      onOpenCourse={openCourse}
                    />
                  )}
                </section>
                {screen === 'main' && (
                  <BottomNav activeTab={activeTab} onSelect={openTab} />
                )}
                {showConsent && (
                  <ConsentModal
                    onCancel={() => setShowConsent(false)}
                    onAgree={agreeConsent}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function StatusBar() {
  return (
    <div className="status-bar">
      <span className="status-time">8:34</span>
      <span className="status-apps">
        <span />
        <span />
        <span />
      </span>
      <span className="status-icons">
        <Wifi size={17} />
        <Signal size={17} />
        <BatteryFull size={20} />
        <strong>60</strong>
      </span>
    </div>
  );
}

function MainScreen({ activeTab, onOpenCourse }) {
  if (activeTab === 'community') {
    return <CommunityPage />;
  }
  if (activeTab === 'profile') {
    return <ProfilePage />;
  }
  return <TrainingPage onOpenCourse={onOpenCourse} />;
}

function SearchBox({ placeholder }) {
  return (
    <div className="search-box">
      <Search size={24} />
      <span>{placeholder}</span>
    </div>
  );
}

function FilterChips({ items, active, onSelect }) {
  return (
    <div className="chip-row">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          className={item.key === active ? 'active' : ''}
          onClick={() => onSelect(item.key)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function TrainingPage({ onOpenCourse }) {
  const [activeCategory, setActiveCategory] = useState('all');

  const filteredCourses = activeCategory === 'all'
    ? courses
    : courses.filter((c) => c.category === activeCategory);

  return (
    <div className="page page-training">
      <SearchBox placeholder="搜索课程..." />
      <div className="page-title-row">
        <h2>全部课程</h2>
        <span>AI姿态评分</span>
      </div>
      <FilterChips items={CATEGORIES} active={activeCategory} onSelect={setActiveCategory} />

      <div className="course-list">
        {filteredCourses.map((course) => (
          <button
            key={course.id}
            className="course-card"
            type="button"
            onClick={() => onOpenCourse(course)}
          >
            <div className="course-image">
              <img src={course.image} alt="" />
              <span className={`level-badge ${course.badgeTone}`}>{course.badge}</span>
            </div>
            <div className="course-copy">
              <h3>{course.title}</h3>
              <p>{course.desc}</p>
              <div className="meta-row">
                <span><Clock3 size={17} />{course.duration}</span>
                <span><Tag size={17} />{course.type}</span>
              </div>
              {course.tags && (
                <div className="tag-row">
                  {course.tags.map((tag) => (
                    <span key={tag} className="course-tag">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function CommunityPage() {
  return (
    <div className="page page-community">
      <h2 className="solo-title">健身社群</h2>
      <SearchBox placeholder="搜索话题、用户..." />
      <FilterChips items={['推荐', '关注', '热点']} />

      <section className="section-block">
        <h3>健身达人</h3>
        <div className="creator-grid">
          {trainers.map((trainer) => (
            <article className="creator-card" key={trainer.name}>
              <img src={trainer.avatar} alt="" />
              <strong>{trainer.short}</strong>
              <span>{trainer.fans}</span>
              <button type="button">+ 关注</button>
            </article>
          ))}
        </div>
      </section>

      <article className="post-card">
        <div className="post-head">
          <img src={trainers[0].avatar} alt="" />
          <div>
            <strong>健身教练Leo</strong>
            <span>2小时前</span>
          </div>
          <button type="button">+ 关注</button>
        </div>
        <p>
          今天的训练很充实！坚持打卡第30天，腹肌已经若隐若现了。分享给大家我的训练计划：每天30分钟核心训练，配合有氧运动，效果真的很明显！
        </p>
        <img className="post-image" src={courses[1].image} alt="" />
      </article>
    </div>
  );
}

function ProfilePage() {
  return (
    <div className="page page-profile">
      <div className="profile-head">
        <h2 className="solo-title">我的</h2>
        <button className="round-action" type="button" aria-label="设置">
          <Settings size={30} />
        </button>
      </div>

      <section className="user-card">
        <img src={asset('avatar-profile.jpg')} alt="" />
        <div>
          <h3>健身爱好者</h3>
          <p>ID: FitUser2024</p>
          <span><Star size={20} fill="currentColor" />Lv.8 运动达人</span>
        </div>
        <button className="round-action small" type="button" aria-label="编辑资料">
          <Edit3 size={23} />
        </button>
      </section>

      <section className="stat-grid">
        <div><strong>28</strong><span>训练天数</span></div>
        <div><strong>42h</strong><span>累计训练</span></div>
        <div><strong>5860</strong><span>消耗卡路里</span></div>
      </section>

      <section className="section-block achievement-section">
        <div className="section-title-row">
          <h3>我的成就</h3>
          <a href="#achievements">查看全部</a>
        </div>
        <div className="achievement-grid">
          {achievements.map(({ icon: Icon, title, tone, locked }) => (
            <div className={`achievement ${tone}`} key={title}>
              <span>
                <Icon size={34} fill={tone === 'red' || tone === 'gold' ? 'currentColor' : 'none'} />
                {locked && <i />}
              </span>
              <p>{title}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section-block">
        <h3>功能</h3>
        <div className="feature-list">
          {featureRows.map(({ icon: Icon, title, sub }) => (
            <button className="feature-row" type="button" key={title}>
              <span className="feature-icon"><Icon size={29} /></span>
              <span>
                <strong>{title}</strong>
                <small>{sub}</small>
              </span>
              <ChevronRight size={28} />
            </button>
          ))}
        </div>
      </section>

      <button className="logout-button" type="button">
        <LogOut size={26} />
        退出登录
      </button>
    </div>
  );
}

function CourseDetail({ course, selectedMode, onSelectMode, onBack, onStart }) {
  return (
    <div className="course-detail">
      <div className="detail-hero">
        <img src={course.image} alt="" />
        <button className="back-button" onClick={onBack} type="button" aria-label="返回">
          <ChevronLeft size={31} />
        </button>
      </div>

      <div className="detail-content">
        <h2>{course.title}</h2>
        <div className="detail-tags">
          <span><Clock3 size={18} />{course.duration}</span>
          <span><Tag size={18} />{course.type}</span>
          <span className="green">{course.level}</span>
        </div>
        <p className="detail-desc">{course.desc}</p>

        <section className="section-block">
          <h3>跟练评价</h3>
          <div className="review-list">
            {reviews.map((review) => (
              <ReviewCard review={review} key={review.user} />
            ))}
          </div>
        </section>

        <section className="section-block">
          <h3>选择训练模式</h3>
          <div className="mode-grid">
            <button
              type="button"
              className={selectedMode === 'normal' ? 'mode-card active simple' : 'mode-card simple'}
              onClick={() => onSelectMode('normal')}
            >
              <Play size={34} />
              <strong>普通版</strong>
              <span>跟随视频训练</span>
            </button>
            <button
              type="button"
              className={selectedMode === 'smart' ? 'mode-card active smart' : 'mode-card smart'}
              onClick={() => onSelectMode('smart')}
            >
              <i>推荐</i>
              <Lightbulb size={36} />
              <strong>智能矫正版</strong>
              <span>AI实时动作指导</span>
            </button>
          </div>
        </section>

        <button className="primary-cta" type="button" onClick={onStart}>
          开始训练
        </button>
      </div>
    </div>
  );
}

function ReviewCard({ review }) {
  return (
    <article className="review-card">
      <img src={review.avatar} alt="" />
      <div>
        <div className="review-title">
          <strong>{review.user}</strong>
          <span>{review.date}</span>
        </div>
        <div className="star-row" aria-label={`${review.stars}星评价`}>
          {Array.from({ length: 5 }).map((_, index) => (
            <Star
              key={index}
              size={22}
              fill={index < review.stars ? 'currentColor' : 'none'}
            />
          ))}
        </div>
        <p>{review.text}</p>
      </div>
    </article>
  );
}

function ConsentModal({ onCancel, onAgree }) {
  return (
    <div className="modal-layer">
      <div className="permission-modal" role="dialog" aria-modal="true" aria-labelledby="permission-title">
        <h2 id="permission-title">智能矫正权限说明</h2>
        <p>
          点击“同意”代表您同意开启相机权限，并同意在训练中采集您的动作数据。您的数据仅用于实时动作分析和指导，不会用于任何第三方用途。
        </p>
        <p>
          我们高度重视您的隐私安全，数据处理遵循相关法律法规。
        </p>
        <div className="modal-actions">
          <button type="button" onClick={onCancel}>我再想想</button>
          <button type="button" onClick={onAgree}>同意</button>
        </div>
      </div>
    </div>
  );
}

function TrainingSession({ course, cameraAllowed, onClose }) {
  const standardVideoRef = useRef(null);
  const videoRef = useRef(null);
  const posePanelRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const poseHistoryRef = useRef([]);
  const userMotionHistoryRef = useRef([]);
  const standardMotionHistoryRef = useRef([]);
  const feedbackSamplesRef = useRef([]);
  const lastFeedbackCommitSecondRef = useRef(null);
  const standardFrameIndexRef = useRef(-1);
  const [seconds, setSeconds] = useState(1);
  const [cameraEnabled, setCameraEnabled] = useState(cameraAllowed);
  const [cameraState, setCameraState] = useState(cameraAllowed ? 'waiting' : 'disabled');
  const [cameraError, setCameraError] = useState('');
  const [detectorState, setDetectorState] = useState('idle');
  const [hasStarted, setHasStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [standardVideoMuted, setStandardVideoMuted] = useState(true);
  const [pose, setPose] = useState(null);
  const [standardPoseData, setStandardPoseData] = useState(null);
  const [standardPose, setStandardPose] = useState(null);
  const [standardVideoSize, setStandardVideoSize] = useState({ width: 1, height: 1 });
  const [hotStats, setHotStats] = useState({ windowSize: 0, representativeIndexes: [] });
  const [videoSize, setVideoSize] = useState({ width: 1, height: 1 });
  const [standardPanelWidth, setStandardPanelWidth] = useState(null);
  const [motionSignals, setMotionSignals] = useState({ user: 0, standard: 0, userAverage: 0, standardAverage: 0 });
  const trainingStatus = !hasStarted ? 'idle' : isPaused ? 'paused' : 'active';
  const rawFeedback = useMemo(
    () => analyzePoseFeedback(
      pose,
      standardPose,
      seconds,
      cameraState,
      detectorState,
      course,
      trainingStatus,
      motionSignals
    ),
    [pose, standardPose, seconds, cameraState, detectorState, course, trainingStatus, motionSignals]
  );
  const [displayFeedback, setDisplayFeedback] = useState(rawFeedback);
  const feedback = displayFeedback;
  const currentSegment = useMemo(
    () => getCurrentSegment(course, seconds),
    [course, seconds]
  );
  const cameraStatusText = useMemo(() => {
    if (!cameraEnabled) return '相机已关闭';
    if (cameraState === 'waiting') return '正在请求相机权限或等待视频流就绪';
    if (cameraState === 'ready') return pose ? '已检测到人体骨架' : '相机已开启，请后退并保持全身入镜';
    if (cameraState === 'denied') return '相机权限被拒绝，或设备被其他程序占用';
    if (cameraState === 'unavailable') return '当前浏览器或设备不支持摄像头访问';
    return '相机状态未知';
  }, [cameraEnabled, cameraState, pose]);

  useEffect(() => {
    setDisplayFeedback((current) => {
      if (!current) return rawFeedback;

      if (rawFeedback.locked || trainingStatus !== 'active') {
        feedbackSamplesRef.current = [];
        lastFeedbackCommitSecondRef.current = null;
        return rawFeedback;
      }

      feedbackSamplesRef.current = [...feedbackSamplesRef.current.slice(-59), rawFeedback.score];
      if (current.locked || lastFeedbackCommitSecondRef.current === null) {
        lastFeedbackCommitSecondRef.current = seconds;
        return rawFeedback;
      }

      if (seconds - lastFeedbackCommitSecondRef.current < 4) {
        return current;
      }

      const sampledScore = Math.round(average(feedbackSamplesRef.current));
      const nextScore = Math.abs(sampledScore - current.score) < 4 ? current.score : sampledScore;
      lastFeedbackCommitSecondRef.current = seconds;
      feedbackSamplesRef.current = [];

      return {
        ...rawFeedback,
        score: nextScore
      };
    });
  }, [rawFeedback, seconds, trainingStatus]);

  useEffect(() => {
    if (!hasStarted || isPaused) return undefined;
    const timer = window.setInterval(() => {
      setSeconds((value) => value + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [hasStarted, isPaused]);

  useEffect(() => {
    const video = standardVideoRef.current;
    if (!video) return;

    video.muted = standardVideoMuted;

    if (!hasStarted || isPaused) {
      video.pause();
      return;
    }

    video.play().catch(() => {});
  }, [hasStarted, isPaused, standardVideoMuted]);

  useEffect(() => {
    let active = true;
    standardFrameIndexRef.current = -1;
    standardMotionHistoryRef.current = [];
    setStandardPose(null);
    setStandardPoseData(null);

    if (!course.standardPose) return undefined;

    fetch(course.standardPose)
      .then((response) => {
        if (!response.ok) throw new Error(`Failed to load standard pose: ${response.status}`);
        return response.json();
      })
      .then((data) => {
        if (!active) return;
        setStandardPoseData(data);
        setStandardVideoSize({ width: data.width || 1, height: data.height || 1 });
      })
      .catch(() => {
        if (!active) return;
        setStandardPoseData(null);
        setStandardPose(null);
      });

    return () => {
      active = false;
    };
  }, [course.standardPose]);

  useEffect(() => {
    if (!standardPoseData?.frames?.length) return undefined;
    let frameId = 0;

    const updateStandardPose = () => {
      const video = standardVideoRef.current;
      if (video) {
        const sampleRate = standardPoseData.sampleRate || 5;
        const index = Math.min(
          standardPoseData.frames.length - 1,
          Math.max(0, Math.round(video.currentTime * sampleRate))
        );
        if (index !== standardFrameIndexRef.current) {
          const previousIndex = Math.max(0, index - 4);
          const standardMotion = poseDistance(standardPoseData.frames[index], standardPoseData.frames[previousIndex]);
          standardMotionHistoryRef.current = [...standardMotionHistoryRef.current.slice(-9), standardMotion];
          const standardAverage = average(standardMotionHistoryRef.current);
          standardFrameIndexRef.current = index;
          setStandardPose(standardPoseData.frames[index]);
          setMotionSignals((signals) => (
            Math.abs(signals.standard - standardMotion) < 0.005 &&
            Math.abs(signals.standardAverage - standardAverage) < 0.005
              ? signals
              : { ...signals, standard: standardMotion, standardAverage }
          ));
        }
      }
      frameId = window.requestAnimationFrame(updateStandardPose);
    };

    updateStandardPose();
    return () => window.cancelAnimationFrame(frameId);
  }, [standardPoseData]);

  useEffect(() => {
    let mounted = true;
    if (!cameraEnabled || !navigator.mediaDevices?.getUserMedia) {
      setCameraState(cameraEnabled ? 'unavailable' : 'disabled');
      setCameraError('');
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) videoRef.current.srcObject = null;
      poseHistoryRef.current = [];
      userMotionHistoryRef.current = [];
      setPose(null);
      setHotStats({ windowSize: 0, representativeIndexes: [] });
      setMotionSignals({ user: 0, standard: 0, userAverage: 0, standardAverage: 0 });
      return undefined;
    }

    setCameraState('waiting');
    setCameraError('');
    const attachStream = (stream) => {
      if (!mounted) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      setCameraState('ready');
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        videoRef.current.autoplay = true;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(() => {});
        };
        videoRef.current.play().catch(() => {});
      }
    };

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then(attachStream)
      .catch(() =>
        navigator.mediaDevices
          .getUserMedia({ video: true, audio: false })
          .then(attachStream)
          .catch((error) => {
            setCameraError(error?.name || error?.message || 'unknown_error');
            setCameraState('denied');
          })
      );

    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraEnabled]);

  useEffect(() => {
    let active = true;
    let frameId = 0;

    const detectPose = async () => {
      if (cameraState !== 'ready' || !videoRef.current) return;
      try {
        setDetectorState('loading');
        const [
          tf,
          poseDetection
        ] = await Promise.all([
          import('@tensorflow/tfjs-core'),
          import('@tensorflow-models/pose-detection'),
          import('@tensorflow/tfjs-backend-cpu'),
          import('@tensorflow/tfjs-backend-webgl')
        ]);
        await tf.setBackend('webgl').catch(() => tf.setBackend('cpu'));
        await tf.ready();
        const detector = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
        );
        if (!active) {
          detector.dispose?.();
          return;
        }
        detectorRef.current = detector;
        setDetectorState('ready');

        const loop = async () => {
          if (!active || !videoRef.current) return;
          const video = videoRef.current;
          if (video.readyState >= 2) {
            if (video.videoWidth && video.videoHeight) {
              setVideoSize((size) => (
                size.width === video.videoWidth && size.height === video.videoHeight
                  ? size
                  : { width: video.videoWidth, height: video.videoHeight }
              ));
            }
            const poses = await detector.estimatePoses(video);
            if (active) {
              const detectedPose = poses[0] ?? null;
              if (detectedPose) {
                poseHistoryRef.current = [...poseHistoryRef.current.slice(-23), detectedPose];
                const hotResult = applyHotTemporalTokenizer(poseHistoryRef.current);
                const userMotion = calculateRecentMotion(poseHistoryRef.current);
                userMotionHistoryRef.current = [...userMotionHistoryRef.current.slice(-13), userMotion];
                const userAverage = average(userMotionHistoryRef.current);
                setPose(hotResult.pose);
                setHotStats({
                  windowSize: hotResult.windowSize,
                  representativeIndexes: hotResult.representativeIndexes
                });
                setMotionSignals((signals) => (
                  Math.abs(signals.user - userMotion) < 0.005 &&
                  Math.abs(signals.userAverage - userAverage) < 0.005
                    ? signals
                    : { ...signals, user: userMotion, userAverage }
                ));
              } else {
                setPose(null);
                setHotStats({ windowSize: poseHistoryRef.current.length, representativeIndexes: [] });
                userMotionHistoryRef.current = [];
                setMotionSignals((signals) => (
                  signals.user === 0 && signals.userAverage === 0
                    ? signals
                    : { ...signals, user: 0, userAverage: 0 }
                ));
              }
            }
          }
          frameId = window.requestAnimationFrame(loop);
        };

        loop();
      } catch (error) {
        if (active) setDetectorState('error');
      }
    };

    detectPose();

    return () => {
      active = false;
      window.cancelAnimationFrame(frameId);
      detectorRef.current?.dispose?.();
      detectorRef.current = null;
      poseHistoryRef.current = [];
      userMotionHistoryRef.current = [];
      setPose(null);
      setHotStats({ windowSize: 0, representativeIndexes: [] });
      setDetectorState('idle');
    };
  }, [cameraState]);

  const totalSeconds = useMemo(() => {
    if (course.segments?.length) {
      return course.segments[course.segments.length - 1].end;
    }
    if (standardPoseData?.duration) {
      return Math.round(standardPoseData.duration);
    }
    const match = course.duration?.match(/(\d+)/);
    return match ? parseInt(match[1], 10) * 60 : 900;
  }, [course, standardPoseData]);

  const formatted = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  const progress = Math.min((seconds / Math.max(1, totalSeconds)) * 100, 100);
  const handleTrainingToggle = () => {
    if (!hasStarted) {
      setSeconds(1);
      userMotionHistoryRef.current = [];
      feedbackSamplesRef.current = [];
      lastFeedbackCommitSecondRef.current = null;
      standardMotionHistoryRef.current = [];
      setMotionSignals({ user: 0, standard: 0, userAverage: 0, standardAverage: 0 });
      if (standardVideoRef.current) standardVideoRef.current.currentTime = 0;
      setHasStarted(true);
      setIsPaused(false);
      return;
    }
    setIsPaused((paused) => !paused);
  };
  const cameraIsOn = cameraEnabled && cameraState === 'ready';
  const syncStandardVideoMuted = () => {
    const video = standardVideoRef.current;
    if (video) {
      setStandardVideoMuted(video.muted);
    }
  };
  const resizeStandardPanel = (event) => {
    const panel = posePanelRef.current;
    if (!panel) return;
    event.preventDefault();

    const updateWidth = (clientX) => {
      const rect = panel.getBoundingClientRect();
      const style = window.getComputedStyle(panel);
      const paddingLeft = parseFloat(style.paddingLeft) || 0;
      const paddingRight = parseFloat(style.paddingRight) || 0;
      const columnGap = parseFloat(style.columnGap) || parseFloat(style.gap) || 0;
      const dividerWidth = 10;
      const innerLeft = rect.left + paddingLeft;
      const innerWidth = rect.width - paddingLeft - paddingRight;
      const minWidth = Math.min(320, innerWidth);
      const maxWidth = Math.max(minWidth, innerWidth - dividerWidth - columnGap * 2);
      const nextWidth = Math.min(maxWidth, Math.max(minWidth, clientX - innerLeft));

      setStandardPanelWidth(nextWidth);
    };

    updateWidth(event.clientX);

    const handlePointerMove = (moveEvent) => {
      updateWidth(moveEvent.clientX);
    };
    const stopResize = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopResize);
      window.removeEventListener('pointercancel', stopResize);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopResize);
    window.addEventListener('pointercancel', stopResize);
  };

  return (
    <section className="training-session">
      <div className="session-top">
        <button className="round-action" type="button" onClick={onClose} aria-label="退出训练">
          <X size={32} />
        </button>
        <div>
          <h2>{course.title}</h2>
          <span>智能矫正模式</span>
        </div>
      </div>

      <div
        className="pose-panel"
        ref={posePanelRef}
        style={standardPanelWidth ? { '--standard-panel-width': `${standardPanelWidth}px` } : undefined}
      >
        <div className="pose-column">
          <h3>标准动作</h3>
          {course.standardVideo ? (
            <div className="standard-media">
              <video
                ref={standardVideoRef}
                className="standard-video"
                src={course.standardVideo}
                poster={course.image}
                autoPlay={!isPaused}
                muted={standardVideoMuted}
                loop
                playsInline
                controls
                onVolumeChange={syncStandardVideoMuted}
              />
              {standardPose && (
                <PoseOverlay
                  pose={standardPose}
                  size={standardVideoSize}
                  tone="standard"
                  mirror={false}
                  fit="contain"
                />
              )}
              {standardPoseData && (
                <span className="standard-pose-status">
                  标准骨架 {standardPoseData.frames.length}帧
                </span>
              )}
            </div>
          ) : (
            <img src={asset('standard-squat.jpg')} alt="" />
          )}
          <p>{feedback.cue}</p>
        </div>
        <div
          className="panel-divider"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize standard panel"
          onPointerDown={resizeStandardPanel}
        />
        <div className="pose-column camera-column">
          <div className="camera-title-row">
            <h3>你的动作</h3>
            <button
              className={cameraEnabled ? 'camera-toggle active' : 'camera-toggle'}
              type="button"
              onClick={() => setCameraEnabled((enabled) => !enabled)}
              aria-pressed={cameraEnabled}
            >
              <Camera size={16} />
              {cameraIsOn ? '关闭相机' : '打开相机'}
            </button>
          </div>
          <div className={`camera-box ${cameraState}`}>
            <video ref={videoRef} playsInline muted autoPlay />
            {pose && cameraState === 'ready' ? (
              <PoseOverlay pose={pose} size={videoSize} tone={feedback.tone} />
            ) : cameraState !== 'ready' ? (
              <PoseSkeleton tone={feedback.tone} />
            ) : null}
            {cameraState === 'ready' && !pose ? (
              <div className="camera-hint">
                {cameraStatusText}
              </div>
            ) : null}
            {cameraState === 'ready' && (
              <span className={`ai-status ${detectorState}`}>
                {detectorState === 'ready'
                  ? 'HoT标注中'
                  : detectorState === 'loading'
                  ? '模型加载中'
                  : detectorState === 'error'
                  ? '检测降级'
                  : '相机已开启'}
              </span>
            )}
            {cameraState !== 'ready' && (
              <div className="camera-placeholder">
                <Camera size={54} />
                <span>{cameraStatusText}</span>
                {cameraError ? <small>错误信息：{cameraError}</small> : null}
              </div>
            )}
          </div>
          <p className="hot-caption">
            HoT tokens {hotStats.representativeIndexes.length}/{hotStats.windowSize || 24}
          </p>
        </div>
      </div>

      <aside className="session-sidebar">
      <div className="session-feedback">
        <h2>{feedback.action}</h2>
        <div className="micro-progress"><span style={{ width: `${Math.max(4, feedback.score)}%` }} /></div>
        <div className={`feedback-banner ${feedback.tone}`}>
          <Info size={24} />
          <strong>{feedback.message}</strong>
          <em>{feedback.score}分</em>
        </div>
      </div>

      <div className="time-block">
        <div>
          <span>运动时长</span>
          <strong>{formatted}</strong>
        </div>
        <div className="total-progress"><span style={{ width: `${progress}%` }} /></div>
        <p>总时长 {course.duration}</p>
      </div>

      <button
        className={isPaused ? 'pause-button resume' : 'pause-button'}
        type="button"
        onClick={handleTrainingToggle}
        aria-pressed={isPaused}
      >
        {isPaused ? <Play size={26} /> : <Pause size={26} />}
        {!hasStarted ? '开始' : isPaused ? '继续' : '暂停'}
      </button>
      </aside>
    </section>
  );
}

function PoseSkeleton({ tone }) {
  return (
    <div className={`pose-skeleton ${tone}`} aria-hidden="true">
      <span className="joint head" />
      <span className="joint shoulder-l" />
      <span className="joint shoulder-r" />
      <span className="joint hip-l" />
      <span className="joint hip-r" />
      <span className="joint knee-l" />
      <span className="joint knee-r" />
      <span className="joint ankle-l" />
      <span className="joint ankle-r" />
      <i className="bone spine" />
      <i className="bone shoulder" />
      <i className="bone hip" />
      <i className="bone leg-l-1" />
      <i className="bone leg-l-2" />
      <i className="bone leg-r-1" />
      <i className="bone leg-r-2" />
    </div>
  );
}

function PoseOverlay({ pose, size, tone, mirror = true, fit = 'stretch' }) {
  const points = pose?.keypoints ?? [];
  const pointMap = new Map(points.map((point) => [point.name || point.part, point]));
  const width = size.width || 1;
  const height = size.height || 1;
  const radius = Math.max(5, Math.min(width, height) * 0.012);
  const labelOffset = Math.max(10, width * 0.014);
  const labelSize = Math.max(13, width * 0.026);
  const projectX = (x) => (mirror ? width - x : x);
  const projectY = (y) => y;

  return (
    <svg
      className={`pose-overlay ${tone}`}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio={fit === 'contain' ? 'xMidYMid meet' : 'none'}
      aria-hidden="true"
    >
      {poseLinks.map(([from, to]) => {
        const a = pointMap.get(from);
        const b = pointMap.get(to);
        if (!isVisible(a, 0.28) || !isVisible(b, 0.28)) return null;
        return (
          <line
            key={`${from}-${to}`}
            x1={projectX(a.x)}
            y1={projectY(a.y)}
            x2={projectX(b.x)}
            y2={projectY(b.y)}
          />
        );
      })}
      {points.map((point) => {
        if (!isVisible(point, 0.28)) return null;
        return (
          <circle
            key={point.name || point.part}
            cx={projectX(point.x)}
            cy={projectY(point.y)}
            r={radius}
          />
        );
      })}
      {points.map((point) => {
        if (!isVisible(point, 0.34)) return null;
        const name = point.name || point.part;
        const x = projectX(point.x);
        const y = projectY(point.y);
        const onRight = x > width * 0.62;
        return (
          <text
            key={`${name}-label`}
            className="joint-label"
            style={{ fontSize: labelSize }}
            x={Math.min(width - labelOffset, Math.max(labelOffset, x + (onRight ? -labelOffset : labelOffset)))}
            y={Math.min(height - labelOffset, Math.max(labelOffset, y - labelOffset))}
            textAnchor={onRight ? 'end' : 'start'}
          >
            {keypointLabels[name] || name}
          </text>
        );
      })}
    </svg>
  );
}

function BottomNav({ activeTab, onSelect }) {
  return (
    <nav className="bottom-nav" aria-label="主导航">
      {navItems.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          className={activeTab === key ? 'active' : ''}
          onClick={() => onSelect(key)}
        >
          <Icon size={30} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

createRoot(document.getElementById('root')).render(<App />);
