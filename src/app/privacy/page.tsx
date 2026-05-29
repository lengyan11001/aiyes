import { LegalPage } from "@/components/legal-page";
import { menuUser } from "@/lib/account-data";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const sections = [
  {
    title: "一、我们收集的信息",
    paragraphs: [
      "为提供账号登录、生成任务、API 调用、充值和后台管理能力，我们会收集账号标识、登录状态、余额、订单、API Key 元数据、生成任务参数、任务状态、消费流水、IP 地址和必要的设备/请求信息。",
      "用户主动提交的提示词、参考图片地址、上传素材、生成参数和生成结果会被记录，用于完成任务、展示历史记录、账务核验、故障排查和安全风控。",
    ],
  },
  {
    title: "二、信息使用目的",
    paragraphs: [
      "我们使用相关信息来创建和维护账号、处理登录、执行生成任务、计算费用、展示流水、限制异常调用、排查故障、改进产品体验以及满足法律法规要求。",
      "API Key 的完整值仅用于用户在平台内查看和复制；平台仍以 hash 方式完成鉴权校验。用户删除 Key 后，该 Key 将不能继续用于调用服务。",
    ],
  },
  {
    title: "三、信息共享与第三方服务",
    paragraphs: [
      "为完成图片或视频生成，我们可能将必要的提示词、参考素材地址和生成参数提交给第三方模型或基础设施服务。第三方服务会根据其自身规则处理请求。",
      "支付、云服务、日志、安全和模型供应商可能接触到完成服务所必需的信息。除法律法规要求、用户授权或服务必要场景外，我们不会出售用户个人信息。",
    ],
  },
  {
    title: "四、信息存储与安全",
    paragraphs: [
      "我们会采取合理的技术和管理措施保护数据安全，包括访问控制、密钥 hash 校验、权限隔离、日志审计和必要的传输保护。",
      "互联网服务无法保证绝对安全。用户应妥善保管账号密码和 API Key，并在发现异常时及时修改密码、删除 Key 或联系平台处理。",
    ],
  },
  {
    title: "五、用户权利",
    paragraphs: [
      "用户可在平台内查看账号余额、任务记录、流水和 API Key 信息，并可创建、修改或删除子 Key。",
      "如需查询、更正、删除个人信息或注销账号，可通过平台提供的联系方式提出请求。我们会在核验身份后按法律法规和业务安全要求处理。",
    ],
  },
  {
    title: "六、Cookie 与登录状态",
    paragraphs: [
      "平台使用必要 Cookie 或同类技术保存登录状态、维持会话安全和识别请求来源。这些技术是账号登录、权限校验和安全风控所必需。",
    ],
  },
  {
    title: "七、政策更新",
    paragraphs: [
      "我们可能根据产品、服务或法规变化更新隐私协议。更新后会在页面展示新的版本和日期，用户继续使用服务即表示了解并接受更新内容。",
    ],
  },
];

export default async function PrivacyPage() {
  const user = await requireUser();
  return (
    <LegalPage
      title="隐私协议"
      description="本协议说明 Aiyes 在提供图片/视频生成与 API 接入服务过程中如何收集、使用、存储和保护相关信息。"
      updatedAt="2026年5月28日"
      sections={sections}
      user={user ? menuUser(user) : null}
    />
  );
}
