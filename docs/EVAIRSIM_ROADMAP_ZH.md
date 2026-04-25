# EvairSIM 整体规划 — Phase 0 到 Phase 5

> 文档生成日期：2026-04-25
> 适用范围：Evair-H5（官网 + H5 功能端）、EvairSIM-App（Flutter）、Evair-Laravel（后端）、admin（管理后台）

---

## 一、架构总览（一套代码，三种载体）

EvairSIM 实际上是 **2 个代码库 + 3 个用户入口**：

| 入口 | 渠道 | 路径 | 代码库 |
|---|---|---|---|
| 1. 品牌官网（Website） | 浏览器 | `evairdigital.com/` 及所有非 `/app` 路径 | `Evair-H5`（同一个 React/Vite 项目） |
| 2. H5 功能端（H5 App） | 浏览器 | `evairdigital.com/app/*` | `Evair-H5`（同一个项目） |
| 3. 原生 APP | App Store / Google Play | `InAppWebView` 加载 `/app` | `EvairSIM-App`（Flutter） |

**核心理念**：

- Website 和 H5 是 **同一个项目里的两套皮肤**，靠 URL 路径切换（Phase 0 已经做完了路由切分）。
- Flutter APP 是一个 **WebView 壳子**，加载的就是 H5 的 `/app` 路径，所以 H5 的功能升级 = APP 自动升级，不用单独开发原生页面。
- 主域名：**`evairdigital.com`**（DNS 已生效，2026-04-24）。

---

## 二、Phase 0 — 路由地基（已完成）

**完成时间**：2026-04-24 晚

**目标**：用户感知不到任何变化，但代码层面把"官网"和"App 功能区"拆成两条互不干扰的路径。

**做了什么**：

- `utils/testMode.ts` 增加 `isAppPath()` 和 `shouldRenderMarketing()` 两个工具函数
- `App.tsx` 的标签页标题逻辑：访问 `/app/*` 时显示 "Evair APP"，其他页面显示 "Evair H5"
- Flutter 项目 `app_constants.dart` 的 `h5Url` 默认值改成以 `/app` 结尾
- `netlify.toml` 的 `/* → /index.html` 通配规则保证 `/app` 下的深链接能正常工作
- 默认情况下 `shouldRenderMarketing()` 返回 `false`，等到 Phase 3 再通过 `VITE_MARKETING_HOME=1` 环境变量开启官网首页

**为什么先做这步**：后面所有 Phase 都要在这套路由切分上加东西，地基不打好后面会乱。

---

## 三、Phase 1 — 激活 + 充值漏斗（进行中，最高 ROI）

**为什么是第一优先级**：

> SIM 卡在 Amazon 上是接近成本价卖的（小套餐甚至是负毛利），**真正赚钱的是后面 5 个月的充值续订**。月留存衰减约 70%，所以"扫码 → 激活 → 自动续订"这个漏斗就是公司利润的命根子。

### 5 个交付物

1. **`/activate?iccid=...`** — Amazon 包装盒上的二维码扫描落地页（Website 皮肤，无需登录直接进入）
   - 读取 ICCID，查找捆绑套餐
   - 引导用户创建账号 + 勾选自动续订
2. **`/top-up?iccid=...`** — 凭 ICCID 充值（Website 皮肤），仅在结账时要求登录
3. **`/app/my-sims`** — App 内的我的 SIM 卡页面强化：醒目的自动续订开关 + 准确的流量进度条
4. **交易类邮件**（Resend + Netlify Function）：
   - 流量已用 80% 提醒
   - 套餐 3 天到期提醒
   - 自动续订成功 / 失败通知
5. **自动续订法律披露文案**（ROSCA + 加州 SB-313 合规），写入 `docs/AUTO_RENEW_DISCLOSURE.md`

### 自动续订合规要求（必须从第一天就做对，不能事后补）

- 购买前清晰披露价格、续订频率、取消方式
- 单独的勾选框（不能和服务条款绑定在一起）
- 24 小时内发送确认邮件（含取消链接）
- 一键取消（App 内 + 邮件链接，加州 SB-313 强制要求）
- 续订前 3-7 天发送提醒邮件

**警告**：Phase 1 期间 **不要碰** 首页、国家页、设备页 — 那是 Phase 2/3 的范围。

---

## 四、Phase 2 — 设备分类落地页（SEO 引流）

**目标**：搭建几个针对 Google 搜索的设备类落地页，让买相机/IoT 设备 SIM 的用户能搜到我们。

### 页面结构

