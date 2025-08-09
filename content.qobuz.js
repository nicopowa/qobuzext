(() => {

	const browser = chrome;

	window.addEventListener(
		"message",
		evt => {

			if(evt.source === window && evt.data.type === "fetch")
				browser.runtime.sendMessage(evt.data);

		}
	);
	
	// inject dots menu download button
	/*window.addEventListener(
		"load",
		() => {

			const observer = new MutationObserver(records => {

				for(const record of records) {

					let found = false;

					for(const addedNode of record.addedNodes) {

						if(addedNode.classList?.contains("popover")) {

							found = true;

							// console.log(addedNode);

							const cpyli = addedNode.querySelector("ul li:last-child");

							const sepli = document.createElement("li");

							sepli.setAttribute(
								"role",
								"separator"
							);

							sepli.className = "divider";

							cpyli.after(sepli);

							const newli = cpyli.cloneNode(true);

							Array.from(newli.querySelector("a").childNodes)
							.at(-1).textContent = "Download";

							const newicon = newli.querySelector("span");

							newicon.className = "pct";

							Object.assign(
								newicon.style,
								{
									"display": "inline-block",
									"height": "1.4em",
									"width": "1em",
									"-webkit-mask-image": "url(\"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIxLjI1Ij48cGF0aCBkPSJNMTIgMTdWM002IDExbDYgNiA2LTZNMTkgMjFINSIvPjwvc3ZnPg==\")",
									"maskSize": "contain",
									"maskRepeat": "no-repeat",
									"maskPosition": "center",
									"backgroundColor": "#FFF"
								}
							);

							sepli.after(newli);

							newli.addEventListener(
								"click",
								() => {

									const trackId = addedNode.id.split("_")[0];

									browser.runtime.sendMessage({
										type: "download",
										mediaType: "track",
										mediaId: trackId
									});

								}
							);

							break;

						}

					}

					if(found)
						break;

				}

			});

			window.addEventListener(
				"beforeunload",
				() => {

					observer.disconnect();

				}
			);

			observer.observe(
				document.body,
				{
					childList: true,
					subtree: true
				}
			);
	
		}
	);*/
	

	const script = document.createElement("script");

	script.src = browser.runtime.getURL("inject.qobuz.js");
	
	script.onload = () =>
		script.remove();
	
	(document.head || document.documentElement).appendChild(script);

})();