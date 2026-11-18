create function public.rename_android_push_device(p_id uuid, p_name text)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null or length(trim(p_name)) > 60 then
    return false;
  end if;
  update public.android_push_devices
  set display_name = nullif(trim(p_name), '')
  where id = p_id and user_id = auth.uid();
  return found;
end;
$$;

revoke all on function public.rename_android_push_device(uuid,text) from public, anon;
grant execute on function public.rename_android_push_device(uuid,text) to authenticated;
