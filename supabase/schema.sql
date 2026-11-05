


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."feedback_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at := now();
  return new;
end $$;


ALTER FUNCTION "public"."feedback_set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_lending_code"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
declare
  next_val bigint;
begin
  next_val := nextval('public.instrument_lending_code_seq');
  return 'LD-' || to_char(current_date, 'YYYY') || '-' || lpad(next_val::text, 5, '0');
end;
$$;


ALTER FUNCTION "public"."generate_lending_code"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_roles"() RETURNS "text"[]
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT roles FROM public.profiles WHERE id = auth.uid();
$$;


ALTER FUNCTION "public"."get_my_roles"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_feedback_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.roles && array['gm','leader','subleader','engineer']::text[]
  );
$$;


ALTER FUNCTION "public"."is_feedback_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_survey_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.roles && array['gm','leader','subleader']::text[]
  );
$$;


ALTER FUNCTION "public"."is_survey_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protect_visit_requests_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.status         := 'new';
  new.assigned_to    := null;
  new.internal_notes := null;
  new.visit_count    := 0;
  return new;
end;
$$;


ALTER FUNCTION "public"."protect_visit_requests_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."register_push_subscription"("p_endpoint" "text", "p_p256dh" "text", "p_auth" "text", "p_ua" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth_key, user_agent)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, p_ua)
  on conflict (endpoint) do update
    set user_id      = auth.uid(),
        p256dh       = excluded.p256dh,
        auth_key     = excluded.auth_key,
        user_agent   = excluded.user_agent,
        last_seen_at = now();
end $$;


ALTER FUNCTION "public"."register_push_subscription"("p_endpoint" "text", "p_p256dh" "text", "p_auth" "text", "p_ua" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_lending_code"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if new.lending_code is null or new.lending_code = '' then
    new.lending_code := public.generate_lending_code();
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."set_lending_code"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_visit_requests_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_visit_requests_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."surveys" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "form_view_url" "text",
    "member_entry_id" "text",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "target_categories" "text"[],
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "published_at" timestamp with time zone,
    "closed_at" timestamp with time zone,
    "start_date" "date",
    "end_date" "date",
    "google_form_id" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "questions" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "allow_response_edit" boolean DEFAULT true NOT NULL,
    CONSTRAINT "surveys_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text", 'closed'::"text"])))
);


ALTER TABLE "public"."surveys" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."survey_is_open"("s" "public"."surveys") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select s.status = 'published'
     and (s.start_date is null or s.start_date <= current_date)
     and (s.end_date   is null or s.end_date   >= current_date);
$$;


ALTER FUNCTION "public"."survey_is_open"("s" "public"."surveys") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."surveys_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at := now();
  return new;
end $$;


ALTER FUNCTION "public"."surveys_set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."activities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" DEFAULT '練習'::"text" NOT NULL,
    "activity_date" "date" NOT NULL,
    "start_time" time without time zone,
    "end_time" time without time zone,
    "location" "text",
    "description" "text",
    "activity_type" "text" DEFAULT 'practice'::"text" NOT NULL,
    "is_cancelled" boolean DEFAULT false NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."activities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contact_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "body" "text" NOT NULL,
    "sender_id" "uuid",
    "sender_name" "text",
    "sender_email" "text",
    "target_member_ids" "uuid"[],
    "target_member_names" "text"[],
    "sent_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "contact_messages_type_check" CHECK (("type" = ANY (ARRAY['individual'::"text", 'broadcast'::"text"])))
);


ALTER TABLE "public"."contact_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dues_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category" "text" NOT NULL,
    "amount" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "updated_by" "uuid",
    CONSTRAINT "dues_settings_category_check" CHECK (("category" = ANY (ARRAY['regular'::"text", 'regular_student'::"text", 'trainee'::"text", 'support'::"text"])))
);


ALTER TABLE "public"."dues_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feedback" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "member_id" "uuid",
    "member_name" "text",
    "kind" "text" DEFAULT 'bug'::"text" NOT NULL,
    "body" "text" NOT NULL,
    "page" "text",
    "screenshot_path" "text",
    "user_agent" "text",
    "app_version" "text",
    "is_pwa" boolean DEFAULT false,
    "console_log" "text",
    "status" "text" DEFAULT 'new'::"text" NOT NULL,
    "priority" "text",
    "duplicate_of" "uuid",
    "admin_note" "text",
    "handled_by" "uuid",
    "handled_at" timestamp with time zone,
    CONSTRAINT "feedback_kind_check" CHECK (("kind" = ANY (ARRAY['bug'::"text", 'feature'::"text", 'question'::"text"]))),
    CONSTRAINT "feedback_priority_check" CHECK (("priority" = ANY (ARRAY['P0'::"text", 'P1'::"text", 'P2'::"text", 'P3'::"text"]))),
    CONSTRAINT "feedback_status_check" CHECK (("status" = ANY (ARRAY['new'::"text", 'triaged'::"text", 'planned'::"text", 'doing'::"text", 'done'::"text", 'declined'::"text", 'duplicate'::"text"])))
);


ALTER TABLE "public"."feedback" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."instrument_lending_code_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."instrument_lending_code_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."instrument_lending_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "instrument_id" "uuid" NOT NULL,
    "lending_code" "text" NOT NULL,
    "borrower_name" "text" NOT NULL,
    "lending_type" "text" NOT NULL,
    "start_date" "date" NOT NULL,
    "due_date" "date",
    "returned_at" timestamp with time zone,
    "returned" boolean DEFAULT false NOT NULL,
    "memo" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone
);


