class QobuzPopup extends BasePopup {

	constructor() {

		super();

		this.showCovers = false;
	
	}

	updateQualityOptions() {

		let maxQuality = 27;

		if(this.media.maximum_sampling_rate <= 96)
			maxQuality = 7;

		if(this.media.maximum_bit_depth < 24)
			maxQuality = 6;

		document.querySelectorAll("input[name='quality']")
		.forEach(qualityRadio => {

			const hasQuality = (+qualityRadio.value) <= maxQuality;

			qualityRadio.disabled = !hasQuality;

		});
	
	}

	renderAlbum() {

		this.elements.mediainfo.innerHTML = `
				${this.showCovers ? `<div class="album-cover">
					<img src="${this.media.image.small}"/>
				</div>` : ""}
				<div class="album-info">
					<div class="album-title">${this.media.title}</div>
					<div class="album-artist">${this.media.artist.name}</div>
					<div class="album-year">${new Date(this.media.release_date_original)
	.getFullYear()}</div>
				</div>
				<button class="album-download download-btn" data-type="album" data-id="${this.media.id}"></button>
			`;

		const showList = this.media?.tracks_count > 0;
		
		this.elements.mediawrap.classList.toggle(
			"hide",
			!showList
		);
		
		if(showList) {

			this.elements.medialist.innerHTML = this.media.tracks.items
			.map(track =>
				this.createTrackItemHTML(track))
			.join("");
		
		}

		this.elements.media.querySelectorAll(".download-btn")
		.forEach(btn =>
			btn.addEventListener(
				"click",
				evt =>
					this.downloadMedia(evt.target)
			));

	}

	renderArtist() {

		const cover = this.media.images?.portrait;
		
		this.elements.mediainfo.innerHTML = `
				${this.showCovers ? `<div class="artist-cover">
					<img src="https://static.qobuz.com/images/artists/covers/medium/${cover.hash}.${cover.format}"/>
				</div>` : ""}
				<div class="artist-info">
					<div class="artist-name">${this.media.name.display}</div>
				</div>
			`;

		this.elements.mediawrap.classList.remove(
			"hide"
		);

		const releases = this.media.releases.flatMap(releaseType =>
			releaseType.items);

		this.elements.medialist.innerHTML = releases
		.map(release =>
			this.createReleaseItemHTML(release))
		.join("");

		this.elements.media.querySelectorAll(".download-btn")
		.forEach(btn => 
			btn.addEventListener(
				"click",
				evt =>
					this.downloadMedia(evt.target)
			)
		);

	}

	renderReleases() {

	}

	renderPlaylist() {

		this.elements.mediainfo.innerHTML = `
				${this.showCovers ? `<div class="playlist-cover">
					<img src="${this.media?.images150[0]}"/>
				</div>` : ""}
				<div class="playlist-info">
					<div class="playlist-name">${this.media.name}</div>
					<div class="playlist-owner">${this.media.owner.name}</div>
					<div class="playlist-tracks">${this.media.tracks_count} tracks</div>
				</div>
				<button class="playlist-download download-btn" data-type="playlist" data-id="${this.media.id}"></button>
			`;
		
		this.elements.mediawrap.classList.remove("hide");
		
		this.elements.medialist.innerHTML = this.media?.tracks.items
		.map((track, idx) =>
			this.createTrackItemHTML(
				track,
				true,
				idx
			))
		.join("");
			
		this.elements.media.querySelectorAll(".download-btn")
		.forEach(btn =>
			btn.addEventListener(
				"click",
				evt =>
					this.downloadMedia(evt.target)
			));

	}

	createTrackItemHTML(track, more = false, idx = 0) {

		return `
			<div class="mediaitem">
				${more ? this.showCovers ? `<div class="track-cover">
						<img src="${track.album.image.small}"/>
					</div>` : `<div class="track-number">${idx + 1}</div>`
		: `<div class="track-number">${track.track_number || "—"}</div>`}
				<div class="track-info">
					<div class="track-title">${track.title}${track.version ? ` (${track.version})` : ""}</div>
					<div class="track-artist">${(track.performer || track.composer).name}</div>
					${more ? `<div class="track-album">${track?.album.title}</div>` : ""}
				</div>
				<button class="track-download download-btn" data-type="track" data-id="${track.id}"></button>
			</div>
		`;
	
	}

	createReleaseItemHTML(release) {

		return `
			<div class="mediaitem">
				${this.showCovers ? `<div class="release-cover">
					<img src="${release.image.small}"/>
				</div>` : ""}
				<div class="release-info">
					<div class="release-title">${release.title}</div>
					<div class="release-year">${new Date(release.dates.original)
	.getFullYear()}</div>
				</div>
				<button class="release-download download-btn" data-type="release" data-id="${release.id}" disabled></button>
			</div>
		`;
	
	}

}

window.addEventListener(
	"load",
	() =>
		new QobuzPopup()
);