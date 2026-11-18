alter table public.daily_answers
  add column answer_history jsonb not null default '[]'::jsonb;

create function calendar_internal.record_daily_answer_revision()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null and new.question_date <> (now() at time zone 'America/Bogota')::date then
      raise exception 'Solo puedes responder la pregunta del día' using errcode = '23514';
    end if;
    new.answer_history := '[]'::jsonb;
    return new;
  end if;
  if (new.id, new.couple_id, new.user_id, new.question_date) is distinct from
     (old.id, old.couple_id, old.user_id, old.question_date) then
    raise exception 'No se puede cambiar la pregunta de una respuesta' using errcode = '23514';
  end if;
  new.question_text := old.question_text;
  new.answer_history := old.answer_history;
  new.updated_at := old.updated_at;
  if new.answer is distinct from old.answer then
    new.updated_at := clock_timestamp();
    new.answer_history := old.answer_history || jsonb_build_array(jsonb_build_object(
      'before', old.answer,
      'after', new.answer,
      'edited_at', new.updated_at
    ));
  end if;
  return new;
end;
$$;

create trigger daily_answers_revision_history
before insert or update on public.daily_answers
for each row execute function calendar_internal.record_daily_answer_revision();
