class QobuzPopup extends BasePopup {

	updateQualityOptions() {

		let maxQuality = 27;

		if(this.currentMedia.maximum_sampling_rate <= 96)
			maxQuality = 7;

		if(this.currentMedia.maximum_bit_depth < 24)
			maxQuality = 6;

		document.querySelectorAll("input[name='quality']")
		.forEach(qualityRadio => {

			const hasQuality = (+qualityRadio.value) <= maxQuality;

			qualityRadio.parentElement.style.opacity = hasQuality ? 1 : 0.3;

			qualityRadio.disabled = !hasQuality;

		});
	
	}

	renderAlbum() {

		this.elements.mediainfo.innerHTML = `
				<div class="album-cover">
					<img src="${this.currentMedia.image.small}"/>
				</div>
				<div class="album-info">
					<div class="album-title">${this.currentMedia.title}</div>
					<div class="album-artist">${this.currentMedia.artist.name}</div>
					<div class="album-year">${new Date(this.currentMedia.release_date_original)
	.getFullYear()}</div>
				</div>
				<button class="btn btn-secondary album-download-btn" data-album-id="${this.currentMedia.id}"></button>
			`;

		this.elements.mediainfo.querySelector(".album-download-btn")
		.addEventListener(
			"click",
			() =>
				this.downloadAlbum()
		);

		const showList = this.currentMedia?.tracks_count > 0;
		
		this.elements.mediawrap.classList.toggle(
			"hidden",
			!showList
		);
		
		if(showList) {

			this.elements.medialist.innerHTML = this.currentMedia.tracks.items
			.map(track =>
				this.createTrackItemHTML(track))
			.join("");
			
			this.elements.medialist.querySelectorAll(".track-download-btn")
			.forEach(btn => {

				btn.addEventListener(
					"click",
					evt =>
						this.downloadTrack(evt.target.dataset.trackId)
				);
			
			});
		
		}

	}

	renderArtist() {

		const cover = this.currentMedia.images?.portrait;
		
		this.elements.mediainfo.innerHTML = `
				<div class="artist-cover">
					<img src="https://static.qobuz.com/images/artists/covers/medium/${cover.hash}.${cover.format}"/>
				</div>
				<div class="artist-info">
					<div class="artist-name">${this.currentMedia.name.display}</div>
				</div>
			`;

		this.elements.mediawrap.classList.remove(
			"hidden"
		);

		const releases = this.currentMedia.releases.flatMap(releaseType =>
			releaseType.items);

		console.log(releases);

		this.elements.medialist.innerHTML = releases
		.map(release =>
			this.createReleaseItemHTML(release))
		.join("");

	}

	renderReleases() {

	}

	createTrackItemHTML(track) {

		return `
			<div class="mediaitem">
				<div class="track-number">${track.track_number || "—"}</div>
				<div class="track-info">
					<div class="track-title">${track.title}${track.version ? ` (${track.version})` : ""}</div>
					<div class="track-artist">${track.performer?.name}</div>
				</div>
				<button class="btn btn-secondary track-download-btn" data-track-id="${track.id}"></button>
			</div>
		`;
	
	}

	createReleaseItemHTML(release) {

		return `
			<div class="mediaitem">
				<div class="release-cover">
					<img src="${release.image.small}"/>
				</div>
				<div class="release-info">
					<div class="release-title">${release.title}</div>
					<div class="release-year">${new Date(release.dates.original)
	.getFullYear()}</div>
				</div>
				<button class="btn btn-secondary release-download-btn" data-release-id="${release.id}" disabled></button>
			</div>
		`;
	
	}

}

window.addEventListener(
	"load",
	() =>
		new QobuzPopup()
);