ALTER TABLE "public"."instrument_lending_records" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."instruments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "instrument_number" "text" NOT NULL,
    "part_category" "text" NOT NULL,
    "ownership_type" "text" NOT NULL,
    "part_seq" "text" NOT NULL,
    "overall_seq" "text" NOT NULL,
    "status" "text" DEFAULT '保管'::"text" NOT NULL,
    "item_type" "text" NOT NULL,
    "name_ja" "text" NOT NULL,
    "instrument_code" "text",
    "maker" "text",
    "product_name" "text",
    "owner_lender" "text",
    "repair_history" "text",
    "memo" "text",
    "registered_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "image_path" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."instruments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."member_status_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "member_id" "uuid" NOT NULL,
    "request_type" "text" NOT NULL,
    "reason" "text",
    "desired_date" "date",
    "return_date" "date",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "notes" "text",
    "applied_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reviewed_at" timestamp with time zone,
    "reviewed_by" "uuid",
    CONSTRAINT "member_status_requests_request_type_check" CHECK (("request_type" = ANY (ARRAY['rest'::"text", 'withdraw'::"text"]))),
    CONSTRAINT "member_status_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."member_status_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_log" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "dedupe_key" "text" NOT NULL,
    "sent_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notification_log" OWNER TO "postgres";


ALTER TABLE "public"."notification_log" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."notification_log_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."notification_prefs" (
    "user_id" "uuid" NOT NULL,
    "attendance" boolean DEFAULT true NOT NULL,
    "dues" boolean DEFAULT true NOT NULL,
    "scores" boolean DEFAULT true NOT NULL,
    "lending" boolean DEFAULT true NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "surveys" boolean DEFAULT true,
    "visitors" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."notification_prefs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."opinions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "member_id" "uuid",
    "member_name" "text" NOT NULL,
    "body" "text" NOT NULL,
    "status" "text" DEFAULT 'unread'::"text" NOT NULL,
    "admin_note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "opinions_status_check" CHECK (("status" = ANY (ARRAY['unread'::"text", 'read'::"text"])))
);


ALTER TABLE "public"."opinions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "last_name" "text" NOT NULL,
    "first_name" "text" NOT NULL,
    "last_kana" "text" NOT NULL,
    "first_kana" "text" NOT NULL,
    "roles" "text"[] DEFAULT ARRAY['member'::"text"] NOT NULL,
    "part" "text",
    "category" "text" DEFAULT 'regular'::"text" NOT NULL,
    "email" "text",
    "phone" "text",
    "birthday" "date",
    "emergency_contact" "text",
    "joined_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_part_leader" boolean DEFAULT false NOT NULL,
    "payment_method" "text",
    CONSTRAINT "profiles_category_check" CHECK (("category" = ANY (ARRAY['regular'::"text", 'regular_student'::"text", 'trainee'::"text", 'rest'::"text", 'support'::"text"]))),
    CONSTRAINT "profiles_payment_method_check" CHECK (("payment_method" = ANY (ARRAY['cash'::"text", 'credit'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."public_upcoming_practices" AS
 SELECT "id",
    "title",
    "activity_date",
    "start_time",
    "end_time",
    "location"
   FROM "public"."activities"
  WHERE (("activity_type" = 'practice'::"text") AND ("is_cancelled" = false) AND ("activity_date" >= CURRENT_DATE))
  ORDER BY "activity_date";


ALTER VIEW "public"."public_upcoming_practices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."push_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "endpoint" "text" NOT NULL,
    "p256dh" "text" NOT NULL,
    "auth_key" "text" NOT NULL,
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_seen_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."push_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."request_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_type" "text" NOT NULL,
    "request_id" "uuid" NOT NULL,
    "sender_id" "uuid",
    "sender_name" "text" NOT NULL,
    "is_leader" boolean DEFAULT false NOT NULL,
    "body" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "read_by_member" boolean DEFAULT false NOT NULL,
    "read_by_leader" boolean DEFAULT false NOT NULL,
    CONSTRAINT "request_messages_request_type_check" CHECK (("request_type" = ANY (ARRAY['special'::"text", 'rest'::"text", 'withdraw'::"text"])))
);


ALTER TABLE "public"."request_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type" "text" NOT NULL,
    "applicant_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text",
    "content" "jsonb",
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "processed_at" timestamp with time zone,
    "processed_by" "uuid",
    CONSTRAINT "requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."score_lending_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "score_id" "uuid" NOT NULL,
    "score_title" "text" NOT NULL,
    "requester_id" "uuid" NOT NULL,
    "requester_name" "text" NOT NULL,
    "requester_email" "text" NOT NULL,
    "parts" "text"[] NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "due_date" "date",
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "score_lending_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'lending'::"text", 'returned'::"text"])))
);


ALTER TABLE "public"."score_lending_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."score_pdfs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "score_id" "uuid" NOT NULL,
    "part_id" "uuid",
    "file_name" "text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "uploaded_by" "uuid",
    "uploaded_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."score_pdfs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scores2" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "score_number" integer NOT NULL,
    "title_ja" "text" NOT NULL,
    "title_en" "text" DEFAULT ''::"text",
    "title_kana" "text" DEFAULT ''::"text",
    "composer" "text" DEFAULT ''::"text",
    "artist" "text" DEFAULT ''::"text",
    "index_kana" "text" DEFAULT ''::"text",
    "index_alpha" "text" DEFAULT ''::"text",
    "formation" "text" DEFAULT ''::"text",
    "notes" "text" DEFAULT ''::"text",
    "is_public" boolean DEFAULT false,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "publish_start" timestamp with time zone,
    "publish_end" timestamp with time zone,
    "no_convenience_print" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."scores2" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."special_measures" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "member_id" "uuid" NOT NULL,
    "reason" "text" DEFAULT ''::"text" NOT NULL,
    "requested_start_month" "text" NOT NULL,
    "end_month" "text" NOT NULL,
    "extended_end_month" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "actual_start_month" "text",
    "actual_end_month" "text",
    "applied_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "approved_at" timestamp with time zone,
    "approved_by" "uuid",
    "rejected_at" timestamp with time zone,
    "rejected_by" "uuid",
    "notes" "text" DEFAULT ''::"text" NOT NULL,
    CONSTRAINT "special_measures_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."special_measures" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."survey_responses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "survey_id" "uuid" NOT NULL,
    "member_id" "uuid",
    "email" "text",
    "responded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "answers" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."survey_responses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."visit_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "visit_request_id" "uuid" NOT NULL,
    "gmail_message_id" "text" NOT NULL,
    "gmail_thread_id" "text" NOT NULL,
    "direction" "text" NOT NULL,
    "from_email" "text",
    "to_email" "text",
    "subject" "text",
    "body" "text",
    "sent_at" timestamp with time zone NOT NULL,
    "synced_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "visit_messages_direction_check" CHECK (("direction" = ANY (ARRAY['outbound'::"text", 'inbound'::"text"])))
);


ALTER TABLE "public"."visit_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."visit_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "yomi" "text",
    "birthday" "date",
    "member_type" "text",
    "part" "text",
    "email" "text" NOT NULL,
    "phone" "text",
    "emergency_phone" "text",
    "guardian_name" "text",
    "comment" "text",
    "date_request_activity_ids" "uuid"[] DEFAULT '{}'::"uuid"[],
    "date_request_note" "text",
    "line_id" "text",
    "status" "text" DEFAULT 'new'::"text" NOT NULL,
    "assigned_to" "uuid",
    "internal_notes" "text",
    "visit_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "gmail_thread_id" "text",
    "has_unread_reply" boolean DEFAULT false NOT NULL,
    "archived" boolean DEFAULT false NOT NULL,
    "scheduled_visit_date" "date",
    "source" "text",
    CONSTRAINT "visit_requests_member_type_check" CHECK (("member_type" = ANY (ARRAY['minor'::"text", 'adult'::"text"]))),
    CONSTRAINT "visit_requests_status_check" CHECK (("status" = ANY (ARRAY['new'::"text", 'contacted'::"text", 'scheduled'::"text", 'visited'::"text", 'joined'::"text", 'declined'::"text"])))
);


