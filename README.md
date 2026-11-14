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
```

| 部品 | 場所 |
|---|---|
| クイズページ | https://claude.ai/artifact/JH2Rrt5K9W5unXMnRcYrF4 （ソース: `app/`） |
| 朝の準備タスク | claude.ai の定期実行タスク `trig_01BkEYjwhDajd2aKv6Fx6nX4`（指示書: `routines/morning-prep.md`。main の内容が実行時に使われる） |
| テーマ管理 | Notion「学習テーマデータベース」（`docs/notion-schema.md`） |
| 通知・習慣管理 | Habitify（Todoist は使わない） |

## ディレクトリ

- `app/` … クイズページのソース（アーティファクトの公開版のコピー）。ファイルの役割は下の表
- `routines/` … 定期実行タスクの指示書とスケジュール等の設定（main の内容が実行時に使われる）
- `docs/data-model.md` … DB のコレクション構成、復習間隔、出題量のルール
- `docs/notion-schema.md` … Notion 学習テーマDBのプロパティ

## アプリのファイル

ビルドは不要（ブラウザの ES modules をそのまま読む）。ローカルで確認するときは `app/` を `python3 -m http.server` で配信する。テストは `npm test`（E2E は Playwright を依存に入れておらず、見つからなければ skip する。クラウドセッションには導入済み）（`window.claude` がないので、データは読み込めず接続できない旨の画面になる）。

| パス | 内容 |
|---|---|
| `app/index.html` | 画面の骨組み（HTML）。`style.css` と `js/main.js` を読み込む |
| `app/style.css` | スタイル |
| `app/js/main.js` | 入口。イベントを登録し、データ接続を始める |
| `app/js/state.js` | 共有する状態（`S`）と定数、描画先の要素（`view`） |
| `app/js/util.js` | 日付・HTML エスケープ・簡易 Markdown の道具（状態には触らない） |
| `app/js/quiz.js` | 復習間隔の計算（`schedule`）、次に出す問題の選択、目標・有効テーマの取得 |
| `app/js/render.js` | 「今日」「履歴」の描画、スナップショット更新時の再描画（`refresh`） |
| `app/js/actions.js` | 回答、まぐれ・あやふやの切り替え、次の問題、問題のその場生成、履歴の展開 |
| `app/js/chat.js` | 問題についての質問（`sample`） |
| `app/js/events.js` | クリック・送信のイベント登録 |
| `app/js/data.js` | `db` / `sample` への接続と `onSnapshot` の購読 |
| `test/*.test.mjs`、`test/support/` | `node:test` のテスト。`quiz.test.mjs`（復習間隔・出題の選び方）と `util.test.mjs`（日付・エスケープ）は DOM に依存しない処理を、`e2e.test.mjs` は Chromium（Playwright）で実際の画面を動かして、回答の書き込み・購読・画面・XSS を確かめる。`window.claude`（db・sample）は `test/support/harness.mjs` の偽物に差し替える。`npm test` で実行 |

## 管理しないもの

- テーマの中身 … Notion が正
- 問題・回答の記録 … アーティファクトのDBが正

## 運用メモ

- アプリ（`app/index.html`）は記録用のコピーで、変更しても本番には自動反映されない。ページを直したらアーティファクトを再公開すること（逆に、本番を直したらここにも反映する）。手順は `CLAUDE.md`。
- 朝のタスクの指示書（`routines/morning-prep.md`）は、main に反映すれば次回の実行から効く。タスクのプロンプトは「main のこのファイルを読んで従う」だけの短い文で、指示書のパスや参照の仕方を変えるときだけ更新する。
- 以前あった昼の再通知タスク（12:13 JST、Todoist のタスク完了・再設定）は、通知を Habitify に移した際に廃止済み。
