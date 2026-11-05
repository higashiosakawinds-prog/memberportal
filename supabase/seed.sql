-- ============================================================
--  ひがすいポータル ローカル開発用ダミーデータ（すべて架空）
--
--  ・`supabase db reset` のたびに自動投入される（config.toml の [db.seed]）
--  ・ローカル Supabase 専用。本番には絶対に適用しないこと
--  ・全ダミーユーザーのパスワードは  LocalTest#2026
--      管理者   : test-admin@example.com   （GM）
--      一般団員 : test-member@example.com  （member）
--      その他   : dummy03@example.com 〜 dummy30@example.com
--  ・メールアドレスはすべて example.com / example.net（実在しない）
--  ・日付は current_date 基準なので、リセットした日が「今日」になる
--  ・団費の支払い・出納帳・出欠はスプレッドシート(GAS)管理のため、ここには含めない
-- ============================================================

-- ── 1. 団員（認証ユーザー + プロファイル）──────────────────
create temp table _m (
  n int, last_name text, first_name text, last_kana text, first_kana text,
  part text, category text, roles text[], is_pl boolean, pay text,
  email text, uid uuid
);

insert into _m (n, last_name, first_name, last_kana, first_kana, part, category, roles, is_pl, pay) values
 ( 1,'管理','太郎','カンリ','タロウ',          'flute',       'regular',        '{gm}',        true, 'credit'),
 ( 2,'団員','花子','ダンイン','ハナコ',        'clarinet',    'regular',        '{member}',    false,'cash'),
 ( 3,'佐藤','健一','サトウ','ケンイチ',        'trumpet',     'regular',        '{leader}',    true, 'credit'),
 ( 4,'鈴木','美咲','スズキ','ミサキ',          'flute',       'regular',        '{subleader}', false,'credit'),
 ( 5,'高橋','大輔','タカハシ','ダイスケ',      'trombone',    'regular',        '{treasurer}', true, 'credit'),
 ( 6,'田中','遥','タナカ','ハルカ',            'oboe',        'regular',        '{librarian}', true, 'cash'),
 ( 7,'伊藤','翔太','イトウ','ショウタ',        'euphonium',   'regular',        '{equipment}', true, 'credit'),
 ( 8,'渡辺','結衣','ワタナベ','ユイ',          'clarinet',    'regular',        '{reserver}',  false,'cash'),
 ( 9,'山本','拓也','ヤマモト','タクヤ',        'percussion',  'regular',        '{conductor}', true, 'credit'),
 (10,'中村','彩','ナカムラ','アヤ',            'asaxophone',  'regular',        '{conector}',  true, 'cash'),
 (11,'小林','蓮','コバヤシ','レン',            'horn',        'regular',        '{safety}',    true, 'credit'),
 (12,'加藤','莉子','カトウ','リコ',            'bassoon',     'regular',        '{recorder}',  true, 'cash'),
 (13,'吉田','隆','ヨシダ','タカシ',            'tuba',        'regular',        '{engineer}',  true, 'credit'),
 (14,'山田','恵','ヤマダ','メグミ',            'piccolo',     'regular',        '{member}',    false,'cash'),
 (15,'佐々木','直樹','ササキ','ナオキ',        'tsaxophone',  'regular',        '{member}',    false,'credit'),
 (16,'松本','千尋','マツモト','チヒロ',        'bassclarinet','regular',        '{member}',    false,'cash'),
 (17,'井上','悠斗','イノウエ','ユウト',        'trumpet',     'regular_student','{member}',    false,'cash'),
 (18,'木村','凛','キムラ','リン',              'flute',       'regular_student','{member}',    false,'cash'),
 (19,'林','陽菜','ハヤシ','ヒナ',              'clarinet',    'regular_student','{member}',    false,'cash'),
 (20,'清水','大地','シミズ','ダイチ',          'trombone',    'trainee',        '{member}',    false,'credit'),
 (21,'山口','沙織','ヤマグチ','サオリ',        'horn',        'trainee',        '{member}',    false,'cash'),
 (22,'阿部','慎吾','アベ','シンゴ',            'contrabass',  'regular',        '{member}',    true, 'credit'),
 (23,'森','美優','モリ','ミユ',                'percussion',  'regular',        '{member}',    false,'cash'),
 (24,'池田','浩二','イケダ','コウジ',          'euphonium',   'support',        '{member}',    false,'credit'),
 (25,'橋本','里奈','ハシモト','リナ',          'oboe',        'support',        '{member}',    false,'cash'),
 (26,'石川','健太','イシカワ','ケンタ',        'bsaxophone',  'rest',           '{member}',    false,null),
 (27,'前田','奈々','マエダ','ナナ',            'ssaxophone',  'rest',           '{member}',    false,null),
 (28,'藤田','誠','フジタ','マコト',            'tuba',        'regular',        '{member}',    false,'credit'),
 (29,'岡田','朋美','オカダ','トモミ',          'piano',       'regular',        '{member}',    false,'cash'),
 (30,'後藤','康介','ゴトウ','コウスケ',        'staff',       'regular',        '{member}',    false,'credit');

