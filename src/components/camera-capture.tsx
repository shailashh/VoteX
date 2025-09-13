'use client';

import { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCcw, Check, VideoOff, SwitchCamera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Image from 'next/image';

interface CameraCaptureProps {
  onCapture: (imageDataUrl: string) => void;
  photo: string | null;
}

export function CameraCapture({ onCapture, photo }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const startCamera = async (mode: 'user' | 'environment') => {
    // Stop any existing stream before starting a new one
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode } });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setStream(mediaStream);
      setError(null);
    } catch (err) {
      console.error("Error accessing camera:", err);
      let errorMessage = "Could not access camera. Please check permissions and try again.";
      if ((err as Error).name === 'NotAllowedError') {
        errorMessage = "Camera access was denied. Please enable it in your browser settings.";
      } else if ((err as Error).name === 'NotFoundError') {
        errorMessage = `The ${mode === 'user' ? 'front' : 'rear'} camera could not be found on this device.`;
      }
      setError(errorMessage);
      setStream(null);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      if(videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  };

  useEffect(() => {
    if (!photo) {
      startCamera(facingMode);
    } else {
      stopCamera();
    }
    
    // Cleanup function to stop camera when component unmounts or photo is set
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo, facingMode]);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        // Flip the image horizontally if it's from the front camera
        if (facingMode === 'user') {
          context.translate(video.videoWidth, 0);
          context.scale(-1, 1);
        }
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const dataUrl = canvas.toDataURL('image/jpeg');
        onCapture(dataUrl);
      }
    }
  };

  const handleRetake = () => {
    onCapture('');
  };

  const handleSwitchCamera = () => {
    setFacingMode(prevMode => prevMode === 'user' ? 'environment' : 'user');
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <Card className="relative w-full max-w-md aspect-video overflow-hidden rounded-lg shadow-inner bg-muted">
        {photo ? (
          <Image src={photo} alt="Captured photo" fill className="object-cover" />
        ) : (
          <>
            <video ref={videoRef} autoPlay playsInline className="h-full w-full object-cover" style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'scaleX(1)' }} />
            {!photo && (
              <Button
                size="icon"
                variant="outline"
                className="absolute bottom-2 right-2 rounded-full h-10 w-10 bg-black/50 hover:bg-black/70 border-none text-white"
                onClick={handleSwitchCamera}
                type="button"
                disabled={!stream}
              >
                <SwitchCamera className="h-5 w-5" />
              </Button>
            )}
          </>
        )}
        {!photo && !stream && !error && (
            <div className="absolute inset-0 flex items-center justify-center flex-col text-muted-foreground">
                <Camera className="h-12 w-12 mb-2" />
                <p>Starting camera...</p>
            </div>
        )}
        {error && (
             <div className="absolute inset-0 flex items-center justify-center p-4">
                <Alert variant="destructive">
                    <VideoOff className="h-4 w-4" />
                    <AlertTitle>Camera Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </div>
        )}
      </Card>
      <canvas ref={canvasRef} className="hidden" />
      <div className="flex gap-4">
        {photo ? (
          <>
            <Button variant="outline" onClick={handleRetake}>
              <RefreshCcw className="mr-2 h-4 w-4" /> Retake
            </Button>
            <Button variant="secondary" disabled>
              <Check className="mr-2 h-4 w-4" /> Photo Saved
            </Button>
          </>
        ) : (
          <Button type="button" onClick={handleCapture} disabled={!stream}>
            <Camera className="mr-2 h-4 w-4" /> Capture Photo
          </Button>
        )}
      </div>
    </div>
  );
}
