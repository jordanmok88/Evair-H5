# Evair-H5 设计风格文档

> 技术栈: Vite + React 19 + TypeScript + Tailwind CSS 4 + Lucide React
> 设计风格: 现代扁平化 + 玻璃拟态 (Glassmorphism)

---

## 一、品牌色彩系统

### 1.1 主品牌色 (Tailwind @theme 变量)

| 变量名          | 色值      | Tailwind 类名     | 应用场景                     |
|-----------------|-----------|-------------------|------------------------------|
| `brand-orange`  | `#FF6600` | `bg-brand-orange` | 主按钮、CTA、活跃态、强调元素 |
| `brand-red`     | `#CC0000` | `bg-brand-red`    | 促销标签、高亮角标           |
| `brand-yellow`  | `#FFCC33` | `bg-brand-yellow` | 特殊高亮装饰                 |
| `slate-850`     | `#1e293b` | `bg-slate-850`    | 深色背景区域                 |

### 1.2 全局背景与中性色

| 用途           | 色值       | Tailwind 类名       |
|----------------|------------|---------------------|
| **全局背景色** | `#F2F4F7`  | `bg-[#F2F4F7]`      |
| **卡片背景**   | `#FFFFFF`  | `bg-white`          |
| **文字主色**   | `#0f172a`  | `text-slate-900`    |
| **文字次色**   | `#64748b`  | `text-slate-500`    |
| **文字弱色**   | `#94a3b8`  | `text-slate-400`    |
| **文字极弱**   | `#8E8E93`  | 内联 style          |
| **边框默认**   | `#e2e8f0`  | `border-slate-200`  |
| **浅填充色**   | `#f1f5f9`  | `bg-slate-100`      |
| **输入框背景** | `#f8fafc`  | `bg-slate-50`       |

### 1.3 功能语义色

| 状态         | 前景色     | 背景色     | 边框色 (如有) |
|--------------|------------|------------|---------------|
| **成功**     | `#22c55e`  | `#dcfce7`  | `#bbf7d0`     |
| **成功深色** | `#15803d`  | —          | —             |
| **警告**     | `#F59E0B`  | `#fef3c7`  | `#fed7aa`     |
| **警告深色** | `#D97706`  | —          | —             |
| **错误**     | `#EF4444`  | `#fee2e2`  | `#fecaca`     |
| **信息**     | `#3B82F6`  | `#dbeafe`  | —             |
| **紫色强调** | `#8B5CF6`  | `#f3e8ff`  | —             |

### 1.4 状态徽章配色

| 状态语义   | 背景色     | 文字色    |
|------------|------------|-----------|
| 已激活     | `#dcfce7`  | `#15803d` |
| 处理中     | `#dbeafe`  | `#1d4ed8` |
| 待处理     | `#fef3c7`  | `#a16207` |
| 已失效     | `#fee2e2`  | `#b91c1c` |
| 未激活     | `#f1f5f9`  | `#64748b` |
| 进行中     | `#fef9c3`  | `#a16207` |

### 1.5 进度指示配色

| 进度级别  | 颜色       |
|-----------|------------|
| 弱 (低)   | `#ef4444`  |
| 中        | `#f59e0b`  |
| 强 (高)   | `#22c55e`  |

---

## 二、渐变配置

### 2.1 线性渐变

```css
/* 主按钮渐变 */
linear-gradient(135deg, #FF6600 0%, #FF8A3D 100%)

/* 深色 Hero 渐变 */
linear-gradient(135deg, #FF6600 0%, #CC0000 100%)

/* 深色卡片渐变 */
linear-gradient(135deg, #1e293b 0%, #334155 100%)

/* 浅色 Hero 渐变 */
linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 40%, #FEF3C7 100%)

/* 头部渐变 (180deg) */
linear-gradient(180deg, #FF6600 0%, #FF8533 100%)

/* 进度条 — 正常 */
linear-gradient(90deg, #FF6600, #FF8A3D)

/* 进度条 — 警告 */
linear-gradient(90deg, #F59E0B, #EF4444)

/* 指示条 (90deg) */
linear-gradient(90deg, #FF6600, #FF8533)

/* 深色页面渐变 */
linear-gradient(135deg, #1a0a00 0%, #3d1800 50%, #5c2600 100%)
```

### 2.2 径向渐变

```css
/* 光晕装饰 */
radial-gradient(circle at 70% 30%, #FF6600 0%, transparent 70%)

/* 促销光晕 */
radial-gradient(circle, #FFCC33 0%, transparent 70%)

/* 动态光斑 (Tailwind 语法) */
bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))]
from-white/10 via-transparent to-transparent
```

### 2.3 重复纹理

```css
/* 斜线纹理 A */
repeating-linear-gradient(45deg, transparent, transparent 14px, #FF660012 14px, #FF660012 15px)

/* 斜线纹理 B */
repeating-linear-gradient(45deg, transparent, transparent 10px, #FF6600 10px, #FF6600 11px)
```

