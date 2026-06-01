export default {
  shared: {
    paused: {
      action: '跟练评分',
      message: '训练已暂停',
      cue: '点击继续后再恢复动作评分',
      tone: 'good'
    },
    notStarted: {
      action: '跟练评分',
      message: '准备开始',
      cue: '先调整站位，点击开始后再进行评分',
      tone: 'good'
    },
    modelLoading: {
      action: '跟练评分',
      message: '姿态模型加载中...',
      cue: '请保持全身在画面内',
      tone: 'warn'
    },
    modelError: {
      action: '跟练评分',
      message: '检测模型未加载，使用演示反馈',
      cue: '网络恢复后可自动重试模型',
      tone: 'warn'
    },
    notInFrame: {
      action: '跟练评分',
      message: '请先完整进入画面',
      cue: '当前标准动作需要更多关键点，请后退并露出上半身和手臂',
      tone: 'warn'
    },
    matching: {
      action: '跟练评分',
      message: '正在建立标准动作匹配',
      cue: '请让身体关键点更完整地进入画面',
      tone: 'warn'
    },
    warmingUp: {
      action: '跟练评分',
      message: '正在观察动作节奏',
      cue: '先跟着标准视频做完整几拍，系统会逐步更新评分',
      tone: 'warn'
    },
    notMoving: {
      action: '跟练评分',
      message: '请跟上标准动作节奏',
      cue: '标准动作正在变化，不要只保持站立姿势',
      tone: 'warn'
    },
    smallAmplitude: {
      action: '跟练评分',
      message: '动作幅度偏小',
      cue: '跟随左侧动作增加手臂或躯干活动幅度',
      tone: 'warn'
    },
    great: {
      message: '动作标准，继续保持！',
      cue: '节奏和姿态匹配良好，保持稳定呼吸',
      tone: 'great'
    },
    good: {
      message: '基本同步，注意幅度',
      cue: '观察左侧标准动作，微调手臂和躯干位置',
      tone: 'good'
    },
    warn: {
      message: '节奏或幅度有偏差',
      cue: '先放慢速度，对齐标准动作的关键姿态',
      tone: 'warn'
    },
    poor: {
      message: '与标准动作差异较大',
      cue: '建议暂停看清动作，再从当前小节重新跟练',
      tone: 'warn'
    },
    default: {
      message: '跟练同步，继续保持！',
      cue: '保持当前节奏，继续跟随标准动作',
      tone: 'great'
    },
    fallback1: {
      action: '跟练评分',
      message: '准备开始，保持节奏...',
      cue: '先观察左侧标准动作，准备跟随节奏',
      tone: 'good'
    },
    fallback2: {
      action: '跟练评分',
      message: '注意动作幅度和节奏',
      cue: '让身体关键点尽量完整入镜',
      tone: 'warn'
    },
    fallback3: {
      action: '跟练评分',
      message: '动作标准，继续保持！',
      cue: '保持稳定呼吸，跟随标准动作节奏',
      tone: 'great'
    }
  },

  'jumping-jack': {
    armsWide: {
      message: '手臂向两侧充分展开',
      cue: '双手在头顶上方靠近，手臂画大圆',
      tone: 'warn'
    },
    legsWide: {
      message: '双脚跳开幅度可以更大',
      cue: '跳跃时双脚比肩略宽，落地轻盈',
      tone: 'good'
    },
    rhythm: {
      message: '跟上开合跳节奏',
      cue: '跟随音乐节拍，手脚协调开合',
      tone: 'warn'
    },
    good: {
      message: '开合跳节奏不错！',
      cue: '保持手臂画弧与脚步的协调',
      tone: 'great'
    }
  },

  'cross-jack': {
    crossArms: {
      message: '手臂交叉幅度可以更大',
      cue: '双手在胸前交叉时尽量向对侧伸展',
      tone: 'warn'
    },
    legsWide: {
      message: '跳跃时双脚展开更大',
      cue: '手脚协调，交叉与打开交替',
      tone: 'good'
    },
    rhythm: {
      message: '跟上交叉开合节奏',
      cue: '注意手臂交叉和打开的时机',
      tone: 'warn'
    }
  },

  'high-knee': {
    kneesLow: {
      message: '膝盖抬高至髋部水平',
      cue: '大腿抬到与地面平行，核心收紧',
      tone: 'warn'
    },
    postureLean: {
      message: '上身保持直立',
      cue: '不要过度后仰，核心稳定躯干',
      tone: 'warn'
    },
    rhythm: {
      message: '加快抬腿节奏',
      cue: '双脚交替快速上提，手臂配合摆动',
      tone: 'warn'
    },
    good: {
      message: '高抬腿节奏很好！',
      cue: '保持膝高和躯干稳定',
      tone: 'great'
    }
  },

  'squat-jump': {
    tooShallow: {
      message: '下蹲幅度可以再大一些',
      cue: '大腿接近平行地面后爆发跳起',
      tone: 'warn'
    },
    explosiveUp: {
      message: '跳起时充分伸展',
      cue: '下蹲后爆发跳起，落地屈膝缓冲',
      tone: 'good'
    },
    landing: {
      message: '落地时注意屈膝缓冲',
      cue: '前脚掌先着地，膝盖不要内扣',
      tone: 'warn'
    },
    posture: {
      message: '保持背部挺直',
      cue: '胸口抬起，核心收紧',
      tone: 'warn'
    }
  },

  kick: {
    legStraight: {
      message: '踢腿时膝盖伸直',
      cue: '大腿发力带动小腿，脚尖绷直',
      tone: 'warn'
    },
    kickHeight: {
      message: '踢腿高度可以再高一些',
      cue: '髋部发力，腿伸直上踢',
      tone: 'good'
    },
    balance: {
      message: '保持身体平衡',
      cue: '支撑腿微屈，核心收紧维持稳定',
      tone: 'warn'
    }
  },

  punch: {
    armExtend: {
      message: '出拳时手臂充分伸展',
      cue: '转腰送肩，力达拳面',
      tone: 'good'
    },
    shoulderRotate: {
      message: '注意转腰带动出拳',
      cue: '核心旋转发力，不只是手臂在动',
      tone: 'warn'
    },
    guard: {
      message: '注意另一只手的防守位置',
      cue: '非出拳手保持在下巴高度',
      tone: 'good'
    }
  },

  'side-step': {
    lateralMove: {
      message: '侧向移动幅度可以更大',
      cue: '左右交替跨步，重心跟随移动',
      tone: 'good'
    },
    bounceEngage: {
      message: '保持弹跳感',
      cue: '用前脚掌着地，保持轻盈弹跳',
      tone: 'warn'
    },
    armSwing: {
      message: '手臂配合摆动',
      cue: '摆臂帮助维持节奏和平衡',
      tone: 'good'
    }
  },

  combo: {
    follow: {
      message: '跟随全身组合动作',
      cue: '注意手脚协调，跟随节拍变化',
      tone: 'good'
    },
    transition: {
      message: '注意动作之间的衔接',
      cue: '动作转换时保持节奏不中断',
      tone: 'warn'
    }
  },

  squat: {
    tooDeep: {
      message: '下蹲过深，控制膝盖压力',
      cue: '大腿接近平行即可，保持稳定上推',
      tone: 'warn'
    },
    chestUp: {
      message: '胸口抬起，背部保持挺直',
      cue: '肩髋同步移动，不要塌腰',
      tone: 'warn'
    },
    kneesInward: {
      message: '膝盖略向外打开',
      cue: '让膝盖对齐脚尖，避免内扣',
      tone: 'warn'
    },
    notDeepEnough: {
      message: '开始发力，保持动作幅度',
      cue: '膝盖跟随脚尖方向，重心保持稳定',
      tone: 'good'
    },
    good: {
      message: '跟练同步，姿态匹配良好',
      cue: '保持当前节奏，继续跟随标准动作',
      tone: 'great'
    },
    ok: {
      message: '动作基本同步，注意细节',
      cue: '观察左侧标准动作，调整手臂和躯干位置',
      tone: 'good'
    },
    off: {
      message: '与标准动作差异较大',
      cue: '放慢节奏，先对齐左侧标准动作姿态',
      tone: 'warn'
    }
  },

  'push-up': {
    notMoving: {
      message: '开始俯卧撑动作',
      cue: '双手略宽于肩，身体成一条直线',
      tone: 'warn'
    },
    deeper: {
      message: '手肘弯曲更深一些',
      cue: '胸部尽量靠近地面，保持身体稳定',
      tone: 'warn'
    },
    hipsDown: {
      message: '臀部不要塌陷',
      cue: '核心收紧，保持肩-髋-膝成一直线',
      tone: 'warn'
    },
    good: {
      message: '俯卧撑动作标准！',
      cue: '保持节奏，控制下放和推起的速度',
      tone: 'great'
    },
  },

  plank: {
    hipsHigh: {
      message: '臀部不要抬起过高',
      cue: '收紧核心，身体成一条直线',
      tone: 'warn'
    },
    good: {
      message: '平板支撑姿势标准！',
      cue: '保持呼吸均匀，核心持续发力',
      tone: 'great'
    },
  },

  core: {
    notMoving: {
      message: '腹部发力，开始卷腹',
      cue: '用腹部力量抬起上半身，不要用脖子',
      tone: 'warn'
    },
    curlMore: {
      message: '卷腹幅度可以再大一些',
      cue: '肩胛骨离开地面，感受腹肌收缩',
      tone: 'good'
    },
    good: {
      message: '核心动作标准！',
      cue: '保持腹部持续紧张，控制起落速度',
      tone: 'great'
    },
  },

  bridge: {
    notMoving: {
      message: '臀腿发力，向上推起',
      cue: '脚跟踩实地面，臀部收紧上顶',
      tone: 'warn'
    },
    liftHigher: {
      message: '臀部再抬高一些',
      cue: '肩-髋-膝成一直线，顶峰收缩臀肌',
      tone: 'good'
    },
    good: {
      message: '臀桥动作标准！',
      cue: '保持臀部高度，感受臀肌发力',
      tone: 'great'
    },
  },

  stretch: {
    enter: {
      message: '进入拉伸姿势',
      cue: '缓慢进入拉伸位置，不要突然用力',
      tone: 'good'
    },
    hold: {
      message: '保持拉伸',
      cue: '保持当前姿势，均匀呼吸不要憋气',
      tone: 'great'
    },
    deeper: {
      message: '尝试加深拉伸幅度',
      cue: '在无痛范围内逐渐增加拉伸深度',
      tone: 'good'
    },
    tooMuchMovement: {
      message: '保持静态拉伸',
      cue: '减少身体晃动，稳定在拉伸位置',
      tone: 'warn'
    },
    good: {
      message: '拉伸动作标准！',
      cue: '保持深长呼吸，感受肌肉的舒展',
      tone: 'great'
    },
  },
};
