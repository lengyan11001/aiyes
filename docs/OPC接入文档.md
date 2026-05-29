# OPC 数据接入文档

> 本文档为内部交付文档，不在网站公开展示。共享鉴权 key 不要发布到公开页面、公开仓库、工单截图或聊天群公告中。

## 1. 接口信息

| 项目 | 内容 |
| --- | --- |
| 请求地址 | `POST https://aiyes.vip/opc_data` |
| 请求类型 | `multipart/form-data` |
| 鉴权方式 | Header 传 `key` |
| Header 示例 | `key: YOUR_OPC_ACCESS_KEY` |

## 2. Body 请求参数（form-data）

| 参数名 | 参数值示例 | 是否必填 | 参数类型 | 描述说明 |
| --- | --- | --- | --- | --- |
| `opcList` | `[A公司,B公司]` | 是 | array | OPC 主体名称列表 |
| `startDate` | `2026-04-01` | 否 | string | 开始时间 |
| `endDate` | `2026-04-30` | 否 | string | 结束时间 |

说明：

- `recharge` 和 `consume` 按 `startDate`、`endDate` 过滤。
- `production` 为全量作品统计数据，不受 `startDate`、`endDate` 限制。
- `opcList` 当前兼容主体名称、用户名、邮箱、API Key token；对外按主体名称列表传参即可。
- 单次最多查询 100 个主体。

## 3. 成功响应（200）

响应顶层以主体名称作为 key，每个主体对象固定包含 `recharge`、`consume`、`production` 三个字段。

```json
{
  "A公司": {
    "recharge": [
      {
        "amount": 100,
        "time": "2026-04-10T12:00:00.000Z",
        "invoice_url": "",
        "order_id": "order_xxx"
      }
    ],
    "consume": [
      {
        "name": "seedance2",
        "type": "视频生成",
        "result": "视频10秒",
        "cost": 8.5,
        "time": "2026-04-12T09:30:00.000Z"
      }
    ],
    "production": {
      "image_num": 12,
      "audio_num": 0,
      "audio_duration": 0,
      "video_num": 6,
      "video_duration": 60
    }
  },
  "B公司": {
    "recharge": [],
    "consume": [],
    "production": {
      "image_num": 0,
      "audio_num": 0,
      "audio_duration": 0,
      "video_num": 0,
      "video_duration": 0
    }
  }
}
```

### A公司 / B公司 对象字段

| 字段 | 类型 | 是否必填 | 描述 |
| --- | --- | --- | --- |
| `recharge` | array[object] | 是 | 充值信息 |
| `consume` | array[object] | 是 | 消耗明细 |
| `production` | object | 是 | 作品信息统计数据，全量数据，不根据 `startDate` 和 `endDate` 限制 |

### recharge 字段

| 字段 | 类型 | 是否必填 | 描述 |
| --- | --- | --- | --- |
| `amount` | number | 是 | 充值金额，单位：元 |
| `time` | string | 是 | 充值时间 |
| `invoice_url` | string | 是 | 发票下载地址；暂无发票时返回空字符串 |
| `order_id` | string | 是 | 订单 ID |

### consume 字段

| 字段 | 类型 | 是否必填 | 描述 |
| --- | --- | --- | --- |
| `name` | string | 是 | 模型/工具名称，例如：`seedance2` |
| `type` | string | 是 | 模型/工具类型，例如：`视频生成` |
| `result` | string | 是 | 生成结果，例如：`视频10秒`、`图片1张`、`音频10秒` |
| `cost` | number | 是 | 产生费用，单位：元 |
| `time` | string | 是 | 消耗时间 |

### production 字段

| 字段 | 类型 | 是否必填 | 描述 |
| --- | --- | --- | --- |
| `image_num` | integer | 是 | 累计生成的图片数量 |
| `audio_num` | integer | 是 | 累计生成的音频数量 |
| `audio_duration` | integer | 是 | 累计生成的音频时长，单位：秒 |
| `video_num` | integer | 是 | 累计生成的视频数量 |
| `video_duration` | integer | 是 | 累计生成的视频时长，单位：秒 |

## 4. 失败响应（404）

鉴权失败、参数不合法或接口处理失败时返回 404，响应体为空对象。

```json
{}
```

## 5. 调用示例

```bash
curl -X POST https://aiyes.vip/opc_data \
  -H "key: YOUR_OPC_ACCESS_KEY" \
  -F "opcList=[A公司,B公司]" \
  -F "startDate=2026-04-01" \
  -F "endDate=2026-04-30"
```
