import React, { useState } from 'react';
import { Link } from '@inertiajs/react';

export default function Homepage() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <div className="min-h-screen bg-white">
            {/* Navigation */}
            <nav className="bg-white/95 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <img src="/assets/randalogo_landscape320x200.png" alt="Randa Logo" className="h-10 w-auto" />
                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center space-x-8">
                            <a href="#how-it-works" className="text-slate-600 hover:text-slate-900 transition-colors duration-200">
                                How It Works
                            </a>
                            <a href="#contact" className="text-slate-600 hover:text-slate-900 transition-colors duration-200">
                                Contact Us
                            </a>
                            <a href="#terms" className="text-slate-600 hover:text-slate-900 transition-colors duration-200">
                                Terms & Conditions
                            </a>
                            <div className="flex items-center space-x-4">
                                <Link
                                    href="/login"
                                    className="text-slate-600 hover:text-slate-900 transition-colors duration-200 font-medium"
                                >
                                    Login
                                </Link>
                                <Link
                                    href="/register"
                                    className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                >
                                    Get Started
                                </Link>
                            </div>
                        </div>

                        {/* Mobile menu button */}
                        <div className="md:hidden">
                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="text-slate-600 hover:text-slate-900 transition-colors duration-200"
                            >
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    {isMenuOpen ? (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    ) : (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                    )}
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Mobile Navigation Menu */}
                    {isMenuOpen && (
                        <div className="md:hidden border-t border-slate-200 py-4">
                            <div className="flex flex-col space-y-4">
                                <a href="#how-it-works" className="text-slate-600 hover:text-slate-900 transition-colors duration-200">
                                    How It Works
                                </a>
                                <a href="#contact" className="text-slate-600 hover:text-slate-900 transition-colors duration-200">
                                    Contact Us
                                </a>
                                <a href="#terms" className="text-slate-600 hover:text-slate-900 transition-colors duration-200">
                                    Terms & Conditions
                                </a>
                                <hr className="border-slate-200" />
                                <Link
                                    href="/login"
                                    className="text-slate-600 hover:text-slate-900 transition-colors duration-200 font-medium"
                                >
                                    Login
                                </Link>
                                <Link
                                    href="/register"
                                    className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-lg font-medium text-center hover:from-purple-700 hover:to-blue-700 transition-all duration-200"
                                >
                                    Get Started
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative overflow-hidden bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0 bg-black"></div>
                </div>
                
                {/* Floating Elements */}
                <div className="absolute top-20 left-10 w-20 h-20 bg-purple-400 rounded-full opacity-20 animate-pulse"></div>
                <div className="absolute top-40 right-20 w-16 h-16 bg-blue-400 rounded-full opacity-30 animate-pulse delay-1000"></div>
                <div className="absolute bottom-20 left-1/3 w-12 h-12 bg-indigo-400 rounded-full opacity-25 animate-pulse delay-500"></div>

                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                            Revolutionize Advertising with
                            <span className="block bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                                Branded Helmets
                            </span>
                        </h1>
                        <p className="text-xl md:text-2xl text-slate-300 mb-8 max-w-3xl mx-auto leading-relaxed">
                            Connect advertisers with motorbike riders to create mobile advertising campaigns that reach audiences on the move
                        </p>
                        
                        {/* CTA Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
                            <Link
                                href="/register?type=advertiser"
                                className="bg-white text-purple-900 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-slate-100 transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 min-w-[200px]"
                            >
                                I'm an Advertiser
                            </Link>
                            <Link
                                href="/register?type=rider"
                                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold text-lg border-2 border-transparent hover:border-white/20 transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 min-w-[200px]"
                            >
                                I'm a Rider
                            </Link>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                            <div>
                                <div className="text-3xl md:text-4xl font-bold text-white mb-2">1000+</div>
                                <div className="text-slate-300">Active Riders</div>
                            </div>
                            <div>
                                <div className="text-3xl md:text-4xl font-bold text-white mb-2">50+</div>
                                <div className="text-slate-300">Brands</div>
                            </div>
                            <div>
                                <div className="text-3xl md:text-4xl font-bold text-white mb-2">100K+</div>
                                <div className="text-slate-300">Daily Impressions</div>
                            </div>
                            <div>
                                <div className="text-3xl md:text-4xl font-bold text-white mb-2">25+</div>
                                <div className="text-slate-300">Cities</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section id="how-it-works" className="py-20 bg-slate-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                            How RANDA Works
                        </h2>
                        <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                            A simple three-step process connecting advertisers with motorbike riders for maximum brand exposure
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-16 items-center">
                        {/* For Advertisers */}
                        <div className="space-y-8">
                            <div className="text-center md:text-left">
                                <h3 className="text-2xl font-bold text-slate-900 mb-4">
                                    For Advertisers
                                </h3>
                            </div>
                            
                            <div className="space-y-6">
                                <div className="flex items-start space-x-4">
                                    <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                                        1
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-semibold text-slate-900 mb-2">Create Campaign</h4>
                                        <p className="text-slate-600">Design your brand message and set campaign parameters including budget, duration, and target areas.</p>
                                    </div>
                                </div>
                                
                                <div className="flex items-start space-x-4">
                                    <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                                        2
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-semibold text-slate-900 mb-2">Get Approved</h4>
                                        <p className="text-slate-600">Our team reviews and approves your campaign to ensure quality and compliance standards.</p>
                                    </div>
                                </div>
                                
                                <div className="flex items-start space-x-4">
                                    <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                                        3
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-semibold text-slate-900 mb-2">Track Results</h4>
                                        <p className="text-slate-600">Monitor your campaign performance with real-time analytics and engagement metrics.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* For Riders */}
                        <div className="space-y-8">
                            <div className="text-center md:text-left">
                                <h3 className="text-2xl font-bold text-slate-900 mb-4">
                                    For Riders
                                </h3>
                            </div>
                            
                            <div className="space-y-6">
                                <div className="flex items-start space-x-4">
                                    <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                                        1
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-semibold text-slate-900 mb-2">Register & Verify</h4>
                                        <p className="text-slate-600">Sign up and complete verification process including license validation and location confirmation.</p>
                                    </div>
                                </div>
                                
                                <div className="flex items-start space-x-4">
                                    <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                                        2
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-semibold text-slate-900 mb-2">Get Branded Helmet</h4>
                                        <p className="text-slate-600">Receive your custom branded helmet from approved campaigns in your area.</p>
                                    </div>
                                </div>
                                
                                <div className="flex items-start space-x-4">
                                    <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                                        3
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-semibold text-slate-900 mb-2">Earn While Riding</h4>
                                        <p className="text-slate-600">Wear the branded helmet during your daily rides and earn money based on campaign performance.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                            Why Choose RANDA?
                        </h2>
                        <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                            The most effective mobile advertising platform for brands and the most rewarding opportunity for riders
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="text-center p-6 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors duration-200">
                            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-slate-900 mb-3">High Visibility</h3>
                            <p className="text-slate-600">Reach thousands of people daily with mobile advertising that moves through high-traffic areas.</p>
                        </div>

                        <div className="text-center p-6 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors duration-200">
                            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-slate-900 mb-3">Real-Time Analytics</h3>
                            <p className="text-slate-600">Track campaign performance with detailed metrics and insights to optimize your advertising strategy.</p>
                        </div>

                        <div className="text-center p-6 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors duration-200">
                            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-slate-900 mb-3">Cost Effective</h3>
                            <p className="text-slate-600">Achieve better ROI compared to traditional advertising methods with flexible pricing and targeting options.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-gradient-to-r from-purple-600 to-blue-600">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                        Ready to Get Started?
                    </h2>
                    <p className="text-xl text-purple-100 mb-8">
                        Join thousands of advertisers and riders already using RANDA to create successful mobile advertising campaigns.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            href="/register?type=advertiser"
                            className="bg-white text-purple-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-slate-100 transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
                        >
                            Start Advertising
                        </Link>
                        <Link
                            href="/register?type=rider"
                            className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white hover:text-purple-600 transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
                        >
                            Start Earning
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-slate-900 text-white py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-4 gap-8">
                        <div className="col-span-2">
                            <div className="flex items-center space-x-3 mb-4">
                                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                                    <span className="text-lg font-bold text-white">R</span>
                                </div>
                                <h3 className="text-2xl font-bold">Randa</h3>
                            </div>
                            <p className="text-slate-400 mb-4 max-w-md">
                                Revolutionizing mobile advertising through branded motorbike helmets. Connecting advertisers with riders for maximum brand exposure.
                            </p>
                            {/* <div className="flex space-x-4">
                                <a href="#" className="text-slate-400 hover:text-white transition-colors duration-200">
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                                    </svg>
                                </a>
                                <a href="#" className="text-slate-400 hover:text-white transition-colors duration-200">
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/>
                                    </svg>
                                </a>
                                <a href="#" className="text-slate-400 hover:text-white transition-colors duration-200">
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                                    </svg>
                                </a>
                            </div> */}
                        </div>

                        <div>
                            <h4 className="text-lg font-semibold mb-4">Company</h4>
                            <ul className="space-y-2 text-slate-400">
                                <li><a href="#" className="hover:text-white transition-colors duration-200">About Us</a></li>
                                <li><a href="#how-it-works" className="hover:text-white transition-colors duration-200">How It Works</a></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="text-lg font-semibold mb-4">Support</h4>
                            <ul className="space-y-2 text-slate-400">
                                <li><a href="#contact" className="hover:text-white transition-colors duration-200">Contact Us</a></li>
                                <li><a href="#" className="hover:text-white transition-colors duration-200">Help Center</a></li>
                                <li><a href="#terms" className="hover:text-white transition-colors duration-200">Terms & Conditions</a></li>
                                <li><a href="#" className="hover:text-white transition-colors duration-200">Privacy Policy</a></li>
                            </ul>
                        </div>
                    </div>

                    <div className="border-t border-slate-800 mt-8 pt-8 text-center text-slate-400">
                        <p>&copy; 2025 Randa. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}