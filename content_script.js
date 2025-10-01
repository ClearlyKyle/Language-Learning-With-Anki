(function ()
{
    console.log("----- [content_script.js] LOADED");

    const CONSOLE_LOGGING = true;
    if (!CONSOLE_LOGGING) console.log = function () { };

    //
    // GLOBALS
    //

    // NOTE : None of this will be presist between page loads
    let llw_screenshot_filenames = [];
    let llw_audio_filenames = [];

    let llw_saved_words = [];  // NOTE : On extension removal, this stored list will be lost!
    let llw_highlight_colour = "";
    let llw_highlight_words = false;

    const llw_anki_btn = document.createElement("div");
    llw_anki_btn.className = "llw_anki_btn lln-external-dict-btn tippy";
    llw_anki_btn.innerHTML = "Anki";
    llw_anki_btn.setAttribute("data-tippy-content", "Send to Anki");

    const llw_remove_highlight_word_btn = document.createElement("div");
    llw_remove_highlight_word_btn.className = "llw_remove_highlight_word_btn-btn lln-external-dict-btn tippy";
    llw_remove_highlight_word_btn.innerHTML = "RC";
    llw_remove_highlight_word_btn.setAttribute("data-tippy-content", "Remove word from being highlighted");
    llw_remove_highlight_word_btn.onclick = Highlight_Words_Remove_Word;

    //
    // STARTUP
    //

    if (document.readyState === "loading")
    {
        document.addEventListener("DOMContentLoaded", () => Init());
    }
    else
    {
        Init();
    }

    function Init()
    {
        let llw_search_class_name = "";

        if (window.location.href.includes("netflix"))
        {
            llw_search_class_name = "lln-netflix";
        }
        else if (window.location.href.includes("youtube"))
        {
            llw_search_class_name = "lln-youtube";
        }
        else
        {
            alert("Wrong website!");
            return;
        }

        // We loop for the body to had the correct "lln" class name set
        let check_dict_wrap_exists = setInterval(function ()
        {
            const lln_element = document.getElementsByClassName(llw_search_class_name)[0];
            if (lln_element)
            {
                clearInterval(check_dict_wrap_exists);
                console.log(`'${llw_search_class_name}' class has been found!`)

                Add_Functions_To_Side_Bar_Subs();
                Highlight_Words_Setup();
            }
        }, 100);
    }

    //
    // DICTIONARY SETUP
    //

    function Add_Anki_Button_To_Popup_Dictionary()
    {
        if (document.getElementsByClassName('llw_anki_btn').length)
        {
            //console.log("The Anki button is somewhere, so we wont add it again");
            return;
        }

        const btn_location = document.getElementsByClassName('lln-external-dicts-container')[0];
        if (!btn_location)
        {
            console.log("Error finding element 'lln-external-dicts-container', unable to add the Anki button");
            return;
        }

        const popup_dict_element = document.getElementsByClassName('lln-full-dict')[0];
        if (!popup_dict_element)
        {
            console.log("Error finding element 'lln-full-dict', unable to add the Anki button");
            return;
        }

        llw_anki_btn.onclick = popup_dict_element.classList.contains("right") ?
            Handle_Jump_To_Subtitle_With_Sidebar :
            Subtitle_Dictionary_Get_Data;

        btn_location.append(llw_anki_btn, llw_remove_highlight_word_btn);

        console.log("Anki button has been added!!");
    }

    function Handle_Jump_To_Subtitle_With_Sidebar()
    {
        // When we click a word in the sidebar that is not the active subtitle, we will
        // will jump to that subtitle in the video, pause, then send the relevant data
        // to anki
        console.log("[Handle_Subtitle_Dictionary] Side Bar Dictionary has been clicked...")

        // If there is no current "active" subtitle, then we cannot remove the "active"
        let active_element = document.querySelector('.lln-vertical-view-sub.lln-with-play-btn.active');
        if (active_element)
        {
            active_element.classList.remove("active")
        }

        const active_side_bar_subtitile = document.getElementsByClassName('anki-active-sidebar-sub');
        if (active_side_bar_subtitile.length)
        {
            // Get the video element
            // NOTE : This might be different on Netflix...
            const video_element = document.getElementsByTagName('video')[0];

            // Add "active" to the current "anki-active-sidebar-sub", "anki-active-sidebar-sub" is set when we
            // click on a word in the sidebar
            active_side_bar_subtitile[0].classList.add("active");

            // Jump video to the subtitle with the word we want
            document.querySelector('.anki-onclick.active').click();

            console.log("[Handle_Jump_To_Subtitle_With_Sidebar] pause the video!")
            video_element.pause();

            let checkExist = setInterval(function ()
            {
                // Wait for the video to jump to time and be paused...
                console.log("[Handle_Jump_To_Subtitle_With_Sidebar] Video state = " + video_element.readyState)
                if (video_element.readyState === 4)
                {
                    clearInterval(checkExist)
                    Subtitle_Dictionary_Get_Data();
                }
            }, 250);
        }
        else
        {
            console.warn("Handle_Jump_To_Subtitle_With_Sidebar - Error with 'anki-active-sidebar-sub'");
        }
    }

    function Add_Functions_To_Side_Bar_Subs()
    {
        console.log("[Add_Functions_To_Side_Bar_Subs] Adding all 'onclick' events...")

        let wait_for_subtitle_list = setInterval(function () 
        {
            const sub_list_element = document.getElementById("lln-vertical-view-subs");
            if (sub_list_element) 
            {
                clearInterval(wait_for_subtitle_list);

                const sub_list_observer = new MutationObserver(function (mutations) 
                {
                    mutations.forEach(function (mutation) 
                    {
                        let elements_in_view = document.querySelectorAll('.in-scroll');

                        elements_in_view.forEach(function (element) 
                        {
                            if (!element.classList.contains("anki-onclick")) 
                            {
                                element.classList.add("anki-onclick");
                                element.onclick = function (event) 
                                {
                                    const parent_with_data_index = event.target.parentNode.parentNode;

                                    // Set current "data-index" as the "anki-active-sidebar-sub"
                                    if (parent_with_data_index.classList.contains("anki-active-sidebar-sub"))
                                        return;

                                    // We need to search for any element other than the current one that has 
                                    // the classname 'anki-active-sidebar-sub'
                                    const elem_with_anki_active = document.getElementsByClassName("anki-active-sidebar-sub")[0];

                                    if (elem_with_anki_active)
                                    {
                                        elem_with_anki_active.classList.remove("anki-active-sidebar-sub")
                                    }
                                    parent_with_data_index.classList.add("anki-active-sidebar-sub");
                                };
                            }
                        });
                    });
                });

                sub_list_observer.observe(sub_list_element, { attributes: true, attributeFilter: ['class'] });
            }
        }, 100);
    }

    function Get_Video_URL()
    {
        let time_stamped_url = "url_here";
        let video_id = "1234";
        let current_time = 0;

        if (window.location.href.includes("youtube.com/watch"))
        {
            const rawid = window.location.search.split('v=')[1];
            const ampersand_position = rawid.indexOf('&');

            if (ampersand_position != -1)
            {
                video_id = rawid.substring(0, ampersand_position);
            }
            else
            {
                video_id = rawid;
            }

            const video_element = document.getElementsByClassName("video-stream")[0];
            if (!video_element)
            {
                console.warn("Get_Video_URL YT: Missing video element!");
            }
            else
            {
                current_time = video_element.currentTime;

                // example: https://youtu.be/RksaXQ4C1TA?t=123
                time_stamped_url = "https://youtu.be/" + video_id + "?t=" + current_time.toFixed();
            }
        }
        else if (window.location.href.includes("netflix.com/watch"))
        {
            const page_url = window.location.href;
            const pattern = /(?:title|watch)\/(\d+)/;
            const match = page_url.match(pattern);

            if (match && match[1])
            {
                video_id = match[1];
            }

            const video_element = document.querySelector("video");
            if (!video_element)
            {
                console.warn("Get_Video_URL NF: Missing video element!");
            }
            else
            {
                current_time = video_element.currentTime;

                // https://www.netflix.com/watch/70196252?t=349
                time_stamped_url = "https://www.netflix.com/watch/" + video_id + "?t=" + current_time.toFixed();
            }
        }
        else
        {
            console.error("What website are we on?");
        }

        return [time_stamped_url, video_id, current_time];
    }


    function Get_Screenshot()
    {
        if (window.location.href.includes("youtube.com/watch"))
        {
            const canvas = document.createElement('canvas');
            const video = document.getElementsByTagName('video')[0];
            const ctx = canvas.getContext('2d');

            // Change the size here
            canvas.width = 640;
            canvas.height = 360;

            ctx.drawImage(video, 0, 0, 640, 360);

            let image_data = canvas.toDataURL("image/png");
            image_data = image_data.replace(/^data:image\/(png|jpg);base64,/, "")

            return Promise.resolve(image_data);
        }
        else if (window.location.href.includes("netflix.com/watch"))
        {
            const dictionary_element = document.getElementsByClassName('lln-full-dict')[0];
            const extern_dict_row_element = document.getElementsByClassName('lln-external-dicts-row')[0];

            dictionary_element.style.visibility = "hidden";
            extern_dict_row_element.style.visibility = "hidden";

            console.log('Dictionary Element is now hidden, I hope');

            return new Promise(function (resolve, reject) 
            {
                setTimeout(function ()
                {
                    chrome.runtime.sendMessage({ action: 'captureVisibleTab' }, function (response) 
                    {
                        if (response && response.imageData) 
                        {
                            // Do we need to rest this as visible again?
                            dictionary_element.style.visibility = "visible";
                            extern_dict_row_element.style.visibility = "visible";

                            const img = new Image();
                            img.onload = function () 
                            {
                                const image_data = img.src.replace(/^data:image\/(png|jpg);base64,/, "");
                                resolve(image_data);
                            };
                            img.src = response.imageData;
                        }
                        else 
                        {
                            reject(new Error('Failed to capture image data'));
                        }
                    });
                }, 500);
            });
        }

        return Promise.resolve([100, 100, 0]);
    }

    async function Get_Audio()
    {
        let video_element = null;

        // NOTE : URL and Sreenshot functions use this too, set global instead?
        if (window.location.href.includes("youtube.com/watch"))
        {
            video_element = document.getElementsByTagName('video')[0];
        }
        else if (window.location.href.includes("netflix.com/watch"))
        {
            // TODO : Netflix audio collecting
            //video_element = document.querySelector("video");
            return null;
        }

        if (!video_element)
        {
            console.warn("No video element found to get audio");
            return null;
        }

        const audio_play_button = document.getElementsByClassName('lln-subs-replay-btn')[0];
        if (!audio_play_button)
        {
            console.warn("No subtitle audio play button!");
            return null;
        }

        let auto_stop_initial_state = false; // Should we even bother saving this?
        let auto_pause_element = document.getElementsByClassName('lln-toggle')[0];
        if (auto_pause_element)
        {
            auto_stop_initial_state = auto_pause_element.checked;
            if (!auto_stop_initial_state)
            {
                auto_pause_element.click() // Turn on autopause
                console.log("Autopause has been turned ON");
            }
        }

        const stream = video_element.captureStream();
        const audioStream = new MediaStream(stream.getAudioTracks());

        const recorder = new MediaRecorder(audioStream);
        const chunks = [];

        recorder.ondataavailable = event => chunks.push(event.data);
        const audio_promise = new Promise((resolve, reject) =>
        {
            recorder.onstop = () =>
            {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.onloadend = () =>
                {
                    const audio_data = reader.result.split(',')[1];
                    resolve(audio_data);
                };
                reader.readAsDataURL(blob);
            };
        });

        function onTimeUpdate()
        {
            if (video_element.paused && video_element.readyState === 4)
            {
                recorder.stop();
                clearTimeout(audio_recording_timeout);

                console.log("Audio recording automatically stopped")
                video_element.removeEventListener('timeupdate', onTimeUpdate);

                if (!auto_stop_initial_state)
                {
                    auto_pause_element.click() // Turn off autopause
                    console.log("Autopause has been turned back OFF");
                }
                video_element.pause();
            }
        }

        video_element.addEventListener('timeupdate', onTimeUpdate);

        const audio_maximum_recording_time = 16; // seconds
        const audio_recording_timeout = setTimeout(() =>
        {
            recorder.stop();
            console.log(`Audio recording stopped after ${audio_maximum_recording_time} seconds`);

            video_element.removeEventListener('timeupdate', onTimeUpdate);

            if (!auto_stop_initial_state)
            {
                auto_pause_element.click(); // Turn off autopause
                console.log("Autopause has been turned back OFF");
            }
        }, audio_maximum_recording_time * 1000); // ms = s * 1000

        console.log("Audio recording started");
        audio_play_button.click();
        recorder.start();

        return audio_promise;
    }

    async function Subtitle_Dictionary_Get_Data() // This is where we pull all the data we want from the popup dictionary
    {
        const permission_data = '{"action":"requestPermission","version":6}';

        // since we check for permission every call, it can also be used as a way to check if anki is open
        // then we will only collect the data for the card when anki is open

        chrome.storage.local.get(
            [
                "ankiDeckNameSelected",
                "ankiNoteNameSelected",
                "ankiFieldScreenshotSelected",
                "ankiSubtitleSelected",
                "ankiSubtitleTranslation",
                "ankiWordSelected",
                "ankiBasicTranslationSelected",
                "ankiExampleSentencesSelected",
                "ankiOtherTranslationSelected",
                "ankiBaseFormSelected",
                "ankiAudioSelected",
                "ankiFieldURL",
                "ankiConnectUrl",
                "ankiExampleSentenceSource",
                "ankiHighLightSavedWords",
            ],
            async ({
                ankiDeckNameSelected,
                ankiNoteNameSelected,
                ankiFieldScreenshotSelected,
                ankiSubtitleSelected,
                ankiSubtitleTranslation,
                ankiWordSelected,
                ankiBasicTranslationSelected,
                ankiExampleSentencesSelected,
                ankiOtherTranslationSelected,
                ankiBaseFormSelected,
                ankiAudioSelected,
                ankiFieldURL,
                ankiConnectUrl,
                ankiExampleSentenceSource,
                ankiHighLightSavedWords,
            }) =>
            {
                fetch(ankiConnectUrl, { // get this URL earlier and only do one permission check?
                    method: "POST",
                    body: permission_data,
                })
                    .then(async () => 
                    {
                        console.log("[Subtitle_Dictionary_Get_Data] Getting Data for Anki...");

                        let card_data = {};
                        let image_data = {};
                        let audio_data = {};

                        [video_url, video_id, video_current_time] = Get_Video_URL();
                        if (video_current_time === 0) console.warn("We did not get a current time");

                        if (ankiFieldURL)
                        {
                            console.log("Fill ankiFieldURL");

                            card_data[ankiFieldURL] = video_url;
                        }

                        if (ankiFieldScreenshotSelected) 
                        {
                            console.log("Fill ankiFieldScreenshotSelected");

                            const image_filename = `LLW_to_Anki_${video_id}_${video_current_time}.png`;

                            if (!llw_screenshot_filenames.includes(image_filename))
                            {
                                const captured_image_data = await Get_Screenshot();
                                if (captured_image_data)
                                {
                                    llw_screenshot_filenames.push(image_filename);
                                    console.log(`${image_filename} added to screenshot list`);

                                    image_data['data'] = captured_image_data;
                                    image_data['filename'] = image_filename;

                                    card_data[ankiFieldScreenshotSelected] = '<img src="' + image_filename + '" />';
                                }
                                else
                                {
                                    console.log("We did not get anything back for the Screenshot data");
                                }
                            }
                            else
                            {
                                console.log(`${image_filename} already exists`);
                                card_data[ankiFieldScreenshotSelected] = '<img src="' + image_filename + '" />';
                            }
                        }

                        // The popup dictionary window
                        let selected_word = "";
                        const dict_context = document.getElementsByClassName('lln-dict-contextual');
                        if (dict_context.length)
                        {
                            // Get word selected
                            selected_word = dict_context[0].children[1].innerText;

                            if (ankiHighLightSavedWords)
                            {
                                const selected_element = document.getElementsByClassName('lln-is-open-in-full-dict')[0];
                                if (selected_element)
                                {
                                    const data_word_key = selected_element.getAttribute('data-word-key');
                                    const base_word_form = data_word_key.split('|')[1]; // "пешеходный"

                                    console.log(`Fill ankiHighLightSavedWords : ${base_word_form}`);
                                    if (!llw_saved_words.includes(base_word_form))
                                    {
                                        llw_saved_words.push(base_word_form);

                                        Highlight_Words_Store();
                                    }
                                }

                            }

                            if (ankiWordSelected)
                            {
                                console.log("Fill ankiWordSelected");

                                card_data[ankiWordSelected] = selected_word;
                            }

                            // Get basic translation (this is top of the popup dic)
                            if (ankiBasicTranslationSelected)
                            {
                                console.log("Fill ankiBasicTranslationSelected");

                                const translation_text = dict_context[0].innerText; // ex: '3k\nвпечатлениях\nimpressions'

                                const translation_text_without_most_common_number = translation_text.split("\n").slice(1); // removing the 3k, 2k, 4k, from the translation

                                card_data[ankiBasicTranslationSelected] = translation_text_without_most_common_number.join('<br>'); // replace line brea '\n' with <br> tag
                            }
                        }

                        // Get full definition (this is the difinitions provided bellow the AI part)
                        // base form is the form of the word found in a dictionary
                        const full_definition_element = document.getElementsByClassName('lln-dict-section-full');
                        if (full_definition_element.length)
                        {
                            if (ankiOtherTranslationSelected)
                            {
                                console.log("Fill ankiOtherTranslationSelected");

                                card_data[ankiOtherTranslationSelected] = full_definition_element[0].innerHTML;
                            }
                            if (ankiBaseFormSelected)
                            {
                                console.log("Fill ankiBaseFormSelected");

                                card_data[ankiBaseFormSelected] = full_definition_element[0].childNodes[1].childNodes[1].innerText;
                            }
                        }

                        if (ankiSubtitleSelected)
                        {
                            console.log("Fill ankiSubtitleSelected");

                            const subtitle_element = document.getElementsByClassName('lln-subs');
                            if (subtitle_element.length)
                            {
                                const subtitle = subtitle_element[0].innerText;

                                card_data[ankiSubtitleSelected] = subtitle;

                                if (selected_word) // If we are storing the word too, we will highlight in the subtitle
                                {
                                    // Make selected word bold in the subtitles, might not work for all languages :(
                                    card_data[ankiSubtitleSelected] = subtitle.replace(new RegExp(`(?<![\u0400-\u04ff])${selected_word}(?![\u0400-\u04ff])`, 'gi'), "<b>" + selected_word + "</b>");
                                }
                            }
                        }

                        // Get the translation text (will fail if its not loaded)
                        if (ankiSubtitleTranslation)
                        {
                            console.log("Fill ankiSubtitleTranslation");

                            const subtitle_translation_element = document.getElementsByClassName('lln-whole-title-translation');
                            if (subtitle_translation_element.length)
                            {
                                card_data[ankiSubtitleTranslation] = subtitle_translation_element[0].innerText;
                            }
                        }

                        // Getting Example sentences 
                        // There are two sets of example sentences, so we can choose between which set we want
                        if (ankiExampleSentencesSelected)
                        {
                            console.log("Fill ankiExampleSentencesSelected, from", ankiExampleSentenceSource);

                            const example_sentences_element = document.getElementsByClassName('lln-word-examples');
                            if (example_sentences_element.length)
                            {
                                let example_sentences_list = [];
                                switch (ankiExampleSentenceSource)
                                {
                                    case "Both":
                                        if (example_sentences_element[0]) 
                                        {
                                            example_sentences_list = Array.from(example_sentences_element[0].children).slice(1);
                                        }
                                        if (example_sentences_element[1]) 
                                        {
                                            const tmp = Array.from(example_sentences_element[1].children).slice(1);
                                            example_sentences_list = example_sentences_list.concat(tmp);
                                        }

                                        break;
                                    case "Current":
                                        if (example_sentences_element[0])
                                            example_sentences_list = Array.from(example_sentences_element[0].children).slice(1);
                                        break;
                                    case "Tatoeba":
                                        if (example_sentences_element[1])
                                            example_sentences_list = Array.from(example_sentences_element[1].children).slice(1);
                                        break;
                                    case "None": // fallthrough
                                    default:
                                        example_sentences_list = [];
                                        break;
                                }

                                console.log("Example sentences :", example_sentences_list);

                                card_data[ankiExampleSentencesSelected] = ''; // initialize or we get a 'undefined' as first value

                                example_sentences_list.forEach(element =>
                                {
                                    card_data[ankiExampleSentencesSelected] += element.innerText + "<br>";
                                });
                            }
                        }

                        // Get audio for subtitle we are on, do it last, as sometimes we can run past the end of the
                        // subtitle we want, then we end up saving the next subtitle instead.
                        if (ankiAudioSelected)
                        {
                            console.log("Fill ankiAudioSelected");

                            let sub_index = 0;
                            const element = document.querySelector('#lln-subs');
                            if (element)
                            {
                                sub_index = element.dataset.index;
                            }
                            const audio_filename = `LLW_to_Anki_${video_id}_${sub_index}.webm`;

                            if (!llw_audio_filenames.includes(audio_filename))
                            {
                                const audio_raw_data = await Get_Audio();
                                if (audio_raw_data)
                                {
                                    llw_audio_filenames.push(audio_filename);
                                    console.log(`${audio_filename} added to audio list`);

                                    audio_data['data'] = audio_raw_data;
                                    audio_data['filename'] = audio_filename;

                                    card_data[ankiAudioSelected] = '[sound:' + audio_filename + ']';
                                }
                                else
                                {
                                    console.log("We did not get anything back for the Audio data")
                                }
                            }
                            else
                            {
                                console.log(`${audio_filename} already exists.`);
                                card_data[ankiAudioSelected] = '[sound:' + audio_filename + ']';
                            }
                        }

                        console.log("Card data to send to Anki :", card_data);

                        console.log("Audio Data :", audio_data);
                        console.log("Image Data :", image_data);

                        const anki_settings = {
                            "deck": ankiDeckNameSelected,
                            "note": ankiNoteNameSelected,
                            "url": ankiConnectUrl || 'http://localhost:8765',
                        }

                        // TODO : if anki is not open, then all the data for screenshots, audio, card data is still
                        // collected, we should check way earlier if it is open or not
                        LLW_Send_Data_To_Anki(anki_settings, card_data, image_data, audio_data);
                    }).catch((error) =>
                    {
                        show_error_message("Permission Error, check Anki is open and extension has permission to connect to Anki (AnkiConnect config 'webCorsOriginList') :" + error);

                        // Since Anki could be closed for this error to happen, it would be possible for the audio or screenshot data not to be sent to Anki,
                        // resulting in the next time a card is made from the same subtitle, an audio or screenshot field is filled with a filename and no data.
                        // We need to remove the filenames from our "cached" list

                        //if (image_data && typeof image_data.filename === "string")
                        //{
                        //    const index = llw_screenshot_filenames.indexOf(image_data.filename);
                        //    if (index !== -1)
                        //    {
                        //        llw_screenshot_filenames.splice(index, 1);
                        //    }
                        //}

                        //if (audio_data && typeof audio_data.filename === "string")
                        //{
                        //    const index = llw_audio_filenames.indexOf(audio_data.filename);
                        //    if (index !== -1)
                        //    {
                        //        llw_audio_filenames.splice(index, 1);
                        //    }
                        //}

                        // NOTE : Should we remove the word from the highlight list?
                        //if (fields && fields.ankiWordSelected)
                        //    Highlight_Words_Remove_Word();
                    });

            });
    }


    //
    // HIGHLIGHT WORDS
    //

    // Here we are checking if the user toggles the highlighting words setting, this will save the user
    // having to refresh the page to get or remove highlighting, same for the colour value
    chrome.storage.onChanged.addListener(function (changes, areaName)
    {
        if (areaName === 'local') // or 'sync' if using sync storage
        {
            // oldValue, newValue, are special words, dont change them
            for (let [key, { oldValue, newValue }] of Object.entries(changes))
            {
                if (key === 'ankiHighLightSavedWords')
                {
                    console.log(`${key} has changed from '${oldValue}' to '${newValue}'`);
                    llw_highlight_words = newValue;
                }

                if (key === 'ankiHighLightColour')
                {
                    console.log(`${key} has changed from '${oldValue}' to '${newValue}'`);
                    llw_highlight_colour = newValue;
                }
            }
        }
    });

    function Highlight_Words_Setup()
    {
        chrome.storage.local.get(['ankiHighlightWordList', 'ankiHighLightColour', 'ankiHighLightSavedWords'],
            ({ ankiHighlightWordList, ankiHighLightColour, ankiHighLightSavedWords }) =>
            {
                llw_saved_words = ankiHighlightWordList || [];
                llw_highlight_colour = ankiHighLightColour || 'LightCoral';
                llw_highlight_words = ankiHighLightSavedWords;

                if (!Array.isArray(llw_saved_words))
                {
                    console.error("llw_saved_words is not an array.");
                }

                console.log("Highlight word settings:", { llw_saved_words, llw_highlight_colour, llw_highlight_words });

                console.log("Waiting for subtitle content element...");
                const wait_for_subtitles_to_show = setInterval(function ()
                {
                    const sub_content_element = document.getElementById('lln-subs-content');
                    if (sub_content_element)
                    {
                        console.log("Subtitle content element found!");
                        clearInterval(wait_for_subtitles_to_show);

                        const observer = new MutationObserver((mutationList) =>
                        {
                            for (const mutation of mutationList)
                            {
                                if (mutation.type === 'attributes')
                                {
                                    const element = document.getElementById('lln-subs');
                                    if (element)
                                    {
                                        console.log("We need to update the subtitle highlights");

                                        if (llw_highlight_words) Highlight_Words_In_Current_Subtitle();

                                        Add_Anki_Button_To_Popup_Dictionary();
                                        break;
                                    }
                                }
                            }
                        });
                        observer.observe(sub_content_element, { attributes: true, subtree: true });
                    }
                }, 100);
            }
        );
    }

    function Highlight_Words_In_Current_Subtitle()
    {
        const subtitle_element = document.getElementsByClassName('lln-subs')[0];

        subtitle_element.querySelectorAll('[data-word-key*="WORD|"]').forEach((element) =>
        {
            const inner_word = element.innerText.toLowerCase();

            const data_word_key = element.getAttribute('data-word-key');
            const key_parts = data_word_key ? data_word_key.split('|') : [];
            const base_form_word = key_parts.length >= 2 ? key_parts[1].toLowerCase() : null;

            if (llw_saved_words.includes(inner_word) || (base_form_word && llw_saved_words.includes(base_form_word)))
            {
                element.style.color = llw_highlight_colour || 'LightCoral'; // #F08080
            }
        });
    }

    function Highlight_Words_Store()
    {
        // NOTE : Does this need to be done everytime?
        //const unique_words_only = llw_saved_words.reduce((accumulator, current) =>
        //{
        //    if (!accumulator.includes(current))
        //    {
        //        accumulator.push(current);
        //    }
        //    return accumulator;
        //}, []);
        //llw_saved_words = unique_words_only;
        //chrome.storage.local.set({ ankiHighlightWordList: unique_words_only });

        chrome.storage.local.set({ ankiHighlightWordList: llw_saved_words });
    }

    function Highlight_Words_Remove_Word()
    {
        // 1 - Get the current word
        // 2 - Remove from list
        // 3 - Update Store 
        // 4 - Update subtitle

        const dict_context = document.getElementsByClassName('lln-dict-contextual')[0];
        if (!dict_context)
        {
            console.warm("Cannot find 'lln-dict-contextual'");
            return;
        }

        const selected_word = dict_context.children[1].innerText;

        if (selected_word)
        {
            const index = llw_saved_words.indexOf(selected_word);
            if (index !== -1)
            {
                llw_saved_words.splice(index, 1);

                console.log(`Removed ${selected_word} from highlight list`);

                Highlight_Words_Store();
            }
        }
    }

    //
    // SEND TO ANKI
    //

    function LLW_Send_Data_To_Anki(anki_settings, fields, image_data, audio_data)
    {
        console.log("Destination : ", anki_settings);

        if (Object.keys(fields).length === 0)
        {
            show_error_message("No fields were set, please set a field in the settings");
            return;
        }

        console.log("fields : ", fields);

        let actions = [];

        if (image_data.data)
        {
            console.log("Adding image to note :", image_data);
            actions.push({
                "action": "storeMediaFile",
                "params": {
                    "filename": image_data.filename,
                    "data": image_data.data
                }
            });
        }

        if (audio_data.data)
        {
            console.log("Adding audio to note :", audio_data);
            actions.push({
                "action": "storeMediaFile",
                "params": {
                    "filename": audio_data.filename,
                    "data": audio_data.data
                }
            });
        }

        actions.push({
            "action": "addNote",
            "params": {
                "note": {
                    "modelName": anki_settings.note,
                    "deckName": anki_settings.deck,
                    "fields": fields,
                    "tags": ["LLW_to_Anki"],
                    "options": {
                        "allowDuplicate": true,
                    }
                }
            }
        });

        console.log("actions : ", actions);

        const body = {
            "action": "multi",
            "params": {
                "actions": actions
            }
        };

        console.log("body : ", body);


        fetch(anki_settings.url, {
            method: "POST",
            body: JSON.stringify(body),
        })
            .then((res) => res.json())
            .then((data) =>
            {
                console.log("Fetch Return : ", data);
                let has_error = false;

                data.forEach((response, index) =>
                {
                    if (response.result === null)
                    {
                        show_error_message(`Error in response ${index + 1}: ${response.error}`);
                        has_error = true;
                    }
                });

                if (!has_error)
                {
                    show_success_message(`Successfully added to ANKI`);
                }
            })
            .catch((error) =>
            {
                show_error_message("Anki Post Error! " + error);
            })
    }

    //
    // DELICIOUS TOAST
    //

    function show_success_message(message)
    {
        Toastify({
            text: message,
            duration: 3000,
            style: {
                background: "light blue",
            }
        }).showToast();
        console.log(message);
    }

    function show_error_message(message)
    {
        Toastify({
            text: message,
            duration: 3000,
            style: {
                background: "red",
            }
        }).showToast();
        console.error(message);
    }

})();

