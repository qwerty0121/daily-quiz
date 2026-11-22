<!--
定期実行タスク「毎日クイズの準備（朝）」に直接設定するカスタム指示（ルーティン側の設定）の記録。
- 本文（下の「カスタム指示」）は routines/morning-prep.md を main から読ませるだけの短い指示。
- ルーティンのカスタム指示を変えたら、この記録も更新すること（逆も同じ。自動では同期されない）。
- 作業用ブランチを指す内容にしない。必ず main の内容を使わせる。
-->

# ルーティン設定

| 項目 | 値 |
|---|---|
| 名前 | 毎日クイズの準備（朝） |
| ID | trig_01QTDgPZDBvaFXgmLj7Yro4J（2026-11-22 に旧 trig_01BkEYjwhDajd2aKv6Fx6nX4 から切り替え。旧タスクは無効化済みで、本文を直接持つ形式） |
| スケジュール | `CRON_TZ=Asia/Tokyo 47 6 * * *`（毎日 6:47 JST） |
| モデル | claude-opus-5-5 |
| リポジトリ | qwerty0121/daily-quiz |
| コネクタ | Notion（必須。学習テーマDBの読み取り）。Todoist は使わない |
| 通知 | push・email ともにオフ |

# カスタム指示

リポジトリ qwerty0121/daily-quiz の main ブランチにある routines/morning-prep.md を最新の状態で読み込み、その内容を指示として厳密に従って実行してください。先頭の HTML コメント（<!-- ... -->）は設定メモなので、指示ではありません。

リポジトリはこのセッションにクローン済みのはずです。作業ブランチではなく main の内容を使うこと（クローンが main でなければ `git fetch origin main` のうえ `git show origin/main:routines/morning-prep.md` で取得する）。読み込めない場合は、何も変更せず、どこで止まったかを報告して終わる。
