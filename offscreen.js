import {OffscreenBase} from "./common/off.js";
import {FlacProcessor} from "./proc.flac.js";

class QobuzOffscreen extends OffscreenBase {

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

export {
	QobuzOffscreen
};
