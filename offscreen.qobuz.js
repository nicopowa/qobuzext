class QobuzOffscreenProcessor extends BaseOffscreenProcessor {

	constructor() {

		super();

		this.flacProcessor = new FlacProcessor();
	
	}

	async process(fetchUrl, metadata, messageId, cover) {

		return await this.flacProcessor.process(
			fetchUrl,
			metadata,
			messageId,
			cover
		);
	
	}

}

new QobuzOffscreenProcessor();