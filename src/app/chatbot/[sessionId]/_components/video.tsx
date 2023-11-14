"use client";
import React, { useEffect, useRef, useState } from "react";
import { api } from "~/trpc/react";
import { TextModal } from "~/app/_components/modal";

enum Recording_State {
  INITIAL,
  REQUESTION_PERMISSION,
  PERMISSION_DENIED,
  RECORDING,
  ERROR,
}

const RequestingVideoPermissionPopup = () => {
  return (
    <TextModal
      title="Requesting Video Permission"
      text="We need your video to transcribe your text. Please accept the popup on the top left of the screen."
    />
  );
};

const VideoDeniedPopup = () => {
  return (
    <TextModal
      title="Video Permission Denied"
      text="Please allow video access to use this feature. We can also deactivate video analysis completely."
    />
  );
};

export const Video = () => {
  const [state, setState] = useState(Recording_State.INITIAL);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { mutate, isLoading } = api.analysis.analyzeScreenshot.useMutation();
  const recordingIntervall = 10000;

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // helper function
  const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;

    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]!);
    }
    return window.btoa(binary);
  };
  // on initial render
  useEffect(() => {
    const setupVideo = async () => {
      try {
        const timeout = setTimeout(() => {
          setState(Recording_State.REQUESTION_PERMISSION);
        }, 250);
        if (!streamRef.current) {
          streamRef.current = await navigator.mediaDevices.getUserMedia({
            video: true,
          });
          videoRef.current!.srcObject = streamRef.current;
        }
        clearTimeout(timeout);
        setState(Recording_State.RECORDING);

        if (!intervalRef.current) {
          intervalRef.current = setInterval(async () => {
            const screenshot = await captureScreenshot();
            const base64String = arrayBufferToBase64(screenshot);
            mutate({ screenshot: base64String });
          }, recordingIntervall);
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "NotAllowedError") {
          return setState(Recording_State.PERMISSION_DENIED);
        } else {
          return setState(Recording_State.ERROR);
        }
      }
    };

    setupVideo();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  const captureScreenshot = (): Promise<ArrayBuffer> => {
    const videoElement = videoRef.current;
    if (!videoElement) {
      throw new Error("Video element is not available");
    }
    const canvas = document.createElement("canvas");
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const canvasContext = canvas.getContext("2d");
    if (!canvasContext) {
      throw new Error("Canvas context is not available");
    }
    canvasContext.drawImage(videoElement, 0, 0);
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob: Blob | null) => {
        if (blob) {
          const reader = new FileReader();
          reader.onloadend = () => {
            if (reader.result instanceof ArrayBuffer) {
              resolve(reader.result);
            } else {
              reject(new Error("Result is not an ArrayBuffer"));
            }
          };
          reader.onerror = () => reject(reader.error);
          reader.readAsArrayBuffer(blob);
        } else {
          reject(new Error("Canvas to Blob conversion failed"));
        }
      }, "image/png");
    });
  };
  return (
    <div>
      {state === Recording_State.REQUESTION_PERMISSION && (
        <RequestingVideoPermissionPopup />
      )}
      {state === Recording_State.PERMISSION_DENIED && <VideoDeniedPopup />}
      <video ref={videoRef} autoPlay playsInline></video>;
    </div>
  );
};