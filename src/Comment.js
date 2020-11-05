class Comment {
	constructor(comment) {
		this.comment = comment;

		this.dom = {
			root: null,
			head: null,
			body: null
		}
		const root = document.createElement('div'); {
			this.dom.root = root;
			root.classList.add('ytrc--comment');
			const head = document.createElement('div'); {
				this.dom.head = head;
				head.classList.add('ytrc--comment--head');
				const toggle = document.createElement('a'); {
					toggle.textContent = '[-]';
					toggle.classList.add('ytrc--comment--toggle');
					toggle.addEventListener('click', (evt)=>{
						this.dom.body.classList.toggle('ytrc--comment--collapsed');
					});
					head.appendChild(toggle);
				}
				const user = document.createElement('a'); {
					user.classList.add('ytrc--comment--user');
					user.textContent = this.comment.author;
					user.href = `https://www.reddit.com/u/${comment.author}`;
					head.appendChild(user);
				}
				const info = document.createElement('span'); {
					info.classList.add('ytrc--comment--info');
					info.textContent = `${comment.score} points ${formatTimespan(new Date().getTime() - comment.created_utc*1000)} ago`;
					head.appendChild(info);
				}
				root.appendChild(head);
			}
			const body = document.createElement('div'); {
				this.dom.body = body;
				body.classList.add('ytrc--comment--body');
				const commentBody = document.createElement('div'); {
					commentBody.classList.add('ytrc--comment--commentBody');
					commentBody.innerHTML = decodeEntities(comment.body_html);
					Array.from(commentBody.querySelectorAll('a')).forEach(it=>{
						it.classList.add('yt-simple-endpoint');
						it.classList.add('yt-formatted-string');
						if (it.getAttribute('href')[0] == '/') {
							it.href = `https://www.reddit.com${it.getAttribute('href')}`;
						}
					});
					body.appendChild(commentBody);
				}
				if (comment.replies) {
					comment.replies.data.children.forEach(reply=>{
						if (reply.kind == 'more') {
							const com = new CommentMore(reply.data);
							body.appendChild(com.dom.root);
						} else {
							const com = new Comment(reply.data);
							body.appendChild(com.dom.root);
						}
					});
				}
				root.appendChild(body);
			}
		}
	}
}