---

## 三、阴影系统

### 3.1 Tailwind 阴影类

| 类名                       | 应用场景           |
|----------------------------|--------------------|
| `shadow-sm shadow-black/5` | 默认卡片           |
| `shadow-md`                | 悬停、选中态卡片   |
| `shadow-lg`                | 底部导航、主按钮   |
| `shadow-xl`                | Hero 按钮          |
| `shadow-2xl`               | Hero 卡片、弹窗    |
| `shadow-orange-500/20`     | 主按钮品牌投影     |
| `shadow-orange-900/20`     | Hero 卡片品牌投影  |
| `shadow-green-900/5`       | 推荐项卡片投影     |
| `shadow-slate-200`         | 导航栏投影         |

### 3.2 内联 box-shadow

```css
/* 选中态卡片 */
box-shadow: 0 8px 30px rgba(255, 102, 0, 0.15), 0 2px 8px rgba(0,0,0,0.06)

/* 默认卡片 */
box-shadow: 0 2px 8px rgba(0,0,0,0.05)

/* 渐变按钮 */
box-shadow: 0 4px 14px rgba(255,102,0,0.25)

/* 桌面端 Phone Frame */
box-shadow: 0 50px 100px -20px rgba(0,0,0,0.25)

/* 极轻微 */
box-shadow: 0 1px 3px rgba(0,0,0,0.04)

/* 轻微 */
box-shadow: 0 2px 12px rgba(0,0,0,0.06)

/* 手势指示器 */
box-shadow: 0 2px 12px rgba(255,102,0,0.3)
```

---

## 四、圆角系统

| 数值       | Tailwind 类名        | 应用场景               |
|------------|----------------------|------------------------|
| 2px        | 内联 `borderRadius`  | 细线指示条             |
| 4px        | `rounded`            | 极小装饰、缩略图       |
| 6px        | 内联 `borderRadius`  | 小标签、步骤编号       |
| 8px        | `rounded-lg`         | 小图标容器、徽章       |
| 10px       | 内联 `borderRadius`  | 输入框                 |
| 12px       | `rounded-xl`         | 卡片、按钮、图标容器   |
| 14px       | 内联 `borderRadius`  | 弹窗按钮               |
| 16px       | `rounded-2xl`        | 大卡片、弹窗容器       |
| 20px       | 内联 `borderRadius`  | 列表项、弹窗容器       |
| 24px       | `rounded-[1.5rem]`   | 玻璃态卡片             |
| 40px       | `rounded-[2.5rem]`   | Hero 大卡片、玻璃容器  |
| 56px       | `rounded-[3.5rem]`   | 桌面 Phone Frame       |
| 9999px     | `rounded-full`       | 圆形头像、胶囊标签     |

---

## 五、边框系统

### 5.1 默认

```css
border: 1px solid #e2e8f0   /* Tailwind: border-slate-200 */
border: 1px solid #e5e7eb   /* 更浅灰 */
```

### 5.2 选中/强调

```css
border: 2px solid #FF6600            /* 主色选中 */
border: 1.5px solid #FBBF24          /* 警告强调 */
border: 2px solid white              /* 装饰按钮 */
```

### 5.3 玻璃态

```css
border-white/60         /* 玻璃卡片 */
border-white/50         /* 图标容器 */
border-white/20         /* Hero 内按钮 */
border-white/10         /* 步骤卡片 */
border-orange-100/60    /* 底部导航顶线 */
```

### 5.4 输入框

```css
/* 聚焦 */
focus:border-brand-orange focus:ring-1 focus:ring-brand-orange

/* 错误 */
border-red-400 focus:border-red-400 focus:ring-red-400
```

---

## 六、字体系统

### 6.1 字体族

| 用途         | 字体       | Tailwind 变量   |
|--------------|------------|------------------|
| 全局主字体   | Inter      | `--font-sans`    |
| 等宽数字     | monospace  | `font-mono`      |
| 系统后备     | system-ui  | 内联 style       |

### 6.2 字号规范

| 像素值   | Tailwind 类名       | 应用层级           |
|----------|---------------------|--------------------|
| 30px     | `text-3xl`          | 大区标题           |
| 26px     | `text-[26px]`       | 区块大标题         |
| 24px     | `text-2xl`          | 页面主标题         |
| 20px     | `text-xl`           | 重点数据展示       |
| 18px     | `text-lg`           | 导航栏标题         |
| 16px     | `text-base`         | 正文、CTA 按钮文字 |
| 15px     | `text-[15px]`       | 卡片标题           |
| 14px     | `text-sm`           | 正文辅助           |
| 13px     | `text-[13px]`       | 辅助描述           |
| 12px     | `text-xs`           | 标签、提示         |
| 11px     | `text-[11px]`       | 上标说明           |
| 10px     | `text-[10px]`       | 极小标注           |

### 6.3 字重规范

