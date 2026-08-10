# 如何同步 OpenBB upstream

触发条件：需要引入新的 `OpenBB-finance/OpenBB:develop` commit。目标：保留 Fork 历史、自有扩展和完整上游兼容面。

## 先决条件

- 确认工作树干净：`git status --short` 无输出。
- 确认仓库不是 shallow clone：`git rev-parse --is-shallow-repository` 输出 `false`。
- 确认 `git remote get-url --push upstream` 输出 `DISABLED`。
- 确认已记录当前 `main` commit，便于回退本地合并。

## 步骤

1. 抓取上游 `develop`，不要抓取 tags。

   ```powershell
   git fetch --no-tags upstream +refs/heads/develop:refs/remotes/upstream/develop
   ```

   应见：`upstream/develop` 更新。Windows 上游存在仅大小写不同的 refs；抓取全部 tags 可能触发 files-ref backend 冲突。

2. 创建同步分支。

   ```powershell
   git switch -C sync/openbb-develop upstream/develop
   git switch main
   ```

   应见：回到 `main`，同步分支指向待合入 commit。

3. 合并上游，不改写历史。

   ```powershell
   git merge --no-ff sync/openbb-develop
   ```

   若冲突触及 OpenBB Core，停止自动解决并逐项确认自有扩展是否能迁出 Core。

4. 运行扩展与上游兼容门禁。

   ```powershell
   uv run --python 3.12 --with-editable openbb_platform/core --with-editable openbb_platform/extensions/openalice_data --with pytest python -m pytest openbb_platform/extensions/openalice_data/tests -q
   ```

   应见：所有 OpenAlice Data 测试通过，且没有 collection error。

5. 更新 [UPSTREAM.md](../UPSTREAM.md) 的 commit 与日期，再提交同步结果。

6. 使用本机已配置的 Gitea 凭据推送 `main`；推送后核对本地与远端 commit 一致。

## 失败与回退

| 症状 | 处置 |
|---|---|
| shallow lineage 错误 | 运行 `git fetch --unshallow upstream develop --no-tags`，再重试 |
| 大小写 ref 冲突 | 保持 `--no-tags` 和单分支 refspec；不要全量 mirror refs |
| Core 冲突无法隔离 | `git merge --abort`，在独立迁移分支先把自有改动移入 extension/provider |
| Gitea 拒绝大对象 | 停止推送并由服务端管理员确认仓库/反代限制；不得拆掉完整基线规避限制 |
