# Notes

## Tout doux

- [ ] bundle parsing randomize dummy track id
- [ ] download directory check various artists in album.subtitle or album.composers
- [x] get appId using onBeforeSendHeaders
- [ ] disable download if album.hires_streamable || track.hires_streamable
- [ ] block requests clarity.ms/collect

## xpath || mutations

.PageHeader__content
	cover : .PageHeader__cover
		.Cover__item
			background-image
	infos : .PageHeader__infos
		title: .PageHeader__title
		artist: .PageHeader__artist

.ReleasePage__main
	quality : .ToolBar .QualityLabel
	tracklist : .ReleasePage__list
		track : .ListItem
			title: .ListItem__title
			artist: .ListItem__artist

.ReleasePage__list div.show.popover[role="tooltip"]