ALTER TABLE "public"."visit_requests" OWNER TO "postgres";


COMMENT ON COLUMN "public"."visit_requests"."status" IS 'new=新規 / contacted=連絡済み・日程調整中 / scheduled=見学予定 / visited=見学済み / joined=入団 / declined=見送り・辞退';



ALTER TABLE ONLY "public"."activities"
    ADD CONSTRAINT "activities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contact_messages"
    ADD CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dues_settings"
    ADD CONSTRAINT "dues_settings_category_key" UNIQUE ("category");



ALTER TABLE ONLY "public"."dues_settings"
    ADD CONSTRAINT "dues_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feedback"
    ADD CONSTRAINT "feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."instrument_lending_records"
    ADD CONSTRAINT "instrument_lending_records_lending_code_key" UNIQUE ("lending_code");



ALTER TABLE ONLY "public"."instrument_lending_records"
    ADD CONSTRAINT "instrument_lending_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."instruments"
    ADD CONSTRAINT "instruments_instrument_number_key" UNIQUE ("instrument_number");



ALTER TABLE ONLY "public"."instruments"
    ADD CONSTRAINT "instruments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."member_status_requests"
    ADD CONSTRAINT "member_status_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_log"
    ADD CONSTRAINT "notification_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_log"
    ADD CONSTRAINT "notification_log_user_id_dedupe_key_key" UNIQUE ("user_id", "dedupe_key");



ALTER TABLE ONLY "public"."notification_prefs"
    ADD CONSTRAINT "notification_prefs_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."opinions"
    ADD CONSTRAINT "opinions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_endpoint_key" UNIQUE ("endpoint");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."request_messages"
    ADD CONSTRAINT "request_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."requests"
    ADD CONSTRAINT "requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."score_lending_requests"
    ADD CONSTRAINT "score_lending_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."score_pdfs"
    ADD CONSTRAINT "score_pdfs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scores2"
    ADD CONSTRAINT "scores2_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scores2"
    ADD CONSTRAINT "scores2_score_number_key" UNIQUE ("score_number");



ALTER TABLE ONLY "public"."special_measures"
    ADD CONSTRAINT "special_measures_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."survey_responses"
    ADD CONSTRAINT "survey_responses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."survey_responses"
    ADD CONSTRAINT "survey_responses_survey_id_member_id_key" UNIQUE ("survey_id", "member_id");



