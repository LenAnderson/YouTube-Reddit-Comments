class CommentMore {
	constructor(comment) {
		this.comment = comment;
		
		this.dom = {
			root: null
		};

		const root = document.createElement('div'); {
			this.dom.root = root;
			root.classList.add('ytrc--comment');
			const more = document.createElement('a'); {
				more.classList.add('ytrc--comment--more');
				more.textContent = `load more comments (${comment.children.length})`;
				more.addEventListener('click', (evt)=>{
					evt.preventDefault();
					evt.stopPropagation();
					alert('loading more comments is not implemented');
				});
				root.appendChild(more);
			}
		}
	}
}