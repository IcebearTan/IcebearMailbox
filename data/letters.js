/* ============================================================
   ☆☆ 信箱配置 —— 每次加新信，只需要编辑这个文件 ☆☆

   · startDate   ：在一起的日子，格式 "2026-06-10"（用于恋爱计时）
   · letters     ：信件列表，最新的放在最上面
       - id      ：随意起个不重复的名字
       - date    ：写信日期 "YYYY-MM-DD"（会印在邮戳上）
       - title   ：信的标题
       - excerpt ：信封下的一小句预告（可留空）
       - theme   ：特别主题皮肤，可选。目前支持 "qixi"（七夕星河：
                   紫金配色 + 银河 + 牛郎织女 + 鹊桥喜鹊 + 金色火漆）。
                   不写就是经典暖阳信笺风。
       - pages   ：扫描件/照片路径，多页按顺序排列
   ============================================================ */

window.MAILBOX = {
  siteTitle: "给你的信",
  subtitle: "一封一封，慢慢写给你",
  footerText: "❋ 纸短情长 ❋",
  startDate: "",            // 例如 "2024-05-20"

  letters: [
    {
      id: "demo-qixi",
      date: "2026-08-19",
      title: "七夕 · 写给你的信（示例）",
      excerpt: "鹊桥搭好的那天，见字如面。",
      theme: "qixi",          // ★ 特别主题：整站切换成七夕星河皮肤；不写就是经典暖阳信笺
      pages: [
        "letters/demo/page-1.svg",
        "letters/demo/page-2.svg"
      ]
    },
    {
      id: "demo",
      date: "2026-08-16",
      title: "最近写的（示例）",
      excerpt: "见字如面，这个信箱从今天开始营业。",
      pages: [
        "letters/demo/page-1.svg",
        "letters/demo/page-2.svg"
      ]
    },
    {
      id: "demo-2",
      date: "2026-07-20",
      title: "上个月写的（示例）",
      excerpt: "",
      pages: ["letters/demo/page-2.svg"]
    },
    {
      id: "demo-3",
      date: "2026-06-12",
      title: "更早写的（示例）",
      excerpt: "",
      pages: ["letters/demo/page-1.svg"]
    }
  ]
};
