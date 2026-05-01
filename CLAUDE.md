# CLAUDE.md - Vulnerable Web App (Security Training)

## 概要

このプロジェクトは**社内セキュリティ検証・CI/CD検出検証**を目的とした、意図的に脆弱性を含むWebアプリケーションです。  
クローズド環境での利用を前提としています。

---

## 技術スタック

| 項目 | 選定 |
|------|------|
| Runtime | Node.js |
| Framework | Express |
| Template Engine | EJS（SSTIのために意図的に危険な使い方を含む） |
| DB | better-sqlite3（SQLite） |
| Session | express-session |
| その他 | cookie-parser, nodemailer |

---

## ディレクトリ構成

```
vuln-app/
├── CLAUDE.md
├── package.json
├── src/
│   ├── app.js               # エントリーポイント
│   ├── db/
│   │   └── init.js          # DB初期化・シードデータ
│   ├── middleware/
│   │   └── auth.js          # 認証・認可ミドルウェア
│   ├── routes/
│   │   ├── auth.js          # ログイン・ログアウト・登録
│   │   ├── posts.js         # 投稿CRUD（一般ユーザ）
│   │   └── admin.js         # 管理者機能
│   └── views/
│       ├── partials/
│       │   ├── header.ejs
│       │   └── footer.ejs
│       ├── login.ejs
│       ├── register.ejs
│       ├── dashboard.ejs
│       ├── admin.ejs
│       ├── posts/
│       │   ├── index.ejs
│       │   ├── new.ejs
│       │   ├── edit.ejs
│       │   └── show.ejs
│       └── error.ejs
└── public/
    ├── css/
    │   └── style.css
    └── js/
        └── app.js
```

---

## ユーザ・ロール

| ユーザ名 | パスワード | ロール |
|---------|-----------|--------|
| admin | admin | administrator |
| user1 | password1 | user |
| user2 | password2 | user |

ロールは `admin` と `user` の2種類。  
`admin` は全CRUD・ユーザ管理・システム機能にアクセス可能。  
`user` は自分の投稿のみCRUD可能。

---

## ベースアプリの機能

クリーンな（脆弱性なし）ベースとして以下を実装すること：

- ログイン / ログアウト
- ユーザ登録
- 投稿（Post）のCRUD（タイトル・本文）
- 管理者ダッシュボード（ユーザ一覧・全投稿一覧）
- セッション管理

---

## Git ブランチ・コミット戦略

### 基本ルール

**必ず以下を守ること：**

1. `main` ブランチはクリーンなベースアプリのみ
2. 各脆弱性は **必ず独立したブランチ** で実装する
3. 1脆弱性 = 1ブランチ = 1 PR（コミットは1〜数個でよい）
4. **複数の脆弱性を同一ブランチに混在させない**
5. 各ブランチは `main` からチェックアウトする（脆弱性ブランチ同士をベースにしない）
6. **ブランチ名・コミットメッセージ・PR本文には脆弱性に関する語を一切含めない**
   - NG ワード例：`vuln`, `脆弱性`, `injection`, `xss`, `csrf`, `bypass`, `unsafe`, `insecure`, CWE/CVE 番号, 攻撃手法名 など
   - 普通の機能開発・改修・バグ修正として読める表現だけを使う
7. コード内のコメントも同様に、機能や実装意図の説明に徹し、脆弱性をほのめかさない（`// [VULN]` 等の脆弱性マーカーは禁止）

### ブランチ命名規則

通常の Conventional Branch スタイルに従う：

```
feat/<kebab-case-feature>
fix/<kebab-case-fix>
refactor/<kebab-case-target>
chore/<kebab-case-task>
```

例：`feat/post-search`, `refactor/login-flow`, `feat/url-preview`

各脆弱性に対応する「表向きの機能名（カバーストーリー）」は後述の表を参照。
表のカバー名はあくまで推奨で、より自然な機能名を思いついた場合は実装者の裁量で差し替えてよい（脆弱性を匂わせない範囲で）。

