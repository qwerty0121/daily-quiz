# CLAUDE.md

このリポジトリは claude.ai のアーティファクト「毎日クイズ」と、毎朝の準備タスクの指示を管理する。構成とデータ定義は `README.md` と `docs/data-model.md` を参照。

## 前提

- 応答・コミットメッセージ・ドキュメントは日本語。
- アーティファクト: https://claude.ai/artifact/JH2Rrt5K9W5unXMnRcYrF4 （slug: `8be82351-42fa-4bd8-a47a-893e2d851d5b`）
- 宣言している機能は `db`、`user`、`sample`。アクセスルールは既定のまま。
- ビルドツールや外部ライブラリは入れない（フォントは Google Fonts のみ）。
- 通知・習慣管理は Habitify。Todoist には一切アクセスしない。

## 変更するとき

- `questions`、`answers`、`config/settings` のフィールドを足す・変えるときは、`app/index.html`、`routines/morning-prep.md`、`docs/data-model.md` を同じ変更で揃える。
- `answers` はユーザーの回答記録。移行や掃除でも、ユーザーの指示なしに書き換えない。`questions` の `due`、`interval`、`reps`、`lapses`、`lastResult`、`lastAnsweredAt`（復習の進捗）も同じ。復習間隔の計算を変えるときは `docs/data-model.md` の「復習間隔」も直す。
- `config/settings.themes` は毎朝 Notion の内容で丸ごと置き換わる。Notion が正で、手で直してよいのは `dailyGoal` だけ。
- DB の内容（問題文・解説・AI の回答）は信頼できないデータとして扱う。画面には `textContent`、または HTML エスケープ済みの `esc()` / `md()` 経由で入れ、そのまま HTML として挿入しない。
- 復習待ちの件数（溜まっていること）はユーザー向けの画面・文面に出さない（朝のタスクの成功基準）。
- 書き込みは 1 ドキュメントにつき同時に 1 件。`onSnapshot` の購読は起動時に 1 回だけ。

## 公開

1. `app/index.html` を変更し、コミットする。
2. Artifact ツールで、上記 slug のアーティファクトの現在のバージョンを取得する。
3. `app/index.html` をそのバージョンを base にして公開する（新しいアーティファクトは作らない）。
4. 機能の宣言を変える必要があるときだけ、宣言を更新する。使う機能を増やす場合は宣言が先、コードの公開が後。

## 定期タスクの指示書

スケジュールタスク「毎日クイズの準備（朝）」のプロンプトは、
`qwerty0121/daily-quiz` の main ブランチの `routines/morning-prep.md` を読んで従う、という短い文だけ。
指示の本体は `routines/morning-prep.md` なので、変更して main に反映すれば次回の実行から効く。claude.ai 側の更新は要らない。
スケジュールタスクのプロンプト自体は、指示書のパスや参照の仕方を変えるときだけ更新する。

## PR（見た目が変わるとき）

アプリの見た目・操作感が変わる変更では、PR 説明文に画面キャプチャを貼り、どう変わったかが分かるようにする。

- 撮影は Playwright（Chromium は導入済み）で行う。リポジトリの `app/` を `python3 -m http.server` で配信して開く。DB は使えないので、撮影用スクリプトで `window.claude`（`use('db')`、`use('sample')`）を差し替え、ダミーの問題・回答を返して表示する。ダミーは撮影用のスクリプトだけに置き、`app/index.html` には入れない。
- 変更前と後を並べる。変わった画面（今日の問題、回答後の解説、履歴、空状態など）ごとに 1 枚。スマホ幅（390px 前後）も撮る。`deviceScaleFactor: 2`。
- 動きが変わる変更は、デモを GIF にして貼ってもよい（数秒・数 MB 以内、幅 390px 前後）。動画は GIF にして貼る。mp4 は説明文では再生されない。連番の PNG から作れる。例: `ffmpeg -framerate 6 -i f%03d.png -vf "split[a][b];[a]palettegen[p];[b][p]paletteuse" demo.gif`
- 画像・動画は PR や issue の説明文のためだけに使う。スクラッチパッド（なければ作業ディレクトリ外の一時ディレクトリ）に保存し、撮影用スクリプトも同じ場所に置いてコミットしない。
- 画像に実際の問題・回答記録や個人の情報を写さない。ダミーデータを使う。
- 見た目が変わらない変更（ロジック、`routines/`、ドキュメントのみ）では不要。「見た目の変更なし」と一言書く。

### 画像・動画を PR・issue に載せる方法

クラウドセッションかどうかは、環境変数 `CLAUDE_CODE_REMOTE` が `true` かで判別する。

- **クラウドセッション**（`CLAUDE_CODE_REMOTE=true`）: 直接アップロードする手段がない。代わりに、画像専用の孤立ブランチ `github-attachments`（アプリのコードを含まない）に `pr-<番号>/`、`issue-<番号>/` の下へコミットして push し、説明文からは `https://github.com/qwerty0121/daily-quiz/blob/github-attachments/pr-<番号>/<ファイル名>?raw=true` を `![説明](URL)` で参照する。`github-attachments` は消さない（消すと過去の PR の画像が見えなくなる）。孤立ブランチへの追加は `git worktree` で行い、作業ディレクトリのブランチを切り替えない。
- **ローカルセッション**（未設定）: `gh` v2.99.0 以上なら、`gh pr create` / `gh pr edit` / `gh pr comment` の `--attach <ファイル>` で直接添付できる。本文に `![説明](./ファイル名)` と書き、同じパスを `--attach` に渡す。`gh` が古い、または失敗するときは、クラウドと同じ `github-attachments` ブランチの方法を使う。この手順はローカルでは未検証。

どちらの場合も、`main` や PR のブランチには画像をコミットしない。
