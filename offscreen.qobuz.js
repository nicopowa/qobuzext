class QobuzOffscreenProcessor extends BaseOffscreenProcessor {

	constructor() {

		super();

		this.flacProcessor = new FlacProcessor();
	
	}

	async process(dat, metadata, messageId, cover) {

		return await this.flacProcessor.process(
			dat,
			metadata,
			messageId,
			cover
		);
	
	}

}

new QobuzOffscreenProcessor();