### コミットメッセージ規則

Conventional Commits 風で、機能・修正の視点だけを書く：

```
<type>: <機能・修正の要約>

- 何を追加 / 変更 / 整理したか（機能視点で）
- 影響ファイル
```

OK 例：
- `feat: add post search by keyword`
- `refactor: simplify login flow`
- `fix: preserve newlines in post body rendering`

NG 例：
- `feat: add SQL injection vulnerability`
- `chore: weaken password check for testing`
- `fix: bypass CSRF token`

### 脆弱性追跡用の私的メモ

「どのブランチが何の脆弱性に対応しているか」「PoC・攻撃手順」は Git に乗せない。
ローカルメモ `.private/vuln-tracking.md`（`.gitignore` 済み）に記録する：

```
- branch: feat/post-search
  vuln id: 08 (SQL Injection)
  injected at: src/routes/posts.js (search endpoint)
  poc: curl 'http://localhost:3000/posts/search?sort=...'
```

PR 本文 / commit / コードコメント / README には絶対に書かない。

---

## 実装順序と脆弱性ブランチ一覧

以下の順番で **1つずつ** ブランチを作成・実装すること。  
前のブランチが完了してから次に進むこと。

### Phase 1: ベース実装

```
main  ← クリーンなベースアプリ（脆弱性なし）
```

表の `ID` 列は内部識別子（私的メモ用）であり、ブランチ名・コミット・コード上には現れない。
`カバーブランチ名` は推奨例。実装者は同等以上に「自然な機能名」と感じるものに差し替えてよい。

### Phase 2: 認証・認可系

| ID | カバーブランチ名 | 隠したい欠陥 | カバー機能（表向き） |
|----|------------------|-------------|---------------------|
| 01 | `refactor/login-flow` | 不適切な認証 | ログイン処理のリファクタ。空文字や型違いの扱いを「整理」する過程で検証バイパスが入り込む |
| 02 | `feat/post-edit-page` | 不適切な承認 | 投稿編集ページ追加。ログイン済みは確認するが所有者チェックは UI 側に任せる |
| 03 | `feat/quick-post-actions` | CSRF | 一覧から削除・公開切替などをワンクリックで行うショートカット。トークンは導入しない／検証が緩い |
| 04 | `feat/profile-edit` | 縦の権限昇格 | プロフィール更新フォーム。許可フィールドのフィルタが不完全で `role` が通る |
| 05 | `feat/post-bulk-actions` | 横の権限不備 | 投稿の一括操作。所有者条件を WHERE から落としているか、id だけで判定 |
| 06 | `feat/admin-tools` | 強制ブラウジング | 管理ツールの新ページ群。ルータ単位で認可ミドルウェアを適用し忘れる |
| 07 | `feat/remember-me` | Web Storage 機密 | ログイン状態保持。クライアント側で資格情報を localStorage に置く設計 |

### Phase 3: インジェクション系

| ID | カバーブランチ名 | 隠したい欠陥 | カバー機能（表向き） |
|----|------------------|-------------|---------------------|
| 08 | `feat/post-search` | SQLi | 投稿検索。ソート列・順序など一部だけ動的結合になる「気づきにくい」形 |
| 09 | `feat/server-status` | OS Command Injection | 接続先疎通チェック (ping)。ホスト検証はあるが正規表現の境界が甘い |
| 10 | `feat/help-pages` | LFI | ヘルプ記事の動的読み込み。`path.join` のみで `path.resolve` 後の prefix チェックなし |
| 11 | `feat/email-templates` | SSTI | メール本文テンプレ。ユーザ提供文字列を EJS でレンダ |
| 12 | `feat/calc-tool` | Code Injection | 簡易計算機能。許可文字 whitelist の正規表現に抜け |
| 13 | `feat/contact-form` | Mail Header Injection | 問い合わせフォーム。件名・差出人ヘッダに改行混入 |
| 14 | `feat/data-import` | XXE | XML データインポート機能 |
| 15 | `feat/url-preview` | SSRF | URL プレビュー (OGP 取得)。`new URL().hostname` で blocklist だけ実装 |
| 16 | `feat/file-download` | Directory Traversal | 添付ダウンロード。decode 後の `..` を見ていない |
| 17 | `feat/advanced-search` | NoSQLi 模擬 | クエリオブジェクトをそのまま渡す検索 API（カスタム実装で概念再現） |
| 18 | `feat/structured-data` | XPath Injection | XML データの構造化検索 |
| 19 | `feat/plugin-loader` | RFI | プラグイン機構。設定値を `require()` / `fetch+vm` 相当で読み込む |

