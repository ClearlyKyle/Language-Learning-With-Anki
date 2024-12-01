(function ()
{
    /* This runs on all "youtube" and "netflix" web pages */
    console.log("----- [content_script.js] LOADED");

    if (window.location.href.includes("netflix") || window.location.href.includes("youtube")) // NOTE : Do we need this?
    {
        console.log("[MAIN] Adding button...")

        let lln_search_class_name = '';
        if (window.location.href.includes("netflix"))
        {
            lln_search_class_name = 'lln-netflix';
        }
        else if (window.location.href.includes("youtube"))
        {
            lln_search_class_name = 'lln-youtube';
        }
        else
        {
            console.log("Wrong website");
            return;
        }


        // we loop for the body to had the correct "lln" class name set
        var check_dict_wrap_exists = setInterval(function ()
        {
            if (document.querySelector('.' + lln_search_class_name) != null)
            {
                clearInterval(check_dict_wrap_exists);
                console.log("'" + lln_search_class_name + "' has been found...")

                Add_Functions_To_Side_Bar_Subs();
                //Highlight_Words();

                var dict_wrap_observer = new MutationObserver(function (mutations)
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
                                    console.log("dictionary has been loaded...");
                                    Add_Anki_Button_To_Popup_Dictionary();
                                    break;
                                }
                            }

                        }
                    }
                });
                dict_wrap_observer.observe(document.getElementsByClassName(lln_search_class_name)[0],
                    {
                        attributes: true,
                        childList: true,
                        subtree: true
                    }
                );
            }
        }, 100); // check every 100ms 
    }

    function Add_Anki_Button_To_Popup_Dictionary()
    {
        const btn_location = document.getElementsByClassName('lln-external-dicts-container')[0];
        const highlight_location = document.getElementsByClassName('lln-word-save-buttons-wrap')[0];

        if (!btn_location && !highlight_location)
        {
            console.log("Error finding the elements: 'lln-external-dicts-container' and 'lln-word-save-buttons-wrap'")
            return;
        }

        /* create Anki Button */
        let anki_div = document.createElement("div");
        anki_div.className = "anki-btn lln-external-dict-btn tippy";
        anki_div.innerHTML = "Anki";
        anki_div.setAttribute("data-tippy-content", "Send to Anki");

        /* create Remove Highlighted word Button */
        let remove_highlight = document.createElement("div");
        remove_highlight.className = "remove_highlight-btn lln-external-dict-btn tippy";
        remove_highlight.innerHTML = "RC";
        remove_highlight.setAttribute("data-tippy-content", "Remove word from being highlighted");

        // HANDLE SIDE BAR DICT
        if (document.querySelector('.lln-full-dict.right') != null)
        {
            anki_div.onclick = Handle_Jump_To_Subtitle_With_Sidebar;
            remove_highlight.onclick = Remove_Word_From_Highlight_List;
        }

        // HANDLE SUBTITLE DICT
        else if (document.querySelector('.lln-full-dict') != null)
        {
            anki_div.onclick = Handle_Subtitle_Dictionary;
            remove_highlight.onclick = Remove_Word_From_Highlight_List;
        }

        btn_location.append(anki_div, remove_highlight)

        console.log("Boom! Button has been added!")
    }

    function Remove_Word_From_Highlight_List()
    {
        console.log("[Remove_Word_From_Highlight_List] Get current word and remove from saved list of words")

        // Get currently clicked word..
        const word_element = document.getElementsByClassName('lln-dict-contextual');
        if (word_element.length)
        {
            if (word_element[0].childElementCount === 4)
            {
                var word = word_element[0].children[1].innerText;
            } else if (word_element[0].childElementCount === 3)
            {
                var word = word_element[0].children[0].innerText;
            }
        } else
        {
            console.log("[Remove_Word_From_Highlight_List] Cannot get word from subtitle")
            return
        }

        // Get the current list of stored words
        if (word !== "")
        {
            chrome.storage.local.get({ user_saved_words: [] }, function (result)
            {
                // Then we add the new word to the current stored list
                var words = result.user_saved_words;

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

        // if there is no current "active" subtitle, then we cannot remove the "active"
        if (document.querySelector('.lln-vertical-view-sub.lln-with-play-btn.active') != null)
            document.getElementsByClassName("lln-vertical-view-sub lln-with-play-btn active")[0].classList.remove("active")

        const active_side_bar_subtitile = document.getElementsByClassName('anki-active-sidebar-sub');

        if (active_side_bar_subtitile.length > 0)
        {
            // Get the video element
            // NOTE : This might be different on Netflix...
            const video_element = document.getElementsByTagName('video')[0];

            // add "active" to the current "anki-active-sidebar-sub", "anki-active-sidebar-sub" is set when we
            // click on a word in the sidebar
            active_side_bar_subtitile[0].classList.add("active");

            // jump video to the subtitle with the word we want
            document.querySelector('.anki-onclick.active').click();

            console.log("[Handle_Jump_To_Subtitle_With_Sidebar] pause the video!")
            video_element.pause();

            var checkExist = setInterval(function ()
            {
                // Wait for the video to jump to time and be paused...
                console.log("[Handle_Jump_To_Subtitle_With_Sidebar] Video state = " + video_element.readyState)
                if (video_element.readyState === 4)
                {
                    clearInterval(checkExist)
                    Subtitle_Dictionary_GetData();
                }
            }, 250);
        }
        else
        {
            console.log("Handle_Jump_To_Subtitle_With_Sidebar - Error with 'anki-active-sidebar-sub'");
        }
    }

    function Handle_Subtitle_Dictionary()
    {
        console.log("[Handle_Subtitle_Dictionary] Subtitle Dictionary has been clicked...")
        if (document.querySelector('.lln-full-dict') != null)
        {
            // We have the subtitle bar dictionary open
            Subtitle_Dictionary_GetData();
        }
        else
        {
            console.log("[Handle_Subtitle_Dictionary] ERROR!!")
        }
        return;
    }

    function Get_Video_URL()
    {
        var time_stamped_url = "url_here";
        var video_id = "1234";

        // YOUTUBE URL
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
            console.log("youtube video id : ", video_id);

            // build url
            const curr_time = document.querySelector(".video-stream").currentTime.toFixed();

            time_stamped_url = "https://youtu.be/" + video_id + "?t=" + curr_time; /* example: https://youtu.be/RksaXQ4C1TA?t=123 */
        }
        // NETFLIX URL
        else if (window.location.href.includes("netflix.com/watch"))
        {
            const page_url = window.location.href;
            const pattern = /(?:title|watch)\/(\d+)/;
            const match = page_url.match(pattern);

            if (match && match[1])
            {
                video_id = match[1];
            }
            console.log("netflix video id : ", video_id);

            // build url
            const curr_time = document.querySelector('video').currentTime.toFixed();

            time_stamped_url = "https://www.netflix.com/watch/" + video_id + "?t=" + curr_time; // https://www.netflix.com/watch/70196252?t=349
        }
        else
        {
            console.log("What website are we on?");
        }

        return [time_stamped_url, video_id];
    }

    function Get_Screenshot()
    {
        if (window.location.href.includes("youtube.com/watch"))
        {
            var canvas = document.createElement('canvas');
            var video = document.querySelector('video');
            var ctx = canvas.getContext('2d');

            // Change the size here
            canvas.width = 640;
            canvas.height = 360;

            ctx.drawImage(video, 0, 0, 640, 360);

            var dataURL = canvas.toDataURL("image/png");
            dataURL = dataURL.replace(/^data:image\/(png|jpg);base64,/, "")

            //return [canvas.width, canvas.height, dataURL];
            return Promise.resolve([canvas.width, canvas.height, dataURL]);
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
                                resolve([img.width, img.height, image_data]);
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

    async function Subtitle_Dictionary_GetData() // This is where we pull all the data we want from the popup dictionary
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
                ankiFieldURL,
                ankiConnectUrl,
                ankiExampleSentenceSource }) =>
            {
                console.log("[Subtitle_Dictionary_GetData] Getting Data for Anki...");

                let card_data = {};
                let image_data = {};

                if (ankiFieldScreenshotSelected) 
                {
                    console.log("Fill ankiFieldScreenshotSelected");

                    const [image_width, image_height, captured_image_data] = await Get_Screenshot();

                    [video_url, video_id] = Get_Video_URL();

                    if (ankiFieldURL)
                    {
                        console.log("Fill ankiFieldURL");

                        card_data[ankiFieldURL] = video_url;
                    }

                    /* make the file name unique to avoid duplicates */
                    image_filename = 'Youtube2Anki_' + image_width + 'x' + image_height + '_' + video_id + '_' + Math.random().toString(36).substring(7) + '.png';

                    image_data['data'] = captured_image_data;
                    image_data['filename'] = image_filename;

                    card_data[ankiFieldScreenshotSelected] = '<img src="' + image_filename + '" />';
                }

                /* the popup dictionary window */
                var selected_word = "";
                const dict_context = document.getElementsByClassName('lln-dict-contextual');
                if (dict_context.length)
                {
                    /* Get word selected */
                    selected_word = dict_context[0].children[1].innerText;

                    if (ankiWordSelected)
                    {
                        console.log("Fill ankiWordSelected");

                        card_data[ankiWordSelected] = selected_word;
                        //Store_Word_In_Chrome(selected_word); // Used for highliting words used in cards
                    }

                    /* Get basic translation (this is top of the popup dic) */
                    if (ankiBasicTranslationSelected)
                    {
                        console.log("Fill ankiBasicTranslationSelected");

                        const translation_text = dict_context[0].innerText; // ex: '3k\nвпечатлениях\nimpressions'

                        const translation_text_without_most_common_number = translation_text.split("\n").slice(1); // removing the 3k, 2k, 4k, from the translation

                        card_data[ankiBasicTranslationSelected] = translation_text_without_most_common_number.join('<br>'); // replace line brea '\n' with <br> tag
                    }
                }

                /* Get full definition (this is the difinitions provided bellow the AI part) */
                if (ankiOtherTranslationSelected)
                {
                    const full_definition_element = document.getElementsByClassName('lln-dict-section-full');
                    if (full_definition_element.length)
                    {
                        console.log("Fill ankiOtherTranslationSelected");

                        card_data[ankiOtherTranslationSelected] = full_definition_element[0].innerHTML;
                    }
                }

                /* Get the subtitle text */
                if (ankiSubtitleSelected)
                {
                    console.log("Fill ankiSubtitleSelected");

                    const subtitle_element = document.getElementsByClassName('lln-subs');
                    if (subtitle_element.length)
                    {
                        const subtitle = subtitle_element[0].innerText;

                        card_data[ankiSubtitleSelected] = subtitle;

                        if (selected_word) // if we are storing the word too, we will highlight in the subtitle
                        {
                            // make selected word bold in the subtitles, might not work for all languages :(
                            card_data[ankiSubtitleSelected] = subtitle.replace(new RegExp(`(?<![\u0400-\u04ff])${selected_word}(?![\u0400-\u04ff])`, 'gi'), "<b>" + selected_word + "</b>");
                        }
                    }
                }

                /* Get the translation text (will fail if its not loaded) */
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
                // const ankiExampleSentenceSource = "Both";
                if (ankiExampleSentencesSelected)
                {
                    console.log("Fill ankiExampleSentencesSelected, from", ankiExampleSentenceSource);

                    const example_sentences_element = document.getElementsByClassName('lln-word-examples');
                    if (example_sentences_element.length)
                    {
                        var example_sentences_list = [];
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

                console.log("Card data to send to Anki : ", card_data);

                const anki_settings = {
                    "deck": ankiDeckNameSelected,
                    "note": ankiNoteNameSelected,
                    "url": ankiConnectUrl,
                }

                LLW_Send_Data_To_Anki(anki_settings, card_data, image_data);
            }
        );
    }

    function Add_Functions_To_Side_Bar_Subs()
    {
        console.log("[Add_Functions_To_Side_Bar_Subs] Adding all 'onclick' events...")

        var wait_for_subtitle_list = setInterval(function () 
        {
            const sub_list_element = document.getElementById("lln-vertical-view-subs");
            if (sub_list_element) 
            {
                clearInterval(wait_for_subtitle_list);

                const sub_list_element = document.getElementById("lln-vertical-view-subs");
                // Create a MutationObserver to observe changes in the div
                const sub_list_observer = new MutationObserver(function (mutations) 
                {
                    mutations.forEach(function (mutation) 
                    {
                        var elements_in_view = document.querySelectorAll('.in-scroll');

                        elements_in_view.forEach(function (element) 
                        {
                            if (!element.classList.contains("anki-onclick")) 
                            {
                                element.classList.add("anki-onclick");
                                element.onclick = function () 
                                {
                                    const parent_with_data_index = event.target.parentNode.parentNode;

                                    // Set current "data-index" as the "anki-active-sidebar-sub"
                                    //const index_id = current_element.getAttribute("data-index");
                                    //document.querySelector("[data-index=\"" + index_id + "\"]").classList.add("anki-active-sidebar-sub")

                                    if (parent_with_data_index.classList.contains("anki-active-sidebar-sub"))
                                        return;

                                    // we need to search for any element other than the current one that has 
                                    // the classname 'anki-active-sidebar-sub'
                                    let elem_with_anki_active = document.getElementsByClassName("anki-active-sidebar-sub")[0];
                                    geteleme

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
                const subs_list_config = { attributes: true, attributeFilter: ['class'] };

                sub_list_observer.observe(sub_list_element, subs_list_config);
            }
        }, 100);
    }

    function Store_Word_In_Chrome(word_to_store)
    {
        // Get the current list of stored words
        chrome.storage.local.get({ user_saved_words: [] }, function (result)
        {
            // Then we add the new word to the current stored list
            var words = result.user_saved_words;
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
        var wait_for_subtitles_to_show = setInterval(function ()
        {
            if (document.getElementById('lln-subs-content'))
            {
                clearInterval(wait_for_subtitles_to_show); // Stop timed interval

                console.log("[Highlight_Words] Highlighting words in subtitle...")

                var subtitle_observer = new MutationObserver(function (mutations)
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

            var subtitles = document.getElementsByClassName('lln-subs');
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

    function LLW_Send_Data_To_Anki(anki_settings, fields, image_data)
    {
        console.log("Destination : ", anki_settings);

        if (Object.keys(fields).length === 0)
        {
            show_error_message("No fields were set, please set a field in the settings");
            return;
        }

        console.log("fields : ", fields);

        var actions = [];

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

        const permission_data = {
            "action": "requestPermission",
            "version": 6,
        };

        fetch(anki_settings.url, {
            method: "POST",
            body: JSON.stringify(permission_data),
        })
            .then((res) => res.json())
            .then((data) =>
            {
                console.log(data);
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
        console.log(message);
    }

})();