| 字重 | Tailwind 类名      | 应用层级               |
|------|--------------------|------------------------|
| 400  | `font-normal`      | 正文内容               |
| 500  | `font-medium`      | 辅助文字、非活跃项     |
| 600  | `font-semibold`    | 副标题、标签文字       |
| 700  | `font-bold`        | 标题、按钮、活跃项     |
| 800  | `font-extrabold`   | 区块大标题             |

### 6.4 字间距

| 用途     | 值                       |
|----------|--------------------------|
| 紧凑     | `tracking-tight`         |
| 正常     | 默认                     |
| 宽松     | `tracking-wide`          |
| 极宽     | `tracking-[0.15em]`      |
| 负间距   | `letterSpacing: -0.02em` |
| 大写间距 | `tracking-wider`         |

### 6.5 文本转换

| 场景     | Tailwind 类名 |
|----------|---------------|
| 大写标签 | `uppercase`   |
| 正常     | 默认          |
| 斜体     | Logo 文字     |

---

## 七、间距系统

### 7.1 页面级间距

| 场景             | 移动端          | 桌面端 (>=640px) |
|------------------|-----------------|------------------|
| 左右内边距       | `px-4` (16px)   | `px-4` (16px)    |
| 中屏左右内边距   | —               | `md:px-8` (32px) |
| 顶部安全区       | 12px            | 20px             |
| 底部安全区       | 2px             | 32px             |
| PWA 顶部安全区   | env(safe-area-inset-top, 20px)    | —  |
| PWA 底部安全区   | env(safe-area-inset-bottom, 20px) | — |

### 7.2 卡片级间距

| 场景         | 值          | Tailwind 类名                 |
|--------------|-------------|-------------------------------|
| 卡片内边距   | 16-20px     | `p-4` / `p-5`                 |
| 卡片间距     | 12-20px     | `gap-3` / `gap-4` / `gap-5`   |
| 元素内间距   | 12-16px     | `gap-3` / `gap-4`             |
| 小元素间距   | 8px         | `gap-2`                       |
| 底部外间距   | 16-20px     | `mb-4` / `mb-5`               |

### 7.3 按钮内边距

| 按钮类型     | 垂直           | 水平            |
|--------------|----------------|-----------------|
| 大按钮       | `py-3.5` (14px) | `px-8` (32px)   |
| 主按钮       | `py-3` (12px)   | `w-full`        |
| 次按钮       | `py-2.5` (10px) | `px-5` (20px)   |
| 小按钮       | `py-2` (8px)    | `px-4` (16px)   |
| 胶囊标签按钮 | `py-1.5` (6px)  | `px-3.5` (14px) |
| 注册大按钮   | `py-4` (16px)   | `w-full`        |

---

## 八、Z-Index 层级

| 层级     | 应用场景       |
|----------|----------------|
| z-10     | 粘性头部       |
| z-50     | 底部导航、状态栏 |
| z-[60]   | 弹窗           |
| z-100    | 全屏覆盖层     |
| z-200    | Toast 通知     |
| z-[9999] | 全屏工具       |

---

## 九、玻璃态设计 (Glassmorphism)

### 9.1 底部导航栏

```tsx
bg-white/90 backdrop-blur-2xl backdrop-saturate-150
border-t border-orange-100/60
```

### 9.2 网格操作卡片

```tsx
bg-white/60 backdrop-blur-xl border border-white/60
rounded-[1.5rem] shadow-sm shadow-black/5
```

### 9.3 粘性头部

```tsx
bg-white/90 backdrop-blur-xl
border-b border-slate-100
```

### 9.4 Hero 浮动容器

```tsx
bg-gradient-to-tr from-white/10 to-white/5
backdrop-blur-sm border border-white/20
rounded-[2.5rem] shadow-2xl
```

### 9.5 Hero 内按钮

```tsx
w-10 h-10 rounded-full bg-white/10 backdrop-blur-md
border border-white/20 hover:bg-white/20
```

### 9.6 弹窗遮罩

```tsx
bg-slate-900/40 backdrop-blur-sm   /* 轻遮罩 */
bg-black/50                         /* 重遮罩 */
```

---

## 十、动画与过渡效果

### 10.1 CSS @keyframes

```css
/* 呼吸发光 */
@keyframes donut-breathe {
  0%, 100% { filter: drop-shadow(0 0 4px rgba(255, 150, 0, 0.15)); }
  50%      { filter: drop-shadow(0 0 12px rgba(255, 150, 0, 0.5)); }
}
animation: donut-breathe 3s ease-in-out infinite;

/* 打字指示器弹跳 */
@keyframes typingBounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30% { transform: translateY(-4px); opacity: 1; }
}
animation: typingBounce 1.2s ease-in-out infinite;
```

### 10.2 过渡效果