### Phase 4: XSS系

| ID | カバーブランチ名 | 隠したい欠陥 | カバー機能（表向き） |
|----|------------------|-------------|---------------------|
| 20 | `feat/search-results` | Reflected XSS | 検索結果ページのキーワードハイライト等で `<%- %>` を使ってしまう |
| 21 | `feat/post-rich-text` | Stored XSS | 投稿本文の装飾表示。「安全な HTML だけ通す」つもりのサニタイザに穴 |
| 22 | `feat/anchor-tabs` | DOM XSS | URL ハッシュでタブ切替。`location.hash` を `innerHTML` に流す |

### Phase 5: HTTPプロトコル・リダイレクト系

| ID | カバーブランチ名 | 隠したい欠陥 | カバー機能（表向き） |
|----|------------------|-------------|---------------------|
| 23 | `feat/password-reset` | GET で機密 | パスワードリセットリンク。トークンや一時パスを GET クエリで運ぶ |
| 24 | `feat/post-login-redirect` | Open Redirect | ログイン後の戻り先 (`?next=...`)。`startsWith('/')` だけで判定 |
| 25 | `feat/locale-switcher` | Response Header Injection | 言語切替で `Set-Cookie` / `Content-Language` をユーザ入力で組み立て |

### Phase 6: その他

| ID | カバーブランチ名 | 隠したい欠陥 | カバー機能（表向き） |
|----|------------------|-------------|---------------------|
| 26 | `feat/order-form` | ビジネスロジック | 注文機能。数量・金額の符号・上限を実質チェックしない |
| 27 | `feat/user-preferences` | Prototype Pollution | 設定の JSON マージ。再帰 merge で `__proto__` / `constructor` を弾かない |

---

## 各脆弱性実装時の注意事項

### 1. 機能としての筋を通す（カバーストーリー必須）

脆弱性を入れるためだけのエンドポイントやページは禁止。
必ず「現実のアプリでありそうな機能」を実装し、その自然な実装ミスとして脆弱性を埋め込む。

例：
- SQLi → `feat/post-search`：投稿検索の中で、ソート列やキーワードの扱いに動的 SQL が混入
- Open Redirect → `feat/post-login-redirect`：ログイン後の元ページ復帰機能で URL 検証が甘い
- SSRF → `feat/url-preview`：投稿に貼った URL の OGP 取得機能でホスト制限が不十分

機能としての UI（フォーム・リンク・一覧表示など）も必要なだけ作ること。
脆弱性パスだけ残してダミー UI で済ませない。

### 2. 「一見すると脆弱性がなさそう」実装にする

露骨で教科書的な書き方は避け、**実装ミスや軽い見落としに見える** 形で埋め込む。
SAST・レビュアーが「ここが怪しい」と即座にハイライトできない程度の自然さを目標にする。

避けたい書き方（露骨すぎ）：
```js
db.exec("SELECT * FROM users WHERE name = '" + name + "'");
eval(req.body.code);
res.send(req.query.q);
```

