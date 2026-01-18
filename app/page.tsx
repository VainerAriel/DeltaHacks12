'use client';

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Video, Mic, Brain, TrendingUp, CheckCircle2 } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [navigating, setNavigating] = useState(false);

  const handleLoginClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setNavigating(true);
    router.push('/login');
  };

  const features = [
    {
      icon: Video,
      title: "Video Recording",
      description: "Record practice sessions using your webcam or upload pre-recorded videos",
    },
    {
      icon: Mic,
      title: "AI Transcription",
      description: "Automatic speech-to-text transcription powered by ElevenLabs",
    },
    {
      icon: Brain,
      title: "Smart Feedback",
      description: "Comprehensive AI analysis using Google Gemini for detailed insights",
    },
    {
      icon: TrendingUp,
      title: "Progress Tracking",
      description: "Monitor your improvement over time with detailed analytics and charts",
    },
  ];

  return (
    <>
      {/* Full-screen loading overlay */}
      {navigating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="text-center space-y-4">
            <div className="relative">
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-semibold">Loading</p>
              <p className="text-sm text-muted-foreground">Please wait...</p>
            </div>
          </div>
        </div>
      )}
      
      <div className="min-h-screen">
        {/* Hero Section */}
        <div className="relative flex items-center justify-center min-h-[80vh] px-4 py-20">
          <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-transparent to-background/15"></div>
          <div className="relative z-10 max-w-4xl mx-auto text-center space-y-8">
            <div className="space-y-4">
              <div className="relative inline-block">
                <img 
                  src="/FluencyLab.png" 
                  alt="Fluency Lab" 
                  className="mx-auto max-w-md w-full h-auto drop-shadow-2xl"
                  style={{ 
                    display: 'block'
                  }}
                  onError={(e) => {
                    console.error('Image failed to load:', e);
                    console.error('Attempted to load:', (e.target as HTMLImageElement).src);
                  }}
                  onLoad={() => {
                    console.log('Logo image loaded successfully');
                  }}
                />
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
                Master Your English Speaking Skills
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
                Get AI-powered feedback on your pronunciation, fluency, and presentation skills
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <Link href="/login" onClick={handleLoginClick}>
                <Button size="lg" className="text-lg px-8 py-6" disabled={navigating}>
                  {navigating ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Get Started'
                  )}
                </Button>
              </Link>
              <Link href="/register">
                <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                  Create Account
                </Button>
              </Link>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12">
              <div className="text-center p-6 rounded-lg border-2 border-border/40 bg-background/30 backdrop-blur-sm">
                <div className="text-3xl font-bold text-primary">AI-Powered</div>
                <div className="text-sm text-muted-foreground mt-1">Advanced Analysis</div>
              </div>
              <div className="text-center p-6 rounded-lg border-2 border-border/40 bg-background/30 backdrop-blur-sm">
                <div className="text-3xl font-bold text-primary">Instant</div>
                <div className="text-sm text-muted-foreground mt-1">Quick Feedback</div>
              </div>
              <div className="text-center p-6 rounded-lg border-2 border-border/40 bg-background/30 backdrop-blur-sm">
                <div className="text-3xl font-bold text-primary">Track Progress</div>
                <div className="text-sm text-muted-foreground mt-1">See Your Growth</div>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="my-8"></div>

        {/* Features Section */}
        <div className="container mx-auto px-4 py-16 md:py-24 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-background/15 via-transparent to-background/10 -z-10"></div>
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose Fluency Lab?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to improve your English speaking skills in one platform
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="border-2 hover:border-primary transition-all duration-300 hover:shadow-lg">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="my-8"></div>

        {/* Practice Scenarios Section */}
        <div className="py-16 md:py-24 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-transparent to-background/15"></div>
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Practice Scenarios</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Choose from various scenarios to practice real-world speaking situations
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              <Card className="border-2 hover:border-primary transition-all duration-300 hover:shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    Job Interview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Practice answering common interview questions with confidence and clarity
                  </CardDescription>
                </CardContent>
              </Card>
              
              <Card className="border-2 hover:border-primary transition-all duration-300 hover:shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    Elevator Pitch
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Master the art of introducing yourself effectively in 60 seconds
                  </CardDescription>
                </CardContent>
              </Card>
              
              <Card className="border-2 hover:border-primary transition-all duration-300 hover:shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    Business Presentation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Deliver clear and engaging presentations with professional feedback
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="my-8"></div>

        {/* CTA Section */}
        <div className="container mx-auto px-4 py-16 md:py-24 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-background/15 via-transparent to-background/20 -z-10"></div>
          <Card className="border-2 border-primary/20 bg-background/40 backdrop-blur-sm">
            <CardContent className="p-12 text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Improve Your Speaking Skills?</h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                Join Fluency Lab today and start receiving personalized feedback on your English speaking
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/register">
                  <Button size="lg" className="text-lg px-8 py-6">
                    Start Your Journey
                  </Button>
                </Link>
                <Link href="/login" onClick={handleLoginClick}>
                  <Button size="lg" variant="outline" className="text-lg px-8 py-6" disabled={navigating}>
                    {navigating ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