update _m set
  uid   = ('a0000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
  email = case n when 1 then 'test-admin@example.com'
                 when 2 then 'test-member@example.com'
                 else 'dummy' || lpad(n::text, 2, '0') || '@example.com' end;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
)
select '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', email,
       extensions.crypt('LocalTest#2026', extensions.gen_salt('bf')), now(),
       '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
       '', '', '', '', '', '', '', ''
from _m;

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), uid, uid::text,
       jsonb_build_object('sub', uid::text, 'email', email, 'email_verified', true),
       'email', now(), now(), now()
from _m;

insert into public.profiles
  (id, last_name, first_name, last_kana, first_kana, roles, part, category, email, phone,
   birthday, emergency_contact, joined_date, is_part_leader, payment_method)
select uid, last_name, first_name, last_kana, first_kana, roles, part, category, email,
       '090-0000-' || lpad(n::text, 4, '0'),
       date '1975-04-01' + (n * 397) % 9000,
       '緊急連絡先 ' || last_name || '（家族）：090-1111-' || lpad(n::text, 4, '0'),
       date '2016-04-01' + (n * 71) % 3300,
       is_pl, pay
from _m;

-- ── 2. 団費設定 ───────────────────────────────────────────
insert into public.dues_settings (category, amount, updated_by) values
 ('regular',         3000, ('a0000000-0000-4000-8000-' || lpad('5', 12, '0'))::uuid),
 ('regular_student', 1500, ('a0000000-0000-4000-8000-' || lpad('5', 12, '0'))::uuid),
 ('trainee',         2000, ('a0000000-0000-4000-8000-' || lpad('5', 12, '0'))::uuid),
 ('support',         1000, ('a0000000-0000-4000-8000-' || lpad('5', 12, '0'))::uuid);

-- ── 3. 活動予定 ───────────────────────────────────────────
insert into public.activities
  (title, activity_date, start_time, end_time, location, description, activity_type, is_cancelled, created_by)
select t, current_date + d, st::time, et::time, loc, descr, ty, canc,
       ('a0000000-0000-4000-8000-' || lpad('3', 12, '0'))::uuid
