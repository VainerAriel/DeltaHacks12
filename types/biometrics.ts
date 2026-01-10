export interface BiometricData {
  id: string;
  recordingId: string;
  heartRate: number[];
  breathing: number[];
  facialExpressions: FacialExpression[];
  timestamps: number[];
  createdAt: Date;
}

export interface FacialExpression {
  timestamp: number;
  expression: string;
  confidence: number;
}
