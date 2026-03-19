# EvairSIM H5 后端 API 对接方案

> 混合架构方案文档
> 版本：1.0
> 日期：2026-03-17

---

## 一、架构概述

### 1.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              前端 H5 应用                                    │
│                        (React + TypeScript + Vite)                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
        ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐
        │   自建后端 API     │ │    Supabase       │ │  Netlify Functions │
        │   (Laravel/Node)  │ │   (保留服务)       │ │   (代理层)         │
        ├───────────────────┤ ├───────────────────┤ ├───────────────────┤
        │ • 用户认证         │ │ • 客服聊天         │ │ • eSIM API 代理    │
        │ • 订单管理         │ │ • 实时消息         │ │ • 邮件发送         │
        │ • 支付集成         │ │ • 通知管理         │ │ • 物流追踪         │
        │ • eSIM 数据同步    │ │ • 管理员功能       │ │                   │
        │ • 用户数据持久化   │ │                   │ │                   │
        └───────────────────┘ └───────────────────┘ └───────────────────┘
                │                     │                     │
                ▼                     ▼                     ▼
        ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐
        │   MySQL/PostgreSQL │ │   Supabase DB     │ │  第三方服务        │
        │   (主数据库)       │ │   (聊天/通知)      │ │ • eSIMAccess      │
        └───────────────────┘ └───────────────────┘ │ • Resend (邮件)   │
                                                    │ • 17track (物流)  │
                                                    └───────────────────┘
```

### 1.2 服务职责划分

| 服务类型 | 服务名称 | 职责 | 数据存储 |
|----------|----------|------|----------|
| **自建后端** | Laravel/Node API | 核心业务逻辑、用户系统、订单支付 | MySQL/PostgreSQL |
| **保留服务** | Supabase | 客服聊天、通知推送、管理员功能 | Supabase PostgreSQL |
| **代理层** | Netlify Functions | API 代理、邮件发送、物流查询 | 无状态 |

---

## 二、自建后端 API 清单

### 2.1 用户认证模块 (P0)

#### 2.1.1 用户登录

```
POST /api/v1/auth/login
```

**请求体**：
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**响应体**：
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "email": "user@example.com",
      "avatarUrl": "https://...",
      "role": "OWNER",
      "createdAt": "2026-01-01T00:00:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "refresh_token_string",
    "expiresIn": 7200
  }
}
```

**错误码**：
| code | msg | 说明 |
|------|-----|------|
| 1001 | Invalid credentials | 邮箱或密码错误 |
| 1002 | Account not found | 账户不存在 |
| 1003 | Account disabled | 账户已被禁用 |

---

#### 2.1.2 用户注册

```
POST /api/v1/auth/register
```

**请求体**：
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

**响应体**：
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "email": "user@example.com",
      "avatarUrl": null,
      "role": "OWNER",
      "createdAt": "2026-03-17T00:00:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "refresh_token_string",
    "expiresIn": 7200
  }
}
```

**错误码**：
| code | msg | 说明 |
|------|-----|------|
| 1011 | Email already exists | 邮箱已被注册 |
| 1012 | Invalid email format | 邮箱格式错误 |
| 1013 | Password too weak | 密码强度不足 |

---

#### 2.1.3 登出

```
POST /api/v1/auth/logout
```

**请求头**：
```
Authorization: Bearer {token}
```

**响应体**：
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "success": true
  }
}
```

---

#### 2.1.4 Token 刷新

```
POST /api/v1/auth/refresh
```

**请求体**：
```json
{
  "refreshToken": "refresh_token_string"
}
```

**响应体**：
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "token": "new_access_token",
    "refreshToken": "new_refresh_token",
    "expiresIn": 7200
  }
}
```

**错误码**：
| code | msg | 说明 |
|------|-----|------|
| 1021 | Invalid refresh token | 刷新令牌无效 |
| 1022 | Token expired | 刷新令牌已过期 |

---

#### 2.1.5 找回密码

```
POST /api/v1/auth/forgot-password
```

**请求体**：
```json
{
  "email": "user@example.com"
}
```

**响应体**：
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "message": "Password reset email sent"
  }
}
```

---

#### 2.1.6 重置密码

```
POST /api/v1/auth/reset-password
```

**请求体**：
```json
{
  "token": "reset_token_from_email",
  "password": "newPassword123"
}
```

**响应体**：
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "success": true
  }
}
```

---

### 2.2 用户信息模块 (P0)

#### 2.2.1 获取用户信息

```
GET /api/v1/user/profile
```

**请求头**：
```
Authorization: Bearer {token}
```

**响应体**：
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "id": "uuid",
    "name": "John Doe",
    "email": "user@example.com",
    "avatarUrl": "https://...",
    "phone": "+1234567890",
    "role": "OWNER",
    "createdAt": "2026-01-01T00:00:00Z",
    "preferences": {
      "language": "en",
      "currency": "USD",
      "notifications": {
        "email": true,
        "push": true,
        "dataAlert": true,
        "expiryAlert": true
      }
    }
  }
}
```