| 场景               | CSS 值                                        |
|--------------------|-----------------------------------------------|
| 列表展开/收起       | `all 0.35s cubic-bezier(0.4, 0, 0.2, 1)`     |
| Tab 滑块           | `all 0.3s ease-out`                           |
| 边框 + 阴影        | `border 0.2s, box-shadow 0.2s`               |
| 背景色             | `background-color 0.2s`                       |
| 文字颜色           | `color 0.2s`                                  |
| 透明度             | `opacity 0.15s` / `opacity 0.2s ease`         |
| 缩放               | `transform 0.2s ease`                         |
| 通用快速           | `all 0.15s` / `all 0.2s ease`                 |
| 通用中速           | `all 0.3s ease`                               |
| Hero 悬浮          | `transform 0.5s (hover:scale-105)`            |
| 网格图标悬浮       | `transform duration-300 (hover:scale-110)`    |

### 10.3 交互反馈 (缩放)

| 场景             | 缩放值      |
|------------------|-------------|
| 轻微按下         | `active:scale-[0.99]` (0.99) |
| 标准按下         | `active:scale-[0.98]` (0.98) |
| 重度按下         | `active:scale-95` (0.95)    |
| 轻微悬停         | `hover:scale-105` (1.05)    |
| 重度悬停         | `group-hover:scale-110` (1.10) |

### 10.4 入场动画

```tsx
// 淡入 + 从底部滑入
animate-in fade-in slide-in-from-bottom-10 duration-300

// 快速淡入
animate-in fade-in duration-200

// 缩放入场
animate-in zoom-in-95 duration-150
```

### 10.5 内置动画

| 类名             | 场景           |
|------------------|----------------|
| `animate-pulse`  | 背景光晕脉动   |
| `animate-spin`   | 加载旋转       |
| `animate-bounce` | 弹跳效果       |

---

## 十一、手势交互

### 左边缘滑动返回

```typescript
const EDGE_ZONE = 28;         // 左侧边缘监听区域 (px)
const TRIGGER_DISTANCE = 80;   // 触发回调的滑动距离 (px)
const MAX_Y_DRIFT = 60;        // 垂直漂移容忍度 (px)

// 指示器
width: 36px; height: 36px; borderRadius: '50%';
background: 'rgba(255,102,0,0.85)';
boxShadow: '0 2px 12px rgba(255,102,0,0.3)';
transition: 'opacity 0.15s';
// 满进度: bg = 'rgba(255,102,0,1)', size = 40px
```

---

## 十二、Logo 设计

```svg
<!-- 512x512 viewBox, 圆角矩形背景 -->
<rect width="512" height="512" rx="96" fill="#FFFFFF"/>
<!-- 品牌文字: 粗体斜体, #FF6600 -->
<text font-size="190" font-weight="bold" font-style="italic" fill="#FF6600">Evair</text>
<!-- 副标题背景条: #FF6600, 圆角 24px -->
<rect x="56" y="290" width="400" height="160" rx="24" fill="#FF6600"/>
<!-- 副标题文字: 粗体, #FFFFFF -->
<text font-size="160" font-weight="bold" fill="#FFFFFF">SIM</text>
```

**PWA 主题色**: `#FF6600` | **背景色**: `#FFFFFF`

---

## 十三、通用组件样式模式

### 13.1 底部导航

```
容器: fixed bottom-0, bg-white/90, backdrop-blur-2xl
  border-t border-orange-100/60
图标容器: 30x30px, borderRadius: 10px
  活跃: bg #FFF3EB
  非活跃: bg transparent
指示条: 28x2.5px, borderRadius: 2px
  gradient 90deg #FF6600 -> #FF8533
标签: fontSize 10px
  活跃: fontWeight 700, color #FF6600
  非活跃: fontWeight 500, color #8E8E93
徽章: min 15x15px, borderRadius 8px
  bg #EF4444, color #fff, fontSize 8, fontWeight 800
  border: 2px solid white
```

### 13.2 Hero 卡片

```
容器: aspect-ratio 4/5, max-height 420px, borderRadius 40px
  shadow-2xl shadow-orange-900/20, ring-1 ring-black/5
背景: gradient-to-br from-slate-900 via-slate-800 to-brand-orange
光斑: radial-gradient from-white/10, opacity-50, blur-3xl
玻璃容器: 160x160px, bg-gradient-to-tr from-white/10 to-white/5
  backdrop-blur-sm, borderRadius 40px, border border-white/20
中心光晕: bg-brand-orange, borderRadius 32px
  blur-2xl, opacity-40, animate-pulse
```

### 13.3 网格操作卡片

```
容器: bg-white/60, backdrop-blur-xl, border border-white/60
  rounded-[1.5rem], p-4, shadow-sm shadow-black/5
图标容器: 56x56px (w-14 h-14), rounded-full
  bg-white/80, border border-white/50, shadow-sm
  图标: size 26px, strokeWidth 1.5, color brand-orange
标签: font-semibold, text-[15px], color slate-700, tracking-tight
```

### 13.4 列表项卡片

