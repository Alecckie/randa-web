<?php

namespace App\Services;

use App\Models\Rider;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Intervention\Image\Laravel\Facades\Image;
use Intervention\Image\Encoders\JpegEncoder;

class RiderDocumentService
{
    // Maximum file sizes in KB
    private const MAX_SIZES = [
        'national_id_front_photo' => 5120,    
        'national_id_back_photo' => 5120,       
        'passport_photo' => 2048,               
        'good_conduct_certificate' => 10240,    
        'motorbike_license' => 5120,            
        'motorbike_registration' => 5120,       
    ];

    // Image compression quality (1-100)
    private const IMAGE_QUALITY = 85;

    // Maximum image dimension (width/height)
    private const MAX_DIMENSION = 2000;

    /**
     * Upload and process a single document
     */
    public function uploadDocument(
        Rider $rider,
        string $fieldName,
        UploadedFile $file
    ): string {
        try {
            // Delete old file if exists
            if ($rider->$fieldName) {
                Storage::disk('public')->delete($rider->$fieldName);
            }

            // Determine if file is an image
            $isImage = in_array($file->getMimeType(), [
                'image/jpeg',
                'image/png',
                'image/jpg'
            ]);

            // Process and upload
            if ($isImage) {
                return $this->uploadAndCompressImage($file, $fieldName);
            } else {
                return $this->uploadPdf($file, $fieldName);
            }
        } catch (\Exception $e) {
            Log::error("Document upload failed for {$fieldName}", [
                'rider_id' => $rider->id,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Upload and compress image
     */
    private function uploadAndCompressImage(UploadedFile $file, string $fieldName): string
    {
        // Generate unique filename
        $filename = uniqid() . '_' . time() . '.jpg';
        $path = "riders/{$fieldName}/{$filename}";

        $image = Image::read($file);

        // Resize if too large
        if ($image->width() > self::MAX_DIMENSION || $image->height() > self::MAX_DIMENSION) {
            $image->scale(width: self::MAX_DIMENSION, height: self::MAX_DIMENSION);
        }

        // Encode to JPEG with quality
        $encodedImage = $image->encode(new JpegEncoder(quality: self::IMAGE_QUALITY));

        // Store the image
        Storage::disk('public')->put($path, $encodedImage);

        return $path;
    }

    /**
     * Upload PDF document
     */
    private function uploadPdf(UploadedFile $file, string $fieldName): string
    {
        $filename = uniqid() . '_' . time() . '.pdf';
        $path = "riders/{$fieldName}/{$filename}";

        Storage::disk('public')->putFileAs(
            "riders/{$fieldName}",
            $file,
            $filename
        );

        return $path;
    }

    /**
     * Validate document before upload
     */
    public function validateDocument(string $fieldName, UploadedFile $file): void
    {
        $maxSize = self::MAX_SIZES[$fieldName] ?? 5120;

        if ($file->getSize() > $maxSize * 1024) {
            throw new \InvalidArgumentException(
                "File size exceeds maximum allowed size of {$maxSize}KB"
            );
        }
    }

    /**
     * Get allowed mime types for a field
     */
    public function getAllowedMimeTypes(string $fieldName): array
    {
        if ($fieldName === 'good_conduct_certificate') {
            return ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
        }

        if (in_array($fieldName, ['motorbike_license', 'motorbike_registration'])) {
            return ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
        }

        return ['image/jpeg', 'image/png', 'image/jpg'];
    }

    /**
     * Delete document
     */
    public function deleteDocument(string $path): void
    {
        if (Storage::disk('public')->exists($path)) {
            Storage::disk('public')->delete($path);
        }
    }
}