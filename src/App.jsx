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
import './styles.css';

const asset = (name) => `/assets/${name}`;

const poseLinks = [
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

function pointByName(pose, name) {
  return pose?.keypoints?.find((point) => point.name === name || point.part === name);
}

function isVisible(point, minScore = 0.32) {
  return point && (point.score ?? 0) >= minScore;
}

function angleBetween(a, b, c) {
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

function centerOf(a, b) {
  if (!isVisible(a) || !isVisible(b)) return null;
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

const matchKeypoints = [
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

function getPoseAnchor(pose) {
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

function normalizedPoint(pose, name, anchor) {
  const point = pointByName(pose, name);
  if (!isVisible(point) || !anchor) return null;
  return {
    x: (point.x - anchor.center.x) / anchor.scale,
    y: (point.y - anchor.center.y) / anchor.scale
  };
}

function compareToStandardPose(userPose, standardPose) {
  const userAnchor = getPoseAnchor(userPose);
  const standardAnchor = getPoseAnchor(standardPose);
  if (!userAnchor || !standardAnchor) return null;

  const distances = [];
  for (const name of matchKeypoints) {
    const userPoint = normalizedPoint(userPose, name, userAnchor);
    const standardPoint = normalizedPoint(standardPose, name, standardAnchor);
    if (!userPoint || !standardPoint) continue;
    distances.push(Math.hypot(userPoint.x - standardPoint.x, userPoint.y - standardPoint.y));
  }

  if (distances.length < 6) return null;
  const averageDistance = distances.reduce((sum, value) => sum + value, 0) / distances.length;
  const score = Math.max(28, Math.min(100, Math.round(100 - averageDistance * 52)));
  return { score, matchedPoints: distances.length, averageDistance };
}

function poseDistance(poseA, poseB) {
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

function calculateRecentMotion(history) {
  if (!history || history.length < 10) return 0;
  const latest = history[history.length - 1];
  const previous = history[Math.max(0, history.length - 18)];
  return poseDistance(latest, previous);
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function fallbackFeedback(seconds) {
  const cycle = seconds % 12;
  if (cycle < 4) {
    return {
      action: '跟练评分',
      score: 92,
      message: '准备开始，保持节奏...',
      cue: '先观察左侧标准动作，准备跟随节奏',
      tone: 'good'
    };
  }
  if (cycle < 8) {
    return {
      action: '跟练评分',
      score: 78,
      message: '注意动作幅度和节奏',
      cue: '让身体关键点尽量完整入镜',
      tone: 'warn'
    };
  }
  return {
    action: '跟练评分',
    score: 96,
    message: '动作标准，继续保持！',
    cue: '保持稳定呼吸，跟随标准动作节奏',
    tone: 'great'
  };
}

function stableTrainingFeedback(trainingStatus) {
  if (trainingStatus === 'paused') {
    return {
      action: '跟练评分',
      score: 0,
      message: '训练已暂停',
      cue: '点击继续后再恢复动作评分',
      tone: 'good',
      locked: true
    };
  }
  return {
    action: '跟练评分',
    score: 0,
    message: '准备开始',
    cue: '先调整站位，点击开始后再进行评分',
    tone: 'good',
    locked: true
  };
}

function hasEnoughKeypointsForStandard(pose, standardPose) {
  if (!standardPose) return true;
  const requiredNames = matchKeypoints.filter((name) => isVisible(pointByName(standardPose, name), 0.28));
  if (requiredNames.length < 6) return true;
  const visibleRequiredCount = requiredNames.filter((name) => isVisible(pointByName(pose, name))).length;
  const minRequired = Math.max(6, Math.ceil(requiredNames.length * 0.72));
  return visibleRequiredCount >= minRequired;
}

function analyzePoseFeedback(
  pose,
  standardPose,
  seconds,
  cameraState,
  detectorState,
  evaluationType = 'follow-along',
  trainingStatus = 'active',
  motion = { user: 0, standard: 0, userAverage: 0, standardAverage: 0 }
) {
  if (trainingStatus !== 'active') return stableTrainingFeedback(trainingStatus);
  if (cameraState !== 'ready') return fallbackFeedback(seconds);
  if (detectorState === 'loading') {
    return {
      action: '跟练评分',
      score: 68,
      message: '姿态模型加载中...',
      cue: '请保持全身在画面内',
      tone: 'warn'
    };
  }
  if (detectorState === 'error') {
    return {
      action: '跟练评分',
      score: 70,
      message: '检测模型未加载，使用演示反馈',
      cue: '网络恢复后可自动重试模型',
      tone: 'warn'
    };
  }

  const visiblePoints = pose?.keypoints?.filter((point) => isVisible(point)) ?? [];
  if (visiblePoints.length < 7) {
    return {
      action: '跟练评分',
      score: 0,
      message: '请先完整进入画面',
      cue: '当前标准动作需要更多关键点，请后退并露出上半身和手臂',
      tone: 'warn',
      locked: true
    };
  }

  if (!hasEnoughKeypointsForStandard(pose, standardPose)) {
    return {
      action: '跟练评分',
      score: 0,
      message: '请先完整进入画面',
      cue: '当前标准动作需要更多关键点，请后退并露出上半身和手臂',
      tone: 'warn',
      locked: true
    };
  }

  if (evaluationType !== 'squat') {
    const matchResult = compareToStandardPose(pose, standardPose);
    const visibilityScore = Math.min(100, Math.round((visiblePoints.length / matchKeypoints.length) * 100));
    const standardMotion = Math.max(0.04, motion.standardAverage || motion.standard);
    const userMotion = Math.max(motion.user, motion.userAverage);
    const standardIsMoving = standardMotion > 0.1;
    const motionRatio = standardIsMoving ? userMotion / Math.max(0.08, standardMotion) : 1;
    const motionScore = standardIsMoving
      ? Math.max(0, Math.min(100, Math.round(motionRatio * 135)))
      : Math.max(62, Math.min(100, Math.round(100 - Math.abs(userMotion - standardMotion) * 160)));
    let score = matchResult
      ? Math.round(matchResult.score * 0.55 + motionScore * 0.35 + visibilityScore * 0.1)
      : Math.round(motionScore * 0.55 + visibilityScore * 0.25);
    let message = '跟练同步，继续保持！';
    let cue = '保持当前节奏，继续跟随标准动作';
    let tone = 'great';

    if (!matchResult) {
      score = Math.min(score, 68);
      message = '正在建立标准动作匹配';
      cue = '请让身体关键点更完整地进入画面';
      tone = 'warn';
    } else if (seconds < 4) {
      score = Math.min(score, 58);
      message = '正在观察动作节奏';
      cue = '先跟着标准视频做完整几拍，系统会逐步更新评分';
      tone = 'warn';
    } else if (standardIsMoving && userMotion < 0.035 && motionRatio < 0.22) {
      score = Math.min(score, 45);
      message = '请跟上标准动作节奏';
      cue = '标准动作正在变化，不要只保持站立姿势';
      tone = 'warn';
    } else if (standardIsMoving && motionRatio < 0.45) {
      score = Math.min(score, 70);
      message = '动作幅度偏小';
      cue = '跟随左侧动作增加手臂或躯干活动幅度';
      tone = 'warn';
    } else if (score >= 88) {
      message = '动作标准，继续保持！';
      cue = '节奏和姿态匹配良好，保持稳定呼吸';
      tone = 'great';
    } else if (score >= 74) {
      message = '基本同步，注意幅度';
      cue = '观察左侧标准动作，微调手臂和躯干位置';
      tone = 'good';
    } else if (score >= 58) {
      message = '节奏或幅度有偏差';
      cue = '先放慢速度，对齐标准动作的关键姿态';
      tone = 'warn';
    } else {
      message = '与标准动作差异较大';
      cue = '建议暂停看清动作，再从当前小节重新跟练';
      tone = 'warn';
    }

    return {
      action: '跟练评分',
      score: Math.max(30, Math.min(98, Math.round(score))),
      message,
      cue,
      tone
    };
  }

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
    ? kneeAngles.reduce((sum, value) => sum + value, 0) / kneeAngles.length
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

  const matchResult = compareToStandardPose(pose, standardPose);
  let score = matchResult ? Math.round(matchResult.score * 0.72 + 24) : 91;
  let message = '动作标准，继续保持！';
  let cue = '核心收紧，起身时呼气发力';
  let tone = 'great';

  if (matchResult) {
    if (matchResult.score >= 86) {
      message = '跟练同步，姿态匹配良好';
      cue = '保持当前节奏，继续跟随标准动作';
      tone = 'great';
    } else if (matchResult.score >= 70) {
      message = '动作基本同步，注意细节';
      cue = '观察左侧标准动作，调整手臂和躯干位置';
      tone = 'good';
    } else {
      message = '与标准动作差异较大';
      cue = '放慢节奏，先对齐左侧标准动作姿态';
      tone = 'warn';
    }
  }

  if (averageKneeAngle > 158) {
    score -= 5;
    if (!matchResult || matchResult.score >= 70) {
      message = '开始发力，保持动作幅度';
      cue = '膝盖跟随脚尖方向，重心保持稳定';
      tone = 'good';
    }
  }

  if (averageKneeAngle < 72) {
    score -= 14;
    message = '下蹲过深，控制膝盖压力';
    cue = '大腿接近平行即可，保持稳定上推';
    tone = 'warn';
  }

  if (torsoLean > 0.46) {
    score -= 13;
    message = '胸口抬起，背部保持挺直';
    cue = '肩髋同步移动，不要塌腰';
    tone = 'warn';
  }

  if (ankleWidth > 0 && kneeWidth < ankleWidth * 0.72) {
    score -= 12;
    message = '膝盖略向外打开';
    cue = '让膝盖对齐脚尖，避免内扣';
    tone = 'warn';
  }

  return {
    action: '跟练评分',
    score: Math.max(45, Math.min(98, Math.round(score))),
    message,
    cue,
    tone
  };
}

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
    badgeTone: 'green'
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
    badgeTone: 'yellow'
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
    badgeTone: 'blue'
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
  const [device, setDevice] = useState('phone');
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
              <small>{option.meta}</small>
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

function FilterChips({ items, active = 0 }) {
  return (
    <div className="chip-row">
      {items.map((item, index) => (
        <button key={item} type="button" className={index === active ? 'active' : ''}>
          {item}
        </button>
      ))}
    </div>
  );
}

function TrainingPage({ onOpenCourse }) {
  return (
    <div className="page page-training">
      <SearchBox placeholder="搜索课程..." />
      <div className="page-title-row">
        <h2>全部课程</h2>
        <span>AI姿态评分</span>
      </div>
      <FilterChips items={['全部', '基础健身', 'HIIT', '瑜伽']} />

      <div className="course-list">
        {courses.map((course) => (
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
  const [pose, setPose] = useState(null);
  const [standardPoseData, setStandardPoseData] = useState(null);
  const [standardPose, setStandardPose] = useState(null);
  const [standardVideoSize, setStandardVideoSize] = useState({ width: 1, height: 1 });
  const [hotStats, setHotStats] = useState({ windowSize: 0, representativeIndexes: [] });
  const [videoSize, setVideoSize] = useState({ width: 1, height: 1 });
  const [motionSignals, setMotionSignals] = useState({ user: 0, standard: 0, userAverage: 0, standardAverage: 0 });
  const trainingStatus = !hasStarted ? 'idle' : isPaused ? 'paused' : 'active';
  const rawFeedback = useMemo(
    () => analyzePoseFeedback(
      pose,
      standardPose,
      seconds,
      cameraState,
      detectorState,
      course.evaluationType,
      trainingStatus,
      motionSignals
    ),
    [pose, standardPose, seconds, cameraState, detectorState, course.evaluationType, trainingStatus, motionSignals]
  );
  const [displayFeedback, setDisplayFeedback] = useState(rawFeedback);
  const feedback = displayFeedback;
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

    if (!hasStarted || isPaused) {
      video.pause();
      return;
    }

    video.play().catch(() => {});
  }, [hasStarted, isPaused]);

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

  const formatted = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  const progress = Math.min((seconds / (15 * 60)) * 100, 100);
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

      <div className="pose-panel">
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
                muted
                loop
                playsInline
                controls
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
        <div className="panel-divider" />
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
        <p>总时长 15分钟</p>
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