ALTER TABLE ONLY "public"."surveys"
    ADD CONSTRAINT "surveys_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."visit_messages"
    ADD CONSTRAINT "visit_messages_gmail_message_id_key" UNIQUE ("gmail_message_id");



ALTER TABLE ONLY "public"."visit_messages"
    ADD CONSTRAINT "visit_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."visit_requests"
    ADD CONSTRAINT "visit_requests_pkey" PRIMARY KEY ("id");



CREATE INDEX "feedback_created_idx" ON "public"."feedback" USING "btree" ("created_at" DESC);



CREATE INDEX "feedback_kind_idx" ON "public"."feedback" USING "btree" ("kind");



CREATE INDEX "feedback_member_idx" ON "public"."feedback" USING "btree" ("member_id");



CREATE INDEX "feedback_status_idx" ON "public"."feedback" USING "btree" ("status");



CREATE INDEX "idx_activities_date" ON "public"."activities" USING "btree" ("activity_date");



CREATE INDEX "idx_activities_type" ON "public"."activities" USING "btree" ("activity_type");



CREATE INDEX "idx_ilr_due_date" ON "public"."instrument_lending_records" USING "btree" ("due_date");



CREATE INDEX "idx_ilr_instrument_id" ON "public"."instrument_lending_records" USING "btree" ("instrument_id");



CREATE INDEX "idx_ilr_lending_code" ON "public"."instrument_lending_records" USING "btree" ("lending_code");



CREATE INDEX "idx_ilr_returned" ON "public"."instrument_lending_records" USING "btree" ("returned");



CREATE INDEX "idx_instruments_category" ON "public"."instruments" USING "btree" ("part_category");



CREATE INDEX "idx_instruments_status" ON "public"."instruments" USING "btree" ("status");



CREATE INDEX "idx_instruments_type" ON "public"."instruments" USING "btree" ("item_type");



CREATE INDEX "idx_lending_instrument" ON "public"."instrument_lending_records" USING "btree" ("instrument_id");



CREATE INDEX "idx_lending_returned" ON "public"."instrument_lending_records" USING "btree" ("returned");



CREATE INDEX "idx_member_status_requests_member" ON "public"."member_status_requests" USING "btree" ("member_id", "request_type", "applied_at" DESC);



CREATE INDEX "idx_opinions_created_at" ON "public"."opinions" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_profiles_category" ON "public"."profiles" USING "btree" ("category");



CREATE INDEX "idx_profiles_part" ON "public"."profiles" USING "btree" ("part");



CREATE INDEX "idx_profiles_roles" ON "public"."profiles" USING "gin" ("roles");



CREATE INDEX "idx_request_messages_thread" ON "public"."request_messages" USING "btree" ("request_type", "request_id", "created_at");



CREATE INDEX "idx_slr_requester" ON "public"."score_lending_requests" USING "btree" ("requester_id");



CREATE INDEX "idx_slr_score" ON "public"."score_lending_requests" USING "btree" ("score_id");



CREATE INDEX "idx_slr_status" ON "public"."score_lending_requests" USING "btree" ("status");



CREATE INDEX "idx_survey_responses_member" ON "public"."survey_responses" USING "btree" ("member_id");



CREATE INDEX "idx_survey_responses_survey" ON "public"."survey_responses" USING "btree" ("survey_id");



CREATE INDEX "idx_visit_messages_visit_request_id" ON "public"."visit_messages" USING "btree" ("visit_request_id", "sent_at");



CREATE INDEX "idx_visit_requests_archived" ON "public"."visit_requests" USING "btree" ("archived");



CREATE INDEX "idx_visit_requests_gmail_thread_id" ON "public"."visit_requests" USING "btree" ("gmail_thread_id");



CREATE INDEX "idx_visit_requests_scheduled_visit_date" ON "public"."visit_requests" USING "btree" ("scheduled_visit_date");



CREATE INDEX "push_subscriptions_user_idx" ON "public"."push_subscriptions" USING "btree" ("user_id");



CREATE INDEX "special_measures_member_idx" ON "public"."special_measures" USING "btree" ("member_id");



CREATE INDEX "special_measures_status_idx" ON "public"."special_measures" USING "btree" ("status");



CREATE INDEX "survey_responses_member_idx" ON "public"."survey_responses" USING "btree" ("member_id");



CREATE INDEX "survey_responses_survey_idx" ON "public"."survey_responses" USING "btree" ("survey_id");



CREATE INDEX "surveys_created_idx" ON "public"."surveys" USING "btree" ("created_at" DESC);



CREATE INDEX "surveys_status_idx" ON "public"."surveys" USING "btree" ("status");



CREATE OR REPLACE TRIGGER "activities_updated_at" BEFORE UPDATE ON "public"."activities" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "score_lending_updated_at" BEFORE UPDATE ON "public"."score_lending_requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_feedback_updated_at" BEFORE UPDATE ON "public"."feedback" FOR EACH ROW EXECUTE FUNCTION "public"."feedback_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_ilr_updated_at" BEFORE UPDATE ON "public"."instrument_lending_records" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_instruments_updated_at" BEFORE UPDATE ON "public"."instruments" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_protect_visit_requests_insert" BEFORE INSERT ON "public"."visit_requests" FOR EACH ROW EXECUTE FUNCTION "public"."protect_visit_requests_insert"();