- `/sim/phone` — 手机 / 平板 / 笔记本 / 随身 WiFi（650 Mbps 那条线）
- `/sim/camera` — 安防 / 户外狩猎相机（1.5 Mbps 套餐线）
- `/sim/iot` — GPS / 对讲机 / POS / 智能手表 / 电子书 / 割草机（500 Kbps 低速线）
- `/travel-esim/[country]` — 旅行 eSIM 国家页（Red Tea 全球目录）

### 设计要求

- 每页主推三大品牌支柱
- **明确公开速度上限和限速行为**（Jordan 的原则：诚实定价 = 退款少 = 利润高）
- Airalo 风格：干净、留白、克制；**不要** EIOTCLUB 那种密密麻麻倒计时折扣码风

---

## 五、Phase 3 — 品牌首页（"双门"设计）

**目标**：完成 Website 主皮肤，让 `evairdigital.com/` 真正变成一个有品牌感的首页。

### 关键设计

- **双门 hero 区**：清晰区分两条产品线
  - 美国本地用户 → 物理 SIM（PCCW 供应商）
  - 美国出境游客 → 旅行 eSIM（Red Tea 供应商）
- 三大品牌支柱明确呈现：
  1. **速度** — "5G up to 650 Mbps"（前 9GB 高速，之后限速 10 Mbps）
  2. **美国 IP** — "Your US apps just work"（Netflix / Venmo / 银行 App 在海外照常工作，这是 Airalo 不具备的护城河）
  3. **自动 APN** — "Plug and play, no APN setup"（PCCW 自动配置 APN，解决 Amazon 评论里大量竞品吐槽的痛点）
- Airalo 视觉语言（克制配色、大量留白、人性化文案）

**这一步会打开 `VITE_MARKETING_HOME=1` 标志位**，把 Phase 0 准备好的官网皮肤正式露出。

---

## 六、Phase 4 — 帮助中心 + 博客

**目标**：内容长尾 SEO + 减少客服压力。

**包含**：

- 帮助中心（FAQ、安装教程、APN 配置、退款政策、自动续订取消方法）
- 博客（旅行 eSIM 使用攻略、IoT 设备选型指南、5G 速度科普等 SEO 长内容）

**优先级低于 1-3 的原因**：内容运营见效慢，先把转化漏斗（Phase 1）和获客落地页（Phase 2-3）做好，流量进来才有意义。

---

## 七、Phase 5 — App 内物理 SIM 结账（摆脱 Amazon 依赖）

**目标**：把物理 SIM 的结账流程从 Amazon Storefront 迁移到自己的 H5/APP 内（Stripe + Laravel 订单系统）。

### 为什么放到最后

- 现在物理 SIM 走 **Amazon 外链** 不是 Bug，是有意为之 — Amazon 流量本身就是获客渠道，前期借力比自建更划算
- 等到自动续订漏斗（Phase 1）能稳定把 Amazon 来的客户转化成长期用户，我们才有谈判筹码 / 财务支撑去自建结账
- Stripe 接入、订单系统、退款流程、税务处理都需要后端 Laravel 配合 — 工作量大

**注意**：现阶段 **不要** "顺手优化" 物理 SIM 的 Amazon 跳转流程，那是当前的正确架构。

---

## 八、贯穿所有 Phase 的原则

1. **不能跳阶段**。Phase 1 的充值漏斗收益是 Phase 2-5 的资金来源，跳过 = 后面没钱做。
2. **美国市场单一聚焦**。不要重新讨论加新国家的物理 SIM。
3. **所有供应商 API（Red Tea / PCCW）必须走 Laravel 后端**，H5 和 APP 不能直接调供应商 — 防止凭据泄漏 + 让 Admin 端集中管控价格和可见性。
4. **i18n 三语**：英文（主）、中文、西语。任何用户可见文案必须走 `t()` key。
5. **Flutter APP 永远是 WebView 壳子**，不要提议做原生页面，所有功能先上 H5。
6. **保存工作流**：每次有意义的改动跑 `bash "/Users/jordanmok/Desktop/iCloud Drive/Cursor Codes/save-all.sh"` — 同时同步到 GitHub / Aliyun / iCloud 三个备份。

---

## 九、当前进度速览（截至 2026-04-25）

| Phase | 状态 | 备注 |
|---|---|---|
| Phase 0 — 路由地基 | 已完成 | 2026-04-24 晚合并到 `main`（commit `63de1fa`） |
| Phase 1 — 激活+充值漏斗 | 准备开始 | 当前活跃任务，从 `/activate` 落地页开始 |
| Phase 2 — 设备分类页 | 待开始 | |
| Phase 3 — 品牌首页 | 待开始 | 开启 `VITE_MARKETING_HOME=1` 在这一步 |
| Phase 4 — 帮助中心+博客 | 待开始 | |
| Phase 5 — App 内物理 SIM 结账 | 待开始 | 取决于 Phase 1 的资金回流 |
