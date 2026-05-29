import { LegalPage } from "@/components/legal-page";
import { menuUser } from "@/lib/account-data";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const sections = [
  {
    title: "一、服务内容",
    paragraphs: [
      "Aiyes 为用户提供图片生成、视频生成、任务查询、余额流水、API Key 管理及相关 API 接入能力。平台会根据模型能力、系统负载、合规要求和运营策略调整可用功能。",
      "用户通过网页或 API 发起生成任务时，应确保提交的提示词、参考图片、参数和用途符合法律法规、平台规则以及第三方模型服务要求。",
    ],
  },
  {
    title: "二、账号与 API Key",
    paragraphs: [
      "用户应妥善保管账号、密码和 API Key。凡使用账号或 API Key 发起的操作，均视为该账号授权行为。发现泄露、盗用或异常调用时，应及时删除相关 Key 或联系平台处理。",
      "子 Key 与父账号共享账户余额。用户可为子 Key 设置积分额度和调用次数上限，额度控制仅用于限制该 Key 的生成消费，不代表独立余额或充值账户。",
    ],
  },
  {
    title: "三、费用与余额",
    paragraphs: [
      "平台按页面展示或接口返回的当前计费规则扣减积分。充值、消费、退款和管理员调整会进入账户流水，用户可在平台内查询。",
      "因第三方支付、网络、模型服务或系统维护导致的状态延迟，平台会尽力同步和修正账务记录；如存在争议，以平台后台记录、支付渠道记录和实际服务结果综合核验。",
    ],
  },
  {
    title: "四、内容规范",
    paragraphs: [
      "用户不得利用平台生成、传播违法违规、侵犯他人权益、恶意欺诈、暴力恐吓、淫秽色情、仇恨歧视、虚假误导或其他不当内容。",
      "用户应自行确认输入素材和生成结果的使用权、肖像权、著作权、商标权及其他相关权利。因用户内容或使用行为引发的责任由用户自行承担。",
    ],
  },
  {
    title: "五、服务变更与中止",
    paragraphs: [
      "平台可能因系统升级、故障排查、合规审核、第三方模型变更或安全风控临时调整、暂停或终止部分服务。",
      "若用户违反本协议或存在异常调用、攻击、绕过限制、倒卖账号等行为，平台有权限制功能、暂停账号、删除 Key、冻结可疑任务或采取其他必要措施。",
    ],
  },
  {
    title: "六、免责声明",
    paragraphs: [
      "AI 生成结果具有不确定性，平台不保证结果完全满足用户预期、绝对准确、持续可用或适合特定商业目的。",
      "在法律允许范围内，平台对因不可抗力、第三方服务、网络故障、用户配置错误或用户违规使用造成的间接损失不承担责任。",
    ],
  },
  {
    title: "七、协议更新",
    paragraphs: [
      "平台可根据业务、法律法规或产品变化更新本协议。更新后的协议会通过页面展示等合理方式通知，用户继续使用服务即表示接受更新后的条款。",
    ],
  },
];

export default async function TermsPage() {
  const user = await requireUser();
  return (
    <LegalPage
      title="用户协议"
      description="本协议用于说明用户使用 Aiyes 图片/视频生成与 API 接入服务时的权利、义务和基本规则。"
      updatedAt="2026年5月28日"
      sections={sections}
      user={user ? menuUser(user) : null}
    />
  );
}