CREATE OR REPLACE TRIGGER "trg_scores2_updated_at" BEFORE UPDATE ON "public"."scores2" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_set_lending_code" BEFORE INSERT ON "public"."instrument_lending_records" FOR EACH ROW EXECUTE FUNCTION "public"."set_lending_code"();



CREATE OR REPLACE TRIGGER "trg_survey_responses_updated_at" BEFORE UPDATE ON "public"."survey_responses" FOR EACH ROW EXECUTE FUNCTION "public"."surveys_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_surveys_updated_at" BEFORE UPDATE ON "public"."surveys" FOR EACH ROW EXECUTE FUNCTION "public"."surveys_set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_visit_requests_updated_at" BEFORE UPDATE ON "public"."visit_requests" FOR EACH ROW EXECUTE FUNCTION "public"."set_visit_requests_updated_at"();



ALTER TABLE ONLY "public"."activities"
    ADD CONSTRAINT "activities_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."contact_messages"
    ADD CONSTRAINT "contact_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."dues_settings"
    ADD CONSTRAINT "dues_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."feedback"
    ADD CONSTRAINT "feedback_duplicate_of_fkey" FOREIGN KEY ("duplicate_of") REFERENCES "public"."feedback"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."feedback"
    ADD CONSTRAINT "feedback_handled_by_fkey" FOREIGN KEY ("handled_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."feedback"
    ADD CONSTRAINT "feedback_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."instrument_lending_records"
    ADD CONSTRAINT "instrument_lending_records_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."instrument_lending_records"
    ADD CONSTRAINT "instrument_lending_records_instrument_id_fkey" FOREIGN KEY ("instrument_id") REFERENCES "public"."instruments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."instruments"
    ADD CONSTRAINT "instruments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."member_status_requests"
    ADD CONSTRAINT "member_status_requests_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."member_status_requests"
    ADD CONSTRAINT "member_status_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."notification_log"
    ADD CONSTRAINT "notification_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_prefs"
    ADD CONSTRAINT "notification_prefs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."opinions"
    ADD CONSTRAINT "opinions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."request_messages"
    ADD CONSTRAINT "request_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."score_lending_requests"
    ADD CONSTRAINT "score_lending_requests_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."score_lending_requests"
    ADD CONSTRAINT "score_lending_requests_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."score_lending_requests"
    ADD CONSTRAINT "score_lending_requests_score_id_fkey" FOREIGN KEY ("score_id") REFERENCES "public"."scores2"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."score_pdfs"
    ADD CONSTRAINT "score_pdfs_score_id_fkey" FOREIGN KEY ("score_id") REFERENCES "public"."scores2"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."score_pdfs"
    ADD CONSTRAINT "score_pdfs_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."scores2"
    ADD CONSTRAINT "scores2_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."special_measures"
    ADD CONSTRAINT "special_measures_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."special_measures"
    ADD CONSTRAINT "special_measures_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."special_measures"
    ADD CONSTRAINT "special_measures_rejected_by_fkey" FOREIGN KEY ("rejected_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."survey_responses"
    ADD CONSTRAINT "survey_responses_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."survey_responses"
    ADD CONSTRAINT "survey_responses_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "public"."surveys"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."surveys"
    ADD CONSTRAINT "surveys_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."visit_messages"
    ADD CONSTRAINT "visit_messages_visit_request_id_fkey" FOREIGN KEY ("visit_request_id") REFERENCES "public"."visit_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."visit_requests"
    ADD CONSTRAINT "visit_requests_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE "public"."activities" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "activities_delete" ON "public"."activities" FOR DELETE USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "activities_insert" ON "public"."activities" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "activities_select" ON "public"."activities" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "activities_update" ON "public"."activities" FOR UPDATE USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "admin_delete_all" ON "public"."score_lending_requests" FOR DELETE USING ((("auth"."uid"() = "requester_id") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."roles" && ARRAY['gm'::"text", 'librarian'::"text", 'admin'::"text"]))))));



CREATE POLICY "admin_select_all" ON "public"."score_lending_requests" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."roles" && ARRAY['gm'::"text", 'librarian'::"text", 'admin'::"text"])))));



CREATE POLICY "admin_update_all" ON "public"."score_lending_requests" FOR UPDATE USING ((("auth"."uid"() = "requester_id") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."roles" && ARRAY['gm'::"text", 'librarian'::"text", 'admin'::"text"]))))));



CREATE POLICY "admins can update all profiles" ON "public"."profiles" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "profiles_1"
  WHERE (("profiles_1"."id" = "auth"."uid"()) AND ("profiles_1"."roles" && ARRAY['gm'::"text", 'leader'::"text", 'subleader'::"text", 'treasurer'::"text"]))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "profiles_1"
  WHERE (("profiles_1"."id" = "auth"."uid"()) AND ("profiles_1"."roles" && ARRAY['gm'::"text", 'leader'::"text", 'subleader'::"text", 'treasurer'::"text"])))));



CREATE POLICY "anon can insert visit requests" ON "public"."visit_requests" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "authenticated can select visit messages" ON "public"."visit_messages" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated can select visit requests" ON "public"."visit_requests" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated can update visit requests" ON "public"."visit_requests" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."contact_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dues_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "dues_settings_select_all" ON "public"."dues_settings" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "dues_settings_update_all" ON "public"."dues_settings" USING (("auth"."uid"() IS NOT NULL));



