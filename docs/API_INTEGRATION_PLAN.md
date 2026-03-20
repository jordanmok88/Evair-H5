# API 接入开发计划

## 项目背景

已完成所有后端 API 的测试，所有真实响应数据保存在 `docs/api-responses/` 目录。现在开始逐步将 API 接入到前端视图组件中。

## 推荐接入顺序

### 阶段一：认证模块 (Auth) - 优先级 ⭐⭐⭐⭐⭐
**理由**：所有其他功能都需要先登录，这是接入的基础

**涉及文件**：
- [views/LoginModal.tsx](views/LoginModal.tsx)

**需要接入的 API**：
| 方法 | 用途 | 状态 |
|------|------|------|
| `authService.login()` | 用户登录 | 待接入 |
| `authService.register()` | 用户注册 | 待接入 |
| `authService.logout()` | 用户登出 | 待接入 |
| `authService.refreshToken()` | 刷新 Token | 待接入 |
| `authService.forgotPassword()` | 忘记密码 | 待接入 |
| `authService.resetPassword()` | 重置密码 | 待接入 |

**接入后效果**：
- 用户可以真实登录/注册
- Token 自动管理
- 登录状态全局同步

---

### 阶段二：套餐模块 (Package) - 优先级 ⭐⭐⭐⭐
**理由**：ShopView 需要展示真实套餐数据

**涉及文件**：
- [views/ShopView.tsx](views/ShopView.tsx)

**需要接入的 API**：
| 方法 | 用途 | 状态 |
|------|------|------|
| `packageService.getPackages()` | 获取套餐列表 | 待接入 |
| `packageService.getHotPackages()` | 获取热门套餐 | 待接入 |
| `packageService.getLocations()` | 获取可用地区 | 待接入 |
| `packageService.getRechargePackages()` | 获取充值套餐 | 待接入 |

**接入后效果**：
- 替换掉 `services/esimApi.ts` 的模拟数据
- 使用后端套餐数据

---

### 阶段三：用户模块 (User) - 优先级 ⭐⭐⭐⭐
**理由**：ProfileView 需要用户信息，MySimsView 需要 SIM 列表

**涉及文件**：
- [views/ProfileView.tsx](views/ProfileView.tsx)
- [views/MySimsView.tsx](views/MySimsView.tsx)

**需要接入的 API**：
| 方法 | 用途 | 状态 |
|------|------|------|
| `userService.getProfile()` | 获取用户信息 | 待接入 |
| `userService.updateProfile()` | 更新用户信息 | 待接入 |
| `userService.changePassword()` | 修改密码 | 待接入 |
| `userService.getSims()` | 获取 SIM 卡列表 | 待接入 |
| `userService.bindSim()` | 绑定 SIM 卡 | 待接入 |
| `userService.unbindSim()` | 解绑 SIM 卡 | 待接入 |
| `userService.getAddresses()` | 获取地址列表 | 待接入 |
| `userService.createAddress()` | 创建地址 | 待接入 |
| `userService.updateAddress()` | 更新地址 | 待接入 |
| `userService.deleteAddress()` | 删除地址 | 待接入 |
| `userService.setDefaultAddress()` | 设置默认地址 | 待接入 |

**接入后效果**：
- Profile 页面显示真实用户数据
- SIM 卡列表从后端获取

---

### 阶段四：eSIM 模块 (eSIM) - 优先级 ⭐⭐⭐
**理由**：订单完成后需要展示 SIM 详情和用量

**涉及文件**：
- [views/MySimsView.tsx](views/MySimsView.tsx)

**需要接入的 API**：
| 方法 | 用途 | 状态 |
|------|------|------|
| `esimService.getDetail()` | 获取 eSIM 详情 | 待接入 |
| `esimService.getUsage()` | 查询用量 | 待接入 |
| `esimService.topup()` | eSIM 充值 | 待接入 |

**接入后效果**：
- 替换掉 `services/esimApi.ts` 的部分调用
- 真实的用量查询和充值

---

### 阶段五：订单模块 (Order) - 优先级 ⭐⭐⭐
**理由**：完成购卡流程的闭环

**涉及文件**：
- [views/ShopView.tsx](views/ShopView.tsx)
- [views/ProfileView.tsx](views/ProfileView.tsx)

**需要接入的 API**：
| 方法 | 用途 | 状态 |
|------|------|------|
| `orderService.createEsimOrder()` | 创建 eSIM 订单 | 待接入 |
| `orderService.createPhysicalOrder()` | 创建实体卡订单 | 待接入 |
| `orderService.createTopupOrder()` | 创建充值订单 | 待接入 |
| `orderService.getOrders()` | 获取订单列表 | 待接入 |
| `orderService.getOrderDetail()` | 获取订单详情 | 待接入 |
| `orderService.cancelOrder()` | 取消订单 | 待接入 |
| `orderService.requestRefund()` | 申请退款 | 待接入 |
| `orderService.getTracking()` | 获取物流信息 | 待接入 |

**接入后效果**：
- 订单创建到后端
- 订单历史可查询
- 物流信息展示

---

### 阶段六：支付模块 (Payment) - 优先级 ⭐⭐
**理由**：支付流程集成

**涉及文件**：
- [views/ShopView.tsx](views/ShopView.tsx)

**需要接入的 API**：
| 方法 | 用途 | 状态 |
|------|------|------|
| `paymentService.createPayment()` | 创建支付会话 | 待接入 |
| `paymentService.getPaymentStatus()` | 查询支付状态 | 待接入 |
| `paymentService.validateCoupon()` | 验证优惠券 | 待接入 |
| `paymentService.getCoupons()` | 获取优惠券列表 | 待接入 |

**接入后效果**：
- 完整的支付流程
- 优惠券功能

---

## 技术注意事项

### 1. Token 管理
- 已在 `services/api/client.ts` 中实现
- 自动处理 Token 刷新
- 拦截器自动附加 Authorization header

### 2. 错误处理
- 统一使用 `ApiError` 类
- 错误码定义在 `services/api/types.ts` 的 `ApiErrorCode` 枚举中

### 3. 类型安全
- 所有 API 类型已在 `services/api/types.ts` 定义
- 使用 TypeScript 确保类型安全

### 4. 渐进式迁移
- 可以选择保留 `services/esimApi.ts` 作为备用
- 逐步替换为新 API
- 两种 API 可以并存

---

## 文件清单

### API 层 (已完成)
```
services/api/
├── client.ts      # HTTP 客户端 (Token 管理, 拦截器)
├── types.ts       # TypeScript 类型定义
├── auth.ts        # 认证服务
├── user.ts        # 用户服务
├── package.ts     # 套餐服务
├── order.ts       # 订单服务
├── esim.ts        # eSIM 服务
├── payment.ts     # 支付服务
└── index.ts       # 统一导出
```

### 视图层 (待接入)
```
views/
├── LoginModal.tsx       # 阶段一
├── ShopView.tsx         # 阶段二、五、六
├── MySimsView.tsx       # 阶段三、四
└── ProfileView.tsx     # 阶段三、五
```

### 测试数据
```
docs/api-responses/
├── auth/          # 认证接口响应
├── user/          # 用户接口响应
├── package/       # 套餐接口响应
├── esim/          # eSIM接口响应
└── payment/       # 支付接口响应
```

---

## 开始建议

1. **先从阶段一 (Auth) 开始** - 认证是所有功能的基础
2. **每阶段完成后测试完整流程** - 确保该模块正常工作
3. **查看 `docs/api-responses/` 中的真实响应** - 了解数据结构
4. **参考 `views/ApiTestPage.tsx`** - 查看已测试的接口调用方式
