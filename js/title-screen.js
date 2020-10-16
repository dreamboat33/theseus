window.TitleScreen = (function() {

	function TitleScreen(options) {
		this.view = {
			buttons: options.view.buttons,
			checkboxes: options.view.checkboxes
		};
		this.preference = this.loadPreference();
	}

	TitleScreen.prototype.registerComponents = function(components) {
		this.components = components;
		this.components.game.setAnimation(this.preference.animation !== false);
		this.registerEventListeners();
	};

	TitleScreen.prototype.loadPreference = function() {
		var preference = {};
		try {
			preference = JSON.parse(localStorage.getItem("theseusPreference") || "{}") || {};
		} catch (e) {
		}

		if (preference.darkTheme !== false) {
			this.view.checkboxes.$darkTheme.querySelector(".checkbox").classList.add("active");
			document.body.classList.add("dark");
		}
		if (preference.animation !== false) {
			this.view.checkboxes.$animation.querySelector(".checkbox").classList.add("active");
		}

		return preference;
	};

	TitleScreen.prototype.savePreference = function() {
		try {
			localStorage.setItem("theseusPreference", JSON.stringify(this.preference));
		} catch (e) {
		}
	};

	TitleScreen.prototype.registerEventListeners = function() {

		var titleScreen = this;
		var game = this.components.game;
		var editor = this.components.editor;

		this.view.buttons.$play.addEventListener("tap", function() {
			Sections.push("$levelSelect");
		});

		this.view.buttons.$editor.addEventListener("tap", function() {
			Sections.push("$game");
			editor.start();
		});

		this.view.checkboxes.$darkTheme.addEventListener("tap", function() {
			this.querySelector(".checkbox").classList.toggle("active");
			titleScreen.preference.darkTheme = !titleScreen.preference.darkTheme;
			document.body.classList.toggle("dark");
			titleScreen.savePreference();
		});

		this.view.checkboxes.$animation.addEventListener("tap", function() {
			this.querySelector(".checkbox").classList.toggle("active");
			titleScreen.preference.animation = titleScreen.preference.animation === false;
			game.setAnimation(titleScreen.preference.animation);
			titleScreen.savePreference();
		});
	};

	return TitleScreen;
})();
