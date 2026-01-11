'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ConfidenceEngagementChartProps {
  confidenceData?: Array<{ timestamp: number; confidence: number }>;
  engagementData?: Array<{ timestamp: number; engagement: number }>;
  onTimeClick?: (timestamp: number) => void;
}

export default function ConfidenceEngagementChart({ 
  confidenceData, 
  engagementData, 
  onTimeClick 
}: ConfidenceEngagementChartProps) {
  // Prepare data for confidence chart
  const confidenceChartData = confidenceData?.map(point => ({
    timestamp: point.timestamp,
    confidence: point.confidence,
  })) || [];

  // Prepare data for engagement chart
  const engagementChartData = engagementData?.map(point => ({
    timestamp: point.timestamp,
    engagement: point.engagement,
  })) || [];

  // Calculate averages
  const avgConfidence = confidenceData && confidenceData.length > 0
    ? confidenceData.reduce((sum, point) => sum + point.confidence, 0) / confidenceData.length
    : 0;
  const avgEngagement = engagementData && engagementData.length > 0
    ? engagementData.reduce((sum, point) => sum + point.engagement, 0) / engagementData.length
    : 0;

  const handleConfidenceClick = (data: any) => {
    if (onTimeClick && data?.activePayload?.[0]?.payload?.timestamp !== undefined) {
      onTimeClick(data.activePayload[0].payload.timestamp);
    }
  };

  const handleEngagementClick = (data: any) => {
    if (onTimeClick && data?.activePayload?.[0]?.payload?.timestamp !== undefined) {
      onTimeClick(data.activePayload[0].payload.timestamp);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Confidence Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Confidence Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Average Score */}
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground">Average Confidence</p>
              <p className="text-2xl font-bold">
                {avgConfidence.toFixed(0)}/100
              </p>
            </div>

            {/* Chart */}
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={confidenceChartData}
                onClick={handleConfidenceClick}
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  label={{ value: 'Time (seconds)', position: 'insideBottom', offset: -5 }}
                />
                <YAxis 
                  domain={[0, 100]}
                  label={{ value: 'Confidence (0-100)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                  formatter={(value: number) => [`${value}/100`, 'Confidence']}
                  labelFormatter={(label) => `Time: ${label}s`}
                />
                <Line
                  type="monotone"
                  dataKey="confidence"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Engagement Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Engagement Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Average Score */}
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground">Average Engagement</p>
              <p className="text-2xl font-bold">
                {avgEngagement.toFixed(0)}/100
              </p>
            </div>

            {/* Chart */}
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={engagementChartData}
                onClick={handleEngagementClick}
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  label={{ value: 'Time (seconds)', position: 'insideBottom', offset: -5 }}
                />
                <YAxis 
                  domain={[0, 100]}
                  label={{ value: 'Engagement (0-100)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                  formatter={(value: number) => [`${value}/100`, 'Engagement']}
                  labelFormatter={(label) => `Time: ${label}s`}
                />
                <Line
                  type="monotone"
                  dataKey="engagement"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
