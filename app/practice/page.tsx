'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Briefcase, Rocket, Presentation, MessageCircle, ArrowRight } from 'lucide-react';

const practiceScenarios = [
  {
    id: 'job-interview',
    title: 'Job Interview',
    description: 'Practice answering common interview questions with confidence',
    icon: Briefcase,
    iconClass: 'bg-gradient-to-br from-blue-500 to-cyan-500 group-hover:from-blue-600 group-hover:to-cyan-600',
  },
  {
    id: 'elevator-pitch',
    title: 'Elevator Pitch',
    description: 'Master the art of introducing yourself in 60 seconds',
    icon: Rocket,
    iconClass: 'bg-gradient-to-br from-purple-500 to-pink-500 group-hover:from-purple-600 group-hover:to-pink-600',
  },
  {
    id: 'business-presentation',
    title: 'Business Presentation',
    description: 'Deliver a clear and engaging presentation to your team',
    icon: Presentation,
    iconClass: 'bg-gradient-to-br from-orange-500 to-red-500 group-hover:from-orange-600 group-hover:to-red-600',
  },
  {
    id: 'casual-conversation',
    title: 'Casual Conversation',
    description: 'Practice natural conversation skills for everyday situations',
    icon: MessageCircle,
    iconClass: 'bg-gradient-to-br from-green-500 to-emerald-500 group-hover:from-green-600 group-hover:to-emerald-600',
  },
];

export default function PracticeSelectionPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/dashboard')}
            className="mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-4xl font-bold mb-3">Choose a Practice Scenario</h1>
          <p className="text-lg text-muted-foreground">
            Select the type of practice session you want to start
          </p>
        </div>

        {/* Practice Scenario Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {practiceScenarios.map((scenario) => {
            const Icon = scenario.icon;
            return (
              <Link key={scenario.id} href={`/practice/${scenario.id}`}>
                <Card className="group cursor-pointer h-full border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className={`p-3 rounded-lg ${scenario.iconClass} transition-all duration-300`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                    <CardTitle className="text-2xl mb-2">{scenario.title}</CardTitle>
                    <CardDescription className="text-base">
                      {scenario.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
