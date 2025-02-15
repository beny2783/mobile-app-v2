create policy "insert_categories"
on "public"."merchant_categories"
as permissive
for insert
to authenticated
with check ((user_id = auth.uid()));


create policy "read_categories"
on "public"."merchant_categories"
as permissive
for select
to authenticated
using (((user_id IS NULL) OR (user_id = auth.uid())));


create policy "system_categories"
on "public"."merchant_categories"
as permissive
for all
to service_role
using (true);



