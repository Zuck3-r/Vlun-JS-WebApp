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
3. 1脆弱性 = 1ブランチ = 1コミット（PRを想定）
4. ブランチ名は下記命名規則に従う
5. **複数の脆弱性を同一ブランチに混在させない**
6. 各ブランチは `main` からチェックアウトする（脆弱性ブランチ同士をベースにしない）

### ブランチ命名規則

```
vuln/XX-<kebab-case-name>
```

例：`vuln/01-broken-auth`

### コミットメッセージ規則

```
feat: add [脆弱性名] vulnerability

- 変更内容の簡単な説明
- 影響ファイル
```

---

## 実装順序と脆弱性ブランチ一覧

以下の順番で **1つずつ** ブランチを作成・実装すること。  
前のブランチが完了してから次に進むこと。

### Phase 1: ベース実装

```
main  ← クリーンなベースアプリ（脆弱性なし）
```

### Phase 2: 認証・認可系

| Branch | 脆弱性 | 実装概要 |
|--------|--------|---------|
| `vuln/01-broken-auth` | 不適切な認証 | パスワード未チェック・空認証通過 |
| `vuln/02-broken-authorization` | 不適切な承認 | ログイン済みチェックのみで権限チェックなし |
| `vuln/03-csrf` | CSRF | CSRFトークン未検証、Cookieのみで状態変更 |
| `vuln/04-privilege-escalation-vertical` | 縦の権限昇格 | パラメータでroleを書き換え可能 |
| `vuln/05-privilege-escalation-horizontal` | 横の権限不備 | 他ユーザの投稿を編集・削除可能 |
| `vuln/06-forced-browsing` | 強制ブラウジング | 管理者ページへのアクセス制御なし |
| `vuln/07-sensitive-data-in-webstorage` | Web Storageへの機密情報格納 | JWTやパスワードをlocalStorageに保存 |

### Phase 3: インジェクション系

| Branch | 脆弱性 | 実装概要 |
|--------|--------|---------|
| `vuln/08-sql-injection` | SQLインジェクション | ユーザ入力を直接SQL文字列に結合 |
| `vuln/09-os-command-injection` | OSコマンドインジェクション | `child_process.exec`にユーザ入力を渡す |
| `vuln/10-local-file-inclusion` | ローカルファイルインクルージョン | パスをユーザ入力で制御してファイル読み込み |
| `vuln/11-ssti` | SSTI | EJSテンプレートをユーザ入力で動的生成 |
| `vuln/12-code-injection` | コードインジェクション | `eval()`にユーザ入力を渡す |
| `vuln/13-mail-header-injection` | メールヘッダインジェクション | Toヘッダにユーザ入力を直接連結 |
| `vuln/14-xxe` | XXE | XML外部実体参照を有効にしたパース |
| `vuln/15-ssrf` | SSRF | URLをユーザ入力で指定してサーバ側fetch |
| `vuln/16-directory-traversal` | ディレクトリトラバーサル | `../`を含むパスで任意ファイル読み込み |
| `vuln/17-nosql-injection` | NoSQLインジェクション | MongoDBライクなクエリにオブジェクトを直接渡す（または同等の実装） |
| `vuln/18-xpath-injection` | XPathインジェクション | XPathクエリにユーザ入力を直接結合 |
| `vuln/19-remote-file-inclusion` | RFI | 外部URLを指定してスクリプトをrequire相当で読み込む |

### Phase 4: XSS系

| Branch | 脆弱性 | 実装概要 |
|--------|--------|---------|
| `vuln/20-reflected-xss` | Reflected XSS | クエリパラメータをエスケープなしで出力 |
| `vuln/21-stored-xss` | Stored XSS | DBに保存したスクリプトをエスケープなしで出力 |
| `vuln/22-dom-based-xss` | DOM-based XSS | `location.hash`や`innerHTML`を使った処理 |

### Phase 5: HTTPプロトコル・リダイレクト系

| Branch | 脆弱性 | 実装概要 |
|--------|--------|---------|
| `vuln/23-sensitive-data-in-get` | GETメソッドによる不適切なデータ送信 | パスワード等をGETパラメータで送信 |
| `vuln/24-open-redirect` | オープンリダイレクト | `redirect`パラメータを検証なしで使用 |
| `vuln/25-response-header-injection` | HTTPレスポンスヘッダインジェクション | ユーザ入力をレスポンスヘッダに直接セット |

### Phase 6: その他

| Branch | 脆弱性 | 実装概要 |
|--------|--------|---------|
| `vuln/26-business-logic` | ビジネスロジックの不備 | 数量・金額のマイナス値入力で不正処理 |
| `vuln/27-prototype-pollution` | プロトタイプ汚染攻撃 | `__proto__`を含むJSONをmerge処理に渡す |

---

## 各脆弱性実装時の注意事項

- **実装はミニマルに**：脆弱性を示すために必要最小限のコード変更のみ行う
- **コメントを入れる**：どこが脆弱な箇所か `// [VULN]` コメントで明示する
- **動作確認できること**：ブラウザまたはcurlで実際に脆弱性が再現できること
- **他の機能を壊さない**：ベースの認証・CRUD機能は動作したままにすること

### コメント規則

```javascript
// [VULN: SQL Injection] ユーザ入力を直接クエリに結合
const result = db.prepare(`SELECT * FROM users WHERE name = '${username}'`).get();
```

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
# 1. 依存インストール
npm install

# 2. ベースアプリ起動確認
npm run dev

# 3. 脆弱性実装開始（必ずmainから切ること）
git checkout main
git checkout -b vuln/01-broken-auth

# 4. 実装・確認後コミット
git add .
git commit -m "feat: add broken authentication vulnerability

- パスワード検証を無効化
- 影響ファイル: src/routes/auth.js"

# 5. 次の脆弱性へ（必ずmainに戻ってから）
git checkout main
git checkout -b vuln/02-broken-authorization
```

---

## CI/CD検証メモ欄（随時追記）

| Branch | CI検出ツール | 検出結果 | 備考 |
|--------|------------|---------|------|
| vuln/01 | - | - | |
| vuln/02 | - | - | |
| ... | | | |