ALTER TABLE "public"."feedback" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "feedback_delete_admin" ON "public"."feedback" FOR DELETE TO "authenticated" USING ("public"."is_feedback_admin"());



CREATE POLICY "feedback_insert_own" ON "public"."feedback" FOR INSERT TO "authenticated" WITH CHECK (("member_id" = "auth"."uid"()));



CREATE POLICY "feedback_select_own_or_admin" ON "public"."feedback" FOR SELECT TO "authenticated" USING ((("member_id" = "auth"."uid"()) OR "public"."is_feedback_admin"()));



CREATE POLICY "feedback_update_admin" ON "public"."feedback" FOR UPDATE TO "authenticated" USING ("public"."is_feedback_admin"()) WITH CHECK ("public"."is_feedback_admin"());



CREATE POLICY "ilr_delete_admin" ON "public"."instrument_lending_records" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."roles" && ARRAY['gm'::"text", 'leader'::"text", 'subleader'::"text", 'equipment'::"text"])))));



CREATE POLICY "ilr_insert_auth" ON "public"."instrument_lending_records" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "ilr_select_all" ON "public"."instrument_lending_records" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "ilr_update_auth" ON "public"."instrument_lending_records" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."instrument_lending_records" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."instruments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "instruments_delete_admin" ON "public"."instruments" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."roles" && ARRAY['gm'::"text", 'leader'::"text", 'subleader'::"text", 'equipment'::"text"])))));



CREATE POLICY "instruments_insert_admin" ON "public"."instruments" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."roles" && ARRAY['gm'::"text", 'leader'::"text", 'subleader'::"text", 'equipment'::"text"])))));



CREATE POLICY "instruments_select_all" ON "public"."instruments" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "instruments_update_admin" ON "public"."instruments" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."roles" && ARRAY['gm'::"text", 'leader'::"text", 'subleader'::"text", 'equipment'::"text"])))));



CREATE POLICY "leaders can update all status requests" ON "public"."member_status_requests" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."roles" && ARRAY['gm'::"text", 'leader'::"text", 'subleader'::"text"])))));



CREATE POLICY "leaders can view all status requests" ON "public"."member_status_requests" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."roles" && ARRAY['gm'::"text", 'leader'::"text", 'subleader'::"text"])))));



CREATE POLICY "lending_delete_admin" ON "public"."instrument_lending_records" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."roles" && ARRAY['gm'::"text", 'leader'::"text", 'subleader'::"text", 'equipment'::"text"])))));



CREATE POLICY "lending_insert_admin" ON "public"."instrument_lending_records" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."roles" && ARRAY['gm'::"text", 'leader'::"text", 'subleader'::"text", 'equipment'::"text"])))));



CREATE POLICY "lending_select_all" ON "public"."instrument_lending_records" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "lending_update_admin" ON "public"."instrument_lending_records" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."roles" && ARRAY['gm'::"text", 'leader'::"text", 'subleader'::"text", 'equipment'::"text"])))));



CREATE POLICY "member can insert own status requests" ON "public"."member_status_requests" FOR INSERT WITH CHECK (("auth"."uid"() = "member_id"));



CREATE POLICY "member can view own status requests" ON "public"."member_status_requests" FOR SELECT USING (("auth"."uid"() = "member_id"));



ALTER TABLE "public"."member_status_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_prefs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."opinions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "opinions_insert" ON "public"."opinions" FOR INSERT WITH CHECK (("auth"."uid"() = "member_id"));



CREATE POLICY "opinions_select" ON "public"."opinions" FOR SELECT USING ((("auth"."uid"() = "member_id") OR (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."roles" && ARRAY['gm'::"text", 'leader'::"text", 'subleader'::"text"]))))));



CREATE POLICY "opinions_update" ON "public"."opinions" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."roles" && ARRAY['gm'::"text", 'leader'::"text", 'subleader'::"text"])))));



CREATE POLICY "prefs_insert_own" ON "public"."notification_prefs" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "prefs_select_own" ON "public"."notification_prefs" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "prefs_update_own" ON "public"."notification_prefs" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_delete_admin" ON "public"."profiles" FOR DELETE USING (("public"."get_my_roles"() && ARRAY['admin'::"text", 'gm'::"text"]));



CREATE POLICY "profiles_insert_own" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "profiles_select_authenticated" ON "public"."profiles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "profiles_update_admin" ON "public"."profiles" FOR UPDATE USING (("public"."get_my_roles"() && ARRAY['admin'::"text", 'gm'::"text"]));



CREATE POLICY "profiles_update_own" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "push_sub_delete_own" ON "public"."push_subscriptions" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "push_sub_select_own" ON "public"."push_subscriptions" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."push_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."request_messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "request_messages_insert" ON "public"."request_messages" FOR INSERT WITH CHECK (("auth"."uid"() = "sender_id"));



CREATE POLICY "request_messages_select" ON "public"."request_messages" FOR SELECT USING ((("auth"."uid"() = "sender_id") OR (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."roles" && ARRAY['gm'::"text", 'leader'::"text", 'subleader'::"text"])))) OR (EXISTS ( SELECT 1
   FROM "public"."special_measures" "sm"
  WHERE (("request_messages"."request_type" = 'special'::"text") AND ("sm"."id" = "request_messages"."request_id") AND ("sm"."member_id" = "auth"."uid"()))
UNION
 SELECT 1
   FROM "public"."member_status_requests" "r"
  WHERE (("r"."request_type" = ANY (ARRAY['rest'::"text", 'withdraw'::"text"])) AND ("r"."id" = "request_messages"."request_id") AND ("r"."member_id" = "auth"."uid"()))))));



