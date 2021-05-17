/* This runs on all "youtube.com/watch" web pages */
console.log("----- [content_script.js] LOADED");

/* YOUTUBE */
if (window.location.href.includes("youtube.com/watch")) {
	console.log("Adding button to youtube video")

	var checkExist = setInterval(function () {
		if (document.getElementsByClassName('lln-full-dict').length) {
			console.log("Start monitoring mutations")

			var observer = new MutationObserver(function (mutations) {
				console.log("MUTATIONS")
				for (let mutation of mutations) {
					if (mutation.removedNodes.length === 2) {
						let btn_location = mutation.addedNodes[1].children[3].children[0].children[0]
						console.log(btn_location)

						let anki_div = document.createElement("div");
						anki_div.className = "lln-external-dict-btn tippy";
						anki_div.innerHTML = "Anki";
						anki_div.onclick = LLW_sendtoAnki;

						btn_location.appendChild(anki_div)
					}
				}
			});
			observer.observe(document.getElementsByClassName('lln-full-dict-wrap')[0], { attributes: true, childList: true });
			clearInterval(checkExist);
		}
	}, 100); // check every 100ms 

	console.log("Button successfully added")
}

/* ----------------------------------------------------------------------------------------------------------- */
function LLW_sendtoAnki() {
	console.log("")
	console.log("")
	console.log("LLW_sendtoAnki -> Sending to ANKI")

	var canvas = document.createElement('canvas');
	var video = document.querySelector('video');
	var ctx = canvas.getContext('2d');

	// Change the size here
	canvas.width = 640;
	canvas.height = 360;

	ctx.drawImage(video, 0, 0, 640, 360);

	var dataURL = canvas.toDataURL("image/png");
	dataURL = dataURL.replace(/^data:image\/(png|jpg);base64,/, "")

	const imageFilename = 'Youtube2Anki_' + canvas.width + 'x' + canvas.height + '-' + Math.random().toString(36).substring(7) + '.png';

	/* Getting translation of the word selected */
	if (document.getElementsByClassName('lln-dict-contextual').length) {
		var word = document.getElementsByClassName('lln-dict-contextual')[0].children[0].innerText;
		var translation = document.getElementsByClassName('lln-dict-contextual')[0].innerText.replace(/(?:\r\n|\r|\n)/g, '<br>');
	} else {
		var word = ""
		var translation = ""
	}
	if (document.getElementsByClassName('lln-dict-section-full').length) {
		//var extra_definitions = document.getElementsByClassName('lln-dict-section-full')[0].innerText.replace(/(?:\r\n|\r|\n)/g, '<br>');
		var extra_definitions = document.getElementsByClassName('lln-dict-section-full')[0].innerHTML;
	}

	/* making time stamped url */
	var videoId = document.querySelectorAll('[itemprop="videoId"]')[0].content;
	var current_time = document.querySelector(".video-stream").currentTime.toFixed();
	var youtube_share_url = "https://youtu.be/" + videoId + "?t=" + current_time; /* example: https://youtu.be/RksaXQ4C1TA?t=123 */

	console.log("Video URL (and time stamp) =", youtube_share_url)

	var subtitle = document.getElementsByClassName('lln-subs')[0].innerText.replace(word, "<b>" + word + "</b>");

	chrome.storage.local.get(
		['ankiDeckNameSelected', 'ankiNoteNameSelected', 'ankiFieldScreenshotSelected', 'ankiSubtitleSelected',
			'ankiWordSelected', "ankiBasicTranslationSelected", "ankiOtherTranslationSelected", "ankiFieldURL", "ankiConnectUrl"],
		({ ankiDeckNameSelected, ankiNoteNameSelected, ankiFieldScreenshotSelected, ankiSubtitleSelected,
			ankiWordSelected, ankiBasicTranslationSelected, ankiOtherTranslationSelected, ankiFieldURL, ankiConnectUrl }) => {
			url = ankiConnectUrl || 'http://localhost:8765';
			model = ankiNoteNameSelected || 'Basic';
			deck = ankiDeckNameSelected || 'Default';

			console.log(
				{
					ankiDeckNameSelected, ankiNoteNameSelected, ankiFieldScreenshotSelected, ankiSubtitleSelected,
					ankiWordSelected, ankiBasicTranslationSelected, ankiOtherTranslationSelected, ankiFieldURL, ankiConnectUrl
				}
			)

			console.log("Image File Name: ", imageFilename)
			console.log("Deck Name: ", model)
			console.log("Model Name: ", deck)

			var fields = {
				[ankiFieldScreenshotSelected]: '<img src="' + imageFilename + '" />',
				[ankiSubtitleSelected]: subtitle,
				[ankiWordSelected]: word,
				[ankiBasicTranslationSelected]: translation,
				[ankiOtherTranslationSelected]: extra_definitions,
				[ankiFieldURL]: youtube_share_url
			};

			var body = {
				"action": "multi",
				"params": {
					"actions": [
						{
							"action": "storeMediaFile",
							"params": {
								"filename": imageFilename,
								"data": dataURL
							}
						},
						{
							"action": "addNote",
							"params": {
								"note": {
									"modelName": model,
									"deckName": deck,
									"fields": fields,
									"tags": ["LLW_to_Anki"]
								}
							}
						}
					]
				}
			};

			var permission_data = {
				"action": "requestPermission",
				"version": 6,
			};

			fetch(url, {
				method: "POST",
				body: JSON.stringify(permission_data),
			})
				.then((res) => res.json())
				.then((data) => {
					console.log(data);
					fetch(url, {
						method: "POST",
						body: JSON.stringify(body),
					})
						.then((res) => res.json())
						.then((data) => {
							console.log("Fetch Return:")
							if (data.result === null) {
								alert("Error!\n" + data.error)
							}
							console.log("Sucess")
						}).catch((error) => console.log("EEROR! ", error));
				})
				.catch((error) => console.log("EEROR! ", error));
			console.log("Sent to ANKI complete!\n");
		});
}