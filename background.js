chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) 
{
    if (request.action === 'captureVisibleTab') 
    {
        chrome.tabs.captureVisibleTab(null, { format: 'png' }, function (data_url) 
        {
            sendResponse({ imageData: data_url });
            console.log(data_url);
        });
    }
    
    // Return true to indicate that sendResponse will be called asynchronously
    return true;
});