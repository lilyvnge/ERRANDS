// src/types/index.ts

// --- Enums (Matching your Models) ---
export type UserRole = 'employer' | 'vendor' | 'admin';

export type TaskCategory = 
  | 'laundry' | 'cleaning' | 'water-delivery' | 'grocery-shopping' 
  | 'food-delivery' | 'errand-running' | 'plumbing' | 'electrical' 
  | 'carpentry' | 'babysitting' | 'gardening' | 'petcare' | 'moving' | 'other';

export type TaskStatus = 'open' | 'assigned' | 'in-progress' | 'completion-requested' | 'completed' | 'cancelled' | 'disputed';
export type UrgencyLevel = 'low' | 'medium' | 'high';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type PaymentMethod = 'mpesa' | 'card' | 'cash';
export type VerificationStatus = 'pending' | 'verified' | 'rejected' | 'unverified';

// --- Interfaces ---

export interface Location {
  address: string;
  coordinates: [number, number]; // [longitude, latitude]
}

export interface RatingBreakdown {
  [key: string]: number; // '1': 0, '2': 0, etc.
}

export interface RatingSummary {
  average: number;
  count: number;
  breakdown: RatingBreakdown;
}

export interface VendorProfile {
  skills: TaskCategory[];
  description?: string;
  hourlyRate?: number;
  isVerified: boolean;
  verification?: {
    status: VerificationStatus;
    submittedAt?: string;
    rejectionReason?: string;
    documents?: {
      documentType: string;
      documentUrl: string;
      uploadedAt?: string;
      status?: 'pending' | 'approved' | 'rejected';
    }[];
  };
  rating: RatingSummary;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  isActive: boolean;
  location?: Location;
  vendorProfile?: VendorProfile;
  employerRating?: RatingSummary;
  createdAt: string;
}

export interface Rating {
  _id: string;
  rating: number;
  comment?: string;
  ratedBy: User | string; // Populated or ID
  role: 'employer' | 'vendor';
  createdAt: string;
}

export interface Task {
  _id: string;
  title: string;
  description: string;
  category: TaskCategory;
  budget: number;
  employer: User | string;
  assignedVendor?: User | string;
  location?: Location;
  status: TaskStatus;
  urgency: UrgencyLevel;
  estimatedHours?: number;
  ratings: Rating[];
  paymentStatus: PaymentStatus;
  completedAt?: string;
  completionRequestedAt?: string;
  completionExpiresAt?: string;
  completionRequestedBy?: User | string;
  completionDecision?: 'pending' | 'approved' | 'auto-approved' | 'disputed';
  createdAt: string;
}

export interface Payment {
  _id: string;
  task: Task | string;
  employer: User | string;
  vendor: User | string;
  amount: number;
  platformFee: number;
  vendorAmount: number;
  status: 'pending' | 'initiated' | 'completed' | 'failed' | 'cancelled' | 'confirmed';
  paymentMethod: PaymentMethod;
  mpesaRequest?: {
    checkoutRequestID: string;
    customerMessage: string;
  };
  cashPayment?: {
    confirmedBy?: string;
    confirmedAt?: string;
    notes?: string;
  };
  paidAt?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  message: string;
}
