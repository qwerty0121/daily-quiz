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
