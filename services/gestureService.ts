import { GestureRecognizer, FilesetResolver } from "@mediapipe/tasks-vision";

let gestureRecognizer: GestureRecognizer | null = null;
let lastTimestamp = -1;

export const initializeGestureRecognizer = async (): Promise<void> => {
  if (gestureRecognizer) return;

  try {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
    );

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
  } catch (error) {
    console.error("Failed to initialize gesture recognizer:", error);
  }
};

export const detectGesture = (video: HTMLVideoElement): string | null => {
  if (!gestureRecognizer || !video || video.readyState < 2) return null;

  try {
    const nowInMs = Date.now();
    
    // MediaPipe 'VIDEO' mode requires strictly increasing timestamps
    if (nowInMs > lastTimestamp) {
      lastTimestamp = nowInMs;
      const results = gestureRecognizer.recognizeForVideo(video, nowInMs);
      
      if (results.gestures.length > 0 && results.gestures[0].length > 0) {
        // Return the category name of the highest confidence gesture
        return results.gestures[0][0].categoryName;
      }
    }
  } catch (e) {
    // Suppress frame processing errors to prevent console spam
  }
  return null;
};