CREATE POLICY "request_messages_update" ON "public"."request_messages" FOR UPDATE USING (true);



ALTER TABLE "public"."requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "requests_insert_authenticated" ON "public"."requests" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "applicant_id"));



CREATE POLICY "requests_select_authenticated" ON "public"."requests" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."score_lending_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."score_pdfs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "score_pdfs_delete_authenticated" ON "public"."score_pdfs" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "score_pdfs_insert_authenticated" ON "public"."score_pdfs" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "score_pdfs_select_authenticated" ON "public"."score_pdfs" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "score_pdfs_update_authenticated" ON "public"."score_pdfs" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."scores2" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "scores2_delete_authenticated" ON "public"."scores2" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "scores2_insert_authenticated" ON "public"."scores2" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "scores2_select_authenticated" ON "public"."scores2" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "scores2_update_authenticated" ON "public"."scores2" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "sm_insert_own" ON "public"."special_measures" FOR INSERT WITH CHECK (("auth"."uid"() = "member_id"));



CREATE POLICY "sm_select_own" ON "public"."special_measures" FOR SELECT USING ((("auth"."uid"() = "member_id") OR ("auth"."uid"() IS NOT NULL)));



CREATE POLICY "sm_update_all" ON "public"."special_measures" FOR UPDATE USING (("auth"."uid"() IS NOT NULL));



ALTER TABLE "public"."special_measures" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."survey_responses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "survey_responses_delete" ON "public"."survey_responses" FOR DELETE TO "authenticated" USING ((("member_id" = "auth"."uid"()) OR "public"."is_survey_admin"()));



CREATE POLICY "survey_responses_insert_own" ON "public"."survey_responses" FOR INSERT TO "authenticated" WITH CHECK ((("member_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."surveys" "s"
  WHERE (("s"."id" = "survey_responses"."survey_id") AND "public"."survey_is_open"("s".*))))));



CREATE POLICY "survey_responses_insert_service" ON "public"."survey_responses" FOR INSERT WITH CHECK (true);



CREATE POLICY "survey_responses_select" ON "public"."survey_responses" FOR SELECT TO "authenticated" USING ((("member_id" = "auth"."uid"()) OR "public"."is_survey_admin"()));



CREATE POLICY "survey_responses_select_all" ON "public"."survey_responses" FOR SELECT USING (true);



CREATE POLICY "survey_responses_update_own" ON "public"."survey_responses" FOR UPDATE TO "authenticated" USING (("member_id" = "auth"."uid"())) WITH CHECK ((("member_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."surveys" "s"
  WHERE (("s"."id" = "survey_responses"."survey_id") AND "public"."survey_is_open"("s".*) AND ("s"."allow_response_edit" = true))))));



CREATE POLICY "survey_responses_update_service" ON "public"."survey_responses" FOR UPDATE USING (true);



ALTER TABLE "public"."surveys" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "surveys_delete_admin" ON "public"."surveys" FOR DELETE TO "authenticated" USING ("public"."is_survey_admin"());



CREATE POLICY "surveys_delete_all" ON "public"."surveys" FOR DELETE USING (true);



CREATE POLICY "surveys_insert_admin" ON "public"."surveys" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_survey_admin"());



CREATE POLICY "surveys_insert_all" ON "public"."surveys" FOR INSERT WITH CHECK (true);



CREATE POLICY "surveys_select" ON "public"."surveys" FOR SELECT TO "authenticated" USING (("public"."is_survey_admin"() OR ("status" = 'published'::"text")));



CREATE POLICY "surveys_select_all" ON "public"."surveys" FOR SELECT USING (true);



CREATE POLICY "surveys_update_admin" ON "public"."surveys" FOR UPDATE TO "authenticated" USING ("public"."is_survey_admin"()) WITH CHECK ("public"."is_survey_admin"());



CREATE POLICY "surveys_update_all" ON "public"."surveys" FOR UPDATE USING (true);



CREATE POLICY "users_insert_own" ON "public"."score_lending_requests" FOR INSERT WITH CHECK (("auth"."uid"() = "requester_id"));



CREATE POLICY "users_select_own" ON "public"."score_lending_requests" FOR SELECT USING (("auth"."uid"() = "requester_id"));



ALTER TABLE "public"."visit_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."visit_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "visitor_managers_can_insert" ON "public"."visit_requests" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."roles" && ARRAY['gm'::"text", 'leader'::"text", 'subleader'::"text"])))));



CREATE POLICY "ログイン済みユーザーは挿入可能" ON "public"."contact_messages" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "ログイン済みユーザーは閲覧可能" ON "public"."contact_messages" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";














































































































































































