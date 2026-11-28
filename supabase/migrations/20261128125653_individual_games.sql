alter table public.couple_game_results
  drop constraint couple_game_results_kind_check,
  drop constraint couple_game_results_score_check,
  add constraint couple_game_results_kind_check check (kind in ('trivia','memory','puzzle','guess','roulette','simon','sudoku','tile2048','darts')),
  add constraint couple_game_results_score_check check (score >= 0 and score <= case kind when 'simon' then 20 when 'darts' then 500 when 'tile2048' then 1000000 else 1000 end);