```
容器: height 72px, borderRadius 20px, bg #ffffff
  padding: 0 16px, gap: 12px
选中态:
  border: 2px solid #FF6600
  box-shadow: 0 8px 30px rgba(255,102,0,0.15), 0 2px 8px rgba(0,0,0,0.06)
默认态:
  border: 1px solid #e2e8f0
  box-shadow: 0 2px 8px rgba(0,0,0,0.05)
警告态:
  border: 1.5px solid #FBBF24
```

### 13.5 粘性页面头部

```
容器: bg-white/90, backdrop-blur-xl
  pt-safe, px-4, pb-3
  sticky top-0, z-10, border-b border-slate-100
返回按钮: w-9 h-9, rounded-full
  text-slate-500, hover:bg-slate-100, active:scale-95
标题: text-lg, font-bold, text-slate-900
```

### 13.6 登录/注册弹窗

```
遮罩: fixed inset-0, z-[60], bg-slate-900/40, backdrop-blur-sm
弹窗: bg-white, max-w-sm (384px), rounded-2xl, p-5
  shadow-2xl, max-h-[85vh]
输入框: bg-slate-50, border-slate-200, rounded-xl
  py-2.5, pl-12, pr-4, text-sm
  focus:border-brand-orange focus:ring-1 focus:ring-brand-orange
标签: text-xs, font-semibold, text-slate-500, uppercase
主按钮: bg-brand-orange, text-white, py-3.5, rounded-xl
  font-bold, shadow-lg shadow-orange-500/20, active:scale-[0.98]
渐变按钮: gradient 135deg #FF6600 -> #FF8A3D
  boxShadow: 0 4px 14px rgba(255,102,0,0.25)
图标容器: w-14 h-14, bg-orange-50, rounded-xl
```

### 13.7 聊天界面

```
头部: gradient 180deg #FF6600 -> #FF8533
  rounded-b-2xl, shadow-md
在线指示: w-1.5 h-1.5, rounded-full, bg-emerald-400
返回按钮: w-9 h-9, rounded-full, bg-white/20
AI 头像: w-9 h-9, rounded-xl, bg-white, shadow-sm
用户头像: w-9 h-9, rounded-full
  bg-gradient(135deg, #FF6600, #FF8A3D), text-white
AI 气泡: bg-white, rounded-2xl, p-3.5, shadow-sm
用户气泡: bg-brand-orange, rounded-2xl, p-3.5
  shadow-lg shadow-orange-500/20
打字指示: 3个圆点, size 6px
  animation: typingBounce 1.2s ease-in-out infinite
输入框: bg-white, rounded-2xl, border-slate-200, px-4, py-3
发送按钮: w-9 h-9, rounded-full, bg-brand-orange
  shadow-md shadow-orange-200
```

### 13.8 Tab 切换器

```
容器: bg-slate-100, rounded-xl, p-1
滑块: bg-brand-orange, rounded-lg
  shadow-md shadow-orange-200/50, transition-all 0.3s
按钮: py-2.5, rounded-lg, text-sm, font-bold
  活跃: text-white
  非活跃: text-slate-500
```

### 13.9 方案/产品卡片

```
卡片: bg-white, rounded-xl, p-4
  border-slate-100, shadow-sm, hover:shadow-md, transition-all
推荐标签: bg-brand-orange, text-white
  text-[11px], font-semibold, uppercase, tracking-wider
  px-2.5, py-0.5, rounded-full, absolute -top-2.5
热门标签: bg-brand-red, text-white
  text-[11px], font-semibold, px-2.5, py-1
  rounded-bl-xl, rounded-tr-xl
功能网格: grid-cols-3, gap-2
  每格: bg-slate-50, rounded-xl, py-2.5, px-2, border-slate-100
```

### 13.10 浅色 Hero Banner

```
背景: gradient 135deg #FFF7ED -> #FFEDD5 (40%) -> #FEF3C7 (100%)
  rounded-2xl, overflow-hidden
斜线纹理: repeating-linear-gradient(45deg), opacity-[0.35]
径向光晕: circle at 70% 30%, #FF6600 -> transparent, opacity-20
图标容器: w-11 h-11, rounded-xl
  gradient 135deg #FF6600 -> #FF8A3D, shadow-sm
```

### 13.11 时间线/进度步骤

```
进度条: h-1.5, w-full, rounded-full
  完成: bg-brand-orange
  未完成: bg-slate-200
节点 (完成): w-3 h-3, rounded-full, bg-brand-orange
  ring-4 ring-orange-100
节点 (历史): bg-slate-300
连接线: w-0.5, flex-1, bg-slate-200
步骤指示器: w-9 h-9, rounded-full
  完成: bg-brand-orange, text-white
  当前: bg-orange-50, text-brand-orange, ring-2 ring-brand-orange
  未完成: bg-slate-100, text-slate-400
```

### 13.12 菜单列表

```
菜单组: bg-white, rounded-xl, shadow-sm
  border-slate-100, mb-5, overflow-hidden
菜单项: p-4, active:bg-slate-50
  border-b border-slate-100 (非最后一项)
右箭头: text-slate-300, ChevronRight, size 18px
危险按钮: bg-red-50, text-red-500, border-red-100
  py-3, rounded-xl, font-semibold, text-sm
  hover:bg-red-100, active:scale-[0.98]
```

