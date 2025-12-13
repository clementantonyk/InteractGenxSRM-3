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

    // Helper to suppress noisy TFLite logs during initialization
    const suppressConsole = () => {
      const originalInfo = console.info;
      const originalLog = console.log;
      
      const filter = (args: any[]) => {
         return typeof args[0] === 'string' && 
                (args[0].includes("Created TensorFlow Lite XNNPACK delegate for CPU") || 
                 args[0].includes("XNNPACK"));
      };

      console.info = (...args: any[]) => {
        if (filter(args)) return;
        originalInfo.apply(console, args);
      };
      
      console.log = (...args: any[]) => {
         if (filter(args)) return;
         originalLog.apply(console, args);
      };

      return () => { 
          console.info = originalInfo;
          console.log = originalLog;
      };
    };

    try {
      // Attempt to initialize with GPU delegate first
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
      // Fallback to CPU if GPU fails, suppressing the XNNPACK info log
      const restoreConsole = suppressConsole();
      try {
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
      } finally {
        restoreConsole();
      }
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