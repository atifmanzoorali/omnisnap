// Active port connections to keep service worker alive
const activePorts = new Map();

chrome.runtime.onConnect.addListener((port) => {
  console.log('Port connected:', port.name);
  
  activePorts.set(port.name, port);
  
  port.onMessage.addListener((message) => {
    console.log('Port received message:', message.action);
    
    if (message.action === 'CAPTURE_SELECTION') {
      captureAndCrop(message.coords, message.tabId)
        .then((result) => {
          port.postMessage({ action: 'CAPTURE_SELECTION_RESPONSE', response: result });
        })
        .catch((error) => {
          port.postMessage({ action: 'CAPTURE_SELECTION_RESPONSE', response: { success: false, error: error.message } });
        });
    }
  });

  port.onDisconnect.addListener(() => {
    console.log('Port disconnected:', port.name);
    activePorts.delete(port.name);
  });
});

// Keep service worker alive with a simple alarm
chrome.alarms.create('keep-alive', { periodInMinutes: 0.5 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keep-alive') {
    console.log('Service worker alive');
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request.action);
  
  if (request.action === 'COLOR_PICKED') {
    console.log('Color picked:', request.value);
    return;
  }
  
  if (request.action === 'CAPTURE_SELECTION') {
    captureAndCrop(request.coords, request.tabId)
      .then((result) => {
        console.log('Capture result:', result);
        sendResponse(result);
      })
      .catch((error) => {
        console.error('Capture error:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
});

async function captureAndCrop(coords, tabId) {
  console.log('Starting capture with coords:', coords, 'tabId:', tabId);
  
  try {
    let targetTabId = tabId;
    
    // Validate that the tab still exists
    if (targetTabId) {
      try {
        const tab = await chrome.tabs.get(targetTabId);
        console.log('Tab validated:', tab.id, tab.title);
      } catch (e) {
        console.log('Tab no longer exists, finding current active tab');
        targetTabId = null;
      }
    }
    
    // If no valid tabId, query for current active tab
    if (!targetTabId) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        throw new Error('No active tab found');
      }
      targetTabId = tab.id;
      console.log('Using current active tab:', targetTabId);
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log('Capturing tab:', targetTabId);
    
    const tab = await chrome.tabs.get(targetTabId);
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: 'png',
      quality: 100
    });

    if (chrome.runtime.lastError) {
      console.error('CaptureVisibleTab error:', chrome.runtime.lastError.message);
      throw new Error(chrome.runtime.lastError.message);
    }

    if (!dataUrl) {
      throw new Error('Unable to capture - tab may be restricted or not loaded');
    }

    console.log('Screenshot captured, size:', dataUrl.length);

    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const img = await createImageBitmap(blob);

    const canvas = new OffscreenCanvas(coords.w, coords.h);
    const ctx = canvas.getContext('2d');

    ctx.drawImage(
      img,
      coords.x, coords.y, coords.w, coords.h,
      0, 0, coords.w, coords.h
    );

    const croppedBlob = await canvas.convertToBlob({
      type: 'image/png'
    });

    const croppedDataUrl = await blobToDataUrl(croppedBlob);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `screenshot-${timestamp}.png`;

    console.log('Starting download:', filename);
    
    await chrome.downloads.download({
      url: croppedDataUrl,
      filename: filename,
      saveAs: true
    });

    if (chrome.runtime.lastError) {
      console.error('Download error:', chrome.runtime.lastError.message);
      throw new Error(chrome.runtime.lastError.message);
    }

    console.log('Download initiated successfully');
    return { success: true };
  } catch (error) {
    console.error('CaptureAndCrop error:', error.message);
    return { success: false, error: error.message };
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}