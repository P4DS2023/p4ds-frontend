import React, { useEffect, useRef, useState } from 'react';
import { ImageAnnotatorClient } from '@google-cloud/vision';

const likelihoodName = [
  'UNKNOWN',
  'VERY_UNLIKELY',
  'UNLIKELY',
  'POSSIBLE',
  'LIKELY',
  'VERY_LIKELY',
];

export const LiveVideoWithFaceDetection: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [screenshot, setScreenshot] = useState<string | null>(null);

  useEffect(() => {
    const getUserMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing the camera:', error);
      }
    };

    getUserMedia();

    const captureInterval = setInterval(() => {
      captureScreenshot();
      detectFacesInScreenshot();
    }, 10000); // Capture a screenshot every 10 seconds

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        const tracks = stream.getTracks();
        tracks.forEach((track) => track.stop());
      }
      clearInterval(captureInterval);
    };
  }, []);

  const captureScreenshot = () => {
    if (videoRef.current && canvasRef.current) {
      const videoElement = videoRef.current;
      const canvasElement = canvasRef.current;
      canvasElement.width = videoElement.videoWidth;
      canvasElement.height = videoElement.videoHeight;
      const ctx = canvasElement.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoElement, 0, 0, videoElement.videoWidth, videoElement.videoHeight);
        const dataURL = canvasElement.toDataURL('image/png');
        setScreenshot(dataURL);
      }
    }
  };

  const detectFacesInScreenshot = async () => {
    if (screenshot) {
      const client = new ImageAnnotatorClient({
        keyFilename: '/Users/gimdonghwa/Downloads/P4DS/vision/p4ds-team-7-2023fall-57deb7499253.json', // Replace with your JSON credentials
      });

      try {

        const [result] = await client.faceDetection(screenshot);
        const faces = result.faceAnnotations;

        for (const face of faces) {
          // Get the anger likelihood and format it
          const angerLikelihood = likelihoodName[face.angerLikelihood];
          const text = `Anger Likelihood: ${angerLikelihood}`;

          // Draw the text on the image
          drawTextOnImage(screenshot, text, face.boundingPoly.vertices[0].x, face.boundingPoly.vertices[0].y);
        }
      } catch (error) {
        console.error('Error detecting faces:', error);
      }
    }
  };

  const drawTextOnImage = (imageDataUrl: string, text: string, x: number, y: number) => {
    const img = new Image();
    img.src = imageDataUrl;
    img.onload = () => {
      const canvasElement = canvasRef.current;
      const ctx = canvasElement?.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        ctx.font = '16px Arial';
        ctx.fillStyle = 'red';
        ctx.fillText(text, x, y - 10); // Adjust position for text
        const updatedImageDataUrl = canvasElement.toDataURL('image/png');
        setScreenshot(updatedImageDataUrl);
      }
    };
  };

  return (
    <div>
      <h1>Live Video with Face Detection</h1>
      <video ref={videoRef} autoPlay playsInline></video>
      {screenshot && (
        <div>
          <h2>Screenshot</h2>
          <img src={screenshot} alt="Screenshot" />
        </div>
      )}
      <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
    </div>
  );
};
