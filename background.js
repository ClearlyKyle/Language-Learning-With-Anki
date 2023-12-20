chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) 
{
    if (request.action === 'captureVisibleTab') 
    {
        chrome.tabs.query({active : true}, function(tab) 
        {
            console.log('Tab id : ', tab.id);
      
            // Capture the visible tab
            chrome.tabs.captureVisibleTab(null, { format: 'png' }, function (data_url) 
            {
                // Send the captured image data back to the content script
                sendResponse({ imageData: data_url });
                console.log(data_url);
            });
        });

      // Return true to indicate that sendResponse will be called asynchronously
      return true;
    }
});