<?php

namespace Database\Factories;

use App\Models\Rider;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class RiderFactory extends Factory
{
    protected $model = Rider::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'national_id' => $this->faker->unique()->numerify('########'),
            'national_id_front_photo' => 'uploads/national_id_front_' . $this->faker->uuid() . '.jpg',
            'national_id_back_photo' => 'uploads/national_id_back_' . $this->faker->uuid() . '.jpg',
            'passport_photo' => 'uploads/passport_' . $this->faker->uuid() . '.jpg',
            'good_conduct_certificate' => 'uploads/conduct_' . $this->faker->uuid() . '.pdf',
            'motorbike_license' => 'uploads/license_' . $this->faker->uuid() . '.jpg',
            'motorbike_registration' => 'uploads/registration_' . $this->faker->uuid() . '.jpg',
            'mpesa_number' => $this->faker->phoneNumber(),
            'next_of_kin_name' => $this->faker->name(),
            'next_of_kin_phone' => $this->faker->phoneNumber(),
            'signed_agreement' => 'uploads/agreement_' . $this->faker->uuid() . '.pdf',
            'status' => $this->faker->randomElement(['pending', 'approved', 'rejected']),
            'daily_rate' => $this->faker->randomFloat(2, 500, 2000),
            'wallet_balance' => $this->faker->randomFloat(2, 0, 10000),
        ];
    }

    public function approved(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'approved',
        ]);
    }

    public function pending(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'pending',
        ]);
    }

    public function rejected(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'rejected',
        ]);
    }
}