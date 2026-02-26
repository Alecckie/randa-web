<?php

namespace Database\Factories;

use App\Models\Helmet;
use Illuminate\Database\Eloquent\Factories\Factory;

class HelmetFactory extends Factory
{
    protected $model = Helmet::class;

    public function definition(): array
    {
        return [
            'helmet_code' => 'HLM-' . strtoupper($this->faker->unique()->bothify('??###')),
            'qr_code' => 'QR_' . strtoupper($this->faker->unique()->bothify('??###')) . '_' . time(),
            'status' => $this->faker->randomElement(['available', 'assigned', 'maintenance', 'retired']),
            'current_branding' => $this->faker->optional()->company(),
        ];
    }

    public function available(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'available',
        ]);
    }

    public function assigned(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'assigned',
        ]);
    }

    public function maintenance(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'maintenance',
        ]);
    }

    public function retired(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'retired',
        ]);
    }
}