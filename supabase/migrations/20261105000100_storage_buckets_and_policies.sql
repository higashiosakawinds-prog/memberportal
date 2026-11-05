-- Storage buckets and storage.objects policies (read from production, buckets are empty)
insert into storage.buckets (id, name, public) values ('feedback', 'feedback', false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('instruments', 'instruments', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('scores', 'scores', false) on conflict (id) do nothing;
create policy "feedback_obj_delete" on storage.objects as permissive for delete to authenticated using (((bucket_id = 'feedback'::text) AND (((storage.foldername(name))[1] = (auth.uid())::text) OR is_feedback_admin())));
create policy "feedback_obj_insert" on storage.objects as permissive for insert to authenticated with check (((bucket_id = 'feedback'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
create policy "feedback_obj_select" on storage.objects as permissive for select to authenticated using (((bucket_id = 'feedback'::text) AND (((storage.foldername(name))[1] = (auth.uid())::text) OR is_feedback_admin())));
create policy "instruments_storage_delete" on storage.objects as permissive for delete to authenticated using (((bucket_id = 'instruments'::text) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.roles && ARRAY['gm'::text, 'leader'::text, 'subleader'::text, 'equipment'::text]))))));
create policy "instruments_storage_insert" on storage.objects as permissive for insert to authenticated with check (((bucket_id = 'instruments'::text) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.roles && ARRAY['gm'::text, 'leader'::text, 'subleader'::text, 'equipment'::text]))))));
create policy "instruments_storage_select" on storage.objects as permissive for select to authenticated using ((bucket_id = 'instruments'::text));
create policy "instruments_storage_update" on storage.objects as permissive for update to authenticated using (((bucket_id = 'instruments'::text) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.roles && ARRAY['gm'::text, 'leader'::text, 'subleader'::text, 'equipment'::text]))))));
create policy "scores_storage_delete" on storage.objects as permissive for delete to authenticated using ((bucket_id = 'scores'::text));
create policy "scores_storage_insert" on storage.objects as permissive for insert to authenticated with check ((bucket_id = 'scores'::text));
create policy "scores_storage_select" on storage.objects as permissive for select to authenticated using ((bucket_id = 'scores'::text));
create policy "scores_storage_update" on storage.objects as permissive for update to authenticated using ((bucket_id = 'scores'::text));