from (values
 ('全体練習（第1回）',            -28,'19:00','21:00','東大阪市民会館 リハーサル室','定期演奏会に向けた初回合奏','practice',false),
 ('パート練習',                   -21,'19:00','21:00','布施コミュニティセンター','パート別に基礎練習','practice',false),
 ('全体練習（第2回）',            -14,'19:00','21:00','東大阪市民会館 リハーサル室','合奏','practice',false),
 ('運営ミーティング',              -7,'20:00','21:00','オンライン（Meet）','10月の運営報告','meeting',false),
 ('全体練習（第3回）',              3,'19:00','21:00','東大阪市民会館 リハーサル室','課題曲の通し','practice',false),
 ('パート練習',                    10,'19:00','21:00','布施コミュニティセンター','パート別練習','practice',false),
 ('ステージリハーサル',            14,'13:00','17:00','東大阪市文化創造館','会場でのリハーサル','practice',false),
 ('運営ミーティング',              17,'20:00','21:00','オンライン（Meet）','11月の運営報告','meeting',false),
 ('クリスマスコンサート',          24,'14:00','16:00','東大阪市文化創造館 大ホール','入場無料・開場13:30','concert',false),
 ('忘年会',                        31,'18:30','21:00','近鉄布施駅前 居酒屋','会費制（詳細は連絡事項で）','event',false),
 ('全体練習（荒天中止の例）',      38,'19:00','21:00','東大阪市民会館 リハーサル室','中止になった例','practice',true),
 ('新年合同練習',                  45,'10:00','16:00','東大阪市民会館 大会議室','新年最初の練習','practice',false)
) as v(t, d, st, et, loc, descr, ty, canc);

-- ── 4. 特例制度・休団退団申請・やりとり ─────────────────────
insert into public.special_measures
  (member_id, reason, requested_start_month, end_month, extended_end_month, status,
   actual_start_month, actual_end_month, applied_at, approved_at, approved_by, rejected_at, rejected_by, notes)
select ('a0000000-0000-4000-8000-' || lpad(m::text, 12, '0'))::uuid, r,
       to_char(current_date + s * interval '1 month', 'YYYY-MM'),
       to_char(current_date + e * interval '1 month', 'YYYY-MM'),
       to_char(current_date + e * interval '1 month', 'YYYY-MM'),
       st,
       case when st = 'approved' then to_char(current_date + s * interval '1 month', 'YYYY-MM') end,
       case when st = 'approved' then to_char(current_date + e * interval '1 month', 'YYYY-MM') end,
       now() - interval '10 days',
       case when st = 'approved' then now() - interval '5 days' end,
       case when st = 'approved' then ('a0000000-0000-4000-8000-' || lpad('3', 12, '0'))::uuid end,
       case when st = 'rejected' then now() - interval '4 days' end,
       case when st = 'rejected' then ('a0000000-0000-4000-8000-' || lpad('3', 12, '0'))::uuid end,
       n
from (values
 (17, '学業が忙しいため（ダミー）',   0, 2, 'pending',  ''),
 (19, '受験準備のため（ダミー）',    -1, 3, 'approved', '承認済みの例'),
 (21, '転勤の準備のため（ダミー）',   1, 4, 'rejected', '却下の例')
) as v(m, r, s, e, st, n);

insert into public.member_status_requests
  (member_id, request_type, reason, desired_date, return_date, status, notes, applied_at, reviewed_at, reviewed_by)
select ('a0000000-0000-4000-8000-' || lpad(m::text, 12, '0'))::uuid, t, r,
       current_date + dd, case when t = 'rest' then current_date + dd + 90 end, st, '',
       now() - interval '8 days',
       case when st <> 'pending' then now() - interval '3 days' end,
       case when st <> 'pending' then ('a0000000-0000-4000-8000-' || lpad('3', 12, '0'))::uuid end
from (values
 (20, 'rest',     '仕事の繁忙期のため（ダミー）', 14, 'pending'),
 (26, 'rest',     '怪我の療養のため（ダミー）',  -30, 'approved'),
 (27, 'withdraw', '引っ越しのため（ダミー）',      30, 'approved')
) as v(m, t, r, dd, st);

insert into public.request_messages (request_type, request_id, sender_id, sender_name, is_leader, body, read_by_member, read_by_leader)
select 'special', sm.id, v.sid, v.sname, v.lead, v.body, true, v.lead
from public.special_measures sm
join public.profiles p on p.id = sm.member_id and p.last_name = '林'
cross join (values
 (('a0000000-0000-4000-8000-' || lpad('3', 12, '0'))::uuid, '佐藤健一', true,  '申請を確認しました。承認します。'),
 (('a0000000-0000-4000-8000-' || lpad('19', 12, '0'))::uuid, '林陽菜', false, 'ありがとうございます。よろしくお願いします。')
) as v(sid, sname, lead, body);

