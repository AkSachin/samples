'use strict';

const dimensions = document.querySelector('#dimensions');
const video = document.querySelector('video');
let stream;

const qvgaButton = document.querySelector('#qvga');
const p180Button = document.querySelector('#p180');
const vgaButton = document.querySelector('#vga');
const p360Button = document.querySelector('#p360');
const hdButton = document.querySelector('#hd');
const fullHdButton = document.querySelector('#full-hd');
const cinemaFourKButton = document.querySelector('#cinemaFourK');
const televisionFourKButton = document.querySelector('#televisionFourK');
const eightKButton = document.querySelector('#eightK');

const videoblock = document.querySelector('#videoblock');
const messagebox = document.querySelector('#errormessage');

const widthInput = document.querySelector('div#width input');
const widthOutput = document.querySelector('div#width span');
const aspectLock = document.querySelector('#aspectlock');
const sizeLock = document.querySelector('#sizelock');
const pauseVideo = document.querySelector('#pausevideo');

const videoSelect = document.querySelector('select#videoSource');

let currentWidth = 0;
let currentHeight = 0;

// Ensure video element plays nicely and we'll flip it horizontally
video.autoplay = true;
video.playsInline = true;
video.style.transform = 'scaleX(-1)'; // flip horizontally by default

// --------- BUTTON HANDLERS (keeps original behavior) ----------
p180Button.onclick = () => { getMedia(p180Constraints); };
qvgaButton.onclick = () => { getMedia(qvgaConstraints); };
p360Button.onclick = () => { getMedia(p360Constraints); };
vgaButton.onclick = () => { getMedia(vgaConstraints); };
hdButton.onclick = () => { getMedia(hdConstraints); };
fullHdButton.onclick = () => { getMedia(fullHdConstraints); };
televisionFourKButton.onclick = () => { getMedia(televisionFourKConstraints); };
cinemaFourKButton.onclick = () => { getMedia(cinemaFourKConstraints); };
eightKButton.onclick = () => { getMedia(eightKConstraints); };

pauseVideo.onchange = () => {
  if (pauseVideo.checked) {
    video.pause();
  } else {
    video.play();
  }
};

// --------- CONSTRAINTS ----------
// Default constraints objects (unchanged except default fullHd has frameRate)
const p180Constraints = {
  video: { width: { exact: 320 }, height: { exact: 180 } }
};

const qvgaConstraints = {
  video: { width: { exact: 320 }, height: { exact: 240 } }
};

const p360Constraints = {
  video: { width: { exact: 640 }, height: { exact: 360 } }
};

const vgaConstraints = {
  video: { width: { exact: 640 }, height: { exact: 480 } }
};

const hdConstraints = {
  video: { width: { exact: 1280 }, height: { exact: 720 } }
};

// IMPORTANT: Default Full HD constraint set to EXACT 1920x1080 @ 60fps
const fullHdConstraints = {
  video: {
    width: { exact: 1920 },
    height: { exact: 1080 },
    frameRate: { exact: 60 }
  }
};

const televisionFourKConstraints = {
  video: { width: { exact: 3840 }, height: { exact: 2160 } }
};

const cinemaFourKConstraints = {
  video: { width: { exact: 4096 }, height: { exact: 2160 } }
};

const eightKConstraints = {
  video: { width: { exact: 7680 }, height: { exact: 4320 } }
};

// --------- DEVICE ENUM & STREAM HANDLING ----------
function gotDevices(deviceInfos) {
  // Handles being called several times to update labels. Preserve values.
  while (videoSelect.firstChild) {
    videoSelect.removeChild(videoSelect.firstChild);
  }
  for (let i = 0; i !== deviceInfos.length; ++i) {
    const deviceInfo = deviceInfos[i];
    if (deviceInfo.kind === 'videoinput') {
      const option = document.createElement('option');
      option.value = deviceInfo.deviceId;
      option.text = deviceInfo.label || `camera ${videoSelect.length + 1}`;
      videoSelect.appendChild(option);
    }
  }
}

