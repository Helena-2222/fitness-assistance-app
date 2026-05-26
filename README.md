# 智能健身辅助 APP

基于 React + Vite 的智能健身辅助网页原型，包含课程跟练、社群、个人中心、智能矫正训练页。训练页支持摄像头实时人体姿态检测、关节点标注、HoT/H2OT 思路的时序平滑，以及标准动作视频骨架叠加。

## 环境要求

- Node.js 18+，推荐当前开发环境使用的 Node.js 24。
- Chrome 或 Edge 浏览器。
- 摄像头权限，用于智能矫正版实时检测用户姿态。
- 可选：FFmpeg，用于转换/处理标准动作视频。

## 安装依赖

```bash
npm install
```

## 开发运行

```bash
npm run dev -- --port 5173
```

浏览器打开：

```text
http://localhost:5173
```

页面顶部可切换手机端、平板端、电脑端预览。

## 使用流程

1. 进入首页后点击“核心力量强化”课程。
2. 选择“智能矫正版”。
3. 点击“开始训练”。
4. 同意相机权限说明。
5. 左侧显示标准动作视频和预生成标准骨架，右侧显示用户摄像头和实时检测骨架。
6. 可使用“打开相机 / 关闭相机”按钮控制摄像头。

## 构建与本地预览

生成生产构建：

```bash
npm run build
```

预览构建结果：

```bash
npm run preview -- --port 4173
```

访问：

```text
http://localhost:4173
```

## 部署

构建产物在 `dist/` 目录。将 `dist/` 部署到任意静态网站服务即可，例如 Nginx、Apache、Vercel、Netlify 或学校服务器。

摄像头 API 在现代浏览器中要求安全上下文：

- `localhost` 可以直接使用摄像头。
- 正式部署时需要使用 `https://`。
- 如果用局域网 IP 访问，部分浏览器可能拒绝摄像头权限，建议配置 HTTPS。

## 标准动作视频与姿态 JSON

当前“核心力量强化”的标准动作资源：

- 视频：`public/courses/strength1_10s.mp4`
- 姿态 JSON：`public/courses/strength1_10s_pose.json`

代码中课程配置位于 [src/App.jsx](src/App.jsx)：

```js
standardVideo: '/courses/strength1_10s.mp4',
standardPose: '/courses/strength1_10s_pose.json'
```

播放标准视频时，页面会按视频当前播放时间读取 JSON 中对应帧，并叠加标准骨架。

## 重新生成标准动作姿态 JSON

如果替换了标准动作视频，需要重新生成姿态 JSON。

先把视频放到 `public/courses/`，例如：

```text
public/courses/strength1_10s.mp4
```

然后运行：

```bash
node scripts/generate-standard-pose.mjs /courses/strength1_10s.mp4 public/courses/strength1_10s_pose.json 5 640
```

参数说明：

- 第 1 个参数：浏览器可访问的视频路径。
- 第 2 个参数：输出 JSON 文件路径。
- 第 3 个参数：采样率，默认示例为 `5` fps。
- 第 4 个参数：检测时缩放宽度，默认示例为 `640`，用于提升离线检测速度。

离线生成器使用：

- [tools/pose-generator.html](tools/pose-generator.html)
- [scripts/generate-standard-pose.mjs](scripts/generate-standard-pose.mjs)

注意：如果原视频是 HEVC/H.265 编码，Chrome 可能无法稳定读取帧。建议转为 H.264：

```bash
ffmpeg -y -i input.mp4 -c:v libx264 -pix_fmt yuv420p -preset veryfast -crf 23 -movflags +faststart -an public/courses/strength1_10s.mp4
```

## 关键实现

- `src/App.jsx`：页面、训练流程、摄像头检测、标准视频骨架叠加。
- `src/hotPose.js`：HoT/H2OT 思路的 pose token 选择、恢复和平滑。
- `src/styles.css`：手机/平板/电脑预览和训练页 UI。
- `public/courses/`：标准动作视频和姿态 JSON。

## 常见问题

**页面黑屏**

先确认依赖已安装，并重启开发服务：

```bash
npm install
npm run dev -- --port 5173
```

然后按 `Ctrl + F5` 强制刷新浏览器。

**摄像头无法打开**

确认浏览器允许 `localhost:5173` 使用摄像头。如果已拒绝权限，在浏览器地址栏左侧站点设置里重新允许摄像头。

**标准视频没有骨架**

确认 JSON 文件存在并可访问：

```text
http://localhost:5173/courses/strength1_10s_pose.json
```

如果替换过视频，请重新生成姿态 JSON。