-- ── 5. 連絡・意見・不具合報告 ───────────────────────────────
insert into public.contact_messages (type, subject, body, sender_id, sender_name, sender_email, sent_at, created_at)
values
 ('broadcast',  'クリスマスコンサートの出欠登録のお願い', E'団員の皆さま\n\nクリスマスコンサートの出欠を、ポータルから登録してください。（ダミー）', ('a0000000-0000-4000-8000-' || lpad('3', 12, '0'))::uuid, '佐藤健一', 'dummy03@example.com', now() - interval '3 days', now() - interval '3 days'),
 ('broadcast',  '11月の団費について', E'11月分の団費の支払いをお願いします。（ダミー）', ('a0000000-0000-4000-8000-' || lpad('5', 12, '0'))::uuid, '高橋大輔', 'dummy05@example.com', now() - interval '6 days', now() - interval '6 days'),
 ('individual', '楽器の貸出について', E'ユーフォの貸出期限をご確認ください。（ダミー）', ('a0000000-0000-4000-8000-' || lpad('7', 12, '0'))::uuid, '伊藤翔太', 'dummy07@example.com', now() - interval '1 day', now() - interval '1 day');

insert into public.opinions (member_id, member_name, body, status, admin_note) values
 (('a0000000-0000-4000-8000-' || lpad('14', 12, '0'))::uuid, '山田恵', '練習会場の空調が弱いので、改善できないでしょうか。（ダミー）', 'unread', null),
 (('a0000000-0000-4000-8000-' || lpad('16', 12, '0'))::uuid, '松本千尋', '楽譜の配布を事前にしてもらえると助かります。（ダミー）', 'read', '次回の運営会議で検討'),
 (null, '匿名', 'ポータルの出欠登録がとても便利です。（ダミー）', 'read', null);

insert into public.feedback (member_id, member_name, kind, body, page, app_version, is_pwa, status, priority, admin_note) values
 (('a0000000-0000-4000-8000-' || lpad('2', 12, '0'))::uuid,  '団員花子', 'bug',      'スケジュール画面で日付が1日ずれて見えます。（ダミー）', '/pages/schedule.html',   '2026.10', true,  'new',     'P1', null),
 (('a0000000-0000-4000-8000-' || lpad('15', 12, '0'))::uuid, '佐々木直樹', 'feature', '出欠をまとめて登録できると便利です。（ダミー）',        '/pages/activities.html', '2026.10', false, 'planned', 'P2', '次期バージョンで検討'),
 (('a0000000-0000-4000-8000-' || lpad('8', 12, '0'))::uuid,  '渡辺結衣', 'question', '機種変更後のログイン方法を教えてください。（ダミー）',   '/pages/auth/login.html', '2026.10', true,  'done',    'P3', '再ログインで解決'),
 (('a0000000-0000-4000-8000-' || lpad('23', 12, '0'))::uuid, '森美優',   'bug',      'ホーム画面アイコンが表示されません。（ダミー）',        '/index.html',            '2026.10', true,  'triaged', 'P2', null);

-- ── 6. 楽器・備品と貸出 ────────────────────────────────────
insert into public.instruments
  (instrument_number, part_category, ownership_type, part_seq, overall_seq, status, item_type,
   name_ja, instrument_code, maker, product_name, owner_lender, memo, created_by)
select cat || '-' || own || '-' || pseq || '-' || oseq, cat, own, pseq, oseq, st, ity,
       nm, code, mk, pn, ol, memo, ('a0000000-0000-4000-8000-' || lpad('7', 12, '0'))::uuid
