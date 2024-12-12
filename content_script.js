(function ()
{
    console.log("----- [content_script.js] LOADED");

    // Toggle the console output on and off
    const CONSOLE_LOGGING = false;
    if (!CONSOLE_LOGGING)
    {
        console.log = function () { };
    }

    //
    // GLOBALS
    //
    // NOTE : This wont be presist between page loads
    let SCREENSHOT_FILENAMES = [];
    let AUDIO_FILENAMES = [];
    let lln_search_class_name = "";

    if (window.location.href.includes("netflix"))
    {
        lln_search_class_name = "lln-netflix";
    }
    else if (window.location.href.includes("youtube"))
    {
        lln_search_class_name = "lln-youtube";
    }
    else
    {
        alert("Wrong website!");
        return;
    }

    // We loop for the body to had the correct "lln" class name set
    let check_dict_wrap_exists = setInterval(function ()
    {
        const lln_element = document.getElementsByClassName(lln_search_class_name)[0];
        if (lln_element)
        {
            clearInterval(check_dict_wrap_exists);
            console.log(`'${lln_search_class_name}' class has been found!`)

            Add_Functions_To_Side_Bar_Subs();
            // Highlight_Words();

            let dict_wrap_observer = new MutationObserver(function (mutations)
            {
                for (let mutation of mutations)
                {
                    // look for either the subtitle dictionary clicked or the side bar dictionary first clicked
                    for (let new_elem of mutation.addedNodes)
                    {
                        if (new_elem instanceof HTMLElement)
                        {
                            if (new_elem.classList.contains('lln-full-dict'))
                            {
                                // the dictionary has been opened so we add the Anki button to it
                                console.log("Dictionary open, adding Anki button");
                                Add_Anki_Button_To_Popup_Dictionary();
                                break;
                            }
                        }

                    }
                }
            });
            dict_wrap_observer.observe(lln_element, {
                attributes: true,
                childList: true,
                subtree: true
            });
        }
    }, 100); // check every 100ms 

    // Create Anki button
    const anki_div = document.createElement("div");
    anki_div.className = "anki-btn lln-external-dict-btn tippy";
    anki_div.innerHTML = "Anki";
    anki_div.setAttribute("data-tippy-content", "Send to Anki");

    // Create Remove Highlighted word button
    const remove_highlight = document.createElement("div");
    remove_highlight.className = "remove_highlight-btn lln-external-dict-btn tippy";
    remove_highlight.innerHTML = "RC";
    remove_highlight.setAttribute("data-tippy-content", "Remove word from being highlighted");
    remove_highlight.onclick = Remove_Word_From_Highlight_List;

    function Add_Anki_Button_To_Popup_Dictionary()
    {
        const btn_location = document.getElementsByClassName('lln-external-dicts-container')[0];
        if (!btn_location)
        {
            console.warn("Error finding element 'lln-external-dicts-container', unable to add the Anki button");
            return;
        }

        const popup_dict_element = document.getElementsByClassName('lln-full-dict')[0];
        if (popup_dict_element)
        {
            anki_div.onclick = popup_dict_element.classList.contains("right") ?
                Handle_Jump_To_Subtitle_With_Sidebar :
                Subtitle_Dictionary_Get_Data;
        }

        btn_location.append(anki_div, remove_highlight);
    }

    function Remove_Word_From_Highlight_List()
    {
        console.log("[Remove_Word_From_Highlight_List] Get current word and remove from saved list of words")

        // Get currently clicked word..
        let word = "";
        const word_element = document.getElementsByClassName('lln-dict-contextual');
        if (word_element.length)
        {
            if (word_element[0].childElementCount === 4)
            {
                word = word_element[0].children[1].innerText;
            }
            else if (word_element[0].childElementCount === 3)
            {
                word = word_element[0].children[0].innerText;
            }
        }
        else
        {
            console.log("[Remove_Word_From_Highlight_List] Cannot get word from subtitle");
            return;
        }

        // Get the current list of stored words
        if (word !== "")
        {
            chrome.storage.local.get({ user_saved_words: [] }, function (result)
            {
                // Then we add the new word to the current stored list
                const words = result.user_saved_words;

                const index = words.indexOf(word.toLowerCase());
                if (index > -1)
                {
                    words.splice(index, 1);
                }

                // Save the list back to chrome
                chrome.storage.local.set({ user_saved_words: words }, () =>
                {
                    Update_Subtitle_Highlighting_Words();
                });
            });
        }
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
                console.warn("Where has the video element went?");
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

            const video_element = document.querySelector(".video");
            if (!video_element)
            {
                console.warn("Where has the video element went?");
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
            video_element = document.querySelector(".video");
        }

        if (!video_element)
        {
            console.warn("No video element found to get audio");
            return;
        }

        const audio_play_button = document.getElementsByClassName('lln-subs-replay-btn')[0];
        if (!audio_play_button)
        {
            console.warn("No subtitle audio play button!");
            return;
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

        // Start capturing the audio track
        const stream = video_element.captureStream();
        const audioStream = new MediaStream(stream.getAudioTracks());

        // Create a MediaRecorder to record the audio
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

        video_element.addEventListener('timeupdate', function onTimeUpdate()
        {
            if (video_element.paused && video_element.readyState === 4)
            {
                recorder.stop();
                console.log("Audio recording stop")
                video_element.removeEventListener('timeupdate', onTimeUpdate);

                if (!auto_stop_initial_state)
                {
                    auto_pause_element.click() // Turn off autopause
                    console.log("Autopause has been turned back OFF");
                }
                video_element.pause();
            }
        });

        audio_play_button.click();
        recorder.start();

        return audio_promise;
    }

    {
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
                "ankiAudioSelected",
                "ankiFieldURL",
                "ankiConnectUrl",
                "ankiExampleSentenceSource"],
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
                ankiAudioSelected,
                ankiFieldURL,
                ankiConnectUrl,
                ankiExampleSentenceSource }) =>
            {
                console.log("[Subtitle_Dictionary_Get_Data] Getting Data for Anki...");

                let card_data = {};
                let image_data = {};
                let audio_data = {};

                [video_url, video_id, video_current_time] = Get_Video_URL();

                if (ankiFieldURL)
                {
                    console.log("Fill ankiFieldURL");

                    card_data[ankiFieldURL] = video_url;
                }

                if (ankiFieldScreenshotSelected) 
                {
                    console.log("Fill ankiFieldScreenshotSelected");

                    const image_filename = `Youtube2Anki_${video_id}_${video_current_time}.png`;

                    if (!SCREENSHOT_FILENAMES.includes(image_filename))
                    {
                        SCREENSHOT_FILENAMES.push(image_filename);

                        console.log(`${image_filename} added to screenshot list`);

                        const captured_image_data = await Get_Screenshot();

                        image_data['data'] = captured_image_data;
                        image_data['filename'] = image_filename;
                    }
                    else
                    {
                        console.log(`${image_filename} already exists.`);
                    }


                    card_data[ankiFieldScreenshotSelected] = '<img src="' + image_filename + '" />';
                }

                // The popup dictionary window
                let selected_word = "";
                const dict_context = document.getElementsByClassName('lln-dict-contextual');
                if (dict_context.length)
                {
                    // Get word selected
                    selected_word = dict_context[0].children[1].innerText;

                    if (ankiWordSelected)
                    {
                        console.log("Fill ankiWordSelected");

                        card_data[ankiWordSelected] = selected_word;
                        //Store_Word_In_Chrome(selected_word); // Used for highliting words used in cards
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
                if (ankiOtherTranslationSelected)
                {
                    const full_definition_element = document.getElementsByClassName('lln-dict-section-full');
                    if (full_definition_element.length)
                    {
                        console.log("Fill ankiOtherTranslationSelected");

                        card_data[ankiOtherTranslationSelected] = full_definition_element[0].innerHTML;
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
                                // Convert HTMLCollections to arrays and remove the first element from each
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
                                example_sentences_list = []; // Default case if none matches
                                break;
                        }

                        console.log("Example sentences :", example_sentences_list);
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
                    const audio_filename = `Youtube2Anki_${video_id}_${sub_index}.webm`;

                    if (!AUDIO_FILENAMES.includes(audio_filename))
                    {
                        AUDIO_FILENAMES.push(audio_filename);

                        console.log(`${audio_filename} added to screenshot list`);

                        const audio_raw_data = await Get_Audio();

                        audio_data['data'] = audio_raw_data;
                        audio_data['filename'] = audio_filename;
                    }
                    else
                    {
                        console.log(`${audio_filename} already exists.`);
                    }

                    card_data[ankiAudioSelected] = '[sound:' + audio_filename + ']';
                }

                console.log("Card data to send to Anki : ", card_data);

                const anki_settings = {
                    "deck": ankiDeckNameSelected,
                    "note": ankiNoteNameSelected,
                    "url": ankiConnectUrl || 'http://localhost:8765',
                }

                LLW_Send_Data_To_Anki(anki_settings, card_data, image_data, audio_data);
            }
        );
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
                                element.onclick = function () 
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

    function Store_Word_In_Chrome(word_to_store)
    {
        // Get the current list of stored words
        chrome.storage.local.get({ user_saved_words: [] }, function (result)
        {
            // Then we add the new word to the current stored list
            let words = result.user_saved_words;
            words.push(word_to_store.toLowerCase())

            // Save the list back to chrome
            chrome.storage.local.set({ user_saved_words: words }, () =>
            {
                Update_Subtitle_Highlighting_Words(); // Update the current subtitle with the newest words saved.
            });
        });
    }

    function Highlight_Words()
    {
        let wait_for_subtitles_to_show = setInterval(function ()
        {
            if (document.getElementById('lln-subs-content'))
            {
                clearInterval(wait_for_subtitles_to_show); // Stop timed interval

                console.log("[Highlight_Words] Highlighting words in subtitle...")

                let subtitle_observer = new MutationObserver(function (mutations)
                {
                    for (let mutation of mutations)
                    {
                        if (mutation.addedNodes.length === 3)
                        {
                            Update_Subtitle_Highlighting_Words()
                        }
                        break;
                    }
                });
                subtitle_observer.observe(document.getElementById('lln-subs-content'),
                    {
                        childList: true
                    }
                );
            }
        }, 100);
    }

    function Update_Subtitle_Highlighting_Words()
    {
        console.log("[Update_Subtitle_Highlighting_Words]")

        // Get saved words
        chrome.storage.local.get(['user_saved_words', 'ankiHighLightColour', 'ankiHighLightSavedWords'], function ({ user_saved_words, ankiHighLightColour, ankiHighLightSavedWords })
        {
            console.log("[Update_Subtitle_Highlighting_Words] Getting saved words...")
            // console.log(user_saved_words)

            // dont highlight if there are no words, or the option to no highlight is set
            if (!user_saved_words || ankiHighLightSavedWords === false)
                return;

            const subtitles = document.getElementsByClassName('lln-subs');
            if (subtitles.length > 0)
            {
                subtitles[0].querySelectorAll('[data-word-key*="WORD|"').forEach((element) =>
                {
                    if (user_saved_words.includes(element.innerText.toLowerCase()))
                    {
                        //element.style.color = 'LightCoral'; // #F08080
                        element.style.color = ankiHighLightColour;
                    }
                    else // This is needed for when we remove our modidied colours, it will return back to default
                    {
                        element.style.color = '';
                    }
                });
            }
        });
    }

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

        const permission_data = '{"action":"requestPermission","version":6}';

        fetch(anki_settings.url, {
            method: "POST",
            body: permission_data,
        })
            .then((res) => res.json())
            .then((data) =>
            {
                console.log("Permission fetch return : ", data);
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
            }).catch((error) =>
            {
                show_error_message("Permission Error, extension doesnt have permission to connect to Anki, check AnkiConnect config 'webCorsOriginList', " + error);
            });
    }

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

