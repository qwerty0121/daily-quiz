# daily-quiz（毎日クイズ）

キャリア開発と業務のための隙間時間学習の仕組み。毎朝問題が用意され、スマホで1〜5分、タップだけで答える。間違えた問題や自信のない問題は間隔反復で再出題される。

## 構成

```
Notion 学習テーマDB ──(毎朝同期)──┐
                                    ▼
定期実行タスク「毎日クイズの準備（朝）」 6:47 JST
  テーマ同期 → 復習待ち件数で出題量を決める → 新規問題を生成
                                    │ ArtifactData
                                    ▼
クイズページ（claude.ai アーティファクト）
  回答・自信の記録・AIへの質問・履歴
                                    ▲
Habitify で毎日の通知と習慣チェック
   （回答1問ごとに、ページから習慣「毎日クイズをやる」へ 1 rep を記録する（習慣側の目標が N なら N 問で達成））
```

| 部品 | 場所 |
|---|---|
| クイズページ | https://claude.ai/artifact/JH2Rrt5K9W5unXMnRcYrF4 （ソース: `app/index.html`） |
| 朝の準備タスク | claude.ai のルーティン（指示本文: `routines/morning-prep.md`、ルーティン側の設定: `routines/morning-prep.trigger.md`） |
| テーマ管理 | Notion「学習テーマデータベース」（`docs/notion-schema.md`） |
| 通知・習慣管理 | Habitify（Todoist は使わない）。ページが `mcp` 機能で Habitify MCP の `add-habit-log` を呼ぶ（習慣ID `-P5vNISNlgX1gjnZS5vC`） |

## ディレクトリ

- `app/index.html` … クイズページのソース（アーティファクトの公開版のコピー）
- `routines/` … 定期実行タスクの指示文とスケジュール等の設定
- `docs/data-model.md` … DB のコレクション構成、復習間隔、出題量のルール
- `docs/notion-schema.md` … Notion 学習テーマDBのプロパティ

## 管理しないもの

- テーマの中身 … Notion が正
- 問題・回答の記録 … アーティファクトのDBが正

## 運用メモ

- 朝の準備タスクの指示本文は、main ブランチの `routines/morning-prep.md` が正。ルーティンは毎回これを読んで実行するので、main を更新するだけで次回から反映される。
- ルーティンに直接設定するカスタム指示（本文を読ませるだけの短い指示）と、スケジュール・モデル・コネクタなどの設定は `routines/morning-prep.trigger.md` に記録している。こちらはルーティン側の設定を変えたときに、手動で更新すること（自動では同期されない）。
- クイズページ（`app/index.html`）は記録用のコピーで、変更しても本番には自動反映されない。ページを直したらアーティファクトを再公開すること（逆に、本番を直したらここにも反映する）。
- 以前あった昼の再通知タスク（12:13 JST、Todoist のタスク完了・再設定）は、通知を Habitify に移した際に廃止済み。
