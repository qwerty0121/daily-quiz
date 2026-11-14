# CLAUDE.md

このリポジトリは claude.ai のアーティファクト「毎日クイズ」と、毎朝の準備タスクの指示を管理する。構成とデータ定義は `README.md` と `docs/data-model.md` を参照。

## 前提

- 応答・コミットメッセージ・ドキュメントは日本語。
- アーティファクト: https://claude.ai/artifact/JH2Rrt5K9W5unXMnRcYrF4 （slug: `8be82351-42fa-4bd8-a47a-893e2d851d5b`）
- 宣言している機能は `db`、`user`、`sample`。アクセスルールは既定のまま。
- アプリは `app/index.html`（骨組み）、`app/style.css`、`app/js/*.js`（ES modules）に分けている。並行する変更が同じファイルで衝突しにくくするため。ビルドツールや外部ライブラリは入れない（フォントは Google Fonts のみ）。モジュールの役割は `README.md` の「ファイル」の表を参照。
- 新しい機能は、近いモジュールに足すか、新しい `app/js/*.js` を作って `README.md` の表に載せる。共有する状態は `app/js/state.js` の `S` に置き、モジュール内にだけ閉じる状態は各モジュールの変数にする。
- コミット前に `npm test` が通ること（CI（`.github/workflows/ci.yml`）も PR ごとに同じことを行う）。テストは `test/*.test.mjs`（`node:test`、追加の依存なし。Node 22 以上）。`e2e.test.mjs` は導入済みの Playwright で動かし、見つからなければ skip する。画面や書き込みの挙動、復習間隔を変えたら、対応するテストを足す。
- 通知・習慣管理は Habitify。Todoist には一切アクセスしない。

## 変更するとき

- `questions`、`answers`、`config/settings` のフィールドを足す・変えるときは、`app/` の該当モジュール（購読は `app/js/data.js`、書き込みは `app/js/actions.js` など）、`routines/morning-prep.md`、`docs/data-model.md` を同じ変更で揃える。
- `answers` はユーザーの回答記録。移行や掃除でも、ユーザーの指示なしに書き換えない。`questions` の `due`、`interval`、`reps`、`lapses`、`lastResult`、`lastAnsweredAt`（復習の進捗）も同じ。復習間隔の計算を変えるときは `docs/data-model.md` の「復習間隔」も直す。
- `config/settings.themes` は毎朝 Notion の内容で丸ごと置き換わる。Notion が正で、手で直してよいのは `dailyGoal` だけ。
- DB の内容（問題文・解説・AI の回答）は信頼できないデータとして扱う。画面には `textContent`、または HTML エスケープ済みの `esc()` / `md()` 経由で入れ、そのまま HTML として挿入しない。
- 復習待ちの件数（溜まっていること）はユーザー向けの画面・文面に出さない（朝のタスクの成功基準）。
- 書き込みは 1 ドキュメントにつき同時に 1 件。`onSnapshot` の購読は起動時に 1 回だけ。

## 公開

1. `app/index.html`、`app/style.css`、`app/js/` を変更し、コミットする。
2. Artifact ツールで、上記 slug のアーティファクトの現在のバージョンを取得する。
3. `app/index.html` をそのバージョンを base にして公開する（新しいアーティファクトは作らない）。`app/style.css` と `app/js/*.js` は `files` で、`app/` を除いた公開パスで渡す（例: `"style.css": "app/style.css"`、`"js/main.js": "app/js/main.js"`）。モジュールを足した・消した・改名したときは、`files` の対応に追加し、不要になったパスは `null` で消す。
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

## PR の動作確認用アーティファクト

`app/` の `index.html`、`style.css`、`js/` など、アーティファクトの挙動が変わる変更の PR では、本番とは別に動作確認用のアーティファクトを作る。本番（上記 slug）には PR のマージ前に公開しない。本番の DB には復習の進捗（`questions` の `due` など）と回答記録があり、試しに触ると壊れるため。

1. PR を作成して番号を確定する（番号は作成後にしか分からない）。
2. 作業ディレクトリ外（scratchpad）に `app/` のコピーを作り、`index.html` の `<title>` を `毎日クイズ PR#<番号>` に変えて、`style.css` と `js/` も `files` で一緒に、新しいアーティファクトとして公開する。コピーだけを変え、リポジトリの `app/index.html` のタイトルは変えない。宣言する機能は本番と同じ（`db`、`user`、`sample`）にする。
3. 公開した URL を PR の説明文に書く。PR に追加のコミットを積んだら、同じ URL に公開し直す。
4. 動作確認用アーティファクトの DB は本番とは別で、最初は空。本番のデータは使えない。本番の DB には読み書きしない。
   - 公開したら、確認に必要なダミーデータを、`ArtifactData` で動作確認用アーティファクトの DB だけに入れる。空のまま渡さない。
   - 確認する変更に合わせて作る。最低限、`config/settings`（`dailyGoal` と有効なテーマ数件）、期限が今日以前の `questions`（4 択と ○× を両方）、直近数日分の `answers`（正解・不正解・あやふや）を入れる。履歴のグラフを確認するなら日付を散らし、復習の確認なら `reps` や `interval` を変えたものを混ぜる。
   - ダミーは `doc_id` を `dummy-` で始め、問題文の先頭に「【ダミー】」を付ける。`theme` は `ダミーテーマ`、`source` は `dummy`。実在の問題・回答記録や個人情報は使わない。
   - 動作確認用アーティファクトを削除するときに一緒に消えるので、片付けは不要。
5. PR をマージしたら、動作確認用アーティファクトを削除する。削除前に URL とタイトルに `PR#<番号>` が付いていることを確認し、本番の slug のものを消さない。その後、本番アーティファクトを「公開」の手順で更新する。
6. マージせずに PR を閉じた場合も、動作確認用アーティファクトを削除する。