---

#### 2.2.2 更新用户信息

```
PUT /api/v1/user/profile
```

**请求头**：
```
Authorization: Bearer {token}
```

**请求体**：
```json
{
  "name": "John Smith",
  "phone": "+1234567890"
}
```

**响应体**：
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "id": "uuid",
    "name": "John Smith",
    "email": "user@example.com",
    "phone": "+1234567890",
    "updatedAt": "2026-03-17T00:00:00Z"
  }
}
```

---

#### 2.2.3 修改密码

```
PUT /api/v1/user/password
```

**请求头**：
```
Authorization: Bearer {token}
```

**请求体**：
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newPassword456"
}
```

**响应体**：
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "success": true
  }
}
```

**错误码**：
| code | msg | 说明 |
|------|-----|------|
| 2011 | Current password incorrect | 当前密码错误 |

---

#### 2.2.4 获取用户 SIM 卡列表

```
GET /api/v1/user/sims
```

**请求头**：
```
Authorization: Bearer {token}
```

**查询参数**：
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | string | 否 | 筛选状态: ACTIVE, EXPIRED, PENDING |
| page | int | 否 | 页码，默认 1 |
| size | int | 否 | 每页数量，默认 20 |

**响应体**：
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "list": [
      {
        "id": "uuid",
        "iccid": "8985200000000000001",
        "type": "ESIM",
        "packageName": "United States 5GB/30Days",
        "countryCode": "US",
        "status": "ACTIVE",
        "totalVolume": 5368709120,
        "usedVolume": 1073741824,
        "expiredTime": "2026-04-17T00:00:00Z",
        "activationDate": "2026-03-17T00:00:00Z",
        "smdpAddress": "sm.vno.mobi",
        "activationCode": "ACTIVATION_CODE"
      }
    ],
    "total": 1,
    "page": 1,
    "size": 20
  }
}
```

---

#### 2.2.5 绑定 SIM 卡

```
POST /api/v1/user/sims/bind
```

**请求头**：
```
Authorization: Bearer {token}
```

**请求体**：
```json
{
  "iccid": "8985200000000000001",
  "activationCode": "ACTIVATION_CODE"
}
```

**响应体**：
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "success": true,
    "sim": {
      "id": "uuid",
      "iccid": "8985200000000000001",
      "status": "ACTIVE"
    }
  }
}
```

**错误码**：
| code | msg | 说明 |
|------|-----|------|
| 2021 | SIM already bound | SIM 卡已绑定 |
| 2022 | Invalid ICCID | ICCID 无效 |
| 2023 | SIM not found | SIM 卡不存在 |

---

#### 2.2.6 解绑 SIM 卡

```
POST /api/v1/user/sims/unbind
```

**请求头**：
```
Authorization: Bearer {token}
```

**请求体**：
```json
{
  "iccid": "8985200000000000001"
}
```

**响应体**：
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "success": true
  }
}
```

---

#### 2.2.7 获取用户地址列表

```
GET /api/v1/user/addresses
```

**请求头**：
```
Authorization: Bearer {token}
```

**响应体**：
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "addresses": [
      {
        "id": "uuid",
        "recipientName": "John Doe",
        "phone": "+1234567890",
        "addressLine1": "123 Main St",
        "addressLine2": "Apt 4B",
        "city": "San Francisco",
        "state": "CA",
        "postalCode": "94102",
        "country": "US",
        "isDefault": true
      }
    ]
  }
}
```

---

#### 2.2.8 添加地址

```
POST /api/v1/user/addresses
```

**请求头**：
```
Authorization: Bearer {token}
```

**请求体**：
```json
{
  "recipientName": "John Doe",
  "phone": "+1234567890",
  "addressLine1": "123 Main St",
  "addressLine2": "Apt 4B",
  "city": "San Francisco",
  "state": "CA",
  "postalCode": "94102",
  "country": "US",
  "isDefault": true
}
```

**响应体**：
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "id": "uuid",
    "recipientName": "John Doe",
    "isDefault": true,
    "createdAt": "2026-03-17T00:00:00Z"
  }
}
```

---

#### 2.2.9 更新地址

```
PUT /api/v1/user/addresses/:id
```

**请求头**：
```
Authorization: Bearer {token}
```

**请求体**：
```json
{
  "recipientName": "John Smith",
  "phone": "+1234567890",
  "isDefault": true
}
```

**响应体**：
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "id": "uuid",
    "updatedAt": "2026-03-17T00:00:00Z"
  }
}
```

---

#### 2.2.10 删除地址

```
DELETE /api/v1/user/addresses/:id
```

**请求头**：
```
Authorization: Bearer {token}
```

**响应体**：
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "success": true
  }
}
```

---

### 2.3 套餐模块 (P0)

#### 2.3.1 获取套餐列表

```
GET /api/v1/packages
```

