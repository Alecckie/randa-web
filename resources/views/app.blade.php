<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <title inertia>{{ config('app.name', 'Laravel') }}</title>
        
        <!-- Favicon -->
        <link rel="icon" href="{{ asset('/assets/favicon.png') }}" type="image/x-icon">

        <!-- Fonts -->
        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=figtree:400,500,600&display=swap" rel="stylesheet" />

        <!-- SEO Meta Tags -->
        <meta name="description" content="Randa app is an innovative advertising service leveraging branded rider helmets to reach pillion passengers. Advertisers customize helmet designs, and riders earn daily by marketing ads throughout urban areas. Boost your brand visibility with Randa's unique helmet advertising platform.">
        <meta name="keywords" content="helmet advertising, rider marketing, urban advertising, branded helmets, pillion passenger ads, daily paid riders, outdoor advertising, Randa app, advertiser platform, brand visibility, innovative advertising, rider branding, street marketing, local advertising, mobile ads">
        <meta name="author" content="Randa App">
        <meta property="og:title" content="{{ config('app.name', 'Randa App') }}">
        <meta property="og:description" content="Advertise your brand with Randa app using branded rider helmets. Riders market your ads daily to pillion passengers, increasing urban reach and brand awareness.">
        <meta property="og:type" content="website">
        <meta property="og:url" content="{{ url()->current() }}">
        <meta property="og:image" content="{{ asset('/assets/favicon.png') }}">
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:title" content="{{ config('app.name', 'Randa App') }}">
        <meta name="twitter:description" content="Randa app connects advertisers with riders who market branded helmet ads to pillion passengers, boosting brand exposure in urban areas.">
        <meta name="twitter:image" content="{{ asset('/assets/favicon.png') }}">
         <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        
        <!-- Scripts -->
        @routes
        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/Pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
