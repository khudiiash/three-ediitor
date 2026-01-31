class Modal {
	static showPrompt(title, message, defaultValue = '', placeholder = '') {
		return new Promise((resolve) => {
			const overlay = document.createElement('div');
			overlay.className = 'modal-overlay';
			overlay.style.zIndex = '10000';

			const dialog = document.createElement('div');
			dialog.className = 'modal-dialog';

			const titleEl = document.createElement('h3');
			titleEl.className = 'modal-title';
			titleEl.textContent = title;
			dialog.appendChild(titleEl);

			if (message) {
				const messageEl = document.createElement('p');
				messageEl.className = 'modal-message';
				messageEl.textContent = message;
				dialog.appendChild(messageEl);
			}

			const input = document.createElement('input');
			input.type = 'text';
			input.className = 'modal-input';
			input.value = defaultValue;
			input.placeholder = placeholder;
			dialog.appendChild(input);

			const buttons = document.createElement('div');
			buttons.className = 'modal-buttons';

			const cancelBtn = document.createElement('button');
			cancelBtn.className = 'btn btn-secondary';
			cancelBtn.textContent = 'Cancel';
			cancelBtn.addEventListener('click', () => {
				document.body.removeChild(overlay);
				resolve(null);
			});

			const okBtn = document.createElement('button');
			okBtn.className = 'btn btn-primary';
			okBtn.textContent = 'OK';
			okBtn.addEventListener('click', () => {
				const value = input.value.trim();
				document.body.removeChild(overlay);
				resolve(value);
			});

			input.addEventListener('keydown', (e) => {
				if (e.key === 'Enter') {
					e.preventDefault();
					okBtn.click();
				} else if (e.key === 'Escape') {
					e.preventDefault();
					cancelBtn.click();
				}
			});

			buttons.appendChild(cancelBtn);
			buttons.appendChild(okBtn);
			dialog.appendChild(buttons);

			overlay.appendChild(dialog);
			document.body.appendChild(overlay);

			setTimeout(() => {
				input.focus();
				input.select();
			}, 0);

			overlay.addEventListener('click', (e) => {
				if (e.target === overlay) {
					cancelBtn.click();
				}
			});
		});
	}

	static showConfirm(title, message) {
		return new Promise((resolve) => {
			const overlay = document.createElement('div');
			overlay.className = 'modal-overlay';
			overlay.style.zIndex = '10000';

			const dialog = document.createElement('div');
			dialog.className = 'modal-dialog';

			const titleEl = document.createElement('h3');
			titleEl.className = 'modal-title';
			titleEl.textContent = title;
			dialog.appendChild(titleEl);

			if (message) {
				const messageEl = document.createElement('p');
				messageEl.className = 'modal-message';
				messageEl.textContent = message;
				dialog.appendChild(messageEl);
			}

			const buttons = document.createElement('div');
			buttons.className = 'modal-buttons';

			const cancelBtn = document.createElement('button');
			cancelBtn.className = 'btn btn-secondary';
			cancelBtn.textContent = 'Cancel';
			cancelBtn.addEventListener('click', () => {
				document.body.removeChild(overlay);
				resolve(false);
			});

			const okBtn = document.createElement('button');
			okBtn.className = 'btn btn-primary';
			okBtn.textContent = 'OK';
			okBtn.addEventListener('click', () => {
				document.body.removeChild(overlay);
				resolve(true);
			});

			buttons.appendChild(cancelBtn);
			buttons.appendChild(okBtn);
			dialog.appendChild(buttons);

			overlay.appendChild(dialog);
			document.body.appendChild(overlay);

			setTimeout(() => {
				okBtn.focus();
			}, 0);

			overlay.addEventListener('click', (e) => {
				if (e.target === overlay) {
					cancelBtn.click();
				}
			});

			const handleEscape = (e) => {
				if (e.key === 'Escape') {
					e.preventDefault();
					cancelBtn.click();
					document.removeEventListener('keydown', handleEscape);
				}
			};
			document.addEventListener('keydown', handleEscape);
		});
	}
}

export { Modal };