**查询参数**：
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| locationCode | string | 否 | 国家/地区代码，如 US,JP |
| type | string | 否 | BASE: 基础套餐, TOPUP: 充值套餐 |
| iccid | string | 否 | 查询可充值套餐时传入 |
| page | int | 否 | 页码，默认 1 |
| size | int | 否 | 每页数量，默认 20 |

**响应体**：
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "packages": [
      {
        "packageCode": "PKG-US-5GB-30D",
        "name": "United States 5GB 30 Days",
        "price": 1999,
        "currency": "USD",
        "volume": 5368709120,
        "duration": 30,
        "durationUnit": "DAY",
        "location": "US",
        "locationName": "United States",
        "type": "BASE",
        "speed": "4G/5G",
        "features": ["Hotspot", "Auto-activate"],
        "description": "Coverage in all 50 states"
      }
    ]
  }
}
```

**说明**：此接口由后端代理 eSIMAccess API，可增加缓存层。

---

#### 2.3.2 获取热门套餐

```
GET /api/v1/packages/hot
```

**查询参数**：
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| limit | int | 否 | 返回数量，默认 10 |

**响应体**：
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "packages": [
      {
        "packageCode": "PKG-JP-3GB-15D",
        "name": "Japan 3GB 15 Days",
        "price": 1299,
        "volume": 3221225472,
        "duration": 15,
        "durationUnit": "DAY",
        "location": "JP",
        "locationName": "Japan",
        "salesCount": 1234,
        "rating": 4.8
      }
    ]
  }
}
```

---

#### 2.3.3 获取充值套餐

```
GET /api/v1/packages/recharge
```

**查询参数**：
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| iccid | string | 是 | eSIM ICCID |

**响应体**：
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "packages": [
      {
        "packageCode": "TOPUP-US-1GB",
        "name": "Add 1GB Data",
        "price": 599,
        "volume": 1073741824,
        "validDays": 30
      }
    ]
  }
}
```

---

### 2.4 订单模块 (P0)

#### 2.4.1 创建 eSIM 订单

```
POST /api/v1/orders/esim
```

**请求头**：
```
Authorization: Bearer {token}
```

**请求体**：
```json
{
  "packageCode": "PKG-US-5GB-30D",
  "email": "user@example.com",
  "quantity": 1
}
```

**响应体**：
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "orderNo": "ORD-20260317-0001",
    "status": "PENDING_PAYMENT",
    "amount": 1999,
    "currency": "USD",
    "packageCode": "PKG-US-5GB-30D",
    "packageName": "United States 5GB 30 Days",
    "createdAt": "2026-03-17T00:00:00Z"
  }
}
```

**说明**：
- 此接口仅创建待支付订单，不分配 eSIM
- 支付成功后，通过 webhook 触发 eSIMAccess 下单
- 前端可通过轮询 `GET /api/v1/orders/:orderNo` 或 WebSocket 获取 eSIM 信息

---

#### 2.4.2 创建实体 SIM 订单

```
POST /api/v1/orders/physical
```

**请求头**：
```
Authorization: Bearer {token}
```

**请求体**：
```json
{
  "productId": "SIM-US-10GB-30D",
  "quantity": 1,
  "email": "user@example.com",
  "shippingAddress": {
    "recipientName": "John Doe",
    "phone": "+1234567890",
    "addressLine1": "123 Main St",
    "addressLine2": "Apt 4B",
    "city": "San Francisco",
    "state": "CA",
    "postalCode": "94102",
    "country": "US"
  }
}
```

**响应体**：
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "orderNo": "ORD-20260317-0002",
    "status": "PENDING_PAYMENT",
    "amount": 1599,
    "shippingFee": 599,
    "totalAmount": 2198,
    "currency": "USD",
    "createdAt": "2026-03-17T00:00:00Z"
  }
}
```

---

#### 2.4.3 获取订单列表

```
GET /api/v1/orders
```

**请求头**：
```
Authorization: Bearer {token}
```

**查询参数**：
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | string | 否 | 状态筛选 |
| type | string | 否 | ESIM / PHYSICAL |
| page | int | 否 | 页码 |
| size | int | 否 | 每页数量 |

**响应体**：
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "list": [
      {
        "id": "uuid",
        "orderNo": "ORD-20260317-0001",
        "type": "ESIM",
        "packageName": "United States 5GB 30 Days",
        "amount": 1999,
        "currency": "USD",
        "status": "PAID",
        "paymentMethod": "STRIPE",
        "paidAt": "2026-03-17T00:05:00Z",
        "createdAt": "2026-03-17T00:00:00Z"
      }
    ],
    "total": 10,
    "page": 1,
    "size": 20
  }
}
```

---

#### 2.4.4 获取订单详情

```
GET /api/v1/orders/:orderNo
```

**请求头**：
```
Authorization: Bearer {token}
```

