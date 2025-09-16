'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, RefreshCcw, Check, VideoOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Image from 'next/image';

interface CameraCaptureProps {
  onCapture: (imageDataUrl: string) => void;
  photo: string | null;
  title: string;
}

export function CameraCapture({ onCapture, photo, title }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraInitializing, setIsCameraInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setIsCameraInitializing(true);
    setError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera not supported on this browser.");
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError(null);
    } catch (err) {
      console.error("Error accessing camera:", err);
      let errorMessage = "Could not access camera. Please check permissions and try again.";
      if ((err as Error).name === 'NotAllowedError') {
        errorMessage = "Camera access was denied. Please enable it in your browser settings.";
      } else if ((err as Error).name === 'NotFoundError' || (err as Error).name === 'OverconstrainedError') {
        errorMessage = `The rear camera could not be found on this device.`;
      }
      setError(errorMessage);
    } finally {
      setIsCameraInitializing(false);
    }
  }, [stopCamera]);

  useEffect(() => {
    if (!photo) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [photo, startCamera, stopCamera]);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const targetWidth = 1024; // A reasonable width for quality
      const scale = targetWidth / video.videoWidth;
      canvas.width = targetWidth;
      canvas.height = video.videoHeight * scale;
      
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        // Use quality 1.0 for maximum quality
        const dataUrl = canvas.toDataURL('image/jpeg', 1.0); 
        onCapture(dataUrl);
      }
    }
  };

  const handleRetake = () => {
    onCapture('');
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <h3 className="font-semibold text-center">{title}</h3>
      <Card className="relative w-full max-w-md aspect-video overflow-hidden rounded-lg shadow-inner bg-muted">
        {photo ? (
          <Image src={photo} alt="Captured photo" fill className="object-cover" />
        ) : (
          <video ref={videoRef} autoPlay playsInline className="h-full w-full object-cover" />
        )}
        {!photo && isCameraInitializing && !error && (
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
            <Button variant="outline" onClick={handleRetake} type="button">
              <RefreshCcw className="mr-2 h-4 w-4" /> Retake
            </Button>
            <Button variant="secondary" disabled>
              <Check className="mr-2 h-4 w-4" /> Photo Saved
            </Button>
          </>
        ) : (
          <Button type="button" onClick={handleCapture} disabled={isCameraInitializing || !!error}>
            <Camera className="mr-2 h-4 w-4" /> Capture Photo
          </Button>
        )}
      </div>
    </div>
  );
}
