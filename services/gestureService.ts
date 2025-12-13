import { GestureRecognizer, FilesetResolver } from "@mediapipe/tasks-vision";

let gestureRecognizer: GestureRecognizer | null = null;
let isInitializing = false;
let lastTimestamp = -1;

export const initializeGestureRecognizer = async (): Promise<void> => {
  // Prevent multiple initialization attempts
  if (gestureRecognizer || isInitializing) return;
  isInitializing = true;

  try {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
    );

    try {
      // Attempt to initialize with GPU delegate first to avoid CPU XNNPACK logs and improve performance
      gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numHands: 1,
      });
      console.log("Gesture Recognizer initialized (GPU)");
    } catch (gpuError) {
      console.warn("GPU initialization failed, falling back to CPU:", gpuError);
      
      // Fallback to CPU if GPU fails. This works on all devices but may log XNNPACK info.
      gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
          delegate: "CPU",
        },
        runningMode: "VIDEO",
        numHands: 1,
      });
      console.log("Gesture Recognizer initialized (CPU)");
    }
  } catch (error) {
    console.error("Failed to initialize gesture recognizer:", error);
  } finally {
    isInitializing = false;
  }
};

export const detectGesture = (video: HTMLVideoElement): string | null => {
  if (!gestureRecognizer || !video || video.readyState < 2) return null;
  if (video.videoWidth === 0 || video.videoHeight === 0) return null;

  try {
    const nowInMs = Date.now();
    
    // MediaPipe requires strictly increasing timestamps
    if (nowInMs > lastTimestamp) {
      lastTimestamp = nowInMs;
      const results = gestureRecognizer.recognizeForVideo(video, nowInMs);
      
      if (results.gestures.length > 0 && results.gestures[0].length > 0) {
        return results.gestures[0][0].categoryName;
      }
    }
  } catch (e) {
    // Suppress frame processing errors
  }
  return null;
};