**响应体 (eSIM 订单)**：
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "id": "uuid",
    "orderNo": "ORD-20260317-0001",
    "type": "ESIM",
    "status": "PAID",
    "amount": 1999,
    "currency": "USD",
    "package": {
      "packageCode": "PKG-US-5GB-30D",
      "name": "United States 5GB 30 Days",
      "volume": 5368709120,
      "duration": 30
    },
    "esim": {
      "iccid": "8985200000000000001",
      "smdpAddress": "sm.vno.mobi",
      "activationCode": "ACTIVATION_CODE",
      "qrCodeUrl": "https://...",
      "lpaString": "LPA:1$sm.vno.mobi$ACTIVATION_CODE",
      "status": "ACTIVE",
      "usedVolume": 0,
      "totalVolume": 5368709120,
      "expiredTime": "2026-04-17T00:00:00Z"
    },
    "payment": {
      "method": "STRIPE",
      "transactionId": "pi_xxx",
      "paidAt": "2026-03-17T00:05:00Z"
    },
    "createdAt": "2026-03-17T00:00:00Z"
  }
}
```

---

#### 2.4.5 取消订单

```
POST /api/v1/orders/:orderNo/cancel
```

**请求头**：
```
Authorization: Bearer {token}
```

**请求体**：
```json
{
  "reason": "Changed mind"
}
```

**响应体**：
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "success": true,
    "refundAmount": 1999,
    "refundStatus": "PROCESSING"
  }
}
```

**错误码**：
| code | msg | 说明 |
|------|-----|------|
| 4011 | Order cannot be cancelled | 订单无法取消 |
| 4012 | Order already cancelled | 订单已取消 |

---

#### 2.4.6 申请退款

```
POST /api/v1/orders/:orderNo/refund
```

**请求头**：
```
Authorization: Bearer {token}
```

**请求体**：
```json
{
  "reason": "Product not as described",
  "amount": 1999
}
```

**响应体**：
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "refundId": "REF-20260317-0001",
    "status": "PENDING",
    "amount": 1999,
    "currency": "USD",
    "estimatedDays": 5
  }
}
```

**错误码**：
| code | msg | 说明 |
|------|-----|------|
| 4021 | Order not refundable | 订单不可退款 |
| 4022 | Refund already requested | 已申请退款 |

---

#### 2.4.7 物流追踪

```
GET /api/v1/orders/:orderNo/tracking
```

**请求头**：
```
Authorization: Bearer {token}
```

**响应体**：
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "trackingNo": "1234567890",
    "carrier": "DHL",
    "status": "IN_TRANSIT",
    "estimatedDelivery": "2026-03-20T00:00:00Z",
    "events": [
      {
        "time": "2026-03-17T10:00:00Z",
        "location": "Shanghai, CN",
        "status": "Package picked up",
        "description": "Shipment picked up from sender"
      },
      {
        "time": "2026-03-18T08:00:00Z",
        "location": "Shanghai Hub",
        "status": "In transit",
        "description": "Departed from sorting facility"
      }
    ]
  }
}
```

**说明**：后端调用 17track API 获取物流信息。

---

### 2.5 支付模块 (P0)

#### 2.5.1 创建支付会话

```
POST /api/v1/payments/create
```

**请求头**：
```
Authorization: Bearer {token}
```

**请求体**：
```json
{
  "orderNo": "ORD-20260317-0001",
  "method": "STRIPE",
  "successUrl": "https://evairsim.com/order/success",
  "cancelUrl": "https://evairsim.com/order/cancel"
}
```

**响应体**：
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "paymentId": "pi_xxx",
    "paymentUrl": "https://checkout.stripe.com/...",
    "expiresAt": "2026-03-17T01:00:00Z"
  }
}
```

---

#### 2.5.2 支付回调 (Webhook)

```
POST /api/v1/payments/webhook
```

**说明**：此接口由支付网关调用，验证签名后更新订单状态。

**请求体 (Stripe)**：
```json
{
  "id": "evt_xxx",
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_xxx",
      "status": "succeeded",
      "amount": 1999,
      "metadata": {
        "orderNo": "ORD-20260317-0001"
      }
    }
  }
}
```

**响应体**：
```json
{
  "received": true
}
```

---

#### 2.5.3 查询支付状态

```
GET /api/v1/payments/:paymentId
```

**请求头**：
```
Authorization: Bearer {token}
```

**响应体**：
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "paymentId": "pi_xxx",
    "orderNo": "ORD-20260317-0001",
    "status": "SUCCEEDED",
    "amount": 1999,
    "currency": "USD",
    "method": "STRIPE",
    "paidAt": "2026-03-17T00:05:00Z"
  }
}
```

---

#### 2.5.4 优惠券验证

```
POST /api/v1/coupons/validate
```

**请求头**：
```
Authorization: Bearer {token}
```

**请求体**：
```json
{
  "code": "SAVE10",
  "orderNo": "ORD-20260317-0001"
}
```