### 13.13 空状态

```
容器: flex-col, items-center, justify-center
  min-h-[60vh], px-8
占位图形: bg-white, rounded-2xl
  border-slate-200, shadow-sm, p-5
占位条: h-3, bg-slate-100, rounded-full
操作按钮: w-16 h-16, rounded-full
  bg-[#E8EAEF], border-4 border-[#F2F4F7]
  shadow-md, text-slate-400
CTA: bg-brand-orange, text-white, w-40, py-3
  rounded-xl, font-bold, shadow-lg shadow-orange-500/15
```

### 13.14 环形仪表盘

```
半径: 80px | 描边宽度: 22px | 总段数: 46 | 间隙比例: 0.3
颜色渐变 (按值递减):
  t < 0.25: lerp(#FBBF24, #F97316)    黄 -> 橙
  t < 0.50: lerp(#F97316, #EF4444)    橙 -> 红
  t < 0.75: lerp(#EF4444, #EC4899)    红 -> 粉
  t >= 0.75: lerp(#EC4899, #A855F7)   粉 -> 紫
未使用段: #D1D5DB
呼吸动画: donut-breathe 3s ease-in-out infinite
```

### 13.15 通知卡片

```
已读: bg-white, border-slate-100
未读: bg-white, border-l-[3px], shadow-sm
图标容器: w-11 h-11, rounded-xl
未读左边框色: 红/橙/绿/紫/蓝 (按通知类型)
操作按钮: text-[13px], font-bold, rounded-full
  px-3.5, py-1.5
```

### 13.16 通知类型配色

| 类型         | 图标色     | 图标背景   |
|--------------|------------|------------|
| 紧急         | `#EF4444`  | `#FEF2F2`  |
| 即将到期     | `#F59E0B`  | `#FFFBEB`  |
| 确认         | `#10B981`  | `#ECFDF5`  |
| 推广         | `#8B5CF6`  | `#F5F3FF`  |
| 服务         | `#3B82F6`  | `#EFF6FF`  |

---

## 十四、桌面端 Phone Frame

```tsx
// 外层
lg:bg-[#E5E5E5] lg:h-full lg:min-h-screen
lg:flex lg:items-center lg:justify-center lg:p-8

// 框架
w-full lg:max-w-[430px] lg:h-[880px] bg-[#F2F4F7]
lg:rounded-[3.5rem] lg:overflow-hidden
lg:shadow-[0_50px_100px_-20px_rgba(0,0,0,0.25)]
lg:border-[8px] lg:border-slate-900 lg:ring-1 lg:ring-black/50

// 模拟刘海
hidden lg:block h-[54px]
  w-[126px] h-[37px] bg-black rounded-[24px]
```

---

## 十五、图标系统

### 15.1 图标库

**Lucide React**
- 常用 strokeWidth: 1.5 (轻量) / 2 (标准) / 2.5 (粗)
- 常用尺寸: 14 / 16 / 18 / 20 / 22 / 24 / 26 / 28 / 32 / 80 px

### 15.2 图标尺寸与场景

| 尺寸 (px) | 应用场景                             |
|-----------|--------------------------------------|
| 6         | 打字指示器圆点                       |
| 8         | 警告小图标、徽章                     |
| 14        | 操作按钮图标、表单图标前缀           |
| 16        | 状态栏图标、AI 头像图标              |
| 18        | 返回箭头、关闭按钮                   |
| 20        | 头部按钮、Hero 内按钮图标            |
| 22        | 导航返回                             |
| 24        | 主操作按钮、Hero 徽章                |
| 26        | 网格操作图标、底部导航图标           |
| 28        | 弹窗大图标                           |
| 32        | 空状态添加按钮图标                   |
| 64        | 弹窗状态图标 (成功/错误)             |
| 80        | Hero 中心图标                        |

### 15.3 自定义 SVG 图标

底部导航使用 4 个自定义 SVG 图标，统一 26x26px：
- 带芯片图案的卡类图标
- 信封类图标
- 用户头像轮廓图标

---

## 十六、滚动与布局

```css
/* 隐藏滚动条 */
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

/* 禁止过度滚动 */
overscroll-behavior: none;

/* 标准页面布局 */
lg:h-full flex flex-col bg-[#F2F4F7] no-scrollbar

/* 可滚动内容区 */
lg:flex-1 lg:min-h-0 lg:overflow-y-auto no-scrollbar

/* 固定头部 */
shrink-0 sticky top-0 z-10

/* 滚动监听 */
passive: true
scrollThreshold: 10px  /* 头部显隐阈值 */
```

---

## 十七、Opacity 值规范