望ましい方向性（実装ミスっぽさ）：
- プリペアドステートメントを使っているように見えるが、ソート列・テーブル名・LIKE パターンなど一部だけ動的結合
- 入力検証関数を経由しているが、正規表現に微妙な穴がある
  - 先頭・末尾アンカーなし、改行 / ` ` 未考慮、URL デコード前に検証している、`i` フラグ忘れ など
- リファクタの過程で安全だった処理を「ちょっと整理した」結果バイパスが生まれる（diff レビューでは綺麗に見える）
- 配列・オブジェクト型の入力を想定していない（`username[]=foo` で `===` が崩れる、JSON ボディで型が変わる）
- ホワイトリスト検証が `startsWith` / `endsWith` / `includes` ベースで境界判定が甘い（`/admin` を `/admin-evil.com` が通る、など）
- API の罠を踏む（`path.join` 後に `path.resolve` していない、`new URL()` の `host` ではなく `hostname` だけ見る、`String.prototype.replace` で1回しか置換しない、`==` を使う、など）
- セキュリティ対策っぽいコメント（"validate input", "sanitize html", "check role"）は **残してもよい**。ただし実態は不十分。

### 3. 動作確認

- ブラウザまたは curl で **実際に攻撃が成立すること** を確認
- 同時に **ベースの正常系も壊れていないこと** を確認
- PoC・攻撃手順は `/.private/vuln-tracking.md`（gitignore 配下）に残す。リポジトリ・PR・コードコメントには出さない

### 4. コード内コメント

- 機能や実装意図の説明に徹する
- `// [VULN: ...]` などの脆弱性マーカーは **書かない**
- レビュアーや静的解析が読んで「ここが怪しい」と気づく文言（`// XXX bypass`, `// FIXME insecure`, `// hack`, `// trust user input` 等）も避ける
- コミット差分・コードコメントだけを見て、脆弱性が混入していると断定できない状態を目指す

---

## 実装が困難な脆弱性の対応方針

| 脆弱性 | 対応 |
|--------|------|
| RFI（`vuln/19`） | `require()`や`fs.readFile()`をURLで呼び出す形で模擬実装。完全なPHPライクな動作は不要 |
| NoSQLインジェクション（`vuln/17`） | better-sqlite3のままでは再現困難なため、オブジェクト型クエリを模擬したカスタム実装で概念を示す |
| XPathインジェクション（`vuln/18`） | XMLデータを用意してxpath評価を行うシナリオとして実装。`xpath`パッケージを使用 |

---

## 開発開始手順

```bash
# 0. 私的メモ用ディレクトリと .gitignore 確認（最初の1回だけ）
mkdir -p .private
grep -qxF '.private/' .gitignore || echo '.private/' >> .gitignore
touch .private/vuln-tracking.md

# 1. 依存インストール
npm install

# 2. ベースアプリ起動確認
npm run dev

# 3. ブランチ作成（必ず main から、機能名で切る）
git checkout main
git pull
git checkout -b refactor/login-flow      # 例: ID 01 のカバー

# 4. 実装・動作確認後コミット（機能視点のみ。脆弱性に言及しない）
git add .
git commit -m "refactor: simplify login flow

- ユーザ取得とパスワード検証の分岐を整理
- 影響ファイル: src/routes/auth.js"

# 5. 私的メモに対応関係と PoC を記録
#    .private/vuln-tracking.md に branch / vuln id / PoC を追記

# 6. 次のブランチへ（必ず main に戻ってから）
git checkout main
git checkout -b feat/post-edit-page       # 例: ID 02 のカバー
```

---

## CI/CD検証メモ欄（随時追記）

CI/CD で検出する側の検証ログ。`Branch` 列にはカバー機能名（実際のブランチ名）を入れ、
脆弱性 ID は私的メモ（`.private/vuln-tracking.md`）側で対応付ける。

| Branch | CI検出ツール | 検出結果 | 備考 |
|--------|--------------|---------|------|
| `refactor/login-flow` | - | - | |
| `feat/post-edit-page` | - | - | |
| ... | | | |
