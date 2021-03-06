import { Component, linkEvent } from 'inferno';
import { Link } from 'inferno-router';
import { Subscription } from "rxjs";
import { retryWhen, delay, take } from 'rxjs/operators';
import { UserOperation, Post, Comment, CommunityUser, GetUserDetailsForm, SortType, UserDetailsResponse, UserView } from '../interfaces';
import { WebSocketService } from '../services';
import { msgOp, fetchLimit } from '../utils';
import { PostListing } from './post-listing';
import { CommentNodes } from './comment-nodes';
import { MomentTime } from './moment-time';

enum View {
  Overview, Comments, Posts, Saved
}

interface UserState {
  user: UserView;
  user_id: number;
  follows: Array<CommunityUser>;
  moderates: Array<CommunityUser>;
  comments: Array<Comment>;
  posts: Array<Post>;
  saved?: Array<Post>;
  view: View;
  sort: SortType;
  page: number;
}

export class User extends Component<any, UserState> {

  private subscription: Subscription;
  private emptyState: UserState = {
    user: {
      id: null,
      name: null,
      fedi_name: null,
      published: null,
      number_of_posts: null,
      post_score: null,
      number_of_comments: null,
      comment_score: null,
    },
    user_id: null,
    follows: [],
    moderates: [],
    comments: [],
    posts: [],
    view: View.Overview,
    sort: SortType.New,
    page: 1,
  }

  constructor(props: any, context: any) {
    super(props, context);

    this.state = this.emptyState;

    this.state.user_id = Number(this.props.match.params.id);

    this.subscription = WebSocketService.Instance.subject
    .pipe(retryWhen(errors => errors.pipe(delay(3000), take(10))))
    .subscribe(
      (msg) => this.parseMessage(msg),
        (err) => console.error(err),
        () => console.log('complete')
    );

    this.refetch();
  }

  componentWillUnmount() {
    this.subscription.unsubscribe();
  }

  render() {
    return (
      <div class="container">
        <div class="row">
          <div class="col-12 col-md-9">
            <h4>/u/{this.state.user.name}</h4>
            {this.selects()}
            {this.state.view == View.Overview &&
              this.overview()
            }
            {this.state.view == View.Comments &&
              this.comments()
            }
            {this.state.view == View.Posts &&
              this.posts()
            }
            {this.paginator()}
          </div>
          <div class="col-12 col-md-3">
            {this.userInfo()}
            {this.moderates()}
            {this.follows()}
          </div>
        </div>
      </div>
    )
  }

  selects() {
    return (
      <div className="mb-2">
        <select value={this.state.view} onChange={linkEvent(this, this.handleViewChange)} class="custom-select w-auto">
          <option disabled>View</option>
          <option value={View.Overview}>Overview</option>
          <option value={View.Comments}>Comments</option>
          <option value={View.Posts}>Posts</option>
          {/* <option value={View.Saved}>Saved</option> */}
        </select>
        <select value={this.state.sort} onChange={linkEvent(this, this.handleSortChange)} class="custom-select w-auto ml-2">
          <option disabled>Sort Type</option>
          <option value={SortType.New}>New</option>
          <option value={SortType.TopDay}>Top Day</option>
          <option value={SortType.TopWeek}>Week</option>
          <option value={SortType.TopMonth}>Month</option>
          <option value={SortType.TopYear}>Year</option>
          <option value={SortType.TopAll}>All</option>
        </select>
      </div>
    )

  }

  overview() {
    let combined: Array<{type_: string, data: Comment | Post}> = [];
    let comments = this.state.comments.map(e => {return {type_: "comments", data: e}});
    let posts = this.state.posts.map(e => {return {type_: "posts", data: e}});

    combined.push(...comments);
    combined.push(...posts);

    // Sort it
    if (this.state.sort == SortType.New) {
      combined.sort((a, b) => b.data.published.localeCompare(a.data.published));
    } else {
      combined.sort((a, b) => b.data.score - a.data.score);
    }

    return (
      <div>
        {combined.map(i =>
          <div>
            {i.type_ == "posts"
              ? <PostListing post={i.data as Post} showCommunity viewOnly />
              : <CommentNodes nodes={[{comment: i.data as Comment}]} noIndent viewOnly />
            }
          </div>
                     )
        }
      </div>
    )
  }

  comments() {
    return (
      <div>
        {this.state.comments.map(comment => 
          <CommentNodes nodes={[{comment: comment}]} noIndent viewOnly />
        )}
      </div>
    );
  }

  posts() {
    return (
      <div>
        {this.state.posts.map(post => 
          <PostListing post={post} showCommunity viewOnly />
        )}
      </div>
    );
  }

  userInfo() {
    let user = this.state.user;
    return (
      <div>
        <h4>{user.name}</h4>
        <div>Joined <MomentTime data={user} /></div>
        <table class="table table-bordered table-sm mt-2">
          <tr>
            <td>{user.post_score} points</td>
            <td>{user.number_of_posts} posts</td>
          </tr>
          <tr>
            <td>{user.comment_score} points</td>
            <td>{user.number_of_comments} comments</td>
          </tr>
        </table>
        <hr />
      </div>
    )
  }

  moderates() {
    return (
      <div>
        {this.state.moderates.length > 0 &&
          <div>
            <h4>Moderates</h4>
            <ul class="list-unstyled"> 
              {this.state.moderates.map(community =>
                <li><Link to={`/community/${community.community_id}`}>{community.community_name}</Link></li>
              )}
            </ul>
          </div>
        }
      </div>
    )
  }

  follows() {
    return (
      <div>
        {this.state.follows.length > 0 &&
          <div>
            <hr />
            <h4>Subscribed</h4>
            <ul class="list-unstyled"> 
              {this.state.follows.map(community =>
                <li><Link to={`/community/${community.community_id}`}>{community.community_name}</Link></li>
              )}
            </ul>
          </div>
        }
      </div>
    )
  }

  paginator() {
    return (
      <div class="mt-2">
        {this.state.page > 1 && 
          <button class="btn btn-sm btn-secondary mr-1" onClick={linkEvent(this, this.prevPage)}>Prev</button>
        }
        <button class="btn btn-sm btn-secondary" onClick={linkEvent(this, this.nextPage)}>Next</button>
      </div>
    );
  }

  nextPage(i: User) { 
    i.state.page++;
    i.setState(i.state);
    i.refetch();
  }

  prevPage(i: User) { 
    i.state.page--;
    i.setState(i.state);
    i.refetch();
  }

  refetch() {
    let form: GetUserDetailsForm = {
      user_id: this.state.user_id,
      sort: SortType[this.state.sort],
      page: this.state.page,
      limit: fetchLimit,
    };
    WebSocketService.Instance.getUserDetails(form);
  }

  handleSortChange(i: User, event: any) {
    i.state.sort = Number(event.target.value);
    i.state.page = 1;
    i.setState(i.state);
    i.refetch();
  }

  handleViewChange(i: User, event: any) {
    i.state.view = Number(event.target.value);
    i.state.page = 1;
    i.setState(i.state);
    i.refetch();
  }

  parseMessage(msg: any) {
    console.log(msg);
    let op: UserOperation = msgOp(msg);
    if (msg.error) {
      alert(msg.error);
      return;
    } else if (op == UserOperation.GetUserDetails) {
      let res: UserDetailsResponse = msg;
      this.state.user = res.user;
      this.state.comments = res.comments;
      this.state.follows = res.follows;
      this.state.moderates = res.moderates;
      this.state.posts = res.posts;
      this.setState(this.state);
    } 
  }
}

