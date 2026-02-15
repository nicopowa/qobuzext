import {BasePopup} from "./common/pops.js";
import {Type} from "./common/vars.js";

class QobuzPopup extends BasePopup {

	constructor() {

		super();
	
	}

	updateQualityOptions() {

		if(this.media.extype !== Type.ALBUM) {

			return;
		
		}

		let maxQuality = 27;

		if(this.media.maximum_sampling_rate <= 96)
			maxQuality = 7;

		if(this.media.maximum_bit_depth < 24)
			maxQuality = 6;

		document.querySelectorAll("input[name='quality']")
		.forEach(qualityRadio =>
			(qualityRadio.disabled = !((+qualityRadio.value) <= maxQuality)));
	
	}

	renderAlbum() {

		this.elements.mediainfo.innerHTML = `
				<div class="album-info">
					<div class="album-title">${this.media.title}${this.media.version ? ` (${this.media.version})` : ""}</div>
					<div class="album-artist">${this.media.artist.name}</div>
					<div class="album-data">
						<div class="album-year">${new Date(this.media.release_date_original)
	.getFullYear()}</div>
						<div class="album-label" data-id="${this.media.label?.id}">${this.media.label?.name}</div>
					</div>
				</div>
				<button class="album-download download-btn" data-type="album" data-id="${this.media.id}"></button>
			`;

		const showList = this.media?.tracks_count > 0;
		
		this.elements.mediawrap.classList.toggle(
			"hide",
			!showList
		);
		
		if(showList) {

			this.elements.medialist.innerHTML = this.media.tracks
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

		const tracks = this.media.releases.reduce(
			(sum, rel) =>
				sum + rel.tracks_count,
			0
		);
		
		this.elements.mediainfo.innerHTML = `
				<div class="artist-info">
					<div class="artist-name">${this.media.name.display}</div>
					<div class="count-data">
						<div class="count-items">${this.media.releases.length} releases (${tracks} tracks)<br/>${this.media.hasMore ? "please scroll down" : "parsing complete"}</div>
					</div>
				</div>
				<button class="artist-download download-btn" data-type="artist" data-id="${this.media.id}"></button>
			`;

		this.elements.mediawrap.classList.remove(
			"hide"
		);

		this.elements.medialist.innerHTML = this.media.releases
		.map(release =>
			this.createReleaseItemHTML(release))
		.join("");

		this.elements.media.querySelectorAll(".download-btn")
		.forEach(btn =>
			btn.addEventListener(
				"click",
				evt =>
					this.downloadMedia(evt.target)
			));

	}

	renderReleases() {

	}

	renderLabel() {

		const count = this.media.albums.items.length;
		const total = this.media.albums.total;
		const tracks = this.media.albums.items.reduce(
			(sum, rel) =>
				sum + rel.tracks_count,
			0
		);
		
		this.elements.mediainfo.innerHTML = `
				<div class="label-info">
					<div class="label-name">${this.media.name}</div>
					<div class="count-data">
						<div class="count-items">${count} / ${total} releases (${tracks} tracks)<br/>${count < total ? "please scroll down" : "parsing complete"}</div>
					</div>
				</div>
			`;

		this.elements.mediawrap.classList.remove(
			"hide"
		);

		const releases = this.media.albums.items;

		this.elements.medialist.innerHTML = releases
		.map(release =>
			this.createAlbumItemHTML(
				release,
				true
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

	renderPlaylist() {

		const count = this.media.tracks.length;
		const total = this.media.tracks_count;

		this.elements.mediainfo.innerHTML = `
				<div class="playlist-info">
					<div class="playlist-name">${this.media.name}</div>
					<div class="count-data">
						<div class="count-items">${count} / ${total} tracks<br/>${count < total ? "please scroll down" : "parsing complete"}</div>
					</div>
				</div>
				<button class="playlist-download download-btn" data-type="playlist" data-id="${this.media.id}"></button>
			`;
		
		this.elements.mediawrap.classList.remove("hide");
		
		this.elements.medialist.innerHTML = this.media?.tracks
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

	createAlbumItemHTML(release, showArtist = false) {

		return `
			<div class="mediaitem">
				<div class="release-info">
					<div class="release-title">${showArtist ? release.artist.name + " - " : ""}${release.title}${release.version ? ` (${release.version})` : ""}</div>
					<div class="release-data">
						<div class="release-year">${new Date(release.release_date_original)
	.getFullYear()}</div>
						<div class="release-label" data-id="${release.label?.id}">${release.label?.name}</div>
					</div>
					<div class="release-about">album - ${release.tracks_count} track${release.tracks_count !== 1 ? "s" : ""}</div>
				</div>
				<button class="release-download download-btn" data-type="release" data-id="${release.id}" ${release.streamable ? "" : " disabled"}></button>
			</div>
		`;
	
	}

	createTrackItemHTML(track, more = false, idx = 0) {

		return `
			<div class="mediaitem">
				<div class="track-number">${more ? idx + 1 : track.track_number || "—"}</div>
				<div class="track-info">
					<div class="track-title">${track.title}${track.version ? ` (${track.version})` : ""}</div>
					<div class="track-artist">${(track.performer || track.composer)?.name}</div>
					${more ? `<div class="track-album">${track?.album.title}</div>` : ""}
				</div>
				<button class="track-download download-btn" data-type="track" data-id="${track.id}"${track.streamable ? "" : " disabled"}></button>
			</div>
		`;
	
	}

	createReleaseItemHTML(release) {

		return `
			<div class="mediaitem">
				<div class="release-info">
					<div class="release-title">${release.title}${release.version ? ` (${release.version})` : ""}</div>
					<div class="release-data">
						<div class="release-year">${new Date(release.dates.original)
	.getFullYear()}</div>
						<div class="release-label" data-id="${release.label?.id}">${release.label?.name}</div>
					</div>
					<div class="release-about">${release.release_type.replace(
		"mini",
		""
	)} - ${release.tracks_count} track${release.tracks_count !== 1 ? "s" : ""} - ${release.audio_info.maximum_bit_depth}/${Math.round(release.audio_info.maximum_sampling_rate)}</div>
				</div>
				<button class="release-download download-btn" data-type="release" data-id="${release.id}" ${release.rights.streamable ? "" : " disabled"}></button>
			</div>
		`;
	
	}

}

export {
	QobuzPopup
};