| 值   | 应用场景                     |
|------|------------------------------|
| 1.0  | 默认不透明                   |
| 0.85 | 堆叠卡片非选中项             |
| 0.80 | 文字半透明 (text-white/80)   |
| 0.60 | 文字弱透明 (text-white/60)   |
| 0.50 | Hero 光斑                    |
| 0.35 | 斜线纹理                     |
| 0.25 | 普通透明                     |
| 0.20 | Hero 光晕                    |
| 0.15 | 呼吸动画初始值               |
| 0.10 | Hero 光斑背景                |
| 0.06 | 极轻微透明                   |

---

## 十八、特殊效果

```css
mix-blend-mode: screen              /* Hero 光斑混合 */
will-change: filter                 /* 呼吸动画性能优化 */
-webkit-tap-highlight-color: transparent  /* 移除移动端点击高亮 */
```

---

## 十九、响应式断点

| 断点        | 宽度     | 表现                           |
|-------------|----------|--------------------------------|
| 移动端      | < 640px  | 全屏布局                       |
| 桌面端      | >= 640px | Phone Frame 居中展示           |
| PWA 独立    | standalone | Safe Area 原生适配           |

---

## 二十、设计风格总结

### 核心原则

1. **移动优先** — 以移动端为主要设计目标，桌面端 Phone Frame 展示
2. **橙色品牌** — `#FF6600` 贯穿所有交互元素和强调点
3. **玻璃态美学** — 大量使用 `backdrop-blur` + 半透明背景
4. **大圆角** — 卡片 12-20px，Hero 40px，按钮 12-16px
5. **微交互** — 按下缩放、悬停阴影、呼吸发光、弹性过渡
6. **浅色主题** — 全局背景 `#F2F4F7`，无深色模式
7. **统一间距** — 基于 4px 网格
8. **安全区适配** — iOS / Android Safe Area 完整支持

### 设计关键词

```
Modern / Clean / Minimal / Glassmorphism
Warm Orange (#FF6600) / Light Gray Background (#F2F4F7)
Large Border Radius / Soft Multi-layer Shadows
Micro-interactions / Smooth Elastic Transitions
Mobile-First / PWA Ready
```

### 配色速查

```
主色:   #FF6600 (橙)
辅助:   #CC0000 (红) / #FFCC33 (黄)
背景:   #F2F4F7 (浅灰蓝)
卡片:   #FFFFFF (白)
深色:   #1e293b (深灰蓝) / #1c1c1e (近黑)
文字:   #0f172a / #64748b / #94a3b8 / #8E8E93
```

---

## 二十一、深色模式页面样式

项目中存在一个完整的深色界面 (订单结果页)，使用 `#1c1c1e` 作为深色背景：

```
页面背景: bg-[#1c1c1e]
头部文字: text-white, text-xl, font-bold, tracking-tight
辅助文字: text-white/60, text-sm
按钮: bg-white/10, p-2, rounded-full, text-white
  hover:bg-white/20, backdrop-blur-md

QR码容器: bg-white, rounded-2xl, px-5, py-4
  内部: bg-slate-50, p-2, rounded-xl, border-slate-100
  占位: bg-slate-900, rounded-lg, text-white/60

复制按钮: 两种状态
  默认: bg-orange-50, text-brand-orange, border-orange-100, hover:bg-orange-100
  已复制: bg-emerald-50, text-emerald-600, border-emerald-200

信息卡片: bg-white/5, rounded-xl, p-3.5, border-white/10
标签文字: text-white/50, text-[11px], uppercase, font-bold, tracking-wider
内容区域: bg-black/40, p-3, rounded-lg, border-white/5
代码文字: text-white, font-mono, text-sm

已复制状态: bg-emerald-500/10, border-emerald-500/30
默认状态: bg-white/5, border-white/10

邮件提示条: bg-emerald-500/15, rounded-xl, py-2, px-3
  图标: text-emerald-400, size 14
  文字: text-emerald-400, text-xs, font-medium

底部按钮: bg-brand-orange, text-white, py-3.5, rounded-2xl
  font-bold, shadow-lg shadow-orange-500/20
```

---

## 二十二、底部弹出式弹窗 (Bottom Sheet)

移动端使用底部弹出，桌面端居中弹出：

```
遮罩: bg-black/20, backdrop-blur-sm

弹窗容器 (移动端):
  w-full, rounded-t-2xl (顶部圆角)
  max-h-[70vh], shadow-2xl, overflow-hidden

弹窗容器 (桌面端):
  md:w-[80%], md:max-w-md, lg:w-[90%], lg:max-w-sm
  md:rounded-2xl (全圆角)
  max-h-[80vh]

内边距: p-5
头部: flex justify-between, items-center, mb-5
关闭按钮: p-1.5 或 p-2, bg-slate-100, rounded-full
  text-slate-500, hover:bg-slate-200

订单摘要卡片: bg-slate-50, border-slate-100
  p-3.5 或 p-4, rounded-xl, mb-4 或 mb-5
  标签: text-[10px], font-semibold, text-slate-400
    uppercase, tracking-wider
  分隔线: border-t border-slate-200, mt-2.5, pt-2.5

表单标签: text-xs 或 text-[10px], font-semibold
  text-slate-400, uppercase, tracking-wider, mb-1.5 或 mb-2

错误提示: bg-red-50, border-red-200, rounded-xl
  text-red-700, text-xs, font-medium, p-3

类型提示卡片: bg-orange-50, border-orange-100, rounded-xl
  p-4, text-brand-orange
  标签: text-xs, font-semibold, uppercase, tracking-wider, opacity-70

禁用态: disabled:opacity-50, disabled:cursor-not-allowed
悬停态: hover:bg-orange-600 (按钮)
```