**响应体**：
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "valid": true,
    "couponId": "uuid",
    "discountType": "PERCENTAGE",
    "discountValue": 10,
    "discountAmount": 200,
    "minOrderAmount": 1000,
    "maxDiscount": 500,
    "expiresAt": "2026-12-31T23:59:59Z"
  }
}
```

**错误码**：
| code | msg | 说明 |
|------|-----|------|
| 5011 | Coupon expired | 优惠券已过期 |
| 5012 | Coupon not found | 优惠券不存在 |
| 5013 | Coupon already used | 优惠券已使用 |
| 5014 | Order amount too low | 订单金额不满足最低要求 |

---

### 2.6 eSIM 管理模块 (P0)

#### 2.6.1 获取 eSIM 详情

```
GET /api/v1/esim/:iccid
```

**请求头**：
```
Authorization: Bearer {token}
```

**响应体**：
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "iccid": "8985200000000000001",
    "status": "ACTIVE",
    "package": {
      "packageCode": "PKG-US-5GB-30D",
      "name": "United States 5GB 30 Days",
      "volume": 5368709120,
      "duration": 30
    },
    "usage": {
      "totalVolume": 5368709120,
      "usedVolume": 1073741824,
      "remainingVolume": 4294967296
    },
    "validity": {
      "activationDate": "2026-03-17T00:00:00Z",
      "expiredTime": "2026-04-17T00:00:00Z",
      "daysRemaining": 30
    },
    "activation": {
      "smdpAddress": "sm.vno.mobi",
      "activationCode": "ACTIVATION_CODE",
      "qrCodeUrl": "https://...",
      "lpaString": "LPA:1$sm.vno.mobi$ACTIVATION_CODE"
    }
  }
}
```

**说明**：后端调用 eSIMAccess API 获取实时数据。

---

#### 2.6.2 查询用量

```
GET /api/v1/esim/:iccid/usage
```

**请求头**：
```
Authorization: Bearer {token}
```

**查询参数**：
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| daily | boolean | 否 | 是否返回每日用量，默认 false |
| page | int | 否 | 每日用量页码，默认 1 |
| size | int | 否 | 每页数量，默认 30 |

**响应体**：
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "iccid": "8985200000000000001",
    "totalVolume": 5368709120,
    "usedVolume": 1073741824,
    "remainingVolume": 4294967296,
    "usagePercent": 20,
    "expiredTime": "2026-04-17T00:00:00Z",
    "dailyUsage": [
      {
        "date": "2026-03-17",
        "usedVolume": 524288000
      }
    ],
    "totalDays": 30,
    "page": 1,
    "size": 30
  }
}
```

---

#### 2.6.3 eSIM 充值

```
POST /api/v1/esim/:iccid/topup
```

**请求头**：
```
Authorization: Bearer {token}
```

**请求体**：
```json
{
  "packageCode": "TOPUP-US-1GB",
  "amount": 599
}
```

**响应体**：
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "orderNo": "TOP-20260317-0001",
    "iccid": "8985200000000000001",
    "packageCode": "TOPUP-US-1GB",
    "addedVolume": 1073741824,
    "newTotalVolume": 6442450944,
    "newExpiredTime": "2026-04-17T00:00:00Z"
  }
}
```

---

### 2.7 邮件模块 (P1)

#### 2.7.1 发送 eSIM 配送邮件

```
POST /api/v1/email/esim-delivery
```

**请求体**：
```json
{
  "email": "user@example.com",
  "orderNo": "ORD-20260317-0001",
  "iccid": "8985200000000000001",
  "packageName": "United States 5GB 30 Days",
  "qrCodeUrl": "https://...",
  "smdpAddress": "sm.vno.mobi",
  "activationCode": "ACTIVATION_CODE",
  "lpaString": "LPA:1$sm.vno.mobi$ACTIVATION_CODE"
}
```