function handleError(error) {
  console.log('navigator.MediaDevices.getUserMedia error: ', error && error.message, error && error.name);
}

navigator.mediaDevices.enumerateDevices().then(gotDevices).catch(handleError);

function gotStream(mediaStream) {
  stream = window.stream = mediaStream; // stream available to console
  video.srcObject = mediaStream;
  messagebox.style.display = 'none';
  videoblock.style.display = 'block';

  // Ensure flipped preview is applied even if styles changed elsewhere
  video.style.transform = 'scaleX(-1)';

  const track = mediaStream.getVideoTracks()[0];
  const constraints = track.getConstraints();
  console.log('Result constraints: ' + JSON.stringify(constraints));
  if (constraints && constraints.width && (constraints.width.exact || constraints.width.min)) {
    const val = constraints.width.exact || constraints.width.min;
    widthInput.value = val;
    widthOutput.textContent = val;
  }
}

function errorMessage(who, what) {
  const message = who + ': ' + what;
  messagebox.innerText = message;
  messagebox.style.display = 'block';
  console.log(message);
}

function clearErrorMessage() {
  messagebox.style.display = 'none';
}

function displayVideoDimensions(whereSeen) {
  if (video.videoWidth) {
    dimensions.innerText = 'Actual video dimensions: ' + video.videoWidth +
      'x' + video.videoHeight + 'px.';
    if (currentWidth !== video.videoWidth ||
      currentHeight !== video.videoHeight) {
      console.log(whereSeen + ': ' + dimensions.innerText);
      currentWidth = video.videoWidth;
      currentHeight = video.videoHeight;
    }
  } else {
    dimensions.innerText = 'Video not ready';
  }
}

video.onloadedmetadata = () => {
  displayVideoDimensions('loadedmetadata');
};

video.onresize = () => {
  displayVideoDimensions('resize');
};

// --------- width slider change uses applyConstraints as before ----------
function constraintChange(e) {
  widthOutput.textContent = e.target.value;
  const track = window.stream.getVideoTracks()[0];
  let constraints;
  if (aspectLock.checked) {
    constraints = {
      width: { exact: e.target.value },
      aspectRatio: { exact: video.videoWidth / video.videoHeight }
    };
  } else {
    constraints = { width: { exact: e.target.value } };
  }
  clearErrorMessage();
  console.log('applying ' + JSON.stringify(constraints));
  track.applyConstraints(constraints)
    .then(() => {
      console.log('applyConstraint success');
      displayVideoDimensions('applyConstraints');
    })
    .catch(err => {
      errorMessage('applyConstraints', err.name);
    });
}

widthInput.onchange = constraintChange;

sizeLock.onchange = () => {
  if (sizeLock.checked) {
    console.log('Setting fixed size');
    video.style.width = '100%';
  } else {
    console.log('Setting auto size');
    video.style.width = 'auto';
  }
};

// --------- getMedia enforces deviceId and logs constraints ----------
function getMedia(constraints) {
  if (stream) {
    stream.getTracks().forEach(track => {
      track.stop();
    });
  }

  clearErrorMessage();
  videoblock.style.display = 'none';

  // attach currently selected device (if any)
  constraints.video.deviceId = { ideal: videoSelect.value || undefined };

  console.log('getUserMedia constraints: ' + JSON.stringify(constraints));
  navigator.mediaDevices.getUserMedia(constraints)
    .then(gotStream)
    .catch(e => {
      errorMessage('getUserMedia', e.message || e.name);
    });
}

// --------- CALL DEFAULT: request 1080p@60 BY DEFAULT and flipped feed ----------
window.addEventListener('load', () => {
  // If the user has no device yet enumerated, ensure we re-enumerate before calling getMedia
  navigator.mediaDevices.enumerateDevices()
    .then(gotDevices)
    .catch(handleError)
    .finally(() => {
      // Try to get 1080p@60 as the default on page load
      getMedia(fullHdConstraints);
    });
});
