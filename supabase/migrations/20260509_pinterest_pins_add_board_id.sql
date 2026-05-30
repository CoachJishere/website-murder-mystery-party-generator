-- Map Pinterest board names → numeric board IDs for Make.com posting.
-- Board IDs were captured via Pinterest API list-boards on 2026-05-09.
-- Update this CASE if board names ever change or new boards are added.

alter table public.pinterest_pins add column pinterest_board_id text;

update public.pinterest_pins set pinterest_board_id = case pinterest_board
  when '1920s Party Theme'           then '1025483846341905045'
  when 'Bachelorette Party Games'    then '1025483846341905040'
  when 'Date Night Ideas'            then '1025483846341905044'
  when 'Dinner Party Entertainment'  then '1025483846341905042'
  when 'Halloween Party Ideas'       then '1025483846341905043'
  when 'Murder Mystery Party Ideas'  then '1025483846341905035'
  when 'Party Planning Tips'         then '1025483846341905046'
  when 'Team Building Activities'    then '1025483846341905041'
end;

create index pinterest_pins_pinterest_board_id_idx on public.pinterest_pins (pinterest_board_id);