**响应体**：
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "success": true,
    "messageId": "msg_xxx"
  }
}
```

---

#### 2.7.2 发送用量警告邮件

```
POST /api/v1/email/usage-alert
```

**请求体**：
```json
{
  "email": "user@example.com",
  "iccid": "8985200000000000001",
  "usagePercent": 80,
  "remainingVolume": 1073741824,
  "packageName": "United States 5GB 30 Days"
}
```

---

#### 2.7.3 发送到期提醒邮件

```
POST /api/v1/email/expiry-alert
```

**请求体**：
```json
{
  "email": "user@example.com",
  "iccid": "8985200000000000001",
  "daysLeft": 3,
  "expiredTime": "2026-03-20T00:00:00Z",
  "packageName": "United States 5GB 30 Days"
}
```

---

## 三、保留 Supabase 服务

### 3.1 客服聊天模块

**保持现有实现，无需改动**

| 功能 | 当前实现 | 说明 |
|------|----------|------|
| 创建会话 | `supabase.ts createConversation()` | 保持不变 |
| 发送消息 | `supabase.ts sendMessage()` | 保持不变 |
| 实时订阅 | `supabase.ts subscribeToMessages()` | 使用 Supabase Realtime |

---

### 3.2 通知模块

**保持 Supabase 作为通知存储**

| 功能 | 当前实现 | 说明 |
|------|----------|------|
| 获取通知 | `supabase.ts fetchNotifications()` | 保持不变 |
| 创建通知 | `supabase.ts adminCreateNotification()` | 管理员功能 |

---

### 3.3 管理员模块

**保持 Supabase Admin 认证**

| 功能 | 当前实现 | 说明 |
|------|----------|------|
| 管理员登录 | `supabase.ts adminLogin()` | 保持不变 |
| 管理通知 | Supabase 表操作 | 保持不变 |
| 管理会话 | Supabase 表操作 | 保持不变 |

---

## 四、保留 Netlify Functions 代理

### 4.1 eSIM API 代理

**保持 `netlify/functions/esim.mjs`**

用途：
- 代理 eSIMAccess API 请求
- 保护 API 密钥
- 添加请求签名

**无需改动**，后端 API 内部调用此代理或直接调用 eSIMAccess API。

---

### 4.2 邮件发送

**保持 `netlify/functions/send-esim-email.mjs`**

或迁移到后端 API `/api/v1/email/esim-delivery`

---

### 4.3 物流追踪

**保持 `netlify/functions/track.mjs`**

或迁移到后端 API `/api/v1/tracking/:trackingNo`

---

## 五、数据库设计

### 5.1 用户表 (users)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  phone VARCHAR(20),
  avatar_url TEXT,
  role VARCHAR(20) DEFAULT 'OWNER',
  preferences JSONB DEFAULT '{}',
  email_verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
```

---

### 5.2 订单表 (orders)

```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no VARCHAR(50) UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id),
  type VARCHAR(20) NOT NULL, -- ESIM / PHYSICAL
  status VARCHAR(30) NOT NULL, -- PENDING_PAYMENT, PAID, CANCELLED, etc.
  amount INTEGER NOT NULL, -- cents
  currency VARCHAR(3) DEFAULT 'USD',
  shipping_fee INTEGER DEFAULT 0,
  total_amount INTEGER NOT NULL,
  package_code VARCHAR(100),
  package_name VARCHAR(255),
  package_details JSONB,
  esim_iccid VARCHAR(30),
  esim_details JSONB,
  shipping_address JSONB,
  tracking_no VARCHAR(100),
  payment_method VARCHAR(20),
  payment_id VARCHAR(100),
  paid_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  cancel_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_order_no ON orders(order_no);
CREATE INDEX idx_orders_status ON orders(status);
```

---

### 5.3 用户 SIM 卡表 (user_sims)

```sql
CREATE TABLE user_sims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  iccid VARCHAR(30) UNIQUE NOT NULL,
  type VARCHAR(20) NOT NULL, -- ESIM / PHYSICAL
  status VARCHAR(20) NOT NULL, -- ACTIVE, EXPIRED, PENDING
  package_code VARCHAR(100),
  package_name VARCHAR(255),
  country_code VARCHAR(5),
  total_volume BIGINT,
  used_volume BIGINT DEFAULT 0,
  activation_date TIMESTAMP,
  expired_time TIMESTAMP,
  smdp_address VARCHAR(255),
  activation_code VARCHAR(255),
  qr_code_url TEXT,
  lpa_string TEXT,
  order_id UUID REFERENCES orders(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_sims_user_id ON user_sims(user_id);
CREATE INDEX idx_user_sims_iccid ON user_sims(iccid);
```

---

### 5.4 支付记录表 (payments)

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id VARCHAR(100) UNIQUE NOT NULL,
  order_id UUID REFERENCES orders(id),
  user_id UUID REFERENCES users(id),
  method VARCHAR(20) NOT NULL, -- STRIPE, PAYPAL
  status VARCHAR(20) NOT NULL, -- PENDING, SUCCEEDED, FAILED
  amount INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  transaction_id VARCHAR(100),
  webhook_data JSONB,
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payments_payment_id ON payments(payment_id);
CREATE INDEX idx_payments_order_id ON payments(order_id);
```

---

### 5.5 刷新令牌表 (refresh_tokens)

```sql
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  token VARCHAR(500) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
```

---

### 5.6 用户地址表 (user_addresses)

```sql
CREATE TABLE user_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  recipient_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  address_line1 VARCHAR(255) NOT NULL,
  address_line2 VARCHAR(255),
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100),
  postal_code VARCHAR(20) NOT NULL,
  country VARCHAR(5) NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_addresses_user_id ON user_addresses(user_id);
