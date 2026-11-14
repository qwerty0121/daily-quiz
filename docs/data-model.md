# データモデル

クイズページ（アーティファクト）のデータベースに3つのコレクションがある。朝の定期実行タスクは ArtifactData ツールで、ページはブラウザから読み書きする。

## config/settings（1件）

| フィールド | 型 | 内容 |
|---|---|---|
| dailyGoal | number | 1日の目標問題数（現在 1） |
| themes | array | `{name, priority(高/中/低), status(有効/一時停止), source, memo}`。毎朝 Notion の内容で丸ごと置き換え |
| themesSyncedAt | ISO文字列 | 最後にテーマを同期した時刻 |

## questions/{id}

| フィールド | 型 | 内容 |
|---|---|---|
| theme | string | テーマ名 |
| prompt | string | 問題文（200字以内目安、コードは ``` で囲む） |
| choices | string[] | 4択、または ○×（「○ 〜」「× 〜」） |
| answer | number | 正解の添字（0始まり） |
| explanation | string | 解説（300字以内） |
| createdAt | ISO文字列 | 作成時刻 |
| setDate | YYYY-MM-DD | 出題日 |
| due | YYYY-MM-DD | 次に出す日 |
| interval | number | 現在の間隔（日） |
| reps / lapses | number | 正解回数 / 間違えた回数 |
| source | string | 作成元（「毎朝の準備」、ページでのその場生成など） |

id の形式: `q` + YYYYMMDD + `-` + テーマ略称 + `-` + 連番（例 `q20261103-aws-1`）

## answers/{id}（ページだけが書く）

| フィールド | 型 | 内容 |
|---|---|---|
| qid | string | questions の id |
| theme / prompt | string | 回答時点のテーマと問題文 |
| choice / correctChoice | number | 選んだ選択肢 / 正解 |
| correct | boolean | 正誤 |
| rating | sure / unsure / wrong | 自信あり / 自信なし / 不正解 |
| answeredAt | ISO文字列 | 回答時刻 |
| date | YYYY-MM-DD | 回答日（日本時間） |

## 復習間隔（間隔反復）

`app/index.html` の実装（iv = 前回の interval）:

- 不正解 → 1日後
- 正解・自信なし → iv < 1 なら 1日、それ以外は max(2, round(iv × 1.3))
- 正解・自信あり → iv < 1 なら 3日、それ以外は min(180, round(iv × 2.5))

## 出題量の調整（朝のタスク）

期限切れの未回答 B 件に応じて新規問題数を決める: B < 15 → 3問、15 ≤ B < 40 → 2問、B ≥ 40 → 1問。B の件数はユーザーに見せない。

テーマの選び方は優先度で重み付け（高3 : 中2 : 低1）。
