'use client';

import { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCcw, Check, VideoOff } from 'lucide-react';
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

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setStream(mediaStream);
      setError(null);
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Could not access camera. Please check permissions and try again.");
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
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo]);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const dataUrl = canvas.toDataURL('image/jpeg');
        onCapture(dataUrl);
      }
    }
  };

  const handleRetake = () => {
    onCapture('');
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <Card className="relative w-full aspect-video overflow-hidden rounded-lg shadow-inner bg-muted">
        {photo ? (
          <Image src={photo} alt="Captured photo" fill className="object-cover" />
        ) : (
          <video ref={videoRef} autoPlay playsInline className="h-full w-full object-cover" />
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
            <Button variant="secondary" onClick={handleRetake}>
              <RefreshCcw className="mr-2" /> Retake
            </Button>
            <Button variant="default" disabled>
              <Check className="mr-2" /> Photo Saved
            </Button>
          </>
        ) : (
          <Button type="button" onClick={handleCapture} disabled={!stream}>
            <Camera className="mr-2" /> Capture Photo
          </Button>
        )}
      </div>
    </div>
  );
}
