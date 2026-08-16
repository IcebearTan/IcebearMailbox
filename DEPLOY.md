# 部署指南 · 把信箱挂到 GitHub Pages 🚀

> 目标：得到一个 `https://你的用户名.github.io/仓库名/` 的网址，
> 手机电脑都能打开，以后 `git push` 一分钟自动更新。

## ⚠️ 开始前必读

GitHub Pages 免费版要求仓库**公开（Public）**，这意味着：

- 任何拿到网址的人都能打开信箱（建议加暗号锁，见文末）
- 任何会翻 GitHub 的人都能看到源码、信件图片、称呼和纪念日
- 仓库名会出现在网址里，建议别用和真实姓名相关的词

如果以后想改成私密：用 Vercel/Netlify 免费托管私有仓库，见文末「换私密部署」。

---

## 第一步：在 GitHub 上建仓库（约 1 分钟）

1. 打开 https://github.com/new （先登录你的账号）
2. **Repository name**：起个名字，比如 `mailbox`
3. 选 **Public**（免费 Pages 的硬要求）
4. **不要**勾选 "Add a README file"（本地已经有了）
5. 点绿色按钮 **Create repository**

创建后页面会显示一堆命令，**先别管它**，回来做第二步。

---

## 第二步：把代码推上去（三种方式任选其一）

### 方式 A：命令行 + gh 工具（推荐，以后每次更新都最省事）

在终端依次执行：

```bash
brew install gh
gh auth login
```

`gh auth login` 的选项依次选：

- **GitHub.com**
- **HTTPS**
- **Yes**（用 Git 凭证认证）
- **Login with a web browser** → 复制屏幕显示的 8 位代码 → 回车打开浏览器 → 粘贴代码 → 点授权

然后回到项目目录推送（把 `你的用户名` 和 `mailbox` 换成你自己的）：

```bash
cd /Users/icebear/开发/IcebearMailbox
git remote add origin https://github.com/你的用户名/mailbox.git
git push -u origin main
```

看到 `main -> main` 就成功了。

### 方式 B：纯命令行（不装新工具）

和方式 A 相同，只是推送时 GitHub 会弹浏览器让你登录授权
（macOS 自带的 git 凭证助手会处理）。如果要求输密码，
注意 GitHub 已不接受账号密码，需要用 **Personal Access Token**
（GitHub → Settings → Developer settings → Personal access tokens 生成）当作密码。

### 方式 C：GitHub Desktop 图形界面（完全不碰终端）

1. 下载安装 https://desktop.github.com
2. File → **Add Local Repository** → 选择 `/Users/icebear/开发/IcebearMailbox`
3. 点 **Publish repository**：
   - 名字随便
   - **取消勾选 "Keep this code private"**（必须公开才能用免费 Pages）
   - 点 Publish

---

## 第三步：打开 Pages（最后一击）

1. 打开你的仓库页面（github.com/你的用户名/mailbox）
2. 顶部 **Settings** → 左侧栏找到 **Pages**
3. **Source**：选 **Deploy from a branch**
4. **Branch**：选 `main`，目录选 `/ (root)`，点 **Save**
5. 等待 1～3 分钟，刷新该页面，顶部会出现绿框：

```
https://你的用户名.github.io/mailbox/
```

把这个网址发给她 💌

---

## 以后的更新流程

改了任何东西（加新信、换手写扫描件、改配置）之后：

```bash
cd /Users/icebear/开发/IcebearMailbox
git add -A
git commit -m "这次改了什么的简短说明"
git push
```

推完等一分钟左右，线上自动更新。用 GitHub Desktop 的话就是：
左边写个说明 → **Commit to main** → **Push origin**。

**加一封新信的完整例子**（比如明天的七夕手写版）：

1. 把手写照片放进 `letters/qixi-2026/`（比如 `1.jpg`、`2.jpg`）
2. 打开 `data/letters.js`，把七夕那封的 `pages` 改成：
   ```js
   pages: ["letters/qixi-2026/1.jpg", "letters/qixi-2026/2.jpg"]
   ```
3. 上面三条 git 命令推上去，完事

---

## 常见问题

**网址打开是 404？**
- Pages 刚开启要等几分钟；检查 Settings → Pages 的 Branch 是不是 `main` + `/ (root)`
- 确认网址拼对了（注意结尾有 `/`，以及仓库名）

**推送时被拒绝 / 要求登录？**
- 方式 A 重新跑一次 `gh auth login`
- 方式 B 需要用 Token 当密码（见上文）

**改了没生效？**
- 网站本身不存在缓存问题（信纸和配置都是时间戳加载），线上没更新
  多半是忘了 `git push`，或者 Pages 还在部署中（看仓库 Actions 页有没有绿勾）

**想换网址？**
- 仓库名改成 `你的用户名.github.io`，网址就是根路径 `https://你的用户名.github.io/`
  （仓库 Settings → General → 改名即可，本地 remote 会自动重定向）

---

## 换私密部署（以后想通了随时可换）

1. 注册 https://vercel.com （用 GitHub 账号登录）
2. Add New → Project → Import 你的仓库（可以先把仓库转成 Private）
3. 一路默认 → Deploy，得到一个 `xxx.vercel.app` 网址
4. 以后还是 `git push` 就自动更新，仓库保持私有

## 加一层暗号锁（公开仓库的缓冲垫）

想要的话让 Claude 加：进站先输一个只有你们俩知道的日子/词，
对了才开箱。前端锁挡得住链接访客，挡不住会翻仓库源码的人。
