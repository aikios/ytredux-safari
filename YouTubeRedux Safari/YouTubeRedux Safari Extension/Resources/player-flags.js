// Removes delhi_modern experiment flags from YouTube's player config so the
// classic pre-2025 player icons load instead of the rounded "delhi" icons.
// Runs in the MAIN world at document_start so it can access window.yt directly.
(function tryRemoveDelhiFlags() {
	function stripFlags() {
		const yt = window.yt;
		if (!yt || !yt.config_ || !yt.config_.WEB_PLAYER_CONTEXT_CONFIGS) return false;
		const cfgs = yt.config_.WEB_PLAYER_CONTEXT_CONFIGS;
		let changed = false;
		for (const k in cfgs) {
			const c = cfgs[k];
			if (c && typeof c.serializedExperimentFlags === 'string') {
				const before = c.serializedExperimentFlags;
				const after = before
					.replace(/&?delhi_modern_web_player=true/g, '')
					.replace(/&?delhi_modern_web_player_icons=true/g, '')
					.replace(/&&+/g, '&')
					.replace(/^&+/, '')
					.replace(/&+$/, '');
				if (after !== before) {
					c.serializedExperimentFlags = after;
					changed = true;
				}
			}
		}
		return changed;
	}

	let attempts = 0;
	const maxAttempts = 40;
	function poll() {
		if (stripFlags()) return;
		if (++attempts < maxAttempts) setTimeout(poll, 250);
	}
	poll();

	// Re-apply if the player reinitialises (e.g. navigating to a video page)
	const mo = new MutationObserver(stripFlags);
	mo.observe(document.documentElement, { childList: true, subtree: true });
	setTimeout(() => mo.disconnect(), 30000);
})();
