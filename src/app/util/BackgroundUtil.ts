import { SelfieSegmentation } from "@mediapipe/selfie_segmentation";

let selfieSegmentation: SelfieSegmentation | null = null;

let videoStream: MediaStream | null = null;

let canvas: HTMLCanvasElement | null = null;

let processFrameTimeout: NodeJS.Timeout | null = null;

async function startSegmentation(
  videoElement: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  canvasCtx: CanvasRenderingContext2D,
  virtualBackground: HTMLImageElement
) {
  selfieSegmentation = new SelfieSegmentation({
    locateFile: (file) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
  });
  selfieSegmentation.setOptions({
    modelSelection: 1,
  });
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;

  async function processFrame() {
    if (selfieSegmentation) {
      await selfieSegmentation.send({ image: videoElement });

      processFrameTimeout = setTimeout(processFrame, 33);
    }
  }

  selfieSegmentation.onResults((results) => {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

    canvasCtx.drawImage(
      results.segmentationMask,
      0,
      0,
      canvas.width,
      canvas.height
    );

    //from here
    canvasCtx.globalCompositeOperation = "source-in";
    canvasCtx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

    canvasCtx.globalCompositeOperation = "destination-atop";
    canvasCtx.drawImage(virtualBackground, 0, 0, canvas.width, canvas.height);
    canvasCtx.restore();
  });

  await new Promise((resolve) => {
    processFrameTimeout = setTimeout(() => {
      processFrame().then(() => {
        resolve(true);
      });
    }, 500);
  });
}

const applyBackground = async (
  videoStream_: MediaStream,
  backgroundSrc: string
) => {
  videoStream = videoStream_;
  const videoElement = document.createElement("video");

  videoElement.srcObject = videoStream;

  videoElement.autoplay = true;
  videoElement.muted = true;
  videoElement.crossOrigin = "anonymous";
  canvas = document.createElement("canvas");
  const canvasContext = canvas.getContext("2d");

  const virtualBackground = new Image();
  virtualBackground.src = backgroundSrc;
  virtualBackground.crossOrigin = "anonymous";

  videoElement.onloadedmetadata = () => {
    if (canvas) {
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
    }
  };
  videoElement.play();

  const result = await new Promise((resolve) => {
    virtualBackground.onload = () => {
      // Start processing once the background is loaded
      if (canvasContext && canvas) {
        startSegmentation(
          videoElement,
          canvas,
          canvasContext,
          virtualBackground
        )
          .then(() => resolve(true))
          .catch(() => resolve(false));
      }
    };
    virtualBackground.onerror = () => {
      resolve(false);
    };
  });

  if (result) {
    const stream = canvas.captureStream(30);

    return stream.getVideoTracks()[0];
  } else {
    return videoStream_.getVideoTracks()[0];
  }
};

const closeProcess = () => {
  if (processFrameTimeout) {
    clearTimeout(processFrameTimeout);
  }

  if (selfieSegmentation) selfieSegmentation.close();
  videoStream?.getVideoTracks().forEach((track) => track.stop());
  videoStream = null;

  canvas = null;
  selfieSegmentation = null;
};

const BackgroundUtil = {
  applyBackground,
  closeProcess,
};

export default BackgroundUtil;
