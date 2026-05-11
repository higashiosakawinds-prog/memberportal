# memberportal
# 東大阪吹奏楽団 DXシステム

吹奏楽団運営のためのウェブアプリケーションです。  
GitHubPages + Supabase を組み合わせたサーバーレス構成です。

## ディレクトリ構成

```
higasui/
├── index.html              # ダッシュボード（トップページ）
├── css/
│   ├── variables.css       # CSS変数・デザイントークン定義
│   └── common.css          # 共通スタイル・コンポーネント
├── js/
│   ├── common.js           # 共通UI（ヘッダー・サイドバー生成）
│   └── supabase.js         # Supabaseクライアント・認証・DBヘルパー
└── pages/
    ├── auth/
    │   ├── login.html      # ログイン
    │   └── register.html   # 新規登録
    ├── scores.html         # 楽譜管理
    ├── distribution.html   # 配布・貸出管理
    ├── repertoire.html     # 曲目リスト
    ├── ledger.html         # 出納帳
    ├── dues.html           # 団費収入
    ├── instruments.html    # 楽器一覧
    ├── instrument-lending.html  # 楽器貸出管理
    ├── qrcode.html         # QRコード印刷
    ├── contact.html        # 連絡網
    ├── requests.html       # 団員申請
    └── members.html        # 団員一覧
```

## セットアップ手順

### 1. Supabase プロジェクト作成

1. [https://supabase.com](https://supabase.com) にアクセスしプロジェクトを作成
2. `js/supabase.js` の以下を実際の値に書き換える：
   ```js
   url:     'https://xxxx.supabase.co',
   anonKey: 'eyJhbGci...',
   ```

### 2. Supabase テーブル設計（SQL）

Supabase SQL Editor で以下を実行：

```sql
-- 団員プロフィール
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  last_name text not null,
  first_name text not null,
  last_kana text not null,
  first_kana text not null,
  role text not null default 'member',
  part text,
  category text not null default 'regular',
  email text,
  phone text,
  birthday date,
  emergency_contact text,
  joined_date date,
  created_at timestamptz default now()
);

-- Row Level Security を有効化
alter table profiles enable row level security;

-- 自分のデータのみ参照・更新可能（管理者は全件参照可）
create policy "自分のプロフィールを参照" on profiles
  for select using (auth.uid() = id);
create policy "自分のプロフィールを更新" on profiles
  for update using (auth.uid() = id);

-- 楽譜テーブル
create table scores (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  composer text,
  arranger text,
  parts text[],
  pdf_urls jsonb,
  is_distributed boolean default false,
  distribute_from date,
  distribute_until date,
  notes text,
  created_at timestamptz default now(),
  created_by uuid references profiles(id)
);

alter table scores enable row level security;

-- 出納帳
create table ledger_entries (
  id uuid default gen_random_uuid() primary key,
  date date not null,
  category text not null,
  description text not null,
  amount integer not null,
  type text not null check (type in ('income', 'expense')),
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

alter table ledger_entries enable row level security;

-- 楽器
create table instruments (
  id uuid default gen_random_uuid() primary key,
  instrument_number text not null unique,
  name text not null,
  maker text,
  model text,
  serial_number text,
  condition text,
  notes text,
  is_lent boolean default false,
  created_at timestamptz default now()
);

alter table instruments enable row level security;

-- 申請
create table requests (
  id uuid default gen_random_uuid() primary key,
  type text not null,
  applicant_id uuid references profiles(id),
  status text default 'pending' check (status in ('pending','approved','rejected')),
  content jsonb,
  note text,
  created_at timestamptz default now(),
  processed_at timestamptz,
  processed_by uuid references profiles(id)
);

alter table requests enable row level security;
```

### 3. GitHub Pages で公開

1. GitHubにリポジトリを作成し、このフォルダの内容をpush
2. Settings → Pages → Source: `main` ブランチ、`/ (root)` を選択
3. URLが発行されたらアクセス確認

## セキュリティ注意事項

- `supabase.js` の `anonKey` はフロントエンドから安全に使用できます（Supabaseの仕様）
- `service_role` キーは絶対にリポジトリにコミットしないでください
- Supabaseダッシュボードで Row Level Security (RLS) を必ず有効にしてください
- メール送信機能は今後 Supabase Edge Functions または外部サービスと連携予定
