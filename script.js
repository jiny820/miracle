const video = document.getElementById("camera");
const timerDisplay = document.getElementById("timer");
const fireworksCanvas = document.getElementById("fireworks");
const startRecordingButton = document.getElementById("startRecording");
const stopRecordingButton = document.getElementById("stopRecording");
const recordingVideo = document.getElementById("recording");

const fireworksCtx = fireworksCanvas.getContext("2d");
fireworksCanvas.width = window.innerWidth;
fireworksCanvas.height = window.innerHeight;

let timer = 60;
let interval;
let bothEyesDetected = false;
let mediaRecorder;
let recordedChunks = [];

// Load the FaceMesh model
async function setupFaceMesh() {
    const model = await faceLandmarksDetection.load(
        faceLandmarksDetection.SupportedPackages.mediapipeFacemesh
    );

    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;

    video.addEventListener("loadeddata", () => {
        detectFaces(model);
    });

    setupRecording(stream);
}

// Check if two people are present and their eyes are aligned
async function detectFaces(model) {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    document.body.appendChild(canvas);

    async function processFrame() {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const predictions = await model.estimateFaces({ input: canvas });

        if (predictions.length === 2) {
            const eyesAligned = checkEyeContact(predictions);
            if (eyesAligned) {
                if (!bothEyesDetected) {
                    bothEyesDetected = true;
                    startTimer();
                }
            } else {
                resetTimer();
            }
        } else {
            resetTimer();
        }

        requestAnimationFrame(processFrame);
    }

    processFrame();
}

// Check if eyes of two faces are aligned
function checkEyeContact(predictions) {
    const [face1, face2] = predictions;

    const leftEye1 = face1.annotations.leftEyeUpper0[0];
    const rightEye1 = face1.annotations.rightEyeUpper0[3];
    const leftEye2 = face2.annotations.leftEyeUpper0[0];
    const rightEye2 = face2.annotations.rightEyeUpper0[3];

    const face1Center = (leftEye1[0] + rightEye1[0]) / 2;
    const face2Center = (leftEye2[0] + rightEye2[0]) / 2;

    const eyeAlignmentThreshold = 20; // Pixel threshold for eye alignment
    return Math.abs(face1Center - face2Center) < eyeAlignmentThreshold;
}

// Start the 1-minute timer
function startTimer() {
    if (interval) clearInterval(interval);

    timer = 60;
    timerDisplay.textContent = `타이머: ${timer}초`;

    interval = setInterval(() => {
        timer -= 1;
        timerDisplay.textContent = `타이머: ${timer}초`;

        if (timer <= 0) {
            clearInterval(interval);
            showFireworks();
        }
    }, 1000);
}

// Reset the timer if eye contact is broken
function resetTimer() {
    if (interval) clearInterval(interval);
    bothEyesDetected = false;
    timer = 60;
    timerDisplay.textContent = "타이머: 60초";
}

// Display fireworks animation
function showFireworks() {
    const particles = [];

    for (let i = 0; i < 50; i++) {
        particles.push(createParticle());
    }

    function draw() {
        fireworksCtx.clearRect(0, 0, fireworksCanvas.width, fireworksCanvas.height);

        particles.forEach((particle, index) => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += 0.05; // Gravity

            fireworksCtx.fillStyle = particle.color;
            fireworksCtx.beginPath();
            fireworksCtx.arc(particle.x, particle.y, 3, 0, Math.PI * 2);
            fireworksCtx.fill();

            if (particle.y > fireworksCanvas.height) {
                particles.splice(index, 1);
            }
        });

        if (particles.length > 0) {
            requestAnimationFrame(draw);
        }
    }

    draw();
}

function createParticle() {
    const x = fireworksCanvas.width / 2;
    const y = fireworksCanvas.height / 2;
    const vx = Math.random() * 4 - 2;
    const vy = Math.random() * 4 - 2;
    const color = `hsl(${Math.random() * 360}, 100%, 50%)`;

    return { x, y, vx, vy, color };
}

// Setup video recording
function setupRecording(stream) {
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            recordedChunks.push(event.data);
        }
    };

    mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: "video/webm" });
        recordedChunks = [];
        const url = URL.createObjectURL(blob);
        recordingVideo.src = url;
    };
}

// Start recording
startRecordingButton.addEventListener("click", () => {
    mediaRecorder.start();
    startRecordingButton.disabled = true;
    stopRecordingButton.disabled = false;
});

// Stop recording
stopRecordingButton.addEventListener("click", () => {
    mediaRecorder.stop();
    startRecordingButton.disabled = false;
    stopRecordingButton.disabled = true;
});

// Initialize the application
setupFaceMesh();