from (values
 ('01','0','01','001','保管',    'instrument','フルート',        'FL-001','ヤマハ',  'YFL-312', null,            '日常点検済み（ダミー）'),
 ('03','0','01','002','団内貸出','instrument','クラリネット',    'CL-001','ビュッフェ・クランポン','E13', null,    null),
 ('04','0','01','003','団内貸出','instrument','アルトサックス',  'AS-001','ヤマハ',  'YAS-62',  null,            null),
 ('05','0','01','004','保管',    'instrument','トランペット',    'TP-001','バック',  '180ML37', null,            null),
 ('06','0','01','005','修理中',  'instrument','ホルン',          'HR-001','ヤマハ',  'YHR-567', null,            'ロータリー不調で修理依頼中（ダミー）'),
 ('07','0','01','006','保管',    'instrument','トロンボーン',    'TB-001','ヤマハ',  'YSL-354', null,            null),
 ('08','1','01','007','外部借用','instrument','ユーフォニアム',  'EP-001','ヤマハ',  'YEP-321', '市民楽団A（ダミー）','借用期限あり'),
 ('09','0','01','008','保管',    'instrument','チューバ',        'TU-001','ヤマハ',  'YBB-321', null,            null),
 ('11','0','01','009','保管',    'instrument','ティンパニ',      'PC-001','ヤマハ',  'TP-6300', null,            null),
 ('50','0','01','010','保管',    'equipment', '譜面台',          null,    null,      null,      null,            '20台（ダミー）'),
 ('50','0','02','011','保管',    'equipment', '指揮台',          null,    null,      null,      null,            null),
 ('50','0','03','012','団内貸出','equipment', 'チューナー',      null,    null,      null,      null,            null)
) as v(cat, own, pseq, oseq, st, ity, nm, code, mk, pn, ol, memo);

insert into public.instrument_lending_records
  (instrument_id, borrower_name, lending_type, start_date, due_date, returned, returned_at, memo, created_by)
select i.id, v.who, v.lt, current_date + v.sd, current_date + v.dd, v.ret,
       case when v.ret then now() - interval '2 days' end, v.memo,
       ('a0000000-0000-4000-8000-' || lpad('7', 12, '0'))::uuid
from (values
 ('03-0-01-002', '渡辺結衣',   '団内貸出', -20,  10, false, '個人練習用'),
 ('04-0-01-003', '中村彩',     '団内貸出',  -9,  21, false, null),
 ('50-0-03-012', '井上悠斗',   '団内貸出',  -5,   9, false, null),
 ('01-0-01-001', '木村凛',     '団内貸出', -40, -20, true,  '返却済みの例')
) as v(num, who, lt, sd, dd, ret, memo)
join public.instruments i on i.instrument_number = v.num;

-- ── 7. 楽譜 ───────────────────────────────────────────────
insert into public.scores2
  (score_number, title_ja, title_en, title_kana, composer, artist, index_kana, index_alpha,
   formation, notes, is_public, created_by)
select n, ja, en, kana, comp, null, idx, left(en, 1), form, notes, true,
       ('a0000000-0000-4000-8000-' || lpad('6', 12, '0'))::uuid
from (values
 (1,'星条旗よ永遠なれ',         'The Stars and Stripes Forever','セイジョウキヨエイエンナレ','J.P.スーザ','サ','吹奏楽（大編成）','マーチ（ダミー）'),
 (2,'双頭の鷲の旗のもとに',     'Under the Double Eagle',       'ソウトウノワシノハタノモトニ','J.F.ワーグナー','ソ','吹奏楽（大編成）','マーチ'),
 (3,'威風堂々 第1番',           'Pomp and Circumstance No.1',   'イフウドウドウ','E.エルガー','イ','吹奏楽（大編成）',null),
 (4,'組曲「惑星」より 木星',    'Jupiter from The Planets',     'ワクセイ ジュピター','G.ホルスト','ワ','吹奏楽（大編成）',null),
 (5,'新世界より 第2楽章',       'From the New World II',        'シンセカイヨリ','A.ドヴォルザーク','シ','吹奏楽（中編成）',null),
 (6,'フニクリ・フニクラ',       'Funiculì, Funiculà',           'フニクリフニクラ','L.デンツァ','フ','フレックス','フレックス編成（ダミー）'),
 (7,'ふるさと',                 'Furusato',                     'フルサト','岡野貞一','フ','フレックス',null),
 (8,'ラデツキー行進曲',         'Radetzky March',               'ラデツキーコウシンキョク','J.シュトラウス1世','ラ','吹奏楽（中編成）','マーチ'),
 (9,'ジングル・ベル',           'Jingle Bells',                 'ジングルベル','J.ピアポント','シ','アンサンブル','クリスマス用（ダミー）'),
 (10,'基礎合奏 コラール集',     'Chorales Vol.1',               'キソガッソウ','各種','キ','吹奏楽（小編成）','基礎練習用（ダミー）')
) as v(n, ja, en, kana, comp, idx, form, notes);

