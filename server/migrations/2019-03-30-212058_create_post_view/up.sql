-- Rank = ScaleFactor * sign(Score) * log(1 + abs(Score)) / (Time + 2)^Gravity
create or replace function hot_rank(
  score numeric,
  published timestamp without time zone)
returns integer as $$
begin
  -- hours_diff:=EXTRACT(EPOCH FROM (timezone('utc',now()) - published))/3600
  return floor(10000*sign(score)*log(1 + abs(score)) / power(((EXTRACT(EPOCH FROM (timezone('utc',now()) - published))/3600) + 2), 1.8))::integer;
end; $$
LANGUAGE plpgsql;

create view post_view as
with all_post as
(
  select        
  p.*,
  (select name from user_ where p.creator_id = user_.id) as creator_name,
  (select name from community where p.community_id = community.id) as community_name,
  (select count(*) from comment where comment.post_id = p.id) as number_of_comments,
  coalesce(sum(pl.score), 0) as score,
  count (case when pl.score = 1 then 1 else null end) as upvotes,
  count (case when pl.score = -1 then 1 else null end) as downvotes,
  hot_rank(coalesce(sum(pl.score) , 0), p.published) as hot_rank
  from post p
  left join post_like pl on p.id = pl.post_id
  group by p.id
)

select
ap.*,
u.id as user_id,
coalesce(pl.score, 0) as my_vote,
(select cf.id::bool from community_follower cf where u.id = cf.user_id and cf.community_id = ap.community_id) as subscribed,
u.admin or (select cm.id::bool from community_moderator cm where u.id = cm.user_id and cm.community_id = ap.community_id) as am_mod
from user_ u
cross join all_post ap
left join post_like pl on u.id = pl.user_id and ap.id = pl.post_id

union all

select 
ap.*,
null as user_id,
null as my_vote,
null as subscribed,
null as am_mod
from all_post ap
;