GRANT ALL ON FUNCTION "public"."feedback_set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."feedback_set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."feedback_set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_lending_code"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_lending_code"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_lending_code"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_roles"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_roles"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_roles"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_feedback_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_feedback_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_feedback_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_survey_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_survey_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_survey_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."protect_visit_requests_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."protect_visit_requests_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."protect_visit_requests_insert"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."register_push_subscription"("p_endpoint" "text", "p_p256dh" "text", "p_auth" "text", "p_ua" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."register_push_subscription"("p_endpoint" "text", "p_p256dh" "text", "p_auth" "text", "p_ua" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."register_push_subscription"("p_endpoint" "text", "p_p256dh" "text", "p_auth" "text", "p_ua" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."register_push_subscription"("p_endpoint" "text", "p_p256dh" "text", "p_auth" "text", "p_ua" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_lending_code"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_lending_code"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_lending_code"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_visit_requests_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_visit_requests_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_visit_requests_updated_at"() TO "service_role";



GRANT ALL ON TABLE "public"."surveys" TO "anon";
GRANT ALL ON TABLE "public"."surveys" TO "authenticated";
GRANT ALL ON TABLE "public"."surveys" TO "service_role";



GRANT ALL ON FUNCTION "public"."survey_is_open"("s" "public"."surveys") TO "anon";
GRANT ALL ON FUNCTION "public"."survey_is_open"("s" "public"."surveys") TO "authenticated";
GRANT ALL ON FUNCTION "public"."survey_is_open"("s" "public"."surveys") TO "service_role";



GRANT ALL ON FUNCTION "public"."surveys_set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."surveys_set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."surveys_set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";
























GRANT ALL ON TABLE "public"."activities" TO "anon";
GRANT ALL ON TABLE "public"."activities" TO "authenticated";
GRANT ALL ON TABLE "public"."activities" TO "service_role";



GRANT ALL ON TABLE "public"."contact_messages" TO "anon";
GRANT ALL ON TABLE "public"."contact_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."contact_messages" TO "service_role";



GRANT ALL ON TABLE "public"."dues_settings" TO "anon";
GRANT ALL ON TABLE "public"."dues_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."dues_settings" TO "service_role";



GRANT ALL ON TABLE "public"."feedback" TO "anon";
GRANT ALL ON TABLE "public"."feedback" TO "authenticated";
GRANT ALL ON TABLE "public"."feedback" TO "service_role";



GRANT ALL ON SEQUENCE "public"."instrument_lending_code_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."instrument_lending_code_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."instrument_lending_code_seq" TO "service_role";



GRANT ALL ON TABLE "public"."instrument_lending_records" TO "anon";
GRANT ALL ON TABLE "public"."instrument_lending_records" TO "authenticated";
GRANT ALL ON TABLE "public"."instrument_lending_records" TO "service_role";



GRANT ALL ON TABLE "public"."instruments" TO "anon";
GRANT ALL ON TABLE "public"."instruments" TO "authenticated";
GRANT ALL ON TABLE "public"."instruments" TO "service_role";



GRANT ALL ON TABLE "public"."member_status_requests" TO "anon";
GRANT ALL ON TABLE "public"."member_status_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."member_status_requests" TO "service_role";



GRANT ALL ON TABLE "public"."notification_log" TO "anon";
GRANT ALL ON TABLE "public"."notification_log" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_log" TO "service_role";



GRANT ALL ON SEQUENCE "public"."notification_log_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."notification_log_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."notification_log_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."notification_prefs" TO "anon";
GRANT ALL ON TABLE "public"."notification_prefs" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_prefs" TO "service_role";



GRANT ALL ON TABLE "public"."opinions" TO "anon";
GRANT ALL ON TABLE "public"."opinions" TO "authenticated";
GRANT ALL ON TABLE "public"."opinions" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."public_upcoming_practices" TO "anon";
GRANT ALL ON TABLE "public"."public_upcoming_practices" TO "authenticated";
GRANT ALL ON TABLE "public"."public_upcoming_practices" TO "service_role";



GRANT ALL ON TABLE "public"."push_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."request_messages" TO "anon";
GRANT ALL ON TABLE "public"."request_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."request_messages" TO "service_role";



GRANT ALL ON TABLE "public"."requests" TO "anon";
GRANT ALL ON TABLE "public"."requests" TO "authenticated";
GRANT ALL ON TABLE "public"."requests" TO "service_role";



GRANT ALL ON TABLE "public"."score_lending_requests" TO "anon";
GRANT ALL ON TABLE "public"."score_lending_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."score_lending_requests" TO "service_role";



GRANT ALL ON TABLE "public"."score_pdfs" TO "anon";
GRANT ALL ON TABLE "public"."score_pdfs" TO "authenticated";
GRANT ALL ON TABLE "public"."score_pdfs" TO "service_role";



GRANT ALL ON TABLE "public"."scores2" TO "anon";
GRANT ALL ON TABLE "public"."scores2" TO "authenticated";
GRANT ALL ON TABLE "public"."scores2" TO "service_role";



GRANT ALL ON TABLE "public"."special_measures" TO "anon";
GRANT ALL ON TABLE "public"."special_measures" TO "authenticated";
GRANT ALL ON TABLE "public"."special_measures" TO "service_role";



GRANT ALL ON TABLE "public"."survey_responses" TO "anon";
GRANT ALL ON TABLE "public"."survey_responses" TO "authenticated";
GRANT ALL ON TABLE "public"."survey_responses" TO "service_role";



GRANT ALL ON TABLE "public"."visit_messages" TO "anon";
GRANT ALL ON TABLE "public"."visit_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."visit_messages" TO "service_role";



GRANT ALL ON TABLE "public"."visit_requests" TO "anon";
GRANT ALL ON TABLE "public"."visit_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."visit_requests" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