insert into public.score_lending_requests
  (score_id, score_title, requester_id, requester_name, requester_email, parts, status, due_date, approved_by, approved_at)
select s.id, s.title_ja, ('a0000000-0000-4000-8000-' || lpad(v.m::text, 12, '0'))::uuid, v.nm, v.em, v.parts, v.st,
       case when v.st <> 'pending' then current_date + 14 end,
       case when v.st <> 'pending' then ('a0000000-0000-4000-8000-' || lpad('6', 12, '0'))::uuid end,
       case when v.st <> 'pending' then now() - interval '2 days' end
from (values
 (3, 17, '井上悠斗', 'dummy17@example.com', array['trumpet'],    'pending'),
 (9, 18, '木村凛',   'dummy18@example.com', array['flute'],      'lending'),
 (5, 19, '林陽菜',   'dummy19@example.com', array['clarinet'],   'returned')
) as v(n, m, nm, em, parts, st)
join public.scores2 s on s.score_number = v.n;

-- ── 8. アンケート ─────────────────────────────────────────
insert into public.surveys
  (title, description, status, target_categories, created_by, published_at, closed_at, start_date, end_date, questions, allow_response_edit)
values
 ('クリスマスコンサート 打ち上げ参加調査（ダミー）', '忘年会の参加可否と希望をお答えください。', 'published',
  array['regular','regular_student','trainee','support'], ('a0000000-0000-4000-8000-' || lpad('3', 12, '0'))::uuid,
  now() - interval '2 days', null, current_date - 2, current_date + 20,
  '[{"id":"q1","type":"radio","title":"参加しますか？","description":"","required":true,"options":["参加する","参加しない","未定"],"allow_other":false},
    {"id":"q2","type":"checkbox","title":"苦手な食べ物（複数選択可）","description":"","required":false,"options":["魚介類","卵","乳製品","そば"],"allow_other":true},
    {"id":"q3","type":"linear_scale","title":"今年の活動の満足度","description":"","required":true,"scale_min":1,"scale_max":5,"scale_min_label":"不満","scale_max_label":"満足"},
    {"id":"q4","type":"paragraph","title":"自由記入欄","description":"","required":false}]'::jsonb,
  true),
 ('2026年度 練習時間アンケート（ダミー）', '来年度の練習時間帯の希望を調査しました。', 'closed',
  array['regular','regular_student'], ('a0000000-0000-4000-8000-' || lpad('3', 12, '0'))::uuid,
  now() - interval '40 days', now() - interval '20 days', current_date - 40, current_date - 20,
  '[{"id":"q1","type":"radio","title":"希望する練習時間帯","description":"","required":true,"options":["平日夜","土曜午後","日曜午前"],"allow_other":false}]'::jsonb,
  false),
 ('新年会の希望調査（下書き）', '準備中の例です。', 'draft', null,
  ('a0000000-0000-4000-8000-' || lpad('3', 12, '0'))::uuid, null, null, null, null,
  '[{"id":"q1","type":"short_text","title":"希望の会場","description":"","required":false}]'::jsonb,
  true);

insert into public.survey_responses (survey_id, member_id, email, answers)
select s.id, ('a0000000-0000-4000-8000-' || lpad(v.m::text, 12, '0'))::uuid, 'dummy' || lpad(v.m::text, 2, '0') || '@example.com',
       jsonb_build_object('q1', v.a1, 'q3', v.a3)