---

## 二十三、成功覆盖层

```
容器: absolute inset-0, z-[70]
  bg-white/60, backdrop-blur-3xl
  flex flex-col, items-center, justify-center, p-6
  animate-in fade-in duration-300

成功图标: w-24 h-24 (96px), bg-green-100, rounded-full
  flex items-center justify-center, mb-6
  animate-bounce, shadow-lg
  图标: size 48, color #34C759 (iOS 绿)

标题: text-2xl, font-bold, text-slate-900, mb-2, tracking-tight
描述: text-slate-500, text-center, mb-8, font-medium
加载器: animate-spin, text-brand-orange
```

---

## 二十四、步骤指示器 (Journey Stepper)

```
步骤图标: w-8 h-8, rounded-full
  完成: bg-green-500, text-white
    图标: Check, size 14, strokeWidth 3
  当前: bg-brand-orange, text-white
    shadow-md, shadow-orange-200
  未完成: bg-slate-100, text-slate-300

步骤标签: text-[10px], font-semibold, leading-tight
  完成: text-green-600
  当前: text-brand-orange
  未完成: text-slate-300

连接线: flex-1, h-0.5, mx-1, rounded-full, -mt-4
  完成: bg-green-400
  未完成: bg-slate-100

步骤最小宽度: minWidth: 52 (内联 style)

分隔线+文字组合:
  水平线: flex-1, h-px, bg-slate-100
  文字: text-[11px], font-semibold, text-slate-300
    uppercase, tracking-wider

操作按钮:
  次要: py-3, rounded-xl, bg-slate-100, text-slate-700
    font-semibold, text-sm, hover:bg-slate-200
  主要: gradient 135deg #FF6600 -> #FF8A3D
    py-3.5, rounded-xl, font-bold, text-[15px], text-white
    boxShadow: 0 4px 14px rgba(255,102,0,0.25)
```

---

## 二十五、信息提示条

```
成功提示: flex items-center, gap-3, p-3, rounded-xl
  border-green-200, bg-gradient-to-r from-green-50 to-emerald-50
  图标容器: w-9 h-9, rounded-xl, bg-green-100
    图标: size 16, text-green-600
  标题: text-sm, font-bold, text-green-900
  描述: text-[11px], text-green-700/70

促销提示 (内联): bg-brand-red, text-white
  text-[11px], font-semibold, px-2, py-0.5, rounded-full

功能提示 (内联):
  自动激活: text-emerald-600, font-medium
  有效期: text-slate-500, font-medium
  多国家: text-blue-500, font-medium
  描述: text-slate-400, font-medium
  以上均: text-[11px], flex items-center, gap-1

网络标签: bg-emerald-50, text-emerald-600
  px-2, py-0.5, rounded-full, text-[11px], font-semibold
  uppercase, tracking-wide, border border-emerald-100
  图标: Signal, size 10

VPN 标签: bg-blue-50, text-blue-600
  px-2, py-0.5, rounded-full, text-[11px], font-semibold
  uppercase, tracking-wide, border border-blue-100

即时激活标签: text-brand-orange, bg-orange-50
  px-2, py-0.5, rounded-full, text-[11px], font-semibold
  border border-orange-100
```

---

## 二十六、列表项次级状态色

```
副标题颜色 (列表项):
  信息/蓝色: #3b82f6
  警告/橙色: #f97316
  成功/绿色: #22c55e
  错误/红色: #ef4444
  数据低/琥珀: #D97706
  默认/灰色: #94a3b8

副标题字体: fontSize: 13, fontWeight: 600

状态徽章 (列表项内联):
  padding: '3px 8px', borderRadius: 6
  whiteSpace: 'nowrap'
```

---

## 二十七、响应式网格布局

```
方案列表:
  默认: space-y-3 (垂直堆叠)
  md: md:grid md:grid-cols-2 md:gap-3 md:space-y-0
  lg: lg:block lg:space-y-3 (恢复垂直堆叠)

功能网格: grid-cols-3, gap-2 (始终3列)

数据网格:
  grid-cols-2, md:grid-cols-4, lg:grid-cols-2 (响应式)

Safe Area 嵌入式底部间距:
  style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
```

---

## 二十八、viewport 与全局配置

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
```

- 禁止用户缩放 (user-scalable=no)
- 最大缩放 1.0
- 完整设备宽度适配
