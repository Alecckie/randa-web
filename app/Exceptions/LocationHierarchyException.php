<?php
namespace App\Exceptions;

use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LocationHierarchyException extends Exception
{
    public static function invalidHierarchy(string $details = ''): self
    {
        $message = 'The provided location hierarchy is invalid.';
        if ($details) {
            $message .= ' ' . $details;
        }
        
        return new self($message, 422);
    }

    public static function locationNotFound(string $type, int $id): self
    {
        return new self("The {$type} with ID {$id} was not found.", 404);
    }

    public static function countyNotFound(int $countyId): self
    {
        return self::locationNotFound('county', $countyId);
    }

    public static function subcountyNotFound(int $subcountyId): self
    {
        return self::locationNotFound('subcounty', $subcountyId);
    }

    public static function wardNotFound(int $wardId): self
    {
        return self::locationNotFound('ward', $wardId);
    }

    public static function subcountyNotInCounty(int $subcountyId, int $countyId): self
    {
        return self::invalidHierarchy(
            "SubCounty {$subcountyId} does not belong to county {$countyId}."
        );
    }

    public static function wardNotInSubCounty(int $wardId, int $subcountyId): self
    {
        return self::invalidHierarchy(
            "Ward {$wardId} does not belong to subcounty {$subcountyId}."
        );
    }

    /**
     * Render the exception as an HTTP response.
     */
    public function render(Request $request): JsonResponse
    {
        return response()->json([
            'error' => 'Location Hierarchy Error',
            'message' => $this->getMessage(),
            'code' => $this->getCode()
        ], $this->getCode() ?: 500);
    }
}