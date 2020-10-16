window.Sections = (function() {

	const ACTIVE_CLASS = "active";

	var view = {};
	var stack = [];

	return Object.freeze({
		init: function(options) {
			for (var key in options.view) {
				view[key] = options.view[key];
			}
			stack.push(options.activeViewKey);
			view[options.activeViewKey].classList.add(ACTIVE_CLASS);
		},
		push: function(name) {
			if (stack.length > 0) {
				view[stack[stack.length - 1]].classList.remove(ACTIVE_CLASS);
			}
			view[name].classList.add(ACTIVE_CLASS);
			stack.push(name);
		},
		pop: function() {
			if (stack.length == 0) return;
			view[stack[stack.length - 1]].classList.remove(ACTIVE_CLASS);
			stack.pop();
			if (stack.length == 0) return;
			view[stack[stack.length - 1]].classList.add(ACTIVE_CLASS);
		},
		get: function(name) {
			return view[name];
		}
	});
})();
