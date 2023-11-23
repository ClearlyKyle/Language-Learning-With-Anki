(function ()
{
    /* This runs on all "youtube.com/watch" web pages */
    console.log("----- [content_script.js] LOADED");

    /* YOUTUBE */
    if (window.location.href.includes("youtube.com/watch"))
    {
        console.log("[MAIN] Adding button to youtube video")

        // we loop until the element 'lln-full-dict' is available 
        // 1st : lln-full-dict-wrap    is loaded with no elements, we abserve until they exist
        // 2nd : lln-full-dict         is loaded the first time a word is clicked to translate

        var check_dict_wrap_exists = setInterval(function ()
        {
            if (document.querySelector('.lln-full-dict-wrap') != null)
            {
                clearInterval(check_dict_wrap_exists);
                console.log("'.lln-full-dict-wrap' has been found...")

                Add_Functions_To_Side_Bar_Subs();
                //Highlight_Words();

                var dict_wrap_observer = new MutationObserver(function (mutations)
                {
                    for (let mutation of mutations)
                    {
                        // either subtitle dictionary clicked or the side bar dictionary first clicked
                        if (mutation.addedNodes[1].className == 'lln-full-dict' || mutation.addedNodes[1].className == 'lln-full-dict right')
                        {
                            Set_Up_Anki_Button_Observer();

                            dict_wrap_observer.disconnect()
                        }
                    }
                });
                dict_wrap_observer.observe(document.getElementsByClassName('lln-full-dict-wrap')[0],
                    {
                        attributes: true,
                        childList: true
                    }
                );
            }
        }, 100); // check every 100ms 
    }

    function Set_Up_Anki_Button_Observer()
    {
        if (document.getElementsByClassName('lln-full-dict').length)
        {
            console.log("[Set_Up_Anki_Button_Observer] 'lln-full-dict' has been found! Start Observer")
            Add_Anki_Button_To_Popup_Dictionary()

            var dictionary_observer = new MutationObserver(function (mutations)
            {
                for (let mutation of mutations)
                {
                    if (mutation.removedNodes.length === 2)
                    {
                        console.log("[MutationObserver] Adding ANKI option")
                        Add_Anki_Button_To_Popup_Dictionary()
                        return
                    }
                }
            });
            // keep your eyes open for the next time we see the dictionary open
            dictionary_observer.observe(document.getElementsByClassName('lln-full-dict-wrap')[0], { attributes: true, childList: true });
            console.log("[Set_Up_Anki_Button_Observer] 'lln-full-dict-wrap' Observer has been set!")
        }
    }

    function Add_Anki_Button_To_Popup_Dictionary()
    {
        const btn_location = document.getElementsByClassName('lln-external-dicts-container')[0];
        const highlight_location = document.getElementsByClassName('lln-word-save-buttons-wrap')[0];

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

/*
        const word_element = document.getElementsByClassName('lln-dict-contextual');
        if (word_element.length) // If there is a valid word to store then add buttons
        {
            btn_location.append(anki_div, remove_highlight)
        }
        else
        {
            // We have clicked a word with no translation (english word?)
            console.log("[Add_Anki_Button_To_Popup_Dictionary] Word without translation");
            btn_location.append(anki_div, remove_highlight)
        }
*/
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

        // add "active" to the current "anki-active-sidebar-sub", "anki-active-sidebar-sub" is set when we
        // click on a word in the sidebar
        const active_side_bar_subtitile = document.getElementsByClassName("anki-active-sidebar-sub");

        if(active_side_bar_subtitile.length > 0)
        {            
            active_side_bar_subtitile[0].classList.add("active");
    
            // jump video to the subtitle with the word we want
            document.querySelector(".lln-vertical-view-sub.lln-with-play-btn.anki-active-sidebar-sub").click();
    
            // after the video pauses, we take the screenshot
            const canvas = document.createElement('canvas');
            const video = document.querySelector('video');
            const ctx = canvas.getContext('2d');
    
            console.log("[Handle_Jump_To_Subtitle_With_Sidebar] pause the video!")
            video.pause();
    
            var checkExist = setInterval(function ()
            {
                // Wait for the video to jump to time and be paused...
                console.log("[Handle_Jump_To_Subtitle_With_Sidebar] Video state = " + video.readyState)
                if (video.readyState === 4)
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

    function Get_YouTube_VideoID()
    {
        var video_id = window.location.search.split('v=')[1];
        var ampersandPosition = video_id.indexOf('&');

        console.log("raw video_id : ", video_id);
        if (ampersandPosition != -1)
        {
            return video_id.substring(0, ampersandPosition);
        }
        return "FailedToGetID"
    }

    function Subtitle_Dictionary_GetData()
    {
        // This is where we pull all the data we want from the popup dictionary
        console.log("[Subtitle_Dictionary_GetData] Getting Data for Anki...")

        var canvas = document.createElement('canvas');
        var video = document.querySelector('video');
        var ctx = canvas.getContext('2d');

        // Change the size here
        canvas.width = 640;
        canvas.height = 360;

        ctx.drawImage(video, 0, 0, 640, 360);

        var dataURL = canvas.toDataURL("image/png");
        dataURL = dataURL.replace(/^data:image\/(png|jpg);base64,/, "")

        // making time stamped url
        var videoId = Get_YouTube_VideoID();
        var current_time = document.querySelector(".video-stream").currentTime.toFixed();
        var youtube_share_url = "https://youtu.be/" + videoId + "?t=" + current_time; /* example: https://youtu.be/RksaXQ4C1TA?t=123 */

        /* make the file name unique to avoid duplicates */
        const imageFilename = 'Youtube2Anki_' + canvas.width + 'x' + canvas.height + '_' + videoId + '_' + Math.random().toString(36).substring(7) + '.png';

        /* Getting translation of the word selected */
        // make sure the translation language is set to english
        const dict_context = document.getElementsByClassName('lln-dict-contextual')
        if (dict_context.length)
        {
            var word = dict_context[0].children[1].innerText;
            var translation_text = dict_context[0].innerText; // ex: '3k\nвпечатлениях\nimpressions'
            var translation_text_without_most_common_number = translation_text.split("\n").slice(1);// removing the 3k, 2k, 4k, from the translation
            //var translation = translation_text_without_most_common_number.join('\n').replace(/(?:\r\n|\r|\n)/g, '<br>'); // replace line brea '\n' with <br> tag
            var translation = translation_text_without_most_common_number.join('<br>'); // replace line brea '\n' with <br> tag
        } 
        else
        {
            /* English word is clicked */
            if(document.getElementsByClassName('lln-highlighted-word'))
            {
                var word = document.getElementsByClassName('lln-highlighted-word')[0].innerText; // NOTE : Could we just do this for any word selected?
            }
            else
            {
                var word = ""
            }

            var translation = ""
        }

        if (document.getElementsByClassName('lln-dict-section-full').length)
        {
            //var extra_definitions = document.getElementsByClassName('lln-dict-section-full')[0].innerText.replace(/(?:\r\n|\r|\n)/g, '<br>');
            var extra_definitions = document.getElementsByClassName('lln-dict-section-full')[0].innerHTML;
        }

        //console.log("Video URL (and time stamp) =", youtube_share_url)

        // make selected word bold in the subtitles, might not work for all languages :(
        var subtitle = document.getElementsByClassName('lln-subs')[0].innerText;
        subtitle = subtitle.replace(new RegExp(`(?<![\u0400-\u04ff])${word}(?![\u0400-\u04ff])`, 'gi'), "<b>" + word + "</b>");

        // get 2nd language translation (this appears under the main subtitle)
        // 	this is set with the "Translation language" in the options of LLWYT
        if (document.getElementsByClassName('lln-whole-title-translation').length)
        {
            //"var" is FUNCTION scoped and "let" is BLOCK scoped
            var subtitle_translation = document.getElementsByClassName('lln-whole-title-translation')[0].innerText;
            //let subtitle_translation = document.getElementsByClassName('lln-whole-title-translation')[0].innerText.replace('\n', ' ');
        }
        else
        {
            var subtitle_translation = ""
        }

        chrome.storage.local.get("ankiExampleSentenceSource", ({ ankiExampleSentenceSource }) =>
        {
            console.log("Getting example setting toggle: ", ankiExampleSentenceSource)
            // Getting Example sentences 
            // There are two sets of example sentences, so we can choose between which set we want
            // TODO : default to one or none if there is nothing
            var example_sentences = "";
            const example_sentences_element = document.getElementsByClassName('lln-word-examples');
            if (example_sentences_element.length)
            {
                // We default to using current
                const current_or_tatoeba = ankiExampleSentenceSource === "Tatoeba" ? 1 : 0;

                const example_sentences_list = example_sentences_element[current_or_tatoeba];
                if(example_sentences_list)
                {
                    const all_examples = example_sentences_list.children;
                    for (var i = 1; i != all_examples.length; i++)
                    {
                        example_sentences += all_examples[i].innerText + "<br>";
                    }
                }
            }

            var fields = {
                "image-filename": imageFilename || "",
                "image-data": dataURL || "",
                "subtitle": subtitle || "",
                "subtitle-translation": subtitle_translation || "",
                "word": word.toLowerCase() || "", // better here to help with reg
                "basic-translation": translation || "",
                "extra-translation": extra_definitions || "",
                "url": '<a href="' + youtube_share_url + '">Video Link</a>' || "",
                "example-sentences": example_sentences || "",
            };

            // console.log("Fields before passing to Anki")
            // console.log({ fields });

            LLW_Send_Data_To_Anki(fields);
        });
    }

    function Add_Functions_To_Side_Bar_Subs()
    {
        // We have the side bar dictionary open
        console.log("[Add_Functions_To_Side_Bar_Subs] Adding all 'onclick' events...")

        var wait_for_subtitle_list = setInterval(function () 
        {
            const sub_list_element = document.getElementById("lln-vertical-view-subs");
            if (sub_list_element) 
            {
                clearInterval(wait_for_subtitle_list);
                
                const sub_list_element = document.getElementById("lln-vertical-view-subs");
                // Create a MutationObserver to observe changes in the div
                const sub_list_observer = new MutationObserver(function(mutations) 
                {
                    mutations.forEach(function(mutation) 
                    {
                        var elements_in_view = document.querySelectorAll('.in-scroll');

                        elements_in_view.forEach(function(element) 
                        {
                            if (!element.classList.contains("anki-onclick")) 
                            {
                                element.classList.add("anki-onclick");
                                element.onclick = function() 
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

                                    if(elem_with_anki_active)
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

    /* ----------------------------------------------------------------------------------------------------------- */
    function LLW_Send_Data_To_Anki(data)
    {
        console.log("[LLW_Send_Data_To_Anki] Sending to Anki...")

        Store_Word_In_Chrome(data['word']);

        chrome.storage.local.get(
            ['ankiDeckNameSelected', 'ankiNoteNameSelected', 'ankiFieldScreenshotSelected', 'ankiSubtitleSelected', 'ankiSubtitleTranslation',
                'ankiWordSelected', "ankiBasicTranslationSelected", "ankiExampleSentencesSelected", "ankiOtherTranslationSelected", "ankiFieldURL", "ankiConnectUrl", "ankiExampleSentenceSource"],
            ({ ankiDeckNameSelected, ankiNoteNameSelected, ankiFieldScreenshotSelected, ankiSubtitleSelected, ankiSubtitleTranslation,
                ankiWordSelected, ankiBasicTranslationSelected, ankiExampleSentencesSelected, ankiOtherTranslationSelected, ankiFieldURL, ankiConnectUrl, ankiExampleSentenceSource }) =>
            {
                url = ankiConnectUrl || 'http://localhost:8765';
                model = ankiNoteNameSelected || 'Basic';
                deck = ankiDeckNameSelected || 'Default';

                //console.log({
                //        ankiDeckNameSelected, ankiNoteNameSelected, ankiFieldScreenshotSelected, ankiSubtitleSelected, ankiSubtitleTranslation,
                //        ankiWordSelected, ankiBasicTranslationSelected, ankiExampleSentencesSelected, ankiOtherTranslationSelected, ankiFieldURL,
                //        ankiConnectUrl, ankiExampleSentenceSource
                //    });

                console.log("Image File Name: ", data['image-filename'])
                console.log("Deck Name: ", model)
                console.log("Model Name: ", deck)

                var fields = {
                    [ankiFieldScreenshotSelected]: '<img src="' + data['image-filename'] + '" />',
                    [ankiSubtitleSelected]: data['subtitle'],
                    [ankiSubtitleTranslation]: data['subtitle-translation'],
                    [ankiWordSelected]: data['word'],
                    [ankiBasicTranslationSelected]: data['basic-translation'],
                    [ankiOtherTranslationSelected]: data['extra-translation'],
                    [ankiFieldURL]: data['url'],
                    [ankiExampleSentencesSelected]: data['example-sentences']
                };

                console.log(fields)

                var body = {
                    "action": "multi",
                    "params": {
                        "actions": [
                            {
                                "action": "storeMediaFile",
                                "params": {
                                    "filename": data['image-filename'],
                                    "data": data['image-data']
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
                    .then((data) =>
                    {
                        console.log(data);
                        fetch(url, {
                            method: "POST",
                            body: JSON.stringify(body),
                        })
                            .then((res) => res.json())
                            .then((data) =>
                            {
                                console.log("Fetch Return:")
                                console.log(data)
                                if (data.length > 1)
                                {
                                    // https://jsfiddle.net/2qasgcfd/3/
                                    // https://github.com/apvarun/toastify-js
                                    if (data[1].result === null)
                                        ShowErrorMessage("Error! " + data[1].error);
                                    else
                                        ShowSucessMessage("Sucessfully added to ANKI");

                                }
                            })
                            .catch((error) =>
                            {
                                /* show error message */
                                ShowErrorMessage("Error! " + error);
                            })
                    }).catch((error) =>
                    {
                        /* show error message */
                        ShowErrorMessage("Error! " + error);
                    });
                console.log("[LLW_Send_Data_To_Anki] Send to ANKI complete!");
            }
        );
    }

    function ShowSucessMessage(message)
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
    function ShowErrorMessage(message)
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

