/* ============================================================
   ☆☆ 信箱配置 —— 每次加新信，只需要编辑这个文件 ☆☆

   · startDate   ：在一起的日子，格式 "2026-06-10"（用于右上角恋爱计时和恋爱日历）
   · loveCalendar.customDates ：自定义纪念日列表 { date, name }（可选）
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
  startDate: "2026-06-10",  // ★ 在一起的日子（右上角小方框与恋爱日历都靠它）

  /* 恋爱日历的自定义日子（✿ 标记）：以后想去掉哪里玩了、第一次做什么，
     就往这里加一条，日历上立刻多一朵小花 */
  loveCalendar: {
    customDates: [
      // { date: "2026-07-20", name: "去海边玩" },
    ]
  },

  letters: [
    {
      id: "guide",
      date: "2026-08-16",
      title: "第一封信 · 欢迎光临",
      excerpt: "点开这封信，我教你玩～",
      pages: [
        "letters/guide/page-1.svg",
        "letters/guide/page-2.svg"
      ]
    },
    {
      id: "qixi-2026",
      date: "2026-08-17",
      title: "七夕 · 见字如面",
      excerpt: "一封穿着星河的信，等你拆开。",
      theme: "qixi",          // ★ 七夕星河皮肤：切到这封信时整站换装
      pages: [
        "letters/demo/page-1.svg",   // ★ 明天换成手写扫描件（可多页）
        "letters/demo/page-2.svg"
      ]
    }
  ]
};