from public.surveys s
cross join (values (2,'参加する',5),(4,'参加する',4),(5,'未定',4),(8,'参加しない',3),(14,'参加する',5)) as v(m, a1, a3)
where s.title like 'クリスマスコンサート 打ち上げ%';

-- ── 9. 見学者 ────────────────────────────────────────────
-- ※ protect_visit_requests_insert トリガーが挿入時に status を 'new' へ強制するため、
--    挿入後に UPDATE で状態を設定する
insert into public.visit_requests
  (name, yomi, birthday, member_type, part, email, phone, comment, line_id, source, scheduled_visit_date)
values
 ('見学 一郎', 'ケンガク イチロウ', date '1990-05-10', 'adult', 'clarinet',   'visitor1@example.net', '080-0000-0001', '学生時代に吹いていたので再開したいです。（ダミー）', null, 'Instagram',        null),
 ('体験 二美', 'タイケン フミ',     date '1985-11-02', 'adult', 'flute',      'visitor2@example.net', '080-0000-0002', '初心者でも大丈夫でしょうか。（ダミー）',           null, '当団サイト',        current_date + 7),
 ('参加 三郎', 'サンカ サブロウ',   date '2000-03-21', 'adult', 'trombone',   'visitor3@example.net', '080-0000-0003', null,                                                  null, '知人・団員の紹介',  current_date - 10),
 ('入団 四葉', 'ニュウダン ヨツバ', date '1995-07-30', 'adult', 'oboe',       'visitor4@example.net', '080-0000-0004', 'ダブルリードの経験があります。（ダミー）',         null, 'X（旧Twitter）',    current_date - 30),
 ('相談 五月', 'ソウダン サツキ',   date '2011-09-09', 'minor', 'percussion', 'visitor5@example.net', '080-0000-0005', '中学生ですが参加できますか。（ダミー）',           null, 'ポスター・チラシ',  null),
 ('辞退 六助', 'ジタイ ロクスケ',   date '1978-01-15', 'adult', 'tuba',       'visitor6@example.net', '080-0000-0006', null,                                                  null, '直接問い合わせ',    null);

update public.visit_requests set status = 'contacted', visit_count = 1,
  assigned_to = ('a0000000-0000-4000-8000-' || lpad('3', 12, '0'))::uuid, has_unread_reply = true,
  gmail_thread_id = 'dummy-thread-001' where name = '見学 一郎';
update public.visit_requests set status = 'scheduled',
  assigned_to = ('a0000000-0000-4000-8000-' || lpad('4', 12, '0'))::uuid,
  internal_notes = '見学日の案内メール送信済み（ダミー）' where name = '体験 二美';
update public.visit_requests set status = 'visited', visit_count = 1,
  assigned_to = ('a0000000-0000-4000-8000-' || lpad('3', 12, '0'))::uuid where name = '参加 三郎';
update public.visit_requests set status = 'joined', visit_count = 2,
  assigned_to = ('a0000000-0000-4000-8000-' || lpad('4', 12, '0'))::uuid where name = '入団 四葉';
update public.visit_requests set status = 'declined', archived = true,
  internal_notes = '都合により辞退（ダミー）' where name = '辞退 六助';

insert into public.visit_messages
  (visit_request_id, gmail_message_id, gmail_thread_id, direction, from_email, to_email, subject, body, sent_at)
select r.id, v.mid, 'dummy-thread-001', v.dir, v.fr, v.to_, '【見学対応】見学一郎様の見学について', v.body, now() - v.ago
from public.visit_requests r
cross join (values
 ('dummy-msg-001', 'outbound', 'higashiosaka.winds@example.net', 'visitor1@example.net', E'見学のお申し込みありがとうございます。（ダミー）\n日程のご希望をお知らせください。', interval '2 days'),
 ('dummy-msg-002', 'inbound',  'visitor1@example.net', 'higashiosaka.winds@example.net', E'来週の土曜日を希望します。（ダミー）', interval '1 day')
) as v(mid, dir, fr, to_, body, ago)
where r.name = '見学 一郎';