```

---

### 5.7 优惠券表 (coupons)

```sql
CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  discount_type VARCHAR(20) NOT NULL, -- PERCENTAGE / FIXED
  discount_value INTEGER NOT NULL, -- 百分比或固定金额(cents)
  min_order_amount INTEGER DEFAULT 0,
  max_discount INTEGER, -- 最大优惠金额(cents)，仅PERCENTAGE类型
  total_count INTEGER DEFAULT -1, -- -1 表示无限
  used_count INTEGER DEFAULT 0,
  per_user_limit INTEGER DEFAULT 1,
  starts_at TIMESTAMP,
  expires_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE / INACTIVE
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_status ON coupons(status);
```

---

### 5.8 用户优惠券表 (user_coupons)

```sql
CREATE TABLE user_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  coupon_id UUID REFERENCES coupons(id) NOT NULL,
  order_id UUID REFERENCES orders(id),
  status VARCHAR(20) DEFAULT 'AVAILABLE', -- AVAILABLE / USED / EXPIRED
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_coupons_user_id ON user_coupons(user_id);
CREATE INDEX idx_user_coupons_coupon_id ON user_coupons(coupon_id);
```

---

### 5.9 退款记录表 (refunds)

```sql
CREATE TABLE refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_no VARCHAR(50) UNIQUE NOT NULL,
  order_id UUID REFERENCES orders(id) NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  amount INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  reason TEXT,
  status VARCHAR(20) NOT NULL, -- PENDING / PROCESSING / COMPLETED / FAILED
  transaction_id VARCHAR(100),
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_refunds_order_id ON refunds(order_id);
CREATE INDEX idx_refunds_user_id ON refunds(user_id);
CREATE INDEX idx_refunds_status ON refunds(status);
```

---

## 六、错误码规范

### 6.1 错误码分段

| 错误码范围 | 模块 | 说明 |
|------------|------|------|
| 1000-1999 | 认证模块 | 登录、注册、Token 相关 |
| 2000-2999 | 用户模块 | 用户信息、SIM 卡、地址 |
| 3000-3999 | 套餐模块 | 套餐查询、库存 |
| 4000-4999 | 订单模块 | 订单创建、取消、退款 |
| 5000-5999 | 支付模块 | 支付、优惠券 |
| 6000-6999 | eSIM 模块 | eSIM 查询、充值 |
| 7000-7999 | 第三方服务 | eSIMAccess、Stripe、邮件服务 |

### 6.2 通用错误码

| code | msg | 说明 |
|------|-----|------|
| 0 | success | 成功 |
| -1 | Unknown error | 未知错误 |
| -2 | Invalid request | 请求参数错误 |
| -3 | Unauthorized | 未授权 |
| -4 | Forbidden | 无权限 |
| -5 | Not found | 资源不存在 |
| -6 | Rate limit exceeded | 请求过于频繁 |
| -7 | Service unavailable | 服务暂不可用 |

---

## 七、前后端类型映射

### 7.1 用户类型映射

| 前端类型 (types/index.ts) | API 响应字段 | 转换说明 |
|---------------------------|--------------|----------|
| `User.id: string` | `user.id: UUID` | 直接使用，UUID 转字符串 |
| `User.name: string` | `user.name: string` | 直接映射 |
| `User.email: string` | `user.email: string` | 直接映射 |
| `User.avatarUrl?: string` | `user.avatarUrl: string \| null` | null 转 undefined |
| `User.role: UserRole` | `user.role: string` | 枚举值匹配 |
| `User.phone?: string` | `user.phone: string \| null` | null 转 undefined |

### 7.2 订单类型映射

| 前端类型 | API 响应字段 | 转换说明 |
|----------|--------------|----------|
| `Order.id: string` | `order.id: UUID` | UUID 转字符串 |
| `Order.amount: number` | `order.amount: integer` | cents，前端显示需 /100 |
| `Order.status: OrderStatus` | `order.status: string` | 枚举值映射 |
| `Order.createdAt: string` | `order.createdAt: ISO8601` | 直接使用 |

### 7.3 套餐类型映射

| 前端类型 | API 响应字段 | 转换说明 |
|----------|--------------|----------|
| `Plan.id: string` | `package.packageCode: string` | 使用 packageCode 作为 id |
| `Plan.price: number` | `package.price: integer` | cents，前端显示需 /100 |
| `Plan.dataAmount: number` | `package.volume: integer` | bytes，前端需转换为 GB/MB |
| `Plan.validityDays: number` | `package.duration: integer` | 直接映射 |

### 7.4 eSIM 类型映射

| 前端类型 | API 响应字段 | 转换说明 |
|----------|--------------|----------|
| `ActiveSim.iccid: string` | `esim.iccid: string` | 直接映射 |
| `ActiveSim.dataUsed: number` | `esim.usedVolume: integer` | bytes，前端显示需转换 |
| `ActiveSim.dataTotal: number` | `esim.totalVolume: integer` | bytes，前端显示需转换 |
| `ActiveSim.expiryDate: string` | `esim.expiredTime: ISO8601` | 字段名不同 |

---

## 八、前端改动清单

### 6.1 需要修改的文件

| 文件 | 改动内容 | 优先级 |
|------|----------|--------|
| `views/LoginModal.tsx` | 对接 `/api/v1/auth/login`, `/api/v1/auth/register` | P0 |
| `App.tsx` | 移除硬编码用户，从 API 获取用户信息 | P0 |
| `views/ProfileView.tsx` | 对接用户信息 API，地址管理 | P0 |
| `views/ShopView.tsx` | 对接订单 API，支付 API，优惠券验证 | P0 |
| `views/MySimsView.tsx` | 对接 eSIM 管理 API | P0 |
| `views/OrderDetailView.tsx` | 对接订单详情、物流追踪、退款 | P0 |
| `views/AddressManageView.tsx` | 地址管理页面 (新建) | P1 |
| `services/esimApi.ts` | 关闭 DEMO_MODE，改为调用后端 API | P0 |

---

### 6.2 服务层重构

**删除文件**：
- `services/api/*.ts` (当前未使用，可重新生成)

**新建/修改文件**：
```
services/
├── api/
│   ├── client.ts          # API 客户端 (保留)
│   ├── auth.ts            # 认证服务 (重写)
│   ├── user.ts            # 用户服务 (重写)
│   ├── address.ts         # 地址服务 (新建)
│   ├── order.ts           # 订单服务 (重写)
│   ├── esim.ts            # eSIM 服务 (重写)
│   ├── payment.ts         # 支付服务 (新建)
│   ├── coupon.ts          # 优惠券服务 (新建)
│   └── index.ts           # 统一导出
├── supabase.ts            # 保留，用于聊天/通知
└── esimApi.ts             # 保留，作为后端调用代理
```

---

### 6.3 环境变量配置

```bash
# .env
VITE_API_BASE_URL=/api/v1
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx

# Netlify 环境变量
ESIM_ACCESS_CODE=xxx
ESIM_SECRET=xxx
RESEND_API_KEY=xxx
RESEND_FROM=EvairSIM <noreply@evairsim.com>
JWT_SECRET=xxx
DATABASE_URL=xxx
```

---

## 七、实施计划

### Phase 1：用户认证

1. 后端开发 `/api/v1/auth/*` 接口（登录、注册、登出、Token 刷新、找回密码）
2. 前端修改 `LoginModal.tsx` 对接登录/注册 API
3. 修改 `App.tsx` 移除硬编码用户
4. 测试登录/注册/登出流程

---

### Phase 2：订单与支付

1. 后端开发订单相关接口（创建、列表、详情、取消、退款、物流追踪）
2. 后端集成 Stripe 支付（创建会话、Webhook、查询状态）
3. 后端开发优惠券验证接口
4. 前端修改 `ShopView.tsx` 对接下单和支付
5. 测试完整购买流程

---

### Phase 3：eSIM 管理

1. 后端开发 eSIM 管理接口（详情、用量查询、充值）
2. 后端集成 eSIMAccess API
3. 支付成功后触发 eSIMAccess 下单
4. 前端修改 `MySimsView.tsx` 对接 API
5. 关闭 `DEMO_MODE`
6. 测试用量查询和充值

---

### Phase 4：用户信息与地址

1. 后端开发用户信息接口（获取、更新、修改密码）
2. 后端开发用户 SIM 卡接口（列表、绑定、解绑）
3. 后端开发用户地址接口（CRUD）
4. 前端修改 `ProfileView.tsx`
5. 测试用户信息更新和地址管理

---

### Phase 5：邮件服务

1. 后端开发邮件发送接口（eSIM 配送、用量警告、到期提醒）
2. 后端集成 Resend API
3. 测试邮件发送

---

### Phase 6：测试与上线

1. 端到端测试
2. 性能测试
3. 安全审计
4. 生产环境部署

---

## 八、接口统计

| 模块 | 接口数量 | 优先级 | 备注 |
|------|----------|--------|------|
| 用户认证 | 6 | P0 | 必须实现 |
| 用户信息 | 6 | P0 | 必须实现 |
| 用户地址 | 4 | P1 | 实体 SIM 配送需要 |
| 套餐 | 3 | P0 | 代理 eSIMAccess |
| 订单 | 7 | P0 | 包含退款、物流追踪 |
| 支付 | 4 | P0 | 集成 Stripe，含优惠券 |
| eSIM管理 | 3 | P0 | 代理 eSIMAccess |
| 邮件 | 3 | P1 | 可延后 |
| **总计** | **36** | - | - |

---

## 九、风险与注意事项

### 9.1 数据迁移

- 现有 Supabase 中的聊天记录和通知数据无需迁移
- 如有测试用户数据，需清理

### 9.2 兼容性

- 保持 `/api/esim` 代理可用，便于后端调用
- 前端 API 客户端已支持 Bearer Token 注入

### 9.3 安全

- 所有 API 需要 JWT 认证
- 敏感操作（支付、取消订单）需二次验证
- 日志记录所有关键操作

---

**文档版本**: 1.1
**最后更新**: 2026-03-18
**负责人**: 开发团队