window.Overlay = (function() {

	var view = null;
	var listeners = {
		beforeclose: []
	};

	var Overlay = Object.freeze({
		init: function(options) {
			if (view != null) throw new Error("Init already called");
			view = {
				$overlay: options.view.$overlay,
				popup: options.view.popup
			};

			view.$overlay.addEventListener("tap", function(e) {
				Overlay.close();
				e.stopPropagation();
				e.preventDefault();
			});
			view.popup.$root.addEventListener("tap", function(e) {
				e.stopPropagation();
				e.preventDefault();
			});
			view.popup.$root.querySelector(".button.close-symbol").addEventListener("tap", function(e) {
				Overlay.close();
				e.stopPropagation();
				e.preventDefault();
			});
		},
		close: function() {
			var abort = false;
			for (var listener of listeners.beforeclose) {
				if (listener() === false) {
					abort = true;
				}
			}
			if (abort) return;

			while (view.popup.$body.lastChild) {
				view.popup.$body.lastChild.remove();
			}
			view.$overlay.classList.remove("active");
		},
		open: function(documentFragment) {
			if (documentFragment) {
				view.popup.$body.append(documentFragment);
			}
			view.$overlay.classList.add("active");
		},
		isOpen: function() {
			return view.$overlay.classList.contains("active");
		},

		on: function(event, callback) {
			if (!listeners[event]) throw new Error("Unknown event " + event);
			if (typeof callback !== "function") throw new Error("Callback is not a function");
			Overlay.off(event, callback);
			listeners[event].push(callback);
		},
		off: function(event, callback) {
			if (!listeners[event]) throw new Error("Unknown event " + event);
			if (typeof callback !== "function") throw new Error("Callback is not a function");
			listeners[event] = listeners[event].filter(c => c !== callback);
		}
	});
	return Overlay;
})();
