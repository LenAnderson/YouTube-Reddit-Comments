${include: Tab.js}


class Gui {
	constructor() {
		this.posts = [];
		this.dom = {
			root: null,
			css: null,
			tabBar: null,
			tabContainer: null,
			tabs: {}
		};
	}

	remove() {
		log('[Gui]', 'remove');
		try {
			this.dom.root.parentElement.insertBefore(this.dom.tabContainer.children[0].children[0], this.dom.root);
		} catch (ex) {
			// do nothing
		}
		if (this.dom.root) {
			this.dom.root.remove();
		}
		log('[Gui]', '/remove');
	}

	async create(posts) {
		log('[Gui]', 'create', posts);
		const yt = await this.findYtComments();
		const container = document.createElement('div'); {
			this.dom.root = container;
			container.classList.add('ytrc--root');
			const css = document.createElement('style'); {
				this.dom.css = css;
				css.innerHTML = '${include-min-esc: css/style.css}';
				container.appendChild(css);
			}
			const tabBar = document.createElement('div'); {
				this.dom.tabBar = tabBar;
				tabBar.classList.add('ytrc--tabBar');
				container.appendChild(tabBar);
			}
			const tabContainer = document.createElement('div'); {
				this.dom.tabContainer = tabContainer;
				tabContainer.classList.add('ytrc--tabContainer');
				container.appendChild(tabContainer);
			}
			yt.parentElement.insertBefore(container, yt);
		}

		this.addTab('YT Comments', yt);
		this.switchTab(`ytrc--${yt.id}`);

		posts.forEach(post=>{
			log('[Gui]', 'creating tab for: ', post);
			const tab = new Tab(post);
			this.addTab(tab.title, tab.dom.root);
		});

		log('[Gui]', '/create');
	}




	addTab(title, content) {
		log('[Gui]', 'addTab', title, content);
		const id = `ytrc--${content.id}`;
		const wrapper = document.createElement('div'); {
			this.dom.tabs[id] = wrapper;
			wrapper.id = id;
			wrapper.classList.add('ytrc--tabContentWrapper');
			wrapper.appendChild(content);
			this.dom.tabContainer.appendChild(wrapper);
		}
		const header = document.createElement('div'); {
			header.classList.add('ytrc--tabHeader');
			header.textContent = title;
			header.title = title;
			header.addEventListener('click', evt=>{
				evt.preventDefault();
				evt.stopPropagation();
				this.switchTab(id);
			});
			this.dom.tabBar.appendChild(header);
		}
	}

	switchTab(newKey) {
		log('[Gui]', 'switchTab', newKey);
		Object.keys(this.dom.tabs).forEach((key)=>{
			if (key == newKey) {
				this.dom.tabs[key].classList.add('ytrc--active');
			} else {
				this.dom.tabs[key].classList.remove('ytrc--active');
			}
		});
	}




	async findYtComments() {
		log('[Gui]', 'findYtComments');
		let yt;
		while (!yt) {
			await wait(0.1);
			log('[Gui]', 'trying to find YT comments');
			yt = $('#comments');
		}
		log('[Gui]', 'found YT comments');
		return yt;
	}
}