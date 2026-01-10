'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BiometricData } from '@/types/biometrics';

interface BiometricChartProps {
  biometricData: BiometricData;
  onTimeClick?: (timestamp: number) => void;
}

export default function BiometricChart({ biometricData, onTimeClick }: BiometricChartProps) {
  // Prepare data for chart
  const chartData = biometricData.timestamps.map((timestamp, index) => ({
    time: timestamp,
    heartRate: biometricData.heartRate[index] || 0,
    breathing: biometricData.breathing[index] || 0,
  }));

  // Determine color zones based on average values
  const avgHeartRate = biometricData.heartRate.reduce((a, b) => a + b, 0) / biometricData.heartRate.length;
  const avgBreathing = biometricData.breathing.reduce((a, b) => a + b, 0) / biometricData.breathing.length;

  const getHeartRateColor = (value: number): string => {
    if (value < 70) return '#22c55e'; // green - calm
    if (value < 85) return '#eab308'; // yellow - moderate
    return '#ef4444'; // red - nervous
  };

  const getBreathingColor = (value: number): string => {
    if (value < 12) return '#22c55e'; // green - calm
    if (value < 16) return '#eab308'; // yellow - moderate
    return '#ef4444'; // red - elevated
  };

  const handleClick = (data: any) => {
    if (onTimeClick && data?.activePayload?.[0]?.payload?.time) {
      onTimeClick(data.activePayload[0].payload.time);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Biometric Analysis</CardTitle>
        <CardDescription>
          Heart rate and breathing patterns over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground">Avg Heart Rate</p>
              <p className="text-2xl font-bold" style={{ color: getHeartRateColor(avgHeartRate) }}>
                {avgHeartRate.toFixed(1)} bpm
              </p>
            </div>
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground">Avg Breathing</p>
              <p className="text-2xl font-bold" style={{ color: getBreathingColor(avgBreathing) }}>
                {avgBreathing.toFixed(1)} /min
              </p>
            </div>
          </div>

          {/* Chart */}
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={chartData}
              onClick={handleClick}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="time"
                label={{ value: 'Time (seconds)', position: 'insideBottom', offset: -5 }}
              />
              <YAxis yAxisId="left" label={{ value: 'Heart Rate (bpm)', angle: -90, position: 'insideLeft' }} />
              <YAxis yAxisId="right" orientation="right" label={{ value: 'Breathing (/min)', angle: 90, position: 'insideRight' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                }}
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="heartRate"
                stroke="#ef4444"
                strokeWidth={2}
                name="Heart Rate (bpm)"
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="breathing"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Breathing Rate (/min)"
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>

          {/* Color Legend */}
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500" />
              <span>Calm</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-yellow-500" />
              <span>Moderate</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-500" />
              <span>Elevated/Nervous</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
