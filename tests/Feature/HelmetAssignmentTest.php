<?php

namespace Tests\Feature;

use App\Models\Helmet;
use App\Models\Rider;
use App\Models\User;
use App\Services\HelmetService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HelmetAssignmentTest extends TestCase
{
    use RefreshDatabase;

    protected HelmetService $helmetService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->helmetService = app(HelmetService::class);
    }

    /** @test */
    public function it_can_get_riders_without_helmets()
    {
        // Create a user and rider
        $user = User::factory()->create(['role' => 'rider']);
        $rider = Rider::factory()->create([
            'user_id' => $user->id,
            'status' => 'approved'
        ]);

        $ridersWithoutHelmets = $this->helmetService->getRidersWithoutHelmets();

        $this->assertCount(1, $ridersWithoutHelmets);
        $this->assertEquals($rider->id, $ridersWithoutHelmets->first()->id);
    }

    /** @test */
    public function it_can_assign_helmet_to_rider()
    {
        // Create a helmet
        $helmet = Helmet::factory()->create(['status' => 'available']);
        
        // Create a user and rider
        $user = User::factory()->create(['role' => 'rider']);
        $rider = Rider::factory()->create([
            'user_id' => $user->id,
            'status' => 'approved'
        ]);

        $assignment = $this->helmetService->assignHelmetToRider($helmet, $rider->id);

        $this->assertNotNull($assignment);
        $this->assertEquals($helmet->id, $assignment->helmet_id);
        $this->assertEquals($rider->id, $assignment->rider_id);
        $this->assertEquals('active', $assignment->status);
        
        // Check helmet status updated
        $helmet->refresh();
        $this->assertEquals('assigned', $helmet->status);
    }

    /** @test */
    public function it_throws_exception_when_assigning_unavailable_helmet()
    {
        $helmet = Helmet::factory()->create(['status' => 'maintenance']);
        $user = User::factory()->create(['role' => 'rider']);
        $rider = Rider::factory()->create([
            'user_id' => $user->id,
            'status' => 'approved'
        ]);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Helmet is not available for assignment.');

        $this->helmetService->assignHelmetToRider($helmet, $rider->id);
    }

    /** @test */
    public function it_shows_assigned_rider_name_in_helmet_details()
    {
        // Create helmet, user, rider, and assignment
        $helmet = Helmet::factory()->create(['status' => 'assigned']);
        $user = User::factory()->create(['role' => 'rider', 'name' => 'John Doe']);
        $rider = Rider::factory()->create([
            'user_id' => $user->id,
            'status' => 'approved'
        ]);
        
        // Create assignment
        $helmet->assignments()->create([
            'rider_id' => $rider->id,
            'status' => 'active',
            'assigned_at' => now()
        ]);

        // Load helmet with assignment
        $helmet->load('currentAssignment.rider.user');

        $this->assertNotNull($helmet->currentAssignment);
        $this->assertEquals('John Doe', $helmet->currentAssignment->rider->user->name);
    }
}