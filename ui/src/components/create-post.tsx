import { Component } from 'inferno';
import { PostForm } from './post-form';

export class CreatePost extends Component<any, any> {

  constructor(props: any, context: any) {
    super(props, context);
    this.handlePostCreate = this.handlePostCreate.bind(this);
  }

  render() {
    return (
      <div class="container">
        <div class="row">
          <div class="col-12 col-lg-6 mb-4">
            <h4>Create a Post</h4>
            <PostForm onCreate={this.handlePostCreate}/>
          </div>
        </div>
      </div>
    )
  }

  handlePostCreate(id: number) {
    this.props.history.push(`/post/${id}`);
  }
}


